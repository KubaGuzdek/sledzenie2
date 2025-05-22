/**
 * Tracking Communication Module for King Of theBay application
 * This module handles communication between participant and organizer views
 */

// Main communication class
class TrackingCommunication {
    constructor() {
        // Configuration
        this.storageKey = 'kingOfTheBay_trackingData';
        this.updateInterval = 2000; // Update every 2 seconds
        this.participantId = null;
        this.participantName = null;
        this.participantSailNumber = null;
        this.participantColor = null;
        this.isOrganizer = false;
        this.intervalId = null;
        this.websocket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000; // 3 seconds
        
        // Initialize
        this.init();
    }
    
    // Initialize the communication
    init() {
        // Check if we're in organizer or participant view
        this.isOrganizer = window.location.href.includes('organizer-view.html');
        
        // Load participant data from localStorage
        if (!this.isOrganizer) {
            this.loadParticipantData();
        }
        
        // Connect to WebSocket server
        this.connectWebSocket();
        
        console.log(`Tracking communication initialized in ${this.isOrganizer ? 'organizer' : 'participant'} mode`);
    }
    
    // Connect to WebSocket server
    connectWebSocket() {
        // Determine WebSocket URL based on current location
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}`;
        
        console.log(`Connecting to WebSocket server at ${wsUrl}`);
        
        try {
            this.websocket = new WebSocket(wsUrl);
            
            // WebSocket event handlers
            this.websocket.onopen = this.handleWebSocketOpen.bind(this);
            this.websocket.onmessage = this.handleWebSocketMessage.bind(this);
            this.websocket.onclose = this.handleWebSocketClose.bind(this);
            this.websocket.onerror = this.handleWebSocketError.bind(this);
        } catch (error) {
            console.error('Error connecting to WebSocket server:', error);
            this.scheduleReconnect();
        }
    }
    
    // Handle WebSocket open event
    handleWebSocketOpen(event) {
        console.log('WebSocket connection established');
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        
        if (this.isOrganizer) {
            // Start listening for participant updates
            this.startListening();
            console.log('Organizer mode active. Listening for participant updates via WebSocket.');
        } else {
            // For testing, show a message about the connection
            if (window.navigator.userAgent.includes('Mobile')) {
                console.log('Mobile device detected. Sending data to organizer via WebSocket.');
            } else {
                console.log('Participant mode active. Connected to organizer via WebSocket.');
            }
        }
    }
    
    // Handle WebSocket message event
    handleWebSocketMessage(event) {
        try {
            const message = JSON.parse(event.data);
            
            // Handle different message types
            switch (message.type) {
                case 'init':
                    // Initial data from server
                    if (this.isOrganizer && window.organizerTracking) {
                        this.processInitialData(message.data);
                    }
                    break;
                case 'position_update':
                    // Position update from a participant
                    if (this.isOrganizer && window.organizerTracking) {
                        this.processParticipantUpdate(message.data);
                    }
                    break;
                case 'sos':
                    // SOS signal from a participant
                    if (this.isOrganizer && window.organizerTracking) {
                        this.processSOSSignal(message.data);
                    }
                    break;
                default:
                    console.log(`Unknown message type: ${message.type}`);
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    }
    
    // Handle WebSocket close event
    handleWebSocketClose(event) {
        console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
        this.scheduleReconnect();
    }
    
    // Handle WebSocket error event
    handleWebSocketError(event) {
        console.error('WebSocket error:', event);
    }
    
    // Schedule reconnection attempt
    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
            
            setTimeout(() => {
                console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                this.connectWebSocket();
            }, this.reconnectDelay);
        } else {
            console.error('Maximum reconnect attempts reached. Using localStorage fallback.');
            // Fall back to localStorage for communication
            this.useFallbackCommunication();
        }
    }
    
    // Use localStorage as fallback communication method
    useFallbackCommunication() {
        console.log('Using localStorage as fallback communication method');
        // The rest of the code will use localStorage when WebSocket is not available
    }
    
    // Load participant data from localStorage
    loadParticipantData() {
        this.participantName = localStorage.getItem('userName') || 'Unknown Participant';
        this.participantSailNumber = localStorage.getItem('sailNumber') || 'POL-000';
        this.participantColor = localStorage.getItem('trackingColor') || '#1a73e8';
        
        // Generate a unique ID if not already set
        this.participantId = localStorage.getItem('participantId');
        if (!this.participantId) {
            this.participantId = 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            localStorage.setItem('participantId', this.participantId);
        }
    }
    
    // Start sending position updates (for participant)
    startSending(gpsTracker) {
        if (this.isOrganizer || !gpsTracker) return;
        
        // Stop any existing interval
        this.stopSending();
        
        // Start sending updates
        this.intervalId = setInterval(() => {
            const status = gpsTracker.getStatus();
            if (status.active && status.currentPosition) {
                this.sendPositionUpdate(status);
            }
        }, this.updateInterval);
        
        console.log('Started sending position updates');
    }
    
    // Stop sending position updates
    stopSending() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('Stopped sending position updates');
        }
    }
    
    // Send position update via WebSocket
    sendPositionUpdate(status) {
        const updateData = {
            id: this.participantId,
            name: this.participantName,
            sailNumber: this.participantSailNumber,
            color: this.participantColor,
            position: status.currentPosition,
            speed: status.currentSpeed,
            distance: status.distance,
            lastUpdate: new Date().toISOString(),
            status: 'active'
        };
        
        // Send via WebSocket if available
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'position_update',
                data: updateData
            }));
        } else {
            // Fallback to localStorage
            this.sendPositionUpdateFallback(updateData);
        }
    }
    
    // Fallback method to send position update via localStorage
    sendPositionUpdateFallback(updateData) {
        // Load existing data
        const allData = this.getAllTrackingData();
        
        // Update or add this participant's data
        allData[this.participantId] = updateData;
        
        // Save back to storage
        this.saveAllTrackingData(allData);
    }
    
    // Send SOS signal
    sendSOS(position) {
        const sosData = {
            id: this.participantId,
            name: this.participantName,
            sailNumber: this.participantSailNumber,
            color: this.participantColor,
            position: position,
            status: 'sos',
            sosTimestamp: new Date().toISOString()
        };
        
        // Send via WebSocket if available
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'sos',
                data: sosData
            }));
            console.log('SOS signal sent via WebSocket');
        } else {
            // Fallback to localStorage
            this.sendSOSFallback(sosData);
        }
    }
    
    // Fallback method to send SOS signal via localStorage
    sendSOSFallback(sosData) {
        // Load existing data
        const allData = this.getAllTrackingData();
        
        // Update this participant's data with SOS status
        allData[this.participantId] = sosData;
        
        // Save back to storage
        this.saveAllTrackingData(allData);
        console.log('SOS signal sent via localStorage fallback');
    }
    
    // Start listening for updates (for organizer)
    startListening() {
        if (!this.isOrganizer) return;
        
        // Stop any existing interval
        this.stopListening();
        
        // Start listening for updates
        this.intervalId = setInterval(() => {
            // Only use localStorage fallback if WebSocket is not available
            if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
                this.processUpdatesFallback();
            }
        }, this.updateInterval);
        
        console.log('Started listening for position updates');
    }
    
    // Stop listening for updates
    stopListening() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('Stopped listening for position updates');
        }
    }
    
    // Process initial data from server (for organizer)
    processInitialData(data) {
        if (!this.isOrganizer || !window.organizerTracking) return;
        
        console.log('Received initial tracking data:', Object.keys(data).length, 'participants');
        
        // Process each participant's data
        Object.values(data).forEach(participantData => {
            this.processParticipantUpdate(participantData);
        });
    }
    
    // Process participant update from WebSocket (for organizer)
    processParticipantUpdate(participantData) {
        if (!this.isOrganizer || !window.organizerTracking) return;
        
        // Find or create participant in organizer tracking
        let participant = window.organizerTracking.participants.find(p => p.id === participantData.id);
        
        if (!participant) {
            // Create new participant
            participant = {
                id: participantData.id,
                name: participantData.name,
                sailNumber: participantData.sailNumber,
                status: participantData.status,
                position: participantData.position,
                distance: participantData.distance,
                speed: participantData.speed,
                gpsStatus: 'good',
                trackingColor: participantData.color,
                positionHistory: []
            };
            
            // Add to participants list
            window.organizerTracking.participants.push(participant);
            
            // Create marker
            window.organizerTracking.createParticipantMarker(participant);
        } else {
            // Update existing participant
            participant.position = participantData.position;
            participant.distance = participantData.distance;
            participant.speed = participantData.speed;
            participant.status = participantData.status;
            
            // Update marker position
            window.organizerTracking.updateMarkerPosition(participant);
            
            // Update list item
            window.organizerTracking.updateParticipantListItem(participant);
        }
    }
    
    // Process SOS signal from WebSocket (for organizer)
    processSOSSignal(participantData) {
        if (!this.isOrganizer || !window.organizerTracking) return;
        
        console.log('Received SOS signal:', participantData);
        
        // Update participant data
        this.processParticipantUpdate(participantData);
        
        // Find the participant
        const participant = window.organizerTracking.participants.find(p => p.id === participantData.id);
        
        // Show SOS alert
        if (participant) {
            window.organizerTracking.showSOSAlert(participant);
        }
    }
    
    // Fallback method to process updates from localStorage (for organizer)
    processUpdatesFallback() {
        if (!this.isOrganizer || !window.organizerTracking) return;
        
        const allData = this.getAllTrackingData();
        const currentTime = new Date();
        
        // Process each participant's data
        Object.values(allData).forEach(participantData => {
            // Check if data is recent (within last 30 seconds)
            const lastUpdate = new Date(participantData.lastUpdate);
            const timeDiff = (currentTime - lastUpdate) / 1000;
            
            if (timeDiff <= 30) {
                this.processParticipantUpdate(participantData);
                
                // Show SOS alert if needed
                if (participantData.status === 'sos' && participantData.sosTimestamp) {
                    const sosTime = new Date(participantData.sosTimestamp);
                    const sosDiff = (currentTime - sosTime) / 1000;
                    
                    // Only show alert for recent SOS signals (within 10 seconds)
                    if (sosDiff <= 10) {
                        const participant = window.organizerTracking.participants.find(p => p.id === participantData.id);
                        if (participant) {
                            window.organizerTracking.showSOSAlert(participant);
                        }
                    }
                }
            }
        });
    }
    
    // Get all tracking data from localStorage
    getAllTrackingData() {
        const dataStr = localStorage.getItem(this.storageKey);
        return dataStr ? JSON.parse(dataStr) : {};
    }
    
    // Save all tracking data to localStorage
    saveAllTrackingData(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
    
    // Clear all tracking data
    clearAllTrackingData() {
        localStorage.removeItem(this.storageKey);
        console.log('All tracking data cleared');
    }
}

// Create global instance
window.trackingCommunication = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Create and initialize the tracking communication
    window.trackingCommunication = new TrackingCommunication();
    
    console.log("Tracking communication initialized");
});
