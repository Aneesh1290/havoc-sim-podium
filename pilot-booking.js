// =========================================================================
// PILOT BOOKING JAVASCRIPT LOGIC
// =========================================================================

const BACKEND_URL = "";

// State
let pilotConfig = null;
let eligibleSimulators = [];
let selectedSlots = []; // Array of { item_name, date, time }
let selectedAdmitCardFile = null;
let currentStep = 1;
let activeMonthFilter = ""; // e.g. "November 2026"
let allAvailableMonths = []; // Array of { name, year, val, idx, label }

// Country phone config matching standard rules
const PILOT_PHONE_CONFIG = {
    '+91': { min: 10, max: 10, placeholder: '9876543210', pattern: /^[6-9]\d{9}$/, desc: '10 digits starting with 6-9' },
    '+1':  { min: 10, max: 10, placeholder: '2025550123', pattern: /^\d{10}$/, desc: '10 digits' },
    '+44': { min: 10, max: 10, placeholder: '7911123456', pattern: /^\d{10}$/, desc: '10 digits' },
    '+971':{ min: 9,  max: 9,  placeholder: '501234567',  pattern: /^\d{9}$/, desc: '9 digits' },
    '+65': { min: 8,  max: 8,  placeholder: '81234567',   pattern: /^\d{8}$/, desc: '8 digits' },
    '+61': { min: 9,  max: 9,  placeholder: '412345678',  pattern: /^\d{9}$/, desc: '9 digits' },
    '+966':{ min: 9,  max: 9,  placeholder: '512345678',  pattern: /^\d{9}$/, desc: '9 digits' },
    '+974':{ min: 8,  max: 8,  placeholder: '33123456',   pattern: /^\d{8}$/, desc: '8 digits' },
    '+968':{ min: 8,  max: 8,  placeholder: '91234567',   pattern: /^\d{8}$/, desc: '8 digits' }
};

function getPilotSelectedPhoneConfig() {
    const codeSelect = document.getElementById('pilotCountryCode');
    const dial = codeSelect ? codeSelect.value.trim() : '+91';
    return PILOT_PHONE_CONFIG[dial] || { min: 7, max: 15, placeholder: 'Phone Number', pattern: /^\d{7,15}$/, desc: 'valid phone digits' };
}

function initPilotPhoneInput() {
    const phoneInput = document.getElementById('pilotPhone');
    const codeSelect = document.getElementById('pilotCountryCode');
    if (!phoneInput) return;

    function applyConfig() {
        const conf = getPilotSelectedPhoneConfig();
        phoneInput.maxLength = conf.max;
        if (conf.placeholder) phoneInput.placeholder = 'e.g. ' + conf.placeholder;
        let digits = phoneInput.value.replace(/\D/g, '');
        if (digits.length > conf.max) {
            digits = digits.slice(0, conf.max);
        }
        phoneInput.value = digits;
    }

    if (codeSelect) {
        codeSelect.addEventListener('change', applyConfig);
    }

    phoneInput.addEventListener('input', function() {
        const conf = getPilotSelectedPhoneConfig();
        let digits = this.value.replace(/\D/g, '');
        if (digits.length > conf.max) {
            digits = digits.slice(0, conf.max);
        }
        this.value = digits;
    });

    phoneInput.addEventListener('keydown', function(e) {
        const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
        if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) return;
        if (!/^\d$/.test(e.key)) {
            e.preventDefault();
        }
    });

    applyConfig();
}

document.addEventListener("DOMContentLoaded", async () => {
    initDropzone();
    initPilotPhoneInput();
    await loadPilotConfigAndSimulators();
    initEventListeners();
});

