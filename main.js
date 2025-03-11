document.addEventListener('DOMContentLoaded', function () {
    const menu = document.getElementById('menu');
    const hamburger = document.querySelector('.hamburger');
    const menuInner = document.querySelector('.menu-inner');
    const menuInnerUl = document.getElementById('menu-inner-ul');
    const contents = document.querySelectorAll('.content');
    const pdfSidebar = document.getElementById('pdfSidebar');
    const container = document.getElementById('container');
    const sidebarToggle = document.getElementById('sidebarToggle');
    

    sidebarToggle.addEventListener('click', function () {
        pdfSidebar.classList.toggle('active');
    });

    // Toggle menu on hamburger click
    hamburger.addEventListener('click', function (event) {
        event.stopPropagation();
        menu.classList.toggle('expanded');
    });

    // Close menu when clicking outside of it
    document.addEventListener('click', function (event) {
        if (!menu.contains(event.target) ){
            menu.classList.remove('expanded');
        }
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
                pdfSidebar.style.display = 'block';
                container.style.maxWidth = "700px";
            } else {
                pdfSidebar.style.display = 'none';
                container.style.maxWidth = "none";
            }
    
            // Collapse the menu when a tab is selected
            menu.classList.remove('expanded');
        });
    });

    // Initialize the default section (Documentation)
    document.getElementById('documentation').classList.add('active');
    pdfSidebar.style.display = 'block'; // Show the PDF sidebar by default


    let height = window.innerHeight,
        x = 0, y = height / 2,
        curveX = 10,
        curveY = 0,
        targetX = 0,
        xitteration = 0,
        yitteration = 0,
        menuExpanded = false;

    const blob = document.getElementById("blob"),
          blobPath = document.getElementById("blob-path"),
          h2 = document.querySelector("h2");

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

    function easeOutExpo(currentIteration, startValue, changeInValue, totalIterations) {
        return changeInValue * (-Math.pow(2, -10 * currentIteration / totalIterations) + 1) + startValue;
    }

    let hoverZone = 150;
    let expandAmount = 20;

    function svgCurve() {
        if ((curveX > x - 1) && (curveX < x + 1)) {
            xitteration = 0;
        } else {
            if (menuExpanded) {
                targetX = 0;
            } else {
                xitteration = 0;
                targetX = x > hoverZone ? 0 : -(((60 + expandAmount) / 100) * (x - hoverZone));
            }
            xitteration++;
        }

        if ((curveY > y - 1) && (curveY < y + 1)) {
            yitteration = 0;
        } else {
            yitteration = 0;
            yitteration++;
        }

        curveX = easeOutExpo(xitteration, curveX, targetX - curveX, 100);
        curveY = easeOutExpo(yitteration, curveY, y - curveY, 100);

        let anchorDistance = 200;
        let curviness = anchorDistance - 40;

        let newCurve2 = `M60,${height}H0V0h60v${curveY - anchorDistance}c0,${curviness},${curveX},${curviness},${curveX},${anchorDistance}S60,${curveY},60,${curveY + (anchorDistance * 2)}V${height}z`;

        blobPath.setAttribute("d", newCurve2);
        blob.style.width = `${curveX + 60}px`;
        hamburger.style.transform = `translate(${curveX}px, ${curveY}px)`;
        h2.style.transform = `translateY(${curveY}px)`;
        
        window.requestAnimationFrame(svgCurve);
    }

    window.requestAnimationFrame(svgCurve);


});