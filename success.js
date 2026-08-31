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

    const fmt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val || '-'; };
    fmt('s-item',   booking.item);
    fmt('s-price',  booking.price);
    fmt('s-name',   booking.name);
    fmt('s-orderid', oId);
    if (booking.date) {
        const d = new Date(booking.date);
        fmt('s-date', d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    }
    fmt('s-time', booking.time);
};

async function verifyPayment() {
    if (!orderId) {
        // If they just navigated directly or came from COD, check if we have a booked session
        const rawBooking = localStorage.getItem('havoc_recent_booking');
        if (rawBooking) {
            const booking = JSON.parse(rawBooking);
            if (booking.status === 'confirmed') {
                // COD success case
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
