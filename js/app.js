// js/app.js
// This script is intended to be used ONLY on the public landing page (index.html).
// Its primary purpose is to check the user's authentication state.

/**
 * Initializes the landing page logic.
 */
function initializeLandingPage() {
    console.log("Landing page script loaded.");

    // Use the Firebase Auth state observer to check if a user is already logged in.
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // --- USER IS ALREADY LOGGED IN ---
            // If we are on the landing page (index.html), we should not stay here.
            // Redirect the user straight to their dashboard.
            console.log("User is already signed in. Redirecting to dashboard...");
            window.location.href = 'dashboard.html';

        } else {
            // --- USER IS NOT LOGGED IN ---
            // This is the expected state for a new visitor on the landing page.
            // We do nothing and let them see the page so they can sign up or log in.
            console.log("No user is signed in. Displaying landing page.");
        }
    });

    // You can add any other landing-page-specific logic here,
    // for example, for the "Get Started" button.
    const getStartedBtn = document.querySelector('.hero .btn-primary');
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            // When "Get Started" is clicked, take the user to the signup page.
            window.location.href = 'signup.html';
        });
    }
}

// Initialize the logic when the page content has loaded.
document.addEventListener('DOMContentLoaded', initializeLandingPage);