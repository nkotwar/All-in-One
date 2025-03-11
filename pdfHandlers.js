
let selectedPdfs = [];
let pdfData = {};
let formFields = {};
let isPdfLoading = false;

function renderAllPdfs() {
    allPdfsList.innerHTML = ""; // Clear previous results

    Object.keys(pdfBase64).forEach(pdfName => {
        // Skip the temporary PDF
        if (pdfName === TEMP_PDF_NAME) return;

        const pdfItem = document.createElement("div");
        pdfItem.textContent = pdfName;
        pdfItem.addEventListener("click", () => {
            selectPdf(pdfName); // Select PDF on click
        });
        allPdfsList.appendChild(pdfItem);
    });
}

function renderSearchResults(searchTerm = "") {
    searchResults.innerHTML = ""; // Clear previous results

    const filteredPdfs = Object.keys(pdfBase64).filter(pdfName =>
        pdfName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        pdfName !== TEMP_PDF_NAME // Exclude the temporary PDF
    );


    if (filteredPdfs.length === 0) {
        searchResults.style.display = "none"; // Hide results if no matches
        return;
    }

    filteredPdfs.forEach(pdfName => {
        const resultItem = document.createElement("div");
        resultItem.textContent = pdfName;
        resultItem.addEventListener("click", () => {
            selectPdf(pdfName); // Select PDF on click
        });
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
        const selectedPdfItem = document.createElement("div");
        selectedPdfItem.className = "selected-pdf-item";
        selectedPdfItem.setAttribute("data-pdf-name", pdfName);

        const pdfNameText = document.createElement("span");
        pdfNameText.textContent = pdfName;

        const removeButton = document.createElement("button");
        removeButton.textContent = "×";

        // Add click event listener for desktop
        removeButton.addEventListener('click', () => {
            const confirmRemove = confirm('Are you sure you want to remove this PDF?');
            if (confirmRemove) {
                deselectPdf(pdfName); // Deselect PDF
            }
        });

        // Add touch event listener for mobile
        removeButton.addEventListener('touchstart', function (event) {
            event.preventDefault(); // Prevent default touch behavior
            const confirmRemove = confirm('Are you sure you want to remove this PDF?');
            if (confirmRemove) {
                deselectPdf(pdfName); // Deselect PDF
            }
        });

        selectedPdfItem.appendChild(pdfNameText);
        selectedPdfItem.appendChild(removeButton);
        selectedPdfsList.appendChild(selectedPdfItem);
    });

    // Initialize drag-and-drop
    Sortable.create(selectedPdfsList, {
        animation: 150, // Smooth animation
        onEnd: (evt) => {
            // Update the selectedPdfs array based on the new order
            const reorderedPdfs = [...selectedPdfsList.children].map(child => child.getAttribute("data-pdf-name"));
            selectedPdfs = reorderedPdfs;
            loadSelectedPdfs(); // Reload PDFs with new order
        },
    });
}

async function loadSelectedPdfs() {
    if (isPdfLoading) {
        console.log("A PDF is already loading. Please wait...");
        return;
    }

    isPdfLoading = true;
    pdfData = {};
    const pdfViewer = document.getElementById('pdfViewer');

    try {
        if (selectedPdfs.length === 1) {
            const pdfBytes = base64ToArrayBuffer(pdfBase64[selectedPdfs[0]]);
            pdfData[selectedPdfs[0]] = pdfBytes;
            await loadPdfIntoIframe(pdfBytes);
        } else if (selectedPdfs.length > 1) {
            const mergedPdf = await PDFLib.PDFDocument.create();
            for (let pdfName of selectedPdfs) {
                const pdfBytes = base64ToArrayBuffer(pdfBase64[pdfName]);
                const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
                const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                copiedPages.forEach(page => mergedPdf.addPage(page));
            }
            const mergedBytes = await mergedPdf.save();
            await loadPdfIntoIframe(mergedBytes);
        }
    } catch (error) {
        console.error("Error loading PDFs:", error);
        showToast("Failed to load PDFs. Please try again.", 'error');
    } finally {
        isPdfLoading = false;
    }

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

    // Collect all unique fields from selected PDFs
    for (let pdfName of selectedPdfs) {
        const pdfBytes = base64ToArrayBuffer(pdfBase64[pdfName]);
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        if (!form) continue;

        form.getFields().forEach(field => {
            const fieldName = field.getName();
            if (!uniqueFields.has(fieldName)) {
                uniqueFields.add(fieldName);
            }
        });
    }

    // Function to create and append a field
    const createField = (fieldName) => {
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
        });

        formContainer.appendChild(label);
        formContainer.appendChild(input);
    };

    // Add fields in the defined order, regardless of whether they exist in the PDFs
    fieldOrder.forEach(fieldName => {
        if (uniqueFields.has(fieldName)) {
            createField(fieldName);
        }
    });

    // Add remaining fields that are not in the predefined order
    uniqueFields.forEach(fieldName => {
        if (!fieldOrder.includes(fieldName)) {
            createField(fieldName);
        }
    });

    document.getElementById('fillAndOpen').disabled = uniqueFields.size === 0;
}

document.getElementById('fillAndOpen').addEventListener('click', async () => {
    const mergedPdf = await PDFLib.PDFDocument.create();

    for (let pdfName of selectedPdfs) {
        const pdfBytes = base64ToArrayBuffer(pdfBase64[pdfName]);
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();

        // Fill the form fields
        Object.entries(formFields).forEach(([name, value]) => {
            try {
                const textField = form.getTextField(name);
                if (textField) {
                    // Modify the default appearance string to set a smaller font size
                    textField.acroField.setDefaultAppearance('/Helv 10.5 Tf 0 g');

                    // Fill the field with user input
                    textField.setText(value);
                }
            } catch (error) {
                // Suppress warnings for specific fields
                const ignoredFields = ["Date", "Branch", "Day", "Month", "State", "Year", "Rs", "Rupees"];
                if (!ignoredFields.includes(name)) {
                    console.warn(`Skipping field '${name}' as it does not exist in ${pdfName}`);
                }
            }
        });

        // Flatten the form fields
        form.flatten();

        // Copy pages to the merged PDF
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
    }

    // Save and open the flattened PDF
    const filledPdfBytes = await mergedPdf.save();
    const blob = new Blob([filledPdfBytes], { type: "application/pdf" });
    window.open(URL.createObjectURL(blob), '_blank');
});

// Suppress specific PDF.js warnings
const originalConsoleWarn = console.warn;
console.warn = function (message) {
    if (!message.includes("Invalid absolute docBaseUrl")) {
        // originalConsoleWarn.apply(console, arguments);
    }
};