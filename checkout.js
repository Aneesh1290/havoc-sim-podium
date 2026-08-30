// =============================================
// CHECKOUT PAGE LOGIC (CASHFREE)
// =============================================

// Backend URL -- Replace with deployed server URL in production
const BACKEND_URL = "http://localhost:3000";

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
    const raw  = localStorage.getItem("havoc_cart");
    const cart = raw ? JSON.parse(raw) : null;

    if (!cart || !cart.itemName) {
        window.location.href = "/book";
        return;
    }

    // Populate Order Summary
    const itemNameEl    = document.getElementById("co-item-name");
    const itemPriceEl   = document.getElementById("co-item-price");
    const itemImgEl     = document.getElementById("co-item-img");
    const subtotalEl    = document.getElementById("co-subtotal");
    const totalEl       = document.getElementById("co-total");
    const payBtnLabelEl = document.getElementById("payBtnLabel");
    const dateMetaEl    = document.getElementById("co-item-date");
    const timeMetaEl    = document.getElementById("co-item-time");

    if (itemNameEl)    itemNameEl.innerText    = cart.itemName;
    if (itemPriceEl)   itemPriceEl.innerText   = cart.itemPrice;
    if (itemImgEl)     itemImgEl.src           = cart.itemImage;
    if (subtotalEl)    subtotalEl.innerText    = cart.itemPrice;
    if (totalEl)       totalEl.innerText       = cart.itemPrice;
    if (payBtnLabelEl) payBtnLabelEl.innerText = "PAY " + cart.itemPrice;

    // Pre-fill date/slot from cart
    if (cart.dateLabel && dateMetaEl) dateMetaEl.innerText = "Date: " + cart.dateLabel;
    if (cart.slot && timeMetaEl)      timeMetaEl.innerText = "Slot: " + cart.slot;

    // Pre-fill form fields with cart selection (read-only)
    const dateInput = document.getElementById("co-date");
    const timeInput = document.getElementById("co-time");
    if (dateInput && cart.date) {
        dateInput.value    = cart.date;
        dateInput.readOnly = true;
        dateInput.style.opacity = "0.6";
        dateInput.style.cursor  = "not-allowed";
    }
    if (timeInput && cart.slot) {
        const opt = new Option(cart.slot, cart.slot, true, true);
        timeInput.add(opt, 0);
        timeInput.value    = cart.slot;
        timeInput.disabled = true;
        timeInput.style.opacity = "0.6";
        timeInput.style.cursor  = "not-allowed";
    }

    // ---- 1.5 Discount Logic (Dynamic) ----
    let appliedDiscount = 0;
    const originalPrice = parseFloat((cart.itemPrice || "0").replace(/[^\d.]/g, ""));
    let finalAmount = originalPrice;

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
                
                if (totalEl) totalEl.innerText = `₹${finalAmount.toFixed(2)}`;
                if (payBtnLabelEl) payBtnLabelEl.innerText = `PAY ₹${finalAmount.toFixed(2)}`;
                
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

    // ---- 2. PAY NOW button ----
    const payBtn = document.getElementById("payNowBtn");

    payBtn?.addEventListener("click", async () => {
        const name  = document.getElementById("co-name")?.value.trim();
        const email = document.getElementById("co-email")?.value.trim();
        const phone = document.getElementById("co-phone")?.value.trim();
        const date  = dateInput?.value;
        const time  = timeInput?.value;

        if (!name || !email || !phone || !date || !time) {
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
                item: cart.itemName,
                price: `₹${amount.toFixed(2)}`,
                date: cart.date,
                dateLabel: cart.dateLabel,
                time: cart.slot,
                status: 'pending'
            };
            localStorage.setItem("havoc_recent_booking", JSON.stringify(bookingDetails));

            // Create Order via backend
            const orderRes = await fetch(BACKEND_URL + "/create-order", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ 
                    amount, 
                    customer_details: { name, email, phone },
                    order_meta: { return_url: window.location.origin + "/success.html" },
                    booking_data: {
                        item_name: cart.itemName,
                        date: cart.dateLabel,
                        time: cart.slot
                    }
                })
            });

            if (!orderRes.ok) {
                const errData = await orderRes.json();
                throw new Error(errData.error || "Failed to create order");
            }
            
            const { payment_session_id } = await orderRes.json();

            // Redirect to Cashfree checkout
            let checkoutOptions = {
                paymentSessionId: payment_session_id,
                redirectTarget: "_self"
            };

            cashfree.checkout(checkoutOptions);

        } catch (err) {
            console.error("Payment error:", err);
            alert("Could not connect to payment server. " + err.message);
            payBtn.disabled         = false;
            payBtnLabelEl.innerText = "PAY " + cart.itemPrice;
        }
    });
});
