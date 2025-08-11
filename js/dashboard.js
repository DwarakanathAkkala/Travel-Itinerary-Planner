// js/dashboard.js

// Global references to modal elements
const modalContainer = document.getElementById('trip-modal-container');
const modalFormContent = document.getElementById('modal-form-content');
// js/dashboard.js

// ... (keep global variables and the new code below) ...
const tripList = document.getElementById('trip-list');

// --- FIREBASE AUTH LISTENER ---
// This is the main entry point for loading user-specific data.
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        // User is signed in.
        console.log("User signed in, fetching trips for UID:", user.uid);
        fetchUserTrips(user.uid);
    } else {
        // User is signed out.
        console.log("User is signed out.");
        // Optionally, redirect to login page or clear the UI.
        // For now, we'll just clear the list and show an empty state.
        renderTrips([]);
    }
});


/**
 * Fetches trips from Firebase for a specific user.
 * @param {string} userId The UID of the currently logged-in user.
 */
function fetchUserTrips(userId) {
    const tripsRef = firebase.database().ref('trips');

    // Query the database for trips where 'userId' matches the current user's UID.
    // We also order them by creation date.
    tripsRef.orderByChild('userId').equalTo(userId).on('value', snapshot => {
        const tripsData = snapshot.val();
        const tripsArray = tripsData ? Object.keys(tripsData).map(key => ({
            id: key,
            ...tripsData[key]
        })) : [];

        // Sort trips by start date, newest first
        tripsArray.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

        console.log("Fetched Trips:", tripsArray);
        renderTrips(tripsArray);
    }, error => {
        console.error("Error fetching trips:", error);
        tripList.innerHTML = `<p class="error-message">Could not load trips. Please check your connection.</p>`;
    });
}

/**
 * Renders an array of trip objects into the DOM.
 * @param {Array} trips An array of trip objects.
 */
function renderTrips(trips) {
    // Clear current list and spinner
    tripList.innerHTML = '';

    if (trips.length === 0) {
        // Display a helpful message if there are no trips
        tripList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-suitcase-rolling"></i>
                <h3>No Trips Yet</h3>
                <p>Click "Add Trip" to start planning your next adventure!</p>
            </div>
        `;
        return;
    }

    trips.forEach(trip => {
        const tripCard = createTripCard(trip);
        tripList.appendChild(tripCard);
    });
}

/**
 * Creates an HTML element for a single trip card.
 * @param {Object} tripData The data for a single trip.
 * @returns {HTMLElement} A div element representing the trip card.
 */
function createTripCard(tripData) {
    const card = document.createElement('div');
    card.className = 'trip-card';
    card.setAttribute('data-trip-id', tripData.id);

    // Format dates for display
    const startDate = new Date(tripData.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endDate = new Date(tripData.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    card.innerHTML = `
        <div class="trip-card-image" style="background-image: url('https://source.unsplash.com/random/400x300/?${encodeURIComponent(tripData.destination)}')"></div>
        <div class="trip-card-content">
            <h4>${tripData.name}</h4>
            <p><i class="fas fa-map-marker-alt"></i> ${tripData.destination}</p>
            <div class="trip-card-footer">
                <span><i class="fas fa-calendar-alt"></i> ${startDate} - ${endDate}</span>
                <a href="#" class="link">View Details</a>
            </div>
        </div>
    `;
    return card;
}

/**
 * Handles the form submission for creating a new trip.
 * @param {Event} e The form submission event.
 */
function handleTripFormSubmit(e) {
    e.preventDefault(); // Stop the default page reload

    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const user = firebase.auth().currentUser;

    // 1. Check if a user is logged in
    if (!user) {
        alert("Authentication error: You must be logged in to create a trip.");
        return;
    }

    // 2. Show loading state
    setButtonLoadingState(submitButton, true);

    // 3. Get form data
    const tripData = {
        name: form.querySelector('#trip-name').value,
        destination: form.querySelector('#trip-destination').value,
        startDate: form.querySelector('#start-date').value,
        endDate: form.querySelector('#end-date').value,
        notes: form.querySelector('#trip-notes').value,
        userId: user.uid, // Link the trip to the current user
        createdAt: firebase.database.ServerValue.TIMESTAMP // Record creation time
    };

    // 4. Push data to Firebase
    firebase.database().ref('trips').push(tripData)
        .then(() => {
            console.log("Trip saved successfully!");
            form.reset(); // Clear the form fields
            closeTripModal(); // Close the modal
        })
        .catch(error => {
            console.error("Error saving trip:", error);
            alert(`Error: Could not save your trip. Please try again. \n${error.message}`);
        })
        .finally(() => {
            // 5. Revert loading state
            setButtonLoadingState(submitButton, false);
        });
}

/**
 * Toggles the loading state of a button.
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

// --- EVENT LISTENERS ---
// We set these up once when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Listen for clicks on the main "Add Trip" button
    document.getElementById('add-trip-btn').addEventListener('click', openTripModal);

    // Listen for clicks on the close button ('×') inside the modal
    modalContainer.querySelector('.close-modal').addEventListener('click', closeTripModal);

    // Listen for clicks on the dark overlay background to close the modal
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            closeTripModal();
        }
    });

    modalFormContent.addEventListener('submit', handleTripFormSubmit);
});


/**
 * Opens the trip modal. It fetches the form content ONLY if it hasn't been loaded yet.
 */
function openTripModal() {
    // Check if the form is already loaded. If not, fetch it.
    // The 'data-loaded' attribute prevents us from re-fetching the form every time.
    if (modalFormContent.getAttribute('data-loaded') !== 'true') {
        fetch('trip-form.html')
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.text();
            })
            .then(html => {
                modalFormContent.innerHTML = html;
                modalFormContent.setAttribute('data-loaded', 'true');
            })
            .catch(error => {
                console.error('Error loading trip form:', error);
                modalFormContent.innerHTML = '<p>Sorry, the form could not be loaded.</p>';
            });
    }

    // Show the modal
    modalContainer.classList.add('show');
}

/**
 * Closes the trip modal.
 */
function closeTripModal() {
    modalContainer.classList.remove('show');
}