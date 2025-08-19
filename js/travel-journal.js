// js/travel-journal.js (FINAL, CLEAN VERSION)

let currentTripId = null;
let filesToUpload = [];

document.addEventListener('DOMContentLoaded', initializeJournalPage);

function initializeJournalPage() {
    const params = new URLSearchParams(window.location.search);
    currentTripId = params.get('id');
    if (!currentTripId) {
        displayError('<h2>Error: Trip Not Found</h2><p>Could not find a valid trip ID.</p>');
        return;
    }
    document.getElementById('back-to-trip-btn').href = `trip.html?id=${currentTripId}`;
    setupModalListeners();
    document.getElementById('journal-entry-list').addEventListener('click', handleJournalListClick);
    fetchTripData(currentTripId);
}

function fetchTripData(tripId) {
    const tripRef = firebase.database().ref(`trips/${tripId}`);
    tripRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const tripData = snapshot.val();
            renderTripHeader(tripData);
            renderJournalEntries(tripData.itinerary);
        } else {
            displayError('<h2>Trip Not Found</h2><p>The requested trip does not exist.</p>');
        }
    }, (error) => {
        console.error("Error fetching trip data:", error);
        displayError('<h2>Error</h2><p>There was an error retrieving trip details.</p>');
    });
}

function renderTripHeader(tripData) {
    const tripDetailsContent = document.getElementById('trip-details-content');
    document.title = `${tripData.name || 'Travel Journal'} | Wanderlust`;
    tripDetailsContent.innerHTML = `<div class="trip-image-banner" style="background-image: url('https://source.unsplash.com/random/1200x400/?${encodeURIComponent(tripData.destination || 'travel')},travel')"><h1>${tripData.name || 'Unnamed Trip'}</h1></div>`;
}

function renderJournalEntries(itineraryData) {
    const listElement = document.getElementById('journal-entry-list');
    listElement.innerHTML = '';
    if (!itineraryData) {
        listElement.innerHTML = `<p style="text-align: center; color: #777;">This trip has no itinerary items to add journal entries to.</p>`;
        return;
    }
    const items = Object.keys(itineraryData).map(key => ({ id: key, ...itineraryData[key] }));
    items.sort((a, b) => new Date(a.date) - new Date(b.date) || (a.time || "").localeCompare(b.time || ""));
    items.forEach(item => listElement.appendChild(createJournalEntryCard(item)));
}

function createJournalEntryCard(itemData) {
    const card = document.createElement('div');
    card.className = 'journal-entry-card';
    card.dataset.itemId = itemData.id;
    card.dataset.itemTitle = itemData.title;
    card.dataset.category = itemData.category || 'other';

    const formattedDate = new Date(itemData.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    const icons = { flight: 'fas fa-plane-departure', lodging: 'fas fa-hotel', transport: 'fas fa-car', dining: 'fas fa-utensils', activity: 'fas fa-ticket-alt', other: 'fas fa-map-pin' };
    const iconClass = icons[itemData.category] || icons.other;

    let contentHtml = '';
    const experience = itemData.experience;
    if (experience && (experience.rating > 0 || (experience.journal && experience.journal.trim() !== ''))) {
        let ratingHtml = '';
        if (experience.rating > 0) {
            ratingHtml = `<div class="entry-rating">`;
            for (let i = 1; i <= 5; i++) {
                ratingHtml += `<i class="${i <= experience.rating ? 'fas' : 'far'} fa-star"></i>`;
            }
            ratingHtml += `</div>`;
        }
        contentHtml = `${ratingHtml}<p class="entry-journal-text">${experience.journal || ''}</p>`;
    } else {
        contentHtml = `<p class="entry-empty-state">No experience logged for this event yet.</p>`;
    }

    // THE HTML STRUCTURE IS REFACTORED HERE: The button is now INSIDE the header
    card.innerHTML = `
        <div class="entry-header">
            <div class="entry-icon"><i class="${iconClass}"></i></div>
            <div class="entry-details">
                <h5>${itemData.title}</h5>
                <p><i class="fas fa-calendar-day"></i> ${formattedDate}</p>
            </div>
            <button class="btn-edit-experience" title="Add/Edit Experience">
                <i class="fas fa-pencil-alt"></i>
            </button>
        </div>
        <div class="entry-content">
            ${contentHtml}
        </div>
    `;
    return card;
}

function setupModalListeners() {
    const modal = document.getElementById('experience-modal-container');
    modal.querySelector('.close-modal').addEventListener('click', () => modal.classList.remove('show'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
    });
}

function handleJournalListClick(e) {
    const button = e.target.closest('.btn-edit-experience'); // Changed class name here
    if (button) {
        const card = button.closest('.journal-entry-card');
        openExperienceModal(card.dataset.itemId, card.dataset.itemTitle);
    }
}

function openExperienceModal(itemId, itemTitle) {
    const modal = document.getElementById('experience-modal-container');
    const formContent = document.getElementById('modal-experience-form-content');

    const loadAndSetup = () => {
        // TITLE FIX: Set the title *after* the form is guaranteed to be in the DOM.
        document.getElementById('modal-item-title').textContent = itemTitle;
        setupForm(itemId);
    };

    if (formContent.getAttribute('data-loaded') !== 'true') {
        fetch('experience-form.html')
            .then(response => response.text())
            .then(html => {
                formContent.innerHTML = html;
                formContent.setAttribute('data-loaded', 'true');
                loadAndSetup();
            });
    } else {
        loadAndSetup();
    }
    modal.classList.add('show');
}

function setupForm(itemId) {
    const form = document.getElementById('experience-form');
    const deleteBtn = document.getElementById('delete-experience-btn');
    form.dataset.itemId = itemId;
    form.reset();
    filesToUpload = []; // Clear the file list for each new opening
    document.getElementById('photo-previews').innerHTML = ''; // Clear previews
    document.getElementById('rating-value').value = '0';
    updateStars(0);
    if (deleteBtn) {
        deleteBtn.style.display = 'none';
        deleteBtn.onclick = () => handleDeleteExperience(itemId);
    }

    const expRef = firebase.database().ref(`trips/${currentTripId}/itinerary/${itemId}/experience`);
    expRef.once('value', snapshot => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            form.querySelector('#journal-entry').value = data.journal || '';
            const rating = data.rating || 0;
            form.querySelector('#rating-value').value = rating;
            updateStars(rating);
            if (deleteBtn && (rating > 0 || (data.journal && data.journal.trim() !== ''))) {
                deleteBtn.style.display = 'block';
            }
        }
    });

    // --- PHOTO PREVIEW LOGIC ---
    const photoInput = document.getElementById('photo-upload');
    photoInput.addEventListener('change', handlePhotoSelection);

    const stars = form.querySelectorAll('.star-rating-container i');
    stars.forEach(star => {
        star.onclick = () => {
            const currentRating = document.getElementById('rating-value').value;
            const newRating = star.dataset.value;
            const finalRating = currentRating === newRating ? 0 : newRating;
            document.getElementById('rating-value').value = finalRating;
            updateStars(finalRating);
        };
    });
    form.onsubmit = (e) => handleExperienceFormSubmit(e, itemId);
}

