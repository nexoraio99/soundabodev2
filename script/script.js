// ============================================================================
// SOUNDABODE SCROLL ANIMATION - OPTIMIZED FOR MOBILE PERFORMANCE
// ============================================================================

let INTRO_ANIMATION_RANGE = window.innerHeight * 0.8;

// ============================================================================
// DETECT DEVICE & PERFORMANCE
// ============================================================================
const isMobile = window.innerWidth < 768;
const isLowEndDevice = navigator.deviceMemory && navigator.deviceMemory < 4;

// ============================================================================
// DOM ELEMENTS
// ============================================================================
const panelLeft = document.querySelector('.panel-left');
const panelRight = document.querySelector('.panel-right');
const mainContent = document.querySelector('.main-content');
const introOverlay = document.querySelector('.intro-overlay');
const navbar = document.querySelector('.navbar');
const spacer = document.querySelector('.spacer');
const overlayLeft = document.querySelector('.overlay-left');
const overlayRight = document.querySelector('.overlay-right');
const carouselTrack = document.querySelector('.carousel-track');
const imageBlocks = document.querySelectorAll('.image-block');
const aboutSection = document.getElementById('about-section');

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
let state = {
    scrollY: 0,
    phase1Progress: 0,
    spacerStart: 0,
    spacerEnd: 0,
    carouselInView: false,
    isCarouselAnimating: false,
    aboutSectionCached: false,
    aboutTop: 0,
    aboutBottom: 0
};

// ============================================================================
// MASTER ANIMATION LOOP - Consolidated RAF for better performance
// ============================================================================
let masterAnimationId = null;
let ticking = false;
let lastScrollY = 0;

function masterAnimationLoop() {
    state.scrollY = window.scrollY;
    
    if (Math.abs(state.scrollY - lastScrollY) > 5 || !ticking) {
        lastScrollY = state.scrollY;
        
        const viewportHeight = window.innerHeight;
        const spacerHeight = spacer ? spacer.offsetHeight : 0;
        
        state.spacerStart = viewportHeight;
        state.spacerEnd = state.spacerStart + spacerHeight;

        state.phase1Progress = Math.min(1, state.scrollY / INTRO_ANIMATION_RANGE);

        updateIntroOverlay();
        updateMainContent();
        checkCarouselInView();
    }

    if (ticking) {
        masterAnimationId = requestAnimationFrame(masterAnimationLoop);
    }
}

function onScroll() {
    if (!ticking) {
        ticking = true;
        masterAnimationLoop();
    }
}

// ============================================================================
// INTRO OVERLAY - Panel sliding animation
// ============================================================================
function updateIntroOverlay() {
    if (!panelLeft || !panelRight || !introOverlay) return;

    const translateX = state.phase1Progress * 100;
    
    panelLeft.style.transform = `translateX(${-translateX}%)`;
    panelRight.style.transform = `translateX(${translateX}%)`;

    if (overlayLeft) {
        overlayLeft.style.transform = `translateX(${-state.phase1Progress * 10}px)`;
    }
    if (overlayRight) {
        overlayRight.style.transform = `translateX(${state.phase1Progress * 10}px)`;
    }

    const fadeStartPoint = 0.75;
    const fadeOutOpacity = Math.max(0, 1 - (state.phase1Progress - fadeStartPoint) / (1 - fadeStartPoint));
    
    introOverlay.style.opacity = fadeOutOpacity.toString();

    if (fadeOutOpacity < 0.05) {
        introOverlay.style.pointerEvents = 'none';
        introOverlay.style.zIndex = '1';
    } else {
        introOverlay.style.pointerEvents = 'auto';
        introOverlay.style.zIndex = '50';
    }
}

// ============================================================================
// MAIN CONTENT - Reveal synchronized with panel movement
// ============================================================================
function updateMainContent() {
    if (!mainContent) return;

    const opacity = state.phase1Progress;
    const scale = 1 + (state.phase1Progress * 0.05);

    mainContent.style.transform = `scale(${scale})`;
    mainContent.style.opacity = opacity;

    if (state.phase1Progress > 0.1) {
        mainContent.style.pointerEvents = 'auto';
    }

    if (navbar) {
        navbar.style.opacity = '1';
        navbar.style.pointerEvents = 'auto';
    }
}

