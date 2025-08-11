// js/dashboard.js

// Global references to modal elements
const modalContainer = document.getElementById('trip-modal-container');
const modalFormContent = document.getElementById('modal-form-content');

// js/dashboard.js

// ... (keep all the existing code above this line) ...

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