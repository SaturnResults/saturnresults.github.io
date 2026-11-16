/* Page chrome: the header that docks then lifts off as a pill, the mobile
   drawer, and the on-scroll reveal. Same behaviour as the Tony Kosoko site. */
(function () {
  'use strict';

  /* ---- header ---- */
  var hd = document.getElementById('siteHeader');
  if (hd) {
    /* At the top of the page the header is docked and scrolls away with
       everything else. Once it has gone it floats as a pill, and the only
       thing that brings it back is scrolling up.

       Two thresholds rather than one. The old version swapped docked for
       floating at the foot of the hero, which put the docked header hundreds
       of pixels above the viewport, so scrolling up through that point made it
       vanish until you reached the top. Swapping at the header's own height
       instead means the two sit in the same place when they trade over, and
       nothing jumps.

       `drift` accumulates movement in one direction and resets when the
       direction changes, so a few pixels of wobble, or the bounce at the end
       of a flick, cannot flip it. */
    var DOCK = 10, FLOAT = 90, TURN = 12;
    var lastY = window.scrollY, drift = 0, shown = true, floating = false, first = true;

    var show = function (on, instant) {
      if (on === shown) return;
      shown = on;
      if (instant) hd.classList.add('no-anim');
      hd.classList.toggle('is-hidden', !on);
      if (instant) requestAnimationFrame(function () { hd.classList.remove('no-anim'); });
      drift = 0;
    };

    var tick = function () {
      var y = Math.max(0, window.scrollY);

      if (!floating && y > FLOAT) {
        floating = true;
        hd.classList.add('is-solid');
        /* you only reach here on the way down, so it leaves straight away
           rather than appearing for a moment first */
        if (!first) show(false, true);
      } else if (floating && y < DOCK) {
        floating = false;
        hd.classList.remove('is-solid');
        show(true);
      }

      if (floating) {
        var d = y - lastY;
        if (d) {
          if ((d > 0) !== (drift > 0)) drift = 0;
          drift += d;
          if (drift > TURN) show(false);
          else if (drift < -TURN) show(true);
        }
      } else drift = 0;

      lastY = y;
      first = false;
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