// Load admin configuration and the 2 active simulators
async function loadPilotConfigAndSimulators() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/pilot/config`);
        const data = await res.json();

        if (!data.success) {
            showAlert('Failed to load Pilot Booking configuration.', 'error');
            return;
        }

        pilotConfig = data.config;

        // If the promo offer is turned off, immediately redirect users to simulators
        if (pilotConfig && pilotConfig.is_active === false) {
            window.location.replace('/#simulators');
            return;
        }

        eligibleSimulators = data.simulators || [];

        extractAvailableMonths();
        renderPilotMonthCards();
        renderMonthChips();
        renderSimulators();
    } catch (err) {
        console.error('Error fetching pilot configuration:', err);
        showAlert('Network error while connecting to booking server.', 'error');
    }
}

// Generate active months dynamically based on the current calendar (matching public /book)
function extractAvailableMonths() {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentDay = today.getDate();
    const currentMonthIdx = today.getMonth();
    const currentYear = today.getFullYear();

    const months = [];
    // 1. Current Month (e.g. November 2026)
    months.push({
        name: monthNames[currentMonthIdx],
        year: currentYear,
        idx: currentMonthIdx,
        label: `${monthNames[currentMonthIdx]} ${currentYear}`
    });

    // 2. Next Month (e.g. December 2026) - always provide so pilots can plan ahead
    let nextIdx = (currentMonthIdx + 1) % 12;
    let nextYear = currentMonthIdx + 1 > 11 ? currentYear + 1 : currentYear;
    months.push({
        name: monthNames[nextIdx],
        year: nextYear,
        idx: nextIdx,
        label: `${monthNames[nextIdx]} ${nextYear}`
    });

    allAvailableMonths = months;
    if (!activeMonthFilter || (!allAvailableMonths.some(m => m.label === activeMonthFilter) && activeMonthFilter !== "ALL")) {
        activeMonthFilter = allAvailableMonths[0].label;
    }
}

// Render the big "CHOOSE YOUR MONTH" cards matching the public /book calendar
function renderPilotMonthCards() {
    const cardsContainer = document.getElementById("dynamicPilotMonthCards");
    if (!cardsContainer) return;

    cardsContainer.innerHTML = allAvailableMonths.map((m) => {
        return `
            <div class="month-card-btn ${activeMonthFilter === m.label ? 'active' : ''}" onclick="pickMonthAndShowSlots('${m.label}')">
                <div class="mc-content">
                    <h2>${m.name.toUpperCase()}</h2>
                    <span class="mc-year">${m.year}</span>
                    <div class="mc-explore">SELECT SLOTS &rarr;</div>
                </div>
            </div>
        `;
    }).join('');
}

function pickMonthAndShowSlots(monthLabel) {
    activeMonthFilter = monthLabel;
    
    // Update active header indicator
    const headerDisplay = document.getElementById("activeMonthHeaderDisplay");
    if (headerDisplay) headerDisplay.textContent = monthLabel;

    // Transition view
    const monthView = document.getElementById("pilotMonthView");
    const step1Container = document.getElementById("step1Container");
    if (monthView) monthView.style.display = "none";
    if (step1Container) step1Container.style.display = "block";

    renderPilotMonthCards();
    renderMonthChips();
    renderSimulators();

    window.scrollTo({ top: (step1Container.offsetTop - 80), behavior: 'smooth' });
}

function showMonthPickerView() {
    const monthView = document.getElementById("pilotMonthView");
    const step1Container = document.getElementById("step1Container");
    if (monthView) monthView.style.display = "block";
    if (step1Container) step1Container.style.display = "none";
    window.scrollTo({ top: (monthView.offsetTop - 80), behavior: 'smooth' });
}

// Render Month Filter Chips
function renderMonthChips() {
    const chipsContainer = document.getElementById("pilotMonthChips");
    if (!chipsContainer) return;

    if (allAvailableMonths.length === 0) {
        document.getElementById("pilotMonthBar")?.style.setProperty("display", "none");
        return;
    }

    document.getElementById("pilotMonthBar")?.style.removeProperty("display");

    chipsContainer.innerHTML = [
        ...allAvailableMonths.map(m => {
            return `<button type="button" class="pilot-month-btn ${activeMonthFilter === m.label ? 'active' : ''}" onclick="selectMonthFilter('${m.label}')">${m.label}</button>`;
        }),
        `<button type="button" class="pilot-month-btn ${activeMonthFilter === 'ALL' ? 'active' : ''}" onclick="selectMonthFilter('ALL')">All Dates</button>`
    ].join('');
}

function selectMonthFilter(monthLabel) {
    activeMonthFilter = monthLabel;

    const headerDisplay = document.getElementById("activeMonthHeaderDisplay");
    if (headerDisplay) headerDisplay.textContent = monthLabel;

    renderMonthChips();
    renderPilotMonthCards();
    renderSimulators();
}

// Quick month step toggle from within the calendar card
function changeSimMonth(direction) {
    const currentIdx = allAvailableMonths.findIndex(m => m.label === activeMonthFilter);
    let newIdx = currentIdx + direction;
    if (newIdx < 0) newIdx = 0;
    if (newIdx >= allAvailableMonths.length) newIdx = allAvailableMonths.length - 1;

    if (newIdx !== currentIdx) {
        selectMonthFilter(allAvailableMonths[newIdx].label);
    }
}

// Generate calendar HTML for simulator card
function buildSimulatorCalendarHTML(sim, index) {
    const monthObj = allAvailableMonths.find(m => m.label === activeMonthFilter) || allAvailableMonths[0];
    if (!monthObj) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = monthObj.year;
    const month = monthObj.idx;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun

    // Fetch open dates for this sim
    const openDatesList = getSimulatorDates(sim, monthObj.label);
    const openDateNumbers = new Set();
    openDatesList.forEach(dateStr => {
        const m = dateStr.match(/\b(\d{1,2})\b/);
        if (m) openDateNumbers.add(parseInt(m[1], 10));
    });

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Default selected date for this sim is the first open date
    let firstOpenNum = null;
    for (let d = 1; d <= daysInMonth; d++) {
        if (openDateNumbers.has(d)) {
            firstOpenNum = d;
            break;
        }
    }

    let cellsHTML = '';
    // Empty cells before 1st of month
    for (let i = 0; i < firstDayIndex; i++) {
        cellsHTML += `<div class="cal-day-cell empty"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dObj = new Date(year, month, d);
        const dayName = dayNames[dObj.getDay()];
        const shortMonth = monthObj.name.substring(0, 3);
        const fullLabel = `${shortMonth} ${d} (${dayName})`;
        const isAvailable = openDateNumbers.has(d);
        const isSelected = (d === firstOpenNum);

        if (isAvailable) {
            cellsHTML += `
                <div class="cal-day-cell available ${isSelected ? 'selected' : ''}" 
                     data-sim="${escapeHtml(sim.name)}" 
                     data-date="${escapeHtml(fullLabel)}"
                     data-day="${d}"
                     onclick="onCalendarDateClick('${escapeHtml(sim.name)}', '${escapeHtml(fullLabel)}', ${index}, this)">
                    ${d}
                </div>
            `;
        } else {
            cellsHTML += `<div class="cal-day-cell disabled" title="Closed / Unavailable">${d}</div>`;
        }
    }

    const shortMonth = monthObj.name.substring(0, 3);
    const initialDateLabel = firstOpenNum ? `${shortMonth} ${firstOpenNum} (${dayNames[new Date(year, month, firstOpenNum).getDay()]})` : "No open dates";

    return `
        <div class="sim-calendar-card" id="cal-card-${index}">
            <div class="calendar-header">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button type="button" class="calendar-nav-btn" onclick="changeSimMonth(-1)" title="Previous Month">‹</button>
                    <span class="calendar-month-title">${monthObj.name} ${year}</span>
                    <button type="button" class="calendar-nav-btn" onclick="changeSimMonth(1)" title="Next Month">›</button>
                </div>
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent-red);" id="cal-selected-display-${index}">${escapeHtml(initialDateLabel)}</span>
            </div>
            <div class="calendar-weekdays">
                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
            </div>
            <div class="calendar-grid">
                ${cellsHTML}
            </div>
            <div class="calendar-legend">
                <div class="legend-item"><span class="legend-dot available"></span> Available</div>
                <div class="legend-item"><span class="legend-dot disabled"></span> Closed / Unavailable</div>
            </div>
            <input type="hidden" class="sim-date-select" id="sim-date-input-${index}" value="${escapeHtml(initialDateLabel)}">
        </div>
    `;
}

