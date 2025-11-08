// ============================================================================
// SOUNDABODE - COMPLETELY REWRITTEN FOR UNIVERSAL COMPATIBILITY
// ============================================================================
// Root causes fixed:
// 1. Single unified RAF loop (not 3 separate loops)
// 2. Hardware acceleration on all transforms
// 3. Throttled scroll events (30fps Android, 60fps others)
// 4. Memory-efficient carousel (2x clones instead of 5x)
// 5. Debounced resize handlers
// 6. Conditional animations based on device capability
// 7. Video optimization for Android
// 8. Passive event listeners everywhere
// ============================================================================

'use strict';

// ============================================================================
// DEVICE DETECTION & PERFORMANCE PROFILING
// ============================================================================
const DeviceDetector = {
    userAgent: navigator.userAgent.toLowerCase(),
    
    // Platform detection
    isAndroid: /android/i.test(navigator.userAgent),
    isIOS: /iphone|ipad|ipod/i.test(navigator.userAgent),
    isMobile: /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent),
    isTablet: /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(navigator.userAgent),
    
    // Performance detection
    isLowEnd: (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) || 
              (navigator.deviceMemory && navigator.deviceMemory < 4),
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    
    // Screen info
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    
    // Get device profile
    getProfile() {
        return {
            platform: this.isAndroid ? 'Android' : this.isIOS ? 'iOS' : 'Desktop',
            isMobile: this.isMobile,
            isTablet: this.isTablet,
            isLowEnd: this.isLowEnd,
            screenWidth: this.screenWidth,
            reducedMotion: this.prefersReducedMotion
        };
    }
};

// ============================================================================
// ANIMATION CONFIGURATION BASED ON DEVICE
// ============================================================================
const AnimationConfig = {
    // FPS targets
    targetFPS: DeviceDetector.isAndroid ? 30 : 60,
    frameInterval: 1000 / (DeviceDetector.isAndroid ? 30 : 60),
    
    // Animation speeds
    carouselSpeed: DeviceDetector.isLowEnd ? 0.3 : DeviceDetector.isMobile ? 0.5 : 1,
    logoSpeed: DeviceDetector.isMobile ? 0.3 : 0.5,
    
    // Scroll throttle
    scrollThrottle: DeviceDetector.isAndroid ? 100 : 16,
    resizeDebounce: 250,
    
    // Feature flags
    enableIntroAnimation: !DeviceDetector.isLowEnd,
    enableCarousel: !DeviceDetector.prefersReducedMotion,
    enableVideoBackground: !DeviceDetector.isAndroid && !DeviceDetector.isLowEnd,
    enableComplexAnimations: !DeviceDetector.isLowEnd && !DeviceDetector.prefersReducedMotion,
    
    // Popup delay
    popupDelay: DeviceDetector.isLowEnd ? 5000 : 3000
};

console.log('🚀 Device Profile:', DeviceDetector.getProfile());
console.log('⚙️ Animation Config:', AnimationConfig);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const Utils = {
    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },
    
    // Check if element is in viewport
    isInViewport(element, margin = 1.2) {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        return rect.top < viewportHeight * margin && rect.bottom > -viewportHeight * (margin - 1);
    },
    
    // Safe querySelector
    qs(selector) {
        return document.querySelector(selector);
    },
    
    // Safe querySelectorAll
    qsa(selector) {
        return Array.from(document.querySelectorAll(selector));
    }
};

