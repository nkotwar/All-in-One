// wealthSimulator.js

document.addEventListener("DOMContentLoaded", () => {
    // Tab Switching Logic
    const calculatorTabs = document.querySelectorAll(".calculator-tabs .tab-button");
    const calculatorContents = document.querySelectorAll(".calculator-content");

    calculatorTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const targetCalculator = tab.getAttribute("data-calculator");

            calculatorContents.forEach(content => content.classList.remove("active"));
            document.getElementById(`${targetCalculator}-calculator`).classList.add("active");

            calculatorTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
        });
    });

    // Initialize all calculators
    if (typeof initFdCalculator === 'function') initFdCalculator();
    if (typeof initRdCalculator === 'function') initRdCalculator();
    if (typeof initApyCalculator === 'function') initApyCalculator();
    if (typeof initSsyCalculator === 'function') initSsyCalculator();
    if (typeof initPpfCalculator === 'function') initPpfCalculator();
});