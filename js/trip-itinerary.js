import { addMarkersToMap } from './trip-map.js';
import { openItemModalForEdit, setButtonLoadingState } from './trip.js';

/**
 * Fetches and listens for real-time updates on itinerary items for a trip.
 * @param {string} tripId The unique ID of the current trip.
 */
export function fetchItineraryItems(tripId) {
    const itineraryRef = firebase.database().ref(`trips/${tripId}/itinerary`);
    const itineraryList = document.getElementById('itinerary-list');

    // Listen for changes on the itinerary data
    itineraryRef.orderByChild('date').on('value', snapshot => {
        itineraryList.innerHTML = ''; // Clear the list before rendering

        if (!snapshot.exists()) {
            itineraryList.innerHTML = `
                <div class="itinerary-item-empty">
                    <p>Your itinerary is empty. Add your first item to get started!</p>
                </div>`;
            return;
        }

        const items = [];
        snapshot.forEach(childSnapshot => {
            items.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });

        addMarkersToMap(items);

        // Group items by date
        const groupedByDate = items.reduce((acc, item) => {
            const date = item.date;
            if (!acc[date]) {
                acc[date] = [];
            }
            // Sort items by time within each day
            acc[date].push(item);
            acc[date].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
            return acc;
        }, {});

        // Render the grouped items
        for (const date in groupedByDate) {
            const dayGroup = document.createElement('div');
            dayGroup.className = 'itinerary-day-group';

            const formattedDate = new Date(date).toLocaleDateString(undefined, {
                weekday: 'long', month: 'long', day: 'numeric'
            });

            dayGroup.innerHTML = `<h4 class="itinerary-day-header"><i class="fas fa-calendar-day"></i> ${formattedDate}</h4>`;

            groupedByDate[date].forEach(item => {
                dayGroup.appendChild(createItineraryItemCard(item));
            });

            itineraryList.appendChild(dayGroup);
        }
    });
}

/**
 * Creates an HTML element for a single itinerary item.
 * @param {Object} itemData The data for a single itinerary item.
 * @returns {HTMLElement} A div element representing the itinerary item card.
 */
export function createItineraryItemCard(itemData) {
    const card = document.createElement('div');
    card.className = 'itinerary-item';
    card.setAttribute('data-item-id', itemData.id);
    card.setAttribute('data-category', itemData.category);

    const icons = {
        flight: 'fas fa-plane-departure',
        lodging: 'fas fa-hotel',
        transport: 'fas fa-car',
        dining: 'fas fa-utensils',
        activity: 'fas fa-ticket-alt',
        other: 'fas fa-map-pin'
    };

    // Format time for display, if it exists
    let formattedTime = '';
    if (itemData.time) {
        try {
            const [hours, minutes] = itemData.time.split(':');
            const dateForTime = new Date();
            dateForTime.setHours(hours, minutes);
            formattedTime = dateForTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (error) {
            console.error("Could not format time:", itemData.time, error);
            // formattedTime remains an empty string
        }
    }

    card.innerHTML = `
        <div class="item-icon">
            <i class="${icons[itemData.category] || icons.other}"></i>
        </div>
        <div class="item-details">
            <h5>${itemData.title || 'Untitled Item'}</h5>
            ${formattedTime ? `<div class="time">${formattedTime}</div>` : ''}
            ${itemData.notes ? `<div class="notes">${itemData.notes}</div>` : ''}

            <!-- Location with Google Maps Link AND Directions Button -->
            ${itemData.location ? `
                <div class="location-details">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${itemData.location}</span>
                    <div class="location-actions">
                        <button class="btn-get-directions" title="Get Directions to this location">
                            <i class="fas fa-route"></i>
                        </button>
                        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(itemData.location)}" target="_blank" class="gmaps-link" title="View on Google Maps">
                            <i class="fas fa-external-link-alt"></i>
                        </a>
                    </div>
                </div>
            ` : ''}
        </div>
        <div class="item-actions">
            <button class="btn-edit-item" title="Edit Item">
                <i class="fas fa-pencil-alt"></i>
            </button>
            <button class="btn-delete-item" title="Delete Item">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;

    return card;
}


/**
 * Handles clicks on the itinerary list for event delegation,
 * specifically looking for clicks on delete buttons.
 * @param {Event} e The click event.
 */
export function handleItineraryListClick(e) {
    const editButton = e.target.closest('.btn-edit-item');
    const deleteButton = e.target.closest('.btn-delete-item');
    const directionsButton = e.target.closest('.btn-get-directions');

    // --- HANDLE DIRECTIONS ---
    if (directionsButton) {
        const itemCard = directionsButton.closest('.itinerary-item');
        const locationName = itemCard.querySelector('.location-details span').textContent;

        // Call our own serverless function
        fetch(`/.netlify/functions/geocode?location=${encodeURIComponent(locationName)}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0) {
                    const { lat, lon } = data[0];
                    document.dispatchEvent(new CustomEvent('getDirections', { detail: { lat, lng: lon } }));
                } else {
                    alert("Could not find coordinates for this location.");
                }
            })
            .catch(err => console.error("Directions geocoding error:", err));
    }

    // --- HANDLE EDIT ---
    if (editButton) {
        const itemCard = editButton.closest('.itinerary-item');
        const itemId = itemCard.getAttribute('data-item-id');
        const params = new URLSearchParams(window.location.search);
        const tripId = params.get('id');

        // Fetch the specific item's data from Firebase
        const itemRef = firebase.database().ref(`trips/${tripId}/itinerary/${itemId}`);
        itemRef.once('value', snapshot => {
            if (snapshot.exists()) {
                // This function is imported from trip.js
                openItemModalForEdit(itemId, snapshot.val());
            }
        });
    }

    // --- HANDLE DELETE ---
    if (deleteButton) {
        const itemCard = deleteButton.closest('.itinerary-item');
        const itemId = itemCard.getAttribute('data-item-id');
        const params = new URLSearchParams(window.location.search);
        const tripId = params.get('id');

        if (!tripId || !itemId) {
            alert("Error: Missing ID for deletion.");
            return;
        }

        if (confirm("Are you sure you want to delete this itinerary item?")) {
            const itemRef = firebase.database().ref(`trips/${tripId}/itinerary/${itemId}`);
            itemRef.remove();
        }
    }
}

