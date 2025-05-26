const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store participant data (in production, use a database)
const participants = new Map();
const raceResults = new Map(); // Store race results

// Serve static files
app.use(express.static(path.join(__dirname)));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/organizer', (req, res) => {
    res.sendFile(path.join(__dirname, 'organizer-view.html'));
});

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleWebSocketMessage(ws, data);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Handle WebSocket messages
function handleWebSocketMessage(ws, data) {
    switch (data.type) {
        case 'participantUpdate':
            handleParticipantUpdate(data.payload);
            break;
        
        case 'sosAlert':
            handleSOSAlert(data.payload);
            break;
        
        case 'organizerMessage':
            handleOrganizerMessage(data.payload);
            break;
        
        case 'raceResults':
            handleRaceResults(data.payload);
            break;
        
        default:
            console.log('Unknown message type:', data.type);
    }
}

// Handle participant location update
function handleParticipantUpdate(participantData) {
    const participantNumber = participantData.participantNumber;
    
    // Validate participant number
    if (!participantNumber || participantNumber < 1 || participantNumber > 200) {
        console.error('Invalid participant number:', participantNumber);
        return;
    }
    
    // Convert position format if needed (from {latitude, longitude} to {lat, lng})
    let convertedPosition = null;
    if (participantData.position) {
        if (participantData.position.latitude !== undefined && participantData.position.longitude !== undefined) {
            // Convert from {latitude, longitude} to {lat, lng}
            convertedPosition = {
                lat: participantData.position.latitude,
                lng: participantData.position.longitude
            };
        } else {
            // Already in {lat, lng} format
            convertedPosition = participantData.position;
        }
    }
    
    // Update participant data
    participants.set(participantNumber, {
        number: participantNumber,
        active: participantData.active,
        position: convertedPosition,
        accuracy: participantData.accuracy,
        lastUpdate: participantData.timestamp || new Date().toISOString()
    });
    
    console.log(`Updated participant #${participantNumber}:`, {
        active: participantData.active,
        position: participantData.position ? 
            (participantData.position.lat !== undefined ? 
                `${participantData.position.lat.toFixed(6)}, ${participantData.position.lng.toFixed(6)}` :
                `${participantData.position.latitude.toFixed(6)}, ${participantData.position.longitude.toFixed(6)}`) : 
            'none'
    });
    
    // Broadcast update to all connected organizer clients with converted position
    broadcastToOrganizers({
        type: 'participantUpdate',
        payload: {
            participantNumber: participantNumber,
            status: participantData.status || (participantData.active ? 'active' : 'inactive'),
            active: participantData.active,
            position: convertedPosition,
            accuracy: participantData.accuracy,
            timestamp: participantData.timestamp || new Date().toISOString()
        }
    });
}

// Handle SOS alert
function handleSOSAlert(sosData) {
    const participantNumber = sosData.participantNumber;
    
    // Validate participant number
    if (!participantNumber || participantNumber < 1 || participantNumber > 200) {
        console.error('Invalid participant number in SOS alert:', participantNumber);
        return;
    }
    
    // Convert position format if needed
    let convertedPosition = null;
    if (sosData.position) {
        if (sosData.position.lat !== undefined && sosData.position.lng !== undefined) {
            convertedPosition = sosData.position;
        } else if (sosData.position.latitude !== undefined && sosData.position.longitude !== undefined) {
            convertedPosition = {
                lat: sosData.position.latitude,
                lng: sosData.position.longitude
            };
        }
    }
    
    console.log(`🚨 SOS ALERT from participant #${participantNumber}:`, {
        message: sosData.message || 'SOS - POTRZEBUJĘ POMOCY!',
        position: convertedPosition ? 
            `${convertedPosition.lat.toFixed(6)}, ${convertedPosition.lng.toFixed(6)}` : 
            'Brak lokalizacji',
        timestamp: sosData.timestamp
    });
    
    // Update participant data with SOS status
    const existingParticipant = participants.get(participantNumber) || {};
    participants.set(participantNumber, {
        ...existingParticipant,
        number: participantNumber,
        active: true, // Mark as active when SOS is sent
        position: convertedPosition,
        sosAlert: true,
        sosTimestamp: sosData.timestamp,
        sosMessage: sosData.message || 'SYGNAŁ SOS - POTRZEBUJĘ POMOCY!',
        lastUpdate: sosData.timestamp || new Date().toISOString()
    });
    
    // Broadcast SOS alert to all organizer clients
    broadcastToOrganizers({
        type: 'sosAlert',
        payload: {
            participantNumber: participantNumber,
            position: convertedPosition,
            message: sosData.message || 'SYGNAŁ SOS - POTRZEBUJĘ POMOCY!',
            timestamp: sosData.timestamp || new Date().toISOString(),
            accuracy: sosData.accuracy
        }
    });
    
    // Also send as regular participant update to show on map
    broadcastToOrganizers({
        type: 'participantUpdate',
        payload: {
            participantNumber: participantNumber,
            status: 'sos',
            active: true,
            position: convertedPosition,
            accuracy: sosData.accuracy,
            timestamp: sosData.timestamp || new Date().toISOString(),
            sosAlert: true
        }
    });
}

