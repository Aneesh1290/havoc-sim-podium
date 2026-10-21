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
    if (typeof loadInventoryReport === 'function') {
        loadInventoryReport();
    }
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
    
    const groupedMap = new Map();
    bookingsToRender.forEach(b => {
        // Multi-item bookings have order_id ending in _0, _1, etc.
        // Formats:
        // New: PAYDUE_SP_40 or PAYDUE_SP_40_0, PAID_SP_40 or PAID_SP_40_0
        // Old: PAYDUE_18OCT26_39 or PAYDUE_18OCT26_39_0
        let baseId = b.order_id || '';
        const parts = baseId.split('_');
        if (parts[1] === 'SP' && parts.length >= 4) {
            baseId = parts.slice(0, 3).join('_');
        } else if (parts.length >= 4) {
            baseId = parts.slice(0, 3).join('_');
        }
        if (!groupedMap.has(baseId)) {
            groupedMap.set(baseId, {
                order_id: baseId,
                name: b.name,
                email: b.email,
                phone: b.phone,
                status: b.status,
                created_at: b.created_at,
                items: [],
                total_price: 0,
                booking_date: b.booking_date,
                booking_time: b.booking_time
            });
        }
        const g = groupedMap.get(baseId);
        g.items.push(b);
        g.total_price += (b.price || 0);
    });
    
    const groupedArray = Array.from(groupedMap.values());
    
    if (countHeader) countHeader.textContent = groupedArray.length;
    if (countToolbar) countToolbar.textContent = `(${groupedArray.length})`;

    groupedArray.forEach(b => {
        const itemStatuses = b.items.map(i => (i.status || '').toUpperCase());
        const hasAttended = itemStatuses.some(s => s === 'ATTENDED');
        const hasPaid = itemStatuses.some(s => s === 'PAID' || s === 'SUCCESS');
        const hasPending = itemStatuses.some(s => s === 'PENDING');
        const allCancelled = itemStatuses.length > 0 && itemStatuses.every(s => s === 'CANCELLED' || s === 'REFUNDED' || s === 'FAILED');

        let paymentBadge = 'PAID';
        let fulfillBadge = 'UNFULFILLED';

        if (allCancelled) {
            paymentBadge = 'REFUNDED';
            fulfillBadge = 'CANCELED';
        } else if (hasAttended) {
            paymentBadge = 'PAID';
            fulfillBadge = 'FULFILLED';
        } else if (hasPaid) {
            paymentBadge = 'PAID';
            fulfillBadge = 'UNFULFILLED';
        } else if (hasPending) {
            paymentBadge = 'UNPAID';
            fulfillBadge = 'UNFULFILLED';
        }
        
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
        
        let itemNameDisplay = b.items.length > 1 ? `${b.items.length} Items` : (b.items[0].item_name || 'Simulator');
        let dateDisplay = b.items.length > 1 ? 'Multiple Dates' : dateFormatted;
        let timeDisplay = b.items.length > 1 ? 'Multiple Times' : timeFormatted;

        const tr = document.createElement('tr');
        tr.setAttribute('data-order-id', b.order_id);
        tr.style.cursor = 'pointer';
        tr.onclick = (e) => {
            // Prevent opening details if clicking on actions dropdown or delete or checkbox
            if(e.target.closest('.custom-dropdown') || e.target.closest('.btn-delete') || e.target.type === 'checkbox') return;
            openOrderDetails(b.order_id);
        };
        let placedDateObj = new Date();
        const firstCreated = b.items[0]?.created_at;
        if(firstCreated) {
            if (firstCreated instanceof Date) {
                placedDateObj = firstCreated;
            } else if (typeof firstCreated === 'string') {
                let dStr = firstCreated;
                if(!dStr.includes('Z') && !dStr.includes('T')) dStr = dStr.replace(' ', 'T') + 'Z';
                placedDateObj = new Date(dStr);
            } else {
                placedDateObj = new Date(firstCreated);
            }
        }
        else if(b.items[0]?.booking_date) {
            placedDateObj = new Date(b.items[0].booking_date);
        }
        
        if (isNaN(placedDateObj.getTime())) placedDateObj = new Date();
        const placedDateStr = placedDateObj.toLocaleString('en-US', {month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit'});

        tr.innerHTML = `
            <td>
                <input type="checkbox" class="row-checkbox" value="${b.order_id}" onclick="toggleBookingSelection(event, '${b.order_id}')">
            </td>
            <td style="font-weight: 500; font-size: 0.85rem; color: var(--muted);">#${b.order_id}</td>
            <td style="color: var(--muted); font-size: 0.85rem;">${placedDateStr}</td>
            <td>
                <div style="font-weight: 500; font-size: 0.85rem; color: var(--muted);">${b.name}</div>
            </td>
            <td>
                <span class="badge ${getBadgeClass(paymentBadge)}" style="margin-left:0; padding: 0.2rem 0.6rem; font-size: 0.75rem;">${paymentBadge.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</span>
            </td>
            <td>
                <span class="badge ${getBadgeClass(fulfillBadge)}" style="margin-left:0; padding: 0.2rem 0.6rem; font-size: 0.75rem;">${fulfillBadge.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</span>
            </td>
            <td style="color: var(--muted); font-size: 0.85rem;">₹${b.total_price.toFixed(2)}</td>
            <td style="color: #60a5fa; font-size: 0.85rem;">
                ${b.items.length} 
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: 2px; vertical-align: middle;">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </td>
            <td></td>
            <td style="width: 60px;"></td>
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

    // Group bookings by baseOrderId so we count actual orders and their total prices
    const orderMap = new Map();
    bookings.forEach(b => {
        let baseId = b.order_id || '';
        const parts = baseId.split('_');
        if (parts[1] === 'SP' && parts.length >= 4) {
            baseId = parts.slice(0, 3).join('_');
        } else if (parts.length >= 4) {
            baseId = parts.slice(0, 3).join('_');
        }
        if (!orderMap.has(baseId)) {
            orderMap.set(baseId, {
                order_id: baseId,
                status: b.status,
                created_at: b.created_at,
                booking_date: b.booking_date,
                total_price: 0
            });
        }
        orderMap.get(baseId).total_price += (parseFloat(b.price) || 0);
    });

    orderMap.forEach(order => {
        if (order.status === 'CANCELLED' || order.status === 'REFUNDED') return;
        
        let dateStr = order.created_at || order.booking_date || '';
        if (dateStr.includes(' ')) {
            dateStr = dateStr.replace(' ', 'T');
        }
        const d = new Date(dateStr);
        
        if (!d || isNaN(d.getTime())) return;
        
        if (d >= currentPeriodStart) {
            currentOrders++;
            currentSales += order.total_price;
        } else if (days !== 'all' && d >= prevPeriodStart && d < currentPeriodStart) {
            prevOrders++;
            prevSales += order.total_price;
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
    const view = document.getElementById('order-details-view');
    if (view) {
        view.classList.remove('active');
        view.style.display = 'none';
        view.innerHTML = '';
    }
    const tab = document.getElementById('tab-bookings');
    if (tab) tab.style.display = '';
};

window.openOrderDetails = (baseOrderId) => {
    try {
        const view = document.getElementById('order-details-view');
        const tab = document.getElementById('tab-bookings');
        if (!view) {
            console.error('order-details-view element not found in DOM');
            return;
        }

        const items = (window.allBookings || []).filter(b => {
            let base = b.order_id || '';
            const parts = base.split('_');
            if (parts[1] === 'SP' && parts.length >= 4) {
                base = parts.slice(0, 3).join('_');
            } else if (parts.length >= 4) {
                base = parts.slice(0, 3).join('_');
            }
            return base === baseOrderId;
        });

        if (!items.length) {
            console.warn('No items found for order:', baseOrderId);
            return;
        }

        const order = items[0];

        const itemStatuses = items.map(i => (i.status || '').toUpperCase());
        const hasAttended = itemStatuses.some(s => s === 'ATTENDED');
        const hasPaid = itemStatuses.some(s => s === 'PAID' || s === 'SUCCESS');
        const hasPending = itemStatuses.some(s => s === 'PENDING');
        const allCancelled = itemStatuses.length > 0 && itemStatuses.every(s => s === 'CANCELLED' || s === 'REFUNDED' || s === 'FAILED');

        let paymentBadge = 'PAID';
        let fulfillBadge = 'UNFULFILLED';

        if (allCancelled) {
            paymentBadge = 'REFUNDED';
            fulfillBadge = 'CANCELED';
        } else if (hasAttended) {
            paymentBadge = 'PAID';
            fulfillBadge = 'FULFILLED';
        } else if (hasPaid) {
            paymentBadge = 'PAID';
            fulfillBadge = 'UNFULFILLED';
        } else if (hasPending) {
            paymentBadge = 'UNPAID';
            fulfillBadge = 'UNFULFILLED';
        }

        const getBadgeClass = (text) => {
            if (text === 'PAID') return 'badge-paid';
            if (text === 'UNPAID') return 'badge-pending';
            if (text === 'FULFILLED') return 'badge-attended';
            if (text === 'UNFULFILLED') return 'badge-pending';
            if (text === 'CANCELED' || text === 'REFUNDED') return 'badge-cancelled';
            return 'badge-pending';
        };

        const totalAmount = items.reduce((sum, b) => sum + (parseFloat(b.price) || 0), 0);
        const priceFormatted = totalAmount.toFixed(2);
        const baseCostFormatted = (totalAmount / 1.18).toFixed(2);
        const taxFormatted = (totalAmount - (totalAmount / 1.18)).toFixed(2);
        const isPending = paymentBadge === 'UNPAID';
        
        // Fallback date
        let placedDateObj = new Date();
        const rawCreated = order.created_at || order.booking_date;
        if (rawCreated) {
            if (rawCreated instanceof Date) {
                placedDateObj = rawCreated;
            } else if (typeof rawCreated === 'string') {
                let dStr = rawCreated;
                if (!dStr.includes('Z') && !dStr.includes('T')) dStr = dStr.replace(' ', 'T') + 'Z';
                placedDateObj = new Date(dStr);
            } else {
                placedDateObj = new Date(rawCreated);
            }
        }
        if (isNaN(placedDateObj.getTime())) placedDateObj = new Date();
        const placedDateStr = placedDateObj.toLocaleString('en-US', {month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit'});
        
        let itemsHtml = '';
        items.forEach(item => {
            const itemPriceNum = parseFloat(item.price) || 0;
            const itemBaseCost = (itemPriceNum / 1.18).toFixed(2);
            itemsHtml += `
                <div class="od-item-row">
                    <div style="display: flex; gap: 1rem;">
                        <div>
                            <div style="font-weight: 600; display:flex; align-items:center; gap:0.5rem; flex-wrap: wrap;">
                                ${item.item_name || 'Simulator'}
                                ${Number(item.players) === 2 ? `<span style="background:rgba(229,184,105,0.15); color:var(--gold); border:1px solid rgba(229,184,105,0.35); font-size:0.65rem; padding:0.15rem 0.5rem; border-radius:12px; font-weight:600; display:inline-flex; align-items:center; gap:3px;">👥 2 Players (Combo)</span>` : ''}
                                <span class="od-badge ${getBadgeClass(paymentBadge)}" style="font-size: 0.6rem; padding: 0.1rem 0.4rem; margin-left: 0;">${paymentBadge}</span>
                                <span class="od-badge ${getBadgeClass(fulfillBadge)}" style="font-size: 0.6rem; padding: 0.1rem 0.4rem; margin-left: 0;">${fulfillBadge}</span>
                            </div>
                            ${item.player_two_name ? `<div style="font-size: 0.8rem; color: #aaa; margin-top: 0.2rem;">Co-Player (P2): <strong style="color:#fff;">${item.player_two_name}</strong></div>` : ''}
                            <div style="font-size: 0.8rem; color: var(--muted); margin-top: 0.3rem;">Select Date: ${item.booking_date || '-'}</div>
                            <div style="font-size: 0.8rem; color: var(--muted);">Select Time Slot: ${item.booking_time || '-'}</div>
                            ${item.instructor_name ? `<div style="font-size: 0.8rem; color: var(--gold); margin-top: 0.3rem; font-weight: 500;">Assigned Instructor: ${item.instructor_name}</div>` : ''}
                        </div>
                    </div>
                    <div style="display: flex; gap: 2rem; align-items: center;">
                        <span style="color: var(--muted);">₹${itemBaseCost}</span>
                        <span style="color: var(--muted);">X 1</span>
                        <span style="font-weight: 600;">₹${itemBaseCost}</span>
                    </div>
                </div>
            `;
        });

        const duoItem = items.find(i => i.player_two_name);

        view.innerHTML = `
    <div class="od-breadcrumb" onclick="closeOrderDetails()" style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
        <span style="color: #60a5fa; font-weight: 500;">← Back to Bookings</span>
        <span style="color: var(--muted);">/ Order #${baseOrderId}</span>
    </div>
    <div class="od-header">
        <div class="od-title-area">
            <h2>Order #${baseOrderId}</h2>
            <span class="od-badge ${getBadgeClass(paymentBadge)}">${paymentBadge}</span>
            <span class="od-badge ${getBadgeClass(fulfillBadge)}">${fulfillBadge}</span>
            <div class="od-date">Placed on ${placedDateStr}</div>
        </div>
        <div class="od-actions">
            <div class="custom-dropdown">
                <button class="btn-secondary" onclick="togglePaymentDropdown('${baseOrderId}', 'more', event)">More Actions ˅</button>
                <div class="custom-dropdown-menu" id="pay-menu-more-${baseOrderId}" style="right:0; left:auto; min-width: 240px; background: #1c1c21;">
                    <div class="custom-dropdown-item" onclick="markOrderAsFulfilled('${baseOrderId}')">✓ Mark as fulfilled</div>
                    <div class="custom-dropdown-item" onclick="markOrderAsUnfulfilled('${baseOrderId}')">✗ Mark as unfulfilled</div>
                    <div class="custom-dropdown-item" onclick="cancelOrder('${baseOrderId}')">✗ Cancel order</div>
                    ${paymentBadge !== 'REFUNDED' && (paymentBadge === 'PAID' || fulfillBadge === 'ATTENDED') ? `
                    <div class="custom-dropdown-item" style="color: #ef4444; border-top: 1px solid rgba(255,255,255,0.08);" onclick="refundOrder('${baseOrderId}', '${priceFormatted}')">💸 Refund Payment (ICICI)</div>
                    ` : ''}
                </div>
            </div>
            <div class="custom-dropdown">
                <button class="btn-blue" onclick="togglePaymentDropdown('${baseOrderId}', 'header', event)">Collect Payment ˅</button>
                <div class="custom-dropdown-menu" id="pay-menu-header-${baseOrderId}" style="right:0; left:auto; min-width: 200px;">
                    <div class="custom-dropdown-item" onclick="markOrderAsPaid('${baseOrderId}')">✓ Mark as paid</div>
                    <div class="custom-dropdown-item" onclick="markOrderAsUnpaid('${baseOrderId}')">✗ Mark as unpaid</div>
                </div>
            </div>
        </div>
    </div>

    <div class="od-grid">
        <!-- LEFT COL -->
        <div>
            <div class="od-card">
                <div class="od-card-title">Items (${items.length})</div>
                ${itemsHtml}
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
                <div class="od-card-title">Order info</div>
                
                <div class="od-info-group">
                    <div class="od-info-label">Contact info</div>
                    <div class="od-info-value" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <div style="width: 24px; height: 24px; background: #60a5fa; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700;">${(order.name || '?').charAt(0).toUpperCase()}</div>
                        <span style="color: #60a5fa;">${order.name || 'Customer'}</span>
                    </div>
                    <div class="od-info-value">${order.email || 'No email'}</div>
                    <div class="od-info-value">${order.phone || 'No phone'}</div>
                    <div style="margin-top: 0.5rem; display: flex; align-items: center; gap: 6px; font-size: 0.78rem;">
                        ${order.whatsapp_consent === 0 ? `
                        <span style="color: #ef4444; display: inline-flex; align-items: center; gap: 4px;">✕ WhatsApp Promo: <strong>Opted Out</strong></span>
                        ` : `
                        <span style="color: #22c55e; display: inline-flex; align-items: center; gap: 4px;">✓ WhatsApp Promo: <strong>Consent Given</strong></span>
                        `}
                    </div>
                    ${items.some(i => Number(i.players) === 2 || i.player_two_name) ? `
                    <div style="margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px dashed rgba(255,255,255,0.1);">
                        <div class="od-info-label" style="color: var(--gold); display: flex; align-items: center; gap: 4px;">👥 2-Player Pass (Multiplayer)</div>
                        ${duoItem ? `<div style="font-size:0.85rem; color:#fff; margin-top:0.2rem;">Player 2: <strong>${duoItem.player_two_name}</strong></div>` : `<div style="font-size:0.8rem; color:#aaa; margin-top:0.2rem;">Duo entry permitted (2 participants)</div>`}
                    </div>` : ''}
                </div>
            </div>

            <div class="od-card">
                <div class="od-card-title">Tags</div>
                <button style="width: 100%; padding: 0.75rem; background: transparent; border: 1px dashed rgba(255,255,255,0.2); border-radius: 8px; color: #60a5fa; font-family: 'Outfit'; cursor: pointer; text-align: left;">+ Assign Tags</button>
            </div>
        </div>
    </div>
        `;

        if (tab) tab.style.display = 'none';
        view.classList.add('active');
        view.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
        console.error('Error rendering order details for:', baseOrderId, err);
        const tab = document.getElementById('tab-bookings');
        if (tab) tab.style.display = '';
        alert('Could not open order details: ' + err.message);
    }
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

window.refundOrder = async (orderId, totalAmount) => {
    document.querySelectorAll('.custom-dropdown-menu.open').forEach(m => m.classList.remove('open'));
    const inputAmount = prompt(`Enter amount to refund for Order #${orderId} (leave as ${totalAmount} for full refund):`, totalAmount);
    if (!inputAmount) return; // user cancelled prompt

    const amountNum = parseFloat(inputAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
        alert('Please enter a valid refund amount.');
        return;
    }

    if (!confirm(`Are you sure you want to refund ₹${amountNum.toFixed(2)} to the customer via ICICI Bank PG? This action cannot be undone.`)) {
        return;
    }

    try {
        const res = await fetchAuth(`/api/admin/bookings/${encodeURIComponent(orderId)}/refund`, {
            method: 'POST',
            body: JSON.stringify({ amount: amountNum })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            alert(`✅ Refund of ₹${amountNum.toFixed(2)} processed successfully!\nRefund Txn ID: ${data.refundTxnNo || 'N/A'}`);
            await loadBookings();
            const view = document.getElementById('order-details-view');
            if (view && view.classList.contains('active')) openOrderDetails(orderId);
        } else {
            alert(`❌ Refund Failed: ${data.error || 'Unknown error from payment gateway'}`);
        }
    } catch (err) {
        alert('Could not communicate with refund server: ' + err.message);
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
                
                // View-only mode for availability slots (no walk-in popup)
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
// BLOCK / DISABLE SLOTS CONTROLLER LOGIC
// ==========================================

let currentBlockScope = 'specific_slot'; // 'specific_slot' | 'entire_day' | 'slot_all_dates'
let selectedBlockSlots = [];
let allBlockedSlotsCache = [];

window.switchAvailSubTab = (tab) => {
    const tabSched = document.getElementById('availSubTabSchedule');
    const tabBlock = document.getElementById('availSubTabBlock');
    const viewSched = document.getElementById('availViewSchedule');
    const viewBlock = document.getElementById('availViewBlock');

    if (tab === 'schedule') {
        if (tabSched) {
            tabSched.style.background = 'rgba(229,184,105,0.15)';
            tabSched.style.color = 'var(--gold)';
            tabSched.style.border = '1px solid rgba(229,184,105,0.4)';
            tabSched.style.fontWeight = '600';
        }
        if (tabBlock) {
            tabBlock.style.background = 'transparent';
            tabBlock.style.color = 'var(--muted)';
            tabBlock.style.border = '1px solid transparent';
            tabBlock.style.fontWeight = 'normal';
        }
        if (viewSched) viewSched.style.display = 'block';
        if (viewBlock) viewBlock.style.display = 'none';
        loadAvailability();
    } else {
        if (tabBlock) {
            tabBlock.style.background = 'rgba(229,184,105,0.15)';
            tabBlock.style.color = 'var(--gold)';
            tabBlock.style.border = '1px solid rgba(229,184,105,0.4)';
            tabBlock.style.fontWeight = '600';
        }
        if (tabSched) {
            tabSched.style.background = 'transparent';
            tabSched.style.color = 'var(--muted)';
            tabSched.style.border = '1px solid transparent';
            tabSched.style.fontWeight = 'normal';
        }
        if (viewSched) viewSched.style.display = 'none';
        if (viewBlock) viewBlock.style.display = 'block';
        initBlockSlotForm();
        loadBlockedSlotsList();
    }
};

window.handleBlockScopeChange = (scope) => {
    currentBlockScope = scope;

    const cardSpecific = document.getElementById('blockScopeCardSpecific');
    const cardDay = document.getElementById('blockScopeCardDay');
    const cardRecurring = document.getElementById('blockScopeCardRecurring');

    [cardSpecific, cardDay, cardRecurring].forEach(c => {
        if (!c) return;
        c.style.border = '1px solid var(--border)';
        c.style.background = 'rgba(255,255,255,0.02)';
    });

    if (scope === 'specific_slot' && cardSpecific) {
        cardSpecific.style.border = '1px solid var(--gold)';
        cardSpecific.style.background = 'rgba(229,184,105,0.08)';
    } else if (scope === 'entire_day' && cardDay) {
        cardDay.style.border = '1px solid var(--gold)';
        cardDay.style.background = 'rgba(229,184,105,0.08)';
    } else if (scope === 'slot_all_dates' && cardRecurring) {
        cardRecurring.style.border = '1px solid var(--gold)';
        cardRecurring.style.background = 'rgba(229,184,105,0.08)';
    }

    const dateRow = document.getElementById('blockDateRow');
    const slotsSection = document.getElementById('blockSlotsSection');

    if (scope === 'entire_day') {
        if (dateRow) dateRow.style.display = 'block';
        if (slotsSection) slotsSection.style.display = 'none';
    } else if (scope === 'slot_all_dates') {
        if (dateRow) dateRow.style.display = 'none';
        if (slotsSection) slotsSection.style.display = 'block';
    } else {
        if (dateRow) dateRow.style.display = 'block';
        if (slotsSection) slotsSection.style.display = 'block';
    }
};

window.initBlockSlotForm = () => {
    const dateSelect = document.getElementById('blockDateSelect');
    if (dateSelect && dateSelect.options.length === 0) {
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
            dateSelect.appendChild(option);
        }
    }

    renderBlockSlotsGrid();
};

window.renderBlockSlotsGrid = () => {
    const grid = document.getElementById('blockSlotsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    TIME_SLOTS.forEach(slot => {
        const isSelected = selectedBlockSlots.includes(slot);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.onclick = () => toggleBlockSlot(slot);
        btn.style.padding = '0.6rem 0.4rem';
        btn.style.borderRadius = '8px';
        btn.style.border = isSelected ? '1px solid #ef4444' : '1px solid var(--border)';
        btn.style.background = isSelected ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.03)';
        btn.style.color = isSelected ? '#ef4444' : '#fff';
        btn.style.cursor = 'pointer';
        btn.style.display = 'flex';
        btn.style.flexDirection = 'column';
        btn.style.alignItems = 'center';
        btn.style.gap = '2px';
        btn.style.fontSize = '0.78rem';
        btn.style.fontWeight = '700';

        btn.innerHTML = `
            <span>${slot}</span>
            <span style="font-size: 0.65rem; text-transform: uppercase; color: ${isSelected ? '#f87171' : 'var(--muted)'}; font-weight: 600;">
                ${isSelected ? 'Selected' : 'Available'}
            </span>
        `;
        grid.appendChild(btn);
    });

    updateBlockSelectedCount();
};

window.toggleBlockSlot = (slot) => {
    if (selectedBlockSlots.includes(slot)) {
        selectedBlockSlots = selectedBlockSlots.filter(s => s !== slot);
    } else {
        selectedBlockSlots.push(slot);
    }
    renderBlockSlotsGrid();
};

window.selectAllBlockSlots = () => {
    selectedBlockSlots = [...TIME_SLOTS];
    renderBlockSlotsGrid();
};

window.clearBlockSlots = () => {
    selectedBlockSlots = [];
    renderBlockSlotsGrid();
};

function updateBlockSelectedCount() {
    const el = document.getElementById('blockSelectedCountText');
    if (el) {
        el.textContent = `${selectedBlockSlots.length} slot${selectedBlockSlots.length !== 1 ? 's' : ''}`;
    }
}

window.submitBlockSlots = async (e) => {
    e.preventDefault();

    const simSelect = document.getElementById('blockSimulatorSelect');
    const simName = simSelect ? simSelect.value : 'ALL';
    const dateSelect = document.getElementById('blockDateSelect');
    const reasonInput = document.getElementById('blockReasonInput');
    const reason = reasonInput ? reasonInput.value.trim() : '';

    let booking_date = dateSelect ? dateSelect.value : '';
    let time_slots = [];

    if (currentBlockScope === 'entire_day') {
        time_slots = ['ALL_DAY'];
    } else if (currentBlockScope === 'slot_all_dates') {
        booking_date = 'ALL';
        if (selectedBlockSlots.length === 0) {
            alert('Please select at least 1 slot to block.');
            return;
        }
        time_slots = [...selectedBlockSlots];
    } else {
        // specific_slot
        if (selectedBlockSlots.length === 0) {
            alert('Please select at least 1 slot to block.');
            return;
        }
        time_slots = [...selectedBlockSlots];
    }

    const btn = document.getElementById('blockSubmitBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>Blocking Slots...</span>';
    }

    try {
        const res = await fetchAuth('/api/admin/blocked-slots', {
            method: 'POST',
            body: JSON.stringify({
                simulator_name: simName,
                booking_date,
                time_slots,
                reason
            })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Failed to block slots');
        }

        alert('✓ Selected slots/dates have been blocked successfully!');
        if (reasonInput) reasonInput.value = '';
        selectedBlockSlots = [];
        renderBlockSlotsGrid();
        loadBlockedSlotsList();

    } catch (err) {
        console.error('Error blocking slot:', err);
        alert('Error: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>🚫</span><span>CONFIRM & BLOCK SLOT(S)</span>';
        }
    }
};

window.loadBlockedSlotsList = async () => {
    const container = document.getElementById('blockedSlotsItemsContainer');
    const countEl = document.getElementById('blockedListCount');
    if (!container) return;

    container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 3rem 0;">Loading blocked slots...</div>';

    try {
        const res = await fetchAuth('/api/admin/blocked-slots');
        const list = await res.json();
        allBlockedSlotsCache = list || [];
        if (countEl) countEl.textContent = allBlockedSlotsCache.length;
        renderFilteredBlockedSlots(allBlockedSlotsCache);
    } catch (err) {
        console.error('Failed to load blocked slots:', err);
        container.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 2rem 0;">Failed to load blocked slots.</div>';
    }
};

window.filterBlockedSlotsList = () => {
    const q = (document.getElementById('blockedSearchInput')?.value || '').toLowerCase().trim();
    if (!q) {
        renderFilteredBlockedSlots(allBlockedSlotsCache);
        return;
    }
    const filtered = allBlockedSlotsCache.filter(item => {
        return (item.booking_date || '').toLowerCase().includes(q) ||
               (item.time_slot || '').toLowerCase().includes(q) ||
               (item.simulator_name || '').toLowerCase().includes(q) ||
               (item.reason || '').toLowerCase().includes(q);
    });
    renderFilteredBlockedSlots(filtered);
};

function renderFilteredBlockedSlots(list) {
    const container = document.getElementById('blockedSlotsItemsContainer');
    if (!container) return;

    if (!list || list.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3.5rem 1rem; color: var(--muted); border: 1px dashed var(--border); border-radius: 14px;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">✓</div>
                <div style="font-weight: 700; color: #fff; font-size: 1rem;">No Blocked Slots Found</div>
                <p style="font-size: 0.8rem; margin: 4px 0 0; color: var(--muted);">All operating slots are open for customer booking.</p>
            </div>
        `;
        return;
    }

    let html = '';
    list.forEach(item => {
        const isAllDay = item.time_slot === 'ALL_DAY';
        const isAllDates = item.booking_date === 'ALL';
        const simLabel = (item.simulator_name && item.simulator_name !== 'ALL') ? item.simulator_name : 'All Simulators';

        let dateDisplay = isAllDates ? 'All Dates (Recurring)' : item.booking_date;
        let slotDisplay = isAllDay ? 'Entire Day Locked' : item.time_slot;

        html += `
            <div style="padding: 1rem 1.2rem; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0;">
                        ⏰
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span style="font-weight: 700; color: #fff; font-size: 0.95rem;">${dateDisplay}</span>
                            <span style="background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); border-radius: 10px; font-size: 0.72rem; font-weight: 700; padding: 2px 8px;">
                                ${slotDisplay}
                            </span>
                            <span style="background: rgba(229,184,105,0.12); color: var(--gold); border-radius: 10px; font-size: 0.7rem; font-weight: 600; padding: 2px 7px;">
                                ${simLabel}
                            </span>
                        </div>
                        <div style="font-size: 0.8rem; color: #aaa; margin-top: 3px;">
                            ${item.reason ? `<em>"${item.reason}"</em>` : '<span style="color:var(--muted)">No reason specified</span>'}
                        </div>
                    </div>
                </div>

                <button type="button" onclick="unblockSlotItem(${item.id})" style="background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; padding: 0.45rem 0.9rem; font-size: 0.8rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                    <span>🗑️</span> Unblock
                </button>
            </div>
        `;
    });

    container.innerHTML = html;
}

window.unblockSlotItem = async (id) => {
    if (!confirm('Are you sure you want to unblock this slot/date and make it available for booking again?')) return;

    try {
        const res = await fetchAuth(`/api/admin/blocked-slots/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            loadBlockedSlotsList();
        } else {
            alert(data.error || 'Failed to unblock slot');
        }
    } catch (err) {
        alert('Network error unblocking slot: ' + err.message);
    }
};

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
    const currentVal = select.value;
    if (select.options && select.options.length > 1 && currentVal) {
        // Already populated, preserve existing selection
        return;
    }
    select.innerHTML = '';

    // "All Time" option
    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'All Time';
    select.appendChild(allOpt);

    // Generate past 3 months through next 6 months
    const now = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    for (let i = -3; i <= 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        if (currentVal ? val === currentVal : i === 0) {
            opt.selected = true;
        }
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
// Helper to toggle create account permissions box
window.togglePermBoxes = function(role) {
    const box = document.getElementById('staffPermissionsBox');
    if (box) box.style.display = role === 'super_admin' ? 'none' : 'block';
};

// Map of permission keys to labels and navigation selectors
const PERMISSION_CONFIG = [
    { key: 'bookings', label: '📅 Bookings', navId: 'tab-bookings' },
    { key: 'payment_links', label: '🔗 Payment Links', navId: 'tab-payment-links' },
    { key: 'inventory_matrix', label: '📦 Inventory', navId: 'tab-inventory-matrix' },
    { key: 'availability', label: '📅 Availability', navId: 'tab-availability' },
    { key: 'block_slots', label: '🛡️ Block Slots', navId: 'nav-block-slots' },
    { key: 'coupons', label: '🎟️ Coupons', navId: 'nav-coupons' },
    { key: 'instructors', label: '🎓 Instructors', navId: 'nav-instructors' },
    { key: 'products', label: '📦 Products', navId: 'nav-inventory' },
    { key: 'newsletter', label: '📧 Newsletter', navId: 'nav-newsletter' },
    { key: 'settings', label: '⚙️ Settings', navId: 'nav-settings' }
];

async function loadStaff() {
    const tbody = document.getElementById('staffTableBody');
    const res = await fetchAuth('/api/admin/users');
    const users = await res.json();

    tbody.innerHTML = '';
    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No staff accounts</td></tr>';
        return;
    }

    users.forEach(u => {
        const tr = document.createElement('tr');
        const isMainAdmin = u.username === 'admin';
        const isSuperAdmin = u.role === 'super_admin';
        const currentPerms = (u.permissions || 'bookings,availability').split(',').map(p => p.trim());

        let permsHtml = '';
        if (isMainAdmin || isSuperAdmin) {
            permsHtml = `<span style="color:var(--gold); font-size:0.8rem; font-weight:700; background:rgba(229,184,105,0.12); padding:4px 10px; border-radius:20px; border:1px solid rgba(229,184,105,0.3);">✨ Full Access (All Tabs)</span>`;
        } else {
            permsHtml = `
                <div style="display:flex; flex-wrap:wrap; gap:0.4rem; max-width:420px;">
                    ${PERMISSION_CONFIG.map(p => {
                        const isChecked = currentPerms.includes(p.key);
                        return `
                            <label style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:6px; border:1px solid ${isChecked ? 'rgba(229,184,105,0.4)' : 'rgba(255,255,255,0.1)'}; color:${isChecked ? '#fff' : 'var(--muted)'}; cursor:pointer;">
                                <input type="checkbox" onchange="toggleUserPerm(${u.id}, '${u.username}', '${p.key}', this.checked)" ${isChecked ? 'checked' : ''}>
                                ${p.label}
                            </label>
                        `;
                    }).join('')}
                </div>
            `;
        }

        tr.innerHTML = `
            <td style="font-family:monospace; color:rgba(255,255,255,0.6);">${u.id}</td>
            <td style="font-weight:600">
                ${u.username} 
                ${isMainAdmin ? `
                    <span style="color:var(--gold);font-size:0.75rem;margin-left:0.5rem; text-transform:uppercase; font-weight:700;">(Primary)</span>
                ` : `
                    <select onchange="updateStaffRole(${u.id}, '${u.username}', this.value)" style="margin-top:0.3rem; display:block; padding: 0.3rem 0.6rem; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 6px; color: #fff; font-size: 0.75rem; font-weight: 600; outline: none; cursor: pointer;">
                        <option value="staff" style="color: #000;" ${!isSuperAdmin ? 'selected' : ''}>Staff (Custom Access)</option>
                        <option value="super_admin" style="color: #000;" ${isSuperAdmin ? 'selected' : ''}>Super Admin (All Tabs)</option>
                    </select>
                `}
            </td>
            <td>${permsHtml}</td>
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

window.toggleUserPerm = async (id, username, permKey, isChecked) => {
    try {
        const res = await fetchAuth('/api/admin/users');
        const users = await res.json();
        const user = users.find(u => u.id === id);
        if (!user) return;

        let perms = (user.permissions || '').split(',').map(p => p.trim()).filter(Boolean);
        if (isChecked) {
            if (!perms.includes(permKey)) perms.push(permKey);
        } else {
            perms = perms.filter(p => p !== permKey);
        }

        const updateRes = await fetchAuth(`/api/admin/users/${encodeURIComponent(id)}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role: user.role, permissions: perms.join(',') })
        });
        if (updateRes.ok) {
            loadStaff();
        } else {
            alert('Failed to update staff permissions');
        }
    } catch(e) {
        console.error(e);
    }
};

