// js/trip-share.js

/**
 * Initializes all functionality for the trip sharing feature.
 * It checks for native share support and sets up the appropriate UI.
 */
export function initializeShareFeature() {
    const shareButton = document.getElementById('share-trip-btn');
    const nativeShareBtn = document.getElementById('native-share-btn');
    const copyButton = document.getElementById('copy-link-btn');
    const closeModalButton = document.getElementById('share-modal-container').querySelector('.close-modal');

    // Attach listeners
    shareButton?.addEventListener('click', openShareModal);
    closeModalButton?.addEventListener('click', closeShareModal);
    nativeShareBtn?.addEventListener('click', nativeShareTrip);
    copyButton?.addEventListener('click', copyShareLinkToClipboard);
}

/**
 * Opens the share modal and decides which UI to show (native vs. fallback).
 */
function openShareModal() {
    const nativeShareBtn = document.getElementById('native-share-btn');
    const fallbackContainer = document.getElementById('fallback-share-container');
    const shareModal = document.getElementById('share-modal-container');

    // Check if the Web Share API is supported by the browser
    if (navigator.share) {
        // If yes, show our single, beautiful share button
        nativeShareBtn.style.display = 'flex';
        fallbackContainer.style.display = 'none';
    } else {
        // If no, show the copy link input as a fallback
        nativeShareBtn.style.display = 'none';
        fallbackContainer.style.display = 'flex';
    }

    shareModal.classList.add('show');
}

/**
 * Handles the native Web Share API call.
 */
async function nativeShareTrip() {
    const params = new URLSearchParams(window.location.search);
    const tripId = params.get('id');
    const tripTitle = document.querySelector('.trip-image-banner h1')?.textContent || 'My Trip Itinerary';
    const shareUrl = `${window.location.origin}/share.html?id=${tripId}`;

    const shareData = {
        title: tripTitle,
        text: `Check out my travel plans for ${tripTitle}!`,
        url: shareUrl,
    };

    try {
        // First, ensure the trip is marked as shared in Firebase
        await firebase.database().ref(`trips/${tripId}`).update({ isShared: true });

        // NEW: Also copy the link to the clipboard as a convenience
        await navigator.clipboard.writeText(shareUrl);

        // Then, trigger the native share dialog
        await navigator.share(shareData);

        console.log('Trip shared successfully');
        closeShareModal();
    } catch (err) {
        // We don't show an error if the user closes the share sheet ("AbortError")
        if (err.name !== 'AbortError') {
            console.error('Share failed:', err.message);
            alert('Sharing failed. Please try again.');
        }
    }
}

/**
 * Handles the fallback mechanism for browsers that don't support native share.
 */
function copyShareLinkToClipboard() {
    const params = new URLSearchParams(window.location.search);
    const tripId = params.get('id');
    if (!tripId) return;

    const linkInput = document.getElementById('share-link-input');
    const copyButton = document.getElementById('copy-link-btn');
    const shareUrl = `${window.location.origin}/share.html?id=${tripId}`;
    linkInput.value = shareUrl;

    // Ensure the trip is marked as shared before copying the link
    firebase.database().ref(`trips/${tripId}`).update({ isShared: true })
        .then(() => {
            navigator.clipboard.writeText(linkInput.value).then(() => {
                copyButton.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                }, 2000);
            }).catch(err => {
                alert("Failed to copy link.");
            });
        })
        .catch(error => {
            console.error("Could not enable sharing:", error);
            alert("Error: Could not enable sharing for this trip. Please try again.");
        });
}

/**
 * Closes the share modal.
 */
function closeShareModal() {
    document.getElementById('share-modal-container').classList.remove('show');
}