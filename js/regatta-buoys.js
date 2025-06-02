/**
 * Regatta Buoys Module
 * 
 * This module adds regatta buoy markers to the map based on provided coordinates.
 * Each buoy has longitude, latitude, and a name.
 */

// Global variables
let buoyMarkers = [];
let buoysLoaded = false;

// Default buoy data (to avoid CORS issues when loading from file://)
const defaultBuoys = [
    {
        "name": "A",
        "latitude": 54.6950,
        "longitude": 18.4050
    },
    {
        "name": "B",
        "latitude": 54.6920,
        "longitude": 18.4150
    },
    {
        "name": "C",
        "latitude": 54.6850,
        "longitude": 18.4100
    },
    {
        "name": "D",
        "latitude": 54.6880,
        "longitude": 18.3950
    },
    {
        "name": "Start",
        "latitude": 54.6900,
        "longitude": 18.4000
    },
    {
        "name": "Finish",
        "latitude": 54.6910,
        "longitude": 18.4080
    }
];

/**
 * Add buoys to the map
 * @param {Array} buoys - Array of buoy objects with {longitude, latitude, name}
 * @param {Object} mapInstance - Mapbox GL JS map instance
 */
function addBuoysToMap(buoys, mapInstance) {
    // Clear any existing buoy markers
    clearBuoyMarkers();
    
    // Reference to the map
    const map = mapInstance || window.map;
    
    if (!map) {
        console.error('Map instance not found');
        return;
    }
    
    if (!buoys || !Array.isArray(buoys) || buoys.length === 0) {
        console.error('No buoys provided or invalid buoy data');
        return;
    }
    
    console.log(`Adding ${buoys.length} buoys to the map`);
    
    // Create markers for each buoy
    buoys.forEach((buoy, index) => {
        // Validate buoy data
        if (!buoy.longitude || !buoy.latitude || !buoy.name) {
            console.warn(`Buoy at index ${index} has invalid data:`, buoy);
            return;
        }
        
        // Create marker element
        const markerEl = document.createElement('div');
        markerEl.className = 'buoy-marker';
        
        // Create buoy marker style
        const markerCircle = document.createElement('div');
        markerCircle.className = 'buoy-marker-circle';
        markerCircle.textContent = buoy.name;
        markerEl.appendChild(markerCircle);
        
        // Create popup
        const popup = new mapboxgl.Popup({ offset: 25 })
            .setHTML(`<strong>Buoy: ${buoy.name}</strong><br>Coordinates: ${buoy.latitude.toFixed(6)}, ${buoy.longitude.toFixed(6)}`);
        
        // Create marker
        const marker = new mapboxgl.Marker(markerEl)
            .setLngLat([buoy.longitude, buoy.latitude]) // Mapbox uses [lng, lat]
            .setPopup(popup)
            .addTo(map);
        
        // Store marker reference
        buoyMarkers.push(marker);
    });
    
    // Set flag that buoys are loaded
    buoysLoaded = true;
    
    // Fit map to show all buoys
    fitMapToBuoys(buoys, map);
}

/**
 * Clear all buoy markers from the map
 */
function clearBuoyMarkers() {
    buoyMarkers.forEach(marker => {
        if (marker) {
            marker.remove();
        }
    });
    
    buoyMarkers = [];
    buoysLoaded = false;
}

/**
 * Fit map view to include all buoys
 * @param {Array} buoys - Array of buoy objects
 * @param {Object} map - Mapbox GL JS map instance
 */
function fitMapToBuoys(buoys, map) {
    if (!buoys || buoys.length === 0 || !map) {
        return;
    }
    
    // Create a bounds object
    const bounds = new mapboxgl.LngLatBounds();
    
    // Extend bounds to include all buoys
    buoys.forEach(buoy => {
        bounds.extend([buoy.longitude, buoy.latitude]);
    });
    
    // Fit map to bounds with padding
    map.fitBounds(bounds, {
        padding: 50, // Add padding around the bounds
        maxZoom: 15  // Limit maximum zoom level
    });
}

/**
 * Load buoys from a JSON file
 * @param {string} url - URL to the JSON file containing buoy data
 * @param {Object} map - Mapbox GL JS map instance
 * @returns {Promise} - Promise that resolves when buoys are loaded
 */
function loadBuoysFromJSON(url, map) {
    // Try to fetch the data from the URL
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load buoys: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data && Array.isArray(data.buoys)) {
                addBuoysToMap(data.buoys, map);
                return data.buoys;
            } else {
                throw new Error('Invalid buoy data format');
            }
        })
        .catch(error => {
            console.error('Error loading buoys:', error);
            console.log('Using default buoy data instead');
            
            // Use default buoys if fetch fails (e.g., due to CORS when using file:// protocol)
            addBuoysToMap(defaultBuoys, map);
            return defaultBuoys;
        });
}

/**
 * Load default buoys directly (without fetch)
 * @param {Object} map - Mapbox GL JS map instance
 */
function loadDefaultBuoys(map) {
    addBuoysToMap(defaultBuoys, map);
    return defaultBuoys;
}