document.getElementById('addStaffForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('staffUsername').value.trim();
    const role = document.getElementById('staffRole').value;
    const password = "sabharwal@65"; // Default password for new accounts

    const selectedPerms = [];
    document.querySelectorAll('input[name="newStaffPerm"]:checked').forEach(cb => {
        selectedPerms.push(cb.value);
    });

    const res = await fetchAuth('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ 
            username, 
            password, 
            role, 
            permissions: role === 'super_admin' ? 'all' : selectedPerms.join(',')
        })
    });

    const data = await res.json();
    if (data.success) {
        document.getElementById('addStaffForm').reset();
        window.togglePermBoxes('staff');
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
        loadStaff();
    } else {
        alert(data.error || 'Failed to update role');
        loadStaff();
    }
};

window.resetStaffPassword = async (id, username) => {
    const customPass = prompt(`Enter new password for '${username}' (Leave blank to use default 'sabharwal@65'):`);
    if (customPass === null) return; // cancelled
    
    const passwordToSet = customPass.trim() || 'sabharwal@65';
    if (passwordToSet.length < 6) {
        alert('Password must be at least 6 characters long.');
        return;
    }

    const res = await fetchAuth(`/api/admin/users/${encodeURIComponent(id)}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: passwordToSet })
    });
    
    const data = await res.json();
    if (res.ok) {
        alert(`Password for '${username}' has been successfully set by Admin.`);
    } else {
        alert(data.error || 'Failed to reset password');
    }
};

// ==========================================
// ROLE & PERMISSIONS BASED ACCESS
// ==========================================
async function checkRole() {
    try {
        const res = await fetchAuth('/api/admin/me');
        const user = await res.json();
        
        const isSuperAdmin = user.username === 'admin' || user.role === 'super_admin';
        const userPerms = (user.permissions || '').split(',').map(p => p.trim());
        
        // Always hide staff management tab for non-superadmins
        const navStaff = document.getElementById('nav-staff');
        if (!isSuperAdmin) {
            if (navStaff) navStaff.style.display = 'none';
        } else {
            loadCoupons();
            loadStaff();
        }

        // Granular sidebar button controls based on assigned permissions
        const tabMappings = {
            'bookings': document.querySelector('.nav-btn[data-target="tab-bookings"]'),
            'payment_links': document.getElementById('nav-payment-links'),
            'inventory_matrix': document.querySelector('.nav-btn[data-target="tab-inventory-matrix"]'),
            'availability': document.querySelector('.nav-btn[data-target="tab-availability"]'),
            'block_slots': document.getElementById('nav-block-slots'),
            'coupons': document.getElementById('nav-coupons'),
            'instructors': document.getElementById('nav-instructors'),
            'products': document.getElementById('nav-inventory'),
            'newsletter': document.getElementById('nav-newsletter'),
            'settings': document.getElementById('nav-settings')
        };

        if (!isSuperAdmin) {
            let firstActive = null;
            Object.keys(tabMappings).forEach(key => {
                const btn = tabMappings[key];
                if (!btn) return;
                const hasAccess = userPerms.includes(key) || user.permissions === 'all';
                if (!hasAccess) {
                    btn.style.display = 'none';
                } else {
                    btn.style.display = 'flex';
                    if (!firstActive) firstActive = btn;
                }
            });

            // If active tab was hidden, auto-select first allowed tab
            const currentActiveBtn = document.querySelector('.nav-btn.active');
            if (currentActiveBtn && currentActiveBtn.style.display === 'none' && firstActive) {
                firstActive.click();
            }
        }
    } catch (e) {
        console.error('Failed to check role', e);
    }
}

// ================= INSTRUCTORS =================
async function loadInstructors() {
    const tbody = document.getElementById('instructorsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Loading instructors...</td></tr>';
    try {
        const res = await fetchAuth('/api/instructors');
        const data = await res.json();
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color: var(--muted);">No instructors found.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(inst => `
            <tr>
                <td>${inst.photo_url ? `<img src="${inst.photo_url}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">` : '<div style="width:40px;height:40px;border-radius:50%;background:#383b4d;"></div>'}</td>
                <td><strong>${inst.name}</strong>${inst.username ? `<br><small style="color:var(--gold); font-weight:600;">@${inst.username}</small>` : ''}</td>
                <td>${inst.email || '-'}</td>
                <td><span class="pill" style="padding:0.25rem 0.5rem; font-size:0.75rem;">${inst.simulator_type || 'All'}</span></td>
                <td>${inst.role || '-'}</td>
                <td><span style="color: var(--gold); font-weight:600;">₹${inst.fee != null ? inst.fee : 500}</span></td>
                <td>
                    <span style="color: ${inst.status === 'Available' ? 'var(--green)' : 'var(--red)'}">${inst.status}</span>
                    ${inst.notice_hours > 0 ? `<div style="font-size: 0.7rem; color: var(--gold); margin-top: 3px; font-weight: 500;">⏱️ ${inst.notice_hours}h Prior</div>` : ''}
                </td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick='editInstructor(${JSON.stringify(inst).replace(/'/g, "&#39;")})'>Edit</button>
                    <button class="btn btn-sm" style="background:rgba(229,184,105,0.15); color:var(--gold); border:1px solid rgba(229,184,105,0.3);" onclick='resetInstructorPassword(${inst.id}, "${(inst.name || "").replace(/'/g, "\\'")}")'>Reset Pw</button>
                    <button class="btn btn-sm" style="background:rgba(248,113,113,0.1); color:var(--red);" onclick="deleteInstructor(${inst.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--red);">Failed to load instructors.</td></tr>';
    }
}

