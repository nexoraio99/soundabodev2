// ============================================================================
// MOBILE-FIRST OPTIMIZED SCRIPT FOR SOUNDABODE
// ============================================================================

// Device Detection & Performance Settings
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isAndroid = /Android/i.test(navigator.userAgent);
const isLowEnd = navigator.deviceMemory ? navigator.deviceMemory < 4 : false;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Performance configuration
const PERF_CONFIG = {
    enableAnimations: !prefersReducedMotion && (!isMobile || !isLowEnd),
    enableParallax: !isMobile || !isLowEnd,
    carouselSpeed: isMobile ? 0.5 : 1,
    throttleDelay: isMobile ? 100 : 50,
    useIntersectionObserver: 'IntersectionObserver' in window
};

console.log('Device Info:', { isMobile, isAndroid, isLowEnd, PERF_CONFIG });

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Throttle function for scroll events
function throttle(func, delay) {
    let timeoutId;
    let lastRan;
    return function(...args) {
        if (!lastRan) {
            func.apply(this, args);
            lastRan = Date.now();
        } else {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                if ((Date.now() - lastRan) >= delay) {
                    func.apply(this, args);
                    lastRan = Date.now();
                }
            }, delay - (Date.now() - lastRan));
        }
    };
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Safe RAF wrapper
function safeRAF(callback) {
    if (PERF_CONFIG.enableAnimations) {
        return requestAnimationFrame(callback);
    }
    return null;
}

// ============================================================================
// VIDEO OPTIMIZATION
// ============================================================================

function optimizeVideos() {
    const videos = document.querySelectorAll('.intro-panel video');
    
    videos.forEach(video => {
        // Reduce quality on mobile
        if (isMobile) {
            video.setAttribute('playsinline', '');
            video.setAttribute('preload', 'metadata');
            video.muted = true;
            
            // Lower resolution source for mobile if available
            const sources = video.querySelectorAll('source');
            sources.forEach(source => {
                if (source.dataset.mobile) {
                    source.src = source.dataset.mobile;
                }
            });
        }
        
        // Pause video when not visible
        if (PERF_CONFIG.useIntersectionObserver) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        video.play().catch(e => console.log('Video play prevented:', e));
                    } else {
                        video.pause();
                    }
                });
            }, { threshold: 0.5 });
            
            observer.observe(video);
        }
    });
}

// ============================================================================
// INTRO ANIMATION - OPTIMIZED
// ============================================================================

let introAnimationActive = true;
const INTRO_DURATION = window.innerHeight * 0.8;

function updateIntroAnimation() {
    if (!introAnimationActive) return;
    
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const progress = Math.min(1, scrollY / INTRO_DURATION);
    
    // Update panels
    const panelLeft = document.querySelector('.panel-left');
    const panelRight = document.querySelector('.panel-right');
    const introOverlay = document.querySelector('.intro-overlay');
    const mainContent = document.querySelector('.main-content');
    
    if (panelLeft && panelRight) {
        const translateX = progress * 100;
        panelLeft.style.transform = `translate3d(-${translateX}%, 0, 0)`;
        panelRight.style.transform = `translate3d(${translateX}%, 0, 0)`;
    }
    
    // Fade out overlay
    if (introOverlay) {
        const fadeStart = 0.75;
        const opacity = progress < fadeStart ? 1 : Math.max(0, 1 - (progress - fadeStart) / (1 - fadeStart));
        introOverlay.style.opacity = opacity;
        
        if (opacity < 0.05) {
            introOverlay.style.display = 'none';
            introAnimationActive = false;
        }
    }
    
    // Fade in main content
    if (mainContent) {
        mainContent.style.opacity = progress;
        mainContent.style.transform = `scale(${1 + progress * 0.05})`;
    }
}

// ============================================================================
// CAROUSEL - INFINITE LOOP OPTIMIZED
// ============================================================================

class InfiniteCarousel {
    constructor(trackSelector) {
        this.track = document.querySelector(trackSelector);
        if (!this.track) return;
        
        this.speed = PERF_CONFIG.carouselSpeed;
        this.position = 0;
        this.width = 0;
        this.isRunning = false;
        this.animationId = null;
        
        this.init();
    }
    
    init() {
        // Clone items for seamless loop
        const items = Array.from(this.track.children);
        const cloneCount = 2;
        
        for (let i = 0; i < cloneCount; i++) {
            items.forEach(item => {
                this.track.appendChild(item.cloneNode(true));
            });
        }
        
        // Calculate width
        setTimeout(() => {
            const firstSet = items.length;
            let totalWidth = 0;
            
            for (let i = 0; i < firstSet; i++) {
                const item = this.track.children[i];
                totalWidth += item.offsetWidth;
                const gap = parseInt(window.getComputedStyle(this.track).gap) || 40;
                if (i < firstSet - 1) totalWidth += gap;
            }
            
            this.width = totalWidth;
            this.setupIntersectionObserver();
        }, 100);
        
        // Pause on hover
        this.track.addEventListener('mouseenter', () => this.pause());
        this.track.addEventListener('mouseleave', () => this.resume());
    }
    
    setupIntersectionObserver() {
        if (!PERF_CONFIG.useIntersectionObserver) {
            this.start();
            return;
        }
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.start();
                } else {
                    this.stop();
                }
            });
        }, { threshold: 0.1 });
        
        observer.observe(this.track.parentElement);
    }
    
    animate() {
        if (!this.isRunning) return;
        
        this.position += this.speed;
        
        if (this.position >= this.width) {
            this.position = 0;
        }
        
        this.track.style.transform = `translate3d(-${this.position}px, 0, 0)`;
        this.animationId = safeRAF(() => this.animate());
    }
    
    start() {
        if (this.isRunning || this.width === 0) return;
        this.isRunning = true;
        this.animate();
    }
    
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
    
    pause() {
        this.stop();
    }
    
    resume() {
        this.start();
    }
}

