
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
    
    // Only update if scroll changed significantly (throttle)
    if (Math.abs(state.scrollY - lastScrollY) > 5 || !ticking) {
        lastScrollY = state.scrollY;
        
        const viewportHeight = window.innerHeight;
        const spacerHeight = spacer ? spacer.offsetHeight : 0;
        
        state.spacerStart = viewportHeight;
        state.spacerEnd = state.spacerStart + spacerHeight;

        // Calculate intro animation progress (0 to 1)
        state.phase1Progress = Math.min(1, state.scrollY / INTRO_ANIMATION_RANGE);

        updateIntroOverlay();
        updateMainContent();
        
        // Only animate image zoom if not low-end device
       // if (!isLowEndDevice) {
         //   updateImageZoom();
        //}
        
        checkCarouselInView();
    }

    if (ticking) {
        masterAnimationId = requestAnimationFrame(masterAnimationLoop);
    }
}

// Optimized scroll listener with throttling
function onScroll() {
    if (!ticking) {
        ticking = true;
        masterAnimationLoop();
    }
}

// ============================================================================
// INTRO OVERLAY - Panel sliding animation (Optimized)
// ============================================================================
function updateIntroOverlay() {
    if (!panelLeft || !panelRight || !introOverlay) return;

    const translateX = state.phase1Progress * 100;
    
    // Batch transform updates
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

    // Main content fades in as panels move away
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
// IMAGE ZOOM EFFECT - About section (Optimized)
// ============================================================================
function updateImageZoom() {
    if (!aboutSection || imageBlocks.length === 0) return;

    // Cache section boundaries on first run
    if (!state.aboutSectionCached) {
        state.aboutTop = aboutSection.offsetTop;
        state.aboutBottom = state.aboutTop + aboutSection.offsetHeight;
        state.aboutSectionCached = true;
    }

    const viewportHeight = window.innerHeight;
    
    // Early exit if section not in viewport
    if (state.scrollY < state.aboutTop - viewportHeight || 
        state.scrollY > state.aboutBottom + viewportHeight) {
        imageBlocks.forEach(block => {
            block.style.transform = 'scale(0)';
        });
        return;
    }

    // Only calculate if in view range
    if (state.scrollY >= state.aboutTop && state.scrollY <= state.aboutBottom) {
        const scrollProgress = (state.scrollY - state.aboutTop) / (state.aboutBottom - state.aboutTop);

        // Pre-calculate transforms to avoid reflow thrashing
        const transforms = [];
        imageBlocks.forEach((block, index) => {
            const delay = index * 0.08;
            const adjustedProgress = Math.max(0, Math.min(1, scrollProgress - delay));
            const blockScale = 1 + (adjustedProgress * 0.12);
            transforms.push(`scale(${blockScale})`);
        });

        // Apply all transforms in one batch
        requestAnimationFrame(() => {
            imageBlocks.forEach((block, i) => {
                block.style.transform = transforms[i];
            });
        });
    }
}

// ============================================================================
// CAROUSEL ANIMATION - INFINITE SEAMLESS LOOP (OPTIMIZED)
// ============================================================================
let carouselAnimationId = null;
let carouselScrollPos = 0;
let carouselOneSetWidth = 0;
let carouselSpeed = isMobile ? 0.3 : 0.6; // Slower on mobile
let carouselInitialized = false;

function initCarouselClones() {
    if (!carouselTrack || carouselInitialized) return;

    // Get original items before any modifications
    const carouselItems = carouselTrack.querySelectorAll('.carousel-item');
    
    if (carouselItems.length === 0) {
        console.warn('No carousel items found');
        return;
    }

    // Wait a bit for images to load
    setTimeout(() => {
        try {
            // Get computed styles for gap
            const styles = window.getComputedStyle(carouselTrack);
            const gapStr = styles.gap || '40px';
            const gap = parseInt(gapStr) || 40;

            // Calculate width of one complete set
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
                // Clone items
                const originalHTML = carouselTrack.innerHTML;
                carouselTrack.innerHTML = originalHTML + originalHTML + originalHTML;
                carouselInitialized = true;

                console.log('Carousel initialized:', {
                    itemCount: items.length,
                    oneSetWidth: carouselOneSetWidth,
                    gap: gap,
                    speed: carouselSpeed
                });

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

        // Seamless loop: reset when we've scrolled through one complete set
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

// Pause on hover
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
// POPUP FORM - Use variable instead of sessionStorage
// ============================================================================
const popup = document.getElementById('popup-form');
const closeBtn = document.getElementById('closePopup');
let popupShown = false;

if (popup && closeBtn) {
    window.addEventListener('load', () => {
        if (!popupShown) {
            setTimeout(() => {
                popup.classList.add('active');
                popupShown = true;
            }, 2000);
        }
    });

    closeBtn.addEventListener('click', () => {
        popup.classList.remove('active');
    });

    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.classList.remove('active');
        }
    });
}

// ============================================================================
// INFINITE LOGO SCROLL - OPTIMIZED
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
        logoSetWidth = 0; // Reset cache on resize
    }

    updateLogoSpeed();
    window.addEventListener('resize', updateLogoSpeed, { passive: true });
    animateLogo();
}

// ============================================================================
// REVEAL ON SCROLL - Intersection Observer
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

    const sections = ['#about-section', '#carousel-section', '.testimonials'];
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
// EVENT LISTENERS - OPTIMIZED
// ============================================================================
window.addEventListener('scroll', onScroll, { passive: true });

window.addEventListener('resize', () => {
    INTRO_ANIMATION_RANGE = window.innerHeight * 0.8;
    state.aboutSectionCached = false; // Reset cache on resize
}, { passive: true });

// ============================================================================
// INITIALIZE
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
    initCarouselClones();
    animateOnScroll();
    setupRevealObserver();
});

// Initial setup
animateOnScroll();
setupRevealObserver();

(function(w,d,t,r,u)
  {
    var f,n,i;
    w[u]=w[u]||[],f=function()
    {
      var o={ti:"343210550", enableAutoSpaTracking: true};
      o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")
    },
    n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function()
    {
      var s=this.readyState;
      s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)
    },
    i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)
  })
  (window,document,"script","//bat.bing.com/bat.js","uetq");
