/**
 * Word Template Generator Module
 * Handles Word document template processing and PDF generation from parsed data
 */

class WordTemplateGenerator {
    constructor(textParserInstance) {
        this.textParser = textParserInstance;
        this.templateDoc = null;
        this.templateBookmarks = [];
        this.templatePlaceholders = [];
        this.floatingButton = null;
        this.templateModal = null;
        this.templateEditor = null;
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Listen for successful data parsing to show floating button
        document.addEventListener('dataParsingComplete', (event) => {
            this.showFloatingButton();
        });
    }

    showFloatingButton() {
        // Remove existing button if any
        this.hideFloatingButton();
        
        // Create floating mail button
        this.floatingButton = document.createElement('div');
        this.floatingButton.className = 'floating-mail-button';
        this.floatingButton.innerHTML = `
            <div class="floating-button-content">
                <i class="material-icons">mail</i>
                <span class="floating-button-text">Mail Merge</span>
            </div>
        `;
        
        // Add click handler
        this.floatingButton.addEventListener('click', () => {
            this.openTemplateUpload();
        });
        
        // Append to body
        document.body.appendChild(this.floatingButton);
        
        // Animate in
        setTimeout(() => {
            this.floatingButton.classList.add('show');
        }, 100);
    }

    hideFloatingButton() {
        if (this.floatingButton) {
            this.floatingButton.remove();
            this.floatingButton = null;
        }
    }

    openTemplateUpload() {
        // Create modal for template upload
        this.createTemplateModal();
    }

