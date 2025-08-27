/**
 * New CC/OD Balance Parser
 * Specialized parser for Enhanced CC/OD Balance Files (New_CC_OD_Balance_File-*)
 * 
 * File Format:
 * - Enhanced fixed-width format with comprehensive credit card and overdraft account details
 * - Contains customer information, account limits, balances, interest details
 * - Multiple financial and regulatory fields including IRAC classifications
 * - Significantly detailed format for banking compliance and monitoring
 */

class NewCCODBalanceParser {
    constructor() {
        this.reportInfo = {};
        // Define column headers based on actual data structure
        this.columns = [
            'Customer Number',
            'Account Number',
            'Account Type Description',
            'Customer Name',
            'Interest Rate',
            'Limit',
            'Drawing Power',
            'Outstanding Balance',
            'Uncleared Balance',
            'OCC Balance',
            'Irregularity',
            'IRAC New',
            'IRAC Old',
            'Last Limit Approved Date',
            'UIPY',
            'INCA',
            'Total URI',
            'Increment',
            'Accrual',
            'Adjustment',
            'Account Type Code',
            'Limit Type',
            'Limit Expiry Date',
            'Benchmark Rate',
            'Spread',
            'Rating Premium',
            'Account Level',
            'Next Interest Reset Date',
            'Per Day Interest',
            'Per Day Penal Interest',
            'Interest Accrual',
            'Penal Interest Accrued',
            'Principal Outstanding',
            'Unpaid Interest',
            'Charges',
            'Out of Order Date',
            'Suit Filed',
            'NPA Date',
            'Security Amount',
            'Interest Charged During Month',
            'Interest Charged During Quarter',
            'Credit During Quarter',
            'Interest Charged During Financial Year',
            'Account Red Flag',
            'Red Flag Date',
            'Account Fraud',
            'Account Fraud Date'
        ];
    }

    /**
     * Parse the New CC/OD Balance file content
     */
    parse(content) {
        console.log('Starting New CC/OD Balance Parser...');
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
        
        console.log(`New CC/OD Balance Parser completed. Found ${arrayData.length} records.`);
        
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
            
            // Extract report type
            if (line.includes('CC / OD  BALANCE FILE')) {
                info.reportType = 'CC/OD Balance File';
            }
        }
        
