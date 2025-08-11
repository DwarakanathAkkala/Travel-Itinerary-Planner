// js/trip.js

// --- FIX FOR MISSING LEAFLET MARKER ICONS ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

let mapMarkers = []; // This will store our marker objects

document.addEventListener('DOMContentLoaded', () => {
    const tripDetailsContent = document.getElementById('trip-details-content');
    const params = new URLSearchParams(window.location.search);
    const tripId = params.get('id');

    if (!tripId) {
        console.error("No Trip ID found in URL.");
        tripDetailsContent.innerHTML = '<h2>Error: Trip Not Found</h2><p>Could not find a valid trip ID in the URL. Please go back to the dashboard and try again.</p>';
        return;
    }

    const itemModalContainer = document.getElementById('item-modal-container');
    const modalItemFormContent = document.getElementById('modal-item-form-content');

    // Add Itinerary
    document.getElementById('add-item-btn').addEventListener('click', openItemModalForCreate);

    // --- NEW: Attach listener for delete buttons ---
    const itineraryList = document.getElementById('itinerary-list');
    itineraryList.addEventListener('click', handleItineraryListClick);

    // Function to close the itinerary modal
    function closeItemModal() {
        itemModalContainer.classList.remove('show');
    }

    // Attach close listeners
    itemModalContainer.querySelector('.close-modal').addEventListener('click', closeItemModal);
    itemModalContainer.addEventListener('click', (e) => {
        if (e.target === itemModalContainer) closeItemModal();
    });

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

            // Fetch Itinerary Items
            fetchItineraryItems(tripId);
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

    // --- Initialize the map after details are rendered ---
    initializeMap();

    setMapViewToDestination(tripData.destination);
}

/**
 * Handles the form submission for creating a new itinerary item.
 * @param {Event} e The form submission event.
 */
function handleItineraryFormSubmit(e) {
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
 * Toggles the loading state of a button (re-used from dashboard.js).
 * @param {HTMLButtonElement} button The button element.
 * @param {boolean} isLoading True to show spinner, false to show text.
 */
function setButtonLoadingState(button, isLoading) {
    const btnText = button.querySelector('.btn-text');
    const spinner = button.querySelector('.spinner');
    if (isLoading) {
        button.disabled = true;
        btnText.style.display = 'none';
        spinner.style.display = 'inline-block';
    } else {
        button.disabled = false;
        btnText.style.display = 'inline-block';
        spinner.style.display = 'none';
    }
}

/**
 * Fetches and listens for real-time updates on itinerary items for a trip.
 * @param {string} tripId The unique ID of the current trip.
 */
function fetchItineraryItems(tripId) {
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
function createItineraryItemCard(itemData) {
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

    // Format time for display
    let formattedTime = '';
    if (itemData.time) {
        const [hours, minutes] = itemData.time.split(':');
        const dateForTime = new Date();
        dateForTime.setHours(hours, minutes);
        formattedTime = dateForTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    card.innerHTML = `
        <div class="item-icon">
            <i class="${icons[itemData.category] || icons.other}"></i>
        </div>
        <div class="item-details">
            <h5>${itemData.title}</h5>
            ${formattedTime ? `<div class="time">${formattedTime}</div>` : ''}
            ${itemData.notes ? `<div class="notes">${itemData.notes}</div>` : ''}
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
function handleItineraryListClick(e) {
    const editButton = e.target.closest('.btn-edit-item');
    const deleteButton = e.target.closest('.btn-delete-item');

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
                const itemData = snapshot.val();
                openItemModalForEdit(itemId, itemData); // Open modal and pass data
            }
        });
    }

    // --- HANDLE DELETE ---
    if (deleteButton) {
        // ... (The existing delete logic remains unchanged here) ...
        const itemCard = deleteButton.closest('.itinerary-item');
        const itemId = itemCard.getAttribute('data-item-id');
        const params = new URLSearchParams(window.location.search);
        const tripId = params.get('id');

        if (!tripId || !itemId) { alert("Error: Missing ID for deletion."); return; }
        const isConfirmed = confirm("Are you sure you want to delete this itinerary item?");
        if (isConfirmed) {
            const itemRef = firebase.database().ref(`trips/${tripId}/itinerary/${itemId}`);
            itemRef.remove();
        }
    }
}

// In js/trip.js, at the end of the file
/**
 * Populates the itinerary form with existing item data for editing.
 * @param {object} itemData The data of the item to be edited.
 */
function populateItineraryForm(itemData) {
    const form = document.querySelector('#itinerary-form');
    if (!form) return;

    form.querySelector('#item-title').value = itemData.title || '';
    form.querySelector('#item-category').value = itemData.category || 'other';
    form.querySelector('#item-location').value = itemData.location || '';
    form.querySelector('#item-date').value = itemData.date || '';
    form.querySelector('#item-time').value = itemData.time || '';
    form.querySelector('#item-notes').value = itemData.notes || '';
}

function openItemModalForCreate() {
    const modalContainer = document.getElementById('item-modal-container');
    const modalFormContent = document.getElementById('modal-item-form-content');

    // Ensure the form is loaded
    loadAndShowForm(() => {
        // Set modal title and button text for "Create" mode
        modalContainer.querySelector('h3').textContent = 'Add Itinerary Item';
        const form = modalFormContent.querySelector('#itinerary-form');
        form.querySelector('.btn-text').textContent = 'Add to Itinerary';
        form.removeAttribute('data-edit-id'); // Ensure no edit ID is lingering
        form.reset(); // Clear any previous data
        modalContainer.classList.add('show');
    });
}

/**
 * Opens the item modal for editing an existing item.
 * @param {string} itemId The ID of the item to edit.
 * @param {object} itemData The existing data of the item.
 */
function openItemModalForEdit(itemId, itemData) {
    const modalContainer = document.getElementById('item-modal-container');
    const modalFormContent = document.getElementById('modal-item-form-content');

    loadAndShowForm(() => {
        // Set modal title and button text for "Edit" mode
        modalContainer.querySelector('h3').textContent = 'Edit Itinerary Item';
        const form = modalFormContent.querySelector('#itinerary-form');
        form.querySelector('.btn-text').textContent = 'Save Changes';
        form.setAttribute('data-edit-id', itemId); // Store the item's ID on the form
        populateItineraryForm(itemData); // Fill the form with existing data
        modalContainer.classList.add('show');
    });
}

/**
 * Helper function to ensure the itinerary form is loaded before showing the modal.
 * @param {function} callback The function to run after the form is ready.
 */
function loadAndShowForm(callback) {
    const modalFormContent = document.getElementById('modal-item-form-content');

    if (modalFormContent.getAttribute('data-loaded') === 'true') {
        callback(); // If already loaded, just run the callback
    } else {
        // If not loaded, fetch it first, then run the callback
        fetch('itinerary-form.html')
            .then(response => { if (!response.ok) throw new Error('Network response'); return response.text(); })
            .then(html => {
                modalFormContent.innerHTML = html;
                modalFormContent.setAttribute('data-loaded', 'true');
                modalFormContent.querySelector('#itinerary-form').addEventListener('submit', handleItineraryFormSubmit);
                callback(); // Run the callback now that the form is ready
            })
            .catch(error => console.error('Error loading itinerary form:', error));
    }
}

/**
 * Initializes an interactive map using Leaflet.js.
 * For now, it will be centered on a default location.
 * @returns {object} The Leaflet map instance.
 */
function initializeMap() {
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
 * Clears existing markers and adds new ones based on itinerary items.
 * It will geocode the location string for each item.
 * @param {Array<object>} items An array of itinerary items.
 */
async function addMarkersToMap(items) {
    // 1. Clear any existing markers from the map
    mapMarkers.forEach(marker => marker.remove());
    mapMarkers = [];

    // 2. Process each item with a location
    for (const item of items) {
        if (item.location && item.location.trim() !== '') {
            try {
                // 3. Use a free geocoding API to get coordinates
                const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(item.location)}&format=json&limit=1`);
                const data = await response.json();

                if (data && data.length > 0) {
                    const { lat, lon } = data[0]; // Note: It's 'lat' and 'lon' here

                    const marker = L.marker([lat, lon]) // Use lat, lon
                        .addTo(window.mapInstance)
                        .bindPopup(`<b>${item.title}</b><br>${item.location}`);

                    mapMarkers.push(marker);
                }
            } catch (error) {
                console.error("Geocoding error for:", item.location, error);
            }
        }
    }

    // 5. Adjust map view to fit all markers
    if (mapMarkers.length > 0) {
        const featureGroup = L.featureGroup(mapMarkers);
        window.mapInstance.fitBounds(featureGroup.getBounds().pad(0.1)); // pad adds a nice margin
    }
}

/**
 * Overrides the default map view if a trip has a destination set.
 * @param {string} destination The destination string from the trip details.
 */
async function setMapViewToDestination(destination) {
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