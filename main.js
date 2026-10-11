document.addEventListener('DOMContentLoaded', () => {

    // Mobile Menu Toggle
    const hamburger = document.querySelector('.hamburger-menu');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }
    
    // Close mobile menu on link click
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });

    // Sticky Navbar on Scroll
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Scroll Animations (Fade Up & Stagger)
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // If it's the stats section, animate numbers
                if (entry.target.classList.contains('stats-section')) {
                    animateCounters();
                }
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe individual fade elements
    document.querySelectorAll('.fade-in-up').forEach(el => {
        observer.observe(el);
    });

    // Observe stagger containers
    document.querySelectorAll('.stagger-container').forEach(el => {
        observer.observe(el);
    });

    // Hero Image Mouse Parallax
    const heroImage = document.getElementById('hero-img');
    const heroSection = document.querySelector('.hero');
    
    if (heroImage && heroSection && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && window.innerWidth > 768) {
        heroSection.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 15; // Max 7.5px movement
            const y = (e.clientY / window.innerHeight - 0.5) * 15;
            
            heroImage.style.transform = `translate(${-x}px, ${-y}px) scale(1.05)`;
        });
        
        // Reset on mouseleave
        heroSection.addEventListener('mouseleave', () => {
            heroImage.style.transform = `translate(0px, 0px) scale(1.05)`;
        });
    }

    // Number Counters Animation
    function animateCounters() {
        const counters = document.querySelectorAll('.stat-number');
        const duration = 1500; // 1.5 seconds

        counters.forEach(counter => {
            const target = parseFloat(counter.getAttribute('data-target'));
            const suffix = counter.getAttribute('data-suffix') || '';
            const decimals = parseInt(counter.getAttribute('data-decimals')) || 0;
            
            let startTimestamp = null;
            
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                
                // Ease out cubic
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const currentVal = (easeOut * target).toFixed(decimals);
                
                counter.innerText = currentVal + suffix;
                
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                }
            };
            
            window.requestAnimationFrame(step);
        });
    }

    // Lightbox for Gallery
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.close-lightbox');
    const galleryItems = document.querySelectorAll('.gallery-item');

    if (lightbox && lightboxImg) {
        galleryItems.forEach(item => {
            item.addEventListener('click', () => {
                const img = item.querySelector('.gallery-img');
                if (img) {
                    lightboxImg.src = img.src;
                    lightbox.classList.add('active');
                    document.body.style.overflow = 'hidden'; // prevent scrolling
                }
            });
        });

        const closeLightbox = () => {
            lightbox.classList.remove('active');
            document.body.style.overflow = 'auto';
        };

        closeBtn.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
    }

    // Simulator Carousel & Tabs Logic - Dynamic Fetching
    const carouselContainer = document.querySelector('.simulator-cards');
    const dynamicTabsContainer = document.getElementById('dynamicExperienceTabs');
    const prevBtn = document.querySelector('.nav-btn.prev');
    const nextBtn = document.querySelector('.nav-btn.next');

    async function loadSimulatorCards() {
        if (!carouselContainer || !dynamicTabsContainer) return;

        try {
            const response = await fetch('/api/products');
            const products = await response.json();

            // Extract unique categories
            const categoryMap = {}; products.forEach(p => { if (p.type && categoryMap[p.type] === undefined) { categoryMap[p.type] = p.hide_suffix; } else if (p.type && p.hide_suffix) { categoryMap[p.type] = 1; } }); const types = Object.keys(categoryMap);
            
            // Generate Tabs
            let tabsHtml = '';
            types.forEach((type, index) => {
                const activeClass = index === 0 ? 'active' : '';
                const hideSuffix = categoryMap[type]; const label = hideSuffix ? type.toUpperCase() : `${type.toUpperCase()} SIMULATORS`; tabsHtml += `<button class="tab-btn ${activeClass}" data-category="${type.toLowerCase()}">${label}</button>`;
            });
            dynamicTabsContainer.innerHTML = tabsHtml;

            // Generate Cards
            let cardsHtml = '';
            products.forEach(p => {
                const category = p.type.toLowerCase();
                const displayStyle = category === types[0]?.toLowerCase() ? 'block' : 'none';
                
                let images = [];
                try {
                    if (p.images_json) {
                        const parsed = typeof p.images_json === 'string' ? JSON.parse(p.images_json) : p.images_json;
                        if (Array.isArray(parsed) && parsed.length > 0) images = parsed;
                    }
                } catch(e) {}
                if (images.length === 0 && p.image_url) {
                    images = [p.image_url];
                }

                let imgWrapHtml = '';
                if (images.length > 1) {
                    const slidesHtml = images.map((src, idx) => `
                        <div class="sim-slider-slide">
                            <img src="${src}" alt="${p.name} - Angle ${idx + 1}" loading="lazy">
                        </div>
                    `).join('');
                    const dotsHtml = images.map((_, idx) => `
                        <span class="sim-slider-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></span>
                    `).join('');
                    imgWrapHtml = `
                    <div class="sim-img-wrap sim-slider-wrap" data-sim-id="${p.id}">
                        <div class="sim-slider-track">${slidesHtml}</div>
                        <button type="button" class="sim-slider-btn prev" aria-label="Previous angle">&#10094;</button>
                        <button type="button" class="sim-slider-btn next" aria-label="Next angle">&#10095;</button>
                        <div class="sim-slider-dots">${dotsHtml}</div>
                    </div>
                    `;
                } else if (images.length === 1) {
                    imgWrapHtml = `<div class="sim-img-wrap"><img src="${images[0]}" alt="${p.name}"></div>`;
                } else {
                    imgWrapHtml = `<div class="sim-img-wrap" style="background:#222;"></div>`;
                }
                
                const hasDetailedDesc = p.description && p.description.trim().length > 0;
                
                cardsHtml += `
                <div class="sim-card" data-category="${category}" style="display: ${displayStyle};">
                    ${p.compare_price && p.compare_price > p.price ? '<div class="badge">SALE</div>' : ''}
                    ${imgWrapHtml}
                    <div class="sim-info">
                        <div class="sim-type">${p.hide_suffix ? p.type.toUpperCase() : `${p.type.toUpperCase()} SIM`}</div>
                        <h3>${p.name}</h3>
                        <div class="sim-meta">
                            <span>⏱ 30 MINUTES</span>
                        </div>
                        <div class="sim-price">
                            ${p.compare_price && p.compare_price > p.price ? `<span style="text-decoration: line-through; color: #888; font-size: 0.85em; margin-right: 6px;">₹${parseFloat(p.compare_price).toFixed(2)}</span>` : ''}₹${parseFloat(p.price).toFixed(2)}
                        </div>
                        <div class="sim-actions">
                            ${hasDetailedDesc ? `<button class="btn-specs view-specs-btn" data-id="${p.id}">View Specs</button>` : ''}
                            <a href="/book" class="btn btn-card">BOOK NOW</a>
                        </div>
                    </div>
                </div>
                `;
            });
            carouselContainer.innerHTML = cardsHtml;

            // Initialize sliders on home screen cards
            initSimCardSliders(carouselContainer);

            // Wire "View Specs" modal triggers
            const modal = document.getElementById('simDetailsModal');
            const modalClose = document.getElementById('sdmClose');
            const sdmImg = document.getElementById('sdmImg');
            const sdmType = document.getElementById('sdmType');
            const sdmTitle = document.getElementById('sdmTitle');
            const sdmPrice = document.getElementById('sdmPrice');
            const sdmBody = document.getElementById('sdmBody');

            const formatSpecsHtml = (text) => {
                if (!text) return '';
                // Split paragraphs
                const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
                let html = '';
                let inList = false;

                lines.forEach(line => {
                    if (line.startsWith('- ') || line.startsWith('* ')) {
                        if (!inList) {
                            html += '<ul>';
                            inList = true;
                        }
                        const itemText = line.replace(/^[-*]\s*/, '');
                        // Bold the label before ':' if any
                        const colonIdx = itemText.indexOf(':');
                        if (colonIdx > 0 && colonIdx < 30) {
                            const label = itemText.substring(0, colonIdx);
                            const val = itemText.substring(colonIdx + 1);
                            html += `<li><strong style="color:#fff;">${label}:</strong>${val}</li>`;
                        } else {
                            html += `<li>${itemText}</li>`;
                        }
                    } else {
                        if (inList) {
                            html += '</ul>';
                            inList = false;
                        }
                        // Check if it's a section title (short line or ends with no period)
                        if (line.length < 40 && !line.endsWith('.')) {
                            html += `<h4>${line}</h4>`;
                        } else {
                            html += `<p>${line}</p>`;
                        }
                    }
                });
                if (inList) html += '</ul>';
                return html;
            };

            carouselContainer.querySelectorAll('.view-specs-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    const p = products.find(prod => prod.id == id);
                    if (!p || !modal) return;

                    if (sdmImg) {
                        sdmImg.src = p.image_url || 'havoc_logo.png';
                        sdmImg.alt = p.name;
                    }
                    if (sdmType) sdmType.textContent = (p.type || 'SIMULATOR').toUpperCase();
                    if (sdmTitle) sdmTitle.textContent = p.name;
                    if (sdmPrice) {
                        const compStr = p.compare_price && p.compare_price > p.price ? `<span style="text-decoration:line-through; color:#888; font-size:0.85em; margin-right:6px;">₹${parseFloat(p.compare_price).toFixed(2)}</span>` : '';
                        sdmPrice.innerHTML = `${compStr}₹${parseFloat(p.price).toFixed(2)}`;
                    }
                    if (sdmBody) {
                        sdmBody.innerHTML = formatSpecsHtml(p.description);
                    }

                    modal.classList.add('open');
                    document.body.style.overflow = 'hidden';
                });
            });

            if (modalClose) {
                modalClose.onclick = () => {
                    modal.classList.remove('open');
                    document.body.style.overflow = '';
                };
            }
            if (modal) {
                modal.onclick = (e) => {
                    if (e.target === modal) {
                        modal.classList.remove('open');
                        document.body.style.overflow = '';
                    }
                };
            }

            // Setup Tab Click Listeners
            const tabBtns = dynamicTabsContainer.querySelectorAll('.tab-btn');
            const simCards = carouselContainer.querySelectorAll('.sim-card');

            tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    // Update active tab
                    tabBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    const selectedCategory = btn.getAttribute('data-category');
                    
                    // Show/hide cards
                    simCards.forEach(card => {
                        if (card.getAttribute('data-category') === selectedCategory) {
                            card.style.display = 'block';
                        } else {
                            card.style.display = 'none';
                        }
                    });
                    
                    // Reset scroll position
                    carouselContainer.scrollLeft = 0;
                });
            });

            // Function to set up multi-angle slider per simulator card
            function initSimCardSliders(container) {
                const sliders = container.querySelectorAll('.sim-slider-wrap');
                sliders.forEach(slider => {
                    const track = slider.querySelector('.sim-slider-track');
                    const slides = slider.querySelectorAll('.sim-slider-slide');
                    const dots = slider.querySelectorAll('.sim-slider-dot');
                    const prevBtn = slider.querySelector('.sim-slider-btn.prev');
                    const nextBtn = slider.querySelector('.sim-slider-btn.next');
                    const count = slides.length;
                    if (count <= 1) return;

                    let currentIdx = 0;
                    let autoTimer = null;

                    const updateSlide = (idx) => {
                        currentIdx = (idx + count) % count;
                        track.style.transform = `translateX(-${currentIdx * 100}%)`;
                        dots.forEach((d, i) => d.classList.toggle('active', i === currentIdx));
                    };

                    const nextSlide = () => updateSlide(currentIdx + 1);
                    const prevSlide = () => updateSlide(currentIdx - 1);

                    const startAuto = () => {
                        stopAuto();
                        autoTimer = setInterval(nextSlide, 3500);
                    };
                    const stopAuto = () => {
                        if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
                    };

                    startAuto();
                    slider.addEventListener('mouseenter', stopAuto);
                    slider.addEventListener('mouseleave', startAuto);

                    if (prevBtn) {
                        prevBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            prevSlide();
                            startAuto();
                        });
                    }
                    if (nextBtn) {
                        nextBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            nextSlide();
                            startAuto();
                        });
                    }

                    dots.forEach((dot, dotIdx) => {
                        dot.addEventListener('click', (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            updateSlide(dotIdx);
                            startAuto();
                        });
                    });

                    // Touch swipe support for mobile
                    let startX = 0;
                    let startY = 0;
                    let isSwiping = false;

                    slider.addEventListener('touchstart', (e) => {
                        stopAuto();
                        const touch = e.touches[0];
                        startX = touch.clientX;
                        startY = touch.clientY;
                        isSwiping = true;
                    }, { passive: true });

                    slider.addEventListener('touchend', (e) => {
                        if (!isSwiping) return;
                        isSwiping = false;
                        const touch = e.changedTouches[0];
                        const diffX = touch.clientX - startX;
                        const diffY = touch.clientY - startY;

                        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 25) {
                            if (diffX > 0) {
                                prevSlide();
                            } else {
                                nextSlide();
                            }
                        }
                        startAuto();
                    }, { passive: true });
                });
            }

        } catch (err) {
            console.error('Error fetching products for home page:', err);
        }
    }

    loadSimulatorCards();

    if (carouselContainer && prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            carouselContainer.scrollBy({ left: -300, behavior: 'smooth' });
        });
        nextBtn.addEventListener('click', () => {
            carouselContainer.scrollBy({ left: 300, behavior: 'smooth' });
        });
    }

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if(targetId === '#') return;
            const targetElement = document.querySelector(targetId);
            if(targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                if (hamburger.classList.contains('active')) {
                    hamburger.classList.remove('active');
                    navLinks.classList.remove('active');
                }
            }
        });
    });

    // ==========================================
    // HIDDEN ADMIN LOGIN TRIGGER
    // ==========================================
    const logoEl = document.querySelector('.logo');
    if (logoEl) {
        let clickCount = 0;
        let clickTimer = null;

        logoEl.addEventListener('click', (e) => {
            // Prevent default just to handle clicks ourselves if it's an anchor
            e.preventDefault();
            clickCount++;
            
            if (clickCount === 3) {
                window.location.href = "/admin-login";
                clickCount = 0;
            }

            clearTimeout(clickTimer);
            clickTimer = setTimeout(() => {
                // If it was just 1 or 2 clicks, redirect normally if it's a link
                if (clickCount < 3 && e.target.closest('a')) {
                    window.location.href = e.target.closest('a').href;
                }
                clickCount = 0;
            }, 600); // 600ms window to click 3 times
        });
    }
});

    // Newsletter logic
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('newsletter-email').value;
            const msgEl = document.getElementById('newsletter-msg');
            msgEl.style.display = 'none';
            msgEl.style.color = '';
            
            try {
                const res = await fetch('/api/newsletter', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                
                msgEl.style.display = 'block';
                if (res.ok) {
                    msgEl.textContent = data.message;
                    msgEl.style.color = 'green';
                    newsletterForm.reset();
                } else {
                    msgEl.textContent = data.error || 'Failed to subscribe.';
                    msgEl.style.color = 'red';
                }
            } catch (err) {
                msgEl.style.display = 'block';
                msgEl.textContent = 'Connection error. Try again.';
                msgEl.style.color = 'red';
            }
        });
    }
