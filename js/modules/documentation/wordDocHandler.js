/**
 * Word Document Handler Module
 * Handles Word documents with placeholder detection and replacement
 * Integrates with existing documentation module for unified document processing
 */

class WordDocumentHandler {
    constructor() {
        this.selectedWordDocs = [];
        this.wordDocData = {}; // Store document data
        this.wordPlaceholders = new Set(); // All unique placeholders from Word docs
        this.wordDocProcessors = {}; // Store DOCX processors for later use
        this.isInitialized = false;
        
        // Initialize asynchronously
        this.init().catch(console.error);
    }

    async init() {
        if (this.isInitialized) return;
        
        this.createWordDropZone();
        this.setupEventListeners();
        await this.restoreWordDocumentsFromStorage();
        this.isInitialized = true;
        
        console.log('📝 WordDocumentHandler initialized');
    }

    async restoreWordDocumentsFromStorage() {
        // Restore selected Word documents from localStorage
        const savedWordDocs = localStorage.getItem('selectedWordDocs');
        if (savedWordDocs) {
            this.selectedWordDocs = JSON.parse(savedWordDocs);
        }

        // Restore Word document data from localStorage
        const savedWordData = localStorage.getItem('wordDocData');
        if (savedWordData) {
            const serializedData = JSON.parse(savedWordData);
            // Convert base64 strings back to arrayBuffers
            this.wordDocData = {};
            for (const [fileName, base64Data] of Object.entries(serializedData)) {
                this.wordDocData[fileName] = this.base64ToArrayBuffer(base64Data);
            }
        }

        // Update UI and reload documents if we have saved data
        if (this.selectedWordDocs.length > 0) {
            // First, recreate processors without updating forms
            await this.recreateProcessors();
            // Then update the UI with correct badge counts
            this.updateSelectedWordDocsList();
            // Finally, update form fields
            this.updateFormFieldsFromWordDocs();
            console.log('📝 Restored Word documents from localStorage:', this.selectedWordDocs);
        }
    }

    saveWordDocumentsToStorage() {
        // Save selected Word documents list to localStorage
        localStorage.setItem('selectedWordDocs', JSON.stringify(this.selectedWordDocs));
        
        // Convert arrayBuffers to base64 strings for storage
        const serializableWordData = {};
        for (const [fileName, arrayBuffer] of Object.entries(this.wordDocData)) {
            serializableWordData[fileName] = this.arrayBufferToBase64(arrayBuffer);
        }
        
        // Save Word document data to localStorage
        localStorage.setItem('wordDocData', JSON.stringify(serializableWordData));
    }

    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    async loadWordPlaceholders() {
        // Clear existing placeholders
        this.wordPlaceholders.clear();
        
        // Process stored documents to extract placeholders
        for (const [fileName, arrayBuffer] of Object.entries(this.wordDocData)) {
            try {
                await this.processWordDocument(fileName, arrayBuffer);
            } catch (error) {
                console.error(`Error reprocessing Word document ${fileName}:`, error);
                // Remove corrupted document
                this.removeWordDoc(fileName);
            }
        }

        // Update form fields
        this.updateFormFieldsFromWordDocs();
    }

    async recreateProcessors() {
        // Clear existing placeholders and recreate processors for stored documents
        this.wordPlaceholders.clear();
        
        for (const [fileName, arrayBuffer] of Object.entries(this.wordDocData)) {
            try {
                // Create DOCX processor
                const processor = await DocxReplace.load(arrayBuffer);
                this.wordDocProcessors[fileName] = processor;

                // Extract placeholders using enhanced detection
                const placeholderInfo = processor.getPlaceholders();
                
                // Add bookmarks to placeholders set
                if (placeholderInfo.bookmarks) {
                    placeholderInfo.bookmarks.forEach(bookmark => {
                        this.wordPlaceholders.add(bookmark);
                    });
                }

                // Add text placeholders to placeholders set
                if (placeholderInfo.placeholders) {
                    placeholderInfo.placeholders.forEach(placeholder => {
                        this.wordPlaceholders.add(placeholder);
                    });
                }

            } catch (error) {
                console.error(`Error recreating processor for Word document ${fileName}:`, error);
                // Remove corrupted document
                this.removeWordDoc(fileName);
            }
        }
    }