window.showAddInstructorModal = function() {
    document.getElementById('instructorForm').reset();
    document.getElementById('instructorId').value = '';
    const usernameInput = document.getElementById('instructorUsername');
    if (usernameInput) usernameInput.value = '';
    const pwInput = document.getElementById('instructorPassword');
    if (pwInput) pwInput.value = '';
    const noticeSelect = document.getElementById('instructorNoticeHours');
    if (noticeSelect) noticeSelect.value = '0';
    document.getElementById('instructorModalTitle').innerText = 'Add Instructor';
    const switchToAddBtn = document.getElementById('switchToAddBtn');
    if (switchToAddBtn) switchToAddBtn.style.display = 'none';
    const modalResetPwBtn = document.getElementById('modalResetPwBtn');
    if (modalResetPwBtn) modalResetPwBtn.style.display = 'none';
    document.getElementById('instructorModal').style.display = 'flex';
};

window.closeInstructorModal = function() {
    document.getElementById('instructorModal').style.display = 'none';
};

window.editInstructor = function(inst) {
    document.getElementById('instructorId').value = inst.id;
    document.getElementById('instructorName').value = inst.name;
    const usernameInput = document.getElementById('instructorUsername');
    if (usernameInput) usernameInput.value = inst.username || '';
    document.getElementById('instructorEmail').value = inst.email || '';
    document.getElementById('instructorPhone').value = inst.phone || '';
    const pwInput = document.getElementById('instructorPassword');
    if (pwInput) pwInput.value = '';
    const instTypeSelect = document.getElementById('instructorSimulatorType');
    const typeVal = inst.simulator_type || 'All';
    if (instTypeSelect) {
        if (!Array.from(instTypeSelect.options).some(opt => opt.value === typeVal)) {
            const newOpt = document.createElement('option');
            newOpt.value = typeVal;
            newOpt.textContent = typeVal;
            newOpt.style.color = '#000';
            instTypeSelect.appendChild(newOpt);
        }
        instTypeSelect.value = typeVal;
    }
    document.getElementById('instructorAge').value = inst.age || '';
    document.getElementById('instructorRole').value = inst.role || '';
    document.getElementById('instructorAchievement').value = inst.key_achievement || '';
    document.getElementById('instructorStatus').value = inst.status || 'Available';
    document.getElementById('instructorFee').value = inst.fee != null ? inst.fee : 500;
    const noticeSelect = document.getElementById('instructorNoticeHours');
    if (noticeSelect) noticeSelect.value = String(inst.notice_hours != null ? inst.notice_hours : 0);
    document.getElementById('instructorBio').value = inst.biography || '';
    document.getElementById('instructorModalTitle').innerText = 'Edit Instructor';
    const switchToAddBtn = document.getElementById('switchToAddBtn');
    if (switchToAddBtn) switchToAddBtn.style.display = 'inline-block';
    const modalResetPwBtn = document.getElementById('modalResetPwBtn');
    if (modalResetPwBtn) modalResetPwBtn.style.display = 'inline-block';
    document.getElementById('instructorModal').style.display = 'flex';
};

