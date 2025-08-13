// js/trip-expenses.js

import { setButtonLoadingState } from './trip.js';

const expenseModalContainer = document.getElementById('expense-modal-container');
const modalExpenseFormContent = document.getElementById('modal-expense-form-content');
const expenseList = document.getElementById('expense-list');
let currentTripId = null;

export function initializeExpenseListeners(tripId) {
    currentTripId = tripId;
    document.getElementById('add-expense-btn').addEventListener('click', () => openExpenseModal());
    expenseList.addEventListener('click', handleExpenseListClick);
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

function loadFormThen(callback) {
    if (modalExpenseFormContent.getAttribute('data-loaded') === 'true') {
        callback();
    } else {
        fetch('expense-form.html')
            .then(response => { if (!response.ok) throw new Error('Network response'); return response.text(); })
            .then(html => {
                modalExpenseFormContent.innerHTML = html;
                modalExpenseFormContent.setAttribute('data-loaded', 'true');
                modalExpenseFormContent.querySelector('#expense-form').addEventListener('submit', handleExpenseFormSubmit);
                callback();
            })
            .catch(error => { console.error('Error loading expense form:', error); });
    }
}

function openExpenseModal(editId = null, existingData = null) {
    loadFormThen(() => {
        const form = modalExpenseFormContent.querySelector('#expense-form');
        const h3 = expenseModalContainer.querySelector('h3');
        const submitBtnText = form.querySelector('.btn-text');

        form.reset();

        if (editId && existingData) {
            // --- EDIT MODE ---
            h3.textContent = 'Edit Expense';
            submitBtnText.textContent = 'Save Changes';
            form.setAttribute('data-edit-id', editId);
            populateExpenseForm(form, existingData);

        } else {
            // --- CREATE MODE ---
            h3.textContent = 'Add New Expense';
            submitBtnText.textContent = 'Add Expense';
            form.removeAttribute('data-edit-id');

            // NEW: Calculate and set the date specifically for IST (UTC+5:30)
            const now = new Date();
            const istOffset = 330; // 5 hours and 30 minutes in minutes
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const istDate = new Date(utc + (istOffset * 60000));

            // Format the date into YYYY-MM-DD for the input field
            const year = istDate.getFullYear();
            const month = String(istDate.getMonth() + 1).padStart(2, '0');
            const day = String(istDate.getDate()).padStart(2, '0');
            const istDateString = `${year}-${month}-${day}`;

            form.querySelector('#expense-date').value = istDateString;
        }

        expenseModalContainer.classList.add('show');
    });
}

function closeExpenseModal() {
    expenseModalContainer.classList.remove('show');
}

function populateExpenseForm(form, data) {
    form.querySelector('#expense-description').value = data.description || '';
    form.querySelector('#expense-amount').value = data.amount || '';
    form.querySelector('#expense-category').value = data.category || 'other';
    form.querySelector('#expense-date').value = data.date || '';
}

function handleExpenseFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const editId = form.getAttribute('data-edit-id');

    if (!currentTripId) { alert("Error: Trip ID is missing."); return; }
    setButtonLoadingState(submitButton, true);

    const expenseData = {
        description: form.querySelector('#expense-description').value,
        amount: parseFloat(form.querySelector('#expense-amount').value),
        category: form.querySelector('#expense-category').value,
        date: form.querySelector('#expense-date').value
    };

    if (isNaN(expenseData.amount) || expenseData.amount <= 0) {
        alert("Please enter a valid, positive amount.");
        setButtonLoadingState(submitButton, false);
        return;
    }

    let promise;
    if (editId) {
        const expenseRef = firebase.database().ref(`trips/${currentTripId}/expenses/${editId}`);
        promise = expenseRef.update(expenseData);
    } else {
        expenseData.createdAt = firebase.database.ServerValue.TIMESTAMP;
        const expensesRef = firebase.database().ref(`trips/${currentTripId}/expenses`);
        promise = expensesRef.push(expenseData);
    }

    promise.then(closeExpenseModal).catch(err => alert(`Error: Could not save expense.`)).finally(() => setButtonLoadingState(submitButton, false));
}

export function fetchAndDisplayExpenses(tripId) {
    const expensesRef = firebase.database().ref(`trips/${tripId}/expenses`);
    expensesRef.orderByChild('date').on('value', snapshot => {
        expenseList.innerHTML = '';
        if (!snapshot.exists()) {
            renderExpenseSummary(0);
            expenseList.innerHTML = `<p style="text-align: center; color: #777;">No expenses logged yet.</p>`;
            return;
        }
        let expenses = [];
        let totalAmount = 0;
        snapshot.forEach(childSnapshot => {
            expenses.push({ id: childSnapshot.key, ...childSnapshot.val() });
            totalAmount += parseFloat(childSnapshot.val().amount) || 0;
        });
        renderExpenseSummary(totalAmount);
        expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
        expenses.forEach(expense => { expenseList.appendChild(createExpenseCard(expense)); });
    });
}

function renderExpenseSummary(totalAmount) {
    const expensesSummary = document.getElementById('expenses-summary');
    const formattedTotal = totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    expensesSummary.innerHTML = `<span>Total Spent:</span> ${formattedTotal}`;
}

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
        <div class="expense-details"><p>${expenseData.description}</p><span>${formattedDate}</span></div>
        <div class="expense-amount">${formattedAmount}</div>
        <div class="expense-actions">
            <button class="btn-expense-actions" title="More options"><i class="fas fa-ellipsis-v"></i></button>
            <div class="expense-actions-menu">
                <button class="menu-btn-edit"><i class="fas fa-pencil-alt"></i> Edit</button>
                <button class="menu-btn-delete"><i class="fas fa-trash-alt"></i> Delete</button>
            </div>
        </div>
    `;
    return card;
}

function handleExpenseListClick(e) {
    const menuButton = e.target.closest('.btn-expense-actions');
    const editButton = e.target.closest('.menu-btn-edit');
    const deleteButton = e.target.closest('.menu-btn-delete');

    e.stopPropagation();

    if (menuButton) {
        const card = menuButton.closest('.expense-card');
        const menu = menuButton.nextElementSibling;
        const isOpening = !menu.classList.contains('show');
        closeAllActionMenus();
        if (isOpening) {
            menu.classList.add('show');
            card.classList.add('menu-is-open');
        }
    } else if (editButton) {
        const card = editButton.closest('.expense-card');
        const expenseId = card.getAttribute('data-expense-id');
        const expenseRef = firebase.database().ref(`trips/${currentTripId}/expenses/${expenseId}`);
        expenseRef.once('value', snapshot => {
            if (snapshot.exists()) openExpenseModal(expenseId, snapshot.val());
        });
    } else if (deleteButton) {
        const card = deleteButton.closest('.expense-card');
        const expenseId = card.getAttribute('data-expense-id');
        if (confirm("Are you sure you want to delete this expense?")) {
            const expenseRef = firebase.database().ref(`trips/${currentTripId}/expenses/${expenseId}`);
            expenseRef.remove();
        }
    }
}

function closeAllActionMenus() {
    document.querySelectorAll('.expense-actions-menu.show').forEach(menu => {
        menu.classList.remove('show');
        const card = menu.closest('.expense-card');
        if (card) {
            card.classList.remove('menu-is-open');
        }
    });
}