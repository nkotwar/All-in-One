/**
 * CC/OD Balance Parser
 * Specialized parser for CC/OD Balance Files (CC_OD_Balance_File_*)
 * 
 * File Format:
 * - Fixed-width format with credit card and overdraft account details
 * - Contains customer information, account limits, balances, interest details
 * - Different from New_CC_OD_Balance_File format - this is the standard/legacy format
 * - Multiple sections separated by !E markers
 */

const CCOD_DEBUG = false;
const ccodDbg = (...args) => { if (CCOD_DEBUG) console.debug(...args); };

class CCODBalanceParser {
    constructor() {
        this.reportInfo = {};
        // Define column headers based on the standard CC/OD balance file structure
        this.columns = [
            'Customer Number',
            'Account Number',
            'ACCOUNT TYPE(DESCRIPTION)',
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
            'Adjustment'
        ];
    }

    /**
     * Parse the CC/OD Balance file content
     */
    parse(content) {
        ccodDbg('Starting CC/OD Balance Parser...');
        ccodDbg(`File content length: ${content.length} characters`);
        
        const lines = content.split('\n');
        ccodDbg(`Total lines in file: ${lines.length}`);
        
        const data = [];
        let reportInfo = this.extractReportInfo(lines);
        
        ccodDbg('Extracted report info:', reportInfo);
        
        // Find all data sections (each !E marker starts a new section)
        const dataSections = [];
        let currentSectionStart = -1;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.includes('!E')) {
                // If we were already in a section, close the previous one
                if (currentSectionStart !== -1) {
                    dataSections.push({ start: currentSectionStart, end: i });
                    ccodDbg(`Data section ends at line ${i} (lines ${currentSectionStart} to ${i - 1})`);
                }
                
                // Start a new section after the !E marker
                // We'll look for the first header row after !E and start from there
                let headerFound = false;
                for (let j = i + 1; j < lines.length && j < i + 10; j++) {
                    const nextLine = lines[j];
                    if (nextLine.includes('CUSTOMER NO') && nextLine.includes('ACCOUNT NO')) {
                        currentSectionStart = j + 1; // Start after the header row
                        headerFound = true;
                        ccodDbg(`Data section starts at line ${currentSectionStart} after !E marker and header at line ${j}`);
                        break;
                    }
                }
                
                if (!headerFound) {
                    // If no header found, start right after !E marker
                    currentSectionStart = i + 1;
                    ccodDbg(`Data section starts at line ${currentSectionStart} (no header found after !E marker)`);
                }
            }
        }
        
        // Close the final section at end of file
        if (currentSectionStart !== -1) {
            dataSections.push({ start: currentSectionStart, end: lines.length });
            ccodDbg(`Final data section: lines ${currentSectionStart} to ${lines.length}`);
        }
        
        ccodDbg(`Found ${dataSections.length} data sections`);
        
        if (dataSections.length === 0) {
            console.warn('Could not find any data sections with !E markers');
            return { data: [], headers: this.getHeaders(), reportInfo };
        }
        
        // Process all data sections
        const objectData = [];
        dataSections.forEach((section, sectionIndex) => {
            ccodDbg(`Processing section ${sectionIndex + 1}: lines ${section.start} to ${section.end}`);
            
            for (let i = section.start; i < section.end; i++) {
                const line = lines[i];
                
                if (this.isDataLine(line)) {
                    const rowData = this.parseDataLine(line);
                    if (rowData && Object.keys(rowData).length > 0) {
                        objectData.push(rowData);
                        ccodDbg(`Parsed data row ${objectData.length} from section ${sectionIndex + 1}:`, rowData);
                    }
                }
            }
        });
        
        // Convert object data to array format for table rendering
        const headers = this.getHeaders();
        const arrayData = objectData.map(rowObj => {
            return headers.map(header => rowObj[header] || '');
        });
        
        ccodDbg(`CC/OD Balance Parser completed. Found ${arrayData.length} records.`);
        
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
                const runDateMatch = line.match(/RUN DATE:\s*([^\s]+\s+[^\s]+)/);
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
        if (!line || line.trim().length < 50) return false;
        
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
            return false;
        }
        
        // Split into parts and check basic structure
        const parts = trimmedLine.split(/\s+/);
        if (parts.length < 5) {
            return false;
        }
        
        // Second part should be account number (8+ digits)
        if (!/^\d{8,}$/.test(parts[1])) {
            return false;
        }
        
        ccodDbg('✓ Valid CC/OD data line detected:', trimmedLine.substring(0, 80) + '...');
        return true;
    }

    /**
     * Parse a single data line into structured data using fixed-width positions
     */
    parseDataLine(line) {
        const rowData = {};
        
        try {
            // The line structure based on the sample file:
            // Positions approximate based on the header alignment
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
            
            // Assign values to row data
            if (customerNumber) rowData['Customer Number'] = customerNumber;
            if (accountNumber) rowData['Account Number'] = accountNumber;
            if (accountType) rowData['ACCOUNT TYPE(DESCRIPTION)'] = accountType;
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
            
            return rowData;
            
        } catch (error) {
            console.error('Error parsing CC/OD data line:', error);
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
            iracDistribution: {}
        };
        
        // Get column indices
        const limitIndex = headers.indexOf('Limit');
        const outstandingBalanceIndex = headers.indexOf('Outstanding Balance');
        const drawingPowerIndex = headers.indexOf('Drawing Power');
        const interestRateIndex = headers.indexOf('Interest Rate');
    const accountTypeIndex = headers.indexOf('ACCOUNT TYPE(DESCRIPTION)');
        const iracNewIndex = headers.indexOf('IRAC New');
        
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
                const rateStr = row[interestRateIndex].toString();
                if (rateStr !== 'TIERED') {
                    const rate = parseFloat(rateStr.replace('%', ''));
                    if (!isNaN(rate)) {
                        interestRateSum += rate;
                        interestRateCount++;
                    }
                }
            }
            
            // Collect unique account types
            if (accountTypeIndex >= 0 && row[accountTypeIndex]) {
                stats.accountTypes.add(row[accountTypeIndex]);
            }
            
            // Collect IRAC distribution
            if (iracNewIndex >= 0 && row[iracNewIndex]) {
                const irac = row[iracNewIndex];
                stats.iracDistribution[irac] = (stats.iracDistribution[irac] || 0) + 1;
            }
        });
        
        if (interestRateCount > 0) {
            stats.averageInterestRate = (interestRateSum / interestRateCount).toFixed(2) + '%';
        }
        
        // Convert sets to arrays for easier handling
        stats.accountTypes = Array.from(stats.accountTypes);
        
        return stats;
    }
}

// Auto-register this parser with the main text parser
if (typeof window !== 'undefined' && window.textParser) {
    window.textParser.registerParser('cc-od-balance', (content) => {
        const parser = new CCODBalanceParser();
        return parser.parse(content);
    });
    ccodDbg('CC/OD Balance Parser registered successfully');
}