function onCalendarDateClick(simName, dateLabel, simIndex, cellEl) {
    const calCard = document.getElementById(`cal-card-${simIndex}`);
    if (calCard) {
        calCard.querySelectorAll('.cal-day-cell.available').forEach(c => c.classList.remove('selected'));
    }
    cellEl.classList.add('selected');

    const display = document.getElementById(`cal-selected-display-${simIndex}`);
    if (display) display.textContent = dateLabel;

    const hiddenInput = document.getElementById(`sim-date-input-${simIndex}`);
    if (hiddenInput) hiddenInput.value = dateLabel;

    onSimulatorDateChange(simName, dateLabel);
}

// Generate valid upcoming dates for a simulator across all active months (grouped by month or combined)
function getSimulatorDates(sim, filterMonth = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Check custom saved date whitelist for this simulator if configured in options
    let customOpts = [];
    try {
        const parsed = typeof sim.options === 'string' ? JSON.parse(sim.options) : sim.options;
        if (Array.isArray(parsed)) customOpts = parsed;
    } catch (e) { }

    const dateOption = customOpts.find(o => o.name && o.name.toLowerCase().includes('date'));
    const enabledDays = (dateOption && Array.isArray(dateOption.choices) && dateOption.choices.length > 0)
        ? new Set(dateOption.choices)
        : null;

    const savedMonths = new Set();
    if (dateOption && dateOption.choices) {
        dateOption.choices.forEach(c => {
            const m = c.match(/^(\w+)/);
            if (m) savedMonths.add(m[1]);
        });
    }

    // Determine target months to generate dates for
    let targetMonths = allAvailableMonths;
    if (filterMonth && filterMonth !== "ALL") {
        targetMonths = allAvailableMonths.filter(m => m.label === filterMonth || m.name.toLowerCase() === filterMonth.toLowerCase());
    }

    const validDates = [];

    targetMonths.forEach(monthObj => {
        const year = monthObj.year;
        const month = monthObj.idx;
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            let isPast = dateObj < today;
            let isMonday = dateObj.getDay() === 1; // Havoc is usually closed on Mondays unless explicitly enabled
            const dayName = dayNames[dateObj.getDay()];
            const shortMonth = monthObj.name.substring(0, 3);

            const fullMonthLabel = `${monthObj.name} ${String(d).padStart(2, '0')} (${dayName})`;
            const fullMonthLabelOld = `${monthObj.name} ${String(d).padStart(2, '0')}`;
            const naturalMonthLabel = `${monthObj.name} ${d} (${dayName})`;
            const standardShortLabel = `${shortMonth} ${d} (${dayName})`;

            let isForceClosed = false;
            if (enabledDays !== null) {
                const monthWasSaved = savedMonths.has(monthObj.name);
                if (monthWasSaved) {
                    const isEnabled = enabledDays.has(fullMonthLabel) || enabledDays.has(fullMonthLabelOld) || enabledDays.has(naturalMonthLabel);
                    if (!isEnabled) {
                        isForceClosed = true;
                    } else {
                        isMonday = false; // Whitelisted date overrides Monday
                    }
                }
            }

            // Check if admin restricted eligible_days for pilots (e.g. ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
            if (pilotConfig && pilotConfig.eligible_days && pilotConfig.eligible_days.length > 0) {
                const allowed = pilotConfig.eligible_days.some(ed => ed.toLowerCase().startsWith(dayName.toLowerCase()));
                if (!allowed) {
                    isForceClosed = true;
                }
            }

            if (!isPast && !isMonday && !isForceClosed) {
                validDates.push(standardShortLabel);
            }
        }
    });

    if (validDates.length === 0) {
        return ["No open dates"];
    }
    return validDates;
}

