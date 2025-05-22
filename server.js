require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Configuration
const PORT = process.env.PORT || 8000;
const app = express();
const server = http.createServer(app);

// Create WebSocket server with ping-pong to keep connections alive
const wss = new WebSocket.Server({ 
    server,
    // Increase max payload size to handle many participants
    maxPayload: 5 * 1024 * 1024 // 5MB
});

// File-based persistence for tracking data
// This is a simple solution - in production you would use a proper database
const DATA_DIR = path.join(__dirname, 'data');
const TRACKING_DATA_FILE = path.join(DATA_DIR, 'tracking_data.json');
const PARTICIPANTS_FILE = path.join(DATA_DIR, 'participants.json');

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Load tracking data from file or initialize empty object
let trackingData = {};
try {
    if (fs.existsSync(TRACKING_DATA_FILE)) {
        trackingData = JSON.parse(fs.readFileSync(TRACKING_DATA_FILE, 'utf8'));
        console.log(`Loaded tracking data for ${Object.keys(trackingData).length} participants`);
    }
} catch (error) {
    console.error('Error loading tracking data:', error);
}

// Load participants data from file or initialize empty array
let participantsData = [];
try {
    if (fs.existsSync(PARTICIPANTS_FILE)) {
        participantsData = JSON.parse(fs.readFileSync(PARTICIPANTS_FILE, 'utf8'));
        console.log(`Loaded profiles for ${participantsData.length} participants`);
    }
} catch (error) {
    console.error('Error loading participants data:', error);
}

// Save tracking data to file
function saveTrackingData() {
    try {
        fs.writeFileSync(TRACKING_DATA_FILE, JSON.stringify(trackingData));
    } catch (error) {
        console.error('Error saving tracking data:', error);
    }
}

// Save participants data to file
function saveParticipantsData() {
    try {
        fs.writeFileSync(PARTICIPANTS_FILE, JSON.stringify(participantsData));
    } catch (error) {
        console.error('Error saving participants data:', error);
    }
}

// Set up periodic saving of data (every 30 seconds)
setInterval(() => {
    saveTrackingData();
    saveParticipantsData();
    console.log('Data saved to disk');
}, 30000);

// Keep track of connected clients
const clients = new Map();

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    const clientIP = req.socket.remoteAddress;
    const clientId = Date.now().toString();
    let participantId = null;
    let isOrganizer = false;
    
    console.log(`${new Date().toISOString()} - WebSocket connection established - Client IP: ${clientIP}`);
    
    // Add client to the map
    clients.set(clientId, { ws, participantId, isOrganizer });
    
    // Set up ping-pong to keep connection alive
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });
    
    // Send initial data to new client
    ws.send(JSON.stringify({
        type: 'init',
        data: trackingData,
        participants: participantsData
    }));
    
    // Handle messages from clients
    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);
            
            // Handle different message types
            switch (parsedMessage.type) {
                case 'auth':
                    handleAuthentication(parsedMessage.data, clientId);
                    break;
                case 'position_update':
                    handlePositionUpdate(parsedMessage.data);
                    break;
                case 'sos':
                    handleSOSSignal(parsedMessage.data);
                    break;
                case 'profile_update':
                    handleProfileUpdate(parsedMessage.data);
                    break;
                case 'register_participant':
                    handleParticipantRegistration(parsedMessage.data, clientId);
                    break;
                default:
                    console.log(`Unknown message type: ${parsedMessage.type}`);
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });
    
    // Handle client disconnection
    ws.on('close', () => {
        console.log(`${new Date().toISOString()} - WebSocket connection closed - Client IP: ${clientIP}`);
        clients.delete(clientId);
    });
});

// Handle authentication
function handleAuthentication(data, clientId) {
    const client = clients.get(clientId);
    if (!client) return;
    
    if (data.role === 'organizer' && data.password === process.env.ORGANIZER_PASSWORD) {
        client.isOrganizer = true;
        client.ws.send(JSON.stringify({
            type: 'auth_response',
            success: true,
            role: 'organizer'
        }));
        console.log(`Client ${clientId} authenticated as organizer`);
    } else if (data.role === 'participant' && data.participantId) {
        // Find participant in the data
        const participant = participantsData.find(p => p.id === data.participantId);
        if (participant) {
            client.participantId = data.participantId;
            client.ws.send(JSON.stringify({
                type: 'auth_response',
                success: true,
                role: 'participant',
                profile: participant
            }));
            console.log(`Client ${clientId} authenticated as participant ${data.participantId}`);
        } else {
            client.ws.send(JSON.stringify({
                type: 'auth_response',
                success: false,
                message: 'Participant not found'
            }));
        }
    } else {
        client.ws.send(JSON.stringify({
            type: 'auth_response',
            success: false,
            message: 'Authentication failed'
        }));
    }
}

