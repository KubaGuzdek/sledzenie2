/**
 * GPS Tracking functionality for King Of theBay application
 * This module handles GPS tracking, position updates, and related calculations
 */

// Main GPS tracking class
class GPSTracker {
    constructor() {
        // Configuration
        this.trackingActive = false;
        this.trackingInterval = null;
        this.updateFrequency = 1000; // Update every 1 second
        this.positionHistory = [];
        this.currentPosition = null;
        this.startTime = null;
        this.totalDistance = 0;
        this.currentSpeed = 0;
        this.maxSpeed = 0;
        
        // Callbacks
        this.onPositionUpdate = null;
        this.onSpeedUpdate = null;
        this.onDistanceUpdate = null;
        this.onGPSStatusChange = null;
        this.onError = null;
        
        // Check if geolocation is available
        if (!navigator.geolocation) {
            console.error("Geolocation is not supported by this browser");
            this.updateGPSStatus("error", "Geolocation not supported");
        }
    }
    
    // Start GPS tracking
    startTracking() {
        if (this.trackingActive) return;
        
        this.trackingActive = true;
        this.startTime = new Date();
        this.positionHistory = [];
        this.totalDistance = 0;
        this.currentSpeed = 0;
        this.maxSpeed = 0;
        
        // Show debug info if available
        if (window.showDebug) {
            window.showDebug('Starting GPS tracking...');
        }
        
        this.updateGPSStatus("connecting", "Connecting to GPS...");
        
        // Get initial position
        this.getCurrentPosition()
            .then(position => {
                this.currentPosition = position;
                this.positionHistory.push(position);
                this.updateGPSStatus("good", "GPS signal: Good");
                
                // Start regular tracking
                this.trackingInterval = setInterval(() => {
                    this.updatePosition();
                }, this.updateFrequency);
                
                // Start sending position updates to organizer view
                if (window.trackingCommunication) {
                    // Get participant number from localStorage
                    const participantNumber = localStorage.getItem('participantNumber');
                    if (participantNumber) {
                        window.trackingCommunication.startSending(parseInt(participantNumber));
                        
                        if (window.showDebug) {
                            window.showDebug('Connected to tracking communication module');
                            window.showDebug(`Participant #${participantNumber} started sending updates`);
                            window.showDebug(`Initial position: ${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`);
                        }
                    } else {
                        if (window.showDebug) {
                            window.showDebug('WARNING: No participant number found in localStorage');
                        }
                        console.warn('No participant number found in localStorage');
                    }
                } else {
                    if (window.showDebug) {
                        window.showDebug('WARNING: Tracking communication module not found');
                    }
                    console.warn('Tracking communication module not found');
                }
            })
            .catch(error => {
                this.handleError(error);
                this.stopTracking();
            });
    }
    
    // Stop GPS tracking
    stopTracking() {
        if (!this.trackingActive) return;
        
        this.trackingActive = false;
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }
        
        // Stop sending position updates
        if (window.trackingCommunication) {
            window.trackingCommunication.stopSending();
            
            if (window.showDebug) {
                window.showDebug('Stopped sending position updates');
            }
        }
        
        if (window.showDebug) {
            window.showDebug('GPS tracking stopped');
            window.showDebug(`Total distance: ${(this.totalDistance / 1000).toFixed(2)} km`);
            window.showDebug(`Max speed: ${this.maxSpeed.toFixed(2)} km/h`);
        }
        
        this.updateGPSStatus("inactive", "GPS tracking stopped");
        
