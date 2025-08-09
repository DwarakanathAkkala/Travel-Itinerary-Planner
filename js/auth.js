// auth.js - Complete Authentication Logic

// ======================
// 1. Firebase Auth State Listener
// ======================
firebase.auth().onAuthStateChanged((user) => {
    const currentPage = window.location.pathname.split('/').pop();

    // Redirect logged-in users away from auth pages
    if (user && (currentPage === 'login.html' || currentPage === 'signup.html')) {
        window.location.href = 'dashboard.html';
    }

    // Redirect non-logged-in users from protected pages
    if (!user && currentPage === 'dashboard.html') {
        window.location.href = 'login.html';
    }
});

// ======================
// 2. Email/Password Login
// ======================
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginForm.querySelector('input[type="email"]').value;
        const password = loginForm.querySelector('input[type="password"]').value;

        showLoading(true);

        firebase.auth().signInWithEmailAndPassword(email, password)
            .then(() => {
                // Redirect handled by auth state listener
            })
            .catch((error) => {
                showError(error);
            })
            .finally(() => {
                showLoading(false);
            });
    });
}

// ======================
// 3. Email/Password Signup
// ======================
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = signupForm.querySelector('input[type="text"]').value;
        const email = signupForm.querySelector('input[type="email"]').value;
        const password = signupForm.querySelector('input[type="password"]').value;

        showLoading(true);

        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Update user profile with name
                return userCredential.user.updateProfile({
                    displayName: name
                });
            })
            .then(() => {
                // Redirect handled by auth state listener
            })
            .catch((error) => {
                showError(error);
            })
            .finally(() => {
                showLoading(false);
            });
    });
}

// ======================
// 4. Google Authentication
// ======================
function handleGoogleAuth() {
    showLoading(true);
    const provider = new firebase.auth.GoogleAuthProvider();

    firebase.auth().signInWithPopup(provider)
        .then(() => {
            // Redirect handled by auth state listener
        })
        .catch((error) => {
            showError(error);
        })
        .finally(() => {
            showLoading(false);
        });
}

// Attach Google Auth to both buttons
document.getElementById('google-login')?.addEventListener('click', handleGoogleAuth);
document.getElementById('google-signup')?.addEventListener('click', handleGoogleAuth);

// ======================
// 5. Helper Functions
// ======================
function showLoading(isLoading) {
    const buttons = document.querySelectorAll('button[type="submit"], .btn-google');
    buttons.forEach(button => {
        button.disabled = isLoading;
        button.innerHTML = isLoading
            ? '<div class="spinner"></div>'
            : button.dataset.originalText || button.textContent;
    });
}

function showError(error) {
    let message = error.message;

    // Friendly error messages
    const errorMap = {
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/popup-closed-by-user': 'Sign-in window was closed.'
    };

    alert(errorMap[error.code] || message);
}

// ======================
// 6. Logout Functionality
// ======================
document.getElementById('logout-btn')?.addEventListener('click', () => {
    firebase.auth().signOut()
        .then(() => {
            window.location.href = 'login.html';
        });
});