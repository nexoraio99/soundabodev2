// about.js - cleaned up

// Set footer year (safe guard if element missing)
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// CTA behaviour: navigate to contact or provide micro-feedback
const cta = document.getElementById('ctaBtn');
if (cta) {
  cta.addEventListener('click', () => {
    // Prefer direct contact page if exists; otherwise do a small press-flash
    const contactHref = '/contact.html';
    // Only navigate if contact page likely exists — this is a best-effort assumption.
    // If you prefer always to go to contact, remove the check.
    fetch(contactHref, { method: 'HEAD' })
      .then(res => {
        if (res.ok) location.href = contactHref;
        else cta.animate([{ transform: 'scale(1)' }, { transform: 'scale(.98)' }, { transform: 'scale(1)' }], { duration: 180 });
      })
      .catch(() => {
        cta.animate([{ transform: 'scale(1)' }, { transform: 'scale(.98)' }, { transform: 'scale(1)' }], { duration: 180 });
      });
  });
}

// Scroll-in reveal for elements (intersection observer)
try {
  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.fade-in-left, .fade-in-right, .fade-in-up, .divider')
    .forEach((el) => io.observe(el));
} catch (err) {
  // on older browsers or if IntersectionObserver blocked, just reveal elements
  document.querySelectorAll('.fade-in-left, .fade-in-right, .fade-in-up, .divider')
    .forEach((el) => { el.classList.add('revealed'); });
}
