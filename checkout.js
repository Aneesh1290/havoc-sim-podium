// =============================================
// CHECKOUT PAGE LOGIC (CASHFREE)
// =============================================

// Backend URL -- Replace with deployed server URL in production
const BACKEND_URL = "";

document.addEventListener("DOMContentLoaded", () => {

    // Initialize Cashfree SDK
    // Mode should be "sandbox" or "production"
    let cashfree;
    try {
        cashfree = Cashfree({
            mode: "sandbox", 
        });
    } catch (e) {
        console.error("Failed to load Cashfree SDK:", e);
    }

    // ---- 1. Load cart from localStorage ----
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

    // Populate Order Summary
    const itemsContainer = document.getElementById("co-items-container");
    const subtotalEl     = document.getElementById("co-subtotal");
    const totalEl        = document.getElementById("co-total");
    const payBtnLabelEl  = document.getElementById("payBtnLabel");

    let originalPrice = 0;
    
    if (itemsContainer) {
        itemsContainer.innerHTML = "";
        cart.forEach((item, index) => {
            const priceVal = parseFloat((item.itemPrice || "0").replace(/[^\d.]/g, ""));
            originalPrice += isNaN(priceVal) ? 0 : priceVal;
            
            const div = document.createElement("div");
            div.className = "summary-item";
            div.innerHTML = `
                <img id="co-item-img-${index}" src="${item.itemImage}" alt="Simulator" class="summary-img">
                <div class="summary-details">
                    <strong id="co-item-name-${index}">${item.itemName}</strong>
                    <span id="co-item-date-${index}" class="summary-meta">Date: ${item.dateLabel}</span>
                    <span id="co-item-time-${index}" class="summary-meta">Slot: ${item.slot}</span>
                </div>
                <span id="co-item-price-${index}" class="summary-price">${item.itemPrice}</span>
            `;
            itemsContainer.appendChild(div);
        });
    }

    // ---- 1.5 Discount Logic (Dynamic) ----
    const gstEl = document.getElementById("co-gst");
    let appliedDiscount = 0;
    let finalAmount = originalPrice;
    let selectedPaymentMethod = 'cod'; // default

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
    
    // Call initially
    updatePricing();

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


    paymentOptions.forEach(option => {
        option.addEventListener('click', () => {
            paymentOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedPaymentMethod = option.getAttribute('data-method');
            updatePricing();
        });
    });

    // ---- 2. PAY NOW button ----
    const payBtn = document.getElementById("payNowBtn");

    payBtn?.addEventListener("click", async () => {
        const name  = document.getElementById("co-name")?.value.trim();
        const email = document.getElementById("co-email")?.value.trim();
        const phone = document.getElementById("co-phone")?.value.trim();

        if (!name || !email || !phone) {
            alert("Please fill in all required fields before proceeding.");
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
                time: item.slot
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

                // Redirect to success immediately
                window.location.href = `/success.html?order_id=${orderData.order_id || ''}`;

            } else {
                // Cashfree Flow
                const orderRes = await fetch(BACKEND_URL + "/create-order", {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({ 
                        amount, 
                        customer_details: { name, email, phone },
                        order_meta: { return_url: window.location.origin + "/success.html" },
                        booking_data
                    })
                });

                if (!orderRes.ok) {
                    const errData = await orderRes.json();
                    throw new Error(errData.error || "Failed to create order");
                }
                
                const { payment_session_id } = await orderRes.json();

                let checkoutOptions = {
                    paymentSessionId: payment_session_id,
                    redirectTarget: "_self"
                };
                cashfree.checkout(checkoutOptions);
            }

        } catch (err) {
            console.error("Payment error:", err);
            alert("Could not connect to payment server. " + err.message);
            payBtn.disabled         = false;
            updatePricing();
        }
    });
});
