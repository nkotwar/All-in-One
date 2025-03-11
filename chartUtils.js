// chartUtils.js
let summaryChart;
let payoutChart;

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