window.resetInstructorPassword = async function(id, name) {
    if (!confirm(`Reset password for '${name}' to the default 'havoc123'?\nThey will be required to set their own password on their next login.`)) return;
    try {
        const res = await fetchAuth(`/api/admin/instructors/${id}/reset-password`, {
            method: 'POST'
        });
        const data = await res.json();
        if (data.success) {
            alert(`Password for '${name}' has been reset to 'havoc123'.\nWhen they log in, they will be prompted to set a new password.`);
        } else {
            alert(data.error || 'Failed to reset password');
        }
    } catch (e) {
        console.error(e);
        alert('Error resetting password');
    }
};

window.quickResetModalPassword = async function() {
    const id = document.getElementById('instructorId').value;
    const name = document.getElementById('instructorName').value;
    if (!id) return;
    await window.resetInstructorPassword(id, name);
    document.getElementById('instructorPassword').value = '';
};

window.deleteInstructor = async function(id) {
    if (!confirm("Are you sure you want to delete this instructor?")) return;
    try {
        const res = await fetchAuth(`/api/admin/instructors/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            loadInstructors();
        } else {
            alert(data.error || "Failed to delete");
        }
    } catch (e) {
        console.error(e);
        alert("Error deleting instructor");
    }
};

const instructorForm = document.getElementById('instructorForm');
if (instructorForm) {
    instructorForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('instructorId').value;
        const formData = new FormData();
        formData.append('name', document.getElementById('instructorName').value);
        const usernameVal = document.getElementById('instructorUsername')?.value.trim();
        if (usernameVal) formData.append('username', usernameVal);
        formData.append('email', document.getElementById('instructorEmail').value);
        formData.append('phone', document.getElementById('instructorPhone').value);
        formData.append('simulator_type', document.getElementById('instructorSimulatorType').value);
        formData.append('age', document.getElementById('instructorAge').value);
        formData.append('role', document.getElementById('instructorRole').value);
        formData.append('key_achievement', document.getElementById('instructorAchievement').value);
        formData.append('status', document.getElementById('instructorStatus').value);
        formData.append('fee', document.getElementById('instructorFee').value || 500);
        formData.append('notice_hours', document.getElementById('instructorNoticeHours')?.value || 0);
        formData.append('biography', document.getElementById('instructorBio').value);
        
        const pw = document.getElementById('instructorPassword')?.value.trim();
        if (pw) formData.append('password', pw);
        
        const photoFile = document.getElementById('instructorPhoto').files[0];
        if (photoFile) formData.append('image', photoFile);

        const url = id ? `/api/admin/instructors/${id}` : `/api/admin/instructors`;
        const method = id ? 'PUT' : 'POST';

        try {
            const res = await fetch(`${BACKEND_URL}${url}`, {
                method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                closeInstructorModal();
                loadInstructors();
            } else {
                alert(data.error || "Failed to save instructor");
            }
        } catch (err) {
            console.error(err);
            alert("Error saving instructor");
        }
    });
}

// Init
initAvailabilityDates();
renderSimFilters();
loadBookings();
loadAvailability();
checkRole();
loadInstructors();
populateInventoryMonthDropdown();
loadInventoryReport();

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
    const confirmExportBtn = document.getElementById('confirmExportBtn');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            let dataToExport = window.currentBookings || window.allBookings;
            if (!dataToExport || dataToExport.length === 0) {
                alert("No bookings available to export.");
                return;
            }
            document.getElementById('exportModal').style.display = 'flex';
        });
    }

    function getSelectedExportColumns() {
        const showSn = document.getElementById('exp-col-sn')?.checked;
        const showOrder = document.getElementById('exp-col-order')?.checked;
        const showName = document.getElementById('exp-col-name')?.checked;
        const showPhone = document.getElementById('exp-col-phone')?.checked;
        const showEmail = document.getElementById('exp-col-email')?.checked;
        const showDate = document.getElementById('exp-col-date')?.checked;
        const showTime = document.getElementById('exp-col-time')?.checked;
        const showType = document.getElementById('exp-col-type')?.checked;
        const showAmount = document.getElementById('exp-col-amount')?.checked;
        const showStatus = document.getElementById('exp-col-status')?.checked;

        return { showSn, showOrder, showName, showPhone, showEmail, showDate, showTime, showType, showAmount, showStatus };
    }

    function generateReportDataset() {
        let dataToExport = window.currentBookings || window.allBookings;
        if (!dataToExport || dataToExport.length === 0) return null;

        const cols = getSelectedExportColumns();
        const activeCount = Object.values(cols).filter(Boolean).length;
        if (activeCount === 0) {
            alert("Please select at least one column to export.");
            return null;
        }

        // Sort data by booking_date then booking_time
        const sorted = [...dataToExport].sort((a, b) => {
            const dateA = new Date(a.booking_date || 0);
            const dateB = new Date(b.booking_date || 0);
            if (dateA - dateB !== 0) return dateA - dateB;
            const timeA = a.booking_time || '';
            const timeB = b.booking_time || '';
            return timeA.localeCompare(timeB);
        });

        // Group by date
        const grouped = {};
        sorted.forEach(b => {
            const d = b.booking_date || 'UNKNOWN DATE';
            if (!grouped[d]) grouped[d] = [];
            grouped[d].push(b);
        });

        // Build 2D array of rows for universal spreadsheet/CSV creation
        const wsRows = [];
        let totalSlCounter = 1;

        // Build Header Row
        const headerRow = [];
        if (cols.showSn) { headerRow.push("TOTAL SL", "SN"); }
        if (cols.showOrder) headerRow.push("ORDER NO");
        if (cols.showName) headerRow.push("NAME");
        if (cols.showPhone) headerRow.push("PHONE NO");
        if (cols.showEmail) headerRow.push("E-MAIL ID");
        if (cols.showDate) headerRow.push("DATE");
        if (cols.showTime) headerRow.push("TIME/SLOT");
        if (cols.showType) { headerRow.push("TYPE OF SIM PODIUM", "PPT"); }
        if (cols.showAmount) headerRow.push("AMOUNT DUE (INR)");
        if (cols.showStatus) headerRow.push("STATUS");

        Object.keys(grouped).forEach((date, i) => {
            let displayDate = date;
            try {
                if (date.includes('-')) {
                    const dObj = new Date(date);
                    const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
                    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
                    displayDate = `${months[dObj.getMonth()]} ${dObj.getDate()} (${days[dObj.getDay()]})`;
                }
            } catch (e) {}

            if (i > 0) wsRows.push([]); // blank separator row
            wsRows.push([`=== ${displayDate} ===`]); // date section title
            wsRows.push([...headerRow]); // column headers

            let dateTotalAmount = 0;
            let dateTotalPpt = 0;

            grouped[date].forEach(b => {
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

                const rawStatus = (b.status || 'PENDING').toUpperCase();
                const isPending = rawStatus === 'PENDING';
                const isCancelled = rawStatus === 'CANCELLED';
                const isAttended = rawStatus === 'ATTENDED';
                const isCash = rawStatus === 'CASH';
                const paymentLabel = isPending ? 'UNPAID' : (isCash ? 'UNPAID' : (isCancelled ? 'REFUNDED' : 'PAID'));
                const fulfillLabel = isAttended ? 'FULFILLED' : (isCancelled ? 'CANCELLED' : 'UNFULFILLED');
                const statusLabel = `${paymentLabel} / ${fulfillLabel}`;

                const rowData = [];
                if (cols.showSn) { rowData.push(totalSlCounter, 1); }
                if (cols.showOrder) rowData.push(b.order_id || '');
                if (cols.showName) rowData.push(b.name || '');
                if (cols.showPhone) rowData.push(b.phone || '');
                if (cols.showEmail) rowData.push(b.email || '');
                if (cols.showDate) rowData.push(formattedDate);
                if (cols.showTime) rowData.push(b.booking_time || '');
                if (cols.showType) { rowData.push(b.item_name || '', ppt); }
                if (cols.showAmount) rowData.push(amt);
                if (cols.showStatus) rowData.push(statusLabel);

                wsRows.push(rowData);
                totalSlCounter++;
            });

            // Date Total Row
            if (cols.showType || cols.showAmount) {
                const totalRow = [];
                headerRow.forEach((h, colIdx) => {
                    if (h === "ORDER NO" || (colIdx === 0 && !cols.showOrder)) {
                        totalRow.push("DATE TOTAL");
                    } else if (h === "PPT") {
                        totalRow.push(dateTotalPpt);
                    } else if (h === "AMOUNT DUE (INR)") {
                        totalRow.push(dateTotalAmount);
                    } else {
                        totalRow.push("");
                    }
                });
                wsRows.push(totalRow);
            }
        });

        return wsRows;
    }

    // Export Excel (.xlsx) Handler
    if (confirmExportBtn) {
        confirmExportBtn.addEventListener('click', () => {
            const wsRows = generateReportDataset();
            if (!wsRows) return;
            document.getElementById('exportModal').style.display = 'none';

            const fileName = `Havoc_Bookings_Report_${new Date().toISOString().split('T')[0]}`;

            // 1. Try real SheetJS XLSX workbook creation from clean 2D array
            if (typeof XLSX !== 'undefined') {
                try {
                    const ws = XLSX.utils.aoa_to_sheet(wsRows);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Bookings Report");

                    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `${fileName}.xlsx`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                    return;
                } catch (e) {
                    console.error("XLSX error:", e);
                }
            }

            // 2. Direct fallback to standard CSV with UTF-8 BOM (supported universally on all mobile apps)
            downloadCsvFromRows(wsRows, fileName);
        });
    }

    // Export CSV (.csv) Handler
    const confirmExportCsvBtn = document.getElementById('confirmExportCsvBtn');
    if (confirmExportCsvBtn) {
        confirmExportCsvBtn.addEventListener('click', () => {
            const wsRows = generateReportDataset();
            if (!wsRows) return;
            document.getElementById('exportModal').style.display = 'none';

            const fileName = `Havoc_Bookings_Report_${new Date().toISOString().split('T')[0]}`;
            downloadCsvFromRows(wsRows, fileName);
        });
    }

    // Helper: download clean CSV with UTF-8 BOM so mobile Excel / Numbers / Google Sheets opens it without error
    function downloadCsvFromRows(rows, fileName) {
        let csvContent = "\uFEFF"; // UTF-8 BOM for perfect Excel mobile rendering
        rows.forEach(row => {
            const escaped = (row || []).map(val => {
                if (val === null || val === undefined) return '""';
                const str = String(val).replace(/"/g, '""');
                return `"${str}"`;
            });
            csvContent += escaped.join(",") + "\r\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${fileName}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
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
        
        // Populate category select
        const typeSelect = document.getElementById('productTypeSelect');
        if (typeSelect) {
            const types = [...new Set(inventoryData.map(p => p.type).filter(Boolean))];
            typeSelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
            types.forEach(type => {
                const opt = document.createElement('option');
                opt.value = type;
                opt.textContent = type;
                typeSelect.appendChild(opt);
            });
            const newOpt = document.createElement('option');
            newOpt.value = '_new_';
            newOpt.textContent = '+ Add New Category';
            typeSelect.appendChild(newOpt);
        }
        
        // Populate instructor simulator types
        const instructorTypeSelect = document.getElementById('instructorSimulatorType');
        if (instructorTypeSelect) {
            const types = [...new Set(inventoryData.map(p => p.type).filter(Boolean))];
            instructorTypeSelect.innerHTML = '<option value="All" style="color:#000;">All</option>';
            types.forEach(type => {
                const opt = document.createElement('option');
                opt.value = type;
                opt.textContent = type;
                opt.style.color = '#000';
                instructorTypeSelect.appendChild(opt);
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
                    <div style="padding: 0.5rem 1rem; font-size: 0.9rem; font-family: 'Outfit'; cursor: pointer; color: #1e3a8a; transition: background 0.2s; display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='transparent'" onclick='event.stopPropagation(); openProductModal(${JSON.stringify(product).replace(/'/g, "&apos;")}); hideAllActionMenus();'>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        Edit product
                    </div>
                    <div style="padding: 0.5rem 1rem; font-size: 0.9rem; font-family: 'Outfit'; cursor: pointer; color: #1e3a8a; transition: background 0.2s; display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='transparent'" onclick='event.stopPropagation(); duplicateProduct(${product.id}); hideAllActionMenus();'>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        Duplicate
                    </div>
                    <div style="padding: 0.5rem 1rem; font-size: 0.9rem; font-family: 'Outfit'; cursor: pointer; color: #1e3a8a; transition: background 0.2s; display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='transparent'" onclick="event.stopPropagation(); deleteProduct(${product.id}); hideAllActionMenus();">
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
        const typeSelect = document.getElementById('productTypeSelect');
        const typeContainer = document.getElementById('productTypeContainer');
        if (typeSelect) {
            const exists = Array.from(typeSelect.options).some(opt => opt.value === product.type);
            if (exists) {
                typeSelect.value = product.type;
                if (typeContainer) typeContainer.style.display = 'none';
            } else {
                typeSelect.value = '_new_';
                if (typeContainer) typeContainer.style.display = 'block';
            }
        }
        const hideSuffixEl = document.getElementById('productHideSuffix');
        if (hideSuffixEl) hideSuffixEl.checked = !!product.hide_suffix;
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productPrice').value = product.price;
        const pvEl = document.getElementById('productPriceVisible');
        if (pvEl) pvEl.value = product.price;
        const cpEl = document.getElementById('productComparePrice');
        if (cpEl) cpEl.value = product.compare_price || '';

        // 2-Player price handling
        const enableTwoPlayerEl = document.getElementById('productEnableTwoPlayer');
        const twoPlayerPriceEl = document.getElementById('productTwoPlayerPrice');
        const twoPlayerContainer = document.getElementById('twoPlayerPriceContainer');
        if (enableTwoPlayerEl && twoPlayerPriceEl && twoPlayerContainer) {
            if (product.two_player_price && parseFloat(product.two_player_price) > 0) {
                enableTwoPlayerEl.checked = true;
                twoPlayerPriceEl.value = product.two_player_price;
                twoPlayerContainer.style.display = 'block';
            } else {
                enableTwoPlayerEl.checked = false;
                twoPlayerPriceEl.value = '';
                twoPlayerContainer.style.display = 'none';
            }
        }

        document.getElementById('productStock').value = product.stock_quantity;
        document.getElementById('currentProductImage').textContent = product.image_url ? `Current: ${product.image_url}` : 'No current image';
        
        let opts = '[]';
        try { if (product.options) { JSON.parse(product.options); opts = product.options; } } catch(e) {}
        document.getElementById('productOptionsData').value = opts;
        
        initShopifyOptions(opts);
        
        // Populate existing images into productImagesList
        productImagesList = [];
        let existingImgUrls = [];
        if (product.images_json) {
            try {
                const parsed = JSON.parse(product.images_json);
                if (Array.isArray(parsed)) existingImgUrls = parsed;
            } catch(e) {}
        }
        if (existingImgUrls.length === 0 && product.image_url) {
            existingImgUrls = [product.image_url];
        }

        existingImgUrls.forEach((imgUrl, idx) => {
            const previewUrl = imgUrl.startsWith('data:') ? imgUrl : `/${imgUrl}`;
            productImagesList.push({
                id: 'exist_' + idx + '_' + Math.random().toString(36).substring(2, 6),
                type: 'existing',
                src: previewUrl,
                rawUrl: imgUrl
            });
        });

        updateProductImagePreviews();
    } else {
        title.textContent = 'Add Product';
        if (breadcrumb) breadcrumb.textContent = 'New Product';
        form.reset();
        const hideSuffixEl = document.getElementById('productHideSuffix');
        if (hideSuffixEl) hideSuffixEl.checked = false;
        
        const enableTwoPlayerEl = document.getElementById('productEnableTwoPlayer');
        const twoPlayerPriceEl = document.getElementById('productTwoPlayerPrice');
        const twoPlayerContainer = document.getElementById('twoPlayerPriceContainer');
        if (enableTwoPlayerEl) enableTwoPlayerEl.checked = false;
        if (twoPlayerPriceEl) twoPlayerPriceEl.value = '';
        if (twoPlayerContainer) twoPlayerContainer.style.display = 'none';

        const typeSelect = document.getElementById('productTypeSelect');
        const typeContainer = document.getElementById('productTypeContainer');
        if (typeSelect) typeSelect.value = '';
        if (typeContainer) typeContainer.style.display = 'none';
        document.getElementById('productId').value = '';
        document.getElementById('currentProductImage').textContent = '';
        initShopifyOptions('[]');
        
        // Reset image preview
        productImagesList = [];
        updateProductImagePreviews();
    }
    
    modal.style.display = 'block';
};

// --- Multi-Image State & Helpers ---
let productImagesList = []; // Array of { id, type: 'existing' | 'new', src: string, file?: File }

function updateProductImagePreviews() {
    const grid = document.getElementById('imagePreviewGrid');
    const countLabel = document.getElementById('imgCountLabel');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (countLabel) {
        countLabel.textContent = `(${productImagesList.length} image${productImagesList.length === 1 ? '' : 's'})`;
    }

    productImagesList.forEach((item, index) => {
        const isMain = index === 0;
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `position:relative; width:130px; height:130px; border-radius:8px; overflow:hidden; border:2px solid ${isMain ? '#e5b869' : 'rgba(255,255,255,0.1)'}; background:#111; display:flex; align-items:center; justify-content:center;`;
        
        wrapper.innerHTML = `
            <img src="${item.src}" style="width:100%; height:100%; object-fit:cover;" alt="Product preview">
            <span style="position:absolute; top:6px; left:6px; background:${isMain ? 'rgba(229,184,105,0.9)' : 'rgba(0,0,0,0.7)'}; color:${isMain ? '#000' : '#fff'}; font-size:0.65rem; font-weight:700; padding:2px 6px; border-radius:4px; letter-spacing:0.5px;">${isMain ? 'MAIN' : `#${index + 1}`}</span>
            ${!isMain ? `<button type="button" onclick="setProductMainImage(${index})" title="Make Main Cover" style="position:absolute; bottom:6px; left:6px; background:rgba(0,0,0,0.75); border:1px solid rgba(255,255,255,0.2); color:#e5b869; font-size:0.65rem; font-weight:600; padding:2px 6px; border-radius:4px; cursor:pointer;">Set Main</button>` : ''}
            <button type="button" onclick="removeProductImageAt(${index})" title="Remove image" style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.75); border:none; color:#f87171; width:22px; height:22px; border-radius:50%; cursor:pointer; font-size:13px; display:flex; align-items:center; justify-content:center; line-height:1;">✕</button>
        `;
        grid.appendChild(wrapper);
    });

    const dz = document.getElementById('imageDropZone');
    if (dz) {
        dz.style.display = productImagesList.length >= 20 ? 'none' : '';
    }
}

window.setProductMainImage = (index) => {
    if (index > 0 && index < productImagesList.length) {
        const item = productImagesList.splice(index, 1)[0];
        productImagesList.unshift(item);
        updateProductImagePreviews();
    }
};

window.removeProductImageAt = (index) => {
    if (index >= 0 && index < productImagesList.length) {
        productImagesList.splice(index, 1);
        updateProductImagePreviews();
    }
};

window.closeProductModal = () => {
    document.getElementById('productModal').style.display = 'none';
    productImagesList = [];
    updateProductImagePreviews();
};

window.handleProductImageChange = (input) => {
    if (input.files && input.files.length > 0) {
        Array.from(input.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                productImagesList.push({
                    id: 'new_' + Math.random().toString(36).substring(2, 9),
                    type: 'new',
                    src: e.target.result,
                    file: file
                });
                updateProductImagePreviews();
            };
            reader.readAsDataURL(file);
        });
        input.value = ''; // Reset input so same file can be re-selected if needed
    }
};

window.handleProductImageDrop = (event) => {
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                productImagesList.push({
                    id: 'new_' + Math.random().toString(36).substring(2, 9),
                    type: 'new',
                    src: e.target.result,
                    file: file
                });
                updateProductImagePreviews();
            };
            reader.readAsDataURL(file);
        });
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
        const enableTwoPlayer = document.getElementById('productEnableTwoPlayer')?.checked;
        const twoPlayerPriceVal = enableTwoPlayer ? (document.getElementById('productTwoPlayerPrice')?.value || '') : '';
        formData.append('two_player_price', twoPlayerPriceVal);
        formData.append('stock_quantity', document.getElementById('productStock').value);
        formData.append('options', document.getElementById('productOptionsData').value);
        const hideSuffixEl = document.getElementById('productHideSuffix');
        if (hideSuffixEl) formData.append('hide_suffix', hideSuffixEl.checked ? '1' : '0');
        
        // Build ordered image list & append files
        let newFileCounter = 0;
        const imageOrder = [];
        productImagesList.forEach(item => {
            if (item.type === 'existing') {
                imageOrder.push({ type: 'existing', url: item.rawUrl || item.src });
            } else if (item.type === 'new' && item.file) {
                imageOrder.push({ type: 'new', fileIndex: newFileCounter });
                formData.append('images', item.file);
                newFileCounter++;
            }
        });
        formData.append('image_order', JSON.stringify(imageOrder));
        
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
                const errData = await res.json().catch(() => ({}));
                alert(errData.error || errData.message || 'Failed to save product');
            }
        } catch (err) {
            alert('Error connecting to server: ' + (err.message || 'Network issue'));
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

                // Build a set of all month prefixes that are in the saved data
                // so we can tell which months are "new" and should default to ON
                const savedMonths = new Set();
                saved.choices.forEach(c => {
                    const monthMatch = c.match(/^(\w+)/);
                    if (monthMatch) savedMonths.add(monthMatch[1]);
                });

                opt.allItems.forEach(d => {
                    if (isNewFormat) {
                        if (savedSet.has(d.label)) {
                            // Exact match — was saved as ON
                            enabledSet.add(d.label);
                        } else {
                            // Check if this date's month was NEVER saved at all
                            // (i.e. it's a brand-new month not in the old saved data)
                            const monthMatch = d.label.match(/^(\w+)/);
                            const dateMonth = monthMatch ? monthMatch[1] : '';
                            if (!savedMonths.has(dateMonth) && !d.isMonday && !d.isPast) {
                                // New month — default to ON
                                enabledSet.add(d.label);
                            }
                        }
                    } else {
                        // Old format: match by prefix (no day name), but FORCE Mondays OFF
                        const prefix = d.label.replace(/ \(\w+\)$/, '');
                        if (savedSet.has(prefix) && !d.isMonday && !d.isPast) {
                            enabledSet.add(d.label);
                        } else {
                            // Check if this is a new month not covered by old format
                            const monthMatch = d.label.match(/^(\w+)/);
                            const dateMonth = monthMatch ? monthMatch[1] : '';
                            if (!savedMonths.has(dateMonth) && !d.isMonday && !d.isPast) {
                                enabledSet.add(d.label);
                            }
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

// --- Newsletter Management ---

async function loadNewsletterSubscribers() {
    try {
        const response = await fetch('/api/admin/newsletter-subscribers', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                logout();
                return;
            }
            throw new Error('Failed to fetch subscribers');
        }
        
        const data = await response.json();
        const tbody = document.getElementById('newsletter-table-body');
        const countSpan = document.getElementById('newsletter-total-count');
        
        tbody.innerHTML = '';
        
        if (data.subscribers && data.subscribers.length > 0) {
            countSpan.textContent = data.subscribers.length;
            
            data.subscribers.forEach((sub, index) => {
                const tr = document.createElement('tr');
                const date = new Date(sub.subscribed_at).toLocaleString();
                
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${sub.email}</td>
                    <td>${date}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            countSpan.textContent = '0';
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No subscribers found</td></tr>';
        }
        
    } catch (error) {
        console.error('Error loading newsletter subscribers:', error);
        alert('Failed to load newsletter subscribers.');
    }
}

// Export Newsletter Subscribers to CSV
document.getElementById('exportNewsletterBtn')?.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/admin/newsletter-subscribers', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch data for export');
        
        const data = await response.json();
        if (!data.subscribers || data.subscribers.length === 0) {
            alert('No subscribers to export.');
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "ID,Email,Subscribed At\n"; // Header row
        
        data.subscribers.forEach(sub => {
            const row = `${sub.id},${sub.email},${sub.subscribed_at}`;
            csvContent += row + "\n";
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `newsletter_subscribers_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export subscribers.');
    }
});

