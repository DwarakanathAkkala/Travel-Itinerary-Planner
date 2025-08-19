// js/travel-journal.js (DEFINITIVE, COMPLETE & CORRECTED VERSION)

let currentTripId = null;
let filesToUpload = []; // Holds the selected files for upload

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
    }, (error) => console.error("Error fetching trip data:", error));
}

function renderTripHeader(tripData) {
    // This function is correct
    const tripDetailsContent = document.getElementById('trip-details-content');
    document.title = `${tripData.name || 'Travel Journal'} | Wanderlust`;
    tripDetailsContent.innerHTML = `<div class="trip-image-banner" style="background-image: url('https://source.unsplash.com/random/1200x400/?${encodeURIComponent(tripData.destination || 'travel')},travel')"><h1>${tripData.name || 'Unnamed Trip'}</h1></div>`;
}

function renderJournalEntries(itineraryData) {
    // This function is correct
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
    // This function is correct
    const card = document.createElement('div');
    card.className = 'journal-entry-card';
    card.dataset.itemId = itemData.id;
    card.dataset.itemTitle = itemData.title;
    card.dataset.category = itemData.category || 'other';
    const hasExperience = itemData.experience && (itemData.experience.rating > 0 || (itemData.experience.journal && itemData.experience.journal.trim() !== ''));
    const formattedDate = new Date(itemData.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    const icons = { flight: 'fas fa-plane-departure', lodging: 'fas fa-hotel', transport: 'fas fa-car', dining: 'fas fa-utensils', activity: 'fas fa-ticket-alt', other: 'fas fa-map-pin' };
    let ratingHtml = '';
    if (hasExperience && itemData.experience.rating > 0) {
        ratingHtml = `<div class="entry-rating">`;
        for (let i = 1; i <= 5; i++) {
            ratingHtml += `<i class="${i <= itemData.experience.rating ? 'fas' : 'far'} fa-star"></i>`;
        }
        ratingHtml += `</div>`;
    }
    card.innerHTML = `
        <div class="entry-header">
            <div class="entry-icon"><i class="${icons[itemData.category] || icons.other}"></i></div>
            <div class="entry-details">
                <h5>${itemData.title}</h5>
                <p><i class="fas fa-calendar-day"></i> ${formattedDate}</p>
            </div>
            <button class="btn-edit-experience" title="Add/Edit Experience"><i class="fas fa-pencil-alt"></i></button>
        </div>
        <div class="entry-content">${ratingHtml}<p class="entry-journal-text">${(hasExperience && itemData.experience.journal) ? itemData.experience.journal : ''}</p>${!hasExperience ? '<p class="entry-empty-state">No experience logged yet.</p>' : ''}</div>`;
    return card;
}


function setupModalListeners() {
    // This function is correct
    const modal = document.getElementById('experience-modal-container');
    modal.querySelector('.close-modal').addEventListener('click', () => modal.classList.remove('show'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
    });
}

function handleJournalListClick(e) {
    // This function is correct
    const button = e.target.closest('.btn-edit-experience');
    if (button) {
        const card = button.closest('.journal-entry-card');
        openExperienceModal(card.dataset.itemId, card.dataset.itemTitle);
    }
}

function openExperienceModal(itemId, itemTitle) {
    // This function is correct
    const modal = document.getElementById('experience-modal-container');
    const formContent = document.getElementById('modal-experience-form-content');
    document.getElementById('modal-item-title').textContent = itemTitle;
    const loadAndSetup = () => setupForm(itemId);
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
    const photoInput = document.getElementById('photo-upload'); // Get the photo input
    form.dataset.itemId = itemId;
    form.reset();
    filesToUpload = []; // Clear file list
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

    // Add the event listener for the photo input
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

// Helper function to convert a file to a base64 string
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]); // Remove the data URI prefix
        reader.onerror = error => reject(error);
    });
}

function handlePhotoSelection(event) {
    const previewsContainer = document.getElementById('photo-previews');
    const selectedFiles = Array.from(event.target.files);

    selectedFiles.forEach(file => {
        if (filesToUpload.some(existingFile => existingFile.name === file.name)) {
            return;
        }
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
    event.target.value = '';
}

function updateStars(rating) {
    // This function is correct
    const stars = document.querySelectorAll('.star-rating-container i');
    stars.forEach(star => {
        star.className = star.dataset.value <= rating ? 'fas fa-star' : 'far fa-star';
    });
}

async function handleExperienceFormSubmit(e, itemId) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const rating = parseInt(form.querySelector('#rating-value').value) || 0;
    const journal = form.querySelector('#journal-entry').value.trim();

    if (rating === 0 && journal === '' && filesToUpload.length === 0) {
        // If there are existing photos, this should just update text/rating
        const expRefCheck = firebase.database().ref(`trips/${currentTripId}/itinerary/${itemId}/experience/photos`);
        const snapshot = await expRefCheck.once('value');
        if (!snapshot.exists()) {
            handleDeleteExperience(itemId);
            return;
        }
    }

    setButtonLoadingState(submitButton, true);

    try {
        const uploadPromises = filesToUpload.map(async file => {
            const base64Image = await fileToBase64(file);
            const response = await fetch(`/.netlify/functions/uploadImage`, {
                method: 'POST',
                body: JSON.stringify({
                    image: base64Image,
                    name: file.name
                })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Upload failed');
            }
            return result.url;
        });

        const downloadURLs = await Promise.all(uploadPromises);

        const expRef = firebase.database().ref(`trips/${currentTripId}/itinerary/${itemId}/experience`);
        const snapshot = await expRef.once('value');
        const existingData = snapshot.val() || {};
        const existingPhotos = existingData.photos || {};

        downloadURLs.forEach(url => {
            const key = firebase.database().ref().push().key;
            existingPhotos[key] = url;
        });

        const experienceData = {
            rating: rating,
            journal: journal,
            photos: existingPhotos
        };

        await expRef.set(experienceData);
        document.getElementById('experience-modal-container').classList.remove('show');

    } catch (error) {
        console.error("Failed to save experience:", error);
        alert("Could not save your experience. Please try again. Error: " + error.message);
    } finally {
        setButtonLoadingState(submitButton, false);
    }
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