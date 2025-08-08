// Google Sign-In
document.getElementById('google-login').addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then(() => {
            window.location.href = "dashboard.html"; // Redirect on success
        })
        .catch((error) => {
            alert(error.message); // Handle errors (e.g., popup closed)
        });
});