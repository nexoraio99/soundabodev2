/* ============================================================================
   script1.js — soundabode site script (refactor, carousel + logo fixes)
   - Updated: safer carousel & logo scroller, defensive guards
   - Usage: replace your existing script1.js with this file
   ============================================================================ */

   (() => {
    'use strict';
  
    /* ==========================================================================
       Config / Constants
       ========================================================================== */
    const CONFIG = {
      INTRO_ANIMATION_RATIO: 0.8, // portion of viewport used for intro animation
      RAF_STOP_DELAY: 180, // ms to stop RAF after scroll ends
      POPUP_DELAY: 2000, // ms to show popup after load
      TESTIMONIAL_AUTO_MS: 3000, // testimonial auto-advance interval
      CAROUSEL_CLONE_DELAY: 500, // delay before computing widths & cloning carousel
      LOGO_SCROLL_SPEEDS: { xs: 0.03, sm: 0.05, md: 0.25, lg: 0.4 },
      CAROUSEL_STRICT_VIEWPORT_FACTOR: 1.2
    };
  
    /* ==========================================================================
       Environment / Device detection
       ========================================================================== */
    const isMobile = () => window.innerWidth < 768;
    const isLowEndDevice = () =>
      (navigator.deviceMemory && navigator.deviceMemory < 4) ||
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 3);
  
    /* ==========================================================================
       DOM Caching
       ========================================================================== */
    const DOM = {
      // intro
      panelLeft: document.querySelector('.panel-left'),
      panelRight: document.querySelector('.panel-right'),
      introOverlay: document.querySelector('.intro-overlay'),
      overlayLeft: document.querySelector('.overlay-left'),
      overlayRight: document.querySelector('.overlay-right'),
  
      // main
      mainContent: document.querySelector('.main-content'),
      navbar: document.querySelector('.navbar'),
      spacer: document.querySelector('.spacer'),
  
      // carousel
      carouselTrack: document.querySelector('.carousel-track'),
      carouselSection: document.getElementById('carousel-section'),
  
      // logos
      logoTrack: document.querySelector('.logo-track'),
      logoSet: document.querySelector('.logo-set'),
      clientLogoBanner: document.querySelector('.client-logo-banner'),
  
      // testimonials
      testimonialContainer: document.querySelector('.testimonial-container'),
      prevBtn: document.querySelector('.prev'),
      nextBtn: document.querySelector('.next'),
      dotsContainer: document.querySelector('.dots'),
  
      // popup
      popup: document.getElementById('popup-form'),
      popupClose: document.getElementById('closePopup'),
      popupForm: document.getElementById('popup-form-element'),
  
      // contact
      contactForm: document.getElementById('contact-form'),
      contactStatus: document.getElementById('form-status'),
  
      // reveal
      aboutSection: document.getElementById('about-section'),
  
      // faq
      faqItems: document.querySelectorAll('.faq-item'),
  
      // gear modals
      gearCards: document.querySelectorAll('.gear-card'),
      gearModal: document.getElementById('gearModal'),
      gearModalTitle: document.getElementById('modalTitle'),
      gearModalDesc: document.getElementById('modalDesc'),
      gearModalSpecs: document.getElementById('modalSpecs'),
      gearModalClose: document.getElementById('modalClose'),
  
      // studio modal (optional)
      studioModal: document.getElementById('studioModal'),
      studioModalTitle: document.getElementById('studioModalTitle'),
      studioModalDesc: document.getElementById('studioModalDesc'),
      studioModalClose: document.getElementById('studioModalClose'),
  
      // why dropdown
      whyDropdown: document.querySelector('.why-dropdown'),
      whyDropdownToggle: document.getElementById('whyDropdownToggle'),
      whyDropdownPanel: document.getElementById('whyDropdownPanel'),
  
      // misc
      hamburger: document.querySelector('.hamburger-menu'),
      navMenu: document.querySelector('.nav-menu'),
      joinBtns: document.querySelectorAll('.glow-border'),
      auroraText: document.querySelector('.aurora-text'),
      revealSelectors: [
        '#about-section',
        '#carousel-section',
        '.testimonials',
        '#studio-setup',
        '#why-soundabode',
        '#faq'
      ]
    };
  
    /* ==========================================================================
       State
       ========================================================================== */
    const state = {
      // intro / scroll
      scrollY: 0,
      phase1Progress: 0,
      spacerStart: 0,
      spacerEnd: 0,
      ticking: false,
      lastScrollY: 0,
      rafId: null,
      rafStopTimer: null,
  
      // carousel
      carouselInView: false,
      isCarouselAnimating: false,
      carouselOneSetWidth: 0,
      carouselInitialized: false,
      carouselScrollPos: 0,
      carouselAnimationId: null,
      carouselSpeed: isMobile() ? 1 : 1,
  
      // logos
      logoAnimationId: null,
      logoCurrentPosition: 0,
      logoScrollSpeed: CONFIG.LOGO_SCROLL_SPEEDS.md,
      logoSetWidth: 0,
      logoIsPaused: false,
  
      // testimonials
      testimonialIndex: 0,
      testimonialAutoInterval: null,
  
      // popup
      popupShown: false
    };
  
    /* ==========================================================================
       Utilities
       ========================================================================== */
    const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
    const rAF = (fn) => requestAnimationFrame(fn);
    const cAF = (id) => {
      try {
        if (id) cancelAnimationFrame(id);
      } catch (e) {
        // ignore
      }
    };
    const q = (sel) => document.querySelector(sel);
  
    /* ==========================================================================
       Master animation loop (scroll-driven, single RAF)
       ========================================================================== */
    const INTRO_ANIMATION_RANGE = () =>
      window.innerHeight * CONFIG.INTRO_ANIMATION_RATIO;
  
    function masterAnimationLoop() {
      state.scrollY = window.scrollY || window.pageYOffset || 0;
  
      // Only update visuals if significant movement or first tick
      if (Math.abs(state.scrollY - state.lastScrollY) > 5 || !state.ticking) {
        state.lastScrollY = state.scrollY;
  
        const viewportHeight = window.innerHeight;
        const spacerHeight = (DOM.spacer && DOM.spacer.offsetHeight) || 0;
  
        state.spacerStart = viewportHeight;
        state.spacerEnd = state.spacerStart + spacerHeight;
  
        state.phase1Progress = clamp(
          state.scrollY / INTRO_ANIMATION_RANGE(),
          0,
          1
        );
  
        updateIntroOverlay();
        updateMainContent();
        checkCarouselInView();
      }
  
      // Continue RAF loop while ticking
      if (state.ticking) {
        state.rafId = rAF(masterAnimationLoop);
      }
    }
  
    function onScrollHandler() {
      if (!state.ticking) {
        state.ticking = true;
        masterAnimationLoop();
      }
  
      // Stop RAF shortly after scrolling stops
      if (state.rafStopTimer) clearTimeout(state.rafStopTimer);
      state.rafStopTimer = setTimeout(() => {
        if (state.ticking) {
          cAF(state.rafId);
          state.rafId = null;
          state.ticking = false;
        }
      }, CONFIG.RAF_STOP_DELAY);
    }
  
    /* ==========================================================================
       Intro overlay animations (panel sliding & fade)
       ========================================================================== */
    function updateIntroOverlay() {
      const {
        panelLeft,
        panelRight,
        introOverlay,
        overlayLeft,
        overlayRight
      } = DOM;
      if (!panelLeft || !panelRight || !introOverlay) return;
  
      const mobile = isMobile();
      const progress = state.phase1Progress;
      const percent = progress * 100;
  
      if (mobile) {
        // vertical slide
        panelLeft.style.transform = `translate3d(0, ${-percent}%, 0)`;
        panelRight.style.transform = `translate3d(0, ${percent}%, 0)`;
      } else {
        // horizontal slide
        panelLeft.style.transform = `translate3d(${-percent}%, 0, 0)`;
        panelRight.style.transform = `translate3d(${percent}%, 0, 0)`;
      }
  
      // small parallax for overlay text panels on larger screens
      if (overlayLeft)
        overlayLeft.style.transform = mobile
          ? 'translate3d(0,0,0)'
          : `translate3d(${-progress * 10}px, 0, 0)`;
      if (overlayRight)
        overlayRight.style.transform = mobile
          ? 'translate3d(0,0,0)'
          : `translate3d(${progress * 10}px, 0, 0)`;
  
      // fade out overlay near completion
      const fadeStart = 0.75;
      const fadeOpacity = Math.max(
        0,
        1 - (progress - fadeStart) / (1 - fadeStart)
      );
      introOverlay.style.opacity = String(fadeOpacity);
  
      if (fadeOpacity < 0.05) {
        introOverlay.style.pointerEvents = 'none';
        introOverlay.style.zIndex = '1';
      } else {
        introOverlay.style.pointerEvents = 'auto';
        introOverlay.style.zIndex = '50';
      }
    }
  
    /* ==========================================================================
       Main content reveal & navbar
       ========================================================================== */
    function updateMainContent() {
      if (!DOM.mainContent) return;
      const progress = state.phase1Progress;
      const opacity = progress;
      const scale = 1 + progress * 0.05;
  
      DOM.mainContent.style.transform = `scale(${scale})`;
      DOM.mainContent.style.opacity = String(opacity);
  
      if (progress > 0.1) {
        DOM.mainContent.style.pointerEvents = 'auto';
      }
      if (DOM.navbar) {
        DOM.navbar.style.opacity = '1';
        DOM.navbar.style.pointerEvents = 'auto';
      }
    }
  
    /* ==========================================================================
       Carousel (infinite loop, clones, in-view detection)
       ========================================================================== */
    function initCarouselClones() {
      const track = DOM.carouselTrack;
      if (!track || state.carouselInitialized) return;
  
      const items = track.querySelectorAll('.carousel-item');
      if (!items.length) return;
  
      // Delay measuring until layout has settled
      setTimeout(() => {
        try {
          // measure width of single set BEFORE cloning
          const singleSetWidth = track.scrollWidth || track.offsetWidth || 0;
  
          if (singleSetWidth > 0) {
            state.carouselOneSetWidth = singleSetWidth;
  
            // clone the children cleanly (avoid innerHTML duplication which can break events/styles)
            const wrapper = document.createElement('div');
            wrapper.className = 'carousel-set-temp';
            // move current children into wrapper (shallow)
            while (track.firstChild) {
              wrapper.appendChild(track.firstChild);
            }
            // now append two copies of wrapper's inner content
            const set1 = wrapper.cloneNode(true);
            const set2 = wrapper.cloneNode(true);
            // clear track and append
            track.innerHTML = '';
            track.appendChild(set1);
            track.appendChild(set2);
  
            // mark initialized
            state.carouselInitialized = true;
  
            // start animation if already in view
            if (state.carouselInView && !state.isCarouselAnimating) {
              startCarouselAnimation();
            }
          } else {
            console.warn(
              'Carousel width is 0 – check CSS of .carousel-track / .carousel-item'
            );
          }
        } catch (err) {
          console.error('Carousel init error', err);
        }
      }, CONFIG.CAROUSEL_CLONE_DELAY);
    }
  
    function checkCarouselInView() {
      const section = DOM.carouselSection;
      const track = DOM.carouselTrack;
      if (!track) return;
  
      // If there is no wrapper section, assume always in view
      if (!section) {
        if (!state.carouselInView) {
          state.carouselInView = true;
          if (state.carouselInitialized && !state.isCarouselAnimating) {
            startCarouselAnimation();
          }
        }
        return;
      }
  
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
  
      const inView =
        rect.top < vh * CONFIG.CAROUSEL_STRICT_VIEWPORT_FACTOR &&
        rect.bottom > -vh * 0.2;
  
      if (inView && !state.carouselInView) {
        state.carouselInView = true;
        if (state.carouselInitialized && !state.isCarouselAnimating) {
          startCarouselAnimation();
        }
      } else if (!inView && state.carouselInView) {
        state.carouselInView = false;
        stopCarouselAnimation();
      }
    }
  
    function startCarouselAnimation() {
      if (
        state.isCarouselAnimating ||
        state.carouselOneSetWidth === 0 ||
        !state.carouselInitialized
      )
        return;
      state.isCarouselAnimating = true;
  
      const track = DOM.carouselTrack;
  
      // ensure any previous animation is canceled
      if (state.carouselAnimationId) cAF(state.carouselAnimationId);
      state.carouselAnimationId = null;
  
      function step() {
        // advance
        state.carouselScrollPos += state.carouselSpeed;
  
        // wrap smoothly using modulo (avoids a visible jump)
        const w = state.carouselOneSetWidth || track.scrollWidth || track.offsetWidth;
        if (w > 0) {
          // keep carouselScrollPos within [0, w)
          if (state.carouselScrollPos >= w) state.carouselScrollPos = state.carouselScrollPos % w;
        } else {
          state.carouselScrollPos = 0;
        }
  
        if (track)
          track.style.transform = `translate3d(-${state.carouselScrollPos}px, 0, 0)`;
  
        if (state.isCarouselAnimating) state.carouselAnimationId = rAF(step);
      }
      step();
    }
  
    function stopCarouselAnimation() {
      if (state.carouselAnimationId) cAF(state.carouselAnimationId);
      state.carouselAnimationId = null;
      state.isCarouselAnimating = false;
    }
  
    /* mouse hover pause for carousel */
    function bindCarouselHoverPause() {
      const track = DOM.carouselTrack;
      if (!track) return;
      track.addEventListener('mouseenter', stopCarouselAnimation, { passive: true });
      track.addEventListener(
        'mouseleave',
        () => {
          if (
            state.carouselInView &&
            state.carouselInitialized &&
            state.carouselOneSetWidth > 0
          )
            startCarouselAnimation();
        },
        { passive: true }
      );
    }
  
    /* ==========================================================================
       Testimonial slider (simple and accessible)
       ========================================================================== */
    function initTestimonials() {
      const testimonials = Array.from(document.querySelectorAll('.testimonial'));
      const dotsContainer = DOM.dotsContainer;
      const prevBtn = DOM.prevBtn;
      const nextBtn = DOM.nextBtn;
      const container = DOM.testimonialContainer;
  
      if (
        !testimonials.length ||
        !dotsContainer ||
        !prevBtn ||
        !nextBtn ||
        !container
      )
        return;
  
      // create dots
      testimonials.forEach((_, i) => {
        const d = document.createElement('span');
        d.dataset.index = i;
        if (i === 0) d.classList.add('active');
        d.addEventListener('click', () => showTestimonial(i));
        dotsContainer.appendChild(d);
      });
  
      const dots = Array.from(dotsContainer.querySelectorAll('span'));
      let current = 0;
  
      function showTestimonial(index) {
        const n = testimonials.length;
        const newIndex = ((index % n) + n) % n;
        if (newIndex === current) return;
  
        testimonials[current].classList.remove('active');
        dots[current].classList.remove('active');
        testimonials[newIndex].classList.add('active');
        dots[newIndex].classList.add('active');
        current = newIndex;
        adjustHeight();
        restartAutoSlide();
      }
  
      function adjustHeight() {
        const active = container.querySelector('.testimonial.active');
        if (!active) return;
        container.style.height = active.offsetHeight + 'px';
      }
  
      function initHeight() {
        adjustHeight();
        window.addEventListener('resize', adjustHeight, { passive: true });
      }
  
      function next() {
        showTestimonial(current + 1);
      }
      function prev() {
        showTestimonial(current - 1);
      }
  
      nextBtn.addEventListener('click', next);
      prevBtn.addEventListener('click', prev);
  
      function startAuto() {
        stopAuto();
        state.testimonialAutoInterval = setInterval(
          () => showTestimonial(current + 1),
          CONFIG.TESTIMONIAL_AUTO_MS
        );
      }
      function stopAuto() {
        if (state.testimonialAutoInterval) clearInterval(state.testimonialAutoInterval);
      }
      function restartAutoSlide() {
        stopAuto();
        startAuto();
      }
  
      // initialize
      initHeight();
      startAuto();
    }
  
    /* ==========================================================================
       Popup form show / hide and basic events
       ========================================================================== */
    function initPopup() {
      const popup = DOM.popup;
      const closeBtn = DOM.popupClose;
      if (!popup || !closeBtn) return;
  
      // show after delay (only once)
      window.addEventListener('load', () => {
        if (!state.popupShown) {
          setTimeout(() => {
            popup.classList.add('active');
            state.popupShown = true;
          }, CONFIG.POPUP_DELAY);
        }
      });
  
      closeBtn.addEventListener('click', () => popup.classList.remove('active'));
      popup.addEventListener('click', (e) => {
        if (e.target === popup) popup.classList.remove('active');
      });
    }
  
    /* ==========================================================================
       Popup form submission (async)
       ========================================================================== */
    function initPopupFormHandler() {
      const form = DOM.popupForm;
      if (!form) return;
  
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const statusMsg = form.querySelector('.popup-status');
  
        const data = {
          name: form.querySelector('#popup-name')?.value.trim(),
          email: form.querySelector('#popup-email')?.value.trim(),
          phone: form.querySelector('#popup-phone')?.value.trim()
        };
  
        if (!data.name || !data.email || !data.phone) {
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
          const BACKEND_URL =
            'https://soundabodev2-server.onrender.com/api/popup-form';
          const resp = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          const result = await resp.json();
          if (resp.ok && result.success) {
            if (statusMsg) {
              statusMsg.textContent = "✅ Thank you! We'll contact you soon.";
              statusMsg.style.color = '#00ff88';
            }
            form.reset();
            setTimeout(() => {
              const p = document.getElementById('popup-form');
              if (p) p.classList.remove('active');
            }, 2000);
          } else {
            throw new Error(result.message || 'Submission failed');
          }
        } catch (err) {
          console.error('Popup submit error', err);
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
  
    /* ==========================================================================
       Contact form submission (async) - expects grecaptcha instance
       ========================================================================== */
    function initContactFormHandler() {
      const form = DOM.contactForm;
      const statusMsg = DOM.contactStatus;
      if (!form) return;
  
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
  
        const data = {
          fullName: form.querySelector('#fullName')?.value.trim(),
          email: form.querySelector('#email')?.value.trim(),
          phone: form.querySelector('#phone')?.value.trim(),
          course: form.querySelector('#course')?.value,
          message: form.querySelector('#message')?.value.trim()
        };
  
        if (
          !data.fullName ||
          !data.email ||
          !data.phone ||
          !data.course ||
          !data.message
        ) {
          if (statusMsg) {
            statusMsg.textContent = '❌ Please fill all fields';
            statusMsg.style.color = '#ff4444';
          }
          return;
        }
  
        // reCAPTCHA check (if present)
        const recaptchaResponse =
          (window.grecaptcha &&
            grecaptcha.getResponse &&
            grecaptcha.getResponse()) ||
          '';
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
          const BACKEND_URL =
            'https://soundabodev2-server.onrender.com/api/popup-form';
          const resp = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, recaptcha: recaptchaResponse })
          });
          const result = await resp.json();
          if (resp.ok && result.success) {
            if (statusMsg) {
              statusMsg.textContent = "✅ Message sent successfully! We'll get back to you soon.";
              statusMsg.style.color = '#00ff88';
            }
            form.reset();
            if (window.grecaptcha && grecaptcha.reset) grecaptcha.reset();
          } else {
            throw new Error(result.message || 'Submission failed');
          }
        } catch (err) {
          console.error('Contact submit error', err);
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
  
    /* ==========================================================================
       Infinite logo scroll (robust)
       ========================================================================== */
    function initLogoScroller() {
      const track = DOM.logoTrack,
        set = DOM.logoSet,
        banner = DOM.clientLogoBanner;
      if (!track || !set || !banner) return;
  
      // Defensive: ensure there's at least one logo item
      if (!set.children || set.children.length === 0) {
        console.warn('Logo scroller: no .logo-item children found inside .logo-set');
        return;
      }
  
      // Cleanly create two sets (cloneNode) for seamless loop
      track.innerHTML = '';
      const set1 = set.cloneNode(true);
      const set2 = set.cloneNode(true);
  
      // Ensure proper display to avoid wrapping
      set1.style.display = 'inline-flex';
      set2.style.display = 'inline-flex';
  
      track.appendChild(set1);
      track.appendChild(set2);
  
      // responsive speed
      function updateLogoSpeed() {
        const w = window.innerWidth;
        if (w < 660) state.logoScrollSpeed = CONFIG.LOGO_SCROLL_SPEEDS.xs;
        else if (w < 768) state.logoScrollSpeed = CONFIG.LOGO_SCROLL_SPEEDS.sm;
        else if (w < 1440) state.logoScrollSpeed = CONFIG.LOGO_SCROLL_SPEEDS.md;
        else state.logoScrollSpeed = CONFIG.LOGO_SCROLL_SPEEDS.lg;
  
        if (isLowEndDevice()) state.logoScrollSpeed *= 0.6;
        // reset measured width so it recalculates
        state.logoSetWidth = 0;
      }
  
      function getLogoSetWidth() {
        if (!state.logoSetWidth) {
          const sets = track.querySelectorAll('.logo-set');
          if (sets.length > 0) {
            // prefer scrollWidth for accurate total width including overflow content
            state.logoSetWidth = sets[0].scrollWidth || sets[0].offsetWidth || 0;
            if (!state.logoSetWidth) {
              // fallback: sum child widths
              let w = 0;
              Array.from(sets[0].children).forEach((c) => {
                const rect = c.getBoundingClientRect();
                w += rect.width;
              });
              state.logoSetWidth = Math.max(0, w);
            }
          } else {
            state.logoSetWidth = 0;
          }
        }
        return state.logoSetWidth;
      }
  
      function animateLogo() {
        // cancel existing RAF guard
        if (state.logoAnimationId) cAF(state.logoAnimationId);
        state.logoAnimationId = null;
  
        function step() {
          if (!state.logoIsPaused) {
            // fractional movement for smoothness
            state.logoCurrentPosition -= state.logoScrollSpeed;
  
            const w = getLogoSetWidth();
            if (!w) {
              // try recomputing next frame
              state.logoSetWidth = 0;
            } else {
              // wrap using modulo to avoid visible jump
              if (-state.logoCurrentPosition >= w) {
                state.logoCurrentPosition += w;
              }
              // apply transform
              track.style.transform = `translate3d(${state.logoCurrentPosition}px, 0, 0)`;
            }
          }
          state.logoAnimationId = rAF(step);
        }
        step();
      }
  
      banner.addEventListener(
        'mouseenter',
        () => {
          state.logoIsPaused = true;
        },
        { passive: true }
      );
      banner.addEventListener(
        'mouseleave',
        () => {
          state.logoIsPaused = false;
        },
        { passive: true }
      );
  
      // pause when offscreen using IntersectionObserver (improves perf)
      const bannerObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            state.logoIsPaused = !entry.isIntersecting;
          });
        },
        { threshold: 0.01 }
      );
  
      bannerObserver.observe(banner);
  
      updateLogoSpeed();
      window.addEventListener('resize', updateLogoSpeed, { passive: true });
  
      // start RAF loop
      if (state.logoAnimationId) cAF(state.logoAnimationId);
      state.logoAnimationId = null;
      animateLogo();
    }
  
    /* ==========================================================================
       Reveal on scroll (IntersectionObserver)
       ========================================================================== */
    function setupRevealObserver() {
      const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      };
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const elements = entry.target.querySelectorAll('.reveal-up');
            elements.forEach((el, i) => {
              if (!el.classList.contains('active'))
                setTimeout(() => el.classList.add('active'), i * 100);
            });
            observer.unobserve(entry.target);
          }
        });
      }, observerOptions);
  
      DOM.revealSelectors.forEach((selector) => {
        try {
          const el = document.querySelector(selector);
          if (el) observer.observe(el);
        } catch (e) {
          // ignore invalid selectors
        }
      });
    }
  
    /* ==========================================================================
       Aurora text fallback polyfill (ensures gradient text on older browsers)
       ========================================================================== */
    function ensureAuroraText() {
      const el = DOM.auroraText;
      if (!el) return;
      const cs = getComputedStyle(el);
      const clip = cs.getPropertyValue('background-clip');
      const webkitFill = cs.getPropertyValue('-webkit-text-fill-color');
      if (!/text/.test(clip) || webkitFill !== 'transparent') {
        el.style.setProperty(
          'background-image',
          'linear-gradient(135deg,#ff0080 0%,#7928ca 25%,#0070f3 50%,#38bdf8 75%,#ff0080 100%)',
          'important'
        );
        el.style.setProperty('background-size', '200% 200%', 'important');
        el.style.setProperty('-webkit-background-clip', 'text', 'important');
        el.style.setProperty('background-clip', 'text', 'important');
        el.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
        el.style.setProperty('color', 'transparent', 'important');
      }
    }
  
    /* ==========================================================================
       Hamburger menu toggle
       ========================================================================== */
    function initHamburger() {
      const hamburger = DOM.hamburger,
        navMenu = DOM.navMenu;
      if (!hamburger || !navMenu) return;
  
      hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('is-active');
        navMenu.classList.toggle('is-active');
      });
  
      navMenu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
          hamburger.classList.remove('is-active');
          navMenu.classList.remove('is-active');
        });
      });
    }
  
    /* ==========================================================================
       Join buttons that open the popup
       ========================================================================== */
    function initJoinButtons() {
      const btns = DOM.joinBtns;
      const popup = DOM.popup;
      if (!btns.length || !popup) return;
      btns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          popup.classList.add('active');
        });
      });
    }
  
    /* ==========================================================================
       FAQ accordion
       ========================================================================== */
    function initFaqAccordion() {
      const items = DOM.faqItems;
      if (!items || items.length === 0) return;
  
      items.forEach((item) => {
        const head = item.querySelector('.faq-head');
        const body = item.querySelector('.faq-body');
        if (!head || !body) return;
  
        head.addEventListener('click', () => {
          const open = item.getAttribute('data-open') === 'true';
          if (open) {
            item.setAttribute('data-open', 'false');
            head.setAttribute('aria-expanded', 'false');
            body.style.maxHeight = body.scrollHeight + 'px';
            requestAnimationFrame(() => (body.style.maxHeight = '0'));
            setTimeout(() => {
              body.hidden = true;
            }, 360);
          } else {
            item.setAttribute('data-open', 'true');
            head.setAttribute('aria-expanded', 'true');
            body.hidden = false;
            requestAnimationFrame(
              () => (body.style.maxHeight = body.scrollHeight + 'px')
            );
          }
        });
      });
    }
  
    /* ==========================================================================
       Gear modal (cards -> modal)
       ========================================================================== */
    function initGearModal() {
      const cards = DOM.gearCards;
      const modal = DOM.gearModal;
      const modalClose = DOM.gearModalClose;
      if (!cards.length || !modal || !modalClose) return;
  
      function openModal(title, desc, specs) {
        if (DOM.gearModalTitle) DOM.gearModalTitle.textContent = title || '';
        if (DOM.gearModalDesc) DOM.gearModalDesc.textContent = desc || '';
        if (DOM.gearModalSpecs) DOM.gearModalSpecs.textContent = specs || '';
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        modalClose.focus();
      }
  
      function closeModal() {
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
  
      cards.forEach((card) => {
        card.addEventListener('click', () => {
          const title =
            card.dataset.title ||
            card.querySelector('.card-title')?.textContent ||
            '';
          const desc =
            card.dataset.desc ||
            card.querySelector('.card-excerpt')?.textContent ||
            '';
          const specs = card.dataset.specs || '';
          openModal(title, desc, specs);
        });
      });
  
      modalClose.addEventListener('click', closeModal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
      });
    }
  
    /* ==========================================================================
       Studio modal (optional separate modal)
       ========================================================================== */
    function initStudioModal() {
      if (!DOM.studioModal) return;
      const cards = Array.from(document.querySelectorAll('#studio-setup .gear-card'));
      const modal = DOM.studioModal,
        closeBtn = DOM.studioModalClose;
      if (!cards.length || !modal || !closeBtn) return;
  
      function openModal(title, desc) {
        if (DOM.studioModalTitle) DOM.studioModalTitle.textContent = title || '';
        if (DOM.studioModalDesc) DOM.studioModalDesc.textContent = desc || '';
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        closeBtn.focus();
      }
  
      function closeModal() {
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
  
      cards.forEach((card) => {
        const title = card.dataset.title;
        const desc = card.dataset.desc;
        card.addEventListener('click', () => openModal(title, desc));
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModal(title, desc);
          }
        });
        const cta = card.querySelector('.card-cta');
        if (cta)
          cta.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal(title, desc);
          });
      });
  
      closeBtn.addEventListener('click', closeModal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
      });
    }
  
    /* ==========================================================================
       Why-dropdown (toggle panel under heading)
       ========================================================================== */
    function initWhyDropdown() {
      const wd = DOM.whyDropdown;
      const toggle = DOM.whyDropdownToggle;
      const panel = DOM.whyDropdownPanel;
      if (!wd || !toggle || !panel) return;
  
      function openPanel() {
        wd.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
      }
      function closePanel() {
        wd.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
      function togglePanel(e) {
        e.preventDefault();
        if (wd.classList.contains('open')) closePanel();
        else openPanel();
      }
  
      toggle.addEventListener('click', togglePanel);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && wd.classList.contains('open')) {
          closePanel();
          toggle.focus();
        }
      });
      document.addEventListener('click', (e) => {
        if (!wd.contains(e.target) && wd.classList.contains('open')) closePanel();
      });
    }
  
    /* ==========================================================================
       Event listeners & lifecycle
       ========================================================================== */
    function bindGlobalListeners() {
      window.addEventListener('scroll', onScrollHandler, { passive: true });
      window.addEventListener(
        'resize',
        () => {
          // update intro range and re-evaluate
          state.carouselOneSetWidth = 0; // force carousel width recalculation (if needed later)
          state.logoSetWidth = 0; // force logo width recalculation
          state.lastScrollY = window.scrollY || 0;
        },
        { passive: true }
      );
    }
  
    /* ==========================================================================
       Bing UET (unchanged, lazy-load safe)
       ========================================================================== */
    function initBingUET() {
      (function (w, d, t, r, u) {
        var f, n, i;
        w[u] = w[u] || [];
        f = function () {
          var o = { ti: '343210550', enableAutoSpaTracking: true };
          o.q = w[u];
          w[u] = new UET(o);
          w[u].push('pageLoad');
        };
        n = d.createElement(t);
        n.src = r;
        n.async = 1;
        n.onload = n.onreadystatechange = function () {
          var s = this.readyState;
          s && s !== 'loaded' && s !== 'complete' || (f(), (n.onload = n.onreadystatechange = null));
        };
        i = d.getElementsByTagName(t)[0];
        i.parentNode.insertBefore(n, i);
      })(window, document, 'script', '//bat.bing.com/bat.js', 'uetq');
    }
  
    /* ==========================================================================
       Initialization entrypoint
       ========================================================================== */
    function init() {
      // Setup initial small things
      ensureAuroraText();
      bindGlobalListeners();
  
      // Start master loop with initial tick
      state.ticking = true;
      masterAnimationLoop();
  
      // Init modules
      initCarouselClones();
      bindCarouselHoverPause();
      initTestimonials();
      initPopup();
      initPopupFormHandler();
      initContactFormHandler();
      initLogoScroller();
      setupRevealObserver();
      initHamburger();
      initJoinButtons();
      initFaqAccordion();
      initGearModal();
      initStudioModal();
      initWhyDropdown();
      initBingUET();
  
      // Defensive: if DOM ready but some modules rely on cloned content,
      // ensure carousel init again after short delay
      setTimeout(initCarouselClones, CONFIG.CAROUSEL_CLONE_DELAY * 2);
    }
  
    /* ==========================================================================
       DOMContentLoaded bootstrap
       ========================================================================== */
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();
