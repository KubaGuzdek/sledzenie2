require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

// Configuration
const PORT = process.env.PORT || 8000;
const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// In-memory storage for tracking data (will be lost on server restart)
// In a production app, you would use a database
const trackingData = {};

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    const clientIP = req.socket.remoteAddress;
    console.log(`${new Date().toISOString()} - WebSocket connection established - Client IP: ${clientIP}`);
    
    // Send initial data to new client
    ws.send(JSON.stringify({
        type: 'init',
        data: trackingData
    }));
    
    // Handle messages from clients
    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);
            
            // Handle different message types
            switch (parsedMessage.type) {
                case 'position_update':
                    handlePositionUpdate(parsedMessage.data);
                    break;
                case 'sos':
                    handleSOSSignal(parsedMessage.data);
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
    });
});

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
