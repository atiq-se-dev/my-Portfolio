// ─── PAGE ROUTING ────────────────────────────
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.nav-links a');
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-links');

function showPage(id) {
  pages.forEach(p => p.classList.remove('active'));
  navLinks.forEach(a => a.classList.remove('active'));

  const target = document.getElementById(id);
  if (target) { target.classList.add('active'); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  const link = document.querySelector(`.nav-links a[data-page="${id}"]`);
  if (link) link.classList.add('active');

  setTimeout(() => {
    initReveal();
    if (id === 'skills') animateSkillBars();
    if (id === 'home') { initCounters(); startTyping(); }
  }, 120);
}


navLinks.forEach(l => {
  l.addEventListener('click', e => {
    const pid = l.getAttribute('data-page');

    // Normal links, such as Tools, should open their URL
    if (!pid) {
      navMenu.classList.remove('open');
      hamburger.classList.remove('open');
      return;
    }

    e.preventDefault();
    showPage(pid);
    history.pushState(null, '', `#${pid}`);
    navMenu.classList.remove('open');
    hamburger.classList.remove('open');
  });
});


document.addEventListener('click', e => {
  const el = e.target.closest('[data-goto]');
  if (el) {
    e.preventDefault();
    const pid = el.getAttribute('data-goto');
    showPage(pid);
    history.pushState(null, '', `#${pid}`);
  }
});

function loadFromHash() {
  const hash = location.hash.replace('#', '') || 'home';
  showPage(hash);
}
window.addEventListener('load', loadFromHash);
window.addEventListener('popstate', loadFromHash);

// ─── HAMBURGER ───────────────────────────────
hamburger?.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navMenu.classList.toggle('open');
});

document.addEventListener('click', e => {
  if (!e.target.closest('nav')) {
    navMenu.classList.remove('open');
    hamburger.classList.remove('open');
  }
});

// ─── NAVBAR SCROLL ───────────────────────────
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ─── SCROLL REVEAL ───────────────────────────
function initReveal() {
  const items = document.querySelectorAll('.page.active .reveal');
  if (!items.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const delay = parseInt(e.target.dataset.delay || 0);
        setTimeout(() => e.target.classList.add('visible'), delay);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

  items.forEach(el => obs.observe(el));
}

// ─── ANIMATED COUNTERS ───────────────────────
function animateCounter(el) {
  if (el.dataset.done) return;
  el.dataset.done = '1';

  const target = parseInt(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  const dur = 1800;
  const start = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);

  function step(now) {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = Math.floor(ease(p) * target) + suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function initCounters() {
  const els = document.querySelectorAll('.page.active [data-count]');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) animateCounter(e.target); });
  }, { threshold: 0.5 });
  els.forEach(el => obs.observe(el));
}

// ─── TYPING EFFECT ───────────────────────────
const roles = [
  'Full-Stack Developer',
  'UI/UX Designer',
  'Digital Strategist',
  'Problem Solver',
  'React & Next.js Expert'
];

let roleIdx = 0, charIdx = 0, deleting = false;
let typingTimer = null;

function startTyping() {
  const el = document.getElementById('typedText');
  if (!el) return;
  clearTimeout(typingTimer);
  typeStep(el);
}

function typeStep(el) {
  const word = roles[roleIdx];

  if (!deleting) {
    charIdx++;
    el.textContent = word.slice(0, charIdx);
    if (charIdx === word.length) {
      deleting = true;
      typingTimer = setTimeout(() => typeStep(el), 1800);
    } else {
      typingTimer = setTimeout(() => typeStep(el), 60);
    }
  } else {
    charIdx--;
    el.textContent = word.slice(0, charIdx);
    if (charIdx === 0) {
      deleting = false;
      roleIdx = (roleIdx + 1) % roles.length;
      typingTimer = setTimeout(() => typeStep(el), 400);
    } else {
      typingTimer = setTimeout(() => typeStep(el), 35);
    }
  }
}

