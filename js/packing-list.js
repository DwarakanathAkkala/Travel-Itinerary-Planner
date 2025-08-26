// js/packing-list.js (Corrected Version)

// --- GLOBAL VARIABLES ---
let currentTripId = null; // To store the ID for the whole module

/**
 * Initializes all functionality for the packing list feature.
 * @param {string} tripId The ID of the current trip.
 */
export function initializePackingList(tripId) {
    // Store the tripId for use in other functions (like saving/loading)
    currentTripId = tripId;

    const packingListSection = document.querySelector('.packing-list-section');
    if (!packingListSection) return; // Safety check

    const header = packingListSection.querySelector('.packing-list-header');

    // Add the click listener to toggle the collapsible section
    header.addEventListener('click', () => {
        packingListSection.classList.toggle('open');
    });

}