// ============================================================================
// DOM ELEMENT CACHE
// ============================================================================
const DOM = {
    // Intro elements
    introOverlay: null,
    panelLeft: null,
    panelRight: null,
    overlayLeft: null,
    overlayRight: null,
    
    // Main content
    mainContent: null,
    navbar: null,
    spacer: null,
    
    // Carousel elements
    carouselSection: null,
    carouselTrack: null,
    
    // Logo banner
    logoTrack: null,
    logoBanner: null,
    
    // Forms
    popupForm: null,
    popupElement: null,
    popupCloseBtn: null,
    contactForm: null,
    
    // Navigation
    hamburger: null,
    navMenu: null,
    joinBtn: null,
    
    // Initialize all elements
    init() {
        this.introOverlay = Utils.qs('.intro-overlay');
        this.panelLeft = Utils.qs('.panel-left');
        this.panelRight = Utils.qs('.panel-right');
        this.overlayLeft = Utils.qs('.overlay-left');
        this.overlayRight = Utils.qs('.overlay-right');
        
        this.mainContent = Utils.qs('.main-content');
        this.navbar = Utils.qs('.navbar');
        this.spacer = Utils.qs('.spacer');
        
        this.carouselSection = Utils.qs('#carousel-section');
        this.carouselTrack = Utils.qs('.carousel-track');
        
        this.logoTrack = Utils.qs('.logo-track');
        this.logoBanner = Utils.qs('.client-logo-banner');
        
        this.popupElement = Utils.qs('#popup-form');
        this.popupForm = Utils.qs('#popup-form-element');
        this.popupCloseBtn = Utils.qs('#closePopup');
        this.contactForm = Utils.qs('#contact-form');
        
        this.hamburger = Utils.qs('.hamburger-menu');
        this.navMenu = Utils.qs('.nav-menu');
        this.joinBtn = Utils.qs('.glow-border');
        
        console.log('✅ DOM elements cached');
    }
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
const State = {
    // Scroll state
    scrollY: 0,
    lastScrollY: 0,
    isScrolling: false,
    scrollTimeout: null,
    
    // Intro animation state
    introAnimationRange: window.innerHeight * 0.8,
    phase1Progress: 0,
    
    // Carousel state
    carouselInView: false,
    carouselPosition: 0,
    carouselSetWidth: 0,
    carouselInitialized: false,
    
    // Logo state
    logoPosition: 0,
    logoSetWidth: 0,
    logoIsPaused: false,
    logoInitialized: false,
    
    // Animation state
    rafId: null,
    lastFrameTime: 0,
    isAnimating: false,
    
    // Popup state
    popupShown: false,
    
    // Update scroll state
    updateScroll() {
        this.scrollY = window.scrollY;
        this.phase1Progress = Math.min(1, this.scrollY / this.introAnimationRange);
        this.isScrolling = true;
        
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            this.isScrolling = false;
        }, 150);
    },
    
    // Reset state on resize
    reset() {
        this.introAnimationRange = window.innerHeight * 0.8;
        this.carouselSetWidth = 0;
        this.logoSetWidth = 0;
    }
};

// ============================================================================
// VIDEO OPTIMIZATION MODULE
// ============================================================================
const VideoOptimizer = {
    init() {
        if (!AnimationConfig.enableVideoBackground) {
            this.disableVideos();
        }
    },
    
    disableVideos() {
        const videos = Utils.qsa('video');
        videos.forEach(video => {
            const poster = video.getAttribute('poster');
            
            // Create fallback image
            if (poster) {
                const img = document.createElement('img');
                img.src = poster;
                img.alt = 'Background';
                img.loading = 'lazy';
                img.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;z-index:0;';
                
                const parent = video.parentNode;
                if (parent) {
                    parent.insertBefore(img, video);
                }
            }
            
            // Pause and hide video
            video.pause();
            video.removeAttribute('autoplay');
            video.style.display = 'none';
        });
        
        console.log('📹 Videos optimized for device');
    }
};

// ============================================================================
// INTRO ANIMATION MODULE
// ============================================================================
const IntroAnimation = {
    update() {
        if (!DOM.introOverlay || !AnimationConfig.enableIntroAnimation) return;
        
        const progress = State.phase1Progress;
        const translateX = progress * 100;
        const opacity = Math.max(0, 1 - (progress - 0.75) / 0.25);
        
        // Update panels with hardware acceleration
        if (DOM.panelLeft) {
            DOM.panelLeft.style.transform = `translate3d(${-translateX}%, 0, 0)`;
        }
        if (DOM.panelRight) {
            DOM.panelRight.style.transform = `translate3d(${translateX}%, 0, 0)`;
        }
        
        // Update overlay opacity
        DOM.introOverlay.style.opacity = opacity;
        
        // Hide completely when done
        if (opacity < 0.01) {
            DOM.introOverlay.style.display = 'none';
            DOM.introOverlay.style.pointerEvents = 'none';
        }
    }
};

