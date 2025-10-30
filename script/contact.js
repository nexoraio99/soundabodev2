// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
    BACKEND_URL: 'https://soundabode-test.onrender.com/api/contact-form',
    RECAPTCHA_SITE_KEY: 'YOUR_SITE_KEY', // Replace with your actual site key
    MESSAGES: {
        SENDING: 'Sending...',
        SUCCESS: '✅ Message sent successfully! We\'ll get back to you soon.',
        ERROR: '❌ Failed to send message. Please try again.',
        VALIDATION_ERROR: '❌ Please fill all required fields correctly',
        RECAPTCHA_ERROR: '❌ Please complete the reCAPTCHA verification',
        DEFAULT_BUTTON: 'Send Message'
    },
    COLORS: {
        SUCCESS: '#00ff88',
        ERROR: '#ff4444',
        DEFAULT: '#1a1a1a'
    }
};

// ============================================================================
// DOM ELEMENTS CACHE
// ============================================================================
const elements = {
    // Form elements
    contactForm: null,
    submitBtn: null,
    statusMsg: null,
    
    // Input fields
    nameInput: null,
    emailInput: null,
    phoneInput: null,
    messageInput: null,
    courseSelect: null,
    
    // Enquiry type buttons
    generalBtn: null,
    coursesBtn: null,
    coursesDropdown: null,
    
    // Other elements
    successMessage: null,
    hamburger: null,
    navMenu: null,
    cursor: null,
    cursorFollower: null
};

// ============================================================================
// INITIALIZE DOM ELEMENTS
// ============================================================================
function initializeElements() {
    // Form elements
    elements.contactForm = document.getElementById('contactForm');
    elements.submitBtn = elements.contactForm?.querySelector('button[type="submit"]');
    elements.statusMsg = document.getElementById('form-status');
    
    // Input fields
    elements.nameInput = document.getElementById('name');
    elements.emailInput = document.getElementById('email');
    elements.phoneInput = document.getElementById('phone');
    elements.messageInput = document.getElementById('message');
    elements.courseSelect = document.getElementById('course');
    
    // Enquiry type buttons
    elements.generalBtn = document.getElementById('generalBtn');
    elements.coursesBtn = document.getElementById('coursesBtn');
    elements.coursesDropdown = document.getElementById('coursesDropdown');
    
    // Other elements
    elements.successMessage = document.getElementById('successMessage');
    elements.hamburger = document.querySelector('.hamburger-menu');
    elements.navMenu = document.querySelector('.nav-menu');
    elements.cursor = document.querySelector('.cursor');
    elements.cursorFollower = document.querySelector('.cursor-follower');
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    const digitsOnly = phone.replace(/\D/g, '');
    return phoneRegex.test(phone) && digitsOnly.length >= 10;
}

function validateField(field) {
    if (!field) return false;
    
    const value = field.value.trim();
    let isValid = true;

    if (field.type === 'email') {
        isValid = value && validateEmail(value);
    } else if (field.type === 'tel' || field.id === 'phone') {
        isValid = value && validatePhone(value);
    } else if (field.required && !value) {
        isValid = false;
    }

    // Visual feedback
    field.style.borderColor = isValid ? CONFIG.COLORS.DEFAULT : CONFIG.COLORS.ERROR;
    
    return isValid;
}

function validateAllFields() {
    let isValid = true;
    
    if (elements.nameInput) isValid = validateField(elements.nameInput) && isValid;
    if (elements.emailInput) isValid = validateField(elements.emailInput) && isValid;
    if (elements.phoneInput) isValid = validateField(elements.phoneInput) && isValid;
    
    // Validate course only if courses enquiry is active
    if (elements.coursesBtn?.classList.contains('active') && elements.courseSelect) {
        isValid = validateField(elements.courseSelect) && isValid;
    }
    
    return isValid;
}

// ============================================================================
// UI UPDATE FUNCTIONS
// ============================================================================
function showStatus(message, isError = false) {
    if (!elements.statusMsg) {
        // Create status message element if it doesn't exist
        elements.statusMsg = document.createElement('div');
        elements.statusMsg.id = 'form-status';
        elements.statusMsg.style.cssText = 'margin-top: 15px; text-align: center; font-size: 0.9rem; font-weight: 500;';
        elements.contactForm?.appendChild(elements.statusMsg);
    }
    
    elements.statusMsg.textContent = message;
    elements.statusMsg.style.color = isError ? CONFIG.COLORS.ERROR : CONFIG.COLORS.SUCCESS;
    elements.statusMsg.style.display = 'block';
}

