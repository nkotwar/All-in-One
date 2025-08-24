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
                    .filter((value, index, self) => self.indexOf(value) === index); // Unique values
                return bookmarks;
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