// Handle Compose Email Form
document.getElementById('newsletter-compose-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const subject = document.getElementById('newsletter-subject').value;
    const body = document.getElementById('newsletter-body').value;
    const btn = document.getElementById('sendNewsletterBtn');
    
    if(!confirm('Are you sure you want to send this email to ALL subscribers?')) return;
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="icon">⏳</span> Sending...';
    btn.disabled = true;
    
    try {
        const response = await fetch('/api/admin/newsletter-send', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ subject, body })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            alert(`Success: ${result.message}`);
            document.getElementById('newsletter-compose-form').reset();
        } else {
            alert(`Error: ${result.error || 'Failed to send bulk email'}`);
        }
    } catch (error) {
        console.error('Error sending newsletter:', error);
        alert('An unexpected error occurred while sending the email.');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});
document.querySelector('.nav-btn[data-target="tab-newsletter"]')?.addEventListener('click', () => {
    loadNewsletterSubscribers();
});

// ==========================================
// SETTINGS
// ==========================================
async function loadSettings() {
    try {
        const res = await fetch(BACKEND_URL + "/api/settings/payment", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            document.getElementById("toggle-payment-cod").checked = data.cod;
            document.getElementById("toggle-payment-upi").checked = data.upi;
        }
    } catch (e) {
        console.error("Failed to load settings", e);
    }
}

