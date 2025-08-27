/**
 * Loans Balance Parser
 * Specialized parser for Bank Loans Balance Files (LoansBalanceFile-*)
 * 
 * File Format:
 * - Fixed-width format with loan account details
 * - Contains loan accounts, balances, interest rates, payment history
 * - Multiple segments and product totals
 * - Branch and borrower information
 */

class LoansBalanceParser {
    constructor() {
        this.reportInfo = {};
        this.columns = [
            { name: 'Account Number', start: 0, end: 20, type: 'number' },
            { name: 'CIF Number', start: 20, end: 40, type: 'number' },
            { name: 'Product Name', start: 40, end: 65, type: 'text' },
            { name: 'Borrower Name', start: 65, end: 105, type: 'text' },
            { name: 'Sanctioned Amount', start: 105, end: 125, type: 'currency' },
            { name: 'Interest Rate', start: 125, end: 135, type: 'percentage' },
            { name: 'Outstanding Principal', start: 135, end: 155, type: 'currency' },
            { name: 'Outstanding Balance', start: 155, end: 175, type: 'currency' },
            { name: 'Penal Interest', start: 175, end: 190, type: 'currency' },
            { name: 'Total Outstanding', start: 190, end: 210, type: 'currency' },
            { name: 'Disbursement Date', start: 210, end: 220, type: 'date' },
            { name: 'Tenure (Months)', start: 220, end: 225, type: 'number' },
            { name: 'EMI Paid', start: 225, end: 230, type: 'number' },
            { name: 'EMI Pending', start: 230, end: 235, type: 'number' },
            { name: 'Status Code 1', start: 235, end: 240, type: 'number' },
            { name: 'Status Code 2', start: 240, end: 245, type: 'number' },
            { name: 'Unapplied Amount', start: 245, end: 265, type: 'currency' },
            { name: 'Interest Due', start: 265, end: 285, type: 'currency' },
            { name: 'Total Due', start: 285, end: 305, type: 'currency' },
            // Extended fields for new format
            { name: 'GL Code', start: 305, end: 325, type: 'number' },
            { name: 'Days Past Due', start: 325, end: 340, type: 'number' },
            { name: 'EMI Amount', start: 340, end: 360, type: 'currency' },
            { name: 'Classification Code', start: 360, end: 375, type: 'number' },
            { name: 'Current Rate', start: 375, end: 390, type: 'percentage' },
            { name: 'Base Rate', start: 390, end: 405, type: 'percentage' },
            { name: 'Spread Rate', start: 405, end: 420, type: 'percentage' },
            { name: 'Penal Rate', start: 420, end: 435, type: 'percentage' },
            { name: 'Provision Amount', start: 435, end: 455, type: 'currency' },
            { name: 'Next Due Date', start: 455, end: 470, type: 'date' },
            { name: 'Principal Due', start: 470, end: 490, type: 'currency' },
            { name: 'Interest Accrued', start: 490, end: 510, type: 'currency' },
            { name: 'EMI Due', start: 510, end: 530, type: 'currency' },
            { name: 'Charges Due', start: 530, end: 550, type: 'currency' },
            { name: 'Penal Charges', start: 550, end: 570, type: 'currency' },
            { name: 'Total EMI Due', start: 570, end: 590, type: 'currency' },
            { name: 'Advance EMI', start: 590, end: 610, type: 'currency' },
            { name: 'Excess Payment', start: 610, end: 630, type: 'currency' },
            { name: 'Advance Interest', start: 630, end: 650, type: 'currency' },
            { name: 'Current Balance', start: 650, end: 670, type: 'currency' },
            { name: 'Last Payment Date', start: 670, end: 685, type: 'date' },
            { name: 'Payment Status', start: 685, end: 700, type: 'text' },
            { name: 'Account Status', start: 700, end: 720, type: 'text' },
            { name: 'Last Review Date', start: 720, end: 735, type: 'date' },
            { name: 'Original Sanctioned', start: 735, end: 755, type: 'currency' },
            { name: 'Insurance Premium', start: 755, end: 775, type: 'currency' },
            { name: 'Processing Fee', start: 775, end: 795, type: 'currency' },
            { name: 'Legal Fee', start: 795, end: 815, type: 'currency' },
            { name: 'Documentation Fee', start: 815, end: 835, type: 'currency' },
            { name: 'CIBIL Score', start: 835, end: 850, type: 'number' },
            { name: 'Risk Category', start: 850, end: 870, type: 'text' }
        ];
        
        // Regex patterns for different field types
        this.patterns = {
            accountNumber: /^\s*(\d{10,})/,
            cifNumber: /^\s*(\d{10})/,
            datePattern: /(\d{2}-\d{2}-\d{4})/,
            currencyPattern: /([\d,]+\.\d{2})/g,
            productPattern: /((?:PMRY|SGSY|Cent|TL|Micro|Small|TOPUP|FITL|GECL|COVID|SVA|Grih)[\s\w-]*)/,
            // General name pattern - matches any text that looks like a name (letters, spaces, common punctuation)
            namePattern: /([A-Z][A-Za-z\s\.\/',&-]+?)(?=\s{3,}|\s+[\d,]+\.\d{2})/,
            // Specific title pattern for identifying where names start
            titlePattern: /((?:Mr\.|Mrs\.|Miss\.|Ms\.|Dr\.|SHREE|SANWARIA|[A-Z]{2,})\s*)/,
            interestRatePattern: /\s+([\d.]+)\s+(?=[\d,]+\.\d{2})/
        };
        
        this.metadata = {
            reportId: '',
            runDate: '',
            procDate: '',
            branchCode: '',
            branchName: '',
            totalAccounts: 0,
            totalSanctionedAmount: 0,
            totalOutstandingBalance: 0,
            totalInterestDue: 0
        };
    }

    parse(content) {
        console.log('Using Advanced Loans Balance Parser');
        
        try {
            const lines = content.split('\n');
            const result = {
                headers: this.columns.map(col => col.name),
                data: [],
                metadata: this.metadata
            };

            // Extract report metadata
            this.extractMetadata(lines, result);

            // Process data lines
            const dataLines = this.findDataLines(lines);
            
            dataLines.forEach(line => {
                if (this.isDataLine(line)) {
                    const row = this.parseDataLine(line);
                    if (row && this.isValidRow(row)) {
                        result.data.push(row);
                    }
                }
            });

            // Calculate summary metrics
            this.calculateSummaryMetrics(result.data);
            result.summary = this.generateSummary();

            console.log(`Parsed ${result.data.length} loan accounts from file`);
            return {
                success: true,
                data: result.data,
                headers: result.headers,
                metadata: result.metadata,
                summary: result.summary
            };
        } catch (error) {
            console.error('Error parsing loans balance file:', error);
            return {
                success: false,
                error: error.message,
                data: [],
                headers: this.columns.map(col => col.name)
            };
        }
    }

    extractMetadata(lines, result) {
        const metadata = {};
        
        for (const line of lines.slice(0, 15)) {
            // Extract report ID and run date
            if (line.includes('REPORT ID:')) {
                const match = line.match(/REPORT ID:\s*([^\s]+).*RUN DATE:\s*([^\s]+\s+[^\s]+)/);
                if (match) {
                    metadata.reportId = match[1];
                    metadata.runDate = match[2];
                }
            }
            
            // Extract process date
            if (line.includes('PROC DATE:')) {
                const match = line.match(/PROC DATE:\s*([^\s]+)/);
                if (match) {
                    metadata.processDate = match[1];
                }
            }
            
            // Extract branch information
            if (line.includes('BRANCH :')) {
                const match = line.match(/BRANCH\s*:\s*(\d+)\s+BRANCH NAME\s*:\s*(.+)/);
                if (match) {
                    metadata.branchCode = match[1];
                    metadata.branchName = match[2].trim();
                }
            }
        }
        
        result.metadata = metadata;
        this.metadata = { ...this.metadata, ...metadata };
    }

    findDataLines(lines) {
        // Filter out header, separator, and summary lines
        return lines.filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 0 && 
                   !trimmed.includes('---') && 
                   !trimmed.includes('REPORT ID:') &&
                   !trimmed.includes('AREA:') &&
                   !trimmed.includes('BRANCH :') &&
                   !trimmed.includes('LOANS BALANCE FILE') &&
                   !trimmed.includes('!E') &&
                   !trimmed.includes('PAGE NO') &&
                   trimmed.length > 50;
        });
    }

