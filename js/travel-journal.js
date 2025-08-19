// js/travel-journal.js (FINAL, CLEAN, & FORMATTED VERSION)

// --- GLOBAL VARIABLES ---
let currentTripId = null;
let filesToUpload = []; // Holds the selected files for upload in the modal

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', initializeJournalPage);

/**
 * Main function to set up the journal page.
 */
function initializeJournalPage() {
    const params = new URLSearchParams(window.location.search);
    currentTripId = params.get('id');

    if (!currentTripId) {
        displayError('<h2>Error: Trip Not Found</h2><p>Could not find a valid trip ID.</p>');
        return;
    }

    // Set up static elements and listeners
    document.getElementById('back-to-trip-btn').href = `trip.html?id=${currentTripId}`;
    setupModalListeners();

    const journalList = document.getElementById('journal-entry-list');
    journalList.addEventListener('click', handleJournalListClick); // For opening the modal
    journalList.addEventListener('click', handlePhotoGalleryClick); // For deleting photos

    // Fetch all trip data to start the rendering process
    fetchTripData(currentTripId);
}

// --- DATA FETCHING & RENDERING ---

/**
 * Fetches the entire trip object from Firebase and listens for real-time updates.
 * @param {string} tripId The ID of the current trip.
 */
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

/**
 * Renders the main header banner for the trip.
 * @param {object} tripData The data for the current trip.
 */
function renderTripHeader(tripData) {
    const tripDetailsContent = document.getElementById('trip-details-content');
    document.title = `${tripData.name || 'Travel Journal'} | Wanderlust`;
    tripDetailsContent.innerHTML = `<div class="trip-image-banner" style="background-image: url('https://source.unsplash.com/random/1200x400/?${encodeURIComponent(tripData.destination || 'travel')},travel')"><h1>${tripData.name || 'Unnamed Trip'}</h1></div>`;
}

/**
 * Renders the list of all itinerary items as journal cards.
 * @param {object} itineraryData The itinerary object from Firebase.
 */
function renderJournalEntries(itineraryData) {
    const listElement = document.getElementById('journal-entry-list');
    listElement.innerHTML = ''; // Clear old content

    if (!itineraryData) {
        listElement.innerHTML = `<p style="text-align: center; color: #777;">This trip has no itinerary items to add journal entries to.</p>`;
        return;
    }

    const items = Object.keys(itineraryData).map(key => ({ id: key, ...itineraryData[key] }));
    items.sort((a, b) => new Date(a.date) - new Date(b.date) || (a.time || "").localeCompare(b.time || ""));
    items.forEach(item => listElement.appendChild(createJournalEntryCard(item)));
}

/**
 * Creates the HTML for a single, complete journal entry card.
 * @param {object} itemData The data for one itinerary item.
 * @returns {HTMLElement} The created card element.
 */
