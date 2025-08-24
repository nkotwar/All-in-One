function initSsyCalculator() {
    const calculateSsyBtn = document.getElementById("calculate-ssy");
    if (!calculateSsyBtn) return;

    let withdrawals = [];
    let isAccountClosed = false;

    const timelineContainer = document.getElementById("ssy-timeline-container");
    const timelineTrack = timelineContainer.querySelector(".timeline-track");
    const timelineLabels = timelineContainer.querySelector(".timeline-labels");
    const timelineEvents = timelineContainer.querySelector(".timeline-events");
    const eventButtonsContainer = document.getElementById("ssy-event-buttons");

    function updateSSYChart(corpusGrowth, depositGrowth) {
        const ctx = document.getElementById('ssy-corpus-growth-chart').getContext('2d');
        if (window.ssyChart) window.ssyChart.destroy();
        
        const initialAge = parseInt(document.getElementById("initial-age").value, 10);
        const labels = corpusGrowth.map((_, index) => `Age ${initialAge + index}`);

        window.ssyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Corpus Growth', data: corpusGrowth, borderColor: '#3498db', fill: false, tension: 0.1 },
                    { label: 'Total Deposits', data: depositGrowth, borderColor: '#2ecc71', fill: false, tension: 0.1 }
                ]
            },
            options: {
                scales: {
                    x: { title: { display: true, text: 'Age' } },
                    y: { beginAtZero: true, title: { display: true, text: 'Amount (₹)' } }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.dataset.label || ''}: ₹${(context.raw || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                        }
                    }
                }
            }
        });
    }

    function updateResultsDisplay(totalCorpus, fundsWithdrawn) {
        const totalCorpusElement = document.getElementById("ssy-total-corpus");
        const fundsWithdrawnElement = document.getElementById("ssy-funds-withdrawn");
        
        const resultsContainer = document.getElementById("ssy-results");
        if (resultsContainer) {
            resultsContainer.style.display = "block";
        }

        const prematureClosure = withdrawals.find(w => w.type === 'premature');
        if (prematureClosure) {
            const initialAge = parseInt(document.getElementById("initial-age").value, 10);
            const greyOutStartPercent = ((prematureClosure.year - initialAge) / 21) * 100;
            timelineTrack.style.setProperty('--grey-out-width', `${100 - greyOutStartPercent}%`);
        } else {
            timelineTrack.style.setProperty('--grey-out-width', '0%');
        }

        if (isAccountClosed) {
            totalCorpusElement.textContent = `₹0.00`;
            fundsWithdrawnElement.textContent = `₹${fundsWithdrawn.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
        } else {
            totalCorpusElement.textContent = `₹${totalCorpus.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
            fundsWithdrawnElement.textContent = `₹${fundsWithdrawn.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
        }
    }

    function calculateSSYWithWithdrawals() {
        const initialAge = parseInt(document.getElementById("initial-age").value, 10);
        const depositFrequency = document.getElementById("ssy-deposit-frequency").value;
        const deposit = parseFloat(document.getElementById("ssy-deposit").value);
        const interestRate = parseFloat(document.getElementById("ssy-interest-rate").value) || 8.2;

        const depositTenure = 15;
        const maturityTenure = 21;
        let totalCorpus = 0;
        let totalDeposits = 0;
        let corpusGrowth = [];
        let depositGrowth = [];
        let fundsWithdrawn = 0;
        let isAccountClosedLocal = false;

        const sortedWithdrawals = [...withdrawals].sort((a, b) => a.year - b.year);

        for (let i = 0; i < maturityTenure; i++) {
            const absoluteAge = initialAge + i;

            if (isAccountClosedLocal) {
                corpusGrowth.push(0);
                depositGrowth.push(totalDeposits);
                continue;
            }

            if (i < depositTenure) {
                const annualDeposit = depositFrequency === "monthly" ? deposit * 12 : deposit;
                if (annualDeposit > 150000) { alert("Annual deposit cannot exceed ₹1.5 Lakh."); return; }
                totalDeposits += annualDeposit;
                totalCorpus += annualDeposit;
            }

            totalCorpus += totalCorpus * (interestRate / 100);

            const withdrawalForThisYear = sortedWithdrawals.find(w => w.year === absoluteAge);
            if (withdrawalForThisYear) {
                let withdrawAmount = 0;
                const corpusForWithdrawal = totalCorpus;

                if (withdrawalForThisYear.type === "marriage" || withdrawalForThisYear.type === "education") {
                    withdrawAmount = corpusForWithdrawal * 0.5;
                    totalCorpus *= 0.5;
                } else if (withdrawalForThisYear.type === "premature") {
                    withdrawAmount = corpusForWithdrawal;
                    totalCorpus = 0;
                    isAccountClosedLocal = true;
                }
                fundsWithdrawn += withdrawAmount;
                withdrawalForThisYear.amount = withdrawAmount;
            }

            corpusGrowth.push(totalCorpus);
            depositGrowth.push(totalDeposits);
        }

        isAccountClosed = isAccountClosedLocal;
        updateResultsDisplay(totalCorpus, fundsWithdrawn);
        updateSSYChart(corpusGrowth, depositGrowth);
        renderTimeline();
        renderEvents();
    }

    function renderTimeline() {
        timelineContainer.style.display = "block";
        eventButtonsContainer.style.display = "flex";
        timelineLabels.innerHTML = "";

        const initialAge = parseInt(document.getElementById("initial-age").value, 10);
        const maturityAge = initialAge + 21;

        for (let age = initialAge; age <= maturityAge; age++) {
            const marker = document.createElement('div');
            marker.className = 'timeline-marker';
            const percent = ((age - initialAge) / 21) * 100;
            marker.style.left = `${percent}%`;
            if (age % 5 === 0 || age === initialAge || age === maturityAge) {
                marker.innerHTML = `<span>${age}</span>`;
            }
            timelineLabels.appendChild(marker);
        }
    }

    function renderEvents() {
        timelineEvents.innerHTML = "";
        withdrawals.forEach((event) => {
            const eventEl = createEventElement(event);
            timelineEvents.appendChild(eventEl);
            makeDraggable(eventEl, event);
        });
    }

    function createEventElement(event) {
        const eventEl = document.createElement('div');
        eventEl.className = 'timeline-event';
        eventEl.dataset.type = event.type;
        eventEl.id = `event-${event.type}`;

        const eventTypes = {
            'education': { icon: '🎓', title: 'Education Withdrawal (50%)' },
            'marriage': { icon: '💍', title: 'Marriage Withdrawal (50%)' },
            'premature': { icon: '❌', title: 'Premature Closure (100%)' }
        };

        eventEl.innerHTML = `
            <span class="event-icon">${eventTypes[event.type].icon}</span>
            <span class="event-age">${event.year}</span>
            <button class="remove-event">×</button>
        `;

        const initialAge = parseInt(document.getElementById("initial-age").value, 10);
        const percent = ((event.year - initialAge) / 21) * 100;
        eventEl.style.left = `${percent}%`;
        eventEl.title = `${eventTypes[event.type].title} at Age ${event.year}`;

        eventEl.querySelector('.remove-event').addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });

        eventEl.querySelector('.remove-event').addEventListener('click', (e) => {
            e.stopPropagation();
            removeWithdrawal(event.type);
        });

        return eventEl;
    }

    function makeDraggable(element, event) {
        let isDragging = false;
        let offsetX = 0;

        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - element.getBoundingClientRect().left;
            element.classList.add('dragging');
            document.body.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const rect = timelineTrack.getBoundingClientRect();
            let newX = e.clientX - rect.left - offsetX;
            newX = Math.max(0, Math.min(newX, rect.width));
            element.style.left = `${newX}px`;

            const percent = newX / rect.width;
            const initialAge = parseInt(document.getElementById("initial-age").value, 10);
            const newAge = Math.round(initialAge + percent * 21);
            element.querySelector('.event-age').textContent = newAge;
        });

                document.addEventListener('mouseup', (e) => {
            if (!isDragging) return;

            isDragging = false;
            element.classList.remove('dragging');
            document.body.style.cursor = 'default';

            const rect = timelineTrack.getBoundingClientRect();
            let newX = e.clientX - rect.left - offsetX;
            newX = Math.max(0, Math.min(newX, rect.width));
            const percent = newX / rect.width;

            const initialAge = parseInt(document.getElementById("initial-age").value, 10);
            const maturityAge = initialAge + 21;
            let newAge = Math.round(initialAge + percent * 21);

            const eventConfig = {
                'education': { minAge: 18 },
                'marriage': { minAge: 18 },
                'premature': { minAge: initialAge + 1 }
            };

            newAge = Math.max(eventConfig[event.type].minAge, Math.min(newAge, maturityAge));

            event.year = newAge;

            if (event.type === 'premature') {
                withdrawals = withdrawals.filter(w => w.type === 'premature' || w.year < newAge);
            } else if (event.type === 'education' || event.type === 'marriage') {
                const prematureClosure = withdrawals.find(w => w.type === 'premature');
                if (prematureClosure && newAge >= prematureClosure.year) {
                    withdrawals = withdrawals.filter(w => w.type !== event.type);
                }
            }

            calculateSSYWithWithdrawals();
        });
    }

    function addEvent(type) {
        const prematureClosure = withdrawals.find(w => w.type === 'premature');
        if ((type === 'education' || type === 'marriage') && prematureClosure && prematureClosure.year <= 18) {
            alert("Cannot add Education or Marriage withdrawal if there is a Premature Closure at or before age 18.");
            return;
        }

        const initialAge = parseInt(document.getElementById("initial-age").value, 10);
        const maturityAge = initialAge + 21;
        const eventConfig = {
            'education': { minAge: 18, defaultYear: 18 },
            'marriage': { minAge: 18, defaultYear: 18 },
            'premature': { minAge: initialAge + 1, defaultYear: maturityAge }
        };

        if (withdrawals.some(w => w.type === type)) {
            alert(`A ${type} event already exists.`);
            return;
        }

        withdrawals.push({ type: type, year: eventConfig[type].defaultYear, amount: 0 });
        calculateSSYWithWithdrawals();
    }

    function removeWithdrawal(type) {
        withdrawals = withdrawals.filter(w => w.type !== type);
        calculateSSYWithWithdrawals();
    }

    function setupEventButtons() {
        eventButtonsContainer.innerHTML = `
            <button class="btn btn-secondary" data-event-type="education">Add Education Withdrawal</button>
            <button class="btn btn-secondary" data-event-type="marriage">Add Marriage Withdrawal</button>
            <button class="btn btn-danger" data-event-type="premature">Add Premature Closure</button>
        `;
        eventButtonsContainer.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                addEvent(btn.dataset.eventType);
            });
        });
    }

    calculateSsyBtn.addEventListener("click", function () {
        const initialAge = parseInt(document.getElementById("initial-age").value, 10);
        const depositFrequency = document.getElementById("ssy-deposit-frequency").value;
        const deposit = parseFloat(document.getElementById("ssy-deposit").value);
        const interestRate = parseFloat(document.getElementById("ssy-interest-rate").value) || 8.2;

        if (isNaN(initialAge) || initialAge < 0 || initialAge > 10) { alert("Please select a valid age for the girl child (0 to 10 years)."); return; }
        if (isNaN(deposit) || deposit < 250) { alert("Please enter a valid deposit amount (min ₹250)."); return; }
        if (depositFrequency === "monthly" && (deposit * 12 > 150000)) { alert("Yearly Deposit cannot exceed ₹1.5 Lakh."); return; }
        if (depositFrequency === "yearly" && deposit > 150000) { alert("Yearly Deposit cannot exceed ₹1.5 Lakh."); return; }
        if (isNaN(interestRate) || interestRate < 0) { alert("Please enter a valid interest rate."); return; }

        withdrawals = [];
        isAccountClosed = false;
        calculateSSYWithWithdrawals();
        setupEventButtons();
    });

    // Initial setup
    calculateSSYWithWithdrawals();
    setupEventButtons();
}