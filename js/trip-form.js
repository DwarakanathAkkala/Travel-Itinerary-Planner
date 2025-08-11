// Initialize Trip Form
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('trip-modal');
    const form = document.getElementById('trip-form');

    // Open modal
    document.getElementById('add-trip-btn').addEventListener('click', () => {
        modal.style.display = 'flex';
        document.getElementById('start-date').valueAsDate = new Date();
    });

    // Close modal
    document.querySelector('.close-modal').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = firebase.auth().currentUser;
        if (!user) return;

        const submitBtn = form.querySelector('button[type="submit"]');
        const btnText = submitBtn.querySelector('.btn-text');
        const spinner = submitBtn.querySelector('.spinner');

        try {
            // UI Feedback
            btnText.textContent = "Creating...";
            spinner.classList.remove('hidden');
            submitBtn.disabled = true;

            // Create trip object
            const tripData = {
                name: form['trip-name'].value,
                destination: form['trip-destination'].value,
                startDate: form['start-date'].value,
                endDate: form['end-date'].value,
                notes: form['trip-notes'].value,
                status: "Planned",
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };

            // Push to Firebase
            const newTripRef = firebase.database().ref(`users/${user.uid}/trips`).push();
            await newTripRef.set(tripData);

            // Close modal & reset
            modal.style.display = 'none';
            form.reset();

        } catch (error) {
            console.error("Trip creation failed:", error);
            alert("Failed to create trip. Please try again.");
        } finally {
            btnText.textContent = "Create Trip";
            spinner.classList.add('hidden');
            submitBtn.disabled = false;
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('trip-form');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        // ... existing form handling logic ...
    });

    // Close button
    document.querySelector('.close-modal').addEventListener('click', closeModal);
});

// Make these available to parent
function closeModal() {
    document.getElementById('trip-modal').style.display = 'none';
}

function showModal() {
    document.getElementById('trip-modal').style.display = 'flex';
}