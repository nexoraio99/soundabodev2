// about.js - cleaned up
// MOBILE NAV: hamburger toggle
document.addEventListener('DOMContentLoaded', function () {
  const hamburger = document.querySelector('.hamburger-menu');
  const navMenu = document.querySelector('.nav-menu');

  if (!hamburger || !navMenu) return;

  hamburger.addEventListener('click', function () {
    hamburger.classList.toggle('is-active');
    navMenu.classList.toggle('is-active');
  });
});
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

/* ==========================================================================
       Bing UET (unchanged, lazy-load safe)
       ========================================================================== */
    function initBingUET() {
      (function(w, d, t, r, u) {
        var f, n, i;
        w[u] = w[u] || [], f = function() {
          var o = { ti: "343210550", enableAutoSpaTracking: true };
          o.q = w[u], w[u] = new UET(o), w[u].push("pageLoad");
        },
        n = d.createElement(t), n.src = r, n.async = 1, n.onload = n.onreadystatechange = function() {
          var s = this.readyState;
          s && s !== "loaded" && s !== "complete" || (f(), n.onload = n.onreadystatechange = null);
        },
        i = d.getElementsByTagName(t)[0], i.parentNode.insertBefore(n, i);
      })(window, document, "script", "//bat.bing.com/bat.js", "uetq");
    }
