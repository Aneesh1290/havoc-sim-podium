const BACKEND_URL = "";
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('order_id');

const loadingState = document.getElementById('loadingState');
const resultState = document.getElementById('resultState');
const statusIcon = document.getElementById('statusIcon');
const statusTitle = document.getElementById('statusTitle');
const statusSubtitle = document.getElementById('statusSubtitle');
const bookingCard = document.getElementById('bookingCard');
const emailNote = document.getElementById('emailNote');

const showError = (title, msg) => {
    loadingState.style.display = 'none';
    resultState.style.display = 'block';
    statusIcon.classList.add('error');
    statusIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    statusTitle.innerHTML = `Payment <span class="error-text">${title}</span>`;
    statusSubtitle.innerText = msg;
};

const showSuccess = (booking, oId) => {
    loadingState.style.display = 'none';
    resultState.style.display = 'block';
    statusIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    statusTitle.innerHTML = `Booking <span>Confirmed!</span>`;
    statusSubtitle.innerText = "Get ready to feel the rush. See you at Havoc Sim Podium!";
    
    bookingCard.style.display = 'block';
    emailNote.style.display = 'block';

    let itemsHtml = '';
    if (booking.items && Array.isArray(booking.items)) {
        booking.items.forEach(it => {
            let formattedDate = it.dateLabel || it.date;
            try {
                if (it.date && it.date.includes('-')) {
                    const d = new Date(it.date);
                    formattedDate = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                }
            } catch(e) {}
            
            itemsHtml += `
                <div style="padding: 10px; background: rgba(255,255,255,0.05); margin-bottom: 10px; border-radius: 8px; text-align: left;">
                    <div style="font-weight: 600; font-size: 1.05rem; color: #fff;">${it.itemName}</div>
                    <div style="font-size: 0.85rem; color: #bbb; margin-top: 4px;">${formattedDate} • ${it.slot || it.time}</div>
                </div>
            `;
        });
    }

    const priceLabel = oId && oId.startsWith('PAYDUE') ? 'Amount Due (at Desk)' : 'Amount Paid';
    
    bookingCard.innerHTML = `
        <h3 style="margin-bottom: 1rem;">Booking Details</h3>
        ${itemsHtml}
        <div class="bc-row" style="margin-top: 1rem;"><span class="bc-label">Booked For</span><span class="bc-value" style="font-weight: 600;">${booking.name || '-'}</span></div>
        <div class="bc-row"><span class="bc-label">${priceLabel}</span><span class="bc-value gold">${booking.price || '-'}</span></div>
        <div class="bc-row"><span class="bc-label">Order ID</span><span class="bc-value bc-ref">${oId || '-'}</span></div>
    `;
};

async function verifyPayment() {
    // Bypass Cashfree verification for Pay at Desk (COD) orders
    if (orderId && orderId.startsWith('PAYDUE')) {
        const rawBooking = localStorage.getItem('havoc_recent_booking');
        if (rawBooking) {
            const booking = JSON.parse(rawBooking);
            if (booking.status === 'confirmed' || booking.paymentMethod === 'cod') {
                showSuccess(booking, orderId);
                localStorage.removeItem('havoc_cart');
                return;
            }
        }
    }

    if (!orderId) {
        // If they just navigated directly, check if we have a booked session
        const rawBooking = localStorage.getItem('havoc_recent_booking');
        if (rawBooking) {
            const booking = JSON.parse(rawBooking);
            if (booking.status === 'confirmed') {
                // COD success case (fallback if no order_id in URL)
                showSuccess(booking, booking.orderId || 'PAY-AT-DESK');
                localStorage.removeItem('havoc_cart'); // clean up
                return;
            }
        }
        // No valid booking found
        window.location.href = 'index.html';
        return;
    }

    try {
        const res = await fetch(`${BACKEND_URL}/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId })
        });

        const data = await res.json();

        if (data.success && data.status === 'PAID') {
            // Payment successful!
            const pendingRaw = localStorage.getItem('havoc_recent_booking');
            let booking = pendingRaw ? JSON.parse(pendingRaw) : {};
            booking.orderId = orderId;
            
            // Save as final booking and clean up
            booking.status = 'confirmed';
            localStorage.setItem('havoc_recent_booking', JSON.stringify(booking));
            localStorage.removeItem('havoc_cart');

            showSuccess(booking, orderId);
        } else {
            showError("Failed", `Your payment status is: ${data.status || 'Unknown'}. Please contact support if amount was deducted.`);
        }
    } catch (err) {
        console.error(err);
        showError("Error", "Could not verify payment status. Please contact support.");
    }
}

verifyPayment();
