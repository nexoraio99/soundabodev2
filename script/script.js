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
// SUPABASE INITIALIZATION
// ============================================================================
const SUPABASE_URL = "https://pcuuecfvcvbrmcnryaaq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdXVlY2Z2Y3Zicm1jbnJ5YWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3ODk5MDIsImV4cCI6MjA3NjM2NTkwMn0.7eL1xwZSSumiAtyuN8iMQ_VYQzOpiUxdZzBiCDqUJqI";
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
        const course = form.course.value;
        const message = form.message.value.trim() || null;

        // Validate reCAPTCHA
        const recaptchaResponse = grecaptcha.getResponse();
        if (!recaptchaResponse) {
            formStatus.textContent = '❌ Please complete the reCAPTCHA verification';
            formStatus.style.color = '#ff6b6b';
            return;
        }

        // Basic validation
        if (!name || !email || !course) {
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

        try {
            // Show loading state
            formStatus.textContent = '⏳ Submitting...';
            formStatus.style.color = '#00c2ff';

            // Insert data into Supabase
            const { data, error } = await supabase
                .from('contact_form')
                .insert([
                    {
                        name,
                        email,
                        course,
                        message,
                        recaptcha_token: recaptchaResponse,
                        submitted_at: new Date().toISOString()
                    }
                ]);

            if (error) throw error;

            // Success message
            formStatus.textContent = '✅ Message submitted successfully! We\'ll get back to you soon.';
            formStatus.style.color = '#33ff8c';

            // Reset form
            form.reset();
            grecaptcha.reset();

            // Auto-clear success message after 5 seconds
            setTimeout(() => {
                formStatus.textContent = '';
            }, 5000);

        } catch (err) {
            console.error('Form submission error:', err);
            formStatus.textContent = '❌ There was an error submitting your message. Please try again.';
            formStatus.style.color = '#ff6b6b';
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
// PREVENT MULTIPLE FORM SUBMISSIONS
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    if (!form) return;

    let isSubmitting = false;

    form.addEventListener('submit', async (e) => {
        if (isSubmitting) {
            e.preventDefault();
            return;
        }

        isSubmitting = true;
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Submitting...';
        submitButton.disabled = true;

        // Reset after 3 seconds
        setTimeout(() => {
            isSubmitting = false;
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }, 3000);
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
// FADE-IN ANIMATION KEYFRAMES (Add to CSS or define here)
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
