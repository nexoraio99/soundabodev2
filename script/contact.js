// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
    BACKEND_URL: 'https://soundabode-test.onrender.com/api/contact-form',
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
// CUSTOM CURSOR ANIMATION - Futuristic Effect
// ============================================================================
const cursor = document.querySelector('.cursor');
const cursorFollower = document.querySelector('.cursor-follower');

if (cursor && cursorFollower) {
    document.addEventListener('mousemove', (e) => {
        cursor.style.transform = `translate(${e.clientX - 10}px, ${e.clientY - 10}px)`;
        
        setTimeout(() => {
            cursorFollower.style.transform = `translate(${e.clientX - 20}px, ${e.clientY - 20}px)`;
        }, 100);
    });

    // Cursor hover effect on interactive elements
    document.querySelectorAll('button, input, textarea, select, a, .enquiry-btn').forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.style.transform += ' scale(1.5)';
            cursor.style.borderColor = '#0088ff';
        });
        
        el.addEventListener('mouseleave', () => {
            cursor.style.borderColor = '#00ff88';
        });
    });
}

// ============================================================================
// HAMBURGER MENU - Mobile Navigation
// ============================================================================
const hamburger = document.querySelector('.hamburger-menu');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-menu a');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('is-active');
        navMenu.classList.toggle('is-active');
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('is-active');
            navMenu.classList.remove('is-active');
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.navbar') && navMenu.classList.contains('is-active')) {
            hamburger.classList.remove('is-active');
            navMenu.classList.remove('is-active');
        }
    });
}

// ============================================================================
// ENQUIRY TYPE TOGGLE - General vs Courses
// ============================================================================
const generalBtn = document.getElementById('generalBtn');
const coursesBtn = document.getElementById('coursesBtn');
const coursesDropdown = document.getElementById('coursesDropdown');
const courseSelect = document.getElementById('course');

if (generalBtn && coursesBtn && coursesDropdown && courseSelect) {
    generalBtn.addEventListener('click', () => {
        generalBtn.classList.add('active');
        coursesBtn.classList.remove('active');
        coursesDropdown.style.display = 'none';
        courseSelect.disabled = true;
        courseSelect.removeAttribute('required');
        courseSelect.value = '';
    });

    coursesBtn.addEventListener('click', () => {
        coursesBtn.classList.add('active');
        generalBtn.classList.remove('active');
        coursesDropdown.style.display = 'block';
        courseSelect.disabled = false;
        courseSelect.setAttribute('required', 'required');
    });
}

// ============================================================================
// SUBMIT BUTTON PARTICLE EFFECT
// ============================================================================
const submitBtn = document.querySelector('.submit-btn');
if (submitBtn) {
    submitBtn.addEventListener('mousemove', (e) => {
        const rect = e.target.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        e.target.style.setProperty('--x', `${x}%`);
        e.target.style.setProperty('--y', `${y}%`);
    });
}

// ============================================================================
// FIELD VALIDATION HELPER
// ============================================================================
function validateField(field) {
    const value = field.value.trim();

    if (field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value && !emailRegex.test(value)) {
            field.style.borderColor = '#ff6b6b';
            return false;
        } else {
            field.style.borderColor = '#1a1a1a';
            return true;
        }
    } else if (field.type === 'tel' || field.id === 'phone') {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        const digitsOnly = value.replace(/\D/g, '');
        if (value && (!phoneRegex.test(value) || digitsOnly.length < 10)) {
            field.style.borderColor = '#ff6b6b';
            return false;
        } else {
            field.style.borderColor = '#1a1a1a';
            return true;
        }
    } else if (field.required && !value) {
        field.style.borderColor = '#ff6b6b';
        return false;
    } else {
        field.style.borderColor = '#1a1a1a';
        return true;
    }
}

// ============================================================================
// PHONE NUMBER FORMATTING
// ============================================================================
function setupPhoneFormatting() {
    const phoneInput = document.getElementById('phone');
    if (!phoneInput) return;

    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^\d\+]/g, '');
        
        if (value.startsWith('+')) {
            const digits = value.slice(1).replace(/\D/g, '');
            if (digits.length > 12) {
                e.target.value = '+' + digits.slice(0, 12);
            } else {
                e.target.value = '+' + digits;
            }
        } else {
            const digits = value.replace(/\D/g, '');
            if (digits.length > 10) {
                e.target.value = digits.slice(0, 10);
            } else {
                e.target.value = digits;
            }
        }
    });

    phoneInput.addEventListener('blur', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length === 10) {
            e.target.value = value.slice(0, 3) + ' ' + value.slice(3, 6) + ' ' + value.slice(6);
        } else if (value.length > 10) {
            e.target.value = '+' + value;
        }
        validateField(phoneInput);
    });
}

// ============================================================================
// UI UPDATE FUNCTIONS
// ============================================================================
function showStatus(message, isError = false) {
    const statusMsg = document.getElementById('form-status');
    if (!statusMsg) return;
    
    statusMsg.textContent = message;
    statusMsg.style.color = isError ? CONFIG.COLORS.ERROR : CONFIG.COLORS.SUCCESS;
    statusMsg.style.display = 'block';
}

function showSuccessMessage() {
    const successMessage = document.getElementById('successMessage');
    if (successMessage) {
        successMessage.style.display = 'block';
        successMessage.classList.add('show');
        
        setTimeout(() => {
            successMessage.classList.remove('show');
            setTimeout(() => {
                successMessage.style.display = 'none';
            }, 300);
        }, 3000);
    }
}