        // Return tracking summary
        return this.getTrackingSummary();
    }
    
    // Pause tracking temporarily
    pauseTracking() {
        if (!this.trackingActive || !this.trackingInterval) return;
        
        clearInterval(this.trackingInterval);
        this.trackingInterval = null;
        this.updateGPSStatus("paused", "GPS tracking paused");
    }
    
    // Resume tracking after pause
    resumeTracking() {
        if (!this.trackingActive || this.trackingInterval) return;
        
        this.trackingInterval = setInterval(() => {
            this.updatePosition();
        }, this.updateFrequency);
        
        this.updateGPSStatus("good", "GPS signal: Good");
    }
    
    // Get current position as a Promise
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            // Try to get actual GPS position
            navigator.geolocation.getCurrentPosition(
                position => {
                    const pos = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        altitude: position.coords.altitude,
                        altitudeAccuracy: position.coords.altitudeAccuracy,
                        heading: position.coords.heading,
                        speed: position.coords.speed,
                        timestamp: position.timestamp
                    };
                    
                    if (window.showDebug) {
                        window.showDebug(`Real GPS position: ${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}`);
                    }
                    
                    resolve(pos);
                },
                error => {
                    // If real GPS fails, use simulated position data
                    console.log("Using simulated GPS data:", error.message);
                    
                    if (window.showDebug) {
                        window.showDebug(`GPS error: ${error.message}. Using simulated data.`);
                    }
                    
                    // Base coordinates for Zatoka Pucka (Bay of Puck)
                    const baseLatitude = 54.6960;
                    const baseLongitude = 18.4310;
                    
                    // If we have previous position, create realistic movement
                    let latitude, longitude, speed;
                    
                    if (this.currentPosition) {
                        // Calculate new position with some randomness but following a pattern
                        const maxMove = 0.0005; // Max movement in degrees (about 50 meters)
                        latitude = this.currentPosition.latitude + (Math.random() * 2 - 1) * maxMove;
                        longitude = this.currentPosition.longitude + (Math.random() * 2 - 1) * maxMove;
                        
                        // Calculate simulated speed (15-30 km/h is typical for wingfoil)
                        speed = 4 + Math.random() * 4; // 4-8 m/s (14.4-28.8 km/h)
                    } else {
                        // Initial position
                        latitude = baseLatitude + (Math.random() * 0.01 - 0.005);
                        longitude = baseLongitude + (Math.random() * 0.01 - 0.005);
                        speed = 5; // Initial speed 5 m/s (18 km/h)
                    }
                    
                    // Create simulated position object
                    const simulatedPosition = {
                        latitude: latitude,
                        longitude: longitude,
                        accuracy: 5 + Math.random() * 10, // 5-15 meters accuracy
                        altitude: 0, // At sea level
                        altitudeAccuracy: null,
                        heading: Math.random() * 360, // Random heading
                        speed: speed,
                        timestamp: Date.now()
                    };
                    
                    if (window.showDebug) {
                        window.showDebug(`Simulated position: ${simulatedPosition.latitude.toFixed(6)}, ${simulatedPosition.longitude.toFixed(6)}`);
                    }
                    
                    resolve(simulatedPosition);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }
    
    // Update current position
    updatePosition() {
        this.getCurrentPosition()
            .then(position => {
                // Calculate distance from last position
                if (this.currentPosition) {
                    const distance = this.calculateDistance(
                        this.currentPosition.latitude,
                        this.currentPosition.longitude,
                        position.latitude,
                        position.longitude
                    );
                    
                    // Only add to total if it's a significant movement (to filter GPS jitter)
                    if (distance > 2) { // More than 2 meters
                        this.totalDistance += distance;
                    }
                }
                
                // Update current position
                this.currentPosition = position;
                this.positionHistory.push(position);
                
                // Update speed
                this.updateSpeed(position);
                
                // Call position update callback
                if (this.onPositionUpdate) {
                    this.onPositionUpdate(position);
                }
                
                // Call distance update callback
                if (this.onDistanceUpdate) {
                    this.onDistanceUpdate(this.totalDistance);
                }
                
                // Update GPS status based on accuracy
                this.updateGPSStatusFromAccuracy(position.accuracy);
            })
            .catch(error => {
                this.handleError(error);
            });
    }
    
    // Update speed calculations
    updateSpeed(position) {
        // Use device-provided speed if available
        if (position.speed !== null && position.speed !== undefined) {
            // Convert m/s to km/h
            this.currentSpeed = position.speed * 3.6;
        } 
        // Otherwise calculate from position changes
        else if (this.positionHistory.length >= 2) {
            const prevPosition = this.positionHistory[this.positionHistory.length - 2];
            const timeDiff = (position.timestamp - prevPosition.timestamp) / 1000; // in seconds
            
            if (timeDiff > 0) {
                const distance = this.calculateDistance(
                    prevPosition.latitude,
                    prevPosition.longitude,
                    position.latitude,
                    position.longitude
                );
                
                // Speed in km/h
                this.currentSpeed = (distance / 1000) / (timeDiff / 3600);
            }
        }
        
        // Update max speed
        if (this.currentSpeed > this.maxSpeed) {
            this.maxSpeed = this.currentSpeed;
        }
        
        // Call speed update callback
        if (this.onSpeedUpdate) {
            this.onSpeedUpdate(this.currentSpeed, this.maxSpeed);
        }
    }
    
    // Calculate distance between two points using Haversine formula
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth radius in meters
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // Distance in meters
        return distance;
    }
    
    // Convert degrees to radians
    deg2rad(deg) {
        return deg * (Math.PI/180);
    }
    
    // Update GPS status based on accuracy
    updateGPSStatusFromAccuracy(accuracy) {
        let status, message;
        
        if (accuracy <= 10) { // High accuracy (10 meters or less)
            status = "good";
            message = "GPS signal: Good";
        } else if (accuracy <= 30) { // Medium accuracy
            status = "warning";
            message = "GPS signal: Fair";
        } else { // Low accuracy
            status = "bad";
            message = "GPS signal: Poor";
        }
        
        this.updateGPSStatus(status, message);
    }
    
    // Update GPS status and call callback
    updateGPSStatus(status, message) {
        if (this.onGPSStatusChange) {
            this.onGPSStatusChange(status, message);
        }
    }
    
    // Handle errors
    handleError(error) {
        let errorMessage;
        
        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = "User denied the request for Geolocation";
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = "Location information is unavailable";
                break;
            case error.TIMEOUT:
                errorMessage = "The request to get user location timed out";
                break;
            default:
                errorMessage = "An unknown error occurred";
                break;
        }
        
        console.error("Geolocation error:", errorMessage);
        this.updateGPSStatus("error", errorMessage);
        
        if (this.onError) {
            this.onError(errorMessage);
        }
    }
    
    // Get tracking summary
    getTrackingSummary() {
        if (this.positionHistory.length === 0) {
            return null;
        }
        
        const endTime = new Date();
        const durationMs = endTime - this.startTime;
        const durationMinutes = Math.floor(durationMs / 60000);
        
        return {
            startTime: this.startTime,
            endTime: endTime,
            duration: durationMinutes,
            distance: this.totalDistance / 1000, // Convert to km
            averageSpeed: this.totalDistance / 1000 / (durationMs / 3600000), // km/h
            maxSpeed: this.maxSpeed,
            startPosition: this.positionHistory[0],
            endPosition: this.currentPosition,
            path: this.positionHistory
        };
    }
    
    // Get current tracking status
    getStatus() {
        return {
            active: this.trackingActive,
            currentPosition: this.currentPosition,
            distance: this.totalDistance / 1000, // Convert to km
            currentSpeed: this.currentSpeed,
            maxSpeed: this.maxSpeed,
            duration: this.startTime ? Math.floor((new Date() - this.startTime) / 60000) : 0 // in minutes
        };
    }
    
    // Send SOS signal
    sendSOS() {
        // Ensure we have a position, even if it's simulated
        if (!this.currentPosition) {
            // Generate a simulated position if none exists
            this.getCurrentPosition()
                .then(position => {
                    this.currentPosition = position;
                    this._sendSOSWithPosition();
                })
                .catch(error => {
                    console.error("Failed to get position for SOS:", error);
                    // Send SOS even without position
                    this._sendSOSWithPosition();
                });
        } else {
            this._sendSOSWithPosition();
        }
        
        return {
            timestamp: new Date(),
            position: this.currentPosition,
            user: {
                name: localStorage.getItem('userName') || 'Unknown',
                sailNumber: localStorage.getItem('sailNumber') || 'Unknown'
            }
        };
    }
    
    // Internal method to send SOS with position
    _sendSOSWithPosition() {
        const sosData = {
            timestamp: new Date(),
            position: this.currentPosition,
            user: {
                name: localStorage.getItem('userName') || 'Unknown',
                sailNumber: localStorage.getItem('sailNumber') || 'Unknown'
            }
        };
        
        console.log("SOS signal sent:", sosData);
        
        if (window.showDebug) {
            window.showDebug('SOS EMERGENCY SIGNAL ACTIVATED');
            window.showDebug(`Position: ${this.currentPosition ? `${this.currentPosition.latitude.toFixed(6)}, ${this.currentPosition.longitude.toFixed(6)}` : 'Unknown'}`);
        }
        
        // Send SOS signal to organizer view
        if (window.trackingCommunication) {
            window.trackingCommunication.sendSOS(this.currentPosition);
            
            if (window.showDebug) {
                window.showDebug('SOS signal sent to organizer');
            }
        } else {
            if (window.showDebug) {
                window.showDebug('ERROR: Could not send SOS - communication module not found');
            }
            console.error('Could not send SOS - communication module not found');
        }
        
        // In a real application, this would send the SOS data to a server
        // For now, we'll just simulate it with a console log and localStorage
        
        // Store SOS in localStorage for persistence
        try {
            const sosHistory = JSON.parse(localStorage.getItem('sosHistory') || '[]');
            sosHistory.push(sosData);
            localStorage.setItem('sosHistory', JSON.stringify(sosHistory));
        } catch (e) {
            console.error("Failed to store SOS in localStorage:", e);
        }
    }
}

