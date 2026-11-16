/* Page chrome: the header that docks then lifts off as a pill, the mobile
   drawer, and the on-scroll reveal. Same behaviour as the Tony Kosoko site. */
(function () {
  'use strict';

  /* ---- header ---- */
  var hd = document.getElementById('siteHeader');
  if (hd) {
    var hero = document.querySelector('.page-hero');
    var lastY = window.scrollY;
    var tick = function () {
      var y = window.scrollY;
      var past = hero ? y > hero.offsetHeight - 70 : y > 160;
      if (past !== hd.classList.contains('is-solid')) {
        hd.classList.add('no-anim');
        hd.classList.toggle('is-solid', past);
        requestAnimationFrame(function () { hd.classList.remove('no-anim'); });
      }
      /* hide on the way down, show on the way up, only once it is floating */
      hd.classList.toggle('is-hidden', past && y > lastY + 6 && y > 260);
      lastY = y;
    };
    addEventListener('scroll', tick, { passive: true });
    tick();
  }

  /* ---- mobile drawer ---- */
  var drawer = document.getElementById('mobileDrawer'),
    overlay = document.getElementById('drawerOverlay'),
    toggle = document.getElementById('navToggle'),
    close = document.getElementById('drawerClose');

  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('is-open', open);
    overlay.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('no-scroll', open);
    if (open) { var a = drawer.querySelector('a,button'); if (a) a.focus(); }
    else if (toggle) toggle.focus();
  }
  if (toggle) toggle.addEventListener('click', function () { setDrawer(true); });
  if (close) close.addEventListener('click', function () { setDrawer(false); });
  if (overlay) overlay.addEventListener('click', function () { setDrawer(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') setDrawer(false); });

  var acc = document.querySelector('.drawer__acc');
  if (acc) acc.addEventListener('click', function () {
    var panel = document.getElementById(acc.getAttribute('aria-controls'));
    var open = acc.getAttribute('aria-expanded') === 'true';
    acc.setAttribute('aria-expanded', open ? 'false' : 'true');
    panel.hidden = open;
  });

  /* ---- reveal ---- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(function (n) { io.observe(n); });
  }

  /* ---- enquiry form ---- */
  var form = document.getElementById('enquiryForm');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true;
    form.querySelectorAll('[required]').forEach(function (f) {
      var good = f.type === 'checkbox' ? f.checked : f.value.trim() !== '' &&
        (f.type !== 'email' || /.+@.+\..+/.test(f.value));
      if (f.closest('.field')) f.closest('.field').classList.toggle('has-error', !good);
      if (!good) ok = false;
    });
    if (!ok) { var bad = form.querySelector('.has-error input,.has-error select,.has-error textarea'); if (bad) bad.focus(); return; }
    document.getElementById('formStatus').classList.add('is-visible');
    form.querySelector('button[type=submit]').disabled = true;
  });

  var year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