function setButtonState(isDisabled, text) {
    if (!elements.submitBtn) return;
    
    const btnText = elements.submitBtn.querySelector('.btn-text');
    if (btnText) {
        btnText.textContent = text;
    } else {
        elements.submitBtn.textContent = text;
    }
    
    elements.submitBtn.disabled = isDisabled;
}

function showSuccessMessage() {
    if (elements.successMessage) {
        elements.successMessage.classList.add('show');
        
        setTimeout(() => {
            elements.successMessage.classList.remove('show');
        }, 3000);
    }
}

function resetForm() {
    if (elements.contactForm) {
        elements.contactForm.reset();
    }
    
    // Reset to general enquiry
    if (elements.generalBtn) {
        elements.generalBtn.click();
    }
    
    // Reset reCAPTCHA if loaded
    if (typeof grecaptcha !== 'undefined') {
        try {
            grecaptcha.reset();
        } catch (e) {
            console.log('reCAPTCHA reset not needed');
        }
    }
    
    // Hide status message after delay
    setTimeout(() => {
        if (elements.statusMsg) {
            elements.statusMsg.style.display = 'none';
        }
    }, 5000);
}

// ============================================================================
// PHONE NUMBER FORMATTING
// ============================================================================
function setupPhoneFormatting() {
    if (!elements.phoneInput) return;

    elements.phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^\d\+]/g, '');
        
        // Allow international format starting with +
        if (value.startsWith('+')) {
            const digits = value.slice(1).replace(/\D/g, '');
            if (digits.length > 12) {
                e.target.value = '+' + digits.slice(0, 12);
            } else {
                e.target.value = '+' + digits;
            }
        } else {
            // Indian format: limit to 10 digits
            const digits = value.replace(/\D/g, '');
            e.target.value = digits.slice(0, 10);
        }
    });

    // Format on blur
    elements.phoneInput.addEventListener('blur', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length === 10) {
            e.target.value = value.slice(0, 3) + ' ' + value.slice(3, 6) + ' ' + value.slice(6);
        }
        validateField(elements.phoneInput);
    });
}

// ============================================================================
// ENQUIRY TYPE TOGGLE
// ============================================================================
function setupEnquiryToggle() {
    if (!elements.generalBtn || !elements.coursesBtn) return;

    elements.generalBtn.addEventListener('click', () => {
        elements.generalBtn.classList.add('active');
        elements.coursesBtn.classList.remove('active');
        
        if (elements.coursesDropdown) {
            elements.coursesDropdown.style.display = 'none';
        }
        
        if (elements.courseSelect) {
            elements.courseSelect.disabled = true;
            elements.courseSelect.removeAttribute('required');
            elements.courseSelect.value = '';
        }
    });

    elements.coursesBtn.addEventListener('click', () => {
        elements.coursesBtn.classList.add('active');
        elements.generalBtn.classList.remove('active');
        
        if (elements.coursesDropdown) {
            elements.coursesDropdown.style.display = 'block';
        }
        
        if (elements.courseSelect) {
            elements.courseSelect.disabled = false;
            elements.courseSelect.setAttribute('required', 'required');
        }
    });
}

// ============================================================================
// API COMMUNICATION
// ============================================================================
async function submitFormData(formData) {
    const response = await fetch(CONFIG.BACKEND_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    });

    const result = await response.json();
    console.log('📥 Server response:', result);

    if (!response.ok || !result.success) {
        throw new Error(result.message || 'Submission failed');
    }

    return result;
}

// ============================================================================
// FORM SUBMISSION HANDLER
// ============================================================================
let isSubmitting = false;

async function handleFormSubmit(e) {
    e.preventDefault();

    // Prevent multiple submissions
    if (isSubmitting) return;

    // Validate all fields
    if (!validateAllFields()) {
        showStatus(CONFIG.MESSAGES.VALIDATION_ERROR, true);
        return;
    }

    // Get form data
    const enquiryType = elements.coursesBtn?.classList.contains('active') ? 'courses' : 'general';
    
    const formData = {
        name: elements.nameInput?.value.trim() || '',
        email: elements.emailInput?.value.trim() || '',
        phone: elements.phoneInput?.value.trim() || '',
        message: elements.messageInput?.value.trim() || '',
        enquiryType: enquiryType,
        course: enquiryType === 'courses' ? elements.courseSelect?.value || null : null
    };

    console.log('📤 Submitting contact form:', formData);

    // Check reCAPTCHA if available
    if (typeof grecaptcha !== 'undefined') {
        try {
            const recaptchaResponse = grecaptcha.getResponse();
            if (!recaptchaResponse) {
                showStatus(CONFIG.MESSAGES.RECAPTCHA_ERROR, true);
                return;
            }
            formData.recaptcha = recaptchaResponse;
        } catch (e) {
            console.warn('reCAPTCHA not properly loaded:', e);
        }
    }

    // Set submitting state
    isSubmitting = true;
    setButtonState(true, CONFIG.MESSAGES.SENDING);

    try {
        // Submit form
        await submitFormData(formData);
        
        // Success
        showStatus(CONFIG.MESSAGES.SUCCESS, false);
        showSuccessMessage();
        resetForm();
        
    } catch (error) {
        // Error handling
        console.error('❌ Form submission error:', error);
        showStatus(CONFIG.MESSAGES.ERROR, true);
        
    } finally {
        // Reset button state
        isSubmitting = false;
        setButtonState(false, CONFIG.MESSAGES.DEFAULT_BUTTON);
    }
}

