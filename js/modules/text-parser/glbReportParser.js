class GLBReportParser {
    constructor() {
        this.name = 'GLB Report Parser';
        this.description = 'Parser for General Ledger Balance Reports (Balance Sheet format)';
        this.supportedFiles = /^\d{8}_GLB$/; // YYYYMMDD_GLB format
    }

    canParse(filename, content) {
        return this.supportedFiles.test(filename) && 
               content.includes('GENERAL LEDGER BALANCE AT THE CLOSE OF BUSINESS') &&
               content.includes('LIABILITIES') &&
               content.includes('ASSETS');
    }

    parse(content) {
        const lines = content.split('\n');
        
        // Extract header information
        const headerInfo = this.extractHeaderInfo(lines);
        
        // Parse balance sheet data with special side-by-side handling
        const balanceSheetData = this.parseBalanceSheetSideBySide(lines);

        return {
            headers: [
                'Side',
                'Category',
                'Account Name',
                'Amount (₹)',
                'Type',
                'Level',
                'Amount Value'
            ],
            data: balanceSheetData.data,
            metadata: {
                ...headerInfo,
                totalRecords: balanceSheetData.data.length,
                totalLiabilities: balanceSheetData.totals.liabilities,
                totalAssets: balanceSheetData.totals.assets,
                balanceDifference: Math.abs(balanceSheetData.totals.assets - balanceSheetData.totals.liabilities),
                isBalanced: Math.abs(balanceSheetData.totals.assets - balanceSheetData.totals.liabilities) < 100,
                parser: this.name,
                displayMode: 'balance-sheet' // Special flag for custom display
            }
        };
    }

    extractHeaderInfo(lines) {
        const info = {};
        
        for (const line of lines.slice(0, 15)) {
            if (line.includes('CENTRAL BANK OF INDIA')) {
                info.bankName = 'CENTRAL BANK OF INDIA';
            } else if (line.includes('GENERAL LEDGER BALANCE AT THE CLOSE OF BUSINESS AS ON')) {
                const dateMatch = line.match(/AS ON\s+([\d/]+)/);
                if (dateMatch) info.reportDate = dateMatch[1];
            } else if (line.includes('Branch NO:') && line.includes('Region-ID:')) {
                const branchMatch = line.match(/Branch NO:(\d+)/);
                const regionMatch = line.match(/Region-ID:(\d+)/);
                const zoneMatch = line.match(/Zone-ID:(\d+)/);
                if (branchMatch) info.branchNumber = branchMatch[1];
                if (regionMatch) info.regionId = regionMatch[1];
                if (zoneMatch) info.zoneId = zoneMatch[1];
            } else if (line.includes('Branch Name:') && line.includes('Region-Name:')) {
                const branchNameMatch = line.match(/Branch Name:\s*\(([^)]+)\)/);
                const regionNameMatch = line.match(/Region-Name:\s*([^\\t]+?)\\s*Zone-Name:/);
                const zoneNameMatch = line.match(/Zone-Name:\s*(.+)/);
                if (branchNameMatch) info.branchName = branchNameMatch[1];
                if (regionNameMatch) info.regionName = regionNameMatch[1].trim();
                if (zoneNameMatch) info.zoneName = zoneNameMatch[1].trim();
            } else if (line.includes('Currency:')) {
                const currencyMatch = line.match(/Currency:\s*(\w+)/);
                if (currencyMatch) info.currency = currencyMatch[1];
            }
        }
        
        return info;
    }

    parseBalanceSheetSideBySide(lines) {
        const data = [];
        const totals = { liabilities: 0, assets: 0 };
        
        let inDataSection = false;
        let currentCategory = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Skip header lines and find start of data
            if (line.includes('='.repeat(20)) && line.includes('LIABILITIES') && line.includes('ASSETS')) {
                inDataSection = true;
                continue;
            }
            
            if (!inDataSection) continue;
            
            // Skip separator lines
            if (line.includes('='.repeat(20)) && !line.includes('LIABILITIES')) {
                continue;
            }
            
            // Parse the side-by-side format
            const parsed = this.parseSideBySideLine(line);
            if (parsed) {
                // Add liability entries
                if (parsed.liability) {
                    const entry = parsed.liability;
                    if (entry.accountName.match(/^\d+-/)) {
                        currentCategory = entry.accountName;
                    }
                    
                    data.push([
                        'LIABILITIES',
                        currentCategory,
                        entry.accountName,
                        entry.formattedAmount,
                        entry.type,
                        entry.level,
                        entry.amount
                    ]);
                    
                    if (entry.accountName.includes('GRAND TOTAL OF LIABILITIES')) {
                        totals.liabilities = entry.amount;
                    }
                }
                
                // Add asset entries
                if (parsed.asset) {
                    const entry = parsed.asset;
                    if (entry.accountName.match(/^\d+-/)) {
                        currentCategory = entry.accountName;
                    }
                    
                    data.push([
                        'ASSETS',
                        currentCategory,
                        entry.accountName,
                        entry.formattedAmount,
                        entry.type,
                        entry.level,
                        entry.amount
                    ]);
                    
                    if (entry.accountName.includes('GRAND TOTAL OF ASSETS')) {
                        totals.assets = entry.amount;
                    }
                }
            }
        }
        
        return { data, totals };
    }
    
    parseSideBySideLine(line) {
        if (!line || line.trim().length === 0) return null;
        
        // Split the line into columns based on the pipe separators
        const columns = line.split('|').map(col => col.trim());
        
        if (columns.length < 8) return null;
        
        const result = {};
        
        // Parse LIABILITY side (columns 0-3)
        const liabilityText = `${columns[0]}${columns[1]}${columns[2]}${columns[3]}`.trim();
        if (liabilityText && !liabilityText.includes('LIABILITIES') && !liabilityText.includes('=')) {
            const liabilityEntry = this.parseAccountEntry(liabilityText, 'LIABILITY');
            if (liabilityEntry) {
                result.liability = liabilityEntry;
            }
        }
        
        // Parse ASSET side (columns 4-7)
        const assetText = `${columns[4]}${columns[5]}${columns[6]}${columns[7]}`.trim();
        if (assetText && !assetText.includes('ASSETS') && !assetText.includes('=')) {
            const assetEntry = this.parseAccountEntry(assetText, 'ASSET');
            if (assetEntry) {
                result.asset = assetEntry;
            }
        }
        
        return Object.keys(result).length > 0 ? result : null;
    }
    
    parseAccountEntry(text, side) {
        if (!text || text.trim().length === 0) return null;
        
        // Look for amount patterns: numbers with commas followed by CR or DR
        const amountPattern = /([\d,]+\.?\d*)\s+(CR|DR)/;
        const match = text.match(amountPattern);
        
        if (!match) return null;
        
        const amountStr = match[1];
        const type = match[2];
        const amount = parseFloat(amountStr.replace(/,/g, ''));
        
        // Extract account name (everything before the amount)
        const amountIndex = text.indexOf(match[0]);
        let accountName = text.substring(0, amountIndex).trim();
        
        // Clean up account name
        accountName = accountName.replace(/\s+/g, ' ').trim();
        
        if (!accountName) return null;
        
        // Determine level based on account name
        let level = 1; // Regular account
        if (accountName.includes('TOTAL OF ') || accountName.includes('TOTAL ')) {
            level = 2; // Subtotal
        }
        if (accountName.includes('GRAND TOTAL')) {
            level = 3; // Grand total
        }
        if (accountName.match(/^\d+-/)) {
            level = 1; // Main category
        }
        if (!accountName.match(/^\d+-/) && !accountName.includes('TOTAL') && accountName.length > 0) {
            level = 2; // Sub-account
        }
        
        return {
            accountName,
            amount,
            formattedAmount: `₹${amountStr} ${type}`,
            type,
            level,
            side
        };
    }

    generateAnalysis(data) {
        const entries = data.data;
        const metadata = data.metadata;
        
        if (!entries || entries.length === 0) {
            return '<div class="analysis-section"><h4>No balance sheet data available for analysis</h4></div>';
        }

        // Separate liabilities and assets
        const liabilities = entries.filter(entry => entry[0] === 'LIABILITIES');
        const assets = entries.filter(entry => entry[0] === 'ASSETS');
        
        // Get major categories (level 1 - main categories)
        const majorLiabilityCategories = liabilities.filter(entry => entry[5] === 1 && entry[2].match(/^\d+-/));
        const majorAssetCategories = assets.filter(entry => entry[5] === 1 && entry[2].match(/^\d+-/));
        
        // Get totals
        const totalLiabilities = metadata.totalLiabilities || 0;
        const totalAssets = metadata.totalAssets || 0;
        const isBalanced = metadata.isBalanced;
        const balanceDiff = metadata.balanceDifference || 0;

        // Calculate major amounts for each side
        const topLiabilities = liabilities
            .filter(entry => entry[5] <= 2 && entry[6] > 1000) // Significant amounts
            .sort((a, b) => b[6] - a[6])
            .slice(0, 5);
            
        const topAssets = assets
            .filter(entry => entry[5] <= 2 && entry[6] > 1000) // Significant amounts
            .sort((a, b) => b[6] - a[6])
            .slice(0, 5);

        return `
            <div class="analysis-section">
                <h4>🏦 General Ledger Balance Sheet Analysis</h4>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <h5>🏢 Branch Information</h5>
                        <p><strong>Bank:</strong> ${metadata.bankName || 'Central Bank of India'}</p>
                        <p><strong>Branch:</strong> ${metadata.branchName || 'N/A'} (${metadata.branchNumber || 'N/A'})</p>
                        <p><strong>Region:</strong> ${metadata.regionName || 'N/A'}</p>
                        <p><strong>Zone:</strong> ${metadata.zoneName || 'N/A'}</p>
                        <p><strong>Report Date:</strong> ${metadata.reportDate || 'N/A'}</p>
                        <p><strong>Currency:</strong> ${metadata.currency || 'INR'}</p>
                    </div>
                    
                    <div class="stat-card">
                        <h5>⚖️ Balance Sheet Totals</h5>
                        <p><strong>Total Liabilities:</strong> <span style="color: #dc3545;">₹${totalLiabilities.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></p>
                        <p><strong>Total Assets:</strong> <span style="color: #28a745;">₹${totalAssets.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></p>
                        <p><strong>Balance Status:</strong> ${isBalanced ? 
                            '<span style="color: green;">✅ Balanced</span>' : 
                            '<span style="color: red;">⚠️ Imbalanced</span>'}</p>
                        ${!isBalanced ? `<p><strong>Difference:</strong> ₹${balanceDiff.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>` : ''}
                    </div>
                    
                    <div class="stat-card">
                        <h5>� Structure Summary</h5>
                        <p><strong>Total Entries:</strong> ${entries.length}</p>
                        <p><strong>Liability Items:</strong> ${liabilities.length}</p>
                        <p><strong>Asset Items:</strong> ${assets.length}</p>
                        <p><strong>Major Categories:</strong> ${majorLiabilityCategories.length + majorAssetCategories.length}</p>
                    </div>
                </div>
                
                <div class="balance-sheet-summary">
                    <div class="side-by-side-analysis">
                        <div class="liabilities-side">
                            <h5>📉 Major Liabilities</h5>
                            ${topLiabilities.length > 0 ? `
                                <ul>
                                    ${topLiabilities.map(entry => 
                                        `<li><strong>${entry[2]}</strong><br/>₹${entry[6].toLocaleString('en-IN', {minimumFractionDigits: 2})} ${entry[4]}</li>`
                                    ).join('')}
                                </ul>
                            ` : '<p>No significant liability entries found</p>'}
                        </div>
                        
                        <div class="assets-side">
                            <h5>📈 Major Assets</h5>
                            ${topAssets.length > 0 ? `
                                <ul>
                                    ${topAssets.map(entry => 
                                        `<li><strong>${entry[2]}</strong><br/>₹${entry[6].toLocaleString('en-IN', {minimumFractionDigits: 2})} ${entry[4]}</li>`
                                    ).join('')}
                                </ul>
                            ` : '<p>No significant asset entries found</p>'}
                        </div>
                    </div>
                </div>
                
                <div class="balance-sheet-insights">
                    <h5>💡 Key Insights</h5>
                    <div class="insights-grid">
                        ${this.generateBalanceSheetInsights(liabilities, assets, metadata)}
                    </div>
                </div>
            </div>
            
            <style>
                .balance-sheet-summary { margin: 20px 0; }
                .side-by-side-analysis { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 15px 0; }
                .liabilities-side, .assets-side { 
                    padding: 15px; 
                    border-radius: 8px; 
                    background: #f8f9fa;
                }
                .liabilities-side { border-left: 4px solid #dc3545; }
                .assets-side { border-left: 4px solid #28a745; }
                .liabilities-side ul li, .assets-side ul li { 
                    margin: 10px 0; 
                    padding: 8px; 
                    background: white; 
                    border-radius: 4px; 
                    font-size: 0.9em;
                }
                .insights-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
                .insight-item { 
                    padding: 10px; 
                    background: #e3f2fd; 
                    border-radius: 6px; 
                    border-left: 3px solid #2196f3;
                    font-size: 0.9em;
                }
            </style>
        `;
    }
    
    generateBalanceSheetInsights(liabilities, assets, metadata) {
        const insights = [];
        
        // Find deposits
        const deposits = liabilities.filter(l => l[2].includes('DEPOSIT'));
        if (deposits.length > 0) {
            const totalDeposits = deposits.reduce((sum, d) => sum + d[6], 0);
            insights.push(`<div class="insight-item">💰 Total Deposits: ₹${totalDeposits.toLocaleString('en-IN')}</div>`);
        }
        
        // Find advances/loans
        const advances = assets.filter(a => a[2].includes('ADVANCE') || a[2].includes('LOAN'));
        if (advances.length > 0) {
            const totalAdvances = advances.reduce((sum, a) => sum + a[6], 0);
            insights.push(`<div class="insight-item">🏦 Total Advances: ₹${totalAdvances.toLocaleString('en-IN')}</div>`);
        }
        
        // Find cash
        const cash = assets.filter(a => a[2].includes('CASH'));
        if (cash.length > 0) {
            const totalCash = cash.reduce((sum, c) => sum + c[6], 0);
            insights.push(`<div class="insight-item">💵 Cash Position: ₹${totalCash.toLocaleString('en-IN')}</div>`);
        }
        
        // Balance check
        if (metadata.isBalanced) {
            insights.push(`<div class="insight-item">✅ Balance sheet is properly balanced</div>`);
        } else {
            insights.push(`<div class="insight-item">⚠️ Balance sheet has variance of ₹${metadata.balanceDifference.toLocaleString('en-IN')}</div>`);
        }
        
        return insights.join('');
    }
}

// Register the parser
if (typeof window !== 'undefined' && window.TextParser) {
    window.TextParser.registerParser(new GLBReportParser());
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GLBReportParser;
}