// Map visualization class using Mapbox
class MapVisualizer {
    constructor(mapContainerId) {
        this.mapContainerId = mapContainerId;
        this.mapContainer = document.querySelector(`#${mapContainerId} .map-container`);
        
        if (!this.mapContainer) {
            console.error(`Map container not found in ${mapContainerId}`);
            return;
        }
        
        // Initialize Mapbox map
        this.initializeMap();
        
        // For route visualization
        this.routePoints = [];
        this.routeSource = null;
    }
    
    // Initialize Mapbox map
    initializeMap() {
        // Clear any existing content
        this.mapContainer.innerHTML = '';
        
        // Create a div for the Mapbox map
        const mapElement = document.createElement('div');
        mapElement.style.width = '100%';
        mapElement.style.height = '100%';
        this.mapContainer.appendChild(mapElement);
        
        // Fetch Mapbox token from server
        fetch('/api/mapbox-token')
            .then(response => response.json())
            .then(data => {
                // Set Mapbox access token
                mapboxgl.accessToken = data.token;
                
                // Create Mapbox map centered on Zatoka Pucka (Bay of Puck)
                this.map = new mapboxgl.Map({
                    container: mapElement,
                    style: 'mapbox://styles/mapbox/outdoors-v12',
                    center: [18.4310, 54.6960], // Note: Mapbox uses [longitude, latitude] format
                    zoom: 13
                });
                
                // Add navigation controls
                this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
                
                // Create marker element for current position
                const markerElement = document.createElement('div');
                markerElement.className = 'current-position-marker';
                markerElement.style.backgroundColor = '#1a73e8';
                markerElement.style.width = '20px';
                markerElement.style.height = '20px';
                markerElement.style.borderRadius = '50%';
                markerElement.style.border = '2px solid white';
                
                // Create marker for current position
                this.currentMarker = new mapboxgl.Marker(markerElement)
                    .setLngLat([18.4310, 54.6960])
                    .addTo(this.map);
                
                // Wait for map to load before adding route line
                this.map.on('load', () => {
                    // Add source and layer for route line
                    this.map.addSource('route', {
                        'type': 'geojson',
                        'data': {
                            'type': 'Feature',
                            'properties': {},
                            'geometry': {
                                'type': 'LineString',
                                'coordinates': []
                            }
                        }
                    });
                    
                    this.map.addLayer({
                        'id': 'route',
                        'type': 'line',
                        'source': 'route',
                        'layout': {
                            'line-join': 'round',
                            'line-cap': 'round'
                        },
                        'paint': {
                            'line-color': '#1a73e8',
                            'line-width': 4,
                            'line-opacity': 0.7
                        }
                    });
                    
                    this.routeSource = this.map.getSource('route');
                });
                
                if (window.showDebug) {
                    window.showDebug(`Mapbox map initialized in ${this.mapContainerId}`);
                }
            })
            .catch(error => {
                console.error('Error fetching Mapbox token:', error);
                // Fallback to hardcoded token if fetch fails
                mapboxgl.accessToken = 'pk.eyJ1Ijoia3ViYWd1emRlayIsImEiOiJjbWI4OXg0NmEwZnB4Mm1zOXc2MW9mdXM3In0.h8OjP7afPMemytiyXz1rDA';
                
                // Create Mapbox map centered on Zatoka Pucka (Bay of Puck)
                this.map = new mapboxgl.Map({
                    container: mapElement,
                    style: 'mapbox://styles/mapbox/outdoors-v12',
                    center: [18.4310, 54.6960], // Note: Mapbox uses [longitude, latitude] format
                    zoom: 13
                });
                
                // Add navigation controls
                this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
                
                // Create marker element for current position
                const markerElement = document.createElement('div');
                markerElement.className = 'current-position-marker';
                markerElement.style.backgroundColor = '#1a73e8';
                markerElement.style.width = '20px';
                markerElement.style.height = '20px';
                markerElement.style.borderRadius = '50%';
                markerElement.style.border = '2px solid white';
                
                // Create marker for current position
                this.currentMarker = new mapboxgl.Marker(markerElement)
                    .setLngLat([18.4310, 54.6960])
                    .addTo(this.map);
                
                // Wait for map to load before adding route line
                this.map.on('load', () => {
                    // Add source and layer for route line
                    this.map.addSource('route', {
                        'type': 'geojson',
                        'data': {
                            'type': 'Feature',
                            'properties': {},
                            'geometry': {
                                'type': 'LineString',
                                'coordinates': []
                            }
                        }
                    });
                    
                    this.map.addLayer({
                        'id': 'route',
                        'type': 'line',
                        'source': 'route',
                        'layout': {
                            'line-join': 'round',
                            'line-cap': 'round'
                        },
                        'paint': {
                            'line-color': '#1a73e8',
                            'line-width': 4,
                            'line-opacity': 0.7
                        }
                    });
                    
                    this.routeSource = this.map.getSource('route');
                });
                
                if (window.showDebug) {
                    window.showDebug(`Mapbox map initialized in ${this.mapContainerId} with fallback token`);
                }
            });
    }
    
