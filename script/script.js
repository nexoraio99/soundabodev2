   /* ============================================================================
   script1.js — soundabode site script (refactor, carousel + logo fixes)
   - Full rewrite that fixes root causes (reliable bootstrap, stable popup,
     robust cloning/measurement). Logic otherwise kept consistent with original.
   ============================================================================ */

(function () {
  'use strict';

  /* ==========================================================================
     Config / Constants
     ========================================================================== */
  const CONFIG = {
    INTRO_ANIMATION_RATIO: 0.8,
    RAF_STOP_DELAY: 180,
    POPUP_DELAY: 2000,
    TESTIMONIAL_AUTO_MS: 3000,
    CAROUSEL_CLONE_DELAY: 400,
    LOGO_SCROLL_SPEEDS: { xs: 0.03, sm: 0.05, md: 0.25, lg: 0.4 },
    CAROUSEL_STRICT_VIEWPORT_FACTOR: 1.2,
    STYLES_READY_TIMEOUT: 2500, // ms - fall back if styles/fonts don't report
    BOOT_TIMEOUT: 350 // ms - guaranteed init fallback
  };

  /* ==========================================================================
     Environment / Device detection
     ========================================================================== */
  const isMobile = () => window.innerWidth < 768;
  const isLowEndDevice = () =>
    (navigator.deviceMemory && navigator.deviceMemory < 4) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 3);

  /* ==========================================================================
     DOM Cache
     ========================================================================== */
  const DOM = {
    panelLeft: document.querySelector('.panel-left'),
    panelRight: document.querySelector('.panel-right'),
    introOverlay: document.querySelector('.intro-overlay'),
    overlayLeft: document.querySelector('.overlay-left'),
    overlayRight: document.querySelector('.overlay-right'),

    mainContent: document.querySelector('.main-content'),
    navbar: document.querySelector('.navbar'),
    spacer: document.querySelector('.spacer'),

    carouselTrack: document.querySelector('.carousel-track'),
    carouselSection: document.getElementById('carousel-section'),

    logoTrack: document.querySelector('.logo-track'),
    logoSet: document.querySelector('.logo-set'),
    clientLogoBanner: document.querySelector('.client-logo-banner'),

    testimonialContainer: document.querySelector('.testimonial-container'),
    prevBtn: document.querySelector('.prev'),
    nextBtn: document.querySelector('.next'),
    dotsContainer: document.querySelector('.dots'),

    popup: document.getElementById('popup-form'),
    popupClose: document.getElementById('closePopup'),
    popupForm: document.getElementById('popup-form-element'),

    contactForm: document.getElementById('contact-form'),
    contactStatus: document.getElementById('form-status'),

    aboutSection: document.getElementById('about-section'),

    faqItems: document.querySelectorAll('.faq-item'),

    gearCards: document.querySelectorAll('.gear-card'),
    gearModal: document.getElementById('gearModal'),
    gearModalTitle: document.getElementById('modalTitle'),
    gearModalDesc: document.getElementById('modalDesc'),
    gearModalSpecs: document.getElementById('modalSpecs'),
    gearModalClose: document.getElementById('modalClose'),

    studioModal: document.getElementById('studioModal'),
    studioModalTitle: document.getElementById('studioModalTitle'),
    studioModalDesc: document.getElementById('studioModalDesc'),
    studioModalClose: document.getElementById('studioModalClose'),

    whyDropdown: document.querySelector('.why-dropdown'),
    whyDropdownToggle: document.getElementById('whyDropdownToggle'),
    whyDropdownPanel: document.getElementById('whyDropdownPanel'),

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
    carouselOneSetWidth: 0, // width of one full group of items
    carouselInitialized: false,
    carouselScrollPos: 0,
    carouselAnimationId: null,
    carouselSpeed: isMobile() ? 0.8 : 1.0,

    // logos
    logoAnimationId: null,
    logoCurrentPosition: 0,
    logoScrollSpeed: CONFIG.LOGO_SCROLL_SPEEDS.md,
    logoSetWidth: 0,
    logoIsPaused: false,

    // testimonials
    testimonialIndex: 0,
    testimonialAutoInterval: null,

    popupShown: false,
    inited: false
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

  /* ==========================================================================
     CSS & Font readiness helper (optimization)
     - Waits (best-effort) for stylesheet/link load events and document.fonts.ready.
     - Falls back after STYLES_READY_TIMEOUT so it never blocks indefinitely.
     ========================================================================== */
  function whenStylesAndFontsReady(timeout = CONFIG.STYLES_READY_TIMEOUT) {
    return new Promise((resolve) => {
      let resolved = false;
      const tidy = () => {
        if (!resolved) {
          resolved = true;
          clear();
          resolve();
        }
      };

      const clear = () => {
        if (styleObservers && styleObservers.length) {
          styleObservers.forEach((s) => s());
        }
        if (fontListener) fontListener();
        if (timeoutId) clearTimeout(timeoutId);
      };

      // timeout fallback
      const timeoutId = setTimeout(() => {
        tidy();
      }, timeout);

      // 1) Wait for font loading if supported
      let fontListener = null;
      try {
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(() => {
            setTimeout(() => {
              if (!resolved) {
                setTimeout(() => {
                  tidy();
                }, 30);
              }
            }, 0);
          }).catch(() => {});
          fontListener = () => { /* nothing to unbind for fonts.ready */ };
        }
      } catch (e) {
        // ignore
      }

      // 2) Observe <link rel="stylesheet"> & <link rel="preload" as="style">
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"]'));
      const pending = [];
      const styleObservers = [];

      links.forEach((link) => {
        try {
          if (link.sheet || link.__loaded || link.media === 'all' || link.media === '') {
            return;
          }

          const onLoad = () => {
            try { link.__loaded = true; } catch (e) {}
            const idx = pending.indexOf(handler);
            if (idx >= 0) pending.splice(idx, 1);
            if (pending.length === 0) tidy();
          };
          const onError = () => onLoad();
          const handler = { onLoad, onError };
          pending.push(handler);

          link.addEventListener('load', onLoad, { passive: true });
          link.addEventListener('error', onError, { passive: true });

          styleObservers.push(() => {
            try {
              link.removeEventListener('load', onLoad);
              link.removeEventListener('error', onError);
            } catch (e) {}
          });
        } catch (e) {
          // ignore per-link failures
        }
      });

      if (links.length === 0) {
        setTimeout(tidy, 30);
      }
    });
  }

  /* ==========================================================================
     Master animation loop (scroll-driven)
     ========================================================================== */
  const INTRO_ANIMATION_RANGE = () =>
    Math.max(1, window.innerHeight * CONFIG.INTRO_ANIMATION_RATIO);

  function masterAnimationLoop() {
    state.scrollY = window.scrollY || window.pageYOffset || 0;

    if (Math.abs(state.scrollY - state.lastScrollY) > 5 || !state.ticking) {
      state.lastScrollY = state.scrollY;

      const viewportHeight = window.innerHeight;
      const spacerHeight = (DOM.spacer && DOM.spacer.offsetHeight) || 0;

      state.spacerStart = viewportHeight;
      state.spacerEnd = state.spacerStart + spacerHeight;

      state.phase1Progress = clamp(state.scrollY / INTRO_ANIMATION_RANGE(), 0, 1);

      updateIntroOverlay();
      updateMainContent();
      checkCarouselInView();
    }

    if (state.ticking) state.rafId = rAF(masterAnimationLoop);
  }

  function onScrollHandler() {
    if (!state.ticking) {
      state.ticking = true;
      masterAnimationLoop();
    }

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
     Intro overlay behavior
     ========================================================================== */
  function updateIntroOverlay() {
    const { panelLeft, panelRight, introOverlay, overlayLeft, overlayRight } = DOM;
    if (!panelLeft || !panelRight || !introOverlay) return;
    const mobile = isMobile();
    const progress = state.phase1Progress;
    const percent = progress * 100;

    if (mobile) {
      panelLeft.style.transform = `translate3d(0, ${-percent}%, 0)`;
      panelRight.style.transform = `translate3d(0, ${percent}%, 0)`;
    } else {
      panelLeft.style.transform = `translate3d(${-percent}%, 0, 0)`;
      panelRight.style.transform = `translate3d(${percent}%, 0, 0)`;
    }

    if (overlayLeft)
      overlayLeft.style.transform = mobile ? 'translate3d(0,0,0)' : `translate3d(${-progress * 10}px, 0, 0)`;
    if (overlayRight)
      overlayRight.style.transform = mobile ? 'translate3d(0,0,0)' : `translate3d(${progress * 10}px, 0, 0)`;

    const fadeStart = 0.75;
    const fadeOpacity = Math.max(0, 1 - (progress - fadeStart) / (1 - fadeStart));
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
     Main content reveal
     ========================================================================== */
  function updateMainContent() {
    if (!DOM.mainContent) return;
    const p = state.phase1Progress;
    DOM.mainContent.style.transform = `scale(${1 + p * 0.05})`;
    DOM.mainContent.style.opacity = String(p);
    if (p > 0.1) DOM.mainContent.style.pointerEvents = 'auto';
    if (DOM.navbar) {
      DOM.navbar.style.opacity = '1';
      DOM.navbar.style.pointerEvents = 'auto';
    }
  }

  /* ==========================================================================
     Carousel — fixed cloning & measurement (root-cause fix)
     ========================================================================== */
  function getGapValuePx(el) {
    try {
      const cs = getComputedStyle(el);
      const gap = cs.getPropertyValue('gap') || cs.getPropertyValue('column-gap') || '0px';
      return parseFloat(gap) || 0;
    } catch (e) {
      return 0;
    }
  }

  function measureOneSetWidth(items) {
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      total += rect.width;
    }
    const track = DOM.carouselTrack;
    const gap = track ? getGapValuePx(track) : 0;
    if (items.length > 1) total += gap * (items.length - 1);
    return Math.round(total);
  }

  function initCarouselClones() {
    const track = DOM.carouselTrack;
    if (!track || state.carouselInitialized) return;

    // find actual carousel items anywhere under track (avoid nested wrappers)
    const originalItems = Array.from(track.querySelectorAll('.carousel-item'));
    if (!originalItems.length) return;

    // ensure track behaves as single-row flex container
    track.style.display = track.style.display || 'flex';
    track.style.flexWrap = 'nowrap';
    track.style.justifyContent = track.style.justifyContent || 'flex-start';
    const wrapper = DOM.carouselSection ? DOM.carouselSection : track.parentElement;
    if (wrapper) wrapper.style.overflow = wrapper.style.overflow || 'hidden';

    // Defer cloning slightly so layout is stable
    setTimeout(() => {
      try {
        const measuredWidth = measureOneSetWidth(originalItems);

        if (measuredWidth <= 0) {
          console.warn('Carousel: measured set width is 0 — check styles.');
          const fallback = Math.round((track.scrollWidth || track.offsetWidth || 0) / 2);
          state.carouselOneSetWidth = fallback;
        } else {
          state.carouselOneSetWidth = measuredWidth;
        }

        // Build clones as direct children of track (root-cause fix)
        const clones = originalItems.map((it) => it.cloneNode(true));

        // empty track
        while (track.firstChild) track.removeChild(track.firstChild);

        // append first and second set
        clones.forEach((c) => {
          c.style.flex = c.style.flex || c.getAttribute('data-flex') || '';
          track.appendChild(c.cloneNode(true));
        });
        clones.forEach((c) => {
          track.appendChild(c.cloneNode(true));
        });

        if (!state.carouselOneSetWidth || state.carouselOneSetWidth === 0) {
          const newItems = track.querySelectorAll('.carousel-item');
          state.carouselOneSetWidth = measureOneSetWidth(Array.from(newItems).slice(0, clones.length));
        }

        state.carouselInitialized = true;
        if (state.carouselInView && !state.isCarouselAnimating) startCarouselAnimation();
      } catch (err) {
        console.error('initCarouselClones error', err);
      }
    }, CONFIG.CAROUSEL_CLONE_DELAY);
  }

  function checkCarouselInView() {
    const section = DOM.carouselSection;
    const track = DOM.carouselTrack;
    if (!track) return;
    if (!section) {
      if (!state.carouselInView) {
        state.carouselInView = true;
        if (state.carouselInitialized && !state.isCarouselAnimating) startCarouselAnimation();
      }
      return;
    }
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight;
    const inView = rect.top < vh * CONFIG.CAROUSEL_STRICT_VIEWPORT_FACTOR && rect.bottom > -vh * 0.2;
    if (inView && !state.carouselInView) {
      state.carouselInView = true;
      if (state.carouselInitialized && !state.isCarouselAnimating) startCarouselAnimation();
    } else if (!inView && state.carouselInView) {
      state.carouselInView = false;
      stopCarouselAnimation();
    }
  }

  function startCarouselAnimation() {
    if (state.isCarouselAnimating || !state.carouselInitialized) return;

    if (!state.carouselOneSetWidth || state.carouselOneSetWidth <= 0) {
      const track = DOM.carouselTrack;
      const allItems = track ? track.querySelectorAll('.carousel-item') : [];
      if (allItems.length) {
        state.carouselOneSetWidth = measureOneSetWidth(Array.from(allItems).slice(0, Math.max(1, Math.floor(allItems.length / 2))));
      } else {
        return;
      }
    }

    state.isCarouselAnimating = true;
    const track = DOM.carouselTrack;
    if (!track) return;

    if (state.carouselAnimationId) cAF(state.carouselAnimationId);
    state.carouselAnimationId = null;

    function step() {
      state.carouselScrollPos += state.carouselSpeed;

      const w = state.carouselOneSetWidth || (track.scrollWidth / 2) || 0;
      if (w > 0) {
        state.carouselScrollPos = state.carouselScrollPos % w;
      } else {
        state.carouselScrollPos = 0;
      }

      track.style.transform = `translate3d(-${Math.max(0, Math.round(state.carouselScrollPos))}px, 0, 0)`;

      if (state.isCarouselAnimating) state.carouselAnimationId = rAF(step);
    }

    step();
  }

  function stopCarouselAnimation() {
    if (state.carouselAnimationId) cAF(state.carouselAnimationId);
    state.carouselAnimationId = null;
    state.isCarouselAnimating = false;
  }

  function bindCarouselHoverPause() {
    const track = DOM.carouselTrack;
    if (!track) return;
    track.addEventListener('mouseenter', stopCarouselAnimation, { passive: true });
    track.addEventListener('mouseleave', () => {
      if (state.carouselInView && state.carouselInitialized && state.carouselOneSetWidth > 0) startCarouselAnimation();
    }, { passive: true });
  }

  /* ==========================================================================
     Testimonials
     ========================================================================== */
  function initTestimonials() {
    const testimonials = Array.from(document.querySelectorAll('.testimonial'));
    const dotsContainer = DOM.dotsContainer;
    const prevBtn = DOM.prevBtn;
    const nextBtn = DOM.nextBtn;
    const container = DOM.testimonialContainer;

    if (!testimonials.length || !dotsContainer || !prevBtn || !nextBtn || !container) return;

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
      state.testimonialAutoInterval = setInterval(() => showTestimonial(current + 1), CONFIG.TESTIMONIAL_AUTO_MS);
    }
    function stopAuto() {
      if (state.testimonialAutoInterval) clearInterval(state.testimonialAutoInterval);
    }
    function restartAutoSlide() {
      stopAuto();
      startAuto();
    }

    initHeight();
    startAuto();
  }

  /* ==========================================================================
     Popup show/hide (fixed)
     - Show popup using init-time timer (do not rely on window.load).
     ========================================================================== */
  function initPopup() {
    const popup = DOM.popup;
    const closeBtn = DOM.popupClose;
    if (!popup || !closeBtn) return;

    // Show popup after POPUP_DELAY from page init (guaranteed)
    if (!state.popupShown) {
      setTimeout(() => {
        popup.classList.add('active');
        state.popupShown = true;
      }, CONFIG.POPUP_DELAY);
    }

    closeBtn.addEventListener('click', () => popup.classList.remove('active'));
    popup.addEventListener('click', (e) => {
      if (e.target === popup) popup.classList.remove('active');
    });
  }

  /* ==========================================================================
     Tracking helper for Bing UET / custom event
     ========================================================================== */
  function sendConversionTracking(eventName = 'submit_lead_form', payload = {}) {
    try {
      // 1) If bing's uetq exists
      if (window.uetq && Array.isArray(window.uetq.push)) {
        window.uetq.push('event', eventName, payload || {});
      }
      // 2) If helper exists
      if (typeof window.uet_report_conversion === 'function') {
        try { window.uet_report_conversion(); } catch (e) {}
      }
      // 3) Try navigator.sendBeacon to a transparent tracking endpoint (optional fallback)
      // If you have a tracking URL, you can place it here. We'll attempt a safe no-op if absent.
      // Example: const trackingUrl = 'https://your-tracking-endpoint.example/collect';
      // navigator.sendBeacon(trackingUrl, JSON.stringify({ event: eventName, ...payload }));
    } catch (err) {
      // swallow tracking errors so they don't affect UX
      console.warn('tracking error', err);
    }
  }

  /* ==========================================================================
     Popup form submission (fixed, includes tracking)
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

      // Try to keep submission under ~5s: use fetch with timeout wrapper
      const BACKEND_URL = (() => {
        // preserve original host; you can override by setting a global SOUNDABODE_BACKEND if needed
        return window.SOUNDABODE_BACKEND_URL || 'https://soundabodev2-server.onrender.com/api/popup-form';
      })();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const resp = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName: data.name, email: data.email, phone: data.phone }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const result = await resp.json().catch(() => ({}));
        if (resp.ok && result.success) {
          if (statusMsg) {
            statusMsg.textContent = "✅ Thank you! We'll contact you soon.";
            statusMsg.style.color = '#00ff88';
          }
          // fire conversion tracking
          try {
            sendConversionTracking('popup_form_submitted', { name: data.name, email: data.email });
          } catch (tErr) {
            // ignore
          }
          form.reset();
          setTimeout(() => {
            const p = document.getElementById('popup-form');
            if (p) p.classList.remove('active');
          }, 1400);
        } else {
          // treat non-2xx as failure; if server returned message, show it
          const msg = (result && result.message) ? result.message : 'Submission failed';
          throw new Error(msg);
        }
      } catch (err) {
        // if aborted, show friendly message
        console.error('Popup submit error', err);
        if (statusMsg) {
          statusMsg.textContent = err.name === 'AbortError' ? '❌ Request timed out. Try again.' : '❌ Failed to submit. Please try again.';
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
     Contact form handler
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

      if (!data.fullName || !data.email || !data.phone) {
        if (statusMsg) {
          statusMsg.textContent = '❌ Please fill name, email and phone';
          statusMsg.style.color = '#ff4444';
        }
        return;
      }

      // recaptcha optional guard left intact if present
      const recaptchaResponse = (window.grecaptcha && grecaptcha.getResponse && grecaptcha.getResponse()) || '';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
      }

      const BACKEND_URL = window.SOUNDABODE_BACKEND_URL || 'https://soundabodev2-server.onrender.com/api/contact-form';

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const body = { fullName: data.fullName, email: data.email, phone: data.phone, course: data.course || '', message: data.message || '', recaptcha: recaptchaResponse };

        const resp = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const result = await resp.json().catch(() => ({}));
        if (resp.ok && result.success) {
          if (statusMsg) {
            statusMsg.textContent = "✅ Message sent successfully! We'll get back to you soon.";
            statusMsg.style.color = '#00ff88';
          }
          // conversion tracking
          try {
            sendConversionTracking('contact_form_submitted', { name: data.fullName, email: data.email });
          } catch (tErr) {}
          form.reset();
          if (window.grecaptcha && grecaptcha.reset) grecaptcha.reset();
        } else {
          const msg = (result && result.message) ? result.message : 'Submission failed';
          throw new Error(msg);
        }
      } catch (err) {
        console.error('Contact submit error', err);
        if (statusMsg) {
          statusMsg.textContent = err.name === 'AbortError' ? '❌ Request timed out. Try again.' : '❌ Failed to send message. Please try again.';
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
     Logo scroller — robust measurement & no-wrap behavior
     ========================================================================== */
  function initLogoScroller() {
    const track = DOM.logoTrack;
    const set = DOM.logoSet;
    const banner = DOM.clientLogoBanner;
    if (!track || !set || !banner) return;

    if (!set.children || set.children.length === 0) {
      console.warn('Logo scroller: no .logo-item children found inside .logo-set');
      return;
    }

    // clear and create two inline sets
    track.innerHTML = '';
    const set1 = set.cloneNode(true);
    const set2 = set.cloneNode(true);
    set1.classList.add('logo-set'); // keep class for measurement logic
    set2.classList.add('logo-set');
    set1.style.display = 'inline-flex';
    set2.style.display = 'inline-flex';
    track.appendChild(set1);
    track.appendChild(set2);

    // ensure no wrap
    track.style.display = 'flex';
    track.style.flexWrap = 'nowrap';
    track.style.alignItems = 'center';

    function updateLogoSpeed() {
      const w = window.innerWidth;
      if (w < 660) state.logoScrollSpeed = CONFIG.LOGO_SCROLL_SPEEDS.xs;
      else if (w < 768) state.logoScrollSpeed = CONFIG.LOGO_SCROLL_SPEEDS.sm;
      else if (w < 1440) state.logoScrollSpeed = CONFIG.LOGO_SCROLL_SPEEDS.md;
      else state.logoScrollSpeed = CONFIG.LOGO_SCROLL_SPEEDS.lg;

      if (isLowEndDevice()) state.logoScrollSpeed *= 0.6;
      state.logoSetWidth = 0;
    }

    function computeLogoSetWidth() {
      if (!state.logoSetWidth) {
        const sets = track.querySelectorAll('.logo-set');
        if (sets.length > 0) {
          const rect = sets[0].getBoundingClientRect();
          state.logoSetWidth = Math.round(rect.width);
        } else {
          state.logoSetWidth = 0;
        }
      }
      return state.logoSetWidth;
    }

    function animateLogo() {
      if (state.logoAnimationId) cAF(state.logoAnimationId);
      state.logoAnimationId = null;

      function step() {
        if (!state.logoIsPaused) {
          state.logoCurrentPosition -= state.logoScrollSpeed;
          const w = computeLogoSetWidth();
          if (w > 0) {
            if (-state.logoCurrentPosition >= w) {
              state.logoCurrentPosition += w;
            }
            track.style.transform = `translate3d(${state.logoCurrentPosition}px, 0, 0)`;
          }
        }
        state.logoAnimationId = rAF(step);
      }
      step();
    }

    banner.addEventListener('mouseenter', () => { state.logoIsPaused = true; }, { passive: true });
    banner.addEventListener('mouseleave', () => { state.logoIsPaused = false; }, { passive: true });

    const bannerObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        state.logoIsPaused = !entry.isIntersecting;
      });
    }, { threshold: 0.01 });
    bannerObserver.observe(banner);

    updateLogoSpeed();
    window.addEventListener('resize', updateLogoSpeed, { passive: true });

    animateLogo();
  }

  /* ==========================================================================
     Reveal on scroll
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
            if (!el.classList.contains('active')) setTimeout(() => el.classList.add('active'), i * 100);
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
        // ignore invalid selector
      }
    });
  }

  /* ==========================================================================
     Aurora fallback, hamburger, join buttons, faq, modals
     ========================================================================== */
  function ensureAuroraText() {
    const el = DOM.auroraText;
    if (!el) return;
    const cs = getComputedStyle(el);
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

  function initHamburger() {
    const hamburger = DOM.hamburger, navMenu = DOM.navMenu;
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
          setTimeout(() => { body.hidden = true; }, 360);
        } else {
          item.setAttribute('data-open', 'true');
          head.setAttribute('aria-expanded', 'true');
          body.hidden = false;
          requestAnimationFrame(() => (body.style.maxHeight = body.scrollHeight + 'px'));
        }
      });
    });
  }

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
        const title = card.dataset.title || card.querySelector('.card-title')?.textContent || '';
        const desc = card.dataset.desc || card.querySelector('.card-excerpt')?.textContent || '';
        const specs = card.dataset.specs || '';
        openModal(title, desc, specs);
      });
    });

    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  }

  function initStudioModal() {
    if (!DOM.studioModal) return;
    const cards = Array.from(document.querySelectorAll('#studio-setup .gear-card'));
    const modal = DOM.studioModal, closeBtn = DOM.studioModalClose;
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
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(title, desc); }
      });
      const cta = card.querySelector('.card-cta');
      if (cta) cta.addEventListener('click', (e) => { e.stopPropagation(); openModal(title, desc); });
    });

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  }

  function initWhyDropdown() {
    const wd = DOM.whyDropdown, toggle = DOM.whyDropdownToggle, panel = DOM.whyDropdownPanel;
    if (!wd || !toggle || !panel) return;

    function openPanel() { wd.classList.add('open'); toggle.setAttribute('aria-expanded', 'true'); }
    function closePanel() { wd.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
    function togglePanel(e) { e.preventDefault(); if (wd.classList.contains('open')) closePanel(); else openPanel(); }

    toggle.addEventListener('click', togglePanel);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && wd.classList.contains('open')) { closePanel(); toggle.focus(); }});
    document.addEventListener('click', (e) => { if (!wd.contains(e.target) && wd.classList.contains('open')) closePanel(); });
  }

  /* ==========================================================================
     Event lifecycle & bootstrap
     ========================================================================== */
  function bindGlobalListeners() {
    window.addEventListener('scroll', onScrollHandler, { passive: true });
    window.addEventListener('resize', () => {
      state.carouselOneSetWidth = 0;
      state.logoSetWidth = 0;
      state.lastScrollY = window.scrollY || 0;
    }, { passive: true });
  }

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

  function init() {
    // guard against double init
    if (state.inited) return;
    state.inited = true;

    ensureAuroraText();
    bindGlobalListeners();

    state.ticking = true;
    masterAnimationLoop();

    // modules
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

    // defensive re-run in case layout changed after fonts/images load
    setTimeout(initCarouselClones, CONFIG.CAROUSEL_CLONE_DELAY * 2);
  }

  /* ==========================================================================
     BOOTSTRAP: robust, single-call init (not a patch)
     - Waits for styles/fonts but GUARANTEES init() runs quickly if they don't.
     ========================================================================== */
  function scheduleInitWhenReady() {
    let called = false;
    const safeInit = () => {
      if (!called) {
        called = true;
        try { init(); } catch (e) { console.error('init error', e); }
      }
    };

    // Best-effort wait for styles/fonts but timeout quickly
    whenStylesAndFontsReady(CONFIG.STYLES_READY_TIMEOUT).then(() => {
      // Try to use requestIdleCallback if available (but do not depend on it)
      if ('requestIdleCallback' in window) {
        try {
          requestIdleCallback(() => safeInit(), { timeout: 300 });
        } catch (e) {
          // fallback to immediate safeInit
          setTimeout(safeInit, 0);
        }
      } else {
        // small delay then init
        setTimeout(safeInit, 0);
      }
    }).catch(() => {
      // ensure init runs even if readiness helper fails
      setTimeout(safeInit, 0);
    });

    // Hard fallback: guarantee init after BOOT_TIMEOUT milliseconds
    setTimeout(() => {
      if (!called) safeInit();
    }, CONFIG.BOOT_TIMEOUT);
  }

  // Start: schedule init as soon as DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleInitWhenReady);
  } else {
    scheduleInitWhenReady();
  }
})();