document.getElementById('nav-block-slots')?.addEventListener('click', () => {
    if (typeof initBlockSlotForm === 'function') initBlockSlotForm();
    if (typeof loadBlockedSlotsList === 'function') loadBlockedSlotsList();
});

document.querySelector('.nav-btn[data-target="tab-availability"]')?.addEventListener('click', () => {
    if (typeof loadAvailability === 'function') loadAvailability();
});

document.querySelector('.nav-btn[data-target="tab-settings"]')?.addEventListener('click', () => {
    loadSettings();
});

document.getElementById("savePaymentSettingsBtn")?.addEventListener("click", async (e) => {
    const btn = e.target;
    btn.textContent = "Saving...";
    btn.disabled = true;
    
    const cod = document.getElementById("toggle-payment-cod").checked;
    const upi = document.getElementById("toggle-payment-upi").checked;
    
    try {
        const res = await fetch(BACKEND_URL + "/api/admin/settings/payment", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ cod, upi })
        });
        
        if (res.ok) {
            alert("Settings saved successfully!");
        } else {
            const data = await res.json();
            alert("Error: " + (data.error || "Failed to save settings"));
        }
    } catch (err) {
        alert("Network error while saving settings.");
    } finally {
        btn.textContent = "Save Settings";
        btn.disabled = false;
    }
});

