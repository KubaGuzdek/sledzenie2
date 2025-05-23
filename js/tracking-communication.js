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
    
    // Start sending position updates for a participant
    function startSending(participantNumber) {
        if (!participantNumber) {
            console.error('Participant number not provided to startSending');
            return;
        }
        
        // Store participant number
        window.currentParticipantNumber = participantNumber;
        
        console.log('Started sending for participant #' + participantNumber);
        
        // Initialize connection if not already connected
        if (!socket) {
            initializeConnection();
        }
        
        // Start sending regular updates
        startSendingUpdates(participantNumber);
    }
    
    // Start sending regular position updates
    function startSendingUpdates(participantNumber) {
        // Clear any existing interval
        if (window.sendingInterval) {
            clearInterval(window.sendingInterval);
        }
        
        // Send updates every 2 seconds
        window.sendingInterval = setInterval(() => {
            // Get current position from GPS tracker if available
            if (window.trackingApp && window.trackingApp.gpsTracker && window.trackingApp.gpsTracker.currentPosition) {
                const position = window.trackingApp.gpsTracker.currentPosition;
                const isActive = window.trackingApp.gpsTracker.trackingActive;
                
                const participantData = {
                    participantNumber: parseInt(participantNumber),
                    position: {
                        latitude: position.latitude,
                        longitude: position.longitude,
                        accuracy: position.accuracy,
                        timestamp: position.timestamp
                    },
                    active: isActive,
                    status: isActive ? 'active' : 'inactive',
                    speed: position.speed || 0,
                    accuracy: position.accuracy,
                    timestamp: position.timestamp
                };
                
                sendParticipantUpdate(participantData);
            } else {
                // Send simulated data if no real GPS available
                const baseLatitude = 54.6960;
                const baseLongitude = 18.4310;
                
                const participantData = {
                    participantNumber: parseInt(participantNumber),
                    position: {
                        latitude: baseLatitude + (Math.random() * 0.01 - 0.005),
                        longitude: baseLongitude + (Math.random() * 0.01 - 0.005),
                        accuracy: 5 + Math.random() * 10,
                        timestamp: Date.now()
                    },
                    active: true,
                    status: 'active',
                    speed: 4 + Math.random() * 4, // 4-8 m/s
                    accuracy: 5 + Math.random() * 10,
                    timestamp: Date.now()
                };
                
                sendParticipantUpdate(participantData);
                console.log('Sent simulated participant update for #' + participantNumber);
            }
        }, 2000); // Send every 2 seconds
    }
    
    // Stop sending position updates
    function stopSending() {
        // Clear sending interval
        if (window.sendingInterval) {
            clearInterval(window.sendingInterval);
            window.sendingInterval = null;
        }
        
        if (window.currentParticipantNumber) {
            // Get current position if available
            let currentPosition = null;
            if (window.trackingApp && window.trackingApp.gpsTracker) {
                currentPosition = window.trackingApp.gpsTracker.currentPosition;
            }
            
            // Send final update with inactive status
            const participantData = {
                participantNumber: parseInt(window.currentParticipantNumber),
                position: currentPosition,
                status: 'inactive',
                speed: 0
            };
            
            sendParticipantUpdate(participantData);
            console.log('Stopped sending for participant #' + window.currentParticipantNumber);
        }
        
        // Clear reference
        window.currentParticipantNumber = null;
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
