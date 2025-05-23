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
    
    // Start sending position updates from GPS tracker
    function startSending(gpsTracker) {
        if (!gpsTracker) {
            console.error('GPS tracker not provided to startSending');
            return;
        }
        
        // Store reference to GPS tracker
        window.currentGPSTracker = gpsTracker;
        
        // Get participant number from localStorage or URL
        const participantNumber = localStorage.getItem('participantNumber') || 
                                 new URLSearchParams(window.location.search).get('participant') ||
                                 Math.floor(Math.random() * 200) + 1;
        
        console.log('Started sending for participant #' + participantNumber);
        
        // Set up position update callback to send data to organizer
        const originalCallback = gpsTracker.onPositionUpdate;
        gpsTracker.onPositionUpdate = function(position) {
            // Call original callback first
            if (originalCallback) {
                originalCallback(position);
            }
            
            // Send update to organizer
            const participantData = {
                participantNumber: parseInt(participantNumber),
                position: {
                    latitude: position.latitude,
                    longitude: position.longitude,
                    accuracy: position.accuracy,
                    timestamp: position.timestamp
                },
                status: 'active',
                speed: position.speed || 0
            };
            
            sendParticipantUpdate(participantData);
        };
        
        // Initialize connection if not already connected
        if (!socket) {
            initializeConnection();
        }
    }
    
    // Stop sending position updates
    function stopSending() {
        if (window.currentGPSTracker) {
            // Get participant number
            const participantNumber = localStorage.getItem('participantNumber') || 
                                     new URLSearchParams(window.location.search).get('participant') ||
                                     1;
            
            // Send final update with inactive status
            const participantData = {
                participantNumber: parseInt(participantNumber),
                position: window.currentGPSTracker.currentPosition,
                status: 'inactive',
                speed: 0
            };
            
            sendParticipantUpdate(participantData);
            console.log('Stopped sending for participant #' + participantNumber);
        }
        
        // Clear reference
        window.currentGPSTracker = null;
    }
    
    // Send SOS signal
    function sendSOS(position) {
        const participantNumber = localStorage.getItem('participantNumber') || 
                                 new URLSearchParams(window.location.search).get('participant') ||
                                 1;
        
        const sosData = {
            participantNumber: parseInt(participantNumber),
            position: position,
            status: 'sos',
            timestamp: Date.now()
        };
        
        const message = {
            type: 'sosAlert',
            payload: sosData
        };
        
        if (isConnected && socket) {
            try {
                socket.send(JSON.stringify(message));
                console.log('Sent SOS alert:', sosData);
            } catch (error) {
                console.error('Error sending SOS alert:', error);
            }
        } else {
            console.log('WebSocket not connected, SOS alert:', sosData);
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
        
        // GPS tracker integration
        startSending: startSending,
        stopSending: stopSending,
        sendSOS: sendSOS,
        
        // Initialize connection manually if needed
        initialize: initializeConnection
    };
    
    // Auto-initialize when script loads
    console.log('Tracking communication module loaded');
    
})();
