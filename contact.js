// --- script.js ---

const hamburger = document.querySelector('.hamburger-menu');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('is-active');
    navMenu.classList.toggle('is-active');
});

// Optional: close menu when link clicked
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('is-active');
        navMenu.classList.remove('is-active');
    });
});

// Initialize Supabase client
const SUPABASE_URL = "https://pcuuecfvcvbrmcnryaaq.supabase.co"; // replace with your project URL
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdXVlY2Z2Y3Zicm1jbnJ5YWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3ODk5MDIsImV4cCI6MjA3NjM2NTkwMn0.7eL1xwZSSumiAtyuN8iMQ_VYQzOpiUxdZzBiCDqUJqI"; // replace with your anon key
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Handle form submission
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".contact-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get form data
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const course = form.course.value;
    const message = form.message.value.trim() || null; // message optional

    // Basic validation
    if (!name || !email) {
      alert("Please fill in your name and email.");
      return;
    }

    try {
      const { data, error } = await supabase.from("contact_form").insert([
        { name, email, course, message },
      ]);

      if (error) throw error;

      alert("✅ Message submitted successfully!");
      form.reset();
    } catch (err) {
      console.error(err);
      alert("❌ There was an error submitting your message.");
    }
  });
});
document.getElementById('contactForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  // Check if reCAPTCHA is completed
  var recaptchaResponse = grecaptcha.getResponse();
  if (!recaptchaResponse) {
      alert('Please complete the reCAPTCHA verification');
      return;
  }
  
  // If validation passes, you can submit the form
  // You'll need to verify the reCAPTCHA token on your backend
  console.log('Form is valid and reCAPTCHA verified');
  console.log('reCAPTCHA token:', recaptchaResponse);
  
  // Submit your form here (to backend, email service, etc.)
  // this.submit();
});