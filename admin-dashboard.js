const token = localStorage.getItem('admin_token');
if (!token) window.location.href = 'admin-login.html';

const BACKEND_URL = 'http://localhost:3000';

// API Wrapper with Auth Header
async function fetchAuth(url, options = {}) {
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };
    const res = await fetch(`${BACKEND_URL}${url}`, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('admin_token');
        window.location.href = 'admin-login.html';
    }
    return res;
}

// ---- Setup 2FA Flow ----
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('setup') === 'true') {
    const modal = document.getElementById('totpModal');
    const qrImg = document.getElementById('qrCodeImg');
    const btnVerify = document.getElementById('btnVerifyTotp');
    const inputCode = document.getElementById('totpVerifyCode');
    const errorMsg = document.getElementById('totpError');
    let currentSecret = '';

    modal.style.display = 'flex';

    fetchAuth('/api/admin/setup-2fa').then(r => r.json()).then(data => {
        if (data.error) {
            alert(data.error);
            modal.style.display = 'none';
        } else {
            qrImg.src = data.qrCodeUrl;
            currentSecret = data.secret;
        }
    });

    btnVerify.addEventListener('click', async () => {
        const code = inputCode.value.trim();
        if (!code) return;

        const res = await fetchAuth('/api/admin/confirm-2fa', {
            method: 'POST',
            body: JSON.stringify({ token: code, secret: currentSecret })
        });
        const data = await res.json();
        
        if (data.success) {
            alert('2FA Setup Successful! Please login again with your new code.');
            localStorage.removeItem('admin_token');
            window.location.href = 'admin-login.html';
        } else {
            errorMsg.textContent = data.error || 'Verification failed';
            errorMsg.style.display = 'block';
        }
    });
}



// ---- Tabs ----
const tabs = document.querySelectorAll('.nav-btn[data-target]');
const contents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(tab.getAttribute('data-target')).classList.add('active');
    });
});

// ---- Logout ----
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('admin_token');
    window.location.href = 'admin-login.html';
});

