// DOCX Replace Library Enhancement
// Extend existing DocxReplace with additional methods
(function() {
    if (typeof DocxReplace === 'undefined') {
        
        return;
    }

    // Store the original load function
    const originalLoad = DocxReplace.load;
    
    // Override the load function to add enhanced methods
    DocxReplace.load = async function(buffer) {
        const zip = await JSZip.loadAsync(buffer);
        let documentXml = await zip.file('word/document.xml').async('text');
        
        // Get the base object from original load
        const baseDoc = await originalLoad(buffer);
        
        // Add enhanced methods to the base object
        return Object.assign(baseDoc, {
            getBookmarks: function() {
                // Parse bookmarks from document.xml
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(documentXml, 'text/xml');
                const bookmarks = Array.from(xmlDoc.getElementsByTagName('w:bookmarkStart'))
                    .map(bm => bm.getAttribute('w:name'))
                    .filter((value, index, self) => self.indexOf(value) === index) // Unique values
                    .filter(name => !this.isSystemBookmark(name)); // Filter out system bookmarks
                return bookmarks;
            },
            
            // Enhanced method to get all placeholders (both bookmarks and multiple bracket styles)
            getPlaceholders: function() {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(documentXml, 'text/xml');
                
                // Get bookmarks (excluding system bookmarks)
                const bookmarks = Array.from(xmlDoc.getElementsByTagName('w:bookmarkStart'))
                    .map(bm => bm.getAttribute('w:name'))
                    .filter((value, index, self) => self.indexOf(value) === index)
                    .filter(name => !this.isSystemBookmark(name)); // Filter out system bookmarks
                
                // Enhanced placeholder patterns - supports multiple bracket styles
                const placeholderPatterns = [
                    { pattern: /\{\{([^}]+)\}\}/gi, name: 'double-curly' },      // {{variable}}
                    { pattern: /<<([^>]+)>>/gi, name: 'double-angle' },          // <<variable>>
                    { pattern: /<([^<>]+)>/gi, name: 'single-angle' },           // <variable>
                    { pattern: /\{([^{}]+)\}/gi, name: 'single-curly' },         // {variable}
                    { pattern: /\[([^\[\]]+)\]/gi, name: 'single-square' },      // [variable]
                    { pattern: /\[\[([^\[\]]+)\]\]/gi, name: 'double-square' },  // [[variable]]
                    { pattern: /\(\(([^)]+)\)\)/gi, name: 'double-paren' },      // ((variable))
                    { pattern: /\$\{([^}]+)\}/gi, name: 'dollar-curly' },        // ${variable}
                    { pattern: /#\{([^}]+)\}/gi, name: 'hash-curly' },           // #{variable}
                    { pattern: /%([^%\s]+)%/gi, name: 'percent' },               // %variable%
                    { pattern: /\|([^|\s]+)\|/gi, name: 'pipe' },                // |variable|
                    { pattern: /~([^~\s]+)~/gi, name: 'tilde' }                  // ~variable~
                ];
                
                const textElements = xmlDoc.getElementsByTagName('w:t');
                const placeholders = new Set();
                const placeholderInfo = new Map(); // Store pattern info for each placeholder
                

                
                // Method 1: Check individual elements (for simple cases)
                for (let i = 0; i < textElements.length; i++) {
                    const textContent = textElements[i].textContent;
                    
                    if (textContent.includes('{') || textContent.includes('[') || textContent.includes('<')) {
                        // Debug: examining text element
                    }
                    
                    // Test each pattern
                    placeholderPatterns.forEach(({ pattern, name }) => {
                        // Reset regex lastIndex to avoid issues with global flag
                        pattern.lastIndex = 0;
                        let match;
                        
                        while ((match = pattern.exec(textContent)) !== null) {
                            const placeholder = match[1].trim();
                            
                            
                            
                            // Skip empty placeholders
                            if (placeholder.length === 0) {
                                
                                continue;
                            }
                            
                            // Skip if it looks like HTML/XML tags for single angle brackets
                            if (name === 'single-angle' && this.isLikelyHTMLTag(placeholder)) {
                                
                                continue;
                            }
                            
                            // Skip if it contains special characters that don't make sense for variables
                            if (this.isValidPlaceholderName(placeholder)) {
                                placeholders.add(placeholder);
                                placeholderInfo.set(placeholder, {
                                    pattern: name,
                                    fullMatch: match[0],
                                    source: 'individual-element',
                                    elementIndex: i
                                });
                                
                                
                            } else {
                                
                            }
                        }
                    });
                }
                
                // Method 2: Combine all text and check for split placeholders
                
                let allTextContent = '';
                for (let i = 0; i < textElements.length; i++) {
                    allTextContent += textElements[i].textContent;
                }
                
                
                
                
                // Check combined text for placeholders that might have been split
                placeholderPatterns.forEach(({ pattern, name }) => {
                    pattern.lastIndex = 0;
                    let match;
                    
                    while ((match = pattern.exec(allTextContent)) !== null) {
                        const placeholder = match[1].trim();
                        
                        // Only process if not already found in individual elements
                        if (!placeholders.has(placeholder)) {
                            
                            
                            if (placeholder.length > 0 && 
                                (name !== 'single-angle' || !this.isLikelyHTMLTag(placeholder)) &&
                                this.isValidPlaceholderName(placeholder)) {
                                
                                placeholders.add(placeholder);
                                placeholderInfo.set(placeholder, {
                                    pattern: name,
                                    fullMatch: match[0],
                                    source: 'combined-text'
                                });
                                
                                
                            }
                        } else {
                            
                        }
                    }
                });
                
                
                
                return {
                    bookmarks: bookmarks,
                    placeholders: Array.from(placeholders),
                    placeholderInfo: Object.fromEntries(placeholderInfo)
                };
            },
            
            // Helper function to check if placeholder name is valid
            isValidPlaceholderName: function(name) {
                // Allow letters, numbers, underscores, hyphens, dots, spaces, and Unicode characters (for Hindi/other languages)
                const validPattern = /^[\w\-.\s\u0900-\u097F\u0080-\u024F\u1E00-\u1EFF]+$/u;
                
                // Reject if it contains only numbers or special chars
                const hasLetter = /[\p{L}]/u.test(name);
                
                // Reject common false positives
                const falsePositives = ['div', 'span', 'br', 'hr', 'img', 'a', 'p', 'h1', 'h2', 'h3', 'table', 'tr', 'td'];
                
                // More lenient validation for placeholder names
                return validPattern.test(name) && 
                       hasLetter && 
                       name.length >= 1 && 
                       name.length <= 100 &&
                       !falsePositives.includes(name.toLowerCase().trim());
            },
            
            // Helper function to identify system-generated bookmarks that should be filtered out
            isSystemBookmark: function(bookmarkName) {
                if (!bookmarkName) return true;
                
                // Common system bookmarks that Word generates automatically
                const systemBookmarks = [
                    '_GoBack',           // Auto-generated by Word when cursor moves
                    '_Toc',              // Table of contents bookmarks (starts with _Toc)
                    '_Ref',              // Reference bookmarks (starts with _Ref)
                    '_Hlk',              // Hyperlink bookmarks (starts with _Hlk)
                    'OLE_LINK',          // OLE object links (starts with OLE_LINK)
                    '_top',              // Document top bookmark
                    '_bottom',           // Document bottom bookmark
                    'BM_',               // Some system bookmarks start with BM_
                    'RANGE',             // Range bookmarks
                    'CITATION',          // Citation bookmarks
                    'BIBLIOGRAPHY'       // Bibliography bookmarks
                ];
                
                const name = bookmarkName.toString().trim();
                
                // Check for exact matches
                if (systemBookmarks.includes(name)) {
                    
                    return true;
                }
                
                // Check for prefix matches (bookmarks starting with system prefixes)
                const systemPrefixes = ['_Toc', '_Ref', '_Hlk', 'OLE_LINK', 'BM_'];
                if (systemPrefixes.some(prefix => name.startsWith(prefix))) {
                    
                    return true;
                }
                
                // Check for bookmarks that are likely auto-generated (contain only numbers after underscore)
                if (name.startsWith('_') && /^_[0-9]+$/.test(name)) {
                    
                    return true;
                }
                
                // Check for empty or very short names that are likely system-generated
                if (name.length === 0 || (name.length <= 2 && name.startsWith('_'))) {
                    
                    return true;
                }
                
                return false;
            },
            
            // Helper function to detect likely HTML tags
            isLikelyHTMLTag: function(content) {
                const htmlTags = [
                    'div', 'span', 'p', 'a', 'img', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                    'table', 'tr', 'td', 'th', 'tbody', 'thead', 'ul', 'ol', 'li', 'form', 'input',
                    'button', 'select', 'option', 'textarea', 'label', 'fieldset', 'legend'
                ];
                
                // Check if it starts with HTML tag name
                const tagMatch = content.toLowerCase().match(/^\/?\s*([a-z]+)/);
                if (tagMatch && htmlTags.includes(tagMatch[1])) {
                    return true;
                }
                
                // Check for attributes (contains = or quotes)
                if (content.includes('=') || content.includes('"') || content.includes("'")) {
                    return true;
                }
                
                return false;
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
                                    
                                    // Replace everything between bookmarkStart and bookmarkEnd when they share the same parent
                                    if (bmStart.parentNode === bmEnd.parentNode) {
                                        let currentNode = bmStart.nextSibling;
                                        while (currentNode && currentNode !== bmEnd) {
                                            const nextNode = currentNode.nextSibling;
                                            if (currentNode.parentNode) {
                                                currentNode.parentNode.removeChild(currentNode);
                                            }
                                            currentNode = nextNode;
                                        }
                                        // Insert new content before bmEnd under the shared parent
                                        bmEnd.parentNode.insertBefore(newRun, bmEnd);
                                    } else {
                                        // Different parents: avoid DOMException by inserting under bmEnd's parent
                                        // Note: We don't remove content across parents to avoid breaking structure
                                        if (bmEnd.parentNode) {
                                            bmEnd.parentNode.insertBefore(newRun, bmEnd);
                                        } else if (bmStart.parentNode) {
                                            // Fallback: insert after bmStart if bmEnd has no parent (shouldn't happen)
                                            bmStart.parentNode.insertBefore(newRun, bmStart.nextSibling);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Update the documentXml with modified content
                documentXml = serializer.serializeToString(xmlDoc);
            },
            
            // Enhanced method to replace multiple bracket style placeholders while preserving formatting
            replacePlaceholders: function(replacements) {
                const parser = new DOMParser();
                const serializer = new XMLSerializer();
                const xmlDoc = parser.parseFromString(documentXml, 'text/xml');
                
                
                
                // Method 1: Format-preserving replacement in individual text elements
                const textElements = xmlDoc.getElementsByTagName('w:t');
                let totalReplacements = 0;
                
                for (let i = 0; i < textElements.length; i++) {
                    const textElement = textElements[i];
                    let textContent = textElement.textContent;
                    let modified = false;
                    
                    // Replace placeholders for each pattern style (same patterns as detection)
                    const placeholderPatterns = [
                        { pattern: /\{\{([^}]+)\}\}/gi, name: 'double-curly' },      // {{variable}}
                        { pattern: /<<([^>]+)>>/gi, name: 'double-angle' },          // <<variable>>
                        { pattern: /<([^<>]+)>/gi, name: 'single-angle' },           // <variable>
                        { pattern: /\{([^{}]+)\}/gi, name: 'single-curly' },         // {variable}
                        { pattern: /\[([^\[\]]+)\]/gi, name: 'single-square' },      // [variable]
                        { pattern: /\[\[([^\[\]]+)\]\]/gi, name: 'double-square' }   // [[variable]]
                    ];

                    for (const placeholder in replacements) {
                        if (replacements.hasOwnProperty(placeholder)) {
                            const value = String(replacements[placeholder] || '');
                            
                            // Try all patterns to find and replace the placeholder
                            placeholderPatterns.forEach(({ pattern, name }) => {
                                // Create specific pattern for this placeholder
                                const placeholderPattern = new RegExp(
                                    pattern.source.replace('([^}]+)', `\\s*${this.escapeRegex(placeholder)}\\s*`)
                                                  .replace('([^>]+)', `\\s*${this.escapeRegex(placeholder)}\\s*`)
                                                  .replace('([^<>]+)', `\\s*${this.escapeRegex(placeholder)}\\s*`)
                                                  .replace('([^{}]+)', `\\s*${this.escapeRegex(placeholder)}\\s*`)
                                                  .replace('([^\\[\\]]+)', `\\s*${this.escapeRegex(placeholder)}\\s*`),
                                    'gi'
                                );
                                
                                const matches = textContent.match(placeholderPattern);
                                if (matches) {
                                    const oldContent = textContent;
                                    textContent = textContent.replace(placeholderPattern, value);
                                    
                                    if (oldContent !== textContent) {
                                        modified = true;
                                        totalReplacements += matches.length;
                                    }
                                }
                            });
                        }
                    }
                    
                    // Update text content while preserving XML structure
                    if (modified) {
                        // Instead of replacing textContent directly, create new text nodes
                        // This preserves the <w:t> element structure
                        this.updateTextElementContent(textElement, textContent);
                        
                    }
                }
                
                // Method 2: Handle split placeholders with formatting preservation
                
                
                // For split placeholders, we need a more sophisticated approach
                try {
                    this.handleSplitPlaceholdersWithFormatting(xmlDoc, replacements);
                } catch (error) {
                    
                    // Fallback to simple combined text replacement without formatting preservation
                    this.handleSplitPlaceholdersFallback(xmlDoc, replacements);
                }
                
                
                
                // Update the documentXml with modified content
                documentXml = serializer.serializeToString(xmlDoc);
            },
            
            // Helper method to update text element content while preserving structure
            updateTextElementContent: function(textElement, newContent) {
                // Preserve any existing attributes (like xml:space="preserve")
                const attributes = {};
                if (textElement.attributes) {
                    for (let i = 0; i < textElement.attributes.length; i++) {
                        const attr = textElement.attributes[i];
                        attributes[attr.name] = attr.value;
                    }
                }
                
                // Clear existing content
                while (textElement.firstChild) {
                    textElement.removeChild(textElement.firstChild);
                }
                
                // Add new text content
                const textNode = textElement.ownerDocument.createTextNode(newContent);
                textElement.appendChild(textNode);
                
                // Restore attributes
                for (const [name, value] of Object.entries(attributes)) {
                    textElement.setAttribute(name, value);
                }
            },
            
            // Helper method to handle split placeholders while preserving formatting
            handleSplitPlaceholdersWithFormatting: function(xmlDoc, replacements) {
                
                
                // Get all text elements and their parent runs
                const textElements = xmlDoc.getElementsByTagName('w:t');
                const runs = xmlDoc.getElementsByTagName('w:r');
                
                // Build a map of text content with run information
                let combinedText = '';
                const runMapping = [];
                
                for (let i = 0; i < textElements.length; i++) {
                    const textElement = textElements[i];
                    const parentRun = this.findParentRun(textElement);
                    const startPos = combinedText.length;
                    const content = textElement.textContent;
                    combinedText += content;
                    
                    runMapping.push({
                        textElement: textElement,
                        parentRun: parentRun,
                        startPos: startPos,
                        endPos: combinedText.length,
                        originalContent: content,
                        runIndex: i
                    });
                }
                
                
                
                // Check for split placeholders in combined text (all patterns)
                const placeholderPatterns = [
                    { pattern: /\{\{([^}]+)\}\}/gi, name: 'double-curly' },      // {{variable}}
                    { pattern: /<<([^>]+)>>/gi, name: 'double-angle' },          // <<variable>>
                    { pattern: /<([^<>]+)>/gi, name: 'single-angle' },           // <variable>
                    { pattern: /\{([^{}]+)\}/gi, name: 'single-curly' },         // {variable}
                    { pattern: /\[([^\[\]]+)\]/gi, name: 'single-square' },      // [variable]
                    { pattern: /\[\[([^\[\]]+)\]\]/gi, name: 'double-square' }   // [[variable]]
                ];

                for (const placeholder in replacements) {
                    if (replacements.hasOwnProperty(placeholder)) {
                        const value = String(replacements[placeholder] || '');
                        
                        // Try all placeholder patterns
                        placeholderPatterns.forEach(({ pattern, name }) => {
                            const placeholderPattern = new RegExp(
                                pattern.source.replace('([^}]+)', `\\s*${this.escapeRegex(placeholder)}\\s*`)
                                              .replace('([^>]+)', `\\s*${this.escapeRegex(placeholder)}\\s*`)
                                              .replace('([^<>]+)', `\\s*${this.escapeRegex(placeholder)}\\s*`)
                                              .replace('([^{}]+)', `\\s*${this.escapeRegex(placeholder)}\\s*`)
                                              .replace('([^\\[\\]]+)', `\\s*${this.escapeRegex(placeholder)}\\s*`),
                                'gi'
                            );
                            
                            let match;
                            while ((match = placeholderPattern.exec(combinedText)) !== null) {
                                const matchStart = match.index;
                                const matchEnd = match.index + match[0].length;
                                
                                
                                
                                // Find which runs contain this placeholder
                                const affectedRuns = runMapping.filter(mapping => 
                                    (mapping.startPos < matchEnd && mapping.endPos > matchStart)
                                );
                                
                                if (affectedRuns.length > 1) {
                                    
                                    
                                    // Use the first run's formatting for the replacement
                                    const firstRun = affectedRuns[0];
                                    
                                    // Calculate the replacement text for first run
                                    const beforePlaceholder = combinedText.substring(firstRun.startPos, matchStart);
                                    const afterPlaceholder = combinedText.substring(matchEnd, firstRun.endPos);
                                    const newFirstRunContent = beforePlaceholder + value + 
                                        (matchEnd <= firstRun.endPos ? afterPlaceholder : '');
                                    
                                    // Update first run
                                    this.updateTextElementContent(firstRun.textElement, newFirstRunContent);
                                    
                                    // Clear content from other affected runs that are completely within the match
                                    for (let i = 1; i < affectedRuns.length; i++) {
                                        const run = affectedRuns[i];
                                        if (run.startPos >= matchStart && run.endPos <= matchEnd) {
                                            // This run is completely within the placeholder - clear it
                                            this.updateTextElementContent(run.textElement, '');
                                        } else if (run.startPos < matchEnd && run.endPos > matchEnd) {
                                            // This run extends beyond the placeholder - keep the part after
                                            const remainingContent = combinedText.substring(matchEnd, run.endPos);
                                            this.updateTextElementContent(run.textElement, remainingContent);
                                        }
                                    }
                                    
                                    
                                }
                            }
                        });
                    }
                }
            },
            
            // Helper function to escape special regex characters
            escapeRegex: function(string) {
                return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            },
            
            // Helper method to find parent run element by traversing DOM tree
            findParentRun: function(element) {
                let current = element.parentNode;
                while (current && current.nodeType === Node.ELEMENT_NODE) {
                    if (current.tagName === 'w:r') {
                        return current;
                    }
                    current = current.parentNode;
                }
                return null;
            },
            
            // Fallback method for split placeholder handling when formatting preservation fails
            handleSplitPlaceholdersFallback: function(xmlDoc, replacements) {
                
                
                const textElements = xmlDoc.getElementsByTagName('w:t');
                
                // Combine all text for split placeholder detection and replacement
                let allText = '';
                for (let i = 0; i < textElements.length; i++) {
                    allText += textElements[i].textContent;
                }
                
                
                
                // Check for placeholders in combined text (all patterns)
                const placeholderPatterns = [
                    { pattern: /\{\{([^}]+)\}\}/gi, name: 'double-curly' },      // {{variable}}
                    { pattern: /<<([^>]+)>>/gi, name: 'double-angle' },          // <<variable>>
                    { pattern: /<([^<>]+)>/gi, name: 'single-angle' },           // <variable>
                    { pattern: /\{([^{}]+)\}/gi, name: 'single-curly' },         // {variable}
                    { pattern: /\[([^\[\]]+)\]/gi, name: 'single-square' },      // [variable]
                    { pattern: /\[\[([^\[\]]+)\]\]/gi, name: 'double-square' }   // [[variable]]
                ];

                for (const placeholder in replacements) {
                    if (replacements.hasOwnProperty(placeholder)) {
                        const value = String(replacements[placeholder] || '');
                        
                        // Try all placeholder patterns
                        placeholderPatterns.forEach(({ pattern, name }) => {
                            const placeholderPattern = new RegExp(
                                pattern.source.replace('([^}]+)', `\\s*${this.escapeRegex(placeholder)}\\s*`)
                                              .replace('([^>]+)', `\\s*${this.escapeRegex(placeholder)}\\s*`)
                                              .replace('([^<>]+)', `\\s*${this.escapeRegex(placeholder)}\\s*`)
                                              .replace('([^{}]+)', `\\s*${this.escapeRegex(placeholder)}\\s*`)
                                              .replace('([^\\[\\]]+)', `\\s*${this.escapeRegex(placeholder)}\\s*`),
                                'gi'
                            );
                            
                            if (placeholderPattern.test(allText)) {
                                // Replace in combined text
                                placeholderPattern.lastIndex = 0;
                                const newAllText = allText.replace(placeholderPattern, value);
                                
                                if (newAllText !== allText) {
                                    // Simple approach: put all text in first element, clear others
                                    if (textElements.length > 0) {
                                        this.updateTextElementContent(textElements[0], newAllText);
                                        for (let i = 1; i < textElements.length; i++) {
                                            this.updateTextElementContent(textElements[i], '');
                                        }
                                    }
                                    
                                    // Update allText for next iteration
                                    allText = newAllText;
                                }
                            }
                        });
                    }
                }
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
        });
    };
})();
