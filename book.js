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
    const buildTimePills = async (selectedDateStr) => {
        if (!timePillsEl) return;
        timePillsEl.innerHTML = "";

        const now         = new Date();
        const localDateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
        const isToday     = selectedDateStr === localDateStr;
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
            let url = `/api/availability/${encodeURIComponent(selectedDate.label)}`;
            if (pendingProduct && pendingProduct.name) {
                url += `?item=${encodeURIComponent(pendingProduct.name)}`;
            }
            const res = await fetch(url);
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
    const cartTotal     = document.getElementById("cartTotal");
    const cartCount     = document.getElementById("cartCount");
    const cartItemsContainer = document.getElementById("cartItemsContainer");
    
    // Initialize cart state
    let cart = [];
    try {
        cart = JSON.parse(localStorage.getItem("havoc_cart")) || [];
        if (!Array.isArray(cart)) {
            // Migration from old single-item cart to array
            if (cart.itemName) cart = [cart];
            else cart = [];
        }
    } catch(e) {
        cart = [];
    }

    // Function to render cart
    const renderCart = () => {
        if (!cartItemsContainer) return;
        
        cartItemsContainer.innerHTML = "";
        let total = 0;
        
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = "<p style='color:#888; text-align:center; padding: 2rem 0;'>Your cart is empty</p>";
        }
        
        cart.forEach((item, index) => {
            const priceVal = parseFloat((item.itemPrice || "0").replace(/[^0-9.]/g, ""));
            total += isNaN(priceVal) ? 0 : priceVal;
            
            const div = document.createElement("div");
            div.className = "cart-item";
            div.innerHTML = `
                <img src="${item.itemImage}" alt="Sim" id="cartItemImage_${index}">
                <div class="cart-item-details">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem;">
                        <h4 style="margin:0; flex:1; line-height:1.3;">${item.itemName}</h4>
                        <button class="remove-item-btn" data-index="${index}" aria-label="Remove item" style="background:transparent;border:none;color:rgba(255,255,255,0.6);cursor:pointer;font-size:1.8rem;line-height:0.8;padding:0;transition:0.2s;">&times;</button>
                    </div>
                    <p class="cart-item-slot" style="margin:0.2rem 0; color:#888; font-size:0.85rem;">${item.dateLabel}  •  ${item.slot}</p>
                    <div class="cart-price">${item.itemPrice}</div>
                </div>
            `;
            cartItemsContainer.appendChild(div);
        });
        
        if (cartCount) cartCount.innerText = cart.length;
        if (cartTotal) cartTotal.innerText = `₹${total.toFixed(2)}`;
        
        const checkoutBtn = document.querySelector(".checkout-btn");
        if (checkoutBtn) {
            if (cart.length > 0) {
                checkoutBtn.disabled = false;
                checkoutBtn.style.opacity = "1";
                checkoutBtn.style.cursor = "pointer";
            } else {
                checkoutBtn.disabled = true;
                checkoutBtn.style.opacity = "0.5";
                checkoutBtn.style.cursor = "not-allowed";
            }
        }
        
        // Add listeners to remove buttons
        document.querySelectorAll(".remove-item-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const idx = parseInt(e.target.dataset.index, 10);
                cart.splice(idx, 1);
                localStorage.setItem("havoc_cart", JSON.stringify(cart));
                renderCart();
            });
        });
    };
    
    // Initial render
    renderCart();

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

    // Confirm from modal -> add to cart
    confirmBtn?.addEventListener("click", () => {
        if (!pendingProduct || !selectedDate || !selectedSlot) return;

        const cartItem = {
            id: Date.now().toString(),
            itemName: pendingProduct.name,
            itemPrice: pendingProduct.price,
            itemImage: pendingProduct.imgSrc,
            date: selectedDate.iso,
            dateLabel: selectedDate.label,
            slot: selectedSlot
        };
        
        cart.push(cartItem);
        localStorage.setItem("havoc_cart", JSON.stringify(cart));
        
        renderCart();
        closeModal();
        cartDrawer?.classList.add("open");
    });

    // Checkout -> redirect
    const checkoutBtn = document.querySelector(".checkout-btn");
    checkoutBtn?.addEventListener("click", () => {
        if (cart.length > 0) {
            window.location.href = "/checkout";
        }
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
