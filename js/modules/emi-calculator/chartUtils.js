// chartUtils.js
let summaryChart;
let payoutChart;
let loanChart; // Moved from emiCalculator.js

function updateCalculatorUI(metrics, domElements, isInterestServed, fromSlider = false) {
    // Update EMI slider and displays
    if (!fromSlider) {
        domElements.emiSlider.min = metrics.emi.toFixed(2);
        domElements.emiSlider.max = (metrics.emi * 3).toFixed(2);
        domElements.emiSlider.value = metrics.emi.toFixed(2);
    }
    domElements.newEmiDisplay.textContent = `₹${metrics.emi.toFixed(2)}`;
    domElements.emiSavedDisplay.textContent = `₹${(metrics.interestSaved || 0).toFixed(2)}`;
    domElements.newTenureDisplay.textContent = `${metrics.emisSaved || 0} months`;

    // Update additional metrics displays only on initial calculation
    if (!fromSlider) {
        domElements.nmiEmiRatioDisplay.textContent = `${metrics.nmiEmiRatio.toFixed(2)}%`;
        domElements.maxEmiCapacityDisplay.textContent = `₹${metrics.maxEmiCapacity.toFixed(2)}`;
        domElements.emiPostMoratoriumDisplay.textContent = `₹${metrics.emiPostMoratorium.toFixed(2)}`;
        domElements.maxLoanEligibilityDisplay.textContent = `₹${metrics.maxLoanEligibility.toFixed(2)}`;
        domElements.adjustedEmiCapacityDisplay.value = metrics.maxEmiCapacity.toFixed(2);

        // Update EMI during moratorium label and value
        const emiLabel = metrics.moratoriumMonths > 0 ? 'EMI during Moratorium' : 'EMI';
        document.getElementById('emi-label').textContent = emiLabel;
        domElements.emiMoratoriumDisplay.textContent = `₹${metrics.emiDuringMoratorium.toFixed(2)}`;

        // Update progress bar
        domElements.progressBar.style.width = `${metrics.nmiEmiRatio}%`;

        // Show/Hide moratorium-related UI elements
        const showMoratoriumUI = metrics.moratoriumMonths > 0;
        domElements.emiPostMoratoriumCard.style.display = showMoratoriumUI ? 'block' : 'none';
        domElements.interestServedToggle.style.display = showMoratoriumUI ? 'block' : 'none';
    }

    // Color code EMI values
    domElements.emiValues.forEach(value => {
        const emiAmount = parseFloat(value.textContent.replace('₹', '').replace(',', ''));
        if (emiAmount > metrics.maxEmiCapacity) {
            value.style.color = '#e74c3c'; // Red
        } else {
            value.style.color = '#2ecc71'; // Green
        }
    });

    // Update charts
    updateLoanChart(domElements.loanChartCanvas, metrics.principal, metrics.rate, metrics.numberOfPayments, metrics.emi, metrics.moratoriumMonths, isInterestServed);
    updateChart('emi', { newEmi: metrics.emi, interestSaved: metrics.interestSaved || 0, emisSaved: metrics.emisSaved || 0 });
}


function updateLoanChart(loanChartCanvas, principal, rate, repaymentTenure, emi, moratoriumMonths = 0, isInterestServed = false) {
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

            if (isInterestServed) {
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
    for (let i = 1; i <= repaymentTenure; i++) {
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
    if (loanChart && typeof loanChart.destroy === 'function') {
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


function updateChart(type, data) {
    const summaryChartCanvas = document.getElementById('summaryChart').getContext('2d');
    if (summaryChart) {
        summaryChart.destroy();
    }

    let chartConfig;

    switch (type) {
        case 'emi':
            chartConfig = {
                type: 'bar',
                data: {
                    labels: ['Forced EMI', 'Interest Saved', 'EMIs Saved'],
                    datasets: [
                        {
                            label: 'Forced EMI (₹)',
                            data: [data.newEmi, null, null],
                            backgroundColor: '#3498db',
                            borderColor: '#2980b9',
                            borderWidth: 1,
                            yAxisID: 'y-axis-emi',
                        },
                        {
                            label: 'Interest Saved (₹)',
                            data: [null, data.interestSaved, null],
                            backgroundColor: '#2ecc71',
                            borderColor: '#27ae60',
                            borderWidth: 1,
                            yAxisID: 'y-axis-emi',
                        },
                        {
                            label: 'EMIs Saved (Months)',
                            data: [null, null, data.emisSaved],
                            backgroundColor: '#e74c3c',
                            borderColor: '#c0392b',
                            borderWidth: 1,
                            yAxisID: 'y-axis-saved',
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        'y-axis-emi': {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Amount (₹)',
                            },
                            beginAtZero: true,
                        },
                        'y-axis-saved': {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'EMIs Saved (Months)',
                            },
                            beginAtZero: true,
                            grid: {
                                drawOnChartArea: false,
                            },
                        },
                    },
                },
            };
            break;

        case 'fd':
            chartConfig = {
                type: 'bar',
                data: {
                    labels: ['Total Deposits', 'Interest Earned', 'Maturity Amount'],
                    datasets: [{
                        label: 'Amount (₹)',
                        data: [data.principal, data.interestEarned, data.maturityAmount],
                        backgroundColor: ['#3498db', '#2ecc71', '#e74c3c'],
                        borderColor: ['#2980b9', '#27ae60', '#c0392b'],
                        borderWidth: 1,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Amount (₹)',
                            },
                        },
                    },
                },
            };
            break;

        case 'rd':
            chartConfig = {
                type: 'bar',
                data: {
                    labels: ['Total Deposits', 'Interest Earned', 'Maturity Amount'],
                    datasets: [{
                        label: 'Amount (₹)',
                        data: [data.totalDeposits, data.interestEarned, data.maturityAmount],
                        backgroundColor: ['#3498db', '#2ecc71', '#e74c3c'],
                        borderColor: ['#2980b9', '#27ae60', '#c0392b'],
                        borderWidth: 1,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Amount (₹)',
                            },
                        },
                    },
                },
            };
            break;

        default:
            console.error('Invalid chart type');
            return;
    }

    summaryChart = new Chart(summaryChartCanvas, chartConfig);
}