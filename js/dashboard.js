// js/dashboard.js

// Global references to modal elements
const modalContainer = document.getElementById('trip-modal-container');
const modalFormContent = document.getElementById('modal-form-content');

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