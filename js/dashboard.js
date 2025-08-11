// js/dashboard.js

// --- GLOBAL DOM REFERENCES ---
const modalContainer = document.getElementById('trip-modal-container');
const modalFormContent = document.getElementById('modal-form-content');
const tripList = document.getElementById('trip-list');
let tripsListener = null; // To hold a reference to our Firebase listener

// --- MAIN INITIALIZATION FUNCTION ---
function initializeDashboard() {
    console.log("Initializing Dashboard...");

    // Use onAuthStateChanged to get the current user
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // User is signed in.
            console.log("User signed in, attaching trips listener for UID:", user.uid);
            // Detach any old listeners before attaching a new one
            if (tripsListener) {
                firebase.database().ref('trips').off('value', tripsListener);
            }
            fetchUserTrips(user.uid);
        } else {
            // User is signed out.
            console.log("User is signed out.");
            renderTrips([]); // Clear the UI
        }
    });

    // Attach event listeners that only need to be set once
    attachStaticEventListeners();
}

/**
 * Attaches event listeners that do not need to be re-created.
 */
function attachStaticEventListeners() {
    // Check if listeners are already attached to prevent duplicates
    if (modalContainer.dataset.listenersAttached === 'true') return;

    document.getElementById('add-trip-btn').addEventListener('click', openTripModal);
    modalContainer.querySelector('.close-modal').addEventListener('click', closeTripModal);
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) closeTripModal();
    });
    modalFormContent.addEventListener('submit', handleTripFormSubmit);

    modalContainer.dataset.listenersAttached = 'true';
}


// --- FIREBASE DATA FUNCTIONS ---

function fetchUserTrips(userId) {
    const tripsRef = firebase.database().ref('trips');

    // Store the listener function in our global variable
    tripsListener = tripsRef.orderByChild('userId').equalTo(userId).on('value', snapshot => {
        const tripsData = snapshot.val();
        const tripsArray = tripsData ? Object.keys(tripsData).map(key => ({
            id: key,
            ...tripsData[key]
        })) : [];

        tripsArray.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        renderTrips(tripsArray);
    }, error => {
        console.error("Error fetching trips:", error);
        tripList.innerHTML = `<p class="error-message">Could not load trips. Please check your connection.</p>`;
    });
}


// --- RENDERING AND UI FUNCTIONS ---
// (No changes to renderTrips, createTripCard, openTripModal, closeTripModal, 
// handleTripFormSubmit, or setButtonLoadingState functions are needed)

function renderTrips(trips) {
    tripList.innerHTML = '';
    if (trips.length === 0) {
        tripList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-suitcase-rolling"></i>
                <h3>No Trips Yet</h3>
                <p>Click "Add Trip" to start planning your next adventure!</p>
            </div>`;
        return;
    }
    trips.forEach(trip => {
        const tripCard = createTripCard(trip);
        tripList.appendChild(tripCard);
    });
}

function createTripCard(tripData) {
    const card = document.createElement('div');
    card.className = 'trip-card';
    card.setAttribute('data-trip-id', tripData.id);
    const startDate = new Date(tripData.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endDate = new Date(tripData.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    card.innerHTML = `
        <div class="trip-card-image" style="background-image: url('https://source.unsplash.com/random/400x300/?${encodeURIComponent(tripData.destination)}')"></div>
        <div class="trip-card-content">
            <h4>${tripData.name}</h4>
            <p><i class="fas fa-map-marker-alt"></i> ${tripData.destination}</p>
            <div class="trip-card-footer">
                <span><i class="fas fa-calendar-alt"></i> ${startDate} - ${endDate}</span>
                <a href="trip.html?id=${tripData.id}" class="link">View Details</a>
            </div>
        </div>`;
    return card;
}

function openTripModal() {
    if (modalFormContent.getAttribute('data-loaded') !== 'true') {
        fetch('trip-form.html')
            .then(response => { if (!response.ok) throw new Error('Network response was not ok'); return response.text(); })
            .then(html => {
                modalFormContent.innerHTML = html;
                modalFormContent.setAttribute('data-loaded', 'true');
            })
            .catch(error => { console.error('Error loading trip form:', error); modalFormContent.innerHTML = '<p>Sorry, the form could not be loaded.</p>'; });
    }
    modalContainer.classList.add('show');
}

function closeTripModal() {
    modalContainer.classList.remove('show');
}

function handleTripFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const user = firebase.auth().currentUser;
    if (!user) { alert("Authentication error: You must be logged in to create a trip."); return; }
    setButtonLoadingState(submitButton, true);
    const tripData = {
        name: form.querySelector('#trip-name').value,
        destination: form.querySelector('#trip-destination').value,
        startDate: form.querySelector('#start-date').value,
        endDate: form.querySelector('#end-date').value,
        notes: form.querySelector('#trip-notes').value,
        userId: user.uid,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    firebase.database().ref('trips').push(tripData)
        .then(() => { form.reset(); closeTripModal(); })
        .catch(error => { console.error("Error saving trip:", error); alert(`Error: Could not save your trip. \n${error.message}`); })
        .finally(() => { setButtonLoadingState(submitButton, false); });
}

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


// --- PAGE LIFECYCLE EVENT LISTENERS ---

// This event runs when the page is first loaded.
window.addEventListener('DOMContentLoaded', initializeDashboard);

// This event runs when the page is shown from the back/forward cache.
window.addEventListener('pageshow', function (event) {
    // The 'persisted' property is true if the page is from the bfcache.
    if (event.persisted) {
        console.log("Page shown from bfcache, re-initializing dashboard.");
        initializeDashboard();
    }
});