    // Update current position marker
    updatePosition(latitude, longitude) {
        if (!this.map || !this.currentMarker) return;
        
        // Update marker position (note Mapbox uses [lng, lat] format)
        this.currentMarker.setLngLat([longitude, latitude]);
        
        // Center map on current position
        this.map.panTo([longitude, latitude]);
        
        // Add point to route
        this.routePoints.push({
            lat: latitude,
            lng: longitude
        });
        
        // Update route path if we have multiple points
        if (this.routePoints.length > 1) {
            this.updateRoutePath();
        }
        
        if (window.showDebug) {
            window.showDebug(`Position updated: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
    }
    
    // Update route path visualization
    updateRoutePath() {
        if (!this.map || !this.routeSource || !this.map.loaded()) return;
        
        // Convert route points to GeoJSON coordinates array [lng, lat]
        const coordinates = this.routePoints.map(point => [point.lng, point.lat]);
        
        // Update route source data
        this.routeSource.setData({
            'type': 'Feature',
            'properties': {},
            'geometry': {
                'type': 'LineString',
                'coordinates': coordinates
            }
        });
    }
    
    // Clear route visualization
    clearRoute() {
        this.routePoints = [];
        if (this.routeSource && this.map.loaded()) {
            this.routeSource.setData({
                'type': 'Feature',
                'properties': {},
                'geometry': {
                    'type': 'LineString',
                    'coordinates': []
                }
            });
        }
    }
    
    // Add start and end markers for route summary
    addRouteMarkers(startPosition, endPosition) {
        if (!this.map || this.routePoints.length < 2) return;
        
        // Remove existing markers
        if (this.startMarker) this.startMarker.remove();
        if (this.endMarker) this.endMarker.remove();
        
        // Create start marker element
        const startMarkerEl = document.createElement('div');
        startMarkerEl.className = 'start-marker';
        startMarkerEl.style.backgroundColor = '#4caf50';
        startMarkerEl.style.width = '20px';
        startMarkerEl.style.height = '20px';
        startMarkerEl.style.borderRadius = '50%';
        startMarkerEl.style.border = '2px solid white';
        
        // Add start marker to map
        this.startMarker = new mapboxgl.Marker(startMarkerEl)
            .setLngLat([this.routePoints[0].lng, this.routePoints[0].lat])
            .addTo(this.map);
        
        // Create end marker element
        const endMarkerEl = document.createElement('div');
        endMarkerEl.className = 'end-marker';
        endMarkerEl.style.backgroundColor = '#f44336';
        endMarkerEl.style.width = '20px';
        endMarkerEl.style.height = '20px';
        endMarkerEl.style.borderRadius = '50%';
        endMarkerEl.style.border = '2px solid white';
        
        // Add end marker to map
        const lastPoint = this.routePoints[this.routePoints.length - 1];
        this.endMarker = new mapboxgl.Marker(endMarkerEl)
            .setLngLat([lastPoint.lng, lastPoint.lat])
            .addTo(this.map);
        
        // Fit map to show the entire route
        if (this.routePoints.length >= 2) {
            const bounds = this.routePoints.reduce((bounds, point) => {
                return bounds.extend([point.lng, point.lat]);
            }, new mapboxgl.LngLatBounds([this.routePoints[0].lng, this.routePoints[0].lat], 
                                         [this.routePoints[0].lng, this.routePoints[0].lat]));
            
            this.map.fitBounds(bounds, {
                padding: 50
            });
        }
    }
    
    // Update distance label
    updateDistanceLabel(distance) {
        // Create or update distance control
        if (!this.distanceControl) {
            // Create a custom control for displaying distance
            const distanceDiv = document.createElement('div');
            distanceDiv.className = 'distance-label mapboxgl-ctrl';
            distanceDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            distanceDiv.style.padding = '5px 10px';
            distanceDiv.style.borderRadius = '4px';
            distanceDiv.style.fontWeight = 'bold';
            distanceDiv.style.margin = '10px';
            distanceDiv.innerHTML = `Trasa: ${distance.toFixed(1)} km`;
            
            // Add to map container
            this.mapContainer.appendChild(distanceDiv);
            this.distanceControl = distanceDiv;
        } else {
            // Update existing control
            this.distanceControl.innerHTML = `Trasa: ${distance.toFixed(1)} km`;
        }
    }
}

// Main application controller
class TrackingApp {
    constructor() {
        this.gpsTracker = new GPSTracker();
        this.liveMapVisualizer = new MapVisualizer('map-screen');
        this.summaryMapVisualizer = null;
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Initialize GPS status indicators
        this.updateGPSStatusUI("inactive", "GPS tracking inactive");
        
        // Set up callbacks
        this.setupCallbacks();
    }
    
    // Initialize event listeners
    initEventListeners() {
        // Start tracking button
        const startTrackingBtn = document.querySelector('#home-screen .btn-primary');
        if (startTrackingBtn) {
            startTrackingBtn.addEventListener('click', () => {
                this.startTracking();
            });
        }
        
        // End tracking button
        const endTrackingBtn = document.getElementById('end-tracking-btn');
        if (endTrackingBtn) {
            endTrackingBtn.addEventListener('click', () => {
                this.stopTracking();
            });
        }
        
        // SOS button
        const sosBtn = document.getElementById('sos-btn');
        if (sosBtn) {
            sosBtn.addEventListener('click', () => {
                this.sendSOS();
            });
        }
        
        // Settings form
        const settingsForm = document.querySelector('#settings-screen form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettings();
            });
            
            // Save button in settings
            const saveSettingsBtn = document.querySelector('#settings-screen .btn-primary');
            if (saveSettingsBtn) {
                saveSettingsBtn.addEventListener('click', () => {
                    this.saveSettings();
                });
            }
        }
        
        // Load settings on init
        this.loadSettings();
    }
    
    // Set up callbacks
    setupCallbacks() {
        // Set up GPS tracker callbacks
        this.gpsTracker.onPositionUpdate = (position) => {
            // Update map with new position
            if (this.liveMapVisualizer) {
                this.liveMapVisualizer.updatePosition(position.latitude, position.longitude);
            }
        };
        
        this.gpsTracker.onSpeedUpdate = (currentSpeed, maxSpeed) => {
            // Update speed display
            const speedElement = document.getElementById('current-speed');
            if (speedElement) {
                speedElement.textContent = `${currentSpeed.toFixed(1)} km/h`;
            }
            
            const maxSpeedElement = document.getElementById('max-speed');
            if (maxSpeedElement) {
                maxSpeedElement.textContent = `${maxSpeed.toFixed(1)} km/h`;
            }
        };
        
        this.gpsTracker.onDistanceUpdate = (distance) => {
            // Update distance display
            const distanceElement = document.getElementById('total-distance');
            if (distanceElement) {
                distanceElement.textContent = `${(distance / 1000).toFixed(2)} km`;
            }
            
            // Update map distance label
            if (this.liveMapVisualizer) {
                this.liveMapVisualizer.updateDistanceLabel(distance / 1000);
            }
        };
        
        this.gpsTracker.onGPSStatusChange = (status, message) => {
            this.updateGPSStatusUI(status, message);
        };
        
        this.gpsTracker.onError = (errorMessage) => {
            // Show error message
            alert(`GPS Error: ${errorMessage}`);
        };
    }
    
    // Start tracking
    startTracking() {
        this.gpsTracker.startTracking();
    }
    
    // Stop tracking
    stopTracking() {
        const summary = this.gpsTracker.stopTracking();
        if (summary) {
            this.showTrackingSummary(summary);
        }
    }
    
    // Send SOS signal
    sendSOS() {
        const sosData = this.gpsTracker.sendSOS();
        alert('SOS signal sent to organizers!');
    }
    
    // Update GPS status UI
    updateGPSStatusUI(status, message) {
        const statusElement = document.getElementById('gps-status');
        if (!statusElement) return;
        
        // Update status indicator
        statusElement.className = `gps-status ${status}`;
        statusElement.textContent = message;
    }
    
    // Show tracking summary
    showTrackingSummary(summary) {
        // Create summary map if needed
        if (!this.summaryMapVisualizer) {
            this.summaryMapVisualizer = new MapVisualizer('summary-screen');
        }
        
        // Update summary UI
        const distanceElement = document.getElementById('summary-distance');
        if (distanceElement) {
            distanceElement.textContent = `${summary.distance.toFixed(2)} km`;
        }
        
        const durationElement = document.getElementById('summary-duration');
        if (durationElement) {
            const hours = Math.floor(summary.duration / 60);
            const minutes = summary.duration % 60;
            durationElement.textContent = `${hours}h ${minutes}m`;
        }
        
        const speedElement = document.getElementById('summary-speed');
        if (speedElement) {
            speedElement.textContent = `${summary.averageSpeed.toFixed(1)} km/h`;
        }
        
        const maxSpeedElement = document.getElementById('summary-max-speed');
        if (maxSpeedElement) {
            maxSpeedElement.textContent = `${summary.maxSpeed.toFixed(1)} km/h`;
        }
        
        // Add route to summary map
        if (this.summaryMapVisualizer && summary.path.length > 0) {
            // Add each point to route
            summary.path.forEach(point => {
                this.summaryMapVisualizer.updatePosition(point.latitude, point.longitude);
            });
            
            // Add start and end markers
            this.summaryMapVisualizer.addRouteMarkers(summary.startPosition, summary.endPosition);
        }
    }
    
    // Save settings
    saveSettings() {
        const nameInput = document.getElementById('user-name');
        const sailNumberInput = document.getElementById('sail-number');
        
        if (nameInput && sailNumberInput) {
            localStorage.setItem('userName', nameInput.value);
            localStorage.setItem('sailNumber', sailNumberInput.value);
            alert('Settings saved!');
        }
    }
    
    // Load settings
    loadSettings() {
        const nameInput = document.getElementById('user-name');
        const sailNumberInput = document.getElementById('sail-number');
        
        if (nameInput && sailNumberInput) {
            nameInput.value = localStorage.getItem('userName') || '';
            sailNumberInput.value = localStorage.getItem('sailNumber') || '';
        }
    }
}