    createTemplateModal() {
        // Remove existing modal if any
        this.closeTemplateModal();
        
        // Create modal overlay
        this.templateModal = document.createElement('div');
        this.templateModal.className = 'template-modal-overlay';
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'template-modal-content';
        
        modalContent.innerHTML = `
            <div class="template-modal-header">
                <h3>Word Template Generator</h3>
                <button class="template-modal-close" aria-label="Close">
                    <i class="material-icons">close</i>
                </button>
            </div>
            
            <div class="template-modal-body">
                <div class="template-upload-section">
                    <div class="template-upload-zone" id="templateUploadZone">
                        <i class="material-icons">upload_file</i>
                        <h4>Upload Word Template</h4>
                        <p>Drop a .docx file here or click to browse</p>
                        <p><small>The template should contain bookmarks where you want to insert data</small></p>
                        <input type="file" id="templateFileInput" accept=".docx" style="display: none;">
                    </div>
                </div>
                
                <div class="template-info-section" id="templateInfoSection" style="display: none;">
                    <div class="template-file-info">
                        <h4>Template Loaded</h4>
                        <p id="templateFileName">No file selected</p>
                        <p id="templateBookmarkCount">0 bookmarks found</p>
                    </div>
                    
                    <div class="available-columns">
                        <h4>Available Data Columns</h4>
                        <div class="columns-list" id="templateColumnsList">
                            <!-- Columns will be populated here -->
                        </div>
                    </div>
                    
                    <div class="template-actions">
                        <button class="template-btn template-btn-secondary" id="changeTemplateBtn">
                            Change Template
                        </button>
                        <button class="template-btn template-btn-primary" id="openEditorBtn" disabled>
                            Open Template Editor
                        </button>
                        <button class="template-btn template-btn-primary" id="generatePdfBtn" disabled>
                            Quick Generate (All Rows)
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.templateModal.appendChild(modalContent);
        document.body.appendChild(this.templateModal);
        
        // Setup event listeners for modal
        this.setupModalEventListeners();
        
        // Show modal with animation
        setTimeout(() => {
            this.templateModal.classList.add('show');
        }, 50);
    }

    setupModalEventListeners() {
        const modal = this.templateModal;
        const uploadZone = modal.querySelector('#templateUploadZone');
        const fileInput = modal.querySelector('#templateFileInput');
        const closeBtn = modal.querySelector('.template-modal-close');
        const changeTemplateBtn = modal.querySelector('#changeTemplateBtn');
        const openEditorBtn = modal.querySelector('#openEditorBtn');
        const generatePdfBtn = modal.querySelector('#generatePdfBtn');
        
        // Close modal
        closeBtn.addEventListener('click', () => this.closeTemplateModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeTemplateModal();
        });
        
        // Upload zone interactions
        uploadZone.addEventListener('click', () => fileInput.click());
        uploadZone.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadZone.addEventListener('drop', this.handleTemplateDrop.bind(this));
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.processTemplateFile(e.target.files[0]);
            }
        });
        
        // Change template button
        changeTemplateBtn.addEventListener('click', () => {
            this.resetTemplateUpload();
        });
        
        // Open editor button
        openEditorBtn.addEventListener('click', () => {
            this.openTemplateEditor();
        });
        
        // Generate PDF button (quick generate with first row)
        generatePdfBtn.addEventListener('click', () => {
            this.generateQuickReport();
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('dragover');
    }

    handleTemplateDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].name.toLowerCase().endsWith('.docx')) {
            this.processTemplateFile(files[0]);
        } else {
            this.showError('Please upload a valid .docx file');
        }
    }

    async processTemplateFile(file) {
        try {
            this.showLoading('Processing Word template...');
            
            // Read file as array buffer
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            
            // Check if DocxReplace is available
            if (typeof DocxReplace === 'undefined') {
                throw new Error('DocxReplace library not loaded. Please refresh the page.');
            }
            
            // Load with DocxReplace library
            this.templateDoc = await DocxReplace.load(arrayBuffer);
            
            // Get both bookmarks and placeholders from template
            let templateInfo;
            if (typeof this.templateDoc.getPlaceholders === 'function') {
                // Use enhanced method if available
                templateInfo = this.templateDoc.getPlaceholders();
                this.templateBookmarks = templateInfo.bookmarks || [];
                this.templatePlaceholders = templateInfo.placeholders || [];
                this.placeholderInfo = templateInfo.placeholderInfo || {};
            } else {
                // Fallback to basic method
                this.templateBookmarks = this.templateDoc.getBookmarks ? this.templateDoc.getBookmarks() : [];
                this.templatePlaceholders = [];
                this.placeholderInfo = {};
                templateInfo = { bookmarks: this.templateBookmarks, placeholders: [] };
            }
            
            const totalPlaceholders = this.templateBookmarks.length + this.templatePlaceholders.length;
            
            // Log detected placeholder patterns for debugging (only for small templates)
            if (Object.keys(this.placeholderInfo).length > 0 && Object.keys(this.placeholderInfo).length <= 5) {
                console.log('Detected placeholder patterns:');
                Object.entries(this.placeholderInfo).slice(0, 3).forEach(([placeholder, info]) => {
                    console.log(`  ${placeholder} → ${info.pattern}`);
                });
                if (Object.keys(this.placeholderInfo).length > 3) {
                    console.log(`  ... and ${Object.keys(this.placeholderInfo).length - 3} more`);
                }
            }
            
            // Update UI
            this.updateTemplateInfo(file.name, totalPlaceholders);
            this.populateAvailableColumns();
            
            this.hideLoading();
            this.showSuccess(`Template loaded successfully with ${totalPlaceholders} placeholders`);
            
        } catch (error) {
            console.error('Error processing template:', error);
            this.hideLoading();
            this.showError('Failed to process Word template: ' + error.message);
        }
    }

    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    updateTemplateInfo(fileName, bookmarkCount) {
        const modal = this.templateModal;
        const uploadSection = modal.querySelector('.template-upload-section');
        const infoSection = modal.querySelector('#templateInfoSection');
        const fileNameEl = modal.querySelector('#templateFileName');
        const bookmarkCountEl = modal.querySelector('#templateBookmarkCount');
        const openEditorBtn = modal.querySelector('#openEditorBtn');
        const generateBtn = modal.querySelector('#generatePdfBtn');
        
        // Hide upload section and show info section
        uploadSection.style.display = 'none';
        infoSection.style.display = 'block';
        
        // Update info
        fileNameEl.textContent = fileName;
        bookmarkCountEl.textContent = `${bookmarkCount} placeholders found`;
        
        // Enable buttons if we have placeholders
        const hasPlaceholders = bookmarkCount > 0;
        openEditorBtn.disabled = !hasPlaceholders;
        generateBtn.disabled = !hasPlaceholders;
    }

    populateAvailableColumns() {
        const columnsList = this.templateModal.querySelector('#templateColumnsList');
        // Use visible headers instead of all headers to respect column management
        const visibleHeaders = this.textParser.getVisibleHeaders ? 
            this.textParser.getVisibleHeaders() : 
            (this.textParser.headers || []);
        
        columnsList.innerHTML = '';
        
        if (visibleHeaders.length === 0) {
            columnsList.innerHTML = '<p class="no-columns">No visible data columns available</p>';
            return;
        }
        
        visibleHeaders.forEach((header, index) => {
            const columnItem = document.createElement('div');
            columnItem.className = 'column-item';
            columnItem.innerHTML = `
                <span class="column-name">${header}</span>
                <button class="copy-placeholder-btn" data-column="${header}" title="Copy placeholder">
                    <i class="material-icons">content_copy</i>
                </button>
            `;
            
            // Add click handler for copy button
            const copyBtn = columnItem.querySelector('.copy-placeholder-btn');
            copyBtn.addEventListener('click', () => {
                this.copyPlaceholderToClipboard(header);
            });
            
            columnsList.appendChild(columnItem);
        });
    }

    copyPlaceholderToClipboard(columnName) {
        const placeholder = `{{${columnName}}}`;
        
        navigator.clipboard.writeText(placeholder).then(() => {
            this.showSuccess(`Copied: ${placeholder}`);
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = placeholder;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showSuccess(`Copied: ${placeholder}`);
        });
    }

    resetTemplateUpload() {
        const modal = this.templateModal;
        const uploadSection = modal.querySelector('.template-upload-section');
        const infoSection = modal.querySelector('#templateInfoSection');
        const fileInput = modal.querySelector('#templateFileInput');
        
        // Reset state
        this.templateDoc = null;
        this.templateBookmarks = [];
        this.templatePlaceholders = [];
        
        // Reset UI
        uploadSection.style.display = 'block';
        infoSection.style.display = 'none';
        fileInput.value = '';
    }

    openTemplateEditor() {
        if (!this.templateDoc) {
            this.showError('No template loaded');
            return;
        }
        
        // Initialize template editor if not already done
        if (!this.templateEditor && typeof TemplateEditor !== 'undefined') {
            this.templateEditor = new TemplateEditor(this);
        }
        
        if (this.templateEditor) {
            // Hide the current modal
            this.closeTemplateModal();
            
            // Show the template editor
            const templateInfo = {
                bookmarks: this.templateBookmarks,
                placeholders: this.templatePlaceholders
            };
            
            this.templateEditor.showEditor(this.templateDoc, templateInfo);
        } else {
            this.showError('Template editor not available. Please reload the page.');
        }
    }

    async generateQuickReport() {
        if (!this.templateDoc || !this.textParser.filteredData) {
            this.showError('No template or data available');
            return;
        }
        
        try {
            this.showLoading('Generating Word document with all rows...');
            
            const filteredData = this.textParser.filteredData;
            const headers = this.textParser.headers;
            
            if (filteredData.length === 0) {
                throw new Error('No data rows available');
            }
            
            // Always generate Word document with all rows
            if (filteredData.length === 1) {
                // Single row - simple replacement
                await this.generateSingleDocx(filteredData[0], headers);
            } else {
                // Multiple rows - generate combined document
                await this.generateMultiRowWordDocument(filteredData, headers);
            }
            
            this.hideLoading();
            this.closeTemplateModal();
            
        } catch (error) {
            console.error('Error generating report:', error);
            this.hideLoading();
            this.showError('Failed to generate report: ' + error.message);
        }
    }

    async generateMultiRowWordDocument(filteredData, headers) {
        try {
            // Create enhanced auto-mapping for quick generation
            const quickMappings = {};
            const placeholders = [...this.templateBookmarks, ...this.templatePlaceholders];
            
            // Enhanced auto-mapping with multiple strategies
            placeholders.forEach(placeholder => {
                const bestMatch = this.findBestQuickMatch(placeholder, headers);
                quickMappings[placeholder] = bestMatch;
            });
            
            // Prepare mapped data
            const mappedData = filteredData.map(row => {
                const mappedRow = {};
                Object.entries(quickMappings).forEach(([placeholder, columnName]) => {
                    const columnIndex = headers.indexOf(columnName);
                    mappedRow[placeholder] = row[columnIndex] || ''; // Key by placeholder, not columnName
                });
                return mappedRow;
            });
            
            // Generate combined Word document
            await this.generateCombinedWordDocument(mappedData, quickMappings);
            
            this.showSuccess(`Combined Word document generated with ${filteredData.length} sections!`);
            
        } catch (error) {
            throw new Error('Multi-row Word document generation failed: ' + error.message);
        }
    }

    findBestQuickMatch(placeholder, headers) {
        const normalizedPlaceholder = placeholder.toLowerCase().replace(/[_\s\-\.]/g, '');
        
        // Strategy 1: Exact match (case insensitive)
        const exactMatch = headers.find(header => 
            header.toLowerCase().replace(/[_\s\-\.]/g, '') === normalizedPlaceholder
        );
        if (exactMatch) return exactMatch;
        
        // Strategy 2: Contains match (both directions)
        const containsMatch = headers.find(header => {
            const normalizedHeader = header.toLowerCase().replace(/[_\s\-\.]/g, '');
            return normalizedHeader.includes(normalizedPlaceholder) || 
                   normalizedPlaceholder.includes(normalizedHeader);
        });
        if (containsMatch) return containsMatch;
        
        // Strategy 3: Word-based matching
        const placeholderWords = placeholder.toLowerCase().split(/[_\s\-\.]+/).filter(w => w.length > 2);
        let bestMatch = null;
        let bestScore = 0;
        
        headers.forEach(header => {
            const headerWords = header.toLowerCase().split(/[_\s\-\.]+/).filter(w => w.length > 2);
            let matchCount = 0;
            
            placeholderWords.forEach(pWord => {
                headerWords.forEach(hWord => {
                    if (pWord.includes(hWord) || hWord.includes(pWord)) {
                        matchCount++;
                    }
                });
            });
            
            const score = matchCount / Math.max(placeholderWords.length, headerWords.length);
            if (score > bestScore && score > 0.3) {
                bestScore = score;
                bestMatch = header;
            }
        });
        
        if (bestMatch) return bestMatch;
        
        // Strategy 4: Fuzzy matching with Levenshtein distance
        let bestFuzzyMatch = null;
        let bestFuzzyScore = 0;
        
        headers.forEach(header => {
            const normalizedHeader = header.toLowerCase().replace(/[_\s\-\.]/g, '');
            const similarity = this.calculateQuickSimilarity(normalizedPlaceholder, normalizedHeader);
            
            if (similarity > bestFuzzyScore && similarity > 0.6) {
                bestFuzzyScore = similarity;
                bestFuzzyMatch = header;
            }
        });
        
        if (bestFuzzyMatch) return bestFuzzyMatch;
        
        // Strategy 5: Fallback to first column with warning
        console.warn(`⚠️ No good match found for "${placeholder}", using first column: "${headers[0]}"`);
        return headers[0] || placeholder; // Ultimate fallback
    }

    calculateQuickSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        if (str1.length === 0 || str2.length === 0) return 0;
        
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
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

    async generateCombinedWordDocument(mappedData, quickMappings) {
        try {
            // Get the original template content
            const originalDocx = await this.templateDoc.generate();
            
            // Create a new JSZip instance for the combined document
            const combinedZip = await JSZip.loadAsync(originalDocx);
            let combinedDocumentXml = await combinedZip.file('word/document.xml').async('text');
            
            // Parse the document XML
            const parser = new DOMParser();
            const serializer = new XMLSerializer();
            const xmlDoc = parser.parseFromString(combinedDocumentXml, 'text/xml');
            
            // Get the document body
            const body = xmlDoc.getElementsByTagName('w:body')[0];
            if (!body) {
                throw new Error('Invalid document structure - no body found');
            }
            
            // Get all content before the closing body tag (original template content)
            const originalContent = Array.from(body.children);
            
            // Clear the body to rebuild it
            body.innerHTML = '';
            
            // Add content for each row
            mappedData.forEach((rowData, index) => {
                // Clone original content for this row
                originalContent.forEach(element => {
                    const clonedElement = element.cloneNode(true);
                    
                    // Replace placeholders in this cloned element
                    this.replaceXMLPlaceholdersQuick(clonedElement, rowData, quickMappings);
                    
                    body.appendChild(clonedElement);
                });
                
                // Add page break between sections (except after the last one)
                if (index < mappedData.length - 1) {
                    this.addPageBreakToXMLQuick(body);
                }
            });
            
            // Update the document XML
            combinedDocumentXml = serializer.serializeToString(xmlDoc);
            combinedZip.file('word/document.xml', combinedDocumentXml);
            
            // Generate the final document
            const finalDocx = await combinedZip.generateAsync({type: 'arraybuffer'});
            
            // Download the document
            this.downloadFile(finalDocx, 'combined_report_all_rows.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            
        } catch (error) {
            console.error('Combined document generation error:', error);
            throw error;
        }
    }

    replaceXMLPlaceholdersQuick(element, rowData, quickMappings) {
        // Get all text nodes within the element
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        
        // Replace placeholders in text content
        textNodes.forEach(textNode => {
            let textContent = textNode.textContent;
            let modified = false;
            
            // Replace mapped placeholders
            Object.keys(quickMappings).forEach(placeholder => {
                const value = rowData[placeholder] || ''; // Now rowData is keyed by placeholder
                
                // Replace both bookmark style and {{}} style placeholders
                const bookmarkRegex = new RegExp(placeholder, 'g');
                const placeholderRegex = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g');
                
                if (bookmarkRegex.test(textContent) || placeholderRegex.test(textContent)) {
                    textContent = textContent.replace(bookmarkRegex, this.escapeXMLText(value));
                    textContent = textContent.replace(placeholderRegex, this.escapeXMLText(value));
                    modified = true;
                }
            });
            
            // Update the text content if modified
            if (modified) {
                textNode.textContent = textContent;
            }
        });
    }

    addPageBreakToXMLQuick(body) {
        // Create page break paragraph
        const pageBreakPara = body.ownerDocument.createElement('w:p');
        const pageBreakRun = body.ownerDocument.createElement('w:r');
        const pageBreakElement = body.ownerDocument.createElement('w:br');
        pageBreakElement.setAttribute('w:type', 'page');
        
        pageBreakRun.appendChild(pageBreakElement);
        pageBreakPara.appendChild(pageBreakRun);
        body.appendChild(pageBreakPara);
    }

    escapeXMLText(text) {
        if (typeof text !== 'string') {
            text = String(text);
        }
        
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    async generateMultiPagePDF(filteredData, headers) {
        try {
            // Create simple auto-mapping for quick generation
            const quickMappings = {};
            const placeholders = [...this.templateBookmarks, ...this.templatePlaceholders];
            
            // Auto-map placeholders to similar column names
            placeholders.forEach(placeholder => {
                const bestMatch = headers.find(header => 
                    header.toLowerCase().includes(placeholder.toLowerCase()) ||
                    placeholder.toLowerCase().includes(header.toLowerCase())
                ) || headers[0]; // fallback to first column
                quickMappings[placeholder] = bestMatch;
            });
            
            // Generate HTML pages
            const htmlPages = await this.generateHTMLPagesQuick(filteredData, headers, quickMappings);
            
            // Configure PDF options
            const pdfOptions = {
                margin: [10, 15, 10, 15],
                filename: 'generated_report.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };
            
            // Generate and save PDF
            await html2pdf()
                .set(pdfOptions)
                .from(htmlPages)
                .save();
                
            this.showSuccess(`Multi-page PDF generated successfully with ${filteredData.length} pages!`);
            
        } catch (error) {
            throw new Error('Multi-page PDF generation failed: ' + error.message);
        }
    }

    async generateSingleDocx(firstRow, headers) {
        try {
            // Create simple replacements object using first row
            const replacements = {};
            headers.forEach((header, index) => {
                replacements[header] = firstRow[index] || '';
            });
            
            // Replace both bookmarks and placeholders in template
            if (typeof this.templateDoc.replaceAll === 'function') {
                this.templateDoc.replaceAll(replacements);
            } else {
                // Fallback to basic method
                this.templateDoc.replaceBookmarks(replacements);
            }
            
            // Generate modified DOCX
            const modifiedDocx = await this.templateDoc.generate();
            
            // Download the DOCX
            this.downloadFile(modifiedDocx, 'generated_report.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            
            this.showSuccess('Single document generated successfully!');
            
        } catch (error) {
            throw new Error('Single document generation failed: ' + error.message);
        }
    }

    async generateHTMLPagesQuick(filteredData, headers, quickMappings) {
        // Create simple HTML template
        const placeholderList = [...this.templateBookmarks, ...this.templatePlaceholders];
        
        const templateHTML = `
            <div style="margin: 20px 0;">
                <h2 style="color: #333; margin-bottom: 20px;">Generated Report</h2>
                ${placeholderList.map(placeholder => 
                    `<div style="margin: 10px 0; padding: 8px; border-bottom: 1px solid #eee;">
                        <strong style="color: #666;">${placeholder}:</strong> 
                        <span style="margin-left: 10px;">${placeholder}</span>
                    </div>`
                ).join('')}
            </div>
        `;
        
        // Generate pages
        const pages = filteredData.map((row, index) => {
            let pageHTML = templateHTML;
            
            // Replace placeholders with actual data
            Object.entries(quickMappings).forEach(([placeholder, columnName]) => {
                const columnIndex = headers.indexOf(columnName);
                const value = row[columnIndex] || '';
                pageHTML = pageHTML.replace(new RegExp(placeholder, 'g'), this.escapeHTML(value));
            });
            
            const pageBreak = index < filteredData.length - 1 ? 
                '<div style="page-break-after: always;"></div>' : '';
            
            return `
                <div class="pdf-page" style="
                    width: 210mm; min-height: 297mm; padding: 20mm; margin: 0;
                    background: white; font-family: Arial, sans-serif; font-size: 12pt;
                    line-height: 1.4; color: #000; box-sizing: border-box;
                ">
                    ${pageHTML}
                </div>
                ${pageBreak}
            `;
        });
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Generated Report</title>
                <style>
                    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
                    @media print { .pdf-page { page-break-after: always; } }
                </style>
            </head>
            <body>
                ${pages.join('')}
            </body>
            </html>
        `;
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    downloadFile(data, filename, mimeType) {
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    closeTemplateModal() {
        if (this.templateModal) {
            this.templateModal.classList.remove('show');
            setTimeout(() => {
                this.templateModal.remove();
                this.templateModal = null;
            }, 300);
        }
    }

    showLoading(message) {
        // Reuse the text parser's loading system
        if (this.textParser && this.textParser.showLoading) {
            this.textParser.showLoading(message);
        }
    }

    hideLoading() {
        // Reuse the text parser's loading system
        if (this.textParser && this.textParser.hideLoading) {
            this.textParser.hideLoading();
        }
    }

    showSuccess(message) {
        if (this.textParser && this.textParser.showSuccessMessage) {
            this.textParser.showSuccessMessage(message);
        }
    }

    showError(message) {
        if (this.textParser && this.textParser.showErrorMessage) {
            this.textParser.showErrorMessage(message);
        }
    }

    // Cleanup method
    destroy() {
        this.hideFloatingButton();
        this.closeTemplateModal();
        
        // Cleanup template editor
        if (this.templateEditor && this.templateEditor.closeEditor) {
            this.templateEditor.closeEditor();
        }
    }
}

// Export for use in other modules
window.WordTemplateGenerator = WordTemplateGenerator;