// Handle participant registration
function handleParticipantRegistration(data, clientId) {
    const client = clients.get(clientId);
    if (!client) return;
    
    // Generate unique ID if not provided
    const participantId = data.id || `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Create new participant profile
    const newParticipant = {
        id: participantId,
        name: data.name || 'Unknown Participant',
        sailNumber: data.sailNumber || 'POL-000',
        email: data.email || '',
        phone: data.phone || '',
        emergencyContact: data.emergencyContact || '',
        trackingColor: data.trackingColor || '#1a73e8',
        registrationDate: new Date().toISOString()
    };
    
    // Add to participants data
    participantsData.push(newParticipant);
    saveParticipantsData();
    
    // Update client info
    client.participantId = participantId;
    
    // Send response
    client.ws.send(JSON.stringify({
        type: 'registration_response',
        success: true,
        profile: newParticipant
    }));
    
    console.log(`New participant registered: ${newParticipant.name} (${participantId})`);
    
    // Broadcast to organizers
    broadcastToOrganizers('participant_registered', newParticipant);
}

// Handle profile update
function handleProfileUpdate(data) {
    // Find participant in the data
    const participantIndex = participantsData.findIndex(p => p.id === data.id);
    
    if (participantIndex >= 0) {
        // Update participant data
        participantsData[participantIndex] = {
            ...participantsData[participantIndex],
            ...data,
            lastUpdated: new Date().toISOString()
        };
        
        saveParticipantsData();
        
        console.log(`Profile updated for participant ${data.id}`);
        
        // Broadcast to organizers
        broadcastToOrganizers('profile_updated', participantsData[participantIndex]);
    }
}

// Ping all clients to keep connections alive
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

// Broadcast to all organizers
function broadcastToOrganizers(type, data) {
    clients.forEach((client) => {
        if (client.isOrganizer && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify({
                type: type,
                data: data,
                timestamp: new Date().toISOString()
            }));
        }
    });
}

// Handle position update
function handlePositionUpdate(data) {
    // Store the updated data
    trackingData[data.id] = data;
    
    // Broadcast to all connected clients
    broadcastUpdate('position_update', data);
}

// Handle SOS signal
function handleSOSSignal(data) {
    // Update participant status to SOS
    if (trackingData[data.id]) {
        trackingData[data.id].status = 'sos';
        trackingData[data.id].sosTimestamp = new Date().toISOString();
    } else {
        trackingData[data.id] = data;
    }
    
    // Broadcast SOS signal to all connected clients
    broadcastUpdate('sos', data);
    
    console.log(`SOS signal received from ${data.name} (${data.sailNumber})`);
    
    // Save immediately on SOS
    saveTrackingData();
}

// Broadcast update to all connected clients
function broadcastUpdate(type, data) {
    const message = JSON.stringify({
        type: type,
        data: data,
        timestamp: new Date().toISOString()
    });
    
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// API endpoints for participant management
app.use(express.json());

// Get all participants
app.get('/api/participants', (req, res) => {
    res.json(participantsData);
});

// Get participant by ID
app.get('/api/participants/:id', (req, res) => {
    const participant = participantsData.find(p => p.id === req.params.id);
    if (participant) {
        res.json(participant);
    } else {
        res.status(404).json({ error: 'Participant not found' });
    }
});

// Create new participant
app.post('/api/participants', (req, res) => {
    const participantId = `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    const newParticipant = {
        id: participantId,
        name: req.body.name || 'Unknown Participant',
        sailNumber: req.body.sailNumber || 'POL-000',
        email: req.body.email || '',
        phone: req.body.phone || '',
        emergencyContact: req.body.emergencyContact || '',
        trackingColor: req.body.trackingColor || '#1a73e8',
        registrationDate: new Date().toISOString()
    };
    
    participantsData.push(newParticipant);
    saveParticipantsData();
    
    res.status(201).json(newParticipant);
});

// Update participant
app.put('/api/participants/:id', (req, res) => {
    const participantIndex = participantsData.findIndex(p => p.id === req.params.id);
    
    if (participantIndex >= 0) {
        participantsData[participantIndex] = {
            ...participantsData[participantIndex],
            ...req.body,
            lastUpdated: new Date().toISOString()
        };
        
        saveParticipantsData();
        res.json(participantsData[participantIndex]);
    } else {
        res.status(404).json({ error: 'Participant not found' });
    }
});

// Delete participant
app.delete('/api/participants/:id', (req, res) => {
    const participantIndex = participantsData.findIndex(p => p.id === req.params.id);
    
    if (participantIndex >= 0) {
        const deletedParticipant = participantsData.splice(participantIndex, 1)[0];
        saveParticipantsData();
        
        // Also remove from tracking data
        if (trackingData[req.params.id]) {
            delete trackingData[req.params.id];
            saveTrackingData();
        }
        
        res.json(deletedParticipant);
    } else {
        res.status(404).json({ error: 'Participant not found' });
    }
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Handle all routes - serve index.html for any route not found
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Get all network interfaces
function getNetworkInterfaces() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal and non-IPv4 addresses
            if (iface.internal || iface.family !== 'IPv4') continue;
            addresses.push({
                name: name,
                address: iface.address
            });
        }
    }
    
    return addresses;
}

// Start the server
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    
    // Display all available network interfaces
    console.log('\nAvailable network interfaces:');
    const interfaces = getNetworkInterfaces();
    interfaces.forEach((iface, index) => {
        console.log(`${index + 1}. ${iface.name}: http://${iface.address}:${PORT}/`);
    });
    
    console.log('\nWebSocket server is running');
    console.log('\nIf you are having trouble connecting from a mobile device, try:');
    console.log('1. Make sure the mobile device is on the same network as this computer');
    console.log('2. Check if any firewall is blocking the connection');
    console.log('3. Try accessing the server using one of the IP addresses listed above');
    console.log('\nPress Ctrl+C to stop the server');
});
