class BGLAccountsParser {
    constructor() {
        this.name = 'BGL Accounts Parser';
        this.description = 'Parser for BGL (Bank General Ledger) Account Balance Reports';
        this.supportedFiles = /BGL_Accounts_With_Non_Zero_Balance.*\.txt$/i;
    }

    canParse(filename, content) {
        return this.supportedFiles.test(filename) && 
               content.includes('BGL (NON ZERO) ACCOUNT BALANCES REPORT') &&
               content.includes('BGL-ACCT-NO') &&
               content.includes('BALANCE');
    }

    parse(content) {
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);
        
        // Extract header information
        const headerInfo = this.extractHeaderInfo(lines);
        
        // Find data section
        const dataStartIndex = lines.findIndex(line => line.includes('BGL-ACCT-NO') && line.includes('BALANCE'));
        if (dataStartIndex === -1) {
            throw new Error('Could not find data section in BGL report');
        }

        // Parse account records
        const accounts = [];
        let currentSection = 'UNKNOWN';
        
        for (let i = dataStartIndex + 2; i < lines.length; i++) {
            const line = lines[i];
            
            // Skip separator lines
            if (line.includes('='.repeat(10)) || line.includes('-'.repeat(10))) {
                continue;
            }
            
            // Detect section headers
            if (line.includes('NOMINAL ACCOUNTS')) {
                currentSection = 'NOMINAL ACCOUNTS';
                continue;
            } else if (line.includes('PROFIT & LOSS ACCOUNTS')) {
                currentSection = 'PROFIT & LOSS ACCOUNTS';
                continue;
            }
            
            // Parse account data line
            const account = this.parseAccountLine(line, currentSection);
            if (account) {
                accounts.push(account);
            }
        }

