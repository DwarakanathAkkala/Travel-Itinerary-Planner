// js/auth.js

// This event listener is the new, crucial part for handling the redirect from Google.
// It checks if the user has just returned from the Google Sign-In page.
document.addEventListener('DOMContentLoaded', () => {
    firebase.auth().getRedirectResult()
        .then((result) => {
            if (result.user) {
                // User has successfully signed in via redirect.
                // We can also check if this is the first time they are logging in.
                const isNewUser = result.additionalUserInfo.isNewUser;
                if (isNewUser) {
                    console.log("New user signed up via Google redirect.");
                } else {
                    console.log("Existing user signed in via Google redirect.");
                }

                // Regardless, redirect them to the dashboard.
                console.log("Redirecting to dashboard...");
                window.location.href = 'dashboard.html';
            }
            // If result.user is null, it means the user was not returning from a redirect.
            // In this case, we do nothing and let the rest of the page load normally.
        }).catch((error) => {
            // Handle Errors here.
            console.error("Error during Google sign-in redirect:", error);
            // Display a user-friendly error message.
            const errorMessage = `Error signing in: ${error.message} (Code: ${error.code})`;
            alert(errorMessage);
        });
});


// --- Get Form Elements ---
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const googleLoginBtn = document.getElementById('google-login');
const googleSignupBtn = document.getElementById('google-signup');


// --- Email & Password Login ---
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginForm.email.value;
        const password = loginForm.password.value;

        firebase.auth().signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in
                console.log('User logged in:', userCredential.user);
                window.location.href = 'dashboard.html';
            })
            .catch((error) => {
                alert(`Login Failed: ${error.message}`);
            });
    });
}

// --- Email & Password Signup ---
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Note: Make sure your signup form inputs have `name` attributes for this to work.
        // Or get them by ID. Let's use IDs for clarity.
        const name = signupForm.querySelector('input[type="text"]').value; // Assuming first input is name
        const email = signupForm.querySelector('input[type="email"]').value;
        const password = signupForm.querySelector('input[type="password"]').value;

        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                console.log('User signed up:', userCredential.user);
                // You can also update the user's profile with their name here
                return userCredential.user.updateProfile({
                    displayName: name
                });
            })
            .then(() => {
                window.location.href = 'dashboard.html';
            })
            .catch((error) => {
                alert(`Signup Failed: ${error.message}`);
            });
    });
}


// --- Google Sign-In (using Redirect Method) ---
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    // This will navigate the user away from your site to Google to sign in.
    firebase.auth().signInWithRedirect(provider);
}

if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', signInWithGoogle);
}
if (googleSignupBtn) {
    googleSignupBtn.addEventListener('click', signInWithGoogle);
}


// --- Auth State Observer ---
// This listener runs when the page loads and whenever the user's sign-in state changes.
// It's useful for redirecting users who are already logged in.
firebase.auth().onAuthStateChanged((user) => {
    // If a user is logged in AND they are on the login or signup page,
    // redirect them to the dashboard.
    if (user) {
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'login.html' || currentPage === 'signup.html' || currentPage === 'index.html' || currentPage === '') {
            console.log("User is already logged in, redirecting to dashboard.");
            window.location.href = 'dashboard.html';
        }
    }
});