// Render the 2 simulators with their date options and time slots
function renderSimulators() {
    const container = document.getElementById("simulatorsContainer");
    if (!container) return;

    if (!eligibleSimulators || eligibleSimulators.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--card-bg); border-radius: 16px; border: 1px solid var(--border);">
                <p style="color: var(--text-muted); font-size: 1.1rem; margin: 0;">No simulators currently configured for Pilot Booking. Please contact staff.</p>
            </div>
        `;
        return;
    }

    const maxMins = pilotConfig.max_minutes_per_sim || 180;
    const ruleText = document.getElementById("simPromotionRuleText");
    if (ruleText) {
        ruleText.textContent = `Promotion Limit: Up to ${maxMins} mins (${(maxMins / 60).toFixed(1)} hrs) per selected simulator`;
    }

    container.innerHTML = eligibleSimulators.map((sim, index) => {
        // Compute dynamically available dates for the active month (skipping past dates, closed days)
        const dates = getSimulatorDates(sim, activeMonthFilter);

        let defaultSlots = [];
        try {
            const parsed = typeof sim.options === 'string' ? JSON.parse(sim.options) : sim.options;
            if (Array.isArray(parsed)) {
                const timeOpt = parsed.find(o => o.name && o.name.toLowerCase().includes('time'));
                if (timeOpt && Array.isArray(timeOpt.choices)) defaultSlots = timeOpt.choices;
            }
        } catch (e) { }

        if (defaultSlots.length === 0) {
            defaultSlots = [
                "11AM-11:30AM", "11:30AM-12PM", "12PM-12:30PM", "12:30PM-1PM",
                "2PM-2:30PM", "2:30PM-3PM", "3PM-3:30PM", "3:30PM-4PM",
                "4PM-4:30PM", "4:30PM-5PM", "5PM-5:30PM", "5:30PM-6PM",
                "6PM-6:30PM", "6:30PM-7PM", "7PM-7:30PM", "7:30PM-8PM",
                "8PM-8:30PM", "8:30PM-9PM", "9PM-9:30PM", "9:30PM-10PM"
            ];
        }

        const simImg = sim.image_url || 'havoc_logo.png';

        return `
            <div class="sim-card" data-sim-name="${escapeHtml(sim.name)}">
                <div class="sim-img-wrap">
                    <img src="${simImg}" alt="${escapeHtml(sim.name)}">
                </div>
                <div class="sim-body">
                    <h3 class="sim-name">${escapeHtml(sim.name)}</h3>
                    <div class="sim-meta-info">
                        <span class="sim-meta-pill">✈️ Flight Simulator</span>
                        <span>₹0 with Verified Admit Card</span>
                    </div>

                    <!-- Date Selection (Visual Calendar) -->
                    <div class="date-select-wrap">
                        <div class="slot-section-title">1. Select Flight Date</div>
                        ${buildSimulatorCalendarHTML(sim, index)}
                    </div>

                    <!-- Time Slots -->
                    <div class="slot-section-title">2. Select Time Slots</div>
                    <div class="time-slots-grid" id="slots-grid-${index}">
                        ${defaultSlots.map(slot => `
                            <button type="button" 
                                class="time-slot-btn" 
                                data-sim="${escapeHtml(sim.name)}" 
                                data-slot="${escapeHtml(slot)}" 
                                onclick="toggleSlotSelection('${escapeHtml(sim.name)}', '${escapeHtml(slot)}', this)">
                                ${escapeHtml(slot)}
                            </button>
                        `).join('')}
                    </div>

                    <!-- Simulator Duration Counter -->
                    <div class="sim-duration-badge">
                        <span>Selected on this Sim:</span>
                        <strong id="sim-duration-${index}">0 / ${maxMins} mins</strong>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Trigger initial availability check for the first dates
    eligibleSimulators.forEach((sim, idx) => {
        const card = document.querySelectorAll(".sim-card")[idx];
        if (card) {
            const dateSelect = card.querySelector(".sim-date-select");
            if (dateSelect && dateSelect.value) {
                checkSimulatorAvailability(sim.name, dateSelect.value, idx);
            }
        }
    });
}