// ---- Fetch Data ----
async function loadBookings() {
    const tbody = document.getElementById('bookingsTableBody');
    const res = await fetchAuth('/api/admin/bookings');
    const bookings = await res.json();
    
    // Update stat cards
    const paid = bookings.filter(b => b.status?.toLowerCase() === 'paid').length;
    const pending = bookings.filter(b => b.status?.toLowerCase() === 'pending').length;
    const statTotal = document.getElementById('statTotal');
    const statPaid = document.getElementById('statPaid');
    const statPending = document.getElementById('statPending');
    if (statTotal) statTotal.textContent = bookings.length;
    if (statPaid) statPaid.textContent = paid;
    if (statPending) statPending.textContent = pending;

    tbody.innerHTML = '';
    if (!bookings.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding:3rem; text-align:center; color:rgba(255,255,255,0.35);">No bookings yet</td></tr>';
        return;
    }
    bookings.forEach(b => {
        let statusClass = 'badge-pending';
        if (b.status?.toUpperCase() === 'PAID') statusClass = 'badge-paid';
        if (b.status?.toUpperCase() === 'ATTENDED') statusClass = 'badge-attended';
        if (b.status?.toUpperCase() === 'CANCELLED') statusClass = 'badge-cancelled';
        if (b.status?.toUpperCase() === 'CASH') statusClass = 'badge-cash';
        
        const tr = document.createElement('tr');
        tr.setAttribute('data-order-id', b.order_id);
        tr.innerHTML = `
            <td style="font-family:monospace; color:rgba(255,255,255,0.6); font-size:0.8rem;">#${b.order_id}</td>
            <td>
                <div style="font-weight:600">${b.name}</div>
                <small>${b.email} &nbsp;|&nbsp; ${b.phone}</small>
            </td>
            <td>
                <div>${b.booking_date}</div>
                <small style="color:#e5b869">${b.booking_time}</small>
            </td>
            <td style="font-weight:600">₹${b.price}</td>
            <td>
                <span class="badge ${statusClass}">${b.status}</span>
            </td>
            <td>
                <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                    <div class="custom-dropdown" id="dropdown-${b.order_id}">
                        <button class="custom-dropdown-btn" onclick="toggleStatusDropdown('${b.order_id}', event)">
                            Set Status <span style="font-size:0.65rem; margin-left:4px;">▼</span>
                        </button>
                        <div class="custom-dropdown-menu" id="menu-${b.order_id}">
                            <div class="custom-dropdown-item" onclick="updateBookingStatus('${b.order_id}', 'PENDING')">🟡 Pending</div>
                            <div class="custom-dropdown-item" onclick="updateBookingStatus('${b.order_id}', 'PAID')">🟢 Paid (Online)</div>
                            <div class="custom-dropdown-item" onclick="updateBookingStatus('${b.order_id}', 'CASH')">🟣 Paid (Cash)</div>
                            <div class="custom-dropdown-item" onclick="updateBookingStatus('${b.order_id}', 'ATTENDED')">🔵 Attended</div>
                            <div class="custom-dropdown-item" onclick="updateBookingStatus('${b.order_id}', 'CANCELLED')">🔴 Cancelled</div>
                        </div>
                    </div>
                    <button class="btn btn-delete" onclick="deleteBookingRow('${b.order_id}')">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function deleteBookingRow(orderId) {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    try {
        const res = await fetchAuth(`/api/admin/bookings/${orderId}`, { method: 'DELETE' });
        if (res.ok) {
            loadBookings();
        } else {
            alert('Failed to delete booking');
        }
    } catch (err) {
        console.error(err);
        alert('Server error');
    }
}

async function markAttended(orderId) {
    if (!confirm('Mark this customer as attended?')) return;
    try {
        const res = await fetchAuth(`/api/admin/bookings/${orderId}/attend`, { method: 'PUT' });
        if (res.ok) {
            loadBookings();
        } else {
            alert('Failed to update status');
        }
    } catch (err) {
        console.error(err);
        alert('Server error');
    }
}

window.toggleStatusDropdown = (orderId, event) => {
    event.stopPropagation();
    // Close all other open dropdowns first
    document.querySelectorAll('.custom-dropdown-menu.open').forEach(menu => {
        if (menu.id !== `menu-${orderId}`) menu.classList.remove('open');
    });
    const menu = document.getElementById(`menu-${orderId}`);
    if (menu) menu.classList.toggle('open');
};

// Close dropdowns when clicking outside
document.addEventListener('click', () => {
    document.querySelectorAll('.custom-dropdown-menu.open').forEach(m => m.classList.remove('open'));
});

window.updateBookingStatus = async (orderId, newStatus) => {
    if (!newStatus) return;
    // Close dropdown immediately
    const menu = document.getElementById(`menu-${orderId}`);
    if (menu) menu.classList.remove('open');
    
    const res = await fetchAuth(`/api/admin/bookings/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
        loadBookings();
    } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status');
    }
};

// ==========================================
// AVAILABILITY SCHEDULE LOGIC
// ==========================================
const availDateSelect = document.getElementById('availDateSelect');
const availTableBody = document.getElementById('availTableBody');

const TIME_SLOTS = [
    "11AM-11:30AM","11:30AM-12PM","12PM-12:30PM","12:30PM-1PM",
    "2PM-2:30PM","2:30PM-3PM","3PM-3:30PM","3:30PM-4PM",
    "4PM-4:30PM","4:30PM-5PM","5PM-5:30PM","5:30PM-6PM",
    "6PM-6:30PM","6:30PM-7PM","7PM-7:30PM","7:30PM-8PM",
    "8PM-8:30PM","8:30PM-9PM","9PM-9:30PM","9:30PM-10PM"
];

const SIMULATORS = [
    "RC Flying Sim", "Flight Sim Pro", "Race Sim GT", 
    "Race Sim F1", "Race Sim Jr.", "Race Sim Beginner"
];

let currentSimFilter = 'All';

function renderSimFilters() {
    const container = document.getElementById('simFilters');
    if (!container) return;
    container.innerHTML = '';
    
    const filters = ['All', ...SIMULATORS];
    filters.forEach(sim => {
        const btn = document.createElement('button');
        btn.textContent = sim;
        
        // Base styling for the tabs
        btn.style.padding = '0.6rem 1.2rem';
        btn.style.borderRadius = '8px';
        btn.style.border = '1px solid transparent';
        btn.style.background = 'transparent';
        btn.style.color = '#fff';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '0.9rem';
        btn.style.fontWeight = '600';
        btn.style.fontFamily = 'Outfit, sans-serif';
        btn.style.transition = 'all 0.2s ease';
        
        // Active state styling
        if (sim === currentSimFilter) {
            btn.style.background = 'rgba(229, 184, 105, 0.1)';
            btn.style.border = '1px solid var(--gold)';
            btn.style.color = 'var(--gold)';
        }
        
        btn.addEventListener('click', () => {
            currentSimFilter = sim;
            renderSimFilters(); // re-render to update active state
            loadAvailability(); // re-render table
        });
        
        container.appendChild(btn);
    });
}

