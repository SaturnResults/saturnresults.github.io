/* Shared behaviour for every page: the phone menu, copy-to-clipboard buttons,
   and marking today in the opening-hours table. Everything the page says is in
   the HTML; this only makes it move. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── the phone menu ──────────────────────────────────────────────────── */
  var menu = $('#menu'), scrim = $('#scrim');
  function openMenu(on) {
    if (!menu) return;
    menu.setAttribute('data-up', on ? '1' : '0');
    if (scrim) scrim.setAttribute('data-up', on ? '1' : '0');
    document.body.style.overflow = on ? 'hidden' : '';
    if (on) { var f = $('a', menu); if (f) f.focus({ preventScroll: true }); }
  }
  var burger = $('#burger');
  if (burger) burger.addEventListener('click', function () { openMenu(true); });
  var mx = $('#menuX');
  if (mx) mx.addEventListener('click', function () { openMenu(false); });
  if (scrim) scrim.addEventListener('click', function () { openMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') openMenu(false); });

  /* ── copy buttons ────────────────────────────────────────────────────── */
  function copyText(text, btn, okLabel) {
    var old = btn.innerHTML;
    var done = function () {
      btn.textContent = okLabel || 'Copied';
      setTimeout(function () { btn.innerHTML = old; }, 1800);
    };
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    };
    try {
      navigator.clipboard.writeText(text).then(done, fallback);
    } catch (e) { fallback(); }
  }
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () { copyText(b.getAttribute('data-copy'), b); });
  });
  window.mmgCopy = copyText;

  /* ── today, in the opening hours ─────────────────────────────────────── */
  var dow = new Date().getDay();
  $$('.hr[data-day]').forEach(function (row) {
    if (+row.getAttribute('data-day') === dow) row.setAttribute('data-today', '1');
  });

  /* ── open or closed, right now ───────────────────────────────────────── */
  /* Monday noon–8, Tuesday closed, Wednesday to Friday 10–8, Saturday 11–9,
     Sunday 10–8 — her hours as listed. */
  var HOURS = { 0: [600, 1200], 1: [720, 1200], 2: null, 3: [600, 1200], 4: [600, 1200], 5: [600, 1200], 6: [660, 1260] };
  var DAYF = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var clock = function (m) {
    var h = Math.floor(m / 60), mm = m % 60, ap = h < 12 ? 'am' : 'pm';
    h = h % 12 || 12;
    return h + (mm ? ':' + (mm < 10 ? '0' : '') + mm : '') + ap;
  };
  var now = new Date(), mins = now.getHours() * 60 + now.getMinutes();
  var h = HOURS[dow], state;
  if (h && mins >= h[0] && mins < h[1]) {
    state = 'Open now until ' + clock(h[1]);
  } else {
    var d = dow, hh = null, i;
    for (i = (h && mins < h[0]) ? 0 : 1; i <= 7; i++) {
      d = (dow + i) % 7;
      if (HOURS[d]) { hh = HOURS[d]; break; }
    }
    if (hh) {
      var when = (d === dow) ? 'today' : (d === (dow + 1) % 7 ? 'tomorrow' : DAYF[d]);
      state = 'Closed — opens ' + when + ' at ' + clock(hh[0]);
    } else { state = 'Closed'; }
  }
  $$('[data-openstate]').forEach(function (el) { el.textContent = state; });
})();
