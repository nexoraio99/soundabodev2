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
// FORM HANDLING - Contact Form Submission
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    const formStatus = document.getElementById('form-status');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Clear previous status
        formStatus.textContent = '';
        formStatus.style.color = '#00c2ff';

        // Get form data
        const name = form.name.value.trim();
        const email = form.email.value.trim();
        const phone = form.phone.value.trim();
        const course = form.course.value;
        const message = form.message.value.trim() || '';

        // Validate reCAPTCHA
        const recaptchaResponse = grecaptcha.getResponse();
        if (!recaptchaResponse) {
            formStatus.textContent = '❌ Please complete the reCAPTCHA verification';
            formStatus.style.color = '#ff6b6b';
            return;
        }

        // Basic validation
        if (!name || !email || !phone || !course) {
            formStatus.textContent = '❌ Please fill in all required fields';
            formStatus.style.color = '#ff6b6b';
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            formStatus.textContent = '❌ Please enter a valid email address';
            formStatus.style.color = '#ff6b6b';
            return;
        }

        // Phone validation (basic - at least 10 digits)
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 10) {
            formStatus.textContent = '❌ Please enter a valid phone number';
            formStatus.style.color = '#ff6b6b';
            return;
        }

        try {
            // Show loading state
            formStatus.textContent = '⏳ Submitting...';
            formStatus.style.color = '#00c2ff';
            
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Submitting...';
            submitButton.disabled = true;

            // Prepare form data for submission
            const formData = {
                name,
                email,
                phone,
                course,
                message,
                recaptcha_token: recaptchaResponse,
                submitted_at: new Date().toISOString()
            };

            // OPTION 1: Submit to your n8n webhook
            // Replace 'YOUR_N8N_WEBHOOK_URL' with your actual webhook URL
            const webhookURL = 'YOUR_N8N_WEBHOOK_URL';
            
            const response = await fetch(webhookURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Submission failed');
            }

            // Success message
            formStatus.textContent = '✅ Message submitted successfully! We\'ll get back to you soon.';
            formStatus.style.color = '#33ff8c';

            // Reset form
            form.reset();
            grecaptcha.reset();
            
            // Re-enable submit button
            submitButton.textContent = originalText;
            submitButton.disabled = false;

            // Auto-clear success message after 5 seconds
            setTimeout(() => {
                formStatus.textContent = '';
            }, 5000);

        } catch (err) {
            console.error('Form submission error:', err);
            formStatus.textContent = '❌ There was an error submitting your message. Please try again.';
            formStatus.style.color = '#ff6b6b';
            
            // Re-enable submit button on error
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.textContent = 'Submit';
            submitButton.disabled = false;
        }
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
        const phoneDigits = value.replace(/\D/g, '');
        if (value && phoneDigits.length < 10) {
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
// ACCESSIBILITY - Keyboard navigation for form
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const formElements = form.querySelectorAll('input, textarea, select, button');

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
    const inputs = document.querySelectorAll('.contact-form input, .contact-form textarea, .contact-form select');

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
// PHONE NUMBER FORMATTING
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 10) value = value.slice(0, 10);
            
            if (value.length > 0) {
                if (value.length <= 3) {
                    e.target.value = value;
                } else if (value.length <= 6) {
                    e.target.value = value.slice(0, 3) + '-' + value.slice(3);
                } else {
                    e.target.value = value.slice(0, 3) + '-' + value.slice(3, 6) + '-' + value.slice(6);
                }
            }
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
