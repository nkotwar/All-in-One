document.getElementById('cbsSearchInput').addEventListener('input', function () {
    const query = this.value.toLowerCase();
    const resultsContainer = document.getElementById('cbsResults');

    // Animate the transition for search results
    gsap.to(resultsContainer, {
        opacity: 0,
        duration: 0.2,
        onComplete: () => {
            resultsContainer.innerHTML = '';

            if (query.length === 0) {
                renderHierarchy(cbsData, resultsContainer, true);
            } else {
                const matches = searchHierarchy(cbsData, query);
                const combinedMatches = combineParallelHierarchies(matches); // Combine parallel hierarchies
                if (combinedMatches.length > 0) {
                    renderHierarchy(combinedMatches, resultsContainer, false); // Render combined hierarchy
                } else {
                    resultsContainer.textContent = 'No results found.';
                }
            }

            // Fade in the new results
            gsap.to(resultsContainer, {
                opacity: 1,
                duration: 0.2
            });
        }
    });
});

function searchHierarchy(data, query) {
    const results = [];
    const stack = [];

    function traverse(node) {
        stack.push(node);
        if (fuzzyMatch(node.name, query)) {
            // Store the full path to the matching node
            results.push({ ...node, path: stack.slice() });
        }
        if (node.children) {
            node.children.forEach(child => traverse(child));
        }
        stack.pop();
    }

    data.forEach(item => traverse(item));
    return results;
}

function fuzzyMatch(text, query) {
    // Normalize the text and query by lowercasing and removing hyphens
    const normalize = (str) => str.toLowerCase().replace(/-/g, '');

    const normalizedText = normalize(text);
    const normalizedQuery = normalize(query);

    // Split the normalized text into words
    const textWords = normalizedText.split(/\s+/);

    // Split the normalized query into words
    const queryWords = normalizedQuery.split(/\s+/);

    // Check if all query words exist in the text (as substrings or combined words)
    return queryWords.every(queryWord => {
        // Check if the query word matches any single text word
        if (textWords.some(textWord => textWord.includes(queryWord))) {
            return true;
        }

        // Check if the query word matches a combination of text words
        const combinedText = textWords.join('');
        return combinedText.includes(queryWord);
    });
}

function combineParallelHierarchies(matches) {
    const combinedTree = [];

    matches.forEach(match => {
        let currentLevel = combinedTree;

        match.path.forEach((node, index) => {
            let existingNode = currentLevel.find(item => item.name === node.name);

            if (!existingNode) {
                // If the node doesn't exist, add it to the current level
                existingNode = { ...node, children: [] };
                currentLevel.push(existingNode);
            }

            // Move to the next level in the hierarchy
            currentLevel = existingNode.children;
        });
    });

    return combinedTree;
}

function renderHierarchy(data, container, isCollapsed) {
    // Clear the container before rendering
    container.innerHTML = '';

    data.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cbs-item';

        if (item.children && item.children.length > 0) {
            // Add collapsible button for nodes with children
            const collapsible = document.createElement('button');
            collapsible.className = 'cbs-collapsible';
            collapsible.textContent = item.name;
            itemDiv.appendChild(collapsible);

            const content = document.createElement('div');
            content.className = 'cbs-content';
            renderHierarchy(item.children, content, isCollapsed);
            itemDiv.appendChild(content);

            // GSAP animation for smooth expanding/collapsing
            const toggleCollapse = () => {
                const isActive = collapsible.classList.toggle('active');

                if (isActive) {
                    // Expand with GSAP
                    gsap.to(content, {
                        height: 'auto',
                        duration: 0.3, // Faster animation
                        ease: CustomEase.create("custom", "M0,0 C0.5,0 0.5,1 1,1"),
                        onStart: () => content.style.overflow = 'hidden',
                        onComplete: () => content.style.overflow = 'visible'
                    });
                } else {
                    // Collapse with GSAP
                    gsap.to(content, {
                        height: 0,
                        duration: 0.3, // Faster animation
                        ease: CustomEase.create("custom", "M0,0 C0.5,0 0.5,1 1,1"),
                        onStart: () => content.style.overflow = 'hidden'
                    });
                }
            };

            // Add click event to the collapsible button
            collapsible.addEventListener('click', toggleCollapse);

            // Add click event to the padding area (itemDiv)
            itemDiv.addEventListener('click', function (event) {
                if (event.target === itemDiv) {
                    toggleCollapse();
                }
            });

            if (!isCollapsed) {
                collapsible.classList.add('active');
                content.style.height = 'auto';
            } else {
                content.style.height = '0';
                content.style.overflow = 'hidden';
            }
        } else {
            // Display leaf nodes without a collapsible button
            itemDiv.textContent = item.name;
        }

        // Append the item to the container
        container.appendChild(itemDiv);
    });
}

// Initial render
document.addEventListener('DOMContentLoaded', function () {
    const resultsContainer = document.getElementById('cbsResults'); // Ensure this matches your HTML
    if (resultsContainer) {
        renderHierarchy(cbsData, resultsContainer, true);
    } else {
        console.error('Results container not found!');
    }
});