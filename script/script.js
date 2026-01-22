/* ============================================================================
   SOUNDABODE SITE SCRIPT - WITH GOOGLE SHEETS INTEGRATION
   - Dual submission: Google Sheets + Backend Email
   - Mobile video autoplay fixed
   - Carousel with drag/swipe support
   - Infinite seamless scrolling
   - Navigation buttons
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
      POPUP_VISIBLE_DURATION: 20000,
      TESTIMONIAL_AUTO_MS: 3000,
      CAROUSEL_CLONE_DELAY: 400,
      LOGO_SCROLL_SPEEDS: { xs: 0.03, sm: 0.05, md: 0.25, lg: 0.4 },
      CAROUSEL_STRICT_VIEWPORT_FACTOR: 1.2,
      STYLES_READY_TIMEOUT: 2500,
      BOOT_TIMEOUT: 350,
      VIDEO_RETRY_ATTEMPTS: 3,
      VIDEO_RETRY_DELAY: 1000,
      
      // ✅ ADD YOUR GOOGLE SHEETS WEB APP URL HERE
      SHEETS_URL: 'https://script.google.com/macros/s/AKfycbwJyBy1qVa2jlQ0aa3FhtkxcJJpBcgvJHIuxp2ms5l--4GMd6zLZywUWC1qQIu1uGEG0A/exec'
    };
  
    /* ==========================================================================
       Backend base configuration
       ========================================================================== */
    const API = {
      base: (function () {
        const base = window.SOUNDABODE_BACKEND_BASE || window.SOUNDABODE_BACKEND_URL || 'https://soundabodev2-server.onrender.com';
        return String(base).replace(/\/+$/, '');
      })()
    };
  
    /* ==========================================================================
       Device helpers
       ========================================================================== */
    const isMobile = () => window.innerWidth < 768;
    const isAndroid = () => /Android/i.test(navigator.userAgent);
    const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isLowEndDevice = () => (navigator.deviceMemory && navigator.deviceMemory < 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 3);
    const supportsIntersectionObserver = () => 'IntersectionObserver' in window;
  
    /* ==========================================================================
       DOM cache (defensive)
       ========================================================================== */
    const q = (s) => document.querySelector(s);
    const qAll = (s) => Array.from(document.querySelectorAll(s));
  
    const DOM = {
      panelLeft: q('.panel-left'),
      panelRight: q('.panel-right'),
      introOverlay: q('.intro-overlay'),
      overlayLeft: q('.overlay-left'),
      overlayRight: q('.overlay-right'),
  
      mainContent: q('.main-content'),
      navbar: q('.navbar'),
      spacer: q('.spacer'),
  
      carouselTrack: q('.carousel-track'),
      carouselSection: document.getElementById('carousel-section'),
  
      logoTrack: q('.logo-track'),
      logoSet: q('.logo-set'),
      clientLogoBanner: q('.client-logo-banner'),
  
      testimonialContainer: q('.testimonial-container'),
      prevBtn: q('.prev'),
      nextBtn: q('.next'),
      dotsContainer: q('.dots'),
  
      popup: document.getElementById('popup-form'),
      popupClose: document.getElementById('closePopup'),
      popupForm: document.getElementById('popup-form-element'),
  
      contactForm: document.getElementById('contact-form'),
      contactStatus: document.getElementById('form-status'),
  
      aboutSection: document.getElementById('about-section'),
  
      carouselNavPrev: document.getElementById('carousel-nav-prev'),
      carouselNavNext: document.getElementById('carousel-nav-next'),
  
      faqItems: qAll('.faq-item'),
  
      gearCards: qAll('.gear-card'),
      gearModal: document.getElementById('gearModal'),
      gearModalTitle: document.getElementById('modalTitle'),
      gearModalDesc: document.getElementById('modalDesc'),
      gearModalSpecs: document.getElementById('modalSpecs'),
      gearModalClose: document.getElementById('modalClose'),
  
      studioModal: document.getElementById('studioModal'),
      studioModalTitle: document.getElementById('studioModalTitle'),
      studioModalDesc: document.getElementById('studioModalDesc'),
      studioModalClose: document.getElementById('studioModalClose'),
  
      whyDropdown: q('.why-dropdown'),
      whyDropdownToggle: document.getElementById('whyDropdownToggle'),
      whyDropdownPanel: document.getElementById('whyDropdownPanel'),
  
      hamburger: q('.hamburger-menu'),
      navMenu: q('.nav-menu'),
  
      joinControls: qAll('[data-open-popup]'),
  
      auroraText: q('.aurora-text'),
  
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
  
      carouselInView: false,
      isCarouselAnimating: false,
      carouselOneSetWidth: 0,
      carouselInitialized: false,
      carouselScrollPos: 0,
      carouselAnimationId: null,
      carouselSpeed: isMobile() ? 0.8 : 1.0,
  
      logoAnimationId: null,
      logoCurrentPosition: 0,
      logoScrollSpeed: CONFIG.LOGO_SCROLL_SPEEDS.md,
      logoSetWidth: 0,
      logoIsPaused: false,
  
      testimonialAutoInterval: null,
  
      popupShown: false,
      popupHideTimer: null,
  
      videosInitialized: false,
      videoRetryCount: {},
  
      inited: false
    };
  
    /* ==========================================================================
       Small helpers
       ========================================================================== */
    const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
    const rAF = (fn) => requestAnimationFrame(fn);
    const cAF = (id) => { try { if (id) cancelAnimationFrame(id); } catch (e) {} };
    const safe = (fn) => { try { fn(); } catch (e) { console.error(e); } };

    /* ==========================================================================
       GOOGLE SHEETS SUBMISSION HELPER
       ========================================================================== */
    async function submitToGoogleSheets(data) {
      if (!CONFIG.SHEETS_URL || CONFIG.SHEETS_URL.includes('YOUR_DEPLOYMENT_ID')) {
        console.warn('⚠️ Google Sheets URL not configured');
        return { success: false, error: 'Sheets URL not configured' };
      }

      try {
        const payload = new URLSearchParams({
          name: data.fullName || data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          message: data.message || '',
          course: data.course || '',
          source: data.source || 'Website',
          timestamp: new Date().toISOString()
        });

        const response = await fetch(CONFIG.SHEETS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: payload.toString()
        });

        if (response.ok) {
          console.log('✅ Data saved to Google Sheets');
          return { success: true };
        } else {
          const text = await response.text();
          console.warn('⚠️ Google Sheets save failed:', text);
          return { success: false, error: text };
        }
      } catch (err) {
        console.error('❌ Google Sheets error:', err);
        return { success: false, error: err.message };
      }
    }
  
    /* ==========================================================================
       VIDEO HANDLING - MOBILE FIX
       ========================================================================== */
    function initIntroVideos() {
      const videos = qAll('.intro-panel video');
      if (!videos || videos.length === 0) return;
  
      console.log('[Video Init] Found', videos.length, 'videos');
      console.log('[Video Init] isMobile:', isMobile(), 'isAndroid:', isAndroid(), 'isIOS:', isIOS());
  
      videos.forEach((video, index) => {
        state.videoRetryCount[index] = 0;
  
        const source = video.querySelector('source');
        const videoSrc = video.getAttribute('data-src') || (source && source.getAttribute('data-src'));
        
        if (!videoSrc) {
          console.warn('[Video Init] No data-src found for video', index);
          return;
        }
  
        if (source) {
          source.src = videoSrc;
        } else {
          video.src = videoSrc;
        }
  
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('x-webkit-airplay', 'allow');
        video.playsInline = true;
        video.muted = true;
        video.loop = true;
        video.autoplay = false;
  
        const panel = video.closest('.intro-panel');
        const poster = panel ? panel.querySelector('.video-poster') : null;
  
        function attemptPlay(retryCount = 0) {
          if (retryCount >= CONFIG.VIDEO_RETRY_ATTEMPTS) {
            console.warn('[Video] Max retry attempts reached for video', index);
            if (poster) {
              poster.style.opacity = '1';
              poster.style.zIndex = '2';
            }
            return;
          }
  
          video.load();
          
          const playPromise = video.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('[Video] Successfully playing video', index);
                video.classList.add('playing');
                if (poster) {
                  setTimeout(() => {
                    poster.style.opacity = '0';
                    poster.style.zIndex = '0';
                  }, 300);
                }
              })
              .catch(err => {
                console.warn('[Video] Play attempt', retryCount + 1, 'failed for video', index, ':', err.message);
                setTimeout(() => {
                  attemptPlay(retryCount + 1);
                }, CONFIG.VIDEO_RETRY_DELAY);
              });
          }
        }
  
        video.addEventListener('loadedmetadata', () => {
          console.log('[Video] Metadata loaded for video', index);
        });
  
        video.addEventListener('canplay', () => {
          console.log('[Video] Can play video', index);
          if (!video.classList.contains('playing')) {
            attemptPlay(0);
          }
        });
  
        video.addEventListener('playing', () => {
          console.log('[Video] Video is playing', index);
        });
  
        video.addEventListener('error', (e) => {
          console.error('[Video] Error loading video', index, ':', e);
          if (poster) {
            poster.style.opacity = '1';
            poster.style.zIndex = '2';
          }
        });
  
        if (isIOS()) {
          const startOnInteraction = () => {
            attemptPlay(0);
            document.removeEventListener('touchstart', startOnInteraction);
          };
          document.addEventListener('touchstart', startOnInteraction, { once: true, passive: true });
        }
  
        attemptPlay(0);
      });
  
      if (supportsIntersectionObserver()) {
        const videoObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
              if (video.paused && video.readyState >= 2) {
                video.play().catch(e => console.log('[Video] Observer play failed:', e.message));
              }
            } else {
              if (!video.paused && !isLowEndDevice()) {
                video.pause();
              }
            }
          });
        }, { threshold: 0.25 });
  
        videos.forEach(video => videoObserver.observe(video));
      }
  
      state.videosInitialized = true;
    }
  
    /* ==========================================================================
       Wait for fonts & styles (best-effort)
       ========================================================================== */
    function whenStylesAndFontsReady(timeout = CONFIG.STYLES_READY_TIMEOUT) {
      return new Promise((resolve) => {
        let resolved = false;
        const tidy = () => { if (!resolved) { resolved = true; resolve(); } };
  
        try {
          if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => setTimeout(tidy, 20)).catch(tidy);
          }
        } catch (e) {}
  
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"]'));
        if (links.length === 0) return setTimeout(tidy, 30);
  
        let remaining = links.length;
        links.forEach((ln) => {
          if (ln.__loaded || ln.sheet || ln.media === 'all' || ln.media === '') {
            remaining -= 1; if (remaining <= 0) tidy(); return;
          }
          const onLoad = () => { ln.__loaded = true; remaining -= 1; if (remaining <= 0) tidy(); }; 
          const onErr = () => { remaining -= 1; if (remaining <= 0) tidy(); };
          ln.addEventListener('load', onLoad, { passive: true });
          ln.addEventListener('error', onErr, { passive: true });
        });
  
        setTimeout(tidy, timeout);
      });
    }
  
    /* ==========================================================================
       Scroll-driven animation loop
       ========================================================================== */
    const INTRO_ANIMATION_RANGE = () => Math.max(1, window.innerHeight * CONFIG.INTRO_ANIMATION_RATIO);
  
    function masterAnimationLoop() {
      state.scrollY = window.scrollY || window.pageYOffset || 0;
  
      if (Math.abs(state.scrollY - state.lastScrollY) > 5 || !state.ticking) {
        state.lastScrollY = state.scrollY;
        state.spacerStart = window.innerHeight;
        state.spacerEnd = state.spacerStart + ((DOM.spacer && DOM.spacer.offsetHeight) || 0);
        state.phase1Progress = clamp(state.scrollY / INTRO_ANIMATION_RANGE(), 0, 1);
  
        updateIntroOverlay();
        updateMainContent();
        checkCarouselInView();
      }
  
      if (state.ticking) state.rafId = rAF(masterAnimationLoop);
    }
  
    function onScrollHandler() {
      if (!state.ticking) { state.ticking = true; masterAnimationLoop(); }
      if (state.rafStopTimer) clearTimeout(state.rafStopTimer);
      state.rafStopTimer = setTimeout(() => {
        if (state.ticking) { cAF(state.rafId); state.rafId = null; state.ticking = false; }
      }, CONFIG.RAF_STOP_DELAY);
    }
  
    /* ==========================================================================
       Intro overlay updates
       ========================================================================== */
    function updateIntroOverlay() {
      const { panelLeft, panelRight, introOverlay, overlayLeft, overlayRight } = DOM;
      if (!panelLeft || !panelRight || !introOverlay) return;
      const mobile = isMobile();
      const progress = state.phase1Progress;
      const percent = progress * 100;
  
      try {
        if (mobile) {
          panelLeft.style.transform = `translate3d(0, ${-percent}%, 0)`;
          panelRight.style.transform = `translate3d(0, ${percent}%, 0)`;
        } else {
          panelLeft.style.transform = `translate3d(${ -percent }%, 0, 0)`;
          panelRight.style.transform = `translate3d(${ percent }%, 0, 0)`;
        }
  
        if (overlayLeft) overlayLeft.style.transform = mobile ? 'translate3d(0,0,0)' : `translate3d(${ -progress * 10 }px, 0, 0)`;
        if (overlayRight) overlayRight.style.transform = mobile ? 'translate3d(0,0,0)' : `translate3d(${ progress * 10 }px, 0, 0)`;
  
        const fadeStart = 0.75;
        const fadeOpacity = Math.max(0, 1 - (progress - fadeStart) / (1 - fadeStart));
        introOverlay.style.opacity = String(fadeOpacity);
  
        if (fadeOpacity < 0.05) { introOverlay.style.pointerEvents = 'none'; introOverlay.style.zIndex = '1'; }
        else { introOverlay.style.pointerEvents = 'auto'; introOverlay.style.zIndex = '50'; }
      } catch (e) {}
    }
  
    function updateMainContent() {
      if (!DOM.mainContent) return;
      const p = state.phase1Progress;
      safe(() => { DOM.mainContent.style.transform = `scale(${1 + p * 0.05})`; DOM.mainContent.style.opacity = String(p); });
      if (p > 0.1) safe(() => { DOM.mainContent.style.pointerEvents = 'auto'; });
      if (DOM.navbar) safe(() => { DOM.navbar.style.opacity = '1'; DOM.navbar.style.pointerEvents = 'auto'; });
    }
  
    /* ==========================================================================
       CAROUSEL - Complete implementation with drag/swipe
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
      if (!items || items.length === 0) return 0;
      let total = 0;
      for (let i = 0; i < items.length; i++) {
        total += items[i].getBoundingClientRect().width;
      }
      const track = DOM.carouselTrack;
      const gap = track ? getGapValuePx(track) : 0;
      if (items.length > 1) total += gap * (items.length - 1);
      return Math.round(total);
    }
  
    function initCarouselClones() {
      const track = DOM.carouselTrack; 
      if (!track || state.carouselInitialized) return;
      
      const originalItems = Array.from(track.querySelectorAll('.carousel-item'));
      if (!originalItems.length) return;
  
      track.style.display = track.style.display || 'flex';
      track.style.flexWrap = 'nowrap';
      track.style.justifyContent = track.style.justifyContent || 'flex-start';
      const wrapper = DOM.carouselSection ? DOM.carouselSection : track.parentElement; 
      if (wrapper) wrapper.style.overflow = wrapper.style.overflow || 'hidden';
  
      setTimeout(() => {
        try {
          const measuredWidth = measureOneSetWidth(originalItems);
          state.carouselOneSetWidth = measuredWidth > 0 ? measuredWidth : Math.round((track.scrollWidth || track.offsetWidth || 0) / 2);
  
          const clones = originalItems.map((it) => it.cloneNode(true));
          while (track.firstChild) track.removeChild(track.firstChild);
  
          clones.forEach((c) => { 
            c.style.flex = c.style.flex || c.getAttribute('data-flex') || ''; 
            track.appendChild(c.cloneNode(true)); 
          });
          clones.forEach((c) => { track.appendChild(c.cloneNode(true)); });
          clones.forEach((c) => { track.appendChild(c.cloneNode(true)); });
  
          if (!state.carouselOneSetWidth || state.carouselOneSetWidth === 0) {
            const newItems = track.querySelectorAll('.carousel-item');
            state.carouselOneSetWidth = measureOneSetWidth(Array.from(newItems).slice(0, clones.length));
          }
  
          state.carouselScrollPos = state.carouselOneSetWidth;
          track.style.transform = `translate3d(-${state.carouselScrollPos}px, 0, 0)`;
  
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
      }
      else if (!inView && state.carouselInView) { 
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
          state.carouselOneSetWidth = measureOneSetWidth(Array.from(allItems).slice(0, Math.max(1, Math.floor(allItems.length / 3))));
        } else return;
      }
  
      state.isCarouselAnimating = true; 
      const track = DOM.carouselTrack; 
      if (!track) return;
      if (state.carouselAnimationId) cAF(state.carouselAnimationId); 
      state.carouselAnimationId = null;
  
      function step() {
        if (!state.isCarouselAnimating) return;
        
        state.carouselScrollPos += state.carouselSpeed; 
        const w = state.carouselOneSetWidth || 0;
        
        if (w > 0) {
          if (state.carouselScrollPos >= w * 2) {
            state.carouselScrollPos -= w;
          } else if (state.carouselScrollPos <= 0) {
            state.carouselScrollPos += w;
          }
        }
        
        track.style.transform = `translate3d(-${Math.max(0, Math.round(state.carouselScrollPos))}px, 0, 0)`;
        state.carouselAnimationId = rAF(step);
      }
      step();
    }
  
    function stopCarouselAnimation() { 
      if (state.carouselAnimationId) cAF(state.carouselAnimationId); 
      state.carouselAnimationId = null; 
      state.isCarouselAnimating = false; 
    }
  
    function initCarouselDragSwipe() {
      const track = DOM.carouselTrack;
      if (!track) return;
  
      let isDragging = false;
      let startX = 0;
      let startScrollPos = 0;
      let currentX = 0;
      let velocity = 0;
      let lastTime = 0;
      let lastX = 0;
  
      function handleStart(e) {
        isDragging = true;
        const wasAnimating = state.isCarouselAnimating;
        if (wasAnimating) stopCarouselAnimation();
  
        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        startX = clientX;
        currentX = clientX;
        lastX = clientX;
        startScrollPos = state.carouselScrollPos || 0;
        velocity = 0;
        lastTime = Date.now();
  
        track.style.cursor = 'grabbing';
        track.style.transition = 'none';
        
        track.querySelectorAll('a').forEach(link => {
          link.style.pointerEvents = 'none';
        });
      }
  
      function handleMove(e) {
        if (!isDragging) return;
  
        e.preventDefault();
        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        currentX = clientX;
        const deltaX = currentX - startX;
        
        const now = Date.now();
        const dt = now - lastTime;
        if (dt > 0) {
          velocity = (currentX - lastX) / dt;
        }
        lastX = currentX;
        lastTime = now;
  
        let newPos = startScrollPos - deltaX;
        const w = state.carouselOneSetWidth || 0;
        
        if (w > 0) {
          if (newPos >= w * 2) {
            newPos -= w;
            startScrollPos -= w;
            startX += deltaX;
          } else if (newPos <= 0) {
            newPos += w;
            startScrollPos += w;
            startX += deltaX;
          }
        }
  
        state.carouselScrollPos = newPos;
        track.style.transform = `translate3d(-${Math.round(newPos)}px, 0, 0)`;
      }
  
      function handleEnd() {
        if (!isDragging) return;
        isDragging = false;
  
        track.style.cursor = 'grab';
        
        setTimeout(() => {
          track.querySelectorAll('a').forEach(link => {
            link.style.pointerEvents = '';
          });
        }, 200);
  
        if (Math.abs(velocity) > 0.5) {
          let momentumPos = state.carouselScrollPos - (velocity * 200);
          const w = state.carouselOneSetWidth || 0;
          
          if (w > 0) {
            while (momentumPos >= w * 2) momentumPos -= w;
            while (momentumPos <= 0) momentumPos += w;
          }
  
          track.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          track.style.transform = `translate3d(-${Math.round(momentumPos)}px, 0, 0)`;
          state.carouselScrollPos = momentumPos;
  
          setTimeout(() => {
            track.style.transition = '';
            if (state.carouselInView) startCarouselAnimation();
          }, 600);
        } else {
          if (state.carouselInView) startCarouselAnimation();
        }
      }
  
      track.addEventListener('mousedown', handleStart, { passive: false });
      document.addEventListener('mousemove', handleMove, { passive: false });
      document.addEventListener('mouseup', handleEnd, { passive: true });
  
      track.addEventListener('touchstart', handleStart, { passive: true });
      track.addEventListener('touchmove', handleMove, { passive: false });
      track.addEventListener('touchend', handleEnd, { passive: true });
  
      track.style.cursor = 'grab';
    }
  
    function bindCarouselHoverPause() { 
      const track = DOM.carouselTrack; 
      if (!track) return; 
      
      track.addEventListener('mouseenter', stopCarouselAnimation, { passive: true }); 
      track.addEventListener('mouseleave', () => { 
        if (state.carouselInView && state.carouselInitialized && state.carouselOneSetWidth > 0) {
          startCarouselAnimation();
        }
      }, { passive: true }); 
    }
  
    function initCarouselNavButtons() {
      const prevBtn = document.getElementById('carousel-nav-prev');
      const nextBtn = document.getElementById('carousel-nav-next');
      const track = DOM.carouselTrack;
      
      if (!prevBtn || !nextBtn || !track) {
        console.warn('Carousel nav buttons not found');
        return;
      }
  
      function scrollCarouselManually(direction) {
        const wasAnimating = state.isCarouselAnimating;
        if (wasAnimating) stopCarouselAnimation();
  
        const scrollAmount = isMobile() ? 300 : 400;
        let newPos = state.carouselScrollPos || 0;
        newPos += direction * scrollAmount;
        
        const w = state.carouselOneSetWidth || 0;
        if (w > 0) {
          while (newPos >= w * 2) newPos -= w;
          while (newPos <= 0) newPos += w;
        }
  
        track.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        track.style.transform = `translate3d(-${Math.round(newPos)}px, 0, 0)`;
        state.carouselScrollPos = newPos;
  
        setTimeout(() => {
          track.style.transition = '';
          if (wasAnimating && state.carouselInView) {
            startCarouselAnimation();
          }
        }, 550);
      }
  
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        scrollCarouselManually(-1);
      });
      
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        scrollCarouselManually(1);
      });
    }
  
    function initCarousel() {
      initCarouselClones();
      bindCarouselHoverPause();
      initCarouselDragSwipe();
      initCarouselNavButtons();
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
  
      function next() { showTestimonial(current + 1); }
      function prev() { showTestimonial(current - 1); }
      
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
       Popup
       ========================================================================== */
    function initPopup() {
      const popup = DOM.popup;
      const closeBtn = DOM.popupClose;
      if (!popup || !closeBtn) return;
  
      safe(() => {
        popup.style.zIndex = popup.style.zIndex || '2000';
        popup.style.display = popup.style.display || 'flex';
      });
  
      function clearHideTimer() {
        if (state.popupHideTimer) {
          clearTimeout(state.popupHideTimer);
          state.popupHideTimer = null;
        }
      }
  
      function startHideTimer() {
        clearHideTimer();
        state.popupHideTimer = setTimeout(() => {
          popup.classList.remove('active');
          state.popupHideTimer = null;
        }, CONFIG.POPUP_VISIBLE_DURATION);
      }
  
      function showPopup(sourceEl) {
        popup.__opener = sourceEl || null;
        popup.classList.add('active');
        const firstInput = popup.querySelector('input, button, [tabindex]:not([tabindex="-1"])');
        (firstInput || closeBtn).focus();
        startHideTimer();
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
      }
  
      function hidePopup() {
        popup.classList.remove('active');
        clearHideTimer();
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        try {
          if (popup.__opener && typeof popup.__opener.focus === 'function') popup.__opener.focus();
        } catch (e) {}
        popup.__opener = null;
      }
  
      if (!state.popupShown) {
        setTimeout(() => {
          state.popupShown = true;
          showPopup(null);
        }, CONFIG.POPUP_DELAY);
      }
  
      closeBtn.addEventListener('click', hidePopup);
      popup.addEventListener('click', (e) => {
        if (e.target === popup) hidePopup();
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && popup.classList.contains('active')) hidePopup();
      });
  
      state.showPopup = showPopup;
      state.hidePopup = hidePopup;
    }
  
    /* ==========================================================================
       ✅ POPUP FORM HANDLER - WITH DUAL SUBMISSION (Sheets + Email)
       ========================================================================== */
    function initPopupFormHandler() {
      const form = DOM.popupForm;
      if (!form) return;
  
      form.addEventListener('submit', async (evt) => {
        evt.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const statusMsg = form.querySelector('.popup-status');
  
        const name = form.querySelector('#popup-name')?.value.trim() || '';
        const email = form.querySelector('#popup-email')?.value.trim() || '';
        const phone = form.querySelector('#popup-phone')?.value.trim() || '';
  
        if (!name || !email || !phone) {
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

        /* ========================================
           1️⃣ SEND TO GOOGLE SHEETS
           ======================================== */
        let sheetsSuccess = false;
        try {
          const sheetsResult = await submitToGoogleSheets({
            fullName: name,
            email: email,
            phone: phone,
            message: '',
            source: 'Homepage Popup'
          });
          sheetsSuccess = sheetsResult.success;
        } catch (sheetErr) {
          console.error('❌ Sheets submission error:', sheetErr);
        }

        /* ========================================
           2️⃣ SEND TO BACKEND EMAIL API
           ======================================== */
        const BACKEND_URL = API.base + '/api/popup-form';
        let emailSuccess = false;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
  
          const resp = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName: name, email: email, phone: phone }),
            signal: controller.signal
          });
  
          clearTimeout(timeoutId);
          const result = await resp.json().catch(() => ({}));
  
          if (resp.ok && result && result.success) {
            emailSuccess = true;
          }
        } catch (err) {
          console.error('Popup backend error', err);
        }

        /* ========================================
           3️⃣ HANDLE SUCCESS / FAILURE
           ======================================== */
        if (sheetsSuccess || emailSuccess) {
          if (statusMsg) {
            statusMsg.textContent = "✅ Thank you! We'll contact you soon.";
            statusMsg.style.color = '#00ff88';
          }
          try {
            sendConversionTracking('popup_form_submitted', { name: name, email: email });
          } catch (e) {}
          form.reset();
          setTimeout(() => {
            if (state.hidePopup) state.hidePopup();
          }, 900);
        } else {
          if (statusMsg) {
            statusMsg.textContent = '❌ Failed to submit. Please call us: +91 997-501-6189';
            statusMsg.style.color = '#ff4444';
          }
        }

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Get Started';
        }
      });
    }
  
    /* ==========================================================================
       ✅ CONTACT FORM HANDLER - WITH DUAL SUBMISSION (Sheets + Email)
       ========================================================================== */
    function initContactFormHandler() {
      const form = DOM.contactForm;
      const statusMsg = DOM.contactStatus;
      if (!form) return;
  
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const data = {
          fullName: form.querySelector('#fullName')?.value.trim() || '',
          email: form.querySelector('#email')?.value.trim() || '',
          phone: form.querySelector('#phone')?.value.trim() || '',
          course: form.querySelector('#course')?.value || '',
          message: form.querySelector('#message')?.value.trim() || ''
        };
  
        if (!data.fullName || !data.email || !data.phone) {
          if (statusMsg) {
            statusMsg.textContent = '❌ Please fill name, email and phone';
            statusMsg.style.color = '#ff4444';
          }
          return;
        }
  
        const recaptchaResponse = (window.grecaptcha && grecaptcha.getResponse && grecaptcha.getResponse()) || '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Sending...';
        }

        /* ========================================
           1️⃣ SEND TO GOOGLE SHEETS
           ======================================== */
        let sheetsSuccess = false;
        try {
          const sheetsResult = await submitToGoogleSheets({
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            course: data.course,
            message: data.message,
            source: 'Contact Form'
          });
          sheetsSuccess = sheetsResult.success;
        } catch (sheetErr) {
          console.error('❌ Sheets submission error:', sheetErr);
        }

        /* ========================================
           2️⃣ SEND TO BACKEND EMAIL API
           ======================================== */
        const BACKEND_URL = API.base + '/api/contact-form';
        let emailSuccess = false;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const resp = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullName: data.fullName,
              email: data.email,
              phone: data.phone,
              course: data.course,
              message: data.message,
              recaptcha: recaptchaResponse
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          const result = await resp.json().catch(() => ({}));
          if (resp.ok && result && result.success) {
            emailSuccess = true;
          }
        } catch (err) {
          console.error('Contact backend error', err);
        }

        /* ========================================
           3️⃣ HANDLE SUCCESS / FAILURE
           ======================================== */
        if (sheetsSuccess || emailSuccess) {
          if (statusMsg) {
            statusMsg.textContent = "✅ Message sent successfully! We'll get back to you soon.";
            statusMsg.style.color = '#00ff88';
          }
          try {
            sendConversionTracking('contact_form_submitted', { name: data.fullName, email: data.email });
          } catch (e) {}
          form.reset();
          if (window.grecaptcha && grecaptcha.reset) grecaptcha.reset();
        } else {
          if (statusMsg) {
            statusMsg.textContent = '❌ Failed to send. Please call us: +91 997-501-6189';
            statusMsg.style.color = '#ff4444';
          }
        }

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Message';
        }
      });
    }
  
    /* ==========================================================================
       Logo scroller
       ========================================================================== */
    function initLogoScroller() {
      const track = DOM.logoTrack;
      const set = DOM.logoSet;
      const banner = DOM.clientLogoBanner;
      if (!track || !set || !banner) return;
      if (!set.children || set.children.length === 0) {
        console.warn('Logo scroller: no .logo-item children');
        return;
      }
  
      track.innerHTML = '';
      const set1 = set.cloneNode(true);
      const set2 = set.cloneNode(true);
      set1.classList.add('logo-set');
      set2.classList.add('logo-set');
      set1.style.display = 'inline-flex';
      set2.style.display = 'inline-flex';
      track.appendChild(set1);
      track.appendChild(set2);
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
            state.logoSetWidth = Math.round(sets[0].getBoundingClientRect().width);
          } else state.logoSetWidth = 0;
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
              if (-state.logoCurrentPosition >= w) state.logoCurrentPosition += w;
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
      const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
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
        } catch (e) {}
      });
    }
  
    /* ==========================================================================
       UI helpers
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
      const hamburger = DOM.hamburger;
      const navMenu = DOM.navMenu;
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
  
    function initJoinControls() {
      const controls = DOM.joinControls;
      if (!controls || !controls.length) return;
      
      controls.forEach((el) => {
        el.addEventListener('click', (ev) => {
          const target = el.getAttribute('data-open-popup');
          if (typeof target === 'string') {
            ev.preventDefault();
            if (state.showPopup) state.showPopup(el);
            if (target && target !== 'true') {
              el.__redirectAfterSubmit = target;
              if (DOM.popup) DOM.popup.__pendingRedirect = target;
            }
          }
        });
      });
    }
  
    function initFaqAccordion() {
      const items = DOM.faqItems;
      if (!items || !items.length) return;
      
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
      if (!cards || !cards.length || !modal || !modalClose) return;
      
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
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
      });
    }
  
    function initStudioModal() {
      if (!DOM.studioModal) return;
      const cards = Array.from(document.querySelectorAll('#studio-setup .gear-card'));
      const modal = DOM.studioModal;
      const closeBtn = DOM.studioModalClose;
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
        if (cta) cta.addEventListener('click', (e) => {
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
       Global listeners & tracking
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
  
    function sendConversionTracking(eventName = 'submit_lead_form', payload = {}) {
      try {
        if (window.uetq && Array.isArray(window.uetq.push)) window.uetq.push('event', eventName, payload || {});
        if (typeof window.uet_report_conversion === 'function') {
          try {
            window.uet_report_conversion();
          } catch (e) {}
        }
      } catch (err) {
        console.warn('tracking error', err);
      }
    }
  
    /* ==========================================================================
       Init & bootstrap
       ========================================================================== */
    function init() {
      if (state.inited) return;
      state.inited = true;
      console.log('[Soundabode] Using backend base:', API.base);
      console.log('[Soundabode] Google Sheets URL:', CONFIG.SHEETS_URL);
      console.log('[Soundabode] Initializing mobile video support...');
      
      ensureAuroraText();
      bindGlobalListeners();
      state.ticking = true;
      masterAnimationLoop();
  
      initIntroVideos();
      initCarousel();
      initTestimonials();
      initPopup();
      initPopupFormHandler();
      initContactFormHandler();
      initLogoScroller();
      setupRevealObserver();
      initHamburger();
      initJoinControls();
      initFaqAccordion();
      initGearModal();
      initStudioModal();
      initWhyDropdown();
      initBingUET();
  
      setTimeout(() => {
        if (!state.carouselInitialized) {
          console.log('[Carousel] Retrying initialization...');
          initCarousel();
        }
      }, CONFIG.CAROUSEL_CLONE_DELAY * 2);
    }
  
    function scheduleInitWhenReady() {
      let called = false;
      const safeInit = () => {
        if (!called) {
          called = true;
          try {
            init();
          } catch (e) {
            console.error('init error', e);
          }
        }
      };
      
      whenStylesAndFontsReady(CONFIG.STYLES_READY_TIMEOUT).then(() => {
        if ('requestIdleCallback' in window) {
          try {
            requestIdleCallback(() => safeInit(), { timeout: 300 });
          } catch (e) {
            setTimeout(safeInit, 0);
          }
        } else setTimeout(safeInit, 0);
      }).catch(() => setTimeout(safeInit, 0));
      
      setTimeout(() => {
        if (!called) safeInit();
      }, CONFIG.BOOT_TIMEOUT);
    }
  
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleInitWhenReady);
    else scheduleInitWhenReady();
  
  })();
