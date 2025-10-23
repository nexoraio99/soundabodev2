// ============================================================================
// SOUNDABODE SCROLL ANIMATION - COMPLETE RESTRUCTURED LOGIC
// ============================================================================

let INTRO_ANIMATION_RANGE = window.innerHeight * 0.8;

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
    isCarouselAnimating: false
};

// ============================================================================
// MAIN SCROLL ANIMATION FUNCTION
// ============================================================================
function animateOnScroll() {
    state.scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    const spacerHeight = spacer ? spacer.offsetHeight : 0;
    
    state.spacerStart = viewportHeight;
    state.spacerEnd = state.spacerStart + spacerHeight;

    // Calculate intro animation progress (0 to 1)
    state.phase1Progress = Math.min(1, state.scrollY / INTRO_ANIMATION_RANGE);

    updateIntroOverlay();
    updateMainContent();
    updateImageZoom();
    checkCarouselInView();
}

// ============================================================================
// INTRO OVERLAY - Panel sliding animation
// ============================================================================
function updateIntroOverlay() {
    if (!panelLeft || !panelRight || !introOverlay) return;

    const translateX = state.phase1Progress * 100;
    panelLeft.style.transform = `translateX(${-translateX}%)`;
    panelRight.style.transform = `translateX(${translateX}%)`;
    panelLeft.style.transition = 'transform 0.05s linear';
    panelRight.style.transition = 'transform 0.05s linear';

    if (overlayLeft) {
        overlayLeft.style.transform = `translateX(${-state.phase1Progress * 10}px)`;
        overlayLeft.style.transition = 'transform 0.05s linear';
    }
    if (overlayRight) {
        overlayRight.style.transform = `translateX(${state.phase1Progress * 10}px)`;
        overlayRight.style.transition = 'transform 0.05s linear';
    }

    const fadeStartPoint = 0.75;
    const fadeOutOpacity = Math.max(0, 1 - (state.phase1Progress - fadeStartPoint) / (1 - fadeStartPoint));
    
    introOverlay.style.opacity = fadeOutOpacity.toString();
    introOverlay.style.transition = 'opacity 0.05s linear';

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
    const scale = 1 + (state.phase1Progress * 0.05); // Subtle grow effect

    mainContent.style.transition = 'none';
    mainContent.style.transform = `scale(${scale})`;
    mainContent.style.opacity = opacity;

    // Intro overlay opacity reduces as panels move
    if (introOverlay) {
        introOverlay.style.opacity = (1 - state.phase1Progress).toString();
    }

    if (navbar) {
        navbar.style.opacity = '1';
        navbar.style.pointerEvents = 'auto';
    }

    if (state.phase1Progress > 0.1) {
        mainContent.style.pointerEvents = 'auto';
    }
}

// ============================================================================
// IMAGE ZOOM EFFECT - About section
// ============================================================================
function updateImageZoom() {
    if (!aboutSection || imageBlocks.length === 0) return;

    const aboutTop = aboutSection.offsetTop;
    const aboutBottom = aboutTop + aboutSection.offsetHeight;

    if (state.scrollY >= aboutTop && state.scrollY <= aboutBottom) {
        const scrollProgress = (state.scrollY - aboutTop) / (aboutBottom - aboutTop);

        imageBlocks.forEach((block, index) => {
            const delay = index * 0.08;
            const adjustedProgress = Math.max(0, Math.min(1, scrollProgress - delay));
            const blockScale = 1 + (adjustedProgress * 0.12);

            block.style.transform = `scale(${blockScale})`;
            block.style.transition = 'transform 0.1s ease-out';
        });
    } else {
        imageBlocks.forEach(block => {
            block.style.transform = 'scale(1)';
            block.style.transition = 'transform 0.1s ease-out';
        });
    }
}

// ============================================================================
// CAROUSEL ANIMATION - INFINITE SEAMLESS LOOP (FIXED)
// ============================================================================
let carouselAnimationId = null;
let carouselScrollPos = 0;
let carouselOneSetWidth = 0;
let carouselTotalWidth = 0;

function initCarouselClones() {
    if (!carouselTrack) return;

    // Clear any existing clones first
    carouselTrack.innerHTML = carouselTrack.innerHTML;

    // Get original items
    const originalItems = Array.from(carouselTrack.querySelectorAll('.carousel-item'));
    
    if (originalItems.length === 0) {
        console.warn('No carousel items found');
        return;
    }

    // Wait for images to load, then calculate properly
    const waitForImages = new Promise((resolve) => {
        let loadedCount = 0;
        const images = carouselTrack.querySelectorAll('img');
        
        if (images.length === 0) {
            resolve();
            return;
        }

        images.forEach(img => {
            if (img.complete) {
                loadedCount++;
            } else {
                img.addEventListener('load', () => {
                    loadedCount++;
                    if (loadedCount === images.length) resolve();
                });
                img.addEventListener('error', () => {
                    loadedCount++;
                    if (loadedCount === images.length) resolve();
                });
            }
        });

        if (loadedCount === images.length) resolve();
    });

    waitForImages.then(() => {
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
                totalWidth += gap; // Add gap between items
            }
        });

        carouselOneSetWidth = totalWidth;
        
        // Clone items to create infinite effect
        const originalHTML = carouselTrack.innerHTML;
        carouselTrack.innerHTML = originalHTML + originalHTML + originalHTML;
        
        carouselTotalWidth = carouselOneSetWidth * 3;
        
        console.log('Carousel initialized:', {
            itemCount: items.length,
            oneSetWidth: carouselOneSetWidth,
            totalWidth: carouselTotalWidth,
            gap: gap
        });

        // Start animation if already in view
        if (state.carouselInView && !state.isCarouselAnimating) {
            startCarouselAnimation();
        }
    });
}