// ============================================================================
// MAIN CONTENT REVEAL MODULE
// ============================================================================
const MainContentReveal = {
    update() {
        if (!DOM.mainContent) return;
        
        const progress = State.phase1Progress;
        const scale = 1 + (progress * 0.03); // Reduced scale for performance
        
        // Apply transform with hardware acceleration
        DOM.mainContent.style.transform = `scale3d(${scale}, ${scale}, 1)`;
        DOM.mainContent.style.opacity = progress;
        
        if (progress > 0.1) {
            DOM.mainContent.style.pointerEvents = 'auto';
        }
        
        // Show navbar
        if (DOM.navbar && progress > 0.1) {
            DOM.navbar.style.opacity = '1';
            DOM.navbar.style.pointerEvents = 'auto';
        }
    }
};

// ============================================================================
// CAROUSEL MODULE
// ============================================================================
const Carousel = {
    init() {
        if (!DOM.carouselTrack || State.carouselInitialized || !AnimationConfig.enableCarousel) return;
        
        const items = Utils.qsa('.carousel-item');
        if (items.length === 0) {
            console.warn('⚠️ No carousel items found');
            return;
        }
        
        // Calculate total width
        requestAnimationFrame(() => {
            const styles = window.getComputedStyle(DOM.carouselTrack);
            const gap = parseInt(styles.gap) || 40;
            
            let totalWidth = 0;
            items.forEach((item, index) => {
                totalWidth += item.offsetWidth;
                if (index < items.length - 1) totalWidth += gap;
            });
            
            State.carouselSetWidth = totalWidth;
            
            // Clone for seamless loop (only 2x for memory efficiency)
            if (State.carouselSetWidth > 0) {
                const originalHTML = DOM.carouselTrack.innerHTML;
                DOM.carouselTrack.innerHTML = originalHTML + originalHTML;
                State.carouselInitialized = true;
                console.log('✅ Carousel initialized');
            }
        });
        
        // Pause on hover (desktop only)
        if (!DeviceDetector.isMobile && DOM.carouselTrack) {
            DOM.carouselTrack.addEventListener('mouseenter', () => {
                State.carouselInView = false;
            }, { passive: true });
            
            DOM.carouselTrack.addEventListener('mouseleave', () => {
                if (Utils.isInViewport(DOM.carouselSection)) {
                    State.carouselInView = true;
                }
            }, { passive: true });
        }
    },
    
    checkVisibility() {
        if (!DOM.carouselSection || !AnimationConfig.enableCarousel) return;
        
        const wasInView = State.carouselInView;
        State.carouselInView = Utils.isInViewport(DOM.carouselSection);
        
        if (State.carouselInView !== wasInView) {
            console.log('🎠 Carousel visibility:', State.carouselInView);
        }
    },
    
    update() {
        if (!State.carouselInView || !State.carouselInitialized || !State.carouselSetWidth) return;
        
        State.carouselPosition += AnimationConfig.carouselSpeed;
        
        // Reset position for seamless loop
        if (State.carouselPosition >= State.carouselSetWidth) {
            State.carouselPosition = 0;
        }
        
        // Apply transform with hardware acceleration
        if (DOM.carouselTrack) {
            DOM.carouselTrack.style.transform = `translate3d(-${State.carouselPosition}px, 0, 0)`;
        }
    }
};

