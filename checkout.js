// =============================================
// CHECKOUT PAGE LOGIC
// =============================================

// Backend URL -- Replace with deployed server URL in production
const BACKEND_URL = "";

document.addEventListener("DOMContentLoaded", async () => {

    // ---- 1. Load cart from localStorage & Render IMMEDIATELY (Instant 0ms display) ----
    let raw = localStorage.getItem("havoc_cart");
    let cart = raw ? JSON.parse(raw) : [];
    
    // Migration fallback
    if (cart && !Array.isArray(cart)) {
        if (cart.itemName) cart = [cart];
        else cart = [];
    }

    if (!cart || cart.length === 0) {
        window.location.href = "/book";
        return;
    }

    // Populate Order Summary immediately
    const itemsContainer = document.getElementById("co-items-container");
    const subtotalEl     = document.getElementById("co-subtotal");
    const gstEl          = document.getElementById("co-gst");
    const totalEl        = document.getElementById("co-total");
    const payBtnLabelEl  = document.getElementById("payBtnLabel");

    let originalPrice = 0;
    let appliedDiscount = 0;
    let finalAmount = 0;
    let selectedPaymentMethod = 'cod'; // default

    function renderCartItems(productMap = {}) {
        if (!itemsContainer) return;
        itemsContainer.innerHTML = "";
        originalPrice = 0;
        cart.forEach((item, index) => {
            const priceVal = parseFloat((item.itemPrice || "0").replace(/[^\d.]/g, ""));
            const instFee = item.instructorFee ? parseFloat(item.instructorFee) : 0;
            const itemTotal = (isNaN(priceVal) ? 0 : priceVal) + instFee;
            originalPrice += itemTotal;
            
            const div = document.createElement("div");
            div.className = "summary-item";
            div.innerHTML = `
                <img id="co-item-img-${index}" src="${productMap[item.itemName] || item.itemImage || 'havoc_logo.png'}" alt="Simulator" class="summary-img">
                <div class="summary-details" style="width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.2rem;">
                        <strong id="co-item-name-${index}">${item.itemName}</strong>
                        <span class="summary-price" style="font-size: 1rem; white-space: nowrap; margin-left: 0.5rem;">₹${(isNaN(priceVal) ? 0 : priceVal).toFixed(2)}</span>
                    </div>
                    <span id="co-item-date-${index}" class="summary-meta">Date: ${item.dateLabel}</span>
                    <span id="co-item-time-${index}" class="summary-meta">Slot: ${item.slot}</span>
                    ${item.players === 2 ? `
                    <div style="display:flex; align-items:center; gap:0.4rem; margin:0.3rem 0;">
                        <span style="color:var(--gold); font-size:0.75rem; background:rgba(229,184,105,0.12); border:1px solid rgba(229,184,105,0.3); padding:2px 8px; border-radius:12px; font-weight:600;">👥 2 Players (Combo)</span>
                        ${item.playerTwoName ? `<span style="font-size:0.75rem; color:#aaa;">P2: ${item.playerTwoName}</span>` : ''}
                    </div>` : ''}
                    ${item.instructor ? `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.4rem; padding-top: 0.4rem; border-top: 1px dashed rgba(255,255,255,0.1);">
                        <span id="co-item-instructor-${index}" class="summary-meta" style="color: var(--gold); margin: 0;">👨‍✈️ Instructor: ${item.instructor.name}</span>
                        <span style="color: var(--gold); font-size: 0.9rem; font-weight: 500;">+₹${instFee.toFixed(2)}</span>
                    </div>
                    ` : ''}
                </div>
            `;
            itemsContainer.appendChild(div);
        });
        updatePricing();
    }

    function updatePricing() {
        let taxableAmount = originalPrice - appliedDiscount;
        if (taxableAmount < 0) taxableAmount = 0;
        
        let gstAmount = taxableAmount * 0.18;
        finalAmount = taxableAmount + gstAmount;

        if (subtotalEl) subtotalEl.innerText = `₹${originalPrice.toFixed(2)}`;
        if (gstEl) gstEl.innerText = `₹${gstAmount.toFixed(2)}`;
        if (totalEl) totalEl.innerText = `₹${finalAmount.toFixed(2)}`;
        
        if (payBtnLabelEl) {
            if (selectedPaymentMethod === 'cod') {
                payBtnLabelEl.innerText = "BOOK & PAY AT DESK";
            } else {
                payBtnLabelEl.innerText = `PAY ₹${finalAmount.toFixed(2)}`;
            }
        }
    }

    // Render immediately using local cart info (0ms latency!)
    renderCartItems();
    // Fetch products catalog and payment settings in background without blocking Order Summary
    Promise.all([
        fetch(BACKEND_URL + "/api/products").then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(BACKEND_URL + "/api/settings/payment").then(r => r.ok ? r.json() : { cod: true, upi: true }).catch(() => ({ cod: true, upi: true }))
    ]).then(([products, settings]) => {
        const productMap = {};
        products.forEach(p => {
            productMap[p.name] = p.image_url || 'havoc_logo.png';
        });
        // Update images if available
        cart.forEach((item, index) => {
            const imgEl = document.getElementById(`co-item-img-${index}`);
            if (imgEl && productMap[item.itemName]) {
                imgEl.src = productMap[item.itemName];
            }
        });

        // Update payment options visibility
        const paymentOptions = document.querySelectorAll('.payment-option');
        let firstAvail = null;
        paymentOptions.forEach(opt => {
            const m = opt.getAttribute('data-method');
            const isEnabled = m === 'icici' ? (settings.upi !== false) : (settings[m] !== false);
            if (!isEnabled) {
                opt.style.display = 'none';
                opt.classList.remove('selected');
            } else {
                opt.style.display = 'flex';
                if (!firstAvail) firstAvail = opt;
            }
        });
        const currentlySelected = document.querySelector('.payment-option.selected');
        if (!currentlySelected && firstAvail) {
            firstAvail.click();
        }
    });

    const applyBtn = document.getElementById("apply-discount-btn");
    const codeInput = document.getElementById("co-discount-code");
    const msgEl = document.getElementById("discount-message");
    const discountRow = document.getElementById("discount-row");
    const discountAmtEl = document.getElementById("co-discount-amount");

    applyBtn?.addEventListener("click", async () => {
        const code = codeInput.value.trim().toUpperCase();
        if (!code) return;

        try {
            const res = await fetch(`${BACKEND_URL}/api/coupons`);
            const coupons = await res.json();
            
            const coupon = coupons.find(c => c.code === code);

            if (coupon) {
                if (coupon.type === 'percent') {
                    appliedDiscount = (originalPrice * coupon.value) / 100;
                } else if (coupon.type === 'flat') {
                    appliedDiscount = coupon.value;
                }

                if (appliedDiscount > originalPrice) appliedDiscount = originalPrice;
                finalAmount = originalPrice - appliedDiscount;
                
                // Update UI
                msgEl.textContent = `Coupon applied! You saved ₹${appliedDiscount.toFixed(2)}`;
                msgEl.className = "discount-message success";
                discountRow.style.display = "flex";
                discountAmtEl.textContent = `-₹${appliedDiscount.toFixed(2)}`;
                
                updatePricing();
                
                codeInput.disabled = true;
                applyBtn.disabled = true;
                applyBtn.innerText = "Applied";
            } else {
                msgEl.textContent = "Invalid or expired discount code";
                msgEl.className = "discount-message error";
            }
        } catch(err) {
            console.error("Error fetching coupons:", err);
            msgEl.textContent = "Error verifying coupon";
            msgEl.className = "discount-message error";
        }
    });

    // ---- 1.6 Payment Option Selection ----
    const paymentOptions = document.querySelectorAll('.payment-option');
    let firstAvailable = null;
    paymentOptions.forEach(option => {
        option.addEventListener("click", () => {
            document.querySelectorAll(".payment-option").forEach(opt => opt.classList.remove("selected"));
            option.classList.add("selected");
            selectedPaymentMethod = option.getAttribute("data-method");
            updatePricing();
        });
    });

    // Auto-select first option
    const defaultSelected = document.querySelector('.payment-option.selected') || paymentOptions[0];
    if (defaultSelected) {
        defaultSelected.click();
    }

    // ---- 2. PAY NOW button ----
    const payBtn = document.getElementById("payNowBtn");

    payBtn?.addEventListener("click", async () => {
        const name  = document.getElementById("co-name")?.value.trim();
        const email = document.getElementById("co-email")?.value.trim();
        const countryCode = document.getElementById("co-country-code")?.value.trim() || '+91';
        const rawPhone = document.getElementById("co-phone")?.value.trim();
        const phone = rawPhone ? `${countryCode} ${rawPhone}` : '';

        const termsCheckbox = document.getElementById("co-terms-checkbox");
        if (!name || !email || !phone) {
            alert("Please fill in all required fields before proceeding.");
            return;
        }

        if (!termsCheckbox || !termsCheckbox.checked) {
            alert("Please agree to the Terms & Conditions and Refund & Cancellation Policy before proceeding.");
            return;
        }

        const amount = parseFloat(finalAmount.toFixed(2));

        payBtn.disabled         = true;
        payBtnLabelEl.innerText = "Processing...";

        try {
            // Save booking details to localStorage for the success page (pending status)
            const bookingDetails = {
                name, email, phone,
                items: cart, // save the entire array
                price: `₹${amount.toFixed(2)}`,
                status: 'pending'
            };
            localStorage.setItem("havoc_recent_booking", JSON.stringify(bookingDetails));

            const booking_data = cart.map(item => ({
                item_name: item.itemName,
                date: item.dateLabel,
                time: item.slot,
                instructor_id: item.instructor ? item.instructor.id : null,
                instructor_fee: item.instructorFee || 0,
                base_price: parseFloat(String(item.itemPrice).replace(/[^\d.]/g, '')) || 0,
                players: item.players || 1,
                player_two_name: item.playerTwoName || ''
            }));

            if (selectedPaymentMethod === 'cod') {
                // COD Flow
                bookingDetails.status = 'confirmed';
                bookingDetails.paymentMethod = 'cod';
                localStorage.setItem("havoc_recent_booking", JSON.stringify(bookingDetails));

                const orderRes = await fetch(BACKEND_URL + "/api/bookings/cod", {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({ 
                        amount, 
                        customer_details: { name, email, phone },
                        booking_data
                    })
                });

                if (!orderRes.ok) {
                    const errData = await orderRes.json();
                    throw new Error(errData.error || "Failed to create booking");
                }

                const orderData = await orderRes.json();
                if (orderData.success) {
                    bookingDetails.orderId = orderData.order_id;
                    localStorage.setItem("havoc_recent_booking", JSON.stringify(bookingDetails));
                }

                // Increment coupon usage count if a code was applied
                const appliedCode = codeInput?.value?.trim()?.toUpperCase();
                if (appliedCode && appliedDiscount > 0) {
                    await fetch(BACKEND_URL + '/api/coupons/use', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: appliedCode })
                    }).catch(() => {});
                }

                // Redirect to success immediately
                window.location.href = `/success?order_id=${orderData.order_id || ''}`;

            } else {
                // ICICI Flow
                const orderRes = await fetch(BACKEND_URL + "/api/payment/icici/initiate", {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({ 
                        amount, 
                        customer_details: { name, email, phone },
                        booking_data
                    })
                });

                if (!orderRes.ok) {
                    const errData = await orderRes.json();
                    throw new Error(errData.error || "Failed to initiate payment gateway");
                }
                
                const data = await orderRes.json();
                if (data.redirectURI && data.tranCtx) {
                    payBtnLabelEl.innerText = "Redirecting to Secure Gateway...";
                    // Redirect to ICICI Gateway
                    window.location.href = `${data.redirectURI}?tranCtx=${data.tranCtx}`;
                } else {
                    throw new Error("Invalid response from payment gateway");
                }
            }

        } catch (err) {
            console.error("Payment error:", err);
            alert("Could not connect to payment server. " + err.message);
            payBtn.disabled         = false;
            updatePricing();
        }
    });
});