// ============================================================================
// FORM SUBMISSION HANDLER - WITH BACKEND INTEGRATION
// ============================================================================
function setupFormSubmission() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    let isSubmitting = false;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Prevent multiple submissions
        if (isSubmitting) return;

        // Get form elements
        const name = document.getElementById('name');
        const email = document.getElementById('email');
        const phone = document.getElementById('phone');
        const message = document.getElementById('message');
        const course = document.getElementById('course');

        // Validate all required fields
        let isValid = true;
        if (name) isValid = validateField(name) && isValid;
        if (email) isValid = validateField(email) && isValid;
        if (phone) isValid = validateField(phone) && isValid;
        if (course && !course.disabled) isValid = validateField(course) && isValid;

        if (!isValid) {
            showStatus(CONFIG.MESSAGES.VALIDATION_ERROR, true);
            return;
        }

        // Set submitting state
        isSubmitting = true;
        const submitButton = form.querySelector('button[type="submit"]');
        const btnText = submitButton.querySelector('.btn-text');
        const originalText = btnText ? btnText.textContent : submitButton.textContent;
        
        if (btnText) {
            btnText.textContent = CONFIG.MESSAGES.SENDING;
        } else {
            submitButton.textContent = CONFIG.MESSAGES.SENDING;
        }
        submitButton.disabled = true;

        // Prepare form data - MUST MATCH BACKEND EXPECTED FIELDS
        const enquiryType = coursesBtn && coursesBtn.classList.contains('active') ? 'courses' : 'general';
        
        const formData = {
            fullName: name.value.trim(),  // Backend expects 'fullName' not 'name'
            email: email.value.trim(),
            phone: phone.value.trim(),
            course: enquiryType === 'courses' ? course.value : '',  // Backend expects empty string not null
            message: message ? message.value.trim() : ''
        };

        console.log('📤 Submitting contact form:', formData);
        console.log('🌐 Backend URL:', CONFIG.BACKEND_URL);

        try {
            // Send to backend
            const response = await fetch(CONFIG.BACKEND_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            console.log('📡 Response status:', response.status);
            console.log('📡 Response ok:', response.ok);

            const result = await response.json();
            console.log('📥 Server response:', result);

            if (response.ok && result.success) {
                // Success
                showStatus(CONFIG.MESSAGES.SUCCESS, false);
                showSuccessMessage();
                
                // Reset form
                form.reset();
                if (generalBtn) generalBtn.click();
                
                // Hide status after 5 seconds
                setTimeout(() => {
                    const statusMsg = document.getElementById('form-status');
                    if (statusMsg) statusMsg.style.display = 'none';
                }, 5000);
                
            } else {
                throw new Error(result.message || 'Submission failed');
            }

        } catch (error) {
            console.error('❌ Form submission error:', error);
            showStatus(CONFIG.MESSAGES.ERROR, true);
        } finally {
            // Reset button state
            isSubmitting = false;
            if (btnText) {
                btnText.textContent = originalText;
            } else {
                submitButton.textContent = originalText;
            }
            submitButton.disabled = false;
        }
    });
}

// ============================================================================
// INPUT FIELD ANIMATIONS AND VALIDATION
// ============================================================================
function setupInputAnimations() {
    const inputs = document.querySelectorAll('.input-group input, .input-group textarea, .input-group select');
    
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'translateX(5px)';
            this.style.boxShadow = '0 0 0 3px rgba(0, 194, 255, 0.1)';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'translateX(0)';
            this.style.boxShadow = 'none';
            validateField(this);
        });
    });
}

// ============================================================================
// SMOOTH SCROLL FOR ANCHOR LINKS
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
// INTERSECTION OBSERVER FOR ANIMATIONS
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

    const contactSection = document.querySelector('.contact-section');
    const mapSection = document.querySelector('.map');
    const formSection = document.querySelector('.form-section');

    if (contactSection) observer.observe(contactSection);
    if (mapSection) observer.observe(mapSection);
    if (formSection) observer.observe(formSection);
}

// ============================================================================
// KEYBOARD ACCESSIBILITY
// ============================================================================
function setupKeyboardNavigation() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const formElements = form.querySelectorAll('input:not([type="hidden"]), textarea, select, button');

    formElements.forEach((element, index) => {
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && e.shiftKey && index === 0) {
                e.preventDefault();
                formElements[formElements.length - 1].focus();
            } else if (e.key === 'Tab' && !e.shiftKey && index === formElements.length - 1) {
                e.preventDefault();
                formElements[0].focus();
            }
        });
    });
}

// ============================================================================
// NAVBAR PAGE LOAD ANIMATION
// ============================================================================
function setupNavbarAnimation() {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        navbar.style.animation = 'fadeIn 0.8s ease-out';
    }
}

// ============================================================================
// ADD FADE-IN ANIMATION KEYFRAMES
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
            opacity: 1;
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
    
    // Add animations
    addAnimationStyles();
    
    // Setup all features
    setupPhoneFormatting();
    setupFormSubmission();
    setupInputAnimations();
    setupSmoothScroll();
    setupScrollAnimations();
    setupKeyboardNavigation();
    
    console.log('✅ All features initialized successfully');
});

// ============================================================================
// INITIALIZE ON WINDOW LOAD
// ============================================================================
window.addEventListener('load', () => {
    setupNavbarAnimation();
});
