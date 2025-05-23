// Complete JavaScript for organizer-view.html
// Global participants array for demo
let participantsList = [];

// Debug function
function showDebug(message) {
    const debugPanel = document.getElementById('debug-panel');
    const debugContent = document.getElementById('debug-content');
    
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

// Organizer view functionality
document.addEventListener('DOMContentLoaded', function() {
    // Authentication removed for testing - directly initialize the organizer view
    showDebug('Authentication bypassed for testing');
    initializeOrganizerView();
    
    // Initialize organizer view after authentication
    function initializeOrganizerView() {
        // Set up participant list update callback
        if (window.trackingCommunication) {
            window.trackingCommunication.setParticipantListUpdateCallback(updateParticipantsList);
        }
        
        // Start listening for updates
        if (window.trackingCommunication) {
            window.trackingCommunication.startListening();
        }
        
        // Initialize organizer tracking
        if (window.organizerTracking) {
            window.organizerTracking.initialize();
        } else {
            showDebug('WARNING: Organizer tracking module not found');
            // Initialize demo data
            initializeDemoData();
        }
        
        // Set up event listeners
        setupEventListeners();
        
        showDebug('Organizer view initialized');
    }
    
    // Update participants list
    function updateParticipantsList(participants) {
        showDebug(`Updating participants list: ${participants.length} participants`);
        
        // Update global participants list
        participantsList = participants;
        
        const container = document.getElementById('participants-container');
        const searchInput = document.getElementById('participant-search');
        const searchTerm = searchInput.value.toLowerCase();
        
        // Clear container
        container.innerHTML = '';
        
        // Update counters
        let countAll = 0;
        let countActive = 0;
        let countWaiting = 0;
        let countSOS = 0;
        
        // Filter and sort participants
        const filteredParticipants = participants.filter(p => {
            // Apply search filter
            if (searchTerm && !p.name.toLowerCase().includes(searchTerm) && 
                !p.sailNumber.toLowerCase().includes(searchTerm)) {
                return false;
            }
            
            // Count by status
            countAll++;
            
            if (p.status === 'sos') {
                countSOS++;
            } else if (p.status === 'active') {
                countActive++;
            } else {
                countWaiting++;
            }
            
            return true;
        }).sort((a, b) => {
            // Sort by status (SOS first)
            if (a.status === 'sos' && b.status !== 'sos') return -1;
            if (a.status !== 'sos' && b.status === 'sos') return 1;
            
            // Then by name
            return a.name.localeCompare(b.name);
        });
        
        // Update counters in UI
        document.getElementById('count-all').textContent = countAll;
        document.getElementById('count-active').textContent = countActive;
        document.getElementById('count-waiting').textContent = countWaiting;
        document.getElementById('count-sos').textContent = countSOS;
        
        // Create participant items
        filteredParticipants.forEach(participant => {
            const item = createParticipantItem(participant);
            container.appendChild(item);
        });
        
        // Update results table
        updateResultsTable(participants);
    }
    
    // Create participant item
    function createParticipantItem(participant) {
        const item = document.createElement('div');
        item.className = 'participant-item';
        item.dataset.id = participant.id;
        
        if (participant.status === 'sos') {
            item.classList.add('sos');
        }
        
        let statusIcon = 'fa-satellite-dish';
        let statusText = 'GPS OK';
        let statusClass = 'status-good';
        
        if (participant.status === 'sos') {
            statusIcon = 'fa-exclamation-triangle';
            statusText = 'SOS';
            statusClass = 'status-bad';
        } else if (!participant.position) {
            statusIcon = 'fa-flag-checkered';
            statusText = 'Oczekuje';
            statusClass = '';
        }
        
        const distance = participant.distance ? `${participant.distance.toFixed(1)} km` : '0.0 km';
        
        item.innerHTML = `
            <div class="participant-header">
                <div class="participant-name">${participant.name}</div>
                <div class="participant-sail">${participant.sailNumber}</div>
            </div>
            <div class="participant-status">
                <div class="status-indicator">
                    <i class="fas ${statusIcon} ${statusClass}"></i> ${statusText}
                </div>
                <div>${distance}</div>
            </div>
        `;
        
        // Add click event
        item.addEventListener('click', function() {
            showParticipantDetails(participant);
        });
        
        return item;
    }
    
    // Show participant details
    function showParticipantDetails(participant) {
        const detailsPanel = document.getElementById('participant-details');
        
        // Update details
        document.getElementById('detail-name').textContent = participant.name;
        document.getElementById('detail-sail').textContent = participant.sailNumber;
        document.getElementById('detail-status').textContent = participant.status === 'sos' ? 'SOS' : 
            (participant.position ? 'Aktywny' : 'Oczekuje');
        document.getElementById('detail-distance').textContent = participant.distance ? 
            `${participant.distance.toFixed(1)} km` : '0.0 km';
        document.getElementById('detail-speed').textContent = participant.speed ? 
            `${participant.speed.toFixed(1)} km/h` : '0.0 km/h';
        document.getElementById('detail-last-update').textContent = participant.lastUpdate ? 
            new Date(participant.lastUpdate).toLocaleTimeString() : '-';
        document.getElementById('detail-phone').textContent = participant.phone || '-';
        document.getElementById('detail-emergency').textContent = participant.emergencyContact || '-';
        
        // Show panel
        detailsPanel.style.display = 'block';
        
        // Highlight participant in list
        const participantItems = document.querySelectorAll('.participant-item');
        participantItems.forEach(item => {
            if (!item.classList.contains('sos')) {
                item.classList.remove('active');
            }
            if (item.dataset.id === participant.id && !item.classList.contains('sos')) {
                item.classList.add('active');
            }
        });
        
        // Center map on participant
        if (window.organizerTracking && participant.position) {
            window.organizerTracking.centerOnParticipant(participant.id);
        }
    }
    
    // Update results table
    function updateResultsTable(participants) {
        const resultsTable = document.getElementById('results-table');
        
        // Clear table
        resultsTable.innerHTML = '';
        
        // Sort participants by name
        const sortedParticipants = [...participants].sort((a, b) => a.name.localeCompare(b.name));
        
        // Create result rows
        sortedParticipants.forEach((participant, index) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.padding = '12px 15px';
            row.style.borderBottom = '1px solid #eee';
            row.style.alignItems = 'center';
            
            row.innerHTML = `
                <div style="flex: 0 0 40px; font-weight: 700;">${index + 1}</div>
                <div style="flex: 1;">${participant.name} (${participant.sailNumber})</div>
                <div style="flex: 0 0 120px;">
                    <input type="text" value="" style="width: 80px; padding: 5px; border-radius: 4px; border: 1px solid #ddd;">
                </div>
                <div style="flex: 0 0 100px;">
                    <button style="background-color: #1a73e8; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-save"></i>
                    </button>
                    <button style="background-color: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 5px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            resultsTable.appendChild(row);
        });
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Close participant details
        document.getElementById('close-details').addEventListener('click', function() {
            document.getElementById('participant-details').style.display = 'none';
        });
        
        // Filter tabs
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach((tab, index) => {
            tab.addEventListener('click', function() {
                filterTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                const filter = this.getAttribute('data-filter');
                
                // Toggle between map view and results panel when "results" tab is clicked
                const mapView = document.getElementById('map-view');
                const resultsPanel = document.getElementById('results-panel');
                
                if (filter === 'results') {
                    mapView.style.display = 'none';
                    resultsPanel.style.display = 'block';
                } else {
                    mapView.style.display = 'block';
                    resultsPanel.style.display = 'none';
                    
                    // Apply filter to participants list
                    filterParticipants(filter);
                }
            });
        });
        
        // Search input
        document.getElementById('participant-search').addEventListener('input', function() {
            const activeTab = document.querySelector('.filter-tab.active');
            const filter = activeTab ? activeTab.getAttribute('data-filter') : 'all';
            filterParticipants(filter);
        });
        
        // Results button
        document.getElementById('results-btn').addEventListener('click', function() {
            const mapView = document.getElementById('map-view');
            const resultsPanel = document.getElementById('results-panel');
            
            mapView.style.display = 'none';
            resultsPanel.style.display = 'block';
            
            // Activate results tab
            const filterTabs = document.querySelectorAll('.filter-tab');
            filterTabs.forEach(tab => {
                tab.classList.remove('active');
                if (tab.getAttribute('data-filter') === 'results') {
                    tab.classList.add('active');
                }
            });
        });
        
        // Map control buttons
        document.getElementById('zoom-in').addEventListener('click', function() {
            if (window.organizerTracking) {
                window.organizerTracking.zoomIn();
            }
        });
        
        document.getElementById('zoom-out').addEventListener('click', function() {
            if (window.organizerTracking) {
                window.organizerTracking.zoomOut();
            }
        });
        
        document.getElementById('center-map').addEventListener('click', function() {
            if (window.organizerTracking) {
                window.organizerTracking.centerMap();
            }
        });
        
        document.getElementById('toggle-layers').addEventListener('click', function() {
            if (window.organizerTracking) {
                window.organizerTracking.toggleLayers();
            }
        });
        
        // Race control buttons
        document.getElementById('start-race').addEventListener('click', function() {
            showDebug('Race started');
            alert('Wyścig rozpoczęty!');
        });
        
        document.getElementById('pause-race').addEventListener('click', function() {
            showDebug('Race paused');
            alert('Wyścig wstrzymany!');
        });
        
        document.getElementById('end-race').addEventListener('click', function() {
            showDebug('Race ended');
            alert('Wyścig zakończony!');
        });
        
        // Participant details buttons
        document.getElementById('track-participant').addEventListener('click', function() {
            showDebug('Tracking participant');
            alert('Śledzenie zawodnika włączone');
        });
        
        document.getElementById('contact-participant').addEventListener('click', function() {
            const phone = document.getElementById('detail-phone').textContent;
            if (phone && phone !== '-') {
                showDebug(`Contacting participant: ${phone}`);
                alert(`Dzwonię do zawodnika: ${phone}`);
            } else {
                alert('Brak numeru telefonu do zawodnika');
            }
        });
        
        // Add participant button - COMPLETE IMPLEMENTATION
        document.getElementById('add-participant-btn').addEventListener('click', function() {
            showAddParticipantDialog();
        });
        
        // Show debug panel button
        const organizerActions = document.querySelector('.organizer-actions');
        if (organizerActions) {
            const debugBtn = document.createElement('button');
            debugBtn.className = 'organizer-btn';
            debugBtn.style.backgroundColor = '#f8f9fa';
            debugBtn.style.color = '#333';
            debugBtn.innerHTML = '<i class="fas fa-bug"></i> Debug';
            debugBtn.addEventListener('click', function() {
                document.getElementById('debug-panel').style.display = 'block';
                showDebug('Debug panel opened manually');
            });
            organizerActions.appendChild(debugBtn);
        }
    }
    
    // Show add participant dialog - COMPLETE IMPLEMENTATION
    function showAddParticipantDialog() {
        const sailNumber = prompt('Podaj numer żagla nowego zawodnika (np. POL-123):');
        if (!sailNumber || !sailNumber.trim()) {
            return;
        }
        
        const name = prompt('Podaj imię i nazwisko zawodnika:');
        if (!name || !name.trim()) {
            return;
        }
        
        const phone = prompt('Podaj numer telefonu zawodnika (opcjonalnie):') || '';
        const emergencyContact = prompt('Podaj kontakt awaryjny (opcjonalnie):') || '';
        
        addNewParticipant(sailNumber.trim(), name.trim(), phone.trim(), emergencyContact.trim());
    }
    
    // Add new participant function - COMPLETE IMPLEMENTATION
    function addNewParticipant(sailNumber, name, phone, emergencyContact) {
        showDebug(`Adding new participant: ${name} (${sailNumber})`);
        
        // Check if participant with this sail number already exists
        const existingParticipant = participantsList.find(p => p.sailNumber === sailNumber);
        if (existingParticipant) {
            alert(`Zawodnik z numerem żagla ${sailNumber} już istnieje!`);
            return;
        }
        
        // Create new participant object
        const newParticipant = {
            id: 'p' + Date.now(),
            name: name,
            sailNumber: sailNumber,
            status: 'waiting',
            position: null,
            distance: 0,
            speed: 0,
            lastUpdate: null,
            phone: phone,
            emergencyContact: emergencyContact,
            trackingColor: getRandomColor()
        };
        
        // Add to participants list
        participantsList.push(newParticipant);
        
        // Update the UI
        updateParticipantsList(participantsList);
        
        // Send to server if tracking communication is available
        if (window.trackingCommunication && window.trackingCommunication.addParticipant) {
            window.trackingCommunication.addParticipant(newParticipant);
        }
        
        showDebug(`Participant ${name} (${sailNumber}) added successfully`);
        alert(`Zawodnik ${name} (${sailNumber}) został dodany do listy!`);
    }
    
    // Filter participants
    function filterParticipants(filter) {
        const searchTerm = document.getElementById('participant-search').value.toLowerCase();
        const items = document.querySelectorAll('.participant-item');
        
        items.forEach(item => {
            const name = item.querySelector('.participant-name').textContent.toLowerCase();
            const sail = item.querySelector('.participant-sail').textContent.toLowerCase();
            const isSOS = item.classList.contains('sos');
            const statusText = item.querySelector('.status-indicator').textContent.trim().toLowerCase();
            const isActive = statusText.includes('gps');
            const isWaiting = statusText.includes('oczekuje');
            
            // Apply search filter
            const matchesSearch = !searchTerm || 
                name.includes(searchTerm) || 
                sail.includes(searchTerm);
            
            // Apply status filter
            let matchesFilter = true;
            if (filter === 'sos') {
                matchesFilter = isSOS;
            } else if (filter === 'active') {
                matchesFilter = isActive;
            } else if (filter === 'waiting') {
                matchesFilter = isWaiting;
            }
            
            // Show/hide item
            item.style.display = matchesSearch && matchesFilter ? 'block' : 'none';
        });
    }
    
    // Initialize demo data if needed
    function initializeDemoData() {
        showDebug('Initializing demo data');
        
        const demoParticipants = [
            {
                id: 'p1',
                name: 'Marek Kowalski',
                sailNumber: 'POL-123',
                status: 'sos',
                position: { lat: 54.6892, lng: 18.4021 },
                distance: 3.2,
                speed: 0,
                lastUpdate: new Date().toISOString(),
                phone: '+48 123 456 789',
                emergencyContact: 'Anna Kowalska +48 987 654 321',
                trackingColor: '#f44336'
            },
            {
                id: 'p2',
                name: 'Anna Nowak',
                sailNumber: 'POL-456',
                status: 'active',
                position: { lat: 54.7012, lng: 18.4321 },
                distance: 5.7,
                speed: 12.3,
                lastUpdate: new Date().toISOString(),
                phone: '+48 234 567 890',
                emergencyContact: 'Piotr Nowak +48 876 543 210',
                trackingColor: '#1a73e8'
            },
            {
                id: 'p3',
                name: 'Piotr Wiśniewski',
                sailNumber: 'POL-789',
                status: 'active',
                position: { lat: 54.6954, lng: 18.4123 },
                distance: 4.1,
                speed: 10.8,
                lastUpdate: new Date().toISOString(),
                phone: '+48 345 678 901',
                emergencyContact: 'Marta Wiśniewska +48 765 432 109',
                trackingColor: '#4caf50'
            },
            {
                id: 'p4',
                name: 'Katarzyna Dąbrowska',
                sailNumber: 'POL-234',
                status: 'active',
                position: { lat: 54.6876, lng: 18.3987 },
                distance: 2.8,
                speed: 8.5,
                lastUpdate: new Date().toISOString(),
                phone: '+48 456 789 012',
                emergencyContact: 'Tomasz Dąbrowski +48 654 321 098',
                trackingColor: '#ff9800'
            },
            {
                id: 'p5',
                name: 'Tomasz Lewandowski',
                sailNumber: 'POL-567',
                status: 'active',
                position: { lat: 54.7045, lng: 18.4234 },
                distance: 6.3,
                speed: 14.2,
                lastUpdate: new Date().toISOString(),
                phone: '+48 567 890 123',
                emergencyContact: 'Agnieszka Lewandowska +48 543 210 987',
                trackingColor: '#9c27b0'
            },
            {
                id: 'p6',
                name: 'Magdalena Zielińska',
                sailNumber: 'POL-890',
                status: 'waiting',
                position: null,
                distance: 0,
                speed: 0,
                lastUpdate: null,
                phone: '+48 678 901 234',
                emergencyContact: 'Krzysztof Zieliński +48 432 109 876',
                trackingColor: '#795548'
            },
            {
                id: 'p7',
                name: 'Krzysztof Szymański',
                sailNumber: 'POL-345',
                status: 'waiting',
                position: null,
                distance: 0,
                speed: 0,
                lastUpdate: null,
                phone: '+48 789 012 345',
                emergencyContact: 'Joanna Szymańska +48 321 098 765',
                trackingColor: '#607d8b'
            }
        ];
        
        // Update participants list
        participantsList = demoParticipants;
        updateParticipantsList(demoParticipants);
        
        // Create demo markers
        demoParticipants.forEach(participant => {
            if (participant.position) {
                createDemoMarker(participant);
            }
        });
    }
    
    // Create demo marker
    function createDemoMarker(participant) {
        const map = document.getElementById('map');
        
        const marker = document.createElement('div');
        marker.className = 'participant-marker';
        if (participant.status === 'sos') {
            marker.classList.add('sos');
        }
        
        marker.style.backgroundColor = participant.trackingColor;
        
        // Position randomly on the map
        const top = 20 + Math.random() * 60; // 20% to 80% from top
        const left = 20 + Math.random() * 60; // 20% to 80% from left
        
        marker.style.top = `${top}%`;
        marker.style.left = `${left}%`;
        
        const tooltip = document.createElement('div');
        tooltip.className = 'participant-tooltip';
        tooltip.textContent = `${participant.name} (${participant.sailNumber})`;
        if (participant.status === 'sos') {
            tooltip.textContent += ' - SOS!';
        }
        
        marker.appendChild(tooltip);
        map.appendChild(marker);
        
        // Add click event
        marker.addEventListener('click', function() {
            showParticipantDetails(participant);
        });
    }
    
    // Get random color for new participants
    function getRandomColor() {
        const colors = ['#1a73e8', '#4caf50', '#f44336', '#ff9800', '#9c27b0', '#795548', '#607d8b'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    // Show initial debug info
    showDebug('Organizer view loaded');
    showDebug('Checking for tracking communication module...');
    
    if (window.trackingCommunication) {
        showDebug('Tracking communication module found');
    } else {
        showDebug('WARNING: Tracking communication module not found');
    }
});