// ============================================================================
// SCROLL REVEAL - INTERSECTION OBSERVER
// ============================================================================

function setupScrollReveal() {
    const elements = document.querySelectorAll('.reveal-up');
    
    if (!PERF_CONFIG.useIntersectionObserver) {
        elements.forEach(el => el.classList.add('active'));
        return;
    }
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    elements.forEach(el => observer.observe(el));
}

// ============================================================================
// TESTIMONIAL CAROUSEL
// ============================================================================

function setupTestimonials() {
    const testimonials = Array.from(document.querySelectorAll('.testimonial'));
    const dotsContainer = document.querySelector('.dots');
    const prevBtn = document.querySelector('.prev');
    const nextBtn = document.querySelector('.next');
    
    if (!testimonials.length || !dotsContainer) return;
    
    let currentIndex = 0;
    
    // Create dots
    testimonials.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.dataset.index = i;
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => showTestimonial(i));
        dotsContainer.appendChild(dot);
    });
    
    const dots = Array.from(dotsContainer.children);
    
    function showTestimonial(index) {
        const newIndex = ((index % testimonials.length) + testimonials.length) % testimonials.length;
        
        testimonials[currentIndex].classList.remove('active');
        dots[currentIndex].classList.remove('active');
        
        testimonials[newIndex].classList.add('active');
        dots[newIndex].classList.add('active');
        
        currentIndex = newIndex;
    }
    
    if (prevBtn) prevBtn.addEventListener('click', () => showTestimonial(currentIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => showTestimonial(currentIndex + 1));
}

// ============================================================================
// LOGO SCROLL
// ============================================================================

let logoCarousel;

function setupLogoScroll() {
    logoCarousel = new InfiniteCarousel('.logo-track');
}

// ============================================================================
// HAMBURGER MENU
// ============================================================================

function setupHamburgerMenu() {
    const hamburger = document.querySelector('.hamburger-menu');
    const navMenu = document.querySelector('.nav-menu');
    
    if (!hamburger || !navMenu) return;
    
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('is-active');
        navMenu.classList.toggle('is-active');
        document.body.style.overflow = navMenu.classList.contains('is-active') ? 'hidden' : '';
    });
    
    // Close on link click
    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('is-active');
            navMenu.classList.remove('is-active');
            document.body.style.overflow = '';
        });
    });
}

// ============================================================================
// POPUP FORM
// ============================================================================

function setupPopupForm() {
    const popup = document.getElementById('popup-form');
    const closeBtn = document.getElementById('closePopup');
    const joinBtn = document.querySelector('.glow-border');
    
    if (!popup) return;
    
    // Show popup after delay
    setTimeout(() => {
        if (!sessionStorage.getItem('popupShown')) {
            popup.classList.add('active');
            sessionStorage.setItem('popupShown', 'true');
        }
    }, 3000);
    
    // Close handlers
    if (closeBtn) {
        closeBtn.addEventListener('click', () => popup.classList.remove('active'));
    }
    
    popup.addEventListener('click', (e) => {
        if (e.target === popup) popup.classList.remove('active');
    });
    
    // Join button
    if (joinBtn) {
        joinBtn.addEventListener('click', () => popup.classList.add('active'));
    }
    
    // Form submission
    const form = popup.querySelector('form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                name: form.querySelector('#popup-name')?.value,
                email: form.querySelector('#popup-email')?.value,
                phone: form.querySelector('#popup-phone')?.value
            };
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const statusMsg = form.querySelector('.popup-status');
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending...';
            }
            
            try {
                const response = await fetch('https://soundabodev2-server.onrender.com/api/popup-form', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    if (statusMsg) {
                        statusMsg.textContent = '✅ Thank you! We\'ll contact you soon.';
                        statusMsg.style.color = '#00ff88';
                    }
                    form.reset();
                    setTimeout(() => popup.classList.remove('active'), 2000);
                } else {
                    throw new Error(result.message || 'Submission failed');
                }
            } catch (error) {
                console.error('Form error:', error);
                if (statusMsg) {
                    statusMsg.textContent = '❌ Failed to submit. Please try again.';
                    statusMsg.style.color = '#ff4444';
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Get Started';
                }
            }
        });
    }
}

// ============================================================================
// VIEWPORT HEIGHT FIX FOR MOBILE
// ============================================================================

function fixMobileViewport() {
    const setVH = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVH();
    window.addEventListener('resize', debounce(setVH, 200));
}

// ============================================================================
// MAIN SCROLL HANDLER
// ============================================================================

const handleScroll = throttle(() => {
    if (introAnimationActive) {
        updateIntroAnimation();
    }
}, PERF_CONFIG.throttleDelay);

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
    console.log('Initializing Soundabode website...');
    
    // Critical fixes
    fixMobileViewport();
    
    // Optimize videos
    optimizeVideos();
    
    // Setup components
    setupScrollReveal();
    setupTestimonials();
    setupLogoScroll();
    setupHamburgerMenu();
    setupPopupForm();
    
    // Start carousel
    const courseCarousel = new InfiniteCarousel('.carousel-track');
    
    // Scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial intro animation
    updateIntroAnimation();
    
    console.log('✅ Initialization complete');
}

// ============================================================================
// START
// ============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (logoCarousel) logoCarousel.stop();
});