// ─── SKILL BARS ──────────────────────────────
function animateSkillBars() {
  const fills = document.querySelectorAll('.page.active .sk-fill');
  if (!fills.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && !e.target.dataset.done) {
        e.target.dataset.done = '1';
        const w = e.target.dataset.width || '0%';
        setTimeout(() => { e.target.style.width = w; }, 250);
      }
    });
  }, { threshold: 0.3 });

  fills.forEach(el => obs.observe(el));
}

// ─── TOAST ───────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  const i = document.getElementById('toastIcon');
  const m = document.getElementById('toastMsg');
  t.className = `toast ${type}`;
  i.textContent = type === 'success' ? '✅' : '❌';
  m.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4500);
}

// ─── FORM VALIDATION ─────────────────────────
function setField(field, state, msg = '') {
  const g = field.closest('.form-group');
  g.classList.remove('error', 'success');
  const err = g.querySelector('.field-error');
  if (state === 'error') { g.classList.add('error'); if (err) err.textContent = msg; }
  if (state === 'success') g.classList.add('success');
}

function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

function validateField(f) {
  const v = f.value.trim();
  if (!v && f.required) { setField(f, 'error', 'This field is required.'); return false; }
  if (f.name === 'email' && v && !validEmail(v)) { setField(f, 'error', 'Enter a valid email.'); return false; }
  if (f.name === 'message' && v.length < 20) { setField(f, 'error', 'Message must be at least 20 characters.'); return false; }
  setField(f, 'success');
  return true;
}

// ─── CONTACT FORM SUBMIT ─────────────────────
const form = document.getElementById('contactForm');
if (form) {
  form.querySelectorAll('input,textarea,select').forEach(f => {
    f.addEventListener('blur', () => validateField(f));
    f.addEventListener('input', () => {
      if (f.closest('.form-group').classList.contains('error')) validateField(f);
    });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();

    // Validate all required fields first
    let ok = true;
    form.querySelectorAll('[required]').forEach(f => { if (!validateField(f)) ok = false; });
    if (!ok) { showToast('Please fix the errors above.', 'error'); return; }

    // Show loading spinner
    const btn = form.querySelector('.form-submit');
    btn.disabled = true;
    btn.innerHTML = `<svg style="animation:spin 0.9s linear infinite;width:18px;height:18px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Sending…`;

    // Collect form data
    const formData = Object.fromEntries(new FormData(form).entries());

    try {
      // Send email via EmailJS
      await emailjs.send(
        "service_uor1bsl",
        "template_pndoqeo",
        {
          from_name: formData.firstName + ' ' + formData.lastName,
          from_email: formData.email,
          phone: formData.phone || 'Not provided',
          service: formData.service || 'Not specified',
          budget: formData.budget || 'Not specified',
          message: formData.message,
          to_name: 'Atiq ur Rehman'
        }
      );

      // Success
      btn.disabled = false;
      btn.innerHTML = '🚀 Send Message';
      form.reset();
      form.querySelectorAll('.form-group').forEach(g => g.classList.remove('success', 'error'));
      showToast("Message sent! I'll get back to you within 24 hours. 🎉", 'success');

    } catch (error) {
      // Error
      console.error('EmailJS Error:', error);
      btn.disabled = false;
      btn.innerHTML = '🚀 Send Message';
      showToast('Something went wrong. Please try again!', 'error');
    }
  });
}

// ─── INIT ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initCounters();
  startTyping();

  // Add spin keyframe
  const s = document.createElement('style');
  s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(s);
});

// ─── THEME TOGGLE ────────────────────────────
const themeToggle = document.getElementById('themeToggle');
const themeLabel = document.getElementById('themeLabel');

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
  document.body.classList.add('light-mode');
  if (themeLabel) themeLabel.textContent = 'Light';
}

themeToggle?.addEventListener('click', () => {
  const isLight = document.body.classList.toggle('light-mode');
  if (themeLabel) themeLabel.textContent = isLight ? 'Light' : 'Dark';
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
});
