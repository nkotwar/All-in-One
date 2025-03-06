function initEMICalculator() {
    // Check if the EMI Calculator section is active
    const emiCalculatorSection = document.getElementById('emi-calculator');
    if (!emiCalculatorSection || !emiCalculatorSection.classList.contains('active')) {
        console.log("EMI Calculator section is not active. Skipping initialization.");
        return; // Exit if the EMI Calculator section is not active
    }

    // Get all required elements
    const loanAmountInput = document.getElementById('loan-amount');
    const interestRateInput = document.getElementById('interest-rate');
    const loanTenureInput = document.getElementById('loan-tenure');
    const moratoriumInput = document.getElementById('moratorium');
    const interestServedMoratoriumInput = document.getElementById('interest-served-moratorium');
    const netMonthlyIncomeInput = document.getElementById('net-monthly-income');
    const existingEmiInput = document.getElementById('existing-emi');
    const calculateEmiButton = document.getElementById('calculate-emi');
    const emiSlider = document.getElementById('emi-slider');
    const newEmiDisplay = document.getElementById('new-emi');
    const emiSavedDisplay = document.getElementById('emi-saved');
    const newTenureDisplay = document.getElementById('new-tenure');
    const loanChartCanvas = document.getElementById('loanChart')?.getContext('2d');

    const nmiEmiRatioDisplay = document.getElementById('nmi-emi-ratio');
    const maxEmiCapacityDisplay = document.getElementById('max-emi-capacity');
    const maxPermissibleFinanceDisplay = document.getElementById('max-permissible-finance');
    const emiDuringMoratoriumDisplay = document.getElementById('emi-during-moratorium');
    const emiPostMoratoriumDisplay = document.getElementById('emi-post-moratorium');
    const emiPostMoratoriumNoInterestDisplay = document.getElementById('emi-post-moratorium-no-interest');
    const emiNoMoratoriumDisplay = document.getElementById('emi-no-moratorium');

    // Get references to the new UI elements
    const progressBar = document.querySelector('.progress');
    const emiValues = document.querySelectorAll('.result-value');

    // Check if all required elements exist
    if (!loanAmountInput || !interestRateInput || !loanTenureInput || !moratoriumInput || !netMonthlyIncomeInput || !existingEmiInput || !calculateEmiButton || !emiSlider || !newEmiDisplay || !emiSavedDisplay || !newTenureDisplay || !loanChartCanvas || !nmiEmiRatioDisplay || !maxEmiCapacityDisplay || !maxPermissibleFinanceDisplay || !emiDuringMoratoriumDisplay || !emiPostMoratoriumDisplay || !emiPostMoratoriumNoInterestDisplay || !emiNoMoratoriumDisplay) {
        console.error("One or more EMI Calculator elements not found in the DOM.");
        return; // Exit if any required element is missing
    }

    let loanChart;
    let currentEMI = 0;
    let originalNumberOfPayments = 0;

    calculateEmiButton.addEventListener('click', function () {
        const principal = parseFloat(loanAmountInput.value); // Loan amount in rupees
        const rate = parseFloat(interestRateInput.value); // Annual interest rate
        const tenureYears = parseFloat(loanTenureInput.value); // Loan tenure in years
        const moratoriumMonths = parseFloat(moratoriumInput.value); // Moratorium in months
        const interestServedMoratorium = interestServedMoratoriumInput.value; // Interest served during moratorium (yes/no)
        const netMonthlyIncome = parseFloat(netMonthlyIncomeInput.value); // Net monthly income
        const existingEmi = parseFloat(existingEmiInput.value); // Existing EMI
    
        // Validate inputs
        if (isNaN(principal) || isNaN(rate) || isNaN(tenureYears) || isNaN(moratoriumMonths) || isNaN(netMonthlyIncome) || isNaN(existingEmi)) {
            alert('Please enter valid values for all fields.');
            return;
        }
    
        // Convert tenure from years to months
        const tenureMonths = tenureYears * 12;
    
        // Calculate EMI (with moratorium and interest served option)
        const { emi, numberOfPayments } = calculateEMI(principal, rate, tenureMonths, moratoriumMonths, interestServedMoratorium);
        currentEMI = emi;
        originalNumberOfPayments = numberOfPayments;
    
        // Update EMI slider
        emiSlider.min = currentEMI.toFixed(2);
        emiSlider.max = (currentEMI * 2).toFixed(2);
        emiSlider.value = currentEMI.toFixed(2);
    
        // Display EMI
        newEmiDisplay.textContent = `₹${currentEMI.toFixed(2)}`;
        emiSavedDisplay.textContent = '₹0.00';
        newTenureDisplay.textContent = '0 months';
    
        // Calculate additional metrics
        const nmiEmiRatio = calculateNMIEMIRatio(netMonthlyIncome);
        const maxEmiCapacity = calculateMaxEMICapacity(netMonthlyIncome, existingEmi, nmiEmiRatio);
        const maxPermissibleFinance = calculateMaxPermissibleFinance(maxEmiCapacity, rate, tenureMonths);
        const emiDuringMoratorium = calculateEMIDuringMoratorium(principal, rate);
        const emiPostMoratorium = calculateEMIPostMoratorium(principal, rate, tenureMonths, moratoriumMonths);
        const emiPostMoratoriumNoInterest = calculateEMIPostMoratoriumNoInterest(principal, rate, tenureMonths, moratoriumMonths);
        const emiNoMoratorium = calculateEMINoMoratorium(principal, rate, tenureMonths);
    
        // Display additional metrics
        nmiEmiRatioDisplay.textContent = `${nmiEmiRatio.toFixed(2)}%`;
        maxEmiCapacityDisplay.textContent = `₹${maxEmiCapacity.toFixed(2)}`;
        maxPermissibleFinanceDisplay.textContent = `₹${maxPermissibleFinance.toFixed(2)}`;
        emiDuringMoratoriumDisplay.textContent = `₹${emiDuringMoratorium.toFixed(2)}`;
        emiPostMoratoriumDisplay.textContent = `₹${emiPostMoratorium.toFixed(2)}`;
        emiPostMoratoriumNoInterestDisplay.textContent = `₹${emiPostMoratoriumNoInterest.toFixed(2)}`;
        emiNoMoratoriumDisplay.textContent = `₹${emiNoMoratorium.toFixed(2)}`;

        // Update progress bar for NMI/EMI Ratio
        progressBar.style.width = `${nmiEmiRatio}%`;

        // Color coding for EMI values
        emiValues.forEach(value => {
            const emiAmount = parseFloat(value.textContent.replace('₹', '').replace(',', ''));
            if (emiAmount > maxEmiCapacity) {
                value.style.color = '#e74c3c'; // Red for exceeding limit
            } else {
                value.style.color = '#2ecc71'; // Green for within limit
            }
        });
    
        // Update loan chart (with moratorium and interest served option)
        updateLoanChart(principal, rate, tenureMonths, currentEMI, moratoriumMonths, interestServedMoratorium);
        updateChart('emi', { newEmi: currentEMI, interestSaved: 0, emisSaved: 0 });

        // Generate and display the amortization table
        generateAmortizationTable(principal, rate, tenureMonths, currentEMI, moratoriumMonths, interestServedMoratorium);
    });

    // Add an event listener to the dropdown
    interestServedMoratoriumInput.addEventListener('change', function () {
        // Trigger the EMI calculation when the dropdown value changes
        calculateEmiButton.click();
    });

    let isSliderDragging = false;

    emiSlider.addEventListener('mousedown', () => {
        isSliderDragging = true;
    });

    emiSlider.addEventListener('mouseup', () => {
        if (isSliderDragging) {
            isSliderDragging = false;
            updateAmortizationSchedule();
        }
    });

    emiSlider.addEventListener('input', () => {
        const emi = parseFloat(emiSlider.value);
        newEmiDisplay.textContent = `₹${emi.toFixed(2)}`; // Update Forced EMI in real-time
        if (!isSliderDragging) {
            updateAmortizationSchedule();
        }
    });

    function calculateEMI(principal, rate, tenureMonths, moratoriumMonths = 0, interestServed = 'no') {
        const monthlyRate = rate / 12 / 100; // Monthly interest rate in decimal
    
        // If there's a moratorium and interest is not served, calculate the accrued interest
        if (moratoriumMonths > 0 && interestServed === 'no') {
            const accruedInterest = principal * monthlyRate * moratoriumMonths;
            principal += accruedInterest; // Add accrued interest to the principal
            tenureMonths -= moratoriumMonths; // Reduce the tenure by the moratorium period
        }
    
        // Calculate EMI for the remaining tenure
        const emi =
            (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
            (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    
        return { emi, numberOfPayments: tenureMonths };
    }

    function calculateAdjustedTenureAndInterest(principal, rate, emi, moratoriumMonths = 0, interestServed = 'no') {
        const monthlyRate = rate / 12 / 100;
        let numberOfPayments = 0;
        let remainingPrincipal = principal;
        let totalInterest = 0;
    
        // If there's a moratorium and interest is not served, calculate the accrued interest
        if (moratoriumMonths > 0 && interestServed === 'no') {
            const accruedInterest = remainingPrincipal * monthlyRate * moratoriumMonths;
            remainingPrincipal += accruedInterest; // Add accrued interest to the principal
        }
    
        // Calculate the number of payments required to repay the loan with the adjusted EMI
        while (remainingPrincipal > 0) {
            const interest = remainingPrincipal * monthlyRate;
            const principalPaid = emi - interest;
            remainingPrincipal -= principalPaid;
            totalInterest += interest;
            numberOfPayments++;
    
            if (principalPaid <= 0) {
                throw new Error('EMI is too low to cover interest. Please increase EMI.');
            }
        }
    
        return { numberOfPayments, totalInterest };
    }

    function calculateNMIEMIRatio(netMonthlyIncome) {
        const annualIncome = netMonthlyIncome * 12;
        if (annualIncome <= 120000) return 20;
        if (annualIncome <= 300000) return 30;
        if (annualIncome <= 500000) return 55;
        if (annualIncome <= 800000) return 60;
        if (annualIncome <= 1000000) return 65;
        return 66.67;
    }

    function calculateMaxEMICapacity(netMonthlyIncome, existingEmi, nmiEmiRatio) {
        return (netMonthlyIncome * (nmiEmiRatio / 100)) - existingEmi;
    }

    function calculateMaxPermissibleFinance(maxEmiCapacity, rate, tenureMonths) {
        const monthlyRate = rate / 12 / 100;
        return maxEmiCapacity * ((Math.pow(1 + monthlyRate, tenureMonths) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)));
    }

    function calculateEMIDuringMoratorium(principal, rate) {
        const monthlyRate = rate / 12 / 100;
        return principal * monthlyRate;
    }

    function calculateEMIPostMoratorium(principal, rate, tenureMonths, moratoriumMonths) {
        const monthlyRate = rate / 12 / 100;
        const remainingTenure = tenureMonths - moratoriumMonths;
        return (principal * monthlyRate * Math.pow(1 + monthlyRate, remainingTenure)) / (Math.pow(1 + monthlyRate, remainingTenure) - 1);
    }

    function calculateEMIPostMoratoriumNoInterest(principal, rate, tenureMonths, moratoriumMonths) {
        const monthlyRate = rate / 12 / 100;
        const accruedInterest = principal * monthlyRate * moratoriumMonths;
        const remainingTenure = tenureMonths - moratoriumMonths;
        return ((principal + accruedInterest) * monthlyRate * Math.pow(1 + monthlyRate, remainingTenure)) / (Math.pow(1 + monthlyRate, remainingTenure) - 1);
    }

    function calculateEMINoMoratorium(principal, rate, tenureMonths) {
        const monthlyRate = rate / 12 / 100;
        return (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    }

    function generateAmortizationTable(principal, rate, tenureMonths, emi, moratoriumMonths = 0, interestServed = 'no') {
        const monthlyRate = rate / 12 / 100;
        let remainingPrincipal = principal;
        const amortizationCardsContainer = document.getElementById('amortizationCards');
        amortizationCardsContainer.innerHTML = ''; // Clear existing cards
    
        // Handle moratorium period
        if (moratoriumMonths > 0) {
            for (let i = 1; i <= moratoriumMonths; i++) {
                const interest = remainingPrincipal * monthlyRate;
    
                if (interestServed === 'yes') {
                    // Borrower serves interest during moratorium
                    amortizationCardsContainer.innerHTML += `
                        <div class="amortization-card">
                            <div class="amortization-card-header">Month ${i} (Moratorium - Interest Paid)</div>
                            <div class="amortization-card-content">
                                <span><strong>Principal Paid:</strong> ₹0.00</span>
                                <span><strong>Interest Paid:</strong> ₹${interest.toFixed(2)}</span>
                                <span><strong>Outstanding Balance:</strong> ₹${remainingPrincipal.toFixed(2)}</span>
                            </div>
                        </div>
                    `;
                } else {
                    // Borrower does not serve interest during moratorium
                    remainingPrincipal += interest; // Add interest to the principal
                    amortizationCardsContainer.innerHTML += `
                        <div class="amortization-card">
                            <div class="amortization-card-header">Month ${i} (Moratorium - Interest Accrued)</div>
                            <div class="amortization-card-content">
                                <span><strong>Principal Paid:</strong> ₹0.00</span>
                                <span><strong>Interest Paid:</strong> ₹${interest.toFixed(2)}</span>
                                <span><strong>Outstanding Balance:</strong> ₹${remainingPrincipal.toFixed(2)}</span>
                            </div>
                        </div>
                    `;
                }
            }
        }
    
        // Handle repayment period (grouped by years)
        let year = 1;
        let yearStartMonth = 1;
        let yearEndMonth = 12;
    
        while (yearStartMonth <= tenureMonths) {
            let totalPrincipalPaid = 0;
            let totalInterestPaid = 0;
            let monthlyDetails = '';
    
            for (let i = yearStartMonth; i <= Math.min(yearEndMonth, tenureMonths); i++) {
                const interest = remainingPrincipal * monthlyRate;
                let principalPaid = emi - interest;
    
                // Adjust the final EMI to ensure the Outstanding Balance does not go negative
                if (remainingPrincipal - principalPaid < 0) {
                    principalPaid = remainingPrincipal; // Adjust principal paid to close the loan
                }
    
                remainingPrincipal -= principalPaid;
                totalPrincipalPaid += principalPaid;
                totalInterestPaid += interest;
    
                // Add monthly details
                monthlyDetails += `
                    <div class="monthly-card">
                        <div class="amortization-card-header">Month ${i + moratoriumMonths}</div>
                        <div class="amortization-card-content">
                            <span><strong>Principal Paid:</strong> ₹${principalPaid.toFixed(2)}</span>
                            <span><strong>Interest Paid:</strong> ₹${interest.toFixed(2)}</span>
                            <span><strong>Outstanding Balance:</strong> ₹${remainingPrincipal.toFixed(2)}</span>
                        </div>
                    </div>
                `;
            }
    
            // Add the year card
            amortizationCardsContainer.innerHTML += `
                <div class="year-card">
                    <div class="year-card-header collapsed" data-year="${year}">
                        <span>Year ${year}</span>
                        <span><strong>Principal:</strong> ₹${totalPrincipalPaid.toFixed(2)}</span>
                        <span><strong>Interest:</strong> ₹${totalInterestPaid.toFixed(2)}</span>
                        <span><strong>Outstanding:</strong> ₹${remainingPrincipal.toFixed(2)}</span>
                        <i class="material-icons">expand_more</i>
                    </div>
                    <div class="year-card-content">
                        ${monthlyDetails}
                    </div>
                </div>
            `;
    
            year++;
            yearStartMonth += 12;
            yearEndMonth += 12;
        }
    
        // Add event listeners to year card headers for collapsing/expanding
        const yearCardHeaders = document.querySelectorAll('.year-card-header');
        yearCardHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                if (header.classList.contains('collapsed')) {
                    header.classList.remove('collapsed');
                    header.classList.add('expanded');
                    content.style.display = 'block';
                } else {
                    header.classList.remove('expanded');
                    header.classList.add('collapsed');
                    content.style.display = 'none';
                }
            });
        });
    }

    function updateAmortizationSchedule() {
        const principal = parseFloat(loanAmountInput.value);
        const rate = parseFloat(interestRateInput.value);
        const emi = parseFloat(emiSlider.value);
        const moratoriumMonths = parseFloat(moratoriumInput.value);
        const interestServedMoratorium = interestServedMoratoriumInput.value;
    
        if (isNaN(principal)) {
            alert('Please calculate EMI first.');
            return;
        }
    
        const monthlyRate = rate / 12 / 100;
        const minimumEMI = principal * monthlyRate;
    
        if (emi < minimumEMI) {
            alert(`EMI cannot be less than ₹${minimumEMI.toFixed(2)} (minimum EMI to cover interest).`);
            emiSlider.value = minimumEMI.toFixed(2);
            return;
        }
    
        try {
            const { numberOfPayments, totalInterest } = calculateAdjustedTenureAndInterest(
                principal,
                rate,
                emi,
                moratoriumMonths,
                interestServedMoratorium
            );
    
            const originalEmi = currentEMI;
            const interestSaved = (originalEmi * originalNumberOfPayments) - (emi * numberOfPayments);
            const emisSaved = originalNumberOfPayments - numberOfPayments;
    
            newEmiDisplay.textContent = `₹${emi.toFixed(2)}`;
            emiSavedDisplay.textContent = `₹${interestSaved.toFixed(2)}`;
            newTenureDisplay.textContent = `${emisSaved} months`;
    
            // Update the loan chart
            updateLoanChart(principal, rate, numberOfPayments, emi, moratoriumMonths, interestServedMoratorium);
    
            // Update the chart with the new EMI, interest saved, and EMIs saved
            updateChart('emi', { newEmi: emi, interestSaved, emisSaved });
    
            // Generate the amortization table
            generateAmortizationTable(principal, rate, numberOfPayments, emi, moratoriumMonths, interestServedMoratorium);
        } catch (error) {
            alert(error.message);
            emiSlider.value = currentEMI.toFixed(2);
        }
    }

    function updateLoanChart(principal, rate, tenureMonths, emi, moratoriumMonths = 0, interestServed = 'no') {
        const monthlyRate = rate / 12 / 100;
        let remainingPrincipal = principal;
        let labels = [];
        let principalData = [];
        let interestData = [];
        let remainingBalanceData = [];
    
        // Handle moratorium period
        if (moratoriumMonths > 0) {
            for (let i = 1; i <= moratoriumMonths; i++) {
                const interest = remainingPrincipal * monthlyRate;
    
                if (interestServed === 'yes') {
                    // Borrower serves interest during moratorium
                    labels.push(`Month ${i} (Moratorium - Interest Paid)`);
                    principalData.push(0); // No principal paid during moratorium
                    interestData.push(interest); // Interest is paid
                    remainingBalanceData.push(remainingPrincipal); // Principal remains unchanged
                } else {
                    // Borrower does not serve interest during moratorium
                    remainingPrincipal += interest; // Add interest to the principal
                    labels.push(`Month ${i} (Moratorium - Interest Accrued)`);
                    principalData.push(0); // No principal paid during moratorium
                    interestData.push(interest); // Interest is accrued
                    remainingBalanceData.push(remainingPrincipal); // Principal increases
                }
            }
        }
    
        // Handle repayment period
        for (let i = 1; i <= tenureMonths; i++) {
            const interest = remainingPrincipal * monthlyRate;
            let principalPaid = emi - interest;
        
            // Adjust the final EMI to ensure the Outstanding Balance does not go negative
            if (remainingPrincipal - principalPaid < 0) {
                principalPaid = remainingPrincipal; // Adjust principal paid to close the loan
            }
    
            remainingPrincipal -= principalPaid;
            labels.push(`Month ${i + moratoriumMonths}`);
            principalData.push(principalPaid);
            interestData.push(interest);
            remainingBalanceData.push(remainingPrincipal);
        }
    
        // Destroy the existing chart instance if it exists
        if (loanChart) {
            loanChart.destroy();
        }
    
        // Ensure Chart.js is loaded before creating a new chart
        if (typeof Chart === 'undefined') {
            console.error("Chart.js is not loaded. Please include Chart.js in your project.");
            return;
        }
    
        // Create a new chart instance
        loanChart = new Chart(loanChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Principal Paid',
                        data: principalData,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.2)',
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        yAxisID: 'y-axis-pi',
                    },
                    {
                        label: 'Interest Paid',
                        data: interestData,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.2)',
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        yAxisID: 'y-axis-pi',
                    },
                    {
                        label: 'Outstanding',
                        data: remainingBalanceData,
                        borderColor: '#2ecc71',
                        backgroundColor: 'rgba(46, 204, 113, 0.2)',
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        yAxisID: 'y-axis-balance',
                    },
                ],
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Loan Repayment Over Time',
                        font: {
                            size: 18,
                        },
                    },
                    subtitle: {
                        display: true,
                        text: 'Breakdown of Principal, Interest, and Outstanding',
                        font: {
                            size: 14,
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += `₹${context.parsed.y.toFixed(2)}`;
                                }
                                return label;
                            },
                        },
                    },
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20,
                        },
                    },
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Months',
                        },
                    },
                    'y-axis-pi': {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Principal / Interest Paid (₹)',
                        },
                        beginAtZero: true,
                    },
                    'y-axis-balance': {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Outstanding (₹)',
                        },
                        beginAtZero: true,
                        grid: {
                            drawOnChartArea: false,
                        },
                    },
                },
            },
        });
    }
}