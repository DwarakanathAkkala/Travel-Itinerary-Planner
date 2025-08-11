// js/trip.js

document.addEventListener('DOMContentLoaded', () => {
    const tripDetailsContent = document.getElementById('trip-details-content');
    const params = new URLSearchParams(window.location.search);
    const tripId = params.get('id');

    if (!tripId) {
        console.error("No Trip ID found in URL.");
        tripDetailsContent.innerHTML = '<h2>Error: Trip Not Found</h2><p>Could not find a valid trip ID in the URL. Please go back to the dashboard and try again.</p>';
        return;
    }

    // Use onAuthStateChanged to ensure user is logged in before fetching
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // User is signed in, fetch the specific trip.
            fetchTripDetails(tripId);
        } else {
            // User is not signed in.
            console.log("User is not signed in.");
            tripDetailsContent.innerHTML = '<h2>Access Denied</h2><p>You must be logged in to view this page.</p>';
        }
    });
});

/**
 * Fetches the details for a single trip from Firebase.
 * @param {string} tripId The unique ID of the trip to fetch.
 */
function fetchTripDetails(tripId) {
    const tripRef = firebase.database().ref(`trips/${tripId}`);
    const tripDetailsContent = document.getElementById('trip-details-content');

    tripRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const tripData = snapshot.val();
            console.log("Trip data fetched:", tripData);
            renderTripDetails(tripData);
        } else {
            console.error("Trip data does not exist for this ID.");
            tripDetailsContent.innerHTML = '<h2>Trip Not Found</h2><p>The requested trip does not exist or may have been deleted.</p>';
        }
    }, (error) => {
        console.error("Error fetching trip details:", error);
        tripDetailsContent.innerHTML = '<h2>Error</h2><p>There was an error retrieving the trip details. Please check your connection and security rules.</p>';
    });
}

/**
 * Renders the fetched trip data into the DOM.
 * @param {object} tripData The trip data object from Firebase.
 */
// In js/trip.js

/**
 * Renders the fetched trip data into the DOM.
 * @param {object} tripData The trip data object from Firebase.
 */
function renderTripDetails(tripData) {
    const tripDetailsContent = document.getElementById('trip-details-content');
    tripDetailsContent.classList.add('loaded');

    // --- NEW: Robust Date Handling ---
    let dateString = "Dates not specified"; // Default text
    if (tripData.startDate && tripData.endDate) {
        try {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            const startDate = new Date(tripData.startDate).toLocaleDateString(undefined, options);
            const endDate = new Date(tripData.endDate).toLocaleDateString(undefined, options);
            // Check for 'Invalid Date' which can happen with empty strings
            if (startDate !== 'Invalid Date' && endDate !== 'Invalid Date') {
                dateString = `${startDate} to ${endDate}`;
            }
        } catch (error) {
            console.error("Could not format dates:", error);
            // dateString remains the default
        }
    }
    // --- End of new date handling ---

    // Update the page title
    document.title = `${tripData.name || 'Trip Details'} | Wanderlust`;

    // Use the safe dateString in the template
    tripDetailsContent.innerHTML = `
        <div class="trip-image-banner" style="background-image: url('https://source.unsplash.com/random/1200x400/?${encodeURIComponent(tripData.destination || 'travel')},travel')">
            <h1>${tripData.name || 'Unnamed Trip'}</h1>
        </div>

        <div class="trip-info-bar">
            <div class="info-item">
                <i class="fas fa-map-marked-alt"></i>
                <span>${tripData.destination || 'No destination set'}</span>
            </div>
            <div class="info-item">
                <i class="fas fa-calendar-check"></i>
                <span>${dateString}</span>
            </div>
        </div>

        <div class="trip-notes">
            <h3>Trip Notes</h3>
            <p>${tripData.notes || 'No notes have been added for this trip yet.'}</p>
        </div>
    `;
}