// Tracking Communication Module
// Handles communication between participant and organizer panels

(function() {
    'use strict';
    
    let socket = null;
    let isConnected = false;
    let participantUpdateCallback = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    
    // Initialize WebSocket connection
    function initializeConnection() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}`;
        
        try {
            socket = new WebSocket(wsUrl);
            
            socket.onopen = function() {
                console.log('WebSocket connected');
                isConnected = true;
                reconnectAttempts = 0;
            };
            
            socket.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    handleMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
            
            socket.onclose = function() {
                console.log('WebSocket disconnected');
                isConnected = false;
                
                // Attempt to reconnect
                if (reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
                    setTimeout(initializeConnection, 2000 * reconnectAttempts);
                }
            };
            
            socket.onerror = function(error) {
                console.error('WebSocket error:', error);
            };
            
        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
            // Fallback to demo mode
            console.log('Using demo mode for tracking communication');
        }
    }
    
    // Handle incoming messages
    function handleMessage(data) {
        switch (data.type) {
            case 'participantUpdate':
                if (participantUpdateCallback) {
                    participantUpdateCallback(data.payload);
                }
                break;
            
            case 'participantList':
                if (participantListUpdateCallback) {
                    participantListUpdateCallback(data.payload);
                }
                break;
            
            default:
                console.log('Unknown message type:', data.type);
        }
    }
    
    // Send participant location update
    function sendParticipantUpdate(participantData) {
        const message = {
            type: 'participantUpdate',
            payload: participantData
        };
        
        if (isConnected && socket) {
            try {
                socket.send(JSON.stringify(message));
                console.log('Sent participant update:', participantData);
            } catch (error) {
                console.error('Error sending participant update:', error);
            }
        } else {
            console.log('WebSocket not connected, participant update:', participantData);
            
            // In demo mode, simulate the update being received by organizer
            if (participantUpdateCallback) {
                setTimeout(() => {
                    participantUpdateCallback(participantData);
                }, 100);
            }
        }
    }
    
    // Set callback for participant updates (used by organizer)
    function setParticipantUpdateCallback(callback) {
        participantUpdateCallback = callback;
    }
    
    // Start listening for updates
    function startListening() {
        if (!socket) {
            initializeConnection();
        }
        console.log('Started listening for tracking updates');
    }
    
    // Stop listening
    function stopListening() {
        if (socket) {
            socket.close();
            socket = null;
        }
        isConnected = false;
        console.log('Stopped listening for tracking updates');
    }
    
    // Get connection status
    function getConnectionStatus() {
        return {
            connected: isConnected,
            reconnectAttempts: reconnectAttempts
        };
    }
    
    // Public API
    window.trackingCommunication = {
        // Core functions
        startListening: startListening,
        stopListening: stopListening,
        sendParticipantUpdate: sendParticipantUpdate,
        setParticipantUpdateCallback: setParticipantUpdateCallback,
        getConnectionStatus: getConnectionStatus,
        
        // Initialize connection manually if needed
        initialize: initializeConnection
    };
    
    // Auto-initialize when script loads
    console.log('Tracking communication module loaded');
    
})();