// ============================================================================
// INPUT ANIMATIONS & VALIDATION
// ============================================================================
function setupInputAnimations() {
    const inputs = document.querySelectorAll('.input-group input, .input-group textarea, .input-group select');
    
    inputs.forEach(input => {
        // Focus animations
        input.addEventListener('focus', function() {
            if (this.parentElement) {
                this.parentElement.style.transform = 'translateX(5px)';
            }
            this.style.boxShadow = '0 0 0 3px rgba(0, 194, 255, 0.1)';
        });
        
        // Blur animations and validation
        input.addEventListener('blur', function() {
            if (this.parentElement) {
                this.parentElement.style.transform = 'translateX(0)';
            }
            this.style.boxShadow = 'none';
            validateField(this);
        });
    });
}

// ============================================================================
// HAMBURGER MENU
// ============================================================================
function setupHamburgerMenu() {
    if (!elements.hamburger || !elements.navMenu) return;

    // Toggle menu on hamburger click
    elements.hamburger.addEventListener('click', () => {
        elements.hamburger.classList.toggle('is-active');
        elements.navMenu.classList.toggle('is-active');
    });

    // Close menu when a link is clicked
    const navLinks = elements.navMenu.querySelectorAll('a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            elements.hamburger.classList.remove('is-active');
            elements.navMenu.classList.remove('is-active');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.navbar') && elements.navMenu.classList.contains('is-active')) {
            elements.hamburger.classList.remove('is-active');
            elements.navMenu.classList.remove('is-active');
        }
    });
}

// ============================================================================
// CUSTOM CURSOR
// ============================================================================
function setupCustomCursor() {
    if (!elements.cursor || !elements.cursorFollower) return;

    document.addEventListener('mousemove', (e) => {
        elements.cursor.style.transform = `translate(${e.clientX - 10}px, ${e.clientY - 10}px)`;
        
        setTimeout(() => {
            elements.cursorFollower.style.transform = `translate(${e.clientX - 20}px, ${e.clientY - 20}px)`;
        }, 100);
    });

    // Cursor hover effect on interactive elements
    document.querySelectorAll('button, input, textarea, select, a, .enquiry-btn').forEach(el => {
        el.addEventListener('mouseenter', () => {
            elements.cursor.style.transform += ' scale(1.5)';
            elements.cursor.style.borderColor = '#0088ff';
        });
        
        el.addEventListener('mouseleave', () => {
            elements.cursor.style.borderColor = '#00ff88';
        });
    });
}

// ============================================================================
// SUBMIT BUTTON PARTICLE EFFECT
// ============================================================================
function setupSubmitButtonEffect() {
    if (!elements.submitBtn) return;
    
    elements.submitBtn.addEventListener('mousemove', (e) => {
        const rect = e.target.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        e.target.style.setProperty('--x', `${x}%`);
        e.target.style.setProperty('--y', `${y}%`);
    });
}

// ============================================================================
// SMOOTH SCROLL
// ============================================================================
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
}

// ============================================================================
// SCROLL ANIMATIONS
// ============================================================================
function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeIn 0.6s ease-out forwards';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const sections = ['.contact-section', '.map', '.form-section'];
    sections.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) observer.observe(element);
    });
}

// ============================================================================
// ADD ANIMATION STYLES
// ============================================================================
function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .success-message.show {
            display: block !important;
            animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
}

// ============================================================================
// INITIALIZE ALL FUNCTIONS ON DOM READY
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Contact Form...');
    
    // Initialize DOM elements
    initializeElements();
    
    // Add animations
    addAnimationStyles();
    
    // Setup all features
    if (elements.contactForm) {
        elements.contactForm.addEventListener('submit', handleFormSubmit);
    }
    
    setupPhoneFormatting();
    setupEnquiryToggle();
    setupInputAnimations();
    setupHamburgerMenu();
    setupCustomCursor();
    setupSubmitButtonEffect();
    setupSmoothScroll();
    setupScrollAnimations();
    
    console.log('✅ Contact Form initialized successfully');
});
