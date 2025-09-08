// DOCX Replace Library
const DocxReplace = (function() {
    async function load(buffer) {
        const zip = await JSZip.loadAsync(buffer);
        let documentXml = await zip.file('word/document.xml').async('text'); // Changed to let
        
        return {
            getBookmarks: function() {
                // Parse bookmarks from document.xml
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(documentXml, 'text/xml');
                const bookmarks = Array.from(xmlDoc.getElementsByTagName('w:bookmarkStart'))
                    .map(bm => bm.getAttribute('w:name'))
                    .filter((value, index, self) => self.indexOf(value) === index) // Unique values
                    .filter(name => {
                        // Filter out system bookmarks like _GoBack, _Toc*, _Ref*, etc.
                        const systemBookmarks = ['_GoBack', '_top', '_bottom'];
                        const systemPrefixes = ['_Toc', '_Ref', '_Hlk', 'OLE_LINK', 'BM_'];
                        
                        if (!name || systemBookmarks.includes(name)) return false;
                        if (systemPrefixes.some(prefix => name.startsWith(prefix))) return false;
                        if (name.startsWith('_') && /^_[0-9]+$/.test(name)) return false;
                        
                        return true;
                    });
                return bookmarks;
            },
            
            // Basic placeholder detection method
            getPlaceholders: function() {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(documentXml, 'text/xml');
                
                // Get bookmarks (excluding system bookmarks)
                const bookmarks = this.getBookmarks();
                
                // Get text-based placeholders
                const textElements = xmlDoc.getElementsByTagName('w:t');
                const placeholders = new Set();
                
                
                
                
                // Combine all text content to handle split placeholders
                let allTextContent = '';
                for (let i = 0; i < textElements.length; i++) {
                    allTextContent += textElements[i].textContent;
                }
                
                // Also try to extract from paragraph elements to catch more text
                const paragraphElements = xmlDoc.getElementsByTagName('w:p');
                let paragraphText = '';
                for (let i = 0; i < paragraphElements.length; i++) {
                    paragraphText += paragraphElements[i].textContent + ' ';
                }
                
                // Combine both extraction methods
                const combinedText = allTextContent + ' ' + paragraphText;
                
                console.log(`📄 Text elements found: ${textElements.length}`);
                console.log(`📄 Paragraph elements found: ${paragraphElements.length}`);
                console.log(`📄 Combined text content:`, combinedText.substring(0, 800) + '...');
                console.log(`🔍 Searching for placeholders with pattern: ${placeholderPattern}`);
                
                // Test for M/s specifically
                if (combinedText.includes('M/s') || combinedText.includes('{M/s}')) {
                    console.log(`🎯 M/s found in document text!`);
                    console.log(`📍 Text around M/s:`, combinedText.match(/.{0,50}M\/s.{0,50}/g));
                }
                
                
                
                // Enhanced placeholder patterns - focus on single curly braces
                const placeholderPattern = /\{([^{}]+)\}/gi;
                
                let match;
                placeholderPattern.lastIndex = 0;
                
                while ((match = placeholderPattern.exec(combinedText)) !== null) {
                    const placeholder = match[1].trim();
                    
                    console.log(`🔍 Found potential placeholder: "${placeholder}"`);
                    
                    // Basic validation
                    if (placeholder.length > 0 && placeholder.length <= 100) {
                        // Allow letters, numbers, underscores, hyphens, dots, spaces, forward slashes, and Unicode characters
                        const validPattern = /^[\w\-./\s\u0900-\u097F\u0080-\u024F\u1E00-\u1EFF]+$/u;
                        const hasLetter = /[\p{L}]/u.test(placeholder);
                        
                        console.log(`📝 Validating "${placeholder}": pattern=${validPattern.test(placeholder)}, hasLetter=${hasLetter}`);
                        
                        if (validPattern.test(placeholder) && hasLetter) {
                            placeholders.add(placeholder);
                            console.log(`✅ Added placeholder: "${placeholder}"`);
                        } else {
                            console.log(`❌ Rejected placeholder: "${placeholder}" - Pattern: ${validPattern.test(placeholder)}, HasLetter: ${hasLetter}`);
                        }
                    } else {
                        console.log(`❌ Placeholder too long/short: "${placeholder}" (length: ${placeholder.length})`);
                    }
                }
                
                console.log(`📊 Final placeholder count: ${placeholders.size}`);
                console.log(`📋 Final placeholders:`, Array.from(placeholders));
                
                // Test the validation pattern with M/s specifically
                const testMsPattern = /^[\w\-./\s\u0900-\u097F\u0080-\u024F\u1E00-\u1EFF]+$/u;
                console.log(`🧪 Testing "M/s" validation: ${testMsPattern.test('M/s')}`);
                console.log(`🧪 Testing "M/s" has letter: ${/[\p{L}]/u.test('M/s')}`);
                
                
                
                return {
                    bookmarks: bookmarks,
                    placeholders: Array.from(placeholders),
                    placeholderInfo: {}
                };
            },
            
            replaceBookmarks: function(replacements) {
                // Parse the XML document
                const parser = new DOMParser();
                const serializer = new XMLSerializer();
                const xmlDoc = parser.parseFromString(documentXml, 'text/xml');
                
                // Process each replacement
                for (const bookmark in replacements) {
                    if (replacements.hasOwnProperty(bookmark)) {
                        // Find all bookmarkStart elements with this name
                        const bookmarkStarts = xmlDoc.getElementsByTagName('w:bookmarkStart');
                        for (let i = 0; i < bookmarkStarts.length; i++) {
                            const bmStart = bookmarkStarts[i];
                            if (bmStart.getAttribute('w:name') === bookmark) {
                                // Find the corresponding bookmarkEnd
                                const id = bmStart.getAttribute('w:id');
                                let bmEnd = null;
                                const ends = xmlDoc.getElementsByTagName('w:bookmarkEnd');
                                
                                for (let j = 0; j < ends.length; j++) {
                                    if (ends[j].getAttribute('w:id') === id) {
                                        bmEnd = ends[j];
                                        break;
                                    }
                                }
                                
                                if (bmEnd) {
                                    // Create a new text node with the replacement content
                                    const newText = xmlDoc.createElement('w:t');
                                    newText.textContent = replacements[bookmark];
                                    
                                    const newRun = xmlDoc.createElement('w:r');
                                    newRun.appendChild(newText);
                                    
                                    // Replace everything between bookmarkStart and bookmarkEnd
                                    let currentNode = bmStart.nextSibling;
                                    while (currentNode && currentNode !== bmEnd) {
                                        const nextNode = currentNode.nextSibling;
                                        currentNode.parentNode.removeChild(currentNode);
                                        currentNode = nextNode;
                                    }
                                    
                                    // Insert our new content
                                    bmStart.parentNode.insertBefore(newRun, bmEnd);
                                }
                            }
                        }
                    }
                }
                
                // Update the documentXml with modified content
                documentXml = serializer.serializeToString(xmlDoc);
            },
            
            // Enhanced placeholder replacement method with formatting preservation
            replacePlaceholders: function(replacements) {
                const parser = new DOMParser();
                const serializer = new XMLSerializer();
                const xmlDoc = parser.parseFromString(documentXml, 'text/xml');
                
                
                
                // Find all text elements
                const textElements = xmlDoc.getElementsByTagName('w:t');
                let totalReplacements = 0;
                
                for (let i = 0; i < textElements.length; i++) {
                    const textElement = textElements[i];
                    let textContent = textElement.textContent;
                    let modified = false;
                    
                    // Replace placeholders for single curly brace pattern
                    for (const placeholder in replacements) {
                        if (replacements.hasOwnProperty(placeholder)) {
                            const value = String(replacements[placeholder] || '');
                            const pattern = new RegExp(`\\{\\s*${this.escapeRegex(placeholder)}\\s*\\}`, 'gi');
                            const matches = textContent.match(pattern);
                            
                            if (matches) {
                                
                                
                                const oldContent = textContent;
                                textContent = textContent.replace(pattern, value);
                                
                                if (oldContent !== textContent) {
                                    modified = true;
                                    totalReplacements += matches.length;
                                    
                                }
                            }
                        }
                    }
                    
                    // Update the text content while preserving element structure
                    if (modified) {
                        // Preserve any xml:space attributes and other properties
                        const preserveSpace = textElement.getAttribute('xml:space');
                        
                        // Clear and update content
                        while (textElement.firstChild) {
                            textElement.removeChild(textElement.firstChild);
                        }
                        
                        const textNode = textElement.ownerDocument.createTextNode(textContent);
                        textElement.appendChild(textNode);
                        
                        // Restore space preservation if it existed
                        if (preserveSpace) {
                            textElement.setAttribute('xml:space', preserveSpace);
                        }
                        
                        
                    }
                }
                
                
                
                // Update the documentXml with modified content
                documentXml = serializer.serializeToString(xmlDoc);
            },
            
            // Helper function to escape special regex characters
            escapeRegex: function(string) {
                return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            },
            
            // Combined method to replace both bookmarks and placeholders
            replaceAll: function(replacements) {
                this.replaceBookmarks(replacements);
                this.replacePlaceholders(replacements);
            },
            
            generate: async function() {
                // Update the zip with modified content
                zip.file('word/document.xml', documentXml);
                
                // Generate the new DOCX
                return await zip.generateAsync({ type: 'arraybuffer' });
            }
        };
    }
    
    return {
        load: load
    };
})();
