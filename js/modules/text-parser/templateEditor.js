/**
 * Template Editor Module
 * Provides visual interface for mapping data columns to template placeholders
 */

class TemplateEditor {
    constructor(wordTemplateGenerator) {
        this.wordTemplateGenerator = wordTemplateGenerator;
        this.textParser = wordTemplateGenerator.textParser;
        this.mappings = {}; // Store column to placeholder mappings
        this.previewMode = false;
        this.sampleRowIndex = 0;
        
        this.editorModal = null;
        this.placeholderElements = [];
        this.columnElements = [];
    }

    showEditor(templateDoc, templateInfo) {
        this.templateDoc = templateDoc;
        this.templateBookmarks = templateInfo.bookmarks || [];
        this.templatePlaceholders = templateInfo.placeholders || [];
        this.allPlaceholders = [...this.templateBookmarks, ...this.templatePlaceholders];
        
        this.createEditorModal();
    }

    createEditorModal() {
        // Remove existing modal if any
        this.closeEditor();
        
        // Create modal overlay
        this.editorModal = document.createElement('div');
        this.editorModal.className = 'template-editor-overlay';
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'template-editor-content';
        
        modalContent.innerHTML = `
            <div class="template-editor-header">
                <h3>Template Editor</h3>
                <div class="editor-toolbar">
                    <button class="editor-btn editor-btn-secondary" id="autoMapBtn">
                        <i class="material-icons">auto_fix_high</i>
                        Auto Map
                    </button>
                    <button class="editor-btn editor-btn-secondary" id="clearMappingsBtn">
                        <i class="material-icons">clear_all</i>
                        Clear All
                    </button>
                </div>
                <button class="template-editor-close" aria-label="Close">
                    <i class="material-icons">close</i>
                </button>
            </div>
            
            <div class="template-editor-body">
                <div class="editor-layout">
                    <!-- Left Panel: Available Columns -->
                    <div class="editor-panel editor-columns-panel">
                        <h4>Available Data Columns</h4>
                        <div class="columns-container" id="editorColumnsContainer">
                            <!-- Columns will be populated here -->
                        </div>
                    </div>
                    
                    <!-- Center Panel: Mapping Workspace -->
                    <div class="editor-panel editor-mapping-panel">
                        <h4>Template Placeholders</h4>
                        <div class="mapping-info">
                            <span id="mappingCount">0 of ${this.allPlaceholders.length} mapped</span>
                        </div>
                        <div class="placeholders-container" id="editorPlaceholdersContainer">
                            <!-- Placeholders will be populated here -->
                        </div>
                    </div>
                    
                    <!-- Right Panel: Preview & Settings -->
                    <div class="editor-panel editor-preview-panel">
                        <h4>Generation Settings</h4>
                        
                        <div class="phase-info" style="background: #e8f5e8; padding: 15px; border-radius: 6px; margin-bottom: 15px; font-size: 12px; border-left: 4px solid #28a745;">
                            <strong>📄 Word Template System - Streamlined & Optimized!</strong><br>
                            <div style="margin-top: 8px; line-height: 1.4;">
                                 <strong>Smart Template Detection:</strong> Supports 12+ bracket styles ({{name}}, [name], &lt;name&gt;, etc.)<br>
                                 <strong>Enhanced Auto-Mapping:</strong> 5-strategy algorithm with confidence scoring<br>
                                 <strong>Single Document Generation:</strong> All rows combined into one Word document<br>
                            </div>
                        </div>
                        
                        <div class="generation-settings">
                            <div class="setting-group">
                                <label for="rowLimit">Row Limit:</label>
                                <input type="number" id="rowLimit" min="1" max="500" value="100" placeholder="Max rows">
                                <small>Prevents oversized documents (recommended: 100 max)</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="template-editor-footer">
                <button class="editor-btn editor-btn-secondary" id="saveTemplateBtn">
                    <i class="material-icons">save</i>
                    Save Template
                </button>
                <button class="editor-btn editor-btn-secondary" id="loadTemplateBtn">
                    <i class="material-icons">upload</i>
                    Load Template
                </button>
                <button class="editor-btn editor-btn-primary" id="generateReportBtn" disabled>
                    <i class="material-icons">description</i>
                    Generate Word Document
                </button>
            </div>
        `;
        
        this.editorModal.appendChild(modalContent);
        document.body.appendChild(this.editorModal);
        
        // Setup event listeners
        this.setupEditorEventListeners();
        
        // Populate content
        this.populateColumns();
        this.populatePlaceholders();
        
        // Show modal with animation
        setTimeout(() => {
            this.editorModal.classList.add('show');
            // Prevent body scrolling when modal is open
            document.body.style.overflow = 'hidden';
        }, 50);
    }

