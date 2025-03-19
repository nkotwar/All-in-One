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
    });

    // Add touch event listener for sidebar toggle
    sidebarToggle.addEventListener('touchstart', function (event) {
        event.preventDefault(); // Prevent default touch behavior
        pdfSidebar.classList.toggle('active');
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

document.addEventListener('DOMContentLoaded', () => {
    const formContainer = document.getElementById('formContainer');
  
    // Create the dropdown
    const beneficiaryDropdown = document.createElement('div');
    beneficiaryDropdown.className = 'select';
    beneficiaryDropdown.tabIndex = 0;
    beneficiaryDropdown.setAttribute('role', 'button');
    beneficiaryDropdown.id = 'beneficiaryDropdown';
  
    const button = document.createElement('button');
    button.tabIndex = 0;
    button.textContent = 'Select Beneficiary Account';
    beneficiaryDropdown.appendChild(button);
  
    const optionsContainer = document.createElement('div');
    Object.keys(accountDetails).forEach(account => {
      const option = document.createElement('a');
      option.setAttribute('role', 'button');
      option.tabIndex = 0;
      option.href = '#';
      option.innerHTML = `<span>${account}</span>`;
      option.addEventListener('click', (e) => {
        e.preventDefault();
        button.textContent = account;
  
        // Instantly close the dropdown
        optionsContainer.style.display = 'none'; // Hide the dropdown
  
        // Add logic to auto-populate form fields
        const details = accountDetails[account];
        Object.keys(details).forEach(field => {
          const input = formContainer.querySelector(`input[name="${field}"]`);
          if (input) {
            input.value = details[field];
            formFields[field] = details[field];
            localStorage.setItem(`formField_${field}`, details[field]);
          }
        });
  
        // Add "pop-out" animation to the button
        button.style.animation = 'popOut 0.3s ease';
        button.addEventListener('animationend', () => {
          button.style.animation = '';
        });
      });
      optionsContainer.appendChild(option);
    });
    beneficiaryDropdown.appendChild(optionsContainer);
    formContainer.appendChild(beneficiaryDropdown);
  
    // Show dropdown on hover or focus
    beneficiaryDropdown.addEventListener('mouseenter', () => {
      optionsContainer.style.display = 'block';
    });
  
    beneficiaryDropdown.addEventListener('mouseleave', () => {
      optionsContainer.style.display = 'none';
    });
  
    beneficiaryDropdown.addEventListener('focusin', () => {
      optionsContainer.style.display = 'block';
    });
  
    beneficiaryDropdown.addEventListener('focusout', () => {
      optionsContainer.style.display = 'none';
    });
  });
  
  // Add the "popOut" animation
  const styleSheet = document.createElement('style');
  styleSheet.innerHTML = `
    @keyframes popOut {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(styleSheet);