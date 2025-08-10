// dashboard.js - Error-Proof Implementation

// 1. Wait for DOM and Firebase to be ready
document.addEventListener('DOMContentLoaded', () => {
    // 2. Initialize Firebase if not already initialized
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    // 3. Safe DOM element references
    const getElement = (id) => {
        const el = document.getElementById(id);
        if (!el && id === 'trip-modal-container') {
            // Create the container if missing
            const container = document.createElement('div');
            container.id = 'trip-modal-container';
            document.body.appendChild(container);
            return container;
        }
        return el;
    };

    const elements = {
        userEmail: getElement('user-email'),
        userName: getElement('user-name'),
        logoutBtn: getElement('logout-btn'),
        tripList: getElement('trip-list'),
        addTripBtn: getElement('add-trip-btn'),
        tripModalContainer: getElement('trip-modal-container')
    };

    // 4. Only proceed if essential elements exist
    if (!elements.tripList || !elements.addTripBtn || !elements.logoutBtn) {
        console.error('Critical elements missing - check your HTML');
        return;
    }

    // 5. Auth state management
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            initDashboard(user, elements);
        } else {
            window.location.href = 'login.html';
        }
    });
});

// 6. Core dashboard functionality
function initDashboard(user, elements) {
    // Update user info
    if (elements.userEmail) elements.userEmail.textContent = user.email;
    if (elements.userName) elements.userName.textContent = user.displayName || 'Traveler';

    // Setup event listeners safely
    setupEventListeners(elements, user.uid);

    // Load trips
    loadTrips(user.uid, elements.tripList);
}

// 7. Safe event listener setup
function setupEventListeners(elements, userId) {
    // Logout button
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', () => {
            firebase.auth().signOut()
                .catch(error => console.error('Logout failed:', error));
        });
    }

    // Add trip button
    if (elements.addTripBtn) {
        elements.addTripBtn.addEventListener('click', () => {
            if (elements.tripModalContainer) {
                openTripModal(elements.tripModalContainer, userId);
            }
        });
    }
}

// 8. Trip modal handling
function openTripModal(userId) {
    const container = document.getElementById('trip-modal-container');

    // Verify container exists
    if (!container) {
        console.error('Modal container not found');
        return;
    }

    // Safely set innerHTML
    container.innerHTML = `
    <div class="trip-modal">
      <span class="close-modal">&times;</span>
      <h3>Plan New Trip</h3>
      <form class="trip-form" id="trip-form">
        <input type="text" id="trip-name" placeholder="Trip Name" required>
        <input type="text" id="trip-destination" placeholder="Destination" required>
        <div class="date-group">
          <input type="date" id="start-date" required>
          <input type="date" id="end-date" required>
        </div>
        <textarea id="trip-notes" placeholder="Notes (optional)"></textarea>
        <button type="submit">
          <span class="btn-text">Create Trip</span>
          <div class="spinner"></div>
        </button>
      </form>
    </div>
  `;

    // Set default date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('start-date').value = today;

    // Show modal
    container.style.display = 'flex';

    // Add event listeners
    document.querySelector('.close-modal').addEventListener('click', () => {
        container.style.display = 'none';
    });

    document.getElementById('trip-form').addEventListener('submit', (e) => {
        e.preventDefault();
        createNewTrip(userId, e.target);
    });
}

// 9. Trip data functions
function loadTrips(userId, tripListElement) {
    if (!tripListElement) return;

    tripListElement.innerHTML = '<div class="loading-spinner"></div>';

    firebase.database().ref(`users/${userId}/trips`).on('value', (snapshot) => {
        const trips = snapshot.val() || {};
        renderTrips(trips, tripListElement);
    });
}

function renderTrips(trips, container) {
    if (!container) return;

    if (Object.keys(trips).length === 0) {
        container.innerHTML = '<p class="no-trips">No trips planned yet</p>';
        return;
    }

    let html = '';
    Object.entries(trips).forEach(([id, trip]) => {
        html += `
      <div class="trip-card" data-id="${id}">
        <h4>${trip.name || 'Unnamed Trip'}</h4>
        <p>${trip.destination}</p>
        <small>${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}</small>
      </div>
    `;
    });

    container.innerHTML = html;
}

async function createNewTrip(userId, form) {
    const tripData = {
        name: form['trip-name'].value,
        destination: form['trip-destination'].value,
        startDate: form['start-date'].value,
        endDate: form['end-date'].value,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    try {
        await firebase.database().ref(`users/${userId}/trips`).push(tripData);
        document.getElementById('trip-modal-container').style.display = 'none';
        form.reset();
    } catch (error) {
        console.error('Error creating trip:', error);
        alert('Failed to create trip. Please try again.');
    }
}

// 10. Helper functions
function formatDate(dateString) {
    if (!dateString) return 'No date';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

let modalContainer;

function initTripModal() {
    modalContainer = document.getElementById('trip-modal-container');

    if (!modalContainer) {
        console.error('Modal container not found!');
        return;
    }

    // Create modal HTML structure
    modalContainer.innerHTML = `
    <div class="trip-modal">
      <div class="modal-header">
        <h3>Plan New Trip</h3>
        <span class="close-modal">&times;</span>
      </div>
      <form class="trip-form" id="trip-form">
        <div class="form-group">
          <input type="text" id="trip-name" placeholder="Trip Name" required>
        </div>
        <div class="form-group">
          <input type="text" id="trip-destination" placeholder="Destination" required>
        </div>
        <div class="date-group">
          <div class="form-group">
            <input type="date" id="start-date" required>
          </div>
          <div class="form-group">
            <input type="date" id="end-date" required>
          </div>
        </div>
        <button type="submit" class="submit-btn">
          <span class="btn-text">Create Trip</span>
          <div class="spinner"></div>
        </button>
      </form>
    </div>
  `;

    // Set today's date as default
    document.getElementById('start-date').valueAsDate = new Date();

    // Close modal when clicking outside
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            closeModal();
        }
    });

    // Close button
    document.querySelector('.close-modal').addEventListener('click', closeModal);
}

function showModal() {
    if (!modalContainer) initTripModal();
    modalContainer.classList.add('show');
    document.getElementById('trip-name').focus();
}

function closeModal() {
    modalContainer.classList.remove('show');
}

// Update your existing "Add Trip" button handler:
document.getElementById('add-trip-btn').addEventListener('click', showModal);