// Helper: normalize time slot for case/spacing insensitive comparison
function normalizeSlotString(slotStr) {
    if (!slotStr) return "";
    let clean = String(slotStr).toLowerCase().replace(/\s+/g, "");
    clean = clean.replace(/0(\d):/g, "$1:");
    clean = clean.replace(/:00([ap]m)/g, "$1");
    return clean;
}

// Fetch availability from backend for the selected simulator & date
async function checkSimulatorAvailability(simName, date, simIndex) {
    try {
        if (!date || date.includes("No open dates")) return;

        let availData = { bookedSlots: [] };
        try {
            const res = await fetch(`${BACKEND_URL}/api/availability/${encodeURIComponent(date)}?item=${encodeURIComponent(simName)}`);
            if (res.ok) {
                availData = await res.json();
            }
        } catch (fetchErr) {
            console.warn("Could not query availability API, applying local checks:", fetchErr);
        }

        const grid = document.getElementById(`slots-grid-${simIndex}`);
        if (!grid) return;

        const bookedSlots = availData.bookedSlots || [];
        const normalizedBooked = bookedSlots.map(s => normalizeSlotString(s));
        const isDayBlocked = bookedSlots.includes('ALL_DAY');

        // Check if date is today, to hide slots that have already passed in the day
        const now = new Date();
        const currentHour = now.getHours();
        const currentMin = now.getMinutes();
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        // Match day number and month flexibly
        const dayNum = now.getDate();
        const monthFull = monthNames[now.getMonth()];
        const monthShort = monthFull.substring(0, 3);
        const isTodayDate = (date.includes(monthFull) || date.includes(monthShort)) && (date.includes(` ${dayNum} `) || date.includes(` ${dayNum}(`) || date.endsWith(` ${dayNum}`));

        const buttons = grid.querySelectorAll(".time-slot-btn");
        let visibleCount = 0;

        buttons.forEach(btn => {
            const slotTime = btn.getAttribute("data-slot");
            const normSlot = normalizeSlotString(slotTime);

            // Determine if slot is booked or blocked
            let isBooked = isDayBlocked || bookedSlots.includes(slotTime) || normalizedBooked.includes(normSlot);

            // Check if slot has already passed today
            let isPastTime = false;
            if (isTodayDate) {
                // Parse start time (e.g. "11AM-11:30AM", "2:30PM-3PM")
                const timeMatch = slotTime.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
                if (timeMatch) {
                    let slotHour = parseInt(timeMatch[1], 10);
                    const slotMin = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
                    const ampm = timeMatch[3].toUpperCase();
                    if (ampm === "PM" && slotHour !== 12) slotHour += 12;
                    if (ampm === "AM" && slotHour === 12) slotHour = 0;

                    if (slotHour < currentHour || (slotHour === currentHour && slotMin <= currentMin)) {
                        isPastTime = true;
                    }
                }
            }

            if (isBooked || isPastTime) {
                // Completely hide already booked or passed slots so customers don't see them
                btn.classList.add("is-booked-hidden");
                btn.classList.remove("selected");
                btn.disabled = true;

                // Deselect if already selected
                selectedSlots = selectedSlots.filter(s => !(s.item_name === simName && s.date === date && s.time === slotTime));
            } else {
                btn.classList.remove("is-booked-hidden");
                btn.disabled = false;
                visibleCount++;
            }
        });

        // Display notice if all slots are booked for this date
        let emptyNotice = grid.querySelector(".time-slots-empty-notice");
        if (visibleCount === 0) {
            if (!emptyNotice) {
                emptyNotice = document.createElement("div");
                emptyNotice.className = "time-slots-empty-notice";
                grid.appendChild(emptyNotice);
            }
            emptyNotice.textContent = "All slots are fully booked for this date. Please pick another date.";
        } else if (emptyNotice) {
            emptyNotice.remove();
        }

        updateSelectedSlotsUI();
    } catch (e) {
        console.warn('Availability check error:', e);
    }
}

