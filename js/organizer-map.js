let map;
let participants = {};
let selectedParticipant = null;
let races = [];
let currentRace = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeParticipants();
    initializeMap();
    setupEventListeners();
    startTracking();
    initializeRaceResults();
    loadSavedRaceResults();
    
    // Load regatta buoys after map is initialized
    map.on('load', function() {
        loadRegattaBuoys();
    });
});

// Generate participants 1-200
function initializeParticipants() {
    const grid = document.getElementById('participants-grid');
    
    for (let i = 1; i <= 200; i++) {
        const participantDiv = document.createElement('div');
        participantDiv.className = 'participant-number';
        participantDiv.textContent = i;
        participantDiv.dataset.number = i;
        
        participantDiv.addEventListener('click', function() {
            selectParticipant(i);
        });
        
        grid.appendChild(participantDiv);
        
        // Initialize participant data
        participants[i] = {
            number: i,
            active: false,
            position: null,
            lastUpdate: null,
            marker: null
        };
    }
}

// Initialize Mapbox map
function initializeMap() {
    // Set Mapbox access token directly
    mapboxgl.accessToken = 'pk.eyJ1Ijoia3ViYWd1emRlayIsImEiOiJjbWI4OXg0NmEwZnB4Mm1zOXc2MW9mdXM3In0.h8OjP7afPMemytiyXz1rDA';
    
    // Center on Gdańsk Bay area
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [18.4021, 54.6892], // Note: Mapbox uses [longitude, latitude] format
        zoom: 12
    });
    
    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('zoom-in').addEventListener('click', function() {
        map.zoomIn();
    });
    
    document.getElementById('zoom-out').addEventListener('click', function() {
        map.zoomOut();
    });
    
    document.getElementById('center-map').addEventListener('click', function() {
        // If buoys are loaded, fit map to buoys, otherwise use default center
        if (window.regattaBuoys && window.regattaBuoys.buoysLoaded) {
            loadRegattaBuoys();
        } else {
            map.flyTo({
                center: [18.4021, 54.6892],
                zoom: 12
            });
        }
    });
    
    // Message sending functionality
    document.getElementById('send-message-btn').addEventListener('click', sendMessage);
    
    // Allow Enter key to send message (Ctrl+Enter for new line)
    document.getElementById('message-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.ctrlKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Race results functionality
    document.getElementById('new-race-btn').addEventListener('click', createNewRace);
    document.getElementById('race-select').addEventListener('change', selectRace);
    document.getElementById('add-result-btn').addEventListener('click', addRaceResult);
}

// Select participant
function selectParticipant(number) {
    // Remove previous selection
    document.querySelectorAll('.participant-number').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Add selection to clicked participant
    const participantEl = document.querySelector(`[data-number="${number}"]`);
    participantEl.classList.add('selected');
    
    selectedParticipant = number;
    showParticipantInfo(number);
    
    // Center map on participant if they have a position
    if (participants[number].position) {
        map.flyTo({
            center: [participants[number].position.lng, participants[number].position.lat], // Note: Mapbox uses [lng, lat]
            zoom: 15
        });
    }
}

// Show participant info panel
function showParticipantInfo(number) {
    const participant = participants[number];
    const infoPanel = document.getElementById('participant-info');
    
    document.getElementById('info-title').textContent = `Zawodnik #${number}`;
    
    const statusEl = document.getElementById('info-status');
    const statusIndicator = infoPanel.querySelector('.status-indicator');
    
    if (participant.active) {
        statusEl.textContent = 'Śledzenie aktywne';
        statusIndicator.className = 'status-indicator status-active';
    } else {
        statusEl.textContent = 'Nieaktywny';
        statusIndicator.className = 'status-indicator status-inactive';
    }
    
    const locationEl = document.getElementById('info-location');
    if (participant.position) {
        locationEl.textContent = `${participant.position.lat.toFixed(6)}, ${participant.position.lng.toFixed(6)}`;
    } else {
        locationEl.textContent = 'Brak lokalizacji';
    }
    
    const timeEl = document.getElementById('info-time');
    if (participant.lastUpdate) {
        timeEl.textContent = `Ostatnia aktualizacja: ${new Date(participant.lastUpdate).toLocaleTimeString()}`;
    } else {
        timeEl.textContent = 'Brak danych';
    }
    
    infoPanel.style.display = 'block';
}

// Start tracking system
function startTracking() {
    if (window.trackingCommunication) {
        window.trackingCommunication.setParticipantUpdateCallback(updateParticipant);
        window.trackingCommunication.setSOSAlertCallback(handleSOSAlert);
        window.trackingCommunication.startListening();
        console.log('Tracking system started');
    } else {
        console.log('Tracking communication not available');
    }
}

