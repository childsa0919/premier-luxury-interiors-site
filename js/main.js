/* ============================================================
   main.js — Premier Luxury Interiors · Cinematic Fusion
   - Opening veil → hero title sequence handoff
   - Hero reel engine (autoplay, frame buttons, mono metadata)
   - Scroll reveals (IntersectionObserver, one-shot)
   - Header scroll state
   - Consultation form: 3 steps, validation, mailto email fallback
     (until a CRM/HighLevel endpoint is wired, submit opens a
      pre-filled email to the studio; no false success state)
   - Custom cursor (fine pointers, full motion only)
   - prefers-reduced-motion respected throughout
   ============================================================ */

(function () {
  'use strict';

  var html = document.documentElement;
  html.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- opening veil → hero entrance ---------- */

  var veil = document.querySelector('[data-testid="veil"]');
  var hero = document.querySelector('[data-testid="hero"]');
  var booted = false;

  function boot() {
    if (booted) return;
    booted = true;
    veil.classList.add('is-done');
    hero.classList.add('is-entered');
  }

  if (reduceMotion.matches) {
    boot();
  } else {
    veil.classList.add('is-playing');
    // Hold the veil briefly — a beat, not a wait. Failsafe below.
    window.setTimeout(boot, 1350);
  }
  window.setTimeout(boot, 3000); // failsafe: never trap the page

  /* ---------- header scroll state ---------- */

  var head = document.querySelector('[data-testid="site-head"]');
  var lastScrolled = false;

  function onScroll() {
    var scrolled = window.scrollY > 24;
    if (scrolled !== lastScrolled) {
      lastScrolled = scrolled;
      head.classList.toggle('is-scrolled', scrolled);
    }
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- hero reel engine ---------- */

  var frames = hero.querySelectorAll('.hero-frame');
  var frameBtns = hero.querySelectorAll('.hero-frame-btn');
  var meta = hero.querySelector('[data-testid="hero-frame-meta"]');
  var META = [
    ['FR 01', 'Limestone bath — design study'],
    ['FR 02', 'Kitchen at dusk — quartz · brass · indigo'],
    ['FR 03', 'The walnut bar — design study'],
    ['FR 04', 'The lower lounge — design study'],
    ['FR 05', 'Powder room — design study']
  ];
  var reelIndex = 0;
  var reelTimer = null;
  var REEL_HOLD = 5500;

  function reelShow(n) {
    reelIndex = n;
    for (var i = 0; i < frames.length; i++) {
      frames[i].classList.toggle('is-active', i === n);
    }
    for (var j = 0; j < frameBtns.length; j++) {
      var active = j === n;
      frameBtns[j].classList.toggle('is-active', active);
      frameBtns[j].classList.toggle('is-timing', active && !reduceMotion.matches && reelTimer !== null);
      frameBtns[j].setAttribute('aria-pressed', String(active));
    }
    meta.querySelector('.hero-meta-no').textContent = META[n][0];
    meta.querySelector('.hero-meta-label').textContent = META[n][1];
  }

  function reelPlay() {
    reelStop();
    if (reduceMotion.matches) return;
    reelTimer = window.setInterval(function () {
      reelShow((reelIndex + 1) % frames.length);
    }, REEL_HOLD);
  }

  function reelStop() {
    if (reelTimer !== null) {
      window.clearInterval(reelTimer);
      reelTimer = null;
    }
  }

  for (var b = 0; b < frameBtns.length; b++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        reelPlay(); // reset the clock so the chosen frame holds
        reelShow(Number(btn.getAttribute('data-goto')));
      });
    })(frameBtns[b]);
  }

  // Pause the reel while the hero is off screen (and under reduced motion)
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        reelPlay();
        reelShow(reelIndex);
      } else {
        reelStop();
      }
    }, { threshold: 0.15 }).observe(hero);
  } else {
    reelPlay();
  }

  reduceMotion.addEventListener('change', function () {
    if (reduceMotion.matches) {
      reelStop();
    } else {
      reelPlay();
    }
    reelShow(reelIndex);
  });

  /* ---------- scroll reveals ---------- */

  var revealables = document.querySelectorAll('[data-reveal], [data-reveal-img]');

  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    for (var r = 0; r < revealables.length; r++) revealables[r].classList.add('is-in');
  } else {
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add('is-in');
          io.unobserve(entries[i].target);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    for (var v = 0; v < revealables.length; v++) io.observe(revealables[v]);
  }

  /* ---------- consultation form (email fallback until CRM wired) ---------- */

  var form = document.querySelector('[data-testid="consult-form"]');
  var steps = form.querySelectorAll('.form-step');
  var dots = form.querySelectorAll('[data-step-dot]');
  var success = form.querySelector('[data-testid="form-success"]');
  var currentStep = 1;
  var lastMailto = '';

  function setStep(n, focusFirst) {
    currentStep = n;
    for (var i = 0; i < steps.length; i++) {
      var stepNo = Number(steps[i].getAttribute('data-step'));
      var on = stepNo === n;
      steps[i].hidden = !on;
      steps[i].classList.toggle('is-active', on);
    }
    for (var d = 0; d < dots.length; d++) {
      var dotNo = Number(dots[d].getAttribute('data-step-dot'));
      dots[d].classList.toggle('is-active', dotNo === n);
      dots[d].classList.toggle('is-done', dotNo < n);
    }
    if (focusFirst) {
      var first = form.querySelector('.form-step[data-step="' + n + '"] input, .form-step[data-step="' + n + '"] select, .form-step[data-step="' + n + '"] textarea');
      if (first) first.focus({ preventScroll: true });
    }
  }

  function validateStep(n) {
    var scope = form.querySelector('.form-step[data-step="' + n + '"]');
    var fields = scope.querySelectorAll('input[required], select[required], textarea[required]');
    var error = form.querySelector('[data-error-for="' + n + '"]');
    var ok = true;
    for (var i = 0; i < fields.length; i++) {
      var valid = fields[i].checkValidity() && fields[i].value.trim() !== '';
      fields[i].classList.toggle('is-invalid', !valid);
      if (!valid) ok = false;
    }
    error.hidden = ok;
    return ok;
  }

  form.addEventListener('click', function (e) {
    var next = e.target.closest('.form-next');
    var back = e.target.closest('.form-back');
    if (next) {
      if (validateStep(currentStep)) setStep(currentStep + 1, true);
    } else if (back) {
      setStep(currentStep - 1, true);
    }
  });

  // clear invalid state as the visitor types
  form.addEventListener('input', function (e) {
    if (e.target.classList && e.target.classList.contains('is-invalid')) {
      if (e.target.checkValidity() && e.target.value.trim() !== '') {
        e.target.classList.remove('is-invalid');
      }
    }
  });

  function fieldValue(name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : '';
  }

  // Build a pre-filled email to the studio. This is a truthful fallback:
  // it does NOT record a lead server-side — it opens the visitor's email
  // client with a complete draft. Swap for a CRM/HighLevel POST when wired.
  function buildMailto() {
    var name = fieldValue('name');
    var email = fieldValue('email');
    var phone = fieldValue('phone');
    var type = fieldValue('project_type');
    var zip = fieldValue('zip');
    var budget = fieldValue('budget');
    var timing = fieldValue('timing');
    var desc = fieldValue('description');

    var subject = 'Consultation request — ' + (type || 'Project') + (name ? ' — ' + name : '');
    var lines = [
      'A consultation request from premierluxuryinteriors.com:',
      '',
      'Name: ' + name,
      'Email: ' + email,
      'Phone: ' + phone,
      'Project type: ' + type,
      'Location / ZIP: ' + zip,
      'Investment range: ' + budget,
      'Desired timing: ' + timing,
      '',
      'Project description:',
      desc
    ];
    return 'mailto:info@premierluxuryinteriors.com'
      + '?subject=' + encodeURIComponent(subject)
      + '&body=' + encodeURIComponent(lines.join('\n'));
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateStep(3)) return;

    lastMailto = buildMailto();

    // Open the visitor's email client with the prepared draft.
    window.location.href = lastMailto;

    // Show a truthful instruction state — the lead is NOT submitted until
    // the visitor actually sends the email (or calls the studio).
    var progress = form.querySelector('.form-progress');
    for (var i = 0; i < steps.length; i++) {
      steps[i].hidden = true;
      steps[i].classList.remove('is-active');
    }
    progress.hidden = true;
    success.hidden = false;
    success.setAttribute('tabindex', '-1');
    success.focus({ preventScroll: true });
  });

  // Let the visitor re-open the draft if their client didn't launch.
  var reopen = form.querySelector('[data-mailto-reopen]');
  if (reopen) {
    reopen.addEventListener('click', function (e) {
      e.preventDefault();
      if (lastMailto) window.location.href = lastMailto;
    });
  }

  setStep(1, false);

  /* ---------- custom cursor ---------- */

  var cursor = document.querySelector('[data-testid="cursor"]');

  if (window.matchMedia('(pointer: fine)').matches && !reduceMotion.matches) {
    document.addEventListener('pointermove', function (e) {
      cursor.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
      var t = e.target.closest('a, button, select, input, textarea, .strip');
      cursor.classList.toggle('is-grown', !!t);
    }, { passive: true });
  }
})();
