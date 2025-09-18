/**
 * Text Parser Module
 * Handles various text file formats and provides advanced data table functionality
 */

/**
 * TextParser - Main handler for parsing various text file formats
 * 
 * EXPANDABLE ARCHITECTURE:
 * ========================
 * 
 * File Type Detection:
 * - Filename patterns (e.g., "Deposits_Balance_File*" → bank-deposits parser)
 * - Extension-based detection (.csv → delimited, .log → regex, etc.)
 * - Content-based hints (keywords in filename)
 * 
 * Parser System:
 * - Uses parser registry for easy extensibility
 * - Specialized parsers in separate files (e.g., bankDepositsParser.js)
 * - Main textParser.js delegates to appropriate specialized parser
 * 
 * Adding New Parsers:
 * 1. Create specialized parser file (e.g., newTypeParser.js)
 * 2. Register parser: textParser.registerParser('new-type', newParserFunction)
 * 3. Add detection logic in autoDetectParser()
 * 4. Add option to parser type dropdown
 * 
 * Current Specialized Parsers:
 * - bankDepositsParser.js: Handles bank deposit reports with advanced analysis
 */

class TextParser {
    constructor() {
        this.data = [];
        this.headers = [];
        this.originalData = [];
        this.currentPage = 1;
        this.pageSize = 25;
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.hiddenColumns = new Set();
        this.filteredData = [];
        this.columnFilters = {}; // Store active filters for each column
        
        // Performance optimization: Debounced analysis system
        this.analysisTimer = null;
        this.analysisDelay = 300; // 300ms debounce delay
        this.isAnalysisDirty = false;
        this.cachedStats = null;
        
        // Performance optimization: Virtual scrolling system
        this.virtualScrolling = {
            enabled: false,
            rowHeight: 35, // Standard row height in pixels
            containerHeight: 400, // Default container height
            visibleRows: 0, // Number of rows that fit in viewport
            bufferRows: 5, // Extra rows to render for smooth scrolling
            scrollTop: 0,
            startIndex: 0,
            endIndex: 0,
            totalHeight: 0
        };
        
        // Default hidden columns list (case-insensitive matching)
        this.defaultHiddenColumns = new Set([
            'GENDER', 'MOBILE_BANKING', 'FATHER_NAME', 'EMAIL', 'Uncleared Balance', 
            'OCC Balance', 'Irregularity', 'IRAC New', 'IRAC Old', 'Last Limit Approved Date',
            'UIPY', 'INCA', 'Total URI', 'Increment', 'Accrual', 'Adjustment', 'Penal Interest',
            'Total Outstanding', 'Disbursement Date', 'EMI Paid', 'EMI Pending', 'Status Code 1',
            'Status Code 2', 'Unapplied Amount', 'GL Code', 'Days Past Due', 'Interest Due',
            'Total Due', 'Classification Code', 'Current Rate', 'Base Rate', 'Spread Rate',
            'Penal Rate', 'Provision Amount', 'Next Due Date', 'Principal Due', 'Interest Accrued',
            'EMI Due', 'Charges Due', 'Penal Charges', 'Advance EMI', 'Excess Payment',
            'Advance Interest', 'Current Balance', 'Last Payment Date', 'Payment Status',
            'Last Review Date', 'Original Sanctioned', 'Insurance Premium', 'Processing Fee',
            'Legal Fee', 'Documentation Fee', 'CIBIL Score', 'Risk Category', 'Prod Code',
            'Collection Amount', 'Status', 'Card Issued', 'INB Flag', 'Nominee', 'Interest Available',
            'SB_BAL', 'CD_BAL', 'INTERNET_BANKING', 'ATM_FLAG', 'CUSTOMER_TYPE', 'CREATE_DT'
        ]);
        
        this.loadingOverlay = null;
    this.currentFileName = null; // Track current file name for presets
    // Pending UI state when elements are not mounted yet
    this.pendingParserType = null;
    this.pendingDelimiter = null;
        
        // Word Template Generator integration
        this.wordTemplateGenerator = null;
        
        // Parser registry for extensibility
        this.parsers = {
            'bank-deposits': (content) => this.parseBankDeposits(content),
            'bgl-accounts': (content) => this.parseBGLAccounts(content),
            'loans-balance': (content) => this.parseLoansBalance(content),
            'new-loans-balance': (content) => this.parseNewLoansBalance(content),
            'new-cc-od-balance': (content) => this.parseNewCCODBalance(content),
            'cc-od-balance': (content) => this.parseCCODBalance(content),
            'sdv-accounts': (content) => this.parseSDVAccounts(content),
            'cgtmse-claims': (content) => this.parseCGTMSEClaims(content),
            'glb-report': (content) => this.parseGLBReport(content),
            'fixed-width': (content) => this.parseFixedWidth(content),
            'delimited': (content) => this.parseDelimited(content),
            'regex': (content) => this.parseRegex(content),
            'positional': (content) => this.parsePositional(content)
        };
        
        this.initializeEventListeners();
        this.setupPresets();
        
        // Initialize Word Template Generator
        this.initializeWordTemplateGenerator();
    }

    // Performance optimization: Debounced analysis system
    markAnalysisDirty() {
        this.isAnalysisDirty = true;
        this.cachedStats = null;
        
        // Clear existing timer
        if (this.analysisTimer) {
            clearTimeout(this.analysisTimer);
        }
        
        // Set new debounced timer
        this.analysisTimer = setTimeout(() => {
            this.performDataAnalysisImmediate();
            this.analysisTimer = null;
        }, this.analysisDelay);
    }

    // Force immediate analysis (for user-triggered actions)
    performDataAnalysisImmediate() {
        if (!this.isAnalysisDirty && this.cachedStats) {
            // Use cached results if data hasn't changed
            this.renderStatistics(this.cachedStats);
            return;
        }

        // Performance tracking
        const startTime = performance.now();

        const statsPanel = document.getElementById('statsPanel');
        const statsGrid = document.getElementById('statsGrid');
        
        let stats;
        
        // Use filtered data for analysis to reflect current view
        const currentData = this.filteredData || this.data;
        
        // Debug: log headers for SDV detection
        console.log('Headers detected:', this.headers);
        console.log('Metadata available:', !!this.metadata);
        console.log('SDVAccountsParser available:', !!window.SDVAccountsParser);
        console.log('Has LOCKER_ID header:', this.headers.includes('LOCKER_ID'));
        console.log('Locker-related headers:', this.headers.filter(h => h.toLowerCase().includes('locker')));
        
        // Check if this is a bank deposits report and use specialized analysis
        if (this.metadata && window.BankDepositsParser && this.headers.includes('Customer Number')) {
            const parser = new window.BankDepositsParser();
            const bankingReport = parser.generateBankingReport(currentData, this.metadata);
            stats = this.combineBankingAnalysis(this.calculateStatistics(currentData), bankingReport);
        } else if ((this.metadata && window.SDVAccountsParser && (this.headers.includes('LOCKER_ID') || this.headers.includes('Locker ID') || this.headers.some(h => h.toLowerCase().includes('locker')))) || 
                   (this.currentFileName && this.currentFileName.toLowerCase().includes('sdv'))) {
            // Use specialized SDV analysis
            console.log('🔍 Applying SDV analysis...');
            const sdvParser = new window.SDVAccountsParser();
            const sdvAnalysis = sdvParser.getAnalysis(this.metadata);
            const sdvSummary = sdvParser.getSummary(this.metadata);
            
            stats = {
                type: 'sdv-accounts',
                totalRecords: sdvSummary.totalRecords,
                activeLockers: sdvSummary.activeLockers,
                inactiveLockers: sdvSummary.inactiveLockers,
                totalDueAmount: sdvSummary.totalDueAmount,
                totalAnnualRent: sdvSummary.totalAnnualRent,
                branchInfo: sdvSummary.branchInfo,
                analysis: sdvAnalysis,
                sdvParser: sdvParser // Store parser instance for filtering
            };
        } else {
            stats = this.calculateStatistics(currentData);
        }
        
        // Cache the results
        this.cachedStats = stats;
        this.isAnalysisDirty = false;
        
        this.renderStatistics(stats);
        if (statsPanel) statsPanel.style.display = 'block';

        // Performance logging (development only)
        const endTime = performance.now();
        console.debug(`📊 Analysis completed in ${(endTime - startTime).toFixed(2)}ms`);
    }

    // Public method for backwards compatibility - now uses debouncing
    performDataAnalysis() {
        this.markAnalysisDirty();
    }

    // Cleanup method for performance optimization
    cleanup() {
        if (this.analysisTimer) {
            clearTimeout(this.analysisTimer);
            this.analysisTimer = null;
        }
        this.cachedStats = null;
        this.isAnalysisDirty = false;
        
        // Cleanup virtual scrolling
        this.cleanupVirtualScrollContainer();
    }

    // Virtual scrolling optimization
    initializeVirtualScrolling() {
        const tableContainer = document.getElementById('tableContainer');
        const threshold = 1000; // Enable virtual scrolling for datasets > 1000 rows

        if (this.filteredData.length > threshold && tableContainer) {
            this.virtualScrolling.enabled = true;
            this.virtualScrolling.containerHeight = Math.min(600, window.innerHeight * 0.6);
            this.virtualScrolling.visibleRows = Math.ceil(this.virtualScrolling.containerHeight / this.virtualScrolling.rowHeight);
            this.virtualScrolling.totalHeight = this.filteredData.length * this.virtualScrolling.rowHeight;
            
            this.setupVirtualScrollContainer();
            this.updatePerformanceIndicators();
            console.debug(`🚀 Virtual scrolling enabled for ${this.filteredData.length} rows`);
        } else {
            this.virtualScrolling.enabled = false;
            this.cleanupVirtualScrollContainer();
            this.updatePerformanceIndicators();
        }
    }

