/* Premier Luxury Interiors — interactions */

(function () {
  const root = document.documentElement;

  // Theme toggle
  const toggle = document.querySelector('[data-theme-toggle]');
  const SUN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
  const MOON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  let theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  root.setAttribute('data-theme', theme);
  if (toggle) {
    toggle.innerHTML = theme === 'dark' ? SUN : MOON;
    toggle.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
    toggle.addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', theme);
      toggle.innerHTML = theme === 'dark' ? SUN : MOON;
      toggle.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
    });
  }

  // Announcement banner height -> CSS var (keeps fixed header below it)
  const announce = document.querySelector('.announce-bar');
  if (announce) {
    const setAnnounceH = () => {
      root.style.setProperty('--announce-h', announce.offsetHeight + 'px');
    };
    setAnnounceH();
    window.addEventListener('resize', setAnnounceH, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(setAnnounceH).observe(announce);
  }

  // Sticky header scroll behavior
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => {
      if (window.scrollY > 24) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Mobile nav toggle
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('open');
      navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', navToggle.classList.contains('open'));
    });
    navLinks.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        navToggle.classList.remove('open');
        navLinks.classList.remove('open');
      });
    });
  }

  // Reveal on scroll
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -80px 0px' }
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
  }

  // Active nav link based on current path
  const path = location.pathname.replace(/\/index\.html$/, '/');
  document.querySelectorAll('.nav-links a').forEach((a) => {
    const href = a.getAttribute('href').replace(/\/index\.html$/, '/');
    if (href === path || (path === '/' && href === '/')) a.classList.add('active');
    if (href !== '/' && path.startsWith(href)) a.classList.add('active');
  });

  // Form handler — opens user's mail client with a pre-filled inquiry to the studio.
  const form = document.querySelector('[data-contact-form]');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const get = (n) => (form.elements.namedItem(n)?.value || '').trim();
      const first = get('firstName');
      const last = get('lastName');
      const email = get('email');
      const phone = get('phone');
      const loc = get('location');
      const service = get('service');
      const budget = get('budget');
      const message = get('message');
      const subject = `New consultation inquiry — ${first} ${last}`.trim();
      const bodyLines = [
        `Name: ${first} ${last}`,
        `Email: ${email}`,
        phone ? `Phone: ${phone}` : null,
        loc ? `Project location: ${loc}` : null,
        service ? `Service of interest: ${service}` : null,
        budget ? `Anticipated investment: ${budget}` : null,
        '',
        'Project details:',
        message
      ].filter(Boolean);
      const mailto = 'mailto:info@premierluxuryinteriors.com'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(bodyLines.join('\n'));
      window.location.href = mailto;
      const success = document.querySelector('.form-success');
      if (success) {
        success.classList.add('show');
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  // Set current year
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
})();
