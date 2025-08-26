let selectedPdfs = [];
let pdfData = {};
let formFields = {};
let isPdfLoading = false;
let fuse; // Variable to hold the Fuse.js instance

// --- NEW: Initialize the fuzzy search index ---
function initializeFuzzySearch() {
    const pdfList = Object.keys(pdfBase64).filter(name => name !== TEMP_PDF_NAME);
    const options = {
        includeScore: true,
        threshold: 0.4, // Adjust this value (0.0 = perfect match, 1.0 = match anything)
        keys: [] // Since we are searching a flat array of strings
    };
    fuse = new Fuse(pdfList, options);
}

// Add this helper function to detect file type
function detectFileType(base64Data) {
    // PDF magic number
    if (base64Data.startsWith('JVBER')) return 'pdf';
    // DOCX magic number (PK header for ZIP)
    if (base64Data.startsWith('UEsDBB')) return 'docx';
    return 'unknown';
}

// --- REFACTORED: Central function to create a list item ---
function createPdfListItem(pdfName, searchTerm = "") {
    const item = document.createElement("div");
    item.className = 'search-result-item'; // Use a consistent class

    const isSelected = selectedPdfs.includes(pdfName);

    // Highlight the search term
    let displayName = pdfName;
    if (searchTerm) {
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        displayName = pdfName.replace(regex, '<span class="highlight-match">$1</span>');
    }
    
    item.innerHTML = displayName;

    if (isSelected) {
        item.classList.add('already-selected');
        const addedBadge = document.createElement('span');
        addedBadge.className = 'added-badge';
        addedBadge.textContent = 'Added';
        item.appendChild(addedBadge);
    } else {
        item.addEventListener("click", () => {
            selectPdf(pdfName);
        });
    }

    return item;
}

function renderAllPdfs() {
    allPdfsList.innerHTML = ""; // Clear previous results

    Object.keys(pdfBase64).forEach(pdfName => {
        // Skip the temporary PDF
        if (pdfName === TEMP_PDF_NAME) return;

        const pdfItem = createPdfListItem(pdfName);
        allPdfsList.appendChild(pdfItem);
    });
}

function renderSearchResults(searchTerm = "") {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = ""; // Clear previous results

    if (!searchTerm.trim()) {
        searchResults.style.display = "none";
        return;
    }

    // --- REPLACED: Use Fuse.js for fuzzy searching ---
    const results = fuse.search(searchTerm);
    const filteredPdfs = results.map(result => result.item);

    if (filteredPdfs.length === 0) {
        searchResults.style.display = "none"; // Hide results if no matches
        return;
    }

    filteredPdfs.forEach(pdfName => {
        const resultItem = createPdfListItem(pdfName, searchTerm);
        searchResults.appendChild(resultItem);
    });

    searchResults.style.display = "block"; // Show results
}

function selectPdf(pdfName) {
    if (selectedPdfs.includes(pdfName)) {
        showToast(`${pdfName} is already selected`, 'warning');
        return;
    }

    selectedPdfs.push(pdfName); // Add to selected list
    updateSelectedPdfsList(); // Update the selected PDFs list
    searchInput.value = ""; // Clear search input
    searchResults.style.display = "none"; // Hide results
    loadSelectedPdfs(); // Load the selected PDF

    // Save to localStorage
    localStorage.setItem('selectedPdfs', JSON.stringify(selectedPdfs));

    showToast(`Added ${pdfName}`, 'success');
}

function deselectPdf(pdfName) {
    selectedPdfs = selectedPdfs.filter(pdf => pdf !== pdfName); // Remove from selected list
    updateSelectedPdfsList(); // Update the selected PDFs list
    loadSelectedPdfs(); // Reload the remaining PDFs

    // Save to localStorage
    localStorage.setItem('selectedPdfs', JSON.stringify(selectedPdfs));

    showToast(`Removed ${pdfName}`, 'error');
}