    setupVirtualScrollContainer() {
        const tableContainer = document.getElementById('tableContainer');
        const table = document.getElementById('dataTable');
        
        if (!tableContainer || !table) return;

        // Create virtual scroll wrapper
        let scrollWrapper = document.getElementById('virtualScrollWrapper');
        if (!scrollWrapper) {
            scrollWrapper = document.createElement('div');
            scrollWrapper.id = 'virtualScrollWrapper';
            scrollWrapper.style.cssText = `
                height: ${this.virtualScrolling.containerHeight}px;
                overflow-y: auto;
                border: 1px solid #ddd;
                position: relative;
            `;
            
            // Insert wrapper around table
            tableContainer.insertBefore(scrollWrapper, table);
            scrollWrapper.appendChild(table);
        }

        // Create spacer for total height
        let spacer = document.getElementById('virtualScrollSpacer');
        if (!spacer) {
            spacer = document.createElement('div');
            spacer.id = 'virtualScrollSpacer';
            scrollWrapper.appendChild(spacer);
        }
        
        spacer.style.height = `${this.virtualScrolling.totalHeight}px`;
        
        // Add scroll event listener
        scrollWrapper.removeEventListener('scroll', this.handleVirtualScroll.bind(this));
        scrollWrapper.addEventListener('scroll', this.handleVirtualScroll.bind(this));
        
        // Position table absolutely for virtual scrolling
        table.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
        `;
    }

    cleanupVirtualScrollContainer() {
        const scrollWrapper = document.getElementById('virtualScrollWrapper');
        const table = document.getElementById('dataTable');
        const tableContainer = document.getElementById('tableContainer');
        
        if (scrollWrapper && table && tableContainer) {
            // Move table back to original container
            tableContainer.appendChild(table);
            scrollWrapper.remove();
            
            // Reset table styles
            table.style.cssText = '';
        }
    }

    handleVirtualScroll(event) {
        const scrollTop = event.target.scrollTop;
        this.virtualScrolling.scrollTop = scrollTop;
        
        // Calculate visible range
        const startRow = Math.floor(scrollTop / this.virtualScrolling.rowHeight);
        const endRow = Math.min(
            this.filteredData.length,
            startRow + this.virtualScrolling.visibleRows + this.virtualScrolling.bufferRows
        );
        
        this.virtualScrolling.startIndex = Math.max(0, startRow - this.virtualScrolling.bufferRows);
        this.virtualScrolling.endIndex = endRow;
        
        // Update table position and render visible rows
        const table = document.getElementById('dataTable');
        if (table) {
            table.style.transform = `translateY(${this.virtualScrolling.startIndex * this.virtualScrolling.rowHeight}px)`;
            this.renderVirtualTableBody();
        }
    }

    renderVirtualTableBody() {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;

        // Clear existing rows
        tbody.innerHTML = '';

        // Render only visible rows
        const visibleData = this.filteredData.slice(
            this.virtualScrolling.startIndex, 
            this.virtualScrolling.endIndex
        );

        const fragment = document.createDocumentFragment();
        
        visibleData.forEach(row => {
            const tr = document.createElement('tr');
            row.forEach((cell, index) => {
                if (!this.hiddenColumns.has(index)) {
                    const td = document.createElement('td');
                    td.textContent = cell || '';
                    td.title = cell || ''; // Tooltip for long content
                    tr.appendChild(td);
                }
            });
            fragment.appendChild(tr);
        });

        tbody.appendChild(fragment);
    }

    // Update virtual scrolling parameters when data changes
    updateVirtualScrolling() {
        if (this.virtualScrolling.enabled) {
            this.virtualScrolling.totalHeight = this.filteredData.length * this.virtualScrolling.rowHeight;
            
            const spacer = document.getElementById('virtualScrollSpacer');
            if (spacer) {
                spacer.style.height = `${this.virtualScrolling.totalHeight}px`;
            }
            
            // Reset scroll position to top
            const scrollWrapper = document.getElementById('virtualScrollWrapper');
            if (scrollWrapper) {
                scrollWrapper.scrollTop = 0;
                this.virtualScrolling.scrollTop = 0;
                this.virtualScrolling.startIndex = 0;
                this.virtualScrolling.endIndex = Math.min(
                    this.filteredData.length,
                    this.virtualScrolling.visibleRows + this.virtualScrolling.bufferRows
                );
            }
        }
    }

    // Show performance optimization status in UI
    updatePerformanceIndicators() {
        // Add virtual scrolling indicator to page size controls
        const pageSizeContainer = document.getElementById('pageSize')?.parentElement;
        if (pageSizeContainer) {
            let indicator = pageSizeContainer.querySelector('.performance-indicator');
            
            if (this.virtualScrolling.enabled) {
                if (!indicator) {
                    indicator = document.createElement('div');
                    indicator.className = 'performance-indicator';
                    indicator.style.cssText = `
                        font-size: 11px;
                        color: #28a745;
                        margin-top: 2px;
                        font-weight: bold;
                    `;
                    pageSizeContainer.appendChild(indicator);
                }
                indicator.innerHTML = `🚀 Virtual scrolling active (${this.filteredData.length.toLocaleString()} rows)`;
            } else if (indicator) {
                indicator.remove();
            }
        }
    }

    // Method to register new parsers dynamically
    registerParser(name, parserFunction) {
        this.parsers[name] = parserFunction;
    // Optional: log registry in debug builds only
    }

    initializeWordTemplateGenerator() {
        // Initialize when WordTemplateGenerator is available
        if (typeof WordTemplateGenerator !== 'undefined') {
            this.wordTemplateGenerator = new WordTemplateGenerator(this);
        } else {
            // Retry after a short delay if not loaded yet
            setTimeout(() => {
                if (typeof WordTemplateGenerator !== 'undefined') {
                    this.wordTemplateGenerator = new WordTemplateGenerator(this);
                }
            }, 1000);
        }
    }

    // Trigger event when data parsing is complete
    triggerDataParsingComplete() {
        const event = new CustomEvent('dataParsingComplete', {
            detail: {
                headers: this.headers,
                data: this.data,
                filteredData: this.filteredData
            }
        });
        document.dispatchEvent(event);
    }

    showLoading(message = 'Processing...') {
        // Remove existing loading overlay if any
        this.hideLoading();
        
    // Avoid console noise for loading overlay
        
        // Create loading overlay
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.className = 'loading-overlay';
        
        const loadingContent = document.createElement('div');
        loadingContent.className = 'loading-content';
        
        const loadingIcon = document.createElement('img');
        loadingIcon.src = 'assets/images/icon.png';
        loadingIcon.className = 'loading-icon';
        loadingIcon.alt = 'Loading';
        
        const loadingText = document.createElement('p');
        loadingText.className = 'loading-text';
        loadingText.textContent = message;
        
        loadingContent.appendChild(loadingIcon);
        loadingContent.appendChild(loadingText);
        this.loadingOverlay.appendChild(loadingContent);
        
        document.body.appendChild(this.loadingOverlay);
    }

    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.remove();
            this.loadingOverlay = null;
        }
    }

    initializeEventListeners() {
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        const parseButton = document.getElementById('parseButton');
        const parserType = document.getElementById('parserType');
        const searchTable = document.getElementById('searchTable');
        const pageSize = document.getElementById('pageSize');
        const toggleColumns = document.getElementById('toggleColumns');
        // fuzzyIntensity slider removed - using optimal default
        // analyzeData button removed - auto-analysis on data load

        // File upload handling
        if (uploadZone && fileInput) {
            uploadZone.addEventListener('click', () => fileInput.click());
            uploadZone.addEventListener('dragover', this.handleDragOver.bind(this));
            uploadZone.addEventListener('drop', this.handleFileDrop.bind(this));
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }

        // Parsing controls
        if (parseButton) parseButton.addEventListener('click', this.parseFile.bind(this));
        if (parserType) parserType.addEventListener('change', this.updateParsingOptions.bind(this));

        // Table controls
        if (searchTable) searchTable.addEventListener('keypress', this.handleSearchKeypress.bind(this));
        // Search mode change
        const searchModeContainer = document.getElementById('searchMode');
        if (searchModeContainer) {
            searchModeContainer.addEventListener('change', () => {
                // Re-apply filter instantly on mode change
                if (document.getElementById('searchTable')?.value) {
                    this.performFuzzySearch();
                }
            });
        }
        // fuzzyIntensity event listener removed - using optimal default
        if (pageSize) pageSize.addEventListener('change', this.changePageSize.bind(this));
        if (toggleColumns) toggleColumns.addEventListener('click', this.toggleColumnControls.bind(this));
        
        // Customer enrichment button
        const enrichCustomerData = document.getElementById('enrichCustomerData');
        if (enrichCustomerData) enrichCustomerData.addEventListener('click', this.showCustomerEnrichmentDialog.bind(this));
        
        // analyzeData event listener removed - auto-analysis on data load

        // Export controls (simplified)
        const exportExcelBtn = document.getElementById('exportExcel');
        if (exportExcelBtn) exportExcelBtn.addEventListener('click', () => this.exportData('excel'));
    }

    setupPresets() {
        const presetButtons = document.querySelectorAll('.preset-btn');
        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                presetButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.applyPreset(btn.dataset.preset);
            });
        });
    }

    applyPreset(preset) {
        const parserType = document.getElementById('parserType');
        const skipLines = document.getElementById('skipLines');
        const headerRow = document.getElementById('headerRow');
        const delimiter = document.getElementById('delimiter');
        const customPattern = document.getElementById('customPattern');

        switch(preset) {
            case 'bank-deposits':
                parserType.value = 'bank-deposits';
                skipLines.value = '2';
                headerRow.value = '3';
                customPattern.value = '';
                break;
            case 'bgl-accounts':
                parserType.value = 'bgl-accounts';
                skipLines.value = '0';
                headerRow.value = '0';
                customPattern.value = '';
                break;
            case 'loans-balance':
                parserType.value = 'loans-balance';
                skipLines.value = '0';
                headerRow.value = '0';
                customPattern.value = '';
                break;
            case 'new-loans-balance':
                parserType.value = 'new-loans-balance';
                skipLines.value = '0';
                headerRow.value = '0';
                customPattern.value = '';
                break;
            case 'new-cc-od-balance':
                parserType.value = 'new-cc-od-balance';
                skipLines.value = '0';
                headerRow.value = '0';
                customPattern.value = '';
                break;
            case 'cc-od-balance':
                parserType.value = 'cc-od-balance';
                skipLines.value = '0';
                headerRow.value = '0';
                customPattern.value = '';
                break;
            case 'sdv-accounts':
                parserType.value = 'sdv-accounts';
                skipLines.value = '0';
                headerRow.value = '0';
                customPattern.value = '';
                break;
            case 'cgtmse-claims':
                parserType.value = 'cgtmse-claims';
                skipLines.value = '0';
                headerRow.value = '1';
                delimiter.value = '|';
                customPattern.value = '';
                break;
            case 'glb-report':
                parserType.value = 'glb-report';
                skipLines.value = '0';
                headerRow.value = '0';
                customPattern.value = '';
                break;
            case 'fixed-width':
                parserType.value = 'fixed-width';
                skipLines.value = '0';
                headerRow.value = '1';
                break;
            case 'delimited':
                parserType.value = 'delimited';
                skipLines.value = '0';
                headerRow.value = '1';
                delimiter.value = ',';
                break;
            case 'custom':
                parserType.value = 'regex';
                skipLines.value = '0';
                headerRow.value = '0';
                customPattern.focus();
                break;
        }
        this.updateParsingOptions();
    }

    updateParsingOptions() {
        const parserTypeEl = document.getElementById('parserType');
        const customPatternInput = document.getElementById('customPattern');
        const delimiterInput = document.getElementById('delimiter');

        if (!parserTypeEl || !customPatternInput || !delimiterInput) {
            return; // UI not mounted; nothing to update
        }

        const customPattern = customPatternInput.parentElement;
        const delimiter = delimiterInput.parentElement;

        // Show/hide relevant options based on parser type
        customPattern.style.display = parserTypeEl.value === 'regex' ? 'block' : 'none';
        delimiter.style.display = parserTypeEl.value === 'delimited' ? 'block' : 'none';
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('uploadZone').classList.add('dragover');
    }

    handleFileDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('uploadZone').classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    async processFile(file) {
        const fileName = file.name;
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
    this.currentFileName = fileName;
        
        // Excel handling first
        const lower = fileName.toLowerCase();
        if (lower.endsWith('.xlsx') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            await this.processExcelFile(file, fileName, fileSize);
            return;
        }
        if (lower.endsWith('.xls') || file.type === 'application/vnd.ms-excel') {
            await this.processXlsFile(file, fileName, fileSize);
            return;
        }

        // Check if it's a .gz file
        if (fileName.toLowerCase().endsWith('.gz')) {
            await this.processGzipFile(file, fileName, fileSize);
            return;
        }
        
        // Regular file processing (includes .txt and files without extensions)
        this.processRegularFile(file, fileName, fileSize);
    }

    async processExcelFile(file, fileName, fileSize) {
        try {
            // Visual feedback (if UI present)
            const uploadZone = document.getElementById('uploadZone');
            if (uploadZone) {
                uploadZone.innerHTML = `
                    <i class="material-icons">table_chart</i>
                    <h3>Reading: ${fileName}</h3>
                    <p>Size: ${fileSize} MB</p>
                    <p><small>Parsing .xlsx (header in first row)...</small></p>
                `;
            }

            if (!window.JSZip) {
                throw new Error('JSZip not available. Cannot read .xlsx. Please upload CSV instead.');
            }

            const arrayBuffer = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(new Error('Failed to read Excel file'));
                reader.readAsArrayBuffer(file);
            });

            const { headers, data } = await this.parseXlsx(arrayBuffer);

            // Apply into table
            this.headers = headers;
            this.data = data;
            this.originalData = [...this.data];
            this.filteredData = [...this.data];

            // Reset visibility and apply filename-based presets
            this.hiddenColumns = new Set();
            this.maybeApplyCustomerContactPreset();
            this.applyDefaultHiddenColumns();

            // Page size all
            this.pageSize = 'all';
            const pageSizeSelect = document.getElementById('pageSize');
            if (pageSizeSelect) pageSizeSelect.value = 'all';

            // Render
            this.renderTable();
            this.showDataContainer();
            this.performDataAnalysis();
            this.showSuccessMessage(`Loaded ${this.data.length} rows from ${fileName}`);
            
            // Trigger event for Word Template Generator
            this.triggerDataParsingComplete();
        } catch (err) {
            console.error('Excel parse error:', err);
            this.showErrorMessage(err.message || 'Failed to parse Excel file');
        }
    }

    async parseXlsx(arrayBuffer) {
        const zip = await window.JSZip.loadAsync(arrayBuffer);

        const readXml = async (path) => {
            const entry = zip.file(path);
            if (!entry) return null;
            return await entry.async('string');
        };

        const workbookXml = await readXml('xl/workbook.xml');
        if (!workbookXml) throw new Error('Invalid .xlsx: workbook.xml missing');
        const workbookDoc = new DOMParser().parseFromString(workbookXml, 'application/xml');
        const sheetEl = workbookDoc.getElementsByTagName('sheet')[0];
        if (!sheetEl) throw new Error('No sheets found in workbook');
        const relId = sheetEl.getAttribute('r:id') || sheetEl.getAttribute('id');

        let sheetPath = 'xl/worksheets/sheet1.xml';
        const relsXml = await readXml('xl/_rels/workbook.xml.rels');
        if (relsXml && relId) {
            const relsDoc = new DOMParser().parseFromString(relsXml, 'application/xml');
            const rels = relsDoc.getElementsByTagName('Relationship');
            for (let i = 0; i < rels.length; i++) {
                const r = rels[i];
                if (r.getAttribute('Id') === relId) {
                    const target = r.getAttribute('Target');
                    sheetPath = 'xl/' + target.replace(/^\//, '');
                    break;
                }
            }
        }

        const sheetXml = await readXml(sheetPath);
        if (!sheetXml) throw new Error('Worksheet not found: ' + sheetPath);
        const sheetDoc = new DOMParser().parseFromString(sheetXml, 'application/xml');

        // Shared strings
        const sstXml = await readXml('xl/sharedStrings.xml');
        let sst = [];
        if (sstXml) {
            const sstDoc = new DOMParser().parseFromString(sstXml, 'application/xml');
            const siNodes = sstDoc.getElementsByTagName('si');
            for (let i = 0; i < siNodes.length; i++) {
                const si = siNodes[i];
                // Concatenate all <t> in this si (handles rich text)
                const tNodes = si.getElementsByTagName('t');
                let text = '';
                for (let j = 0; j < tNodes.length; j++) {
                    text += tNodes[j].textContent;
                }
                sst.push(text);
            }
        }

        // Parse rows
        const rows = sheetDoc.getElementsByTagName('row');
        const table = [];
        let maxCol = 0;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.getElementsByTagName('c');
            const rowArr = [];
            for (let j = 0; j < cells.length; j++) {
                const c = cells[j];
                const ref = c.getAttribute('r') || '';
                const colLetters = ref.replace(/\d+/g, '') || this.indexToLetters(j);
                const colIdx = this.colLettersToIndex(colLetters);
                if (colIdx + 1 > maxCol) maxCol = colIdx + 1;

                let value = '';
                const t = c.getAttribute('t');
                if (t === 's') {
                    const v = c.getElementsByTagName('v')[0];
                    const idx = v ? parseInt(v.textContent, 10) : NaN;
                    value = isNaN(idx) ? '' : (sst[idx] ?? '');
                } else if (t === 'inlineStr') {
                    const tNode = c.getElementsByTagName('t')[0];
                    value = tNode ? tNode.textContent : '';
                } else {
                    const v = c.getElementsByTagName('v')[0];
                    value = v ? v.textContent : '';
                }

                rowArr[colIdx] = value;
            }
            table.push(rowArr);
        }

        // Normalize rows to same length and split header/data
        const norm = table.map(r => {
            const arr = new Array(maxCol).fill('');
            for (let i = 0; i < r.length; i++) if (r[i] !== undefined) arr[i] = r[i];
            return arr;
        }).filter(r => r.some(cell => (cell ?? '').toString().trim() !== ''));

        if (norm.length === 0) return { headers: [], data: [] };

        // First non-empty row as header
        const headers = norm[0].map((h, idx) => {
            const name = (h ?? '').toString().trim();
            return name || `Column ${this.indexToLetters(idx)}`;
        });
        const data = norm.slice(1);
        return { headers, data };
    }

    colLettersToIndex(letters) {
        let n = 0;
        for (let i = 0; i < letters.length; i++) {
            n = n * 26 + (letters.charCodeAt(i) - 64);
        }
        return n - 1; // zero-based
    }

    indexToLetters(idx) {
        let s = '';
        idx = idx + 1;
        while (idx > 0) {
            const mod = (idx - 1) % 26;
            s = String.fromCharCode(65 + mod) + s;
            idx = Math.floor((idx - mod) / 26);
        }
        return s;
    }

    async processXlsFile(file, fileName, fileSize) {
        try {
            // Read initial bytes as ArrayBuffer for detection
            const buffer = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(new Error('Failed to read XLS file'));
                reader.readAsArrayBuffer(file);
            });

            const bytes = new Uint8Array(buffer);
            const headBytes = bytes.slice(0, Math.min(4096, bytes.length));
            const headText = new TextDecoder('utf-8', { fatal: false }).decode(headBytes);

            // Case 0: Misnamed OOXML stored as .xls (zip with [Content_Types].xml)
            try {
                if (window.JSZip) {
                    const zip = await window.JSZip.loadAsync(buffer);
                    if (zip.file('[Content_Types].xml') && (zip.file('xl/workbook.xml') || zip.file('xl/_rels/workbook.xml.rels'))) {
                        const parsed = await this.parseXlsx(buffer);
                        this.headers = parsed.headers; this.data = parsed.data;
                        this.originalData = [...this.data]; this.filteredData = [...this.data];
                        this.hiddenColumns = new Set();
                        this.maybeApplyCustomerContactPreset();
                        this.applyDefaultHiddenColumns();
                        this.pageSize = 'all';
                        const pageSizeSelect = document.getElementById('pageSize');
                        if (pageSizeSelect) pageSizeSelect.value = 'all';
                        this.renderTable(); this.showDataContainer(); this.performDataAnalysis();
                        this.showSuccessMessage(`Loaded ${this.data.length} rows from ${fileName}`);
                        
                        // Trigger event for Word Template Generator
                        this.triggerDataParsingComplete();
                        return;
                    }
                }
            } catch (e) {
                // Not a valid zip or not OOXML - continue to other heuristics
            }

            // Case 1: Excel 2003 XML Spreadsheet under .xls
            if (/\<\?xml/.test(headText) && /\<Workbook[\s>]/i.test(headText)) {
                const fullText = await new Promise((resolve, reject) => {
                    const r = new FileReader();
                    r.onload = (e) => resolve(e.target.result);
                    r.onerror = () => reject(new Error('Failed to read XLS XML'));
                    r.readAsText(file);
                });
                const { headers, data } = this.parseExcel2003Xml(fullText);
                this.headers = headers; this.data = data;
                this.originalData = [...data]; this.filteredData = [...data];
                this.hiddenColumns = new Set();
                this.maybeApplyCustomerContactPreset();
                this.applyDefaultHiddenColumns();
                this.pageSize = 'all';
                const pageSizeSelect = document.getElementById('pageSize');
                if (pageSizeSelect) pageSizeSelect.value = 'all';
                this.renderTable(); this.showDataContainer(); this.performDataAnalysis();
                this.showSuccessMessage(`Loaded ${data.length} rows from ${fileName}`);
                
                // Trigger event for Word Template Generator
                this.triggerDataParsingComplete();
                return;
            }

            // Case 2: HTML table exported as .xls
            if (/\<html[\s>]/i.test(headText) || /\<table[\s>]/i.test(headText)) {
                const fullText = await new Promise((resolve, reject) => {
                    const r = new FileReader();
                    r.onload = (e) => resolve(e.target.result);
                    r.onerror = () => reject(new Error('Failed to read XLS HTML'));
                    r.readAsText(file);
                });
                const { headers, data } = this.parseHtmlTable(fullText);
                this.headers = headers; this.data = data;
                this.originalData = [...data]; this.filteredData = [...data];
                this.hiddenColumns = new Set();
                this.maybeApplyCustomerContactPreset();
                this.applyDefaultHiddenColumns();
                this.pageSize = 'all';
                const pageSizeSelect = document.getElementById('pageSize');
                if (pageSizeSelect) pageSizeSelect.value = 'all';
                this.renderTable(); this.showDataContainer(); this.performDataAnalysis();
                this.showSuccessMessage(`Loaded ${data.length} rows from ${fileName}`);
                
                // Trigger event for Word Template Generator
                this.triggerDataParsingComplete();
                return;
            }

            // Case 3: OLE Compound File header indicates true binary XLS
            const oleHeader = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
            const isOle = oleHeader.every((b, i) => bytes[i] === b);
            if (isOle) {
                throw new Error('Legacy binary XLS detected. Please resave as .xlsx or CSV and upload again.');
            }

            // Case 4: Treat as delimited text (some systems output CSV but name it .xls)
            const fullText = await new Promise((resolve, reject) => {
                const r = new FileReader();
                r.onload = (e) => resolve(e.target.result);
                r.onerror = () => reject(new Error('Failed to read XLS as text'));
                r.readAsText(file);
            });

            // Heuristic: choose delimiter by counting candidates in the header line
            const firstLine = (fullText.split(/\r?\n/)[0] || '');
            const counts = {
                comma: (firstLine.match(/,/g) || []).length,
                tab: (firstLine.match(/\t/g) || []).length,
                pipe: (firstLine.match(/\|/g) || []).length,
                semicolon: (firstLine.match(/;/g) || []).length,
            };
            const pick = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
            let delimiter = ',';
            if (pick && pick[1] > 0) {
                if (pick[0] === 'tab') delimiter = '\t';
                else if (pick[0] === 'pipe') delimiter = '|';
                else if (pick[0] === 'semicolon') delimiter = ';';
                else delimiter = ',';
            }

            // Prepare virtual file for existing parse pipeline
            this.currentFile = { name: fileName.replace(/\.xls$/i, '.csv'), content: fullText, isVirtual: true };
            this.pendingParserType = 'delimited';
            this.pendingDelimiter = delimiter;

            // Ensure UI hints show and enable parse
            const parsingOptionsEl = document.getElementById('parsingOptions');
            if (parsingOptionsEl) parsingOptionsEl.style.display = 'block';
            const parseBtnEl = document.getElementById('parseButton');
            if (parseBtnEl) parseBtnEl.disabled = false;
            const uploadZone = document.getElementById('uploadZone');
            if (uploadZone) {
                uploadZone.innerHTML = `
                    <i class="material-icons">description</i>
                    <h3>${this.currentFile.name}</h3>
                    <p>Detected delimited text under .xls</p>
                    <p><small>Delimiter: ${delimiter === '\\t' ? 'Tab' : delimiter}</small></p>
                `;
            }

            // Auto-parse
            await this.parseFile();
            return;

            // Unknown format under .xls
            // throw new Error('Unrecognized .xls format. Try saving as .xlsx or CSV.');
        } catch (err) {
            console.error('XLS handling error:', err);
            this.showErrorMessage(err.message);
        }
    }

    parseExcel2003Xml(xmlText) {
        const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
        const tableEls = this.getByLocalName(doc, 'Table');
        const table = tableEls[0] || doc;
        const rowEls = this.getByLocalName(table, 'Row');
        const rows = [];

        let maxCol = 0;
        rowEls.forEach((row) => {
            const cells = this.getByLocalName(row, 'Cell');
            const arr = [];
            let colIdx = 0;
            cells.forEach((cell) => {
                // Handle ss:Index to skip columns
                const idxAttr = cell.getAttribute('ss:Index') || cell.getAttribute('Index');
                if (idxAttr) {
                    const idx = parseInt(idxAttr, 10) - 1; // 1-based
                    if (!isNaN(idx)) colIdx = idx;
                }
                const dataEl = this.getByLocalName(cell, 'Data')[0];
                const val = dataEl ? dataEl.textContent : '';
                arr[colIdx] = val;
                colIdx += 1;
            });
            if (arr.length) {
                maxCol = Math.max(maxCol, arr.length);
                rows.push(arr);
            }
        });

        const norm = rows.map(r => {
            const a = new Array(maxCol).fill('');
            for (let i = 0; i < r.length; i++) if (r[i] !== undefined) a[i] = r[i];
            return a;
        }).filter(r => r.some(c => (c ?? '').toString().trim() !== ''));

        if (norm.length === 0) return { headers: [], data: [] };
        const headers = norm[0].map((h, i) => (h || `Column ${this.indexToLetters(i)}`));
        const data = norm.slice(1);
        return { headers, data };
    }

    parseHtmlTable(htmlText) {
        const doc = new DOMParser().parseFromString(htmlText, 'text/html');
        const table = doc.querySelector('table');
        if (!table) return { headers: [], data: [] };

        const rows = Array.from(table.rows).map(tr => Array.from(tr.cells).map(td => td.textContent.trim()))
            .filter(r => r.some(c => c && c.trim() !== ''));
        if (rows.length === 0) return { headers: [], data: [] };
        const headers = rows[0].map((h, i) => h || `Column ${this.indexToLetters(i)}`);
        const data = rows.slice(1);
        return { headers, data };
    }

    getByLocalName(root, local) {
        return Array.from(root.getElementsByTagName('*')).filter(el => (el.localName || el.tagName).toLowerCase() === local.toLowerCase());
    }

    async processGzipFile(file, fileName, fileSize) {
        try {
            // Show loading state
            const uploadZone = document.getElementById('uploadZone');
            if (uploadZone) {
                uploadZone.innerHTML = `
                    <i class="material-icons">archive</i>
                    <h3>Extracting: ${fileName}</h3>
                    <p>Size: ${fileSize} MB</p>
                    <p><small>Decompressing gzip file...</small></p>
                `;
            }

            // Extract the gzip file
            const extractedContent = await this.extractGzipFile(file);
            
            if (extractedContent) {
                // Create a virtual file object
                this.currentFile = {
                    name: extractedContent.name,
                    content: extractedContent.content,
                    isVirtual: true
                };
                this.currentFileName = extractedContent.name;

                // Show parsing options if present
                const parsingOptionsEl = document.getElementById('parsingOptions');
                if (parsingOptionsEl) parsingOptionsEl.style.display = 'block';
                const parseBtnEl = document.getElementById('parseButton');
                if (parseBtnEl) parseBtnEl.disabled = false;

                // Update UI
                if (uploadZone) {
                    uploadZone.innerHTML = `
                        <i class="material-icons">description</i>
                        <h3>${extractedContent.name}</h3>
                        <p>Extracted from: ${fileName}</p>
                        <p><small>Ready for parsing</small></p>
                    `;
                }

                // Auto-detect based on extracted file name
                this.autoDetectParser(extractedContent.name);
            } else {
                throw new Error('Failed to extract content from gzip file');
            }

        } catch (error) {
            console.error('Gzip extraction error:', error);
            
            const uploadZone = document.getElementById('uploadZone');
            if (uploadZone) {
                uploadZone.innerHTML = `
                    <i class="material-icons">error</i>
                    <h3>Extraction Failed</h3>
                    <p>File: ${fileName}</p>
                    <p style="color: #e74c3c;"><small>${error.message}</small></p>
                `;
            }
        }
    }

    async extractGzipFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async function(e) {
                try {
                    const arrayBuffer = e.target.result;
                    
                    // Use pako library for gzip decompression (if available)
                    if (typeof window.pako !== 'undefined') {
                        const compressed = new Uint8Array(arrayBuffer);
                        const decompressed = window.pako.inflate(compressed, { to: 'string' });
                        
                        // Determine the original filename (remove .gz extension)
                        const originalName = file.name.replace(/\.gz$/i, '') || 'extracted_content.txt';
                        
                        resolve({
                            name: originalName,
                            content: decompressed
                        });
                    } else {
                        // Fallback: try to decode as text directly (for simple cases)
                        const decoder = new TextDecoder('utf-8', { fatal: false });
                        const text = decoder.decode(new Uint8Array(arrayBuffer));
                        
                        // Basic check if it looks like readable text
                        if (text.includes('REPORT ID:') || 
                            text.includes('CENTRAL BANK') ||
                            text.includes('|') ||
                            /\d{10,}/.test(text)) {
                            
                            const originalName = file.name.replace(/\.gz$/i, '') || 'extracted_content.txt';
                            resolve({
                                name: originalName,
                                content: text
                            });
                        } else {
                            reject(new Error('Content does not appear to be readable text'));
                        }
                    }
                    
                } catch (error) {
                    console.error('Gzip extraction error:', error);
                    reject(new Error(`Failed to decompress gzip file: ${error.message}`));
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read gzip file'));
            reader.readAsArrayBuffer(file);
        });
    }

    processRegularFile(file, fileName, fileSize) {
        // Show parsing options if present
        const parsingOptionsEl = document.getElementById('parsingOptions');
        if (parsingOptionsEl) parsingOptionsEl.style.display = 'block';
        const parseBtnEl = document.getElementById('parseButton');
        if (parseBtnEl) parseBtnEl.disabled = false;

        // Store file for parsing
        this.currentFile = file;

        // Update UI if present
        const uploadZone = document.getElementById('uploadZone');
        if (uploadZone) {
            uploadZone.innerHTML = `
                <i class="material-icons">description</i>
                <h3>${fileName}</h3>
                <p>Size: ${fileSize} MB</p>
                <p><small>File ready for parsing</small></p>
            `;
        }

        // Auto-detect file type and suggest parser
        this.autoDetectParser(fileName);
    }

    autoDetectParser(fileName) {
        const extension = fileName.toLowerCase().split('.').pop();
        const parserTypeEl = document.getElementById('parserType');
        const baseName = fileName.toLowerCase();

        // Remove .gz extension for pattern matching if needed
        const cleanName = baseName.replace(/\.gz$/i, '');

        const setType = (type) => {
            if (parserTypeEl) {
                parserTypeEl.value = type;
                this.pendingParserType = null;
                this.updateParsingOptions();
            } else {
                this.pendingParserType = type;
            }
        };

        const setDelimiter = (val) => {
            const delimEl = document.getElementById('delimiter');
            if (delimEl) {
                delimEl.value = val;
                this.pendingDelimiter = null;
            } else {
                this.pendingDelimiter = val;
            }
        };

        // File name based detection (highest priority)
        if (cleanName.startsWith('deposits_balance_file') || baseName.startsWith('deposits_balance_file')) {
            setType('bank-deposits');
            // autodetect note
            return;
        }

        if (cleanName.startsWith('bgl_accounts_with_non_zero_balance') || baseName.startsWith('bgl_accounts_with_non_zero_balance')) {
            setType('bgl-accounts');
            
            return;
        }

        if (cleanName.startsWith('new_cc_od_balance_file') || baseName.startsWith('new_cc_od_balance_file')) {
            setType('new-cc-od-balance');
            
            return;
        }

        if (cleanName.startsWith('cc_od_balance_file') || baseName.startsWith('cc_od_balance_file')) {
            setType('cc-od-balance');
            
            return;
        }

        if (cleanName.startsWith('sdv_accounts_as_on_date') || baseName.startsWith('sdv_accounts_as_on_date')) {
            setType('sdv-accounts');
            
            return;
        }

        if (cleanName.startsWith('new_loansbalancefile') || baseName.startsWith('new_loansbalancefile')) {
            setType('new-loans-balance');
            
            return;
        }

        if (cleanName.startsWith('loansbalancefile') || baseName.startsWith('loansbalancefile')) {
            setType('loans-balance');
            
            return;
        }

        if (cleanName.startsWith('branchwise_cgtmse_claim_lodged_to_portal_via_api_and_accepted') || 
            baseName.startsWith('branchwise_cgtmse_claim_lodged_to_portal_via_api_and_accepted')) {
            setType('cgtmse-claims');
            
            return;
        }

        // GLB Report pattern: YYYYMMDD_GLB (with or without .gz extension)
        if (/^\d{8}_GLB$/i.test(cleanName) || /^\d{8}_GLB$/i.test(baseName.replace(/\.(gz|txt)$/i, ''))) {
            setType('glb-report');
            
            return;
        }

        // Extension based detection
        switch(extension) {
            case 'csv':
                setType('delimited');
                setDelimiter(',');
                
                break;
            case 'tsv':
                setType('delimited');
                setDelimiter('\t');
                
                break;
            case 'txt':
            case 'rpt':
                // Content-based detection for text files
                if (baseName.includes('deposit')) {
                    setType('bank-deposits');
                    
                } else if (baseName.includes('bgl') || baseName.includes('account') && baseName.includes('balance')) {
                    setType('bgl-accounts');
                    
                } else {
                    setType('fixed-width');
                    
                }
                break;
            case 'log':
                setType('regex');
                
                break;
            case '': // Files without extension
                setType('fixed-width');
                
                break;
            default:
                setType('delimited');
                
        }
    }

    // Parser Factory - uses the parser registry for extensibility
    async createParser(parserType, content) {
        const parser = this.parsers[parserType];
        if (!parser) {
            throw new Error(`Unsupported parser type: ${parserType}. Available parsers: ${Object.keys(this.parsers).join(', ')}`);
        }

        
        return await parser(content);
    }

    async parseFile() {
        if (!this.currentFile) return;

        const parseButton = document.getElementById('parseButton');
        if (parseButton) {
            parseButton.disabled = true;
            parseButton.innerHTML = '<div class="loading">Parsing...</div>';
        }

        // Show loading overlay with immediate effect
        this.showLoading('Parsing file and analyzing data...');
        
        // Add a small delay to ensure loading animation is visible
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            
            const content = await this.readFile(this.currentFile);
            
            
            // Apply any pending UI settings now that we are parsing
            const parserTypeEl = document.getElementById('parserType');
            if (parserTypeEl && this.pendingParserType) {
                parserTypeEl.value = this.pendingParserType;
                this.pendingParserType = null;
                this.updateParsingOptions();
            }
            const delimEl = document.getElementById('delimiter');
            if (delimEl && this.pendingDelimiter !== null) {
                delimEl.value = this.pendingDelimiter;
                this.pendingDelimiter = null;
            }

            const parserType = parserTypeEl ? parserTypeEl.value : (this.pendingParserType || 'delimited');
            
            // Close any existing GLB popup before processing new file
            this.clearGLBReports();
            
            // Use parser factory for better extensibility
            const parsedData = await this.createParser(parserType, content);
            

            this.data = parsedData.data;
            this.headers = parsedData.headers;
            this.originalData = [...this.data];
            this.filteredData = [...this.data];

            // Reset visibility for a fresh dataset and apply any filename-based presets
            this.hiddenColumns = new Set();
            this.maybeApplyCustomerContactPreset();
            
            // Apply default hidden columns based on column names
            this.applyDefaultHiddenColumns();

            // Invalidate analysis cache for new dataset
            this.isAnalysisDirty = true;
            this.cachedStats = null;

            // Set page size to "all" by default and update the dropdown
            this.pageSize = 'all';
            const pageSizeSelect = document.getElementById('pageSize');
            if (pageSizeSelect) {
                pageSizeSelect.value = 'all';
            }

            
            this.renderTable();
            this.showDataContainer();
            
            // Auto-analyze data when loaded - use immediate analysis for new data
            this.performDataAnalysisImmediate();
            
            // Show success message with column visibility info
            const visibleColumns = this.headers.length - this.hiddenColumns.size;
            const hiddenCount = this.hiddenColumns.size;
            
            let message = `Successfully parsed ${this.data.length} rows with ${this.headers.length} columns.`;
            if (hiddenCount > 0) {
                message += ` (${visibleColumns} visible, ${hiddenCount} auto-hidden)`;
            }
            
            this.showSuccessMessage(message);

            // Trigger event for Word Template Generator
            this.triggerDataParsingComplete();

        } catch (error) {
            console.error('Parsing error:', error);
            this.showErrorMessage(`Parsing failed: ${error.message}`);
        } finally {
            // Ensure loading is visible for at least a short time before hiding
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Hide loading overlay
            this.hideLoading();
            if (parseButton) {
                parseButton.disabled = false;
                parseButton.innerHTML = 'Parse File';
            }
            
        }
    }

    // If filename starts with CUSTOMER_CONTACT*, hide all columns except the allowed set initially
    maybeApplyCustomerContactPreset() {
        try {
            const fname = (this.currentFileName || this.currentFile?.name || '').toString().trim().toLowerCase();
            if (!fname.startsWith('customer_contact')) return;
            if (!Array.isArray(this.headers) || this.headers.length === 0) return;

            const allowed = [
                'CUSTOMER_NO','DEPOSIT_BAL','LOAN_BAL','SB_BAL','CREATE_DT', 'CD_BAL','NAME','ADDRESS','MOBILE_NO','CUST_TAX_PAN','DOB','GENDER','INTERNET_BANKING','MOBILE_BANKING','ATM_FLAG','POSTCODE','CUSTOMER_TYPE'
            ];
            const allowedSet = new Set(allowed.map(h => h.trim().toUpperCase()));

            this.headers.forEach((h, idx) => {
                const norm = (h ?? '').toString().trim().toUpperCase();
                if (!allowedSet.has(norm)) this.hiddenColumns.add(idx);
            });
        } catch (e) {
            console.warn('Failed to apply CUSTOMER_CONTACT preset:', e);
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            // Handle virtual files (from archives)
            if (file.isVirtual && file.content) {
                resolve(file.content);
                return;
            }
            
            // Handle regular files
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            const encEl = document.getElementById('encoding');
            const enc = encEl ? encEl.value : 'utf-8';
            reader.readAsText(file, enc);
        });
    }

    parseBankDeposits(content) {
        // Use specialized bank deposits parser if available
        if (window.BankDepositsParser) {
            try {
                const parser = new window.BankDepositsParser();
                const result = parser.parse(content);
                
                // Store additional metadata for enhanced analysis
                this.metadata = result.metadata;
                
                // Validate that we got meaningful data
                if (result.data && result.data.length > 0) {
                    
                    return { headers: result.headers, data: result.data };
                } else {
                    console.warn('Bank deposits parser returned no data, falling back to basic parsing');
                }
            } catch (error) {
                console.error('Bank deposits parser failed:', error);
                
            }
        }
        
        // Fallback to original parsing logic
        
        return this.parseBankDepositsFallback(content);
    }
    
    parseBankDepositsFallback(content) {
        const lines = content.split('\n');
        const skipLines = parseInt(document.getElementById('skipLines').value) || 2;
        
        // Find the header line that contains column definitions
        const headers = [
            'Customer Number', 'Prod Code', 'Account Type', 'Account Open Date', 
            'Account Number', 'Customer Name', 'Balance', 'Uncleared Balance', 
            'Collection Amount', 'Maturity Date', 'Term Interest Rate', 'Status', 
            'Card Issued', 'INB Flag', 'Nominee', 'Interest Available'
        ];

        const data = [];
        
        // More intelligent data line detection
        for (let i = skipLines; i < lines.length; i++) {
            const line = lines[i];
            
            // Skip empty lines and obvious headers
            if (!line.trim() || 
                line.includes('REPORT ID') || 
                line.includes('---') || 
                line.includes('CUSTOMER NUMBER') ||
                line.includes('BRANCH :') ||
                line.includes('PAGE NO') ||
                line.includes('DEPOSITS BALANCE FILE')) {
                continue;
            }
            
            // Check if this looks like a data line
            if (/^\s*\d{10,}/.test(line)) {
                // Try improved parsing
                const row = this.parseImprovedBankLine(line);
                if (row && row.some(cell => cell && cell.trim())) {
                    data.push(row);
                }
            }
        }

        return { headers, data };
    }
    
    parseImprovedBankLine(line) {
        // Improved parsing for individual bank deposit lines
        const row = new Array(16).fill('');
        
        try {
            // Extract customer number (first number sequence)
            const customerMatch = line.match(/^\s*(\d{10,})/);
            if (customerMatch) row[0] = customerMatch[1];
            
            // Extract product code (in parentheses)
            const prodMatch = line.match(/\(([^)]+)\)/);
            if (prodMatch) row[1] = prodMatch[1];
            
            // Extract dates
            const dates = [...line.matchAll(/(\d{2}\/\d{2}\/\d{4})/g)];
            if (dates.length > 0) row[3] = dates[0][1]; // Account open date
            if (dates.length > 1) row[9] = dates[1][1]; // Maturity date
            else if (line.includes('--N.A--')) row[9] = '--N.A--';
            
            // Extract currency amounts more carefully
            const amounts = [...line.matchAll(/([\d,]+\.\d{2})/g)];
            if (amounts.length >= 3) {
                row[6] = amounts[0][1]; // Balance
                row[7] = amounts[1][1]; // Uncleared
                row[8] = amounts[2][1]; // Collection
                if (amounts.length > 3) {
                    row[15] = amounts[amounts.length - 1][1]; // Interest
                }
            }
            
            // Extract account number (second long number)
            const allNumbers = [...line.matchAll(/(\d{10,})/g)];
            if (allNumbers.length > 1) {
                row[4] = allNumbers[1][1]; // Account number
            }
            
            // Extract status
            const statusMatch = line.match(/(OPEN|INOPERATIVE|DORMANT\s+UNCLA)/);
            if (statusMatch) row[11] = statusMatch[1].trim();
            
            // Extract flags (Y/N/R at the end)
            const flags = [...line.matchAll(/\b([YNR])\b/g)];
            if (flags.length >= 3) {
                row[12] = flags[flags.length - 3][1]; // Card
                row[13] = flags[flags.length - 2][1]; // INB
                row[14] = flags[flags.length - 1][1]; // Nominee
            }
            
            // Extract interest rate (number before status)
            const rateMatch = line.match(/([\d.]+)\s+(OPEN|INOPERATIVE|DORMANT)/);
            if (rateMatch) row[10] = rateMatch[1];
            
            // Extract customer name (between account number and balance)
            if (row[4] && row[6]) {
                const accStart = line.indexOf(row[4]) + row[4].length;
                const balStart = line.indexOf(row[6]);
                if (accStart < balStart) {
                    row[5] = line.substring(accStart, balStart).trim();
                }
            }
            
            // Extract account type (between prod code and date)
            if (row[1] && row[3]) {
                const prodEnd = line.indexOf(')') + 1;
                const dateStart = line.indexOf(row[3]);
                if (prodEnd < dateStart) {
                    row[2] = line.substring(prodEnd, dateStart).trim();
                }
            }
            
            return row;
        } catch (error) {
            console.warn('Error parsing bank line:', error);
            // Final fallback to positional parsing
            return this.parseFixedWidthLine(line, [
                {start: 9, end: 21},   {start: 21, end: 36},  {start: 36, end: 69},
                {start: 69, end: 82},  {start: 82, end: 96},  {start: 96, end: 131},
                {start: 131, end: 149}, {start: 149, end: 167}, {start: 167, end: 185},
                {start: 185, end: 198}, {start: 198, end: 213}, {start: 213, end: 227},
                {start: 227, end: 238}, {start: 238, end: 249}, {start: 249, end: 260},
                {start: 260, end: 275}
            ]);
        }
    }

    parseBGLAccounts(content) {
        // Try to use registered BGL parser first
        const registeredParsers = window.TextParser?.registeredParsers || [];
        const bglParser = registeredParsers.find(parser => 
            parser.canParse && parser.canParse('BGL_Accounts_With_Non_Zero_Balance.txt', content)
        );
        
        if (bglParser) {
            
            return bglParser.parse(content);
        }
        
        // Fallback parsing if no registered parser available
        
        return this.parseBGLAccountsFallback(content);
    }
    
    parseBGLAccountsFallback(content) {
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);
        
        // Basic BGL account parsing
        const headers = [
            'Section', 'Account Number', 'GL Class Code', 'Product Code', 
            'Product Category', 'Ledger Name', 'Currency', 'Balance Amount', 
            'Balance Type', 'Absolute Balance'
        ];
        
        const data = [];
        let currentSection = 'UNKNOWN';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Skip header and separator lines
            if (line.includes('CENTRAL BANK') || 
                line.includes('REPORT ID') || 
                line.includes('BRANCH') ||
                line.includes('BGL-ACCT-NO') ||
                line.includes('='.repeat(10)) ||
                line.includes('-'.repeat(10))) {
                continue;
            }
            
            // Detect section headers
            if (line.includes('NOMINAL ACCOUNTS')) {
                currentSection = 'NOMINAL ACCOUNTS';
                continue;
            } else if (line.includes('PROFIT & LOSS ACCOUNTS')) {
                currentSection = 'PROFIT & LOSS ACCOUNTS';
                continue;
            }
            
            // Parse account data lines (13 digits account number at start)
            if (/^\d{13}/.test(line)) {
                const accountMatch = line.match(/^(\d{13})\s+(\d{10})\s+(\d{4})\s+(\d{4})\s+(.{35,45})\s+(\w{3})\s+([\d,]+\.?\d*)\s+(DR|CR)\s*$/);
                
                if (accountMatch) {
                    const [, accountNumber, glClassCode, productCode, productCategory, ledgerName, currency, balanceStr, balanceType] = accountMatch;
                    const cleanBalance = balanceStr.replace(/,/g, '');
                    const balanceAmount = parseFloat(cleanBalance);
                    
                    data.push([
                        currentSection,
                        accountNumber.trim(),
                        glClassCode.trim(),
                        productCode.trim(),
                        productCategory.trim(),
                        ledgerName.trim(),
                        currency.trim(),
                        `${balanceStr} ${balanceType}`,
                        balanceType.trim(),
                        balanceAmount
                    ]);
                }
            }
        }
        
        return { headers, data };
    }

    parseLoansBalance(content) {
        // Clear any existing GLB reports when parsing other file types
        this.clearGLBReports();
        
        // Delegate to specialized LoansBalanceParser if available
        if (typeof LoansBalanceParser !== 'undefined') {
            try {
                const parser = new LoansBalanceParser();
                const result = parser.parse(content);
                
                if (result.success) {
                    return { 
                        headers: result.headers, 
                        data: result.data,
                        metadata: result.metadata,
                        summary: result.summary
                    };
                }
            } catch (error) {
                console.warn('LoansBalanceParser failed, falling back to default parser:', error);
            }
        }
        
        // Fallback to basic parsing if specialized parser not available
        return this.parseLoansBalanceFallback(content);
    }

    parseLoansBalanceFallback(content) {
        this.clearGLBReports();
        const lines = content.split('\n');
        const headers = [
            'Account Number', 'CIF Number', 'Product Name', 'Borrower Name',
            'Sanctioned Amount', 'Interest Rate', 'Outstanding Principal', 
            'Outstanding Balance', 'Penal Interest', 'Total Outstanding',
            'Disbursement Date', 'Tenure', 'EMI Paid', 'EMI Pending',
            'Status Code 1', 'Status Code 2', 'Unapplied Amount',
            'Interest Due', 'Total Due'
        ];
        const data = [];
        
        for (const line of lines) {
            if (line.trim() && 
                !line.includes('---') && 
                !line.includes('REPORT ID:') &&
                !line.includes('BRANCH :') &&
                !line.includes('TOTAL') &&
                /^\s*\d{10}/.test(line)) {
                
                // Basic fixed-width parsing for loan account lines
                const row = [
                    line.substring(0, 20).trim(),     // Account Number
                    line.substring(20, 40).trim(),    // CIF Number
                    line.substring(40, 65).trim(),    // Product Name
                    line.substring(65, 105).trim(),   // Borrower Name
                    line.substring(105, 125).trim(),  // Sanctioned Amount
                    line.substring(125, 135).trim(),  // Interest Rate
                    line.substring(135, 155).trim(),  // Outstanding Principal
                    line.substring(155, 175).trim(),  // Outstanding Balance
                    line.substring(175, 190).trim(),  // Penal Interest
                    line.substring(190, 210).trim(),  // Total Outstanding
                    line.substring(210, 220).trim(),  // Disbursement Date
                    line.substring(220, 225).trim(),  // Tenure
                    line.substring(225, 230).trim(),  // EMI Paid
                    line.substring(230, 235).trim(),  // EMI Pending
                    line.substring(235, 240).trim(),  // Status Code 1
                    line.substring(240, 245).trim(),  // Status Code 2
                    line.substring(245, 265).trim(),  // Unapplied Amount
                    line.substring(265, 285).trim(),  // Interest Due
                    line.substring(285, 305).trim()   // Total Due
                ];
                
                if (row[0] && row[1]) { // Ensure we have essential fields
                    data.push(row);
                }
            }
        }
        
        return { headers, data };
    }

    parseNewLoansBalance(content) {
        // Clear any existing GLB reports when parsing other file types
        this.clearGLBReports();
        
        // Delegate to specialized NewLoansBalanceParser if available
        if (typeof NewLoansBalanceParser !== 'undefined') {
            try {
                const parser = new NewLoansBalanceParser();
                const result = parser.parse(content);
                
                return { 
                    headers: result.headers, 
                    data: result.data,
                    reportInfo: result.reportInfo,
                    summary: parser.getSummaryStats(result.data)
                };
            } catch (error) {
                console.warn('NewLoansBalanceParser failed, falling back to default parser:', error);
            }
        }
        
        // Fallback to basic parsing if specialized parser not available
        return this.parseNewLoansBalanceFallback(content);
    }

    parseNewLoansBalanceFallback(content) {
        this.clearGLBReports();
        const lines = content.split('\n');
        const headers = [
            'Account Number', 'CIF Number', 'Product Name', 'Borrower Name',
            'Sanctioned Amount', 'Interest Rate', 'Outstanding Principal', 
            'Outstanding Balance', 'Penal Interest', 'Total Outstanding',
            'Disbursement Date', 'Tenure', 'EMI Paid', 'EMI Pending',
            'GL Code', 'Days Past Due', 'EMI Amount', 'Classification Code',
            'Current Rate', 'Base Rate', 'Spread Rate', 'Penal Rate',
            'Provision Amount', 'Next Due Date', 'Principal Due', 
            'Interest Accrued', 'EMI Due', 'Account Status'
        ];
        const data = [];
        
        for (const line of lines) {
            if (line.trim() && 
                line.length > 300 &&
                !line.includes('---') && 
                !line.includes('REPORT ID:') &&
                !line.includes('BRANCH :') &&
                !line.includes('TOTAL') &&
                /^\s*\d{10}/.test(line)) {
                
                // Basic fixed-width parsing for enhanced loan account lines
                const row = [
                    line.substring(0, 20).trim(),     // Account Number
                    line.substring(20, 40).trim(),    // CIF Number
                    line.substring(40, 70).trim(),    // Product Name
                    line.substring(70, 110).trim(),   // Borrower Name
                    line.substring(110, 130).trim(),  // Sanctioned Amount
                    line.substring(130, 140).trim(),  // Interest Rate
                    line.substring(140, 160).trim(),  // Outstanding Principal
                    line.substring(160, 180).trim(),  // Outstanding Balance
                    line.substring(180, 200).trim(),  // Penal Interest
                    line.substring(200, 220).trim(),  // Total Outstanding
                    line.substring(220, 230).trim(),  // Disbursement Date
                    line.substring(230, 235).trim(),  // Tenure
                    line.substring(235, 240).trim(),  // EMI Paid
                    line.substring(240, 245).trim(),  // EMI Pending
                    line.substring(315, 335).trim(),  // GL Code
                    line.substring(335, 350).trim(),  // Days Past Due
                    line.substring(350, 370).trim(),  // EMI Amount
                    line.substring(370, 385).trim(),  // Classification Code
                    line.substring(385, 400).trim(),  // Current Rate
                    line.substring(400, 415).trim(),  // Base Rate
                    line.substring(415, 430).trim(),  // Spread Rate
                    line.substring(430, 445).trim(),  // Penal Rate
                    line.substring(445, 465).trim(),  // Provision Amount
                    line.substring(465, 480).trim(),  // Next Due Date
                    line.substring(480, 500).trim(),  // Principal Due
                    line.substring(500, 520).trim(),  // Interest Accrued
                    line.substring(520, 540).trim(),  // EMI Due
                    line.substring(690, 720).trim()   // Account Status
                ];
                
                if (row[0] && row[1]) { // Ensure we have essential fields
                    data.push(row);
                }
            }
        }
        
        return { headers, data };
    }

    parseNewCCODBalance(content) {
        // Clear any existing GLB reports when parsing other file types
        this.clearGLBReports();
        
        // Delegate to specialized NewCCODBalanceParser if available
        if (typeof NewCCODBalanceParser !== 'undefined') {
            try {
                const parser = new NewCCODBalanceParser();
                const result = parser.parse(content);
                
                return { 
                    headers: result.headers, 
                    data: result.data,
                    reportInfo: result.reportInfo,
                    summary: parser.getSummaryStats(result.data)
                };
            } catch (error) {
                console.warn('NewCCODBalanceParser failed, falling back to default parser:', error);
            }
        }
        
        // Fallback to basic parsing if specialized parser not available
        return this.parseNewCCODBalanceFallback(content);
    }

    parseNewCCODBalanceFallback(content) {
        this.clearGLBReports();
        const lines = content.split('\n');
        const headers = [
            'Customer Number', 'Account Number', 'Account Type Description', 'Customer Name',
            'Interest Rate', 'Limit', 'Drawing Power', 'Outstanding Balance', 
            'Uncleared Balance', 'OCC Balance', 'Irregularity', 'IRAC New', 'IRAC Old',
            'Last Limit Approved Date', 'UIPY', 'INCA', 'Total URI', 'Increment',
            'Accrual', 'Adjustment', 'Account Type Code', 'Limit Type', 'Limit Expiry Date'
        ];
        const data = [];
        
        for (const line of lines) {
            if (line.trim() && 
                line.length > 100 &&
                !line.includes('---') && 
                !line.includes('REPORT ID:') &&
                !line.includes('BRANCH :') &&
                !line.includes('CUSTOMER NO') &&
                /^\s*\d{10}/.test(line)) {
                
                // Basic parsing for CC/OD account lines
                const trimmedLine = line.trim();
                const parts = trimmedLine.split(/\s+/);
                
                if (parts.length >= 5) {
                    const row = [
                        parts[0] || '',                   // Customer Number
                        parts[1] || '',                   // Account Number
                        parts[2] || '',                   // Account Type Description
                        parts[3] || '',                   // Customer Name (partial)
                        parts[4] || '',                   // Interest Rate
                        // Add more fields as needed
                    ];
                    
                    if (row[0] && row[1]) { // Ensure we have essential fields
                        data.push(row);
                    }
                }
            }
        }
        
        return { headers, data };
    }

    parseCCODBalance(content) {
        // Clear any existing GLB reports when parsing other file types
        this.clearGLBReports();
        
        // Delegate to specialized CCODBalanceParser if available
        if (typeof CCODBalanceParser !== 'undefined') {
            try {
                const parser = new CCODBalanceParser();
                const result = parser.parse(content);
                
                return { 
                    headers: result.headers, 
                    data: result.data,
                    reportInfo: result.reportInfo,
                    summary: parser.getSummaryStats(result.data)
                };
            } catch (error) {
                console.warn('CCODBalanceParser failed, falling back to default parser:', error);
            }
        }
        
        // Fallback to basic parsing if specialized parser not available
        return this.parseCCODBalanceFallback(content);
    }

    parseCCODBalanceFallback(content) {
        this.clearGLBReports();
        const lines = content.split('\n');
        const headers = [
            'Customer Number', 'Account Number', 'Account Type Description', 'Customer Name',
            'Interest Rate', 'Limit', 'Drawing Power', 'Outstanding Balance', 
            'Uncleared Balance', 'OCC Balance', 'Irregularity', 'IRAC New', 'IRAC Old',
            'Last Limit Approved Date', 'UIPY', 'INCA', 'Total URI', 'Increment',
            'Accrual', 'Adjustment'
        ];
        const data = [];
        
        for (const line of lines) {
            if (line.trim() && 
                line.length > 100 &&
                !line.includes('---') && 
                !line.includes('REPORT ID:') &&
                !line.includes('BRANCH :') &&
                !line.includes('CUSTOMER NO') &&
                !line.includes('SEGMENT TOTAL') &&
                !line.includes('PRODUCT TOTAL') &&
                /^\s*\d{10}/.test(line)) {
                
                // Basic parsing for CC/OD account lines
                const trimmedLine = line.trim();
                const parts = trimmedLine.split(/\s+/);
                
                if (parts.length >= 5) {
                    const row = [
                        parts[0] || '',                   // Customer Number
                        parts[1] || '',                   // Account Number
                        parts[2] || '',                   // Account Type Description
                        parts[3] || '',                   // Customer Name (partial)
                        parts[4] || '',                   // Interest Rate
                        // Add more fields as needed
                    ];
                    
                    if (row[0] && row[1]) { // Ensure we have essential fields
                        data.push(row);
                    }
                }
            }
        }
        
        return { headers, data };
    }

    parseSDVAccounts(content) {
        // Clear any existing GLB reports when parsing other file types
        this.clearGLBReports();
        
        // Delegate to specialized SDV parser if available
        if (window.SDVAccountsParser) {
            const parser = new window.SDVAccountsParser();
            const result = parser.parse(content);
            
            if (result.success) {
                // Store metadata for analysis
                this.metadata = result;
                
                return {
                    headers: result.headers,
                    data: result.data
                };
            }
        }
        
        // Fallback to simple parsing
        return this.parseSDVAccountsFallback(content);
    }

    parseSDVAccountsFallback(content) {
        this.clearGLBReports();
        const lines = content.split('\n');
        const headers = [
            'SR_NO', 'CIF_NUMBER', 'SDV_ACCOUNT_NUMBER', 'LOCKER_HOLDER',
            'FEE_BEARING_ACCOUNT', 'CABINET_ID', 'LOCKER_ID', 'LOCKER_TYPE',
            'KEY_ID', 'MODE_OF_COLLECTION', 'DUE_AMOUNT', 'PAID_UPTO_DATE',
            'KEY_STATUS', 'LOCKER_STATUS', 'FEE_WAIVED', 'ANNUAL_RENT',
            'CAUTION_ACCOUNT', 'PENAL_CHARGE', 'NOMINATION', 'REVISED_AGREE_OBTAINED'
        ];
        const data = [];
        
        for (const line of lines) {
            // Parse SDV data lines (pipe-separated format)
            if (line.trim().startsWith('|') && 
                line.includes('|') && 
                /\|\s*\d+\s*\|/.test(line) &&
                !line.includes('SR') &&
                !line.includes('TOTAL :')) {
                
                const parts = line.split('|').map(part => part.trim()).filter(part => part !== '');
                
                if (parts.length >= 19) {
                    data.push(parts.slice(0, 20)); // Take up to 20 columns
                }
            }
        }
        
        return { headers, data };
    }

    parseCGTMSEClaims(content) {
        // Clear any existing GLB reports when parsing other file types
        this.clearGLBReports();
        
        // Delegate to specialized CGTMSE parser if available
    if (typeof parseCGTMSEClaims === 'function') {
            const result = parseCGTMSEClaims(content);
            
            if (result.success) {
                const convertedData = result.data.map(row => {
                    const values = Object.values(row);
                    return values;
                });
                return {
                    headers: result.headers,
                    data: convertedData
                };
            } else {
                throw new Error(result.error);
            }
        }
        
        // Fallback to basic pipe-delimited parsing
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            throw new Error('File must contain at least a header row and one data row');
        }
        
        const headers = lines[0].split('|').map(header => header.trim());
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split('|').map(value => value.trim());
            if (values.length === headers.length) {
                data.push(values);
            }
        }
        
        return { headers, data };
    }

    parseGLBReport(content) {
        // Use specialized GLB Report parser if available
        if (typeof GLBReportParser !== 'undefined') {
            try {
                const parser = new GLBReportParser();
                const result = parser.parse(content, this.currentFileName);
                
                if (result.success) {
                    // Convert to the format expected by the text parser
                    const combinedData = [];
                    const maxRows = Math.max(result.data.assets.length, result.data.liabilities.length);
                    
                    for (let i = 0; i < maxRows; i++) {
                        const asset = result.data.assets[i] || { header: '', value: 0, type: '' };
                        const liability = result.data.liabilities[i] || { header: '', value: 0, type: '' };
                        
                        combinedData.push([
                            asset.header,
                            asset.value > 0 ? asset.value.toFixed(2) : '',
                            liability.header,
                            liability.value > 0 ? liability.value.toFixed(2) : ''
                        ]);
                    }
                    
                    // Store the parsed result for potential HTML generation
                    this.glbReportResult = result;
                    
                    // Add a custom display method for GLB reports
                    setTimeout(() => {
                        this.displayGLBReportSummary(result);
                    }, 100);
                    
                    return {
                        headers: ['Assets', 'Asset Value', 'Liabilities', 'Liability Value'],
                        data: combinedData
                    };
                } else {
                    throw new Error('GLB report parsing failed');
                }
            } catch (error) {
                console.error('GLBReportParser failed:', error);
                throw error;
            }
        } else {
            throw new Error('GLBReportParser not available. Please ensure glbReportParser.js is loaded.');
        }
    }

    clearGLBReports() {
        // Close any existing GLB popup
        const existingPopup = document.getElementById('glb-report-popup');
        if (existingPopup) {
            existingPopup.remove();
        }
    }

    displayGLBReportSummary(parsedResult) {
        // Close any existing GLB popup first
        this.clearGLBReports();

        // Create popup overlay
        const popup = document.createElement('div');
        popup.id = 'glb-report-popup';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        // Create popup content
        const popupContent = document.createElement('div');
        popupContent.style.cssText = `
            background: white;
            max-width: 90%;
            max-height: 90%;
            overflow: auto;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            position: relative;
            padding: 20px;
        `;

        // Create close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background-color 0.2s;
        `;
        
        closeButton.onmouseover = () => closeButton.style.backgroundColor = '#f0f0f0';
        closeButton.onmouseout = () => closeButton.style.backgroundColor = 'transparent';
        closeButton.onclick = () => popup.remove();

        // Add GLB report content
        if (typeof GLBReportParser !== 'undefined') {
            const parser = new GLBReportParser();
            popupContent.innerHTML = parser.generateHTMLTable(parsedResult);
        }

        // Assemble popup
        popupContent.appendChild(closeButton);
        popup.appendChild(popupContent);
        document.body.appendChild(popup);

        // Close popup when clicking outside content
        popup.onclick = (e) => {
            if (e.target === popup) {
                popup.remove();
            }
        };

        // Close popup with Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                popup.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    formatIndianCurrency(amount) {
        if (!amount || amount === 0) return '0.00';
        
        // Convert to Indian numbering system (lakhs, crores)
        const crores = Math.floor(amount / 10000000);
        const lakhs = Math.floor((amount % 10000000) / 100000);
        const thousands = Math.floor((amount % 100000) / 1000);
        const hundreds = amount % 1000;

        let result = [];
        if (crores > 0) result.push(crores + (crores === 1 ? ' Cr' : ' Cr'));
        if (lakhs > 0) result.push(lakhs + (lakhs === 1 ? ' L' : ' L'));
        if (thousands > 0 || (crores === 0 && lakhs === 0)) {
            result.push(new Intl.NumberFormat('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(thousands * 1000 + hundreds));
        }

        return result.join(' ') || '0.00';
    }

    parseFixedWidth(content) {
        // Clear any existing GLB reports when parsing other file types
        this.clearGLBReports();
        
        const lines = content.split('\n');
        const skipLines = parseInt(document.getElementById('skipLines').value);
        const headerRowIndex = parseInt(document.getElementById('headerRow').value) - 1;
        
        // Auto-detect column positions from header line
        const headerLine = lines[headerRowIndex];
        const positions = this.detectColumnPositions(headerLine);
        
        const headers = positions.map(pos => 
            headerLine.substring(pos.start, pos.end).trim()
        );

        const data = [];
        for (let i = skipLines; i < lines.length; i++) {
            if (i !== headerRowIndex && lines[i].trim()) {
                const row = this.parseFixedWidthLine(lines[i], positions);
                if (row && row.some(cell => cell.trim())) {
                    data.push(row);
                }
            }
        }

        return { headers, data };
    }

    detectColumnPositions(headerLine) {
        const positions = [];
        let inColumn = false;
        let start = 0;

        for (let i = 0; i < headerLine.length; i++) {
            const char = headerLine[i];
            if (!inColumn && char !== ' ') {
                inColumn = true;
                start = i;
            } else if (inColumn && char === ' ') {
                // Look ahead to see if this is just spacing within a column
                let spaceCount = 0;
                for (let j = i; j < headerLine.length && headerLine[j] === ' '; j++) {
                    spaceCount++;
                }
                if (spaceCount > 2) { // More than 2 spaces indicates column boundary
                    positions.push({ start, end: i });
                    inColumn = false;
                }
            }
        }

        if (inColumn) {
            positions.push({ start, end: headerLine.length });
        }

        return positions;
    }

    parseFixedWidthLine(line, positions) {
        return positions.map(pos => 
            line.substring(pos.start, pos.end).trim()
        );
    }

    parseDelimited(content) {
        // Clear any existing GLB reports when parsing other file types
        this.clearGLBReports();
        
        const lines = content.split('\n');
        const delimiter = document.getElementById('delimiter').value.replace('\\t', '\t');
        const skipLines = parseInt(document.getElementById('skipLines').value);
        const headerRowIndex = parseInt(document.getElementById('headerRow').value) - 1;

        const headers = lines[headerRowIndex] ? 
            lines[headerRowIndex].split(delimiter).map(h => h.trim()) : 
            [];

        const data = [];
        for (let i = skipLines; i < lines.length; i++) {
            if (i !== headerRowIndex && lines[i].trim()) {
                const row = lines[i].split(delimiter).map(cell => cell.trim());
                if (row.length > 1) {
                    data.push(row);
                }
            }
        }

        return { headers, data };
    }

    parseRegex(content) {
        this.clearGLBReports();
        const lines = content.split('\n');
        const pattern = document.getElementById('customPattern').value;
        const skipLines = parseInt(document.getElementById('skipLines').value);
        
        if (!pattern) {
            throw new Error('Custom regex pattern is required');
        }

        const regex = new RegExp(pattern, 'g');
        const headers = ['Column 1', 'Column 2', 'Column 3']; // Default headers
        const data = [];

        for (let i = skipLines; i < lines.length; i++) {
            const line = lines[i];
            const matches = line.match(regex);
            if (matches && matches.length > 0) {
                data.push(matches);
            }
        }

        return { headers, data };
    }

    parsePositional(content) {
        this.clearGLBReports();
        // Implement positional parsing based on character positions
        const lines = content.split('\n');
        const skipLines = parseInt(document.getElementById('skipLines').value);
        
        // For now, use a simple space-based splitting
        const headers = ['Field 1', 'Field 2', 'Field 3'];
        const data = [];

        for (let i = skipLines; i < lines.length; i++) {
            if (lines[i].trim()) {
                const row = lines[i].split(/\s+/).filter(cell => cell.trim());
                if (row.length > 0) {
                    data.push(row);
                }
            }
        }

        return { headers, data };
    }

    renderTable() {
        // Initialize virtual scrolling based on data size
        this.initializeVirtualScrolling();
        
        this.renderTableHeader();
        this.renderTableBody();
        this.renderPagination();
        this.renderColumnControls();
        this.checkForCustomerEnrichmentOpportunity();
    }

    // Helper function to determine if a column should have filtering disabled
    shouldDisableFilter(columnIndex, headerName) {
        const disabledFilterColumns = [
            'Customer Number',
            'Account Number', 
            'Customer Name',
            'CIF Number',
            'Borrower Name'
        ];
        
        return disabledFilterColumns.includes(headerName);
    }

    renderTableHeader() {
        const thead = document.getElementById('tableHead');
        thead.innerHTML = '';
        
        const headerRow = document.createElement('tr');
        const filterRow = document.createElement('tr');
        
        this.headers.forEach((header, index) => {
            if (!this.hiddenColumns.has(index)) {
                // Header cell with sorting
                const th = document.createElement('th');
                th.textContent = header;
                th.classList.add('sortable');
                th.dataset.column = index;
                th.addEventListener('click', () => this.sortByColumn(index));
                
                // Add filtered column styling
                let headerActiveFilters = 0;
                if (this.columnFilters[index]) {
                    if (Array.isArray(this.columnFilters[index])) {
                        headerActiveFilters = this.columnFilters[index].length;
                    } else if (typeof this.columnFilters[index] === 'object') {
                        headerActiveFilters = 1; // numeric/date filter applied
                    }
                }
                if (headerActiveFilters > 0) {
                    th.classList.add('filtered-column');
                }
                
                if (this.sortColumn === index) {
                    th.classList.add(this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
                }
                
                headerRow.appendChild(th);
                
                // Filter cell - skip for certain columns to improve performance
                const filterTh = document.createElement('th');
                filterTh.style.padding = '4px';
                filterTh.style.borderBottom = '1px solid #dee2e6';
                
                // Check if filtering should be disabled for this column
                if (this.shouldDisableFilter(index, header)) {
                    // Show a disabled placeholder for identity columns
                    const disabledIndicator = document.createElement('div');
                    disabledIndicator.innerHTML = '🔒';
                    disabledIndicator.style.cssText = `
                        width: 100%; 
                        padding: 4px; 
                        text-align: center;
                        color: #999;
                        font-size: 12px;
                        border: 1px solid #eee;
                        background: #f8f9fa;
                        border-radius: 3px;
                        cursor: not-allowed;
                    `;
                    disabledIndicator.title = 'Filtering disabled for performance';
                    filterTh.appendChild(disabledIndicator);
                } else {
                    const filterContainer = document.createElement('div');
                    filterContainer.style.position = 'relative';
                    
                    const filterButton = document.createElement('button');
                    filterButton.innerHTML = '🔽';
                    filterButton.style.cssText = `
                        width: 100%; 
                        padding: 4px; 
                        border: 1px solid #ddd; 
                        background: white; 
                        cursor: pointer;
                        font-size: 12px;
                        border-radius: 3px;
                    `;
                    filterButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.showFilterDropdown(index, e.target);
                    });
                    
                    // Show active filter count and visual styling
                    const activeFilters = this.columnFilters[index] ? this.columnFilters[index].length : 0;
                    if (activeFilters > 0) {
                        filterButton.classList.add('active-filter');
                        filterButton.innerHTML = `🔽 (${activeFilters})`;
                    } else {
                        // Reset styles when no filter is active
                        filterButton.classList.remove('active-filter');
                        filterButton.innerHTML = '🔽';
                    }
                    
                    filterContainer.appendChild(filterButton);
                    filterTh.appendChild(filterContainer);
                }
                
                filterRow.appendChild(filterTh);
            }
        });
        
        thead.appendChild(headerRow);
        thead.appendChild(filterRow);
    }

    renderTableBody() {
        // Use virtual scrolling for large datasets
        if (this.virtualScrolling.enabled) {
            this.renderVirtualTableBody();
            return;
        }

        // Traditional pagination rendering for smaller datasets
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = this.pageSize === 'all' ? this.filteredData.length : startIndex + this.pageSize;
        const pageData = this.filteredData.slice(startIndex, endIndex);

        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();

        pageData.forEach(row => {
            const tr = document.createElement('tr');
            row.forEach((cell, index) => {
                if (!this.hiddenColumns.has(index)) {
                    const td = document.createElement('td');
                    td.textContent = cell || '';
                    td.title = cell || ''; // Tooltip for long content
                    tr.appendChild(td);
                }
            });
            fragment.appendChild(tr);
        });

        tbody.appendChild(fragment);
    }

    renderPagination() {
        const pagination = document.getElementById('pagination');
        pagination.innerHTML = '';

        // Hide pagination when virtual scrolling is enabled
        if (this.virtualScrolling.enabled) {
            const info = document.createElement('div');
            info.className = 'virtual-scroll-info';
            info.innerHTML = `
                <span style="color: #666; font-size: 14px;">
                    🚀 Virtual scrolling enabled for ${this.filteredData.length.toLocaleString()} rows 
                    <small>(scroll to view more)</small>
                </span>
            `;
            pagination.appendChild(info);
            return;
        }

        if (this.pageSize === 'all') return;

        const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '← Previous';
        prevBtn.disabled = this.currentPage === 1;
        prevBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        pagination.appendChild(prevBtn);

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.classList.toggle('active', i === this.currentPage);
            pageBtn.addEventListener('click', () => this.goToPage(i));
            pagination.appendChild(pageBtn);
        }

        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next →';
        nextBtn.disabled = this.currentPage === totalPages;
        nextBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        pagination.appendChild(nextBtn);

        // Page info
        const pageInfo = document.createElement('span');
        pageInfo.textContent = `Page ${this.currentPage} of ${totalPages} (${this.filteredData.length} total rows)`;
        pageInfo.style.marginLeft = '20px';
        pagination.appendChild(pageInfo);
    }

