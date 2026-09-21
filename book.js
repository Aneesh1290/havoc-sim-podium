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

    let TIME_SLOTS = [];

    // State for the modal
    let pendingProduct = null;  // { name, price, imgSrc }
    let selectedDate   = null;
    let selectedSlot   = null;
    let selectedInstructor = null;

    // Build date pills for the active month
    const buildDatePills = () => {
        if (!datePillsEl) return;
        datePillsEl.innerHTML = "";
        const year  = activeMonthYear;
        const month = activeMonthIdx;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let customOpts = [];
        try {
            if (pendingProduct && pendingProduct.options) {
                customOpts = typeof pendingProduct.options === 'string' ? JSON.parse(pendingProduct.options) : pendingProduct.options;
                if (!Array.isArray(customOpts)) customOpts = [];
            }
        } catch(e) {}
        
        // "Select Date" choices = the enabled/open days (whitelist). All others = closed.
        const dateOption = customOpts.find(o => o.name && o.name.toLowerCase().includes("date"));
        const enabledDays = (dateOption && dateOption.choices && dateOption.choices.length > 0)
            ? new Set(dateOption.choices)
            : null; // null = no restriction (use default calendar logic)

        // Track which months have ANY saved data, so brand-new months default to OPEN
        const savedMonths = new Set();
        if (dateOption && dateOption.choices) {
            dateOption.choices.forEach(c => {
                const m = c.match(/^(\w+)/);
                if (m) savedMonths.add(m[1]);
            });
        }

        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj  = new Date(year, month, d);
            let isPast   = dateObj < today;
            let isMonday = dateObj.getDay() === 1;
            const dayName  = dayNames[dateObj.getDay()];
            const label    = `${monthNames[month].substring(0,3)} ${d} (${dayName})`;
            
            // Build the "September 05 (Fri)" style string for whitelist lookup (new format)
            // Also support old format "September 05" for backward compat
            const fullMonthLabel = `${monthNames[month]} ${String(d).padStart(2,'0')} (${dayName})`;
            const fullMonthLabelOld = `${monthNames[month]} ${String(d).padStart(2,'0')}`;
            const thisMonthName = monthNames[month]; // e.g. "October"
            
            let isForceClosed = false;
            
            if (enabledDays !== null) {
                // If this month was NEVER saved (brand-new month), treat it as open by default
                const monthWasSaved = savedMonths.has(thisMonthName);
                if (monthWasSaved) {
                    // Month is known — use whitelist strictly
                    const isEnabled = enabledDays.has(fullMonthLabel) || enabledDays.has(fullMonthLabelOld);
                    if (!isEnabled) {
                        isForceClosed = true;
                    } else {
                        isMonday = false; // If explicitly enabled, override Monday rule
                    }
                }
                // else: month not in saved data → leave isForceClosed = false (open by default)
            }
            // If no custom dates saved, fall back to: close Mondays only
            
            const pill = document.createElement("button");
            const isDisabled = isPast || isMonday || isForceClosed;
            pill.className = "pill" + (isDisabled ? " pill-disabled" : "");
            
            if ((isMonday || isForceClosed) && !isPast) {
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
        
        let customOpts = [];
        try {
            if (pendingProduct && pendingProduct.options) {
                customOpts = typeof pendingProduct.options === 'string' ? JSON.parse(pendingProduct.options) : pendingProduct.options;
            }
        } catch(e) {}
        
        let availableSlots = [...TIME_SLOTS];
        const timeOption = customOpts.find(o => o.name && o.name.toLowerCase().includes("time"));
        if (timeOption && timeOption.choices && timeOption.choices.length > 0) {
            availableSlots = timeOption.choices;
        }

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

        const exceptionsOpt = customOpts.find(o => o.name === "Exceptions");
        const slotExceptions = (exceptionsOpt && exceptionsOpt.choices) ? exceptionsOpt.choices : [];
        
        const dateParts = selectedDateStr.split('-');
        const dObj = new Date(dateParts[0], parseInt(dateParts[1])-1, dateParts[2]);
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const fullDateLabel = `${monthNames[dObj.getMonth()]} ${String(dObj.getDate()).padStart(2,'0')} (${dayNames[dObj.getDay()]})`;

        availableSlots.forEach(slot => {
            let isPast = false;
            if (isToday) {
                const slotHour = parseSlotStart(slot);
                const nowDecimal = currentHour + currentMin / 60;
                if (slotHour <= nowDecimal) isPast = true;
            }

            // Check if slot is already booked or is an exception
            let isBooked = bookedSlots.includes(slot);
            if (!isBooked && slotExceptions.includes(`${fullDateLabel}|${slot}`)) {
                isBooked = true; // Treat exception as booked
            }

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

    const selectInstructor = (pill, instructor, container) => {
        if (pill.classList.contains("selected")) {
            // deselect
            pill.classList.remove("selected");
            selectedInstructor = null;
        } else {
            container.querySelectorAll(".instructor-pill").forEach(p => p.classList.remove("selected"));
            pill.classList.add("selected");
            selectedInstructor = instructor;
        }
    };

    const updateSummary = () => {
        if (selectedDate && selectedSlot) {
            let text = `${selectedDate.label}  •  ${selectedSlot}`;
            slotSummaryEl.textContent = text;
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
        selectedInstructor = null;

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
    const navCartBtn    = document.getElementById("navCartBtn");
    const navCartCount  = document.getElementById("navCartCount");
    const mobileCartCount = document.getElementById("mobileCartCount");
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
        // Sanitize: remove huge base64 images from existing cart items to fix QuotaExceededError
        let modified = false;
        cart.forEach(item => {
            if (item.itemImage) {
                delete item.itemImage;
                modified = true;
            }
        });
        if (modified) localStorage.setItem("havoc_cart", JSON.stringify(cart));
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
            const instFee = item.instructorFee ? parseFloat(item.instructorFee) : 0;
            const itemTotal = (isNaN(priceVal) ? 0 : priceVal) + instFee;
            total += itemTotal;
            
            const matchedProduct = window.havocProducts ? window.havocProducts.find(p => p.name === item.itemName) : null;
            const imgSrc = (matchedProduct && matchedProduct.image_url) ? matchedProduct.image_url : (item.itemImage || 'havoc_logo.png');

            const div = document.createElement("div");
            div.className = "cart-item";
            div.innerHTML = `
                <img src="${imgSrc}" alt="Sim" id="cartItemImage_${index}">
                <div class="cart-item-details" style="width: 100%;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem;">
                        <h4 style="margin:0; flex:1; line-height:1.3;">${item.itemName}</h4>
                        <button class="remove-item-btn" data-index="${index}" aria-label="Remove item" style="background:transparent;border:none;color:rgba(255,255,255,0.6);cursor:pointer;font-size:1.8rem;line-height:0.8;padding:0;transition:0.2s;">&times;</button>
                    </div>
                    <p class="cart-item-slot" style="margin:0.2rem 0; color:#888; font-size:0.85rem;">${item.dateLabel}  •  ${item.slot}</p>
                    ${item.instructor ? `<div style="display:flex; justify-content:space-between; align-items:center; margin:0.4rem 0;"><span style="color:var(--gold); font-size:0.85rem; font-weight:500; margin:0;">👨‍✈️ Instructor: ${item.instructor.name}</span><span style="color:var(--gold); font-size:0.85rem; font-weight:500;">+₹${instFee.toFixed(2)}</span></div>` : ''}
                    <div class="cart-price" style="margin-top: 0.5rem; font-weight: 600; font-size: 1.1rem; color: #fff;">₹${itemTotal.toFixed(2)}</div>
                </div>
            `;
            cartItemsContainer.appendChild(div);
        });
        
        if (cartCount) cartCount.innerText = cart.length;
        if (navCartCount) navCartCount.innerText = cart.length;
        if (mobileCartCount) mobileCartCount.innerText = cart.length;
        // navCartBtn is always visible — no need to toggle display
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

    // Fetch dynamic products and slots
    async function loadProductsAndSlots() {
        try {
            const [slotsRes, productsRes] = await Promise.all([
                fetch('/api/slots'),
                fetch('/api/products')
            ]);
            
            const slots = await slotsRes.json();
            TIME_SLOTS = slots.map(s => s.time_range);

            const products = await productsRes.json();
            window.havocProducts = products; // Save globally for cart rendering
            const productGrid = document.getElementById('publicProductGrid');
            if (productGrid) {
                productGrid.innerHTML = products.map(p => {
                    const imgHtml = p.image_url ? `<img src="${p.image_url}" alt="${p.name}">` : `<div style="width:100%; height:180px; background:#222;"></div>`;
                    return `
                    <div class="product-card" data-category="${p.type.toLowerCase()}">
                        ${imgHtml}
                        <div class="product-info">
                            <h4>${p.name} ${p.description ? `- ${p.description}` : ''}</h4>
                            <div class="product-price">
                                ${p.compare_price && p.compare_price > p.price ? `<span style="text-decoration: line-through; color: #888; font-size: 0.85em; margin-right: 6px;">₹${parseFloat(p.compare_price).toFixed(2)}</span>` : ''}
                                ₹${p.price.toFixed(2)} <span style="font-size: 0.7em; color: #888;">+ GST</span>
                            </div>
                            ${p.stock_quantity > 0 ? `<button class="btn btn-product add-to-cart" data-id="${p.id}">Add to Cart</button>` : `<button class="btn btn-product" disabled>Sold Out</button>`}
                        </div>
                    </div>
                    `;
                }).join('');

                // Intercept Add to Cart -> open modal first
                document.querySelectorAll(".add-to-cart").forEach(btn => {
                    btn.addEventListener("click", (e) => {
                        const id = e.target.getAttribute("data-id");
                        const p = products.find(prod => prod.id == id);
                        if (!p) return;
                        openModal({ name: p.name, type: p.type, price: `₹${parseFloat(p.price).toFixed(2)}`, imgSrc: p.image_url, options: p.options });
                    });
                });

                const dynamicCategorySidebar = document.getElementById('dynamicCategorySidebar');
                if (dynamicCategorySidebar) {
                    const types = [...new Set(products.map(p => p.type).filter(Boolean))];
                    let categoryHtml = '<li class="active" data-category="all">All Simulators</li>';
                    types.forEach(t => {
                        categoryHtml += `<li data-category="${t.toLowerCase()}">${t}</li>`;
                    });
                    dynamicCategorySidebar.innerHTML = categoryHtml;
                    
                    // Add click handlers for category filtering
                    const catItems = dynamicCategorySidebar.querySelectorAll('li');
                    catItems.forEach(item => {
                        item.addEventListener('click', () => {
                            catItems.forEach(i => i.classList.remove('active'));
                            item.classList.add('active');
                            
                            const selectedCategory = item.getAttribute('data-category');
                            const productCards = productGrid.querySelectorAll('.product-card');
                            
                            productCards.forEach(card => {
                                if (selectedCategory === 'all' || card.getAttribute('data-category') === selectedCategory) {
                                    card.style.display = 'block';
                                } else {
                                    card.style.display = 'none';
                                }
                            });
                        });
                    });
                }
            }
        } catch (err) {
            console.error("Failed to load products/slots", err);
        }
    }
    
    loadProductsAndSlots();

    closeCartBtn?.addEventListener("click", () => cartDrawer?.classList.remove("open"));
    
    if (navCartBtn) {
        navCartBtn.addEventListener("click", () => {
            cartDrawer?.classList.add("open");
        });
    }
    
    // Also close the cart when "Add More Bookings" is clicked
    const addMoreBtn = document.getElementById("addMoreBtn");
    addMoreBtn?.addEventListener("click", () => cartDrawer?.classList.remove("open"));

    const instructorPromptModal = document.getElementById("instructorPromptModal");
    const instructorContainerInPrompt = document.getElementById("instructorContainer");

    const addToCartAndClose = () => {
        const instructorFee = selectedInstructor ? (selectedInstructor.fee != null ? selectedInstructor.fee : 500) : 0;
        const cartItem = {
            id: Date.now().toString(),
            itemName: pendingProduct.name,
            itemPrice: pendingProduct.price,
            date: selectedDate.iso,
            dateLabel: selectedDate.label,
            slot: selectedSlot,
            instructor: selectedInstructor,
            instructorFee: instructorFee
        };
        
        cart.push(cartItem);
        localStorage.setItem("havoc_cart", JSON.stringify(cart));
        
        renderCart();
        closeModal();
        instructorPromptModal?.classList.remove("open");
        cartDrawer?.classList.add("open");
    };

    // Confirm from modal -> add to cart
    confirmBtn?.addEventListener("click", async () => {
        if (!pendingProduct || !selectedDate || !selectedSlot) return;

        selectedInstructor = null;

        if (instructorPromptModal && instructorContainerInPrompt) {
            try {
                const res = await fetch(`/api/available-instructors?date=${selectedDate.iso}&time=${encodeURIComponent(selectedSlot)}`);
                const instructors = await res.json();
                const available = instructors.filter(i => {
                    const instType = i.simulator_type || 'All';
                    if (instType === 'All') return true;
                    if (instType === pendingProduct.type) return true;
                    
                    const prodName = (pendingProduct.name || '').toLowerCase();
                    if (instType === 'Racing' && (prodName.includes('race') || prodName.includes('racing') || prodName.includes('f1') || prodName.includes('gt') || prodName.includes('driving'))) {
                        return true;
                    }
                    if (instType === 'Flying' && (prodName.includes('flight') || prodName.includes('flying') || prodName.includes('rc') || prodName.includes('airbus') || prodName.includes('boeing'))) {
                        return true;
                    }
                    
                    return false;
                });
                
                if (available.length > 0) {
                    instructorContainerInPrompt.innerHTML = available.map(inst => `
                        <div class="pill instructor-pill" style="display:flex; flex-direction:column; gap:0.5rem; padding:1rem; border:1px solid var(--border); border-radius:12px; cursor:pointer; color:#fff; white-space:normal; text-align:left;" data-id="${inst.id}">
                            <div style="display:flex; align-items:center; gap:1rem; width:100%;">
                                ${inst.photo_url ? `<img src="${inst.photo_url}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0;">` : `<div style="width:48px;height:48px;border-radius:50%;background:#383b4d;flex-shrink:0;"></div>`}
                                <div style="flex:1;">
                                    <div style="font-weight:600; font-size:1.05rem;">${inst.name}</div>
                                    <div style="font-size:0.85rem; color:var(--muted);">${inst.role || 'Instructor'}</div>
                                </div>
                                <div style="font-weight:700; color:var(--gold); font-size:1rem;">+ ₹${inst.fee != null ? inst.fee : 500}</div>
                            </div>
                            ${inst.biography ? `<div style="font-size:0.85rem; color:rgba(255,255,255,0.7); line-height:1.4; border-top:1px solid rgba(255,255,255,0.05); padding-top:0.6rem; margin-top:0.4rem; white-space:normal;">${inst.biography}</div>` : ''}
                        </div>

                    `).join("");
                    
                    instructorContainerInPrompt.querySelectorAll('.instructor-pill').forEach((pill) => {
                        pill.addEventListener('click', () => {
                            const id = pill.dataset.id;
                            const instructor = available.find(i => i.id == id);
                            selectInstructor(pill, instructor, instructorContainerInPrompt);
                        });
                    });

                    instructorPromptModal.classList.add("open");
                } else {
                    addToCartAndClose();
                }
            } catch (err) {
                console.error(err);
                addToCartAndClose();
            }
        } else {
            addToCartAndClose();
        }
    });

    document.getElementById("skipInstructorBtn")?.addEventListener("click", () => {
        selectedInstructor = null;
        addToCartAndClose();
    });

    document.getElementById("confirmInstructorBtn")?.addEventListener("click", () => {
        if (!selectedInstructor) {
            alert("Please select an instructor before pressing continue. If you do not want an instructor, press Skip.");
            return;
        }
        addToCartAndClose();
    });

    document.getElementById("instructorPromptClose")?.addEventListener("click", () => {
        instructorPromptModal?.classList.remove("open");
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
