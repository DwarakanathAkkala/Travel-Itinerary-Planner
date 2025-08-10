// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// DOM Elements
const userEmailEl = document.getElementById('user-email');
const userNameEl = document.getElementById('user-name');
const logoutBtn = document.getElementById('logout-btn');
const tripListEl = document.getElementById('trip-list');

// Auth State Listener
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Update user info
    userEmailEl.textContent = user.email;
    userNameEl.textContent = user.displayName || 'Traveler';

    // Load user's trips
    loadTrips(user.uid);
});

// Logout Handler
logoutBtn.addEventListener('click', () => {
    firebase.auth().signOut()
        .then(() => {
            console.log('User signed out');
            window.location.href = 'login.html';
        })
        .catch((error) => {
            console.error('Logout error:', error);
            alert('Logout failed. Please try again.');
        });
});

// Load Trips from Firebase
function loadTrips(userId) {
    tripListEl.innerHTML = '<div class="loading-spinner"></div>';

    firebase.database().ref(`users/${userId}/trips`).on('value', (snapshot) => {
        const trips = snapshot.val() || {};
        renderTrips(trips);
    });
}

// Render Trips to DOM
function renderTrips(trips) {
    if (Object.keys(trips).length === 0) {
        tripListEl.innerHTML = '<p class="no-trips">No trips planned yet. Click "Add Trip" to get started!</p>';
        return;
    }

    let html = '';
    Object.entries(trips).forEach(([tripId, trip]) => {
        html += `
      <div class="trip-card" data-id="${tripId}">
        <h4>${trip.destination}</h4>
        <p class="trip-dates">
          <i class="far fa-calendar-alt"></i>
          ${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}
        </p>
        <p class="trip-status">
          <span class="status-badge ${getStatusClass(trip.status)}">
            ${trip.status || 'Planned'}
          </span>
        </p>
      </div>
    `;
    });

    tripListEl.innerHTML = html;
}

// Helper Functions
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function getStatusClass(status) {
    const statusMap = {
        'Planned': 'status-planned',
        'In Progress': 'status-in-progress',
        'Completed': 'status-completed',
        'Cancelled': 'status-cancelled'
    };
    return statusMap[status] || 'status-planned';
}