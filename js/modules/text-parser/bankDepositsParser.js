/**
 * Bank Deposits Report Parser
 * Specialized parser for Central Bank of India deposits balance files
 */

class BankDepositsParser {
    constructor() {
        this.reportInfo = {};
        this.columns = [
            { name: 'Customer Number', start: 9, end: 21, type: 'number' },
            { name: 'Prod Code', start: 21, end: 36, type: 'text' },
            { name: 'Account Type', start: 36, end: 69, type: 'text' },
            { name: 'Account Open Date', start: 69, end: 82, type: 'date' },
            { name: 'Account Number', start: 82, end: 96, type: 'number' },
            { name: 'Customer Name', start: 96, end: 131, type: 'text' },
            { name: 'Balance', start: 131, end: 149, type: 'currency' },
            { name: 'Uncleared Balance', start: 149, end: 167, type: 'currency' },
            { name: 'Collection Amount', start: 167, end: 185, type: 'currency' },
            { name: 'Maturity Date', start: 185, end: 198, type: 'date' },
            { name: 'Term Interest Rate', start: 198, end: 213, type: 'percentage' },
            { name: 'Status', start: 213, end: 227, type: 'text' },
            { name: 'Card Issued', start: 227, end: 238, type: 'flag' },
            { name: 'INB Flag', start: 238, end: 249, type: 'flag' },
            { name: 'Nominee', start: 249, end: 260, type: 'flag' },
            { name: 'Interest Available', start: 260, end: 275, type: 'currency' }
        ];
        
        // Regex patterns for different field types
        this.patterns = {
            customerNumber: /^\s*(\d{10,})/,
            datePattern: /(\d{2}\/\d{2}\/\d{4})/,
            currencyPattern: /([\d,]+\.\d{2})/g,
            statusPattern: /(OPEN|INOPERATIVE|DORMANT\s+UNCLA)/,
            flagPattern: /\b([YNR])\b/g
        };
    }

    parse(content) {
        const lines = content.split('\n');
        const result = {
            headers: this.columns.map(col => col.name),
            data: [],
            metadata: {}
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

        return result;
    }

    extractMetadata(lines, result) {
        const metadata = {};
        
        for (const line of lines.slice(0, 10)) {
            // Extract report ID
            if (line.includes('REPORT ID:')) {
                metadata.reportId = this.extractValue(line, 'REPORT ID:', 'CENTRAL BANK');
            }
            
            // Extract run date
            if (line.includes('RUN DATE:')) {
                metadata.runDate = this.extractValue(line, 'RUN DATE:', '');
            }
            
            // Extract process date
            if (line.includes('PROC DATE:')) {
                metadata.processDate = this.extractValue(line, 'PROC DATE:', '');
            }
            
            // Extract branch info
            if (line.includes('BRANCH :')) {
                const branchMatch = line.match(/BRANCH\s*:(\d+)\s+BRANCH NAME\s*:\s*([^\\s]+)/);
                if (branchMatch) {
                    metadata.branchCode = branchMatch[1].trim();
                    metadata.branchName = branchMatch[2].trim();
                }
            }
            
            // Extract page number
            if (line.includes('PAGE NO :')) {
                metadata.pageNumber = this.extractValue(line, 'PAGE NO :', '');
            }
        }
        
        result.metadata = metadata;
    }

    extractValue(line, startMarker, endMarker) {
        const startIndex = line.indexOf(startMarker);
        if (startIndex === -1) return '';
        
        const valueStart = startIndex + startMarker.length;
        let valueEnd = line.length;
        
        if (endMarker) {
            const endIndex = line.indexOf(endMarker, valueStart);
            if (endIndex !== -1) {
                valueEnd = endIndex;
            }
        }
        
        return line.substring(valueStart, valueEnd).trim();
    }

    findDataLines(lines) {
        const dataLines = [];
        let inDataSection = false;
        
        for (const line of lines) {
            // Start of data section
            if (line.includes('CUSTOMER NUMBER') && line.includes('PROD CODE')) {
                inDataSection = true;
                continue;
            }
            
            // End markers
            if (line.includes('---') && line.length > 50) {
                continue;
            }
            
            // Skip header repetitions
            if (line.includes('REPORT ID:') || line.includes('AREA:') || line.includes('BRANCH :')) {
                inDataSection = false;
                continue;
            }
            
            if (inDataSection && line.trim()) {
                dataLines.push(line);
            }
        }
        
        return dataLines;
    }

    isDataLine(line) {
        // Check if line starts with customer number (numeric)
        const trimmed = line.trim();
        if (!trimmed || trimmed.length < 50) return false;
        
        // Skip obvious header lines
        if (trimmed.includes('CUSTOMER NUMBER') || 
            trimmed.includes('PROD CODE') ||
            trimmed.includes('ACCOUNT TYPE') ||
            trimmed.includes('REPORT ID') ||
            trimmed.includes('BRANCH :') ||
            trimmed.includes('PAGE NO') ||
            trimmed.includes('DEPOSITS BALANCE FILE') ||
            trimmed.includes('---')) {
            return false;
        }
        
        // Look for customer number pattern at the start (10+ digits)
        const customerNumberMatch = trimmed.match(/^\s*(\d{10,})/);
        if (!customerNumberMatch) return false;
        
        // Additional validation: should contain product code in parentheses
        const hasProdCode = /\([^)]+\)/.test(trimmed);
        
        // Should contain at least one date
        const hasDate = /\d{2}\/\d{2}\/\d{4}/.test(trimmed);
        
        // Should contain at least one currency amount
        const hasCurrency = /[\d,]+\.\d{2}/.test(trimmed);
        
        // Should contain status information
        const hasStatus = /(OPEN|INOPERATIVE|DORMANT)/.test(trimmed);
        
        // A valid data line should have most of these elements
        const validElementCount = [hasProdCode, hasDate, hasCurrency, hasStatus].filter(Boolean).length;
        
        return validElementCount >= 3;
    }