function initAvailabilityDates() {
    const today = new Date();
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    
    for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const label = `${monthNames[d.getMonth()]} ${d.getDate()}`;
        const option = document.createElement('option');
        option.value = label;
        option.textContent = i === 0 ? `Today (${label})` : label;
        availDateSelect.appendChild(option);
    }

    availDateSelect.addEventListener('change', loadAvailability);
}

async function loadAvailability() {
    const selectedDate = availDateSelect.value;
    try {
        const res = await fetchAuth(`/api/admin/bookings/date/${selectedDate}`);
        const bookings = await res.json();
        
        const availGridContainer = document.getElementById('availGridContainer');
        if (!availGridContainer) return;
        availGridContainer.innerHTML = '';
        
        const activeSims = currentSimFilter === 'All' ? SIMULATORS : [currentSimFilter];
        
        TIME_SLOTS.forEach(slot => {
            // If "All Simulators" is selected, we group by time slot
            if (currentSimFilter === 'All') {
                const header = document.createElement('div');
                header.className = 'time-group-header';
                header.textContent = slot;
                availGridContainer.appendChild(header);
            }
            
            activeSims.forEach(sim => {
                const booking = bookings.find(b => b.item_name.includes(sim) && b.booking_time === slot);
                
                const card = document.createElement('div');
                card.className = 'avail-card';
                
                // Status variables
                const isBooked = !!booking;
                const statusClass = isBooked ? 'booked' : 'available';
                const statusLabel = isBooked ? 'Booked' : 'Available';
                const progressWidth = '100%'; // Full width either way, color shows status
                const customerName = isBooked ? booking.name.split(' ')[0] : 'Ready for Walk-ins';
                const badgeClass = isBooked ? 'badge-red' : 'badge-green';
                const badgeText = isBooked ? 'Unavailable' : 'Available';
                
                if (!isBooked) {
                    card.classList.add('is-available');
                    card.onclick = () => openWalkinModal(sim, slot, selectedDate);
                }
                
                card.innerHTML = `
                    <div class="card-header">
                        <div class="card-title">${sim}</div>
                        ${currentSimFilter !== 'All' ? `<div class="card-subtitle">Slot: ${slot}</div>` : ''}
                    </div>
                    
                    <div>
                        <div class="card-status-label">${statusLabel}</div>
                        <div class="status-bar-container">
                            <div class="status-bar-fill ${statusClass}" style="width: ${progressWidth};"></div>
                        </div>
                    </div>
                    
                    <div class="card-footer">
                        <span style="font-size: 0.8rem; color: var(--muted);">${customerName}</span>
                        <span class="card-badge ${badgeClass}">${badgeText}</span>
                    </div>
                `;
                
                availGridContainer.appendChild(card);
            });
        });
        
    } catch (err) {
        console.error(err);
        const availGridContainer = document.getElementById('availGridContainer');
        if (availGridContainer) {
            availGridContainer.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Failed to load schedule</div>';
        }
    }
}

// ==========================================
// WALK-IN MODAL LOGIC
// ==========================================
window.openWalkinModal = (sim, time, date) => {
    document.getElementById('walkinModal').style.display = 'flex';
    document.getElementById('walkinSim').value = sim;
    document.getElementById('walkinDateTime').value = `${date} | ${time}`;
    
    // Reset inputs
    document.getElementById('walkinName').value = '';
    document.getElementById('walkinPhone').value = '';
    document.getElementById('walkinEmail').value = '';
    
    // Set a default price based on sim
    let basePrice = 0;
    if (sim.includes('RC Flying Sim')) basePrice = 300;
    else if (sim.includes('Flight Sim Pro')) basePrice = 1500;
    else if (sim.includes('Race Sim GT')) basePrice = 500;
    else if (sim.includes('Race Sim F1')) basePrice = 600;
    else if (sim.includes('Race Sim Jr.')) basePrice = 400;
    else if (sim.includes('Race Sim Beginner')) basePrice = 300;
    
    document.getElementById('walkinPrice').value = basePrice;
};