/**
 * Handles the form submission for creating a new itinerary item.
 * @param {Event} e The form submission event.
 */
export function handleItineraryFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const params = new URLSearchParams(window.location.search);
    const tripId = params.get('id');
    const editId = form.getAttribute('data-edit-id'); // Check for an edit ID

    if (!tripId) { alert("Error: Missing Trip ID."); return; }
    setButtonLoadingState(submitButton, true);

    const itemData = {
        title: form.querySelector('#item-title').value,
        category: form.querySelector('#item-category').value,
        location: form.querySelector('#item-location').value,
        date: form.querySelector('#item-date').value,
        time: form.querySelector('#item-time').value,
        notes: form.querySelector('#item-notes').value
    };

    let promise;
    if (editId) {
        // --- UPDATE ---
        // Get a reference to the specific item and update it
        const itemRef = firebase.database().ref(`trips/${tripId}/itinerary/${editId}`);
        promise = itemRef.update(itemData);
    } else {
        // --- CREATE ---
        // Add createdAt timestamp only for new items
        itemData.createdAt = firebase.database.ServerValue.TIMESTAMP;
        const itineraryRef = firebase.database().ref(`trips/${tripId}/itinerary`);
        promise = itineraryRef.push(itemData);
    }

    promise
        .then(() => {
            console.log(`Item ${editId ? 'updated' : 'saved'} successfully!`);
            document.getElementById('item-modal-container').classList.remove('show');
        })
        .catch(error => console.error("Error saving item:", error))
        .finally(() => setButtonLoadingState(submitButton, false));
}

/**
 * Populates the itinerary form with existing item data for editing.
 * @param {object} itemData The data of the item to be edited.
 */
export function populateItineraryForm(itemData) {
    const form = document.querySelector('#itinerary-form');
    if (!form) return;

    form.querySelector('#item-title').value = itemData.title || '';
    form.querySelector('#item-category').value = itemData.category || 'other';
    form.querySelector('#item-location').value = itemData.location || '';
    form.querySelector('#item-date').value = itemData.date || '';
    form.querySelector('#item-time').value = itemData.time || '';
    form.querySelector('#item-notes').value = itemData.notes || '';
}