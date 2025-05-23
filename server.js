const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store participant data (in production, use a database)
const participants = new Map();

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
    
    // Update participant data
    participants.set(participantNumber, {
        number: participantNumber,
        active: participantData.active,
        position: participantData.position,
        accuracy: participantData.accuracy,
        lastUpdate: participantData.timestamp || new Date().toISOString()
    });
    
    console.log(`Updated participant #${participantNumber}:`, {
        active: participantData.active,
        position: participantData.position ? 
            `${participantData.position.lat.toFixed(6)}, ${participantData.position.lng.toFixed(6)}` : 
            'none'
    });
    
    // Broadcast update to all connected organizer clients
    broadcastToOrganizers({
        type: 'participantUpdate',
        payload: participantData
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