// Update participant data
function updateParticipant(data) {
    console.log('Received participant update:', data);
    
    const number = parseInt(data.participantNumber);
    if (number >= 1 && number <= 200) {
        const participant = participants[number];
        
        // Update participant data - handle both old and new format
        participant.active = data.status === 'active' || data.active || false;
        
        // Convert position format if needed
        if (data.position) {
            if (data.position.latitude !== undefined && data.position.longitude !== undefined) {
                // New format: {latitude, longitude}
                participant.position = {
                    lat: data.position.latitude,
                    lng: data.position.longitude
                };
            } else if (data.position.lat !== undefined && data.position.lng !== undefined) {
                // Old format: {lat, lng}
                participant.position = data.position;
            }
        } else {
            participant.position = null;
        }
        
        participant.lastUpdate = data.timestamp || Date.now();
        
        console.log(`Updated participant #${number}:`, participant);
        
        // Update UI
        updateParticipantUI(number);
        updateParticipantMarker(number);
        
        // Update info panel if this participant is selected
        if (selectedParticipant === number) {
            showParticipantInfo(number);
        }
    }
}

// Update participant UI element
function updateParticipantUI(number) {
    const participantEl = document.querySelector(`[data-number="${number}"]`);
    const participant = participants[number];
    
    if (participant.active) {
        participantEl.classList.add('active');
    } else {
        participantEl.classList.remove('active');
    }
}

// Update participant marker on map
function updateParticipantMarker(number) {
    const participant = participants[number];
    
    // Remove existing marker
    if (participant.marker) {
        participant.marker.remove();
        participant.marker = null;
    }
    
    // Add new marker if participant has position
    if (participant.position && participant.active) {
        // Create marker element
        const markerEl = document.createElement('div');
        markerEl.className = 'marker-content';
        
        const markerCircle = document.createElement('div');
        markerCircle.className = 'marker-circle';
        markerCircle.textContent = number;
        markerEl.appendChild(markerCircle);
        
        // Create popup
        const popup = new mapboxgl.Popup({ offset: 25 })
            .setHTML(`Zawodnik #${number}`);
        
        // Create marker
        const marker = new mapboxgl.Marker(markerEl)
            .setLngLat([participant.position.lng, participant.position.lat]) // Note: Mapbox uses [lng, lat]
            .setPopup(popup)
            .addTo(map);
        
        // Add click event
        markerEl.addEventListener('click', function() {
            selectParticipant(number);
        });
        
        participant.marker = marker;
    }
}

// Handle SOS alert
function handleSOSAlert(sosData) {
    console.log('🚨 SOS ALERT received:', sosData);
    
    const number = parseInt(sosData.participantNumber);
    if (number >= 1 && number <= 200) {
        const participant = participants[number];
        
        // Update participant with SOS status
        participant.sosAlert = true;
        participant.sosMessage = sosData.message;
        participant.sosTimestamp = sosData.timestamp;
        participant.active = true; // Mark as active
        
        // Update position if provided
        if (sosData.position) {
            participant.position = sosData.position;
        }
        
        participant.lastUpdate = sosData.timestamp || Date.now();
        
        // Update UI with SOS styling
        const participantEl = document.querySelector(`[data-number="${number}"]`);
        participantEl.classList.add('sos');
        participantEl.classList.add('active');
        
        // Update marker with SOS styling
        updateSOSMarker(number);
        
        // Show alert notification
        alert(`🚨 SYGNAŁ SOS od zawodnika #${number}!\n\n${sosData.message}\n\nLokalizacja: ${sosData.position ? 
            `${sosData.position.lat.toFixed(6)}, ${sosData.position.lng.toFixed(6)}` : 'Brak dokładnej lokalizacji'}`);
        
        // Auto-select participant and center map
        selectParticipant(number);
        if (participant.position) {
            map.flyTo({
                center: [participant.position.lng, participant.position.lat], // Note: Mapbox uses [lng, lat]
                zoom: 16
            });
        }
        
        console.log(`SOS alert processed for participant #${number}`);
    }
}

