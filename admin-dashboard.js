const token = localStorage.getItem('admin_token');
if (!token) window.location.href = "/admin-login";

const BACKEND_URL = '';

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
        window.location.href = "/admin-login";
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
            window.location.href = "/admin-login";
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
    window.location.href = "/admin-login";
});

// ---- Fetch Data ----
window.allBookings = []; // cache for frontend filtering
window.selectedBookings = new Set(); // store selected order IDs for bulk actions

async function loadBookings() {
    const res = await fetchAuth('/api/admin/bookings');
    window.allBookings = await res.json();
    renderBookings(window.allBookings);
}

function renderBookings(bookingsToRender) {
    const tbody = document.getElementById('bookingsTableBody');
    
    // Clear selections when re-rendering
    window.selectedBookings.clear();
    updateBulkActionsUI();
    const selectAllCheckbox = document.getElementById('selectAllBookings');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    
    // Update stat cards (stats always based on all bookings, or filtered? Wix usually shows stats for all or filtered depending on context. Let's base stats on filtered for better UX)
    const paid = bookingsToRender.filter(b => b.status?.toLowerCase() === 'paid').length;
    const pending = bookingsToRender.filter(b => b.status?.toLowerCase() === 'pending').length;
    const statTotal = document.getElementById('statTotal');
    const statPaid = document.getElementById('statPaid');
    const statPending = document.getElementById('statPending');
    if (statTotal) statTotal.textContent = bookingsToRender.length;
    if (statPaid) statPaid.textContent = paid;
    if (statPending) statPending.textContent = pending;

    tbody.innerHTML = '';
    if (!bookingsToRender.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding:3rem; text-align:center; color:rgba(255,255,255,0.35);">No bookings found</td></tr>';
        return;
    }
    bookingsToRender.forEach(b => {
        const isPending = (b.status || 'PENDING').toUpperCase() === 'PENDING';
        const isCancelled = (b.status || '').toUpperCase() === 'CANCELLED';
        const isAttended = (b.status || '').toUpperCase() === 'ATTENDED';
        
        let paymentBadge = isPending ? 'UNPAID' : (isCancelled ? 'REFUNDED' : 'PAID');
        let fulfillBadge = isAttended ? 'FULFILLED' : (isCancelled ? 'CANCELED' : 'UNFULFILLED');
        
        // Pick CSS classes for the badges based on the text
        const getBadgeClass = (text) => {
            if (text === 'PAID') return 'badge-paid';
            if (text === 'UNPAID' || text === 'PENDING') return 'badge-pending';
            if (text === 'CASH') return 'badge-cash';
            if (text === 'FULFILLED' || text === 'ATTENDED') return 'badge-attended';
            if (text === 'UNFULFILLED') return 'badge-pending';
            if (text === 'CANCELED' || text === 'REFUNDED' || text === 'CANCELLED') return 'badge-cancelled';
            return 'badge-pending';
        };

        // Date Formatting
        let dateFormatted = b.booking_date;
        let timeFormatted = b.booking_time;
        try {
            const d = new Date(`${b.booking_date}T${b.booking_time}`);
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const month = monthNames[d.getMonth()];
            const day = d.getDate();
            const weekday = dayNames[d.getDay()];
            dateFormatted = `${month} ${day} (${weekday})`;

            const formatTimeStr = (dateObj) => {
                let h = dateObj.getHours();
                let m = dateObj.getMinutes();
                let ampm = h >= 12 ? 'PM' : 'AM';
                h = h % 12; h = h ? h : 12;
                return m === 0 ? `${h}${ampm}` : `${h}:${m.toString().padStart(2, '0')}${ampm}`;
            };
            const startTime = formatTimeStr(d);
            d.setMinutes(d.getMinutes() + 30);
            const endTime = formatTimeStr(d);
            timeFormatted = `${startTime}-${endTime}`;
        } catch(e) {}

        const tr = document.createElement('tr');
        tr.setAttribute('data-order-id', b.order_id);
        tr.style.cursor = 'pointer';
        tr.onclick = (e) => {
            // Prevent opening details if clicking on actions dropdown or delete or checkbox
            if(e.target.closest('.custom-dropdown') || e.target.closest('.btn-delete') || e.target.type === 'checkbox') return;
            openOrderDetails(b.order_id);
        };
        tr.innerHTML = `
            <td>
                <input type="checkbox" class="row-checkbox" value="${b.order_id}" onclick="toggleBookingSelection(event, '${b.order_id}')">
            </td>
            <td style="font-family:monospace; color:rgba(255,255,255,0.6); font-size:0.8rem;">#${b.order_id}</td>
            <td>
                <div style="font-weight:600">${b.name}</div>
                <small>${b.email} &nbsp;|&nbsp; ${b.phone}</small>
                <div style="font-size: 0.75rem; color: var(--gold); margin-top: 4px; font-weight: 600;">${b.item_name || 'Simulator'}</div>
            </td>
            <td>
                <div style="font-weight:600; color:#fff;">${dateFormatted}</div>
                <small style="color:#e5b869">${timeFormatted}</small>
            </td>
            <td style="font-weight:600">₹${b.price}</td>
            <td>
                <span class="badge ${getBadgeClass(paymentBadge)}">${paymentBadge}</span>
                <span class="badge ${getBadgeClass(fulfillBadge)}" style="margin-left:4px;">${fulfillBadge}</span>
            </td>
            <td>
                <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                    <button class="btn btn-delete" onclick="deleteBookingRow('${b.order_id}')">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.deleteBookingRow = async function(orderId) {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    try {
        const res = await fetchAuth(`/api/admin/bookings/${encodeURIComponent(orderId)}`, { method: 'DELETE' });
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

window.markAttended = async function(orderId) {
    if (!confirm('Mark this customer as attended?')) return;
    try {
        const res = await fetchAuth(`/api/admin/bookings/${encodeURIComponent(orderId)}/attend`, { method: 'PUT' });
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
    
    const res = await fetchAuth(`/api/admin/bookings/${encodeURIComponent(orderId)}/status`, {
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

window.closeOrderDetails = () => {
    document.getElementById('order-details-view').classList.remove('active');
    document.getElementById('tab-bookings').style.display = 'block';
};

window.openOrderDetails = (orderId) => {
    const order = window.allBookings.find(b => b.order_id === orderId);
    if(!order) return;

    const view = document.getElementById('order-details-view');
    const tab = document.getElementById('tab-bookings');
    
    // Hide table, show details
    tab.style.display = 'none';
    
    const isPending = (order.status || 'PENDING').toUpperCase() === 'PENDING';
    const isCancelled = (order.status || '').toUpperCase() === 'CANCELLED';
    const isAttended = (order.status || '').toUpperCase() === 'ATTENDED';
    
    let paymentBadge = isPending ? 'UNPAID' : (isCancelled ? 'REFUNDED' : 'PAID');
    let fulfillBadge = isAttended ? 'FULFILLED' : (isCancelled ? 'CANCELED' : 'UNFULFILLED');

    const getBadgeClass = (text) => {
        if (text === 'PAID') return 'badge-paid';
        if (text === 'UNPAID') return 'badge-pending';
        if (text === 'FULFILLED') return 'badge-attended';
        if (text === 'UNFULFILLED') return 'badge-pending';
        if (text === 'CANCELED' || text === 'REFUNDED') return 'badge-cancelled';
        return 'badge-pending';
    };

    const priceFormatted = (order.price || 0).toFixed(2);
    
    // Fallback date
    let placedDateObj = new Date();
    if(order.created_at) placedDateObj = new Date(order.created_at);
    else if(order.booking_date) placedDateObj = new Date(order.booking_date);
    
    const placedDateStr = placedDateObj.toLocaleString('en-US', {month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit'});
    const placedDateOnlyStr = placedDateObj.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
    const placedTimeOnlyStr = placedDateObj.toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit'});

    view.innerHTML = `
<div class="od-breadcrumb" onclick="closeOrderDetails()">Orders &gt; <span>Order #${order.order_id}</span></div>
<div class="od-header">
    <div class="od-title-area">
        <h2>Order #${order.order_id}</h2>
        <span class="od-badge ${getBadgeClass(paymentBadge)}">${paymentBadge}</span>
        <span class="od-badge ${getBadgeClass(fulfillBadge)}">${fulfillBadge}</span>
        <div class="od-date">Placed on ${placedDateStr}</div>
    </div>
    <div class="od-actions">
        <div class="custom-dropdown">
            <button class="btn-secondary" onclick="togglePaymentDropdown('${order.order_id}', 'more', event)">More Actions ˅</button>
            <div class="custom-dropdown-menu" id="pay-menu-more-${order.order_id}" style="right:0; left:auto; min-width: 240px; background: #1c1c21;">
                <div class="custom-dropdown-item" onclick="markOrderAsFulfilled('${order.order_id}')">✓ Mark as fulfilled</div>
                <div class="custom-dropdown-item" onclick="markOrderAsUnfulfilled('${order.order_id}')">✗ Mark as unfulfilled</div>
                <div class="custom-dropdown-item" onclick="cancelOrder('${order.order_id}')">✗ Cancel order</div>
            </div>
        </div>
        <div class="custom-dropdown">
            <button class="btn-blue" onclick="togglePaymentDropdown('${order.order_id}', 'header', event)">Collect Payment ˅</button>
            <div class="custom-dropdown-menu" id="pay-menu-header-${order.order_id}" style="right:0; left:auto; min-width: 200px;">
                <div class="custom-dropdown-item" onclick="markOrderAsPaid('${order.order_id}')">✓ Mark as paid</div>
                <div class="custom-dropdown-item" onclick="markOrderAsUnpaid('${order.order_id}')">✗ Mark as unpaid</div>
            </div>
        </div>
    </div>
</div>

<div class="od-grid">
    <!-- LEFT COL -->
    <div>
        <div class="od-card">
            <div class="od-card-title">Items (1)</div>
            <div class="od-item-row">
                <div style="display: flex; gap: 1rem;">
                    <div style="width: 50px; height: 50px; background: rgba(255,255,255,0.1); border-radius: 8px; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.3); font-size: 0.7rem;">IMG</div>
                    <div>
                        <div style="font-weight: 600; display:flex; align-items:center; gap:0.5rem; flex-wrap: wrap;">
                            ${order.item_name || 'Simulator'}
                            <span class="od-badge ${getBadgeClass(paymentBadge)}" style="font-size: 0.6rem; padding: 0.1rem 0.4rem; margin-left: 0;">${paymentBadge}</span>
                            <span class="od-badge ${getBadgeClass(fulfillBadge)}" style="font-size: 0.6rem; padding: 0.1rem 0.4rem; margin-left: 0;">${fulfillBadge}</span>
                        </div>
                        <div style="font-size: 0.8rem; color: var(--muted); margin-top: 0.3rem;">Select Date: ${order.booking_date}</div>
                        <div style="font-size: 0.8rem; color: var(--muted);">Select Time Slot: ${order.booking_time}</div>
                    </div>
                </div>
                <div style="display: flex; gap: 2rem; align-items: center;">
                    <span style="color: var(--muted);">₹${priceFormatted}</span>
                    <span style="color: var(--muted);">X 1</span>
                    <span style="font-weight: 600;">₹${priceFormatted}</span>
                </div>
            </div>
        </div>

        <div class="od-card">
            <div class="od-card-title">
                <div>Payment info <span class="od-badge ${getBadgeClass(paymentBadge)}" style="font-size: 0.65rem; margin-left: 0.5rem;">${paymentBadge}</span></div>
            </div>
            <div class="od-summary-row"><span>Items</span><span>₹${priceFormatted}</span></div>
            <div class="od-summary-row"><span>Shipping</span><span>₹0.00</span></div>
            <div class="od-summary-row"><span>Tax</span><span>₹0.00</span></div>
            <div class="od-summary-row total"><span>Total</span><span>₹${priceFormatted}</span></div>
            <div class="od-summary-row" style="margin-top: 1rem; margin-bottom: 0;"><span>Amount due</span><span style="font-weight: 700; color: #fff;">₹${isPending ? priceFormatted : '0.00'}</span></div>
        </div>
    </div>

    <!-- RIGHT COL -->
    <div>
        <div class="od-card">
            <div class="od-card-title">Order info <span style="color: #60a5fa; cursor: pointer;">✎</span></div>
            
            <div class="od-info-group">
                <div class="od-info-label">Contact info</div>
                <div class="od-info-value" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <div style="width: 24px; height: 24px; background: #60a5fa; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700;">${(order.name || '?').charAt(0).toUpperCase()}</div>
                    <span style="color: #60a5fa;">${order.name}</span>
                </div>
                <div class="od-info-value">${order.email}</div>
                <div class="od-info-value">${order.phone}</div>
            </div>

        </div>

        <div class="od-card">
            <div class="od-card-title">Tags</div>
            <button style="width: 100%; padding: 0.75rem; background: transparent; border: 1px dashed rgba(255,255,255,0.2); border-radius: 8px; color: #60a5fa; font-family: 'Outfit'; cursor: pointer; text-align: left;">+ Assign Tags</button>
        </div>
    </div>
</div>
    `;

    view.classList.add('active');
};

window.togglePaymentDropdown = (orderId, prefix, event) => {
    event.stopPropagation();
    // Close other dropdowns
    document.querySelectorAll('.custom-dropdown-menu.open').forEach(menu => {
        if (menu.id !== `pay-menu-${prefix}-${orderId}`) menu.classList.remove('open');
    });
    const menu = document.getElementById(`pay-menu-${prefix}-${orderId}`);
    if (menu) menu.classList.toggle('open');
};

window.markOrderAsPaid = async (orderId) => {
    // Close all open menus
    document.querySelectorAll('.custom-dropdown-menu.open').forEach(m => m.classList.remove('open'));
    
    const res = await fetchAuth(`/api/admin/bookings/${encodeURIComponent(orderId)}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'PAID' })
    });
    
    if (res.ok) {
        await loadBookings(); // Await to ensure table is fresh
        
        // If order details view is still active, refresh it
        const view = document.getElementById('order-details-view');
        if (view && view.classList.contains('active')) {
            openOrderDetails(orderId);
        }
    } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status');
    }
};