// ============================================================================
// LOGO BANNER MODULE
// ============================================================================
const LogoBanner = {
    init() {
        if (!DOM.logoTrack || State.logoInitialized) return;
        
        const logoSet = Utils.qs('.logo-set');
        if (!logoSet) return;
        
        // Clone logo sets (3x for smooth infinite scroll)
        const originalHTML = logoSet.outerHTML;
        DOM.logoTrack.innerHTML = originalHTML + originalHTML + originalHTML;
        
        // Calculate width
        requestAnimationFrame(() => {
            const sets = Utils.qsa('.logo-set');
            State.logoSetWidth = sets[0] ? sets[0].offsetWidth : 0;
            State.logoInitialized = true;
            console.log('✅ Logo banner initialized');
        });
        
        // Pause on hover (desktop only)
        if (!DeviceDetector.isMobile && DOM.logoBanner) {
            DOM.logoBanner.addEventListener('mouseenter', () => {
                State.logoIsPaused = true;
            }, { passive: true });
            
            DOM.logoBanner.addEventListener('mouseleave', () => {
                State.logoIsPaused = false;
            }, { passive: true });
        }
    },
    
    update() {
        if (!State.logoInitialized || !State.logoSetWidth || State.logoIsPaused) return;
        
        State.logoPosition -= AnimationConfig.logoSpeed;
        
        // Reset position for seamless loop
        if (Math.abs(State.logoPosition) >= State.logoSetWidth) {
            State.logoPosition = 0;
        }
        
        // Apply transform with hardware acceleration
        if (DOM.logoTrack) {
            DOM.logoTrack.style.transform = `translate3d(${State.logoPosition}px, 0, 0)`;
        }
    }
};

// ============================================================================
// TESTIMONIALS MODULE
// ============================================================================
const Testimonials = {
    currentIndex: 0,
    testimonials: [],
    dots: [],
    
    init() {
        this.testimonials = Utils.qsa('.testimonial');
        const prevBtn = Utils.qs('.prev');
        const nextBtn = Utils.qs('.next');
        const dotsContainer = Utils.qs('.dots');
        
        if (!this.testimonials.length || !dotsContainer) return;
        
        // Create dots
        this.testimonials.forEach((_, i) => {
            const dot = document.createElement('span');
            dot.setAttribute('data-index', i);
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => this.show(i), { passive: true });
            dotsContainer.appendChild(dot);
        });
        
        this.dots = Utils.qsa('.dots span');
        
        // Button handlers
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.show(this.currentIndex - 1));
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.show(this.currentIndex + 1));
        }
        
        console.log('✅ Testimonials initialized');
    },
    
    show(index) {
        const n = this.testimonials.length;
        const newIndex = ((index % n) + n) % n;
        
        if (newIndex === this.currentIndex) return;
        
        // Update testimonials
        this.testimonials[this.currentIndex].classList.remove('active');
        this.dots[this.currentIndex].classList.remove('active');
        
        this.testimonials[newIndex].classList.add('active');
        this.dots[newIndex].classList.add('active');
        
        this.currentIndex = newIndex;
    }
};

