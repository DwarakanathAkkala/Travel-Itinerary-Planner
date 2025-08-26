// js/packing-list.js (DEFINITIVE, FUNCTIONAL VERSION)
import { createCustomDropdown } from './dropdown.js';

let currentTripId = null;
let currentCategories = new Set();

export function initializePackingList(tripId) {
    currentTripId = tripId;
    const packingListSection = document.querySelector('.packing-list-section');
    if (!packingListSection) return;

    const header = packingListSection.querySelector('.packing-list-header');
    header.addEventListener('click', () => packingListSection.classList.toggle('open'));
    packingListSection.addEventListener('click', handleListInteraction);

    renderAddItemForm();
    fetchPackingList();
}

function renderAddItemForm() {
    const contentArea = document.querySelector('.packing-list-content');
    if (!contentArea) return;
    contentArea.innerHTML = `
        <div class="progress-bar-container">
            <div id="packing-progress-bar" class="progress-bar-fill"></div>
        </div>
        <form id="packing-list-form" class="add-item-form">
            <input type="text" id="packing-item-name" placeholder="Enter an item to pack..." required>
            <input type="text" id="packing-item-category" placeholder="Select or Type Category" required>
            <button type="submit" class="btn-add-item"><i class="fas fa-plus"></i> Add</button>
        </form>
        <div id="packing-list-items"></div>`;

    const categoryInput = document.getElementById('packing-item-category');
    createCustomDropdown(categoryInput, () => {
        const defaultCategories = ['Clothing', 'Documents', 'Toiletries', 'Gadgets', 'Other'];
        return Array.from(new Set([...defaultCategories, ...Array.from(currentCategories)])).sort();
    });

    document.getElementById('packing-list-form').addEventListener('submit', handleAddItemSubmit);
}

function handleAddItemSubmit(event) {
    event.preventDefault();
    const itemNameInput = document.getElementById('packing-item-name');
    const categoryInput = document.getElementById('packing-item-category');
    const itemName = itemNameInput.value.trim();
    const category = categoryInput.value.trim().toLowerCase() || 'other';
    if (!itemName) { alert("Please enter an item name."); return; }
    const newItem = { name: itemName, category: category, packed: false };
    const packingListRef = firebase.database().ref(`trips/${currentTripId}/packingList`);
    packingListRef.push(newItem).then(() => {
        itemNameInput.value = '';
        categoryInput.value = '';
        itemNameInput.focus();
    });
}

function fetchPackingList() {
    const packingListRef = firebase.database().ref(`trips/${currentTripId}/packingList`);
    packingListRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            currentCategories = new Set();
            renderPackingList({});
            updateProgress(0, 0);
            return;
        }
        renderPackingList(snapshot.val());
    });
}

function renderPackingList(items) {
    const container = document.getElementById('packing-list-items');
    container.innerHTML = '';
    const groupedItems = {};
    const categories = new Set();
    let totalItems = 0;
    let packedItems = 0;

    for (const key in items) {
        totalItems++;
        const item = { id: key, ...items[key] };
        if (item.packed) packedItems++;
        const category = item.category || 'other';
        const capitalizedCategory = category.charAt(0).toUpperCase() + category.slice(1);
        categories.add(capitalizedCategory);
        if (!groupedItems[capitalizedCategory]) groupedItems[capitalizedCategory] = [];
        groupedItems[capitalizedCategory].push(item);
    }

    currentCategories = categories;
    updateProgress(packedItems, totalItems);

    if (Object.keys(groupedItems).length === 0) {
        container.innerHTML = '<p class="empty-list-message">Your packing list is empty.</p>';
        return;
    }

    Object.keys(groupedItems).sort().forEach(category => {
        const groupEl = document.createElement('div');
        groupEl.className = 'packing-category-group';
        groupEl.innerHTML = `<h4 class="category-title">${category}</h4>`;
        const itemListEl = document.createElement('ul');
        itemListEl.className = 'packing-item-list';
        groupedItems[category].forEach(item => {
            const itemEl = document.createElement('li');
            itemEl.className = 'packing-item';
            itemEl.innerHTML = `
                <label>
                    <input type="checkbox" class="packing-checkbox" data-item-id="${item.id}" ${item.packed ? 'checked' : ''}>
                    <span class="checkbox-custom"></span>
                    <span class="item-name">${item.name}</span>
                </label>
                <div class="item-actions">
                    <button class="btn-edit-item" data-item-id="${item.id}" title="Edit item"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-delete-item" data-item-id="${item.id}" title="Delete item">&times;</button>
                </div>`;
            itemListEl.appendChild(itemEl);
        });
        groupEl.appendChild(itemListEl);
        container.appendChild(groupEl);
    });
}

function handleListInteraction(event) {
    const target = event.target;
    const checkbox = target.closest('.packing-checkbox');
    const deleteButton = target.closest('.btn-delete-item');
    const editButton = target.closest('.btn-edit-item');

    if (checkbox) {
        const itemId = checkbox.dataset.itemId;
        const isPacked = checkbox.checked;
        const itemRef = firebase.database().ref(`trips/${currentTripId}/packingList/${itemId}/packed`);
        itemRef.set(isPacked);
    }
    if (deleteButton) {
        const itemId = deleteButton.dataset.itemId;
        if (confirm("Are you sure you want to delete this item?")) {
            const itemRef = firebase.database().ref(`trips/${currentTripId}/packingList/${itemId}`);
            itemRef.remove();
        }
    }
    // Handle clicks on the new edit button
    if (editButton) {
        const itemNameSpan = editButton.closest('.packing-item').querySelector('.item-name');
        makeItemEditable(itemNameSpan);
    }
}


function makeItemEditable(spanElement) {
    const currentName = spanElement.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'edit-item-input';
    spanElement.parentNode.replaceChild(input, spanElement);
    input.focus();
    const saveEdit = () => {
        const newName = input.value.trim();
        const itemId = input.parentNode.querySelector('.packing-checkbox').dataset.itemId;
        if (newName && newName !== currentName) {
            const itemRef = firebase.database().ref(`trips/${currentTripId}/packingList/${itemId}/name`);
            itemRef.set(newName);
        } else {
            const newSpan = document.createElement('span');
            newSpan.className = 'item-name';
            newSpan.textContent = currentName;
            input.parentNode.replaceChild(newSpan, input);
        }
    };
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
}

function updateProgress(packedCount, totalCount) {
    const summaryEl = document.querySelector('.packing-list-summary');
    if (summaryEl) {
        summaryEl.textContent = `${packedCount} of ${totalCount} items packed`;
    }

    const progressBar = document.getElementById('packing-progress-bar');
    if (progressBar) {
        const percentage = totalCount > 0 ? (packedCount / totalCount) * 100 : 0;
        progressBar.style.width = `${percentage}%`;
    }
}