        return {
            headers: [
                'Section',
                'Account Number',
                'GL Class Code',
                'Product Code',
                'Product Category',
                'Ledger Name',
                'Currency',
                'Balance Amount',
                'Balance Type',
                'Absolute Balance'
            ],
            data: accounts.map(acc => [
                acc.section,
                acc.accountNumber,
                acc.glClassCode,
                acc.productCode,
                acc.productCategory,
                acc.ledgerName,
                acc.currency,
                acc.balanceAmount,
                acc.balanceType,
                acc.absoluteBalance
            ]),
            metadata: {
                ...headerInfo,
                totalRecords: accounts.length,
                nominalAccounts: accounts.filter(acc => acc.section === 'NOMINAL ACCOUNTS').length,
                profitLossAccounts: accounts.filter(acc => acc.section === 'PROFIT & LOSS ACCOUNTS').length,
                totalDebitBalance: this.calculateTotalBalance(accounts, 'DR'),
                totalCreditBalance: this.calculateTotalBalance(accounts, 'CR'),
                parser: this.name
            }
        };
    }

    extractHeaderInfo(lines) {
        const info = {};
        
        for (const line of lines.slice(0, 10)) {
            if (line.includes('CENTRAL BANK OF INDIA')) {
                info.bankName = 'CENTRAL BANK OF INDIA';
            } else if (line.includes('REPORT ID') && line.includes('RUN DATE')) {
                const reportMatch = line.match(/REPORT ID\s*:\s*(\w+)/);
                const runDateMatch = line.match(/RUN DATE\s*:\s*([\d/]+)/);
                if (reportMatch) info.reportId = reportMatch[1];
                if (runDateMatch) info.runDate = runDateMatch[1];
            } else if (line.includes('BRANCH-NO') && line.includes('PROC DATE')) {
                const branchMatch = line.match(/BRANCH-NO\s*:\s*(\d+)/);
                const procDateMatch = line.match(/PROC DATE:\s*([\d/]+)/);
                if (branchMatch) info.branchNumber = branchMatch[1];
                if (procDateMatch) info.processingDate = procDateMatch[1];
            } else if (line.includes('BRANCH NAME')) {
                const branchNameMatch = line.match(/BRANCH NAME\s*:\s*(.+)/);
                if (branchNameMatch) info.branchName = branchNameMatch[1].trim();
            } else if (line.includes('AS AT THE END OF')) {
                const dateMatch = line.match(/AS AT THE END OF\s*([\d/]+)/);
                if (dateMatch) info.reportDate = dateMatch[1];
            }
        }
        
        return info;
    }

    parseAccountLine(line, section) {
        if (!line || line.length < 50) return null;
        
        // Enhanced regex to handle the fixed-width format
        const accountRegex = /^(\d{13})\s+(\d{10})\s+(\d{4})\s+(\d{4})\s+(.{40,45})\s+(\w{3})\s+([\d,]+\.?\d*)\s+(DR|CR)\s*$/;
        const match = line.match(accountRegex);
        
        if (match) {
            const [, accountNumber, glClassCode, productCode, productCategory, ledgerName, currency, balanceStr, balanceType] = match;
            
            // Clean up balance amount
            const cleanBalance = balanceStr.replace(/,/g, '');
            const balanceAmount = parseFloat(cleanBalance);
            
            return {
                section,
                accountNumber: accountNumber.trim(),
                glClassCode: glClassCode.trim(),
                productCode: productCode.trim(),
                productCategory: productCategory.trim(),
                ledgerName: ledgerName.trim(),
                currency: currency.trim(),
                balanceAmount: `${balanceStr} ${balanceType}`,
                balanceType: balanceType.trim(),
                absoluteBalance: balanceAmount
            };
        }
        
        return null;
    }

    calculateTotalBalance(accounts, type) {
        return accounts
            .filter(acc => acc.balanceType === type)
            .reduce((sum, acc) => sum + acc.absoluteBalance, 0);
    }

    generateAnalysis(data) {
        const accounts = data.data;
        const metadata = data.metadata;
        
        if (!accounts || accounts.length === 0) {
            return '<div class="analysis-section"><h4>No accounts data available for analysis</h4></div>';
        }

        // Group by section
        const nominalAccounts = accounts.filter(acc => acc[0] === 'NOMINAL ACCOUNTS');
        const plAccounts = accounts.filter(acc => acc[0] === 'PROFIT & LOSS ACCOUNTS');
        
        // Balance analysis
        const totalDR = metadata.totalDebitBalance || 0;
        const totalCR = metadata.totalCreditBalance || 0;
        const netPosition = totalCR - totalDR;
        
        // Top accounts by balance
        const topDebitAccounts = accounts
            .filter(acc => acc[8] === 'DR')
            .sort((a, b) => b[9] - a[9])
            .slice(0, 5);
            
        const topCreditAccounts = accounts
            .filter(acc => acc[8] === 'CR')
            .sort((a, b) => b[9] - a[9])
            .slice(0, 5);

        return `
            <div class="analysis-section">
                <h4>📊 BGL Account Balance Analysis</h4>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <h5>📋 Report Summary</h5>
                        <p><strong>Bank:</strong> ${metadata.bankName || 'N/A'}</p>
                        <p><strong>Branch:</strong> ${metadata.branchName || 'N/A'} (${metadata.branchNumber || 'N/A'})</p>
                        <p><strong>Report Date:</strong> ${metadata.reportDate || 'N/A'}</p>
                        <p><strong>Run Date:</strong> ${metadata.runDate || 'N/A'}</p>
                    </div>
                    
                    <div class="stat-card">
                        <h5>📈 Account Distribution</h5>
                        <p><strong>Total Accounts:</strong> ${accounts.length}</p>
                        <p><strong>Nominal Accounts:</strong> ${nominalAccounts.length}</p>
                        <p><strong>P&L Accounts:</strong> ${plAccounts.length}</p>
                    </div>
                    
                    <div class="stat-card">
                        <h5>💰 Balance Summary</h5>
                        <p><strong>Total Debit:</strong> ₹${totalDR.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                        <p><strong>Total Credit:</strong> ₹${totalCR.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                        <p><strong>Net Position:</strong> <span style="color: ${netPosition >= 0 ? 'green' : 'red'}">₹${Math.abs(netPosition).toLocaleString('en-IN', {minimumFractionDigits: 2})} ${netPosition >= 0 ? 'CR' : 'DR'}</span></p>
                    </div>
                </div>
                
                ${topDebitAccounts.length > 0 ? `
                <div class="top-accounts">
                    <h5>🔴 Top 5 Debit Balances</h5>
                    <ul>
                        ${topDebitAccounts.map(acc => 
                            `<li><strong>${acc[1]}</strong> - ${acc[5]} - ₹${acc[9].toLocaleString('en-IN', {minimumFractionDigits: 2})}</li>`
                        ).join('')}
                    </ul>
                </div>
                ` : ''}
                
                ${topCreditAccounts.length > 0 ? `
                <div class="top-accounts">
                    <h5>🟢 Top 5 Credit Balances</h5>
                    <ul>
                        ${topCreditAccounts.map(acc => 
                            `<li><strong>${acc[1]}</strong> - ${acc[5]} - ₹${acc[9].toLocaleString('en-IN', {minimumFractionDigits: 2})}</li>`
                        ).join('')}
                    </ul>
                </div>
                ` : ''}
            </div>
        `;
    }
}

// Register the parser
if (typeof window !== 'undefined' && window.TextParser) {
    window.TextParser.registerParser(new BGLAccountsParser());
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BGLAccountsParser;
}
