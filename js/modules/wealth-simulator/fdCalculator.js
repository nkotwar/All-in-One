function initFdCalculator() {
    const calculateFdBtn = document.getElementById("calculate-fd");
    if (!calculateFdBtn) return;

    calculateFdBtn.addEventListener("click", () => {
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
}