function onSimulatorDateChange(simName, newDate) {
    const simIndex = eligibleSimulators.findIndex(s => s.name === simName);
    if (simIndex !== -1) {
        // Clear slots selected for this simulator on previous date
        selectedSlots = selectedSlots.filter(s => s.item_name !== simName);
        const grid = document.getElementById(`slots-grid-${simIndex}`);
        if (grid) {
            grid.querySelectorAll(".time-slot-btn").forEach(b => b.classList.remove("selected"));
        }
        checkSimulatorAvailability(simName, newDate, simIndex);
    }
}

// Toggle slot selection with promotion duration limit enforcement (<= 180 min per sim)
// and strict mutual exclusion (a pilot cannot book the exact same time slot across multiple simulators)
function toggleSlotSelection(simName, slotTime, btnEl) {
    const simIndex = eligibleSimulators.findIndex(s => s.name === simName);
    const card = document.querySelectorAll(".sim-card")[simIndex];
    const dateSelect = card ? card.querySelector(".sim-date-select") : null;
    const selectedDate = dateSelect ? dateSelect.value : "Today";

    const slotDuration = pilotConfig.session_duration_minutes || 30;
    const maxMins = pilotConfig.max_minutes_per_sim || 180;

    // Check if already selected on this specific simulator
    const existingIndex = selectedSlots.findIndex(s =>
        s.item_name === simName && s.date === selectedDate && s.time === slotTime
    );

    if (existingIndex !== -1) {
        // Deselect
        selectedSlots.splice(existingIndex, 1);
        btnEl.classList.remove("selected");
    } else {
        // 1. Conflict Check: Check if this exact date and time slot is already chosen on the OTHER simulator
        const conflictSlot = selectedSlots.find(s =>
            s.date === selectedDate &&
            normalizeSlotString(s.time) === normalizeSlotString(slotTime) &&
            s.item_name !== simName
        );

        if (conflictSlot) {
            showAlert(`Time Conflict: You have already selected ${slotTime} on "${conflictSlot.item_name}" for ${selectedDate}. A pilot cannot fly two simulators simultaneously!`, 'error');
            return;
        }

        // 2. Check per-simulator duration limit
        const currentSimMinutes = selectedSlots
            .filter(s => s.item_name === simName)
            .length * slotDuration;

        if (currentSimMinutes + slotDuration > maxMins) {
            showAlert(`Promotion limit reached: You can select up to ${maxMins} minutes (${(maxMins / 60).toFixed(1)} hours) on ${simName}.`, 'error');
            return;
        }

        selectedSlots.push({
            item_name: simName,
            date: selectedDate,
            time: slotTime
        });
        btnEl.classList.add("selected");
    }

    updateSelectedSlotsUI();
}

