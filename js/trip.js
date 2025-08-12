// js/trip.js
// This is the main script for the trip detail page.
// It initializes all features and coordinates between different modules.

// --- MODULE IMPORTS ---
import { initializeMap, setMapViewToDestination, getDirectionsTo } from './trip-map.js';
import { fetchItineraryItems, handleItineraryListClick } from './trip-itinerary.js';
import { initializeExpenseListeners, fetchAndDisplayExpenses } from './trip-expenses.js';

// --- DOM EVENT LISTENERS ---
// These are the main entry points for the page.
document.addEventListener('DOMContentLoaded', initializePage);
document.addEventListener('getDirections', (e) => getDirectionsTo(e.detail));

// --- GLOBAL REFERENCES ---
const tripDetailsContent = document.getElementById('trip-details-content');
const modalContainer = document.getElementById('item-modal-container');
const modalFormContent = document.getElementById('modal-item-form-content');

/**
 * Main function to initialize the page. It attaches static listeners
 * and then triggers data fetching based on auth state and URL params.
 */
function initializePage() {
    console.log("Page Initialized. Attaching listeners.");
    // Attach all static listeners that don't depend on data
    document.getElementById('add-item-btn').addEventListener('click', openItemModalForCreate);
    document.getElementById('itinerary-list').addEventListener('click', handleItineraryListClick);

    // Set up the close buttons for the itinerary modal
    setupModal(modalContainer, closeItemModal);

    // Now, check for user auth and fetch the trip-specific data
    firebase.auth().onAuthStateChanged(user => {
        const params = new URLSearchParams(window.location.search);
        const tripId = params.get('id');

        // First, validate we have a tripId. If not, stop and show an error.
        if (!tripId) {
            console.error("No Trip ID found in URL.");
            displayError('<h2>Error: Trip Not Found</h2><p>Could not find a valid trip ID in the URL. Please go back to the dashboard and try again.</p>');
            return;
        }

        // Next, validate the user is logged in.
        if (user) {
            console.log("User is signed in. Fetching data for trip:", tripId);
            initializeExpenseListeners(tripId);
            fetchTripDetails(tripId);
        } else {
            console.log("User is not signed in.");
            displayError('<h2>Access Denied</h2><p>You must be logged in to view this page.</p>');
        }
    });
}

/**
 * Fetches and renders the main trip details from Firebase.
 * This is the trigger for rendering all other data (itinerary, map).
 * @param {string} tripId The ID of the trip to fetch.
 */
function fetchTripDetails(tripId) {
    const tripRef = firebase.database().ref(`trips/${tripId}`);
    tripRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const tripData = snapshot.val();
            renderTripDetails(tripData);
            fetchItineraryItems(tripId); // After rendering trip, fetch its itinerary
            fetchAndDisplayExpenses(tripId); // Fetch and display expenses
        } else {
            displayError('<h2>Trip Not Found</h2><p>The requested trip does not exist or may have been deleted.</p>');
        }
    }, (error) => {
        console.error("Error fetching trip details:", error);
        displayError('<h2>Error</h2><p>There was an error retrieving the trip details.</p>');
    });
}

/**
 * Renders the main trip details (banner, info bar, notes) onto the page.
 * @param {object} tripData The trip data object from Firebase.
 */
function renderTripDetails(tripData) {
    tripDetailsContent.classList.add('loaded');

    // Safely format dates
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    let dateString = "Dates not specified";
    if (tripData.startDate && tripData.endDate) {
        const startDate = new Date(tripData.startDate).toLocaleDateString(undefined, options);
        const endDate = new Date(tripData.endDate).toLocaleDateString(undefined, options);
        if (startDate !== 'Invalid Date' && endDate !== 'Invalid Date') {
            dateString = `${startDate} to ${endDate}`;
        }
    }

    // Update the page title and render HTML
    document.title = `${tripData.name || 'Trip Details'} | Wanderlust`;
    tripDetailsContent.innerHTML = `
        <div class="trip-image-banner" style="background-image: url('https://source.unsplash.com/random/1200x400/?${encodeURIComponent(tripData.destination || 'travel')},travel')">
            <h1>${tripData.name || 'Unnamed Trip'}</h1>
        </div>
        <div class="trip-info-bar">
            <div class="info-item"><i class="fas fa-map-marked-alt"></i><span>${tripData.destination || 'No destination set'}</span></div>
            <div class="info-item"><i class="fas fa-calendar-check"></i><span>${dateString}</span></div>
        </div>
        <div class="trip-notes">
            <h3>Trip Notes</h3><p>${tripData.notes || 'No notes have been added for this trip yet.'}</p>
        </div>`;

    // Initialize map features after rendering the trip details
    initializeMap();
    setMapViewToDestination(tripData.destination);
}

/**
 * Displays a generic error message in the main content area.
 * @param {string} html The HTML string of the error message.
 */
function displayError(html) {
    tripDetailsContent.innerHTML = html;
}

// ==========================================================
// REGION: ITINERARY MODAL HANDLING
// These functions are exported so other modules can use them.
// ==========================================================

/**
 * Attaches close listeners to a modal container.
 * @param {HTMLElement} modalElement The modal container element.
 * @param {function} closeFn The function to call to close the modal.
 */
function setupModal(modalElement, closeFn) {
    modalElement.querySelector('.close-modal').addEventListener('click', closeFn);
    modalElement.addEventListener('click', (e) => {
        if (e.target === modalElement) closeFn();
    });
}

function openItemModalForCreate() {
    loadAndShowForm(() => {
        modalContainer.querySelector('h3').textContent = 'Add Itinerary Item';
        const form = modalFormContent.querySelector('#itinerary-form');
        form.querySelector('.btn-text').textContent = 'Add to Itinerary';
        form.removeAttribute('data-edit-id');
        form.reset();
        modalContainer.classList.add('show');
    });
}

export function openItemModalForEdit(itemId, itemData) {
    // This function is EXPORTED for trip-itinerary.js to use
    loadAndShowForm(() => {
        modalContainer.querySelector('h3').textContent = 'Edit Itinerary Item';
        const form = modalFormContent.querySelector('#itinerary-form');
        form.querySelector('.btn-text').textContent = 'Save Changes';
        form.setAttribute('data-edit-id', itemId);
        // We need to import populateItineraryForm into this file
        // Let's move populateItineraryForm here to simplify.
        populateItineraryForm(itemData);
        modalContainer.classList.add('show');
    });
}

function loadAndShowForm(callback) {
    if (modalFormContent.getAttribute('data-loaded') === 'true') {
        callback();
    } else {
        fetch('itinerary-form.html')
            .then(response => { if (!response.ok) throw new Error('Network response'); return response.text(); })
            .then(html => {
                modalFormContent.innerHTML = html;
                modalFormContent.setAttribute('data-loaded', 'true');
                // We need to import handleItineraryFormSubmit to attach it
                // This is getting complex. Let's refactor slightly.
                modalFormContent.querySelector('#itinerary-form').addEventListener('submit', (e) => {
                    // Import the handler from trip-itinerary.js and call it
                    import('./trip-itinerary.js').then(module => module.handleItineraryFormSubmit(e));
                });
                callback();
            })
            .catch(error => console.error('Error loading itinerary form:', error));
    }
}

function closeItemModal() {
    modalContainer.classList.remove('show');
}


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


// ==========================================================
// REGION: GENERIC HELPER FUNCTIONS
// ==========================================================

export function setButtonLoadingState(button, isLoading) {
    // This function is EXPORTED for other modules to use
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