// ==========================================
// PAYMENT LINKS UI CONTROLLERS (PAGE & MODAL)
// ==========================================

let activeGeneratedPayUrl = '';
let activeGeneratedPayPhone = '';
let activeGeneratedPayAmount = '';
let activeGeneratedPayDesc = '';

// Dedicated Page Handlers
window.submitCreatePaymentLinkPage = async (e) => {
    e.preventDefault();
    const amountInput = document.getElementById('plPageAmount');
    const amount = amountInput ? amountInput.value : '';
    const name = document.getElementById('plPageName')?.value?.trim() || '';
    const phone = document.getElementById('plPagePhone')?.value?.trim() || '';
    const email = document.getElementById('plPageEmail')?.value?.trim() || '';
    const desc = document.getElementById('plPageDesc')?.value?.trim() || '';

    if (!amount || parseFloat(amount) <= 0) {
        alert('Please enter a valid amount.');
        return;
    }

    const btn = document.getElementById('plPageSubmitBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>Creating Link...</span>';
    }

    try {
        const res = await fetchAuth('/api/admin/payment-links', {
            method: 'POST',
            body: JSON.stringify({
                amount,
                customer_name: name,
                customer_phone: phone,
                customer_email: email,
                description: desc
            })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Failed to create payment link');
        }

        activeGeneratedPayUrl = data.pay_url;
        activeGeneratedPayPhone = data.customer_phone || '';
        activeGeneratedPayAmount = data.amount;
        activeGeneratedPayDesc = data.description || 'Havoc Sim Podium Experience';

        const urlInput = document.getElementById('plPageGeneratedUrl');
        if (urlInput) urlInput.value = data.pay_url;

        const successBox = document.getElementById('plPageSuccessBox');
        if (successBox) successBox.style.display = 'block';

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>Generate Another Link</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        }

        // Refresh list immediately so the new link appears on the right
        loadPaymentLinksPageHistory();

    } catch (err) {
        console.error('Payment link creation error:', err);
        alert('Error: ' + err.message);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>Generate Link</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        }
    }
};

