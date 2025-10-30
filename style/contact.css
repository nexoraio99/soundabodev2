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
    // Toggle menu on hamburger click
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('is-active');
        navMenu.classList.toggle('is-active');
    });

    // Close menu when a link is clicked
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('is-active');
            navMenu.classList.remove('is-active');
        });
    });

    // Close menu when clicking outside
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
        
        // Allow international format starting with +
        if (value.startsWith('+')) {
            const digits = value.slice(1).replace(/\D/g, '');
            if (digits.length > 12) {
                e.target.value = '+' + digits.slice(0, 12);
            } else {
                e.target.value = '+' + digits;
            }
        } else {
            // Indian format: XXX XXX XXXX
            const digits = value.replace(/\D/g, '');
            if (digits.length > 10) {
                e.target.value = digits.slice(0, 10);
            } else {
                e.target.value = digits;
            }
        }
    });

    // Format on blur
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
// SUCCESS MESSAGE DISPLAY
// ============================================================================
function showSuccessMessage() {
    const successMessage = document.getElementById('successMessage');
    if (successMessage) {
        successMessage.classList.add('show');
        
        setTimeout(() => {
            successMessage.classList.remove('show');
        }, 3000);
    }
}

// ============================================================================
// FORM SUBMISSION WITH reCAPTCHA v3
// ============================================================================
function setupFormSubmission() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    let isSubmitting = false;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Prevent multiple submissions
        if (isSubmitting) return;

        // Get form data
        const name = document.getElementById('name');
        const email = document.getElementById('email');
        const phone = document.getElementById('phone');
        const message = document.getElementById('message');
        const course = document.getElementById('course');

        // Validate all fields
        let isValid = true;
        if (name) isValid = validateField(name) && isValid;
        if (email) isValid = validateField(email) && isValid;
        if (phone) isValid = validateField(phone) && isValid;
        if (course && !course.disabled) isValid = validateField(course) && isValid;

        if (!isValid) {
            alert('Please fill in all required fields correctly.');
            return;
        }

        // Set submitting state
        isSubmitting = true;
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.querySelector('.btn-text').textContent;
        submitButton.querySelector('.btn-text').textContent = 'Submitting...';
        submitButton.disabled = true;

        // Execute reCAPTCHA v3
        if (typeof grecaptcha !== 'undefined') {
            grecaptcha.ready(() => {
                grecaptcha.execute('YOUR_SITE_KEY', { action: 'contact_form' }).then((token) => {
                    // Set the token in hidden input
                    const tokenInput = document.getElementById('recaptcha-token');
                    if (tokenInput) tokenInput.value = token;

                    // Prepare form data
                    const formData = {
                        name: name.value,
                        phone: phone.value,
                        email: email.value,
                        message: message ? message.value : '',
                        enquiryType: generalBtn && generalBtn.classList.contains('active') ? 'general' : 'courses',
                        course: coursesBtn && coursesBtn.classList.contains('active') ? course.value : null,
                        recaptchaToken: token
                    };

                    console.log('Form Data:', formData);

                    // HERE: Send data to your backend
                    // Example with fetch:
                    /*
                    fetch('your-backend-endpoint.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(formData)
                    })
                    .then(response => response.json())
                    .then(data => {
                        if(data.success) {
                            showSuccessMessage();
                            form.reset();
                            if (generalBtn) generalBtn.click();
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('There was an error submitting the form. Please try again.');
                    })
                    .finally(() => {
                        isSubmitting = false;
                        submitButton.querySelector('.btn-text').textContent = originalText;
                        submitButton.disabled = false;
                    });
                    */

                    // For demo purposes, show success message
                    setTimeout(() => {
                        showSuccessMessage();
                        form.reset();
                        if (generalBtn) generalBtn.click();
                        
                        isSubmitting = false;
                        submitButton.querySelector('.btn-text').textContent = originalText;
                        submitButton.disabled = false;
                    }, 1500);
                });
            });
        } else {
            // If reCAPTCHA not loaded, submit anyway
            console.warn('reCAPTCHA not loaded');
            setTimeout(() => {
                showSuccessMessage();
                form.reset();
                if (generalBtn) generalBtn.click();
                
                isSubmitting = false;
                submitButton.querySelector('.btn-text').textContent = originalText;
                submitButton.disabled = false;
            }, 1500);
        }
    });
}

// ============================================================================
// INPUT FIELD ANIMATIONS AND VALIDATION
// ============================================================================
function setupInputAnimations() {
    const inputs = document.querySelectorAll('.input-group input, .input-group textarea, .input-group select');
    
    inputs.forEach(input => {
        // Focus animations
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'translateX(5px)';
            this.style.boxShadow = '0 0 0 3px rgba(0, 194, 255, 0.1)';
        });
        
        // Blur animations and validation
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
            // Shift + Tab to go to previous field
            if (e.key === 'Tab' && e.shiftKey && index === 0) {
                e.preventDefault();
                formElements[formElements.length - 1].focus();
            }
            // Tab to go to next field
            else if (e.key === 'Tab' && !e.shiftKey && index === formElements.length - 1) {
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
    `;
    document.head.appendChild(style);
}

// ============================================================================
// INITIALIZE ALL FUNCTIONS ON DOM READY
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
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
