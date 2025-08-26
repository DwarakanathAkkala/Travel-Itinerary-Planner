// js/dropdown.js
let currentDropdown = null;

export function createCustomDropdown(inputElement, getSuggestions) {
    const wrapper = document.createElement('div');
    wrapper.className = 'category-input-wrapper';
    inputElement.parentNode.insertBefore(wrapper, inputElement);
    wrapper.appendChild(inputElement);

    const dropdown = document.createElement('div');
    dropdown.className = 'category-dropdown-content';
    document.body.appendChild(dropdown);

    const showDropdown = () => {
        if (currentDropdown) currentDropdown.style.display = 'none';
        updateSuggestions(dropdown, inputElement, getSuggestions());
        positionDropdown(dropdown, inputElement);
        dropdown.style.display = 'block';
        currentDropdown = dropdown;
    };

    inputElement.addEventListener('focus', showDropdown);
    inputElement.addEventListener('input', showDropdown); // Show on type

    document.addEventListener('click', (e) => {
        if (currentDropdown && !wrapper.contains(e.target)) {
            currentDropdown.style.display = 'none';
            currentDropdown = null;
        }
    });
}

function updateSuggestions(dropdown, input, suggestions) {
    dropdown.innerHTML = '';
    suggestions.forEach(suggestion => {
        const option = document.createElement('div');
        option.textContent = suggestion;
        option.onclick = () => {
            input.value = suggestion;
            dropdown.style.display = 'none';
        };
        dropdown.appendChild(option);
    });
}

function positionDropdown(dropdown, input) {
    const rect = input.getBoundingClientRect();
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.top = `${rect.bottom + 5}px`;
    dropdown.style.width = `${rect.width}px`;
}