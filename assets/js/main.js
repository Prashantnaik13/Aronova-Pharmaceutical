/* =============================================================================
   ARONOVA PHARMACEUTICAL PVT. LTD. — interactions & motion
   -----------------------------------------------------------------------------
   Design rules for the motion in this file:
     • Everything is opt-in. Nothing animates unless the visitor's browser
       supports it AND they have not asked for reduced motion.
     • Only `transform` and `opacity` are animated on scroll (compositor only).
     • All scroll work is coalesced into a single requestAnimationFrame loop.
     • Observers unobserve after firing — no repeat work, no leaks.
   ============================================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  var root = document.documentElement;

  /* --- Opt-in flag: CSS only hides elements when .anim-ready is present --- */
  function syncMotionFlag() {
    if (reduced.matches) root.classList.remove('anim-ready');
    else root.classList.add('anim-ready');
  }
  syncMotionFlag();
  if (reduced.addEventListener) reduced.addEventListener('change', syncMotionFlag);

  /* =========================================================================
     1. Header — mobile navigation
     ========================================================================= */
  var header = document.querySelector('.header');
  var toggle = document.querySelector('.nav-toggle');

  function closeMenu() {
    if (!header || !header.classList.contains('is-open')) return;
    header.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (toggle && header) {
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = header.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    document.addEventListener('click', function (e) {
      if (header.classList.contains('is-open') && !header.contains(e.target)) closeMenu();
    });
    header.querySelectorAll('.nav a').forEach(function (a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }

  /* =========================================================================
     2. Single rAF scroll loop — header state, progress bar, back-to-top
     ========================================================================= */
  var progress = document.querySelector('.scroll-progress span');
  var toTop = document.querySelector('.to-top');
  var lastY = window.scrollY || 0;
  var ticking = false;

  function onFrame() {
    ticking = false;
    var y = window.scrollY || 0;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var delta = y - lastY;

    if (header) {
      header.classList.toggle('is-stuck', y > 8);
      header.classList.toggle('is-compact', y > 140);
      // Auto-hide only on a deliberate downward scroll, well past the hero,
      // and never while the mobile menu is open.
      var menuOpen = header.classList.contains('is-open');
      if (!menuOpen && y > 520 && delta > 6) header.classList.add('is-hidden');
      else if (delta < -6 || y < 400 || menuOpen) header.classList.remove('is-hidden');
    }

    if (progress) {
      progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    }
    if (toTop) toTop.classList.toggle('is-visible', y > 620);

    lastY = y;
  }

  function requestFrame() {
    if (!ticking) { ticking = true; requestAnimationFrame(onFrame); }
  }
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame, { passive: true });
  onFrame();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' });
    });
  }

  /* =========================================================================
     3. Scroll reveal — staggered by position within its group
     ========================================================================= */
  function initReveal() {
    var els = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!els.length) return;

    if (!('IntersectionObserver' in window) || reduced.matches) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    // Stagger: index among sibling reveals inside the same parent.
    var seen = new Map();
    els.forEach(function (el) {
      var p = el.parentElement;
      var i = seen.get(p) || 0;
      seen.set(p, i + 1);
      el.style.setProperty('--d', Math.min(i * 85, 425) + 'ms');
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });

    els.forEach(function (el) { io.observe(el); });
  }

  /* =========================================================================
     4. Hero / page-banner entrance timeline
     ========================================================================= */
  function initEntrance() {
    var items = [];
    var heroCopy = document.querySelector('.hero-copy');
    var visual = document.querySelector('.hero-visual');

    if (heroCopy) {
      items = Array.prototype.slice.call(heroCopy.children);
      if (visual) items.push(visual);
    } else {
      var banner = document.querySelector('.page-banner .container');
      if (banner) items = Array.prototype.slice.call(banner.children);
    }
    if (!items.length) return;

    if (reduced.matches) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    items.forEach(function (el, i) {
      el.style.setProperty('--d', (i * 110 + 80) + 'ms');
      el.classList.add('is-in');
    });
  }

  /* =========================================================================
     5. Number count-up
     ========================================================================= */
  function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -9 * t); }

  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;
    var pad = parseInt(el.getAttribute('data-pad') || '0', 10);
    var dur = 1500, start = null;

    function format(v) {
      var s = String(Math.round(v));
      while (pad && s.length < pad) s = '0' + s;
      return s;
    }
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / dur, 1);
      el.textContent = format(target * easeOutExpo(t));
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = format(target);
    }
    requestAnimationFrame(step);
  }

  function initCounters() {
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
    if (!els.length) return;
    if (reduced.matches || !('IntersectionObserver' in window)) {
      els.forEach(function (el) {
        var v = parseFloat(el.getAttribute('data-count'));
        var pad = parseInt(el.getAttribute('data-pad') || '0', 10);
        var s = String(v);
        while (pad && s.length < pad) s = '0' + s;
        el.textContent = s;
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        countUp(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.55 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* =========================================================================
     6. Timeline: draw the rail, then light each node
     ========================================================================= */
  function initTimeline() {
    var tl = document.querySelector('.timeline');
    if (!tl || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-visible');
        var nodes = e.target.querySelectorAll('li');
        nodes.forEach(function (n, i) {
          setTimeout(function () { n.classList.add('is-lit'); }, 200 + i * 180);
        });
        io.unobserve(e.target);
      });
    }, { threshold: 0.2 });
    io.observe(tl);
  }

  /* =========================================================================
     7. Parallax — subtle depth on media panels (desktop + motion only)
     ========================================================================= */
  function initParallax() {
    if (reduced.matches || !canHover.matches || window.innerWidth < 1024) return;
    var items = Array.prototype.slice.call(
      document.querySelectorAll('.product-media, .prow-media, .hero-card')
    ).map(function (el) { return { el: el, speed: 0.055, base: 0 }; });
    if (!items.length) return;

    var ticking = false;
    function update() {
      ticking = false;
      var vh = window.innerHeight;
      items.forEach(function (it) {
        var r = it.el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;          // off-screen: skip
        var centre = r.top + r.height / 2 - vh / 2;               // px from viewport centre
        it.el.style.transform = 'translate3d(0,' + (-centre * it.speed).toFixed(2) + 'px,0)';
      });
    }
    function req() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req, { passive: true });
    update();
  }

  /* =========================================================================
     8. Cursor spotlight on cards (pointer devices only)
     ========================================================================= */
  function initSpotlight() {
    if (!canHover.matches || reduced.matches) return;
    var targets = document.querySelectorAll(
      '.card, .product-card, .info-card, .prow-media, .form-card'
    );
    targets.forEach(function (el) {
      el.classList.add('spotlight');
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(2) + '%');
        el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(2) + '%');
      });
    });
  }

  /* =========================================================================
     9. Scroll-spy for in-page anchor links
     ========================================================================= */
  function initScrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav a[href*="#"]'));
    if (!links.length || !('IntersectionObserver' in window)) return;

    var map = {};
    var ids = [];
    links.forEach(function (a) {
      var id = a.getAttribute('href').split('#')[1];
      if (!id) return;
      var sec = document.getElementById(id);
      if (!sec) return;
      map[id] = a; ids.push(id);
    });
    if (!ids.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var a = map[e.target.id];
        if (a) a.classList.toggle('is-active', e.isIntersecting);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    ids.forEach(function (id) { io.observe(document.getElementById(id)); });
  }

  /* =========================================================================
     10. Smooth in-page anchor scrolling (header-aware)
     ========================================================================= */
  function initAnchors() {
    document.querySelectorAll('a[href*="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href').split('#')[1];
        if (!id) return;
        var target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        closeMenu();
        var headerH = header ? header.getBoundingClientRect().height : 0;
        var y = target.getBoundingClientRect().top + window.scrollY - headerH - 26;
        window.scrollTo({ top: y, behavior: reduced.matches ? 'auto' : 'smooth' });
      });
    });
  }

  /* =========================================================================
     11. Footer year
     ========================================================================= */
  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* =========================================================================
     12. Enquiry form → mailto (static site, no backend)
     ========================================================================= */
  var form = document.getElementById('enquiry-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var get = function (id) {
        var el = document.getElementById(id);
        return el ? String(el.value || '').trim() : '';
      };
      var name = get('f-name'), org = get('f-org'), city = get('f-city'),
          phone = get('f-phone'), email = get('f-email'),
          type = get('f-type'), message = get('f-message');
      var note = document.getElementById('form-status');

      if (!name || !phone || !message) {
        if (note) {
          note.className = 'form-status form-status--error';
          note.textContent = 'Please fill in your name, contact number and message.';
        }
        var focusId = !name ? 'f-name' : (!phone ? 'f-phone' : 'f-message');
        var el = document.getElementById(focusId);
        if (el) el.focus();
        return;
      }

      var subject = 'Business Enquiry – ' + (type || 'General') + ' – ' + name +
                    (org ? ' (' + org + ')' : '');
      var body = [
        'New enquiry from the Aronova website',
        '-----------------------------------',
        'Name          : ' + name,
        'Organisation  : ' + (org || '-'),
        'City / State  : ' + (city || '-'),
        'Phone         : ' + phone,
        'Email         : ' + (email || '-'),
        'Enquiry type  : ' + (type || '-'),
        '',
        'Message:',
        message,
        '',
        'Sent from the Aronova Pharmaceutical website'
      ].join('\n');

      if (note) {
        note.className = 'form-status form-status--ok';
        note.innerHTML = 'Opening your email client with the details pre-filled&hellip; ' +
          'If nothing happens, please write to <a href="mailto:officialaronova26@gmail.com">' +
          'officialaronova26@gmail.com</a> or call <a href="tel:+919172588386">+91 91725883886</a>.';
      }

      window.location.href = 'mailto:officialaronova26@gmail.com?subject=' +
        encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
  }

  /* =========================================================================
     13. Boot
     ========================================================================= */
  function boot() {
    initEntrance();
    initReveal();
    initCounters();
    initTimeline();
    initParallax();
    initSpotlight();
    initScrollSpy();
    initAnchors();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
