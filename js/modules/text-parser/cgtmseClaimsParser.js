/**
 * CGTMSE Claims Parser
 * Handles BRANCHWISE_CGTMSE_CLAIM_LODGED_TO_PORTAL_VIA_API_AND_ACCEPTED files
 * 
 * File Format:
 * - Pipe-delimited (|) format
 * - Single header row with column names
 * - Contains detailed CGTMSE (Credit Guarantee Fund Trust for Micro and Small Enterprises) claims data
 * - Includes borrower details, loan information, guarantee details, and application status
 */

function parseCGTMSEClaims(content) {
    console.log('Starting CGTMSE Claims parsing...');
    
    try {
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            throw new Error('File must contain at least a header row and one data row');
        }
        
        // Extract headers from first line
        const headers = lines[0].split('|').map(header => header.trim());
        console.log(`Found ${headers.length} columns:`, headers);
        
        // Parse data rows
        const data = [];
        const parseErrors = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            try {
                const values = line.split('|').map(value => value.trim());
                
                if (values.length !== headers.length) {
                    parseErrors.push(`Row ${i + 1}: Expected ${headers.length} columns, got ${values.length}`);
                    continue;
                }
                
                const row = {};
                headers.forEach((header, index) => {
                    let value = values[index];
                    
                    // Clean and format specific data types
                    if (header.includes('DATE') || header.includes('TIME')) {
                        // Handle date/time fields
                        if (value && value !== '') {
                            row[header] = value;
                        } else {
                            row[header] = '';
                        }
                    } else if (header.includes('AMT') || header.includes('AMOUNT') || 
                               header.includes('RATIO') || header.includes('SCORE') ||
                               header.includes('INCOME') || header.includes('WORTH') ||
                               header.includes('ASSET') || header.includes('CAPTL') ||
                               header.includes('SURPLUS') || header.includes('LIBI')) {
                        // Handle numeric/financial fields
                        if (value && value !== '' && !isNaN(value.replace(/,/g, ''))) {
                            row[header] = parseFloat(value.replace(/,/g, '')) || 0;
                        } else {
                            row[header] = value || '';
                        }
                    } else {
                        // Handle text fields
                        row[header] = value || '';
                    }
                });
                
                data.push(row);
                
            } catch (rowError) {
                parseErrors.push(`Row ${i + 1}: ${rowError.message}`);
                console.error(`Error parsing row ${i + 1}:`, rowError);
            }
        }
        
        if (parseErrors.length > 0) {
            console.warn(`Parsing completed with ${parseErrors.length} errors:`, parseErrors);
        }
        
        console.log(`Successfully parsed ${data.length} CGTMSE claims records`);
        
        return {
            success: true,
            data: data,
            headers: headers,
            summary: {
                totalRecords: data.length,
                parseErrors: parseErrors.length > 0 ? parseErrors : null,
                fileType: 'CGTMSE Claims Report',
                columns: headers.length
            }
        };
        
    } catch (error) {
        console.error('CGTMSE Claims parsing failed:', error);
        return {
            success: false,
            error: error.message,
            data: [],
            headers: []
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseCGTMSEClaims };
}

// Make available globally
if (typeof window !== 'undefined') {
    window.parseCGTMSEClaims = parseCGTMSEClaims;
}