    setupEditorEventListeners() {
        const modal = this.editorModal;
        
        // Close button
        modal.querySelector('.template-editor-close').addEventListener('click', () => {
            this.closeEditor();
        });
        
        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeEditor();
        });
        
        // Toolbar buttons
        modal.querySelector('#autoMapBtn').addEventListener('click', () => {
            this.autoMapColumns();
        });
        
        modal.querySelector('#clearMappingsBtn').addEventListener('click', () => {
            this.clearAllMappings();
        });
        
        // Footer buttons
        modal.querySelector('#saveTemplateBtn').addEventListener('click', () => {
            this.saveTemplate();
        });
        
        modal.querySelector('#loadTemplateBtn').addEventListener('click', () => {
            this.loadTemplate();
        });
        
        modal.querySelector('#generateReportBtn').addEventListener('click', () => {
            this.generateReport();
        });
    }

    populateColumns() {
        const container = this.editorModal.querySelector('#editorColumnsContainer');
        const headers = this.textParser.headers || [];
        
        container.innerHTML = '';
        this.columnElements = [];
        
        headers.forEach((header, index) => {
            const columnElement = document.createElement('div');
            columnElement.className = 'draggable-column';
            columnElement.draggable = true;
            columnElement.dataset.columnName = header;
            columnElement.dataset.columnIndex = index;
            
            // Sample data preview
            const sampleData = this.textParser.filteredData[this.sampleRowIndex] || [];
            const sampleValue = sampleData[index] || '';
            
            columnElement.innerHTML = `
                <div class="column-header">
                    <span class="column-name">${header}</span>
                    <span class="column-type">${this.getColumnType(index)}</span>
                </div>
                <div class="column-sample">${this.truncateText(sampleValue, 30)}</div>
            `;
            
            // Drag events
            columnElement.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', header);
                e.dataTransfer.setData('application/column-index', index);
                columnElement.classList.add('dragging');
            });
            
            columnElement.addEventListener('dragend', () => {
                columnElement.classList.remove('dragging');
            });
            
            container.appendChild(columnElement);
            this.columnElements.push(columnElement);
        });
    }

    populatePlaceholders() {
        const container = this.editorModal.querySelector('#editorPlaceholdersContainer');
        container.innerHTML = '';
        this.placeholderElements = [];
        
        this.allPlaceholders.forEach((placeholder, index) => {
            const placeholderElement = document.createElement('div');
            placeholderElement.className = 'placeholder-item';
            placeholderElement.dataset.placeholder = placeholder;
            
            const isBookmark = this.templateBookmarks.includes(placeholder);
            const placeholderType = isBookmark ? 'bookmark' : 'text';
            
            placeholderElement.innerHTML = `
                <div class="placeholder-header">
                    <span class="placeholder-name">${placeholder}</span>
                    <span class="placeholder-type">${placeholderType}</span>
                    <button class="clear-mapping-btn" style="display: none;" title="Clear mapping">
                        <i class="material-icons">close</i>
                    </button>
                </div>
                <div class="placeholder-mapping">
                    <div class="drop-zone" data-placeholder="${placeholder}">
                        Drop column here or click to select
                    </div>
                    <div class="mapped-column" style="display: none;">
                        <span class="mapped-column-name"></span>
                        <span class="mapped-column-preview"></span>
                    </div>
                </div>
            `;
            
            // Drop zone events
            const dropZone = placeholderElement.querySelector('.drop-zone');
            
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
            
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('drag-over');
            });
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                
                const columnName = e.dataTransfer.getData('text/plain');
                const columnIndex = e.dataTransfer.getData('application/column-index');
                
                if (columnName) {
                    this.mapColumnToPlaceholder(columnName, parseInt(columnIndex), placeholder, placeholderElement);
                }
            });
            
            // Click to select
            dropZone.addEventListener('click', () => {
                this.showColumnSelector(placeholder, placeholderElement);
            });
            
            // Clear mapping button
            placeholderElement.querySelector('.clear-mapping-btn').addEventListener('click', () => {
                this.clearMapping(placeholder, placeholderElement);
            });
            
            container.appendChild(placeholderElement);
            this.placeholderElements.push(placeholderElement);
        });
    }

    mapColumnToPlaceholder(columnName, columnIndex, placeholder, placeholderElement) {
        // Store mapping - now just store the column name
        this.mappings[placeholder] = columnName;
        
        // Update UI
        const dropZone = placeholderElement.querySelector('.drop-zone');
        const mappedColumn = placeholderElement.querySelector('.mapped-column');
        const clearBtn = placeholderElement.querySelector('.clear-mapping-btn');
        
        dropZone.style.display = 'none';
        mappedColumn.style.display = 'block';
        clearBtn.style.display = 'block';
        
        // Update mapped column display
        const sampleData = this.textParser.filteredData[this.sampleRowIndex] || [];
        const sampleValue = sampleData[columnIndex] || '';
        
        mappedColumn.querySelector('.mapped-column-name').textContent = columnName;
        mappedColumn.querySelector('.mapped-column-preview').textContent = this.truncateText(sampleValue, 40);
        
        placeholderElement.classList.add('mapped');
        
        // Update mapping count
        this.updateMappingCount();
        
        // Update preview if in preview mode
        if (this.previewMode) {
            this.updatePreview();
        }
    }

    clearMapping(placeholder, placeholderElement) {
        // Remove mapping
        delete this.mappings[placeholder];
        
        // Update UI
        const dropZone = placeholderElement.querySelector('.drop-zone');
        const mappedColumn = placeholderElement.querySelector('.mapped-column');
        const clearBtn = placeholderElement.querySelector('.clear-mapping-btn');
        
        dropZone.style.display = 'block';
        mappedColumn.style.display = 'none';
        clearBtn.style.display = 'none';
        
        placeholderElement.classList.remove('mapped');
        
        // Update mapping count
        this.updateMappingCount();
        
        // Update preview if in preview mode
        if (this.previewMode) {
            this.updatePreview();
        }
    }

    showColumnSelector(placeholder, placeholderElement) {
        // Create backdrop overlay
        const backdrop = document.createElement('div');
        backdrop.className = 'column-selector-backdrop';
        
        // Create a dropdown selector for columns
        const dropdown = document.createElement('div');
        dropdown.className = 'column-selector-dropdown';
        
        const headers = this.textParser.headers || [];
        
        dropdown.innerHTML = `
            <div class="column-selector-header">Select Column for "${placeholder}"</div>
            <div class="column-selector-list">
                ${headers.map((header, index) => `
                    <div class="column-selector-item" data-column="${header}" data-index="${index}">
                        <span class="column-name">${header}</span>
                        <span class="column-preview">${this.getColumnPreview(index)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="column-selector-footer">
                <button class="column-selector-cancel">Cancel</button>
            </div>
        `;
        
        // Simply center the dropdown using CSS - much cleaner!
        
        // Add both backdrop and dropdown to body
        document.body.appendChild(backdrop);
        document.body.appendChild(dropdown);
        
        // Function to close dropdown
        const closeDropdown = () => {
            backdrop.remove();
            dropdown.remove();
            document.removeEventListener('keydown', handleKeydown);
        };
        
        // Event listeners
        dropdown.querySelectorAll('.column-selector-item').forEach(item => {
            item.addEventListener('click', () => {
                const columnName = item.dataset.column;
                const columnIndex = parseInt(item.dataset.index);
                this.mapColumnToPlaceholder(columnName, columnIndex, placeholder, placeholderElement);
                closeDropdown();
            });
        });
        
        dropdown.querySelector('.column-selector-cancel').addEventListener('click', closeDropdown);
        
        // Close on backdrop click
        backdrop.addEventListener('click', closeDropdown);
        
        // Close on Escape key
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                closeDropdown();
            }
        };
        document.addEventListener('keydown', handleKeydown);
        
        // Focus management for accessibility
        const firstItem = dropdown.querySelector('.column-selector-item');
        if (firstItem) {
            firstItem.focus();
        }
    }

    autoMapColumns() {
        const headers = this.textParser.headers || [];
        
        if (headers.length === 0) {
            this.showMessage('No data columns available for auto-mapping', 'warning');
            return;
        }

        if (this.allPlaceholders.length === 0) {
            this.showMessage('No placeholders found in template for auto-mapping', 'warning');
            return;
        }

        console.log('🤖 Starting Enhanced Auto-Mapping:');
        console.log('Placeholders:', this.allPlaceholders);
        console.log('Headers:', headers);
        
        // Clear existing mappings
        this.clearAllMappings();
        
        let mappedCount = 0;
        let lowConfidenceMappings = [];
        
        // Try to auto-map based on enhanced similarity
        this.allPlaceholders.forEach(placeholder => {
            const bestMatch = this.findBestColumnMatch(placeholder, headers);
            
            if (bestMatch.index !== -1) {
                const placeholderElement = this.placeholderElements.find(el => 
                    el.dataset.placeholder === placeholder
                );
                
                if (placeholderElement) {
                    this.mapColumnToPlaceholder(headers[bestMatch.index], bestMatch.index, placeholder, placeholderElement);
                    mappedCount++;
                    
                    if (bestMatch.confidence < 0.7) {
                        lowConfidenceMappings.push({
                            placeholder,
                            column: headers[bestMatch.index],
                            confidence: bestMatch.confidence
                        });
                    }
                    
                    console.log(`✅ Auto-mapped: "${placeholder}" → "${headers[bestMatch.index]}" (confidence: ${bestMatch.confidence.toFixed(2)})`);
                } else {
                    console.warn(`⚠️ Placeholder element not found for: ${placeholder}`);
                }
            } else {
                console.log(`❌ No match found for: "${placeholder}"`);
            }
        });
        
        // Show results with appropriate messaging
        let message = `Auto-mapping completed! ${mappedCount}/${this.allPlaceholders.length} placeholders mapped.`;
        let messageType = 'success';
        
        if (lowConfidenceMappings.length > 0) {
            message += ` ${lowConfidenceMappings.length} mappings have low confidence - please review them.`;
            messageType = 'warning';
            console.warn('⚠️ Low confidence mappings:', lowConfidenceMappings);
        }
        
        if (mappedCount === 0) {
            message = 'No automatic mappings could be created. Please map manually.';
            messageType = 'warning';
        } else if (mappedCount < this.allPlaceholders.length) {
            message += ` ${this.allPlaceholders.length - mappedCount} placeholders remain unmapped.`;
            messageType = 'warning';
        }
        
        this.showMessage(message, messageType);
    }

    findBestColumnMatch(placeholder, headers) {
        const normalizedPlaceholder = placeholder.toLowerCase().replace(/[_\s\-\.]/g, '');
        let bestMatch = { index: -1, confidence: 0 };

        // Strategy 1: Exact match (highest confidence)
        for (let i = 0; i < headers.length; i++) {
            const normalizedHeader = headers[i].toLowerCase().replace(/[_\s\-\.]/g, '');
            if (normalizedPlaceholder === normalizedHeader) {
                return { index: i, confidence: 1.0 };
            }
        }

        // Strategy 2: Contains match (high confidence)
        for (let i = 0; i < headers.length; i++) {
            const normalizedHeader = headers[i].toLowerCase().replace(/[_\s\-\.]/g, '');
            if (normalizedHeader.includes(normalizedPlaceholder)) {
                const confidence = 0.9 - (Math.abs(normalizedHeader.length - normalizedPlaceholder.length) * 0.05);
                if (confidence > bestMatch.confidence) {
                    bestMatch = { index: i, confidence: Math.max(confidence, 0.8) };
                }
            } else if (normalizedPlaceholder.includes(normalizedHeader) && normalizedHeader.length > 2) {
                const confidence = 0.85 - (Math.abs(normalizedHeader.length - normalizedPlaceholder.length) * 0.03);
                if (confidence > bestMatch.confidence) {
                    bestMatch = { index: i, confidence: Math.max(confidence, 0.75) };
                }
            }
        }

        // Strategy 3: Word-based matching (medium confidence)
        const placeholderWords = placeholder.toLowerCase().split(/[_\s\-\.]+/).filter(w => w.length > 2);
        
        for (let i = 0; i < headers.length; i++) {
            const headerWords = headers[i].toLowerCase().split(/[_\s\-\.]+/).filter(w => w.length > 2);
            let matchScore = 0;
            let totalWords = Math.max(placeholderWords.length, headerWords.length);
            
            placeholderWords.forEach(pWord => {
                headerWords.forEach(hWord => {
                    if (pWord === hWord) {
                        matchScore += 1.0; // Exact word match
                    } else if (pWord.includes(hWord) || hWord.includes(pWord)) {
                        matchScore += 0.7; // Partial word match
                    } else if (this.calculateSimilarity(pWord, hWord) > 0.8) {
                        matchScore += 0.6; // Similar words
                    }
                });
            });
            
            const confidence = Math.min((matchScore / totalWords) * 0.8, 0.8);
            if (confidence > bestMatch.confidence && confidence > 0.4) {
                bestMatch = { index: i, confidence };
            }
        }

        // Strategy 4: Fuzzy matching with Levenshtein (lower confidence)
        for (let i = 0; i < headers.length; i++) {
            const normalizedHeader = headers[i].toLowerCase().replace(/[_\s\-\.]/g, '');
            const similarity = this.calculateSimilarity(normalizedPlaceholder, normalizedHeader);
            
            // More forgiving threshold for fuzzy matching
            if (similarity > bestMatch.confidence && similarity > 0.5) {
                bestMatch = { index: i, confidence: similarity * 0.7 }; // Cap fuzzy match confidence
            }
        }

        // Strategy 5: Acronym matching (medium confidence)
        const placeholderAcronym = placeholder.replace(/[^A-Z]/g, '').toLowerCase();
        if (placeholderAcronym.length >= 2) {
            for (let i = 0; i < headers.length; i++) {
                const headerAcronym = headers[i].replace(/[^A-Z]/g, '').toLowerCase();
                if (placeholderAcronym === headerAcronym && headerAcronym.length >= 2) {
                    const confidence = 0.75;
                    if (confidence > bestMatch.confidence) {
                        bestMatch = { index: i, confidence };
                    }
                }
            }
        }

        // Return best match only if confidence is above minimum threshold
        return bestMatch.confidence >= 0.5 ? bestMatch : { index: -1, confidence: 0 };
    }

    calculateSimilarity(str1, str2) {
        // Enhanced similarity calculation with debug logging
        if (str1 === str2) return 1.0;
        if (str1.length === 0 || str2.length === 0) return 0;
        
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        const distance = this.levenshteinDistance(longer, shorter);
        const similarity = (longer.length - distance) / longer.length;
        
        // Debug logging for similarity calculations
        if (similarity > 0.4) {
            console.log(`🔍 Similarity: "${str1}" ↔ "${str2}" = ${similarity.toFixed(3)} (distance: ${distance})`);
        }
        
        return similarity;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[str2.length][str1.length];
    }

    clearAllMappings() {
        this.mappings = {};
        
        this.placeholderElements.forEach(placeholderElement => {
            const placeholder = placeholderElement.dataset.placeholder;
            this.clearMapping(placeholder, placeholderElement);
        });
        
        this.showMessage('All mappings cleared', 'info');
    }

    updateMappingCount() {
        const mappedCount = Object.keys(this.mappings).length;
        const totalCount = this.allPlaceholders.length;
        
        this.editorModal.querySelector('#mappingCount').textContent = 
            `${mappedCount} of ${totalCount} mapped`;
        
        // Enable/disable generate button
        const generateBtn = this.editorModal.querySelector('#generateReportBtn');
        generateBtn.disabled = mappedCount === 0;
    }

    getColumnType(columnIndex) {
        const data = this.textParser.filteredData || [];
        if (data.length === 0) return 'text';
        
        // Sample a few values to determine type
        const samples = data.slice(0, 10).map(row => row[columnIndex]).filter(val => val);
        
        const numericCount = samples.filter(val => !isNaN(parseFloat(val))).length;
        const dateCount = samples.filter(val => this.textParser.parseAnyDate && this.textParser.parseAnyDate(val)).length;
        
        if (numericCount > samples.length * 0.7) return 'number';
        if (dateCount > samples.length * 0.7) return 'date';
        return 'text';
    }

    getColumnPreview(columnIndex) {
        const sampleData = this.textParser.filteredData[this.sampleRowIndex] || [];
        const value = sampleData[columnIndex] || '';
        return this.truncateText(value, 20);
    }

    truncateText(text, maxLength) {
        const str = String(text || '');
        return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
    }

    async generateReport() {
        try {
            this.showLoading('Generating Word document...');
            
            const settings = this.getGenerationSettings();
            const mappedData = this.prepareMappedData(settings);
            
            // Always generate Word documents
            await this.generateWordReport(mappedData, settings);
            
            this.hideLoading();
            this.showMessage('Word document generated successfully!', 'success');
            
        } catch (error) {
            console.error('Error generating document:', error);
            this.hideLoading();
            this.showMessage('Failed to generate document: ' + error.message, 'error');
        }
    }

    getGenerationSettings() {
        const modal = this.editorModal;
        
        return {
            mode: 'single', // Always single document mode
            outputFormat: 'docx', // Always Word documents
            rowLimit: parseInt(modal.querySelector('#rowLimit').value) || 100
        };
    }

    prepareMappedData(settings) {
        const filteredData = this.textParser.filteredData || [];
        const headers = this.textParser.headers || [];
        
        const limitedData = settings.rowLimit ? 
            filteredData.slice(0, settings.rowLimit) : filteredData;
        
        return limitedData.map(row => {
            const mappedRow = {};
            
            // Create mapping for each placeholder to its corresponding data value
            Object.keys(this.mappings).forEach(placeholder => {
                const columnName = this.mappings[placeholder];
                const columnIndex = headers.indexOf(columnName);
                mappedRow[placeholder] = row[columnIndex] || ''; // Key by placeholder, not columnName
            });
            
            return mappedRow;
        });
    }

    async generateWordReport(mappedData, settings) {
        // Always generate single document with all rows
        await this.generateSingleDocumentWithAllRows(mappedData, settings);
    }

    async generateSingleDocumentWithAllRows(mappedData, settings) {
        try {
            this.showLoading(`Generating single document with ${mappedData.length} sections...`);
            
            if (!mappedData || mappedData.length === 0) {
                throw new Error('No mapped data available');
            }
            
            // Method 1: Try to use DOCX template concatenation if available
            if (typeof DocxReplace.createEmpty !== 'undefined') {
                await this.generateWithDocxConcatenation(mappedData, settings);
            } else {
                // Method 2: Use template replication method
                await this.generateWithTemplateReplication(mappedData, settings);
            }
            
        } catch (error) {
            console.error('Single document generation error:', error);
            throw new Error('Failed to generate single document with all rows: ' + error.message);
        }
    }

    async generateWithTemplateReplication(mappedData, settings) {
        try {
            console.log('🔄 Starting template replication with enhanced placeholder replacement...');
            
            // Generate separate documents for each row, then combine them
            const processedDocuments = [];
            
            for (let i = 0; i < mappedData.length; i++) {
                const rowData = mappedData[i];
                console.log(`📝 Processing row ${i + 1}/${mappedData.length}:`, rowData);
                
                // Create a fresh copy of the template for this row
                const templateCopy = await DocxReplace.load(await this.templateDoc.generate());
                
                // Use the enhanced replaceAll method which handles all bracket styles
                templateCopy.replaceAll(rowData);
                
                // Generate the processed document
                const processedDoc = await templateCopy.generate();
                processedDocuments.push(processedDoc);
            }
            
            // Now combine all processed documents into one
            await this.combineDocuments(processedDocuments, settings);
            
        } catch (error) {
            console.error('Template replication error:', error);
            throw error;
        }
    }

    async combineDocuments(processedDocuments, settings) {
        try {
            console.log(`📄 Combining ${processedDocuments.length} processed documents...`);
            
            // Use the first document as the base
            const combinedZip = await JSZip.loadAsync(processedDocuments[0]);
            let combinedDocumentXml = await combinedZip.file('word/document.xml').async('text');
            
            // Parse the combined document XML
            const parser = new DOMParser();
            const serializer = new XMLSerializer();
            const xmlDoc = parser.parseFromString(combinedDocumentXml, 'text/xml');
            const body = xmlDoc.getElementsByTagName('w:body')[0];
            
            if (!body) {
                throw new Error('Invalid document structure - no body found');
            }
            
            // Add content from additional documents
            for (let i = 1; i < processedDocuments.length; i++) {
                const docZip = await JSZip.loadAsync(processedDocuments[i]);
                const docXml = await docZip.file('word/document.xml').async('text');
                const docParsed = parser.parseFromString(docXml, 'text/xml');
                const docBody = docParsed.getElementsByTagName('w:body')[0];
                
                if (docBody) {
                    // Add page break before this section
                    this.addPageBreakToXML(body);
                    
                    // Add all content from this document's body
                    Array.from(docBody.children).forEach(element => {
                        if (element.tagName !== 'w:sectPr') { // Skip section properties
                            body.appendChild(xmlDoc.importNode(element, true));
                        }
                    });
                }
            }
            
            // Update the combined document XML
            combinedDocumentXml = serializer.serializeToString(xmlDoc);
            combinedZip.file('word/document.xml', combinedDocumentXml);
            
            // Generate the final combined document
            const finalDocx = await combinedZip.generateAsync({type: 'arraybuffer'});
            
            // Download the document
            this.downloadFile(finalDocx, 'combined_word_document.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            
            this.showMessage(`Word document generated with ${processedDocuments.length} sections!`, 'success');
            
        } catch (error) {
            console.error('Document combination error:', error);
            throw error;
        }
    }

    addPageBreakToXML(body) {
        // Create page break paragraph
        const pageBreakPara = body.ownerDocument.createElement('w:p');
        const pageBreakRun = body.ownerDocument.createElement('w:r');
        const pageBreakElement = body.ownerDocument.createElement('w:br');
        pageBreakElement.setAttribute('w:type', 'page');
        
        pageBreakRun.appendChild(pageBreakElement);
        pageBreakPara.appendChild(pageBreakRun);
        body.appendChild(pageBreakPara);
    }

    saveTemplate() {
        const templateConfig = {
            mappings: this.mappings,
            settings: this.getGenerationSettings(),
            templateInfo: {
                bookmarks: this.templateBookmarks,
                placeholders: this.templatePlaceholders
            }
        };
        
        const configBlob = new Blob([JSON.stringify(templateConfig, null, 2)], 
            { type: 'application/json' });
        this.downloadFile(configBlob, 'template_config.json', 'application/json');
        
        this.showMessage('Template configuration saved', 'success');
    }

    loadTemplate() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const text = await file.text();
                    const config = JSON.parse(text);
                    
                    // Load mappings
                    this.mappings = config.mappings || {};
                    
                    // Update UI
                    this.refreshMappingDisplay();
                    
                    this.showMessage('Template configuration loaded', 'success');
                    
                } catch (error) {
                    this.showMessage('Failed to load template configuration', 'error');
                }
            }
        });
        
        input.click();
    }

    refreshMappingDisplay() {
        // Refresh the placeholder elements to show loaded mappings
        const headers = this.textParser.headers || [];
        
        this.placeholderElements.forEach(placeholderElement => {
            const placeholder = placeholderElement.dataset.placeholder;
            const columnName = this.mappings[placeholder];
            
            if (columnName) {
                const columnIndex = headers.indexOf(columnName);
                this.mapColumnToPlaceholder(
                    columnName, 
                    columnIndex, 
                    placeholder, 
                    placeholderElement
                );
            } else {
                this.clearMapping(placeholder, placeholderElement);
            }
        });
    }

    downloadFile(data, filename, mimeType) {
        const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    closeEditor() {
        if (this.editorModal) {
            this.editorModal.classList.remove('show');
            // Re-enable body scrolling
            document.body.style.overflow = '';
            setTimeout(() => {
                this.editorModal.remove();
                this.editorModal = null;
            }, 300);
        }
    }

    showLoading(message) {
        if (this.wordTemplateGenerator.showLoading) {
            this.wordTemplateGenerator.showLoading(message);
        }
    }

    hideLoading() {
        if (this.wordTemplateGenerator.hideLoading) {
            this.wordTemplateGenerator.hideLoading();
        }
    }

    showMessage(message, type) {
        if (type === 'success' && this.wordTemplateGenerator.showSuccess) {
            this.wordTemplateGenerator.showSuccess(message);
        } else if (type === 'error' && this.wordTemplateGenerator.showError) {
            this.wordTemplateGenerator.showError(message);
        } else if (this.wordTemplateGenerator.showSuccess) {
            this.wordTemplateGenerator.showSuccess(message);
        }
    }
}

// Export for use in other modules
window.TemplateEditor = TemplateEditor;