window.markOrderAsFulfilled = async (orderId) => {
    document.querySelectorAll('.custom-dropdown-menu.open').forEach(m => m.classList.remove('open'));
    const res = await fetchAuth(`/api/admin/bookings/${encodeURIComponent(orderId)}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'ATTENDED' })
    });
    if (res.ok) {
        await loadBookings();
        const view = document.getElementById('order-details-view');
        if (view && view.classList.contains('active')) openOrderDetails(orderId);
    } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status');
    }
};

window.markOrderAsUnpaid = async (orderId) => {
    document.querySelectorAll('.custom-dropdown-menu.open').forEach(m => m.classList.remove('open'));
    const res = await fetchAuth(`/api/admin/bookings/${encodeURIComponent(orderId)}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'PENDING' })
    });
    if (res.ok) {
        await loadBookings();
        const view = document.getElementById('order-details-view');
        if (view && view.classList.contains('active')) openOrderDetails(orderId);
    } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status');
    }
};

window.markOrderAsUnfulfilled = async (orderId) => {
    document.querySelectorAll('.custom-dropdown-menu.open').forEach(m => m.classList.remove('open'));
    const res = await fetchAuth(`/api/admin/bookings/${encodeURIComponent(orderId)}/status`, {
        method: 'PUT',
        // If they mark as unfulfilled, it means it is still paid, so revert to PAID
        body: JSON.stringify({ status: 'PAID' })
    });
    if (res.ok) {
        await loadBookings();
        const view = document.getElementById('order-details-view');
        if (view && view.classList.contains('active')) openOrderDetails(orderId);
    } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status');
    }
};

