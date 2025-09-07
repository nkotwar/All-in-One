// Icon fallback system for when Material Icons don't load
(function() {
    'use strict';
    
    // Unicode fallbacks for Material Icons
    const iconFallbacks = {
        'menu': '☰',
        'description': '📄',
        'calculate': '🧮',
        'savings': '💰',
        'account_tree': '🌳',
        'folder_open': '📂',
        'badge': '🏷️',
        'phone': '📞',
        'cloud_upload': '☁️'
    };
    
    function checkMaterialIconsLoaded() {
        return new Promise((resolve) => {
            // Create a test element
            const testElement = document.createElement('span');
            testElement.className = 'material-icons';
            testElement.style.position = 'absolute';
            testElement.style.left = '-9999px';
            testElement.style.fontSize = '24px';
            testElement.textContent = 'menu';
            document.body.appendChild(testElement);
            
            // Check if the font is loaded by measuring width
            setTimeout(() => {
                const computedStyle = window.getComputedStyle(testElement);
                const isLoaded = computedStyle.fontFamily.indexOf('Material Icons') !== -1;
                document.body.removeChild(testElement);
                
                // Additional check: measure width difference
                const width = testElement.offsetWidth;
                resolve(isLoaded && width < 30); // Material icons are typically narrower than text
            }, 100);
        });
    }
    
    function applyIconFallbacks() {
        const materialIcons = document.querySelectorAll('.material-icons');
        
        materialIcons.forEach(icon => {
            const iconName = icon.textContent.trim();
            if (iconFallbacks[iconName]) {
                icon.textContent = iconFallbacks[iconName];
                icon.style.fontFamily = 'system-ui, -apple-system, sans-serif';
            }
        });
    }
    
    // Check when DOM is loaded
    function initIconFallback() {
        checkMaterialIconsLoaded().then(isLoaded => {
            if (!isLoaded) {
                console.log('Material Icons not loaded, applying fallbacks');
                applyIconFallbacks();
            }
        });
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initIconFallback);
    } else {
        initIconFallback();
    }
    
    // Also run after a delay to catch late-loading fonts
    setTimeout(() => {
        checkMaterialIconsLoaded().then(isLoaded => {
            if (!isLoaded) {
                applyIconFallbacks();
            }
        });
    }, 2000);
})();
