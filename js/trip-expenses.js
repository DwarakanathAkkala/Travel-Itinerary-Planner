// js/trip-expenses.js

import { setButtonLoadingState } from './trip.js';

const expenseModalContainer = document.getElementById('expense-modal-container');
const modalExpenseFormContent = document.getElementById('modal-expense-form-content');
const expenseList = document.getElementById('expense-list');
let currentTripId = null;

/**
 * Initializes all event listeners for the expense tracker feature.
 * @param {string} tripId The ID of the current trip, passed from trip.js
 */
export function initializeExpenseListeners(tripId) {
    currentTripId = tripId;
    document.getElementById('add-expense-btn').addEventListener('click', openExpenseModal);
    expenseList.addEventListener('click', handleExpenseListClick);

    // NEW: Add a listener to the document to close any open menus when clicking outside
    document.addEventListener('click', closeAllActionMenus);

    setupModalCloseListeners();
}

function setupModalCloseListeners() {
    if (expenseModalContainer.dataset.listenersAttached === 'true') return;
    expenseModalContainer.querySelector('.close-modal').addEventListener('click', closeExpenseModal);
    expenseModalContainer.addEventListener('click', (e) => {
        if (e.target === expenseModalContainer) closeExpenseModal();
    });
    expenseModalContainer.dataset.listenersAttached = 'true';
}

function openExpenseModal() {
    // This function remains the same
    if (modalExpenseFormContent.getAttribute('data-loaded') !== 'true') {
        fetch('expense-form.html')
            .then(response => { if (!response.ok) throw new Error('Network response'); return response.text(); })
            .then(html => {
                modalExpenseFormContent.innerHTML = html;
                modalExpenseFormContent.setAttribute('data-loaded', 'true');
                modalExpenseFormContent.querySelector('#expense-form').addEventListener('submit', handleExpenseFormSubmit);
            })
            .catch(error => { console.error('Error loading expense form:', error); });
    }
    expenseModalContainer.classList.add('show');
}

function closeExpenseModal() {
    expenseModalContainer.classList.remove('show');
}

function handleExpenseFormSubmit(e) {
    // This function remains the same
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    if (!currentTripId) { alert("Error: Trip ID is missing."); return; }
    setButtonLoadingState(submitButton, true);

    const expenseData = {
        description: form.querySelector('#expense-description').value,
        amount: parseFloat(form.querySelector('#expense-amount').value),
        category: form.querySelector('#expense-category').value,
        date: form.querySelector('#expense-date').value,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    if (isNaN(expenseData.amount) || expenseData.amount <= 0) {
        alert("Please enter a valid, positive amount.");
        setButtonLoadingState(submitButton, false);
        return;
    }

    const expensesRef = firebase.database().ref(`trips/${currentTripId}/expenses`);
    expensesRef.push(expenseData)
        .then(() => { form.reset(); closeExpenseModal(); })
        .catch(error => { alert(`Error: Could not save your expense.`); })
        .finally(() => { setButtonLoadingState(submitButton, false); });
}

export function fetchAndDisplayExpenses(tripId) {
    // This function remains the same
    const expensesRef = firebase.database().ref(`trips/${tripId}/expenses`);
    expensesRef.orderByChild('date').on('value', snapshot => {
        expenseList.innerHTML = '';
        if (!snapshot.exists()) {
            renderExpenseSummary(0);
            expenseList.innerHTML = `<p style="text-align: center; color: #777;">No expenses logged yet.</p>`;
            return;
        }
        const expenses = [];
        let totalAmount = 0;
        snapshot.forEach(childSnapshot => {
            const expenseData = { id: childSnapshot.key, ...childSnapshot.val() };
            expenses.push(expenseData);
            totalAmount += parseFloat(expenseData.amount) || 0;
        });
        renderExpenseSummary(totalAmount);
        expenses.reverse().forEach(expense => {
            const expenseCard = createExpenseCard(expense);
            expenseList.appendChild(expenseCard);
        });
    });
}

function renderExpenseSummary(totalAmount) {
    // This function remains the same
    const expensesSummary = document.getElementById('expenses-summary');
    const formattedTotal = totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    expensesSummary.innerHTML = `<span>Total Spent:</span> ${formattedTotal}`;
}

/**
 * UPDATED: Creates a card with a kebab menu for actions.
 */
function createExpenseCard(expenseData) {
    const card = document.createElement('div');
    card.className = 'expense-card';
    card.setAttribute('data-expense-id', expenseData.id);
    card.setAttribute('data-category', expenseData.category);

    const icons = { food: 'fas fa-utensils', transport: 'fas fa-car', lodging: 'fas fa-hotel', activities: 'fas fa-ticket-alt', shopping: 'fas fa-shopping-bag', other: 'fas fa-receipt' };
    const formattedDate = new Date(expenseData.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedAmount = expenseData.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

    card.innerHTML = `
        <div class="expense-icon"><i class="${icons[expenseData.category] || icons.other}"></i></div>
        <div class="expense-details">
            <p>${expenseData.description}</p>
            <span>${formattedDate}</span>
        </div>
        <div class="expense-amount">${formattedAmount}</div>
        <div class="expense-actions">
            <button class="btn-expense-actions" title="More options"><i class="fas fa-ellipsis-v"></i></button>
            <div class="expense-actions-menu">
                <button class="menu-btn-delete"><i class="fas fa-trash-alt"></i> Delete</button>
            </div>
        </div>
    `;
    return card;
}

/**
 * UPDATED: Handles clicks for opening the menu and deleting items.
 * @param {Event} e The click event.
 */
function handleExpenseListClick(e) {
    const menuButton = e.target.closest('.btn-expense-actions');
    const deleteButton = e.target.closest('.menu-btn-delete');

    // Stop the document's click listener from firing immediately
    e.stopPropagation();

    if (menuButton) {
        const menu = menuButton.nextElementSibling;
        // Close other menus before opening a new one
        closeAllActionMenus(menu);
        menu.classList.toggle('show');
    } else if (deleteButton) {
        const expenseCard = deleteButton.closest('.expense-card');
        const expenseId = expenseCard.getAttribute('data-expense-id');

        if (!currentTripId || !expenseId) {
            alert("Error: Missing ID for deletion.");
            return;
        }

        if (confirm("Are you sure you want to delete this expense?")) {
            const expenseRef = firebase.database().ref(`trips/${currentTripId}/expenses/${expenseId}`);
            expenseRef.remove().catch(error => {
                console.error("Error deleting expense:", error);
                alert("Failed to delete the expense. Please try again.");
            });
        }
    } else {
        // If a click happens on the list but not on a button, close all menus
        closeAllActionMenus();
    }
}

/**
 * NEW: A helper function to close all open action menus.
 * @param {HTMLElement} [excludeMenu] - An optional menu element to exclude from closing.
 */
function closeAllActionMenus(excludeMenu = null) {
    document.querySelectorAll('.expense-actions-menu.show').forEach(menu => {
        if (menu !== excludeMenu) {
            menu.classList.remove('show');
        }
    });
}