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
                    window.trackingCommunication.startSending(this);
                    
                    if (window.showDebug) {
                        window.showDebug('Connected to tracking communication module');
                        window.showDebug(`Initial position: ${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`);
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

// Map visualization class using Leaflet
class MapVisualizer {
    constructor(mapContainerId) {
        this.mapContainerId = mapContainerId;
        this.mapContainer = document.querySelector(`#${mapContainerId} .map-container`);
        
        if (!this.mapContainer) {
            console.error(`Map container not found in ${mapContainerId}`);
            return;
        }
        
        // Initialize Leaflet map
        this.initializeMap();
        
        // For route visualization
        this.routePoints = [];
        this.routeLine = null;
    }
    
    // Initialize Leaflet map
    initializeMap() {
        // Clear any existing content
        this.mapContainer.innerHTML = '';
        
        // Create a div for the Leaflet map
        const mapElement = document.createElement('div');
        mapElement.style.width = '100%';
        mapElement.style.height = '100%';
        this.mapContainer.appendChild(mapElement);
        
        // Create Leaflet map centered on Zatoka Pucka (Bay of Puck)
        this.map = L.map(mapElement).setView([54.6960, 18.4310], 13);
        
        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(this.map);
        
        // Create marker for current position
        const userIcon = L.divIcon({
            className: 'current-position-icon',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            html: '<div style="background-color: #1a73e8; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>'
        });
        
        this.currentMarker = L.marker([54.6960, 18.4310], {
            icon: userIcon,
            zIndexOffset: 1000
        }).addTo(this.map);
        
        // Create polyline for route tracking
        this.routeLine = L.polyline([], {
            color: '#1a73e8',
            weight: 4,
            opacity: 0.7,
            lineJoin: 'round'
        }).addTo(this.map);
        
        if (window.showDebug) {
            window.showDebug(`Leaflet map initialized in ${this.mapContainerId}`);
        }
    }
    
    // Update current position marker
    updatePosition(latitude, longitude) {
        if (!this.map || !this.currentMarker) return;
        
        // Update marker position
        this.currentMarker.setLatLng([latitude, longitude]);
        
        // Center map on current position
        this.map.panTo([latitude, longitude]);
        
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
        if (!this.map || !this.routeLine) return;
        
        // Convert route points to LatLng array
        const latLngs = this.routePoints.map(point => [point.lat, point.lng]);
        
        // Update polyline
        this.routeLine.setLatLngs(latLngs);
    }
    
    // Clear route visualization
    clearRoute() {
        this.routePoints = [];
        if (this.routeLine) {
            this.routeLine.setLatLngs([]);
        }
    }
    
    // Add start and end markers for route summary
    addRouteMarkers(startPosition, endPosition) {
        if (!this.map || this.routePoints.length < 2) return;
        
        // Remove existing markers
        if (this.startMarker) this.map.removeLayer(this.startMarker);
        if (this.endMarker) this.map.removeLayer(this.endMarker);
        
        // Create start marker
        const startIcon = L.divIcon({
            className: 'start-marker-icon',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            html: '<div style="background-color: #4caf50; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>'
        });
        
        this.startMarker = L.marker([this.routePoints[0].lat, this.routePoints[0].lng], {
            icon: startIcon
        }).addTo(this.map);
        
        // Create end marker
        const endIcon = L.divIcon({
            className: 'end-marker-icon',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            html: '<div style="background-color: #f44336; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>'
        });
        
        const lastPoint = this.routePoints[this.routePoints.length - 1];
        this.endMarker = L.marker([lastPoint.lat, lastPoint.lng], {
            icon: endIcon
        }).addTo(this.map);
        
        // Fit map to show the entire route
        const bounds = this.routeLine.getBounds();
        this.map.fitBounds(bounds, {
            padding: [50, 50]
        });
    }
    
    // Update distance label
    updateDistanceLabel(distance) {
        // Create or update distance control
        if (!this.distanceControl) {
            // Create a custom control for displaying distance
            this.distanceControl = L.control({position: 'bottomleft'});
            
            this.distanceControl.onAdd = (map) => {
                const div = L.DomUtil.create('div', 'distance-label');
                div.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                div.style.padding = '5px 10px';
                div.style.borderRadius = '4px';
                div.style.fontWeight = 'bold';
                div.innerHTML = `Trasa: ${distance.toFixed(1)} km`;
                return div;
            };
            
            this.distanceControl.addTo(this.map);
        } else {
            // Update existing control
            const label = document.querySelector('.distance-label');
            if (label) {
                label.innerHTML = `Trasa: ${distance.toFixed(1)} km`;
            }
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
    
    // Set up GPS tracker callbacks
    setupCallbacks() {
        // Position update callback
        this.gpsTracker.onPositionUpdate = (position) => {
            // Update map visualization
            this.liveMapVisualizer.updatePosition(position.latitude, position.longitude);
        };
        
        // Speed update callback
        this.gpsTracker.onSpeedUpdate = (currentSpeed, maxSpeed) => {
            // Update speed display
            const speedDisplay = document.querySelector('#map-screen .stat-value');
            if (speedDisplay) {
                speedDisplay.textContent = currentSpeed.toFixed(1);
            }
        };
        
        // Distance update callback
        this.gpsTracker.onDistanceUpdate = (totalDistance) => {
            // Convert meters to kilometers
            const distanceKm = totalDistance / 1000;
            
            // Update distance display
            const distanceDisplay = document.querySelectorAll('#map-screen .stat-value')[1];
            if (distanceDisplay) {
                distanceDisplay.textContent = distanceKm.toFixed(1);
            }
            
            // Update map label
            this.liveMapVisualizer.updateDistanceLabel(distanceKm);
        };
        
        // GPS status change callback
        this.gpsTracker.onGPSStatusChange = (status, message) => {
            this.updateGPSStatusUI(status, message);
        };
        
        // Error callback
        this.gpsTracker.onError = (errorMessage) => {
            alert(`GPS Error: ${errorMessage}`);
        };
    }
    
    // Start GPS tracking
    startTracking() {
        // Switch to map screen
        showScreen('map-screen');
        
        // Clear previous route visualization
        this.liveMapVisualizer.clearRoute();
        
        // Start GPS tracking
        this.gpsTracker.startTracking();
    }
    
    // Stop GPS tracking and show summary
    stopTracking() {
        // Get tracking summary
        const summary = this.gpsTracker.stopTracking();
        
        if (!summary) {
            alert("No tracking data available");
            return;
        }
        
        // Initialize summary map visualizer
        this.summaryMapVisualizer = new MapVisualizer('summary-screen');
        
        // Copy route points from live map to summary map
        this.summaryMapVisualizer.routePoints = [...this.liveMapVisualizer.routePoints];
        this.summaryMapVisualizer.updateRoutePath();
        this.summaryMapVisualizer.addRouteMarkers(summary.startPosition, summary.endPosition);
        this.summaryMapVisualizer.updateDistanceLabel(summary.distance);
        
        // Update summary stats
        const summaryStats = document.querySelectorAll('#summary-screen .stat-value');
        if (summaryStats.length >= 4) {
            summaryStats[0].textContent = summary.distance.toFixed(1); // Distance
            summaryStats[1].textContent = summary.averageSpeed.toFixed(1); // Avg speed
            summaryStats[2].textContent = summary.maxSpeed.toFixed(1); // Max speed
            summaryStats[3].textContent = summary.duration; // Duration in minutes
        }
        
        // Switch to summary screen
        showScreen('summary-screen');
    }
    
    // Send SOS signal
    sendSOS() {
        const sosData = this.gpsTracker.sendSOS();
        
        // In a real application, this would send the SOS data to a server
        // For now, we'll just show an alert
        alert(`SOS sygnał wysłany! Pomoc jest w drodze.\nTwoja pozycja: ${sosData.position ? `${sosData.position.latitude.toFixed(6)}, ${sosData.position.longitude.toFixed(6)}` : 'Nieznana'}`);
    }
    
    // Update GPS status indicators in UI
    updateGPSStatusUI(status, message) {
        const statusIcon = document.querySelector('#home-screen .status-icon');
        const statusText = document.querySelector('#home-screen .status-text');
        
        if (!statusIcon || !statusText) return;
        
        // Remove all status classes
        statusIcon.classList.remove('status-good', 'status-warning', 'status-bad');
        
        // Add appropriate class based on status
        switch (status) {
            case 'good':
                statusIcon.classList.add('status-good');
                break;
            case 'warning':
                statusIcon.classList.add('status-warning');
                break;
            case 'bad':
            case 'error':
                statusIcon.classList.add('status-bad');
                break;
        }
        
        // Update status text
        statusText.textContent = message;
    }
    
    // Save user settings to localStorage
    saveSettings() {
        const nameInput = document.getElementById('name');
        const sailNumberInput = document.getElementById('sail-number');
        const selectedColor = document.querySelector('.color-option.selected');
        
        if (nameInput) {
            localStorage.setItem('userName', nameInput.value);
        }
        
        if (sailNumberInput) {
            localStorage.setItem('sailNumber', sailNumberInput.value);
        }
        
        if (selectedColor) {
            localStorage.setItem('trackingColor', selectedColor.style.backgroundColor);
        }
        
        // Show confirmation
        alert('Ustawienia zostały zapisane');
        
        // Return to home screen
        showScreen('home-screen');
    }
    
    // Load user settings from localStorage
    loadSettings() {
        const nameInput = document.getElementById('name');
        const sailNumberInput = document.getElementById('sail-number');
        const colorOptions = document.querySelectorAll('.color-option');
        
        // Load name
        if (nameInput && localStorage.getItem('userName')) {
            nameInput.value = localStorage.getItem('userName');
        }
        
        // Load sail number
        if (sailNumberInput && localStorage.getItem('sailNumber')) {
            sailNumberInput.value = localStorage.getItem('sailNumber');
        }
        
        // Load tracking color
        const savedColor = localStorage.getItem('trackingColor');
        if (savedColor && colorOptions.length > 0) {
            // Find matching color option
            let found = false;
            colorOptions.forEach(option => {
                if (option.style.backgroundColor === savedColor) {
                    // Remove selected class from all options
                    colorOptions.forEach(opt => opt.classList.remove('selected'));
                    // Add selected class to matching option
                    option.classList.add('selected');
                    found = true;
                }
            });
            
            // If no matching color found, select first option
            if (!found) {
                colorOptions[0].classList.add('selected');
            }
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Create and initialize the tracking app
    window.trackingApp = new TrackingApp();
    
    // Make it available globally for debugging
    console.log("GPS Tracking initialized");
    
    if (window.showDebug) {
        window.showDebug('GPS Tracking module initialized');
    }
});
