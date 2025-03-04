// eventHandlers.js

document.addEventListener("DOMContentLoaded", () => {
    const presetSelector = document.getElementById('presetSelector');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const selectedPdfsList = document.getElementById('selectedPdfsList');
    const clearAllButton = document.getElementById('clearAll');
    const allPdfsList = document.getElementById('allPdfsList');

    // Event listeners
    presetSelector.addEventListener('change', handlePresetChange);
    searchInput.addEventListener('input', handleSearchInput);
    clearAllButton.addEventListener('click', clearEverything);

    // Restore selected PDFs from localStorage
    const savedPdfs = localStorage.getItem('selectedPdfs');
    if (savedPdfs) {
        selectedPdfs = JSON.parse(savedPdfs);
        updateSelectedPdfsList();
        loadSelectedPdfs();
    }

    // Render all PDFs on page load
    renderAllPdfs();
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

// eventHandlers.js

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