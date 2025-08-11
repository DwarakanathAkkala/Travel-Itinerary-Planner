// js/dashboard.js
// This script handles all functionality on the main user dashboard.

// --- GLOBAL VARIABLES ---
// We declare them here but will ASSIGN them ONLY after the page has loaded.
let modalContainer;
let modalFormContent;
let tripList;
let tripsListener = null;

// --- MAIN INITIALIZATION ---
// The script's execution starts here, after the HTML page is fully loaded.
document.addEventListener('DOMContentLoaded', () => {
    // 1. First, find all our HTML elements. This is the critical fix to prevent null errors.
    initializeDOMElements();

    // 2. Now that we know the elements exist, check for user authentication.
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // --- USER IS SIGNED IN ---
            // This is the main success path. Initialize all dashboard features.
            initializeDashboard(user);
        } else {
            // --- USER IS NOT SIGNED IN ---
            // If there's no user, they shouldn't be here. Redirect to login.
            console.log("No user signed in on dashboard, redirecting to login.");
            window.location.href = 'login.html';
        }
    });
});

/**
 * Finds all necessary HTML elements and assigns them to our global variables.
 */
function initializeDOMElements() {
    modalContainer = document.getElementById('trip-modal'); // Updated ID from your HTML
    modalFormContent = document.getElementById('modal-form-content');
    tripList = document.getElementById('trip-list');
}

/**
 * Sets up the dashboard for an authenticated user.
 * @param {object} user The authenticated user object from Firebase.
 */
function initializeDashboard(user) {
    console.log("User authenticated. Setting up dashboard for UID:", user.uid);
    // Attach all the button and form listeners safely.
    attachStaticEventListeners();
    // Display user info in the header.
    updateUserInfo(user);
    // Fetch the user's trips from the database.
    fetchUserTrips(user.uid);
}

/**
 * Attaches all static event listeners for the dashboard page ONE TIME.
 */
function attachStaticEventListeners() {
    // Check if listeners are already attached to prevent duplicates.
    if (document.body.dataset.dashboardListeners === 'true') {
        return;
    }

    // Logout Button
    document.getElementById('logout-btn').addEventListener('click', () => {
        firebase.auth().signOut().then(() => {
            window.location.href = 'index.html';
        });
    });

    // Add Trip Modal
    document.getElementById('add-trip-btn').addEventListener('click', openTripModal);
    modalContainer.querySelector('.close-modal').addEventListener('click', closeTripModal);
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) closeTripModal();
    });
    modalFormContent.addEventListener('submit', handleTripFormSubmit);

    document.body.dataset.dashboardListeners = 'true';
}


// --- DATA FETCHING & RENDERING ---

function fetchUserTrips(userId) {
    if (tripsListener) {
        firebase.database().ref('trips').off('value', tripsListener);
    }
    const tripsRef = firebase.database().ref('trips');
    tripsListener = tripsRef.orderByChild('userId').equalTo(userId).on('value', snapshot => {
        const tripsData = snapshot.val();
        const tripsArray = tripsData ? Object.keys(tripsData).map(key => ({ id: key, ...tripsData[key] })) : [];
        tripsArray.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        renderTrips(tripsArray);
    }, error => {
        console.error("Error fetching trips:", error);
        tripList.innerHTML = `<p class="error-message">Could not load trips.</p>`;
    });
}

function renderTrips(trips) {
    if (!tripList) return; // Safety check
    tripList.innerHTML = ''; // Clear previous content (including spinner)
    if (trips.length === 0) {
        tripList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-suitcase-rolling"></i>
                <h3>No Trips Yet</h3>
                <p>Click "Add Trip" to start planning your next adventure!</p>
            </div>`;
    } else {
        trips.forEach(trip => {
            const tripCard = createTripCard(trip);
            tripList.appendChild(tripCard);
        });
    }
}

function createTripCard(tripData) {
    const card = document.createElement('div');
    card.className = 'trip-card';
    card.setAttribute('data-trip-id', tripData.id);
    const startDate = new Date(tripData.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endDate = new Date(tripData.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    card.innerHTML = `
        <div class="trip-card-image" style="background-image: url('https://source.unsplash.com/random/400x300/?${encodeURIComponent(tripData.destination || 'travel')},travel')"></div>
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

function updateUserInfo(user) {
    const userEmailSpan = document.getElementById('user-email');
    const userNameSpan = document.getElementById('user-name'); // For welcome banner
    const userDisplayNameSpan = document.getElementById('user-display-name');

    if (userEmailSpan) userEmailSpan.textContent = user.email;
    if (userNameSpan) userNameSpan.textContent = user.displayName || 'Traveler';
    if (userDisplayNameSpan) userDisplayNameSpan.textContent = user.displayName || user.email.split('@')[0];
}


// --- MODAL & FORM HANDLING ---

function openTripModal() {
    if (modalFormContent.getAttribute('data-loaded') !== 'true') {
        fetch('trip-form.html')
            .then(response => response.text())
            .then(html => {
                modalFormContent.innerHTML = html;
                modalFormContent.setAttribute('data-loaded', 'true');
            })
            .catch(error => {
                modalFormContent.innerHTML = '<p>Sorry, the form could not be loaded.</p>';
            });
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
        .then(() => {
            form.reset();
            closeTripModal();
        })
        .catch(error => { alert(`Error: Could not save trip.`); })
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