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
        this.participantProfile = null;
        this.isOrganizer = false;
        this.isAuthenticated = false;
        this.intervalId = null;
        this.websocket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000; // 3 seconds
        this.messageQueue = []; // Queue for messages when WebSocket is not connected
        this.onAuthenticationCallback = null;
        this.onRegistrationCallback = null;
        this.onProfileUpdateCallback = null;
        this.onParticipantListUpdateCallback = null;
        
        // Initialize
        this.init();
    }
    
    // Initialize the communication
    init() {
        // Check if we're in organizer or participant view
        this.isOrganizer = window.location.href.includes('organizer-view.html');
        
        // Load participant ID from localStorage if available
        this.participantId = localStorage.getItem('participantId');
        
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
        
        // Process any queued messages
        this.processMessageQueue();
        
        // Authenticate if we have participant ID or we're in organizer mode
        if (this.isOrganizer) {
            // Show authentication prompt for organizer
            this.promptOrganizerAuthentication();
        } else if (this.participantId) {
            // Try to authenticate with saved participant ID
            this.authenticateParticipant(this.participantId);
        }
    }
    
    // Process queued messages
    processMessageQueue() {
        if (this.messageQueue.length > 0 && this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            console.log(`Processing ${this.messageQueue.length} queued messages`);
            
            this.messageQueue.forEach(message => {
                this.websocket.send(message);
            });
            
            this.messageQueue = [];
        }
    }
    
    // Prompt for organizer authentication
    promptOrganizerAuthentication() {
        // Don't show a prompt in organizer view since we have a custom HTML form
        // The HTML form will call authenticateOrganizer directly
        console.log('Organizer authentication required - using HTML form');
    }
    
    // Authenticate as organizer
    authenticateOrganizer(password) {
        this.sendMessage({
            type: 'auth',
            data: {
                role: 'organizer',
                password: password
            }
        });
    }
    
    // Authenticate as participant
    authenticateParticipant(participantId) {
        this.sendMessage({
            type: 'auth',
            data: {
                role: 'participant',
                participantId: participantId
            }
        });
    }
    
    // Handle WebSocket message event
    handleWebSocketMessage(event) {
        try {
            const message = JSON.parse(event.data);
            
            // Handle different message types
            switch (message.type) {
                case 'init':
                    // Initial data from server
                    this.handleInitMessage(message);
                    break;
                case 'auth_response':
                    // Authentication response
                    this.handleAuthResponse(message);
                    break;
                case 'registration_response':
                    // Registration response
                    this.handleRegistrationResponse(message);
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
                case 'participant_registered':
                case 'profile_updated':
                    // Participant updates for organizer
                    if (this.isOrganizer && this.onParticipantListUpdateCallback) {
                        this.onParticipantListUpdateCallback(message.data);
                    }
                    break;
                default:
                    console.log(`Unknown message type: ${message.type}`);
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    }
    
    // Handle initial message from server
    handleInitMessage(message) {
        if (this.isOrganizer && window.organizerTracking) {
            // Process tracking data
            this.processInitialData(message.data);
            
            // Process participants list
            if (message.participants && this.onParticipantListUpdateCallback) {
                this.onParticipantListUpdateCallback(message.participants);
            }
        }
    }
    
    // Handle authentication response
    handleAuthResponse(message) {
        if (message.success) {
            this.isAuthenticated = true;
            
            if (message.role === 'participant' && message.profile) {
                this.participantProfile = message.profile;
                this.participantId = message.profile.id;
                
                // Save participant ID to localStorage
                localStorage.setItem('participantId', this.participantId);
                
                console.log(`Authenticated as participant: ${this.participantProfile.name}`);
            } else if (message.role === 'organizer') {
                console.log('Authenticated as organizer');
                
                // Start listening for participant updates
                this.startListening();
            }
            
            // Call callback if provided
            if (this.onAuthenticationCallback) {
                this.onAuthenticationCallback(true, message.role, message.profile);
            }
        } else {
            this.isAuthenticated = false;
            console.error(`Authentication failed: ${message.message}`);
            
            // Call callback if provided
            if (this.onAuthenticationCallback) {
                this.onAuthenticationCallback(false, null, null, message.message);
            }
        }
    }
    
    // Handle registration response
    handleRegistrationResponse(message) {
        if (message.success && message.profile) {
            this.participantProfile = message.profile;
            this.participantId = message.profile.id;
            this.isAuthenticated = true;
            
            // Save participant ID to localStorage
            localStorage.setItem('participantId', this.participantId);
            
            console.log(`Registered as participant: ${this.participantProfile.name}`);
            
            // Call callback if provided
            if (this.onRegistrationCallback) {
                this.onRegistrationCallback(true, message.profile);
            }
        } else {
            console.error(`Registration failed: ${message.message}`);
            
            // Call callback if provided
            if (this.onRegistrationCallback) {
                this.onRegistrationCallback(false, null, message.message);
            }
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
    
    // Register a new participant
    registerParticipant(profileData, callback) {
        this.onRegistrationCallback = callback;
        
        this.sendMessage({
            type: 'register_participant',
            data: profileData
        });
    }
    
    // Update participant profile
    updateProfile(profileData, callback) {
        this.onProfileUpdateCallback = callback;
        
        if (!this.participantId) {
            if (callback) {
                callback(false, null, 'Not authenticated');
            }
            return;
        }
        
        // Ensure ID is included
        profileData.id = this.participantId;
        
        this.sendMessage({
            type: 'profile_update',
            data: profileData
        });
    }
    
    // Set callback for participant list updates
    setParticipantListUpdateCallback(callback) {
        this.onParticipantListUpdateCallback = callback;
    }
    
    // Set callback for authentication
    setAuthenticationCallback(callback) {
        this.onAuthenticationCallback = callback;
    }
    
    // Start sending position updates (for participant)
    startSending(gpsTracker) {
        if (this.isOrganizer || !gpsTracker || !this.isAuthenticated) return;
        
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
        if (!this.participantProfile) return;
        
        const updateData = {
            id: this.participantId,
            name: this.participantProfile.name,
            sailNumber: this.participantProfile.sailNumber,
            color: this.participantProfile.trackingColor,
            position: status.currentPosition,
            speed: status.currentSpeed,
            distance: status.distance,
            lastUpdate: new Date().toISOString(),
            status: 'active'
        };
        
        this.sendMessage({
            type: 'position_update',
            data: updateData
        });
    }
    
    // Send a message via WebSocket or queue it if not connected
    sendMessage(message) {
        const messageString = JSON.stringify(message);
        
        // Send via WebSocket if available
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(messageString);
        } else {
            // Queue message for later
            this.messageQueue.push(messageString);
            console.log(`Message queued (${this.messageQueue.length} messages in queue)`);
            
            // Try to reconnect if not already trying
            if (!this.websocket || this.websocket.readyState === WebSocket.CLOSED) {
                this.connectWebSocket();
            }
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
        if (!this.participantProfile) return;
        
        const sosData = {
            id: this.participantId,
            name: this.participantProfile.name,
            sailNumber: this.participantProfile.sailNumber,
            color: this.participantProfile.trackingColor,
            position: position,
            status: 'sos',
            sosTimestamp: new Date().toISOString()
        };
        
        this.sendMessage({
            type: 'sos',
            data: sosData
        });
        
        console.log('SOS signal sent');
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