// ============================================================================
// REVEAL ANIMATION MODULE
// ============================================================================
const RevealAnimation = {
    init() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const elements = entry.target.querySelectorAll('.reveal-up');
                    elements.forEach((el, index) => {
                        if (!el.classList.contains('active')) {
                            setTimeout(() => {
                                el.classList.add('active');
                            }, index * 80);
                        }
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        const sections = ['#about-section', '#carousel-section', '.testimonials', '#studio-setup', '#why-soundabode', '#faq'];
        sections.forEach(selector => {
            const section = Utils.qs(selector);
            if (section) observer.observe(section);
        });
        
        console.log('✅ Reveal animations initialized');
    }
};

// ============================================================================
// POPUP MODULE
// ============================================================================
const Popup = {
    init() {
        if (!DOM.popupElement) return;
        
        // Show popup after delay
        setTimeout(() => {
            if (!State.popupShown && !DeviceDetector.isLowEnd) {
                DOM.popupElement.classList.add('active');
                State.popupShown = true;
                console.log('✅ Popup displayed');
            }
        }, AnimationConfig.popupDelay);
        
        // Close button
        if (DOM.popupCloseBtn) {
            DOM.popupCloseBtn.addEventListener('click', () => {
                DOM.popupElement.classList.remove('active');
            });
        }
        
        // Click outside to close
        DOM.popupElement.addEventListener('click', (e) => {
            if (e.target === DOM.popupElement) {
                DOM.popupElement.classList.remove('active');
            }
        });
        
        // Join button handler
        if (DOM.joinBtn) {
            DOM.joinBtn.addEventListener('click', () => {
                DOM.popupElement.classList.add('active');
            });
        }
        
        console.log('✅ Popup initialized');
    },
    
    async submitForm(formData) {
        try {
            const response = await fetch('https://soundabodev2-server.onrender.com/api/popup-form', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            return { success: response.ok && result.success, result };
        } catch (error) {
            console.error('❌ Form submission error:', error);
            return { success: false, error };
        }
    }
};

// ============================================================================
// FORM HANDLER MODULE
// ============================================================================
const FormHandler = {
    init() {
        // Popup form
        if (DOM.popupForm) {
            DOM.popupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handlePopupSubmit();
            });
        }
        
        // Contact form
        if (DOM.contactForm) {
            DOM.contactForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleContactSubmit();
            });
        }
        
        console.log('✅ Forms initialized');
    },
    
    async handlePopupSubmit() {
        const submitBtn = DOM.popupForm.querySelector('button[type="submit"]');
        const statusMsg = DOM.popupForm.querySelector('.popup-status');
        
        const formData = {
            name: DOM.popupForm.querySelector('#popup-name')?.value.trim(),
            email: DOM.popupForm.querySelector('#popup-email')?.value.trim(),
            phone: DOM.popupForm.querySelector('#popup-phone')?.value.trim()
        };
        
        if (!formData.name || !formData.email || !formData.phone) {
            this.showStatus(statusMsg, '❌ Please fill all fields', '#ff4444');
            return;
        }
        
        this.setButtonState(submitBtn, true, 'Sending...');
        
        const { success } = await Popup.submitForm(formData);
        
        if (success) {
            this.showStatus(statusMsg, '✅ Thank you! We\'ll contact you soon.', '#00ff88');
            DOM.popupForm.reset();
            setTimeout(() => DOM.popupElement.classList.remove('active'), 2000);
        } else {
            this.showStatus(statusMsg, '❌ Failed to submit. Please try again.', '#ff4444');
        }
        
        this.setButtonState(submitBtn, false, 'Get Started');
    },
    
    async handleContactSubmit() {
        const submitBtn = DOM.contactForm.querySelector('button[type="submit"]');
        const statusMsg = Utils.qs('#form-status');
        
        const formData = {
            fullName: DOM.contactForm.querySelector('#fullName')?.value.trim(),
            email: DOM.contactForm.querySelector('#email')?.value.trim(),
            phone: DOM.contactForm.querySelector('#phone')?.value.trim(),
            course: DOM.contactForm.querySelector('#course')?.value,
            message: DOM.contactForm.querySelector('#message')?.value.trim()
        };
        
        if (!formData.fullName || !formData.email || !formData.phone || !formData.course || !formData.message) {
            this.showStatus(statusMsg, '❌ Please fill all fields', '#ff4444');
            return;
        }
        
        // Check reCAPTCHA if available
        if (typeof grecaptcha !== 'undefined') {
            const recaptchaResponse = grecaptcha.getResponse();
            if (!recaptchaResponse) {
                this.showStatus(statusMsg, '❌ Please complete the reCAPTCHA', '#ff4444');
                return;
            }
            formData.recaptcha = recaptchaResponse;
        }
        
        this.setButtonState(submitBtn, true, 'Sending...');
        
        const { success } = await Popup.submitForm(formData);
        
        if (success) {
            this.showStatus(statusMsg, '✅ Message sent successfully!', '#00ff88');
            DOM.contactForm.reset();
            if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
        } else {
            this.showStatus(statusMsg, '❌ Failed to send. Please try again.', '#ff4444');
        }
        
        this.setButtonState(submitBtn, false, 'Send Message');
    },
    
    showStatus(element, message, color) {
        if (element) {
            element.textContent = message;
            element.style.color = color;
        }
    },
    
    setButtonState(button, disabled, text) {
        if (button) {
            button.disabled = disabled;
            button.textContent = text;
        }
    }
};

