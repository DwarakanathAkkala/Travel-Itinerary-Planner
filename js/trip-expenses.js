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

/**
 * Fetches and displays all expenses for the current trip in real-time.
 * @param {string} tripId The ID of the current trip.
 */
export function fetchAndDisplayExpenses(tripId) {
    const expensesRef = firebase.database().ref(`trips/${tripId}/expenses`);
    const expenseList = document.getElementById('expense-list');
    const expensesSummary = document.getElementById('expenses-summary');

    expensesRef.orderByChild('date').on('value', snapshot => {
        expenseList.innerHTML = ''; // Clear previous list

        if (!snapshot.exists()) {
            expensesSummary.innerHTML = `Total Spent: <strong>$0.00</strong>`;
            expenseList.innerHTML = `<p style="text-align: center; color: #777;">No expenses logged yet.</p>`;
            return;
        }

        const expenses = [];
        let totalAmount = 0;
        snapshot.forEach(childSnapshot => {
            const expenseData = {
                id: childSnapshot.key,
                ...childSnapshot.val()
            };
            expenses.push(expenseData);
            totalAmount += expenseData.amount;
        });

        // Render the summary and the list
        renderExpenseSummary(totalAmount);

        // Render expenses in reverse chronological order
        expenses.reverse().forEach(expense => {
            const expenseCard = createExpenseCard(expense);
            expenseList.appendChild(expenseCard);
        });
    });
}

/**
 * Renders the total amount in the summary box.
 * @param {number} totalAmount The total cost of all expenses.
 */
function renderExpenseSummary(totalAmount) {
    const expensesSummary = document.getElementById('expenses-summary');
    // Format to a currency string (e.g., 1,234.50)
    const formattedTotal = totalAmount.toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR' // You can change this to your preferred currency
    });
    expensesSummary.innerHTML = `<span>Total Spent:</span> ${formattedTotal}`;
}

/**
 * Creates an HTML element for a single expense card.
 * @param {object} expenseData The data for a single expense.
 * @returns {HTMLElement} A div element representing the expense card.
 */
function createExpenseCard(expenseData) {
    const card = document.createElement('div');
    card.className = 'expense-card';
    card.setAttribute('data-expense-id', expenseData.id);
    card.setAttribute('data-category', expenseData.category);

    const icons = {
        food: 'fas fa-utensils',
        transport: 'fas fa-car',
        lodging: 'fas fa-hotel',
        activities: 'fas fa-ticket-alt',
        shopping: 'fas fa-shopping-bag',
        other: 'fas fa-receipt'
    };

    const formattedDate = new Date(expenseData.date).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric'
    });

    const formattedAmount = expenseData.amount.toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR'
    });

    card.innerHTML = `
        <div class="expense-icon">
            <i class="${icons[expenseData.category] || icons.other}"></i>
        </div>
        <div class="expense-details">
            <p>${expenseData.description}</p>
            <span>${formattedDate}</span>
        </div>
        <div class="expense-amount">
            ${formattedAmount}
        </div>
    `;
    return card;
}