// Handle organizer message
function handleOrganizerMessage(messageData) {
    console.log('📢 Organizer message:', messageData.message);
    
    // Broadcast message to all connected participant clients
    broadcastToParticipants({
        type: 'organizerMessage',
        payload: {
            message: messageData.message,
            timestamp: messageData.timestamp || new Date().toISOString(),
            sender: messageData.sender || 'Organizator'
        }
    });
}

// Handle race results
function handleRaceResults(resultsData) {
    console.log('🏆 Race results received:', resultsData);
    
    // Store race results
    if (resultsData.races) {
        Object.keys(resultsData.races).forEach(raceId => {
            raceResults.set(raceId, resultsData.races[raceId]);
        });
    }
    
    // Broadcast results to all connected participant clients
    broadcastToParticipants({
        type: 'raceResults',
        payload: {
            races: resultsData.races,
            timestamp: resultsData.timestamp || new Date().toISOString()
        }
    });
}

// Broadcast message to all connected organizer clients
function broadcastToOrganizers(message) {
    const messageStr = JSON.stringify(message);
    
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(messageStr);
            } catch (error) {
                console.error('Error broadcasting to client:', error);
            }
        }
    });
}

// Broadcast message to all connected participant clients
function broadcastToParticipants(message) {
    const messageStr = JSON.stringify(message);
    
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(messageStr);
            } catch (error) {
                console.error('Error broadcasting to participant:', error);
            }
        }
    });
}

// API endpoint to get all participants (for organizer panel)
app.get('/api/participants', (req, res) => {
    const participantList = Array.from(participants.values());
    res.json(participantList);
});

// API endpoint to get specific participant
app.get('/api/participants/:number', (req, res) => {
    const participantNumber = parseInt(req.params.number);
    
    if (participantNumber < 1 || participantNumber > 200) {
        return res.status(400).json({ error: 'Invalid participant number' });
    }
    
    const participant = participants.get(participantNumber);
    if (participant) {
        res.json(participant);
    } else {
        res.json({
            number: participantNumber,
            active: false,
            position: null,
            lastUpdate: null
        });
    }
});

// API endpoint to get race results
app.get('/api/race-results', (req, res) => {
    const results = {};
    raceResults.forEach((value, key) => {
        results[key] = value;
    });
    res.json({ races: results });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        activeParticipants: participants.size,
        connectedClients: wss.clients.size
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`King Of theBay tracking server running on port ${PORT}`);
    console.log(`Participant panel: http://localhost:${PORT}/`);
    console.log(`Organizer panel: http://localhost:${PORT}/organizer`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Log server statistics every 5 minutes
setInterval(() => {
    const activeParticipants = Array.from(participants.values()).filter(p => p.active).length;
    console.log(`Server stats - Active participants: ${activeParticipants}/${participants.size}, Connected clients: ${wss.clients.size}`);
}, 5 * 60 * 1000);
