/**
 * WebSocket Test Script for King Of theBay
 * 
 * This script tests the WebSocket connection to the server.
 * It can be used to verify that WebSockets are working correctly.
 * 
 * Usage:
 * 1. Start the server: npm start
 * 2. Run this script: node test-websocket.js
 */

const WebSocket = require('ws');
require('dotenv').config();

// Configuration
const PORT = process.env.PORT || 8000;
const HOST = 'localhost';
const URL = `ws://${HOST}:${PORT}`;

console.log(`Testing WebSocket connection to ${URL}`);
console.log('Press Ctrl+C to exit');

// Create WebSocket connection
const ws = new WebSocket(URL);

// Connection opened
ws.on('open', () => {
    console.log('✅ WebSocket connection established');
    
    // Send a test message
    const testMessage = {
        type: 'test',
        data: {
            message: 'Hello from test script',
            timestamp: new Date().toISOString()
        }
    };
    
    console.log('Sending test message:', JSON.stringify(testMessage, null, 2));
    ws.send(JSON.stringify(testMessage));
    
    // Try to authenticate as organizer if password is set
    if (process.env.ORGANIZER_PASSWORD) {
        console.log('Attempting to authenticate as organizer...');
        
        const authMessage = {
            type: 'auth',
            data: {
                role: 'organizer',
                password: process.env.ORGANIZER_PASSWORD
            }
        };
        
        ws.send(JSON.stringify(authMessage));
    }
});

// Listen for messages
ws.on('message', (data) => {
    try {
        const message = JSON.parse(data);
        console.log('📥 Received message:', JSON.stringify(message, null, 2));
        
        // Check for authentication response
        if (message.type === 'auth_response') {
            if (message.success) {
                console.log('✅ Authentication successful');
            } else {
                console.log('❌ Authentication failed:', message.message);
            }
        }
    } catch (error) {
        console.error('Error parsing message:', error);
        console.log('Raw message:', data);
    }
});

// Handle errors
ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
    console.log('Make sure the server is running and accessible at', URL);
});

// Connection closed
ws.on('close', (code, reason) => {
    console.log(`❌ WebSocket connection closed: ${code} ${reason}`);
});

// Keep the script running
setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
        // Send a ping message every 5 seconds
        ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
    }
}, 5000);