    parseDataLine(line) {
        // Use intelligent parsing that combines patterns with positional data
        const row = new Array(this.columns.length).fill('');
        
        try {
            // Step 1: Extract customer number (must be at the beginning)
            const customerMatch = line.match(this.patterns.customerNumber);
            if (!customerMatch) return null;
            row[0] = customerMatch[1];
            
            // Step 2: Extract product code (in parentheses)
            const prodCodeMatch = line.match(/\(([^)]+)\)/);
            if (prodCodeMatch) {
                row[1] = prodCodeMatch[1];
            }
            
            // Step 3: Extract dates (account open date and maturity date)
            const dateMatches = [...line.matchAll(/(\d{2}\/\d{2}\/\d{4})/g)];
            if (dateMatches.length > 0) {
                row[3] = dateMatches[0][1]; // Account Open Date
                if (dateMatches.length > 1) {
                    row[9] = dateMatches[1][1]; // Maturity Date
                } else {
                    // Check for N.A. maturity date
                    if (line.includes('--N.A--')) {
                        row[9] = '--N.A--';
                    }
                }
            }
            
            // Step 4: Extract currency values (balance, uncleared, collection, interest)
            const currencyMatches = [...line.matchAll(/([\d,]+\.\d{2})/g)];
            if (currencyMatches.length >= 3) {
                // Usually we have: Balance, Uncleared Balance, Collection Amount, Interest Available
                row[6] = currencyMatches[0][1]; // Balance
                row[7] = currencyMatches[1][1]; // Uncleared Balance
                row[8] = currencyMatches[2][1]; // Collection Amount
                if (currencyMatches.length > 3) {
                    row[15] = currencyMatches[currencyMatches.length - 1][1]; // Interest Available (last one)
                }
            }
            
            // Step 5: Extract interest rate (decimal number followed by status)
            const interestRateMatch = line.match(/([\d.]+)\s+(OPEN|INOPERATIVE|DORMANT\s+UNCLA)/);
            if (interestRateMatch) {
                row[10] = interestRateMatch[1]; // Term Interest Rate
                row[11] = interestRateMatch[2].trim(); // Status
            } else {
                // Fallback: look for status separately
                const statusMatch = line.match(/(OPEN|INOPERATIVE|DORMANT\s+UNCLA)/);
                if (statusMatch) {
                    row[11] = statusMatch[1].trim();
                }
            }
            
            // Step 6: Extract flags (Y/N/R values at the end)
            const flagMatches = [...line.matchAll(/\b([YNR])\b/g)];
            if (flagMatches.length >= 3) {
                row[12] = flagMatches[flagMatches.length - 3][1]; // Card Issued
                row[13] = flagMatches[flagMatches.length - 2][1]; // INB Flag
                row[14] = flagMatches[flagMatches.length - 1][1]; // Nominee
            }
            
            // Step 7: Extract account number (long number after customer number)
            const accountNumberMatch = line.match(/(\d{10,})\s+(?![\d,]+\.\d{2})/);
            if (accountNumberMatch) {
                // Make sure it's not the customer number
                if (accountNumberMatch[1] !== row[0]) {
                    row[4] = accountNumberMatch[1];
                }
            }
            
            // Step 8: Extract customer name (text between account number and balance)
            const nameStartIndex = line.indexOf(row[4]) + row[4].length;
            const balanceIndex = line.indexOf(row[6]);
            if (nameStartIndex > 0 && balanceIndex > nameStartIndex) {
                row[5] = line.substring(nameStartIndex, balanceIndex).trim();
            }
            
            // Step 9: Extract account type (between product code and date)
            const prodCodeIndex = line.indexOf(row[1]) + row[1].length + 1; // +1 for closing parenthesis
            const dateIndex = line.indexOf(row[3]);
            if (prodCodeIndex > 0 && dateIndex > prodCodeIndex) {
                row[2] = line.substring(prodCodeIndex, dateIndex).trim();
            }
            
            // Step 10: Fallback to positional parsing for any missing critical fields
            this.fillMissingFieldsPositionally(line, row);
            
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
                return /\d{2}\/\d{2}\/\d{4}/.test(value) || value.includes('N.A');
            case 'currency':
                return /[\d,]+\.\d{2}/.test(value) || value === '0.00';
            case 'percentage':
                return /^\d+(\.\d+)?$/.test(value);
            case 'flag':
                return /^[YNR]$/.test(value);
            default:
                return true;
        }
    }

    formatValue(value, type) {
        if (!value) return '';
        
        switch (type) {
            case 'currency':
                // Handle currency formatting issues
                value = value.replace(/\s+/g, ' ').trim();
                
                // Fix common parsing issues with decimals
                if (value.includes('.')) {
                    // If we have something like "0" and ".00" separately, combine them
                    const parts = value.split(/\s+/);
                    if (parts.length === 2 && parts[0].match(/^\d+$/) && parts[1].match(/^\.\d{2}$/)) {
                        value = parts[0] + parts[1];
                    }
                }
                
                // Ensure proper currency format
                if (value.match(/^[\d,]+\.\d{2}$/)) {
                    return value;
                } else if (value.match(/^[\d,]+$/)) {
                    return value + '.00';
                } else if (value === '0' || value === '0.0') {
                    return '0.00';
                }
                
                // Try to extract valid currency from mixed content
                const currencyMatch = value.match(/([\d,]+\.\d{2})/);
                if (currencyMatch) {
                    return currencyMatch[1];
                }
                
                return value;
                
            case 'date':
                // Handle date formats and N.A. values
                if (value.includes('--N.A--') || value.includes('N.A')) {
                    return '--N.A--';
                }
                
                // Extract valid date format
                const dateMatch = value.match(/(\d{2}\/\d{2}\/\d{4})/);
                if (dateMatch) {
                    return dateMatch[1];
                }
                
                return value;
                
            case 'percentage':
                // Format percentage values
                const percentMatch = value.match(/([\d.]+)/);
                if (percentMatch) {
                    return percentMatch[1];
                }
                return value;
                
            case 'flag':
                // Clean up flag values (Y/N/R)
                const flagMatch = value.match(/([YNR])/);
                if (flagMatch) {
                    return flagMatch[1];
                }
                return value.toUpperCase();
                
            case 'number':
                // Clean up numeric values
                const numberMatch = value.match(/(\d+)/);
                if (numberMatch) {
                    return numberMatch[1];
                }
                return value.replace(/\s+/g, '');
                
            case 'text':
            default:
                // Clean up text values - handle multiple spaces and special characters
                return value.replace(/\s+/g, ' ').trim();
        }
    }

    isValidRow(row) {
        // A valid row should have at least customer number and account number
        return row[0] && row[4]; // Customer Number and Account Number
    }

    // Additional analysis methods specific to bank deposits
    analyzeDeposits(data) {
        const analysis = {
            totalAccounts: data.length,
            totalBalance: 0,
            accountStatuses: {},
            accountTypes: {},
            branchSummary: {},
            customerTypes: {},
            interestAnalysis: {
                totalInterestAvailable: 0,
                averageInterestRate: 0,
                rateDistribution: {}
            }
        };

        data.forEach(row => {
            // Balance analysis
            const balance = this.parseNumericValue(row[6]); // Balance column
            if (!isNaN(balance)) {
                analysis.totalBalance += balance;
            }

            // Status analysis
            const status = row[11]; // Status column
            analysis.accountStatuses[status] = (analysis.accountStatuses[status] || 0) + 1;

            // Account type analysis
            const accountType = row[2]; // Account Type column
            if (accountType) {
                const typeKey = accountType.split('-')[0]; // Get main type
                analysis.accountTypes[typeKey] = (analysis.accountTypes[typeKey] || 0) + 1;
            }

            // Interest analysis
            const interestAvailable = this.parseNumericValue(row[15]); // Interest Available column
            const interestRate = this.parseNumericValue(row[10]); // Term Interest Rate column
            
            if (!isNaN(interestAvailable)) {
                analysis.interestAnalysis.totalInterestAvailable += interestAvailable;
            }

            if (!isNaN(interestRate) && interestRate > 0) {
                const rateKey = Math.floor(interestRate).toString();
                analysis.interestAnalysis.rateDistribution[rateKey] = 
                    (analysis.interestAnalysis.rateDistribution[rateKey] || 0) + 1;
            }
        });

        // Calculate averages
        if (data.length > 0) {
            analysis.averageBalance = analysis.totalBalance / data.length;
            
            const validRates = data.map(row => this.parseNumericValue(row[10]))
                                  .filter(rate => !isNaN(rate) && rate > 0);
            if (validRates.length > 0) {
                analysis.interestAnalysis.averageInterestRate = 
                    validRates.reduce((a, b) => a + b, 0) / validRates.length;
            }
        } else {
            // Handle empty data case
            analysis.averageBalance = 0;
            analysis.interestAnalysis.averageInterestRate = 0;
        }

        return analysis;
    }

    parseNumericValue(value) {
        if (!value) return NaN;
        // Remove commas and convert to number
        return parseFloat(value.toString().replace(/[,\s]/g, ''));
    }

    generateBankingReport(data, metadata) {
        const analysis = this.analyzeDeposits(data);
        
        return {
            summary: {
                reportDate: metadata.runDate,
                branchCode: metadata.branchCode,
                branchName: metadata.branchName,
                totalAccounts: analysis.totalAccounts,
                totalBalance: analysis.totalBalance,
                averageBalance: analysis.averageBalance
            },
            accountAnalysis: {
                statusDistribution: analysis.accountStatuses,
                typeDistribution: analysis.accountTypes
            },
            interestAnalysis: analysis.interestAnalysis,
            recommendations: this.generateRecommendations(analysis)
        };
    }

    generateRecommendations(analysis) {
        const recommendations = [];

        // Dormant accounts check
        const dormantCount = analysis.accountStatuses['DORMANT UNCLA'] || 0;
        if (dormantCount > 0) {
            recommendations.push({
                type: 'warning',
                title: 'Dormant Accounts',
                message: `${dormantCount} dormant unclaimed accounts found. Consider customer outreach for reactivation.`
            });
        }

        // Inoperative accounts check
        const inoperativeCount = analysis.accountStatuses['INOPERATIVE'] || 0;
        if (inoperativeCount > 0) {
            recommendations.push({
                type: 'info',
                title: 'Inoperative Accounts',
                message: `${inoperativeCount} inoperative accounts. Review for potential activation or closure.`
            });
        }

        // Interest opportunity
        if (analysis.interestAnalysis.totalInterestAvailable > 100000) {
            recommendations.push({
                type: 'success',
                title: 'Interest Opportunities',
                message: `₹${analysis.interestAnalysis.totalInterestAvailable.toLocaleString()} in unclaimed interest available. Good opportunity for customer engagement.`
            });
        }

        return recommendations;
    }
}

// Export for use in main text parser
window.BankDepositsParser = BankDepositsParser;
