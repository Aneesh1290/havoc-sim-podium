document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('instructor_token');
    if (!token) {
        window.location.href = '/instructor-login.html';
        return;
    }

    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const timeSlots = [];
    for (let h = 11; h <= 23; h++) {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour = h > 12 ? h - 12 : h;
        timeSlots.push(`${hour}:00 ${ampm}`);
        if (h !== 23) {
            timeSlots.push(`${hour}:30 ${ampm}`);
        }
    }

    const scheduleContainer = document.getElementById('scheduleContainer');
    const scheduleData = {};
    
    // Tab switching
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabs = document.querySelectorAll('.tab-content');
    const headerHighlight = document.getElementById('headerHighlight');
    const headerSubtitle = document.getElementById('headerSubtitle');
    const saveBtn = document.getElementById('saveScheduleBtn');

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
                headerSubtitle.textContent = 'Manage your weekly teaching availability and time slots.';
                saveBtn.style.display = 'inline-flex';
            } else if (target === 'tab-availability') {
                headerHighlight.textContent = 'Availability';
                headerSubtitle.textContent = 'Set your live online or offline booking status.';
                saveBtn.style.display = 'inline-flex';
            } else if (target === 'tab-profile') {
                headerHighlight.textContent = 'Profile';
                headerSubtitle.textContent = 'Review your instructor details, fee, and simulator assignment.';
                saveBtn.style.display = 'none';
            }
        });
    });

    // Helper to update day slot count label
    function updateDayCount(day) {
        const countEl = document.getElementById(`count-${day}`);
        if (countEl) {
            const count = (scheduleData[day] || []).length;
            countEl.textContent = `${count} slot${count === 1 ? '' : 's'} active`;
        }
    }

    // Build Weekly Schedule UI
    daysOfWeek.forEach(day => {
        scheduleData[day] = [];
        
        const dayCard = document.createElement('div');
        dayCard.className = 'day-card';
        
        // Day Header
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        
        const titleWrap = document.createElement('div');
        titleWrap.className = 'day-title-wrap';
        titleWrap.innerHTML = `
            <div class="day-dot"></div>
            <span class="day-name">${day}</span>
            <span class="day-count" id="count-${day}">0 slots active</span>
        `;
        
        const actionsWrap = document.createElement('div');
        actionsWrap.className = 'day-actions';
        
        const selectAllBtn = document.createElement('button');
        selectAllBtn.type = 'button';
        selectAllBtn.className = 'action-link';
        selectAllBtn.textContent = 'Select All';
        selectAllBtn.addEventListener('click', () => {
            scheduleData[day] = [...timeSlots];
            dayCard.querySelectorAll('.slot-pill').forEach(pill => pill.classList.add('active'));
            updateDayCount(day);
        });

        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'action-link';
        clearBtn.textContent = 'Clear';
        clearBtn.addEventListener('click', () => {
            scheduleData[day] = [];
            dayCard.querySelectorAll('.slot-pill').forEach(pill => pill.classList.remove('active'));
            updateDayCount(day);
        });

        actionsWrap.appendChild(selectAllBtn);
        actionsWrap.appendChild(clearBtn);
        dayHeader.appendChild(titleWrap);
        dayHeader.appendChild(actionsWrap);
        dayCard.appendChild(dayHeader);
        
        // Slots Grid
        const slotsGrid = document.createElement('div');
        slotsGrid.className = 'slots-grid';
        
        timeSlots.forEach(slot => {
            const pill = document.createElement('div');
            pill.className = 'slot-pill';
            pill.textContent = slot;
            pill.dataset.day = day;
            pill.dataset.slot = slot;
            
            pill.addEventListener('click', () => {
                pill.classList.toggle('active');
                const idx = scheduleData[day].indexOf(slot);
                if (idx > -1) {
                    scheduleData[day].splice(idx, 1);
                } else {
                    scheduleData[day].push(slot);
                }
                updateDayCount(day);
            });
            
            slotsGrid.appendChild(pill);
        });
        
        dayCard.appendChild(slotsGrid);
        scheduleContainer.appendChild(dayCard);
    });

    // Synchronize Master Toggle in Banner and in Availability Tab
    const masterToggle = document.getElementById('masterStatusToggle');
    const bannerBadge = document.getElementById('bannerStatusBadge');
    const availToggle = document.getElementById('availTabToggle');
    const availBadge2 = document.getElementById('availStatusBadge2');
    const availTabText = document.getElementById('availTabText');

    function syncStatus(isAvailable) {
        masterToggle.checked = isAvailable;
        availToggle.checked = isAvailable;
        
        if (isAvailable) {
            bannerBadge.textContent = 'Available';
            bannerBadge.className = 'status-badge online';
            availBadge2.textContent = 'Available';
            availBadge2.className = 'status-badge online';
            availTabText.textContent = 'Currently Available for Bookings';
        } else {
            bannerBadge.textContent = 'Offline';
            bannerBadge.className = 'status-badge offline';
            availBadge2.textContent = 'Offline';
            availBadge2.className = 'status-badge offline';
            availTabText.textContent = 'Currently Offline';
        }
    }

    masterToggle.addEventListener('change', (e) => syncStatus(e.target.checked));
    availToggle.addEventListener('change', (e) => syncStatus(e.target.checked));

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
        document.getElementById('sidebarInstructorName').textContent = data.name || 'Instructor';
        document.getElementById('sidebarInstructorUsername').textContent = data.username ? `@${data.username}` : (data.email || '');
        if (data.photo_url) {
            document.getElementById('sidebarAvatar').src = data.photo_url;
            document.getElementById('profilePhotoLarge').src = data.photo_url;
        }
        
        // Profile tab
        document.getElementById('profileNameLarge').textContent = data.name || 'Instructor';
        document.getElementById('profileUserLarge').textContent = data.username ? `@${data.username}` : '';
        document.getElementById('profileRoleBadge').textContent = data.role || 'Simulator Instructor';
        document.getElementById('profileEmail').textContent = data.email || '-';
        document.getElementById('profilePhone').textContent = data.phone || '-';
        document.getElementById('profileRole').textContent = data.role || '-';
        document.getElementById('profileSimType').textContent = data.simulator_type || 'All';
        document.getElementById('profileFee').textContent = `₹${data.fee != null ? data.fee : 500}`;
        document.getElementById('profileAchievement').textContent = data.key_achievement || '-';
        document.getElementById('profileBio').textContent = data.biography || 'No biography added yet.';

        // Status
        const isAvailable = data.status === 'Available';
        syncStatus(isAvailable);
        
        // Schedule slots
        if (data.schedule_json) {
            try {
                const parsed = JSON.parse(data.schedule_json);
                Object.keys(parsed).forEach(day => {
                    if (scheduleData[day] !== undefined && Array.isArray(parsed[day])) {
                        scheduleData[day] = parsed[day];
                    }
                });
            } catch (e) {
                console.error('Failed to parse schedule JSON');
            }
        }
        
        // Mark active pills in UI
        document.querySelectorAll('.slot-pill').forEach(pill => {
            const d = pill.dataset.day;
            const s = pill.dataset.slot;
            if (scheduleData[d] && scheduleData[d].includes(s)) {
                pill.classList.add('active');
            }
        });

        // Update day counts
        daysOfWeek.forEach(d => updateDayCount(d));
        
    } catch (err) {
        console.error("Error loading dashboard", err);
    }

    // Save schedule
    saveBtn.addEventListener('click', async () => {
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span>⏳</span> Saving...';
        saveBtn.disabled = true;
        
        const payload = {
            status: masterToggle.checked ? 'Available' : 'Offline',
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

    document.getElementById('changePwForm').addEventListener('submit', async (e) => {
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

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('instructor_token');
        window.location.href = '/instructor-login.html';
    });
});
