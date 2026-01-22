/* ===========================
   Soundabode Contact Page JS
   - Navbar mobile toggle & active link
   - Scroll shadow
   - Contact form submission with Google Sheets + Email
   - Enhanced Conversions dataLayer push (on successful submit)
   =========================== */

/* ===========================
   CONFIGURATION
   =========================== */
   const CONFIG = {
    BACKEND_URL: 'https://soundabodev2-server.onrender.com/api/contact-form',
    // ✅ REPLACE WITH YOUR GOOGLE SHEETS DEPLOYMENT URL
    SHEETS_URL: 'https://script.google.com/macros/s/AKfycbwm1MVuGYm-BogHsaPQUqGK3l-knu7DHlWfrfivWiEnkkcfu2rPBWtNqgGIruePg37lKg/exec'
  };
  
  /* ---------- NAVBAR ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger-menu');
    const navMenu = document.getElementById('mobile-menu');
    const nav = document.querySelector('.navbar');
  
    // Toggle mobile menu
    if (hamburger && navMenu) {
      hamburger.addEventListener('click', () => {
        const expanded = hamburger.getAttribute('aria-expanded') === 'true';
        hamburger.setAttribute('aria-expanded', String(!expanded));
        hamburger.classList.toggle('is-active');
        navMenu.classList.toggle('is-active');
      });
  
      // Close on link click
      navMenu.querySelectorAll('a').forEach((a) => {
        a.addEventListener('click', () => {
          hamburger.classList.remove('is-active');
          hamburger.setAttribute('aria-expanded', 'false');
          navMenu.classList.remove('is-active');
        });
      });
    }
  
    // Scroll shadow
     onScroll = () => {
      if (!nav) return;
      if (window.scrollY > 8) {
        nav.classList.add('is-scrolled');
      } else {
        nav.classList.remove('is-scrolled');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  
    // Active link highlight for Contact page
    document.querySelectorAll('.nav-links a, #mobile-menu a').forEach((a) => {
       href = (a.getAttribute('href') || '').toLowerCase();
      if (href.includes('contact')) a.classList.add('is-active');
    });
  });
  
  /* ==========================================================================
     GOOGLE SHEETS SUBMISSION HELPER
     ========================================================================== */
  async function submitToGoogleSheets(data) {
    if (!CONFIG.SHEETS_URL || CONFIG.SHEETS_URL.includes('YOUR_DEPLOYMENT_ID')) {
      console.warn('⚠️ Google Sheets URL not configured');
      return { success: false, error: 'Sheets URL not configured' };
    }
  
  try {
    // Build payload for contact form
    const payload = new URLSearchParams({
      name: data.fullName || '',
      email: data.email || '',
      phone: data.phone || '',
      course: data.course || '',
      message: data.message || '',
      source: data.source || 'Contact Form'
    });
  
      console.log('📤 Sending to Google Sheets (Contact Form)');
      console.log('   Data:', {
        name: data.fullName,
        email: data.email,
        phone: data.phone,
        course: data.course,
        source: 'Contact Form'
      });
  
      const response = await fetch(CONFIG.SHEETS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload.toString()
      });
  
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Sheets response:', result);
        console.log('   Saved to sheet:', result.sheet || 'unknown');
        return { success: true, sheet: result.sheet };
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
  
  /* ---------- CONTACT FORM - DUAL SUBMISSION ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;
  
    const statusMsg = document.getElementById('form-status');
  
    // Allow override via data attribute
    const backendURL = contactForm.getAttribute('data-backend') || CONFIG.BACKEND_URL;
  
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const btnText = submitBtn?.querySelector('.btn-text');

      const courseEl = contactForm.querySelector('#course');
      const rawCourse = courseEl ? courseEl.value : '';

      const phoneRaw = contactForm.querySelector('#phone')?.value || '';
      const phoneDigits = phoneRaw.replace(/\D/g, '');

      const formData = {
        fullName: contactForm.querySelector('#fullName')?.value.trim() || '',
        email: contactForm.querySelector('#email')?.value.trim() || '',
        phone: phoneDigits,
        // force a valid course string; block placeholder values
        course: rawCourse && !/select/i.test(rawCourse) ? rawCourse.trim() : '',
        message: contactForm.querySelector('#message')?.value.trim() || '',
        source: 'Contact Form'
      };
  
      /* ========================================
         VALIDATION
         ======================================== */
      if (!formData.fullName || !formData.email || !formData.phone || !formData.course) {
        if (statusMsg) {
          statusMsg.style.display = 'block';
          statusMsg.textContent = '❌ Please fill all required fields';
          statusMsg.style.color = '#ff4444';
        }
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        if (statusMsg) {
          statusMsg.style.display = 'block';
          statusMsg.textContent = '❌ Please enter a valid email address';
          statusMsg.style.color = '#ff4444';
        }
        return;
      }

      // Phone validation (normalized 10 digits)
      if (!formData.phone || formData.phone.length !== 10) {
        if (statusMsg) {
          statusMsg.style.display = 'block';
          statusMsg.textContent = '❌ Please enter a valid 10-digit phone number';
          statusMsg.style.color = '#ff4444';
        }
        return;
      }
  
      /* ========================================
         DISABLE BUTTON & SHOW LOADING
         ======================================== */
      if (submitBtn) {
        submitBtn.disabled = true;
        if (btnText) btnText.textContent = 'Sending...';
      }
  
      /* ========================================
         1️⃣ SEND TO GOOGLE SHEETS
         ======================================== */
      let sheetsSuccess = false;
      try {
        const sheetsResult = await submitToGoogleSheets(formData);
        sheetsSuccess = sheetsResult.success;
        if (sheetsSuccess) {
          console.log('✅ Data saved to Google Sheets:', sheetsResult.sheet);
        }
      } catch (sheetErr) {
        console.error('❌ Sheets submission error:', sheetErr);
      }
  
      /* ========================================
         2️⃣ SEND TO BACKEND EMAIL API
         ======================================== */
      let emailSuccess = false;
      try {
        const res = await fetch(backendURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          mode: 'cors',
          credentials: 'omit',
          body: JSON.stringify(formData)
        });
  
        const result = await res.json().catch(() => ({}));
  
        if (res.ok && result && result.success) {
          emailSuccess = true;
          console.log('✅ Email sent via backend');
        } else {
          console.warn('⚠️ Backend email failed:', result?.message);
        }
      } catch (err) {
        console.error('❌ Backend email error:', err);
      }
  
      /* ========================================
         3️⃣ HANDLE SUCCESS / FAILURE
         ======================================== */
      if (sheetsSuccess || emailSuccess) {
        // ✅ SUCCESS - At least one submission worked
        if (statusMsg) {
          statusMsg.style.display = 'block';
          statusMsg.textContent = '✅ Message sent successfully! We\'ll get back to you soon.';
          statusMsg.style.color = '#00aa6c';
        }
  
        // Clear form
        contactForm.reset();
  
        // ✅ Enhanced Conversions: push user data to dataLayer
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'contact_form_submit',
          ec_name: formData.fullName,
          ec_email: formData.email,
          ec_phone: formData.phone,
          ec_course: formData.course
        });
  
        // ✅ Bing UET conversion tracking
        try {
          if (window.uetq && Array.isArray(window.uetq.push)) {
            window.uetq.push('event', 'contact_form_submit', {
              event_category: 'contact',
              event_label: formData.course
            });
          }
        } catch (trackErr) {
          console.warn('Tracking error:', trackErr);
        }
  
        // Hide success message after 5 seconds
        setTimeout(() => {
          if (statusMsg) statusMsg.style.display = 'none';
        }, 5000);
  
      } else {
        // ❌ FAILURE - Both submissions failed
        if (statusMsg) {
          statusMsg.style.display = 'block';
          statusMsg.textContent = '❌ Failed to send message. Please call us at +91 997-501-6189 or try again.';
          statusMsg.style.color = '#ff4444';
        }
      }
  
      /* ========================================
         RE-ENABLE BUTTON
         ======================================== */
      if (submitBtn) {
        submitBtn.disabled = false;
        if (btnText) btnText.textContent = 'Send Message';
      }
    });
  });
  
  /* ==========================================================================
     Bing UET - Initialize on load
     ========================================================================== */
  function initBingUET() {
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
  
  // Initialize Bing UET
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBingUET);
  } else {
    initBingUET();
  }