// ============================================================================
// CAROUSEL ANIMATION - INFINITE SEAMLESS LOOP
// ============================================================================
let carouselAnimationId = null;
let carouselScrollPos = 0;
let carouselOneSetWidth = 0;
let carouselSpeed = isMobile ? 1 : 1;
let carouselInitialized = false;

function initCarouselClones() {
    if (!carouselTrack || carouselInitialized) return;

    const carouselItems = carouselTrack.querySelectorAll('.carousel-item');
    
    if (carouselItems.length === 0) {
        console.warn('No carousel items found');
        return;
    }

    setTimeout(() => {
        try {
            const styles = window.getComputedStyle(carouselTrack);
            const gapStr = styles.gap || '40px';
            const gap = parseInt(gapStr) || 40;

            let totalWidth = 0;
            const items = carouselTrack.querySelectorAll('.carousel-item');
            
            items.forEach((item, index) => {
                totalWidth += item.offsetWidth;
                if (index < items.length - 1) {
                    totalWidth += gap;
                }
            });

            carouselOneSetWidth = totalWidth;

            if (carouselOneSetWidth > 0) {
                const originalHTML = carouselTrack.innerHTML;
                carouselTrack.innerHTML = originalHTML + originalHTML + originalHTML;
                carouselInitialized = true;

                if (state.carouselInView && !state.isCarouselAnimating) {
                    startCarouselAnimation();
                }
            }
        } catch (e) {
            console.error('Carousel init error:', e);
        }
    }, 500);
}

function checkCarouselInView() {
    const carouselSection = document.getElementById('carousel-section');
    if (!carouselSection || !carouselTrack) return;

    const rect = carouselSection.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    const inView = rect.top < viewportHeight * 1.2 && rect.bottom > -viewportHeight * 0.2;

    if (inView && !state.carouselInView) {
        state.carouselInView = true;
        if (!state.isCarouselAnimating && carouselInitialized && carouselOneSetWidth > 0) {
            startCarouselAnimation();
        }
    } else if (!inView && state.carouselInView) {
        state.carouselInView = false;
        stopCarouselAnimation();
    }
}

function startCarouselAnimation() {
    if (state.isCarouselAnimating || carouselOneSetWidth === 0 || !carouselInitialized) return;
    state.isCarouselAnimating = true;

    function animateCarousel() {
        carouselScrollPos += carouselSpeed;

        if (carouselScrollPos >= carouselOneSetWidth) {
            carouselScrollPos = 0;
        }

        if (carouselTrack) {
            carouselTrack.style.transform = `translateX(-${carouselScrollPos}px)`;
        }
        
        if (state.isCarouselAnimating) {
            carouselAnimationId = requestAnimationFrame(animateCarousel);
        }
    }

    animateCarousel();
}

function stopCarouselAnimation() {
    if (carouselAnimationId) {
        cancelAnimationFrame(carouselAnimationId);
        carouselAnimationId = null;
    }
    state.isCarouselAnimating = false;
}

if (carouselTrack) {
    carouselTrack.addEventListener('mouseenter', stopCarouselAnimation, { passive: true });
    carouselTrack.addEventListener('mouseleave', () => {
        if (state.carouselInView && carouselInitialized && carouselOneSetWidth > 0) {
            startCarouselAnimation();
        }
    }, { passive: true });
}

// ============================================================================
// TESTIMONIAL CAROUSEL
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const testimonials = Array.from(document.querySelectorAll('.testimonial'));
    const prevBtn = document.querySelector('.prev');
    const nextBtn = document.querySelector('.next');
    const dotsContainer = document.querySelector('.dots');

    if (!testimonials.length || !dotsContainer || !prevBtn || !nextBtn) return;

    let currentIndex = 0;

    testimonials.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.setAttribute('data-index', i);
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => showTestimonial(i));
        dotsContainer.appendChild(dot);
    });

    const dots = Array.from(dotsContainer.querySelectorAll('span'));

    function showTestimonial(index) {
        const n = testimonials.length;
        const newIndex = ((index % n) + n) % n;

        if (newIndex === currentIndex) return;

        testimonials[currentIndex].classList.remove('active');
        dots[currentIndex].classList.remove('active');

        testimonials[newIndex].classList.add('active');
        dots[newIndex].classList.add('active');

        currentIndex = newIndex;
    }

    nextBtn.addEventListener('click', () => showTestimonial(currentIndex + 1));
    prevBtn.addEventListener('click', () => showTestimonial(currentIndex - 1));
});

