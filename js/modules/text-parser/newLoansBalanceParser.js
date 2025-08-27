/**
 * New Loans Balance Parser
 * Specialized parser for Enhanced Bank Loans Balance Files (New_LoansBalanceFile-*)
 * 
 * File Format:
 * - Enhanced fixed-width format with extensive loan account details
 * - Contains comprehensive loan information including GL codes, EMI details, provision amounts
 * - Multiple currency fields, dates, classification codes, and regulatory information
 * - Significantly more detailed than standard LoansBalanceFile format
 */

class NewLoansBalanceParser {
    constructor() {
        this.reportInfo = {};
        // Define column headers based on actual data structure
        this.columns = [
            'Account Number',
            'CIF Number', 
            'Product Name',
            'Borrower Name',
            'Sanctioned Amount',
            'Interest Rate',
            'Outstanding Principal',
            'Outstanding Balance',
            'Penal Interest',
            'Total Outstanding',
            'Disbursement Date',
            'Tenure Months',
            'EMI Paid',
            'EMI Pending',
            'Status Code 1',
            'Status Code 2',
            'Unapplied Amount',
            'Interest Due',
            'Total Due',
            'GL Code',
            'Days Past Due',
            'EMI Amount',
            'Classification Code',
            'Current Rate',
            'Base Rate',
            'Spread Rate',
            'Penal Rate',
            'Provision Amount',
            'Next Due Date',
            'Principal Due',
            'Interest Accrued',
            'EMI Due',
            'Charges Due',
            'Penal Charges',
            'Total EMI Due',
            'Processing Fees',
            'Other Charges',
            'Total Amount Due',
            'Last Payment Date',
            'Asset Classification',
            'Account Status',
            'Last Review Date',
            'Limit Amount',
            'Available Limit',
            'Security Value',
            'Insurance Premium',
            'Risk Category',
            'Restructured Flag'
        ];
    }

