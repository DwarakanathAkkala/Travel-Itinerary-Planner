// js/trip.js

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
    document.getElementById('add-item-btn').addEventListener('click', () => {
        // Fetch form content if it's not already loaded
        if (modalItemFormContent.getAttribute('data-loaded') !== 'true') {
            fetch('itinerary-form.html')
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.text();
                })
                .then(html => {
                    modalItemFormContent.innerHTML = html;
                    modalItemFormContent.setAttribute('data-loaded', 'true');

                    const itineraryForm = modalItemFormContent.querySelector('#itinerary-form');
                    if (itineraryForm) {
                        itineraryForm.addEventListener('submit', handleItineraryFormSubmit);
                    }
                })
                .catch(error => {
                    console.error('Error loading itinerary form:', error);
                    modalItemFormContent.innerHTML = '<p>Sorry, the form could not be loaded.</p>';
                });
        }
        itemModalContainer.classList.add('show');
    });

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

    if (!tripId) {
        alert("Error: Cannot save item without a valid trip ID.");
        return;
    }

    setButtonLoadingState(submitButton, true);

    // Construct the itinerary item data object
    const itemData = {
        title: form.querySelector('#item-title').value,
        category: form.querySelector('#item-category').value,
        date: form.querySelector('#item-date').value,
        time: form.querySelector('#item-time').value,
        notes: form.querySelector('#item-notes').value,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    // Push the data to the 'itinerary' node under the specific trip
    const itineraryRef = firebase.database().ref(`trips/${tripId}/itinerary`);
    itineraryRef.push(itemData)
        .then(() => {
            console.log("Itinerary item saved successfully!");
            form.reset();
            // We need a function to close the modal, let's call it closeItemModal
            const itemModalContainer = document.getElementById('item-modal-container');
            itemModalContainer.classList.remove('show');
        })
        .catch(error => {
            console.error("Error saving itinerary item:", error);
            alert("Error: Could not save your item. Please try again.");
        })
        .finally(() => {
            setButtonLoadingState(submitButton, false);
        });
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
    // Check if the clicked element (or its parent) is a delete button
    const deleteButton = e.target.closest('.btn-delete-item');

    if (deleteButton) {
        const itemCard = deleteButton.closest('.itinerary-item');
        const itemId = itemCard.getAttribute('data-item-id');
        const params = new URLSearchParams(window.location.search);
        const tripId = params.get('id');

        if (!tripId || !itemId) {
            alert("Error: Missing ID for deletion.");
            return;
        }

        // Ask for confirmation before deleting
        const isConfirmed = confirm("Are you sure you want to delete this itinerary item?");

        if (isConfirmed) {
            // Remove the item from Firebase
            const itemRef = firebase.database().ref(`trips/${tripId}/itinerary/${itemId}`);
            itemRef.remove()
                .then(() => {
                    console.log("Item deleted successfully.");
                    // No need to remove from UI manually, the realtime listener will handle it!
                })
                .catch(error => {
                    console.error("Error deleting item:", error);
                    alert("There was an error deleting the item.");
                });
        }
    }
}