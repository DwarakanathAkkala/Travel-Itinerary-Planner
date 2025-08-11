// js/trip.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Get the trip ID from the URL query parameter
    const params = new URLSearchParams(window.location.search);
    const tripId = params.get('id');

    if (tripId) {
        console.log("Successfully retrieved Trip ID from URL:", tripId);
        // We will call a function to fetch data here in the next task.
        // fetchTripDetails(tripId); 
    } else {
        console.error("No Trip ID found in URL.");
        // Display an error message to the user on the page
        const content = document.getElementById('trip-details-content');
        content.innerHTML = '<h2>Error: Trip Not Found</h2><p>Could not find a valid trip ID in the URL. Please go back to the dashboard and try again.</p>';
    }
});