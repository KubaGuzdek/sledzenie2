/**
 * Organizer Tracking functionality for King Of theBay application
 * This module handles tracking multiple participants, SOS signals, and race management
 */

// Main organizer tracking class
class OrganizerTracking {
    constructor() {
        // Configuration
        this.participants = [];
        this.activeRace = null;
        this.raceHistory = [];
        this.sosAlerts = [];
        
        // Map visualization
        this.mapContainer = document.querySelector('.organizer-map');
        this.participantMarkers = {};
        
        // Initialize
        this.init();
    }
    
    // Initialize the organizer tracking
    init() {
        // Load participants data (in a real app, this would come from a server)
        this.loadParticipantsData();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize map
        this.initializeMap();
        
        // Start position simulation for demo purposes
        this.startPositionSimulation();
        
        // Check if tracking communication module is available
        if (window.trackingCommunication) {
            if (window.showDebug) {
                window.showDebug('Organizer: Connected to tracking communication module');
            }
            console.log("Connected to tracking communication module");
        } else {
            if (window.showDebug) {
                window.showDebug('Organizer: WARNING - Tracking communication module not found');
            }
            console.warn("Tracking communication module not found");
        }
        
        console.log("Organizer tracking initialized");
    }
    
    // Load participants data
    loadParticipantsData() {
        // In a real application, this would fetch data from a server
        // For demo purposes, we'll use hardcoded data
        this.participants = [
            {
                id: 1,
                name: "Marek Kowalski",
                sailNumber: "POL-123",
                status: "sos",
                position: { latitude: 54.6892, longitude: 18.4021 },
                distance: 3.2,
                speed: 0,
                gpsStatus: "bad",
                trackingColor: "#f44336",
                positionHistory: []
            },
            {
                id: 2,
                name: "Anna Nowak",
                sailNumber: "POL-456",
                status: "active",
                position: { latitude: 54.6950, longitude: 18.4120 },
                distance: 5.7,
                speed: 24.5,
                gpsStatus: "good",
                trackingColor: "#1a73e8",
                positionHistory: []
            },
            {
                id: 3,
                name: "Piotr Wiśniewski",
                sailNumber: "POL-789",
                status: "active",
                position: { latitude: 54.6930, longitude: 18.4080 },
                distance: 4.1,
                speed: 22.8,
                gpsStatus: "good",
                trackingColor: "#4caf50",
                positionHistory: []
            },
            {
                id: 4,
                name: "Katarzyna Dąbrowska",
                sailNumber: "POL-234",
                status: "active",
                position: { latitude: 54.6910, longitude: 18.4050 },
                distance: 2.8,
                speed: 18.3,
                gpsStatus: "warning",
                trackingColor: "#ff9800",
                positionHistory: []
            },
            {
                id: 5,
                name: "Tomasz Lewandowski",
                sailNumber: "POL-567",
                status: "active",
                position: { latitude: 54.6970, longitude: 18.4150 },
                distance: 6.3,
                speed: 26.1,
                gpsStatus: "good",
                trackingColor: "#9c27b0",
                positionHistory: []
            },
            {
                id: 6,
                name: "Magdalena Zielińska",
                sailNumber: "POL-890",
                status: "waiting",
                position: null,
                distance: 0,
                speed: 0,
                gpsStatus: "inactive",
                trackingColor: "#795548",
                positionHistory: []
            },
            {
                id: 7,
                name: "Krzysztof Szymański",
                sailNumber: "POL-345",
                status: "waiting",
                position: null,
                distance: 0,
                speed: 0,
                gpsStatus: "inactive",
                trackingColor: "#607d8b",
                positionHistory: []
            }
        ];
        
        // Initialize active race
        this.activeRace = {
            id: 1,
            name: "King Of theBay 2025 - Wyścig 1",
            date: "2025-03-26",
            status: "active",
            startTime: new Date(2025, 2, 26, 10, 0, 0),
            endTime: null,
            participants: this.participants.map(p => p.id),
            results: []
        };
    }
    
