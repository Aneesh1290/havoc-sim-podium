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
        
        // Reset order details view and inline display style of bookings tab
        document.getElementById('order-details-view').classList.remove('active');
        document.getElementById('tab-bookings').style.display = '';
        
        // Hide product modal and options modal if they are open
        const productModal = document.getElementById('productModal');
        if (productModal) productModal.style.display = 'none';
        
        const optionModal = document.getElementById('shopifyOptionModal');
        if (optionModal) optionModal.style.display = 'none';
        
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
    if (typeof renderInventory === 'function' && typeof inventoryData !== 'undefined') {
        renderInventory(inventoryData);
    }
    updateAnalyticsSummary(window.allBookings);
}

function renderBookings(bookingsToRender) {
    window.currentBookings = bookingsToRender;
    const tbody = document.getElementById('bookingsTableBody');
    
    // Clear selections when re-rendering
    window.selectedBookings.clear();
    updateBulkActionsUI();
    const selectAllCheckbox = document.getElementById('selectAllBookings');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;

    const countHeader = document.getElementById('bookingCountHeader');
    const countToolbar = document.getElementById('bookingCountToolbar');
    if (countHeader) countHeader.textContent = bookingsToRender.length;
    if (countToolbar) countToolbar.textContent = `(${bookingsToRender.length})`;
    
    // Analytics summary is now updated per 30 days, not based on table filters


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
        let dateFormatted = b.booking_date || '-';
        let timeFormatted = b.booking_time || '-';
        if (b.booking_date && b.booking_time) {
            try {
                const d = new Date(`${b.booking_date}T${b.booking_time}`);
                if (!isNaN(d.getTime())) {
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
                }
            } catch(e) {}
        }

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

function updateAnalyticsSummary(bookings) {
    const filterEl = document.getElementById('analyticsTimeFilter');
    const filterValue = filterEl ? filterEl.value : '30';
    
    const now = new Date();
    let currentSales = 0, currentOrders = 0;
    let prevSales = 0, prevOrders = 0;

    const days = filterValue === 'all' ? 'all' : parseInt(filterValue, 10);
    const msInDay = 24 * 60 * 60 * 1000;
    const currentPeriodStart = days === 'all' ? new Date(0) : new Date(now.getTime() - (days * msInDay));
    const prevPeriodStart = days === 'all' ? new Date(0) : new Date(now.getTime() - (days * 2 * msInDay));

    bookings.forEach(b => {
        if (b.status === 'CANCELLED' || b.status === 'REFUNDED') return;
        
        let dateStr = b.created_at || b.booking_date || '';
        if (dateStr.includes(' ')) {
            dateStr = dateStr.replace(' ', 'T');
        }
        const d = new Date(dateStr);
        
        if (!d || isNaN(d.getTime())) return;
        
        if (d >= currentPeriodStart) {
            currentOrders++;
            currentSales += (parseFloat(b.price) || 0);
        } else if (days !== 'all' && d >= prevPeriodStart && d < currentPeriodStart) {
            prevOrders++;
            prevSales += (parseFloat(b.price) || 0);
        }
    });

    const currentAov = currentOrders > 0 ? (currentSales / currentOrders) : 0;
    const prevAov = prevOrders > 0 ? (prevSales / prevOrders) : 0;

    const calcTrend = (curr, prev) => {
        if (prev === 0 && curr > 0) return { val: 100, dir: 'up' };
        if (prev === 0 && curr === 0) return { val: 0, dir: 'up' };
        const diff = ((curr - prev) / prev) * 100;
        return { val: Math.abs(Math.round(diff)), dir: diff >= 0 ? 'up' : 'down' };
    };

    const salesTrend = calcTrend(currentSales, prevSales);
    const ordersTrend = calcTrend(currentOrders, prevOrders);
    const aovTrend = calcTrend(currentAov, prevAov);

    const updateDOM = (idPrefix, valFormatted, trend) => {
        const valEl = document.getElementById(`as-${idPrefix}`);
        const trendEl = document.getElementById(`as-${idPrefix}-trend`);
        if (valEl) valEl.textContent = valFormatted;
        if (trendEl) {
            trendEl.innerHTML = `${trend.dir === 'up' ? '↗' : '↘'} ${trend.val}%`;
            trendEl.style.color = trend.dir === 'up' ? '#10B981' : '#EF4444';
        }
    };

    updateDOM('sales', `₹${currentSales.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, salesTrend);
    updateDOM('orders', currentOrders.toLocaleString('en-IN'), ordersTrend);
    updateDOM('aov', `₹${currentAov.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, aovTrend);

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
    document.getElementById('tab-bookings').style.display = '';
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

    const totalAmount = order.price || 0;
    const priceFormatted = totalAmount.toFixed(2);
    const baseCostFormatted = (totalAmount / 1.18).toFixed(2);
    const taxFormatted = (totalAmount - (totalAmount / 1.18)).toFixed(2);
    
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
                    <span style="color: var(--muted);">₹${baseCostFormatted}</span>
                    <span style="color: var(--muted);">X 1</span>
                    <span style="font-weight: 600;">₹${baseCostFormatted}</span>
                </div>
            </div>
        </div>

        <div class="od-card">
            <div class="od-card-title">
                <div>Payment info <span class="od-badge ${getBadgeClass(paymentBadge)}" style="font-size: 0.65rem; margin-left: 0.5rem;">${paymentBadge}</span></div>
            </div>
            <div class="od-summary-row"><span>Items</span><span>₹${baseCostFormatted}</span></div>
            <div class="od-summary-row"><span>Shipping</span><span>₹0.00</span></div>
            <div class="od-summary-row"><span>Tax (18% GST)</span><span>₹${taxFormatted}</span></div>
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
    
    document.getElementById('walkinPrice').value = Math.round(basePrice * 1.18);
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

// ==========================================
// INVENTORY REPORT VIEW
// ==========================================

function populateInventoryMonthDropdown() {
    const select = document.getElementById('inventoryReportFilter');
    if (!select) return;
    select.innerHTML = '';

    // "All Time" option
    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'All Time';
    select.appendChild(allOpt);

    // Generate next 12 months
    const now = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        // Pre-select current month
        if (i === 0) opt.selected = true;
        select.appendChild(opt);
    }
}

async function loadInventoryReport() {
    const select = document.getElementById('inventoryReportFilter');
    const month = select ? select.value : 'all';
    const tbody = document.getElementById('inventoryReportTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="padding: 3rem; text-align: center; color: var(--muted);">Loading...</td></tr>';

    try {
        const res = await fetchAuth(`/api/admin/inventory-report?month=${encodeURIComponent(month)}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        renderInventoryReport(data.report);
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="5" style="padding: 3rem; text-align: center; color: #EF4444;">Failed to load inventory. Is the server running?</td></tr>';
    }
}

function renderInventoryReport(report) {
    const tbody = document.getElementById('inventoryReportTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!report || report.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="padding: 3rem; text-align: center; color: var(--muted);">No products found.</td></tr>';
        return;
    }

    report.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${item.name}</td>
            <td><span class="badge" style="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.6); padding: 0.2rem 0.7rem; border-radius: 6px; font-size: 0.8rem;">${item.type || 'Simulator'}</span></td>
            <td style="color: #10B981; font-weight: 600;">₹${parseFloat(item.price || 0).toFixed(2)}</td>
            <td>
                <span style="display: inline-flex; align-items: center; justify-content: center; border: 1px solid #10B981; color: #10B981; background: transparent; padding: 0.15rem 0.6rem; border-radius: 4px; font-size: 0.8rem; font-weight: 500; margin-right: 8px; min-width: 80px;">
                    Empty: ${item.emptySlots}
                </span>
                <span style="display: inline-flex; align-items: center; justify-content: center; border: 1px solid #EF4444; color: #EF4444; background: transparent; padding: 0.15rem 0.6rem; border-radius: 4px; font-size: 0.8rem; font-weight: 500; min-width: 60px;">
                    Full: ${item.fullSlots}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

let adminCouponsList = [];

async function loadCoupons() {
    const tbody = document.getElementById('couponsTableBody');
    const res = await fetchAuth('/api/admin/coupons');
    adminCouponsList = await res.json();
    
    tbody.innerHTML = '';
    if (!adminCouponsList.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding:3rem; text-align:center; color:rgba(255,255,255,0.35);">No coupons added yet</td></tr>';
        return;
    }
    const renderCouponRow = (c, isChild = false, parentId = '') => {
        const tr = document.createElement('tr');
        if (isChild) {
            tr.classList.add(`child-of-${parentId}`);
            tr.style.display = 'none';
            tr.style.background = 'rgba(0,0,0,0.2)';
        }
        
        const usesText = c.max_uses != null ? `${c.used_count || 0} / ${c.max_uses}` : `${c.used_count || 0} / ∞`;
        const expiryText = c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—';
        const now = new Date();
        const isExpired = c.expires_at && new Date(c.expires_at) < now;
        const isExhausted = c.max_uses != null && (c.used_count || 0) >= c.max_uses;
        const statusBadge = (isExpired || isExhausted)
            ? `<span class="badge-cancelled" style="padding:0.2rem 0.5rem; border-radius:4px; font-size:0.75rem;">Inactive</span>`
            : `<span class="badge-attended" style="padding:0.2rem 0.5rem; border-radius:4px; font-size:0.75rem;">Active</span>`;
        
        const prefixSpacing = isChild ? '<span style="display:inline-block; width:20px;"></span>↳ ' : '';
        
        tr.innerHTML = `
            <td style="font-weight:700; letter-spacing:2px; font-family:monospace; color:#e5b869">${prefixSpacing}${c.code} <div style="margin-top:4px; ${isChild ? 'margin-left: 35px;' : ''}">${statusBadge}</div></td>
            <td style="text-transform:capitalize; color:rgba(255,255,255,0.7)">${c.type === 'percent' ? 'Percentage' : 'Flat Amount'}</td>
            <td style="font-weight:600">${c.type === 'percent' ? c.value + '%' : '₹' + c.value}</td>
            <td style="color:rgba(255,255,255,0.7)">${usesText}</td>
            <td style="color:rgba(255,255,255,0.7)">${expiryText}</td>
            <td>
                <button class="btn btn-gold" onclick="editCoupon('${c.code}')" style="margin-right:0.5rem; padding:0.4rem 0.8rem; font-size:0.8rem;">Edit</button>
                <button class="btn btn-delete" onclick="deleteCoupon('${c.code}')" style="padding:0.4rem 0.8rem; font-size:0.8rem;">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    };

    const groups = {};
    window.bulkCouponGroups = groups;
    
    adminCouponsList.forEach(c => {
        let prefix = c.code;
        const match = c.code.match(/^(.*?)(\d+)$/);
        if (match) {
            prefix = match[1];
        } else {
            const dashIndex = c.code.lastIndexOf('-');
            if (dashIndex > 0) prefix = c.code.substring(0, dashIndex + 1);
        }

        const groupKey = `${prefix}_${c.type}_${c.value}`;
        if (!groups[groupKey]) {
            groups[groupKey] = {
                id: 'grp_' + Math.random().toString(36).substr(2, 9),
                prefix: prefix || c.code,
                type: c.type,
                value: c.value,
                coupons: []
            };
        }
        groups[groupKey].coupons.push(c);
    });

    Object.values(groups).forEach(g => {
        // Store group id for easy lookup
        groups[g.id] = g; 
        
        if (g.coupons.length === 1) {
            renderCouponRow(g.coupons[0]);
        } else {
            // Render group header
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.style.background = 'rgba(255,255,255,0.03)';
            tr.onclick = (e) => {
                if(e.target.tagName === 'BUTTON') return;
                const children = document.querySelectorAll('.child-of-' + g.id);
                const expandIcon = tr.querySelector('.expand-icon');
                const isHidden = children[0].style.display === 'none';
                children.forEach(el => el.style.display = isHidden ? 'table-row' : 'none');
                if (expandIcon) expandIcon.textContent = isHidden ? '▼' : '▶';
            };
            
            tr.innerHTML = `
                <td style="font-weight:700; color:#e5b869">
                    <span class="expand-icon" style="display:inline-block; width:15px; font-size:0.8rem;">▶</span> 
                    ${g.prefix}*** <span style="color:var(--muted); font-size:0.8rem; margin-left:0.5rem; font-weight: 400;">(${g.coupons.length} bulk codes)</span>
                </td>
                <td style="text-transform:capitalize; color:rgba(255,255,255,0.7)">${g.type === 'percent' ? 'Percentage' : 'Flat Amount'}</td>
                <td style="font-weight:600">${g.type === 'percent' ? g.value + '%' : '₹' + g.value}</td>
                <td colspan="2" style="color:var(--muted); font-size:0.85rem;">Click to expand/collapse</td>
                <td>
                    <button class="btn btn-delete" onclick="deleteBulkCoupons('${g.id}')" style="padding:0.4rem 0.8rem; font-size:0.8rem;">Delete All</button>
                </td>
            `;
            tbody.appendChild(tr);

            // Render children
            g.coupons.forEach(c => renderCouponRow(c, true, g.id));
        }
    });
}

// ---- Add/Edit/Delete Coupons ----
window.editCoupon = (code) => {
    const coupon = adminCouponsList.find(c => c.code === code);
    if (!coupon) return;
    
    document.getElementById('couponFormTitle').innerText = 'Edit Coupon: ' + code;
    document.getElementById('editingCouponCode').value = code;
    
    document.getElementById('couponCode').value = coupon.code;
    document.getElementById('couponCode').disabled = true; // Cannot edit code
    document.getElementById('couponType').value = coupon.type;
    document.getElementById('couponValue').value = coupon.value;
    document.getElementById('couponExpiry').value = coupon.expires_at ? coupon.expires_at.split('T')[0] : '';
    document.getElementById('couponMaxUses').value = coupon.max_uses || '';
    
    document.getElementById('couponSubmitBtn').innerText = 'Update';
    document.getElementById('cancelEditCouponBtn').style.display = 'block';
    
    // Scroll to top
    document.querySelector('.add-coupon-card').scrollIntoView({ behavior: 'smooth' });
};

document.getElementById('cancelEditCouponBtn').addEventListener('click', () => {
    document.getElementById('addCouponForm').reset();
    document.getElementById('editingCouponCode').value = '';
    document.getElementById('couponCode').disabled = false;
    document.getElementById('couponFormTitle').innerText = '+ Add New Coupon';
    document.getElementById('couponSubmitBtn').innerText = 'Add';
    document.getElementById('cancelEditCouponBtn').style.display = 'none';
});

document.getElementById('addCouponForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editingCode = document.getElementById('editingCouponCode').value;
    const code = document.getElementById('couponCode').value.trim().toUpperCase();
    const type = document.getElementById('couponType').value;
    const value = document.getElementById('couponValue').value;
    const expires_at = document.getElementById('couponExpiry').value || null;
    const max_uses = document.getElementById('couponMaxUses').value || null;

    let res;
    if (editingCode) {
        // Update existing
        res = await fetchAuth(`/api/admin/coupons/${encodeURIComponent(editingCode)}`, {
            method: 'PUT',
            body: JSON.stringify({ type, value: parseFloat(value), expires_at, max_uses })
        });
    } else {
        // Add new
        res = await fetchAuth('/api/admin/coupons', {
            method: 'POST',
            body: JSON.stringify({ code, type, value: parseFloat(value), expires_at, max_uses })
        });
    }

    const data = await res.json();
    if (data.success) {
        document.getElementById('cancelEditCouponBtn').click(); // Reset form
        loadCoupons();
    } else {
        alert(data.error || 'Failed to save coupon');
    }
});

document.getElementById('bulkCouponForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const prefix = document.getElementById('bulkCouponPrefix').value.trim();
    const count = parseInt(document.getElementById('bulkCouponCount').value);
    const startFrom = parseInt(document.getElementById('bulkCouponStart')?.value) || 1;
    const format = document.getElementById('bulkCouponFormat').value;
    const type = document.getElementById('bulkCouponType').value;
    const value = document.getElementById('bulkCouponValue').value;
    const max_uses = document.getElementById('bulkCouponMaxUses').value || null;
    const btn = document.getElementById('bulkCouponSubmitBtn');

    if (!prefix || isNaN(count) || count < 1) {
        alert('Please provide a valid prefix and count.');
        return;
    }

    btn.disabled = true;
    btn.innerText = 'Generating...';

    const res = await fetchAuth('/api/admin/coupons/bulk', {
        method: 'POST',
        body: JSON.stringify({ prefix, count, start_from: startFrom, format, type, value: parseFloat(value), max_uses })
    });
    
    const data = await res.json();
    
    btn.disabled = false;
    btn.innerText = 'Generate';

    if (data.success) {
        document.getElementById('bulkCouponForm').reset();
        alert(data.message);
        loadCoupons();
    } else {
        alert(data.error || 'Failed to generate bulk coupons');
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

window.deleteBulkCoupons = async (groupId) => {
    const group = window.bulkCouponGroups[groupId];
    if (!group) return;
    
    if (!confirm(`Are you sure you want to delete all ${group.coupons.length} coupons in the ${group.prefix} series?`)) return;
    
    const codes = group.coupons.map(c => c.code);
    
    const res = await fetchAuth('/api/admin/coupons/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ codes })
    });
    
    if (res.ok) {
        loadCoupons();
    } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete bulk coupons');
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

// ---- Filter Sidebar & Export Logic ----
document.addEventListener('DOMContentLoaded', () => {
    // Export CSV Logic
    const exportBtn = document.getElementById('exportCsvBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            let dataToExport = window.currentBookings || window.allBookings;
            if (!dataToExport || dataToExport.length === 0) {
                alert("No bookings available to export.");
                return;
            }

            // Sort data by booking_date then booking_time
            dataToExport = [...dataToExport].sort((a, b) => {
                const dateA = new Date(a.booking_date || 0);
                const dateB = new Date(b.booking_date || 0);
                if (dateA - dateB !== 0) return dateA - dateB;
                
                const timeA = a.booking_time || '';
                const timeB = b.booking_time || '';
                return timeA.localeCompare(timeB);
            });

            // Group by date
            const grouped = {};
            dataToExport.forEach(b => {
                const d = b.booking_date || 'UNKNOWN DATE';
                if (!grouped[d]) grouped[d] = [];
                grouped[d].push(b);
            });

            let html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
            <meta charset="utf-8">
            <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Bookings</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
            <style>
                table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; }
                td, th { border: 1px solid #000000; padding: 6px; text-align: center; font-size: 14px; }
                .header-green { background-color: #217238; color: #000000; font-weight: bold; }
                .header-pink { background-color: #dcaab4; color: #000000; font-weight: bold; }
                .group-date { background-color: #d1dfd1; font-weight: bold; text-align: center; text-transform: uppercase; }
                .total-row { font-weight: bold; }
            </style>
            </head>
            <body>
            <table>
            `;

            let totalSlCounter = 1;

            Object.keys(grouped).forEach((date, i) => {
                // Format date string for group header
                let displayDate = date;
                try {
                    if (date.includes('-')) {
                        const dObj = new Date(date);
                        const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
                        const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
                        displayDate = `${months[dObj.getMonth()]} ${dObj.getDate()} (${days[dObj.getDay()]})`;
                    }
                } catch (e) {}

                if (i > 0) html += `<tr><td colspan="12" style="border:none;"></td></tr>`; // Gap between groups
                
                // Add date group header
                html += `<tr><td colspan="12" class="group-date">${displayDate}</td></tr>`;

                // Add columns header
                html += `<tr>
                    <th class="header-green">TOTAL SL</th>
                    <th class="header-green">SN</th>
                    <th class="header-pink">ORDER NO</th>
                    <th class="header-pink">NAME</th>
                    <th class="header-green">PHONE NO</th>
                    <th class="header-green">E-MAIL ID</th>
                    <th class="header-green">DATE</th>
                    <th class="header-green">TIME/SLOT</th>
                    <th class="header-green">TYPE OF SIM PODIUM</th>
                    <th class="header-green">PPT</th>
                    <th class="header-green">AMOUNT DUE</th>
                    <th class="header-green">STATUS</th>
                </tr>`;

                let dateTotalAmount = 0;
                let dateTotalPpt = 0;

                grouped[date].forEach((b) => {
                    const ppt = 1;
                    const amt = parseFloat(b.price) || 0;
                    dateTotalAmount += amt;
                    dateTotalPpt += ppt;
                    
                    let formattedDate = b.booking_date;
                    try {
                        if (formattedDate && formattedDate.includes('-')) {
                            const dObj = new Date(formattedDate);
                            const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                            formattedDate = `${monthsShort[dObj.getMonth()]}-${dObj.getDate()}`;
                        }
                    } catch (e) {}

                    // Compute human-readable status labels matching the dashboard
                    const rawStatus = (b.status || 'PENDING').toUpperCase();
                    const isPending = rawStatus === 'PENDING';
                    const isCancelled = rawStatus === 'CANCELLED';
                    const isAttended = rawStatus === 'ATTENDED';
                    const isCash = rawStatus === 'CASH';
                    const paymentLabel = isPending ? 'UNPAID' : (isCash ? 'UNPAID' : (isCancelled ? 'REFUNDED' : 'PAID'));
                    const fulfillLabel = isAttended ? 'FULFILLED' : (isCancelled ? 'CANCELLED' : 'UNFULFILLED');
                    const statusLabel = `${paymentLabel} / ${fulfillLabel}`;

                    html += `<tr>
                        <td>${totalSlCounter}</td>
                        <td>1</td>
                        <td>${b.order_id || ''}</td>
                        <td>${b.name || ''}</td>
                        <td>${b.phone || ''}</td>
                        <td>${b.email || ''}</td>
                        <td>${formattedDate}</td>
                        <td>${b.booking_time || ''}</td>
                        <td>${b.item_name || ''}</td>
                        <td>${ppt}</td>
                        <td>₹${amt.toFixed(2)}</td>
                        <td>${statusLabel}</td>
                    </tr>`;
                    
                    totalSlCounter++;
                });

                // Add total row
                html += `<tr class="total-row">
                    <td colspan="8" style="border:none;"></td>
                    <td style="text-align:center;">TOTAL</td>
                    <td>${dateTotalPpt}</td>
                    <td>₹${dateTotalAmount.toFixed(2)}</td>
                    <td style="border:none;"></td>
                </tr>`;
            });

            html += `</table></body></html>`;
            
            // Trigger download as .xls
            const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `Havoc_Bookings_Report_${new Date().toISOString().split('T')[0]}.xls`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

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
    const filterInputs = document.querySelectorAll('.filter-sidebar input, .filter-sidebar select');
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
                else if (input.tagName === 'SELECT') input.value = '';
            });
            applyFilters();
        });
    }

    function applyFilters() {
        let filtered = [...(window.allBookings || [])];

        // 1. Date created
        const dateCreated = document.querySelector('input[name="dateCreated"]:checked')?.value;
        const customRange = document.getElementById('customDateRange');
        if (customRange) {
            customRange.style.display = dateCreated === 'Custom' ? 'flex' : 'none';
            // Recalculate accordion max-height so it doesn't cut off
            const accordionContent = customRange.closest('.accordion-content');
            if (accordionContent && accordionContent.style.maxHeight) {
                accordionContent.style.maxHeight = accordionContent.scrollHeight + "px";
            }
        }

        if (dateCreated && dateCreated !== 'All') {
            if (dateCreated === 'Custom') {
                const fromDate = document.getElementById('customDateFrom')?.value;
                const toDate = document.getElementById('customDateTo')?.value;
                if (fromDate || toDate) {
                    filtered = filtered.filter(b => {
                        const bDate = new Date(b.created_at || b.booking_date).setHours(0,0,0,0);
                        if (fromDate && bDate < new Date(fromDate).setHours(0,0,0,0)) return false;
                        if (toDate && bDate > new Date(toDate).setHours(0,0,0,0)) return false;
                        return true;
                    });
                }
            } else {
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

        // 3. Product Filter
        const productFilterSelect = document.getElementById('productFilterSelect');
        const selectedProduct = productFilterSelect ? productFilterSelect.value : '';
        if (selectedProduct) {
            filtered = filtered.filter(b => (b.item_name || '') === selectedProduct);
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

        // 5. Booking Date
        const bookingDateFilter = document.getElementById('bookingDateFilter')?.value;
        if (bookingDateFilter) {
            const filterParts = bookingDateFilter.split('-'); // ["2026", "09", "22"]
            const fMonthInt = parseInt(filterParts[1], 10) - 1;
            const fDateInt = parseInt(filterParts[2], 10);
            
            const fMonthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const fMonthNamesLong = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            
            const fShortStr = `${fMonthNamesShort[fMonthInt]} ${fDateInt}`; // "Sep 22"
            const fLongStrPadded = `${fMonthNamesLong[fMonthInt]} ${String(fDateInt).padStart(2,'0')}`; // "September 22"
            const fLongStrUnpadded = `${fMonthNamesLong[fMonthInt]} ${fDateInt}`; // "September 22"

            filtered = filtered.filter(b => {
                if (!b.booking_date) return false;
                try {
                    let bDateStr = b.booking_date;
                    // Exact YYYY-MM-DD
                    if (/^\d{4}-\d{2}-\d{2}$/.test(bDateStr)) {
                        return bDateStr === bookingDateFilter;
                    }
                    
                    // String matching
                    if (bDateStr.includes(fShortStr) || bDateStr.includes(fLongStrPadded) || bDateStr.includes(fLongStrUnpadded)) {
                        return true;
                    }
                    
                    // Fallback to stripping parentheticals and parsing
                    const cleanDateStr = bDateStr.replace(/\s*\([a-zA-Z]+\)/, '');
                    const bDate = new Date(cleanDateStr);
                    if (!isNaN(bDate.getTime())) {
                        const m = String(bDate.getMonth() + 1).padStart(2, '0');
                        const d = String(bDate.getDate()).padStart(2, '0');
                        return m === filterParts[1] && d === filterParts[2];
                    }
                    return false;
                } catch(e) {
                    return false;
                }
            });
        }

        // 6. Booking Month
        const monthChecks = Array.from(document.querySelectorAll('input[name="bookingMonth"]:checked')).map(cb => cb.value.toUpperCase());
        if (monthChecks.length > 0) {
            const monthNamesShort = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
            const monthNamesLong = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
            filtered = filtered.filter(b => {
                if (!b.booking_date) return false;
                try {
                    let bDateStr = b.booking_date.toUpperCase();
                    if (/^\d{4}-\d{2}-\d{2}$/.test(bDateStr)) {
                        const mIndex = parseInt(bDateStr.split('-')[1], 10) - 1;
                        return monthChecks.includes(monthNamesShort[mIndex]);
                    }
                    for (let m of monthChecks) {
                        const idx = monthNamesShort.indexOf(m);
                        if (idx !== -1) {
                            if (bDateStr.includes(monthNamesShort[idx]) || bDateStr.includes(monthNamesLong[idx])) {
                                return true;
                            }
                        }
                    }
                    
                    // Fallback
                    const cleanDateStr = b.booking_date.replace(/\s*\([a-zA-Z]+\)/, '');
                    const dObj = new Date(cleanDateStr);
                    if (!isNaN(dObj.getTime())) {
                        const m = monthNamesShort[dObj.getMonth()];
                        return monthChecks.includes(m);
                    }
                    return false;
                } catch(e) {
                    return false;
                }
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
        
        // Populate the product filter dropdown for bookings
        const productFilterSelect = document.getElementById('productFilterSelect');
        if (productFilterSelect) {
            productFilterSelect.innerHTML = '<option value="">All Products</option>';
            inventoryData.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.name;
                opt.textContent = p.name;
                productFilterSelect.appendChild(opt);
            });
        }
        
        // Populate the category filter for products
        const categoryFilter = document.getElementById('productCategoryFilter');
        if (categoryFilter) {
            const types = [...new Set(inventoryData.map(p => p.type).filter(Boolean))];
            categoryFilter.innerHTML = '<option value="all" style="color: #000;">All Categories</option>';
            types.forEach(type => {
                const opt = document.createElement('option');
                opt.value = type;
                opt.textContent = type;
                opt.style.color = '#000';
                categoryFilter.appendChild(opt);
            });
        }

        renderInventory(inventoryData);
    } catch (err) {
        console.error('Failed to load inventory', err);
    }
}


function renderInventory(products) {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    const countHeader = document.getElementById('productCountHeader');
    const countToolbar = document.getElementById('productCountToolbar');
    if (countHeader) countHeader.textContent = products.length;
    if (countToolbar) countToolbar.textContent = `(${products.length})`;

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="padding: 2rem; text-align: center; color: var(--muted);">No products found.</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(product => {
        let stockText = product.stock_quantity <= 0 ? 'Out of stock' : 
                        (product.stock_quantity <= 15 ? 'Partially out of stock' : 'In stock');
        
        let stockHtml = `<span style="font-size: 0.85rem; color: ${product.stock_quantity <= 0 ? '#ff4040' : (product.stock_quantity <= 15 ? '#ffb300' : '#fff')}">${stockText}</span>`;
        
        let imgHtml = product.image_url ? `<img src="${product.image_url}" alt="product" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover;">` : `<div style="width:40px; height:40px; background:#333; border-radius:6px; border: 1px solid var(--border);"></div>`;

        return `
        <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s; cursor: pointer;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'" onclick='openProductModal(${JSON.stringify(product).replace(/'/g, "&apos;")}); hideAllActionMenus();'>
            <td style="padding: 1rem 1.5rem;" onclick="event.stopPropagation()"><input type="checkbox" style="cursor: pointer;"></td>
            <td style="padding: 1rem 1.5rem;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    ${imgHtml}
                    <div>
                        <div style="font-weight: 500; color: #fff; font-size: 0.9rem;">${product.name}</div>
                        <div style="font-size: 0.75rem; color: var(--muted);">${product.description ? product.description.substring(0, 30) + '...' : ''}</div>
                    </div>
                </div>
            </td>
            <td style="padding: 1rem 1.5rem; font-size: 0.85rem;">${product.type || 'Physical'}</td>
            <td style="padding: 1rem 1.5rem; font-size: 0.85rem;">₹${(product.price || 0).toFixed(2)}</td>
            <td style="padding: 1rem 1.5rem; text-align: right; position: relative;">
                <button id="actionBtn-${product.id}" class="btn action-menu-btn" style="background: #1e40af; color: #fff; border: none; border-radius: 50%; width: 32px; height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; cursor: pointer; transition: all 0.2s;" onclick="toggleActionMenu(event, ${product.id})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                </button>
                <div id="actionMenu-${product.id}" class="action-dropdown" style="display: none; position: absolute; right: 1.5rem; top: 100%; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; z-index: 10; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); min-width: 140px; text-align: left; overflow: hidden; padding: 0.5rem 0;">
                    <div style="padding: 0.5rem 1rem; font-size: 0.9rem; font-family: 'Outfit'; cursor: pointer; color: #1e3a8a; transition: background 0.2s; display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='transparent'" onclick='openProductModal(${JSON.stringify(product).replace(/'/g, "&apos;")}); hideAllActionMenus();'>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        Edit product
                    </div>
                    <div style="padding: 0.5rem 1rem; font-size: 0.9rem; font-family: 'Outfit'; cursor: pointer; color: #1e3a8a; transition: background 0.2s; display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='transparent'" onclick='duplicateProduct(${product.id}); hideAllActionMenus();'>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        Duplicate
                    </div>
                    <div style="padding: 0.5rem 1rem; font-size: 0.9rem; font-family: 'Outfit'; cursor: pointer; color: #1e3a8a; transition: background 0.2s; display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='transparent'" onclick="deleteProduct(${product.id}); hideAllActionMenus();">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        Delete
                    </div>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

function toggleActionMenu(event, id) {
    event.stopPropagation();
    const menu = document.getElementById(`actionMenu-${id}`);
    const isVisible = menu.style.display === 'block';
    hideAllActionMenus();
    if (!isVisible) {
        menu.style.display = 'block';
        const btn = document.getElementById(`actionBtn-${id}`);
        if(btn) btn.style.background = '#2563eb'; // lighter blue active
    }
}

function hideAllActionMenus() {
    document.querySelectorAll('.action-dropdown').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.action-menu-btn').forEach(btn => btn.style.background = '#1e40af'); // reset to dark blue
}

document.addEventListener('click', () => {
    hideAllActionMenus();
});

window.openProductModal = (product = null) => {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const breadcrumb = document.getElementById('productModalBreadcrumb');
    const form = document.getElementById('productForm');
    
    if (product) {
        title.textContent = product.name;
        if (breadcrumb) breadcrumb.textContent = product.name;
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productType').value = product.type;
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productPrice').value = product.price;
        const pvEl = document.getElementById('productPriceVisible');
        if (pvEl) pvEl.value = product.price;
        const cpEl = document.getElementById('productComparePrice');
        if (cpEl) cpEl.value = product.compare_price || '';
        document.getElementById('productStock').value = product.stock_quantity;
        document.getElementById('currentProductImage').textContent = product.image_url ? `Current: ${product.image_url}` : 'No current image';
        
        let opts = '[]';
        try { if (product.options) { JSON.parse(product.options); opts = product.options; } } catch(e) {}
        document.getElementById('productOptionsData').value = opts;
        
        initShopifyOptions(opts);
        // Show existing image in preview
        const dz = document.getElementById('imageDropZone');
        if (product.image_url) {
            renderImagePreview(`/${product.image_url}`, true);
        } else {
            const grid = document.getElementById('imagePreviewGrid');
            if (grid) grid.innerHTML = '';
            if (dz) dz.style.display = '';
        }
    } else {
        title.textContent = 'Add Product';
        if (breadcrumb) breadcrumb.textContent = 'New Product';
        form.reset();
        document.getElementById('productId').value = '';
        document.getElementById('currentProductImage').textContent = '';
        initShopifyOptions('[]');
        // Reset image preview
        const grid = document.getElementById('imagePreviewGrid');
        if (grid) grid.innerHTML = '';
        const dz = document.getElementById('imageDropZone');
        if (dz) dz.style.display = '';
        const countLabel = document.getElementById('imgCountLabel');
        if (countLabel) countLabel.textContent = '0 / 50';
    }
    
    modal.style.display = 'block';
};

window.closeProductModal = () => {
    document.getElementById('productModal').style.display = 'none';
    // Reset preview grid
    const grid = document.getElementById('imagePreviewGrid');
    if (grid) grid.innerHTML = '';
    const countLabel = document.getElementById('imgCountLabel');
    if (countLabel) countLabel.textContent = '0 / 50';
};

// --- Image Preview Helpers ---
function renderImagePreview(src, isExisting = false) {
    const grid = document.getElementById('imagePreviewGrid');
    if (!grid) return;
    grid.innerHTML = ''; // Only 1 main image for now
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative; width:130px; height:130px; border-radius:8px; overflow:hidden; border:1px solid rgba(255,255,255,0.1);';
    wrapper.innerHTML = `
        <img src="${src}" style="width:100%;height:100%;object-fit:cover;" alt="Product image">
        <span style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.7);color:#fff;font-size:0.65rem;font-weight:700;padding:2px 6px;border-radius:4px;letter-spacing:0.5px;">MAIN</span>
        <button type="button" onclick="removeProductImagePreview()" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.7);border:none;color:#fff;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;line-height:1;">✕</button>
    `;
    grid.appendChild(wrapper);
    const countLabel = document.getElementById('imgCountLabel');
    if (countLabel) countLabel.textContent = '1 / 50';
    // Hide drop zone when image present
    const dz = document.getElementById('imageDropZone');
    if (dz) dz.style.display = 'none';
}

window.removeProductImagePreview = () => {
    const grid = document.getElementById('imagePreviewGrid');
    if (grid) grid.innerHTML = '';
    const countLabel = document.getElementById('imgCountLabel');
    if (countLabel) countLabel.textContent = '0 / 50';
    const dz = document.getElementById('imageDropZone');
    if (dz) dz.style.display = '';
    document.getElementById('productImage').value = '';
};

window.handleProductImageChange = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => renderImagePreview(e.target.result, false);
        reader.readAsDataURL(input.files[0]);
    }
};

window.handleProductImageDrop = (event) => {
    const files = event.dataTransfer.files;
    if (files && files[0]) {
        const dt = new DataTransfer();
        dt.items.add(files[0]);
        document.getElementById('productImage').files = dt.files;
        const reader = new FileReader();
        reader.onload = (e) => renderImagePreview(e.target.result, false);
        reader.readAsDataURL(files[0]);
    }
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

window.duplicateProduct = async (id) => {
    try {
        const res = await fetchAuth(`/api/admin/products/${id}/duplicate`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            loadInventory();
        } else {
            alert(data.error || 'Failed to duplicate product');
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
        const formData = new FormData();
        formData.append('name', document.getElementById('productName').value);
        formData.append('type', document.getElementById('productType').value);
        formData.append('description', document.getElementById('productDescription').value);
        formData.append('price', document.getElementById('productPrice').value);
        formData.append('compare_price', document.getElementById('productComparePrice').value || '');
        formData.append('stock_quantity', document.getElementById('productStock').value);
        formData.append('options', document.getElementById('productOptionsData').value);
        
        const fileInput = document.getElementById('productImage');
        if (fileInput.files[0]) {
            formData.append('image', fileInput.files[0]);
        }
        
        try {
            const url = id ? `/api/admin/products/${id}` : '/api/admin/products';
            const method = id ? 'PUT' : 'POST';
            
            const res = await fetch(`${BACKEND_URL}${url}`, {
                method,
                headers: { 'Authorization': `Bearer ${token}` }, // NO Content-Type for FormData
                body: formData
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
    
    const inventoryFilter = document.getElementById('inventoryMonthFilter');
    if (inventoryFilter) {
        inventoryFilter.addEventListener('change', () => {
            if (typeof inventoryData !== 'undefined') {
                renderInventory(inventoryData);
            }
        });
    }

    const searchInput = document.getElementById('productSearchInput');
    const categoryFilter = document.getElementById('productCategoryFilter');
    
    function filterProducts() {
        if (!inventoryData) return;
        const query = (searchInput ? searchInput.value : '').toLowerCase();
        const category = categoryFilter ? categoryFilter.value : 'all';
        
        const filtered = inventoryData.filter(p => {
            const matchesQuery = ((p.name || '').toLowerCase().includes(query)) || ((p.type || '').toLowerCase().includes(query));
            const matchesCategory = category === 'all' || p.type === category;
            return matchesQuery && matchesCategory;
        });
        renderInventory(filtered);
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterProducts);
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterProducts);
    }

    const bookingSearchInput = document.getElementById('bookingSearchInput');
    if (bookingSearchInput) {
        bookingSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = window.allBookings.filter(b => 
                ((b.name || '').toLowerCase().includes(query)) || 
                ((b.email || '').toLowerCase().includes(query)) ||
                (b.order_id && b.order_id.toString().includes(query)) ||
                ((b.item_name || '').toLowerCase().includes(query))
            );
            renderBookings(filtered);
        });
    }

    const analyticsFilter = document.getElementById('analyticsTimeFilter');
    if (analyticsFilter) {
        analyticsFilter.addEventListener('change', () => {
            updateAnalyticsSummary(window.allBookings);
        });
    }

    // Database Backup Logic
    const backupBtn = document.getElementById('backupDbBtn');
    if (backupBtn) {
        backupBtn.addEventListener('click', async () => {
            const token = localStorage.getItem('admin_token');
            if (!token) return alert('Session expired. Please login again.');
            
            try {
                backupBtn.innerHTML = '<span>⏳</span> Preparing...';
                backupBtn.style.pointerEvents = 'none';
                
                const response = await fetch(`${BACKEND_URL}/api/admin/backup`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to download backup');
                }
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                // Get filename from Content-Disposition header if possible, else default
                const cd = response.headers.get('content-disposition');
                let filename = `havoc_backup_${new Date().toISOString().split('T')[0]}.db`;
                if (cd && cd.includes('filename=')) {
                    filename = cd.split('filename=')[1].replace(/"/g, '');
                }
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                backupBtn.innerHTML = '<span>💾</span> Backup Data';
                backupBtn.style.pointerEvents = 'auto';
            } catch (err) {
                console.error(err);
                alert('Backup failed');
                backupBtn.innerHTML = '<span>💾</span> Backup Data';
                backupBtn.style.pointerEvents = 'auto';
            }
        });
    }

    // Inventory Report Initialization
    const inventoryTabBtn = document.querySelector('.nav-btn[data-target="tab-inventory-matrix"]');
    if (inventoryTabBtn) {
        inventoryTabBtn.addEventListener('click', () => {
            populateInventoryMonthDropdown();
            loadInventoryReport();
        });
    }

    const inventoryReportFilter = document.getElementById('inventoryReportFilter');
    if (inventoryReportFilter) {
        inventoryReportFilter.addEventListener('change', () => {
            loadInventoryReport();
        });
    }
});

// ==========================================
// PRODUCT OPTIONS - TOGGLE PILL SYSTEM
// ==========================================

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DEFAULT_TIME_SLOTS = ["11AM-11:30AM","11:30AM-12PM","12PM-12:30PM","12:30PM-1PM","2PM-2:30PM","2:30PM-3PM","3PM-3:30PM","3:30PM-4PM","4PM-4:30PM","4:30PM-5PM","5PM-5:30PM","5:30PM-6PM","6PM-6:30PM","6:30PM-7PM","7PM-7:30PM","7:30PM-8PM","8PM-8:30PM","8:30PM-9PM","9PM-9:30PM","9:30PM-10PM"];

// Returns array of { label: "September 01 (Tue)", isMonday: bool }
const getDatesForMonth = (monthOffset = 0) => {
    const now = new Date();
    const m = (now.getMonth() + monthOffset) % 12;
    const y = now.getFullYear() + Math.floor((now.getMonth() + monthOffset) / 12);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const result = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const dateObj = new Date(y, m, i);
        const dayName = DAY_NAMES[dateObj.getDay()];
        result.push({
            label: `${MONTH_NAMES[m]} ${String(i).padStart(2,'0')} (${dayName})`,
            isMonday: dateObj.getDay() === 1,
            isPast: dateObj < new Date(new Date().setHours(0,0,0,0))
        });
    }
    return result;
};

const getAllMasterDates = () => {
    const today = new Date();
    // Only include next month if automation has already generated it (day >= 15)
    return today.getDate() >= 15
        ? [...getDatesForMonth(0), ...getDatesForMonth(1)]
        : getDatesForMonth(0);
};

// Builds the initial default list — Mondays start OFF, all other days ON
const buildDefaultOptionsList = () => {
    const allDates = getAllMasterDates();
    const defaultDateEnabled = new Set(allDates.filter(d => !d.isMonday && !d.isPast).map(d => d.label));
    return [
        {
            name: "Select Date",
            allItems: allDates, // array of { label, isMonday, isPast }
            isDateOption: true,
        },
        {
            name: "Select Time Slot",
            allItems: DEFAULT_TIME_SLOTS.map(s => ({ label: s, isMonday: false, isPast: false })),
            isDateOption: false,
        }
    ];
};

window.currentOptionsList = [];
window.editingOptionIndex = -1;
window._toggleStates = {}; // { optionIndex: Set<label> } — only enabled labels

const parseOptionsFromDB = (jsonStr) => {
    try {
        const parsed = JSON.parse(jsonStr);
        if (!Array.isArray(parsed) || parsed.length === 0) return null;
        return parsed;
    } catch(e) { return null; }
};

const initOptionsFromDB = (jsonStr) => {
    const dbOpts = parseOptionsFromDB(jsonStr);
    window.currentOptionsList = buildDefaultOptionsList();
    window._toggleStates = {};
    window._slotExceptions = [];

    if (dbOpts) {
        const exceptionsOpt = dbOpts.find(o => o.name === "Exceptions");
        if (exceptionsOpt && exceptionsOpt.choices) {
            window._slotExceptions = [...exceptionsOpt.choices];
        }
    }

    window.currentOptionsList.forEach((opt, i) => {
        if (!dbOpts) {
            // Fresh product — Mondays OFF, past OFF, everything else ON
            window._toggleStates[i] = new Set(
                opt.allItems.filter(d => !d.isMonday && !d.isPast).map(d => d.label)
            );
        } else {
            // Find saved option by name
            const saved = dbOpts.find(o => o.name === opt.name);
            if (saved && saved.choices && saved.choices.length > 0) {
                // Detect format: new format has "(Tue)" style day names in labels
                const isNewFormat = saved.choices.some(c => /\(\w{3}\)/.test(c));
                const savedSet = new Set(saved.choices);
                const enabledSet = new Set();
                opt.allItems.forEach(d => {
                    if (isNewFormat) {
                        // New format: exact match, trust saved state fully
                        if (savedSet.has(d.label)) enabledSet.add(d.label);
                    } else {
                        // Old format: match by prefix (no day name), but FORCE Mondays OFF
                        const prefix = d.label.replace(/ \(\w+\)$/, '');
                        if (savedSet.has(prefix) && !d.isMonday && !d.isPast) {
                            enabledSet.add(d.label);
                        }
                    }
                });
                window._toggleStates[i] = enabledSet;
            } else {
                // Not in DB — default: Mondays OFF
                window._toggleStates[i] = new Set(
                    opt.allItems.filter(d => !d.isMonday && !d.isPast).map(d => d.label)
                );
            }
        }
    });
};

const serializeOptions = () => {
    const opts = window.currentOptionsList.map((opt, i) => ({
        name: opt.name,
        choices: [...(window._toggleStates[i] || new Set())]
    }));
    
    if (window._slotExceptions && window._slotExceptions.length > 0) {
        opts.push({
            name: "Exceptions",
            choices: window._slotExceptions
        });
    }
    return opts;
};

window.renderShopifyOptionsList = () => {
    const container = document.getElementById('shopifyOptionsListContainer');
    if (!container) return;

    container.innerHTML = window.currentOptionsList.map((opt, optIndex) => {
        const enabled = window._toggleStates[optIndex] || new Set();
        const total = opt.allItems.length;
        const onCount = enabled.size;
        const offCount = total - onCount;

        // Preview: exactly 3 pills on one row, then count
        const previewLabels = [...enabled].slice(0, 3);
        const previewHtml = previewLabels.map(c =>
            `<span style="background: rgba(255,255,255,0.08); color: #c4c4c8; padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.78rem; border: 1px solid rgba(255,255,255,0.1); white-space: nowrap; flex-shrink: 0;">${c.replace(/ \(\w+\)$/, '')}</span>`
        ).join('') + (onCount > 3 ? `<span style="color: #52525b; font-size: 0.78rem; white-space: nowrap; flex-shrink: 0;">+${onCount - 3}</span>` : '');

        return `
        <div style="padding: 0.9rem 1.5rem; display: flex; align-items: center; gap: 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.04);">
            <div style="flex-shrink: 0; width: 140px;">
                <div style="font-size: 0.9rem; color: #e4e4e7; font-weight: 500; margin-bottom: 2px;">${opt.name}</div>
                <div style="font-size: 0.75rem;">
                    <span style="color: #22c55e; font-weight: 500;">${onCount} on</span>
                    <span style="margin: 0 4px; color: #3f3f46;">·</span>
                    <span style="color: #ef4444; font-weight: 500;">${offCount} off</span>
                </div>
            </div>
            <div style="flex-grow: 1; display: flex; flex-wrap: nowrap; gap: 0.4rem; align-items: center; overflow: hidden; min-width: 0;">
                ${previewHtml}
            </div>
            <button type="button" onclick="openShopifyOptionModal(${optIndex})"
                style="flex-shrink: 0; padding: 0.4rem 1rem; border-radius: 6px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #d4d4d8; font-size: 0.8rem; cursor: pointer; font-family: 'Outfit';"
                onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.06)'">
                Manage
            </button>
        </div>`;
    }).join('');
};

window.openShopifyOptionModal = (index) => {
    window.editingOptionIndex = index;
    const opt = window.currentOptionsList[index];
    document.getElementById('shopifyOptionName').value = opt.name;
    document.getElementById('shopifyModalTitle').textContent = `Edit: ${opt.name}`;
    document.getElementById('shopifyToggleLabel').textContent =
        opt.isDateOption ? 'Click a day to toggle it on/off. Mondays are closed by default.' : 'Click a slot to toggle it on/off.';
    renderShopifyToggleGrid();
    document.getElementById('shopifyOptionModal').style.display = 'flex';
};

window.closeShopifyOptionModal = () => {
    document.getElementById('shopifyOptionModal').style.display = 'none';
};

window.renderShopifyToggleGrid = () => {
    const grid = document.getElementById('shopifyToggleGrid');
    if (!grid) return;

    const index = window.editingOptionIndex;
    const opt = window.currentOptionsList[index];
    const enabled = window._toggleStates[index] || new Set();

    if (opt.isDateOption) {
        // Week-based calendar grid for dates
        // Group by week rows. Each row = one week line
        // Start by finding which months we have
        let html = '';
        let currentMonth = '';

        opt.allItems.forEach(item => {
            const dayMatch = item.label.match(/\((\w+)\)/);
            const dayName = dayMatch ? dayMatch[1] : '';
            const monthPart = item.label.replace(/ \d+ \(\w+\)$/, '');

            if (monthPart !== currentMonth) {
                currentMonth = monthPart;
                html += `<div style="width: 100%; margin: 0.5rem 0 0.25rem; font-size: 0.8rem; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em;">${monthPart}</div>`;
            }

            const isOn = enabled.has(item.label);
            const isMon = item.isMonday;
            const isPast = item.isPast;

            let bg, border, color, textDecor;
            if (isPast) {
                bg = '#f5f5f5'; border = '#e4e4e7'; color = '#d4d4d8'; textDecor = 'none';
            } else if (isOn) {
                bg = 'rgba(34,197,94,0.12)'; border = '#22c55e'; color = '#16a34a'; textDecor = 'none';
            } else {
                bg = '#f9f9f9'; border = '#e4e4e7'; color = '#a1a1aa'; textDecor = 'line-through';
            }

            const escapedLabel = item.label.replace(/'/g, "\\'");
            const dayNum = item.label.match(/\d+/)?.[0] || '';

            html += `<button type="button" 
                ${isPast ? 'disabled' : `onclick="toggleItem(${index}, '${escapedLabel}')"`}
                title="${item.label}"
                style="
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    width: 64px; height: 52px; border-radius: 8px; cursor: ${isPast ? 'default' : 'pointer'};
                    transition: all 0.12s; font-family: 'Outfit'; border: 1.5px solid ${border};
                    background: ${bg}; color: ${color}; text-decoration: ${textDecor};
                    opacity: ${isPast ? '0.4' : '1'};
                ">
                <span style="font-size: 0.72rem; font-weight: 500; line-height: 1;">${dayName}</span>
                <span style="font-size: 1rem; font-weight: 600; line-height: 1.4;">${dayNum}</span>
            </button>`;
        });

        grid.innerHTML = html;
    } else {
        // Time slot pills with add/delete support
        const slotPills = opt.allItems.map(item => {
            const isOn = enabled.has(item.label);
            const escaped = item.label.replace(/'/g, "\\'");
            return `<div style="position: relative; display: inline-flex; align-items: center;">
                <button type="button"
                    onclick="toggleItem(${index}, '${escaped}')"
                    style="
                        padding: 0.45rem 2rem 0.45rem 1rem; border-radius: 20px; font-size: 0.88rem;
                        cursor: pointer; transition: all 0.12s; font-family: 'Outfit';
                        border: 1.5px solid ${isOn ? '#22c55e' : '#e4e4e7'};
                        background: ${isOn ? 'rgba(34,197,94,0.1)' : '#f9f9f9'};
                        color: ${isOn ? '#16a34a' : '#a1a1aa'};
                        text-decoration: ${isOn ? 'none' : 'line-through'};
                    ">${item.label}</button>
                <button type="button"
                    onclick="deleteSlotItem(${index}, '${escaped}')"
                    title="Remove slot"
                    style="
                        position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
                        width: 16px; height: 16px; border-radius: 50%; border: none;
                        background: rgba(0,0,0,0.12); color: #666; font-size: 0.7rem; cursor: pointer;
                        display: flex; align-items: center; justify-content: center; line-height: 1; padding: 0;
                    ">✕</button>
            </div>`;
        }).join('');

        grid.innerHTML = slotPills + `
            <div style="width: 100%; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #f0f0f0; display: flex; gap: 0.5rem; align-items: center;">
                <input type="text" id="newSlotInput" placeholder="e.g. 2PM-2:30PM"
                    style="flex: 1; padding: 0.5rem 0.9rem; border: 1.5px solid #e4e4e7; border-radius: 20px; font-family: 'Outfit'; font-size: 0.88rem; outline: none; color: #111;"
                    onfocus="this.style.borderColor='#22c55e'" onblur="this.style.borderColor='#e4e4e7'"
                    onkeydown="if(event.key==='Enter'){event.preventDefault();addSlotItem(${index});}">
                <button type="button" onclick="addSlotItem(${index})"
                    style="padding: 0.5rem 1rem; border-radius: 20px; border: 1.5px solid #22c55e; background: rgba(34,197,94,0.1); color: #16a34a; font-size: 0.85rem; cursor: pointer; font-family: 'Outfit'; white-space: nowrap;">
                    + Add slot
                </button>
            </div>`;
    }
};

window.toggleItem = (optIndex, itemLabel) => {
    const enabled = window._toggleStates[optIndex] || new Set();
    if (enabled.has(itemLabel)) {
        enabled.delete(itemLabel);
    } else {
        enabled.add(itemLabel);
    }
    window._toggleStates[optIndex] = enabled;
    renderShopifyToggleGrid();
};

window.deleteSlotItem = (optIndex, itemLabel) => {
    const opt = window.currentOptionsList[optIndex];
    opt.allItems = opt.allItems.filter(d => d.label !== itemLabel);
    const enabled = window._toggleStates[optIndex] || new Set();
    enabled.delete(itemLabel);
    window._toggleStates[optIndex] = enabled;
    renderShopifyToggleGrid();
};

window.addSlotItem = (optIndex) => {
    const input = document.getElementById('newSlotInput');
    const val = input ? input.value.trim() : '';
    if (!val) return;
    const opt = window.currentOptionsList[optIndex];
    // Don't add duplicates
    if (opt.allItems.some(d => d.label === val)) {
        input.value = '';
        return;
    }
    opt.allItems.push({ label: val, isMonday: false, isPast: false });
    const enabled = window._toggleStates[optIndex] || new Set();
    enabled.add(val); // new slots start enabled
    window._toggleStates[optIndex] = enabled;
    input.value = '';
    renderShopifyToggleGrid();
};

window.setAllToggles = (on) => {
    const index = window.editingOptionIndex;
    const opt = window.currentOptionsList[index];
    if (on) {
        // Enable all non-past items (but keep Mondays disabled unless explicitly enabling all)
        window._toggleStates[index] = new Set(opt.allItems.filter(d => !d.isPast).map(d => d.label));
    } else {
        window._toggleStates[index] = new Set();
    }
    renderShopifyToggleGrid();
};

window.saveShopifyOption = () => {
    const serialized = serializeOptions();
    document.getElementById('productOptionsData').value = JSON.stringify(serialized);
    renderShopifyOptionsList();
    if(window.populateExceptionDropdowns) window.populateExceptionDropdowns();
    closeShopifyOptionModal();
};

window.initShopifyOptions = (optsJsonStr) => {
    initOptionsFromDB(optsJsonStr);
    document.getElementById('productOptionsData').value = JSON.stringify(serializeOptions());
    renderShopifyOptionsList();
    if(window.populateExceptionDropdowns) window.populateExceptionDropdowns();
    if(window.renderSlotExceptionsList) window.renderSlotExceptionsList();
};
window.renderSlotExceptionsList = () => {
    const list = document.getElementById('slotExceptionsList');
    if (!list) return;
    
    if (!window._slotExceptions || window._slotExceptions.length === 0) {
        list.innerHTML = '<span style="font-size: 0.8rem; color: var(--muted);">No exceptions added.</span>';
        return;
    }
    
    list.innerHTML = window._slotExceptions.map((ex, i) => {
        const parts = ex.split('|');
        const date = parts[0];
        const slot = parts[1];
        return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 6px;">
            <div style="font-size: 0.85rem; color: #fff;">
                <span style="color: var(--gold); font-weight: 500;">${date}</span> &mdash; ${slot}
            </div>
            <button type="button" onclick="removeSlotException(${i})" style="background: transparent; border: none; color: var(--red); font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; height: 24px; width: 24px;">✕</button>
        </div>
        `;
    }).join('');
};

window.populateExceptionDropdowns = () => {
    const dateSelect = document.getElementById('exceptionDateSelect');
    const slotSelect = document.getElementById('exceptionSlotSelect');
    if (!dateSelect || !slotSelect) return;
    
    const datesState = window._toggleStates[0] || new Set();
    const slotsState = window._toggleStates[1] || new Set();
    
    dateSelect.innerHTML = [...datesState].map(d => `<option value="${d}">${d}</option>`).join('');
    slotSelect.innerHTML = [...slotsState].map(s => `<option value="${s}">${s}</option>`).join('');
};

window.addSlotException = () => {
    const dateVal = document.getElementById('exceptionDateSelect').value;
    const slotVal = document.getElementById('exceptionSlotSelect').value;
    if (!dateVal || !slotVal) return alert('Select both a date and a slot.');
    
    const exStr = `${dateVal}|${slotVal}`;
    if (!window._slotExceptions) window._slotExceptions = [];
    if (window._slotExceptions.includes(exStr)) return alert('This exception is already added.');
    
    window._slotExceptions.push(exStr);
    window.renderSlotExceptionsList();
    document.getElementById('productOptionsData').value = JSON.stringify(serializeOptions());
};

window.removeSlotException = (index) => {
    if (!window._slotExceptions) return;
    window._slotExceptions.splice(index, 1);
    window.renderSlotExceptionsList();
    document.getElementById('productOptionsData').value = JSON.stringify(serializeOptions());
};

