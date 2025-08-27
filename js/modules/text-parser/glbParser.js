/**
 * GLB Parser
 * Specialized parser for General Ledger Balance files (YYYYMMDD_GLB format)
 * 
 * File Format:
 * - Balance sheet style report with LIABILITIES and ASSETS columns
 * - Fixed-width format with multiple currency columns
 * - Contains various account categories like Capital & Reserves, Demand Deposits, etc.
 * - Multi-page report with totals and subtotals
 */

class GLBParser {
    constructor() {
        this.reportInfo = {};
        // Define column headers based on the GLB structure
        this.columns = [
            'Account Category',
            'Account Description',
            'Amount 1',
            'Amount 2', 
            'Amount 3',
            'Amount 4',
            'Side',
            'Section'
        ];
    }

    /**
     * Parse the GLB file content
     */
    parse(content) {
        console.log('Starting GLB Parser...');
        console.log(`File content length: ${content.length} characters`);
        
        const lines = content.split('\n');
        console.log(`Total lines in file: ${lines.length}`);
        
        const data = [];
        let reportInfo = this.extractReportInfo(lines);
        
        console.log('Extracted report info:', reportInfo);
        
        // Process the balance sheet sections
        const objectData = this.parseBalanceSheetData(lines);
        
        // Convert object data to array format for table rendering
        const headers = this.getHeaders();
        const arrayData = objectData.map(rowObj => {
            return headers.map(header => rowObj[header] || '');
        });
        
        console.log(`GLB Parser completed. Found ${arrayData.length} records.`);
        
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
        
        for (let i = 0; i < Math.min(20, lines.length); i++) {
            const line = lines[i].trim();
            
            // Extract bank name
            if (line.includes('CENTRAL BANK OF INDIA')) {
                info.bankName = 'CENTRAL BANK OF INDIA';
            }
            
            // Extract report title
            if (line.includes('GENERAL LEDGER BALANCE')) {
                info.reportType = 'General Ledger Balance';
                const dateMatch = line.match(/AS ON\s+(\d{2}\/\d{2}\/\d{4})/);
                if (dateMatch) {
                    info.asOnDate = dateMatch[1];
                }
            }
            
            // Extract branch information
            if (line.includes('Branch NO:') || line.includes('Branch=')) {
                const branchMatch = line.match(/Branch\s*[=:]?\s*(\d+)/);
                if (branchMatch) info.branchCode = branchMatch[1];
                
                const branchNameMatch = line.match(/\(([^)]+)\)/);
                if (branchNameMatch) info.branchName = branchNameMatch[1];
            }
            
            // Extract region and zone info
            if (line.includes('Region-ID:') && line.includes('Zone-ID:')) {
                const regionMatch = line.match(/Region-ID:\s*(\d+)/);
                const zoneMatch = line.match(/Zone-ID:\s*(\d+)/);
                if (regionMatch) info.regionId = regionMatch[1];
                if (zoneMatch) info.zoneId = zoneMatch[1];
            }
            
            // Extract currency
            if (line.includes('Currency:')) {
                const currencyMatch = line.match(/Currency:\s*([A-Z]+)/);
                if (currencyMatch) info.currency = currencyMatch[1];
            }
            
            // Extract date and time
            if (line.match(/\d{2}-[A-Z]{3}-\d{2}\s+\d{2}:\d{2}:\d{2}/)) {
                info.reportDateTime = line.match(/\d{2}-[A-Z]{3}-\d{2}\s+\d{2}:\d{2}:\d{2}/)[0];
            }
        }
        