    // Set up event listeners
    setupEventListeners() {
        // Race control buttons
        const startRaceBtn = document.querySelector('.race-btn-primary');
        const pauseRaceBtn = document.querySelector('.race-btn-warning');
        const endRaceBtn = document.querySelector('.race-btn-danger');
        
        if (startRaceBtn) {
            startRaceBtn.addEventListener('click', () => this.startRace());
        }
        
        if (pauseRaceBtn) {
            pauseRaceBtn.addEventListener('click', () => this.pauseRace());
        }
        
        if (endRaceBtn) {
            endRaceBtn.addEventListener('click', () => this.endRace());
        }
        
        // Map control buttons
        const zoomInBtn = document.querySelector('.map-control-btn:nth-child(1)');
        const zoomOutBtn = document.querySelector('.map-control-btn:nth-child(2)');
        const centerMapBtn = document.querySelector('.map-control-btn:nth-child(3)');
        const layersBtn = document.querySelector('.map-control-btn:nth-child(4)');
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.zoomIn());
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }
        
        if (centerMapBtn) {
            centerMapBtn.addEventListener('click', () => this.centerMap());
        }
        
        if (layersBtn) {
            layersBtn.addEventListener('click', () => this.toggleLayers());
        }
        
        // Participant list items
        const participantItems = document.querySelectorAll('.participant-item');
        participantItems.forEach((item, index) => {
            if (index < this.participants.length) {
                item.addEventListener('click', () => this.selectParticipant(this.participants[index]));
            }
        });
        
        // Filter tabs
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach((tab, index) => {
            tab.addEventListener('click', () => this.filterParticipants(index));
        });
    }
    
    // Initialize map
    initializeMap() {
        // In a real application, this would initialize a map like Google Maps or OpenStreetMap
        // For demo purposes, we'll just use our simple map visualization
        
        // Create markers for each participant
        this.participants.forEach(participant => {
            if (participant.status !== 'waiting' && participant.position) {
                this.createParticipantMarker(participant);
            }
        });
    }
    
    // Create a marker for a participant
    createParticipantMarker(participant) {
        // Check if marker already exists
        if (this.participantMarkers[participant.id]) {
            return;
        }
        
        // In a real application, this would create a marker on a real map
        // For demo purposes, we'll just use our simple marker elements
        
        // Find existing marker element or create a new one
        let markerElement = document.querySelector(`.participant-marker[data-id="${participant.id}"]`);
        
        if (!markerElement) {
            markerElement = document.createElement('div');
            markerElement.className = 'participant-marker';
            markerElement.setAttribute('data-id', participant.id);
            markerElement.style.backgroundColor = participant.trackingColor;
            
            // Add tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'participant-tooltip';
            tooltip.textContent = `${participant.name} (${participant.sailNumber})`;
            
            // Add SOS indicator if needed
            if (participant.status === 'sos') {
                markerElement.classList.add('sos');
                tooltip.textContent += ' - SOS!';
            }
            
            markerElement.appendChild(tooltip);
            
            // Add click event
            markerElement.addEventListener('click', () => {
                this.selectParticipant(participant);
                
                // Show SOS alert for SOS participants
                if (participant.status === 'sos') {
                    this.showSOSAlert(participant);
                }
            });
            
            // Add to map
            this.mapContainer.appendChild(markerElement);
            
            // Create SVG path element for route tracking
            const svgId = `route-path-${participant.id}`;
            const existingSvg = document.getElementById(svgId);
            
            if (!existingSvg) {
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svg.setAttribute("id", svgId);
                svg.setAttribute("class", "route-path");
                svg.setAttribute("viewBox", "0 0 100 100");
                svg.style.position = "absolute";
                svg.style.top = "0";
                svg.style.left = "0";
                svg.style.width = "100%";
                svg.style.height = "100%";
                svg.style.pointerEvents = "none"; // Don't interfere with clicks
                
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("fill", "none");
                path.setAttribute("stroke", participant.trackingColor);
                path.setAttribute("stroke-width", "0.8");
                path.setAttribute("stroke-linecap", "round");
                path.setAttribute("stroke-linejoin", "round");
                path.setAttribute("stroke-opacity", "0.7");
                
                svg.appendChild(path);
                this.mapContainer.appendChild(svg);
                
                // Store path reference in participant
                participant.routePath = path;
            }
        }
        
        // Store marker reference
        this.participantMarkers[participant.id] = markerElement;
        
        // Update marker position
        this.updateMarkerPosition(participant);
    }
    
    // Update marker position
    updateMarkerPosition(participant) {
        const marker = this.participantMarkers[participant.id];
        if (!marker || !participant.position) return;
        
        // In a real application, this would convert GPS coordinates to map coordinates
        // For this improved version, we'll create more realistic movement patterns
        
        let left, top;
        
        if (participant.positionHistory.length > 0) {
            const lastPosition = participant.positionHistory[participant.positionHistory.length - 1];
            
            // Create a more realistic movement pattern based on participant's status and characteristics
            if (participant.status === 'sos') {
                // SOS participants move very little or not at all
                left = lastPosition.left + (Math.random() * 0.6 - 0.3);
                top = lastPosition.top + (Math.random() * 0.6 - 0.3);
            } else {
                // Active participants move in a more directed way
                // Use a semi-persistent direction to create more realistic paths
                if (!participant.movementDirection) {
                    participant.movementDirection = Math.random() * 2 * Math.PI;
                    participant.directionChangeCounter = 0;
                }
                
                // Occasionally change direction
                participant.directionChangeCounter++;
                if (participant.directionChangeCounter > 5 + Math.random() * 10) {
                    // Change direction by a small amount
                    participant.movementDirection += (Math.random() * 0.8 - 0.4);
                    participant.directionChangeCounter = 0;
                }
                
                // Calculate movement based on direction and speed
                const moveDistance = 0.5 + (participant.speed / 30) * 1.5; // Faster participants move more
                left = lastPosition.left + Math.cos(participant.movementDirection) * moveDistance;
                top = lastPosition.top + Math.sin(participant.movementDirection) * moveDistance;
                
                // If we're about to hit the edge, change direction
                if (left < 5 || left > 95 || top < 5 || top > 95) {
                    participant.movementDirection += Math.PI; // Reverse direction
                    left = lastPosition.left;
                    top = lastPosition.top;
                }
            }
            
            // Keep within bounds
            left = Math.max(5, Math.min(95, left));
            top = Math.max(5, Math.min(95, top));
        } else {
            // Generate initial position based on participant id but more spread out
            left = 10 + (participant.id * 12) % 80;
            top = 10 + (participant.id * 9) % 80;
        }
        
        // Update marker position
        marker.style.left = `${left}%`;
        marker.style.top = `${top}%`;
        
        // Store position in history
        participant.positionHistory.push({ left, top });
        
        // Update route path if we have a path element and multiple points
        if (participant.routePath && participant.positionHistory.length > 1) {
            this.updateRoutePath(participant);
        }
        
        // Update participant data with more realistic values
        // Distance increases based on speed and time
        participant.distance += (participant.speed / 3600) * 2; // km per 2 seconds
        
        // Speed varies slightly over time
        if (participant.status === 'active') {
            // Speed varies by ±10% each update
            const speedVariation = participant.speed * (Math.random() * 0.2 - 0.1);
            participant.speed = Math.max(10, Math.min(35, participant.speed + speedVariation));
        } else if (participant.status === 'sos') {
            // SOS participants slow down
            participant.speed = Math.max(0, participant.speed * 0.9);
        }
    }
    
    // Start position simulation for demo
    startPositionSimulation() {
        // Update positions every 2 seconds
        setInterval(() => {
            this.participants.forEach(participant => {
                if (participant.status === 'active') {
                    this.updateMarkerPosition(participant);
                    this.updateParticipantListItem(participant);
                }
            });
        }, 2000);
    }
    
    // Update route path visualization for a participant
    updateRoutePath(participant) {
        if (!participant.routePath || participant.positionHistory.length < 2) return;
        
        // Create path data string
        let pathData = `M ${participant.positionHistory[0].left} ${participant.positionHistory[0].top}`;
        
        // Add line segments for each position
        // For performance, limit the number of points in the path
        const maxPoints = 100;
        const history = participant.positionHistory.length > maxPoints 
            ? participant.positionHistory.slice(-maxPoints) 
            : participant.positionHistory;
            
        for (let i = 1; i < history.length; i++) {
            pathData += ` L ${history[i].left} ${history[i].top}`;
        }
        
        // Update path
        participant.routePath.setAttribute("d", pathData);
    }
    
    // Update participant list item
    updateParticipantListItem(participant) {
        const listItem = document.querySelector(`.participant-item:nth-child(${participant.id + 1})`);
        if (!listItem) return;
        
        // Update distance
        const distanceElement = listItem.querySelector('.participant-status div:last-child');
        if (distanceElement) {
            distanceElement.textContent = `${participant.distance.toFixed(1)} km`;
        }
        
        // Update GPS status
        const statusIcon = listItem.querySelector('.status-indicator i');
        if (statusIcon) {
            statusIcon.className = 'fas fa-satellite-dish';
            statusIcon.classList.remove('status-good', 'status-warning', 'status-bad');
            
            switch (participant.gpsStatus) {
                case 'good':
                    statusIcon.classList.add('status-good');
                    break;
                case 'warning':
                    statusIcon.classList.add('status-warning');
                    break;
                case 'bad':
                    statusIcon.classList.add('status-bad');
                    break;
            }
        }
    }
    
    // Select a participant
    selectParticipant(participant) {
        // Highlight participant in list
        const listItems = document.querySelectorAll('.participant-item');
        listItems.forEach(item => {
            if (!item.classList.contains('sos')) {
                item.classList.remove('active');
            }
        });
        
        const selectedItem = document.querySelector(`.participant-item:nth-child(${participant.id + 1})`);
        if (selectedItem && !selectedItem.classList.contains('sos')) {
            selectedItem.classList.add('active');
        }
        
        // Highlight marker on map
        Object.values(this.participantMarkers).forEach(marker => {
            marker.style.zIndex = 1;
            marker.style.boxShadow = 'none';
        });
        
        const selectedMarker = this.participantMarkers[participant.id];
        if (selectedMarker) {
            selectedMarker.style.zIndex = 10;
            selectedMarker.style.boxShadow = '0 0 0 3px white';
        }
        
        console.log(`Selected participant: ${participant.name} (${participant.sailNumber})`);
    }
    
    // Filter participants
    filterParticipants(filterIndex) {
        let filteredParticipants;
        
        switch (filterIndex) {
            case 0: // All
                filteredParticipants = this.participants;
                break;
            case 1: // Active
                filteredParticipants = this.participants.filter(p => p.status === 'active');
                break;
            case 2: // Waiting
                filteredParticipants = this.participants.filter(p => p.status === 'waiting');
                break;
            case 3: // SOS
                filteredParticipants = this.participants.filter(p => p.status === 'sos');
                break;
            default:
                filteredParticipants = this.participants;
        }
        
        // Update visibility of markers
        this.participants.forEach(participant => {
            const marker = this.participantMarkers[participant.id];
            if (marker) {
                if (filteredParticipants.includes(participant)) {
                    marker.style.display = 'block';
                } else {
                    marker.style.display = 'none';
                }
            }
        });
        
        console.log(`Filtered participants: ${filteredParticipants.length}`);
    }
    
    // Show SOS alert
    showSOSAlert(participant) {
        // Log SOS event
        if (window.showDebug) {
            window.showDebug(`Organizer: SOS ALERT RECEIVED from ${participant.name} (${participant.sailNumber})`);
            window.showDebug(`Organizer: Position: ${participant.position.latitude.toFixed(6)}, ${participant.position.longitude.toFixed(6)}`);
        }
        
        console.log(`SOS ALERT from ${participant.name}`, participant);
        
        // Show alert
        alert(`SOS od zawodnika: ${participant.name} (${participant.sailNumber})
Lokalizacja: ${participant.position.latitude.toFixed(4)}° N, ${participant.position.longitude.toFixed(4)}° E
Wysłano pomoc ratunkową.`);
        
        // Add to SOS alerts
        if (!this.sosAlerts.find(alert => alert.participantId === participant.id)) {
            this.sosAlerts.push({
                participantId: participant.id,
                timestamp: new Date(),
                position: participant.position,
                acknowledged: false
            });
        }
        
        // Highlight the participant in the list
        const listItem = document.querySelector(`.participant-item:nth-child(${participant.id + 1})`);
        if (listItem) {
            listItem.classList.add('sos');
        }
    }
    
    // Start race
    startRace() {
        if (!this.activeRace || this.activeRace.status === 'active') {
            alert('Wyścig już jest w trakcie');
            return;
        }
        
        this.activeRace.status = 'active';
        this.activeRace.startTime = new Date();
        
        // Update participants status
        this.participants.forEach(participant => {
            if (participant.status === 'waiting') {
                participant.status = 'active';
                participant.position = {
                    latitude: 54.6900 + (Math.random() * 0.01),
                    longitude: 18.4000 + (Math.random() * 0.01)
                };
                this.createParticipantMarker(participant);
            }
        });
        
        alert('Wyścig rozpoczęty!');
        console.log('Race started:', this.activeRace);
    }
    
    // Pause race
    pauseRace() {
        if (!this.activeRace || this.activeRace.status !== 'active') {
            alert('Brak aktywnego wyścigu do wstrzymania');
            return;
        }
        
        this.activeRace.status = 'paused';
        alert('Wyścig wstrzymany');
        console.log('Race paused:', this.activeRace);
    }
    
    // End race
    endRace() {
        if (!this.activeRace) {
            alert('Brak aktywnego wyścigu do zakończenia');
            return;
        }
        
        this.activeRace.status = 'finished';
        this.activeRace.endTime = new Date();
        
        // Generate results
        this.generateRaceResults();
        
        // Add to history
        this.raceHistory.push(this.activeRace);
        
        alert('Wyścig zakończony. Wyniki zostały wygenerowane.');
        console.log('Race ended:', this.activeRace);
        
        // Show results panel
        const mapView = document.getElementById('map-view');
        const resultsPanel = document.getElementById('results-panel');
        
        if (mapView && resultsPanel) {
            mapView.style.display = 'none';
            resultsPanel.style.display = 'block';
            
            // Activate the "Wyniki" tab
            const filterTabs = document.querySelectorAll('.filter-tab');
            filterTabs.forEach((tab, index) => {
                tab.classList.remove('active');
                if (index === 4) { // "Wyniki" tab (5th tab, index 4)
                    tab.classList.add('active');
                }
            });
        }
    }
    
    // Generate race results
    generateRaceResults() {
        // Sort participants by distance (in a real app, this would be more complex)
        const activeParticipants = this.participants.filter(p => p.status === 'active');
        activeParticipants.sort((a, b) => b.distance - a.distance);
        
        // Generate results
        this.activeRace.results = activeParticipants.map((participant, index) => {
            // Calculate race time (in a real app, this would be actual elapsed time)
            const minutes = 38 + index * 2 + Math.floor(Math.random() * 2);
            const seconds = Math.floor(Math.random() * 60);
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            return {
                position: index + 1,
                participantId: participant.id,
                name: participant.name,
                sailNumber: participant.sailNumber,
                time: timeString,
                distance: participant.distance.toFixed(1)
            };
        });
    }
    
    // Map zoom in
    zoomIn() {
        // In a real application, this would zoom in the map
        alert('Przybliżenie mapy');
    }
    
    // Map zoom out
    zoomOut() {
        // In a real application, this would zoom out the map
        alert('Oddalenie mapy');
    }
    
    // Center map
    centerMap() {
        // In a real application, this would center the map
        alert('Centrowanie mapy');
    }
    
    // Toggle map layers
    toggleLayers() {
        // In a real application, this would toggle map layers
        alert('Przełączanie warstw mapy');
    }
}

// Initialize the organizer tracking when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Create and initialize the organizer tracking
    window.organizerTracking = new OrganizerTracking();
    
    // Add debug function if not already defined
    if (!window.showDebug && typeof console !== 'undefined') {
        window.showDebug = function(message) {
            console.log(message);
            
            // If debug panel exists, use it
            const debugPanel = document.getElementById('debug-panel');
            const debugContent = document.getElementById('debug-content');
            
            if (debugPanel && debugContent) {
                // Show the panel
                debugPanel.style.display = 'block';
                
                // Add timestamp to message
                const now = new Date();
                const timestamp = now.getHours().toString().padStart(2, '0') + ':' + 
                                 now.getMinutes().toString().padStart(2, '0') + ':' + 
                                 now.getSeconds().toString().padStart(2, '0');
                
                // Add the message to the content
                debugContent.innerHTML += `<div>[${timestamp}] ${message}</div>`;
                
                // Scroll to bottom
                debugContent.scrollTop = debugContent.scrollHeight;
            }
        };
        
        window.showDebug('Debug function initialized in organizer view');
    }
    
    console.log("Organizer tracking initialized");
});
