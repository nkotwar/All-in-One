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

const NEW_CCOD_DEBUG = true;
const newCcodDbg = (...args) => { if (NEW_CCOD_DEBUG) console.debug(...args); };

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
    newCcodDbg('Starting New CC/OD Balance Parser...');
    newCcodDbg(`File content length: ${content.length} characters`);
        
        const lines = content.split('\n');
    newCcodDbg(`Total lines in file: ${lines.length}`);
        
        const data = [];
        let reportInfo = this.extractReportInfo(lines);
        
    newCcodDbg('Extracted report info:', reportInfo);
        
        // Find all data sections (each !E marker starts a new section)
        const dataSections = [];
        let currentSectionStart = -1;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.includes('!E')) {
                // If we were already in a section, close the previous one
                if (currentSectionStart !== -1) {
                    dataSections.push({ start: currentSectionStart, end: i });
                    newCcodDbg(`Data section ends at line ${i} (lines ${currentSectionStart} to ${i - 1})`);
                }
                
                // Start a new section after the !E marker
                // We'll look for the first header row after !E and start from there
                let headerFound = false;
                for (let j = i + 1; j < lines.length && j < i + 10; j++) {
                    const nextLine = lines[j];
                    if (nextLine.includes('CUSTOMER NO') && nextLine.includes('ACCOUNT NO')) {
                        currentSectionStart = j + 1; // Start after the header row
                        headerFound = true;
                        newCcodDbg(`Data section starts at line ${currentSectionStart} after !E marker and header at line ${j}`);
                        break;
                    }
                }
                
                if (!headerFound) {
                    // If no header found, start right after !E marker
                    currentSectionStart = i + 1;
                    newCcodDbg(`Data section starts at line ${currentSectionStart} (no header found after !E marker)`);
                }
            }
        }
        
        // Close the final section at end of file
        if (currentSectionStart !== -1) {
            dataSections.push({ start: currentSectionStart, end: lines.length });
            newCcodDbg(`Final data section: lines ${currentSectionStart} to ${lines.length}`);
        }
        
    newCcodDbg(`Found ${dataSections.length} data sections`);
        
        if (dataSections.length === 0) {
            console.warn('Could not find any data sections with !E markers');
            return { data: [], headers: this.getHeaders(), reportInfo };
        }
        
        // Process all data sections
        const objectData = [];
        dataSections.forEach((section, sectionIndex) => {
            newCcodDbg(`Processing section ${sectionIndex + 1}: lines ${section.start} to ${section.end}`);
            
            for (let i = section.start; i < section.end; i++) {
                const line = lines[i];
                
                if (this.isDataLine(line)) {
                    const rowData = this.parseDataLine(line);
                    if (rowData && Object.keys(rowData).length > 0) {
                        objectData.push(rowData);
                        newCcodDbg(`Parsed data row ${objectData.length} from section ${sectionIndex + 1}:`, rowData);
                    }
                }
            }
        });
        
        // Convert object data to array format for table rendering
        const headers = this.getHeaders();
        const arrayData = objectData.map(rowObj => {
            return headers.map(header => rowObj[header] || '');
        });
        
    newCcodDbg(`New CC/OD Balance Parser completed. Found ${arrayData.length} records.`);
        
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
        
        const trimmedLine = line.trim();
        
        // Skip empty lines or lines with only spaces
        if (trimmedLine.length === 0) return false;
        
        // Skip separator lines with dashes or equal signs
        if (line.includes('----') || line.includes('====')) return false;
        
        // Skip header lines (containing column names)
        if (trimmedLine.includes('CUSTOMER NO') && trimmedLine.includes('ACCOUNT NO')) return false;
        
        // Skip total/summary lines that we don't need
        if (trimmedLine.startsWith('SEGMENT TOTAL') || 
            trimmedLine.startsWith('PRODUCT TOTAL') || 
            trimmedLine.startsWith('FACILITY TOTAL')) return false;
        
        // Data lines start with a 10-digit customer number
        // Look for customer number pattern at start (exactly 10 digits)
        const customerNumberMatch = trimmedLine.match(/^\d{10}/);
        if (!customerNumberMatch) {
            // Only log in debug mode to avoid noise
            newCcodDbg('No customer number found in line:', trimmedLine.substring(0, 50));
            return false;
        }
        
        // Split into parts and check basic structure
        const parts = trimmedLine.split(/\s+/);
        if (parts.length < 5) {
            newCcodDbg('Not enough parts in line:', parts.length);
            return false;
        }
        
        // Second part should be account number (8+ digits)
        if (!/^\d{8,}$/.test(parts[1])) {
            newCcodDbg('Invalid account number format:', parts[1]);
            return false;
        }
        
        newCcodDbg('✓ Valid New CC/OD data line detected:', trimmedLine.substring(0, 80) + '...');
        return true;
    }

    /**
     * Parse a single data line into structured data using fixed-width positions
     */
    parseDataLine(line) {
        const rowData = {};
        
        try {
            // Use fixed-width positions similar to the regular CC/OD parser
            // Based on the header alignment in the New CC/OD Balance file format
            const customerNumber = line.substring(0, 20).trim();
            const accountNumber = line.substring(20, 40).trim();
            const accountType = line.substring(40, 67).trim();
            const customerName = line.substring(67, 95).trim();
            const interestRate = line.substring(95, 108).trim();
            const limit = line.substring(108, 128).trim();
            const drawingPower = line.substring(128, 148).trim();
            const outstandingBalance = line.substring(148, 168).trim();
            const unclearedBalance = line.substring(168, 188).trim();
            const occBalance = line.substring(188, 208).trim();
            const irregularity = line.substring(208, 228).trim();
            const iracNew = line.substring(228, 236).trim();
            const iracOld = line.substring(236, 244).trim();
            const lastLimitApprovedDate = line.substring(244, 264).trim();
            const uipy = line.substring(264, 284).trim();
            const inca = line.substring(284, 304).trim();
            const totalUri = line.substring(304, 324).trim();
            const increment = line.substring(324, 344).trim();
            const accrual = line.substring(344, 364).trim();
            const adjustment = line.substring(364, 384).trim();
            
            // Additional fields specific to New CC/OD format (approximate positions)
            const accountTypeCode = line.substring(384, 400).trim();
            const limitType = line.substring(400, 420).trim();
            const limitExpiryDate = line.substring(420, 440).trim();
            const benchmarkRate = line.substring(440, 455).trim();
            const spread = line.substring(455, 470).trim();
            const ratingPremium = line.substring(470, 485).trim();
            const accountLevel = line.substring(485, 500).trim();
            const nextInterestResetDate = line.substring(500, 525).trim();
            const perDayInterest = line.substring(525, 550).trim();
            const perDayPenalInterest = line.substring(550, 575).trim();
            const interestAccrual = line.substring(575, 600).trim();
            const penalInterestAccrued = line.substring(600, 625).trim();
            const principalOutstanding = line.substring(625, 650).trim();
            const unpaidInterest = line.substring(650, 675).trim();
            const charges = line.substring(675, 700).trim();
            
            // Assign values to row data
            if (customerNumber) rowData['Customer Number'] = customerNumber;
            if (accountNumber) rowData['Account Number'] = accountNumber;
            if (accountType) rowData['Account Type Description'] = accountType;
            if (customerName) rowData['Customer Name'] = customerName;
            if (interestRate && interestRate !== '0.00') {
                if (interestRate === 'TIERE') {
                    rowData['Interest Rate'] = 'TIERED';
                } else {
                    rowData['Interest Rate'] = interestRate;
                }
            }
            if (limit) rowData['Limit'] = this.formatCurrency(limit);
            if (drawingPower) rowData['Drawing Power'] = this.formatCurrency(drawingPower);
            if (outstandingBalance) rowData['Outstanding Balance'] = this.formatCurrency(outstandingBalance);
            if (unclearedBalance) rowData['Uncleared Balance'] = this.formatCurrency(unclearedBalance);
            if (occBalance) rowData['OCC Balance'] = this.formatCurrency(occBalance);
            if (irregularity) rowData['Irregularity'] = this.formatCurrency(irregularity);
            if (iracNew) rowData['IRAC New'] = iracNew;
            if (iracOld) rowData['IRAC Old'] = iracOld;
            if (lastLimitApprovedDate) rowData['Last Limit Approved Date'] = lastLimitApprovedDate;
            if (uipy) rowData['UIPY'] = this.formatCurrency(uipy);
            if (inca) rowData['INCA'] = this.formatCurrency(inca);
            if (totalUri) rowData['Total URI'] = this.formatCurrency(totalUri);
            if (increment) rowData['Increment'] = this.formatCurrency(increment);
            if (accrual) rowData['Accrual'] = this.formatCurrency(accrual);
            if (adjustment) rowData['Adjustment'] = this.formatCurrency(adjustment);
            
            // Additional New CC/OD fields
            if (accountTypeCode) rowData['Account Type Code'] = accountTypeCode;
            if (limitType) rowData['Limit Type'] = limitType;
            if (limitExpiryDate) rowData['Limit Expiry Date'] = limitExpiryDate;
            if (benchmarkRate) rowData['Benchmark Rate'] = benchmarkRate;
            if (spread) rowData['Spread'] = spread;
            if (ratingPremium) rowData['Rating Premium'] = ratingPremium;
            if (accountLevel) rowData['Account Level'] = accountLevel;
            if (nextInterestResetDate) rowData['Next Interest Reset Date'] = nextInterestResetDate;
            if (perDayInterest) rowData['Per Day Interest'] = this.formatCurrency(perDayInterest);
            if (perDayPenalInterest) rowData['Per Day Penal Interest'] = this.formatCurrency(perDayPenalInterest);
            if (interestAccrual) rowData['Interest Accrual'] = this.formatCurrency(interestAccrual);
            if (penalInterestAccrued) rowData['Penal Interest Accrued'] = this.formatCurrency(penalInterestAccrued);
            if (principalOutstanding) rowData['Principal Outstanding'] = this.formatCurrency(principalOutstanding);
            if (unpaidInterest) rowData['Unpaid Interest'] = this.formatCurrency(unpaidInterest);
            if (charges) rowData['Charges'] = this.formatCurrency(charges);
            
            return rowData;
            
        } catch (error) {
            console.error('Error parsing New CC/OD data line:', error);
            console.error('Problem line:', line.substring(0, 200) + '...');
            return null;
        }
    }
    
    /**
     * Format currency values
     */
    formatCurrency(value) {
        if (!value || value.trim() === '' || value.trim() === '0.00') return '';
        
        // Handle negative values with - suffix
        let isNegative = false;
        if (value.endsWith('-')) {
            isNegative = true;
            value = value.substring(0, value.length - 1);
        }
        
        // Handle positive values with + suffix
        if (value.endsWith('+')) {
            value = value.substring(0, value.length - 1);
        }
        
        // Clean the value
        let cleanValue = value.replace(/,/g, '').trim();
        
        // Parse as number
        const numValue = parseFloat(cleanValue);
        if (isNaN(numValue)) return value.trim();
        
        // Apply negative sign if needed
        const finalValue = isNegative ? -numValue : numValue;
        
        return finalValue.toFixed(2);
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
    newCcodDbg('New CC/OD Balance Parser registered successfully');
}
