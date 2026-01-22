/* ===========================
   Soundabode Contact Page JS
   - Navbar mobile toggle & active link
   - Scroll shadow
   - Contact form submission to Google Sheets
   - Enhanced Conversions dataLayer push (on successful submit)
   =========================== */

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
  const onScroll = () => {
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
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (href.includes('contact')) a.classList.add('is-active');
  });
});

/* ---------- CONTACT FORM ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.getElementById('contactForm');
  if (!contactForm) return;

  const statusMsg = document.getElementById('form-status');

  // Google Apps Script Web App URL
  // You can set this via data-script-url attribute or fallback to default
  const GOOGLE_SCRIPT_URL =
    contactForm.getAttribute('data-script-url') ||
    'https://script.google.com/macros/s/AKfycbwJyBy1qVa2jlQ0aa3FhtkxcJJpBcgvJHIuxp2ms5l--4GMd6zLZywUWC1qQIu1uGEG0A/exec';

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const btnText = submitBtn?.querySelector('.btn-text');

    const formData = {
      fullName: contactForm.querySelector('#fullName')?.value.trim() || '',
      email: contactForm.querySelector('#email')?.value.trim() || '',
      phone: contactForm.querySelector('#phone')?.value.trim() || '',
      course: contactForm.querySelector('#course')?.value || '',
      message: contactForm.querySelector('#message')?.value.trim() || '',
      source: 'Contact Page'
    };

    // Basic validation (message optional)
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

    // Disable button & show "Sending..."
    if (submitBtn) {
      submitBtn.disabled = true;
      if (btnText) btnText.textContent = 'Sending...';
    }

    try {
      // Create FormData for Google Apps Script
      const scriptFormData = new FormData();
      scriptFormData.append('fullName', formData.fullName);
      scriptFormData.append('email', formData.email);
      scriptFormData.append('phone', formData.phone);
      scriptFormData.append('course', formData.course);
      scriptFormData.append('message', formData.message);
      scriptFormData.append('source', formData.source);

      // Submit to Google Sheets
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: scriptFormData
      });

      // Check if submission was successful
      // Note: Google Apps Script returns text response
      const result = await res.text();
      
      // Parse JSON response if possible
      let jsonResult;
      try {
        jsonResult = JSON.parse(result);
      } catch (e) {
        // If not JSON, assume success if no error
        jsonResult = { success: true };
      }

      if (jsonResult.success !== false) {
        // ✅ Show success message
        if (statusMsg) {
          statusMsg.style.display = 'block';
          statusMsg.textContent = '✅ Message sent successfully! We\'ll get back to you soon.';
          statusMsg.style.color = '#00aa6c';
        }

        // ✅ Clear form
        contactForm.reset();

        // ✅ Enhanced Conversions: push user data to dataLayer
        // This fires ONLY on successful submission
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'contact_form_submit',
          ec_name: formData.fullName,
          ec_email: formData.email,
          ec_phone: formData.phone,
          ec_course: formData.course
        });

        // Hide success message after 5 seconds
        setTimeout(() => {
          if (statusMsg) statusMsg.style.display = 'none';
        }, 5000);
      } else {
        throw new Error(jsonResult?.message || 'Submission failed');
      }
    } catch (err) {
      console.error('❌ Contact submit error:', err);
      if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.textContent = '❌ Failed to send message. Please try again.';
        statusMsg.style.color = '#ff4444';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        if (btnText) btnText.textContent = 'Send Message';
      }
    }
  });
});

/* ==========================================================================
   Bing UET (unchanged, lazy-load safe)
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
