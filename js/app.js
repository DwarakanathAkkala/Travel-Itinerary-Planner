// Initialize Firebase
const dbUrl = `https://travel-planner-dwaraka-default-rtdb.firebaseio.com/trips.json`;

// DOM Elements
const tripList = document.getElementById('tripList');

// Fetch Trips
async function fetchTrips() {
    const response = await fetch(dbUrl);
    const trips = await response.json();

    tripList.innerHTML = '';

    for (const [id, trip] of Object.entries(trips || {})) {
        const tripEl = document.createElement('div');
        tripEl.className = 'trip-card';
        tripEl.innerHTML = `
      <h3>${trip.title}</h3>
      <p>${trip.startDate} to ${trip.endDate}</p>
    `;
        tripList.appendChild(tripEl);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', fetchTrips);