    /**
     * Parse the New Loans Balance file content
     */
    parse(content) {
        console.log('Starting New Loans Balance Parser...');
        console.log(`File content length: ${content.length} characters`);
        
        const lines = content.split('\n');
        console.log(`Total lines in file: ${lines.length}`);
        
        const data = [];
        let reportInfo = this.extractReportInfo(lines);
        
        console.log('Extracted report info:', reportInfo);
        
        // Find all data sections (there can be multiple sections separated by !E markers)
        const dataSections = [];
        let currentSectionStart = -1;
        let insideDataSection = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.includes('!E')) {
                if (!insideDataSection) {
                    // Start of a data section
                    currentSectionStart = i + 1;
                    insideDataSection = true;
                    console.log(`Data section starts at line ${currentSectionStart}`);
                } else {
                    // End of current data section
                    dataSections.push({ start: currentSectionStart, end: i });
                    console.log(`Data section ends at line ${i} (lines ${currentSectionStart} to ${i})`);
                    insideDataSection = false;
                }
            }
        }
        
        // If still inside a section at end of file, close it
        if (insideDataSection && currentSectionStart !== -1) {
            dataSections.push({ start: currentSectionStart, end: lines.length });
            console.log(`Final data section: lines ${currentSectionStart} to ${lines.length}`);
        }
        
        console.log(`Found ${dataSections.length} data sections`);
        
        if (dataSections.length === 0) {
            console.warn('Could not find any data sections with !E markers');
            return { data: [], headers: this.getHeaders(), reportInfo };
        }
        
        // Process all data sections
        const objectData = [];
        dataSections.forEach((section, sectionIndex) => {
            console.log(`Processing section ${sectionIndex + 1}: lines ${section.start} to ${section.end}`);
            
            for (let i = section.start; i < section.end; i++) {
                const line = lines[i];
                
                if (this.isDataLine(line)) {
                    const rowData = this.parseDataLine(line);
                    if (rowData && Object.keys(rowData).length > 0) {
                        objectData.push(rowData);
                        console.log(`Parsed data row ${objectData.length} from section ${sectionIndex + 1}:`, rowData);
                    }
                }
            }
        });
        
        // Convert object data to array format for table rendering
        const headers = this.getHeaders();
        const arrayData = objectData.map(rowObj => {
            return headers.map(header => rowObj[header] || '');
        });
        
        console.log(`New Loans Balance Parser completed. Found ${arrayData.length} records.`);
        
        return {
            data: arrayData,
            headers: headers,
            reportInfo: reportInfo
        };
    }

    /**
     * Extract report header information
     */
    extractReportInfo(lines) {
        const info = {};
        
        for (let i = 0; i < Math.min(10, lines.length); i++) {
            const line = lines[i].trim();
            
            // Extract report ID and run date from header
            if (line.includes('REPORT ID:') && line.includes('RUN DATE:')) {
                const reportIdMatch = line.match(/REPORT ID:\s*([^\s]+)/);
                const runDateMatch = line.match(/RUN DATE:\s*([^\s]+)/);
                if (reportIdMatch) info.reportId = reportIdMatch[1];
                if (runDateMatch) info.runDate = runDateMatch[1];
            }
            
            // Extract bank name
            if (line.includes('CENTRAL BANK OF INDIA')) {
                info.bankName = 'CENTRAL BANK OF INDIA';
            }
            
            // Extract branch information
            if (line.includes('BRANCH :') && line.includes('BRANCH NAME :')) {
                const branchCodeMatch = line.match(/BRANCH\s*:\s*(\d+)/);
                const branchNameMatch = line.match(/BRANCH NAME\s*:\s*([^\s]+)/);
                if (branchCodeMatch) info.branchCode = branchCodeMatch[1];
                if (branchNameMatch) info.branchName = branchNameMatch[1];
            }
            
            // Extract process date
            if (line.includes('PROC DATE:')) {
                const procDateMatch = line.match(/PROC DATE:\s*([^\s]+)/);
                if (procDateMatch) info.processDate = procDateMatch[1];
            }
        }
        
        return info;
    }

    /**
     * Check if a line contains loan data (enhanced validation for new format)
     */
    isDataLine(line) {
        if (!line || line.trim().length < 100) return false;
        
        // Skip separator lines
        if (line.includes('----') || line.includes('====')) return false;
        
        // Skip total lines
        if (line.includes('TOTAL') || line.includes('SEGMENT') || line.includes('PRODUCT')) return false;
        
        // Skip empty lines or lines with only spaces
        if (line.trim().length === 0) return false;
        
        // Check for account number pattern (may have leading spaces)
        const trimmedLine = line.trim();
        
        // More flexible account number check - look for 10+ digits at start
        const accountNumberMatch = trimmedLine.match(/^\d{10,}/);
        if (!accountNumberMatch) {
            console.log('No account number found in line:', trimmedLine.substring(0, 50));
            return false;
        }
        
        // Check for CIF number after account number - be more flexible
        const parts = trimmedLine.split(/\s+/);
        if (parts.length < 3) {
            console.log('Not enough parts in line:', parts.length);
            return false;
        }
        
        // Second part should be CIF (numeric) - relax the length requirement
        if (!/^\d{8,}$/.test(parts[1])) {
            console.log('Invalid CIF format:', parts[1]);
            return false;
        }
        
        // Should contain at least some currency amounts - be more flexible
        const currencyMatches = line.match(/\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+\.\d{2}|\d{1,3}(?:,\d{3})+/g);
        if (!currencyMatches || currencyMatches.length < 3) {
            console.log('Not enough currency matches:', currencyMatches?.length || 0);
            return false;
        }
        
        // Should contain at least one date pattern - be more flexible
        const datePattern = /\d{2}[-\/]\d{2}[-\/]\d{4}/;
        if (!datePattern.test(line)) {
            console.log('No date pattern found in line');
            return false;
        }
        
        console.log('✓ Valid data line detected:', trimmedLine.substring(0, 80) + '...');
        return true;
    }

    /**
     * Parse a single data line into structured data
     */
    parseDataLine(line) {
        const rowData = {};
        
        try {
            // Trim the line and handle the complex structure
            let workingLine = line.trim();
            console.log('Parsing line:', workingLine.substring(0, 150) + '...');
            
            // Extract account number (first field)
            const accountMatch = workingLine.match(/^(\d{10,})/);
            if (accountMatch) {
                rowData['Account Number'] = accountMatch[1];
                workingLine = workingLine.substring(accountMatch[1].length).trim();
            }
            
            // Extract CIF number (second field)
            const cifMatch = workingLine.match(/^(\d{10,})/);
            if (cifMatch) {
                rowData['CIF Number'] = cifMatch[1];
                workingLine = workingLine.substring(cifMatch[1].length).trim();
            }
            
            // Extract product name and borrower name (complex section)
            // Find pattern: Product Name + Title + Borrower Name
            const nameSection = this.extractProductAndBorrowerNames(workingLine);
            if (nameSection) {
                rowData['Product Name'] = nameSection.productName;
                rowData['Borrower Name'] = nameSection.borrowerName;
                workingLine = nameSection.remainingLine;
            }
            
            // Extract currency amounts and other fields using regex patterns
            const currencyMatches = workingLine.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g);
            const dateMatches = workingLine.match(/(\d{2}[-\/]\d{2}[-\/]\d{4})/g);
            const numberMatches = workingLine.match(/(\d+(?:\.\d+)?)/g);
            
            console.log('Found currencies:', currencyMatches?.length || 0);
            console.log('Found dates:', dateMatches?.length || 0);
            
            // Map the extracted values to appropriate fields
            if (currencyMatches && currencyMatches.length >= 5) {
                rowData['Sanctioned Amount'] = this.formatCurrency(currencyMatches[0]);
                rowData['Outstanding Principal'] = this.formatCurrency(currencyMatches[1]);
                rowData['Outstanding Balance'] = this.formatCurrency(currencyMatches[2]);
                rowData['Penal Interest'] = this.formatCurrency(currencyMatches[3]);
                rowData['Total Outstanding'] = this.formatCurrency(currencyMatches[4]);
                
                // Additional currency fields if available
                if (currencyMatches.length > 5) {
                    rowData['Interest Due'] = this.formatCurrency(currencyMatches[5]);
                }
                if (currencyMatches.length > 6) {
                    rowData['Total Due'] = this.formatCurrency(currencyMatches[6]);
                }
            }
            
            if (dateMatches && dateMatches.length >= 1) {
                rowData['Disbursement Date'] = dateMatches[0];
                if (dateMatches.length > 1) {
                    rowData['Last Payment Date'] = dateMatches[1];
                }
                if (dateMatches.length > 2) {
                    rowData['Next Due Date'] = dateMatches[2];
                }
            }
            
            // Extract interest rate (should be a decimal number early in the line)
            const rateMatch = workingLine.match(/(\d{1,2}\.\d{2})\s/);
            if (rateMatch) {
                rowData['Interest Rate'] = rateMatch[1] + '%';
            }
            
            // Extract status information
            if (workingLine.includes('RECALLED')) {
                rowData['Account Status'] = 'RECALLED';
            } else if (workingLine.includes('N/A')) {
                rowData['Account Status'] = 'N/A';
            }
            
            return rowData;
            
        } catch (error) {
            console.error('Error parsing data line:', error);
            console.error('Problem line:', line.substring(0, 200) + '...');
            return null;
        }
    }
    
    /**
     * Extract product name and borrower name from the complex name section
     */
    extractProductAndBorrowerNames(line) {
        // Look for patterns like "Product Name  Title. NAME"
        const patterns = [
            // Pattern 1: Product + Title (Mr./Mrs./Dr./Ms.)
            /^(.+?)\s+((?:Mr\.|Mrs\.|Dr\.|Ms\.|Miss\.|Prof\.|Shri\.|Smt\.)\s+.+?)\s+(\d)/,
            // Pattern 2: Product + Name without clear title
            /^(.{20,40})\s+([A-Z][A-Z\s]+[A-Z])\s+(\d)/,
            // Pattern 3: Fallback - split at reasonable point
            /^(.{15,35})\s+(.+?)\s+(\d)/
        ];
        
        for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match) {
                return {
                    productName: match[1].trim(),
                    borrowerName: match[2].trim(),
                    remainingLine: line.substring(match[1].length + match[2].length).trim()
                };
            }
        }
        
        // Fallback - assume first 30 chars is product, next 40 is borrower
        if (line.length > 70) {
            return {
                productName: line.substring(0, 30).trim(),
                borrowerName: line.substring(30, 70).trim(),
                remainingLine: line.substring(70).trim()
            };
        }
        
        return null;
    }
    
    /**
     * Format currency values
     */
    formatCurrency(value) {
        if (!value) return '';
        // Remove commas and ensure proper decimal format
        const numValue = parseFloat(value.replace(/,/g, ''));
        return isNaN(numValue) ? value : numValue.toFixed(2);
    }

    /**
     * Get column headers for the table
     */
    getHeaders() {
        return this.columns;
    }

    /**
     * Get summary statistics for the parsed data
     */
    getSummaryStats(data) {
        if (!data || data.length === 0) return {};
        
        const headers = this.getHeaders();
        const stats = {
            totalRecords: data.length,
            totalSanctionedAmount: 0,
            totalOutstandingBalance: 0,
            totalEMIDue: 0,
            averageInterestRate: 0,
            productTypes: new Set(),
            accountStatuses: new Set()
        };
        
        // Get column indices
        const sanctionedAmountIndex = headers.indexOf('Sanctioned Amount');
        const outstandingBalanceIndex = headers.indexOf('Outstanding Balance');
        const emiDueIndex = headers.indexOf('EMI Due');
        const interestRateIndex = headers.indexOf('Interest Rate');
        const productNameIndex = headers.indexOf('Product Name');
        const accountStatusIndex = headers.indexOf('Account Status');
        
        let interestRateSum = 0;
        let interestRateCount = 0;
        
        data.forEach(row => {
            // Sum sanctioned amounts
            if (sanctionedAmountIndex >= 0 && row[sanctionedAmountIndex]) {
                const amount = parseFloat(row[sanctionedAmountIndex].toString().replace(/,/g, ''));
                if (!isNaN(amount)) {
                    stats.totalSanctionedAmount += amount;
                }
            }
            
            // Sum outstanding balances
            if (outstandingBalanceIndex >= 0 && row[outstandingBalanceIndex]) {
                const amount = parseFloat(row[outstandingBalanceIndex].toString().replace(/,/g, ''));
                if (!isNaN(amount)) {
                    stats.totalOutstandingBalance += amount;
                }
            }
            
            // Sum EMI due amounts
            if (emiDueIndex >= 0 && row[emiDueIndex]) {
                const amount = parseFloat(row[emiDueIndex].toString().replace(/,/g, ''));
                if (!isNaN(amount)) {
                    stats.totalEMIDue += amount;
                }
            }
            
            // Calculate average interest rate
            if (interestRateIndex >= 0 && row[interestRateIndex]) {
                const rate = parseFloat(row[interestRateIndex].toString().replace('%', ''));
                if (!isNaN(rate)) {
                    interestRateSum += rate;
                    interestRateCount++;
                }
            }
            
            // Collect unique product types
            if (productNameIndex >= 0 && row[productNameIndex]) {
                stats.productTypes.add(row[productNameIndex]);
            }
            
            // Collect unique account statuses
            if (accountStatusIndex >= 0 && row[accountStatusIndex]) {
                stats.accountStatuses.add(row[accountStatusIndex]);
            }
        });
        
        if (interestRateCount > 0) {
            stats.averageInterestRate = (interestRateSum / interestRateCount).toFixed(2) + '%';
        }
        
        // Convert sets to arrays for easier handling
        stats.productTypes = Array.from(stats.productTypes);
        stats.accountStatuses = Array.from(stats.accountStatuses);
        
        return stats;
    }
}

// Auto-register this parser with the main text parser
if (typeof window !== 'undefined' && window.textParser) {
    window.textParser.registerParser('new-loans-balance', (content) => {
        const parser = new NewLoansBalanceParser();
        return parser.parse(content);
    });
    console.log('New Loans Balance Parser registered successfully');
}