function updateStars(rating) {
    const stars = document.querySelectorAll('.star-rating-container i');
    stars.forEach(star => {
        star.className = star.dataset.value <= rating ? 'fas fa-star' : 'far fa-star';
    });
}

function handleExperienceFormSubmit(e, itemId) {
    e.preventDefault();
    const form = e.target;
    const rating = parseInt(form.querySelector('#rating-value').value) || 0;
    const journal = form.querySelector('#journal-entry').value.trim();
    if (rating === 0 && journal === '') {
        handleDeleteExperience(itemId);
        return;
    }
    const expRef = firebase.database().ref(`trips/${currentTripId}/itinerary/${itemId}/experience`);
    expRef.set({ rating, journal }).then(() => {
        document.getElementById('experience-modal-container').classList.remove('show');
    }).catch(err => {
        console.error("Save Error:", err);
        alert("Could not save your experience. Please check your connection and try again.");
    });
}

function handleDeleteExperience(itemId) {
    const expRef = firebase.database().ref(`trips/${currentTripId}/itinerary/${itemId}/experience`);
    expRef.remove().then(() => {
        document.getElementById('experience-modal-container').classList.remove('show');
    }).catch(err => {
        console.error("Delete Error:", err);
        alert("Could not delete the experience.");
    });
}

function displayError(html) {
    const contentContainer = document.getElementById('trip-details-content');
    contentContainer.innerHTML = `<div style="text-align:center; padding: 4rem;">${html}</div>`;
    document.getElementById('journal-entry-list').innerHTML = '';
}

function handlePhotoSelection(event) {
    const previewsContainer = document.getElementById('photo-previews');
    const selectedFiles = Array.from(event.target.files);

    selectedFiles.forEach(file => {
        // Prevent adding the same file twice
        if (filesToUpload.some(existingFile => existingFile.name === file.name)) {
            return; // Skip this file if it's already in the list
        }

        // Add the new file to our array for later upload
        filesToUpload.push(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'preview-image-wrapper';

            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'preview-image';

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-preview-btn';
            removeBtn.innerHTML = '&times;';
            removeBtn.title = 'Remove this image';

            removeBtn.onclick = () => {
                wrapper.remove();
                // Remove the file from our upload array by finding its unique instance
                const fileIndex = filesToUpload.indexOf(file);
                if (fileIndex > -1) {
                    filesToUpload.splice(fileIndex, 1);
                }
            };

            wrapper.appendChild(img);
            wrapper.appendChild(removeBtn);
            previewsContainer.appendChild(wrapper);
        };
        reader.readAsDataURL(file);
    });

    // Clear the input value to allow selecting the same file again if it was removed
    event.target.value = '';
}