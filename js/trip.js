// js/trip.js

// --- FIX FOR MISSING LEAFLET MARKER ICONS ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

import { initializeMap, setMapViewToDestination, getDirectionsTo } from './trip-map.js';

import {
    fetchItineraryItems,
    handleItineraryListClick,
    handleItineraryFormSubmit,
    populateItineraryForm
} from './trip-itinerary.js';

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

    document.addEventListener('getDirections', (e) => {
        getDirectionsTo(e.detail);
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
 * Toggles the loading state of a button (re-used from dashboard.js).
 * @param {HTMLButtonElement} button The button element.
 * @param {boolean} isLoading True to show spinner, false to show text.
 */
export function setButtonLoadingState(button, isLoading) {
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
export function openItemModalForEdit(itemId, itemData) {
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