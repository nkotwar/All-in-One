/**
 * SDV Accounts Parser
 * Parses SDV (Safe Deposit Vault) accounts data from Central Bank of India reports
 */

class SDVAccountsParser {
    constructor() {
        this.headers = [
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
            'SUB_CAT',
            'FEE_WAIVED',
            'ANNUAL_RENT',
            'CAUTION_ACCOUNT',
            'PENAL_CHARGE',
            'NOMINATION',
            'REVISED_AGREE_OBTAINED'
        ];
    }

    /**
     * Parse SDV accounts data from text content
     * @param {string} content - Raw text content from the file
     * @returns {Object} Parsed data with headers and rows
     */
    parse(content) {
        try {
            const lines = content.split('\n');
            const dataRows = [];
            let branchInfo = {};
            
            // Extract branch information and find data rows
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                // Extract branch information
                if (line.includes('HOME BRANCH CODE')) {
                    const branchMatch = line.match(/HOME BRANCH CODE\s*:\s*(\d+)\s+BRANCH NAME\s*:\s*([A-Z\s]+)/);
                    if (branchMatch) {
                        branchInfo.branchCode = branchMatch[1].trim();
                        branchInfo.branchName = branchMatch[2].trim();
                    }
                }
                
                // Find data rows (lines starting with |)
                if (line.startsWith('|') && line.includes('|')) {
                    const parsedRow = this.parseDataRow(line);
                    if (parsedRow && parsedRow.length === this.headers.length) {
                        dataRows.push(parsedRow);
                    }
                }
            }

            return {
                success: true,
                branchInfo,
                headers: this.headers,
                data: dataRows,
                totalRecords: dataRows.length,
                message: `Successfully parsed ${dataRows.length} SDV account records`
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                headers: this.headers,
                data: [],
                totalRecords: 0
            };
        }
    }

    /**
     * Parse a single data row
     * @param {string} line - Raw line from the file
     * @returns {Array} Parsed row data
     */
    parseDataRow(line) {
        try {
            // Remove leading and trailing pipes
            let cleanLine = line.trim();
            if (cleanLine.startsWith('|')) {
                cleanLine = cleanLine.substring(1);
            }
            if (cleanLine.endsWith('|')) {
                cleanLine = cleanLine.substring(0, cleanLine.length - 1);
            }

            // Replace double pipes with single pipes first, then split
            // This treats || the same as | - just as field separators
            cleanLine = cleanLine.replace(/\|\|/g, '|');
            
            // Split by pipe
            let fields = cleanLine.split('|');
            
            // Clean up fields - trim whitespace
            fields = fields.map((field, index) => {
                let cleanField = field.trim();
                
                // Remove 'L' prefix from LOCKER_ID field for easier sorting
                if (index === this.headers.indexOf('LOCKER_ID') && cleanField.startsWith('L')) {
                    cleanField = cleanField.substring(1);
                }
                
                return cleanField;
            });

            // Ensure we have the correct number of fields
            while (fields.length < this.headers.length) {
                fields.push('');
            }

            // Trim to exact number of headers if we have too many fields
            if (fields.length > this.headers.length) {
                fields.splice(this.headers.length);
            }

            return fields;

        } catch (error) {
            console.warn('Error parsing row:', line, error);
            return null;
        }
    }

    /**
     * Convert parsed data to CSV format
     * @param {Object} parsedData - Result from parse method
     * @returns {string} CSV formatted string
     */
    toCSV(parsedData) {
        if (!parsedData.success || !parsedData.data || parsedData.data.length === 0) {
            return '';
        }

        const csvLines = [];
        
        // Add headers
        csvLines.push(parsedData.headers.join(','));
        
        // Add data rows
        parsedData.data.forEach(row => {
            // Escape fields that contain commas or quotes
            const escapedRow = row.map(field => {
                if (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
                    return `"${field.replace(/"/g, '""')}"`;
                }
                return field;
            });
            csvLines.push(escapedRow.join(','));
        });

        return csvLines.join('\n');
    }

    /**
     * Convert parsed data to Excel-compatible format
     * @param {Object} parsedData - Result from parse method
     * @returns {Array} Array of objects suitable for Excel export
     */
    toExcel(parsedData) {
        if (!parsedData.success || !parsedData.data || parsedData.data.length === 0) {
            return [];
        }

        return parsedData.data.map(row => {
            const rowObject = {};
            parsedData.headers.forEach((header, index) => {
                rowObject[header] = row[index] || '';
            });
            return rowObject;
        });
    }

    /**
     * Get summary statistics of the parsed data
     * @param {Object} parsedData - Result from parse method
     * @returns {Object} Summary statistics
     */
    getSummary(parsedData) {
        if (!parsedData.success || !parsedData.data || parsedData.data.length === 0) {
            return {
                totalRecords: 0,
                activeLockers: 0,
                inactiveLockers: 0,
                totalDueAmount: 0,
                totalAnnualRent: 0
            };
        }

        const statusIndex = parsedData.headers.indexOf('LOCKER_STATUS');
        const dueAmountIndex = parsedData.headers.indexOf('DUE_AMOUNT');
        const annualRentIndex = parsedData.headers.indexOf('ANNUAL_RENT');

        let activeLockers = 0;
        let inactiveLockers = 0;
        let totalDueAmount = 0;
        let totalAnnualRent = 0;

        parsedData.data.forEach(row => {
            // Count active/inactive lockers
            if (statusIndex >= 0 && row[statusIndex]) {
                if (row[statusIndex].toUpperCase().includes('ACTIVE')) {
                    activeLockers++;
                } else {
                    inactiveLockers++;
                }
            }

            // Sum due amounts
            if (dueAmountIndex >= 0 && row[dueAmountIndex]) {
                const dueAmount = parseFloat(row[dueAmountIndex].replace(/[^\d.-]/g, ''));
                if (!isNaN(dueAmount)) {
                    totalDueAmount += dueAmount;
                }
            }

            // Sum annual rent
            if (annualRentIndex >= 0 && row[annualRentIndex]) {
                const annualRent = parseFloat(row[annualRentIndex].replace(/[^\d.-]/g, ''));
                if (!isNaN(annualRent)) {
                    totalAnnualRent += annualRent;
                }
            }
        });

        return {
            totalRecords: parsedData.data.length,
            activeLockers,
            inactiveLockers,
            totalDueAmount: totalDueAmount.toFixed(2),
            totalAnnualRent: totalAnnualRent.toFixed(2),
            branchInfo: parsedData.branchInfo
        };
    }

    /**
     * Custom data analysis for SDV accounts
     * @param {Object} parsedData - Result from parse method
     * @returns {Object} Analysis results with filtering capabilities
     */
    getAnalysis(parsedData) {
        if (!parsedData.success || !parsedData.data || parsedData.data.length === 0) {
            return {
                totalLockers: 0,
                pendingDue: [],
                pendingPenal: [],
                pendingAgreement: [],
                stats: {}
            };
        }

        const dueAmountIndex = parsedData.headers.indexOf('DUE_AMOUNT');
        const penalChargeIndex = parsedData.headers.indexOf('PENAL_CHARGE');
        const revisedAgreeIndex = parsedData.headers.indexOf('REVISED_AGREE_OBTAINED');
        const lockerIdIndex = parsedData.headers.indexOf('LOCKER_ID');
        const holderIndex = parsedData.headers.indexOf('LOCKER_HOLDER');
        const statusIndex = parsedData.headers.indexOf('LOCKER_STATUS');

        const pendingDue = [];
        const pendingPenal = [];
        const pendingAgreement = [];

        parsedData.data.forEach((row, index) => {
            const rowData = {
                rowIndex: index,
                lockerId: row[lockerIdIndex] || '',
                holder: row[holderIndex] || '',
                status: row[statusIndex] || '',
                dueAmount: row[dueAmountIndex] || '0.00',
                penalCharge: row[penalChargeIndex] || '0.00',
                revisedAgree: row[revisedAgreeIndex] || '',
                fullRow: row
            };

            // Check for pending due amount (greater than 0)
            const dueAmount = parseFloat(row[dueAmountIndex]?.replace(/[^\d.-]/g, '') || '0');
            if (dueAmount > 0) {
                pendingDue.push(rowData);
            }

            // Check for pending penal charge (greater than 0)
            const penalCharge = parseFloat(row[penalChargeIndex]?.replace(/[^\d.-]/g, '') || '0');
            if (penalCharge > 0) {
                pendingPenal.push(rowData);
            }

            // Check for pending revised agreement (not 'Y')
            const revisedAgree = row[revisedAgreeIndex]?.trim().toUpperCase();
            if (revisedAgree && revisedAgree !== 'Y') {
                pendingAgreement.push(rowData);
            }
        });

        return {
            totalLockers: parsedData.data.length,
            pendingDue: pendingDue.sort((a, b) => parseInt(a.lockerId) - parseInt(b.lockerId)),
            pendingPenal: pendingPenal.sort((a, b) => parseInt(a.lockerId) - parseInt(b.lockerId)),
            pendingAgreement: pendingAgreement.sort((a, b) => parseInt(a.lockerId) - parseInt(b.lockerId)),
            stats: {
                totalPendingDue: pendingDue.length,
                totalPendingPenal: pendingPenal.length,
                totalPendingAgreement: pendingAgreement.length,
                totalDueAmount: pendingDue.reduce((sum, item) => 
                    sum + parseFloat(item.dueAmount.replace(/[^\d.-]/g, '') || '0'), 0).toFixed(2),
                totalPenalAmount: pendingPenal.reduce((sum, item) => 
                    sum + parseFloat(item.penalCharge.replace(/[^\d.-]/g, '') || '0'), 0).toFixed(2)
            }
        };
    }

    /**
     * Filter analysis results with combination options
     * @param {Object} analysis - Result from getAnalysis method
     * @param {Object} filters - Filter options
     * @returns {Array} Filtered rows
     */
    filterAnalysis(analysis, filters = {}) {
        const { includeDue = false, includePenal = false, includeAgreement = false, operator = 'OR' } = filters;

        if (!includeDue && !includePenal && !includeAgreement) {
            return [];
        }

        let filteredRows = [];
        const lockerIdSet = new Set();

        if (operator.toUpperCase() === 'AND') {
            // AND operation - find rows that match ALL selected criteria
            const dueIds = new Set(analysis.pendingDue.map(item => item.lockerId));
            const penalIds = new Set(analysis.pendingPenal.map(item => item.lockerId));
            const agreeIds = new Set(analysis.pendingAgreement.map(item => item.lockerId));

            // Start with all locker IDs and filter down
            let commonIds = new Set();
            
            if (includeDue) commonIds = new Set(dueIds);
            if (includePenal) {
                if (commonIds.size === 0) {
                    commonIds = new Set(penalIds);
                } else {
                    commonIds = new Set([...commonIds].filter(id => penalIds.has(id)));
                }
            }
            if (includeAgreement) {
                if (commonIds.size === 0) {
                    commonIds = new Set(agreeIds);
                } else {
                    commonIds = new Set([...commonIds].filter(id => agreeIds.has(id)));
                }
            }

            // Get the full row data for common IDs
            const allRows = [...analysis.pendingDue, ...analysis.pendingPenal, ...analysis.pendingAgreement];
            filteredRows = allRows.filter(item => commonIds.has(item.lockerId));
            
            // Remove duplicates
            const uniqueRows = [];
            const seenIds = new Set();
            filteredRows.forEach(row => {
                if (!seenIds.has(row.lockerId)) {
                    seenIds.add(row.lockerId);
                    uniqueRows.push(row);
                }
            });
            filteredRows = uniqueRows;

        } else {
            // OR operation - find rows that match ANY selected criteria
            if (includeDue) {
                analysis.pendingDue.forEach(item => {
                    if (!lockerIdSet.has(item.lockerId)) {
                        lockerIdSet.add(item.lockerId);
                        filteredRows.push(item);
                    }
                });
            }

            if (includePenal) {
                analysis.pendingPenal.forEach(item => {
                    if (!lockerIdSet.has(item.lockerId)) {
                        lockerIdSet.add(item.lockerId);
                        filteredRows.push(item);
                    }
                });
            }

            if (includeAgreement) {
                analysis.pendingAgreement.forEach(item => {
                    if (!lockerIdSet.has(item.lockerId)) {
                        lockerIdSet.add(item.lockerId);
                        filteredRows.push(item);
                    }
                });
            }
        }

        return filteredRows.sort((a, b) => parseInt(a.lockerId) - parseInt(b.lockerId));
    }

    /**
     * Get detailed statistics for filtered results
     * @param {Array} filteredRows - Filtered rows from filterAnalysis
     * @returns {Object} Detailed statistics
     */
    getFilteredStats(filteredRows) {
        const stats = {
            count: filteredRows.length,
            totalDueAmount: 0,
            totalPenalAmount: 0,
            statusBreakdown: {},
            avgDueAmount: 0,
            avgPenalAmount: 0
        };

        filteredRows.forEach(row => {
            // Sum amounts
            const dueAmount = parseFloat(row.dueAmount.replace(/[^\d.-]/g, '') || '0');
            const penalAmount = parseFloat(row.penalCharge.replace(/[^\d.-]/g, '') || '0');
            
            stats.totalDueAmount += dueAmount;
            stats.totalPenalAmount += penalAmount;

            // Status breakdown
            const status = row.status || 'Unknown';
            stats.statusBreakdown[status] = (stats.statusBreakdown[status] || 0) + 1;
        });

        stats.totalDueAmount = stats.totalDueAmount.toFixed(2);
        stats.totalPenalAmount = stats.totalPenalAmount.toFixed(2);
        stats.avgDueAmount = (stats.totalDueAmount / (stats.count || 1)).toFixed(2);
        stats.avgPenalAmount = (stats.totalPenalAmount / (stats.count || 1)).toFixed(2);

        return stats;
    }

    /**
     * Custom data analysis for SDV accounts
     * @param {Object} parsedData - Result from parse method
     * @returns {Object} Analysis results with filtering capabilities
     */
    getAnalysis(parsedData) {
        if (!parsedData.success || !parsedData.data || parsedData.data.length === 0) {
            return {
                totalLockers: 0,
                pendingDue: [],
                pendingPenal: [],
                pendingAgreement: [],
                stats: {}
            };
        }

        const dueAmountIndex = parsedData.headers.indexOf('DUE_AMOUNT');
        const penalChargeIndex = parsedData.headers.indexOf('PENAL_CHARGE');
        const revisedAgreeIndex = parsedData.headers.indexOf('REVISED_AGREE_OBTAINED');
        const lockerIdIndex = parsedData.headers.indexOf('LOCKER_ID');
        const holderIndex = parsedData.headers.indexOf('LOCKER_HOLDER');
        const statusIndex = parsedData.headers.indexOf('LOCKER_STATUS');

        const pendingDue = [];
        const pendingPenal = [];
        const pendingAgreement = [];

        parsedData.data.forEach((row, index) => {
            const rowData = {
                rowIndex: index,
                lockerId: row[lockerIdIndex] || '',
                holder: row[holderIndex] || '',
                status: row[statusIndex] || '',
                dueAmount: row[dueAmountIndex] || '0.00',
                penalCharge: row[penalChargeIndex] || '0.00',
                revisedAgree: row[revisedAgreeIndex] || '',
                fullRow: row
            };

            // Check for pending due amount (greater than 0)
            const dueAmount = parseFloat(row[dueAmountIndex]?.replace(/[^\d.-]/g, '') || '0');
            if (dueAmount > 0) {
                pendingDue.push(rowData);
            }

            // Check for pending penal charge (greater than 0)
            const penalCharge = parseFloat(row[penalChargeIndex]?.replace(/[^\d.-]/g, '') || '0');
            if (penalCharge > 0) {
                pendingPenal.push(rowData);
            }

            // Check for pending revised agreement (not 'Y')
            const revisedAgree = row[revisedAgreeIndex]?.trim().toUpperCase();
            if (revisedAgree && revisedAgree !== 'Y') {
                pendingAgreement.push(rowData);
            }
        });

        return {
            totalLockers: parsedData.data.length,
            pendingDue: pendingDue.sort((a, b) => parseInt(a.lockerId) - parseInt(b.lockerId)),
            pendingPenal: pendingPenal.sort((a, b) => parseInt(a.lockerId) - parseInt(b.lockerId)),
            pendingAgreement: pendingAgreement.sort((a, b) => parseInt(a.lockerId) - parseInt(b.lockerId)),
            stats: {
                totalPendingDue: pendingDue.length,
                totalPendingPenal: pendingPenal.length,
                totalPendingAgreement: pendingAgreement.length,
                totalDueAmount: pendingDue.reduce((sum, item) => 
                    sum + parseFloat(item.dueAmount.replace(/[^\d.-]/g, '') || '0'), 0).toFixed(2),
                totalPenalAmount: pendingPenal.reduce((sum, item) => 
                    sum + parseFloat(item.penalCharge.replace(/[^\d.-]/g, '') || '0'), 0).toFixed(2)
            }
        };
    }

    /**
     * Filter analysis results with combination options
     * @param {Object} analysis - Result from getAnalysis method
     * @param {Object} filters - Filter options
     * @returns {Array} Filtered rows
     */
    filterAnalysis(analysis, filters = {}) {
        const { includeDue = false, includePenal = false, includeAgreement = false, operator = 'OR' } = filters;

        if (!includeDue && !includePenal && !includeAgreement) {
            return [];
        }

        let filteredRows = [];
        const lockerIdSet = new Set();

        if (operator.toUpperCase() === 'AND') {
            // AND operation - find rows that match ALL selected criteria
            const dueIds = new Set(analysis.pendingDue.map(item => item.lockerId));
            const penalIds = new Set(analysis.pendingPenal.map(item => item.lockerId));
            const agreeIds = new Set(analysis.pendingAgreement.map(item => item.lockerId));

            // Start with all locker IDs and filter down
            let commonIds = new Set();
            
            if (includeDue) commonIds = new Set(dueIds);
            if (includePenal) {
                if (commonIds.size === 0) {
                    commonIds = new Set(penalIds);
                } else {
                    commonIds = new Set([...commonIds].filter(id => penalIds.has(id)));
                }
            }
            if (includeAgreement) {
                if (commonIds.size === 0) {
                    commonIds = new Set(agreeIds);
                } else {
                    commonIds = new Set([...commonIds].filter(id => agreeIds.has(id)));
                }
            }

            // Get the full row data for common IDs
            const allRows = [...analysis.pendingDue, ...analysis.pendingPenal, ...analysis.pendingAgreement];
            filteredRows = allRows.filter(item => commonIds.has(item.lockerId));
            
            // Remove duplicates
            const uniqueRows = [];
            const seenIds = new Set();
            filteredRows.forEach(row => {
                if (!seenIds.has(row.lockerId)) {
                    seenIds.add(row.lockerId);
                    uniqueRows.push(row);
                }
            });
            filteredRows = uniqueRows;

        } else {
            // OR operation - find rows that match ANY selected criteria
            if (includeDue) {
                analysis.pendingDue.forEach(item => {
                    if (!lockerIdSet.has(item.lockerId)) {
                        lockerIdSet.add(item.lockerId);
                        filteredRows.push(item);
                    }
                });
            }

            if (includePenal) {
                analysis.pendingPenal.forEach(item => {
                    if (!lockerIdSet.has(item.lockerId)) {
                        lockerIdSet.add(item.lockerId);
                        filteredRows.push(item);
                    }
                });
            }

            if (includeAgreement) {
                analysis.pendingAgreement.forEach(item => {
                    if (!lockerIdSet.has(item.lockerId)) {
                        lockerIdSet.add(item.lockerId);
                        filteredRows.push(item);
                    }
                });
            }
        }

        return filteredRows.sort((a, b) => parseInt(a.lockerId) - parseInt(b.lockerId));
    }

    /**
     * Get detailed statistics for filtered results
     * @param {Array} filteredRows - Filtered rows from filterAnalysis
     * @returns {Object} Detailed statistics
     */
    getFilteredStats(filteredRows) {
        const stats = {
            count: filteredRows.length,
            totalDueAmount: 0,
            totalPenalAmount: 0,
            statusBreakdown: {},
            avgDueAmount: 0,
            avgPenalAmount: 0
        };

        filteredRows.forEach(row => {
            // Sum amounts
            const dueAmount = parseFloat(row.dueAmount.replace(/[^\d.-]/g, '') || '0');
            const penalAmount = parseFloat(row.penalCharge.replace(/[^\d.-]/g, '') || '0');
            
            stats.totalDueAmount += dueAmount;
            stats.totalPenalAmount += penalAmount;

            // Status breakdown
            const status = row.status || 'Unknown';
            stats.statusBreakdown[status] = (stats.statusBreakdown[status] || 0) + 1;
        });

        stats.totalDueAmount = stats.totalDueAmount.toFixed(2);
        stats.totalPenalAmount = stats.totalPenalAmount.toFixed(2);
        stats.avgDueAmount = (stats.totalDueAmount / (stats.count || 1)).toFixed(2);
        stats.avgPenalAmount = (stats.totalPenalAmount / (stats.count || 1)).toFixed(2);

        return stats;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SDVAccountsParser;
} else if (typeof window !== 'undefined') {
    window.SDVAccountsParser = SDVAccountsParser;
}