function createJournalEntryCard(itemData) {
    const card = document.createElement('div');
    card.className = 'journal-entry-card';
    card.dataset.itemId = itemData.id;
    card.dataset.itemTitle = itemData.title;
    card.dataset.category = itemData.category || 'other';

    const formattedDate = new Date(itemData.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    const icons = { flight: 'fas fa-plane-departure', lodging: 'fas fa-hotel', transport: 'fas fa-car', dining: 'fas fa-utensils', activity: 'fas fa-ticket-alt', other: 'fas fa-map-pin' };
    const experience = itemData.experience;
    const hasExperience = experience && (experience.rating > 0 || (experience.journal && experience.journal.trim() !== '') || experience.photos);

    let ratingHtml = '';
    let photosHtml = '';
    let journalTextHtml = '';

    if (hasExperience) {
        if (experience.rating > 0) {
            ratingHtml = `<div class="entry-rating">${Array(5).fill(0).map((_, i) => `<i class="${i < experience.rating ? 'fas' : 'far'} fa-star"></i>`).join('')}</div>`;
        }
        if (experience.journal && experience.journal.trim() !== '') {
            journalTextHtml = `<p class="entry-journal-text">${experience.journal}</p>`;
        }
        if (experience.photos) {
            photosHtml = `<div class="entry-photo-gallery">`;
            for (const key in experience.photos) {
                const photo = experience.photos[key];
                photosHtml += `
                    <div class="gallery-thumbnail-wrapper">
                        <a href="${photo.url}" target="_blank" title="View full image"><img src="${photo.url}" class="gallery-thumbnail"></a>
                        <button class="btn-delete-photo" data-photo-key="${key}" data-public-id="${photo.public_id}" title="Delete Photo">&times;</button>
                    </div>`;
            }
            photosHtml += `</div>`;
        }
    }

    const contentHtml = hasExperience
        ? `${ratingHtml}${journalTextHtml}${photosHtml}`
        : `<p class="entry-empty-state">No experience logged yet.</p>`;

    const headerHtml = `
        <div class="entry-header">
            <div class="entry-icon"><i class="${icons[itemData.category] || icons.other}"></i></div>
            <div class="entry-details">
                <h5>${itemData.title}</h5>
                <p><i class="fas fa-calendar-day"></i> ${formattedDate}</p>
            </div>
            <button class="btn-edit-experience" title="Add/Edit Experience">
                <i class="fas fa-pencil-alt"></i>
            </button>
        </div>`;

    card.innerHTML = headerHtml + `<div class="entry-content">${contentHtml}</div>`;
    return card;
}


// --- MODAL & FORM LOGIC ---

/**
 * Sets up the event listeners for the modal container (for closing it).
 */
function setupModalListeners() {
    const modal = document.getElementById('experience-modal-container');
    modal.querySelector('.close-modal').addEventListener('click', () => modal.classList.remove('show'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
    });
}

/**
 * Handles clicks on the main journal list to open the edit modal.
 */
function handleJournalListClick(e) {
    const button = e.target.closest('.btn-edit-experience');
    if (button) {
        const card = button.closest('.journal-entry-card');
        openExperienceModal(card.dataset.itemId, card.dataset.itemTitle);
    }
}

/**
 * Opens the experience modal, loading the form HTML if necessary.
 * @param {string} itemId The ID of the itinerary item being edited.
 * @param {string} itemTitle The title of the itinerary item.
 */
function openExperienceModal(itemId, itemTitle) {
    const modal = document.getElementById('experience-modal-container');
    const formContent = document.getElementById('modal-experience-form-content');

    const loadAndSetup = () => {
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

/**
 * Sets up the form inside the modal, pre-filling it with existing data if available.
 * @param {string} itemId The ID of the itinerary item.
 */
function setupForm(itemId) {
    const form = document.getElementById('experience-form');
    const deleteBtn = document.getElementById('delete-experience-btn');
    const photoInput = document.getElementById('photo-upload');

    // Reset form state for a clean slate
    form.dataset.itemId = itemId;
    form.reset();
    filesToUpload = [];
    document.getElementById('photo-previews').innerHTML = '';
    document.getElementById('rating-value').value = '0';
    updateStars(0);

    if (deleteBtn) {
        deleteBtn.style.display = 'none';
        deleteBtn.onclick = () => handleDeleteExperience(itemId);
    }

    // Fetch and pre-fill existing data
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

    // Attach event listeners
    photoInput.onchange = handlePhotoSelection;
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

/**
 * Handles the user selecting photos, creating previews, and adding them to the upload queue.
 * @param {Event} event The file input change event.
 */
function handlePhotoSelection(event) {
    const previewsContainer = document.getElementById('photo-previews');
    const selectedFiles = Array.from(event.target.files);

    selectedFiles.forEach(file => {
        if (filesToUpload.some(existingFile => existingFile.name === file.name)) return;
        filesToUpload.push(file);
        const reader = new FileReader();
        reader.onload = (e) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'preview-image-wrapper';
            wrapper.innerHTML = `
                <img src="${e.target.result}" class="preview-image">
                <button type="button" class="remove-preview-btn" title="Remove this image">&times;</button>
            `;
            wrapper.querySelector('.remove-preview-btn').onclick = () => {
                wrapper.remove();
                const fileIndex = filesToUpload.indexOf(file);
                if (fileIndex > -1) filesToUpload.splice(fileIndex, 1);
            };
            previewsContainer.appendChild(wrapper);
        };
        reader.readAsDataURL(file);
    });
    event.target.value = ''; // Clear input to allow re-selecting the same file
}

/**
 * Updates the star rating UI based on the selected value.
 * @param {number} rating The selected rating (1-5).
 */
function updateStars(rating) {
    const stars = document.querySelectorAll('.star-rating-container i');
    stars.forEach(star => {
        star.className = star.dataset.value <= rating ? 'fas fa-star' : 'far fa-star';
    });
}


// --- DATA MANIPULATION FUNCTIONS ---

/**
 * Handles the main form submission for saving an experience.
 * @param {Event} e The form submit event.
 * @param {string} itemId The ID of the itinerary item.
 */
async function handleExperienceFormSubmit(e, itemId) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    setButtonLoadingState(submitButton, true);

    try {
        const uploadPromises = filesToUpload.map(async file => {
            const base64Image = await fileToBase64(file);
            const response = await fetch(`/.netlify/functions/uploadImage`, {
                method: 'POST',
                body: JSON.stringify({ image: base64Image, tripId: currentTripId, itemId: itemId })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Upload failed');
            return result;
        });
        const uploadedImages = await Promise.all(uploadPromises);

        const expRef = firebase.database().ref(`trips/${currentTripId}/itinerary/${itemId}/experience`);
        const snapshot = await expRef.once('value');
        const existingData = snapshot.val() || {};
        const existingPhotos = existingData.photos || {};

        uploadedImages.forEach(img => {
            const key = firebase.database().ref().push().key;
            existingPhotos[key] = { url: img.url, public_id: img.public_id };
        });

        const rating = parseInt(form.querySelector('#rating-value').value) || 0;
        const journal = form.querySelector('#journal-entry').value.trim();
        const experienceData = { ...existingData, rating, journal, photos: existingPhotos };

        await expRef.set(experienceData);
        document.getElementById('experience-modal-container').classList.remove('show');
    } catch (error) {
        alert("Could not save experience. Error: " + error.message);
    } finally {
        setButtonLoadingState(submitButton, false);
    }
}

/**
 * Handles a click on a photo's delete button.
 * @param {Event} e The click event.
 */
async function handlePhotoGalleryClick(e) {
    const deleteBtn = e.target.closest('.btn-delete-photo');
    if (!deleteBtn) return;
    if (!confirm("Are you sure you want to permanently delete this photo?")) return;

    const itemId = deleteBtn.closest('.journal-entry-card').dataset.itemId;
    const photoKey = deleteBtn.dataset.photoKey;
    const publicId = deleteBtn.dataset.publicId;

    try {
        await fetch(`/.netlify/functions/deleteImage`, {
            method: 'POST',
            body: JSON.stringify({ public_id: publicId })
        });
        const firebaseRef = firebase.database().ref(`trips/${currentTripId}/itinerary/${itemId}/experience/photos/${photoKey}`);
        await firebaseRef.remove();
    } catch (error) {
        alert("Could not delete the photo. Please try again.");
    }
}

/**
 * Deletes an entire experience object from Firebase.
 * @param {string} itemId The ID of the itinerary item.
 */
async function handleDeleteExperience(itemId) {
    const expRef = firebase.database().ref(`trips/${currentTripId}/itinerary/${itemId}/experience`);
    try {
        await expRef.remove();
        document.getElementById('experience-modal-container').classList.remove('show');
    } catch (err) {
        alert("Could not delete the experience.");
    }
}


// --- UTILITY FUNCTIONS ---

/**
 * Displays an error message on the page.
 * @param {string} html The HTML string to display.
 */
function displayError(html) {
    const contentContainer = document.getElementById('trip-details-content');
    contentContainer.innerHTML = `<div style="text-align:center; padding: 4rem;">${html}</div>`;
    document.getElementById('journal-entry-list').innerHTML = '';
}

/**
 * Toggles the loading state of a button.
 * @param {HTMLElement} button The button element.
 * @param {boolean} isLoading True to show loading, false to hide.
 */
function setButtonLoadingState(button, isLoading) {
    if (!button) return;
    const btnText = button.querySelector('.btn-text');
    const spinner = button.querySelector('.spinner');
    if (isLoading) {
        button.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (spinner) spinner.style.display = 'inline-block';
    } else {
        button.disabled = false;
        if (btnText) btnText.style.display = 'inline-block';
        if (spinner) spinner.style.display = 'none';
    }
}

/**
 * Converts a file object to a base64 encoded string.
 * @param {File} file The file to convert.
 * @returns {Promise<string>} A promise that resolves with the base64 string.
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}