// Update SOS marker on map
function updateSOSMarker(number) {
    const participant = participants[number];
    
    // Remove existing marker
    if (participant.marker) {
        participant.marker.remove();
        participant.marker = null;
    }
    
    // Add SOS marker if participant has position
    if (participant.position) {
        // Create marker element with SOS styling
        const markerEl = document.createElement('div');
        markerEl.className = 'marker-content';
        
        const markerCircle = document.createElement('div');
        markerCircle.className = 'marker-circle';
        markerCircle.style.backgroundColor = '#ff4444';
        markerCircle.style.animation = 'sosFlash 1s infinite';
        markerCircle.textContent = number;
        markerEl.appendChild(markerCircle);
        
        // Create popup with SOS message
        const popup = new mapboxgl.Popup({ offset: 25 })
            .setHTML(`🚨 SOS - Zawodnik #${number}<br>${participant.sosMessage || 'Potrzebuję pomocy!'}`);
        
        // Create marker
        const marker = new mapboxgl.Marker(markerEl)
            .setLngLat([participant.position.lng, participant.position.lat]) // Note: Mapbox uses [lng, lat]
            .setPopup(popup)
            .addTo(map);
        
        // Add click event
        markerEl.addEventListener('click', function() {
            selectParticipant(number);
        });
        
        participant.marker = marker;
    }
}

// Send message to all participants
function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    
    if (message) {
        if (window.trackingCommunication) {
            window.trackingCommunication.sendMessageToAll(message)
                .then(() => {
                    console.log('Message sent successfully:', message);
                    messageInput.value = '';
                    alert('Komunikat został wysłany do wszystkich zawodników.');
                })
                .catch(error => {
                    console.error('Error sending message:', error);
                    alert('Błąd podczas wysyłania komunikatu. Spróbuj ponownie.');
                });
        } else {
            console.error('Tracking communication not available');
            alert('System komunikacji nie jest dostępny. Spróbuj ponownie później.');
        }
    } else {
        alert('Wpisz treść komunikatu przed wysłaniem.');
    }
}

// Initialize race results
function initializeRaceResults() {
    // Populate participant select
    const participantSelect = document.getElementById('participant-select');
    
    // Clear existing options
    while (participantSelect.options.length > 1) {
        participantSelect.remove(1);
    }
    
    // Add options for all participants
    for (let i = 1; i <= 200; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Zawodnik #${i}`;
        participantSelect.appendChild(option);
    }
}

// Load saved race results
function loadSavedRaceResults() {
    // Try to load from localStorage
    try {
        const savedRaces = localStorage.getItem('kotb-races');
        if (savedRaces) {
            races = JSON.parse(savedRaces);
            updateRaceSelect();
        }
    } catch (error) {
        console.error('Error loading saved races:', error);
    }
}

// Save race results
function saveRaceResults() {
    try {
        localStorage.setItem('kotb-races', JSON.stringify(races));
    } catch (error) {
        console.error('Error saving races:', error);
    }
}

/**
 * Load regatta buoys from JSON file and display them on the map
 */
function loadRegattaBuoys() {
    if (!window.regattaBuoys) {
        console.error('Regatta buoys module not loaded');
        return;
    }
    
    // Check if we're running from file:// protocol
    const isFileProtocol = window.location.protocol === 'file:';
    
    if (isFileProtocol) {
        // When running from file://, use the default buoys to avoid CORS issues
        console.log('Using default buoy data (file:// protocol detected)');
        if (typeof window.regattaBuoys.loadDefaultBuoys === 'function') {
            window.regattaBuoys.loadDefaultBuoys(map);
        } else {
            // Fallback if loadDefaultBuoys is not available
            window.regattaBuoys.addBuoysToMap(window.defaultBuoys || [], map);
        }
    } else {
        // When running from http:// or https://, try to load from JSON file
        fetch('data/regatta-buoys.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load buoys: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (data && Array.isArray(data.buoys)) {
                    // Add buoys to map
                    window.regattaBuoys.addBuoysToMap(data.buoys, map);
                    
                    console.log(`Loaded ${data.buoys.length} regatta buoys`);
                    
                    // Add course name to map if available
                    if (data.metadata && data.metadata.course_name) {
                        console.log(`Course: ${data.metadata.course_name}`);
                    }
                } else {
                    throw new Error('Invalid buoy data format');
                }
            })
            .catch(error => {
                console.error('Error loading regatta buoys:', error);
                console.log('Falling back to default buoy data');
                
                // Fallback to default buoys if loading fails
                if (typeof window.regattaBuoys.loadDefaultBuoys === 'function') {
                    window.regattaBuoys.loadDefaultBuoys(map);
                } else {
                    window.regattaBuoys.addBuoysToMap(window.defaultBuoys || [], map);
                }
            });
    }
}

/**
 * Toggle buoy visibility
 * @param {boolean} visible - Whether buoys should be visible
 */
