// contact.js - Simplified version (single contact form)
// This version removes the popup/general enquiry toggle and just sends to contact-form endpoint

// ============================================================================
/* CONFIGURATION */
// ============================================================================
const CONFIG = {
  BACKEND_URL: 'https://soundabodev2-server.onrender.com/api/contact-form',
  MESSAGES: {
    SENDING: 'Sending...',
    SUCCESS: "✅ Message sent successfully! We'll get back to you soon.",
    ERROR: '❌ Failed to send message. Please try again.',
    VALIDATION_ERROR: '❌ Please fill all required fields correctly',
    DEFAULT_BUTTON: 'Send Message'
  },
  COLORS: {
    SUCCESS: '#00ff88',
    ERROR: '#ff4444',
    DEFAULT: '#1a1a1a'
  },
  FETCH_TIMEOUT: 15000
};

// ============================================================================
/* Utility helpers */
// ============================================================================
function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function timeoutFetch(resource, options = {}, timeout = CONFIG.FETCH_TIMEOUT) {
  return Promise.race([
    fetch(resource, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeout))
  ]);
}

// ============================================================================
/* UI helpers */
// ============================================================================
function showStatus(message, isError = false) {
  const statusMsg = document.getElementById('form-status');
  if (!statusMsg) return;
  statusMsg.textContent = message;
  statusMsg.style.color = isError ? CONFIG.COLORS.ERROR : CONFIG.COLORS.SUCCESS;
  statusMsg.style.display = 'block';
}

function hideStatus() {
  const statusMsg = document.getElementById('form-status');
  if (!statusMsg) return;
  statusMsg.style.display = 'none';
}

function disableButton(btn, text = CONFIG.MESSAGES.SENDING) {
  if (!btn) return null;
  const btnText = btn.querySelector('.btn-text');
  const original = btnText ? btnText.textContent : btn.textContent;
  if (btnText) btnText.textContent = text; else btn.textContent = text;
  btn.disabled = true;
  return original;
}

function restoreButton(btn, originalText) {
  if (!btn) return;
  const btnText = btn.querySelector('.btn-text');
  if (btnText) btnText.textContent = originalText; else btn.textContent = originalText;
  btn.disabled = false;
}

function showSuccessMessage() {
  const successMessage = document.getElementById('successMessage');
  if (!successMessage) return;
  successMessage.style.display = 'block';
  successMessage.classList.add('show');
  setTimeout(() => {
    successMessage.classList.remove('show');
    setTimeout(() => { successMessage.style.display = 'none'; }, 300);
  }, 3000);
}

function hideStatusAfterDelay() {
  setTimeout(() => {
    const status = document.getElementById('form-status');
    if (status) status.style.display = 'none';
  }, 5000);
}

// ============================================================================
/* Validation helpers */
// ============================================================================
function isValidEmail(value) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function isValidPhone(value) {
  if (!value) return false;
  const digits = String(value).replace(/\D/g, '');
  return digits.length >= 10;
}

function validateField(field) {
  if (!field) return true;
  const value = (field.value || '').trim();

  if (field.type === 'email') {
    const ok = isValidEmail(value);
    field.style.borderColor = ok ? '#1a1a1a' : '#ff6b6b';
    return ok;
  }

  if (field.type === 'tel' || field.id === 'phone') {
    const ok = isValidPhone(value);
    field.style.borderColor = ok ? '#1a1a1a' : '#ff6b6b';
    return ok;
  }

  if (field.required && !value) {
    field.style.borderColor = '#ff6b6b';
    return false;
  }

  field.style.borderColor = '#1a1a1a';
  return true;
}

// ============================================================================
/* Phone formatting */
// ============================================================================
function setupPhoneFormatting() {
  const phoneInput = document.getElementById('phone');
  if (!phoneInput) return;

  phoneInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/[^\d\+]/g, '');
    if (value.startsWith('+')) {
      const digits = value.slice(1).replace(/\D/g, '');
      e.target.value = '+' + digits.slice(0, 12);
    } else {
      const digits = value.replace(/\D/g, '');
      e.target.value = digits.slice(0, 10);
    }
  });

  phoneInput.addEventListener('blur', (e) => {
    const cleaned = e.target.value.replace(/\D/g, '');
    if (cleaned.length === 10) {
      e.target.value = cleaned.slice(0,3) + ' ' + cleaned.slice(3,6) + ' ' + cleaned.slice(6);
    }
    validateField(phoneInput);
  });
}

