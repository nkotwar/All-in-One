// eventHandlers.js

document.addEventListener("DOMContentLoaded", () => {
    const presetSelector = document.getElementById('presetSelector');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const selectedPdfsList = document.getElementById('selectedPdfsList');
    const clearAllButton = document.getElementById('clearAll');
    const allPdfsList = document.getElementById('allPdfsList');

    // --- ENHANCEMENT: Debounce search input ---
    const debouncedSearch = debounce(handleSearchInput, 250);

    // Event listeners
    presetSelector.addEventListener('change', handlePresetChange);
    searchInput.addEventListener('input', debouncedSearch);
    searchInput.addEventListener('keydown', handleSearchKeyboardNav);
    clearAllButton.addEventListener('click', clearEverything);

    // --- ENHANCEMENT: Close search results when clicking outside ---
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            document.getElementById('searchResults').style.display = 'none';
        }
    });

    // Restore selected PDFs from localStorage
    const savedPdfs = localStorage.getItem('selectedPdfs');
    if (savedPdfs) {
        selectedPdfs = JSON.parse(savedPdfs);
        updateSelectedPdfsList();
        loadSelectedPdfs();
    }

    // Render all PDFs on page load
    renderAllPdfs();
    // --- NEW: Initialize the search index after PDFs are loaded ---
    initializeFuzzySearch();
});


function handlePresetChange(e) {
    const presetName = e.target.value;
    if (!presetName) return;

    clearEverything();
    const presetPdfs = presets[presetName];
    if (!presetPdfs) return;

    presetPdfs.forEach(pdfName => {
        if (!selectedPdfs.includes(pdfName)) {
            selectedPdfs.push(pdfName);
        }
    });

    localStorage.setItem('selectedPdfs', JSON.stringify(selectedPdfs));

    updateSelectedPdfsList();
    loadSelectedPdfs();
    showToast(`Applied ${presetName} preset`, 'success');
    presetSelector.value = "";
}

function handleSearchInput(e) {
    const searchTerm = e.target.value;
    renderSearchResults(searchTerm);
}

// --- NEW: Handle keyboard navigation for search results ---
function handleSearchKeyboardNav(e) {
    const searchResults = document.getElementById('searchResults');
    if (searchResults.style.display === 'none' || !searchResults.hasChildNodes()) {
        return;
    }

    const items = Array.from(searchResults.children);
    const activeClass = 'highlighted';
    let currentIndex = items.findIndex(item => item.classList.contains(activeClass));

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            if (currentIndex >= 0) items[currentIndex].classList.remove(activeClass);
            currentIndex = (currentIndex + 1) % items.length;
            items[currentIndex].classList.add(activeClass);
            items[currentIndex].scrollIntoView({ block: 'nearest' });
            break;

        case 'ArrowUp':
            e.preventDefault();
            if (currentIndex >= 0) items[currentIndex].classList.remove(activeClass);
            currentIndex = (currentIndex - 1 + items.length) % items.length;
            items[currentIndex].classList.add(activeClass);
            items[currentIndex].scrollIntoView({ block: 'nearest' });
            break;

        case 'Enter':
            e.preventDefault();
            if (currentIndex >= 0) {
                items[currentIndex].click();
            } else if (items.length > 0) {
                // If nothing is highlighted, select the first item
                items[0].click();
            }
            break;

        case 'Escape':
            searchResults.style.display = 'none';
            break;
    }
}

// --- NEW: Debounce utility function ---
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

function clearEverything() {
    selectedPdfs = [];
    formFields = {};
    const formContainer = document.getElementById('formContainer');
    formContainer.innerHTML = '';
    const pdfViewer = document.getElementById('pdfViewer');
    pdfViewer.src = '';
    document.getElementById('fillAndOpen').disabled = true;
    updateSelectedPdfsList();

    // Clear localStorage for selected PDFs
    localStorage.removeItem('selectedPdfs');

    // Clear localStorage for form fields
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('formField_')) {
            localStorage.removeItem(key);
        }
    });
}