function initApyCalculator() {
    const calculateApyBtn = document.getElementById("calculate-apy");
    if (!calculateApyBtn) return;

    let contributionBreakdownChart;

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

        const monthlyContribution = contributionTable[pensionAmount][age];

        if (frequency === "monthly") return monthlyContribution;
        if (frequency === "quarterly") return monthlyContribution * 3;
        if (frequency === "half-yearly") return monthlyContribution * 6;
        return 0;
    }

    function calculateFutureValueAnnuity(contributionAmount, frequency, returnRate, contributionPeriod) {
        const contributionsPerYear = getContributionsPerYear(frequency);
        const totalContributions = contributionPeriod * contributionsPerYear;
        const periodicInterestRate = returnRate / 100 / contributionsPerYear;
        return contributionAmount * (Math.pow(1 + periodicInterestRate, totalContributions) - 1) / periodicInterestRate;
    }

    function calculateGovernmentCoContribution(contributionAmount, frequency, isTaxPayer, returnRate) {
        if (isTaxPayer) return 0;
        const contributionsPerYear = getContributionsPerYear(frequency);
        const annualContribution = contributionAmount * contributionsPerYear;
        const governmentContributionPerYear = Math.min(annualContribution * 0.5, 1000);
        return calculateFutureValueAnnuity(governmentContributionPerYear / contributionsPerYear, frequency, returnRate, 5);
    }

    function calculateTotalCorpus(contributionAmount, frequency, returnRate, contributionPeriod, isTaxPayer) {
        const futureValueContributions = calculateFutureValueAnnuity(contributionAmount, frequency, returnRate, contributionPeriod);
        const futureValueGovernment = calculateGovernmentCoContribution(contributionAmount, frequency, isTaxPayer, returnRate);
        return futureValueContributions + futureValueGovernment;
    }

    function calculateReturnOfCorpus(pensionAmount) {
        const returnOfCorpusTable = { 1000: 170000, 2000: 340000, 3000: 510000, 4000: 680000, 5000: 850000 };
        return returnOfCorpusTable[pensionAmount];
    }

    function calculatePension(corpus, annuityRate) {
        return (corpus * (annuityRate / 100)) / 12;
    }

    function calculateNPV(pensionAmount, annuityRate, years) {
        const annualPension = pensionAmount * 12;
        const discountRate = annuityRate / 100;
        return annualPension * ((1 - Math.pow(1 + discountRate, -years)) / discountRate);
    }

    function updateCharts(totalCorpus, subscriberContribution, governmentContribution, npvPension) {
        const ctx = document.getElementById('apy-contribution-breakdown-chart').getContext('2d');
        if (contributionBreakdownChart) contributionBreakdownChart.destroy();

        contributionBreakdownChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Subscriber Contribution', 'Government Co-Contribution', 'Total Corpus', 'NPV of Pension Payments at Age 60'],
                datasets: [{
                    data: [subscriberContribution, governmentContribution, totalCorpus, npvPension],
                    backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f'],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: { label: (ctx) => `₹${ctx.raw.toLocaleString()}` } }
                }
            }
        });
    }

    calculateApyBtn.addEventListener("click", () => {
        const age = parseFloat(document.getElementById("apy-age").value);
        const pensionAmount = parseFloat(document.getElementById("apy-pension-amount").value);
        const frequency = document.getElementById("apy-frequency").value;
        const isTaxPayer = document.getElementById("apy-tax-payer").value === "yes";
        const returnRate = parseFloat(document.getElementById("apy-return-rate").value) || 10;
        const annuityRate = parseFloat(document.getElementById("apy-annuity-rate").value) || 7;

        if (isNaN(age) || age < 18 || age > 40) { alert("Please enter a valid age between 18 and 40 years."); return; }
        if (isNaN(pensionAmount) || pensionAmount < 1000 || pensionAmount > 5000) { alert("Please select a valid pension amount (₹1,000 to ₹5,000)."); return; }
        if (isNaN(returnRate) || returnRate < 0) { alert("Please enter a valid return rate (e.g., 10 for 10%)."); return; }
        if (isNaN(annuityRate) || annuityRate < 0) { alert("Please enter a valid annuity rate (e.g., 7 for 7%)."); return; }

        const contributionPeriod = 60 - age;
        const contributionAmount = calculateAPYContribution(age, pensionAmount, frequency);
        const totalCorpus = calculateTotalCorpus(contributionAmount, frequency, returnRate, contributionPeriod, isTaxPayer);
        const returnOfCorpus = calculateReturnOfCorpus(pensionAmount);
        const calculatedPension = calculatePension(totalCorpus, annuityRate);
        const finalPension = Math.max(calculatedPension, pensionAmount);
        const npvPension = calculateNPV(finalPension, annuityRate, 30);

        document.getElementById("apy-contribution-amount").textContent = `₹${contributionAmount.toFixed(2)}`;
        document.getElementById("apy-total-contribution").textContent = `₹${(contributionAmount * getContributionsPerYear(frequency) * contributionPeriod).toFixed(2)}`;
        document.getElementById("apy-government-co-contribution").textContent = `₹${calculateGovernmentCoContribution(contributionAmount, frequency, isTaxPayer, returnRate).toFixed(2)}`;
        document.getElementById("apy-corpus").textContent = `₹${totalCorpus.toFixed(2)}`;
        document.getElementById("apy-pension-amount-result").textContent = `₹${finalPension.toFixed(2)}`;
        document.getElementById("apy-return-of-corpus").textContent = `₹${returnOfCorpus.toFixed(2)}`;
        document.getElementById("apy-npv-pension").textContent = `₹${npvPension.toFixed(2)}`;

        const subscriberContribution = contributionAmount * getContributionsPerYear(frequency) * contributionPeriod;
        const governmentContribution = calculateGovernmentCoContribution(contributionAmount, frequency, isTaxPayer, returnRate);
        updateCharts(totalCorpus, subscriberContribution, governmentContribution, npvPension);
    });
}