function updateSelectedPdfsList() {
    selectedPdfsList.innerHTML = ""; // Clear the list

    selectedPdfs.forEach(pdfName => {
        const fileType = detectFileType(pdfBase64[pdfName]);
        const isDocx = fileType === 'docx';
        const selectedPdfItem = document.createElement("div");
        // --- CHANGE: The classes for color-coding are already here ---
        selectedPdfItem.className = `selected-pdf-item ${isDocx ? 'docx-file' : 'pdf-file'}`;
        selectedPdfItem.setAttribute("data-pdf-name", pdfName);
        selectedPdfItem.title = isDocx ? "Word Document" : "PDF Document";

        const fileIcon = document.createElement("span");
        fileIcon.className = "file-icon";
        fileIcon.textContent = isDocx ? "📝" : "📄";

        const fileNameSpan = document.createElement("span");
        fileNameSpan.className = "file-name";
        fileNameSpan.textContent = pdfName;

        const removeButton = document.createElement("button");
        removeButton.className = "remove-btn";
        removeButton.innerHTML = "&times;";
        removeButton.addEventListener('click', () => {
            if (confirm('Remove this document?')) deselectPdf(pdfName);
        });

        // Add touch event listener for mobile
        removeButton.addEventListener('touchstart', function (event) {
            event.preventDefault(); // Prevent default touch behavior
            const confirmRemove = confirm('Are you sure you want to remove this PDF?');
            if (confirmRemove) {
                deselectPdf(pdfName); // Deselect PDF
            }
        });

        selectedPdfItem.appendChild(fileIcon);
        selectedPdfItem.appendChild(fileNameSpan);
        // --- REMOVED: Appending the fileTypeBadge ---
        selectedPdfItem.appendChild(removeButton);
        selectedPdfsList.appendChild(selectedPdfItem);
    });

    // Initialize drag-and-drop
    Sortable.create(selectedPdfsList, {
        animation: 150,
        onEnd: () => {
            const reorderedPdfs = [...selectedPdfsList.children].map(child => 
                child.getAttribute("data-pdf-name"));
            selectedPdfs = reorderedPdfs;
        },
    });
}

// --- NEW: Helper function to check if all fields in a group are filled ---
function checkGroupCompletion(groupDiv) {
    const inputs = groupDiv.querySelectorAll('.form-group-content input');
    if (inputs.length === 0) return; // No fields to check

    const allFilled = [...inputs].every(input => input.value.trim() !== '');

    if (allFilled) {
        groupDiv.classList.add('is-complete');
        groupDiv.classList.remove('active'); // Collapse the card
    } else {
        groupDiv.classList.remove('is-complete');
    }
}

async function loadSelectedPdfs() {
    // This function is now just a wrapper for loadPdfFields
    // since we don't need to handle previews
    await loadPdfFields();
}

function loadPdfIntoIframe(pdfBytes) {
    return new Promise((resolve) => {
        if (window.location.protocol === 'file:') {
            console.warn("Cannot load blob: URLs in file:/// context.");
            resolve();
            return;
        }

        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const pdfUrl = URL.createObjectURL(blob);
        const pdfViewer = document.getElementById('pdfViewer');

        pdfViewer.onload = () => {
            resolve();
        };

        pdfViewer.src = pdfUrl;
    });
}

