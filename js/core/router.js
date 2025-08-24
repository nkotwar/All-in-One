document.addEventListener('DOMContentLoaded', () => {
    const contentContainer = document.getElementById('content-container');

    // Map URL hashes to the HTML view file and its initialization script
    const routes = {
        '#documentation': {
            path: 'views/documentation.html',
            init: () => {
                if (window.initDocumentation) window.initDocumentation();
            }
        },
        '#emi-calculator': {
            path: 'views/emi-calculator.html',
            init: () => {
                if (window.initEmiCalculator) window.initEmiCalculator();
            }
        },
        '#wealth-simulator': {
            path: 'views/wealth-simulator.html',
            init: () => {
                if (window.initWealthSimulator) window.initWealthSimulator();
            }
        },
        '#cbs-hierarchy': {
            path: 'views/cbs-hierarchy.html',
            init: () => {
                if (window.initCbsHierarchy) window.initCbsHierarchy();
            }
        },
        '#snap-container': {
            path: 'views/snap-container.html',
            init: () => {
                if (window.initSnapContainer) window.initSnapContainer();
            }
        }
    };

    async function router() {
        // Get the current hash, default to #documentation
        const hash = window.location.hash || '#documentation';
        const route = routes[hash];

        if (route) {
            try {
                // Fetch the HTML for the view
                const response = await fetch(route.path);
                if (!response.ok) throw new Error('Page not found');
                
                // Load the HTML into the container
                contentContainer.innerHTML = await response.text();
                
                // Run the specific initialization script for that view
                route.init();

            } catch (error) {
                console.error('Error loading page:', error);
                contentContainer.innerHTML = `<h2>Error: Could not load page.</h2><p>${error.message}</p>`;
            }
        } else {
            contentContainer.innerHTML = '<h2>404 - Page Not Found</h2>';
        }
    }

    // Listen for URL hash changes and load the new page
    window.addEventListener('hashchange', router);

    // Load the initial route when the page first loads
    router();
});