// ============================================================================
// NAVIGATION MODULE
// ============================================================================
const Navigation = {
    init() {
        if (!DOM.hamburger || !DOM.navMenu) return;
        
        // Toggle menu
        DOM.hamburger.addEventListener('click', () => {
            DOM.hamburger.classList.toggle('is-active');
            DOM.navMenu.classList.toggle('is-active');
        });
        
        // Close menu on link click
        const navLinks = Utils.qsa('.nav-menu a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                DOM.hamburger.classList.remove('is-active');
                DOM.navMenu.classList.remove('is-active');
            });
        });
        
        console.log('✅ Navigation initialized');
    }
};

// ============================================================================
// MASTER ANIMATION LOOP - SINGLE RAF FOR ALL ANIMATIONS
// ============================================================================
const MasterLoop = {
    start() {
        State.isAnimating = true;
        this.animate(performance.now());
    },
    
    stop() {
        State.isAnimating = false;
        if (State.rafId) {
            cancelAnimationFrame(State.rafId);
            State.rafId = null;
        }
    },
    
    animate(currentTime) {
        // Throttle to target FPS
        if (currentTime - State.lastFrameTime < AnimationConfig.frameInterval) {
            if (State.isAnimating) {
                State.rafId = requestAnimationFrame((time) => this.animate(time));
            }
            return;
        }
        
        State.lastFrameTime = currentTime;
        
        // Update scroll-based animations only if scrolled
        if (State.scrollY !== State.lastScrollY) {
            IntroAnimation.update();
            MainContentReveal.update();
            Carousel.checkVisibility();
            State.lastScrollY = State.scrollY;
        }
        
        // Update continuous animations
        Carousel.update();
        LogoBanner.update();
        
        // Continue loop
        if (State.isAnimating) {
            State.rafId = requestAnimationFrame((time) => this.animate(time));
        }
    }
};

// ============================================================================
// EVENT HANDLERS
// ============================================================================
const EventHandlers = {
    init() {
        // Scroll handler (throttled)
        window.addEventListener('scroll', Utils.throttle(() => {
            State.updateScroll();
        }, AnimationConfig.scrollThrottle), { passive: true });
        
        // Resize handler (debounced)
        window.addEventListener('resize', Utils.debounce(() => {
            State.reset();
            DeviceDetector.screenWidth = window.innerWidth;
            DeviceDetector.screenHeight = window.innerHeight;
            
            // Reinitialize carousel and logo if needed
            if (State.carouselInitialized) {
                State.carouselInitialized = false;
                Carousel.init();
            }
            if (State.logoInitialized) {
                State.logoInitialized = false;
                LogoBanner.init();
            }
        }, AnimationConfig.resizeDebounce), { passive: true });
        
        // Page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                MasterLoop.stop();
            } else {
                MasterLoop.start();
            }
        });
        
        // Before unload cleanup
        window.addEventListener('beforeunload', () => {
            MasterLoop.stop();
        });
        
        console.log('✅ Event handlers registered');
    }
};

// ============================================================================
// AURORA TEXT FIX (for older browsers)
// ============================================================================
const AuroraTextFix = {
    init() {
        const el = Utils.qs('.aurora-text');
        if (!el) return;
        
        const cs = window.getComputedStyle(el);
        const clip = cs.getPropertyValue('background-clip');
        const webkitFill = cs.getPropertyValue('-webkit-text-fill-color');
        
        if (!/text/.test(clip) || webkitFill !== 'transparent') {
            el.style.setProperty('background-image', 'linear-gradient(135deg,#ff0080 0%,#7928ca 25%,#0070f3 50%,#38bdf8 75%,#ff0080 100%)', 'important');
            el.style.setProperty('background-size', '200% 200%', 'important');
            el.style.setProperty('-webkit-background-clip', 'text', 'important');
            el.style.setProperty('background-clip', 'text', 'important');
            el.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
            el.style.setProperty('color', 'transparent', 'important');
        }
    }
};