document.getElementById('walkinForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const sim = document.getElementById('walkinSim').value;
    const datetimeStr = document.getElementById('walkinDateTime').value.split(' | ');
    const date = datetimeStr[0];
    const time = datetimeStr[1];
    
    const body = {
        name: document.getElementById('walkinName').value.trim(),
        phone: document.getElementById('walkinPhone').value.trim(),
        email: document.getElementById('walkinEmail').value.trim(),
        item_name: sim,
        booking_date: date,
        booking_time: time,
        price: parseFloat(document.getElementById('walkinPrice').value) || 0,
        status: document.getElementById('walkinStatus').value
    };
    
    const res = await fetchAuth('/api/admin/bookings', {
        method: 'POST',
        body: JSON.stringify(body)
    });
    
    const data = await res.json();
    if (data.success) {
        document.getElementById('walkinModal').style.display = 'none';
        loadAvailability();
        loadBookings(); // refresh bookings table as well
    } else {
        alert(data.error || 'Failed to create booking');
    }
});

async function loadCoupons() {
    const tbody = document.getElementById('couponsTableBody');
    const res = await fetch(`${BACKEND_URL}/api/coupons`);
    const coupons = await res.json();
    
    tbody.innerHTML = '';
    if (!coupons.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="padding:3rem; text-align:center; color:rgba(255,255,255,0.35);">No coupons added yet</td></tr>';
        return;
    }
    coupons.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:700; letter-spacing:2px; font-family:monospace; color:#e5b869">${c.code}</td>
            <td style="text-transform:capitalize; color:rgba(255,255,255,0.7)">${c.type === 'percent' ? 'Percentage' : 'Flat Amount'}</td>
            <td style="font-weight:600">${c.type === 'percent' ? c.value + '%' : '₹' + c.value}</td>
            <td><button class="btn btn-delete" onclick="deleteCoupon('${c.code}')">Delete</button></td>
        `;
        tbody.appendChild(tr);
    });
}

// ---- Add/Delete Coupons ----
document.getElementById('addCouponForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('couponCode').value.trim().toUpperCase();
    const type = document.getElementById('couponType').value;
    const value = document.getElementById('couponValue').value;

    const res = await fetchAuth('/api/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({ code, type, value: parseFloat(value) })
    });

    const data = await res.json();
    if (data.success) {
        document.getElementById('addCouponForm').reset();
        loadCoupons();
    } else {
        alert(data.error || 'Failed to add coupon');
    }
});

window.deleteCoupon = async (code) => {
    if (!confirm(`Are you sure you want to delete coupon ${code}?`)) return;
    
    const res = await fetchAuth(`/api/admin/coupons/${code}`, {
        method: 'DELETE'
    });
    
    if (res.ok) {
        loadCoupons();
    }
};

// ==========================================
// STAFF MANAGEMENT LOGIC
// ==========================================
async function loadStaff() {
    const tbody = document.getElementById('staffTableBody');
    const res = await fetchAuth('/api/admin/users');
    const users = await res.json();

    tbody.innerHTML = '';
    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No staff accounts</td></tr>';
        return;
    }

    users.forEach(u => {
        const tr = document.createElement('tr');
        const isMainAdmin = u.username === 'admin';
        tr.innerHTML = `
            <td style="font-family:monospace; color:rgba(255,255,255,0.6);">${u.id}</td>
            <td style="font-weight:600">
                ${u.username} 
                ${isMainAdmin ? `
                    <span style="color:var(--gold);font-size:0.75rem;margin-left:0.5rem; text-transform:uppercase; font-weight:700;">(Primary)</span>
                ` : `
                    <select onchange="updateStaffRole(${u.id}, '${u.username}', this.value)" style="margin-left: 0.5rem; padding: 0.3rem 0.6rem; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 6px; color: #fff; font-size: 0.75rem; font-weight: 600; outline: none; cursor: pointer;">
                        <option value="staff" style="color: #000;" ${u.role === 'staff' ? 'selected' : ''}>Staff</option>
                        <option value="super_admin" style="color: #000;" ${u.role === 'super_admin' ? 'selected' : ''}>Super Admin</option>
                    </select>
                `}
            </td>
            <td>
                ${!isMainAdmin ? `
                    <button class="btn btn-gold" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; margin-right: 0.5rem;" onclick="resetStaffPassword(${u.id}, '${u.username}')">Reset</button>
                    <button class="btn btn-delete" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="deleteStaff(${u.id}, '${u.username}')">Delete</button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

document.getElementById('addStaffForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('staffUsername').value.trim();
    const role = document.getElementById('staffRole').value;
    const password = "sabharwal@65"; // Default password for new accounts

    const res = await fetchAuth('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ username, password, role })
    });

    const data = await res.json();
    if (data.success) {
        document.getElementById('addStaffForm').reset();
        loadStaff();
    } else {
        alert(data.error || 'Failed to add user');
    }
});

window.deleteStaff = async (id, username) => {
    if (!confirm(`Are you sure you want to delete staff account '${username}'?`)) return;
    
    const res = await fetchAuth(`/api/admin/users/${id}`, {
        method: 'DELETE'
    });
    
    const data = await res.json();
    if (res.ok) {
        loadStaff();
    } else {
        alert(data.error || 'Failed to delete user');
    }
};

window.updateStaffRole = async (id, username, newRole) => {
    const res = await fetchAuth(`/api/admin/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
    });
    
    const data = await res.json();
    if (res.ok) {
        // Success
        console.log(`Role for ${username} updated to ${newRole}`);
    } else {
        alert(data.error || 'Failed to update role');
        loadStaff(); // Reset UI
    }
};