function toggleBuoyVisibility(visible) {
    if (window.regattaBuoys) {
        window.regattaBuoys.toggleBuoyVisibility(visible);
    }
}

// Update race select dropdown
function updateRaceSelect() {
    const raceSelect = document.getElementById('race-select');
    
    // Clear existing options except the first one
    while (raceSelect.options.length > 1) {
        raceSelect.remove(1);
    }
    
    // Add options for all races
    races.forEach((race, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = race.name;
        raceSelect.appendChild(option);
    });
}

// Create new race
function createNewRace() {
    const raceName = prompt('Nazwa wyścigu:', `Wyścig ${races.length + 1}`);
    
    if (raceName) {
        const newRace = {
            name: raceName,
            date: new Date().toISOString(),
            results: []
        };
        
        races.push(newRace);
        updateRaceSelect();
        saveRaceResults();
        
        // Select the new race
        const raceSelect = document.getElementById('race-select');
        raceSelect.value = races.length - 1;
        selectRace();
    }
}

// Select race
function selectRace() {
    const raceSelect = document.getElementById('race-select');
    const raceIndex = parseInt(raceSelect.value);
    
    if (!isNaN(raceIndex) && raceIndex >= 0 && raceIndex < races.length) {
        currentRace = races[raceIndex];
        
        // Show race results content
        document.getElementById('race-results-content').style.display = 'block';
        document.getElementById('current-race-title').textContent = currentRace.name;
        
        // Update results list
        updateResultsList();
    } else {
        currentRace = null;
        document.getElementById('race-results-content').style.display = 'none';
    }
}

// Add race result
function addRaceResult() {
    if (!currentRace) {
        alert('Wybierz wyścig przed dodaniem wyniku.');
        return;
    }
    
    const participantSelect = document.getElementById('participant-select');
    const positionInput = document.getElementById('position-input');
    
    const participantNumber = parseInt(participantSelect.value);
    const position = parseInt(positionInput.value);
    
    if (isNaN(participantNumber) || participantNumber < 1 || participantNumber > 200) {
        alert('Wybierz prawidłowy numer zawodnika.');
        return;
    }
    
    if (isNaN(position) || position < 1) {
        alert('Podaj prawidłową pozycję (miejsce).');
        return;
    }
    
    // Check if participant already has a result
    const existingResultIndex = currentRace.results.findIndex(r => r.participantNumber === participantNumber);
    if (existingResultIndex >= 0) {
        if (!confirm(`Zawodnik #${participantNumber} już ma wynik. Czy chcesz go nadpisać?`)) {
            return;
        }
        currentRace.results.splice(existingResultIndex, 1);
    }
    
    // Add new result
    currentRace.results.push({
        participantNumber,
        position,
        timestamp: new Date().toISOString()
    });
    
    // Sort results by position
    currentRace.results.sort((a, b) => a.position - b.position);
    
    // Save and update UI
    saveRaceResults();
    updateResultsList();
    
    // Clear inputs
    participantSelect.value = '';
    positionInput.value = '';
}

// Update results list
function updateResultsList() {
    const resultsList = document.getElementById('results-list');
    resultsList.innerHTML = '';
    
    if (!currentRace || !currentRace.results.length) {
        resultsList.innerHTML = '<div style="padding: 10px; text-align: center; color: #666;">Brak wyników</div>';
        return;
    }
    
    currentRace.results.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        const positionSpan = document.createElement('span');
        positionSpan.className = 'result-position';
        positionSpan.textContent = `${result.position}.`;
        
        const participantSpan = document.createElement('span');
        participantSpan.className = 'result-participant';
        participantSpan.textContent = `Zawodnik #${result.participantNumber}`;
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-result';
        deleteButton.innerHTML = '<i class="fas fa-times"></i>';
        deleteButton.title = 'Usuń wynik';
        deleteButton.addEventListener('click', function() {
            deleteResult(result.participantNumber);
        });
        
        resultItem.appendChild(positionSpan);
        resultItem.appendChild(participantSpan);
        resultItem.appendChild(deleteButton);
        
        resultsList.appendChild(resultItem);
    });
}

// Delete race result
function deleteResult(participantNumber) {
    if (!currentRace) return;
    
    if (confirm(`Czy na pewno chcesz usunąć wynik zawodnika #${participantNumber}?`)) {
        const index = currentRace.results.findIndex(r => r.participantNumber === participantNumber);
        if (index >= 0) {
            currentRace.results.splice(index, 1);
            saveRaceResults();
            updateResultsList();
        }
    }
}
