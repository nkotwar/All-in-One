function initRdCalculator() {
    const calculateRdBtn = document.getElementById("calculate-rd");
    if (!calculateRdBtn) return;

    calculateRdBtn.addEventListener("click", () => {
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
}