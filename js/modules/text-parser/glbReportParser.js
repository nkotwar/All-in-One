/**
 * GLB Report Parser - Parses General Ledger Balance reports
 * Handles files with format YYYYMMDD_GLB (no extension or .gz extension)
 * Parses balance sheet format with Liabilities and Assets in separate columns
 */

class GLBReportParser {
    constructor() {
        this.reportData = {
            reportDate: '',
            branch: {
                number: '',
                name: '',
                region: '',
                zone: ''
            },
            currency: '',
            liabilities: [],
            assets: [],
            totalLiabilities: 0,
            totalAssets: 0
        };

        // Define known liability items for better recognition
        this.knownLiabilityItems = new Set([
            '1-CAPITAL & RESERVES',
            'EQUITY CAPITAL',
            'PREFERENCE SHARE(PERPETUAL NON-CUMULATIVE)',
            'REDEEMABLE UNSEC. BONDS(SUBORDINATED DEBTS)-TIERII CAPITAL',
            'UPPER TIER II CAPITAL',
            'INNOVATIVE PERPETUAL DEBT INTRUMENT (IPDI)',
            'RESERVES & SURPLUS',
            'TOTAL OF CAPITAL AND RESERVES',
            '2-DEMAND DEPOSITS',
            'CURRENT DEPOSITS',
            'CURRENT DEPOSITS AS PER GL',
            'ADD: CR BALANCE IN OVERDRAFT',
            'ADD: CR BALANCE IN CASH CREDIT',
            'ADD: CR BALANCE IN DEMAND LOANS',
            'ADD: CR BALANCE IN PACKING CREDIT',
            'TOTAL CURRENT DEPOSITS',
            'HOME SAVINGS SAFE (HSS)',
            'TOTAL DEMAND DEPOSITS',
            'TERM DEPOSITS (TIME DEPOSITS)',
            'FIXED DEPOSIT RECEIPTS',
            'MONTHLY INTEREST DEPOSIT RECEIPTS',
            'QUARLTERLY INTEREST DEPOSIT RECEIPTS',
            'MONEY MULTIPLIER DEPOSIT CERTIFICATES',
            'RECURRING DEPOSIT SCHEME',
            'TOTAL TIME DEPOSITS',
            'TOTAL DEPOSITS',
            'CREDIT BALANCE IN NOMINAL ACCTS',
            'BORROWINGS/REFINANCE FROM NABARD',
            'BORROWINGS/REFINANCE FROM EXIM BANK',
            'BORROWINGS/REFINANCE FROM SIDBI UNDER ARS',
            'MARKET BORROWINGS',
            'BORROWINGS FROM INSTITUTIONS',
            'TOTAL BORROWINGS/OVERDRAWING WITH RBI',
            'TOTAL BORROWINGS/REFINANCE',
            '3-INTERBRANCH ACCTS (LIAB)',
            'ACH SPONSOR DEBIT RETURN',
            'ACH SPONSOR DEBIT ACCOUNT',
            'ARW ADJUSTMENT A/C',
            'FOREIGN CURRENCY DEPOSITS WITH ID',
            'RTGS INWARD FOR UBGB CR',
            'RTGS OUTWARD FOR UBGB CR',
            'ARW ADJUSTMENT A/C CR',
            'AMOUNT RECOVERABLE FROM NBO ON A/C OF DD PAID CR',
            'RTGS SETTLEMENT FOR UBGB CR',
            'RTGS INWARD FOR UBKGB CR',
            'RTGS OUTWARD FOR UBKGB CR',
            'RTGS SETTLEMENT FOR UBKGB',
            'TOTAL OF INTERBRANCH A/CS',
            'OTHER LIABILITIES',
            'BRANCH ADJUSTMENTS',
            'UNACLAIMED DIVIDENDS',
            'REBATE ON INDIA TREASURY BILLS',
            'INTEREST ACCRUED',
            'MISCELLANEOUS',
            'PROFIT & LOSS',
            'PROFIT & LOSS BALANCE',
            '4-SUSPENSE ACCOUNTS',
            'TECHNICAL CONTRA',
            'SYS SUSP TRICKLE FEED UNPOSTED TRANS',
            'OUTWARD CLEARING SUSPENSE A/C',
            'NEFT SETTLEMENT A/C',
            'SYSTEM SUSPENSE TRICKLE FEED UNPOSTED TRANSACTIONS',
            'TOTAL OF SYSTEM SUSPENSE A/C',
            'TOTAL OF SUSEPNSE A/CS',
            '5-SUB TOTAL LIABILITIES',
            'AMOUNT COLLECTED- GOVERNMENT SCHEMES',
            'PPF SCHEME 1968 COLLECTED',
            'SUKANYA COLLECTED',
            'SENIOR CITIZENS SAVINGS SCHEME - COLLECTED',
            'TOTAL AMOUNT COLLECTED- GOVERNMENT SCHEMES',
            '6-TOTAL LIABILITIES(INCL. GOVT. COLL)',
            'CONTRA ACCOUNTS (LIABILITY)',
            'TOTAL CONTRA ACCOUNTS (LIABILITIES)',
            'GRAND TOTAL OF LIABILITIES'
        ]);

        // Define known asset items for better recognition
        this.knownAssetItems = new Set([
            '1-CASH IN HAND INR',
            'BALANCE WITH BOISPNS',
            'CASH IN CASH RECYCLER MACHINE DEBIT',
            'CASH GIVEN TO SERVICE PROVIDER FOR ATM',
            'TOTAL OF CASH IN HAND',
            'TOTAL CASH & BALANCES WITH RBI',
            'LOANS & ADVANCES',
            '2-OVERDRAFTS',
            'TOTAL OF OVERDRAFT',
            'CASH CREDITS',
            'TERM LOANS',
            'DEMAND LOANS',
            'BILLS PURCHASED/DISCOUNTED INLAND',
            'EXPORT BILLS PURCHASED/DISCOUNTED/NEGOTIATED',
            'TOTAL ADVANCES',
            'FIXED ASSETS',
            'LAND & BUILDING',
            'FURNITURE & FIXTURES',
            'TOTAL FIXED ASSETS',
            'OTHER ASSETS',
            'STAMPS & STAMPED FORMS INR',
            'DEBIT BALANCE IN NOMINAL A/CS',
            'TOTAL OTHER ASSETS',
            'TOTAL OF FIXED & OTHER ASSETS',
            '3-INTERBRANCH ACCTS(ASSETS)',
            'RTGS INWARD FOR UBGB DR',
            'RTGS OUTWARD FOR UBGB DR',
            'ARW ADJUSTMENT A/C DR',
            'RTGS SETTLEMENT FOR UBGB DR',
            'RTGS INWARD FOR UBKGB DR',
            'RTGS OUTWARD FOR UBKGB DR',
            'RTGS SETTLEMENT FOR UBKGB DR',
            'ACH SPONSOR DEBIT RETURN',
            'ACH SPONSOR DEBIT ACCOUNT',
            'CENTRAL OFFICE ACCOUNT ON BRANCHES',
            'FOREIGN CURRENCY DEPOSITS WITH ID',
            'INTER OFFICE ADJUSTMENTS',
            'ARW ADJUSTMENT ACCOUNT',
            'BILLS PAYABLE',
            'TRAVELLERS CHEQUE (NET)',
            'TOTAL OF INTERBRANCH A/CS',
            'PROFIT & LOSS BALANCE',
            '4-SUSPENSE ACCOUNTS',
            'TECHNICAL CONTRA A/C',
            'SYSTEM SUSPENSE A/C',
            'NEFT SUSPENSE/REJECT TXNS',
            'TOTAL OF SYSTEM SUSPENSE A/C',
            'TOTAL OF SUSEPNSE A/CS',
            '5-SUB TOTAL ASSET',
            'AMOUNT REMITTED UNDER GOVERNMENT SCHEME',
            'PPF SCHEME 1968 REMITTED',
            'SUKANYA REMITTED',
            'SENIOR CITIZENS SAVINGS SCHEME - REMITTED',
            'TOTAL OF AMOUNT REMITTED UNDER GOVT SCHEME',
            '6-TOTAL ASSETS (INCL. GOVT. REMIT.)',
            'CONTRA ACCOUNTS',
            'TOTAL CONTRA ACCOUNTS',
            'GRAND TOTAL OF ASSETS'
        ]);

        // Common multi-line patterns
        this.multiLinePatterns = {
            'PREFERENCE SHARE(PERPETUAL NON': 'PREFERENCE SHARE(PERPETUAL NON-CUMULATIVE)',
            'REDEEMABLE UNSEC. BONDS(SUBORD': 'REDEEMABLE UNSEC. BONDS(SUBORDINATED DEBTS)-TIERII CAPITAL',
            'INNOVATIVE PERPETUAL DEBT INTR': 'INNOVATIVE PERPETUAL DEBT INTRUMENT (IPDI)',
            'MONTHLY INTEREST DEPOSIT RECEI': 'MONTHLY INTEREST DEPOSIT RECEIPTS',
            'QUARLTERLY INTEREST DEPOSIT RE': 'QUARLTERLY INTEREST DEPOSIT RECEIPTS',
            'MONEY MULTIPLIER DEPOSIT CERTI': 'MONEY MULTIPLIER DEPOSIT CERTIFICATES',
            'TOTAL BORROWINGS/OVERDRAWING W': 'TOTAL BORROWINGS/OVERDRAWING WITH RBI',
            'AMOUNT RECOVERABLE FROM NBO ON': 'AMOUNT RECOVERABLE FROM NBO ON A/C OF DD PAID CR',
            'SYS SUSP TRICKLE FEED UNPOSTED': 'SYS SUSP TRICKLE FEED UNPOSTED TRANS',
            'SYSTEM SUSPENSE TRICKLE FEED U': 'SYSTEM SUSPENSE TRICKLE FEED UNPOSTED TRANSACTIONS',
            'AMOUNT COLLECTED- GOVERNMENT S': 'AMOUNT COLLECTED- GOVERNMENT SCHEMES',
            'SENIOR CITIZENS SAVINGS': 'SENIOR CITIZENS SAVINGS SCHEME - COLLECTED',
            'TOTAL AMOUNT COLLECTED- GOVERN': 'TOTAL AMOUNT COLLECTED- GOVERNMENT SCHEMES',
            'CASH IN CASH RECYCLER MACHINE': 'CASH IN CASH RECYCLER MACHINE DEBIT',
            'CASH GIVEN TO SERVICE PROVIDER': 'CASH GIVEN TO SERVICE PROVIDER FOR ATM',
            'BILLS PURCHASED/DISCOUNTED INL': 'BILLS PURCHASED/DISCOUNTED INLAND',
            'EXPORT BILLS PURCHASED/DISCOUN': 'EXPORT BILLS PURCHASED/DISCOUNTED/NEGOTIATED',
            'CENTRAL OFFICE ACCOUNT ON BRAN': 'CENTRAL OFFICE ACCOUNT ON BRANCHES',
            'AMOUNT REMITTED UNDER GOVERNME': 'AMOUNT REMITTED UNDER GOVERNMENT SCHEME',
            'TOTAL OF AMOUNT REMITTED UNDER': 'TOTAL OF AMOUNT REMITTED UNDER GOVT SCHEME'
        };
    }

