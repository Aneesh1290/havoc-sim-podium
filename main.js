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

    // Simulator Carousel & Tabs Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const simCards = document.querySelectorAll('.sim-card[data-category]');
    const carouselContainer = document.querySelector('.simulator-cards');
    const prevBtn = document.querySelector('.nav-btn.prev');
    const nextBtn = document.querySelector('.nav-btn.next');

    if (tabBtns.length > 0) {
        tabBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                // Update active tab
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Determine which category to show
                const category = index === 0 ? 'racing' : 'flight';
                
                // Show/hide cards
                simCards.forEach(card => {
                    if (card.getAttribute('data-category') === category) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
                
                // Reset scroll position
                if (carouselContainer) {
                    carouselContainer.scrollLeft = 0;
                }
            });
        });
    }

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
                window.location.href = 'admin-login.html';
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
