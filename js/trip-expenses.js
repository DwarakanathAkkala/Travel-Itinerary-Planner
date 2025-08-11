// js/trip-expenses.js

import { setButtonLoadingState } from './trip.js'; // Import the helper

const expenseModalContainer = document.getElementById('expense-modal-container');
const modalExpenseFormContent = document.getElementById('modal-expense-form-content');
let currentTripId = null; // Variable to hold the Trip ID

/**
 * Initializes all event listeners for the expense tracker feature.
 * @param {string} tripId The ID of the current trip, passed from trip.js
 */
export function initializeExpenseListeners(tripId) {
    currentTripId = tripId; // Store the tripId when the page loads
    document.getElementById('add-expense-btn').addEventListener('click', openExpenseModal);

    setupModalCloseListeners();
}

/**
 * Attaches the close listeners for the modal.
 * Done once to prevent duplicates.
 */
function setupModalCloseListeners() {
    if (expenseModalContainer.dataset.listenersAttached === 'true') return;

    expenseModalContainer.querySelector('.close-modal').addEventListener('click', closeExpenseModal);
    expenseModalContainer.addEventListener('click', (e) => {
        if (e.target === expenseModalContainer) closeExpenseModal();
    });

    expenseModalContainer.dataset.listenersAttached = 'true';
}


/**
 * Opens the expense modal and loads the form if needed.
 */
function openExpenseModal() {
    if (modalExpenseFormContent.getAttribute('data-loaded') !== 'true') {
        fetch('expense-form.html')
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.text();
            })
            .then(html => {
                modalExpenseFormContent.innerHTML = html;
                modalExpenseFormContent.setAttribute('data-loaded', 'true');
                // Attach the submit listener to the newly loaded form
                modalExpenseFormContent.querySelector('#expense-form').addEventListener('submit', handleExpenseFormSubmit);
            })
            .catch(error => {
                console.error('Error loading expense form:', error);
                modalExpenseFormContent.innerHTML = '<p>Sorry, the form could not be loaded.</p>';
            });
    }
    expenseModalContainer.classList.add('show');
}

function closeExpenseModal() {
    expenseModalContainer.classList.remove('show');
}

/**
 * Handles the form submission for creating a new expense.
 * @param {Event} e The form submission event.
 */
function handleExpenseFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');

    // THIS IS THE FIX: Use the 'currentTripId' variable we stored earlier.
    if (!currentTripId) {
        alert("Error: Trip ID is missing. Cannot save expense.");
        return;
    }

    setButtonLoadingState(submitButton, true);

    const expenseData = {
        description: form.querySelector('#expense-description').value,
        amount: parseFloat(form.querySelector('#expense-amount').value),
        category: form.querySelector('#expense-category').value,
        date: form.querySelector('#expense-date').value,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    // Validate amount
    if (isNaN(expenseData.amount) || expenseData.amount <= 0) {
        alert("Please enter a valid, positive amount.");
        setButtonLoadingState(submitButton, false);
        return;
    }

    // Path to the new 'expenses' node under the specific trip
    const expensesRef = firebase.database().ref(`trips/${currentTripId}/expenses`);
    expensesRef.push(expenseData)
        .then(() => {
            console.log("Expense saved successfully!");
            form.reset();
            closeExpenseModal();
        })
        .catch(error => {
            console.error("Error saving expense:", error);
            alert("Error: Could not save your expense. Please try again.");
        })
        .finally(() => {
            setButtonLoadingState(submitButton, false);
        });
}