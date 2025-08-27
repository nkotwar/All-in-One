/**
 * SDV Accounts Parser
 * Handles Safe Deposit Vault (Lockers) Accounts reports from Central Bank of India
 */

class SDVAccountsParser {
    constructor() {
        this.columns = [
            'SR_NO',
            'CIF_NUMBER',
            'SDV_ACCOUNT_NUMBER',
            'LOCKER_HOLDER',
            'FEE_BEARING_ACCOUNT',
            'CABINET_ID',
            'LOCKER_ID',
            'LOCKER_TYPE',
            'KEY_ID',
            'MODE_OF_COLLECTION',
            'DUE_AMOUNT',
            'PAID_UPTO_DATE',
            'KEY_STATUS',
            'LOCKER_STATUS',
            'FEE_WAIVED',
            'ANNUAL_RENT',
            'CAUTION_ACCOUNT',
            'PENAL_CHARGE',
            'NOMINATION',
            'REVISED_AGREE_OBTAINED'
        ];
    }

    parse(content) {
        try {
            console.log('SDV Accounts Parser: Starting parse');
            
            const lines = content.split('\n');
            const dataRows = [];
            let totalDueAmount = 0;
            let reportSummary = {
                totalRecords: 0,
                activeLockers: 0,
                lockerHoldersWithDues: 0,
                totalDueAmount: 0,
                branchInfo: {},
                reportDate: null
            };

            // Extract header information
            for (const line of lines) {
                if (line.includes('HOME BRANCH CODE') && line.includes('BRANCH NAME')) {
                    const branchMatch = line.match(/HOME BRANCH CODE\s*:\s*(\d+)\s+BRANCH NAME\s*:\s*([A-Z\s]+)/);
                    if (branchMatch) {
                        reportSummary.branchInfo = {
                            code: branchMatch[1].trim(),
                            name: branchMatch[2].trim()
                        };
                    }
                }
                
                if (line.includes('RUN DATE:')) {
                    const dateMatch = line.match(/RUN DATE:\s*(\d{2}\/\d{2}\/\d{4})/);
                    if (dateMatch) {
                        reportSummary.reportDate = dateMatch[1];
                    }
                }
            }

            // Parse data lines
            for (const line of lines) {
                // Skip headers, separators, and empty lines
                if (this.isDataLine(line)) {
                    const rowData = this.parseDataLine(line);
                    if (rowData) {
                        dataRows.push(rowData);
                        
                        // Update statistics
                        const dueAmount = parseFloat(rowData.DUE_AMOUNT) || 0;
                        totalDueAmount += dueAmount;
                        
                        if (dueAmount > 0) {
                            reportSummary.lockerHoldersWithDues++;
                        }
                        
                        if (rowData.LOCKER_STATUS === 'ACTIVE') {
                            reportSummary.activeLockers++;
                        }
                    }
                }
            }

            reportSummary.totalRecords = dataRows.length;
            reportSummary.totalDueAmount = totalDueAmount;

            console.log(`SDV Accounts Parser: Successfully parsed ${dataRows.length} records`);
            console.log('Summary:', reportSummary);

            return {
                success: true,
                data: dataRows,
                headers: this.columns,
                summary: reportSummary,
                totalRows: dataRows.length
            };

        } catch (error) {
            console.error('SDV Accounts Parser Error:', error);
            return {
                success: false,
                error: error.message,
                data: [],
                headers: this.columns
            };
        }
    }

    isDataLine(line) {
        // Check if line contains data (starts with |, has pipe separators, and contains numeric data)
        const trimmed = line.trim();
        return trimmed.startsWith('|') && 
               trimmed.includes('|') && 
               /\|\s*\d+\s*\|/.test(trimmed) && // Contains serial number pattern
               !trimmed.includes('SR') && // Not header line
               !trimmed.includes('NO.') && // Not header line
               !trimmed.includes('____') && // Not separator line
               !trimmed.includes('TOTAL :'); // Not total line
    }

