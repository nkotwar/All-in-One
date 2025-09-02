// DOCX Replace Library Enhancement
// Extend existing DocxReplace with additional methods
(function() {
    if (typeof DocxReplace === 'undefined') {
        console.warn('DocxReplace base library not found. Enhanced features will not be available.');
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
                    .filter((value, index, self) => self.indexOf(value) === index); // Unique values
                return bookmarks;
            },
            
            // Enhanced method to get all placeholders (both bookmarks and multiple bracket styles)
            getPlaceholders: function() {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(documentXml, 'text/xml');
                
                // Get bookmarks
                const bookmarks = Array.from(xmlDoc.getElementsByTagName('w:bookmarkStart'))
                    .map(bm => bm.getAttribute('w:name'))
                    .filter((value, index, self) => self.indexOf(value) === index);
                
                // Enhanced placeholder patterns - supports multiple bracket styles
                const placeholderPatterns = [
                    { pattern: /\{\{([^}]+)\}\}/g, name: 'double-curly' },      // {{variable}}
                    { pattern: /<<([^>]+)>>/g, name: 'double-angle' },          // <<variable>>
                    { pattern: /<([^<>]+)>/g, name: 'single-angle' },           // <variable>
                    { pattern: /\{([^{}]+)\}/g, name: 'single-curly' },         // {variable}
                    { pattern: /\[([^\[\]]+)\]/g, name: 'single-square' },      // [variable]
                    { pattern: /\[\[([^\[\]]+)\]\]/g, name: 'double-square' },  // [[variable]]
                    { pattern: /\(\(([^)]+)\)\)/g, name: 'double-paren' },      // ((variable))
                    { pattern: /\$\{([^}]+)\}/g, name: 'dollar-curly' },        // ${variable}
                    { pattern: /#\{([^}]+)\}/g, name: 'hash-curly' },           // #{variable}
                    { pattern: /%([^%\s]+)%/g, name: 'percent' },               // %variable%
                    { pattern: /\|([^|\s]+)\|/g, name: 'pipe' },                // |variable|
                    { pattern: /~([^~\s]+)~/g, name: 'tilde' }                  // ~variable~
                ];
                
                const textElements = xmlDoc.getElementsByTagName('w:t');
                const placeholders = new Set();
                const placeholderInfo = new Map(); // Store pattern info for each placeholder
                
                for (let i = 0; i < textElements.length; i++) {
                    const textContent = textElements[i].textContent;
                    
                    // Test each pattern
                    placeholderPatterns.forEach(({ pattern, name }) => {
                        // Reset regex lastIndex to avoid issues with global flag
                        pattern.lastIndex = 0;
                        let match;
                        
                        while ((match = pattern.exec(textContent)) !== null) {
                            const placeholder = match[1].trim();
                            
                            // Skip empty placeholders or very short ones
                            if (placeholder.length === 0 || placeholder.length < 2) {
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
                                    source: 'text-pattern'
                                });
                            }
                        }
                    });
                }
                
                return {
                    bookmarks: bookmarks,
                    placeholders: Array.from(placeholders),
                    placeholderInfo: Object.fromEntries(placeholderInfo)
                };
            },
            
            // Helper function to check if placeholder name is valid
            isValidPlaceholderName: function(name) {
                // Allow letters, numbers, underscores, hyphens, dots, spaces
                const validPattern = /^[a-zA-Z0-9_\-.\s]+$/;
                
                // Reject if it contains only numbers or special chars
                const hasLetter = /[a-zA-Z]/.test(name);
                
                // Reject common false positives
                const falsePositives = ['div', 'span', 'br', 'hr', 'img', 'a', 'p', 'h1', 'h2', 'h3', 'table', 'tr', 'td'];
                
                return validPattern.test(name) && 
                       hasLetter && 
                       name.length >= 2 && 
                       name.length <= 50 &&
                       !falsePositives.includes(name.toLowerCase());
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
            
            // Enhanced method to replace multiple bracket style placeholders
            replacePlaceholders: function(replacements) {
                const parser = new DOMParser();
                const serializer = new XMLSerializer();
                const xmlDoc = parser.parseFromString(documentXml, 'text/xml');
                
                // Define all supported placeholder patterns for replacement
                const placeholderPatterns = [
                    { pattern: (name) => new RegExp(`\\{\\{\\s*${this.escapeRegex(name)}\\s*\\}\\}`, 'g'), name: 'double-curly' },
                    { pattern: (name) => new RegExp(`<<\\s*${this.escapeRegex(name)}\\s*>>`, 'g'), name: 'double-angle' },
                    { pattern: (name) => new RegExp(`<\\s*${this.escapeRegex(name)}\\s*>`, 'g'), name: 'single-angle' },
                    { pattern: (name) => new RegExp(`\\{\\s*${this.escapeRegex(name)}\\s*\\}`, 'g'), name: 'single-curly' },
                    { pattern: (name) => new RegExp(`\\[\\s*${this.escapeRegex(name)}\\s*\\]`, 'g'), name: 'single-square' },
                    { pattern: (name) => new RegExp(`\\[\\[\\s*${this.escapeRegex(name)}\\s*\\]\\]`, 'g'), name: 'double-square' },
                    { pattern: (name) => new RegExp(`\\(\\(\\s*${this.escapeRegex(name)}\\s*\\)\\)`, 'g'), name: 'double-paren' },
                    { pattern: (name) => new RegExp(`\\$\\{\\s*${this.escapeRegex(name)}\\s*\\}`, 'g'), name: 'dollar-curly' },
                    { pattern: (name) => new RegExp(`#\\{\\s*${this.escapeRegex(name)}\\s*\\}`, 'g'), name: 'hash-curly' },
                    { pattern: (name) => new RegExp(`%\\s*${this.escapeRegex(name)}\\s*%`, 'g'), name: 'percent' },
                    { pattern: (name) => new RegExp(`\\|\\s*${this.escapeRegex(name)}\\s*\\|`, 'g'), name: 'pipe' },
                    { pattern: (name) => new RegExp(`~\\s*${this.escapeRegex(name)}\\s*~`, 'g'), name: 'tilde' }
                ];
                
                // Find all text elements
                const textElements = xmlDoc.getElementsByTagName('w:t');
                
                for (let i = 0; i < textElements.length; i++) {
                    const textElement = textElements[i];
                    let textContent = textElement.textContent;
                    let modified = false;
                    
                    // Replace placeholders for each pattern style
                    for (const placeholder in replacements) {
                        if (replacements.hasOwnProperty(placeholder)) {
                            const value = replacements[placeholder] || '';
                            
                            // Try each pattern to find and replace this placeholder
                            placeholderPatterns.forEach(patternDef => {
                                const pattern = patternDef.pattern(placeholder);
                                if (pattern.test(textContent)) {
                                    // Reset regex for actual replacement
                                    pattern.lastIndex = 0;
                                    textContent = textContent.replace(pattern, value);
                                    modified = true;
                                }
                                // Reset for next iteration
                                pattern.lastIndex = 0;
                            });
                        }
                    }
                    
                    // Update the text content if modified
                    if (modified) {
                        textElement.textContent = textContent;
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
        });
    };
})();