window.cancelOrder = async (orderId) => {
    if(!confirm('Are you sure you want to cancel this order?')) return;
    document.querySelectorAll('.custom-dropdown-menu.open').forEach(m => m.classList.remove('open'));
    const res = await fetchAuth(`/api/admin/bookings/${encodeURIComponent(orderId)}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'CANCELLED' })
    });
    if (res.ok) {
        await loadBookings();
        const view = document.getElementById('order-details-view');
        if (view && view.classList.contains('active')) openOrderDetails(orderId);
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
    "RC Flying Sim", "Flight Sim Pro (Airbus Edition)", "Flight Sim Pro (Boeing Edition)", "Race Sim GT", 
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
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    for (let i = 0; i < 90; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const label = `${monthNames[d.getMonth()]} ${d.getDate()} (${dayNames[d.getDay()]})`;
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
    else if (sim.includes('Flight Sim Pro (Airbus Edition)')) basePrice = 1500;
    else if (sim.includes('Flight Sim Pro (Boeing Edition)')) basePrice = 1500;
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
    
    const res = await fetchAuth(`/api/admin/coupons/${encodeURIComponent(code)}`, {
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
    
    const res = await fetchAuth(`/api/admin/users/${encodeURIComponent(id)}`, {
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
    const res = await fetchAuth(`/api/admin/users/${encodeURIComponent(id)}/role`, {
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
    
    const res = await fetchAuth(`/api/admin/users/${encodeURIComponent(id)}/reset-password`, {
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

// ---- Filter Sidebar Logic ----
document.addEventListener('DOMContentLoaded', () => {
    const filterBtn = document.getElementById('openFilterBtn');
    const filterOverlay = document.getElementById('filterOverlay');
    const filterSidebar = document.getElementById('filterSidebar');
    const closeFilterBtn = document.getElementById('closeFilterBtn');

    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            filterOverlay.classList.add('show');
            filterSidebar.classList.add('open');
        });
    }

    function closeFilter() {
        if(filterOverlay) filterOverlay.classList.remove('show');
        if(filterSidebar) filterSidebar.classList.remove('open');
    }

    if (closeFilterBtn) closeFilterBtn.addEventListener('click', closeFilter);
    if (filterOverlay) filterOverlay.addEventListener('click', closeFilter);

    // Accordion Logic
    const accordions = document.querySelectorAll('.accordion-header');
    accordions.forEach(acc => {
        acc.addEventListener('click', function() {
            this.classList.toggle('active');
            const content = this.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });

    // Frontend Filtering Logic
    const filterInputs = document.querySelectorAll('.filter-sidebar input');
    filterInputs.forEach(input => {
        input.addEventListener('change', applyFilters);
        if(input.type === 'text') input.addEventListener('input', applyFilters);
    });

    const clearFiltersBtn = document.querySelector('.clear-filters');
    if(clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            filterInputs.forEach(input => {
                if (input.type === 'radio' && input.value === 'All') input.checked = true;
                else if (input.type === 'radio') input.checked = false;
                else if (input.type === 'checkbox') input.checked = false;
                else if (input.type === 'text') input.value = '';
            });
            applyFilters();
        });
    }

    function applyFilters() {
        let filtered = [...(window.allBookings || [])];

        // 1. Date created
        const dateCreated = document.querySelector('input[name="dateCreated"]:checked')?.value;
        if (dateCreated && dateCreated !== 'All' && dateCreated !== 'Custom') {
            const now = new Date();
            filtered = filtered.filter(b => {
                const bDate = new Date(b.created_at || b.booking_date);
                const diffTime = Math.abs(now - bDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (dateCreated === 'Last 7 days') return diffDays <= 7;
                if (dateCreated === 'Last 14 days') return diffDays <= 14;
                if (dateCreated === 'Last month') return diffDays <= 30;
                return true;
            });
        }

        // 2. Fulfillment status (mapped to Session status roughly)
        const fulfillmentChecks = Array.from(document.querySelectorAll('input[name="fulfillmentStatus"]:checked')).map(cb => cb.value.toUpperCase());
        if (fulfillmentChecks.length > 0) {
            filtered = filtered.filter(b => {
                const s = (b.status || '').toUpperCase();
                if (fulfillmentChecks.includes('UNFULFILLED') && s === 'PENDING') return true;
                if (fulfillmentChecks.includes('FULFILLED') && (s === 'PAID' || s === 'CASH' || s === 'ATTENDED')) return true;
                if (fulfillmentChecks.includes('CANCELED') && s === 'CANCELLED') return true;
                return false;
            });
        }

        // 3. Product Search
        const productSearch = document.getElementById('productSearchInput').value.toLowerCase();
        if (productSearch) {
            filtered = filtered.filter(b => (b.item_name || '').toLowerCase().includes(productSearch));
        }

        // 4. Payment status
        const paymentChecks = Array.from(document.querySelectorAll('input[name="paymentStatus"]:checked')).map(cb => cb.value.toUpperCase());
        if (paymentChecks.length > 0) {
            filtered = filtered.filter(b => {
                const s = (b.status || '').toUpperCase();
                if (paymentChecks.includes('PAID') && (s === 'PAID' || s === 'CASH' || s === 'ATTENDED')) return true;
                if (paymentChecks.includes('UNPAID') && s === 'PENDING') return true;
                if (paymentChecks.includes('CANCELED') && s === 'CANCELLED') return true;
                if (paymentChecks.includes('PENDING') && s === 'PENDING') return true;
                return false;
            });
        }

        renderBookings(filtered);
    }
});

// ---- Bulk Actions Logic ----
window.toggleBookingSelection = (e, orderId) => {
    e.stopPropagation();
    if (e.target.checked) {
        window.selectedBookings.add(orderId);
    } else {
        window.selectedBookings.delete(orderId);
    }
    updateBulkActionsUI();
    
    // Check if all are selected to update the "select all" checkbox state
    const allCheckboxes = document.querySelectorAll('.row-checkbox');
    const selectAllCheckbox = document.getElementById('selectAllBookings');
    if (selectAllCheckbox && allCheckboxes.length > 0) {
        selectAllCheckbox.checked = Array.from(allCheckboxes).every(cb => cb.checked);
    }
};

window.toggleAllBookings = (el) => {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = el.checked;
        if (el.checked) {
            window.selectedBookings.add(cb.value);
        } else {
            window.selectedBookings.delete(cb.value);
        }
    });
    updateBulkActionsUI();
};

window.updateBulkActionsUI = () => {
    const bulkActions = document.getElementById('bulkActions');
    const bulkCount = document.getElementById('bulkCount');
    
    if (!bulkActions || !bulkCount) return;
    
    if (window.selectedBookings.size > 0) {
        bulkActions.style.display = 'flex';
        bulkCount.textContent = `${window.selectedBookings.size} selected`;
    } else {
        bulkActions.style.display = 'none';
    }
};

window.deleteSelectedBookings = async () => {
    if (window.selectedBookings.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${window.selectedBookings.size} bookings?`)) return;
    
    try {
        const orderIds = Array.from(window.selectedBookings);
        for (const orderId of orderIds) {
            await fetchAuth(`/api/admin/bookings/${orderId}`, {
                method: 'DELETE'
            });
        }
        window.selectedBookings.clear();
        await loadBookings();
    } catch (e) {
        console.error("Failed to delete selected bookings:", e);
        alert("Failed to delete some bookings.");
    }
};

