// auth.js - Complete Authentication Handler

// ======================
// 1. Firebase Initialization
// ======================
try {
    if (typeof firebase === 'undefined') throw new Error('Firebase SDK not loaded!');
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .catch(error => console.error("Persistence error:", error));
} catch (error) {
    console.error("Auth initialization failed:", error);
    alert("Authentication service unavailable. Please refresh the page.");
}

// ======================
// 2. Authentication State Listener
// ======================
firebase.auth().onAuthStateChanged((user) => {
    const currentPage = window.location.pathname.split('/').pop();

    if (user) {
        // User is logged in
        console.log("User authenticated:", user.email);
        if (currentPage === 'login.html' || currentPage === 'signup.html') {
            console.log("Redirecting to dashboard");
            window.location.href = "dashboard.html";
        }
    } else {
        // User is logged out
        console.log("No authenticated user");
        if (currentPage === 'dashboard.html' || currentPage === 'trip.html') {
            window.location.href = "login.html";
        }
    }
});

// ======================
// 3. Email/Password Login
// ======================
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner"></div>';
        await firebase.auth().signInWithEmailAndPassword(email, password);
        // onAuthStateChanged will handle the redirect
    } catch (error) {
        console.error("Login error:", error.code, error.message);
        let message = "Login failed. Please try again.";
        switch (error.code) { /* ... your error handling ... */ }
        alert(message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Login";
        }
    }
});

// ======================
// 4. Email/Password Signup
// ======================
document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = e.target.querySelector('input[type="text"]')?.value;
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner"></div>';
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        if (name) {
            await userCredential.user.updateProfile({ displayName: name });
        }
        // onAuthStateChanged will handle the redirect
    } catch (error) {
        console.error("Signup error:", error.code, error.message);
        let message = "Signup failed. Please try again.";
        switch (error.code) { /* ... your error handling ... */ }
        alert(message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Sign Up";
        }
    }
});

// ======================
// 5. Google Authentication
// ======================
function handleGoogleAuth(event) {
    if (!firebase.auth) {
        alert("Authentication service not ready. Please refresh.");
        return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    const button = event.currentTarget;
    const originalText = button.innerHTML;
    button.innerHTML = '<div class="spinner"></div>';
    button.disabled = true;

    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            console.log("Google auth success:", result.user);
            window.location.href = "dashboard.html";
        })
        .catch((error) => {
            console.error("Google auth error:", error);
            if (error.code !== 'auth/popup-closed-by-user') {
                alert(`Google Sign-In failed: ${error.message}`);
            }
        })
        .finally(() => {
            if (button) {
                button.innerHTML = originalText;
                button.disabled = false;
            }
        });
}

// Attach Google Auth handlers
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('google-login')?.addEventListener('click', handleGoogleAuth);
    document.getElementById('google-signup')?.addEventListener('click', handleGoogleAuth);
});

// ======================
// 6. Logout Functionality
// ======================
// Note: This needs to be moved to a script that loads on pages with a #logout-btn, like dashboard.js
document.getElementById('logout-btn')?.addEventListener('click', () => {
    firebase.auth().signOut()
        .then(() => {
            console.log("User signed out");
            window.location.href = "login.html";
        })
        .catch((error) => {
            console.error("Logout error:", error);
        });
});