document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('instructor_token');
    if (!token) {
        window.location.href = '/instructor-login.html';
        return;
    }

    // Days of week
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const weekdayFullNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Standard venue time slots (excluding 1:00 PM - 2:00 PM break, matching venue booking schedule)
    const TIME_SLOTS = [
        '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
        '2:00 PM', '2:30 PM',
        '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
        '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM',
        '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
        '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM'
    ];

    // Schedule state: supports specific date overrides and weekday fallbacks
    // structure: { dates: { 'YYYY-MM-DD': ['11:00 AM', ...] }, weekly: { 'monday': [...], ... } }
    let scheduleData = {
        dates: {},
        weekly: {}
    };

    // Cache to remember previous slot configurations when turning a day back ON
    const slotsCache = {};

    // By default, initialize weekdays with slots active, but Monday is closed by default
    daysOfWeek.forEach(d => {
        if (d === 'monday') {
            scheduleData.weekly[d] = []; // Monday store closed by default
        } else {
            scheduleData.weekly[d] = [...TIME_SLOTS];
        }
    });

    // Date state
    const today = new Date();
    today.setHours(0,0,0,0);

    let activeDate = new Date(today);
    let stripStartDate = new Date(today);

    // Helpers for dates
    function formatIsoDate(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function isSameDay(d1, d2) {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    }

    // Helper: get slot list for a specific date
    function getSlotsForDate(d) {
        const iso = formatIsoDate(d);
        const dayKey = daysOfWeek[d.getDay()];

        // If explicitly set for this date (including empty array for day off)
        if (scheduleData.dates && scheduleData.dates[iso] !== undefined) {
            return scheduleData.dates[iso];
        }

        // Fallback to weekly schedule
        if (scheduleData.weekly && scheduleData.weekly[dayKey] !== undefined) {
            return scheduleData.weekly[dayKey];
        }

        // Monday store closed by default
        if (d.getDay() === 1) {
            return [];
        }

        return [...TIME_SLOTS];
    }

    let saveTimeout = null;
    async function persistSchedule(showToastNotice = false, customMsg = null) {
        if (!token) return;
        const isOnline = masterToggle ? masterToggle.checked : true;
        const payload = {
            status: isOnline ? 'Available' : 'Offline',
            schedule_json: JSON.stringify(scheduleData)
        };

        if (saveBtn) {
            saveBtn.innerHTML = '<span>⏳</span> Saving...';
            saveBtn.disabled = true;
        }

        try {
            const res = await fetch('/api/instructor/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                if (saveBtn) {
                    saveBtn.innerHTML = '<span>✓</span> Saved!';
                    setTimeout(() => {
                        saveBtn.innerHTML = '<span>💾</span> Save Schedule';
                        saveBtn.disabled = false;
                    }, 1500);
                }
                if (showToastNotice) {
                    showToast(customMsg || (isOnline ? 'Status: Available for Bookings' : 'Status: Offline (Hidden from Bookings)'));
                }
            } else {
                if (saveBtn) {
                    saveBtn.innerHTML = '<span>💾</span> Save Schedule';
                    saveBtn.disabled = false;
                }
            }
        } catch(err) {
            console.error('Failed to save instructor status:', err);
            if (saveBtn) {
                saveBtn.innerHTML = '<span>💾</span> Save Schedule';
                saveBtn.disabled = false;
            }
        }
    }

    function debouncedSave() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            persistSchedule(false);
        }, 600);
    }

    // Direct toggle helper for turning a specific day ON or OFF
    function toggleDayAvailability(targetDate, forceState = null) {
        const iso = formatIsoDate(targetDate);
        const dayKey = daysOfWeek[targetDate.getDay()];
        const currentSlots = scheduleData.dates[iso] !== undefined ? scheduleData.dates[iso] : getSlotsForDate(targetDate);
        const isCurrentlyOn = currentSlots.length > 0;
        const shouldBeOn = forceState !== null ? forceState : !isCurrentlyOn;

        if (shouldBeOn) {
            // Restore slots from cache, or from weekly default, or all slots
            const restored = slotsCache[iso] && slotsCache[iso].length > 0
                ? slotsCache[iso]
                : (scheduleData.weekly[dayKey] && scheduleData.weekly[dayKey].length > 0 ? scheduleData.weekly[dayKey] : [...TIME_SLOTS]);
            scheduleData.dates[iso] = [...restored];
            persistSchedule(true, `${weekdayFullNames[targetDate.getDay()]}, ${targetDate.getDate()} turned ON (${restored.length} slots)`);
        } else {
            // Save to cache before clearing
            if (currentSlots.length > 0) {
                slotsCache[iso] = [...currentSlots];
            }
            scheduleData.dates[iso] = [];
            persistSchedule(true, `${weekdayFullNames[targetDate.getDay()]}, ${targetDate.getDate()} marked as DAY OFF (Hidden from Bookings)`);
        }

        syncScheduleView();
    }

    // UI Elements
    const prevDayBtn = document.getElementById('prevDayBtn');
    const nextDayBtn = document.getElementById('nextDayBtn');
    const activeDayDisplayMain = document.getElementById('activeDayDisplayMain');
    const todayChipBadge = document.getElementById('todayChipBadge');
    const datePickerTrigger = document.getElementById('datePickerTrigger');
    const calendarPickerEl = document.getElementById('scheduleCalendarPicker');
    const jumpTodayBtn = document.getElementById('jumpTodayBtn');
    const jumpTomorrowBtn = document.getElementById('jumpTomorrowBtn');
    const jumpNextWeekBtn = document.getElementById('jumpNextWeekBtn');

    const weekStripContainer = document.getElementById('weekStripContainer');
    const activeDayDisplayTitle = document.getElementById('activeDayDisplayTitle');
    const activeDayDisplayCount = document.getElementById('activeDayDisplayCount');
    const activeDayDot = document.getElementById('activeDayDot');
    const dayStatusBadge = document.getElementById('dayStatusBadge');
    const dayStatusToggle = document.getElementById('dayStatusToggle');
    const toggleDayOffBtn = document.getElementById('toggleDayOffBtn');
    const dayOffAlert = document.getElementById('dayOffAlert');
    const turnDayBackOnBtn = document.getElementById('turnDayBackOnBtn');

    const currentWeekdayName = document.getElementById('currentWeekdayName');
    const activeDaySlotsGrid = document.getElementById('activeDaySlotsGrid');
    const applyToWeekdayBtn = document.getElementById('applyToWeekdayBtn');
    const applyToAllDatesBtn = document.getElementById('applyToAllDatesBtn');
    const markAllDaysOffBtn = document.getElementById('markAllDaysOffBtn');
    const applyDayOffToAllBtn = document.getElementById('applyDayOffToAllBtn');

    const saveBtn = document.getElementById('saveScheduleBtn');
    const masterToggle = document.getElementById('masterStatusToggle');
    const bannerBadge = document.getElementById('bannerStatusBadge');
    const availToggle = document.getElementById('availTabToggle');
    const availBadge2 = document.getElementById('availStatusBadge2');
    const availTabText = document.getElementById('availTabText');

    // Render the 7-day strip
    function renderWeekStrip() {
        if (!weekStripContainer) return;
        weekStripContainer.innerHTML = '';

        for (let i = 0; i < 7; i++) {
            const d = new Date(stripStartDate);
            d.setDate(stripStartDate.getDate() + i);

            const isSelected = isSameDay(d, activeDate);
            const isTodayDay = isSameDay(d, today);
            const dayIdx = d.getDay();
            const dayShort = weekdayFullNames[dayIdx].substring(0, 3).toUpperCase();
            const slots = getSlotsForDate(d);
            const count = slots.length;
            const isOff = count === 0;

            const chip = document.createElement('div');
            chip.className = `week-day-chip ${isSelected ? 'active' : ''} ${isOff ? 'day-off-card' : ''}`;
            chip.id = `chip-${formatIsoDate(d)}`;

            chip.innerHTML = `
                <div class="week-day-name">${isTodayDay ? 'TODAY' : dayShort}</div>
                <div class="week-day-num">${d.getDate()}</div>
                <button type="button" class="chip-toggle-btn ${isOff ? 'off' : 'on'}" title="Click to directly toggle this day ON / OFF">
                    ${isOff ? 'DAY OFF 🚫' : `${count} slots`}
                </button>
            `;

            // Clicking the toggle button turns that specific day ON/OFF directly
            const toggleBtn = chip.querySelector('.chip-toggle-btn');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    activeDate = new Date(d);
                    toggleDayAvailability(d);
                });
            }

            // Clicking anywhere else selects the day
            chip.addEventListener('click', () => {
                activeDate = new Date(d);
                syncScheduleView();
            });

            weekStripContainer.appendChild(chip);
        }
    }

    // Render active day card & slots grid
    function renderActiveDaySlots() {
        const iso = formatIsoDate(activeDate);
        const dayIdx = activeDate.getDay();
        const dayKey = daysOfWeek[dayIdx];
        const dayFull = weekdayFullNames[dayIdx];
        const isTodayDate = isSameDay(activeDate, today);

        // Ensure date array is initialized in scheduleData.dates if not present
        if (!scheduleData.dates[iso]) {
            scheduleData.dates[iso] = [...getSlotsForDate(activeDate)];
        }

        const activeSlots = scheduleData.dates[iso];
        const count = activeSlots.length;
        const isDayOff = count === 0;

        // Update Date Navigator
        if (activeDayDisplayMain) {
            activeDayDisplayMain.textContent = `${dayFull}, ${monthNames[activeDate.getMonth()]} ${activeDate.getDate()}, ${activeDate.getFullYear()}`;
        }
        if (todayChipBadge) {
            todayChipBadge.style.display = isTodayDate ? 'inline-block' : 'none';
        }
        if (calendarPickerEl) {
            calendarPickerEl.value = iso;
        }

        // Update Quick Jump button states
        const tmrw = new Date(today);
        tmrw.setDate(today.getDate() + 1);

        if (jumpTodayBtn) jumpTodayBtn.classList.toggle('active', isTodayDate);
        if (jumpTomorrowBtn) jumpTomorrowBtn.classList.toggle('active', isSameDay(activeDate, tmrw));

        // Update Day Card Header
        if (activeDayDisplayTitle) {
            activeDayDisplayTitle.textContent = `${dayFull}, ${fullMonthNames[activeDate.getMonth()]} ${activeDate.getDate()}${isTodayDate ? ' (Today)' : ''}`;
        }
        if (currentWeekdayName) {
            currentWeekdayName.textContent = dayFull;
        }

        // Day Status Toggle Switch & Badges
        if (dayStatusToggle) {
            dayStatusToggle.checked = !isDayOff;
        }
        if (dayStatusBadge) {
            dayStatusBadge.textContent = isDayOff ? 'DAY OFF' : 'ACTIVE';
            dayStatusBadge.className = `day-status-pill ${isDayOff ? 'offline' : 'online'}`;
        }
        const dayStatusWrap = document.querySelector('.day-status-toggle-wrap');
        if (dayStatusWrap) {
            dayStatusWrap.classList.toggle('offline', isDayOff);
        }
        if (activeDayDot) {
            activeDayDot.style.background = isDayOff ? '#f87171' : 'var(--gold)';
            activeDayDot.style.boxShadow = isDayOff ? '0 0 8px rgba(248,113,113,0.4)' : '0 0 8px var(--gold-glow)';
        }

        if (toggleDayOffBtn) {
            if (isDayOff) {
                toggleDayOffBtn.textContent = 'Turn Day On';
                toggleDayOffBtn.className = 'action-link action-gold';
            } else {
                toggleDayOffBtn.textContent = 'Mark Day Off';
                toggleDayOffBtn.className = 'action-link action-danger';
            }
        }

        if (applyToAllDatesBtn) {
            applyToAllDatesBtn.innerHTML = isDayOff ? '⚡ Apply Day Off to All Dates' : '⚡ Apply to All Dates';
        }
        updateAllDaysBtnUI();

        // Day Off Alert Banner & Grid opacity
        if (dayOffAlert) {
            dayOffAlert.style.display = isDayOff ? 'flex' : 'none';
        }
        if (activeDaySlotsGrid) {
            activeDaySlotsGrid.style.opacity = isDayOff ? '0.3' : '1';
            activeDaySlotsGrid.style.pointerEvents = isDayOff ? 'none' : 'auto';
        }

        updateSlotCounterUI(count);

        // Render the 25 Slot Pills
        if (!activeDaySlotsGrid) return;
        activeDaySlotsGrid.innerHTML = '';

        TIME_SLOTS.forEach(slot => {
            const pill = document.createElement('div');
            const isSelected = activeSlots.includes(slot);
            pill.className = `slot-pill ${isSelected ? 'active' : ''}`;
            pill.textContent = slot;
            pill.dataset.slot = slot;

            pill.addEventListener('click', () => {
                const idx = scheduleData.dates[iso].indexOf(slot);
                if (idx > -1) {
                    scheduleData.dates[iso].splice(idx, 1);
                    pill.classList.remove('active');
                } else {
                    scheduleData.dates[iso].push(slot);
                    pill.classList.add('active');
                }
                onSlotsUpdated();
                debouncedSave();
            });

            activeDaySlotsGrid.appendChild(pill);
        });
    }

    function updateSlotCounterUI(count) {
        const countText = count === 0 ? 'Day Off (0 slots active)' : `${count} slot${count === 1 ? '' : 's'} active`;
        if (activeDayDisplayCount) {
            activeDayDisplayCount.textContent = countText;
            activeDayDisplayCount.style.color = count === 0 ? '#ff5252' : 'var(--muted)';
        }
    }

    function onSlotsUpdated() {
        const iso = formatIsoDate(activeDate);
        const count = (scheduleData.dates[iso] || []).length;
        const isDayOff = count === 0;

        // Remember non-empty slots in cache
        if (count > 0) {
            slotsCache[iso] = [...scheduleData.dates[iso]];
        }

        updateSlotCounterUI(count);

        if (dayStatusToggle) dayStatusToggle.checked = !isDayOff;
        if (dayStatusBadge) {
            dayStatusBadge.textContent = isDayOff ? 'DAY OFF' : 'ACTIVE';
            dayStatusBadge.className = `day-status-pill ${isDayOff ? 'offline' : 'online'}`;
        }
        const dayStatusWrap = document.querySelector('.day-status-toggle-wrap');
        if (dayStatusWrap) {
            dayStatusWrap.classList.toggle('offline', isDayOff);
        }
        if (activeDayDot) {
            activeDayDot.style.background = isDayOff ? '#f87171' : 'var(--gold)';
        }
        if (toggleDayOffBtn) {
            toggleDayOffBtn.textContent = isDayOff ? 'Turn Day On' : 'Mark Day Off';
            toggleDayOffBtn.className = isDayOff ? 'action-link action-gold' : 'action-link action-danger';
        }
        if (applyToAllDatesBtn) {
            applyToAllDatesBtn.innerHTML = isDayOff ? '⚡ Apply Day Off to All Dates' : '⚡ Apply to All Dates';
        }
        updateAllDaysBtnUI();
        if (dayOffAlert) {
            dayOffAlert.style.display = isDayOff ? 'flex' : 'none';
        }
        if (activeDaySlotsGrid) {
            activeDaySlotsGrid.style.opacity = isDayOff ? '0.3' : '1';
            activeDaySlotsGrid.style.pointerEvents = isDayOff ? 'none' : 'auto';
        }

        // Update strip chip for this day
        const chip = document.getElementById(`chip-${iso}`);
        if (chip) {
            const btn = chip.querySelector('.chip-toggle-btn');
            if (btn) {
                btn.textContent = isDayOff ? 'DAY OFF 🚫' : `${count} slots`;
                btn.className = `chip-toggle-btn ${isDayOff ? 'off' : 'on'}`;
            }
            chip.classList.toggle('day-off-card', isDayOff);
        }
    }

    function syncScheduleView() {
        // If activeDate is before or more than 6 days past stripStartDate, adjust stripStartDate
        const diffDays = Math.floor((activeDate - stripStartDate) / (1000 * 60 * 60 * 24));
        if (diffDays < 0 || diffDays >= 7) {
            stripStartDate = new Date(activeDate);
        }
        renderWeekStrip();
        renderActiveDaySlots();
    }

    // Direct Day Status Switch & Buttons
    if (dayStatusToggle) {
        dayStatusToggle.addEventListener('change', (e) => {
            toggleDayAvailability(activeDate, e.target.checked);
        });
    }

    if (toggleDayOffBtn) {
        toggleDayOffBtn.addEventListener('click', () => {
            toggleDayAvailability(activeDate);
        });
    }

    if (turnDayBackOnBtn) {
        turnDayBackOnBtn.addEventListener('click', () => {
            toggleDayAvailability(activeDate, true);
        });
    }

    // Date Navigation Listeners
    if (prevDayBtn) {
        prevDayBtn.addEventListener('click', () => {
            activeDate.setDate(activeDate.getDate() - 1);
            syncScheduleView();
        });
    }

    if (nextDayBtn) {
        nextDayBtn.addEventListener('click', () => {
            activeDate.setDate(activeDate.getDate() + 1);
            syncScheduleView();
        });
    }

    if (calendarPickerEl) {
        const onDateChosen = (e) => {
            if (e.target.value) {
                const parts = e.target.value.split('-');
                if (parts.length === 3) {
                    activeDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                    syncScheduleView();
                }
            }
        };
        calendarPickerEl.addEventListener('change', onDateChosen);
        calendarPickerEl.addEventListener('input', onDateChosen);
    }

    if (datePickerTrigger && calendarPickerEl) {
        datePickerTrigger.addEventListener('click', () => {
            try {
                if (typeof calendarPickerEl.showPicker === 'function') {
                    calendarPickerEl.showPicker();
                }
            } catch (err) {
                // Handled natively by stretched webkit indicator
            }
        });
    }

    if (jumpTodayBtn) {
        jumpTodayBtn.addEventListener('click', () => {
            activeDate = new Date(today);
            stripStartDate = new Date(today);
            syncScheduleView();
        });
    }

    if (jumpTomorrowBtn) {
        jumpTomorrowBtn.addEventListener('click', () => {
            activeDate = new Date(today);
            activeDate.setDate(today.getDate() + 1);
            stripStartDate = new Date(today);
            syncScheduleView();
        });
    }

    if (jumpNextWeekBtn) {
        jumpNextWeekBtn.addEventListener('click', () => {
            activeDate.setDate(activeDate.getDate() + 7);
            stripStartDate.setDate(stripStartDate.getDate() + 7);
            syncScheduleView();
        });
    }


    // Apply to All [Weekday]s
    if (applyToWeekdayBtn) {
        applyToWeekdayBtn.addEventListener('click', () => {
            const iso = formatIsoDate(activeDate);
            const currentSlots = [...(scheduleData.dates[iso] || [])];
            const weekday = daysOfWeek[activeDate.getDay()];
            const weekdayName = weekdayFullNames[activeDate.getDay()];

            scheduleData.weekly[weekday] = [...currentSlots];

            // Update any visible dates in the current strip that match this weekday
            for (let i = 0; i < 7; i++) {
                const d = new Date(stripStartDate);
                d.setDate(stripStartDate.getDate() + i);
                if (d.getDay() === activeDate.getDay()) {
                    scheduleData.dates[formatIsoDate(d)] = [...currentSlots];
                }
            }

            renderWeekStrip();
            onSlotsUpdated();
            persistSchedule(true, `Applied ${currentSlots.length} slots to all ${weekdayName}s!`);
        });
    }

    // Apply current active day configuration to ALL dates (excluding Mondays which are always closed by default)
    function applyCurrentDayToAllDates() {
        const iso = formatIsoDate(activeDate);
        const currentSlots = [...(scheduleData.dates[iso] || [])];
        const isDayOff = currentSlots.length === 0;

        // 1. Update weekly default schedules (keep Monday closed unless active day is a custom Monday override)
        daysOfWeek.forEach(d => {
            if (d === 'monday' && activeDate.getDay() !== 1) {
                scheduleData.weekly[d] = []; // Monday store closed by default
            } else {
                scheduleData.weekly[d] = [...currentSlots];
            }
        });

        // 2. Overwrite all existing date overrides
        Object.keys(scheduleData.dates).forEach(dKey => {
            const dt = new Date(dKey);
            if (dt.getDay() === 1 && activeDate.getDay() !== 1) {
                scheduleData.dates[dKey] = [];
            } else {
                scheduleData.dates[dKey] = [...currentSlots];
            }
        });

        // 3. Overwrite all 7 visible days in current week strip
        for (let i = 0; i < 7; i++) {
            const d = new Date(stripStartDate);
            d.setDate(stripStartDate.getDate() + i);
            if (d.getDay() === 1 && activeDate.getDay() !== 1) {
                scheduleData.dates[formatIsoDate(d)] = [];
            } else {
                scheduleData.dates[formatIsoDate(d)] = [...currentSlots];
            }
        }

        // 4. Overwrite next 30 days
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            if (d.getDay() === 1 && activeDate.getDay() !== 1) {
                scheduleData.dates[formatIsoDate(d)] = [];
            } else {
                scheduleData.dates[formatIsoDate(d)] = [...currentSlots];
            }
        }

        renderWeekStrip();
        onSlotsUpdated();

        const toastMsg = isDayOff
            ? 'All dates marked as DAY OFF (Hidden from bookings)'
            : `Applied ${currentSlots.length} active slots to dates (Mondays remain closed)!`;
        persistSchedule(true, toastMsg);
    }

    // Check if every date / weekly template is currently marked off
    function areAllDaysOff() {
        const anyWeeklyOn = daysOfWeek.some(d => (scheduleData.weekly[d] && scheduleData.weekly[d].length > 0));
        if (anyWeeklyOn) return false;

        const activeIso = formatIsoDate(activeDate);
        if (scheduleData.dates[activeIso] && scheduleData.dates[activeIso].length > 0) return false;

        for (let i = 0; i < 7; i++) {
            const d = new Date(stripStartDate);
            d.setDate(stripStartDate.getDate() + i);
            const iso = formatIsoDate(d);
            if (scheduleData.dates[iso] && scheduleData.dates[iso].length > 0) return false;
        }

        return true;
    }

    function updateAllDaysBtnUI() {
        if (!markAllDaysOffBtn) return;
        const allOff = areAllDaysOff();
        if (allOff) {
            markAllDaysOffBtn.textContent = 'Turn All Days On';
            markAllDaysOffBtn.className = 'action-link action-gold';
            markAllDaysOffBtn.title = 'All days are currently OFF. Click to turn all days back ON.';
        } else {
            markAllDaysOffBtn.textContent = 'Mark All Days Off';
            markAllDaysOffBtn.className = 'action-link action-danger';
            markAllDaysOffBtn.title = 'Click to mark every day as DAY OFF.';
        }
    }

    // Toggle ALL dates between DAY OFF and FULLY ON
    function toggleAllDays() {
        const currentlyAllOff = areAllDaysOff();

        if (currentlyAllOff) {
            // Turn all days back ON: restore slots for all open days (Mondays stay closed by default)
            daysOfWeek.forEach(d => {
                if (d === 'monday') {
                    scheduleData.weekly[d] = []; // Monday store closed by default
                } else {
                    scheduleData.weekly[d] = [...TIME_SLOTS];
                }
            });

            Object.keys(scheduleData.dates).forEach(dKey => {
                const dt = new Date(dKey);
                if (dt.getDay() === 1) {
                    scheduleData.dates[dKey] = [];
                } else {
                    scheduleData.dates[dKey] = [...TIME_SLOTS];
                }
            });

            for (let i = 0; i < 7; i++) {
                const d = new Date(stripStartDate);
                d.setDate(stripStartDate.getDate() + i);
                if (d.getDay() === 1) {
                    scheduleData.dates[formatIsoDate(d)] = [];
                } else {
                    scheduleData.dates[formatIsoDate(d)] = [...TIME_SLOTS];
                }
            }

            for (let i = 0; i < 30; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                if (d.getDay() === 1) {
                    scheduleData.dates[formatIsoDate(d)] = [];
                } else {
                    scheduleData.dates[formatIsoDate(d)] = [...TIME_SLOTS];
                }
            }

            renderWeekStrip();
            onSlotsUpdated();
            persistSchedule(true, 'All dates turned ON (Mondays remain closed)!');
        } else {
            // Mark all days OFF
            const iso = formatIsoDate(activeDate);
            scheduleData.dates[iso] = [];

            daysOfWeek.forEach(d => {
                scheduleData.weekly[d] = [];
            });

            Object.keys(scheduleData.dates).forEach(dKey => {
                scheduleData.dates[dKey] = [];
            });

            for (let i = 0; i < 7; i++) {
                const d = new Date(stripStartDate);
                d.setDate(stripStartDate.getDate() + i);
                scheduleData.dates[formatIsoDate(d)] = [];
            }

            for (let i = 0; i < 30; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                scheduleData.dates[formatIsoDate(d)] = [];
            }

            renderWeekStrip();
            onSlotsUpdated();
            persistSchedule(true, 'All dates marked as DAY OFF (Hidden from bookings)');
        }
    }

    if (applyToAllDatesBtn) {
        applyToAllDatesBtn.addEventListener('click', applyCurrentDayToAllDates);
    }

    if (markAllDaysOffBtn) {
        markAllDaysOffBtn.addEventListener('click', toggleAllDays);
    }

    if (applyDayOffToAllBtn) {
        applyDayOffToAllBtn.addEventListener('click', toggleAllDays);
    }

    // Tab switching (both desktop sidebar and mobile bottom nav)
    const navBtns = document.querySelectorAll('.nav-btn, .mobile-nav-item[data-target]');
    const tabs = document.querySelectorAll('.tab-content');
    const headerHighlight = document.getElementById('headerHighlight');
    const headerSubtitle = document.getElementById('headerSubtitle');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            if (!target) return;

            // Sync active state on all buttons targeting tabs
            document.querySelectorAll('.nav-btn, .mobile-nav-item').forEach(b => {
                if (b.dataset.target === target) {
                    b.classList.add('active');
                } else if (b.dataset.target) {
                    b.classList.remove('active');
                }
            });

            tabs.forEach(t => t.classList.remove('active'));
            const targetEl = document.getElementById(target);
            if (targetEl) targetEl.classList.add('active');

            if (target === 'tab-schedule') {
                headerHighlight.textContent = 'Schedule';
                headerSubtitle.textContent = 'Select any date to view and customize your available booking slots.';
                if (saveBtn) saveBtn.style.display = 'inline-flex';
            } else if (target === 'tab-availability') {
                headerHighlight.textContent = 'Availability';
                headerSubtitle.textContent = 'Set your live online or offline booking status.';
                if (saveBtn) saveBtn.style.display = 'inline-flex';
            }
        });
    });

    // Synchronize Master Toggle in Banner and in Availability Tab
    function syncStatus(isAvailable) {
        if (masterToggle) masterToggle.checked = isAvailable;
        if (availToggle) availToggle.checked = isAvailable;
        
        if (isAvailable) {
            if (bannerBadge) {
                bannerBadge.textContent = 'Available';
                bannerBadge.className = 'status-badge online';
            }
            if (availBadge2) {
                availBadge2.textContent = 'Available';
                availBadge2.className = 'status-badge online';
            }
            if (availTabText) availTabText.textContent = 'Currently Available for Bookings';
        } else {
            if (bannerBadge) {
                bannerBadge.textContent = 'Offline';
                bannerBadge.className = 'status-badge offline';
            }
            if (availBadge2) {
                availBadge2.textContent = 'Offline';
                availBadge2.className = 'status-badge offline';
            }
            if (availTabText) availTabText.textContent = 'Currently Offline';
        }
    }

    if (masterToggle) {
        masterToggle.addEventListener('change', (e) => {
            syncStatus(e.target.checked);
            persistSchedule(true);
        });
    }
    if (availToggle) {
        availToggle.addEventListener('change', (e) => {
            syncStatus(e.target.checked);
            persistSchedule(true);
        });
    }

    // Toast helper
    function showToast(msg) {
        const toast = document.getElementById('toastNotification');
        if (!toast) return;
        toast.textContent = msg;
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }

    // Fetch initial instructor data
    try {
        const res = await fetch('/api/instructor/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('instructor_token');
            window.location.href = '/instructor-login.html';
            return;
        }
        
        const data = await res.json();
        
        // Sidebar info
        const sidebarName = document.getElementById('sidebarInstructorName');
        if (sidebarName) sidebarName.textContent = data.name || 'Instructor';
        const sidebarUser = document.getElementById('sidebarInstructorUsername');
        if (sidebarUser) sidebarUser.textContent = data.username ? `@${data.username}` : (data.email || '');
        if (data.photo_url) {
            const sAvatar = document.getElementById('sidebarAvatar');
            if (sAvatar) sAvatar.src = data.photo_url;
            const mAvatar = document.getElementById('mobileAvatar');
            if (mAvatar) mAvatar.src = data.photo_url;
        }

        // Status
        const isAvailable = data.status === 'Available';
        syncStatus(isAvailable);
        
        // Parse Schedule
        if (data.schedule_json) {
            try {
                const parsed = JSON.parse(data.schedule_json);
                if (parsed.dates || parsed.weekly) {
                    // New format
                    if (parsed.dates && typeof parsed.dates === 'object') {
                        scheduleData.dates = { ...parsed.dates };
                    }
                    if (parsed.weekly && typeof parsed.weekly === 'object') {
                        scheduleData.weekly = { ...parsed.weekly };
                    }
                } else {
                    // Legacy flat format: { monday: [...], tuesday: [...] }
                    Object.keys(parsed).forEach(k => {
                        const lowKey = k.toLowerCase();
                        if (daysOfWeek.includes(lowKey) && Array.isArray(parsed[k])) {
                            scheduleData.weekly[lowKey] = parsed[k];
                        }
                    });
                }

                // Ensure 1:00 PM and 1:30 PM (lunch break) are purged from all date and weekly slots
                const isExcludedSlot = s => {
                    const c = (s || '').trim();
                    return c === '1:00 PM' || c === '1:30 PM' || c === '1:00' || c === '1:30';
                };
                Object.keys(scheduleData.dates).forEach(dKey => {
                    if (Array.isArray(scheduleData.dates[dKey])) {
                        scheduleData.dates[dKey] = scheduleData.dates[dKey].filter(s => !isExcludedSlot(s));
                    }
                });
                Object.keys(scheduleData.weekly).forEach(wKey => {
                    if (Array.isArray(scheduleData.weekly[wKey])) {
                        scheduleData.weekly[wKey] = scheduleData.weekly[wKey].filter(s => !isExcludedSlot(s));
                    }
                });
            } catch (e) {
                console.error('Failed to parse schedule JSON', e);
            }
        }
        
        // Render initial view
        syncScheduleView();
        
    } catch (err) {
        console.error("Error loading dashboard", err);
    }

    // Save schedule handler
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            persistSchedule(true, 'Schedule & availability saved successfully!');
        });
    }

    // Change Password Modal handling
    window.openChangePwModal = () => {
        const modal = document.getElementById('changePwModal');
        if (modal) {
            document.getElementById('changePwForm').reset();
            document.getElementById('modalPwError').style.display = 'none';
            modal.style.display = 'flex';
        }
    };

    window.closeChangePwModal = () => {
        const modal = document.getElementById('changePwModal');
        if (modal) modal.style.display = 'none';
    };

    const changePwForm = document.getElementById('changePwForm');
    if (changePwForm) {
        changePwForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPw = document.getElementById('modalNewPw').value.trim();
            const confirmPw = document.getElementById('modalConfirmPw').value.trim();
            const errorEl = document.getElementById('modalPwError');
            const submitBtn = document.getElementById('modalPwSubmitBtn');

            errorEl.style.display = 'none';

            if (newPw.length < 6) {
                errorEl.textContent = 'Password must be at least 6 characters.';
                errorEl.style.display = 'block';
                return;
            }

            if (newPw !== confirmPw) {
                errorEl.textContent = 'Passwords do not match.';
                errorEl.style.display = 'block';
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Updating...';

            try {
                const res = await fetch('/api/instructor/change-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ newPassword: newPw })
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    closeChangePwModal();
                    showToast('Password updated successfully!');
                } else {
                    errorEl.textContent = data.error || 'Failed to update password.';
                    errorEl.style.display = 'block';
                }
            } catch (err) {
                errorEl.textContent = 'A network error occurred.';
                errorEl.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Update Password';
            }
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
    const handleLogout = () => {
        localStorage.removeItem('instructor_token');
        window.location.href = '/instructor-login.html';
    };
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);
});