    renderColumnControls() {
        const columnList = document.getElementById('columnList');
        columnList.innerHTML = '';

        this.headers.forEach((header, index) => {
            const label = document.createElement('label');
            label.className = 'column-checkbox';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = !this.hiddenColumns.has(index);
            checkbox.addEventListener('change', () => this.toggleColumn(index));
            
            const span = document.createElement('span');
            span.textContent = header;
            
            label.appendChild(checkbox);
            label.appendChild(span);
            columnList.appendChild(label);
        });
    }

    sortByColumn(columnIndex) {
        if (this.sortColumn === columnIndex) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = columnIndex;
            this.sortDirection = 'asc';
        }

        // Show loading animation for sorting
        this.showLoading('Sorting data...');

        // Use setTimeout to allow the loading animation to show
        setTimeout(() => {
            this.filteredData.sort((a, b) => {
                const aVal = a[columnIndex] ?? '';
                const bVal = b[columnIndex] ?? '';

                // Generalized date parsing (supports dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd, and Excel serials)
                const aDate = this.parseAnyDate(aVal);
                const bDate = this.parseAnyDate(bVal);

                let comparison;
                if (aDate && bDate) {
                    comparison = aDate.getTime() - bDate.getTime();
                } else {
                    // Try to parse as numbers
                    const aNum = parseFloat(String(aVal).replace(/[\,\s]/g, ''));
                    const bNum = parseFloat(String(bVal).replace(/[\,\s]/g, ''));
                    if (!isNaN(aNum) && !isNaN(bNum)) {
                        comparison = aNum - bNum;
                    } else {
                        comparison = String(aVal).localeCompare(String(bVal));
                    }
                }

                return this.sortDirection === 'asc' ? comparison : -comparison;
            });

            this.renderTable();
            this.hideLoading();
        }, 100);
    }

    parseDate(dateStr) {
        // Backwards compatibility: DD/MM/YYYY only
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
    }

    // Parse various date formats and Excel serials; return Date or null
    parseAnyDate(value) {
        if (value === null || value === undefined) return null;
        const raw = String(value).trim();
        if (!raw) return null;

        // Excel serial date (rough window 1900-01-01..2149-12-31)
        const n = Number(raw);
        if (!isNaN(n) && isFinite(n) && n > 10000 && n < 90000) {
            return this.excelSerialToDate(n);
        }

        // dd/mm/yyyy or dd-mm-yyyy
        let m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (m) {
            const d = parseInt(m[1], 10), mo = parseInt(m[2], 10), y = parseInt(m[3], 10);
            const dt = new Date(y, mo - 1, d);
            if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) return dt;
        }

        // yyyy-mm-dd
        m = raw.match(/^(\d{4})[\-](\d{1,2})[\-](\d{1,2})$/);
        if (m) {
            const y = parseInt(m[1], 10), mo = parseInt(m[2], 10), d = parseInt(m[3], 10);
            const dt = new Date(y, mo - 1, d);
            if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) return dt;
        }

        return null;
    }

    excelSerialToDate(serial) {
        // Excel's day 1 is 1899-12-31 (with 1900 leap-year bug). JS date from 1899-12-30 is standard workaround
        const base = new Date(Date.UTC(1899, 11, 30));
        const ms = Math.round(serial * 24 * 60 * 60 * 1000);
        return new Date(base.getTime() + ms);
    }

    toggleColumn(columnIndex) {
        if (this.hiddenColumns.has(columnIndex)) {
            this.hiddenColumns.delete(columnIndex);
        } else {
            this.hiddenColumns.add(columnIndex);
        }
        this.renderTable();
    }

    handleSearchKeypress(event) {
        if (event.key === 'Enter') {
            this.showLoading('Searching data...');
            // Use setTimeout to allow loading animation to show
            setTimeout(() => {
                this.performFuzzySearch();
                this.hideLoading();
            }, 100);
        }
    }

    performFuzzySearch() {
    const searchTerm = document.getElementById('searchTable').value.toLowerCase().trim();
    const mode = (document.querySelector('input[name="searchMode"]:checked')?.value) || 'partial';
        
        // Start with all data
        let filtered = [...this.originalData];
        
        // Apply column filters first (support array-based and numeric/date object filters)
        Object.keys(this.columnFilters).forEach(columnIndex => {
            const rule = this.columnFilters[columnIndex];
            if (!rule) return;
            if (Array.isArray(rule) && rule.length > 0) {
                filtered = filtered.filter(row => {
                    const cellValue = row[columnIndex] ?? '';
                    return rule.includes(cellValue);
                });
            } else if (typeof rule === 'object') {
                filtered = filtered.filter(row => this.applyAdvancedFilter(rule, row[columnIndex]));
            }
        });
        
        // Apply fuzzy search filter
        if (searchTerm) {
            filtered = filtered.filter(row =>
                row.some(cell => {
                    if (!cell) return false;
                    const cellText = cell.toString().toLowerCase();
                    if (mode === 'exact') {
                        return cellText === searchTerm || cellText.includes(searchTerm);
                    }
                    return this.fuzzyMatch(cellText, searchTerm);
                })
            );
        }
        
        this.filteredData = filtered;
        this.currentPage = 1;
        
        // Update virtual scrolling when data changes
        this.updateVirtualScrolling();
        
        this.renderTable();
        
        // Update analysis to reflect filtered data - use debounced analysis
        this.markAnalysisDirty();
    }

    clearAllFilters() {
        this.showLoading('Clearing filters...');
        
        // Use setTimeout to allow loading animation to show
        setTimeout(() => {
            // Clear all column filters
            this.columnFilters = {};
            
            // Clear search box
            const searchTable = document.getElementById('searchTable');
            if (searchTable) {
                searchTable.value = '';
            }
            
            // Reset filtered data to show all data
            this.filteredData = [...this.originalData];
            this.currentPage = 1;
            
            // Update virtual scrolling when data changes
            this.updateVirtualScrolling();
            
            // Update display
            this.renderTable();
            this.markAnalysisDirty();
            
            this.hideLoading();
            
            // Show success message
            this.showSuccessMessage('All filters cleared. Showing complete dataset.');
        }, 100);
    }

    fuzzyMatch(text, searchTerm) {
        if (!searchTerm) return true;
        
        // Exact substring match always returns true
        if (text.includes(searchTerm)) return true;
        
        // Use optimal default fuzzy matching (equivalent to 75% intensity)
        // Good balance between accuracy and flexibility
        const threshold = 0.55;
        const score = this.calculateFuzzyScore(text, searchTerm);
        
        return score >= threshold;
    }

    calculateFuzzyScore(text, searchTerm) {
        // Advanced fuzzy matching with scoring
        let score = 0;
        let searchIndex = 0;
        let consecutiveMatches = 0;
        
        for (let i = 0; i < text.length && searchIndex < searchTerm.length; i++) {
            if (text[i] === searchTerm[searchIndex]) {
                searchIndex++;
                consecutiveMatches++;
                score += consecutiveMatches; // Bonus for consecutive matches
            } else {
                consecutiveMatches = 0;
            }
        }
        
        // Calculate final score
        const completion = searchIndex / searchTerm.length;
        const normalizedScore = score / (searchTerm.length * searchTerm.length);
        
        return (completion * 0.7) + (normalizedScore * 0.3);
    }

    filterData() {
    const searchTerm = document.getElementById('searchTable').value.toLowerCase();
    const mode = (document.querySelector('input[name="searchMode"]:checked')?.value) || 'partial';
        
        // Start with all data
        let filtered = [...this.originalData];
        
        // Apply column filters first
        Object.keys(this.columnFilters).forEach(columnIndex => {
            const rule = this.columnFilters[columnIndex];
            if (!rule) return;
            if (Array.isArray(rule) && rule.length > 0) {
                filtered = filtered.filter(row => {
                    const cellValue = row[columnIndex] ?? '';
                    return rule.includes(cellValue);
                });
            } else if (typeof rule === 'object') {
                filtered = filtered.filter(row => this.applyAdvancedFilter(rule, row[columnIndex]));
            }
        });
        
        // Apply text search filter
        if (searchTerm) {
            filtered = filtered.filter(row =>
                row.some(cell => {
                    if (!cell) return false;
                    const cellText = cell.toString().toLowerCase();
                    if (mode === 'exact') {
                        return cellText === searchTerm || cellText.includes(searchTerm);
                    }
                    return cellText.includes(searchTerm);
                })
            );
        }
        
        this.filteredData = filtered;
        this.currentPage = 1;
        this.renderTable();
    }

    changePageSize() {
        const newPageSize = document.getElementById('pageSize').value;
        this.pageSize = newPageSize === 'all' ? 'all' : parseInt(newPageSize);
        this.currentPage = 1;
        this.renderTable();
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderTableBody();
            this.renderPagination();
        }
    }

    toggleColumnControls() {
        const columnControls = document.getElementById('columnControls');
        const isVisible = columnControls.style.display !== 'none';
        columnControls.style.display = isVisible ? 'none' : 'block';
    }

    combineBankingAnalysis(generalStats, bankingReport) {
        // Combine general statistics with banking-specific analysis
        const combinedStats = { ...generalStats };
        
        if (bankingReport) {
            combinedStats.banking = {
                summary: bankingReport.summary,
                accountAnalysis: bankingReport.accountAnalysis,
                interestAnalysis: bankingReport.interestAnalysis,
                recommendations: bankingReport.recommendations
            };
        }
        
        return combinedStats;
    }

    calculateStatistics(dataToAnalyze = null) {
        // Use provided data or fall back to filtered data, then all data
        const analysisData = dataToAnalyze || this.filteredData || this.data;
        
        const stats = {
            totalRows: analysisData.length,
            totalColumns: this.headers.length,
            numericColumns: [],
            textColumns: [],
            uniqueValues: {},
            isFiltered: analysisData !== this.data // Indicate if we're showing filtered results
        };

        // Analyze each column
        this.headers.forEach((header, index) => {
            const values = analysisData.map(row => row[index]).filter(val => val);
            const numericValues = values.map(val => parseFloat(val.toString().replace(/[,\s]/g, ''))).filter(val => !isNaN(val));
            
            stats.uniqueValues[header] = new Set(values).size;
            
            if (numericValues.length > values.length * 0.5) {
                // Mostly numeric column
                stats.numericColumns.push({
                    name: header,
                    index,
                    min: numericValues.length > 0 ? Math.min(...numericValues) : 0,
                    max: numericValues.length > 0 ? Math.max(...numericValues) : 0,
                    avg: numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : 0,
                    sum: numericValues.reduce((a, b) => a + b, 0),
                    count: numericValues.length
                });
            } else {
                // Text column
                stats.textColumns.push({
                    name: header,
                    index,
                    maxLength: values.length > 0 ? Math.max(...values.map(v => v.toString().length)) : 0,
                    minLength: values.length > 0 ? Math.min(...values.map(v => v.toString().length)) : 0,
                    avgLength: values.length > 0 ? values.reduce((a, b) => a + b.toString().length, 0) / values.length : 0
                });
            }
        });

        return stats;
    }

    renderStatistics(stats) {
        const statsGrid = document.getElementById('statsGrid');
        statsGrid.innerHTML = '';

        // Add filtered data indicator
        if (stats.isFiltered) {
            const filterIndicator = document.createElement('div');
            filterIndicator.className = 'filter-indicator';
            filterIndicator.innerHTML = `
                <div style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 4px; padding: 8px; margin-bottom: 15px; text-align: center;">
                    <strong>📊 Filtered Data Analysis</strong>
                    <button onclick="window.textParserInstance.performDataAnalysisImmediate()" style="margin-left: 10px; padding: 2px 8px; font-size: 11px; background: #2196f3; color: white; border: none; border-radius: 3px; cursor: pointer;">🔄 Refresh</button>
                    <button onclick="window.textParserInstance.clearAllFilters()" style="margin-left: 5px; padding: 2px 8px; font-size: 11px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer;">✖ Clear Filters</button><br>
                    <small>Analysis reflects ${stats.totalRows} filtered rows out of ${this.data.length} total rows</small>
                </div>
            `;
            statsGrid.appendChild(filterIndicator);
        }

        // Banking-specific stats if available (only show requested fields)
        if (stats.banking) {
            const banking = stats.banking;
            
            // Summary stats - only the requested ones
            if (banking.summary) {
                this.addStatItem(statsGrid, banking.summary.totalAccounts, 'Total Accounts');
                this.addStatItem(statsGrid, `₹${banking.summary.totalBalance.toLocaleString()}`, 'Total Balance');
                this.addStatItem(statsGrid, `₹${banking.summary.averageBalance.toLocaleString()}`, 'Average Balance');
                
                if (banking.summary.branchName) {
                    this.addStatItem(statsGrid, banking.summary.branchName, 'Branch Name');
                    this.addStatItem(statsGrid, banking.summary.branchCode, 'Branch Code');
                }
            }
            
            // Account status distribution - only the requested ones with proper mapping
            if (banking.accountAnalysis.statusDistribution) {
                // Debug: log available status keys
                // Debug: status keys
                
                const statusMapping = {
                    'Open Account': ['OPEN', 'ACTIVE', 'OPERATIONAL', 'Open Account', 'OPEN ACCOUNT'],
                    'Inoperative Accounts': ['INOPERATIVE', 'INACTIVE', 'Inoperative Accounts', 'INOPERATIVE ACCOUNTS'],
                    'Dormant Unclaimed accounts': ['DORMANT UNCLA', 'DORMANT', 'UNCLAIMED', 'Dormant Unclaimed accounts', 'DORMANT UNCLAIMED']
                };
                
                Object.keys(statusMapping).forEach(displayStatus => {
                    let count = 0;
                    const possibleKeys = statusMapping[displayStatus];
                    
                    // Sum counts from all possible key variations
                    possibleKeys.forEach(key => {
                        const keyCount = banking.accountAnalysis.statusDistribution[key] || 0;
                        count += keyCount;
                        if (keyCount > 0) {
                            // Debug: key distribution
                        }
                    });
                    
                    this.addStatItem(statsGrid, count, displayStatus);
                });
            }
        } else if (stats.type === 'sdv-accounts') {
            // SDV-specific stats (showing only selected ones)
            this.addStatItem(statsGrid, stats.activeLockers, 'Active Lockers');
            this.addStatItem(statsGrid, `₹${parseFloat(stats.totalDueAmount).toLocaleString()}`, 'Total Due Amount');
            
            if (stats.branchInfo && stats.branchInfo.branchCode) {
                this.addStatItem(statsGrid, stats.branchInfo.branchCode, 'Branch Code');
            }
            
            // Add SDV filtering controls
            this.renderSDVFilters(statsGrid, stats);
        } else {
            // Basic stats for non-banking data
            this.addStatItem(statsGrid, stats.totalRows, 'Total Rows');
            this.addStatItem(statsGrid, stats.totalColumns, 'Total Columns');
            this.addStatItem(statsGrid, stats.numericColumns.length, 'Numeric Columns');
            this.addStatItem(statsGrid, stats.textColumns.length, 'Text Columns');
        }
    }

    renderSDVFilters(statsGrid, stats) {
        // Create filter section
        const filterSection = document.createElement('div');
        filterSection.className = 'sdv-filter-section';
        filterSection.style.cssText = `
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #dee2e6;
        `;

        const filterTitle = document.createElement('h4');
        filterTitle.textContent = '🔍 Filter Lockers by Issues';
        filterTitle.style.cssText = 'margin: 0 0 10px 0; color: #495057; font-size: 14px;';
        filterSection.appendChild(filterTitle);

        // Filter checkboxes
        const checkboxContainer = document.createElement('div');
        checkboxContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;';

        const filters = [
            { id: 'includeDue', label: `Pending Due (${stats.analysis.stats.totalPendingDue})`, color: '#dc3545' },
            { id: 'includePenal', label: `Pending Penal (${stats.analysis.stats.totalPendingPenal})`, color: '#fd7e14' },
            { id: 'includeAgreement', label: `Pending Agreement (${stats.analysis.stats.totalPendingAgreement})`, color: '#6f42c1' }
        ];

        // Store current checkbox states before rendering
        const currentStates = {};
        filters.forEach(filter => {
            const existingCheckbox = document.getElementById(filter.id);
            if (existingCheckbox) {
                currentStates[filter.id] = existingCheckbox.checked;
            }
        });

        // Store current operator state
        const existingOperator = document.getElementById('sdvOperator');
        const currentOperator = existingOperator ? existingOperator.value : 'OR';

        filters.forEach(filter => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.style.cssText = 'display: flex; align-items: center; gap: 5px;';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = filter.id;
            checkbox.style.cssText = 'margin: 0;';
            
            // Restore previous state if it existed
            if (currentStates[filter.id] !== undefined) {
                checkbox.checked = currentStates[filter.id];
            }

            const label = document.createElement('label');
            label.setAttribute('for', filter.id);
            label.textContent = filter.label;
            label.style.cssText = `color: ${filter.color}; font-weight: 500; font-size: 12px; cursor: pointer; margin: 0;`;

            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            checkboxContainer.appendChild(checkboxDiv);
        });

        filterSection.appendChild(checkboxContainer);

        // Operator selection
        const operatorContainer = document.createElement('div');
        operatorContainer.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 10px;';

        const operatorLabel = document.createElement('label');
        operatorLabel.textContent = 'Combine:';
        operatorLabel.style.cssText = 'font-size: 12px; font-weight: 500; margin: 0;';

        const operatorSelect = document.createElement('select');
        operatorSelect.id = 'sdvOperator';
        operatorSelect.style.cssText = 'padding: 2px 6px; font-size: 12px; border: 1px solid #ced4da; border-radius: 4px;';
        operatorSelect.innerHTML = `
            <option value="OR">Any (OR)</option>
            <option value="AND">All (AND)</option>
        `;
        
        // Restore previous operator state
        operatorSelect.value = currentOperator;

        operatorContainer.appendChild(operatorLabel);
        operatorContainer.appendChild(operatorSelect);
        filterSection.appendChild(operatorContainer);

        // Action buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 8px;';

        const applyButton = document.createElement('button');
        applyButton.textContent = 'Apply Filter';
        applyButton.style.cssText = `
            padding: 6px 12px;
            font-size: 12px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
        `;
        applyButton.onclick = () => this.applySDVFilter(stats);

        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear';
        clearButton.style.cssText = `
            padding: 6px 12px;
            font-size: 12px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
        `;
        clearButton.onclick = () => this.clearSDVFilter();

        buttonContainer.appendChild(applyButton);
        buttonContainer.appendChild(clearButton);
        filterSection.appendChild(buttonContainer);

        statsGrid.appendChild(filterSection);
    }

    applySDVFilter(stats) {
        const includeDue = document.getElementById('includeDue')?.checked || false;
        const includePenal = document.getElementById('includePenal')?.checked || false;
        const includeAgreement = document.getElementById('includeAgreement')?.checked || false;
        const operator = document.getElementById('sdvOperator')?.value || 'OR';

        console.log('🔍 Filter options:', { includeDue, includePenal, includeAgreement, operator });

        if (!includeDue && !includePenal && !includeAgreement) {
            this.showMessage('Please select at least one filter option.', 'warning');
            return;
        }

        const filteredRows = stats.sdvParser.filterAnalysis(stats.analysis, {
            includeDue,
            includePenal,
            includeAgreement,
            operator
        });

        console.log('📊 Filtered rows count:', filteredRows.length);
        console.log('📊 Sample filtered row:', filteredRows[0]);

        if (filteredRows.length === 0) {
            this.showMessage('No lockers found matching the selected criteria.', 'info');
            return;
        }

        // Clear existing column filters (but don't reset data)
        this.columnFilters = {};
        
        // Clear search box
        const searchTable = document.getElementById('searchTable');
        if (searchTable) {
            searchTable.value = '';
        }

        // Apply filter to show only matching rows - map by row index instead of fullRow
        this.filteredData = filteredRows.map(item => this.data[item.rowIndex]);
        this.currentPage = 1;

        console.log('📊 Setting filteredData length:', this.filteredData.length);
        console.log('📊 Sample filtered data row:', this.filteredData[0]);

        // Update display
        console.log('🔄 Calling renderTable...');
        this.renderTable();
        console.log('✅ renderTable completed');
        
        // Trigger analysis with a small delay to ensure filteredData is preserved
        setTimeout(() => {
            this.markAnalysisDirty();
        }, 50);

        // Show success message
        const filterStats = stats.sdvParser.getFilteredStats(filteredRows);
        this.showMessage(
            `Filter applied: ${filteredRows.length} lockers found. Total Due: ₹${filterStats.totalDueAmount}, Total Penal: ₹${filterStats.totalPenalAmount}`,
            'success'
        );
    }

    clearSDVFilter() {
        // Clear checkboxes
        ['includeDue', 'includePenal', 'includeAgreement'].forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) checkbox.checked = false;
        });

        // Reset operator
        const operatorSelect = document.getElementById('sdvOperator');
        if (operatorSelect) operatorSelect.value = 'OR';

        // Clear all filters
        this.clearAllFilters();
    }

    showFilterDropdown(columnIndex, buttonElement) {
        // Check if filtering is disabled for this column
        const headerName = this.headers[columnIndex];
        if (this.shouldDisableFilter(columnIndex, headerName)) {
            // Debug: filtering disabled for column
            return; // Exit early for disabled columns
        }
        
        // Remove any existing dropdown
        const existingDropdown = document.querySelector('.filter-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }
        
        // Get unique values for this column
        const allValues = this.data.map(row => row[columnIndex] || '');
        const uniqueValues = [...new Set(allValues)].sort();
        
        // Check if there are blank values and ensure they're included
        const hasBlankValues = allValues.some(val => val === '' || val === null || val === undefined);
        if (hasBlankValues && !uniqueValues.includes('')) {
            uniqueValues.unshift(''); // Add blank at the beginning
        }
        
    // Check if this appears to be a date or numeric column
    const isDateColumn = this.isDateColumn(uniqueValues, headerName);
    const isNumericColumn = !isDateColumn && this.isNumericColumn(allValues);
        
        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'filter-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 100;
            max-height: 300px;
            overflow-y: auto;
            padding: 8px;
        `;
        
        let filterMode = 'regular';
        if (isDateColumn) {
            filterMode = 'date';
            this.renderDateFilter(dropdown, columnIndex, uniqueValues);
        } else if (isNumericColumn) {
            filterMode = 'number';
            this.renderNumericFilter(dropdown, columnIndex, allValues);
        } else {
            this.renderRegularFilter(dropdown, columnIndex, uniqueValues);
        }
        
        // Position and show dropdown
        buttonElement.parentElement.appendChild(dropdown);
        
        // Close dropdown when clicking outside and auto-apply filters
        const closeDropdown = (e) => {
            if (!dropdown.contains(e.target) && e.target !== buttonElement) {
                // Auto-apply filters when clicking outside
                if (filterMode !== 'number') {
                    this.autoApplyFilters(dropdown, columnIndex, isDateColumn, uniqueValues);
                }
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
            }
        };
        setTimeout(() => document.addEventListener('click', closeDropdown), 100);
    }

    autoApplyFilters(dropdown, columnIndex, isDateColumn, allValues) {
        let selectedValues;
        
        if (isDateColumn) {
            // Get selected dates from month checkboxes
            selectedValues = [];
            const monthCheckboxes = dropdown.querySelectorAll('input[type="checkbox"][data-month]');
            monthCheckboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    // Find the corresponding dates for this month
                    const year = checkbox.dataset.year;
                    const month = checkbox.dataset.month;
                    // Extract dates from the checkbox's parent data
                    const monthData = this.getMonthDates(year, month, allValues);
                    selectedValues.push(...monthData);
                }
            });
        } else {
            // Get selected values from regular checkboxes
            const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:not(#selectAll)');
            selectedValues = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);
        }
        
        // Apply the filters
        if (selectedValues.length === allValues.length || selectedValues.length === 0) {
            // All selected or none selected = no filter
            delete this.columnFilters[columnIndex];
        } else {
            this.columnFilters[columnIndex] = selectedValues;
        }
        
        this.performFuzzySearch();
        this.renderTable();
    }

    getMonthDates(year, month, allValues) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthNumber = monthNames.indexOf(month);
        return allValues.filter(val => {
            const dt = this.parseAnyDate(val);
            if (!dt) return false;
            return dt.getFullYear() === parseInt(year) && dt.getMonth() === monthNumber;
        }).map(v => String(v));
    }

    isDateColumn(values, headerName = '') {
        if (!values || values.length === 0) return false;
        const dateCount = values.filter(val => !!this.parseAnyDate(val)).length;
        const ratio = dateCount / values.length;
        const header = String(headerName || '').toLowerCase();
        const headerLooksDate = /(date|dob|doj|opening|open\s*date|maturity|expiry|exp|value\s*date|posting\s*date)/i.test(header);
        return headerLooksDate ? ratio >= 0.4 : ratio >= 0.6;
    }

    renderDateFilter(dropdown, columnIndex, dateValues) {
        // Parse and group dates by year and month using generalized parsing
        const dateGroups = {};
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        dateValues.forEach(val => {
            const dt = this.parseAnyDate(val);
            if (dt) {
                const year = String(dt.getFullYear());
                const monthName = monthNames[dt.getMonth()];
                if (!dateGroups[year]) dateGroups[year] = {};
                if (!dateGroups[year][monthName]) dateGroups[year][monthName] = [];
                // Preserve the original cell value for exact matching later
                dateGroups[year][monthName].push(String(val));
            }
        });
        
        // Add "Select All" option
        const selectAllDiv = document.createElement('div');
        selectAllDiv.style.cssText = 'padding: 4px; border-bottom: 1px solid #eee; margin-bottom: 4px;';
        
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.id = 'selectAll';
        {
            const cf = this.columnFilters[columnIndex];
            selectAllCheckbox.checked = !cf || (Array.isArray(cf) && cf.length === 0);
        }
        
        const selectAllLabel = document.createElement('label');
        selectAllLabel.htmlFor = 'selectAll';
        selectAllLabel.textContent = ' Select All';
        selectAllLabel.style.cursor = 'pointer';
        
        selectAllDiv.appendChild(selectAllCheckbox);
        selectAllDiv.appendChild(selectAllLabel);
        dropdown.appendChild(selectAllDiv);
        
        // Create hierarchical structure
        const allCheckboxes = [];
        const yearCheckboxes = {};
        const monthCheckboxes = {};
        
        Object.keys(dateGroups).sort((a, b) => parseInt(b) - parseInt(a)).forEach(year => {
            // Year header
            const yearDiv = document.createElement('div');
            yearDiv.style.cssText = 'margin: 8px 0 4px 0; font-weight: bold; padding: 4px; background: #f8f9fa; border-radius: 3px;';
            
            const yearCheckbox = document.createElement('input');
            yearCheckbox.type = 'checkbox';
            yearCheckbox.id = `year_${year}`;
            yearCheckbox.dataset.year = year;
            
            const yearLabel = document.createElement('label');
            yearLabel.htmlFor = `year_${year}`;
            yearLabel.textContent = ` ${year}`;
            yearLabel.style.cursor = 'pointer';
            
            yearDiv.appendChild(yearCheckbox);
            yearDiv.appendChild(yearLabel);
            dropdown.appendChild(yearDiv);
            
            yearCheckboxes[year] = {checkbox: yearCheckbox, months: {}};
            
            // Month items
            Object.keys(dateGroups[year]).forEach(month => {
                const monthDiv = document.createElement('div');
                monthDiv.style.cssText = 'margin-left: 20px; padding: 2px;';
                
                const monthCheckbox = document.createElement('input');
                monthCheckbox.type = 'checkbox';
                monthCheckbox.id = `month_${year}_${month}`;
                monthCheckbox.dataset.year = year;
                monthCheckbox.dataset.month = month;
                
                const monthLabel = document.createElement('label');
                monthLabel.htmlFor = `month_${year}_${month}`;
                monthLabel.textContent = ` ${month} (${dateGroups[year][month].length})`;
                monthLabel.style.cursor = 'pointer';
                
                monthDiv.appendChild(monthCheckbox);
                monthDiv.appendChild(monthLabel);
                dropdown.appendChild(monthDiv);
                
                monthCheckboxes[`${year}_${month}`] = {
                    checkbox: monthCheckbox,
                    dates: dateGroups[year][month]
                };
                yearCheckboxes[year].months[month] = monthCheckbox;
                allCheckboxes.push(monthCheckbox);
            });
        });
        
        // Set initial checked states
    const activeFilters = Array.isArray(this.columnFilters[columnIndex]) ? this.columnFilters[columnIndex] : [];
        if (activeFilters.length === 0) {
            // All selected
            allCheckboxes.forEach(cb => cb.checked = true);
            Object.values(yearCheckboxes).forEach(yc => yc.checkbox.checked = true);
        } else {
            // Check based on active filters
            Object.keys(monthCheckboxes).forEach(key => {
                const monthData = monthCheckboxes[key];
                const hasAnySelected = monthData.dates.some(date => activeFilters.includes(date));
                monthData.checkbox.checked = hasAnySelected;
            });
            
            // Update year checkboxes
            Object.keys(yearCheckboxes).forEach(year => {
                const yearData = yearCheckboxes[year];
                const monthsChecked = Object.values(yearData.months).filter(cb => cb.checked).length;
                const totalMonths = Object.keys(yearData.months).length;
                yearData.checkbox.checked = monthsChecked === totalMonths;
                yearData.checkbox.indeterminate = monthsChecked > 0 && monthsChecked < totalMonths;
            });
        }
        
        // Add event listeners for hierarchical selection
        Object.keys(yearCheckboxes).forEach(year => {
            yearCheckboxes[year].checkbox.addEventListener('change', (e) => {
                Object.values(yearCheckboxes[year].months).forEach(monthCb => {
                    monthCb.checked = e.target.checked;
                });
                this.updateSelectAllState(selectAllCheckbox, allCheckboxes);
            });
        });
        
        allCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                const year = cb.dataset.year;
                const yearData = yearCheckboxes[year];
                const checkedMonths = Object.values(yearData.months).filter(cb => cb.checked).length;
                const totalMonths = Object.keys(yearData.months).length;
                
                yearData.checkbox.checked = checkedMonths === totalMonths;
                yearData.checkbox.indeterminate = checkedMonths > 0 && checkedMonths < totalMonths;
                
                this.updateSelectAllState(selectAllCheckbox, allCheckboxes);
            });
        });
        
        selectAllCheckbox.addEventListener('change', () => {
            const checked = selectAllCheckbox.checked;
            allCheckboxes.forEach(cb => cb.checked = checked);
            Object.values(yearCheckboxes).forEach(yc => {
                yc.checkbox.checked = checked;
                yc.checkbox.indeterminate = false;
            });
        });
        
        // Add Apply and Clear buttons
        this.addFilterButtons(dropdown, columnIndex, () => {
            const selectedDates = [];
            Object.keys(monthCheckboxes).forEach(key => {
                if (monthCheckboxes[key].checkbox.checked) {
                    selectedDates.push(...monthCheckboxes[key].dates);
                }
            });
            return selectedDates;
        }, dateValues);
    }

    renderRegularFilter(dropdown, columnIndex, uniqueValues) {
        // Add "Select All" option
        const selectAllDiv = document.createElement('div');
        selectAllDiv.style.cssText = 'padding: 4px; border-bottom: 1px solid #eee; margin-bottom: 4px;';
        
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.id = 'selectAll';
        {
            const cf = this.columnFilters[columnIndex];
            selectAllCheckbox.checked = !cf || (Array.isArray(cf) && cf.length === 0);
        }
        
        const selectAllLabel = document.createElement('label');
        selectAllLabel.htmlFor = 'selectAll';
        selectAllLabel.textContent = ' Select All';
        selectAllLabel.style.cursor = 'pointer';
        
        selectAllDiv.appendChild(selectAllCheckbox);
        selectAllDiv.appendChild(selectAllLabel);
        dropdown.appendChild(selectAllDiv);
        
        // Add options for each unique value
        const checkboxes = [];
        uniqueValues.forEach(value => {
            const optionDiv = document.createElement('div');
            optionDiv.style.cssText = 'padding: 2px;';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = value;
            {
                const cf = this.columnFilters[columnIndex];
                checkbox.checked = !cf || (Array.isArray(cf) && (cf.length === 0 || cf.includes(value)));
            }
            
            const label = document.createElement('label');
            // Display meaningful text for blank values
            const displayText = value === '' ? '(Blank)' : value;
            label.textContent = ` ${displayText}`;
            label.style.cursor = 'pointer';
            label.addEventListener('click', () => {
                checkbox.checked = !checkbox.checked;
                this.updateSelectAllState(selectAllCheckbox, checkboxes);
            });
            
            optionDiv.appendChild(checkbox);
            optionDiv.appendChild(label);
            dropdown.appendChild(optionDiv);
            checkboxes.push(checkbox);
        });
        
        // Handle "Select All" clicks
        selectAllCheckbox.addEventListener('change', () => {
            checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
        });
        
        // Add Apply and Clear buttons
        this.addFilterButtons(dropdown, columnIndex, () => {
            return checkboxes.filter(cb => cb.checked).map(cb => cb.value);
        }, uniqueValues);
    }

    updateSelectAllState(selectAllCheckbox, checkboxes) {
        const checkedCount = checkboxes.filter(cb => cb.checked).length;
        selectAllCheckbox.checked = checkedCount === checkboxes.length;
        selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }

    // Determine if a column is numeric-like (>=60% numeric values)
    isNumericColumn(values) {
        if (!values || values.length === 0) return false;
        let numCount = 0;
        for (const v of values) {
            const n = parseFloat(String(v).replace(/[\s,]/g, ''));
            if (!isNaN(n)) numCount++;
        }
        return (numCount / values.length) >= 0.6;
    }

    // Apply object-based advanced filters (numeric/date comparisons)
    applyAdvancedFilter(rule, value) {
        if (!rule || typeof rule !== 'object') return true;
        const raw = value ?? '';
        const asNumber = parseFloat(String(raw).replace(/[\s,]/g, ''));
        const asDate = this.parseAnyDate(raw);

        switch (rule.type) {
            case 'number': {
                if (isNaN(asNumber)) return false;
                const a = Number(rule.a);
                const b = Number(rule.b);
                switch (rule.op) {
                    case '>': return asNumber > a;
                    case '>=': return asNumber >= a;
                    case '=': return asNumber === a;
                    case '<=': return asNumber <= a;
                    case '<': return asNumber < a;
                    case 'between': return asNumber >= Math.min(a,b) && asNumber <= Math.max(a,b);
                    default: return true;
                }
            }
            case 'date': {
                if (!asDate) return false;
                const a = this.parseAnyDate(rule.a);
                const b = this.parseAnyDate(rule.b);
                const t = asDate.getTime();
                const at = a ? a.getTime() : NaN;
                const bt = b ? b.getTime() : NaN;
                switch (rule.op) {
                    case 'after': return !isNaN(at) ? t > at : true;
                    case 'on': return !isNaN(at) ? (asDate.toDateString() === a.toDateString()) : true;
                    case 'before': return !isNaN(at) ? t < at : true;
                    case 'between': return !isNaN(at) && !isNaN(bt) ? (t >= Math.min(at, bt) && t <= Math.max(at, bt)) : true;
                    default: return true;
                }
            }
            default:
                return true;
        }
    }

    // Render numeric filter UI for a column
    renderNumericFilter(dropdown, columnIndex, allValues) {
        // Container
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex; flex-direction:column; gap:6px;';

        // Operator select
        const op = document.createElement('select');
        ['>', '>=', '=', '<=', '<', 'between'].forEach(v => {
            const o = document.createElement('option'); o.value = v; o.textContent = v; op.appendChild(o);
        });

        // Inputs
        const inputA = document.createElement('input');
        inputA.type = 'number';
        inputA.placeholder = 'Value';
        inputA.style.padding = '4px';

        const inputB = document.createElement('input');
        inputB.type = 'number';
        inputB.placeholder = 'And value';
        inputB.style.padding = '4px';
        inputB.style.display = 'none';

        op.addEventListener('change', () => {
            inputB.style.display = op.value === 'between' ? 'block' : 'none';
        });

        // Pre-fill from existing filter if any
        const existing = this.columnFilters[columnIndex];
        if (existing && typeof existing === 'object' && existing.type === 'number') {
            op.value = existing.op || '>';
            inputA.value = existing.a ?? '';
            inputB.value = existing.b ?? '';
            inputB.style.display = op.value === 'between' ? 'block' : 'none';
        }

        wrapper.appendChild(op);
        wrapper.appendChild(inputA);
        wrapper.appendChild(inputB);
        dropdown.appendChild(wrapper);

        // Buttons
        this.addFilterButtons(dropdown, columnIndex, () => {
            const rule = { type: 'number', op: op.value, a: inputA.value, b: inputB.value };
            return rule;
        }, allValues);
    }

    addFilterButtons(dropdown, columnIndex, getSelectedValues, allValues) {
        const buttonDiv = document.createElement('div');
        buttonDiv.style.cssText = 'padding: 8px 0; border-top: 1px solid #eee; margin-top: 8px;';
        
        const applyButton = document.createElement('button');
        applyButton.textContent = 'Apply';
        applyButton.style.cssText = 'margin-right: 8px; padding: 4px 12px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;';
        applyButton.addEventListener('click', () => {
            this.showLoading('Applying filters...');
            
            setTimeout(() => {
                const selection = getSelectedValues();
                // If selection is an array, handle as value whitelist; otherwise store as rule object
                if (Array.isArray(selection)) {
                    if (selection.length === allValues.length) {
                        delete this.columnFilters[columnIndex];
                    } else {
                        this.columnFilters[columnIndex] = selection;
                    }
                } else if (selection && typeof selection === 'object') {
                    this.columnFilters[columnIndex] = selection;
                } else {
                    delete this.columnFilters[columnIndex];
                }
                
                this.performFuzzySearch();
                this.renderTable();
                this.hideLoading();
                dropdown.remove();
            }, 100);
        });
        
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear';
        clearButton.style.cssText = 'padding: 4px 12px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;';
        clearButton.addEventListener('click', () => {
            delete this.columnFilters[columnIndex];
            this.performFuzzySearch();
            this.renderTable();
            dropdown.remove();
        });
        
        buttonDiv.appendChild(applyButton);
        buttonDiv.appendChild(clearButton);
        dropdown.appendChild(buttonDiv);
    }

    isValidDate(dateStr) {
        const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
        if (!dateRegex.test(dateStr)) return false;
        
        const [day, month, year] = dateStr.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && 
               date.getMonth() === month - 1 && 
               date.getDate() === day;
    }

    addRecommendationsSection(container, recommendations) {
        const recommendationsContainer = document.createElement('div');
        recommendationsContainer.style.gridColumn = '1 / -1';
        recommendationsContainer.innerHTML = `
            <h4 style="margin: 20px 0 10px 0; color: #333;">Banking Recommendations</h4>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${recommendations.map(rec => `
                    <div style="
                        padding: 12px; 
                        border-radius: 4px; 
                        border-left: 4px solid ${this.getRecommendationColor(rec.type)};
                        background: ${this.getRecommendationBackground(rec.type)};
                        font-size: 14px;
                    ">
                        <strong>${rec.title}:</strong> ${rec.message}
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(recommendationsContainer);
    }

    getRecommendationColor(type) {
        switch(type) {
            case 'warning': return '#ffc107';
            case 'success': return '#28a745';
            case 'info': return '#17a2b8';
            case 'error': return '#dc3545';
            default: return '#6c757d';
        }
    }

    getRecommendationBackground(type) {
        switch(type) {
            case 'warning': return '#fff3cd';
            case 'success': return '#d4edda';
            case 'info': return '#d1ecf1';
            case 'error': return '#f8d7da';
            default: return '#f8f9fa';
        }
    }

    addStatItem(container, value, label) {
        const statItem = document.createElement('div');
        statItem.className = 'stat-item';
        statItem.innerHTML = `
            <div class="stat-value">${value}</div>
            <div class="stat-label">${label}</div>
        `;
        container.appendChild(statItem);
    }

    exportData(format) {
        const visibleHeaders = this.headers.filter((_, index) => !this.hiddenColumns.has(index));
        const visibleData = this.filteredData.map(row => 
            row.filter((_, index) => !this.hiddenColumns.has(index))
        );

        switch(format) {
            case 'csv':
                this.exportCsv(visibleHeaders, visibleData);
                break;
            case 'json':
                this.exportJson(visibleHeaders, visibleData);
                break;
            case 'excel':
                this.exportExcel(visibleHeaders, visibleData);
                break;
        }
    }

    exportCsv(headers, data) {
        const csvContent = [
            headers.map(h => `"${h}"`).join(','),
            ...data.map(row => row.map(cell => `"${cell || ''}"`).join(','))
        ].join('\n');

        this.downloadFile(csvContent, 'parsed_data.csv', 'text/csv');
    }

    exportJson(headers, data) {
        const jsonData = data.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        });

        const jsonContent = JSON.stringify(jsonData, null, 2);
        this.downloadFile(jsonContent, 'parsed_data.json', 'application/json');
    }

    exportExcel(headers, data) {
        // Proper .xlsx export using JSZip (no Excel warning)
        try {
            if (typeof window.JSZip !== 'undefined') {
                const blob = this.buildXlsxBlob(headers, data);
                this.downloadBlob(blob, 'parsed_data.xlsx');
            } else {
                // Fallback: CSV with BOM to open cleanly in Excel
                const csvContent = [
                    headers.map(h => this.escapeCsv(h)).join(','),
                    ...data.map(row => row.map(cell => this.escapeCsv(cell ?? '')).join(','))
                ].join('\n');
                const bomCsv = '\uFEFF' + csvContent; // UTF-8 BOM for Excel
                this.downloadFile(bomCsv, 'parsed_data.csv', 'text/csv;charset=utf-8');
            }
        } catch (e) {
            console.error('Excel export failed, falling back to CSV:', e);
            const csvContent = [
                headers.map(h => this.escapeCsv(h)).join(','),
                ...data.map(row => row.map(cell => this.escapeCsv(cell ?? '')).join(','))
            ].join('\n');
            const bomCsv = '\uFEFF' + csvContent;
            this.downloadFile(bomCsv, 'parsed_data.csv', 'text/csv;charset=utf-8');
        }
    }

    // Build minimal XLSX workbook from headers + 2D array of rows
    buildXlsxBlob(headers, data) {
        const zip = new window.JSZip();

        // Content Types
        const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
        zip.file('[Content_Types].xml', contentTypes);

        // _rels/.rels
        const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
        zip.folder('_rels').file('.rels', rootRels);

        // xl/_rels/workbook.xml.rels
        const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
        zip.folder('xl').folder('_rels').file('workbook.xml.rels', wbRels);

        // xl/workbook.xml
        const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Data" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
        zip.folder('xl').file('workbook.xml', workbook);

        // xl/styles.xml (minimal stylesheet)
        const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
        zip.folder('xl').file('styles.xml', styles);

        // xl/worksheets/sheet1.xml – write values; numbers as type n, strings as inlineStr
        const rowsXml = [];
        const totalRows = 1 + data.length;
        for (let r = 1; r <= totalRows; r++) {
            const cells = [];
            const rowValues = r === 1 ? headers : data[r - 2];
            for (let c = 0; c < headers.length; c++) {
                const colRef = this.toXlsxColRef(c, r);
                const v = rowValues?.[c] ?? '';
                if (v === null || v === undefined || v === '') {
                    cells.push(`<c r="${colRef}"/>`);
                    continue;
                }
                // numeric?
                const n = parseFloat(String(v).replace(/[\s,]/g, ''));
                const isNumeric = !isNaN(n) && isFinite(n) && String(v).trim() !== '' && /^[-+]?\d*(?:[.,]\d+)?$/.test(String(v).replace(/,/g, '.'));
                if (r === 1) {
                    // headers always as inline strings
                    cells.push(`<c r="${colRef}" t="inlineStr"><is><t>${this.escapeXml(String(v))}</t></is></c>`);
                } else if (isNumeric) {
                    cells.push(`<c r="${colRef}"><v>${String(v).replace(/,/g, '')}</v></c>`);
                } else {
                    cells.push(`<c r="${colRef}" t="inlineStr"><is><t>${this.escapeXml(String(v))}</t></is></c>`);
                }
            }
            rowsXml.push(`<row r="${r}">${cells.join('')}</row>`);
        }

        const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    ${rowsXml.join('')}
  </sheetData>
</worksheet>`;
        zip.folder('xl').folder('worksheets').file('sheet1.xml', sheet);

        return zip.generateAsync({ type: 'blob' });
    }

    // Download Blob via FileSaver if available; else via object URL
    async downloadBlob(blobPromiseOrBlob, filename) {
        const blob = blobPromiseOrBlob instanceof Blob ? blobPromiseOrBlob : await blobPromiseOrBlob;
        if (typeof window.saveAs === 'function') {
            window.saveAs(blob, filename);
        } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }

    // Helpers
    toXlsxColRef(colIndex, rowIndex) {
        // Convert 0-based colIndex to Excel letters (A, B, ..., AA, AB, ...)
        let n = colIndex;
        let s = '';
        do {
            const rem = n % 26;
            s = String.fromCharCode(65 + rem) + s;
            n = Math.floor(n / 26) - 1;
        } while (n >= 0);
        return `${s}${rowIndex}`;
    }

    escapeXml(s) {
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    escapeCsv(value) {
        // Guard against CSV injection and commas/newlines
        const str = String(value ?? '');
        const needsQuote = /[",\n\r]/.test(str) || /^[=+\-@]/.test(str);
        const safe = str.replace(/"/g, '""');
        return needsQuote ? `"${safe}` + `"` : safe;
    }

    generateReport() {
        const stats = this.calculateStatistics();
        const reportContent = this.createHtmlReport(stats);
        this.downloadFile(reportContent, 'data_analysis_report.html', 'text/html');
    }

    createHtmlReport(stats) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Data Analysis Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
                    .stat-card { background: white; border: 1px solid #dee2e6; padding: 15px; border-radius: 8px; text-align: center; }
                    .stat-value { font-size: 24px; font-weight: bold; color: #007bff; }
                    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; margin-top: 5px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background: #f8f9fa; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Data Analysis Report</h1>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                    <p>File: ${this.currentFile ? this.currentFile.name : 'Unknown'}</p>
                </div>
                
                <h2>Summary Statistics</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalRows}</div>
                        <div class="stat-label">Total Rows</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalColumns}</div>
                        <div class="stat-label">Total Columns</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.numericColumns.length}</div>
                        <div class="stat-label">Numeric Columns</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.textColumns.length}</div>
                        <div class="stat-label">Text Columns</div>
                    </div>
                </div>

                <h2>Column Analysis</h2>
                <table>
                    <tr>
                        <th>Column Name</th>
                        <th>Type</th>
                        <th>Unique Values</th>
                        <th>Additional Info</th>
                    </tr>
                    ${this.headers.map((header, index) => {
                        const numCol = stats.numericColumns.find(col => col.name === header);
                        const textCol = stats.textColumns.find(col => col.name === header);
                        const uniqueCount = stats.uniqueValues[header];
                        
                        return `
                            <tr>
                                <td>${header}</td>
                                <td>${numCol ? 'Numeric' : 'Text'}</td>
                                <td>${uniqueCount}</td>
                                <td>${numCol ? 
                                    `Sum: ${numCol.sum.toLocaleString()}, Avg: ${numCol.avg.toFixed(2)}` : 
                                    `Avg Length: ${textCol ? textCol.avgLength.toFixed(1) : 'N/A'}`
                                }</td>
                            </tr>
                        `;
                    }).join('')}
                </table>
            </body>
            </html>
        `;
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showDataContainer() {
        const dc = document.getElementById('dataContainer');
        if (dc) dc.style.display = 'block';
    }

    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }

    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.error, .success');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = type;
        messageDiv.textContent = message;
        
        const parsingOptions = document.getElementById('parsingOptions');
        if (parsingOptions) {
            parsingOptions.insertAdjacentElement('afterend', messageDiv);
        } else {
            document.body.appendChild(messageDiv);
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }

    // Customer Data Enrichment Methods
    checkForCustomerEnrichmentOpportunity() {
        const enrichBtn = document.getElementById('enrichCustomerData');
        if (!enrichBtn || !this.headers) return;

        // Check if data has customer-related columns
        const customerColumns = ['CIF', 'Customer Number', 'Customer_No', 'CUSTOMER_NO', 'Customer_Number', 'CIF_NUMBER'];
        const hasCustomerColumn = this.headers.some(header => 
            customerColumns.some(col => header.toLowerCase().includes(col.toLowerCase()))
        );

        enrichBtn.style.display = hasCustomerColumn ? 'inline-block' : 'none';
    }

    showCustomerEnrichmentDialog() {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'customer-enrichment-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.7); z-index: 10000; display: flex; 
            align-items: center; justify-content: center;
        `;

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white; padding: 30px; border-radius: 12px; 
            max-width: 500px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;

        modalContent.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #333;">
                <i class="material-icons" style="vertical-align: middle; margin-right: 8px; color: #4CAF50;">person_add</i>
                Enrich Customer Data
            </h3>
            <p style="margin: 0 0 20px 0; color: #666; line-height: 1.5;">
                Upload a CUSTOMER_CONTACT file to enrich your data with additional customer details like 
                address, mobile number, PAN, DOB, and more.
            </p>
            
            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 15px; margin: 15px 0; font-size: 13px;">
                <div style="color: #495057; margin-bottom: 8px; font-weight: 500;">
                    <i class="material-icons" style="vertical-align: middle; margin-right: 5px; font-size: 16px; color: #6c757d;">info</i>
                    Where to get CUSTOMER_CONTACT files:
                </div>
                <div style="color: #6c757d; font-family: monospace; font-size: 12px; line-height: 1.4;">
                    http://10.1.9.65/ → Index of /ADHOC_REPORTS_NEW/Miscellaneous/<br>
                    Customer_Profile/Your_ZO/Your_RO/CUSTOMER_CONTACT_YourBranchCode
                </div>
            </div>
            
            <div style="border: 2px dashed #ddd; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; cursor: pointer;" id="customerFileDropZone">
                <i class="material-icons" style="font-size: 48px; color: #ccc; margin-bottom: 10px;">cloud_upload</i>
                <p style="margin: 0; color: #666;">Drop CUSTOMER_CONTACT file here or click to browse</p>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #999;">
                    Supports .csv and .gz files starting with "CUSTOMER_CONTACT"
                </p>
            </div>
            
            <input type="file" id="customerFileInput" style="display: none;" 
                   accept=".csv,.gz" />
            
            <div style="text-align: right; margin-top: 20px;">
                <button id="cancelEnrichment" style="
                    padding: 10px 20px; 
                    margin-right: 10px; 
                    border: 1px solid #ddd; 
                    background: #f8f9fa; 
                    color: #495057;
                    border-radius: 6px; 
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                " onmouseover="this.style.background='#e9ecef'" onmouseout="this.style.background='#f8f9fa'">Cancel</button>
                <button id="startEnrichment" style="
                    padding: 10px 20px; 
                    background: #4CAF50; 
                    color: white; 
                    border: none; 
                    border-radius: 6px; 
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    opacity: 0.5;
                " disabled onmouseover="if(!this.disabled) this.style.background='#45a049'" onmouseout="if(!this.disabled) this.style.background='#4CAF50'">Start Enrichment</button>
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Set up event listeners
        const dropZone = modal.querySelector('#customerFileDropZone');
        const fileInput = modal.querySelector('#customerFileInput');
        const cancelBtn = modal.querySelector('#cancelEnrichment');
        const startBtn = modal.querySelector('#startEnrichment');

        let selectedFile = null;

        // File selection
        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleCustomerFileSelection(e.target.files[0], dropZone, startBtn);
                selectedFile = e.target.files[0];
            }
        });

        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#4CAF50';
            dropZone.style.backgroundColor = '#f8f8f8';
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.style.borderColor = '#ddd';
            dropZone.style.backgroundColor = 'transparent';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#ddd';
            dropZone.style.backgroundColor = 'transparent';
            
            if (e.dataTransfer.files.length > 0) {
                this.handleCustomerFileSelection(e.dataTransfer.files[0], dropZone, startBtn);
                selectedFile = e.dataTransfer.files[0];
            }
        });

        // Button actions
        cancelBtn.addEventListener('click', () => modal.remove());
        startBtn.addEventListener('click', () => {
            if (selectedFile) {
                modal.remove();
                this.processCustomerEnrichment(selectedFile);
            }
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    handleCustomerFileSelection(file, dropZone, startBtn) {
        const fileName = file.name.toLowerCase();
        
        // Validate file name and type
        if (!fileName.startsWith('customer_contact')) {
            this.showMessage('File name must start with "CUSTOMER_CONTACT"', 'error');
            return;
        }

        if (!fileName.endsWith('.csv') && !fileName.endsWith('.gz')) {
            this.showMessage('File must be a .csv or .gz file', 'error');
            return;
        }

        // Update UI to show file selected
        dropZone.innerHTML = `
            <i class="material-icons" style="font-size: 48px; color: #4CAF50; margin-bottom: 10px;">check_circle</i>
            <p style="margin: 0; color: #4CAF50; font-weight: bold;">${file.name}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">
                Size: ${(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
        `;
        dropZone.style.borderColor = '#4CAF50';
        dropZone.style.backgroundColor = '#f8fff8';
        
        startBtn.disabled = false;
        startBtn.style.opacity = '1';
        startBtn.style.cursor = 'pointer';
    }

    async processCustomerEnrichment(file) {
        try {
            // Show progress modal
            const progressModal = this.createProgressModal();
            
            this.updateProgress(progressModal, 'Reading customer file...', 10);
            
            // Read and extract file content
            let csvContent;
            if (file.name.toLowerCase().endsWith('.gz')) {
                csvContent = await this.extractCustomerGzFile(file);
            } else {
                csvContent = await this.readFileAsText(file);
            }
            
            this.updateProgress(progressModal, 'Parsing customer data...', 30);
            
            // Parse customer CSV
            const customerData = this.parseCustomerCSV(csvContent);
            
            // Debug: Log first few customer records to see structure (only if needed)
            if (customerData.length > 0 && customerData.length < 10) {
                console.log('Sample customer record:', customerData[0]);
            }
            
            this.updateProgress(progressModal, 'Finding customer column...', 40);
            
            // Find customer number column in current data
            const customerColumnIndex = this.findCustomerColumn();
            if (customerColumnIndex === -1) {
                throw new Error('No customer number column found in current data');
            }
            
            this.updateProgress(progressModal, 'Creating customer lookup map...', 50);
            
            // Create efficient lookup map with multiple key variations
            const customerMap = new Map();
            let mapEntries = 0;
            
            customerData.forEach(customer => {
                // Try multiple possible customer number field names
                const possibleKeys = ['CUSTOMER_NO', 'Customer_No', 'CUSTOMER_NUMBER', 'Customer_Number', 'CIF', 'CIF_NUMBER'];
                let customerNo = null;
                
                for (const key of possibleKeys) {
                    if (customer[key]) {
                        customerNo = customer[key].toString().trim();
                        break;
                    }
                }
                
                if (customerNo) {
                    customerMap.set(customerNo, customer);
                    mapEntries++;
                }
            });
            
            if (mapEntries === 0) {
                throw new Error('No valid customer numbers found in CUSTOMER_CONTACT file');
            }
            
            this.updateProgress(progressModal, 'Enriching data rows...', 60);
            
            // Insert new columns right after the customer column
            const newColumns = ['CUSTOMER_TYPE', 'ADDRESS', 'MOBILE_NO', 'CUST_TAX_PAN', 'DOB', 'POSTCODE', 'GENDER', 'MOBILE_BANKING', 'FATHER_NAME', 'EMAIL'];
            const insertIndex = customerColumnIndex + 1;
            
            // Insert new columns into headers
            this.headers.splice(insertIndex, 0, ...newColumns);
            
            // Apply default hiding to newly added columns
            newColumns.forEach((columnName, index) => {
                const actualIndex = insertIndex + index;
                const columnLower = columnName.toLowerCase().trim();
                
                for (const defaultHiddenColumn of this.defaultHiddenColumns) {
                    const defaultLower = defaultHiddenColumn.toLowerCase().trim();
                    if (columnLower === defaultLower || columnLower.includes(defaultLower) || defaultLower.includes(columnLower)) {
                        this.hiddenColumns.add(actualIndex);
                        break;
                    }
                }
            });
            
            // Track successful matches for debugging
            let successfulMatches = 0;
            let totalProcessed = 0;
            
            // Safety check: If data columns already exceed expected, reset the structure
            const expectedColumns = this.headers.length;
            const actualColumns = this.data[0]?.length || 0;
            
            if (actualColumns > expectedColumns) {
                console.warn(`Data structure appears corrupted (${actualColumns} columns vs ${expectedColumns} headers). Attempting to fix...`);
                
                // Truncate all rows to match header count
                this.data.forEach(row => {
                    if (row.length > expectedColumns) {
                        row.splice(expectedColumns);
                    }
                });
                
                // Also fix filtered and original data
                if (this.filteredData && this.filteredData !== this.data) {
                    this.filteredData.forEach(row => {
                        if (row.length > expectedColumns) {
                            row.splice(expectedColumns);
                        }
                    });
                }
                
                if (this.originalData && this.originalData !== this.data && this.originalData !== this.filteredData) {
                    this.originalData.forEach(row => {
                        if (row.length > expectedColumns) {
                            row.splice(expectedColumns);
                        }
                    });
                }
            }
            
            // Check if filteredData and originalData are references to the same arrays
            const isFilteredDataSameRef = this.filteredData === this.data;
            const isOriginalDataSameRef = this.originalData === this.data;
            const isFilteredOriginalSame = this.filteredData === this.originalData;
            
            this.data.forEach(row => {
                // Insert blank values for all new columns at the correct position
                row.splice(insertIndex, 0, ...new Array(newColumns.length).fill(''));
            });
            
            // Now recreate filteredData and originalData as independent copies
            this.originalData = this.data.map(row => [...row]);
            
            // For filteredData, we need to preserve existing filter state
            // We'll create a temporary copy that gets enriched, then re-apply filters at the end
            const tempFilteredData = this.data.map(row => [...row]);
            
            // IMPORTANT: Update column filter indices after inserting new columns
            // When we insert columns, existing filter indices become invalid
            this.updateColumnFilterIndices(insertIndex, newColumns.length);
            
            // IMPORTANT: Update hidden column indices after inserting new columns
            // When we insert columns, existing hidden column indices become invalid
            this.updateHiddenColumnIndices(insertIndex, newColumns.length);
            
            // Check if there are any active filters that need to be preserved
            const hasActiveFilters = Object.keys(this.columnFilters).length > 0;
            
            // Now enrich data with batch processing for performance
            // At this point, all rows already have blank columns inserted at correct positions
            const batchSize = 1000;
            let processedRows = 0;
            
            for (let i = 0; i < this.data.length; i += batchSize) {
                const batch = this.data.slice(i, i + batchSize);
                
                batch.forEach((row, batchIndex) => {
                    const actualRowIndex = i + batchIndex;
                    totalProcessed++;
                    
                    // Get customer number from the row (at original position, before our insertions)
                    const customerNo = row[customerColumnIndex]?.toString().trim();
                    
                    const customerInfo = customerMap.get(customerNo);
                    
                    if (customerInfo) {
                        successfulMatches++;
                        
                        // Prepare customer data array with fallback field names
                        const customerData = [
                            customerInfo.CUSTOMER_TYPE || customerInfo.Customer_Type || '',
                            customerInfo.ADDRESS || customerInfo.Address || '',
                            customerInfo.MOBILE_NO || customerInfo.Mobile_No || customerInfo.MOBILE || '',
                            customerInfo.CUST_TAX_PAN || customerInfo.Cust_Tax_Pan || customerInfo.PAN || '',
                            customerInfo.DOB || customerInfo.Dob || customerInfo.DATE_OF_BIRTH || '',
                            customerInfo.POSTCODE || customerInfo.Post_Code || customerInfo.PIN_CODE || '',
                            customerInfo.GENDER || customerInfo.Gender || '',
                            customerInfo.MOBILE_BANKING || customerInfo.Mobile_Banking || '',
                            customerInfo.FATHER_NAME || customerInfo.Father_Name || customerInfo.FATHER || '',
                            customerInfo.EMAIL || customerInfo.Email || customerInfo.EMAIL_ID || ''
                        ];
                        
                        // Replace the blank values with actual customer data
                        for (let j = 0; j < newColumns.length; j++) {
                            const value = customerData[j];
                            row[insertIndex + j] = value;
                            // Only update originalData during enrichment
                            // filteredData will be rebuilt after enrichment based on filters
                            this.originalData[actualRowIndex][insertIndex + j] = value;
                        }
                    }
                    // If no match found, the blank values remain (which is what we want)
                });
                
                processedRows += batch.length;
                const progress = 60 + (processedRows / this.data.length) * 30;
                this.updateProgress(progressModal, `Enriched ${processedRows}/${this.data.length} rows...`, progress);
                
                // Allow UI to update
                await new Promise(resolve => setTimeout(resolve, 1));
            }
            
            // Comprehensive validation of all data arrays
            const headerCount = this.headers.length;
            const dataColumns = this.data[0]?.length || 0;
            const filteredColumns = this.filteredData[0]?.length || 0;
            const originalColumns = this.originalData[0]?.length || 0;
            
            // Check all arrays for consistency
            if (headerCount !== dataColumns || headerCount !== filteredColumns || headerCount !== originalColumns) {
                console.error(`Data structure mismatch! Headers: ${headerCount}, Data: ${dataColumns}, Filtered: ${filteredColumns}, Original: ${originalColumns}`);
                
                // Try to fix by ensuring all arrays have the same structure
                const targetLength = headerCount;
                
                [this.data, this.filteredData, this.originalData].forEach((dataArray, arrayIndex) => {
                    const arrayName = ['data', 'filteredData', 'originalData'][arrayIndex];
                    
                    dataArray.forEach(row => {
                        if (row.length > targetLength) {
                            row.splice(targetLength); // Remove excess columns
                        } else if (row.length < targetLength) {
                            while (row.length < targetLength) {
                                row.push(''); // Add missing columns
                            }
                        }
                    });
                });
            }
            
            this.updateProgress(progressModal, 'Updating table...', 95);
            
            // CRITICAL: Re-apply existing filters after enrichment
            // This ensures that any filters that were active before enrichment remain active
            if (hasActiveFilters) {
                this.filterData(); // This will rebuild this.filteredData based on current filters and enriched data
            } else {
                // If no filters were active, filteredData should be a copy of the enriched data
                this.filteredData = this.data.map(row => [...row]);
            }
            
            // No need to update filteredData and originalData here as they're already updated above
            
            // Re-render table
            this.renderTable();
            
            // Mark analysis as dirty since data structure changed
            this.markAnalysisDirty();
            
            this.updateProgress(progressModal, 'Complete!', 100);
            
            setTimeout(() => {
                progressModal.remove();
                this.showSuccessMessage(`Customer data enrichment complete! Added ${newColumns.length} new columns to ${this.data.length} rows. Successfully matched ${successfulMatches} customers.`);
            }, 1000);
            
        } catch (error) {
            console.error('Customer enrichment error:', error);
            const progressModal = document.querySelector('.progress-modal');
            if (progressModal) progressModal.remove();
            this.showErrorMessage('Customer enrichment failed: ' + error.message);
        }
    }

    createProgressModal() {
        const modal = document.createElement('div');
        modal.className = 'progress-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.8); z-index: 10001; display: flex; 
            align-items: center; justify-content: center;
        `;

        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%; text-align: center;">
                <div style="margin-bottom: 20px;">
                    <i class="material-icons" style="font-size: 48px; color: #4CAF50; animation: spin 2s linear infinite;">sync</i>
                </div>
                <h3 style="margin: 0 0 20px 0; color: #333;">Enriching Customer Data</h3>
                <div style="background: #f0f0f0; border-radius: 10px; height: 20px; margin: 20px 0; overflow: hidden;">
                    <div id="progressBar" style="background: #4CAF50; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                </div>
                <p id="progressText" style="margin: 0; color: #666;">Starting...</p>
            </div>
            <style>
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            </style>
        `;

        document.body.appendChild(modal);
        return modal;
    }

    updateProgress(modal, text, percentage) {
        const progressBar = modal.querySelector('#progressBar');
        const progressText = modal.querySelector('#progressText');
        
        if (progressBar) progressBar.style.width = percentage + '%';
        if (progressText) progressText.textContent = text;
    }

    async extractCustomerGzFile(file) {
        // Use the existing gzip extraction logic
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const decompressed = pako.inflate(uint8Array);
        return new TextDecoder('utf-8').decode(decompressed);
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    parseCustomerCSV(csvContent) {
        const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
        if (lines.length < 2) throw new Error('Invalid CSV file');
        
        // Auto-detect delimiter (comma or tab)
        const firstLine = lines[0];
        const delimiter = firstLine.includes('\t') ? '\t' : ',';
        
        const headers = firstLine.split(delimiter).map(h => h.trim().replace(/['"]/g, ''));
        
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(delimiter).map(v => v.trim().replace(/['"]/g, ''));
            if (values.length >= headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                data.push(row);
            }
        }
        
        return data;
    }

    findCustomerColumn() {
        const customerColumns = ['CIF', 'Customer Number', 'Customer_No', 'CUSTOMER_NO', 'Customer_Number', 'CIF_NUMBER'];
        
        for (let i = 0; i < this.headers.length; i++) {
            const header = this.headers[i];
            if (customerColumns.some(col => header.toLowerCase().includes(col.toLowerCase()))) {
                return i;
            }
        }
        
        return -1;
    }

    // Get visible headers based on column visibility settings
    getVisibleHeaders() {
        return this.headers.filter((_, index) => !this.hiddenColumns.has(index));
    }

    // Get visible headers with their original indices
    getVisibleHeadersWithIndices() {
        return this.headers.map((header, index) => ({ header, index }))
                          .filter(({ index }) => !this.hiddenColumns.has(index));
    }

    // Apply default hidden columns based on header names
    applyDefaultHiddenColumns() {
        if (!this.headers || this.headers.length === 0) return;
        
        this.headers.forEach((header, index) => {
            // Check if header matches any default hidden column (case-insensitive)
            const headerLower = header.toLowerCase().trim();
            
            for (const defaultHiddenColumn of this.defaultHiddenColumns) {
                const defaultLower = defaultHiddenColumn.toLowerCase().trim();
                
                // Exact match or contains match for flexibility
                if (headerLower === defaultLower || headerLower.includes(defaultLower) || defaultLower.includes(headerLower)) {
                    this.hiddenColumns.add(index);
                    break;
                }
            }
        });
        
        // Log hidden columns for user awareness (only if any were hidden)
        if (this.hiddenColumns.size > 0) {
            const hiddenColumnNames = Array.from(this.hiddenColumns).map(index => this.headers[index]);
            console.log(`Auto-hidden ${this.hiddenColumns.size} columns: ${hiddenColumnNames.slice(0, 5).join(', ')}${hiddenColumnNames.length > 5 ? '...' : ''}`);
        }
    }

    updateColumnFilterIndices(insertIndex, numColumnsInserted) {
        // When columns are inserted, we need to adjust all column filter indices
        // that come after the insertion point
        const updatedFilters = {};
        
        Object.keys(this.columnFilters).forEach(oldIndex => {
            const oldIndexNum = parseInt(oldIndex);
            let newIndex = oldIndexNum;
            
            // If the old index is at or after the insertion point, shift it by the number of inserted columns
            if (oldIndexNum >= insertIndex) {
                newIndex = oldIndexNum + numColumnsInserted;
            }
            
            updatedFilters[newIndex] = this.columnFilters[oldIndex];
        });
        
        this.columnFilters = updatedFilters;
    }

    updateHiddenColumnIndices(insertIndex, numColumnsInserted) {
        // When columns are inserted, we need to adjust all hidden column indices
        // that come after the insertion point
        const updatedHiddenColumns = new Set();
        
        this.hiddenColumns.forEach(oldIndex => {
            let newIndex = oldIndex;
            
            // If the old index is at or after the insertion point, shift it by the number of inserted columns
            if (oldIndex >= insertIndex) {
                newIndex = oldIndex + numColumnsInserted;
            }
            
            updatedHiddenColumns.add(newIndex);
        });
        
        this.hiddenColumns = updatedHiddenColumns;
    }

}

// Initialize the text parser when the DOM is loaded
let textParser;
document.addEventListener('DOMContentLoaded', function() {
    textParser = new TextParser();
    // Make globally accessible for refresh button
    window.textParserInstance = textParser;
});