window.resetStaffPassword = async (id, username) => {
    if (!confirm(`Reset password for '${username}' to the default (sabharwal@65)?\nThey will be forced to change it on their next login.`)) return;
    
    const res = await fetchAuth(`/api/admin/users/${id}/reset-password`, {
        method: 'POST'
    });
    
    const data = await res.json();
    if (res.ok) {
        alert(`Password for '${username}' has been reset successfully.`);
    } else {
        alert(data.error || 'Failed to reset password');
    }
};

// ==========================================
// ROLE BASED ACCESS
// ==========================================
async function checkRole() {
    try {
        const res = await fetchAuth('/api/admin/me');
        const user = await res.json();
        
        const isSuperAdmin = user.username === 'admin' || user.role === 'super_admin';
        
        if (!isSuperAdmin) {
            // Hide the Coupons and Staff tabs for non-admin staff
            const navCoupons = document.getElementById('nav-coupons');
            const navStaff = document.getElementById('nav-staff');
            if (navCoupons) navCoupons.style.display = 'none';
            if (navStaff) navStaff.style.display = 'none';
        } else {
            // Load these tabs for super admins
            loadCoupons();
            loadStaff();
        }
    } catch (e) {
        console.error('Failed to check role', e);
    }
}

// Init
initAvailabilityDates();
renderSimFilters();
loadBookings();
loadAvailability();
checkRole();

// ==========================================
// CHANGE MY PASSWORD LOGIC
// ==========================================
document.getElementById('cpCancelBtn').addEventListener('click', () => {
    document.getElementById('changePwModal').style.display = 'none';
    document.getElementById('cpCurrentPw').value = '';
    document.getElementById('cpNewPw').value = '';
    document.getElementById('cpConfirmPw').value = '';
    document.getElementById('cpError').style.display = 'none';
    document.getElementById('cpSuccess').style.display = 'none';
});

document.getElementById('cpSubmitBtn').addEventListener('click', async () => {
    const currentPw  = document.getElementById('cpCurrentPw').value.trim();
    const newPw      = document.getElementById('cpNewPw').value.trim();
    const confirmPw  = document.getElementById('cpConfirmPw').value.trim();
    const errorEl    = document.getElementById('cpError');
    const successEl  = document.getElementById('cpSuccess');

    errorEl.style.display = 'none';
    successEl.style.display = 'none';

    if (!currentPw || !newPw || !confirmPw) {
        errorEl.textContent = 'Please fill in all fields.';
        errorEl.style.display = 'block';
        return;
    }
    if (newPw.length < 6) {
        errorEl.textContent = 'New password must be at least 6 characters.';
        errorEl.style.display = 'block';
        return;
    }
    if (newPw !== confirmPw) {
        errorEl.textContent = 'New passwords do not match.';
        errorEl.style.display = 'block';
        return;
    }

    const btn = document.getElementById('cpSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Updating...';

    const res = await fetchAuth('/api/admin/change-my-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw })
    });
    const data = await res.json();

    btn.disabled = false;
    btn.textContent = 'Update Password';

    if (res.ok) {
        successEl.style.display = 'block';
        document.getElementById('cpCurrentPw').value = '';
        document.getElementById('cpNewPw').value = '';
        document.getElementById('cpConfirmPw').value = '';
        setTimeout(() => {
            document.getElementById('changePwModal').style.display = 'none';
            successEl.style.display = 'none';
        }, 2000);
    } else {
        errorEl.textContent = data.error || 'Failed to update password.';
        errorEl.style.display = 'block';
    }
});
