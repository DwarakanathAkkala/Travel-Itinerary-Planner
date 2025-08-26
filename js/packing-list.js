// js/packing-list.js (FINAL - With Custom Categories & Custom Dropdown)

let currentTripId = null;

export function initializePackingList(tripId) {
    currentTripId = tripId;
    const packingListSection = document.querySelector('.packing-list-section');
    if (!packingListSection) return;
    const header = packingListSection.querySelector('.packing-list-header');
    header.addEventListener('click', () => {
        packingListSection.classList.toggle('open');
    });
    renderAddItemForm();
    fetchPackingList();

    // Add a global click listener to close the dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('category-custom-dropdown');
        const categoryInput = document.getElementById('packing-item-category');
        if (dropdown && categoryInput && !categoryInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}

function renderAddItemForm() {
    const contentArea = document.querySelector('.packing-list-content');
    if (!contentArea) return;

    // The only change is the placeholder text for the category input
    contentArea.innerHTML = `
        <form id="packing-list-form" class="add-item-form">
            <input type="text" id="packing-item-name" placeholder="Enter an item to pack..." required>
            <div class="category-input-wrapper">
                <input type="text" id="packing-item-category" placeholder="Select or Type Category" required>
                <div id="category-custom-dropdown" class="category-dropdown-content"></div>
            </div>
            <button type="submit" class="btn-add-item"><i class="fas fa-plus"></i> Add</button>
        </form>
        <div id="packing-list-items"></div>
    `;
    document.getElementById('packing-list-form').addEventListener('submit', handleAddItemSubmit);

    const categoryInput = document.getElementById('packing-item-category');
    categoryInput.addEventListener('focus', () => {
        document.getElementById('category-custom-dropdown').style.display = 'block';
    });
}

function handleAddItemSubmit(event) {
    event.preventDefault();
    const itemNameInput = document.getElementById('packing-item-name');
    const categoryInput = document.getElementById('packing-item-category');
    const itemName = itemNameInput.value.trim();
    const category = categoryInput.value.trim().toLowerCase() || 'other';

    if (!itemName) {
        alert("Please enter an item name.");
        return;
    }

    const newItem = {
        name: itemName,
        category: category,
        packed: false
    };

    const packingListRef = firebase.database().ref(`trips/${currentTripId}/packingList`);
    packingListRef.push(newItem)
        .then(() => {
            itemNameInput.value = '';
            categoryInput.value = ''; // Clear both fields
            itemNameInput.focus();
        })
        .catch(error => {
            console.error("Failed to add packing item:", error);
            alert("Could not add item to the packing list.");
        });
}

function fetchPackingList() {
    const packingListRef = firebase.database().ref(`trips/${currentTripId}/packingList`);
    packingListRef.on('value', (snapshot) => {
        const listItemsContainer = document.getElementById('packing-list-items');
        if (!listItemsContainer) return;
        if (!snapshot.exists()) {
            listItemsContainer.innerHTML = '<p class="empty-list-message">Your packing list is empty. Add your first item!</p>';
            updateCategorySuggestions([]);
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
    for (const key in items) {
        const item = { id: key, ...items[key] };
        const category = item.category || 'other';
        categories.add(category);
        if (!groupedItems[category]) groupedItems[category] = [];
        groupedItems[category].push(item);
    }

    updateCategorySuggestions(Array.from(categories));
    const sortedCategories = Object.keys(groupedItems).sort();

    sortedCategories.forEach(category => {
        const groupEl = document.createElement('div');
        groupEl.className = 'packing-category-group';
        groupEl.innerHTML = `<h4 class="category-title">${category.charAt(0).toUpperCase() + category.slice(1)}</h4>`;
        const itemListEl = document.createElement('ul');
        itemListEl.className = 'packing-item-list';
        groupedItems[category].forEach(item => {
            const itemEl = document.createElement('li');
            itemEl.className = 'packing-item';
            itemEl.innerHTML = `
                <label>
                    <input type="checkbox" data-item-id="${item.id}" ${item.packed ? 'checked' : ''}>
                    <span class="checkbox-custom"></span>
                    <span class="item-name">${item.name}</span>
                </label>
                <button class="btn-delete-item" data-item-id="${item.id}">&times;</button>`;
            itemListEl.appendChild(itemEl);
        });
        groupEl.appendChild(itemListEl);
        container.appendChild(groupEl);
    });
}

function updateCategorySuggestions(categories) {
    const dropdown = document.getElementById('category-custom-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = '';
    const defaultCategories = ['clothing', 'documents', 'toiletries', 'gadgets', 'other'];
    const allSuggestions = new Set([...defaultCategories, ...categories]);

    allSuggestions.forEach(category => {
        const optionDiv = document.createElement('div');
        optionDiv.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        optionDiv.onclick = () => {
            document.getElementById('packing-item-category').value = optionDiv.textContent;
            dropdown.style.display = 'none';
        };
        dropdown.appendChild(optionDiv);
    });
}