/**
 * Toggle buoy visibility
 * @param {boolean} visible - Whether buoys should be visible
 */
function toggleBuoyVisibility(visible) {
    buoyMarkers.forEach(marker => {
        const element = marker.getElement();
        if (element) {
            element.style.display = visible ? 'block' : 'none';
        }
    });
}

/**
 * Get all buoys
 * @returns {Array} Array of buoy objects
 */
function getAllBuoys() {
    // Try to get buoys from localStorage first
    const savedBuoys = loadBuoysFromLocalStorage();
    if (savedBuoys && savedBuoys.length > 0) {
        return savedBuoys;
    }
    
    // Fall back to default buoys
    return defaultBuoys;
}

/**
 * Add a new buoy
 * @param {Object} buoy - Buoy object with name, latitude, longitude
 * @param {Object} map - Mapbox GL JS map instance
 * @returns {Object} The added buoy
 */
function addBuoy(buoy, map) {
    if (!buoy || !buoy.name || !buoy.latitude || !buoy.longitude) {
        console.error('Invalid buoy data');
        return null;
    }
    
    // Get current buoys
    const buoys = getAllBuoys();
    
    // Add new buoy
    buoys.push(buoy);
    
    // Save to localStorage
    saveBuoysToLocalStorage(buoys);
    
    // Refresh buoys on map
    refreshBuoysOnMap(map);
    
    return buoy;
}

/**
 * Update an existing buoy
 * @param {number} index - Index of the buoy to update
 * @param {Object} updatedBuoy - Updated buoy data
 * @param {Object} map - Mapbox GL JS map instance
 * @returns {Object} The updated buoy
 */
function updateBuoy(index, updatedBuoy, map) {
    if (!updatedBuoy || !updatedBuoy.name || !updatedBuoy.latitude || !updatedBuoy.longitude) {
        console.error('Invalid buoy data');
        return null;
    }
    
    // Get current buoys
    const buoys = getAllBuoys();
    
    // Check if index is valid
    if (index < 0 || index >= buoys.length) {
        console.error('Invalid buoy index');
        return null;
    }
    
    // Update buoy
    buoys[index] = updatedBuoy;
    
    // Save to localStorage
    saveBuoysToLocalStorage(buoys);
    
    // Refresh buoys on map
    refreshBuoysOnMap(map);
    
    return updatedBuoy;
}

/**
 * Delete a buoy
 * @param {number} index - Index of the buoy to delete
 * @param {Object} map - Mapbox GL JS map instance
 * @returns {boolean} Success status
 */
function deleteBuoy(index, map) {
    // Get current buoys
    const buoys = getAllBuoys();
    
    // Check if index is valid
    if (index < 0 || index >= buoys.length) {
        console.error('Invalid buoy index');
        return false;
    }
    
    // Remove buoy
    buoys.splice(index, 1);
    
    // Save to localStorage
    saveBuoysToLocalStorage(buoys);
    
    // Refresh buoys on map
    refreshBuoysOnMap(map);
    
    return true;
}

/**
 * Refresh buoys on the map
 * @param {Object} map - Mapbox GL JS map instance
 */
function refreshBuoysOnMap(map) {
    // Clear existing buoys
    clearBuoyMarkers();
    
    // Get current buoys
    const buoys = getAllBuoys();
    
    // Add buoys to map
    addBuoysToMap(buoys, map);
}

/**
 * Save buoys to localStorage
 * @param {Array} buoys - Array of buoy objects
 */
function saveBuoysToLocalStorage(buoys) {
    try {
        localStorage.setItem('regatta-buoys', JSON.stringify(buoys));
        console.log(`Saved ${buoys.length} buoys to localStorage`);
    } catch (error) {
        console.error('Error saving buoys to localStorage:', error);
    }
}

/**
 * Load buoys from localStorage
 * @returns {Array} Array of buoy objects or null if not found
 */
function loadBuoysFromLocalStorage() {
    try {
        const savedBuoys = localStorage.getItem('regatta-buoys');
        if (savedBuoys) {
            return JSON.parse(savedBuoys);
        }
    } catch (error) {
        console.error('Error loading buoys from localStorage:', error);
    }
    return null;
}

/**
 * Reset buoys to default
 * @param {Object} map - Mapbox GL JS map instance
 */
function resetBuoysToDefault(map) {
    // Save default buoys to localStorage
    saveBuoysToLocalStorage(defaultBuoys);
    
    // Refresh buoys on map
    refreshBuoysOnMap(map);
    
    return defaultBuoys;
}

// Export functions for use in other modules
window.regattaBuoys = {
    addBuoysToMap,
    clearBuoyMarkers,
    fitMapToBuoys,
    loadBuoysFromJSON,
    loadDefaultBuoys,
    toggleBuoyVisibility,
    defaultBuoys,  // Expose the default buoys array
    
    // Buoy management functions
    getAllBuoys,
    addBuoy,
    updateBuoy,
    deleteBuoy,
    refreshBuoysOnMap,
    saveBuoysToLocalStorage,
    loadBuoysFromLocalStorage,
    resetBuoysToDefault
};
