// Full content for js/share.js

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const tripId = params.get('id');

    if (!tripId) {
        displayError('<h2>Invalid Link</h2><p>No trip ID was provided. Please check the link and try again.</p>');
        return;
    }

    fetchSharedTrip(tripId);
});

function fetchSharedTrip(tripId) {
    const tripRef = firebase.database().ref(`trips/${tripId}`);

    tripRef.once('value', snapshot => {
        if (!snapshot.exists()) {
            displayError('<h2>Trip Not Found</h2><p>The requested trip does not exist or may have been deleted.</p>');
            return;
        }

        const tripData = snapshot.val();

        if (tripData.isShared === true) {
            renderSharedTrip(tripData);
        } else {
            displayError('<h2>Access Denied</h2><p>This trip is private and has not been shared by its owner.</p>');
        }
    }, error => {
        console.error("Error fetching shared trip:", error);
        displayError('<h2>Error</h2><p>Could not retrieve trip details due to a database error.</p>');
    });
}

function renderSharedTrip(tripData) {
    const contentContainer = document.getElementById('share-page-content');
    document.title = `${tripData.name || 'Trip Details'} | Wanderlust`;
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    let dateString = "Dates not specified";
    if (tripData.startDate && tripData.endDate) {
        const startDate = new Date(tripData.startDate).toLocaleDateString(undefined, options);
        const endDate = new Date(tripData.endDate).toLocaleDateString(undefined, options);
        dateString = `${startDate} to ${endDate}`;
    }

    const headerHtml = `
        <div id="trip-details-content">
            <div class="trip-image-banner" style="background-image: url('https://source.unsplash.com/random/1200x400/?${encodeURIComponent(tripData.destination || 'travel')},travel')">
                <h1>${tripData.name || 'Unnamed Trip'}</h1>
            </div>
            <div class="trip-info-bar">
                <div class="info-item"><i class="fas fa-map-marked-alt"></i><span>${tripData.destination || 'No destination'}</span></div>
                <div class="info-item"><i class="fas fa-calendar-check"></i><span>${dateString}</span></div>
            </div>
        </div>
    `;

    let itineraryHtml = `
        <section class="itinerary-section-container">
            <div class="section-header">
                <h2>Itinerary</h2>
            </div>
            <div class="itinerary-list">
    `;

    if (tripData.itinerary) {
        const items = Object.values(tripData.itinerary);
        items.sort((a, b) => new Date(a.date) - new Date(b.date) || (a.time || "").localeCompare(b.time || ""));

        items.forEach(item => {
            itineraryHtml += createReadOnlyItineraryCard(item); // This now uses the corrected function
        });
    } else {
        itineraryHtml += `<div class="itinerary-item-empty"><p>This trip's itinerary is empty.</p></div>`;
    }

    itineraryHtml += '</div></section>';
    contentContainer.innerHTML = headerHtml + itineraryHtml;
}

function createReadOnlyItineraryCard(itemData) {
    const icons = {
        flight: 'fas fa-plane-departure',
        lodging: 'fas fa-hotel',
        transport: 'fas fa-car',
        dining: 'fas fa-utensils',
        activity: 'fas fa-ticket-alt',
        other: 'fas fa-map-pin'
    };

    const formattedDate = new Date(itemData.date).toLocaleDateString(undefined, {
        weekday: 'long', month: 'long', day: 'numeric'
    });

    let formattedTime = '';
    if (itemData.time) {
        try {
            const [hours, minutes] = itemData.time.split(':');
            const dateForTime = new Date();
            dateForTime.setHours(hours, minutes);
            formattedTime = dateForTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) { /* ignore formatting errors */ }
    }

    return `
        <div class="itinerary-item" data-category="${itemData.category || 'other'}">
            <div class="item-icon">
                <i class="${icons[itemData.category] || icons.other}"></i>
            </div>
            <div class="item-details">
                <h5>${itemData.title || 'Untitled Item'}</h5>
                <p class="item-meta">
                    <i class="fas fa-calendar-day"></i> ${formattedDate}
                    ${formattedTime ? `<span><i class="fas fa-clock"></i> ${formattedTime}</span>` : ''}
                </p>
                ${itemData.location ? `
                    <p class="item-meta">
                        <i class="fas fa-map-marker-alt"></i> ${itemData.location}
                    </p>
                ` : ''}
                ${itemData.notes ? `<div class="notes">${itemData.notes}</div>` : ''}
            </div>
        </div>
    `;
}

function displayError(html) {
    const contentContainer = document.getElementById('share-page-content');
    contentContainer.innerHTML = `<div class="share-error-container">${html}</div>`;
}