        return info;
    }

    /**
     * Parse balance sheet data from the GLB format
     */
    parseBalanceSheetData(lines) {
        const data = [];
        let currentSection = '';
        let currentSide = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Skip empty lines and separators
            if (!line.trim() || line.includes('===') || line.includes('---')) {
                continue;
            }
            
            // Detect section headers
            if (line.includes('LIABILITIES') && line.includes('ASSETS')) {
                continue; // Skip the header row
            }
            
            // Determine which side (LIABILITY or ASSET) we're processing
            if (this.isDataLine(line)) {
                const parsedData = this.parseDataLine(line, i, lines);
                if (parsedData) {
                    data.push(...parsedData);
                }
            }
        }
        
        return data;
    }

    /**
     * Check if a line contains balance sheet data
     */
    isDataLine(line) {
        // Skip header lines and separators
        if (!line.trim() || 
            line.includes('===') || 
            line.includes('---') ||
            line.includes('LIABILITIES') ||
            line.includes('ASSETS') ||
            line.includes('Currency:') ||
            line.includes('Branch') ||
            line.includes('Region') ||
            line.includes('CENTRAL BANK') ||
            line.includes('GENERAL LEDGER') ||
            line.includes('Page:')) {
            return false;
        }
        
        // Look for lines with account descriptions and amounts
        const hasAccountText = /[A-Za-z]/.test(line);
        const hasAmounts = /\d{1,3}(?:,\d{3})*\.\d{2}\s*[CD]R/.test(line);
        
        return hasAccountText && (hasAmounts || line.includes('TOTAL'));
    }

    /**
     * Parse a data line from the balance sheet
     */
    parseDataLine(line, lineIndex, allLines) {
        const results = [];
        
        try {
            // Split the line by | to separate LIABILITY and ASSET sides
            const parts = line.split('|');
            
            if (parts.length >= 8) { // Expected format with 8 columns
                // Process LIABILITY side (first 4 columns)
                const liabilityData = this.parseBalanceSheetSide(parts.slice(0, 4), 'LIABILITY');
                if (liabilityData) {
                    results.push(liabilityData);
                }
                
                // Process ASSET side (last 4 columns)
                const assetData = this.parseBalanceSheetSide(parts.slice(4, 8), 'ASSET');
                if (assetData) {
                    results.push(assetData);
                }
            }
            
        } catch (error) {
            console.error('Error parsing GLB line:', error, 'Line:', line.substring(0, 100));
        }
        
        return results;
    }

    /**
     * Parse one side of the balance sheet (LIABILITY or ASSET)
     */
    parseBalanceSheetSide(columns, side) {
        if (columns.length < 4) return null;
        
        const accountDesc = columns[0] ? columns[0].trim() : '';
        const amount1 = columns[1] ? columns[1].trim() : '';
        const amount2 = columns[2] ? columns[2].trim() : '';
        const amount3 = columns[3] ? columns[3].trim() : '';
        
        // Skip if no meaningful data
        if (!accountDesc && !amount1 && !amount2 && !amount3) {
            return null;
        }
        
        // Determine the main category and description
        let category = '';
        let description = accountDesc;
        
        if (accountDesc.match(/^\d+-/)) {
            // Lines like "1-CAPITAL & RESERVES"
            const match = accountDesc.match(/^(\d+)-(.+)/);
            if (match) {
                category = match[1];
                description = match[2];
            }
        } else if (accountDesc.includes('TOTAL')) {
            category = 'TOTAL';
        }
        
        return {
            'Account Category': category,
            'Account Description': description,
            'Amount 1': this.formatAmount(amount1),
            'Amount 2': this.formatAmount(amount2),
            'Amount 3': this.formatAmount(amount3),
            'Amount 4': '', // Fourth column for symmetry
            'Side': side,
            'Section': this.determineSection(description)
        };
    }

    /**
     * Format currency amounts
     */
    formatAmount(amount) {
        if (!amount || amount.trim() === '') return '';
        
        // Extract amount and DR/CR indicator
        const match = amount.match(/([\d,]+\.\d{2})\s*(DR|CR)?/);
        if (match) {
            const value = match[1];
            const indicator = match[2] || '';
            return indicator ? `${value} ${indicator}` : value;
        }
        
        return amount.trim();
    }

    /**
     * Determine the section based on account description
     */
    determineSection(description) {
        const desc = description.toLowerCase();
        
        if (desc.includes('capital') || desc.includes('reserves')) return 'Capital & Reserves';
        if (desc.includes('deposit')) return 'Deposits';
        if (desc.includes('cash') || desc.includes('balance')) return 'Cash & Balances';
        if (desc.includes('loan') || desc.includes('advance')) return 'Loans & Advances';
        if (desc.includes('fixed asset')) return 'Fixed Assets';
        if (desc.includes('interbranch')) return 'Interbranch Accounts';
        if (desc.includes('suspense')) return 'Suspense Accounts';
        if (desc.includes('government') || desc.includes('govt')) return 'Government Schemes';
        if (desc.includes('contra')) return 'Contra Accounts';
        if (desc.includes('total')) return 'Total';
        
        return 'Other';
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
            liabilityRecords: 0,
            assetRecords: 0,
            sections: new Set(),
            totalLiabilities: 0,
            totalAssets: 0
        };
        
        const sideIndex = headers.indexOf('Side');
        const sectionIndex = headers.indexOf('Section');
        
        data.forEach(row => {
            if (sideIndex >= 0) {
                const side = row[sideIndex];
                if (side === 'LIABILITY') stats.liabilityRecords++;
                if (side === 'ASSET') stats.assetRecords++;
            }
            
            if (sectionIndex >= 0 && row[sectionIndex]) {
                stats.sections.add(row[sectionIndex]);
            }
        });
        
        // Convert sets to arrays
        stats.sections = Array.from(stats.sections);
        
        return stats;
    }
}

// Auto-register this parser with the main text parser
if (typeof window !== 'undefined' && window.textParser) {
    window.textParser.registerParser('glb-balance', (content) => {
        const parser = new GLBParser();
        return parser.parse(content);
    });
    console.log('GLB Parser registered successfully');
}