function updateSelectedSlotsUI() {
    const slotDuration = (pilotConfig && pilotConfig.session_duration_minutes) || 30;
    const maxMins = (pilotConfig && pilotConfig.max_minutes_per_sim) || 180;

    // Update per-simulator counters
    eligibleSimulators.forEach((sim, idx) => {
        const count = selectedSlots.filter(s => s.item_name === sim.name).length;
        const totalMins = count * slotDuration;
        const counterEl = document.getElementById(`sim-duration-${idx}`);
        if (counterEl) {
            counterEl.textContent = `${totalMins} / ${maxMins} mins (${count} slot${count === 1 ? '' : 's'})`;
            counterEl.style.color = totalMins > 0 ? "var(--gold)" : "inherit";
        }
    });

    // Update bottom summary bar
    const totalSelected = selectedSlots.length;
    const totalMinutes = totalSelected * slotDuration;
    const summaryText = document.getElementById("selectedSlotsCountText");
    const proceedBtn = document.getElementById("proceedToDetailsBtn");

    if (summaryText) {
        summaryText.textContent = `${totalSelected} session${totalSelected === 1 ? '' : 's'} selected (${totalMinutes} minutes total)`;
    }

    if (proceedBtn) {
        proceedBtn.disabled = (totalSelected === 0);
    }

    // Real-time Visual Cross-Simulator Lock:
    // If a time slot is selected on Simulator A, disable and visually indicate that exact slot on Simulator B on the same date
    eligibleSimulators.forEach((sim, idx) => {
        const card = document.querySelectorAll(".sim-card")[idx];
        const dateSelect = card ? card.querySelector(".sim-date-select") : null;
        const currentSimDate = dateSelect ? dateSelect.value : "";
        const grid = document.getElementById(`slots-grid-${idx}`);
        if (!grid) return;

        grid.querySelectorAll(".time-slot-btn:not(.is-booked-hidden)").forEach(btn => {
            const slotTime = btn.getAttribute("data-slot");
            const isSelectedHere = selectedSlots.some(s =>
                s.item_name === sim.name &&
                s.date === currentSimDate &&
                normalizeSlotString(s.time) === normalizeSlotString(slotTime)
            );

            if (isSelectedHere) {
                btn.classList.add("selected");
                btn.disabled = false;
                btn.classList.remove("pilot-slot-conflict");
                btn.title = "Selected";
            } else {
                btn.classList.remove("selected");

                // Check if this slot on this date is selected on the OTHER simulator
                const isSelectedOnOther = selectedSlots.some(s =>
                    s.item_name !== sim.name &&
                    s.date === currentSimDate &&
                    normalizeSlotString(s.time) === normalizeSlotString(slotTime)
                );

                if (isSelectedOnOther) {
                    btn.disabled = true;
                    btn.classList.add("pilot-slot-conflict");
                    btn.title = "Selected on other simulator for this time";
                } else {
                    btn.disabled = false;
                    btn.classList.remove("pilot-slot-conflict");
                    btn.title = "";
                }
            }
        });
    });
}

// Drag & drop file upload initialization
function initDropzone() {
    const dropzone = document.getElementById("admitCardDropzone");
    const fileInput = document.getElementById("admitCardFileInput");

    if (!dropzone || !fileInput) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
        dropzone.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    ['dragenter', 'dragover'].forEach(evt => {
        dropzone.addEventListener(evt, () => dropzone.classList.add('dragover'));
    });

    ['dragleave', 'drop'].forEach(evt => {
        dropzone.addEventListener(evt, () => dropzone.classList.remove('dragover'));
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
            handleFileSelected(dt.files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files.length > 0) {
            handleFileSelected(fileInput.files[0]);
        }
    });
}

function handleFileSelected(file) {
    if (!file) return;

    // Validate size (12MB)
    if (file.size > 12 * 1024 * 1024) {
        showAlert('The uploaded file is too large. Maximum file size is 12MB.', 'error');
        return;
    }

    // Validate type
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    const lowerName = file.name.toLowerCase();
    const isExtensionValid = validExtensions.some(ext => lowerName.endsWith(ext));
    const isMimeValid = file.type === 'application/pdf' || file.type.startsWith('image/');

    if (!isExtensionValid && !isMimeValid) {
        showAlert('Invalid file type. Please upload a PDF or an Image (JPG/PNG/WEBP) of your Pilot Admit Card.', 'error');
        return;
    }

    selectedAdmitCardFile = file;

    const nameEl = document.getElementById("uploadFileName");
    const sizeEl = document.getElementById("uploadFileSize");
    const infoEl = document.getElementById("uploadFileInfo");
    const dropzone = document.getElementById("admitCardDropzone");

    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = `${(file.size / 1024).toFixed(1)} KB`;
    if (infoEl) infoEl.style.display = 'flex';
    if (dropzone) dropzone.style.display = 'none';

    clearAlert();
}

function clearSelectedFile(e) {
    if (e) e.stopPropagation();
    selectedAdmitCardFile = null;
    const fileInput = document.getElementById("admitCardFileInput");
    if (fileInput) fileInput.value = "";

    const infoEl = document.getElementById("uploadFileInfo");
    const dropzone = document.getElementById("admitCardDropzone");
    if (infoEl) infoEl.style.display = 'none';
    if (dropzone) dropzone.style.display = 'block';
}

function initEventListeners() {
    const proceedBtn = document.getElementById("proceedToDetailsBtn");
    const backBtn = document.getElementById("backToSlotsBtn");
    const verifyBtn = document.getElementById("verifyAndProceedBtn");

    proceedBtn?.addEventListener("click", () => {
        if (selectedSlots.length === 0) {
            showAlert('Please select at least one simulator time slot.', 'error');
            return;
        }
        goToStep(2);
    });

    backBtn?.addEventListener("click", () => {
        goToStep(1);
    });

    verifyBtn?.addEventListener("click", handleVerifyAndProceed);
}

