// Initialize Chart.js
const ctx = document.getElementById('fdChart').getContext('2d');
let fdChart;

// Input elements
const principalInput = document.getElementById('principal');
const startDateInput = document.getElementById('startDate');
const interestRateInput = document.getElementById('interestRate');
const interestRateValue = document.getElementById('interestRateValue');
const newInterestRateInput = document.getElementById('newInterestRate');
const newInterestRateValue = document.getElementById('newInterestRateValue');
const daysInput = document.getElementById('days');
const monthsInput = document.getElementById('months');
const yearsInput = document.getElementById('years');
const newDaysInput = document.getElementById('newDays');
const newMonthsInput = document.getElementById('newMonths');
const newYearsInput = document.getElementById('newYears');
const conversionDateInput = document.getElementById('conversionDate');

// Update interest rate values
interestRateInput.addEventListener('input', () => {
  interestRateValue.textContent = `${interestRateInput.value}%`;
  updateChart();
});

newInterestRateInput.addEventListener('input', () => {
  newInterestRateValue.textContent = `${newInterestRateInput.value}%`;
  updateChart();
});

// Clear other tenure fields when one is filled
function clearOtherFields(currentField, field1, field2) {
  currentField.addEventListener('input', () => {
    if (currentField.value !== '') {
      field1.value = '';
      field2.value = '';
    }
  });
}

clearOtherFields(daysInput, monthsInput, yearsInput);
clearOtherFields(monthsInput, daysInput, yearsInput);
clearOtherFields(yearsInput, daysInput, monthsInput);
clearOtherFields(newDaysInput, newMonthsInput, newYearsInput);
clearOtherFields(newMonthsInput, newDaysInput, newYearsInput);
clearOtherFields(newYearsInput, newDaysInput, newMonthsInput);

// Update chart when inputs change
principalInput.addEventListener('input', updateChart);
startDateInput.addEventListener('input', updateChart);
daysInput.addEventListener('input', updateChart);
monthsInput.addEventListener('input', updateChart);
yearsInput.addEventListener('input', updateChart);
newDaysInput.addEventListener('input', updateChart);
newMonthsInput.addEventListener('input', updateChart);
newYearsInput.addEventListener('input', updateChart);
conversionDateInput.addEventListener('input', updateChart);

// Function to calculate tenure in days
function getTenureInDays(days, months, years) {
  return (years * 365) + (months * 30) + (days || 0);
}

// Function to calculate FD value over time
function calculateFDValue(principal, rate, startDate, endDate) {
  const days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
  const interest = (principal * rate * days) / 36500;
  return principal + interest;
}

// Function to generate timeline data
function generateTimelineData() {
  const principal = parseFloat(principalInput.value);
  const startDate = new Date(startDateInput.value);
  const interestRate = parseFloat(interestRateInput.value);
  const newInterestRate = parseFloat(newInterestRateInput.value);
  const days = parseFloat(daysInput.value) || 0;
  const months = parseFloat(monthsInput.value) || 0;
  const years = parseFloat(yearsInput.value) || 0;
  const newDays = parseFloat(newDaysInput.value) || 0;
  const newMonths = parseFloat(newMonthsInput.value) || 0;
  const newYears = parseFloat(newYearsInput.value) || 0;
  const conversionDate = new Date(conversionDateInput.value);

  const tenureInDays = getTenureInDays(days, months, years);
  const newTenureInDays = getTenureInDays(newDays, newMonths, newYears);
  const maturityDate = new Date(startDate);
  maturityDate.setDate(maturityDate.getDate() + tenureInDays);
  const newMaturityDate = new Date(conversionDate);
  newMaturityDate.setDate(newMaturityDate.getDate() + newTenureInDays);

  // Generate timeline data
  const timeline = [];
  const step = 30; // Days per step

  // Timeline 1: Break FD on conversionDate
  for (let d = 0; d <= tenureInDays; d += step) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + d);
    if (currentDate <= conversionDate) {
      const value = calculateFDValue(principal, interestRate, startDate, currentDate);
      timeline.push({ date: currentDate, value, scenario: 'Break FD' });
    } else {
      const value = calculateFDValue(principal, newInterestRate, conversionDate, currentDate);
      timeline.push({ date: currentDate, value, scenario: 'Break FD' });
    }
  }

  // Timeline 2: Wait Until Maturity
  for (let d = 0; d <= tenureInDays + newTenureInDays; d += step) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + d);
    if (currentDate <= maturityDate) {
      const value = calculateFDValue(principal, interestRate, startDate, currentDate);
      timeline.push({ date: currentDate, value, scenario: 'Wait Until Maturity' });
    } else {
      const value = calculateFDValue(principal, newInterestRate, maturityDate, currentDate);
      timeline.push({ date: currentDate, value, scenario: 'Wait Until Maturity' });
    }
  }

  return timeline;
}

// Function to update the chart
function updateChart() {
  const timeline = generateTimelineData();

  if (fdChart) {
    fdChart.destroy();
  }

  const labels = timeline.map(entry => entry.date.toLocaleDateString());
  const breakFDData = timeline
    .filter(entry => entry.scenario === 'Break FD')
    .map(entry => entry.value);
  const waitUntilMaturityData = timeline
    .filter(entry => entry.scenario === 'Wait Until Maturity')
    .map(entry => entry.value);

  fdChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Break FD',
          data: breakFDData,
          borderColor: '#007bff',
          borderWidth: 2,
          fill: false,
        },
        {
          label: 'Wait Until Maturity',
          data: waitUntilMaturityData,
          borderColor: '#28a745',
          borderWidth: 2,
          fill: false,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'FD Value (₹)',
          },
        },
        x: {
          title: {
            display: true,
            text: 'Date',
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => `₹${context.raw.toFixed(2)}`,
          },
        },
      },
    },
  });
}

// Initialize chart
updateChart();