async function loadPdfFields() {
    const formContainer = document.getElementById('formContainer');
    formContainer.innerHTML = '';
    let uniqueFields = new Set();
    let docxProcessors = {}; // Store DOCX processors for later use

    // Collect all unique fields from selected files
    for (let fileName of selectedPdfs) {
        const fileType = detectFileType(pdfBase64[fileName]);
        const fileBytes = base64ToArrayBuffer(pdfBase64[fileName]);

        if (fileType === 'pdf') {
            // Handle PDF form fields
            const pdfDoc = await PDFLib.PDFDocument.load(fileBytes);
            const form = pdfDoc.getForm();
            if (!form) continue;

            form.getFields().forEach(field => {
                const fieldName = field.getName();
                if (!uniqueFields.has(fieldName)) {
                    uniqueFields.add(fieldName);
                }
            });
        } else if (fileType === 'docx') {
            // Handle DOCX bookmarks
            try {
                const processor = await DocxReplace.load(fileBytes);
                docxProcessors[fileName] = processor;
                const bookmarks = processor.getBookmarks();
                
                bookmarks.forEach(bookmark => {
                    if (!uniqueFields.has(bookmark)) {
                        uniqueFields.add(bookmark);
                    }
                });
            } catch (error) {
                console.error(`Error processing DOCX file ${fileName}:`, error);
                showToast(`Failed to process DOCX file ${fileName}`, 'error');
            }
        }
    }

    // Function to create and append a field
    const createField = (fieldName, container) => {
        const fieldWrapper = document.createElement('div');
        fieldWrapper.className = 'form-field-wrapper';

        const label = document.createElement('label');
        label.textContent = fieldName;
        const input = document.createElement('input');
        input.type = 'text';
        input.name = fieldName;

        // Set saved or default value
        const savedValue = localStorage.getItem(`formField_${fieldName}`);
        if (savedValue) {
            input.value = savedValue;
            formFields[fieldName] = savedValue;
        } else if (defaultFieldValues[fieldName]) {
            input.value = defaultFieldValues[fieldName];
            formFields[fieldName] = defaultFieldValues[fieldName];
        } else {
            input.value = formFields[fieldName] || '';
        }

        // Special handling for "Rs" field
        if (fieldName === "Rs") {
            input.addEventListener('input', (e) => {
                if (isNaN(e.target.value)) {
                    showToast("Please enter a valid number for the amount.", 'error');
                    e.target.value = ''; // Clear invalid input
                }
                const amountInRs = e.target.value;
                formFields["Rs"] = amountInRs;
                const amountInRupees = convertToWords(amountInRs);
                const rupeesField = formContainer.querySelector('input[name="Rupees"]');
                if (rupeesField) {
                    rupeesField.value = amountInRupees;
                    formFields["Rupees"] = amountInRupees;
                    localStorage.setItem(`formField_${"Rupees"}`, amountInRupees);
                }
            });
        } else {
            input.addEventListener('input', (e) => {
                formFields[fieldName] = e.target.value;
            });
        }

        // Save data to localStorage on blur
        input.addEventListener('blur', (e) => {
            const value = e.target.value;
            formFields[fieldName] = value;
            localStorage.setItem(`formField_${fieldName}`, value);
            // No need to check completion here, focusout on the container handles it
        });

        fieldWrapper.appendChild(label);
        fieldWrapper.appendChild(input);
        container.appendChild(fieldWrapper);
    };

    // Add dropdown for Beneficiary Account (only if it doesn't already exist)
    if (uniqueFields.has("Beneficiary Branch") && !document.getElementById('beneficiaryDropdown')) {
        const beneficiaryDropdown = document.createElement('div');
        beneficiaryDropdown.className = 'select';
        beneficiaryDropdown.tabIndex = 0;
        beneficiaryDropdown.setAttribute('role', 'button');
        beneficiaryDropdown.id = 'beneficiaryDropdown';

        const button = document.createElement('button');
        button.tabIndex = 0;
        button.textContent = 'Select Beneficiary Account';
        beneficiaryDropdown.appendChild(button);

        const optionsContainer = document.createElement('div');
        Object.keys(accountDetails).forEach(account => {
            const option = document.createElement('a');
            option.setAttribute('role', 'button');
            option.tabIndex = 0;
            option.href = '#';
            option.innerHTML = `<span>${account}</span>`;
            option.addEventListener('click', (e) => {
                e.preventDefault();
                button.textContent = account;
                const details = accountDetails[account];
                Object.keys(details).forEach(field => {
                    const input = formContainer.querySelector(`input[name="${field}"]`);
                    if (input) {
                        input.value = details[field];
                        formFields[field] = details[field];
                        localStorage.setItem(`formField_${field}`, details[field]);
                    }
                });
            });
            optionsContainer.appendChild(option);
        });
        beneficiaryDropdown.appendChild(optionsContainer);
        formContainer.appendChild(beneficiaryDropdown);
    }

    const allGroupedFields = new Set(Object.values(fieldGroups).flat());

    // Create form groups based on the new structure
    Object.entries(fieldGroups).forEach(([groupName, fieldsInGroup]) => {
        const relevantFields = fieldsInGroup.filter(field => uniqueFields.has(field));

        if (relevantFields.length > 0) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'form-group active';

            const header = document.createElement('div');
            header.className = 'form-group-header';
            header.textContent = groupName;
            header.onclick = () => {
                groupDiv.classList.toggle('active');
                // If user re-opens a completed card, reset its state
                if (groupDiv.classList.contains('is-complete')) {
                    groupDiv.classList.remove('is-complete');
                }
            };

            const content = document.createElement('div');
            content.className = 'form-group-content';

            // Add event listener to the content container for smart collapse
            content.addEventListener('focusout', (e) => {
                // If focus moves outside the card, check for completion
                if (!groupDiv.contains(e.relatedTarget)) {
                    checkGroupCompletion(groupDiv);
                }
            });

            relevantFields.forEach(fieldName => {
                createField(fieldName, content);
            });

            groupDiv.appendChild(header);
            groupDiv.appendChild(content);
            formContainer.appendChild(groupDiv);

            // Check completion status on initial load
            checkGroupCompletion(groupDiv);
        }
    });

    // Add remaining fields that are not in any predefined group
    const ungroupedFields = [...uniqueFields].filter(field => !allGroupedFields.has(field));
    if (ungroupedFields.length > 0) {
        const otherGroupDiv = document.createElement('div');
        otherGroupDiv.className = 'form-group active';

        const header = document.createElement('div');
        header.className = 'form-group-header';
        header.textContent = 'Miscellaneous Fields';
        header.onclick = () => {
            otherGroupDiv.classList.toggle('active');
            if (otherGroupDiv.classList.contains('is-complete')) {
                otherGroupDiv.classList.remove('is-complete');
            }
        };

        const content = document.createElement('div');
        content.className = 'form-group-content';

        // Add event listener for smart collapse
        content.addEventListener('focusout', (e) => {
            if (!otherGroupDiv.contains(e.relatedTarget)) {
                checkGroupCompletion(otherGroupDiv);
            }
        });

        ungroupedFields.forEach(fieldName => {
            createField(fieldName, content);
        });

        otherGroupDiv.appendChild(header);
        otherGroupDiv.appendChild(content);
        formContainer.appendChild(otherGroupDiv);

        // Check completion status on initial load
        checkGroupCompletion(otherGroupDiv);
    }


    document.getElementById('fillAndOpen').disabled = uniqueFields.size === 0;
}