    createWordDropZone() {
        // Find the documentation section
        const documentationSection = document.getElementById('documentation');
        if (!documentationSection) {
            console.error('Documentation section not found');
            return;
        }

        // Create the Word document drop zone container - compact floating design
        const wordDropContainer = document.createElement('div');
        wordDropContainer.id = 'wordDropContainer';
        wordDropContainer.className = 'word-drop-container-compact';
        wordDropContainer.innerHTML = `
            <div class="word-drop-compact">
                <!-- Compact Drop Zone -->
                <div class="word-drop-zone-compact" id="wordDropZone" title="Drop .docx files or click to browse">
                    <i class="material-icons">article</i>
                    <span class="drop-text">Schematic Docx</span>
                    <input type="file" id="wordFileInput" accept=".docx" multiple style="display: none;">
                </div>
                
                <!-- Selected Documents Counter (shows when docs are added) -->
                <div id="wordDocsCounter" class="word-docs-counter" style="display: none;">
                    <span id="wordDocsCount">0</span>
                    <button id="clearWordDocs" class="clear-word-docs-btn" title="Clear all Word documents">
                        <i class="material-icons">clear</i>
                        <span>Clear</span>
                    </button>
                </div>
                
                <!-- Document list (always visible when docs are added) -->
                <div id="selectedWordDocsContainer" class="selected-word-docs-compact" style="display: none;">
                    <div id="selectedWordDocsList" class="selected-docs-list-compact"></div>
                </div>
            </div>
        `;

        // Insert the compact Word drop container in top right area
        const searchContainer = documentationSection.querySelector('.search-container');
        
        if (searchContainer) {
            // Position it before search container for better mobile layout
            documentationSection.insertBefore(wordDropContainer, searchContainer);
        } else {
            // Fallback: insert after h4
            const betaHeader = documentationSection.querySelector('h4');
            if (betaHeader) {
                betaHeader.parentNode.insertBefore(wordDropContainer, betaHeader.nextSibling);
            }
        }
    }

