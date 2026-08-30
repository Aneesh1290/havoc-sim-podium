document.addEventListener("DOMContentLoaded", () => {

    // =============================================
    // Mobile Menu
    // =============================================
    const hamburger = document.querySelector(".hamburger-menu");
    const navLinks  = document.querySelector(".nav-links");
    if (hamburger) {
        hamburger.addEventListener("click", () => {
            hamburger.classList.toggle("active");
            navLinks.classList.toggle("active");
        });
    }

    // =============================================
    // Dynamic Month Generation
    // =============================================
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const today      = new Date();
    today.setHours(0,0,0,0);

    const dynamicMonthSelector = document.getElementById("dynamicMonthSelector");
    const dynamicMonthSidebar  = document.getElementById("dynamicMonthSidebar");
    let monthBtns    = [];
    let monthFilters = [];

    // Which month is currently active (for date generation in the modal)
    let activeMonthIdx  = today.getMonth();
    let activeMonthYear = today.getFullYear();

    if (dynamicMonthSelector && dynamicMonthSidebar) {
        const currentDay      = today.getDate();
        const currentMonthIdx = today.getMonth();
        const currentYear     = today.getFullYear();

        let monthsToShow = [];
        monthsToShow.push({ name: monthNames[currentMonthIdx], year: currentYear, val: monthNames[currentMonthIdx].toLowerCase(), idx: currentMonthIdx });

        if (currentDay >= 15) {
            let nextIdx  = (currentMonthIdx + 1) % 12;
            let nextYear = currentMonthIdx + 1 > 11 ? currentYear + 1 : currentYear;
            monthsToShow.push({ name: monthNames[nextIdx], year: nextYear, val: monthNames[nextIdx].toLowerCase(), idx: nextIdx });
        }

        let selectorHTML = "";
        let sidebarHTML  = "";

        monthsToShow.forEach((m, i) => {
            const isActive = i === 0 ? "active" : "";
            selectorHTML += `
                <div class="month-card-btn" data-month="${m.val}" data-year="${m.year}" data-idx="${m.idx}">
                    <div class="mc-content">
                        <h2>${m.name.toUpperCase()}</h2>
                        <span class="mc-year">${m.year}</span>
                        <div class="mc-explore">EXPLORE SIMS &rarr;</div>
                    </div>
                </div>`;
            sidebarHTML += `<li><a href="#" class="month-filter ${isActive}" data-target="${m.val}" data-year="${m.year}" data-idx="${m.idx}">${m.name} ${m.year}</a></li>`;
        });

        dynamicMonthSelector.innerHTML = selectorHTML;
        dynamicMonthSidebar.innerHTML  = sidebarHTML;

        monthBtns    = document.querySelectorAll(".month-card-btn");
        monthFilters = document.querySelectorAll(".month-filter");
    }

    // =============================================
    // View Toggling
    // =============================================
    const monthView       = document.getElementById("monthView");
    const productView     = document.getElementById("productView");
    const currentMonthText = document.getElementById("currentMonthText");
    const productTitles   = document.querySelectorAll(".product-info h4");

    const setMonth = (monthStr, yearStr, monthIdx) => {
        activeMonthIdx  = parseInt(monthIdx, 10);
        activeMonthYear = parseInt(yearStr, 10);

        const titleCase = monthStr.charAt(0).toUpperCase() + monthStr.slice(1) + " " + yearStr;
        const shortMonth = titleCase.substring(0, 3);

        if (currentMonthText) currentMonthText.innerText = titleCase;

        monthFilters.forEach(f => {
            f.classList.remove("active");
            if (f.getAttribute("data-target") === monthStr) f.classList.add("active");
        });

        productTitles.forEach(title => {
            const parts = title.innerText.split("-");
            if (parts.length > 1) {
                title.innerText = `${shortMonth} - ${parts[1].trim()} - ${parts[2].trim()}`;
            }
        });

        if (monthView && productView) {
            monthView.classList.remove("active");
            productView.classList.add("active");
        }
    };

    monthBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            setMonth(btn.getAttribute("data-month"), btn.getAttribute("data-year"), btn.getAttribute("data-idx"));
        });
    });

    monthFilters.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            setMonth(link.getAttribute("data-target"), link.getAttribute("data-year"), link.getAttribute("data-idx"));
        });
    });

    // =============================================
    // Date & Slot Picker Modal
    // =============================================
    const slotModal      = document.getElementById("slotModal");
    const slotModalClose = document.getElementById("slotModalClose");
    const datePillsEl    = document.getElementById("datePills");
    const timePillsEl    = document.getElementById("timePills");
    const slotSummaryEl  = document.getElementById("slotSummary");
    const confirmBtn     = document.getElementById("confirmAddToCart");

    const TIME_SLOTS = [
        "11AM-11:30AM","11:30AM-12PM","12PM-12:30PM","12:30PM-1PM",
        "2PM-2:30PM","2:30PM-3PM",
        "3PM-3:30PM","3:30PM-4PM","4PM-4:30PM","4:30PM-5PM",
        "5PM-5:30PM","5:30PM-6PM","6PM-6:30PM","6:30PM-7PM",
        "7PM-7:30PM","7:30PM-8PM","8PM-8:30PM","8:30PM-9PM",
        "9PM-9:30PM","9:30PM-10PM"
    ];

    // State for the modal
    let pendingProduct = null;  // { name, price, imgSrc }
    let selectedDate   = null;
    let selectedSlot   = null;

    // Build date pills for the active month
    const buildDatePills = () => {
        if (!datePillsEl) return;
        datePillsEl.innerHTML = "";
        const year  = activeMonthYear;
        const month = activeMonthIdx;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj  = new Date(year, month, d);
            const isPast   = dateObj < today;
            const isMonday = dateObj.getDay() === 1;
            const dayName  = dayNames[dateObj.getDay()];
            
            const label    = `${monthNames[month].substring(0,3)} ${d} (${dayName})`;
            const pill     = document.createElement("button");
            
            const isDisabled = isPast || isMonday;
            pill.className = "pill" + (isDisabled ? " pill-disabled" : "");
            
            // Show 'Closed' for Mondays if it's not already passed
            if (isMonday && !isPast) {
                pill.textContent = `${label} - Closed`;
            } else {
                pill.textContent = label;
            }
            
            pill.dataset.date = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            pill.dataset.label = label;
            
            if (!isDisabled) {
                pill.addEventListener("click", () => selectDate(pill));
            }
            datePillsEl.appendChild(pill);
        }
    };

    // Build time slot pills
    const buildTimePills = (selectedDateStr) => {
        if (!timePillsEl) return;
        timePillsEl.innerHTML = "";

        const now         = new Date();
        const isToday     = selectedDateStr === today.toISOString().split("T")[0];
        const currentHour = now.getHours();
        const currentMin  = now.getMinutes();

        // Helper: parse "11AM" -> 11, "11:30AM" -> 11.5, "3:30PM" -> 15.5 etc.
        const parseSlotStart = (slotStr) => {
            const start = slotStr.split("-")[0];
            const isPM  = start.includes("PM");
            const [hRaw, mRaw] = start.replace("AM","").replace("PM","").split(":");
            let hour = parseInt(hRaw, 10);
            const min = mRaw ? parseInt(mRaw, 10) : 0;
            if (isPM && hour !== 12) hour += 12;
            if (!isPM && hour === 12) hour = 0;
            return hour + min / 60;
        };

        // Fetch booked slots
        let bookedSlots = [];
        try {
            timePillsEl.innerHTML = "<span style='color:#555;font-size:0.82rem;'>Checking availability...</span>";
            const res = await fetch(`/api/availability/${dateStr}`);
            const data = await res.json();
            if (data.bookedSlots) bookedSlots = data.bookedSlots;
        } catch (e) {
            console.error("Error fetching availability", e);
        }
        timePillsEl.innerHTML = "";

        TIME_SLOTS.forEach(slot => {
            let isPast = false;
            if (isToday) {
                const slotHour = parseSlotStart(slot);
                const nowDecimal = currentHour + currentMin / 60;
                if (slotHour <= nowDecimal) isPast = true;
            }

            // Check if slot is already booked
            const isBooked = bookedSlots.includes(slot);

            const pill = document.createElement("button");
            pill.className = "pill" + (isPast || isBooked ? " pill-disabled" : "");
            pill.textContent = slot;
            
            if (isBooked) {
                pill.title = "Already booked";
            } else if (!isPast) {
                pill.addEventListener("click", () => selectSlot(pill));
            }
            
            timePillsEl.appendChild(pill);
        });
    };

    const selectDate = async (pill) => {
        datePillsEl.querySelectorAll(".pill").forEach(p => p.classList.remove("selected"));
        pill.classList.add("selected");
        selectedDate = { iso: pill.dataset.date, label: pill.dataset.label };
        await buildTimePills(pill.dataset.date);
        selectedSlot = null;
        updateSummary();
    };

    const selectSlot = (pill) => {
        timePillsEl.querySelectorAll(".pill").forEach(p => p.classList.remove("selected"));
        pill.classList.add("selected");
        selectedSlot = pill.textContent;
        updateSummary();
    };

    const updateSummary = () => {
        if (selectedDate && selectedSlot) {
            slotSummaryEl.textContent = `${selectedDate.label}  •  ${selectedSlot}`;
            slotSummaryEl.classList.add("has-selection");
            confirmBtn.disabled = false;
        } else if (selectedDate) {
            slotSummaryEl.textContent = `${selectedDate.label}  •  Pick a time slot`;
            slotSummaryEl.classList.remove("has-selection");
            confirmBtn.disabled = true;
        } else {
            slotSummaryEl.textContent = "Select a date and time slot to continue";
            slotSummaryEl.classList.remove("has-selection");
            confirmBtn.disabled = true;
        }
    };

    const openModal = (product) => {
        pendingProduct = product;
        selectedDate   = null;
        selectedSlot   = null;

        document.getElementById("modalProductName").innerText  = product.name;
        document.getElementById("modalProductPrice").innerText = product.price;
        document.getElementById("modalProductImg").src         = product.imgSrc;

        buildDatePills();
        if (timePillsEl) timePillsEl.innerHTML = "<span style='color:#555;font-size:0.82rem;'>Select a date first</span>";
        updateSummary();

        slotModal.classList.add("open");
        document.body.style.overflow = "hidden";
    };

    const closeModal = () => {
        slotModal.classList.remove("open");
        document.body.style.overflow = "";
    };

    slotModalClose?.addEventListener("click", closeModal);
    slotModal?.addEventListener("click", (e) => { if (e.target === slotModal) closeModal(); });

    // =============================================
    // Cart Logic
    // =============================================
    const cartDrawer   = document.getElementById("cartDrawer");
    const closeCartBtn = document.querySelector(".close-cart");
    const cartItemName  = document.getElementById("cartItemName");
    const cartItemPrice = document.getElementById("cartItemPrice");
    const cartTotal     = document.getElementById("cartTotal");
    const cartItemImage = document.getElementById("cartItemImage");
    const cartCount     = document.getElementById("cartCount");

    // Intercept Add to Cart — open modal first
    document.querySelectorAll(".add-to-cart").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const card   = e.target.closest(".product-card");
            const name   = card.querySelector("h4").innerText;
            const price  = card.querySelector(".product-price").innerText;
            const imgSrc = card.querySelector("img").src;
            openModal({ name, price, imgSrc });
        });
    });

    closeCartBtn?.addEventListener("click", () => cartDrawer?.classList.remove("open"));

    // Remove Item from Cart
    const removeCartBtn = document.getElementById("removeCartItem");
    const cartItemDiv = document.querySelector(".cart-item");

    removeCartBtn?.addEventListener("click", () => {
        // Clear variables
        pendingProduct = null;
        selectedDate = null;
        selectedSlot = null;
        
        // Hide the item visually
        if (cartItemDiv) cartItemDiv.style.display = "none";
        
        // Update summary numbers
        if (cartCount) cartCount.innerText = "0";
        if (cartTotal) cartTotal.innerText = "₹0.00";
        
        // Disable checkout
        const checkoutBtn = document.querySelector(".checkout-btn");
        if (checkoutBtn) {
            checkoutBtn.disabled = true;
            checkoutBtn.style.opacity = "0.5";
            checkoutBtn.style.cursor = "not-allowed";
        }
        
        // Clear local storage
        localStorage.removeItem("havoc_cart");
    });

    // Make sure cart-item is visible when adding
    // Confirm from modal -> add to cart
    confirmBtn?.addEventListener("click", () => {
        if (!pendingProduct || !selectedDate || !selectedSlot) return;

        if (cartItemDiv) cartItemDiv.style.display = "flex"; // Restore visibility if it was removed
        
        const checkoutBtn = document.querySelector(".checkout-btn");
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.style.opacity = "1";
            checkoutBtn.style.cursor = "pointer";
        }

        if (cartItemName)  cartItemName.innerText  = pendingProduct.name;
        if (cartItemPrice) cartItemPrice.innerText = pendingProduct.price;
        if (cartTotal)     cartTotal.innerText     = pendingProduct.price;
        if (cartItemImage) cartItemImage.src       = pendingProduct.imgSrc;

        // Show date + slot in cart
        let slotEl = document.querySelector(".cart-item-slot");
        if (!slotEl) {
            slotEl = document.createElement("p");
            slotEl.className = "cart-item-slot";
            cartItemPrice?.parentElement?.insertBefore(slotEl, cartItemPrice);
        }
        slotEl.textContent = `${selectedDate.label}  •  ${selectedSlot}`;

        if (cartCount) cartCount.innerText = "1";

        closeModal();
        cartDrawer?.classList.add("open");
    });

    closeCartBtn?.addEventListener("click", () => cartDrawer?.classList.remove("open"));

    // Checkout -> save to localStorage and redirect
    const checkoutBtn = document.querySelector(".checkout-btn");
    checkoutBtn?.addEventListener("click", () => {
        const cartData = {
            itemName:  cartItemName?.innerText  || "",
            itemPrice: cartItemPrice?.innerText || "",
            itemImage: cartItemImage?.src       || "",
            date:      selectedDate?.iso        || "",
            dateLabel: selectedDate?.label      || "",
            slot:      selectedSlot             || ""
        };
        localStorage.setItem("havoc_cart", JSON.stringify(cartData));
        window.location.href = "/checkout";
    });

    // =============================================
    // Filtering Logic
    // =============================================
    const sortSelect = document.querySelector(".sort-select");
    const productCards = document.querySelectorAll(".product-card");
    const productCountSpan = document.querySelector(".product-filters span");

    sortSelect?.addEventListener("change", (e) => {
        const filter = e.target.value;
        let visibleCount = 0;

        productCards.forEach(card => {
            const category = card.dataset.category;
            if (filter === "Racing Simulators" && category !== "racing") {
                card.style.display = "none";
            } else if (filter === "Flight Simulators" && category !== "flight") {
                card.style.display = "none";
            } else {
                card.style.display = "block";
                visibleCount++;
            }
        });
        
        if (productCountSpan) {
            productCountSpan.innerText = `${visibleCount} products`;
        }
    });
});