function goToStep(step) {
    currentStep = step;
    clearAlert();

    const s1 = document.getElementById("step1Container");
    const s2 = document.getElementById("step2Container");
    const ind1 = document.getElementById("stepIndicator1");
    const ind2 = document.getElementById("stepIndicator2");
    const ind3 = document.getElementById("stepIndicator3");

    const monthView = document.getElementById("pilotMonthView");
    if (monthView) monthView.style.display = 'none';

    if (step === 1) {
        if (s1) s1.style.display = 'block';
        if (s2) s2.style.display = 'none';
        ind1?.classList.add("active");
        ind1?.classList.remove("done");
        ind2?.classList.remove("active", "done");
        ind3?.classList.remove("active", "done");
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (step === 2) {
        if (s1) s1.style.display = 'none';
        if (s2) s2.style.display = 'block';
        ind1?.classList.remove("active");
        ind1?.classList.add("done");
        ind2?.classList.add("active");
        ind2?.classList.remove("done");
        ind3?.classList.remove("active", "done");
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Submit details, verify admit card document & lock slots, then redirect to checkout
async function handleVerifyAndProceed() {
    const nameInput = document.getElementById("pilotName");
    const phoneInput = document.getElementById("pilotPhone");
    const countryCodeSelect = document.getElementById("pilotCountryCode");
    const emailInput = document.getElementById("pilotEmail");
    const verifyBtn = document.getElementById("verifyAndProceedBtn");

    const name = nameInput ? nameInput.value.trim() : "";
    const rawPhone = phoneInput ? phoneInput.value.trim() : "";
    const countryCode = countryCodeSelect ? countryCodeSelect.value.trim() : "+91";
    const email = emailInput ? emailInput.value.trim() : "";

    const cleanPhoneDigits = rawPhone.replace(/\D/g, "");
    const phoneConf = getPilotSelectedPhoneConfig();

    if (!name || !rawPhone || !email) {
        showAlert('Please fill in your Full Name, Phone Number, and Email Address.', 'error');
        return;
    }

    if (!cleanPhoneDigits || cleanPhoneDigits.length !== phoneConf.max || !phoneConf.pattern.test(cleanPhoneDigits)) {
        showAlert(`Please enter a valid ${countryCode} phone number (${phoneConf.desc}).`, 'error');
        phoneInput?.focus();
        return;
    }

    const fullPhoneNumber = `${countryCode} ${rawPhone}`;

    if (!selectedAdmitCardFile) {
        showAlert('Please upload your Pilot Admit Card (PDF or Image) to proceed.', 'error');
        return;
    }

    if (selectedSlots.length === 0) {
        showAlert('No slots selected. Please go back and select your simulator slots.', 'error');
        return;
    }

    // Set UI to loading state
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = `<span>⏳</span> Verifying Pilot Admit Card...`;
    clearAlert();

    try {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("phone", fullPhoneNumber);
        formData.append("email", email);
        formData.append("selected_slots", JSON.stringify(selectedSlots));
        formData.append("admit_card", selectedAdmitCardFile);

        const res = await fetch(`${BACKEND_URL}/api/pilot/verify-and-hold`, {
            method: "POST",
            body: formData
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            showAlert(data.error || 'Admit card verification failed. Please ensure your card is readable and official.', 'error');
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = `Verify Admit Card & Proceed to Checkout →`;
            return;
        }

        // Verification successful! Store hold details and cart in localStorage
        localStorage.setItem("havoc_cart", JSON.stringify(data.cart_items));
        localStorage.setItem("havoc_pilot_hold_txn_id", data.hold_txn_id);

        // Save customer details so checkout form is seamlessly prefilled
        const recentDetails = {
            name: data.customer.name,
            email: data.customer.email,
            phone: data.customer.phone
        };
        localStorage.setItem("havoc_pilot_customer", JSON.stringify(recentDetails));

        showAlert('Admit Card verified successfully! Redirecting to ₹0 checkout...', 'success');

        // Redirect to checkout with promo code hint
        setTimeout(() => {
            window.location.href = `/checkout.html?pilot_promo=1`;
        }, 1200);

    } catch (err) {
        console.error('Admit card verification error:', err);
        showAlert('Server communication error during admit card verification. Please try again.', 'error');
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = `Verify Admit Card & Proceed to Checkout →`;
    }
}

function showAlert(message, type = 'error') {
    const box = document.getElementById("pilotAlertBox");
    if (!box) return;
    box.className = `pilot-alert ${type}`;
    box.innerHTML = type === 'error' ? `⚠️ <strong>Notice:</strong> ${message}` : `✓ <strong>Success:</strong> ${message}`;
    box.style.display = 'block';
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearAlert() {
    const box = document.getElementById("pilotAlertBox");
    if (!box) return;
    box.style.display = 'none';
    box.innerHTML = '';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
