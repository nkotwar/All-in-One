// wealthSimulator.js

document.addEventListener("DOMContentLoaded", () => {
    const calculatorTabs = document.querySelectorAll(".calculator-tabs .tab-button");
    const calculatorContents = document.querySelectorAll(".calculator-content");

    // Tab Switching Logic
    calculatorTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const targetCalculator = tab.getAttribute("data-calculator");

            // Hide all calculator contents
            calculatorContents.forEach(content => {
                content.classList.remove("active");
            });

            // Show the selected calculator content
            document.getElementById(`${targetCalculator}-calculator`).classList.add("active");

            // Update active tab
            calculatorTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
        });
    });

    // APY Calculator Logic
    document.getElementById("calculate-apy").addEventListener("click", () => {
        // Get input values
        const age = parseFloat(document.getElementById("apy-age").value);
        const pensionAmount = parseFloat(document.getElementById("apy-pension-amount").value);
        const frequency = document.getElementById("apy-frequency").value;
        const isTaxPayer = document.getElementById("apy-tax-payer").value === "yes";
        const returnRate = parseFloat(document.getElementById("apy-return-rate").value) || 10; // Default return rate: 10%
        const annuityRate = parseFloat(document.getElementById("apy-annuity-rate").value) || 7; // Default annuity rate: 7%
    
        // Validate inputs
        if (isNaN(age) || age < 18 || age > 40) {
            alert("Please enter a valid age between 18 and 40 years.");
            return;
        }
    
        if (isNaN(pensionAmount) || pensionAmount < 1000 || pensionAmount > 5000) {
            alert("Please select a valid pension amount (₹1,000 to ₹5,000).");
            return;
        }
    
        if (isNaN(returnRate) || returnRate < 0) {
            alert("Please enter a valid return rate (e.g., 10 for 10%).");
            return;
        }
    
        if (isNaN(annuityRate) || annuityRate < 0) {
            alert("Please enter a valid annuity rate (e.g., 7 for 7%).");
            return;
        }
    
        // Calculate contribution period (in years)
        const contributionPeriod = 60 - age;
    
        // Calculate contribution amount based on frequency
        const contributionAmount = calculateAPYContribution(age, pensionAmount, frequency);
    
        // Calculate total corpus (subscriber + government co-contribution)
        const totalCorpus = calculateTotalCorpus(contributionAmount, frequency, returnRate, contributionPeriod, isTaxPayer);
    
        // Calculate Return of Corpus Amount to the Nominee
        const returnOfCorpus = calculateReturnOfCorpus(pensionAmount);
    
        // Calculate pension amount based on corpus and annuity rate
        const calculatedPension = calculatePension(totalCorpus, annuityRate);
    
        // Ensure minimum pension guarantee
        const finalPension = Math.max(calculatedPension, pensionAmount);
    
        // Calculate NPV of Future Pension Payments at Age 60
        const npvPension = calculateNPV(finalPension, annuityRate, 30); // Assuming 30 years of pension payments (age 60 to 90)
    
        // Display results
        document.getElementById("apy-contribution-amount").textContent = `₹${contributionAmount.toFixed(2)}`;
        document.getElementById("apy-total-contribution").textContent = `₹${(contributionAmount * getContributionsPerYear(frequency) * contributionPeriod).toFixed(2)}`;
        document.getElementById("apy-government-co-contribution").textContent = `₹${calculateGovernmentCoContribution(contributionAmount, frequency, isTaxPayer, returnRate).toFixed(2)}`;
        document.getElementById("apy-corpus").textContent = `₹${totalCorpus.toFixed(2)}`;
        document.getElementById("apy-pension-amount-result").textContent = `₹${finalPension.toFixed(2)}`;
        document.getElementById("apy-return-of-corpus").textContent = `₹${returnOfCorpus.toFixed(2)}`;
        document.getElementById("apy-npv-pension").textContent = `₹${npvPension.toFixed(2)}`;
    
        // Update charts
        const subscriberContribution = contributionAmount * getContributionsPerYear(frequency) * contributionPeriod;
        const governmentContribution = calculateGovernmentCoContribution(contributionAmount, frequency, isTaxPayer, returnRate);
        updateCharts(totalCorpus, subscriberContribution, governmentContribution, npvPension);
    });

    // Helper function to get contributions per year based on frequency
    function getContributionsPerYear(frequency) {
        if (frequency === "monthly") return 12;
        else if (frequency === "quarterly") return 4;
        else if (frequency === "half-yearly") return 2;
        return 0;
    }

    // Function to calculate APY contribution amount
    function calculateAPYContribution(age, pensionAmount, frequency) {
        // Contribution amounts are based on the official APY contribution table
        const contributionTable = {
            1000: { 18: 42, 19: 46, 20: 50, 21: 54, 22: 59, 23: 64, 24: 70, 25: 76, 26: 82, 27: 90, 28: 97, 29: 106, 30: 116, 31: 126, 32: 138, 33: 151, 34: 165, 35: 181, 36: 198, 37: 217, 38: 238, 39: 261, 40: 287 },
            2000: { 18: 84, 19: 92, 20: 100, 21: 108, 22: 117, 23: 127, 24: 139, 25: 151, 26: 164, 27: 178, 28: 194, 29: 212, 30: 231, 31: 252, 32: 276, 33: 302, 34: 330, 35: 362, 36: 396, 37: 434, 38: 476, 39: 522, 40: 573 },
            3000: { 18: 126, 19: 138, 20: 150, 21: 162, 22: 177, 23: 192, 24: 208, 25: 226, 26: 246, 27: 268, 28: 292, 29: 318, 30: 347, 31: 379, 32: 414, 33: 453, 34: 495, 35: 543, 36: 594, 37: 654, 38: 720, 39: 792, 40: 873 },
            4000: { 18: 168, 19: 184, 20: 200, 21: 216, 22: 234, 23: 254, 24: 277, 25: 301, 26: 327, 27: 356, 28: 388, 29: 423, 30: 462, 31: 504, 32: 551, 33: 602, 34: 659, 35: 722, 36: 792, 37: 870, 38: 957, 39: 1054, 40: 1164 },
            5000: { 18: 210, 19: 230, 20: 250, 21: 270, 22: 292, 23: 318, 24: 346, 25: 376, 26: 409, 27: 446, 28: 485, 29: 529, 30: 577, 31: 630, 32: 689, 33: 752, 34: 824, 35: 902, 36: 990, 37: 1087, 38: 1196, 39: 1318, 40: 1454 }
        };

        // Get the monthly contribution from the table
        const monthlyContribution = contributionTable[pensionAmount][age];

        // Adjust contribution amount based on frequency
        if (frequency === "monthly") {
            return monthlyContribution;
        } else if (frequency === "quarterly") {
            return monthlyContribution * 3; // Quarterly contribution
        } else if (frequency === "half-yearly") {
            return monthlyContribution * 6; // Half-yearly contribution
        }

        return 0;
    }

    // Function to calculate total corpus (subscriber + government co-contribution)
    function calculateTotalCorpus(contributionAmount, frequency, returnRate, contributionPeriod, isTaxPayer) {
        // Future value of subscriber contributions
        const futureValueContributions = calculateFutureValueAnnuity(contributionAmount, frequency, returnRate, contributionPeriod);

        // Future value of government co-contribution
        const futureValueGovernment = calculateGovernmentCoContribution(contributionAmount, frequency, isTaxPayer, returnRate);

        return futureValueContributions + futureValueGovernment;
    }

    // Function to calculate future value of an annuity (subscriber contributions)
    function calculateFutureValueAnnuity(contributionAmount, frequency, returnRate, contributionPeriod) {
        const contributionsPerYear = getContributionsPerYear(frequency);
        const totalContributions = contributionPeriod * contributionsPerYear;
        const periodicInterestRate = returnRate / 100 / contributionsPerYear;

        // Future Value of Annuity formula
        const futureValue = contributionAmount *
            (Math.pow(1 + periodicInterestRate, totalContributions) - 1) / periodicInterestRate;

        return futureValue;
    }

    // Function to calculate government co-contribution
    function calculateGovernmentCoContribution(contributionAmount, frequency, isTaxPayer, returnRate) {
        if (isTaxPayer) return 0; // No co-contribution for tax payers
    
        // Government contributes 50% of annual contribution or ₹1,000 per year (whichever is lower)
        const contributionsPerYear = getContributionsPerYear(frequency);
        const annualContribution = contributionAmount * contributionsPerYear;
        const governmentContributionPerYear = Math.min(annualContribution * 0.5, 1000);
    
        // Future value of government co-contribution (treated as an annuity for 5 years)
        const futureValueGovernment = calculateFutureValueAnnuity(
            governmentContributionPerYear / contributionsPerYear,
            frequency,
            returnRate,
            5 // Government co-contribution is only for the first 5 years
        );
    
        return futureValueGovernment;
    }

    // Function to calculate Return of Corpus Amount to the Nominee
    function calculateReturnOfCorpus(pensionAmount) {
        const returnOfCorpusTable = {
            1000: 170000, // ₹1.7 Lakh
            2000: 340000, // ₹3.4 Lakh
            3000: 510000, // ₹5.1 Lakh
            4000: 680000, // ₹6.8 Lakh
            5000: 850000  // ₹8.5 Lakh
        };

        return returnOfCorpusTable[pensionAmount];
    }

    // Function to calculate pension amount based on annuity rate
    function calculatePension(corpus, annuityRate) {
        const annualPension = corpus * (annuityRate / 100);
        const monthlyPension = annualPension / 12;
        return monthlyPension;
    }

    // Function to calculate NPV of future pension payments at age 60
    function calculateNPV(pensionAmount, annuityRate, years) {
        const annualPension = pensionAmount * 12; // Convert monthly pension to annual
        const discountRate = annuityRate / 100; // Convert annuity rate to decimal
        const npv = annualPension * ((1 - Math.pow(1 + discountRate, -years)) / discountRate);
        return npv;
    }
    
    // Initialize Chart.js
    const contributionBreakdownChartCtx = document.getElementById('apy-contribution-breakdown-chart').getContext('2d');

    let contributionBreakdownChart;

    // Function to update charts
    function updateCharts(totalCorpus, subscriberContribution, governmentContribution, npvPension) {
        // Destroy existing chart if it exists
        if (contributionBreakdownChart) contributionBreakdownChart.destroy();

        // Pie Chart: Contribution and Future Value Breakdown
        contributionBreakdownChart = new Chart(contributionBreakdownChartCtx, {
            type: 'pie',
            data: {
                labels: [
                    'Subscriber Contribution',
                    'Government Co-Contribution',
                    'Total Corpus',
                    'NPV of Pension Payments at Age 60'
                ],
                datasets: [{
                    data: [subscriberContribution, governmentContribution, totalCorpus, npvPension],
                    backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f'],
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `₹${ctx.raw.toLocaleString()}` // Format tooltip with ₹ symbol
                        }
                    }
                }
            }
        });
    }
    

    let agePicker;
    let withdrawals = []; // Array to store multiple withdrawals
    let isAccountClosed = false; // Flag to track if the account is closed
    let lastKnownCorpus = 0;

    // Initialize Age Picker
    const agePickerContainer = document.querySelector('#age-picker-container');
    const selectedAgeDisplay = document.getElementById('selected-age');
    const initialAgeInput = document.getElementById('initial-age');

    function initializeAgePicker(initialAge) {
        const ages = Array.from({ length: 22 }, (_, i) => initialAge + i); // Ages from initialAge to initialAge + 21
        if (!agePicker) {
            agePicker = new AgePicker(agePickerContainer, ages, { x: 400, y: 400 });
        } else {
            agePicker.initAgeData(ages); // Update the existing AgePicker
            agePicker.updateSegmentsDrawData();
        }

        // Set selected age to 15 by default
        agePicker._selectedAge = 15;
        selectedAgeDisplay.textContent = 15;
    }

    // Update Age Picker when initial age changes
    initialAgeInput.addEventListener("input", (e) => {
        const initialAge = parseInt(e.target.value, 10);
        if (!isNaN(initialAge) && initialAge >= 0 && initialAge <= 10) {
            initializeAgePicker(initialAge);
        }
    });

    // Initialize with default age
    initializeAgePicker(parseInt(initialAgeInput.value, 10) || 0);

    agePickerContainer.addEventListener("click", (event) => {
        const rect = agePicker._canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        const distanceToCenter = Math.sqrt((clickX - agePicker._center.x) ** 2 + (clickY - agePicker._center.y) ** 2);
    
        // If click is within the center circle, reset selected age to 11
        if (distanceToCenter < agePicker._circleData.innerRadius) {
            agePicker._selectedAge = 15;
            selectedAgeDisplay.textContent = 15;
        }
    });

    // SSY Calculation Logic
    document.getElementById("calculate-ssy").addEventListener("click", function () {    
        const selectedAge = parseInt(selectedAgeDisplay.textContent, 10);
        const initialAge = parseInt(document.getElementById("initial-age").value, 10);
        const depositFrequency = document.getElementById("ssy-deposit-frequency").value;
        const deposit = parseFloat(document.getElementById("ssy-deposit").value);
        const interestRate = parseFloat(document.getElementById("ssy-interest-rate").value) || 8.2;

        // Validate selected age
        if (isNaN(selectedAge) || selectedAge < initialAge || selectedAge > initialAge + 21) {
            alert(`Please select a valid age between ${initialAge} and ${initialAge + 21}.`);
            return;
        }
    
        // Validate inputs
        if (isNaN(initialAge) || initialAge < 0 || initialAge > 10) {
            alert("Please select a valid age for the girl child (0 to 10 years).");
            return;
        }
    
        if (isNaN(deposit) || deposit < 250 || deposit > 150000) {
            alert("Please enter a valid deposit amount (₹250 to ₹1.5 Lakh).");
            return;
        }
        
        if (depositFrequency === "monthly" && (isNaN(deposit) || deposit*12  > 150000)) {
            alert("Yearly Deposit cannot exceed Rupees 1.5 Lakh.");
            return;
        }
    
        if (isNaN(interestRate) || interestRate < 0) {
            alert("Please enter a valid interest rate (e.g., 8.2 for 8.2%).");
            return;
        }
    
        // Calculate SSY
        calculateSSY(selectedAge, depositFrequency, deposit, interestRate);
    
        // // ✅ Change button text to "Reset" after first calculation
        // const button = document.getElementById("calculate-ssy");
        // button.textContent = "Reset";
    
        // // ✅ Remove old event listener and add new one for resetting
        // button.removeEventListener("click", arguments.callee); // Remove current function
        // button.addEventListener("click", () => location.reload()); // Refresh page on click
    });
       
    

    function calculateSSY(age, depositFrequency, deposit, interestRate) {
        const depositTenure = 15; // Deposits happen for 15 years
        const maturityTenure = 21; // Interest accrues for 21 years
        let totalCorpus = 0;
        let totalDeposits = 0;
        let corpusGrowth = [];
        let depositGrowth = [];
    
        const monthlyRate = (interestRate / 100) / 12; // Monthly interest rate
        const yearlyRate = (interestRate / 100); // Yearly interest rate
    
        for (let year = 1; year <= maturityTenure; year++) {
            if (year <= depositTenure) {
                if (depositFrequency === "monthly") {
                    for (let month = 1; month <= 12; month++) {
                        totalDeposits += deposit;
                        totalCorpus += deposit; // Add monthly deposit
                        totalCorpus += totalCorpus * monthlyRate; // Apply monthly interest
                    }
                } else {
                    totalDeposits += deposit;
                    totalCorpus += deposit; // Add yearly deposit
                    totalCorpus += totalCorpus * yearlyRate; // Apply yearly interest
                }
            } else {
                // No more deposits, only interest accrual
                totalCorpus += totalCorpus * yearlyRate;
            }
    
            corpusGrowth.push(totalCorpus);
            depositGrowth.push(totalDeposits);
        }
    
        // Display updated corpus
        document.getElementById("ssy-total-corpus").textContent = `₹${totalCorpus.toFixed(2)}`;
    
        // Update chart
        updateSSYChart(corpusGrowth, depositGrowth);
    }
    

    // Withdrawal Logic
    document.getElementById("add-education-withdrawal").addEventListener("click", () => addWithdrawal("education"));
    document.getElementById("add-marriage-withdrawal").addEventListener("click", () => addWithdrawal("marriage"));
    document.getElementById("add-premature-withdrawal").addEventListener("click", () => addWithdrawal("premature"));

    function addWithdrawal(withdrawalType) {
        const selectedAge = parseInt(selectedAgeDisplay.textContent, 10);
        const initialAge = parseInt(document.getElementById("initial-age").value, 10);
        const maxAllowedAge = initialAge + 21;
    
        // Validate selected age
        if (isNaN(selectedAge)) {
            alert("Please select a valid age.");
            return;
        }
    
        if (selectedAge < initialAge || selectedAge > maxAllowedAge) {
            alert(`Please select a valid age between ${initialAge} and ${maxAllowedAge}.`);
            return;
        }
    
        if (isAccountClosed) {
            alert("The account is already closed. No further withdrawals or deposits are allowed.");
            return;
        }
    
        let currentCorpus = lastKnownCorpus > 0 ? lastKnownCorpus : 0;
    
        // Ensure that no further withdrawals happen after 100% corpus withdrawal
        let totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);
        if (currentCorpus > 0 && totalWithdrawn >= currentCorpus) {
            alert("No further withdrawals allowed as 100% of the balance has been withdrawn.");
            return;
        }
    
        // Prevent multiple Education withdrawals
        if ((withdrawalType === "education" || withdrawalType === "marriage") && (withdrawals.some(w => w.type === "education") || withdrawals.some(w => w.type === "marriage"))) {
            alert("Premature withdrawal (50%) allowed only once.");
            return;
        }
    
        // Ensure Marriage/Premature happens after Education withdrawal
        let lastEducationWithdrawal = withdrawals.find(w => w.type === "education");
        let lastMarriageWithdrawal = withdrawals.find(w => w.type === "marriage");
        if (withdrawalType === "premature" && lastEducationWithdrawal) {
            if (selectedAge <= lastEducationWithdrawal.year) {
                alert(`Premature Closure must be after Education withdrawal (Age ${lastEducationWithdrawal.year}).`);
                return;
            }
        }
        if (withdrawalType === "premature" && lastMarriageWithdrawal) {
            if (selectedAge <= lastMarriageWithdrawal.year) {
                alert(`Premature Closure must be after Marriage withdrawal (Age ${lastMarriageWithdrawal.year}).`);
                return;
            }
        }
    
        // Restrict Marriage withdrawals before 18
        if (withdrawalType === "marriage" && selectedAge < 18) {
            alert("No marriage withdrawal before Legal age.");
            return;
        }
    
        // Restrict Education withdrawals before 10
        if (withdrawalType === "education" && selectedAge < 15) {
            alert("No Education withdrawal before passing 10th. (Assumed age of passing 10th - 15)");
            return;
        }
    
        let withdrawalAmount = 0;
    
        if (withdrawalType === "education" || withdrawalType === "marriage" ) {
            withdrawalAmount = currentCorpus * 0.5;
        } else if (withdrawalType === "premature") {
            withdrawalAmount = currentCorpus;
        }
    
        withdrawals.push({
            type: withdrawalType,
            year: selectedAge,
            amount: withdrawalAmount
        });
    
        if (withdrawalType === "premature" || withdrawalType === "marriage") {
            isAccountClosed = true;
        }
    
        updateWithdrawalList();
        calculateSSYWithWithdrawals();
    }
    

    function updateWithdrawalList() {
        const withdrawalList = document.getElementById("withdrawal-list");
        withdrawalList.innerHTML = ""; // Clear the list
    
        withdrawals.forEach((withdrawal) => {
            const li = document.createElement("li");
            li.textContent = `Age ${withdrawal.year}: ${withdrawal.type} (${withdrawal.type === "marriage" || withdrawal.type === "premature" ? "100%" : "50%"})`;
            withdrawalList.appendChild(li);
        });
    }

    function calculateSSYWithWithdrawals() {
        const selectedAge = parseInt(selectedAgeDisplay.textContent, 10);
        const initialAge = parseInt(document.getElementById("initial-age").value, 10);
        const depositFrequency = document.getElementById("ssy-deposit-frequency").value;
        const deposit = parseFloat(document.getElementById("ssy-deposit").value);
        const interestRate = parseFloat(document.getElementById("ssy-interest-rate").value) || 8.2;
    
        // Constants for deposit and maturity periods
        const depositTenure = 15; // Deposits happen for 15 years
        const maturityTenure = 21; // Interest accrues for 21 years
    
        let totalCorpus = 0;
        let totalDeposits = 0;
        let corpusGrowth = [];
        let depositGrowth = [];
        let fundsWithdrawn = 0; // Track total withdrawals
        let isAccountClosed = false;
    
        for (let i = 0; i < maturityTenure; i++) {
            const absoluteAge = initialAge + i;
    
            if (isAccountClosed) {
                // If the account is closed, no further deposits or interest accrual
                corpusGrowth.push(0);
                depositGrowth.push(totalDeposits);
                continue;
            }
    
            // Add deposits for the first 15 years
            if (i < depositTenure) {
                const annualDeposit = depositFrequency === "monthly" ? deposit * 12 : deposit;
                if (annualDeposit > 150000) {
                    alert("Annual deposit cannot exceed ₹1.5 Lakh.");
                    return;
                }
                totalDeposits += annualDeposit;
                totalCorpus += annualDeposit;
            }
    
            // Apply interest for the current year
            totalCorpus += totalCorpus * (interestRate / 100);
    
            // Process withdrawals for the current age
            withdrawals.forEach((withdrawal) => {
                if (withdrawal.year === absoluteAge) {
                    let withdrawAmount = 0;
    
                    if (withdrawal.type === "marriage" || withdrawal.type === "education") {
                        withdrawAmount = totalCorpus * 0.5; // 50% withdrawal for education/marriage
                        totalCorpus *= 0.5; // Reduce corpus by 50%
                    } else if (withdrawal.type === "premature") {
                        withdrawAmount = totalCorpus; // 100% withdrawal for premature
                        totalCorpus = 0; // Set corpus to 0
                        isAccountClosed = true; // Close the account
                    }
    
                    fundsWithdrawn += withdrawAmount; // Add to total funds withdrawn
                    withdrawal.amount = withdrawAmount; // Update withdrawal amount
                }
            });
    
            // Track corpus and deposit growth
            corpusGrowth.push(totalCorpus);
            depositGrowth.push(totalDeposits);
        }
    
        // Update last known corpus
        lastKnownCorpus = totalCorpus;
    
        // Update results display
        updateResultsDisplay(totalCorpus, fundsWithdrawn);
    
        // Update chart
        updateSSYChart(corpusGrowth, depositGrowth);
    }
    
    
    function updateResultsDisplay(totalCorpus, fundsWithdrawn) {
        const totalCorpusElement = document.getElementById("ssy-total-corpus");
        const fundsWithdrawnElement = document.getElementById("ssy-funds-withdrawn");
        const fundsWithdrawnList = document.getElementById("withdrawal-list");
    
        fundsWithdrawnList.innerHTML = ""; // Clear previous list
    
        if (withdrawals.length > 0) {
            withdrawals.forEach((withdrawal) => {
                const li = document.createElement("li");
                const percentage = withdrawal.type === "premature" ? "100%" : "50%";
                li.textContent = `Age ${withdrawal.year}: ${withdrawal.type.toUpperCase()} (${percentage} - ₹${withdrawal.amount.toFixed(2)})`;
                fundsWithdrawnList.appendChild(li);
            });
            fundsWithdrawnElement.parentElement.style.display = "block";
        } else {
            fundsWithdrawnElement.parentElement.style.display = "none";
        }
    
        if (isAccountClosed) {
            totalCorpusElement.textContent = `₹${fundsWithdrawn.toFixed(2)}`; // Total corpus is the total withdrawn
            fundsWithdrawnElement.textContent = `₹${fundsWithdrawn.toFixed(2)}`;
        } else {
            totalCorpusElement.textContent = `₹${(totalCorpus + fundsWithdrawn).toFixed(2)}`; // Total corpus includes withdrawals
            fundsWithdrawnElement.textContent = `₹${fundsWithdrawn.toFixed(2)}`;
        }
    }
    
    function updateSSYChart(corpusGrowth, depositGrowth) {
        const ctx = document.getElementById('ssy-corpus-growth-chart').getContext('2d');
    
        // Destroy existing chart if it exists
        if (window.ssyChart) {
            window.ssyChart.destroy();
        }
    
        // Generate labels for the x-axis (Absolute Age)
        const initialAge = parseInt(document.getElementById("initial-age").value, 10);
        const labels = corpusGrowth.map((_, index) => {
            const age = initialAge + index; // Absolute age
            return `Age ${age}`;
        });
    
        // Create the chart
        window.ssyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Corpus Growth',
                        data: corpusGrowth,
                        borderColor: '#3498db',
                        fill: false,
                    },
                    {
                        label: 'Total Deposits',
                        data: depositGrowth,
                        borderColor: '#2ecc71',
                        fill: false,
                    }
                ]
            },
            options: {
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Age',
                        },
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Amount (₹)',
                        },
                    },
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.dataset.label || '';
                                const value = context.raw || 0;
                                return `${label}: ₹${value.toFixed(2)}`;
                            },
                        },
                    },
                },
            },
        });
    }
    // FD Calculator Logic
    document.getElementById("calculate-fd").addEventListener("click", () => {
        const principal = parseFloat(document.getElementById("fd-principal").value);
        const rate = parseFloat(document.getElementById("fd-interest-rate").value);
        const tenure = parseFloat(document.getElementById("fd-tenure").value);

        if (isNaN(principal) || isNaN(rate) || isNaN(tenure)) {
            alert("Please enter valid values for all fields.");
            return;
        }

        const maturityAmount = principal * Math.pow(1 + rate / 100, tenure);
        const interestEarned = maturityAmount - principal;

        document.getElementById("fd-maturity-amount").textContent = `₹${maturityAmount.toFixed(2)}`;
        document.getElementById("fd-interest-earned").textContent = `₹${interestEarned.toFixed(2)}`;
    });

    // RD Calculator Logic
    document.getElementById("calculate-rd").addEventListener("click", () => {
        const deposit = parseFloat(document.getElementById("rd-deposit").value);
        const rate = parseFloat(document.getElementById("rd-interest-rate").value);
        const tenure = parseFloat(document.getElementById("rd-tenure").value);

        if (isNaN(deposit) || isNaN(rate) || isNaN(tenure)) {
            alert("Please enter valid values for all fields.");
            return;
        }

        const n = tenure * 12; // Convert years to months
        const r = rate / 100 / 12; // Monthly interest rate
        const maturityAmount = deposit * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
        const interestEarned = maturityAmount - (deposit * n);

        document.getElementById("rd-maturity-amount").textContent = `₹${maturityAmount.toFixed(2)}`;
        document.getElementById("rd-interest-earned").textContent = `₹${interestEarned.toFixed(2)}`;
    });
});