function checkCarouselInView() {
    const carouselSection = document.getElementById('carousel-section');
    if (!carouselSection || !carouselTrack) return;

    const rect = carouselSection.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    const inView = rect.top < viewportHeight * 1.2 && rect.bottom > -viewportHeight * 0.2;

    if (inView && !state.carouselInView) {
        state.carouselInView = true;
        if (!state.isCarouselAnimating && carouselOneSetWidth > 0) {
            startCarouselAnimation();
        }
    } else if (!inView && state.carouselInView) {
        state.carouselInView = false;
        stopCarouselAnimation();
    }
}

function startCarouselAnimation() {
    if (state.isCarouselAnimating || carouselOneSetWidth === 0) return;
    state.isCarouselAnimating = true;

    function animateCarousel() {
        carouselScrollPos += 0.6; // Speed of carousel

        // Seamless loop: reset when we've scrolled through one complete set
        if (carouselScrollPos >= carouselOneSetWidth) {
            carouselScrollPos = 0;
        }

        if (carouselTrack) {
            carouselTrack.style.transform = `translateX(-${carouselScrollPos}px)`;
            carouselTrack.style.transition = 'none';
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
    carouselTrack.addEventListener('mouseenter', stopCarouselAnimation);
    carouselTrack.addEventListener('mouseleave', () => {
        if (state.carouselInView && carouselOneSetWidth > 0) {
            startCarouselAnimation();
        }
    });
}

// Handle window resize
window.addEventListener('resize', () => {
    // Reinitialize carousel on resize
    carouselScrollPos = 0;
    stopCarouselAnimation();
    
    // Wait a bit for layout to settle
    setTimeout(() => {
        initCarouselClones();
    }, 300);
});

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
// POPUP FORM
// ============================================================================
const popup = document.getElementById('popup-form');
const closeBtn = document.getElementById('closePopup');

if (popup && closeBtn) {
    window.addEventListener('load', () => {
        if (!sessionStorage.getItem('formShown')) {
            setTimeout(() => {
                popup.classList.add('active');
                sessionStorage.setItem('formShown', 'true');
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
// INFINITE LOGO SCROLL - TRUE SEAMLESS LOOP
// ============================================================================
const logoTrack = document.querySelector('.logo-track');
const logoSet = document.querySelector('.logo-set');

if (logoTrack && logoSet) {
    const originalHTML = logoSet.outerHTML;
    logoTrack.innerHTML = originalHTML + originalHTML + originalHTML + originalHTML + originalHTML;

    let logoScrollSpeed = 0.1;
    let logoCurrentPosition = 0;
    let logoIsPaused = false;

    function getLogoSetWidth() {
        const sets = logoTrack.querySelectorAll('.logo-set');
        return sets[0] ? sets[0].offsetWidth : 0;
    }

    function animateLogo() {
        if (!logoIsPaused) {
            logoCurrentPosition -= logoScrollSpeed;
            const setWidth = getLogoSetWidth();

            if (Math.abs(logoCurrentPosition) >= setWidth * 2) {
                logoCurrentPosition = 0;
            }

            logoTrack.style.transform = `translateX(${logoCurrentPosition}px)`;
            logoTrack.style.transition = 'none';
        }

        requestAnimationFrame(animateLogo);
    }

    const banner = document.querySelector('.client-logo-banner');
    if (banner) {
        banner.addEventListener('mouseenter', () => {
            logoIsPaused = true;
        });

        banner.addEventListener('mouseleave', () => {
            logoIsPaused = false;
        });
    }

    function updateLogoSpeed() {
        const screenWidth = window.innerWidth;
        if (screenWidth < 660) {
            logoScrollSpeed = 0.05;
        } else if (screenWidth < 768) {
            logoScrollSpeed = 0.08;
        } else if (screenWidth < 1440) {
            logoScrollSpeed = 0.4;
        } else {
            logoScrollSpeed = 0.6;
        }
    }

    updateLogoSpeed();
    window.addEventListener('resize', updateLogoSpeed);
    animateLogo();
}

// ============================================================================
// REVEAL ON SCROLL - Intersection Observer for better performance
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
// AURORA TEXT ANIMATION - Ensure visibility
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
        el.classList.add('debug-force-front');
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
window.addEventListener('scroll', () => {
    requestAnimationFrame(animateOnScroll);
}, { passive: true });

window.addEventListener('resize', () => {
    INTRO_ANIMATION_RANGE = window.innerHeight * 0.8;
});

// ============================================================================
// INITIALIZE
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
    initCarouselClones();
    animateOnScroll();
    setupRevealObserver();
});

animateOnScroll();
setupRevealObserver();