// Modified fillAndOpen handler to handle both PDF and DOCX
document.getElementById('fillAndOpen').addEventListener('click', async () => {
    try {
        const zip = new JSZip(); // We'll use ZIP if we have DOCX files
        let hasPdf = false;
        let mergedPdf = await PDFLib.PDFDocument.create();

        for (let fileName of selectedPdfs) {
            const fileType = detectFileType(pdfBase64[fileName]);
            const fileBytes = base64ToArrayBuffer(pdfBase64[fileName]);

            if (fileType === 'pdf') {
                hasPdf = true;
                const pdfDoc = await PDFLib.PDFDocument.load(fileBytes);
                const form = pdfDoc.getForm();

                // Fill PDF form fields
                Object.entries(formFields).forEach(([name, value]) => {
                    try {
                        const textField = form.getTextField(name);
                        if (textField) {
                            textField.acroField.setDefaultAppearance('/Helv 10.5 Tf 0 g');
                            textField.setText(value);
                        }
                    } catch (error) {
                        // Suppress warnings for specific fields
                        const ignoredFields = ["Date", "Branch", "Day", "Month", "State", "Year", "Rs", "Rupees"];
                        if (!ignoredFields.includes(name)) {
                            console.warn(`Skipping field '${name}' as it does not exist in ${fileName}`);
                        }
                    }
                });

                form.flatten();
                const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                copiedPages.forEach(page => mergedPdf.addPage(page));
            } else if (fileType === 'docx') {
                // Handle DOCX file filling
                const processor = await DocxReplace.load(fileBytes);
                
                // Filter formFields to only include bookmarks that exist in this DOCX
                const docxBookmarks = processor.getBookmarks();
                const replacements = {};
                
                Object.keys(formFields).forEach(fieldName => {
                    if (docxBookmarks.includes(fieldName)) {
                        replacements[fieldName] = formFields[fieldName];
                    }
                });

                processor.replaceBookmarks(replacements);
                const filledDocx = await processor.generate();
                zip.file(fileName.replace('.pdf', '.docx'), filledDocx);
            }
        }

        // Generate output based on what we have
        if (hasPdf) {
            // If we have PDFs, save them (merged or single)
            const filledPdfBytes = await mergedPdf.save();
            const blob = new Blob([filledPdfBytes], { type: "application/pdf" });
            window.open(URL.createObjectURL(blob), '_blank');
        }

        if (Object.keys(zip.files).length > 0) {
            // If we have DOCX files, offer them as a ZIP download
            const zipContent = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipContent);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'filled_documents.zip';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }

    } catch (error) {
        console.error("Error generating documents:", error);
        showToast("Failed to generate documents. Please try again.", 'error');
    }
});

// Suppress specific PDF.js warnings
const originalConsoleWarn = console.warn;
console.warn = function (message) {
    if (!message.includes("Invalid absolute docBaseUrl")) {
        // originalConsoleWarn.apply(console, arguments);
    }
};