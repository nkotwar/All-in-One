document.addEventListener('DOMContentLoaded', function () {
    const menu = document.getElementById('menu');
    const hamburgerToggle = document.getElementById('hamburgerToggle');
    const menuInner = document.querySelector('.menu-inner');
    const menuInnerUl = document.getElementById('menu-inner-ul');
    const contents = document.querySelectorAll('.content');
    const pdfSidebar = document.getElementById('pdfSidebar');
    const container = document.getElementById('container');
    const sidebarToggle = document.getElementById('sidebarToggle');
    

    sidebarToggle.addEventListener('click', function () {
        pdfSidebar.classList.toggle('active');
        // --- NEW: Toggle class on the body for layout adjustments ---
        document.body.classList.toggle('sidebar-active');
    });

    // Add touch event listener for sidebar toggle
    sidebarToggle.addEventListener('touchstart', function (event) {
        event.preventDefault(); // Prevent default touch behavior
        pdfSidebar.classList.toggle('active');
        // --- NEW: Toggle class on the body for layout adjustments ---
        document.body.classList.toggle('sidebar-active');
    });

    // Toggle menu on hamburger toggle button click
    hamburgerToggle.addEventListener('click', function (event) {
        event.stopPropagation();
        menu.classList.toggle('expanded');
    });

    hamburgerToggle.addEventListener('touchstart', function (event) {
        event.preventDefault(); // Prevent default touch behavior
        event.stopPropagation();
        menu.classList.toggle('expanded');
    });

    // Tab Switching Logic
    menuInnerUl.querySelectorAll('li').forEach(tab => {
        tab.addEventListener('click', function () {
            const targetTab = this.getAttribute('data-tab');
    
            // Update active menu item
            menuInnerUl.querySelectorAll('li').forEach(item => {
                item.classList.remove('active');
            });
            this.classList.add('active');
    
            // Save the active tab to localStorage
            localStorage.setItem('activeTab', targetTab);
    
            // Hide all content sections
            contents.forEach(content => {
                content.classList.remove('active');
            });
    
            // Show the selected content section
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');
            }
    
            // Initialize the EMI Calculator if the EMI Calculator section is active
            if (targetTab === 'emi-calculator') {
                initEMICalculator();
            }
    
            // Show or hide the PDF sidebar based on the active section
            if (targetTab === 'documentation') {
                pdfSidebar.style.display = 'flex'; // Use flex to match new CSS
            } else {
                pdfSidebar.style.display = 'none';
                // --- NEW: Ensure sidebar class is removed when leaving the tab ---
                pdfSidebar.classList.remove('active');
                document.body.classList.remove('sidebar-active');
            }

            // NEW: Focus on CBS search when that tab is selected
            if (targetTab === 'cbs-hierarchy') {
                setTimeout(() => {
                    const searchInput = document.getElementById('cbsSearchInput');
                    if (searchInput) {
                        searchInput.focus();
                        // Optional: Select all text if desired
                        // searchInput.select();
                    }
                }, 50);
            }

            // NEW: Focus on bookmarks search when that tab is selected
            if (targetTab === 'bookmarks') {
                setTimeout(() => {
                    if (window.bookmarksManager) {
                        window.bookmarksManager.focusSearch();
                    }
                }, 50);
            }

            // NEW: Initialize text parser when that tab is selected
            if (targetTab === 'text-parser') {
                if (window.textParser) {
                    // Reset any existing state if needed
                    console.log('Text parser tab activated');
                }
            }
    
            // Collapse the menu when a tab is selected
            menu.classList.remove('expanded');
        });
    });

    // Function to activate a specific tab
    function activateTab(tabName) {
        // Find the menu item for this tab
        const menuItem = menuInnerUl.querySelector(`li[data-tab="${tabName}"]`);
        const targetContent = document.getElementById(tabName);
        
        if (menuItem && targetContent) {
            // Update active menu item
            menuInnerUl.querySelectorAll('li').forEach(item => {
                item.classList.remove('active');
            });
            menuItem.classList.add('active');
            
            // Hide all content sections
            contents.forEach(content => {
                content.classList.remove('active');
            });
            
            // Show the selected content section
            targetContent.classList.add('active');
            
            // Initialize specific modules based on the tab
            if (tabName === 'emi-calculator') {
                initEMICalculator();
            }
            
            // Show or hide the PDF sidebar based on the active section
            if (tabName === 'documentation') {
                pdfSidebar.style.display = 'flex';
            } else {
                pdfSidebar.style.display = 'none';
                pdfSidebar.classList.remove('active');
                document.body.classList.remove('sidebar-active');
            }
            
            // Focus on CBS search when that tab is selected
            if (tabName === 'cbs-hierarchy') {
                setTimeout(() => {
                    const searchInput = document.getElementById('cbsSearchInput');
                    if (searchInput) {
                        searchInput.focus();
                    }
                }, 50);
            }
            
            // Focus on bookmarks search when that tab is selected
            if (tabName === 'bookmarks') {
                setTimeout(() => {
                    if (window.bookmarksManager) {
                        window.bookmarksManager.focusSearch();
                    }
                }, 50);
            }
            
            // Initialize text parser when that tab is selected
            if (tabName === 'text-parser') {
                if (window.textParser) {
                    console.log('Text parser tab activated');
                }
            }
        }
    }

    // Initialize the section based on localStorage or default to documentation
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab && document.getElementById(savedTab)) {
        activateTab(savedTab);
    } else {
        // Initialize the default section (Documentation)
        activateTab('documentation');
    }


    document.addEventListener("mousemove", (e) => {
        x = e.pageX;
        y = e.pageY;
    });

    menuInner.addEventListener("mouseenter", () => {
        document.getElementById("menu").classList.add("expanded");
        menuExpanded = true;
    });

    menuInner.addEventListener("mouseleave", () => {
        menuExpanded = false;
        document.getElementById("menu").classList.remove("expanded");
    });

});