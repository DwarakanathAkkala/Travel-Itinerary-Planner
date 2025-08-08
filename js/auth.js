function handleGoogleAuth() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');

    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            console.log("Google Auth Success:", result.user); // Debug log
            window.location.href = "dashboard.html";
        })
        .catch((error) => {
            console.error("Google Auth Error:", error); // Detailed error
            alert(`Google Auth Failed: ${error.message}\nCode: ${error.code}`);
        });
}

// Attach to both buttons
document.getElementById('google-login')?.addEventListener('click', handleGoogleAuth);
document.getElementById('google-signup')?.addEventListener('click', handleGoogleAuth);