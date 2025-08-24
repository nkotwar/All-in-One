function initPpfCalculator() {
    const calculatePpfBtn = document.getElementById("calculate-ppf");
    if (!calculatePpfBtn) return;

    let ppfWithdrawals = [];

    function updatePPFChart(corpusGrowth, depositGrowth, withdrawalsOverTime) {
        const ctx = document.getElementById('ppf-corpus-growth-chart').getContext('2d');
        if (window.ppfChart) window.ppfChart.destroy();

        const labels = corpusGrowth.map((_, index) => `Year ${index + 1}`);
        const withdrawalData = new Array(corpusGrowth.length).fill(0);
        withdrawalsOverTime.forEach((withdrawal) => {
            if (withdrawal.year - 1 < withdrawalData.length) {
                withdrawalData[withdrawal.year - 1] = withdrawal.amount;
            }
        });

        window.ppfChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Corpus Growth', data: corpusGrowth, borderColor: '#3498db', fill: false },
                    { label: 'Total Deposits', data: depositGrowth, borderColor: '#2ecc71', fill: false },
                    { label: 'Withdrawals', data: withdrawalData, borderColor: '#e74c3c', fill: false, borderDash: [5, 5] }
                ]
            },
            options: {
                scales: {
                    x: { title: { display: true, text: 'Years' } },
                    y: { title: { display: true, text: 'Amount (₹)' } }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.dataset.label || ''}: ₹${(context.raw || 0).toFixed(2)}`
                        }
                    }
                }
            }
        });
    }

    function updatePPFWithdrawalList() {
        const withdrawalList = document.getElementById("ppf-withdrawal-list");
        withdrawalList.innerHTML = "";
        let totalWithdrawn = 0;
        ppfWithdrawals.forEach((withdrawal) => {
            const li = document.createElement("li");
            li.textContent = `Year ${withdrawal.year}: ₹${withdrawal.amount.toFixed(2)}`;
            withdrawalList.appendChild(li);
            totalWithdrawn += withdrawal.amount;
        });
        document.getElementById("ppf-funds-withdrawn").textContent = `₹${totalWithdrawn.toFixed(2)}`;
    }

    function calculateBalanceAtYear(targetYear) {
        if (targetYear <= 0) return 0;
        const depositFrequency = document.getElementById("ppf-deposit-frequency").value;
        const deposit = parseFloat(document.getElementById("ppf-deposit").value);
        const interestRate = parseFloat(document.getElementById("ppf-interest-rate").value) / 100;
        let totalCorpus = 0;

        for (let year = 1; year <= targetYear; year++) {
            if (depositFrequency === "yearly") {
                totalCorpus += deposit;
                totalCorpus *= (1 + interestRate);
            } else if (depositFrequency === "monthly") {
                for (let month = 1; month <= 12; month++) {
                    totalCorpus += deposit;
                    totalCorpus *= (1 + interestRate / 12);
                }
            }
        }
        return totalCorpus;
    }

    function calculatePPF(depositFrequency, deposit, interestRate, tenure, resetWithdrawals = false) {
        if (resetWithdrawals) {
            ppfWithdrawals = [];
        }

        let totalCorpus = 0;
        let totalDeposits = 0;
        let corpusGrowth = [];
        let depositGrowth = [];
        let withdrawalsOverTime = [];
        let totalWithdrawn = 0;

        for (let year = 1; year <= tenure; year++) {
            let yearlyDeposit = 0;
            if (depositFrequency === "yearly") {
                yearlyDeposit = deposit;
                totalDeposits += yearlyDeposit;
                totalCorpus += yearlyDeposit;
                totalCorpus *= (1 + interestRate);
            } else if (depositFrequency === "monthly") {
                yearlyDeposit = deposit * 12;
                totalDeposits += yearlyDeposit;
                for (let month = 1; month <= 12; month++) {
                    totalCorpus += deposit;
                    totalCorpus *= (1 + interestRate / 12);
                }
            }

            const withdrawalForYear = ppfWithdrawals.find(w => w.year === year);
            if (withdrawalForYear) {
                const balanceAt4thYear = calculateBalanceAtYear(year - 4);
                const balanceAtPreviousYear = corpusGrowth.length > 0 ? corpusGrowth[corpusGrowth.length - 1] : 0;
                const withdrawalLimit = Math.min(balanceAt4thYear, balanceAtPreviousYear) * 0.5;
                const withdrawalAmount = Math.min(withdrawalLimit, totalCorpus);

                if (withdrawalAmount > 0) {
                    totalCorpus -= withdrawalAmount;
                    totalWithdrawn += withdrawalAmount;
                    withdrawalsOverTime.push({ year, amount: withdrawalAmount });
                    withdrawalForYear.amount = withdrawalAmount; // Update amount in the main array
                } else {
                    alert(`Insufficient balance for withdrawal in Year ${year}.`);
                    ppfWithdrawals = ppfWithdrawals.filter(w => w.year !== year); // Remove invalid withdrawal
                }
            }

            corpusGrowth.push(totalCorpus);
            depositGrowth.push(totalDeposits);
        }

        const totalInterestEarned = (totalCorpus + totalWithdrawn) - totalDeposits;
        document.getElementById("ppf-total-corpus").textContent = `₹${totalCorpus.toFixed(2)}`;
        document.getElementById("ppf-interest-earned").textContent = `₹${totalInterestEarned.toFixed(2)}`;
        document.getElementById("ppf-funds-withdrawn").textContent = `₹${totalWithdrawn.toFixed(2)}`;
        
        updatePPFWithdrawalList();
        updatePPFChart(corpusGrowth, depositGrowth, withdrawalsOverTime);
    }

    calculatePpfBtn.addEventListener("click", () => {
        const depositFrequency = document.getElementById("ppf-deposit-frequency").value;
        const deposit = parseFloat(document.getElementById("ppf-deposit").value);
        const interestRate = parseFloat(document.getElementById("ppf-interest-rate").value) / 100;
        const tenure = parseInt(document.getElementById("ppf-tenure").value);

        if (isNaN(deposit) || deposit < 500 || deposit > 150000) { alert("Please enter a valid deposit amount (₹500 to ₹1.5 Lakh)."); return; }
        if (depositFrequency === "monthly" && deposit * 12 > 150000) { alert("Total annual deposit cannot exceed ₹1.5 Lakh."); return; }
        if (isNaN(interestRate) || interestRate <= 0) { alert("Please enter a valid interest rate (e.g., 7.1 for 7.1%)."); return; }
        if (isNaN(tenure) || tenure < 15 || tenure % 5 !== 0) { alert("Tenure must be a multiple of 5 years (e.g., 15, 20, 25)."); return; }

        calculatePPF(depositFrequency, deposit, interestRate, tenure, true);
    });

    document.getElementById("add-partial-withdrawal").addEventListener("click", () => {
        const withdrawalYear = parseInt(prompt("Enter the year for partial withdrawal (after 6 years):"));
        if (isNaN(withdrawalYear) || withdrawalYear < 7) { alert("Partial withdrawals are allowed only after 6 years."); return; }
        if (ppfWithdrawals.some((w) => w.year === withdrawalYear)) { alert("Only one withdrawal is allowed per financial year."); return; }
        if (ppfWithdrawals.length > 0 && withdrawalYear <= ppfWithdrawals[ppfWithdrawals.length - 1].year) { alert(`Withdrawal year must be greater than the last withdrawal year.`); return; }

        ppfWithdrawals.push({ year: withdrawalYear, amount: 0 }); // Amount will be calculated in the main function
        ppfWithdrawals.sort((a, b) => a.year - b.year); // Keep withdrawals sorted

        calculatePPF(
            document.getElementById("ppf-deposit-frequency").value,
            parseFloat(document.getElementById("ppf-deposit").value),
            parseFloat(document.getElementById("ppf-interest-rate").value) / 100,
            parseInt(document.getElementById("ppf-tenure").value)
        );
    });
}