    /**
     * Main parsing function
     * @param {string} content - The file content to parse
     * @param {string} filename - The filename for validation
     * @returns {Object} Parsed report data
     */
    parse(content, filename = '') {
        try {
            // Validate filename format
            if (filename && !this.validateFilename(filename)) {
                throw new Error('Invalid filename format. Expected: YYYYMMDD_GLB or YYYYMMDD_GLB.gz');
            }

            // Split content into lines
            const lines = content.split('\n').map(line => line.trim());
            
            // Extract header information
            this.extractHeaderInfo(lines);
            
            // Find the balance sheet section
            const balanceSheetStart = this.findBalanceSheetStart(lines);
            if (balanceSheetStart === -1) {
                throw new Error('Balance sheet section not found');
            }

            // Parse the balance sheet data
            this.parseBalanceSheet(lines, balanceSheetStart);

            return this.formatOutput();

        } catch (error) {
            console.error('GLB Report parsing error:', error);
            throw error;
        }
    }

    /**
     * Validates filename format
     * @param {string} filename
     * @returns {boolean}
     */
    validateFilename(filename) {
        const pattern = /^\d{8}_GLB(\.gz)?$/;
        return pattern.test(filename);
    }

    /**
     * Extracts header information from the report
     * @param {Array} lines
     */
    extractHeaderInfo(lines) {
        for (let i = 0; i < Math.min(20, lines.length); i++) {
            const line = lines[i];
            
            // Extract report date
            if (line.includes('GENERAL LEDGER BALANCE') && line.includes('AS ON')) {
                const dateMatch = line.match(/AS ON\s+(\d{2}\/\d{2}\/\d{4})/);
                if (dateMatch) {
                    this.reportData.reportDate = dateMatch[1];
                }
            }

            // Extract currency
            if (line.startsWith('Currency:')) {
                this.reportData.currency = line.replace('Currency:', '').trim();
            }

            // Extract branch information
            if (line.includes('Branch NO:')) {
                const branchMatch = line.match(/Branch NO:(\d+)/);
                if (branchMatch) {
                    this.reportData.branch.number = branchMatch[1];
                }
                
                const regionMatch = line.match(/Region-ID:(\d+)/);
                if (regionMatch) {
                    this.reportData.branch.region = regionMatch[1];
                }
                
                const zoneMatch = line.match(/Zone-ID:(\d+)/);
                if (zoneMatch) {
                    this.reportData.branch.zone = zoneMatch[1];
                }
            }

            // Extract branch name
            if (line.includes('Branch Name:')) {
                const nameMatch = line.match(/Branch Name:\s*\(([^)]+)\)/);
                if (nameMatch) {
                    this.reportData.branch.name = nameMatch[1];
                }
            }
        }
    }

    /**
     * Finds the start of the balance sheet section
     * @param {Array} lines
     * @returns {number} Line index or -1 if not found
     */
    findBalanceSheetStart(lines) {
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('LIABILITIES') && lines[i].includes('ASSETS')) {
                return i + 2; // Skip header and separator line
            }
        }
        return -1;
    }

    /**
     * Parses the balance sheet section
     * @param {Array} lines
     * @param {number} startIndex
     */
    parseBalanceSheet(lines, startIndex) {
        let pendingLiabilityEntry = null;
        let pendingAssetEntry = null;

        for (let i = startIndex; i < lines.length; i++) {
            const originalLine = lines[i];
            
            // Skip separator lines and empty lines
            if (originalLine.includes('=====') || originalLine.trim().length === 0) {
                continue;
            }

            // Stop at page headers, footers, or grand totals
            if (originalLine.includes('CBI_SOB') || 
                originalLine.includes('CENTRAL BANK OF INDIA') || 
                originalLine.includes('GENERAL LEDGER BALANCE') ||
                originalLine.includes('Currency: INR') ||
                originalLine.includes('Branch=') ||
                originalLine.includes('GRAND TOTAL')) {
                continue;
            }

            // Skip header lines that contain both LIABILITIES and ASSETS
            if (originalLine.includes('LIABILITIES') && originalLine.includes('ASSETS')) {
                continue;
            }

            // Process the line if it contains pipe separators
            if (originalLine.includes('|')) {
                const result = this.parseBalanceSheetLine(originalLine, pendingLiabilityEntry, pendingAssetEntry);
                
                // Update pending entries for multi-line handling
                pendingLiabilityEntry = result.pendingLiabilityEntry;
                pendingAssetEntry = result.pendingAssetEntry;
                
                // Add completed entries
                if (result.completedLiabilityEntry) {
                    this.reportData.liabilities.push(result.completedLiabilityEntry);
                }
                if (result.completedAssetEntry) {
                    this.reportData.assets.push(result.completedAssetEntry);
                }
            }
        }

        // Add any remaining pending entries
        if (pendingLiabilityEntry && pendingLiabilityEntry.header.trim()) {
            this.reportData.liabilities.push(pendingLiabilityEntry);
        }
        if (pendingAssetEntry && pendingAssetEntry.header.trim()) {
            this.reportData.assets.push(pendingAssetEntry);
        }
    }

    /**
     * Parses a single balance sheet line with pipe-separated columns
     * @param {string} line
     * @param {Object} pendingLiabilityEntry
     * @param {Object} pendingAssetEntry
     * @returns {Object}
     */
    parseBalanceSheetLine(line, pendingLiabilityEntry, pendingAssetEntry) {
        // Split by pipe and clean up columns
        const columns = line.split('|').map(col => col.trim());
        
        // Ensure we have 8 columns (pad with empty strings if needed)
        while (columns.length < 8) {
            columns.push('');
        }

        const result = {
            pendingLiabilityEntry: null,
            pendingAssetEntry: null,
            completedLiabilityEntry: null,
            completedAssetEntry: null
        };

        // Extract liability data (columns 0-3)
        const liabilityHeader = columns[0];
        const liabilityValue1 = this.parseAmount(columns[1]);
        const liabilityValue2 = this.parseAmount(columns[2]);
        const liabilityValue3 = this.parseAmount(columns[3]);

        // Extract asset data (columns 4-7)
        const assetHeader = columns[4];
        const assetValue1 = this.parseAmount(columns[5]);
        const assetValue2 = this.parseAmount(columns[6]);
        const assetValue3 = this.parseAmount(columns[7]);

        // Process liability side
        const liabilityResult = this.processEntry(
            liabilityHeader, 
            liabilityValue1, 
            liabilityValue2, 
            liabilityValue3, 
            [columns[1], columns[2], columns[3]],
            pendingLiabilityEntry,
            'liability'
        );
        
        result.pendingLiabilityEntry = liabilityResult.pendingEntry;
        result.completedLiabilityEntry = liabilityResult.completedEntry;

        // Process asset side
        const assetResult = this.processEntry(
            assetHeader, 
            assetValue1, 
            assetValue2, 
            assetValue3, 
            [columns[5], columns[6], columns[7]],
            pendingAssetEntry,
            'asset'
        );
        
        result.pendingAssetEntry = assetResult.pendingEntry;
        result.completedAssetEntry = assetResult.completedEntry;

        return result;
    }

    /**
     * Process a single entry (liability or asset) with multi-line support
     * @param {string} header
     * @param {number} value1
     * @param {number} value2
     * @param {number} value3
     * @param {Array} rawColumns
     * @param {Object} pendingEntry
     * @param {string} side
     * @returns {Object}
     */
    processEntry(header, value1, value2, value3, rawColumns, pendingEntry, side) {
        // Skip empty headers
        if (!header || header.trim() === '') {
            return { pendingEntry, completedEntry: null };
        }

        const cleanedHeader = this.cleanHeader(header);
        const normalizedHeader = this.normalizeHeader(cleanedHeader);
        const totalValue = value1 || value2 || value3 || 0;
        const type = this.determineCreditDebit(rawColumns[0], rawColumns[1], rawColumns[2]);

        // Check if this is a known complete item
        const knownItems = side === 'liability' ? this.knownLiabilityItems : this.knownAssetItems;
        if (knownItems.has(normalizedHeader)) {
            // Complete any pending entry first
            let completedEntry = null;
            if (pendingEntry && pendingEntry.header.trim()) {
                completedEntry = pendingEntry;
            }

            // Create new entry for this known item
            const newEntry = {
                header: cleanedHeader,
                normalizedHeader: normalizedHeader,
                value: totalValue,
                type: type,
                hasValue: totalValue > 0,
                isKnownItem: true
            };

            return { pendingEntry: newEntry, completedEntry: completedEntry };
        }

        // Check if this continues a multi-line pattern
        const multiLineMatch = this.findMultiLineMatch(normalizedHeader, pendingEntry);
        if (multiLineMatch) {
            const updatedEntry = {
                ...pendingEntry,
                header: multiLineMatch.fullText,
                normalizedHeader: multiLineMatch.normalizedText,
                value: Math.max(pendingEntry.value, totalValue),
                type: pendingEntry.type || type,
                hasValue: pendingEntry.hasValue || totalValue > 0,
                isKnownItem: true
            };
            
            return { pendingEntry: updatedEntry, completedEntry: null };
        }

        // Check if this is a continuation of the previous entry using existing logic
        if (pendingEntry && this.isContinuationLine(cleanedHeader, pendingEntry)) {
            const updatedEntry = {
                ...pendingEntry,
                header: pendingEntry.header + ' ' + cleanedHeader,
                normalizedHeader: this.normalizeHeader(pendingEntry.header + ' ' + cleanedHeader),
                value: Math.max(pendingEntry.value, totalValue),
                type: pendingEntry.type || type,
                hasValue: pendingEntry.hasValue || totalValue > 0
            };
            
            return { pendingEntry: updatedEntry, completedEntry: null };
        } else {
            // This is a new entry
            let completedEntry = null;
            
            // Complete any pending entry first
            if (pendingEntry && pendingEntry.header.trim()) {
                completedEntry = pendingEntry;
            }
            
            // Create new entry if this header makes sense as a standalone entry
            let newPendingEntry = null;
            if (cleanedHeader.length >= 3 && !this.isJustSpacing(cleanedHeader)) {
                newPendingEntry = {
                    header: cleanedHeader,
                    normalizedHeader: normalizedHeader,
                    value: totalValue,
                    type: type,
                    hasValue: totalValue > 0,
                    isKnownItem: knownItems.has(normalizedHeader)
                };
            }
            
            return { pendingEntry: newPendingEntry, completedEntry: completedEntry };
        }
    }

    /**
     * Normalize header text for matching against known items
     * @param {string} header
     * @returns {string}
     */
    normalizeHeader(header) {
        return header
            .toUpperCase()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s\-()\/&]/g, '')
            .trim();
    }

    /**
     * Find if this header matches a multi-line pattern
     * @param {string} normalizedHeader
     * @param {Object} pendingEntry
     * @returns {Object|null}
     */
    findMultiLineMatch(normalizedHeader, pendingEntry) {
        if (!pendingEntry) return null;

        // Check if the pending entry starts a known multi-line pattern
        const pendingNormalized = pendingEntry.normalizedHeader || this.normalizeHeader(pendingEntry.header);
        
        for (const [pattern, fullText] of Object.entries(this.multiLinePatterns)) {
            const normalizedPattern = this.normalizeHeader(pattern);
            const normalizedFullText = this.normalizeHeader(fullText);
            
            if (pendingNormalized.includes(normalizedPattern)) {
                // Check if combining with current header gives us the full text
                const combined = this.normalizeHeader(pendingEntry.header + ' ' + normalizedHeader);
                if (combined === normalizedFullText || 
                    normalizedFullText.includes(combined) ||
                    this.isReasonableMultiLineCombination(pendingEntry.header, normalizedHeader, fullText)) {
                    return {
                        fullText: fullText,
                        normalizedText: normalizedFullText
                    };
                }
            }
        }

        return null;
    }

    /**
     * Check if combining two parts makes a reasonable multi-line combination
     * @param {string} part1
     * @param {string} part2
     * @param {string} expectedFull
     * @returns {boolean}
     */
    isReasonableMultiLineCombination(part1, part2, expectedFull) {
        const combined = this.normalizeHeader(part1 + ' ' + part2);
        const expected = this.normalizeHeader(expectedFull);
        
        // Allow some flexibility in matching
        const similarity = this.calculateSimilarity(combined, expected);
        return similarity > 0.8;
    }

    /**
     * Calculate similarity between two strings
     * @param {string} str1
     * @param {string} str2
     * @returns {number}
     */
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    /**
     * Calculate Levenshtein distance between two strings
     * @param {string} str1
     * @param {string} str2
     * @returns {number}
     */
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

    /**
     * Check if this is just spacing or formatting text (not a real entry)
     */
    isJustSpacing(header) {
        // Check for common spacing patterns
        const spacingPatterns = [
            /^\s*$/,           // Just whitespace
            /^[.\-_\s]+$/,     // Just dots, dashes, underscores, spaces
            /^\d+\s*$/,        // Just numbers
            /^[()]+$/,         // Just parentheses
        ];
        
        return spacingPatterns.some(pattern => pattern.test(header));
    }

    /**
     * Check if this is a continuation line of a multi-line entry
     */
    isContinuationLine(header, pendingEntry) {
        if (!pendingEntry || !header) return false;
        
        // First check if this might complete a known multi-line pattern
        const pendingNormalized = pendingEntry.normalizedHeader || this.normalizeHeader(pendingEntry.header);
        const currentNormalized = this.normalizeHeader(header);
        
        // Check against known multi-line patterns
        for (const [pattern, fullText] of Object.entries(this.multiLinePatterns)) {
            const normalizedPattern = this.normalizeHeader(pattern);
            const normalizedFullText = this.normalizeHeader(fullText);
            
            if (pendingNormalized.includes(normalizedPattern)) {
                const combined = this.normalizeHeader(pendingEntry.header + ' ' + header);
                if (combined === normalizedFullText || 
                    normalizedFullText.includes(combined) ||
                    this.calculateSimilarity(combined, normalizedFullText) > 0.8) {
                    return true;
                }
            }
        }
        
        // Original continuation line logic for other cases
        const isShortFragment = header.length < 20;
        const isCommonWordEnding = /^(ted|ated|ing|ed|ion|tion|ment|ance|ence|ity|ies|ous|ful|ness|less|able|ible)$/i.test(header);
        const isCommonWordStart = /^(and|the|of|in|on|for|with|to|from|under|over|into)$/i.test(header);
        const isSingleShortWord = header.split(/\s+/).length === 1 && header.length < 10;
        const isPartialAcronym = /^[A-Z]{1,4}$/.test(header) && header.length < 5;
        const isNumberedContinuation = /^\d+\s*$/.test(header);
        
        // Check for specific banking terms that are often split
        const isBankingContinuation = /^(capital|deposits|advances|assets|liabilities|accounts|balance|total|schemes?|transactions?)$/i.test(header);
        
        // Check if combining with pending entry makes more grammatical sense
        const combinedLength = (pendingEntry.header + ' ' + header).length;
        const seemsLikePartOfLongerName = combinedLength < 100 && isShortFragment;
        
        // More specific patterns for banking documents
        const isBankingAcronym = /^(CR|DR|A\/C|INR|USD|RBI|RTGS|NEFT|ACH|HSS|PPF|GLB)$/i.test(header);
        const isPartialBankingTerm = /^(SUSP|TRICKLE|FEED|UNPOSTED|TRANS|RECYCLER|MACHINE|DEBIT|CREDIT)$/i.test(header);
        
        return (isShortFragment && (isCommonWordEnding || isCommonWordStart)) ||
               isSingleShortWord ||
               isPartialAcronym ||
               isNumberedContinuation ||
               seemsLikePartOfLongerName ||
               isBankingContinuation ||
               isBankingAcronym ||
               isPartialBankingTerm;
    }

    /**
     * Cleans header text by removing extra spaces and formatting
     * @param {string} header
     * @returns {string}
     */
    cleanHeader(header) {
        return header
            .replace(/\s+/g, ' ')
            .replace(/^[\s\-]+/, '')
            .replace(/[\s\-]+$/, '')
            .trim();
    }

    /**
     * Parses amount from string
     * @param {string} amountStr
     * @returns {number}
     */
    parseAmount(amountStr) {
        if (!amountStr || amountStr === '') return 0;
        
        // Remove CR/DR indicators and clean the string
        const cleaned = amountStr.replace(/\s*(CR|DR)\s*$/, '')
                                 .replace(/,/g, '')
                                 .trim();
        
        const amount = parseFloat(cleaned);
        return isNaN(amount) ? 0 : amount;
    }

    /**
     * Determines if amount is Credit or Debit
     * @param {string} col1
     * @param {string} col2
     * @param {string} col3
     * @returns {string}
     */
    determineCreditDebit(col1, col2, col3) {
        const columns = [col1, col2, col3];
        for (const col of columns) {
            if (col && col.includes('CR')) return 'Credit';
            if (col && col.includes('DR')) return 'Debit';
        }
        return 'Unknown';
    }

    /**
     * Calculates totals and formats output
     * @returns {Object}
     */
    formatOutput() {
        // Calculate totals only from entries with values
        this.reportData.totalLiabilities = this.reportData.liabilities
            .filter(item => item.hasValue)
            .reduce((sum, item) => sum + item.value, 0);
        
        this.reportData.totalAssets = this.reportData.assets
            .filter(item => item.hasValue)
            .reduce((sum, item) => sum + item.value, 0);

        // Calculate key banking totals
        const keyTotals = this.calculateKeyTotals();

        // Count all entries for reporting
        const totalLiabilityEntries = this.reportData.liabilities.length;
        const totalAssetEntries = this.reportData.assets.length;
        
        // Count entries with values
        const liabilityEntriesWithValues = this.reportData.liabilities.filter(item => item.hasValue).length;
        const assetEntriesWithValues = this.reportData.assets.filter(item => item.hasValue).length;

        return {
            success: true,
            data: this.reportData,
            keyTotals: keyTotals,
            summary: {
                reportDate: this.reportData.reportDate,
                branchName: this.reportData.branch.name,
                branchNumber: this.reportData.branch.number,
                currency: this.reportData.currency,
                totalLiabilities: this.reportData.totalLiabilities,
                totalAssets: this.reportData.totalAssets,
                liabilitiesCount: totalLiabilityEntries,
                assetsCount: totalAssetEntries,
                liabilitiesWithValuesCount: liabilityEntriesWithValues,
                assetsWithValuesCount: assetEntriesWithValues,
                balanceDifference: Math.abs(this.reportData.totalAssets - this.reportData.totalLiabilities),
                isBalanced: Math.abs(this.reportData.totalAssets - this.reportData.totalLiabilities) < 1000
            }
        };
    }

    /**
     * Calculate key banking totals with their components
     * @returns {Object}
     */
    calculateKeyTotals() {
        const keyTotals = {
            deposits: {
                total: 0,
                components: {
                    demandDeposits: {
                        total: 0,
                        components: {
                            currentDeposits: 0,
                            homeSavingsSafe: 0
                        }
                    },
                    timeDeposits: {
                        total: 0,
                        components: {
                            monthlyInterestDeposits: 0,
                            quarterlyInterestDeposits: 0,
                            moneyMultiplierDeposits: 0,
                            recurringDeposits: 0
                        }
                    }
                }
            },
            advances: {
                total: 0,
                components: {
                    overdrafts: 0,
                    cashCredits: 0,
                    termLoans: 0,
                    demandLoans: 0
                }
            }
        };

        // Calculate from liabilities
        this.reportData.liabilities.forEach(item => {
            const normalizedHeader = this.normalizeHeader(item.header);
            
            if (normalizedHeader.includes('TOTAL CURRENT DEPOSITS') && item.hasValue) {
                keyTotals.deposits.components.demandDeposits.components.currentDeposits = item.value;
            } else if (normalizedHeader.includes('HOME SAVINGS SAFE') && item.hasValue) {
                keyTotals.deposits.components.demandDeposits.components.homeSavingsSafe = item.value;
            } else if (normalizedHeader.includes('TOTAL DEMAND DEPOSITS') && item.hasValue) {
                keyTotals.deposits.components.demandDeposits.total = item.value;
            } else if (normalizedHeader.includes('MONTHLY INTEREST DEPOSIT') && item.hasValue) {
                keyTotals.deposits.components.timeDeposits.components.monthlyInterestDeposits = item.value;
            } else if (normalizedHeader.includes('QUARLTERLY INTEREST DEPOSIT') && item.hasValue) {
                keyTotals.deposits.components.timeDeposits.components.quarterlyInterestDeposits = item.value;
            } else if (normalizedHeader.includes('MONEY MULTIPLIER DEPOSIT') && item.hasValue) {
                keyTotals.deposits.components.timeDeposits.components.moneyMultiplierDeposits = item.value;
            } else if (normalizedHeader.includes('RECURRING DEPOSIT SCHEME') && item.hasValue) {
                keyTotals.deposits.components.timeDeposits.components.recurringDeposits = item.value;
            } else if (normalizedHeader.includes('TOTAL TIME DEPOSITS') && item.hasValue) {
                keyTotals.deposits.components.timeDeposits.total = item.value;
            } else if (normalizedHeader.includes('TOTAL DEPOSITS') && item.hasValue) {
                keyTotals.deposits.total = item.value;
            }
        });

        // Calculate from assets
        this.reportData.assets.forEach(item => {
            const normalizedHeader = this.normalizeHeader(item.header);
            
            if (normalizedHeader.includes('TOTAL OF OVERDRAFT') && item.hasValue) {
                keyTotals.advances.components.overdrafts = item.value;
            } else if (normalizedHeader.includes('CASH CREDITS') && !normalizedHeader.includes('BALANCE') && item.hasValue) {
                keyTotals.advances.components.cashCredits = item.value;
            } else if (normalizedHeader.includes('TERM LOANS') && item.hasValue) {
                keyTotals.advances.components.termLoans = item.value;
            } else if (normalizedHeader.includes('DEMAND LOANS') && !normalizedHeader.includes('BALANCE') && item.hasValue) {
                keyTotals.advances.components.demandLoans = item.value;
            } else if (normalizedHeader.includes('TOTAL ADVANCES') && item.hasValue) {
                keyTotals.advances.total = item.value;
            }
        });

        // Calculate totals if not found in data (fallback calculation)
        if (keyTotals.deposits.components.demandDeposits.total === 0) {
            keyTotals.deposits.components.demandDeposits.total = 
                keyTotals.deposits.components.demandDeposits.components.currentDeposits + 
                keyTotals.deposits.components.demandDeposits.components.homeSavingsSafe;
        }

        if (keyTotals.deposits.components.timeDeposits.total === 0) {
            keyTotals.deposits.components.timeDeposits.total = 
                keyTotals.deposits.components.timeDeposits.components.monthlyInterestDeposits +
                keyTotals.deposits.components.timeDeposits.components.quarterlyInterestDeposits +
                keyTotals.deposits.components.timeDeposits.components.moneyMultiplierDeposits +
                keyTotals.deposits.components.timeDeposits.components.recurringDeposits;
        }

        if (keyTotals.deposits.total === 0) {
            keyTotals.deposits.total = 
                keyTotals.deposits.components.demandDeposits.total + 
                keyTotals.deposits.components.timeDeposits.total;
        }

        if (keyTotals.advances.total === 0) {
            keyTotals.advances.total = 
                keyTotals.advances.components.overdrafts +
                keyTotals.advances.components.cashCredits +
                keyTotals.advances.components.termLoans +
                keyTotals.advances.components.demandLoans;
        }

        return keyTotals;
    }

    /**
     * Generates HTML table for display
     * @param {Object} parsedData
     * @returns {string}
     */
    generateHTMLTable(parsedData) {
        if (!parsedData.success) {
            return `<div class="error">Failed to parse GLB report</div>`;
        }

        const data = parsedData.data;
        const summary = parsedData.summary;
        const keyTotals = parsedData.keyTotals;

        let html = `
        <div class="glb-report-container">
            <div class="report-header">
                <h3>General Ledger Balance Report</h3>
                <div class="report-info">
                    <p><strong>Date:</strong> ${summary.reportDate}</p>
                    <p><strong>Branch:</strong> ${summary.branchName} (${summary.branchNumber})</p>
                    <p><strong>Currency:</strong> ${summary.currency}</p>
                </div>
            </div>

            <div class="key-totals-section">
                <h4>Key Banking Totals</h4>
                <div class="key-totals-grid">
                    <div class="key-total-card deposits-card">
                        <h5>📊 Total Deposits</h5>
                        <div class="total-amount">₹${this.formatAmount(keyTotals.deposits.total)}</div>
                        <div class="breakdown">
                            <div class="breakdown-item">
                                <span class="breakdown-label">Demand Deposits:</span>
                                <span class="breakdown-value">₹${this.formatAmount(keyTotals.deposits.components.demandDeposits.total)}</span>
                                <div class="sub-breakdown">
                                    <div class="sub-item">
                                        <span>• Current Deposits: ₹${this.formatAmount(keyTotals.deposits.components.demandDeposits.components.currentDeposits)}</span>
                                    </div>
                                    <div class="sub-item">
                                        <span>• Home Savings Safe: ₹${this.formatAmount(keyTotals.deposits.components.demandDeposits.components.homeSavingsSafe)}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="breakdown-item">
                                <span class="breakdown-label">Time Deposits:</span>
                                <span class="breakdown-value">₹${this.formatAmount(keyTotals.deposits.components.timeDeposits.total)}</span>
                                <div class="sub-breakdown">
                                    <div class="sub-item">
                                        <span>• Monthly Interest: ₹${this.formatAmount(keyTotals.deposits.components.timeDeposits.components.monthlyInterestDeposits)}</span>
                                    </div>
                                    <div class="sub-item">
                                        <span>• Quarterly Interest: ₹${this.formatAmount(keyTotals.deposits.components.timeDeposits.components.quarterlyInterestDeposits)}</span>
                                    </div>
                                    <div class="sub-item">
                                        <span>• Money Multiplier: ₹${this.formatAmount(keyTotals.deposits.components.timeDeposits.components.moneyMultiplierDeposits)}</span>
                                    </div>
                                    <div class="sub-item">
                                        <span>• Recurring Deposits: ₹${this.formatAmount(keyTotals.deposits.components.timeDeposits.components.recurringDeposits)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="key-total-card advances-card">
                        <h5>💰 Total Advances</h5>
                        <div class="total-amount">₹${this.formatAmount(keyTotals.advances.total)}</div>
                        <div class="breakdown">
                            <div class="breakdown-item">
                                <span class="breakdown-label">Components:</span>
                                <div class="sub-breakdown">
                                    <div class="sub-item">
                                        <span>• Overdrafts: ₹${this.formatAmount(keyTotals.advances.components.overdrafts)}</span>
                                    </div>
                                    <div class="sub-item">
                                        <span>• Cash Credits: ₹${this.formatAmount(keyTotals.advances.components.cashCredits)}</span>
                                    </div>
                                    <div class="sub-item">
                                        <span>• Term Loans: ₹${this.formatAmount(keyTotals.advances.components.termLoans)}</span>
                                    </div>
                                    <div class="sub-item">
                                        <span>• Demand Loans: ₹${this.formatAmount(keyTotals.advances.components.demandLoans)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="balance-sheet-container">
                <h4>Detailed Balance Sheet</h4>
                <table class="balance-sheet-table">
                    <thead>
                        <tr>
                            <th class="liabilities-header">Liabilities</th>
                            <th class="liabilities-value">Value (₹)</th>
                            <th class="assets-header">Assets</th>
                            <th class="assets-value">Value (₹)</th>
                        </tr>
                    </thead>
                    <tbody>`;

        // Display entries side by side as they appear in the original balance sheet
        const maxRows = Math.max(data.liabilities.length, data.assets.length);
        
        for (let i = 0; i < maxRows; i++) {
            const liability = data.liabilities[i] || { header: '', value: 0, type: '', hasValue: false, isKnownItem: false };
            const asset = data.assets[i] || { header: '', value: 0, type: '', hasValue: false, isKnownItem: false };

            // Determine row styling based on content
            let rowClass = '';
            if (liability.hasValue || asset.hasValue) {
                rowClass = 'has-monetary-value';
            } else if (liability.header || asset.header) {
                rowClass = 'structural-entry';
            }

            // Check if either side is a main section heading (numbered entries)
            const isLiabilityMainHeading = /^\d+[-\s]/.test(liability.header);
            const isAssetMainHeading = /^\d+[-\s]/.test(asset.header);
            
            // Check if either side is a sub-total or total line
            const isLiabilityTotal = /^(TOTAL|SUB TOTAL|GRAND TOTAL)/i.test(liability.header);
            const isAssetTotal = /^(TOTAL|SUB TOTAL|GRAND TOTAL)/i.test(asset.header);
            
            // Check if this is a key total line that should be highlighted
            const isLiabilityKeyTotal = this.isKeyTotalLine(liability.header, 'liability');
            const isAssetKeyTotal = this.isKeyTotalLine(asset.header, 'asset');
            
            // Check if either side is a known important item
            const isLiabilityKnown = liability.isKnownItem;
            const isAssetKnown = asset.isKnownItem;
            
            if (isLiabilityMainHeading || isAssetMainHeading) {
                rowClass += ' main-section-heading';
            } else if (isLiabilityKeyTotal || isAssetKeyTotal) {
                rowClass += ' key-total-line';
            } else if (isLiabilityTotal || isAssetTotal) {
                rowClass += ' total-line';
            } else if (isLiabilityKnown || isAssetKnown) {
                rowClass += ' known-item';
            }

            // Additional classes for styling
            let liabilityClass = `liability-header ${liability.hasValue ? 'has-value' : 'no-value'}`;
            let assetClass = `asset-header ${asset.hasValue ? 'has-value' : 'no-value'}`;
            
            if (isLiabilityMainHeading) liabilityClass += ' main-heading';
            if (isAssetMainHeading) assetClass += ' main-heading';
            if (isLiabilityKeyTotal) liabilityClass += ' key-total-heading';
            if (isAssetKeyTotal) assetClass += ' key-total-heading';
            if (isLiabilityTotal && !isLiabilityKeyTotal) liabilityClass += ' total-heading';
            if (isAssetTotal && !isAssetKeyTotal) assetClass += ' total-heading';
            if (isLiabilityKnown && !isLiabilityMainHeading && !isLiabilityTotal) liabilityClass += ' known-item-header';
            if (isAssetKnown && !isAssetMainHeading && !isAssetTotal) assetClass += ' known-item-header';

            html += `
                <tr class="${rowClass}">
                    <td class="${liabilityClass}">${liability.header}</td>
                    <td class="liability-value ${liability.type.toLowerCase()}">${liability.hasValue ? this.formatAmount(liability.value) : ''}</td>
                    <td class="${assetClass}">${asset.header}</td>
                    <td class="asset-value ${asset.type.toLowerCase()}">${asset.hasValue ? this.formatAmount(asset.value) : ''}</td>
                </tr>`;
        }

        html += `
                    </tbody>
                </table>
            </div>
        </div>

        <style>
        .glb-report-container {
            font-family: Arial, sans-serif;
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .report-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        
        .report-info {
            display: flex;
            justify-content: space-around;
            margin-top: 10px;
        }
        
        .key-totals-section {
            margin-bottom: 30px;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .key-totals-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
        }
        
        .key-total-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .deposits-card {
            border-left: 5px solid #28a745;
        }
        
        .advances-card {
            border-left: 5px solid #007bff;
        }
        
        .key-total-card h5 {
            margin: 0 0 15px 0;
            color: #333;
        }
        
        .total-amount {
            font-size: 24px;
            font-weight: bold;
            color: #2c5282;
            margin-bottom: 15px;
        }
        
        .breakdown-item {
            margin-bottom: 10px;
        }
        
        .breakdown-label {
            font-weight: bold;
            color: #4a5568;
        }
        
        .breakdown-value {
            font-weight: bold;
            color: #2d5016;
            margin-left: 10px;
        }
        
        .sub-breakdown {
            margin-left: 20px;
            margin-top: 5px;
        }
        
        .sub-item {
            font-size: 14px;
            color: #666;
            margin-bottom: 3px;
        }
        
        .balance-sheet-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        .balance-sheet-table th,
        .balance-sheet-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        
        .balance-sheet-table th {
            background-color: #f2f2f2;
            font-weight: bold;
            text-align: center;
        }
        
        .liability-value,
        .asset-value {
            text-align: right;
        }
        
        .main-section-heading {
            background-color: #e8f4f8;
        }
        
        .main-heading {
            font-weight: bold;
            color: #2c5282;
        }
        
        .key-total-line {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
        }
        
        .key-total-heading {
            font-weight: bold;
            color: #856404;
        }
        
        .total-line {
            background-color: #f7fafc;
        }
        
        .total-heading {
            font-weight: bold;
            color: #2d3748;
        }
        
        .known-item {
            background-color: #f0fff4;
        }
        
        .known-item-header {
            color: #2d5016;
        }
        
        .has-value {
            font-weight: 500;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .summary-item {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 5px;
        }
        
        @media (max-width: 768px) {
            .key-totals-grid {
                grid-template-columns: 1fr;
            }
            .report-info {
                flex-direction: column;
                text-align: center;
            }
        }
        </style>`;

        return html;
    }

    /**
     * Check if a line represents a key total that should be highlighted
     * @param {string} header
     * @param {string} side
     * @returns {boolean}
     */
    isKeyTotalLine(header, side) {
        const normalizedHeader = this.normalizeHeader(header);
        
        if (side === 'liability') {
            return normalizedHeader === 'TOTAL DEPOSITS' ||
                   normalizedHeader === 'TOTAL DEMAND DEPOSITS' ||
                   normalizedHeader === 'TOTAL TIME DEPOSITS';
        } else {
            return normalizedHeader === 'TOTAL ADVANCES';
        }
    }

    /**
     * Count known items in an array of entries
     * @param {Array} entries
     * @returns {number}
     */
    countKnownItems(entries) {
        return entries.filter(entry => entry.isKnownItem).length;
    }

    /**
     * Formats amount with proper comma separation
     * @param {number} amount
     * @returns {string}
     */
    formatAmount(amount) {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GLBReportParser;
}

// Make available globally for browser usage
if (typeof window !== 'undefined') {
    window.GLBReportParser = GLBReportParser;
}