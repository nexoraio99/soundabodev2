/* ===========================
   Soundabode Contact Page JS
   - Navbar mobile toggle & active link
   - Scroll shadow
   - Contact form submission (no reCAPTCHA)
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

  // prefer attribute; fallback to prod endpoint
  const BACKEND_URL =
    contactForm.getAttribute('data-backend') ||
    'https://soundabodev2-server.onrender.com/api/contact-form';

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const btnText = submitBtn?.querySelector('.btn-text');

    const formData = {
      fullName: contactForm.querySelector('#fullName')?.value.trim() || '',
      email: contactForm.querySelector('#email')?.value.trim() || '',
      phone: contactForm.querySelector('#phone')?.value.trim() || '',
      course: contactForm.querySelector('#course')?.value || '',
      message: contactForm.querySelector('#message')?.value.trim() || '' // optional
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

    // Disable button & show "Sending..."
    if (submitBtn) {
      submitBtn.disabled = true;
      if (btnText) btnText.textContent = 'Sending...';
    }

    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify(formData)
      });

      const result = await res.json().catch(() => ({}));

      if (res.ok && result && result.success) {
        if (statusMsg) {
          statusMsg.style.display = 'block';
          statusMsg.textContent = '✅ Message sent successfully! We\'ll get back to you soon.';
          statusMsg.style.color = '#00aa6c';
        }
        contactForm.reset();
      } else {
        throw new Error(result?.message || 'Submission failed');
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