    parseDataLine(line) {
        try {
            // Split by | and clean up
            const parts = line.split('|').map(part => part.trim()).filter(part => part !== '');
            
            if (parts.length < 19) {
                console.log('SDV Parser: Skipping line with insufficient columns:', parts.length);
                return null;
            }

            // Map columns to data
            const rowData = {};
            
            rowData.SR_NO = this.cleanValue(parts[0]);
            rowData.CIF_NUMBER = this.cleanValue(parts[1]);
            rowData.SDV_ACCOUNT_NUMBER = this.cleanValue(parts[2]);
            rowData.LOCKER_HOLDER = this.cleanValue(parts[3]);
            rowData.FEE_BEARING_ACCOUNT = this.cleanValue(parts[4]);
            rowData.CABINET_ID = this.cleanValue(parts[5]);
            rowData.LOCKER_ID = this.cleanValue(parts[6]);
            rowData.LOCKER_TYPE = this.cleanValue(parts[7]);
            rowData.KEY_ID = this.cleanValue(parts[8]);
            rowData.MODE_OF_COLLECTION = this.cleanValue(parts[9]);
            rowData.DUE_AMOUNT = this.cleanCurrency(parts[10]);
            rowData.PAID_UPTO_DATE = this.cleanDate(parts[11]);
            rowData.KEY_STATUS = this.cleanValue(parts[12]);
            rowData.LOCKER_STATUS = this.cleanValue(parts[13]);
            rowData.FEE_WAIVED = this.cleanValue(parts[14]);
            rowData.ANNUAL_RENT = this.cleanCurrency(parts[15]);
            rowData.CAUTION_ACCOUNT = this.cleanValue(parts[16]);
            rowData.PENAL_CHARGE = this.cleanCurrency(parts[17]);
            rowData.NOMINATION = this.cleanValue(parts[18]);
            rowData.REVISED_AGREE_OBTAINED = parts[19] ? this.cleanValue(parts[19]) : 'N/A';

            // Validation - ensure we have essential fields
            if (!rowData.SR_NO || !rowData.CIF_NUMBER || !rowData.SDV_ACCOUNT_NUMBER) {
                console.log('SDV Parser: Skipping row missing essential fields');
                return null;
            }

            return rowData;

        } catch (error) {
            console.error('SDV Parser: Error parsing line:', error, line);
            return null;
        }
    }

    cleanValue(value) {
        if (!value) return '';
        return value.toString().trim();
    }

    cleanCurrency(value) {
        if (!value) return '0.00';
        const cleaned = value.toString().replace(/[,\s]/g, '').trim();
        return cleaned || '0.00';
    }

    cleanDate(value) {
        if (!value) return '';
        return value.toString().trim();
    }

    // Generate summary statistics
    generateSummary(data) {
        const summary = {
            totalLockers: data.length,
            activeLockers: 0,
            dueAmountGreaterThanZero: 0,
            totalDueAmount: 0,
            averageRent: 0,
            lockerTypes: {},
            nominationStatus: { registered: 0, notRegistered: 0 }
        };

        let totalRent = 0;

        data.forEach(row => {
            // Active lockers
            if (row.LOCKER_STATUS === 'ACTIVE') {
                summary.activeLockers++;
            }

            // Due amounts
            const dueAmount = parseFloat(row.DUE_AMOUNT) || 0;
            if (dueAmount > 0) {
                summary.dueAmountGreaterThanZero++;
                summary.totalDueAmount += dueAmount;
            }

            // Rent calculation
            const rent = parseFloat(row.ANNUAL_RENT) || 0;
            totalRent += rent;

            // Locker types
            const lockerType = row.LOCKER_TYPE || 'Unknown';
            summary.lockerTypes[lockerType] = (summary.lockerTypes[lockerType] || 0) + 1;

            // Nomination status
            if (row.NOMINATION === 'REGISTD') {
                summary.nominationStatus.registered++;
            } else {
                summary.nominationStatus.notRegistered++;
            }
        });

        summary.averageRent = data.length > 0 ? (totalRent / data.length).toFixed(2) : 0;

        return summary;
    }
}

// Auto-register this parser with the main textParser
if (typeof window !== 'undefined' && window.textParser) {
    window.textParser.registerParser('sdv-accounts', (content) => {
        const parser = new SDVAccountsParser();
        return parser.parse(content);
    });
}
