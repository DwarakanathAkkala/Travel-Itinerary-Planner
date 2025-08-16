document.addEventListener('DOMContentLoaded', initializeJournalPage);

function initializeJournalPage() {
    const params = new URLSearchParams(window.location.search);
    const tripId = params.get('id');

    if (!tripId) {
        displayError('<h2>Error: Trip Not Found</h2><p>Could not find a valid trip ID in the URL.</p>');
        return;
    }

    document.getElementById('back-to-trip-btn').href = `trip.html?id=${tripId}`;

    // This function now fetches the whole trip, not just the header
    fetchTripData(tripId);
}

function fetchTripData(tripId) {
    const tripRef = firebase.database().ref(`trips/${tripId}`);
    tripRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
            const tripData = snapshot.val();
            renderTripHeader(tripData);
            renderJournalEntries(tripData.itinerary); // Pass the itinerary to the new function
        } else {
            displayError('<h2>Trip Not Found</h2><p>The requested trip does not exist.</p>');
        }
    }, (error) => {
        console.error("Error fetching trip data:", error);
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
        </div>`;
    // The info bar is no longer needed here as the page is simpler
}

/**
 * NEW: Renders the list of itinerary items as journal entry placeholders.
 * @param {object} itineraryData The itinerary object from Firebase.
 */
function renderJournalEntries(itineraryData) {
    const listElement = document.getElementById('journal-entry-list');
    listElement.innerHTML = ''; // Clear spinner

    if (!itineraryData) {
        listElement.innerHTML = `<p style="text-align: center; color: #777;">This trip has no itinerary items to add journal entries to.</p>`;
        return;
    }

    const items = Object.keys(itineraryData).map(key => ({ id: key, ...itineraryData[key] }));
    items.sort((a, b) => new Date(a.date) - new Date(b.date) || (a.time || "").localeCompare(b.time || ""));

    items.forEach(item => {
        const card = createJournalEntryCard(item);
        listElement.appendChild(card);
    });
}

/**
 * Creates the HTML for a single journal entry card.
 * @param {object} itemData The data for one itinerary item.
 * @returns {HTMLElement} The created card element.
 */
function createJournalEntryCard(itemData) {
    const card = document.createElement('div');
    card.className = 'journal-entry-card';
    card.setAttribute('data-item-id', itemData.id);
    // Add the category data attribute for styling
    card.setAttribute('data-category', itemData.category || 'other');

    const formattedDate = new Date(itemData.date).toLocaleDateString(undefined, {
        weekday: 'long', month: 'long', day: 'numeric'
    });

    const icons = {
        flight: 'fas fa-plane-departure',
        lodging: 'fas fa-hotel',
        transport: 'fas fa-car',
        dining: 'fas fa-utensils',
        activity: 'fas fa-ticket-alt',
        other: 'fas fa-map-pin'
    };
    const iconClass = icons[itemData.category] || icons.other;

    card.innerHTML = `
        <div class="entry-icon">
            <i class="${iconClass}"></i>
        </div>
        <div class="entry-details">
            <h5>${itemData.title}</h5>
            <p><i class="fas fa-calendar-day"></i> ${formattedDate}</p>
        </div>
        <div class="entry-actions">
            <button class="btn-add-exp"> <!-- Changed class for specific styling -->
                <i class="fas fa-plus"></i> Add Experience
            </button>
        </div>
    `;
    return card;
}

function displayError(html) {
    const contentContainer = document.getElementById('trip-details-content');
    contentContainer.innerHTML = `<div style="text-align:center; padding: 4rem;">${html}</div>`;
    document.getElementById('journal-entry-list').innerHTML = '';
}