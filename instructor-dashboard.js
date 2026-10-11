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

    // Standard venue time slots (fallback if API fails)
    const DEFAULT_SLOTS = [
        '11AM-11:30AM', '11:30AM-12PM', '12PM-12:30PM', '12:30PM-1PM',
        '2PM-2:30PM', '2:30PM-3PM', '3PM-3:30PM', '3:30PM-4PM',
        '4PM-4:30PM', '4:30PM-5PM', '5PM-5:30PM', '5:30PM-6PM',
        '6PM-6:30PM', '6:30PM-7PM', '7PM-7:30PM', '7:30PM-8PM',
        '8PM-8:30PM', '8:30PM-9PM', '9PM-9:30PM', '9:30PM-10PM'
    ];

    let availableVenueSlots = [...DEFAULT_SLOTS];

    // Try fetching active slots from venue configuration
    try {
        const slotsRes = await fetch('/api/slots');
        if (slotsRes.ok) {
            const slotsData = await slotsRes.json();
            if (Array.isArray(slotsData) && slotsData.length > 0) {
                availableVenueSlots = slotsData.map(s => s.name || s.slot_name).filter(Boolean);
            }
        }
    } catch(e) {
        console.warn('Using default slots array', e);
    }

    // Format slot label for friendly UI display
    function formatSlotDisplay(slot) {
        if (!slot) return '';
        // If slot is e.g. "11AM-11:30AM"
        if (slot.includes('-')) {
            const parts = slot.split('-');
            return `${parts[0]} - ${parts[1]}`;
        }
        return slot;
    }

    // Schedule state: supports both specific date overrides and weekday fallbacks
    // structure: { dates: { 'YYYY-MM-DD': ['slot1', ...] }, weekly: { 'monday': [...], ... } }
    let scheduleData = {
        dates: {},
        weekly: {}
    };

    // Initialize weekly fallbacks with all available slots by default
    daysOfWeek.forEach(d => {
        scheduleData.weekly[d] = [...availableVenueSlots];
    });

    // Generate next 45 days starting from today
    const dateList = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 0; i < 45; i++) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayNum = String(d.getDate()).padStart(2, '0');
        const iso = `${y}-${m}-${dayNum}`;
        const dayIdx = d.getDay();
        const dayKey = daysOfWeek[dayIdx];
        const dayFull = weekdayFullNames[dayIdx];
        const dayShort = dayFull.substring(0, 3);
        const monthShort = monthNames[d.getMonth()];
        const label = `${monthShort} ${d.getDate()} (${dayShort})`;
        const fullLabel = `${dayFull}, ${fullMonthNames[d.getMonth()]} ${d.getDate()}, ${y}`;

        dateList.push({
            dateObj: d,
            iso,
            dayKey,
            dayFull,
            dayShort,
            monthShort,
            dayNum: d.getDate(),
            label,
            fullLabel,
            isToday: i === 0
        });
    }

    let activeDateIndex = 0;
    let activeDate = dateList[0];

    // UI Elements
    const dateSelectEl = document.getElementById('scheduleDateSelect');
    const calendarPickerEl = document.getElementById('scheduleCalendarPicker');
    const prevDayBtn = document.getElementById('prevDayBtn');
    const nextDayBtn = document.getElementById('nextDayBtn');
    const quickDatesBar = document.getElementById('quickDatesBar');
    const activeDayDisplayTitle = document.getElementById('activeDayDisplayTitle');
    const activeDayDisplayCount = document.getElementById('activeDayDisplayCount');
    const selectedDateSlotCountBadge = document.getElementById('selectedDateSlotCountBadge');
    const activeDaySlotsGrid = document.getElementById('activeDaySlotsGrid');
    const selectAllForDayBtn = document.getElementById('selectAllForDayBtn');
    const clearAllForDayBtn = document.getElementById('clearAllForDayBtn');
    const applyToWeekdayBtn = document.getElementById('applyToWeekdayBtn');
    const currentWeekdayName = document.getElementById('currentWeekdayName');

    const saveBtn = document.getElementById('saveScheduleBtn');
    const masterToggle = document.getElementById('masterStatusToggle');
    const bannerBadge = document.getElementById('bannerStatusBadge');
    const availToggle = document.getElementById('availTabToggle');
    const availBadge2 = document.getElementById('availStatusBadge2');
    const availTabText = document.getElementById('availTabText');

    // Populate Date Selector dropdown
    function populateDateDropdown() {
        if (!dateSelectEl) return;
        dateSelectEl.innerHTML = '';
        dateList.forEach((d, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `${d.isToday ? 'Today - ' : ''}${d.fullLabel}`;
            dateSelectEl.appendChild(opt);
        });
        dateSelectEl.value = activeDateIndex;

        if (calendarPickerEl) {
            calendarPickerEl.min = dateList[0].iso;
            calendarPickerEl.max = dateList[dateList.length - 1].iso;
            calendarPickerEl.value = activeDate.iso;
        }
    }

    // Helper: get slot list for a specific date
    function getSlotsForDate(dateObj) {
        const iso = dateObj.iso;
        const dayKey = dateObj.dayKey;

        // If explicitly set for this date (including empty array for day off)
        if (scheduleData.dates && scheduleData.dates[iso] !== undefined) {
            return scheduleData.dates[iso];
        }

        // Fallback to weekly schedule
        if (scheduleData.weekly && scheduleData.weekly[dayKey] !== undefined) {
            return scheduleData.weekly[dayKey];
        }

        return [...availableVenueSlots];
    }

    // Helper: get active slot count for date
    function getSlotCountForDate(dateObj) {
        return getSlotsForDate(dateObj).length;
    }

    // Render Quick Dates Chips Bar
    function renderQuickDateChips() {
        if (!quickDatesBar) return;
        quickDatesBar.innerHTML = '';

        dateList.forEach((d, idx) => {
            const chip = document.createElement('div');
            chip.className = `quick-date-chip ${idx === activeDateIndex ? 'active' : ''}`;
            chip.id = `chip-${d.iso}`;

            const count = getSlotCountForDate(d);
            const isOff = count === 0;

            chip.innerHTML = `
                <div class="chip-day">${d.isToday ? 'TODAY' : d.dayShort}</div>
                <div class="chip-date">${d.monthShort} ${d.dayNum}</div>
                <div class="chip-dots">
                    <span class="chip-status-dot ${isOff ? 'off' : ''}" title="${isOff ? 'Day Off (0 slots)' : `${count} slots active`}"></span>
                </div>
            `;

            chip.addEventListener('click', () => {
                setActiveDateByIndex(idx);
            });

            quickDatesBar.appendChild(chip);
        });

        // Ensure active chip is scrolled into view smoothly
        scrollActiveChipIntoView();
    }

    function scrollActiveChipIntoView() {
        const activeChip = document.getElementById(`chip-${activeDate.iso}`);
        if (activeChip && quickDatesBar) {
            activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }

    // Render the Slots for the currently selected Date
    function renderActiveDateSlots() {
        activeDate = dateList[activeDateIndex];
        const iso = activeDate.iso;
        const dayKey = activeDate.dayKey;

        // Ensure date array is initialized in scheduleData.dates if modified
        if (!scheduleData.dates[iso]) {
            scheduleData.dates[iso] = [...getSlotsForDate(activeDate)];
        }

        const activeSlots = scheduleData.dates[iso];
        const count = activeSlots.length;

        // Header displays
        if (activeDayDisplayTitle) {
            activeDayDisplayTitle.textContent = `${activeDate.fullLabel} ${activeDate.isToday ? '(Today)' : ''}`;
        }
        if (currentWeekdayName) {
            currentWeekdayName.textContent = activeDate.dayFull;
        }

        const countText = count === 0 ? 'Day Off (0 slots active)' : `${count} slot${count === 1 ? '' : 's'} active`;
        if (activeDayDisplayCount) {
            activeDayDisplayCount.textContent = countText;
            activeDayDisplayCount.style.color = count === 0 ? '#ff5252' : 'var(--gold)';
        }
        if (selectedDateSlotCountBadge) {
            selectedDateSlotCountBadge.textContent = countText;
            selectedDateSlotCountBadge.style.color = count === 0 ? '#ff5252' : 'var(--gold)';
        }

        // Render slot pills
        if (!activeDaySlotsGrid) return;
        activeDaySlotsGrid.innerHTML = '';

        availableVenueSlots.forEach(slot => {
            const pill = document.createElement('div');
            const isSelected = activeSlots.includes(slot);
            pill.className = `slot-pill ${isSelected ? 'active' : ''}`;
            pill.textContent = formatSlotDisplay(slot);
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
                updateActiveSlotCounts();
            });

            activeDaySlotsGrid.appendChild(pill);
        });

        // Update chips UI
        updateActiveChipBadge(activeDateIndex);
    }

    function updateActiveSlotCounts() {
        const iso = activeDate.iso;
        const count = (scheduleData.dates[iso] || []).length;
        const countText = count === 0 ? 'Day Off (0 slots active)' : `${count} slot${count === 1 ? '' : 's'} active`;

        if (activeDayDisplayCount) {
            activeDayDisplayCount.textContent = countText;
            activeDayDisplayCount.style.color = count === 0 ? '#ff5252' : 'var(--gold)';
        }
        if (selectedDateSlotCountBadge) {
            selectedDateSlotCountBadge.textContent = countText;
            selectedDateSlotCountBadge.style.color = count === 0 ? '#ff5252' : 'var(--gold)';
        }

        updateActiveChipBadge(activeDateIndex);
    }

    function updateActiveChipBadge(idx) {
        const d = dateList[idx];
        const chip = document.getElementById(`chip-${d.iso}`);
        if (!chip) return;

        const count = getSlotCountForDate(d);
        const isOff = count === 0;
        const dot = chip.querySelector('.chip-status-dot');
        if (dot) {
            if (isOff) {
                dot.classList.add('off');
                dot.title = 'Day Off (0 slots)';
            } else {
                dot.classList.remove('off');
                dot.title = `${count} slots active`;
            }
        }
    }

    // Set active date by index
    function setActiveDateByIndex(idx) {
        if (idx < 0 || idx >= dateList.length) return;
        activeDateIndex = idx;
        activeDate = dateList[activeDateIndex];

        // Update dropdown & picker
        if (dateSelectEl) dateSelectEl.value = idx;
        if (calendarPickerEl) calendarPickerEl.value = activeDate.iso;

        // Update chip highlights
        document.querySelectorAll('.quick-date-chip').forEach((c, i) => {
            c.classList.toggle('active', i === idx);
        });

        scrollActiveChipIntoView();
        renderActiveDateSlots();
    }

    // Button event listeners
    if (prevDayBtn) {
        prevDayBtn.addEventListener('click', () => {
            if (activeDateIndex > 0) setActiveDateByIndex(activeDateIndex - 1);
        });
    }

    if (nextDayBtn) {
        nextDayBtn.addEventListener('click', () => {
            if (activeDateIndex < dateList.length - 1) setActiveDateByIndex(activeDateIndex + 1);
        });
    }

    if (dateSelectEl) {
        dateSelectEl.addEventListener('change', (e) => {
            setActiveDateByIndex(parseInt(e.target.value, 10));
        });
    }

    if (calendarPickerEl) {
        calendarPickerEl.addEventListener('change', (e) => {
            const pickedIso = e.target.value;
            const foundIdx = dateList.findIndex(d => d.iso === pickedIso);
            if (foundIdx > -1) {
                setActiveDateByIndex(foundIdx);
            }
        });
    }

    // Select All Slots for this date
    if (selectAllForDayBtn) {
        selectAllForDayBtn.addEventListener('click', () => {
            const iso = activeDate.iso;
            scheduleData.dates[iso] = [...availableVenueSlots];
            if (activeDaySlotsGrid) {
                activeDaySlotsGrid.querySelectorAll('.slot-pill').forEach(pill => pill.classList.add('active'));
            }
            updateActiveSlotCounts();
        });
    }

    // Clear All Slots (Mark Day Off)
    if (clearAllForDayBtn) {
        clearAllForDayBtn.addEventListener('click', () => {
            const iso = activeDate.iso;
            scheduleData.dates[iso] = [];
            if (activeDaySlotsGrid) {
                activeDaySlotsGrid.querySelectorAll('.slot-pill').forEach(pill => pill.classList.remove('active'));
            }
            updateActiveSlotCounts();
        });
    }

    // Propagate active day schedule to all matching weekdays (e.g. all Sundays)
    if (applyToWeekdayBtn) {
        applyToWeekdayBtn.addEventListener('click', () => {
            const iso = activeDate.iso;
            const currentSlots = [...(scheduleData.dates[iso] || [])];
            const weekday = activeDate.dayKey;

            // Set recurring default
            scheduleData.weekly[weekday] = [...currentSlots];

            // Apply to all generated dates matching this weekday
            dateList.forEach((d, idx) => {
                if (d.dayKey === weekday) {
                    scheduleData.dates[d.iso] = [...currentSlots];
                    updateActiveChipBadge(idx);
                }
            });

            showToast(`Applied ${currentSlots.length} slots to all ${activeDate.dayFull}s!`);
            updateActiveSlotCounts();
        });
    }

    // Tab switching
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabs = document.querySelectorAll('.tab-content');
    const headerHighlight = document.getElementById('headerHighlight');
    const headerSubtitle = document.getElementById('headerSubtitle');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            tabs.forEach(t => t.classList.remove('active'));
            btn.classList.add('active');

            const target = btn.dataset.target;
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
            } else if (target === 'tab-profile') {
                headerHighlight.textContent = 'Profile';
                headerSubtitle.textContent = 'Review your instructor details, fee, and simulator assignment.';
                if (saveBtn) saveBtn.style.display = 'none';
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

    if (masterToggle) masterToggle.addEventListener('change', (e) => syncStatus(e.target.checked));
    if (availToggle) availToggle.addEventListener('change', (e) => syncStatus(e.target.checked));

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
            const pAvatar = document.getElementById('profilePhotoLarge');
            if (sAvatar) sAvatar.src = data.photo_url;
            if (pAvatar) pAvatar.src = data.photo_url;
        }
        
        // Profile tab
        const pName = document.getElementById('profileNameLarge');
        if (pName) pName.textContent = data.name || 'Instructor';
        const pUser = document.getElementById('profileUserLarge');
        if (pUser) pUser.textContent = data.username ? `@${data.username}` : '';
        const pRoleBadge = document.getElementById('profileRoleBadge');
        if (pRoleBadge) pRoleBadge.textContent = data.role || 'Simulator Instructor';
        const pEmail = document.getElementById('profileEmail');
        if (pEmail) pEmail.textContent = data.email || '-';
        const pPhone = document.getElementById('profilePhone');
        if (pPhone) pPhone.textContent = data.phone || '-';
        const pRole = document.getElementById('profileRole');
        if (pRole) pRole.textContent = data.role || '-';
        const pSim = document.getElementById('profileSimType');
        if (pSim) pSim.textContent = data.simulator_type || 'All';
        const pFee = document.getElementById('profileFee');
        if (pFee) pFee.textContent = `₹${data.fee != null ? data.fee : 500}`;
        const pAch = document.getElementById('profileAchievement');
        if (pAch) pAch.textContent = data.key_achievement || '-';
        const pBio = document.getElementById('profileBio');
        if (pBio) pBio.textContent = data.biography || 'No biography added yet.';

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
                    // Backward-compat: old flat weekday format { monday: [...], tuesday: [...] }
                    Object.keys(parsed).forEach(k => {
                        const lowKey = k.toLowerCase();
                        if (daysOfWeek.includes(lowKey) && Array.isArray(parsed[k])) {
                            scheduleData.weekly[lowKey] = parsed[k];
                        }
                    });
                }
            } catch (e) {
                console.error('Failed to parse schedule JSON', e);
            }
        }
        
        // Initialize UI components
        populateDateDropdown();
        renderQuickDateChips();
        renderActiveDateSlots();
        
    } catch (err) {
        console.error("Error loading dashboard", err);
    }

    // Save schedule handler
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<span>⏳</span> Saving...';
            saveBtn.disabled = true;
            
            const payload = {
                status: masterToggle && masterToggle.checked ? 'Available' : 'Offline',
                schedule_json: JSON.stringify(scheduleData)
            };
            
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
                    saveBtn.innerHTML = '<span>✓</span> Saved!';
                    showToast('Schedule & availability saved successfully!');
                    setTimeout(() => {
                        saveBtn.innerHTML = originalText;
                        saveBtn.disabled = false;
                    }, 2000);
                } else {
                    alert('Failed to save schedule');
                    saveBtn.innerHTML = originalText;
                    saveBtn.disabled = false;
                }
            } catch (err) {
                console.error(err);
                alert('Network error while saving schedule.');
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
            }
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
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('instructor_token');
            window.location.href = '/instructor-login.html';
        });
    }
});
