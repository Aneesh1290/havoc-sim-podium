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
    
    // Initialize UI
    daysOfWeek.forEach(day => {
        scheduleData[day] = [];
        
        const dayBlock = document.createElement('div');
        dayBlock.className = 'day-block';
        
        const dayTitle = document.createElement('h3');
        dayTitle.textContent = day;
        dayBlock.appendChild(dayTitle);
        
        const slotGrid = document.createElement('div');
        slotGrid.className = 'slot-grid';
        
        timeSlots.forEach(slot => {
            const btn = document.createElement('div');
            btn.className = 'slot-btn';
            btn.textContent = slot;
            btn.dataset.day = day;
            btn.dataset.slot = slot;
            
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                const idx = scheduleData[day].indexOf(slot);
                if (idx > -1) {
                    scheduleData[day].splice(idx, 1);
                } else {
                    scheduleData[day].push(slot);
                }
            });
            
            slotGrid.appendChild(btn);
        });
        
        dayBlock.appendChild(slotGrid);
        scheduleContainer.appendChild(dayBlock);
    });

    const statusToggle = document.getElementById('statusToggle');

    // Fetch initial data
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
        document.getElementById('instructorName').textContent = data.name || 'Instructor';
        
        if (data.status === 'Available') {
            statusToggle.checked = true;
        } else {
            statusToggle.checked = false;
        }
        
        if (data.schedule_json) {
            try {
                const parsed = JSON.parse(data.schedule_json);
                Object.keys(parsed).forEach(day => {
                    if (scheduleData[day] !== undefined) {
                        scheduleData[day] = parsed[day];
                    }
                });
            } catch (e) {
                console.error('Failed to parse schedule JSON');
            }
        }
        
        // Render active buttons
        document.querySelectorAll('.slot-btn').forEach(btn => {
            const d = btn.dataset.day;
            const s = btn.dataset.slot;
            if (scheduleData[d] && scheduleData[d].includes(s)) {
                btn.classList.add('active');
            }
        });
        
    } catch (err) {
        console.error("Error loading dashboard", err);
    }

    // Save changes
    document.getElementById('saveScheduleBtn').addEventListener('click', async () => {
        const btn = document.getElementById('saveScheduleBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Saving...';
        btn.disabled = true;
        
        const payload = {
            status: statusToggle.checked ? 'Available' : 'Offline',
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
                btn.textContent = 'Saved!';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }, 2000);
            } else {
                alert('Failed to save schedule');
                btn.textContent = originalText;
                btn.disabled = false;
            }
        } catch (err) {
            console.error(err);
            alert('Network error');
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('instructor_token');
        window.location.href = '/instructor-login.html';
    });
});