    setupEventListeners() {
        const wordDropZone = document.getElementById('wordDropZone');
        const wordFileInput = document.getElementById('wordFileInput');
        const clearWordDocsBtn = document.getElementById('clearWordDocs');
        const wordDocsCounter = document.getElementById('wordDocsCounter');

        if (!wordDropZone) return;

        // Make drop zone clickable to browse files
        wordDropZone.addEventListener('click', () => {
            if (wordFileInput) wordFileInput.click();
        });

        // Drag and drop events
        wordDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            wordDropZone.classList.add('dragover');
        });

        wordDropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (!wordDropZone.contains(e.relatedTarget)) {
                wordDropZone.classList.remove('dragover');
            }
        });

        wordDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            wordDropZone.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files).filter(file => 
                file.name.toLowerCase().endsWith('.docx')
            );
            
            if (files.length > 0) {
                this.handleWordFiles(files);
            } else {
                showToast('Please drop only .docx files', 'warning');
            }
        });

        // File input change
        if (wordFileInput) {
            wordFileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                    this.handleWordFiles(files);
                }
                e.target.value = ''; // Reset input
            });
        }

        // Clear all word docs
        if (clearWordDocsBtn) {
            clearWordDocsBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering parent click
                if (confirm('Remove all Word documents?')) {
                    this.clearAllWordDocs();
                }
            });
        }

        // Toggle expanded list when counter is clicked (removed - always show list)
        if (wordDocsCounter) {
            wordDocsCounter.addEventListener('click', (e) => {
                if (!e.target.closest('.clear-word-docs-btn')) {
                    // Just a visual feedback, no toggle action
                    wordDocsCounter.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        wordDocsCounter.style.transform = 'scale(1)';
                    }, 100);
                }
            });
        }
    }

    async handleWordFiles(files) {
        const validFiles = files.filter(file => file.name.toLowerCase().endsWith('.docx'));
        
        if (validFiles.length === 0) {
            showToast('No valid .docx files found', 'warning');
            return;
        }

        showToast(`Processing ${validFiles.length} Word document(s)...`, 'info');

        for (const file of validFiles) {
            try {
                // Check if file already exists
                if (this.selectedWordDocs.includes(file.name)) {
                    showToast(`${file.name} is already added`, 'warning');
                    continue;
                }

                // Read file as array buffer
                const arrayBuffer = await this.readFileAsArrayBuffer(file);
                
                // Store file data
                this.wordDocData[file.name] = arrayBuffer;
                this.selectedWordDocs.push(file.name);

                // Process document to extract placeholders
                await this.processWordDocument(file.name, arrayBuffer);

                console.log(`✅ Processed Word document: ${file.name}`);

            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
                showToast(`Failed to process ${file.name}`, 'error');
            }
        }

        this.updateSelectedWordDocsList();
        this.updateFormFieldsFromWordDocs();
        
        // Save to localStorage
        this.saveWordDocumentsToStorage();
        
        // Update the Fill button state
        if (window.updateFillButtonState) {
            window.updateFillButtonState();
        }
        
        showToast(`Added ${validFiles.length} Word document(s)`, 'success');
    }

    async processWordDocument(fileName, arrayBuffer) {
        try {
            // Create DOCX processor
            const processor = await DocxReplace.load(arrayBuffer);
            this.wordDocProcessors[fileName] = processor;

            // Extract placeholders using enhanced detection
            const placeholderInfo = processor.getPlaceholders();
            
            // Add bookmarks to placeholders set
            if (placeholderInfo.bookmarks) {
                placeholderInfo.bookmarks.forEach(bookmark => {
                    this.wordPlaceholders.add(bookmark);
                });
            }

            // Add text placeholders to placeholders set
            if (placeholderInfo.placeholders) {
                placeholderInfo.placeholders.forEach(placeholder => {
                    this.wordPlaceholders.add(placeholder);
                });
            }

            console.log(`📋 Found ${placeholderInfo.bookmarks?.length || 0} bookmarks and ${placeholderInfo.placeholders?.length || 0} text placeholders in ${fileName}`);

        } catch (error) {
            console.error(`Error processing Word document ${fileName}:`, error);
            throw error;
        }
    }

    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });
    }

    updateSelectedWordDocsList() {
        const counter = document.getElementById('wordDocsCounter');
        const countSpan = document.getElementById('wordDocsCount');
        const list = document.getElementById('selectedWordDocsList');
        const expandedContainer = document.getElementById('selectedWordDocsContainer');
        
        if (!counter || !countSpan || !list) return;

        if (this.selectedWordDocs.length === 0) {
            counter.style.display = 'none';
            expandedContainer.style.display = 'none';
            return;
        }

        // Show counter and container, update count
        counter.style.display = 'flex';
        expandedContainer.style.display = 'block'; // Always show when docs are present
        countSpan.textContent = this.selectedWordDocs.length;
        
        // Update document list
        list.innerHTML = '';
        this.selectedWordDocs.forEach(fileName => {
            const docItem = document.createElement('div');
            docItem.className = 'selected-doc-item-compact';
            docItem.setAttribute('data-doc-name', fileName);

            const fileNameSpan = document.createElement('span');
            fileNameSpan.className = 'file-name-compact';
            fileNameSpan.textContent = fileName;

            const placeholderCount = this.getPlaceholderCountForDoc(fileName);
            const placeholderBadge = document.createElement('span');
            placeholderBadge.className = 'placeholder-badge-compact';
            placeholderBadge.textContent = `${placeholderCount}`;
            placeholderBadge.title = `${placeholderCount} placeholder fields detected`;

            const removeButton = document.createElement('button');
            removeButton.className = 'remove-btn-compact';
            removeButton.innerHTML = '<i class="material-icons">close</i>';
            removeButton.title = 'Remove document';
            removeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Remove ${fileName}?`)) {
                    this.removeWordDoc(fileName);
                }
            });

            docItem.appendChild(fileNameSpan);
            docItem.appendChild(placeholderBadge);
            docItem.appendChild(removeButton);
            list.appendChild(docItem);
        });

        // Make list sortable if Sortable is available
        if (typeof Sortable !== 'undefined') {
            Sortable.create(list, {
                animation: 150,
                onEnd: () => {
                    const reorderedDocs = [...list.children].map(child => 
                        child.getAttribute('data-doc-name'));
                    this.selectedWordDocs = reorderedDocs;
                }
            });
        }
    }

    getPlaceholderCountForDoc(fileName) {
        // This is a simplified count - in practice you'd want to track per-document placeholders
        const processor = this.wordDocProcessors[fileName];
        if (!processor) return 0;

        try {
            const placeholderInfo = processor.getPlaceholders();
            const bookmarkCount = placeholderInfo.bookmarks?.length || 0;
            const placeholderCount = placeholderInfo.placeholders?.length || 0;
            return bookmarkCount + placeholderCount;
        } catch (error) {
            console.warn(`Error getting placeholder count for ${fileName}:`, error);
            return 0;
        }
    }

    removeWordDoc(fileName) {
        // Remove from selected list
        this.selectedWordDocs = this.selectedWordDocs.filter(name => name !== fileName);
        
        // Remove stored data
        delete this.wordDocData[fileName];
        delete this.wordDocProcessors[fileName];

        // Recalculate placeholders from remaining documents
        this.recalculatePlaceholders();

        // Update UI
        this.updateSelectedWordDocsList();
        this.updateFormFieldsFromWordDocs();

        // Save to localStorage
        this.saveWordDocumentsToStorage();

        // Update the Fill button state
        if (window.updateFillButtonState) {
            window.updateFillButtonState();
        }

        showToast(`Removed ${fileName}`, 'info');
    }

    clearAllWordDocs(silent = false) {
        this.selectedWordDocs = [];
        this.wordDocData = {};
        this.wordDocProcessors = {};
        this.wordPlaceholders.clear();

        // Clean up all Word fields from the form
        this.removeAllWordFields();

        this.updateSelectedWordDocsList();
        this.updateFormFieldsFromWordDocs();

        // Clear localStorage
        this.saveWordDocumentsToStorage();

        // Update the Fill button state
        if (window.updateFillButtonState) {
            window.updateFillButtonState();
        }

        if (!silent) {
            showToast('All Word documents cleared', 'info');
        }
    }

    removeAllWordFields() {
        const formContainer = document.getElementById('formContainer');
        if (!formContainer) return;

        // Remove all Word placeholder inputs
        const wordInputs = formContainer.querySelectorAll('.word-placeholder-input');
        wordInputs.forEach(input => {
            const fieldWrapper = input.closest('.form-field-wrapper');
            if (fieldWrapper) {
                const fieldName = input.name;
                console.log(`🗑️ Removing Word field: ${fieldName}`);
                fieldWrapper.remove();
                
                // Clean up from formFields object
                if (typeof formFields !== 'undefined' && formFields[fieldName] !== undefined) {
                    delete formFields[fieldName];
                }
            }
        });

        // Clean up empty form groups
        this.cleanupEmptyFormGroups();
    }

    recalculatePlaceholders() {
        this.wordPlaceholders.clear();
        
        // Re-extract placeholders from remaining documents
        this.selectedWordDocs.forEach(fileName => {
            const processor = this.wordDocProcessors[fileName];
            if (processor) {
                try {
                    const placeholderInfo = processor.getPlaceholders();
                    
                    if (placeholderInfo.bookmarks) {
                        placeholderInfo.bookmarks.forEach(bookmark => {
                            this.wordPlaceholders.add(bookmark);
                        });
                    }

                    if (placeholderInfo.placeholders) {
                        placeholderInfo.placeholders.forEach(placeholder => {
                            this.wordPlaceholders.add(placeholder);
                        });
                    }
                } catch (error) {
                    console.warn(`Error recalculating placeholders for ${fileName}:`, error);
                }
            }
        });
    }

    analyzePlaceholders() {
        if (this.selectedWordDocs.length === 0) {
            showToast('No Word documents selected for analysis', 'warning');
            return;
        }

        const analysis = {
            totalDocuments: this.selectedWordDocs.length,
            totalPlaceholders: this.wordPlaceholders.size,
            placeholdersList: Array.from(this.wordPlaceholders).sort(),
            documentDetails: {}
        };

        // Analyze each document
        this.selectedWordDocs.forEach(fileName => {
            const processor = this.wordDocProcessors[fileName];
            if (processor) {
                try {
                    const placeholderInfo = processor.getPlaceholders();
                    analysis.documentDetails[fileName] = {
                        bookmarks: placeholderInfo.bookmarks?.length || 0,
                        textPlaceholders: placeholderInfo.placeholders?.length || 0,
                        total: (placeholderInfo.bookmarks?.length || 0) + (placeholderInfo.placeholders?.length || 0)
                    };
                } catch (error) {
                    analysis.documentDetails[fileName] = { error: error.message };
                }
            }
        });

        // Show analysis modal or console log for now
        console.log('📊 Word Documents Analysis:', analysis);
        
        showToast(`Analysis complete: ${analysis.totalPlaceholders} unique placeholders found across ${analysis.totalDocuments} documents`, 'success');
        
        // For debugging - show in console
        console.table(analysis.documentDetails);
    }

    // Integration method to add Word placeholders to the existing form system
    updateFormFieldsFromWordDocs() {
        if (typeof loadPdfFields !== 'function') {
            console.warn('loadPdfFields function not available - Word placeholders cannot be integrated');
            return;
        }

        // Trigger a refresh of the form fields to include Word placeholders
        // This will be called after the existing loadPdfFields completes
        setTimeout(() => {
            this.cleanupAndUpdateWordPlaceholders();
        }, 100);
    }

    cleanupAndUpdateWordPlaceholders() {
        const formContainer = document.getElementById('formContainer');
        if (!formContainer) return;

        // First, remove fields that are no longer needed
        this.removeObsoleteWordFields();

        // Then add new fields from current Word documents
        this.addWordPlaceholdersToForm();
    }

    removeObsoleteWordFields() {
        const formContainer = document.getElementById('formContainer');
        if (!formContainer) return;

        // Get current Word placeholders
        const currentWordPlaceholders = new Set(this.wordPlaceholders);

        // Find all Word placeholder inputs (those with word-placeholder-input class)
        const wordInputs = formContainer.querySelectorAll('.word-placeholder-input');
        
        wordInputs.forEach(input => {
            const fieldName = input.name;
            
            // Check if this field is still needed
            const stillNeeded = currentWordPlaceholders.has(fieldName);
            
            // Also check if it exists in PDF fields (in case it's shared)
            let existsInPdfs = false;
            if (typeof selectedPdfs !== 'undefined' && selectedPdfs.length > 0) {
                // Check if any PDFs contain this field
                // This is a simplified check - in practice you'd want to verify against actual PDF fields
                existsInPdfs = this.checkIfFieldExistsInPdfs(fieldName);
            }

            // Remove field if it's not needed by Word docs and not in PDFs
            if (!stillNeeded && !existsInPdfs) {
                const fieldWrapper = input.closest('.form-field-wrapper');
                if (fieldWrapper) {
                    console.log(`🗑️ Removing obsolete Word field: ${fieldName}`);
                    fieldWrapper.remove();
                    
                    // Also clean up from formFields object
                    if (typeof formFields !== 'undefined' && formFields[fieldName] !== undefined) {
                        delete formFields[fieldName];
                    }
                }
            }
        });

        // After removing fields, check if any form groups are now empty and handle them
        this.cleanupEmptyFormGroups();
    }

    checkIfFieldExistsInPdfs(fieldName) {
        // This is a simplified check - you could make this more sophisticated
        // by actually checking PDF form fields, but for now we'll assume
        // fields without the word-placeholder-input class might be from PDFs
        const formContainer = document.getElementById('formContainer');
        const nonWordInput = formContainer.querySelector(`input[name="${fieldName}"]:not(.word-placeholder-input)`);
        return nonWordInput !== null;
    }

    cleanupEmptyFormGroups() {
        const formContainer = document.getElementById('formContainer');
        if (!formContainer) return;

        const formGroups = formContainer.querySelectorAll('.form-group');
        formGroups.forEach(group => {
            const inputs = group.querySelectorAll('input');
            if (inputs.length === 0) {
                const groupHeader = group.querySelector('.form-group-header');
                const groupName = groupHeader ? groupHeader.textContent.replace('📝', '').trim() : 'Unknown Group';
                
                console.log(`🗑️ Removing empty form group: ${groupName}`);
                group.remove();
            }
        });
    }

    addWordPlaceholdersToForm() {
        const formContainer = document.getElementById('formContainer');
        if (!formContainer || this.wordPlaceholders.size === 0) return;

        // Get existing field names to avoid duplicates
        const existingFields = new Set();
        const existingInputs = formContainer.querySelectorAll('input[name]');
        existingInputs.forEach(input => {
            existingFields.add(input.name);
        });

        // Filter Word placeholders to only new ones
        const newWordPlaceholders = Array.from(this.wordPlaceholders).filter(placeholder => 
            !existingFields.has(placeholder)
        );

        if (newWordPlaceholders.length === 0) {
            console.log('📝 No new Word placeholders to add - all already exist in form');
            return;
        }

        // Group new Word placeholders by their field groups (same logic as PDF handler)
        const allGroupedFields = new Set(Object.values(fieldGroups).flat());
        
        // Add Word placeholders to appropriate existing groups
        Object.entries(fieldGroups).forEach(([groupName, fieldsInGroup]) => {
            const relevantWordFields = newWordPlaceholders.filter(field => fieldsInGroup.includes(field));
            
            if (relevantWordFields.length > 0) {
                // Find existing group in the form
                let existingGroup = null;
                const formGroups = formContainer.querySelectorAll('.form-group');
                
                for (const group of formGroups) {
                    const header = group.querySelector('.form-group-header');
                    if (header && header.textContent.includes(groupName)) {
                        existingGroup = group;
                        break;
                    }
                }
                
                if (existingGroup) {
                    // Add to existing group
                    const content = existingGroup.querySelector('.form-group-content');
                    if (content) {
                        relevantWordFields.forEach(placeholder => {
                            this.createWordPlaceholderField(placeholder, content);
                        });
                    }
                } else {
                    // Create new group if it doesn't exist yet
                    this.createFormGroup(groupName, relevantWordFields, formContainer);
                }
            }
        });

        // Add remaining ungrouped Word placeholders to miscellaneous
        const ungroupedWordFields = newWordPlaceholders.filter(field => !allGroupedFields.has(field));
        
        if (ungroupedWordFields.length > 0) {
            // Find or create miscellaneous group
            let miscGroup = null;
            const formGroups = formContainer.querySelectorAll('.form-group');
            
            for (const group of formGroups) {
                const header = group.querySelector('.form-group-header');
                if (header && header.textContent.includes('Miscellaneous Fields')) {
                    miscGroup = group;
                    break;
                }
            }

            if (!miscGroup) {
                // Create miscellaneous group
                this.createFormGroup('Miscellaneous Fields', ungroupedWordFields, formContainer);
            } else {
                // Add to existing miscellaneous group
                const content = miscGroup.querySelector('.form-group-content');
                if (content) {
                    ungroupedWordFields.forEach(placeholder => {
                        this.createWordPlaceholderField(placeholder, content);
                    });
                }
            }
        }

        console.log(`📝 Added ${newWordPlaceholders.length} new Word placeholder fields to appropriate groups`);
    }

    createFormGroup(groupName, fields, container) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'form-group active';

        const header = document.createElement('div');
        header.className = 'form-group-header';
        header.textContent = groupName;
        header.onclick = () => {
            groupDiv.classList.toggle('active');
        };

        const content = document.createElement('div');
        content.className = 'form-group-content';

        // Add event listener for smart collapse (same as PDF handler)
        content.addEventListener('focusout', (e) => {
            if (!groupDiv.contains(e.relatedTarget)) {
                this.checkGroupCompletion(groupDiv);
            }
        });

        fields.forEach(fieldName => {
            this.createWordPlaceholderField(fieldName, content);
        });

        groupDiv.appendChild(header);
        groupDiv.appendChild(content);
        container.appendChild(groupDiv);

        // Check completion status on initial load
        this.checkGroupCompletion(groupDiv);
    }

    // Helper method to check group completion (same logic as PDF handler)
    checkGroupCompletion(groupDiv) {
        const inputs = groupDiv.querySelectorAll('.form-group-content input');
        if (inputs.length === 0) return;

        const allFilled = [...inputs].every(input => input.value.trim() !== '');

        if (allFilled) {
            groupDiv.classList.add('is-complete');
            groupDiv.classList.remove('active');
        } else {
            groupDiv.classList.remove('is-complete');
        }
    }

    createWordPlaceholderField(fieldName, container) {
        const fieldWrapper = document.createElement('div');
        fieldWrapper.className = 'form-field-wrapper'; // Remove word-field class to integrate seamlessly

        const label = document.createElement('label');
        label.textContent = fieldName;
        label.title = `Word document placeholder: ${fieldName}`;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.name = fieldName;
        input.className = 'word-placeholder-input'; // Keep this for subtle styling

        // Set value priority: saved > default > empty (same logic as PDF handler)
        const savedValue = localStorage.getItem(`formField_${fieldName}`);
        if (savedValue) {
            input.value = savedValue;
            if (typeof formFields !== 'undefined') {
                formFields[fieldName] = savedValue;
            }
        } else if (typeof defaultFieldValues !== 'undefined' && defaultFieldValues[fieldName]) {
            // Use default value from constants.js
            input.value = defaultFieldValues[fieldName];
            if (typeof formFields !== 'undefined') {
                formFields[fieldName] = defaultFieldValues[fieldName];
            }
        } else {
            // Set empty value in formFields
            if (typeof formFields !== 'undefined') {
                formFields[fieldName] = formFields[fieldName] || '';
            }
            input.value = (typeof formFields !== 'undefined') ? formFields[fieldName] || '' : '';
        }

        // Special handling for "Rs" field (same as PDF handler)
        if (fieldName === "Rs") {
            input.addEventListener('input', (e) => {
                if (isNaN(e.target.value)) {
                    if (typeof showToast === 'function') {
                        showToast("Please enter a valid number for the amount.", 'error');
                    }
                    e.target.value = '';
                }
                const amountInRs = e.target.value;
                if (typeof formFields !== 'undefined') {
                    formFields["Rs"] = amountInRs;
                }
                
                // Update Rupees field if exists (same logic as PDF handler)
                const rupeesField = container.parentElement.parentElement.querySelector('input[name="Rupees"]');
                if (rupeesField && typeof convertToWords === 'function') {
                    const amountInRupees = convertToWords(amountInRs);
                    rupeesField.value = amountInRupees;
                    if (typeof formFields !== 'undefined') {
                        formFields["Rupees"] = amountInRupees;
                    }
                    localStorage.setItem(`formField_Rupees`, amountInRupees);
                }
            });
        } else {
            // Regular input handler
            input.addEventListener('input', (e) => {
                if (typeof formFields !== 'undefined') {
                    formFields[fieldName] = e.target.value;
                }
            });
        }

        // Save data to localStorage on blur (same as PDF handler)
        input.addEventListener('blur', (e) => {
            const value = e.target.value;
            if (typeof formFields !== 'undefined') {
                formFields[fieldName] = value;
            }
            localStorage.setItem(`formField_${fieldName}`, value);
        });

        fieldWrapper.appendChild(label);
        fieldWrapper.appendChild(input);
        container.appendChild(fieldWrapper);
    }

    // Method to generate filled Word documents
    async generateFilledWordDocuments(formFieldsData) {
        if (this.selectedWordDocs.length === 0) {
            console.log('No Word documents to process');
            return null;
        }

        const zip = new JSZip();
        let processedCount = 0;

        for (const fileName of this.selectedWordDocs) {
            try {
                const processor = this.wordDocProcessors[fileName];
                if (!processor) {
                    console.warn(`No processor found for ${fileName}`);
                    continue;
                }

                // Get placeholders for this document
                const placeholderInfo = processor.getPlaceholders();
                const allDocPlaceholders = [
                    ...(placeholderInfo.bookmarks || []),
                    ...(placeholderInfo.placeholders || [])
                ];

                // Filter form data to only include placeholders that exist in this document
                const documentReplacements = {};
                Object.keys(formFieldsData).forEach(fieldName => {
                    if (allDocPlaceholders.includes(fieldName)) {
                        documentReplacements[fieldName] = formFieldsData[fieldName];
                    }
                });

                // Replace placeholders (both bookmarks and text placeholders)
                processor.replaceAll(documentReplacements);

                // Generate filled document
                const filledDocx = await processor.generate();

                // Add to ZIP with proper naming
                const zipFileName = fileName.replace(/\.(docx)$/i, '') + '_filled.docx';
                zip.file(zipFileName, filledDocx);

                processedCount++;
                console.log(`✅ Processed Word document: ${fileName}`);

            } catch (error) {
                console.error(`Error processing Word document ${fileName}:`, error);
                showToast(`Failed to process ${fileName}`, 'error');
            }
        }

        if (processedCount === 0) {
            return null;
        }

        // Generate ZIP file
        return await zip.generateAsync({ type: 'blob' });
    }
}

// Integration with existing documentation module
(function() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWordDocHandler);
    } else {
        initWordDocHandler();
    }

    function initWordDocHandler() {
        // Initialize Word document handler
        window.wordDocHandler = new WordDocumentHandler();

        // Modify existing fillAndOpen button handler to include Word documents
        const fillAndOpenBtn = document.getElementById('fillAndOpen');
        if (fillAndOpenBtn) {
            // Store reference to original event listeners
            const originalClickHandlers = [];
            
            // Clone the button to remove all existing event listeners
            const newBtn = fillAndOpenBtn.cloneNode(true);
            fillAndOpenBtn.parentNode.replaceChild(newBtn, fillAndOpenBtn);
            
            // Add our enhanced handler
            newBtn.addEventListener('click', async function() {
                try {
                    const hasPdfs = typeof selectedPdfs !== 'undefined' && selectedPdfs.length > 0;
                    const hasWordDocs = window.wordDocHandler.selectedWordDocs.length > 0;

                    if (!hasPdfs && !hasWordDocs) {
                        showToast('No documents selected', 'warning');
                        return;
                    }

                    // Handle PDFs using existing logic
                    if (hasPdfs) {
                        const zip = new JSZip();
                        let mergedPdf = await PDFLib.PDFDocument.create();
                        let hasPdfContent = false;

                        for (let fileName of selectedPdfs) {
                            const fileType = detectFileType(pdfBase64[fileName]);
                            const fileBytes = base64ToArrayBuffer(pdfBase64[fileName]);

                            if (fileType === 'pdf') {
                                hasPdfContent = true;
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
                            }
                        }

                        // Open PDF if we have PDF content
                        if (hasPdfContent) {
                            const filledPdfBytes = await mergedPdf.save();
                            const blob = new Blob([filledPdfBytes], { type: "application/pdf" });
                            window.open(URL.createObjectURL(blob), '_blank');
                        }
                    }

                    // Handle Word documents
                    if (hasWordDocs) {
                        const wordZip = await window.wordDocHandler.generateFilledWordDocuments(
                            typeof formFields !== 'undefined' ? formFields : {}
                        );

                        if (wordZip) {
                            const url = URL.createObjectURL(wordZip);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'filled_word_documents.zip';
                            document.body.appendChild(a);
                            a.click();
                            setTimeout(() => {
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                            }, 100);
                            
                            showToast('Documents generated successfully!', 'success');
                        }
                    }

                } catch (error) {
                    console.error('Error in enhanced fillAndOpen:', error);
                    showToast('Error generating documents', 'error');
                }
            });
        }

        // Hook into existing loadPdfFields to include Word placeholders
        const originalLoadPdfFields = window.loadPdfFields;
        if (typeof originalLoadPdfFields === 'function') {
            window.loadPdfFields = async function() {
                // Call original function first
                await originalLoadPdfFields.apply(this, arguments);
                
                // Then add Word placeholders
                if (window.wordDocHandler) {
                    window.wordDocHandler.addWordPlaceholdersToForm();
                }
            };
        }

        console.log('📝 WordDocumentHandler integrated with documentation module');
    }
})();

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WordDocumentHandler;
}
