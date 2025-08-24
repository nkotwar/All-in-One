document.addEventListener('DOMContentLoaded', function () {
    const menu = document.getElementById('menu');
    const hamburgerToggle = document.getElementById('hamburgerToggle');
    const hamburger = document.querySelector('.hamburger');
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

    // Toggle menu on hamburger click
    hamburger.addEventListener('click', function (event) {
        event.stopPropagation();
        menu.classList.toggle('expanded');
    });

    // Add touch event listener for hamburger menu
    hamburger.addEventListener('touchstart', function (event) {
        event.stopPropagation();
        menu.classList.toggle('expanded');
    });

    hamburgerToggle.addEventListener('click', function () {
        menu.classList.toggle('expanded');
    });

    hamburgerToggle.addEventListener('touchstart', function (event) {
        event.preventDefault(); // Prevent default touch behavior
        menu.classList.toggle('expanded');
    });

    // Tab Switching Logic
    menuInnerUl.querySelectorAll('li').forEach(tab => {
        tab.addEventListener('click', function () {
            const targetTab = this.getAttribute('data-tab');
    
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
    
            // Collapse the menu when a tab is selected
            menu.classList.remove('expanded');
        });
    });

    // Initialize the default section (Documentation)
    document.getElementById('documentation').classList.add('active');
    pdfSidebar.style.display = 'flex'; // Show the PDF sidebar by default


    document.addEventListener("mousemove", (e) => {
        x = e.pageX;
        y = e.pageY;
    });

    hamburger.addEventListener("mouseenter", () => {
        document.getElementById("menu").classList.add("expanded");
        menuExpanded = true;
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