    isDataLine(line) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.length < 200) return false; // Increased minimum length for new format
        
        // Skip total lines and segment summaries
        if (trimmed.includes('SEGMENT TOTAL') || 
            trimmed.includes('PRODUCT TOTAL') ||
            trimmed.includes('GRAND TOTAL')) {
            return false;
        }
        
        // Look for account number pattern at the start (10+ digits)
        const accountNumberMatch = trimmed.match(/^\s*(\d{10,})/);
        if (!accountNumberMatch) return false;
        
        // Should contain CIF number (another 10-digit number)
        const hasCifNumber = /\d{10}/.test(trimmed.substring(20, 50));
        
        // Should contain product name patterns (be more lenient)
        const hasProductName = /(PMRY|SGSY|Cent|TL|Micro|Small|TOPUP|FITL|GECL|COVID|SVA|Grih)/.test(trimmed);
        
        // Should contain borrower name or company name (any capitalized text pattern)
        const hasBorrowerName = /[A-Z][A-Za-z\s\.\/',&-]{3,}/.test(trimmed);
        
        // Should contain multiple currency amounts (new format has many more)
        const currencyCount = (trimmed.match(/[\d,]+\.\d{2}/g) || []).length;
        const hasManyCurrencies = currencyCount >= 5; // New format has many currency fields
        
        // Should contain date pattern
        const hasDate = /\d{2}-\d{2}-\d{4}/.test(trimmed);
        
        // A valid data line should have most of these elements (reduce threshold)
        const validElementCount = [hasCifNumber, hasProductName, hasBorrowerName, hasManyCurrencies, hasDate].filter(Boolean).length;
        
        console.log('Line validation for:', trimmed.substring(0, 50) + '...');
        console.log('Has CIF:', hasCifNumber, 'Has Product:', hasProductName, 'Has Borrower:', hasBorrowerName, 'Has Many Currencies:', hasManyCurrencies, 'Has Date:', hasDate);
        console.log('Valid elements:', validElementCount, 'Currency count:', currencyCount);
        
        return validElementCount >= 3; // Keep threshold at 3 for the enhanced format
    }

    parseDataLine(line) {
        // Use intelligent parsing that combines patterns with positional data
        const row = new Array(this.columns.length).fill('');
        
        try {
            console.log('Parsing line:', line);
            
            // Step 1: Extract account number (first 10+ digits at the beginning)
            const accountMatch = line.match(/^\s*(\d{10,})/);
            if (!accountMatch) return null;
            row[0] = accountMatch[1];
            
            // Step 2: Extract CIF number (second 10-digit number, typically around position 20)
            // Look for the next 10-digit number after some spaces
            const afterAccount = line.substring(accountMatch[0].length);
            const cifMatch = afterAccount.match(/\s+(\d{10})/);
            if (cifMatch) {
                row[1] = cifMatch[1];
            }
            
            // Step 3: Find the position where CIF ends to locate product name
            let searchStart = 0;
            if (row[1]) {
                searchStart = line.indexOf(row[1]) + row[1].length;
            }
            
            console.log('Search start position:', searchStart);
            console.log('Remaining text after CIF:', line.substring(searchStart));
            
            // Step 4: Extract product name and borrower name using a more general approach
            const remainingText = line.substring(searchStart).trim();
            console.log('Text after CIF:', remainingText);
            
            // Strategy: Find where the borrower name starts by looking for clear name indicators
            // The key insight: borrower names usually start with titles or all-caps company names
            // and are followed by significant whitespace before amounts
            
            let productName = '';
            let borrowerName = '';
            
            // Method 1: Look for traditional titles (most reliable)
            const titleMatch = remainingText.match(/^(.+?)\s+((?:Mr\.|Mrs\.|Miss\.|Ms\.|Dr\.)\s+[A-Za-z\s\.\/',&-]+?)(?=\s{3,}|\s+[\d,]+\.\d{2})/);
            if (titleMatch) {
                productName = titleMatch[1].trim();
                borrowerName = titleMatch[2].trim();
                console.log('Method 1 (Title) - Product:', productName, 'Borrower:', borrowerName);
            }
            
            // Method 2: Look for all-caps company/organization names
            if (!productName) {
                // Look for standalone all-caps words that are clearly company names
                // The pattern should match company names that are separated by multiple spaces from product name
                const companyMatch = remainingText.match(/^(.+?)\s{2,}([A-Z]{3,}(?:\s+[A-Z]+)*(?:\s+[A-Z]+)*[A-Za-z\s\.\/',&-]*?)(?=\s{3,}|\s+[\d,]+\.\d{2})/);
                if (companyMatch && companyMatch[2].length > 5) { // Ensure it's a substantial company name
                    productName = companyMatch[1].trim();
                    borrowerName = companyMatch[2].trim();
                    console.log('Method 2 (Company) - Product:', productName, 'Borrower:', borrowerName);
                } else {
                    // Try alternate pattern - look for company names that start with common business words
                    const businessMatch = remainingText.match(/^(.+?)\s+([A-Z]{2,}(?:\s+[A-Z]+)*(?:\s+(?:KIRANA|ENTERPRISES|COMPANY|CORP|LIMITED|LTD|AND|GENERAL|GENER))*[A-Za-z\s\.\/',&-]*?)(?=\s{3,}|\s+[\d,]+\.\d{2})/);
                    if (businessMatch && businessMatch[2].length > 5) {
                        productName = businessMatch[1].trim();
                        borrowerName = businessMatch[2].trim();
                        console.log('Method 2b (Business) - Product:', productName, 'Borrower:', borrowerName);
                    }
                }
            }
            
            // Method 2.5: Look specifically for business/company keywords in names
            if (!productName) {
                const businessKeywordMatch = remainingText.match(/^(.+?)\s+([A-Z][A-Z\s]*(?:KIRANA|ENTERPRISES|COMPANY|CORP|LIMITED|LTD|GENERAL|GENER|AND)[A-Z\s]*[A-Za-z\s\.\/',&-]*?)(?=\s{3,}|\s+[\d,]+\.\d{2})/);
                if (businessKeywordMatch) {
                    productName = businessKeywordMatch[1].trim();
                    borrowerName = businessKeywordMatch[2].trim();
                    console.log('Method 2.5 (Business Keywords) - Product:', productName, 'Borrower:', borrowerName);
                }
            }
            
            // Method 3: Look for SHREE/SRI prefixes
            if (!productName) {
                const shreeMatch = remainingText.match(/^(.+?)\s+((?:SHREE|SRI|SREE)\s+[A-Za-z\s\.\/',&-]+?)(?=\s{3,}|\s+[\d,]+\.\d{2})/);
                if (shreeMatch) {
                    productName = shreeMatch[1].trim();
                    borrowerName = shreeMatch[2].trim();
                    console.log('Method 3 (Shree) - Product:', productName, 'Borrower:', borrowerName);
                }
            }
            
            // Method 4: Positional fallback - assume name is the last significant text before amounts
            if (!productName) {
                console.log('Using positional fallback method...');
                
                // Find the position of the first currency amount
                const currencyMatch = remainingText.match(/[\d,]+\.\d{2}/);
                if (currencyMatch) {
                    const currencyPos = remainingText.indexOf(currencyMatch[0]);
                    const beforeCurrency = remainingText.substring(0, currencyPos).trim();
                    
                    // Look for the last stretch of capitalized text that could be a name
                    // Split by multiple spaces (typically 2+ spaces separate product from name)
                    const parts = beforeCurrency.split(/\s{2,}/);
                    
                    if (parts.length >= 2) {
                        productName = parts.slice(0, -1).join(' ').trim();
                        borrowerName = parts[parts.length - 1].trim();
                    } else {
                        // If no clear separation, try to split intelligently
                        const words = beforeCurrency.split(/\s+/);
                        if (words.length >= 4) {
                            // Take last 2-3 words as name, rest as product
                            const nameWordCount = Math.min(3, Math.ceil(words.length / 3));
                            productName = words.slice(0, -nameWordCount).join(' ');
                            borrowerName = words.slice(-nameWordCount).join(' ');
                        } else {
                            // Very short text - might be product only or name only
                            if (/(?:Loan|Ln|Dep|Account|TL|DL)/.test(beforeCurrency)) {
                                productName = beforeCurrency;
                                borrowerName = '';
                            } else {
                                productName = '';
                                borrowerName = beforeCurrency;
                            }
                        }
                    }
                    
                    console.log('Method 4 (Positional) - Product:', productName, 'Borrower:', borrowerName);
                }
            }
            
            // Final validation and assignment
            if (productName || borrowerName) {
                row[2] = productName;
                row[3] = borrowerName;
                
                console.log('Final - Product name:', row[2]);
                console.log('Final - Borrower name:', row[3]);
            } else {
                console.log('No valid name/product split found');
            }
            
            // Step 5: Extract all currency amounts in sequence
            const currencyMatches = [...line.matchAll(/([\d,]+\.\d{2})/g)];
            console.log('Currency matches found:', currencyMatches.map(m => m[1]));
            
            if (currencyMatches.length >= 1) {
                row[4] = currencyMatches[0][1]; // Sanctioned Amount
                
                // Step 6: Extract interest rate (look for decimal after sanctioned amount)
                const sanctionedPos = line.indexOf(currencyMatches[0][1]) + currencyMatches[0][1].length;
                const afterSanctioned = line.substring(sanctionedPos);
                const rateMatch = afterSanctioned.match(/\s+([\d.]+)\s/);
                if (rateMatch) {
                    row[5] = rateMatch[1]; // Interest Rate
                }
                
                // Map remaining currency amounts based on expected sequence
                if (currencyMatches.length >= 2) row[6] = currencyMatches[1][1]; // Outstanding Principal  
                if (currencyMatches.length >= 3) row[7] = currencyMatches[2][1]; // Outstanding Balance
                if (currencyMatches.length >= 4) row[8] = currencyMatches[3][1]; // Penal Interest
                if (currencyMatches.length >= 5) row[9] = currencyMatches[4][1]; // Total Outstanding
                
                // Last few amounts are typically at the end
                if (currencyMatches.length >= 6) row[16] = currencyMatches[currencyMatches.length - 3][1]; // Unapplied Amount
                if (currencyMatches.length >= 7) row[17] = currencyMatches[currencyMatches.length - 2][1]; // Interest Due  
                if (currencyMatches.length >= 8) row[18] = currencyMatches[currencyMatches.length - 1][1]; // Total Due
            }
            
            // Step 7: Extract disbursement date (DD-MM-YYYY format)
            const dateMatch = line.match(/(\d{2}-\d{2}-\d{4})/);
            if (dateMatch) {
                row[10] = dateMatch[1];
                
                // Step 8: Extract numeric fields after the date
                const afterDate = line.substring(line.indexOf(dateMatch[1]) + dateMatch[1].length);
                const numberMatches = [...afterDate.matchAll(/\s+(\d{1,3})(?=\s|$)/g)];
                console.log('Number matches after date:', numberMatches.map(m => m[1]));
                
                if (numberMatches.length >= 5) {
                    row[11] = numberMatches[0][1]; // Tenure
                    row[12] = numberMatches[1][1]; // EMI Paid
                    row[13] = numberMatches[2][1]; // EMI Pending
                    row[14] = numberMatches[3][1]; // Status Code 1
                    row[15] = numberMatches[4][1]; // Status Code 2
                }
            }
            
            console.log('Parsed row:', row);
            
        } catch (error) {
            console.warn('Error parsing line, falling back to positional parsing:', error);
            return this.parseDataLinePositional(line);
        }
        
        return row;
    }
    
    fillMissingFieldsPositionally(line, row) {
        // Fill any missing fields using positional parsing as fallback
        this.columns.forEach((column, index) => {
            if (!row[index] && line.length >= column.end) {
                const value = line.substring(column.start, column.end).trim();
                if (value && this.isValidFieldValue(value, column.type)) {
                    row[index] = this.formatValue(value, column.type);
                }
            }
        });
    }
    
    parseDataLinePositional(line) {
        // Original positional parsing as complete fallback
        const row = [];
        
        this.columns.forEach(column => {
            let value = '';
            
            if (line.length >= column.end) {
                value = line.substring(column.start, column.end).trim();
            } else if (line.length > column.start) {
                value = line.substring(column.start).trim();
            }
            
            // Clean and format the value based on type
            value = this.formatValue(value, column.type);
            row.push(value);
        });
        
        return row;
    }
    
    isValidFieldValue(value, type) {
        if (!value) return false;
        
        switch (type) {
            case 'number':
                return /^\d+$/.test(value);
            case 'date':
                return /\d{2}-\d{2}-\d{4}/.test(value) || value.includes('N.A');
            case 'currency':
                return /[\d,]+\.\d{2}/.test(value) || value === '0.00';
            case 'percentage':
                return /^\d+(\.\d+)?$/.test(value);
            default:
                return true;
        }
    }

    formatValue(value, type) {
        if (!value) return '';
        
        switch (type) {
            case 'currency':
                return value.replace(/,/g, '');
            case 'percentage':
                return value;
            case 'number':
                return value;
            case 'date':
                return value;
            default:
                return value.trim();
        }
    }
    
    isValidRow(row) {
        // A valid row should have account number, CIF number, and at least one amount
        return row[0] && row[1] && (row[4] || row[7] || row[9]);
    }

    calculateSummaryMetrics(data) {
        this.metadata.totalAccounts = data.length;
        
        this.metadata.totalSanctionedAmount = data.reduce((sum, row) => 
            sum + (parseFloat(row[4]?.replace(/,/g, '')) || 0), 0);
        
        this.metadata.totalOutstandingBalance = data.reduce((sum, row) => 
            sum + (parseFloat(row[7]?.replace(/,/g, '')) || 0), 0);
        
        this.metadata.totalInterestDue = data.reduce((sum, row) => 
            sum + (parseFloat(row[17]?.replace(/,/g, '')) || 0), 0);
    }

    generateSummary() {
        return {
            totalAccounts: this.metadata.totalAccounts,
            totalSanctionedAmount: this.metadata.totalSanctionedAmount,
            totalOutstandingBalance: this.metadata.totalOutstandingBalance,
            totalInterestDue: this.metadata.totalInterestDue,
            reportInfo: {
                reportId: this.metadata.reportId,
                runDate: this.metadata.runDate,
                procDate: this.metadata.processDate,
                branch: `${this.metadata.branchCode} - ${this.metadata.branchName}`
            }
        };
    }
}

// Auto-register the parser
if (typeof textParser !== 'undefined') {
    textParser.registerParser('loans-balance', (content) => {
        const parser = new LoansBalanceParser();
        return parser.parse(content);
    });
    console.log('Loans Balance Parser registered successfully');
}