// ============================================================================
// INITIALIZATION MANAGER
// ============================================================================
const App = {
    init() {
        console.log('🚀 Initializing Soundabode...');
        console.time('Initialization Time');
        
        // Cache DOM elements
        DOM.init();
        
        // Optimize videos for device
        VideoOptimizer.init();
        
        // Initialize modules
        Carousel.init();
        LogoBanner.init();
        Testimonials.init();
        RevealAnimation.init();
        Popup.init();
        FormHandler.init();
        Navigation.init();
        AuroraTextFix.init();
        
        // Setup event handlers
        EventHandlers.init();
        
        // Start master animation loop
        MasterLoop.start();
        
        console.timeEnd('Initialization Time');
        console.log('✅ Soundabode initialized successfully');
        console.log('📊 Performance Mode:', AnimationConfig.targetFPS + 'fps');
    }
};

// ============================================================================
// BING UET TRACKING (Keep original analytics)
// ============================================================================
const BingTracking = {
    init() {
        (function(w, d, t, r, u) {
            var f, n, i;
            w[u] = w[u] || [];
            f = function() {
                var o = { ti: "343210550", enableAutoSpaTracking: true };
                o.q = w[u];
                w[u] = new UET(o);
                w[u].push("pageLoad");
            };
            n = d.createElement(t);
            n.src = r;
            n.async = 1;
            n.onload = n.onreadystatechange = function() {
                var s = this.readyState;
                if (!s || s === "loaded" || s === "complete") {
                    f();
                    n.onload = n.onreadystatechange = null;
                }
            };
            i = d.getElementsByTagName(t)[0];
            i.parentNode.insertBefore(n, i);
        })(window, document, "script", "//bat.bing.com/bat.js", "uetq");
    }
};

// ============================================================================
// PERFORMANCE MONITORING (Optional but recommended)
// ============================================================================
const PerformanceMonitor = {
    init() {
        if (!window.performance || !window.performance.getEntriesByType) return;
        
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                if (perfData) {
                    const loadTime = Math.round(perfData.loadEventEnd - perfData.fetchStart);
                    const domReady = Math.round(perfData.domContentLoadedEventEnd - perfData.fetchStart);
                    
                    console.log('📊 Performance Metrics:');
                    console.log('   - Page Load Time:', loadTime, 'ms');
                    console.log('   - DOM Ready:', domReady, 'ms');
                    console.log('   - Resources:', performance.getEntriesByType('resource').length);
                    
                    // Send to Google Analytics if available
                    if (typeof gtag !== 'undefined') {
                        gtag('event', 'timing_complete', {
                            'name': 'load',
                            'value': loadTime,
                            'event_category': 'Performance'
                        });
                    }
                }
                
                // Memory usage (Chrome only)
                if (performance.memory) {
                    console.log('💾 Memory Usage:', 
                        Math.round(performance.memory.usedJSHeapSize / 1048576), 'MB');
                }
            }, 0);
        });
    }
};

// ============================================================================
// STARTUP SEQUENCE
// ============================================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        App.init();
        BingTracking.init();
        PerformanceMonitor.init();
    });
} else {
    // DOM already loaded
    App.init();
    BingTracking.init();
    PerformanceMonitor.init();
}

// ============================================================================
// GLOBAL ERROR HANDLER (Prevent crashes)
// ============================================================================
window.addEventListener('error', (event) => {
    console.error('🚨 Global error caught:', event.error);
    // Prevent error from breaking the site
    event.preventDefault();
    return false;
});

// ============================================================================
// EXPORT FOR DEBUGGING (Development only)
// ============================================================================
if (typeof window !== 'undefined') {
    window.SoundabodeDebug = {
        state: State,
        config: AnimationConfig,
        device: DeviceDetector,
        dom: DOM,
        restart: () => {
            MasterLoop.stop();
            App.init();
        },
        getPerformance: () => {
            return {
                fps: AnimationConfig.targetFPS,
                scrollY: State.scrollY,
                carouselActive: State.carouselInView,
                carouselInitialized: State.carouselInitialized,
                logoInitialized: State.logoInitialized,
                memoryUsage: performance.memory ? 
                    Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB' : 'N/A'
            };
        }
    };
}

// ============================================================================
// END OF SCRIPT
// ============================================================================

console.log('🎉 Soundabode script loaded successfully');
console.log('💡 Tip: Open console and type "SoundabodeDebug.getPerformance()" for stats');
