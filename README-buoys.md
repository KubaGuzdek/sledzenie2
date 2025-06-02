# Regatta Buoys Feature

This feature adds regatta buoy markers to the map based on provided coordinates. Each buoy has longitude, latitude, and a name.

## Features

- Display buoys on the map with distinct orange markers
- Toggle buoy visibility with a button
- Center map to show all buoys
- Buoys automatically fit to view when loaded
- Hover effects for better visibility
- Popup information when clicking on buoys

## Implementation Details

### Files

- `js/regatta-buoys.js` - Main module for buoy functionality
- `data/regatta-buoys.json` - JSON file containing buoy coordinates and metadata
- `css/styles.css` - Contains styles for buoy markers
- `js/organizer-map.js` - Integration with the map system

### Usage

1. Include the regatta-buoys.js script in your HTML:
   ```html
   <script src="js/regatta-buoys.js"></script>
   ```

2. Load buoys after the map is initialized:
   ```javascript
   map.on('load', function() {
       loadRegattaBuoys();
   });
   ```

3. Toggle buoy visibility:
   ```javascript
   toggleBuoyVisibility(boolean);
   ```

### Buoy Data Format

The buoy data is stored in JSON format:

```json
{
  "metadata": {
    "course_name": "Course Name",
    "description": "Course description"
  },
  "buoys": [
    {
      "name": "A",
      "latitude": 54.6950,
      "longitude": 18.4050
    },
    ...
  ]
}
```

### Adding New Buoys

To add new buoys, edit the `data/regatta-buoys.json` file or modify the `defaultBuoys` array in `js/regatta-buoys.js`.

## Technical Notes

- The implementation handles both file:// protocol (using default buoys) and http:// protocol (loading from JSON)
- Buoys are automatically centered on the map when loaded
- Each buoy has a popup showing its name and coordinates
- The toggle button in the UI allows showing/hiding buoys