// ============================================================================
/* Main: form submission handler - SIMPLIFIED for single contact form */
// ============================================================================
function setupFormSubmission() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  // Get backend URL from data attribute or use default
  const backendUrl = form.dataset.backend || CONFIG.BACKEND_URL;
  
  let isSubmitting = false;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Get form elements
    const fullNameEl = document.getElementById('fullName');
    const emailEl = document.getElementById('email');
    const phoneEl = document.getElementById('phone');
    const courseEl = document.getElementById('course');
    const messageEl = document.getElementById('message');
    const submitButton = form.querySelector('button[type="submit"]') || document.querySelector('.submit-btn');

    // Validate all required fields
    let ok = true;
    if (fullNameEl) ok = validateField(fullNameEl) && ok;
    if (emailEl) ok = validateField(emailEl) && ok;
    if (phoneEl) ok = validateField(phoneEl) && ok;
    if (courseEl) ok = validateField(courseEl) && ok;

    if (!ok) {
      showStatus(CONFIG.MESSAGES.VALIDATION_ERROR, true);
      return;
    }

    // Prepare payload - use keys that match server expectations
    const payload = {
      fullName: (fullNameEl && fullNameEl.value.trim()) || '',
      email: (emailEl && emailEl.value.trim()) || '',
      phone: (phoneEl && phoneEl.value.trim()) || '',
      course: (courseEl && courseEl.value) || '',
      message: (messageEl && messageEl.value.trim()) || '',
      source: 'contact-page'
    };

    // UI: disable button
    const originalBtnText = disableButton(submitButton, CONFIG.MESSAGES.SENDING);
    showStatus(CONFIG.MESSAGES.SENDING, false);

    console.log('📤 Submitting contact form to:', backendUrl);
    console.log('📤 Payload:', payload);

    isSubmitting = true;

    try {
      const resp = await timeoutFetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, CONFIG.FETCH_TIMEOUT);

      let result = null;
      try { 
        result = await resp.json(); 
      } catch (err) { 
        result = { success: false, raw: await resp.text().catch(()=>'<no-text>') }; 
      }

      console.log('📡 Response status:', resp.status, 'ok:', resp.ok);
      console.log('📥 Server response:', result);

      if (resp.ok && result && result.success) {
        showStatus(CONFIG.MESSAGES.SUCCESS, false);
        showSuccessMessage();
        form.reset();
        hideStatusAfterDelay();
      } else {
        const msg = (result && (result.message || result.error)) || `Unexpected server response (${resp.status})`;
        showStatus(msg, true);
        console.error('Server rejected submission:', msg);
      }
    } catch (err) {
      console.error('❌ Form submission error:', err);
      showStatus(CONFIG.MESSAGES.ERROR, true);
    } finally {
      isSubmitting = false;
      restoreButton(submitButton, originalBtnText || CONFIG.MESSAGES.DEFAULT_BUTTON);
    }
  });
}

// ============================================================================
/* UI Enhancement Functions */
// ============================================================================
function setupCursorEffects() {
  const cursor = document.querySelector('.cursor');
  const cursorFollower = document.querySelector('.cursor-follower');
  if (!cursor || !cursorFollower) return;
  
  document.addEventListener('mousemove', (e) => {
    cursor.style.transform = `translate(${e.clientX - 10}px, ${e.clientY - 10}px)`;
    setTimeout(() => {
      cursorFollower.style.transform = `translate(${e.clientX - 20}px, ${e.clientY - 20}px)`;
    }, 100);
  });
}

function setupHamburger() {
  const hamburger = document.querySelector('.hamburger-menu');
  const navMenu = document.querySelector('.nav-menu');
  if (!hamburger || !navMenu) return;
  
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('is-active');
    navMenu.classList.toggle('is-active');
  });
  
  document.querySelectorAll('.nav-menu a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('is-active');
      navMenu.classList.remove('is-active');
    });
  });
}

function addAnimationStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn { 
      from { opacity:0; transform: translateY(20px);} 
      to { opacity:1; transform: translateY(0);} 
    }
    .success-message.show { 
      opacity:1; 
      animation: slideIn .3s ease-out; 
    }
    @keyframes slideIn { 
      from { opacity:0; transform: translateY(-20px);} 
      to { opacity:1; transform: translateY(0);} 
    }
  `;
  document.head.appendChild(style);
}

// ============================================================================
/* Initialize on DOM ready */
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing Simplified Contact Form...');
  addAnimationStyles();
  setupPhoneFormatting();
  setupFormSubmission();
  setupCursorEffects();
  setupHamburger();
  console.log('✅ Contact form script initialized');
});
