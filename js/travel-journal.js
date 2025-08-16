// js/travel-journal.js

document.addEventListener('DOMContentLoaded', initializeJournalPage);

function initializeJournalPage() {
    const params = new URLSearchParams(window.location.search);
    const tripId = params.get('id');

    if (!tripId) {
        displayError('<h2>Error: Trip Not Found</h2><p>Could not find a valid trip ID in the URL.</p>');
        return;
    }

    // Set the back button link
    document.getElementById('back-to-trip-btn').href = `trip.html?id=${tripId}`;

    fetchTripHeader(tripId);
}

function fetchTripHeader(tripId) {
    const tripRef = firebase.database().ref(`trips/${tripId}`);
    tripRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
            const tripData = snapshot.val();
            renderTripHeader(tripData);
        } else {
            displayError('<h2>Trip Not Found</h2><p>The requested trip does not exist.</p>');
        }
    }, (error) => {
        console.error("Error fetching trip header:", error);
        displayError('<h2>Error</h2><p>There was an error retrieving trip details.</p>');
    });
}

function renderTripHeader(tripData) {
    const tripDetailsContent = document.getElementById('trip-details-content');
    document.title = `${tripData.name || 'Travel Journal'} | Wanderlust`;

    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    let dateString = "Dates not specified";
    if (tripData.startDate && tripData.endDate) {
        const startDate = new Date(tripData.startDate).toLocaleDateString(undefined, options);
        const endDate = new Date(tripData.endDate).toLocaleDateString(undefined, options);
        dateString = `${startDate} to ${endDate}`;
    }

    tripDetailsContent.innerHTML = `
        <div class="trip-image-banner" style="background-image: url('https://source.unsplash.com/random/1200x400/?${encodeURIComponent(tripData.destination || 'travel')},travel')">
            <h1>${tripData.name || 'Unnamed Trip'}</h1>
        </div>
        <div class="trip-info-bar">
            <div class="info-item"><i class="fas fa-map-marked-alt"></i><span>${tripData.destination || 'No destination set'}</span></div>
            <div class="info-item"><i class="fas fa-calendar-check"></i><span>${dateString}</span></div>
        </div>`;
}

function displayError(html) {
    const contentContainer = document.getElementById('trip-details-content');
    contentContainer.innerHTML = `<div style="text-align:center; padding: 4rem;">${html}</div>`;
    document.getElementById('journal-entry-list').innerHTML = ''; // Clear the second spinner
}