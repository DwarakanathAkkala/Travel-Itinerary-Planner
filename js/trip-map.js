

let mapMarkers = []; // This will store our marker objects
let routingControl = null;

/**
 * Initializes an interactive map using Leaflet.js.
 * For now, it will be centered on a default location.
 * @returns {object} The Leaflet map instance.
 */
export function initializeMap() {
    // Check if map is already initialized
    if (window.mapInstance) {
        window.mapInstance.remove();
    }

    // Create a map instance in the 'map' div, set initial view
    window.mapInstance = L.map('map').setView([13.6288, 79.4192], 13); // Default to Tirupati, Andhra Pradesh

    // Add a tile layer from OpenStreetMap (free to use)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(window.mapInstance);

    return window.mapInstance;
}

/**
 * Overrides the default map view if a trip has a destination set.
 * @param {string} destination The destination string from the trip details.
 */
export async function setMapViewToDestination(destination) {
    if (destination && destination.trim() !== '') {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`);
            const data = await response.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0]; // Note: It's 'lat' and 'lon' here
                window.mapInstance.setView([lat, lon], 13); // Use lat, lon
            }
        } catch (error) {
            console.error("Could not set map view to destination:", error);
        }
    }
}

/**
 * Clears existing markers and adds new ones based on itinerary items.
 * It will geocode the location string for each item.
 * @param {Array<object>} items An array of itinerary items.
 */
// In js/trip.js, REPLACE the entire function

export async function addMarkersToMap(items) {
    // 1. Clear existing markers
    mapMarkers.forEach(marker => marker.remove());
    mapMarkers = [];

    // 2. Define settings for each category
    const categorySettings = {
        flight: { color: 'blue', icon: 'fa-plane' },
        lodging: { color: 'purple', icon: 'fa-hotel' },
        transport: { color: 'orange', icon: 'fa-car' },
        dining: { color: 'red', icon: 'fa-utensils' },
        activity: { color: 'green', icon: 'fa-ticket-alt' },
        other: { color: 'gray', icon: 'fa-map-pin' }
    };

    // 3. Process each item
    for (const item of items) {
        if (item.location && item.location.trim() !== '') {
            try {
                // Using Nominatim for geocoding
                const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(item.location)}&format=json&limit=1`);
                const data = await response.json();

                if (data && data.length > 0) {
                    const { lat, lon } = data[0];

                    // 4. Get the correct setting, defaulting to 'other'
                    const setting = categorySettings[item.category] || categorySettings.other;

                    // 5. Create a custom HTML marker using L.divIcon
                    const customIcon = L.divIcon({
                        className: 'leaflet-div-icon', // Required by Leaflet
                        html: `<div class="custom-marker marker-color-${setting.color}">
                                   <i class="fas ${setting.icon}"></i>
                               </div>`,
                        iconSize: [35, 35],
                        iconAnchor: [17, 35], // Point of the icon which will correspond to marker's location
                        popupAnchor: [0, -35] // Point from which the popup should open relative to the iconAnchor
                    });

                    // 6. Add marker to the map
                    const marker = L.marker([lat, lon], { icon: customIcon })
                        .addTo(window.mapInstance)
                        .bindPopup(`<b>${item.title}</b><br>${item.location}`);

                    mapMarkers.push(marker);
                }
            } catch (error) {
                // This will now only catch errors from the network fetch or JSON parsing
                console.error("Geocoding error for:", item.location, error);
            }
        }
    }

    // 7. Adjust map view
    if (mapMarkers.length > 0) {
        const featureGroup = L.featureGroup(mapMarkers);
        window.mapInstance.fitBounds(featureGroup.getBounds().pad(0.2));
    }
}


/**
 * Calculates and displays a route on the map from the user's current
 * location to a specified destination.
 * @param {object} destinationCoords The latitude/longitude of the destination.
 * @param {string} destinationName The name of the destination for the plan.
 */
export function getDirectionsTo(destinationCoords, destinationName) {
    if (!window.mapInstance) {
        alert("Map is not initialized yet.");
        return;
    }

    // First, get the user's current location
    navigator.geolocation.getCurrentPosition(position => {
        const startCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };

        // If a routing control already exists, remove it
        if (routingControl) {
            window.mapInstance.removeControl(routingControl);
        }

        // Create a new routing control
        routingControl = L.Routing.control({
            waypoints: [
                L.latLng(startCoords.lat, startCoords.lng),
                L.latLng(destinationCoords.lat, destinationCoords.lng)
            ],
            routeWhileDragging: true,
            createMarker: function (i, waypoint, n) {
                // Use custom markers for start and end points
                const markerIcon = L.divIcon({
                    className: 'leaflet-div-icon',
                    html: `<div class="custom-marker marker-color-${i === 0 ? 'blue' : 'green'}">
                               <i class="fas ${i === 0 ? 'fa-user' : 'fa-flag-checkered'}"></i>
                           </div>`,
                    iconSize: [35, 35],
                    iconAnchor: [17, 35]
                });
                return L.marker(waypoint.latLng, { icon: markerIcon });
            }
        }).addTo(window.mapInstance);

        // Hide the default itinerary list while directions are shown
        document.querySelector('.leaflet-routing-container').style.display = 'block';

    }, error => {
        console.error("Geolocation error:", error);
        alert("Could not get your current location. Please ensure you have granted location permissions.");
    });
}