window.copyPaymentLinkPage = () => {
    const input = document.getElementById('plPageGeneratedUrl');
    if (input && input.value) {
        navigator.clipboard.writeText(input.value).then(() => {
            const copyBtn = document.getElementById('plPageCopyBtn');
            if (copyBtn) {
                copyBtn.textContent = '✓ Copied!';
                setTimeout(() => { copyBtn.textContent = '📋 Copy Link'; }, 2000);
            }
        });
    }
};

window.shareOnWhatsAppPage = () => {
    if (!activeGeneratedPayUrl) return;
    const cleanPhone = (activeGeneratedPayPhone || '').replace(/\D/g, '');
    const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : (cleanPhone || '');
    const purposeLine = activeGeneratedPayDesc ? `Purpose: ${activeGeneratedPayDesc}\n` : '';
    const msg = `Hi! Here is your secure payment link for Havoc Sim Podium:
Amount: ₹${parseFloat(activeGeneratedPayAmount || 0).toFixed(2)}
${purposeLine}
Click here to complete payment online:
${activeGeneratedPayUrl}`;

    const waUrl = phoneParam 
        ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(msg)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
};

window.loadPaymentLinksPageHistory = async () => {
    const list = document.getElementById('plPageHistoryList');
    if (!list) return;
    list.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 2.5rem 0;">Loading payment links...</div>';

    try {
        const res = await fetchAuth('/api/admin/payment-links');
        const links = await res.json();
        if (!links || !links.length) {
            list.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 2.5rem 0;">No payment links created yet. Fill the details on the left to generate one.</div>';
            return;
        }

        let html = '';
        links.forEach(pl => {
            const isPaid = pl.status === 'PAID';
            const statusColor = isPaid ? '#22c55e' : (pl.status === 'FAILED' ? '#ef4444' : '#f59e0b');
            const statusBg = isPaid ? 'rgba(34,197,94,0.12)' : (pl.status === 'FAILED' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)');
            const createdDate = pl.created_at ? new Date(pl.created_at).toLocaleDateString('en-IN', {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}) : '-';
            const isProd = window.location.hostname !== 'localhost';
            const base = isProd ? 'https://www.havocsim.in' : window.location.origin;
            const fullUrl = `${base}/pay.html?id=${pl.link_id}`;
            const cleanPhone = (pl.customer_phone || '').replace(/\D/g, '');
            const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : (cleanPhone || '');
            const waTarget = phoneParam ? `https://wa.me/${phoneParam}` : 'https://api.whatsapp.com/send';

            html += `
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; padding: 1rem 1.2rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-weight: 700; color: #fff; font-size: 1.15rem;">₹${parseFloat(pl.amount).toFixed(2)}</span>
                            <span style="background: ${statusBg}; color: ${statusColor}; border-radius: 12px; font-size: 0.72rem; font-weight: 700; padding: 2px 9px;">${pl.status}</span>
                        </div>
                        <div style="font-size: 0.85rem; color: #fff; margin-top: 4px;">
                            ${pl.customer_name ? `<strong>${pl.customer_name}</strong> • ` : ''}<span style="color: var(--muted);">${pl.customer_phone || 'No phone'}</span>
                        </div>
                        <div style="font-size: 0.78rem; color: #aaa; margin-top: 2px;">
                            ${pl.description ? `<span style="color: var(--gold);">${pl.description}</span> • ` : ''}<span style="color: var(--muted);">#${pl.link_id}</span> • ${createdDate}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; flex-shrink: 0;">
                        <button class="btn" onclick="navigator.clipboard.writeText('${fullUrl}').then(() => alert('Link copied to clipboard!'))" style="background: rgba(255,255,255,0.08); color: #fff; border: 1px solid var(--border); font-size: 0.82rem; padding: 0.45rem 0.85rem; border-radius: 8px; cursor: pointer;">📋 Copy</button>
                        <a href="${waTarget}?text=${encodeURIComponent(`Hi! Here is your payment link for Havoc Sim Podium: ₹${parseFloat(pl.amount).toFixed(2)}\n${fullUrl}`)}" target="_blank" style="padding: 0.45rem 0.85rem; background: rgba(37,211,102,0.15); color: #25D366; border: 1px solid rgba(37,211,102,0.3); border-radius: 8px; text-decoration: none; font-size: 0.82rem; font-weight: 600; display: flex; align-items: center; gap: 4px;">💬 WhatsApp</a>
                        <a href="${fullUrl}" target="_blank" style="padding: 0.45rem 0.85rem; background: rgba(229,184,105,0.15); color: var(--gold); border: 1px solid rgba(229,184,105,0.3); border-radius: 8px; text-decoration: none; font-size: 0.82rem; font-weight: 600;">Open ↗</a>
                    </div>
                </div>
            `;
        });

        list.innerHTML = html;
    } catch (e) {
        console.error('Load history error:', e);
        list.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 2.5rem 0;">Error loading payment links.</div>';
    }
};

// Wire up sidebar tab click listener to automatically load history
document.getElementById('nav-payment-links')?.addEventListener('click', () => {
    window.loadPaymentLinksPageHistory();
});




// Initial boot for Block Slots
if (typeof initBlockSlotForm === 'function') initBlockSlotForm();
if (typeof loadBlockedSlotsList === 'function') loadBlockedSlotsList(); // Initial boot for Block Slots