        return info;
    }

    /**
     * Check if a line contains CC/OD account data
     */
    isDataLine(line) {
        if (!line || line.trim().length < 100) return false;
        
        // Skip separator lines
        if (line.includes('----') || line.includes('====')) return false;
        
        // Skip header lines
        if (line.includes('CUSTOMER NO') || line.includes('ACCOUNT NO')) return false;
        
        // Skip empty lines or lines with only spaces
        if (line.trim().length === 0) return false;
        
        // Check for customer number pattern (may have leading spaces)
        const trimmedLine = line.trim();
        
        // Look for customer number pattern at start (10+ digits)
        const customerNumberMatch = trimmedLine.match(/^\d{10,}/);
        if (!customerNumberMatch) {
            console.log('No customer number found in line:', trimmedLine.substring(0, 50));
            return false;
        }
        
        // Split into parts and check structure
        const parts = trimmedLine.split(/\s+/);
        if (parts.length < 5) {
            console.log('Not enough parts in line:', parts.length);
            return false;
        }
        
        // Second part should be account number (numeric)
        if (!/^\d{8,}$/.test(parts[1])) {
            console.log('Invalid account number format:', parts[1]);
            return false;
        }
        
        // Should contain currency amounts and rates
        const currencyMatches = line.match(/\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+\.\d{2}|\d{1,3}(?:,\d{3})+/g);
        if (!currencyMatches || currencyMatches.length < 3) {
            console.log('Not enough currency matches:', currencyMatches?.length || 0);
            return false;
        }
        
        // Should contain date patterns or N/A
        const datePattern = /\d{2}\/\d{2}\/\d{4}|N\/A|EXPIRED/;
        if (!datePattern.test(line)) {
            console.log('No date pattern found in line');
            return false;
        }
        
        console.log('✓ Valid CC/OD data line detected:', trimmedLine.substring(0, 80) + '...');
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
            console.log('Parsing CC/OD line:', workingLine.substring(0, 100) + '...');
            
            // Extract customer number (first field)
            const customerMatch = workingLine.match(/^(\d{10,})/);
            if (customerMatch) {
                rowData['Customer Number'] = customerMatch[1];
                workingLine = workingLine.substring(customerMatch[1].length).trim();
            }
            
            // Extract account number (second field)
            const accountMatch = workingLine.match(/^(\d{8,})/);
            if (accountMatch) {
                rowData['Account Number'] = accountMatch[1];
                workingLine = workingLine.substring(accountMatch[1].length).trim();
            }
            
            // Extract account type and customer name (complex section)
            const nameSection = this.extractAccountTypeAndCustomerName(workingLine);
            if (nameSection) {
                rowData['Account Type Description'] = nameSection.accountType;
                rowData['Customer Name'] = nameSection.customerName;
                workingLine = nameSection.remainingLine;
            }
            
            // Extract currency amounts, rates, and other fields
            const currencyMatches = workingLine.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g);
            const dateMatches = workingLine.match(/(\d{2}\/\d{2}\/\d{4})/g);
            const rateMatches = workingLine.match(/(\d+\.\d{2})/g);
            
            console.log('Found currencies:', currencyMatches?.length || 0);
            console.log('Found dates:', dateMatches?.length || 0);
            console.log('Found rates:', rateMatches?.length || 0);
            
            // Map the extracted values to appropriate fields
            if (rateMatches && rateMatches.length >= 1) {
                rowData['Interest Rate'] = rateMatches[0] + '%';
            }
            
            if (currencyMatches && currencyMatches.length >= 3) {
                rowData['Limit'] = this.formatCurrency(currencyMatches[0]);
                rowData['Drawing Power'] = this.formatCurrency(currencyMatches[1]);
                rowData['Outstanding Balance'] = this.formatCurrency(currencyMatches[2]);
                
                // Additional currency fields if available
                if (currencyMatches.length > 3) {
                    rowData['Uncleared Balance'] = this.formatCurrency(currencyMatches[3]);
                }
                if (currencyMatches.length > 4) {
                    rowData['OCC Balance'] = this.formatCurrency(currencyMatches[4]);
                }
            }
            
            if (dateMatches && dateMatches.length >= 1) {
                rowData['Last Limit Approved Date'] = dateMatches[0];
                if (dateMatches.length > 1) {
                    rowData['Limit Expiry Date'] = dateMatches[1];
                }
                if (dateMatches.length > 2) {
                    rowData['Next Interest Reset Date'] = dateMatches[2];
                }
            }
            
            // Extract IRAC classifications
            const iracMatch = workingLine.match(/(\d{2})\s+(\d{2})/);
            if (iracMatch) {
                rowData['IRAC New'] = iracMatch[1];
                rowData['IRAC Old'] = iracMatch[2];
            }
            
            // Extract status information
            if (workingLine.includes('EXPIRED')) {
                rowData['Limit Type'] = 'EXPIRED';
            } else if (workingLine.includes('REGULAR REVIEW')) {
                rowData['Limit Type'] = 'REGULAR REVIEW';
            } else if (workingLine.includes('N/A')) {
                rowData['Limit Type'] = 'N/A';
            }
            
            return rowData;
            
        } catch (error) {
            console.error('Error parsing CC/OD data line:', error);
            console.error('Problem line:', line.substring(0, 200) + '...');
            return null;
        }
    }
    
    /**
     * Extract account type and customer name from the complex name section
     */
    extractAccountTypeAndCustomerName(line) {
        // Look for patterns like "Account Type   Customer Name"
        const patterns = [
            // Pattern 1: Account type + Title + Name
            /^([A-Z][A-Za-z\s\/-]+?)\s+((?:Mr\.|Mrs\.|Dr\.|Ms\.|Miss\.|Prof\.|Shri\.|Smt\.)\s+.+?)\s+(\d)/,
            // Pattern 2: Account type + Name without clear title
            /^([A-Z][A-Za-z\s\/-]{10,40})\s+([A-Z][A-Z\s\/]+[A-Z])\s+(\d)/,
            // Pattern 3: Fallback - split at reasonable point
            /^([A-Za-z\s\/-]{10,35})\s+(.+?)\s+(\d)/
        ];
        
        for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match) {
                return {
                    accountType: match[1].trim(),
                    customerName: match[2].trim(),
                    remainingLine: line.substring(match[1].length + match[2].length).trim()
                };
            }
        }
        
        // Fallback - assume first 30 chars is account type, next 40 is customer name
        if (line.length > 70) {
            return {
                accountType: line.substring(0, 30).trim(),
                customerName: line.substring(30, 70).trim(),
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
            totalLimit: 0,
            totalOutstandingBalance: 0,
            totalDrawingPower: 0,
            averageInterestRate: 0,
            accountTypes: new Set(),
            limitTypes: new Set()
        };
        
        // Get column indices
        const limitIndex = headers.indexOf('Limit');
        const outstandingBalanceIndex = headers.indexOf('Outstanding Balance');
        const drawingPowerIndex = headers.indexOf('Drawing Power');
        const interestRateIndex = headers.indexOf('Interest Rate');
        const accountTypeIndex = headers.indexOf('Account Type Description');
        const limitTypeIndex = headers.indexOf('Limit Type');
        
        let interestRateSum = 0;
        let interestRateCount = 0;
        
        data.forEach(row => {
            // Sum limits
            if (limitIndex >= 0 && row[limitIndex]) {
                const amount = parseFloat(row[limitIndex].toString().replace(/,/g, ''));
                if (!isNaN(amount)) {
                    stats.totalLimit += amount;
                }
            }
            
            // Sum outstanding balances
            if (outstandingBalanceIndex >= 0 && row[outstandingBalanceIndex]) {
                const amount = parseFloat(row[outstandingBalanceIndex].toString().replace(/,/g, ''));
                if (!isNaN(amount)) {
                    stats.totalOutstandingBalance += amount;
                }
            }
            
            // Sum drawing power
            if (drawingPowerIndex >= 0 && row[drawingPowerIndex]) {
                const amount = parseFloat(row[drawingPowerIndex].toString().replace(/,/g, ''));
                if (!isNaN(amount)) {
                    stats.totalDrawingPower += amount;
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
            
            // Collect unique account types
            if (accountTypeIndex >= 0 && row[accountTypeIndex]) {
                stats.accountTypes.add(row[accountTypeIndex]);
            }
            
            // Collect unique limit types
            if (limitTypeIndex >= 0 && row[limitTypeIndex]) {
                stats.limitTypes.add(row[limitTypeIndex]);
            }
        });
        
        if (interestRateCount > 0) {
            stats.averageInterestRate = (interestRateSum / interestRateCount).toFixed(2) + '%';
        }
        
        // Convert sets to arrays for easier handling
        stats.accountTypes = Array.from(stats.accountTypes);
        stats.limitTypes = Array.from(stats.limitTypes);
        
        return stats;
    }
}

// Auto-register this parser with the main text parser
if (typeof window !== 'undefined' && window.textParser) {
    window.textParser.registerParser('new-cc-od-balance', (content) => {
        const parser = new NewCCODBalanceParser();
        return parser.parse(content);
    });
    console.log('New CC/OD Balance Parser registered successfully');
}
