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
        this.loadingOverlay = null;
    // Pending UI state when elements are not mounted yet
    this.pendingParserType = null;
    this.pendingDelimiter = null;
        
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
            'fixed-width': (content) => this.parseFixedWidth(content),
            'delimited': (content) => this.parseDelimited(content),
            'regex': (content) => this.parseRegex(content),
            'positional': (content) => this.parsePositional(content)
        };
        
        this.initializeEventListeners();
        this.setupPresets();
    }

    // Method to register new parsers dynamically
    registerParser(name, parserFunction) {
        this.parsers[name] = parserFunction;
        console.log(`Registered new parser: ${name}`);
    }

    showLoading(message = 'Processing...') {
        // Remove existing loading overlay if any
        this.hideLoading();
        
        console.log('Showing loading overlay:', message);
        
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
        console.log('Loading overlay added to DOM');
    }

    hideLoading() {
        if (this.loadingOverlay) {
            console.log('Hiding loading overlay');
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
        // fuzzyIntensity event listener removed - using optimal default
        if (pageSize) pageSize.addEventListener('change', this.changePageSize.bind(this));
        if (toggleColumns) toggleColumns.addEventListener('click', this.toggleColumnControls.bind(this));
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
            case 'cgtmse-claims':
                parserType.value = 'cgtmse-claims';
                skipLines.value = '0';
                headerRow.value = '1';
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
        
        // Check if it's a .gz file
        if (fileName.toLowerCase().endsWith('.gz')) {
            await this.processGzipFile(file, fileName, fileSize);
            return;
        }
        
        // Regular file processing (includes .txt and files without extensions)
        this.processRegularFile(file, fileName, fileSize);
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
            console.log('Auto-detected: Bank Deposits file (filename pattern match)');
            return;
        }

        if (cleanName.startsWith('bgl_accounts_with_non_zero_balance') || baseName.startsWith('bgl_accounts_with_non_zero_balance')) {
            setType('bgl-accounts');
            console.log('Auto-detected: BGL Accounts file (filename pattern match)');
            return;
        }

        if (cleanName.startsWith('new_cc_od_balance_file') || baseName.startsWith('new_cc_od_balance_file')) {
            setType('new-cc-od-balance');
            console.log('Auto-detected: New CC/OD Balance file (filename pattern match)');
            return;
        }

        if (cleanName.startsWith('cc_od_balance_file') || baseName.startsWith('cc_od_balance_file')) {
            setType('cc-od-balance');
            console.log('Auto-detected: CC/OD Balance file (filename pattern match)');
            return;
        }

        if (cleanName.startsWith('sdv_accounts_as_on_date') || baseName.startsWith('sdv_accounts_as_on_date')) {
            setType('sdv-accounts');
            console.log('Auto-detected: SDV Accounts file (filename pattern match)');
            return;
        }

        if (cleanName.startsWith('new_loansbalancefile') || baseName.startsWith('new_loansbalancefile')) {
            setType('new-loans-balance');
            console.log('Auto-detected: New Loans Balance file (filename pattern match)');
            return;
        }

        if (cleanName.startsWith('loansbalancefile') || baseName.startsWith('loansbalancefile')) {
            setType('loans-balance');
            console.log('Auto-detected: Loans Balance file (filename pattern match)');
            return;
        }

        if (cleanName.startsWith('branchwise_cgtmse_claim_lodged_to_portal_via_api_and_accepted') || 
            baseName.startsWith('branchwise_cgtmse_claim_lodged_to_portal_via_api_and_accepted')) {
            setType('cgtmse-claims');
            console.log('Auto-detected: CGTMSE Claims file (filename pattern match)');
            return;
        }

        // Extension based detection
        switch(extension) {
            case 'csv':
                setType('delimited');
                setDelimiter(',');
                console.log('Auto-detected: CSV file');
                break;
            case 'tsv':
                setType('delimited');
                setDelimiter('\t');
                console.log('Auto-detected: TSV file');
                break;
            case 'txt':
            case 'rpt':
                // Content-based detection for text files
                if (baseName.includes('deposit')) {
                    setType('bank-deposits');
                    console.log('Auto-detected: Bank Deposits file (content hint)');
                } else if (baseName.includes('bgl') || baseName.includes('account') && baseName.includes('balance')) {
                    setType('bgl-accounts');
                    console.log('Auto-detected: BGL Accounts file (content hint)');
                } else {
                    setType('fixed-width');
                    console.log('Auto-detected: Fixed-width text file');
                }
                break;
            case 'log':
                setType('regex');
                console.log('Auto-detected: Log file for regex parsing');
                break;
            case '': // Files without extension
                setType('fixed-width');
                console.log('Auto-detected: Fixed-width file (no extension)');
                break;
            default:
                setType('delimited');
                console.log('Auto-detected: Default to delimited parsing');
        }
    }

    // Parser Factory - uses the parser registry for extensibility
    async createParser(parserType, content) {
        const parser = this.parsers[parserType];
        if (!parser) {
            throw new Error(`Unsupported parser type: ${parserType}. Available parsers: ${Object.keys(this.parsers).join(', ')}`);
        }

        console.log(`Using ${parserType} parser for file processing`);
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
            console.log('Starting file parsing...');
            const content = await this.readFile(this.currentFile);
            console.log('File read complete, content length:', content.length);
            
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
            console.log('Using parser type:', parserType);
            
            // Use parser factory for better extensibility
            const parsedData = await this.createParser(parserType, content);
            console.log('Parsing complete, rows:', parsedData.data.length);

            this.data = parsedData.data;
            this.headers = parsedData.headers;
            this.originalData = [...this.data];
            this.filteredData = [...this.data];

            // Set page size to "all" by default and update the dropdown
            this.pageSize = 'all';
            const pageSizeSelect = document.getElementById('pageSize');
            if (pageSizeSelect) {
                pageSizeSelect.value = 'all';
            }

            console.log('Rendering table...');
            this.renderTable();
            this.showDataContainer();
            
            // Auto-analyze data when loaded
            this.performDataAnalysis();
            
            this.showSuccessMessage(`Successfully parsed ${this.data.length} rows with ${this.headers.length} columns.`);

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
            console.log('Parsing complete, loading hidden');
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
                    console.log(`Bank deposits parser successfully parsed ${result.data.length} rows`);
                    return { headers: result.headers, data: result.data };
                } else {
                    console.warn('Bank deposits parser returned no data, falling back to basic parsing');
                }
            } catch (error) {
                console.error('Bank deposits parser failed:', error);
                console.log('Falling back to basic fixed-width parsing');
            }
        }
        
        // Fallback to original parsing logic
        console.log('Using fallback bank deposits parsing');
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
            console.log('Using registered BGL accounts parser');
            return bglParser.parse(content);
        }
        
        // Fallback parsing if no registered parser available
        console.log('Using fallback BGL accounts parsing');
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
        // Delegate to specialized SDV parser if available
        if (window.SDVAccountsParser) {
            const parser = new window.SDVAccountsParser();
            const result = parser.parse(content);
            
            if (result.success) {
                return {
                    headers: result.headers,
                    data: result.data.map(row => Object.values(row))
                };
            }
        }
        
        // Fallback to simple parsing
        return this.parseSDVAccountsFallback(content);
    }

    parseSDVAccountsFallback(content) {
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
        // Delegate to specialized CGTMSE parser if available
        if (typeof parseCGTMSEClaims === 'function') {
            console.log('Using specialized CGTMSE parser');
            const result = parseCGTMSEClaims(content);
            console.log('CGTMSE parser result:', result);
            
            if (result.success) {
                console.log('Converting data to array format, data sample:', result.data[0]);
                const convertedData = result.data.map(row => {
                    const values = Object.values(row);
                    console.log('Converted row sample:', values.slice(0, 5)); // Log first 5 values
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
        
        console.log('Using fallback CGTMSE parser');
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

    parseFixedWidth(content) {
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
        this.renderTableHeader();
        this.renderTableBody();
        this.renderPagination();
        this.renderColumnControls();
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
                const headerActiveFilters = this.columnFilters[index] ? this.columnFilters[index].length : 0;
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
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = this.pageSize === 'all' ? this.filteredData.length : startIndex + this.pageSize;
        const pageData = this.filteredData.slice(startIndex, endIndex);

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
            tbody.appendChild(tr);
        });
    }

    renderPagination() {
        const pagination = document.getElementById('pagination');
        pagination.innerHTML = '';

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
                const aVal = a[columnIndex] || '';
                const bVal = b[columnIndex] || '';
                
                // Check if values look like dates (DD/MM/YYYY format)
                const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
                const aIsDate = dateRegex.test(aVal);
                const bIsDate = dateRegex.test(bVal);
                
                let comparison;
                if (aIsDate && bIsDate) {
                    // Parse dates for comparison
                    const aDate = this.parseDate(aVal);
                    const bDate = this.parseDate(bVal);
                    comparison = aDate.getTime() - bDate.getTime();
                } else {
                    // Try to parse as numbers
                    const aNum = parseFloat(aVal.replace(/[,\s]/g, ''));
                    const bNum = parseFloat(bVal.replace(/[,\s]/g, ''));
                    
                    if (!isNaN(aNum) && !isNaN(bNum)) {
                        comparison = aNum - bNum;
                    } else {
                        comparison = aVal.localeCompare(bVal);
                    }
                }
                
                return this.sortDirection === 'asc' ? comparison : -comparison;
            });

            this.renderTable();
            this.hideLoading();
        }, 100);
    }

    parseDate(dateStr) {
        // Parse DD/MM/YYYY format
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
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
        
        // Start with all data
        let filtered = [...this.originalData];
        
        // Apply column filters first
        Object.keys(this.columnFilters).forEach(columnIndex => {
            const allowedValues = this.columnFilters[columnIndex];
            if (allowedValues && allowedValues.length > 0) {
                filtered = filtered.filter(row => {
                    const cellValue = row[columnIndex] || '';
                    return allowedValues.includes(cellValue);
                });
            }
        });
        
        // Apply fuzzy search filter
        if (searchTerm) {
            filtered = filtered.filter(row =>
                row.some(cell => {
                    if (!cell) return false;
                    const cellText = cell.toString().toLowerCase();
                    return this.fuzzyMatch(cellText, searchTerm);
                })
            );
        }
        
        this.filteredData = filtered;
        this.currentPage = 1;
        this.renderTable();
        
        // Update analysis to reflect filtered data
        this.performDataAnalysis();
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
            
            // Update display
            this.renderTable();
            this.performDataAnalysis();
            
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
        
        // Start with all data
        let filtered = [...this.originalData];
        
        // Apply column filters first
        Object.keys(this.columnFilters).forEach(columnIndex => {
            const allowedValues = this.columnFilters[columnIndex];
            if (allowedValues && allowedValues.length > 0) {
                filtered = filtered.filter(row => {
                    const cellValue = row[columnIndex] || '';
                    return allowedValues.includes(cellValue);
                });
            }
        });
        
        // Apply text search filter
        if (searchTerm) {
            filtered = filtered.filter(row =>
                row.some(cell => 
                    cell && cell.toString().toLowerCase().includes(searchTerm)
                )
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

    performDataAnalysis() {
        const statsPanel = document.getElementById('statsPanel');
        const statsGrid = document.getElementById('statsGrid');
        
        // Auto-analysis should always run when called
        let stats;
        
        // Use filtered data for analysis to reflect current view
        const currentData = this.filteredData || this.data;
        
        // Check if this is a bank deposits report and use specialized analysis
        if (this.metadata && window.BankDepositsParser && this.headers.includes('Customer Number')) {
            const parser = new window.BankDepositsParser();
            const bankingReport = parser.generateBankingReport(currentData, this.metadata);
            stats = this.combineBankingAnalysis(this.calculateStatistics(currentData), bankingReport);
        } else {
            stats = this.calculateStatistics(currentData);
        }
        
        this.renderStatistics(stats);
        statsPanel.style.display = 'block';
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
                    <button onclick="window.textParserInstance.performDataAnalysis()" style="margin-left: 10px; padding: 2px 8px; font-size: 11px; background: #2196f3; color: white; border: none; border-radius: 3px; cursor: pointer;">🔄 Refresh</button>
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
                console.log('Available status keys:', Object.keys(banking.accountAnalysis.statusDistribution));
                
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
                            console.log(`Found ${keyCount} accounts with status: ${key}`);
                        }
                    });
                    
                    this.addStatItem(statsGrid, count, displayStatus);
                });
            }
        } else {
            // Basic stats for non-banking data
            this.addStatItem(statsGrid, stats.totalRows, 'Total Rows');
            this.addStatItem(statsGrid, stats.totalColumns, 'Total Columns');
            this.addStatItem(statsGrid, stats.numericColumns.length, 'Numeric Columns');
            this.addStatItem(statsGrid, stats.textColumns.length, 'Text Columns');
        }
    }

    showFilterDropdown(columnIndex, buttonElement) {
        // Check if filtering is disabled for this column
        const headerName = this.headers[columnIndex];
        if (this.shouldDisableFilter(columnIndex, headerName)) {
            console.log(`Filtering disabled for column: ${headerName}`);
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
        
        // Check if this appears to be a date column
        const isDateColumn = this.isDateColumn(uniqueValues);
        
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
        
        if (isDateColumn) {
            this.renderDateFilter(dropdown, columnIndex, uniqueValues);
        } else {
            this.renderRegularFilter(dropdown, columnIndex, uniqueValues);
        }
        
        // Position and show dropdown
        buttonElement.parentElement.appendChild(dropdown);
        
        // Store the current filter state for comparison
        const originalFilters = this.columnFilters[columnIndex] ? [...this.columnFilters[columnIndex]] : [];
        
        // Close dropdown when clicking outside and auto-apply filters
        const closeDropdown = (e) => {
            if (!dropdown.contains(e.target) && e.target !== buttonElement) {
                // Auto-apply filters when clicking outside
                this.autoApplyFilters(dropdown, columnIndex, isDateColumn, uniqueValues);
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
        const monthNumber = monthNames.indexOf(month) + 1;
        
        return allValues.filter(dateStr => {
            if (this.isValidDate(dateStr)) {
                const [day, dateMonth, dateYear] = dateStr.split('/').map(Number);
                return dateYear === parseInt(year) && dateMonth === monthNumber;
            }
            return false;
        });
    }

    isDateColumn(values) {
        // Check if at least 70% of values look like dates
        const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
        const dateCount = values.filter(val => dateRegex.test(val)).length;
        return values.length > 0 && (dateCount / values.length) >= 0.7;
    }

    renderDateFilter(dropdown, columnIndex, dateValues) {
        // Parse and group dates by year and month
        const dateGroups = {};
        
        dateValues.forEach(dateStr => {
            if (this.isValidDate(dateStr)) {
                const [day, month, year] = dateStr.split('/');
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthName = monthNames[parseInt(month) - 1];
                
                if (!dateGroups[year]) {
                    dateGroups[year] = {};
                }
                if (!dateGroups[year][monthName]) {
                    dateGroups[year][monthName] = [];
                }
                dateGroups[year][monthName].push(dateStr);
            }
        });
        
        // Add "Select All" option
        const selectAllDiv = document.createElement('div');
        selectAllDiv.style.cssText = 'padding: 4px; border-bottom: 1px solid #eee; margin-bottom: 4px;';
        
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.id = 'selectAll';
        selectAllCheckbox.checked = !this.columnFilters[columnIndex] || this.columnFilters[columnIndex].length === 0;
        
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
        const activeFilters = this.columnFilters[columnIndex] || [];
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
        selectAllCheckbox.checked = !this.columnFilters[columnIndex] || this.columnFilters[columnIndex].length === 0;
        
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
            checkbox.checked = !this.columnFilters[columnIndex] || 
                              this.columnFilters[columnIndex].length === 0 || 
                              this.columnFilters[columnIndex].includes(value);
            
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

    addFilterButtons(dropdown, columnIndex, getSelectedValues, allValues) {
        const buttonDiv = document.createElement('div');
        buttonDiv.style.cssText = 'padding: 8px 0; border-top: 1px solid #eee; margin-top: 8px;';
        
        const applyButton = document.createElement('button');
        applyButton.textContent = 'Apply';
        applyButton.style.cssText = 'margin-right: 8px; padding: 4px 12px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;';
        applyButton.addEventListener('click', () => {
            this.showLoading('Applying filters...');
            
            setTimeout(() => {
                const selectedValues = getSelectedValues();
                
                if (selectedValues.length === allValues.length) {
                    // All selected = no filter
                    delete this.columnFilters[columnIndex];
                } else {
                    this.columnFilters[columnIndex] = selectedValues;
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
        // Simple Excel export using HTML table format
        const excelContent = `
            <table>
                <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                ${data.map(row => `<tr>${row.map(cell => `<td>${cell || ''}</td>`).join('')}</tr>`).join('')}
            </table>
        `;
        
        this.downloadFile(excelContent, 'parsed_data.xls', 'application/vnd.ms-excel');
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
}

// Initialize the text parser when the DOM is loaded
let textParser;
document.addEventListener('DOMContentLoaded', function() {
    textParser = new TextParser();
    // Make globally accessible for refresh button
    window.textParserInstance = textParser;
});