// ============================================================================
// POPUP FORM - INITIALIZATION AND DISPLAY
// ============================================================================
const popup = document.getElementById('popup-form');
const closeBtn = document.getElementById('closePopup');
let popupShown = false;

if (popup && closeBtn) {
    // Show popup after 2 seconds on page load
    window.addEventListener('load', () => {
        if (!popupShown) {
            setTimeout(() => {
                popup.classList.add('active');
                popupShown = true;
                console.log('✅ Popup displayed');
            }, 2000);
        }
    });

    // Close button click
    closeBtn.addEventListener('click', () => {
        popup.classList.remove('active');
        console.log('❌ Popup closed');
    });

    // Click outside to close
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.classList.remove('active');
            console.log('❌ Popup closed (outside click)');
        }
    });
}

// ============================================================================
// POPUP FORM SUBMISSION HANDLER
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const popupForm = document.getElementById('popup-form-element');
    
    if (popupForm) {
        popupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = popupForm.querySelector('button[type="submit"]');
            const statusMsg = popupForm.querySelector('.popup-status');
            
            const formData = {
                name: popupForm.querySelector('#popup-name')?.value.trim(),
                email: popupForm.querySelector('#popup-email')?.value.trim(),
                phone: popupForm.querySelector('#popup-phone')?.value.trim()
            };
            
            console.log('📤 Submitting popup form:', formData);
            
            if (!formData.name || !formData.email || !formData.phone) {
                if (statusMsg) {
                    statusMsg.textContent = '❌ Please fill all fields';
                    statusMsg.style.color = '#ff4444';
                }
                return;
            }
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending...';
            }
            
            try {
                const BACKEND_URL = 'https://soundabodev2-server.onrender.com/api/popup-form';
                
                const response = await fetch(BACKEND_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                console.log('📥 Server response:', result);
                
                if (response.ok && result.success) {
                    if (statusMsg) {
                        statusMsg.textContent = '✅ Thank you! We\'ll contact you soon.';
                        statusMsg.style.color = '#00ff88';
                    }
                    
                    popupForm.reset();
                    
                    setTimeout(() => {
                        const popup = document.getElementById('popup-form');
                        if (popup) {
                            popup.classList.remove('active');
                        }
                    }, 2000);
                    
                } else {
                    throw new Error(result.message || 'Submission failed');
                }
                
            } catch (error) {
                console.error('❌ Form submission error:', error);
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
});

// ============================================================================
// CONTACT FORM SUBMISSION HANDLER
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const statusMsg = document.getElementById('form-status');
            
            const formData = {
                fullName: contactForm.querySelector('#fullName')?.value.trim(),
                email: contactForm.querySelector('#email')?.value.trim(),
                phone: contactForm.querySelector('#phone')?.value.trim(),
                course: contactForm.querySelector('#course')?.value,
                message: contactForm.querySelector('#message')?.value.trim()
            };
            
            console.log('📤 Submitting contact form:', formData);
            
            if (!formData.fullName || !formData.email || !formData.phone || !formData.course || !formData.message) {
                if (statusMsg) {
                    statusMsg.textContent = '❌ Please fill all fields';
                    statusMsg.style.color = '#ff4444';
                }
                return;
            }
            
            const recaptchaResponse = grecaptcha.getResponse();
            if (!recaptchaResponse) {
                if (statusMsg) {
                    statusMsg.textContent = '❌ Please complete the reCAPTCHA';
                    statusMsg.style.color = '#ff4444';
                }
                return;
            }
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending...';
            }
            
            try {
                const BACKEND_URL = 'https://soundabodev2-server.onrender.com/api/popup-form';
                
                const response = await fetch(BACKEND_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ...formData,
                        recaptcha: recaptchaResponse
                    })
                });
                
                const result = await response.json();
                
                console.log('📥 Server response:', result);
                
                if (response.ok && result.success) {
                    if (statusMsg) {
                        statusMsg.textContent = '✅ Message sent successfully! We\'ll get back to you soon.';
                        statusMsg.style.color = '#00ff88';
                    }
                    
                    contactForm.reset();
                    grecaptcha.reset();
                    
                } else {
                    throw new Error(result.message || 'Submission failed');
                }
                
            } catch (error) {
                console.error('❌ Form submission error:', error);
                if (statusMsg) {
                    statusMsg.textContent = '❌ Failed to send message. Please try again.';
                    statusMsg.style.color = '#ff4444';
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Send Message';
                }
            }
        });
    }
});

