// ============================================================================
// HAMBURGER MENU - Mobile Navigation
// ============================================================================
const hamburger = document.querySelector('.hamburger-menu');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-menu a');

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

// ============================================================================
// FORM HANDLING - Contact Form Submission with Client-Side Validation
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    const formStatus = document.getElementById('form-status');

    if (!form) return;

    form.addEventListener('submit', (e) => {
        // Clear previous status
        formStatus.textContent = '';
        formStatus.style.color = '#00c2ff';

        // Get form data
        const name = form.name.value.trim();
        const email = form.email.value.trim();
        const phone = form.phone.value.trim();
        const course = form.course.value;
        const message = form.message.value.trim();

        // Validate reCAPTCHA
        const recaptchaResponse = grecaptcha.getResponse();
        if (!recaptchaResponse) {
            e.preventDefault();
            formStatus.textContent = '❌ Please complete the reCAPTCHA verification';
            formStatus.style.color = '#ff6b6b';
            return;
        }

        // Basic validation
        if (!name || !email || !phone || !course || !message) {
            e.preventDefault();
            formStatus.textContent = '❌ Please fill in all required fields';
            formStatus.style.color = '#ff6b6b';
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            e.preventDefault();
            formStatus.textContent = '❌ Please enter a valid email address';
            formStatus.style.color = '#ff6b6b';
            return;
        }

        // Phone validation (basic - adjust pattern as needed)
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(phone) || phone.replace(/\D/g, '').length < 10) {
            e.preventDefault();
            formStatus.textContent = '❌ Please enter a valid phone number';
            formStatus.style.color = '#ff6b6b';
            return;
        }

        // Show loading state
        formStatus.textContent = '⏳ Submitting...';
        formStatus.style.color = '#00c2ff';

        // Form will submit normally via POST to FormSubmit.co
        // FormSubmit will handle the email sending and redirect
    });

    // Real-time form validation
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            validateField(input);
        });
    });
});

// ============================================================================
// FIELD VALIDATION HELPER
// ============================================================================
function validateField(field) {
    const value = field.value.trim();

    if (field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value && !emailRegex.test(value)) {
            field.style.borderColor = '#ff6b6b';
        } else {
            field.style.borderColor = '#333';
        }
    } else if (field.type === 'tel') {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        const digitsOnly = value.replace(/\D/g, '');
        if (value && (!phoneRegex.test(value) || digitsOnly.length < 10)) {
            field.style.borderColor = '#ff6b6b';
        } else {
            field.style.borderColor = '#333';
        }
    } else if (field.required && !value) {
        field.style.borderColor = '#ff6b6b';
    } else {
        field.style.borderColor = '#333';
    }
}

// ============================================================================
// PHONE NUMBER FORMATTING
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const phoneInput = document.getElementById('phone');
    if (!phoneInput) return;

    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^\d\+]/g, '');
        
        // Allow international format starting with +
        if (value.startsWith('+')) {
            // Keep the + and format rest
            const digits = value.slice(1).replace(/\D/g, '');
            if (digits.length > 12) {
                e.target.value = '+' + digits.slice(0, 12);
            } else {
                e.target.value = '+' + digits;
            }
        } else {
            // Indian format: +91 XXX XXX XXXX
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
            // Format as: XXX XXX XXXX
            e.target.value = value.slice(0, 3) + ' ' + value.slice(3, 6) + ' ' + value.slice(6);
        } else if (value.length > 10) {
            // International format
            e.target.value = '+' + value;
        }
    });
});

// ============================================================================
// ACCESSIBILITY - Keyboard navigation for form
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const formElements = form.querySelectorAll('input:not([name="_honey"]), textarea, select, button');

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
});

// ============================================================================
// SMOOTH SCROLL FOR ANCHOR LINKS
// ============================================================================
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

// ============================================================================
// PREVENT MULTIPLE FORM SUBMISSIONS
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    if (!form) return;

    let isSubmitting = false;

    form.addEventListener('submit', (e) => {
        if (isSubmitting) {
            e.preventDefault();
            return;
        }

        // Only set submitting if validation passes
        const formStatus = document.getElementById('form-status');
        if (!formStatus.textContent.includes('❌')) {
            isSubmitting = true;
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Submitting...';
            submitButton.disabled = true;

            // Reset after form actually submits or 5 seconds
            setTimeout(() => {
                isSubmitting = false;
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }, 5000);
        }
    });
});

// ============================================================================
// INTERSECTION OBSERVER FOR ANIMATIONS
// ============================================================================
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

document.addEventListener('DOMContentLoaded', () => {
    const contactSection = document.querySelector('.contact-section');
    const mapSection = document.querySelector('.map');

    if (contactSection) observer.observe(contactSection);
    if (mapSection) observer.observe(mapSection);
});

// ============================================================================
// FORM FIELD FOCUS EFFECTS
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('.contact-form input:not([name="_honey"]), .contact-form textarea, .contact-form select');

    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.style.boxShadow = '0 0 0 3px rgba(0, 194, 255, 0.1)';
        });

        input.addEventListener('blur', () => {
            input.style.boxShadow = 'none';
        });
    });
});

// ============================================================================
// PAGE LOAD ANIMATION
// ============================================================================
window.addEventListener('load', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        navbar.style.animation = 'fadeIn 0.8s ease-out';
    }
});

// ============================================================================
// FADE-IN ANIMATION KEYFRAMES
// ============================================================================
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
