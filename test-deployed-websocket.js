/**
 * Deployed WebSocket Test Script for King Of theBay
 * 
 * This script tests the WebSocket connection to a deployed server.
 * It can be used to verify that WebSockets are working correctly on Render.com.
 * 
 * Usage:
 * 1. Update the DEPLOYED_URL variable with your Render.com URL
 * 2. Run this script: node test-deployed-websocket.js
 */

const WebSocket = require('ws');

// Configuration - REPLACE THIS WITH YOUR DEPLOYED URL
const DEPLOYED_URL = 'wss://your-app-name.onrender.com';

console.log(`Testing WebSocket connection to ${DEPLOYED_URL}`);
console.log('Press Ctrl+C to exit');

// Create WebSocket connection
const ws = new WebSocket(DEPLOYED_URL);

// Connection opened
ws.on('open', () => {
    console.log('✅ WebSocket connection established to deployed server');
    
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
    
    // Prompt for organizer password
    console.log('\nTo test organizer authentication:');
    console.log('1. Enter the organizer password below');
    console.log('2. Press Enter to send the authentication request');
    
    process.stdin.on('data', (data) => {
        const password = data.toString().trim();
        
        if (password) {
            console.log('Attempting to authenticate as organizer...');
            
            const authMessage = {
                type: 'auth',
                data: {
                    role: 'organizer',
                    password: password
                }
            };
            
            ws.send(JSON.stringify(authMessage));
        }
    });
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
    console.log('Make sure:');
    console.log('1. You have updated the DEPLOYED_URL variable with your Render.com URL');
    console.log('2. Your application is deployed and running on Render.com');
    console.log('3. WebSockets are enabled on your Render.com service');
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