// ============================================================================
// INFINITE LOGO SCROLL
// ============================================================================
const logoTrack = document.querySelector('.logo-track');
const logoSet = document.querySelector('.logo-set');

if (logoTrack && logoSet) {
    const originalHTML = logoSet.outerHTML;
    logoTrack.innerHTML = originalHTML + originalHTML + originalHTML + originalHTML + originalHTML;

    let logoScrollSpeed = isMobile ? 0.03 : 0.1;
    let logoCurrentPosition = 0;
    let logoIsPaused = false;
    let logoSetWidth = 0;
    let logoAnimationId = null;

    function getLogoSetWidth() {
        if (logoSetWidth === 0) {
            const sets = logoTrack.querySelectorAll('.logo-set');
            logoSetWidth = sets[0] ? sets[0].offsetWidth : 0;
        }
        return logoSetWidth;
    }

    function animateLogo() {
        if (!logoIsPaused) {
            logoCurrentPosition -= logoScrollSpeed;
            const setWidth = getLogoSetWidth();

            if (Math.abs(logoCurrentPosition) >= setWidth * 2) {
                logoCurrentPosition = 0;
            }

            logoTrack.style.transform = `translateX(${logoCurrentPosition}px)`;
        }

        logoAnimationId = requestAnimationFrame(animateLogo);
    }

    const banner = document.querySelector('.client-logo-banner');
    if (banner) {
        banner.addEventListener('mouseenter', () => {
            logoIsPaused = true;
        }, { passive: true });

        banner.addEventListener('mouseleave', () => {
            logoIsPaused = false;
        }, { passive: true });
    }

    function updateLogoSpeed() {
        const screenWidth = window.innerWidth;
        if (screenWidth < 660) {
            logoScrollSpeed = 0.03;
        } else if (screenWidth < 768) {
            logoScrollSpeed = 0.05;
        } else if (screenWidth < 1440) {
            logoScrollSpeed = 0.25;
        } else {
            logoScrollSpeed = 0.4;
        }
        logoSetWidth = 0;
    }

    updateLogoSpeed();
    window.addEventListener('resize', updateLogoSpeed, { passive: true });
    animateLogo();
}

// ============================================================================
// REVEAL ON SCROLL
// ============================================================================
function setupRevealObserver() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const elements = entry.target.querySelectorAll('.reveal-up');
                elements.forEach((el, index) => {
                    if (!el.classList.contains('active')) {
                        setTimeout(() => {
                            el.classList.add('active');
                        }, index * 100);
                    }
                });
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const sections = ['#about-section', '#carousel-section', '.testimonials', '#studio-setup', '#why-soundabode', '#faq'];
    sections.forEach(selector => {
        const section = document.querySelector(selector);
        if (section) {
            observer.observe(section);
        }
    });
}

// ============================================================================
// AURORA TEXT ANIMATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const el = document.querySelector('.aurora-text');
  
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
});

// ============================================================================
// HAMBURGER MENU
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger-menu');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('is-active');
            navMenu.classList.toggle('is-active');
        });

        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('is-active');
                navMenu.classList.remove('is-active');
            });
        });
    }
});

// ============================================================================
// JOIN US BUTTON
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const joinBtn = document.querySelector('.glow-border');
    const popup = document.getElementById('popup-form');

    if (joinBtn && popup) {
        joinBtn.addEventListener('click', () => {
            popup.classList.add('active');
        });
    }
});

// ============================================================================
// EVENT LISTENERS
// ============================================================================
window.addEventListener('scroll', onScroll, { passive: true });

window.addEventListener('resize', () => {
    INTRO_ANIMATION_RANGE = window.innerHeight * 0.8;
    state.aboutSectionCached = false;
}, { passive: true });

// ============================================================================
// INITIALIZE
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
    initCarouselClones();
    setupRevealObserver();
});

setupRevealObserver();

// ============================================================================
// BING UET TRACKING
// ============================================================================
(function(w,d,t,r,u) {
    var f,n,i;
    w[u]=w[u]||[],f=function() {
        var o={ti:"343210550", enableAutoSpaTracking: true};
        o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")
    },
    n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function() {
        var s=this.readyState;
        s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)
    },
    i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)
})(window,document,"script","//bat.bing.com/bat.js","uetq");