// ==========================================
// INVENTORY MANAGEMENT LOGIC
// ==========================================

let inventoryData = [];

async function loadInventory() {
    try {
        const res = await fetchAuth('/api/admin/products');
        inventoryData = await res.json();
        renderInventory(inventoryData);
    } catch (err) {
        console.error('Failed to load inventory', err);
    }
}

function renderInventory(products) {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No products found.</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(product => `
        <tr>
            <td>
                <div style="font-weight:700; color:#fff;">${product.name}</div>
            </td>
            <td><span class="badge-gray" style="padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">${product.type || 'N/A'}</span></td>
            <td style="color:var(--green); font-weight:600;">₹${(product.price || 0).toFixed(2)}</td>
            <td>
                <span class="${product.stock_quantity <= 5 ? 'badge-red' : (product.stock_quantity <= 15 ? 'badge-pending' : 'badge-green')}" style="padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; border: 1px solid currentColor; background: transparent;">
                    ${product.stock_quantity}
                </span>
            </td>
            <td>
                <button class="btn" style="background: rgba(255,255,255,0.1); padding: 0.4rem 0.8rem; font-size: 0.75rem; color:#fff; border:none; margin-right: 0.5rem;" onclick='openProductModal(${JSON.stringify(product).replace(/'/g, "&apos;")})'>Edit</button>
                <button class="btn-delete" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;" onclick="deleteProduct(${product.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

window.openProductModal = (product = null) => {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    
    if (product) {
        title.textContent = 'Edit Product';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productType').value = product.type;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productStock').value = product.stock_quantity;
    } else {
        title.textContent = 'Add Product';
        form.reset();
        document.getElementById('productId').value = '';
    }
    
    modal.style.display = 'flex';
};

window.closeProductModal = () => {
    document.getElementById('productModal').style.display = 'none';
};

window.deleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
        const res = await fetchAuth(`/api/admin/products/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadInventory();
        } else {
            alert('Failed to delete product');
        }
    } catch (err) {
        alert('Error connecting to server');
    }
};

const productForm = document.getElementById('productForm');
if (productForm) {
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('productId').value;
        const name = document.getElementById('productName').value;
        const type = document.getElementById('productType').value;
        const price = document.getElementById('productPrice').value;
        const stock_quantity = document.getElementById('productStock').value;
        
        const payload = { name, type, price, stock_quantity };
        
        try {
            const url = id ? `/api/admin/products/${id}` : '/api/admin/products';
            const method = id ? 'PUT' : 'POST';
            
            const res = await fetchAuth(url, {
                method,
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                closeProductModal();
                loadInventory();
            } else {
                alert('Failed to save product');
            }
        } catch (err) {
            alert('Error connecting to server');
        }
    });
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    loadInventory();
});
