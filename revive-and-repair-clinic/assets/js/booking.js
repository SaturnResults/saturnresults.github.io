/* Revive & Repair Clinic — demo booking widget.
   Renders the same markup and the same four steps as the Simple Bookings
   widget on tonykosokophysiotherapy.com, so the look and the flow are the
   clinic's own but the shape is identical. Nothing is sent anywhere: the
   availability is generated on the page and the last step just shows what a
   confirmation would look like. */
(function () {
  'use strict';

  var B = {
    name: 'Revive & Repair Clinic',
    address: 'Revive & Repair Clinic, Wager Street, London, E3 4JD',
    policy: 'Reschedule or cancel free of charge up to 24 hours before your appointment.',
    open: '11:00', close: '23:00'
  };

  /* Treatments and prices as listed on the clinic's Booksy page.
     `was` is the pre-discount price Booksy shows alongside. */
  var CATS = ['Hair Treatment', 'Cupping Treatment', 'Massage Treatment'];
  var SERVICES = [
    { id: 1, cat: 'Hair Treatment', name: 'PRP — Platelet Rich Plasma',
      desc: 'A concentration of your own platelets, separated from your blood, injected to stimulate the body’s natural repair. Used for hair thinning, skin rejuvenation and stubborn tendon and joint pain.',
      durs: [{ mins: 60, price: 150 }] },

    { id: 2, cat: 'Cupping Treatment', name: 'Package 1 (Upper Back Reset)',
      desc: 'Wet or dry cupping, deep tissue, hot stone, red light and Graston therapy. Back only.',
      durs: [{ mins: 60, price: 90, was: 100 }] },
    { id: 3, cat: 'Cupping Treatment', name: 'Package 2 (Full Body Reset)',
      desc: 'Wet or dry cupping, deep tissue, hot stone, red light and Graston therapy. Full body.',
      durs: [{ mins: 90, price: 135, was: 150 }] },
    { id: 4, cat: 'Cupping Treatment', name: 'Cupping Therapy (back only)',
      desc: 'Wet or dry cupping.',
      durs: [{ mins: 30, price: 40.5, was: 45 }] },
    { id: 5, cat: 'Cupping Treatment', name: 'Dry Cupping + Deep Tissue Massage (back only)',
      durs: [{ mins: 60, price: 54, was: 60 }] },
    { id: 6, cat: 'Cupping Treatment', name: 'Wet Cupping + Deep Tissue Massage (back only)',
      durs: [{ mins: 60, price: 54, was: 60 }] },

    { id: 7, cat: 'Massage Treatment', name: '30 Minute Deep Tissue Massage',
      durs: [{ mins: 30, price: 36, was: 40 }] },
    { id: 8, cat: 'Massage Treatment', name: 'Graston Therapy + Deep Tissue Massage',
      desc: 'Graston therapy with a deep tissue oil massage.',
      durs: [{ mins: 30, price: 36, was: 40 }] },
    { id: 9, cat: 'Massage Treatment', name: 'Sports Massage',
      desc: 'Sports massage and deep stretches.',
      durs: [{ mins: 60, price: 54, was: 60 }] },
    { id: 10, cat: 'Massage Treatment', name: 'Relaxation Massage',
      durs: [{ mins: 60, price: 54, was: 60 }] },
    { id: 11, cat: 'Massage Treatment', name: 'Hot Stone Massage',
      durs: [{ mins: 60, price: 54, was: 60 }] },
    { id: 12, cat: 'Massage Treatment', name: '90 Minute Massage',
      desc: 'Dry cupping, percussion massage and oil massage. Full body.',
      durs: [{ mins: 90, price: 81, was: 90 }] }
  ];
  var STAFF = [{ id: 1, name: 'Jual', title: 'Jual Uddin', color: '#D8C19A' }];

  /* ---------------- helpers ---------------- */
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var money = function (n) { return '£' + (n % 1 ? n.toFixed(2) : n); };
  var durL = function (m) {
    if (m < 60) return m + ' min';
    var h = Math.floor(m / 60), r = m % 60;
    return h + ' hr' + (r ? ' ' + r + ' min' : '');
  };
  var toMin = function (t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; };
  var t12 = function (t) {
    var m = toMin(t), h = Math.floor(m / 60), mm = m % 60, ap = h < 12 ? 'am' : 'pm';
    h = h % 12 || 12;
    return h + (mm ? ':' + (mm < 10 ? '0' + mm : mm) : '') + ap;
  };
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  var iso = function (d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  };
  var parse = function (s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  var dShort = function (s) { var d = parse(s); return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3); };
  var dLong = function (s) {
    var d = parse(s), full = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return full[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
  };
  var pin = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"></path><circle cx="12" cy="9.5" r="2.5"></circle></svg>';

  /* A small deterministic hash, so the mock diary is the same on every render
     of a given day instead of reshuffling under the cursor. */
  var seed = function (str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h = Math.imul(h ^ (h >>> 15), 2246822507); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
  };

  /* Slots across the clinic's 11:00–23:00 day, thinned out so the diary looks
     worked rather than wide open, and emptied entirely on about a third of
     days. Today only offers times at least two hours out, so the strip never
     shows a slot that has already been and gone. */
  var slotsFor = function (date, mins) {
    var r = seed(date + ':' + mins);
    if (r() < 0.34) return [];
    var out = [], open = toMin(B.open), close = toMin(B.close), step = mins <= 30 ? 30 : 60;
    if (date === iso(new Date())) {
      var now = new Date();
      open = Math.max(open, Math.ceil((now.getHours() * 60 + now.getMinutes() + 120) / 30) * 30);
    }
    for (var m = open; m + mins <= close; m += step) {
      if (r() < 0.42) out.push(('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2));
    }
    return out.slice(0, 9);
  };

  var S = { step: 1, cat: 'All', svc: null, dur: null, staff: null, date: null, time: null, days: [], slots: [], f: {}, done: null };

  var today = new Date(); today.setHours(0, 0, 0, 0);
  for (var i = 0; i < 21; i++) { var d = new Date(today); d.setDate(d.getDate() + i); S.days.push(iso(d)); }

  var svcOf = function () { return S.svc ? SERVICES.filter(function (s) { return s.id === S.svc; })[0] : null; };
  var firstFree = function (mins) {
    for (var i = 0; i < S.days.length; i++) if (slotsFor(S.days[i], mins).length) return S.days[i];
    return null;
  };

  /* ---------------- views ---------------- */
  function vTreat() {
    var h = '<div class="sbk-chips">' + ['All'].concat(CATS).map(function (c) {
      return '<button type="button" class="sbk-chip' + (S.cat === c ? ' on' : '') + '" data-a="cat" data-v="' + esc(c) + '">' + esc(c) + '</button>';
    }).join('') + '</div>';

    CATS.forEach(function (cat) {
      if (S.cat !== 'All' && S.cat !== cat) return;
      var list = SERVICES.filter(function (s) { return s.cat === cat; });
      if (!list.length) return;
      h += '<div class="sbk-group"><div class="sbk-label">' + esc(cat) + '</div>' + list.map(function (s) {
        return '<div class="sbk-tg"><div class="sbk-tg-h"><div class="sbk-svc-b">' +
          '<b class="sbk-svc-n">' + esc(s.name) + '</b>' +
          (s.desc ? '<span class="sbk-desc">' + esc(s.desc) + '</span>' : '') +
          '<span class="sbk-loc">' + pin + '<span>' + esc(B.address) + '</span></span>' +
          '</div></div><div class="sbk-durs">' + s.durs.map(function (d, i) {
            var key = s.id + ':' + i;
            return '<button type="button" class="sbk-dur' + (S.dur === key ? ' on' : '') + '" data-a="svc" data-v="' + key + '"' +
              ' aria-label="' + esc(s.name + ', ' + durL(d.mins) + ', ' + money(d.price)) + '">' +
              '<b>' + durL(d.mins) + '</b><span>' + (d.was ? '<s>' + money(d.was) + '</s> ' : '') + money(d.price) + '</span></button>';
          }).join('') + '</div></div>';
      }).join('') + '</div>';
    });
    return h;
  }

  function vStaff() {
    var s = svcOf(), d = s.durs[+S.dur.split(':')[1]];
    var nx = firstFree(d.mins);
    return '<div class="sbk-staff">' + STAFF.map(function (p) {
      return '<button type="button" class="sbk-person' + (S.staff === p.id ? ' on' : '') + '" data-a="staff" data-v="' + p.id + '">' +
        av(p, 72) + '<span><b>' + esc(p.name) + '</b><span class="sbk-muted">' + esc(p.title) + '</span></span>' +
        '<span class="sbk-next' + (nx ? ' ok' : ' no') + '">' + (nx ? 'Next available ' + dShort(nx) : 'Fully booked') + '</span></button>';
    }).join('') + '</div>';
  }

  function av(p, size) {
    return '<span class="sbk-av" style="width:' + size + 'px;height:' + size + 'px;background-color:' + p.color +
      ';font-size:' + Math.round(size / 3.1) + 'px">' + esc(p.name.charAt(0)) + '</span>';
  }

  function vTime() {
    var s = svcOf(), d = s.durs[+S.dur.split(':')[1]];
    var h = '<div class="sbk-month">' + MONTHS[parse(S.days[0]).getMonth()] + ' ' + parse(S.days[0]).getFullYear() + '</div>';
    h += '<div class="sbk-days">' + S.days.map(function (iso2, i) {
      var day = parse(iso2), has = slotsFor(iso2, d.mins).length;
      return '<button type="button" class="sbk-day' + (S.date === iso2 ? ' on' : has ? '' : ' empty') + '" data-a="date" data-v="' + iso2 + '">' +
        '<span>' + (i === 0 ? 'Today' : DAYS[day.getDay()]) + '</span><b>' + day.getDate() + '</b><i></i></button>';
    }).join('') + '</div>';

    if (!S.slots.length) {
      var first = firstFree(d.mins), other = first && first !== S.date;
      return h + '<div class="sbk-empty"><b>No times left on this day</b><span class="sbk-muted">' +
        (other ? 'Earliest available: ' + dLong(first) + '.' : 'No availability in the next ' + S.days.length + ' days.') + '</span>' +
        (other ? '<button type="button" class="sbk-btn2" data-a="date" data-v="' + first + '">Go to that day</button>' : '') + '</div>';
    }
    return h + [['Morning', 0, 720], ['Afternoon', 720, 1020], ['Evening', 1020, 1440]].map(function (g) {
      var list = S.slots.filter(function (t) { var m = toMin(t); return m >= g[1] && m < g[2]; });
      return list.length ? '<div class="sbk-slotg"><div class="sbk-muted sbk-sm">' + g[0] + '</div><div class="sbk-slots">' +
        list.map(function (t) {
          return '<button type="button" class="sbk-slot' + (S.time === t ? ' on' : '') + '" data-a="time" data-v="' + t + '">' + t12(t) + '</button>';
        }).join('') + '</div></div>' : '';
    }).join('');
  }

  function whenL() {
    var d = svcOf().durs[+S.dur.split(':')[1]];
    var end = toMin(S.time) + d.mins;
    var endT = ('0' + Math.floor(end / 60)).slice(-2) + ':' + ('0' + (end % 60)).slice(-2);
    return dLong(S.date) + ', ' + t12(S.time) + ' – ' + t12(endT);
  }

  function vForm() {
    var s = svcOf(), d = s.durs[+S.dur.split(':')[1]], f = S.f, bad = S.tried;
    var field = function (nm, lab, type, extra) {
      var v = f[nm] || '', ok = nm === 'email' ? /.+@.+\..+/.test(v) : v.trim().length > 1;
      return '<label class="sbk-field"><span>' + lab + '</span>' +
        '<input name="' + nm + '" type="' + type + '" autocomplete="' + extra + '" value="' + esc(v) + '"' +
        (bad && !ok ? ' class="bad"' : '') + '>' +
        (bad && !ok ? '<span class="sbk-err">' + (nm === 'email' ? 'Please enter a valid email' : nm === 'name' ? 'Please enter your name' : 'Please enter a mobile number') + '</span>' : '') +
        '</label>';
    };
    return '<div class="sbk-mini"><b>' + esc(s.name) + ' · ' + money(d.price) + '</b>' +
      '<span>' + esc(whenL() + ' with ' + STAFF[0].name + ' · ' + B.address) + '</span></div>' +
      '<div class="sbk-form">' +
      field('name', 'Full name', 'text', 'name') +
      field('email', 'Email', 'email', 'email') +
      field('phone', 'Mobile', 'tel', 'tel') +
      '<label class="sbk-field"><span>Anything we should know? <em>Optional</em></span><textarea name="notes" rows="3">' + esc(f.notes || '') + '</textarea></label>' +
      '<div class="sbk-codebox"><div class="sbk-field"><span>Have a package or gift card code?</span><div class="sbk-coderow">' +
      '<input name="code" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="e.g. RR-AB12-CD34" value="' + esc(f.code || '') + '">' +
      '<button type="button" class="sbk-btn2" data-a="code">Apply</button></div></div></div>' +
      '<div class="sbk-note"><b>Pay now to confirm</b><span>You’ll pay ' + money(d.price) +
      ' by card on the next screen. ' + esc(B.policy) + '</span></div>' +
      (S.formErr ? '<div class="sbk-errbox">' + esc(S.formErr) + '</div>' : '') + '</div>';
  }

  function vDone() {
    var b = S.done;
    var row = function (k, v) { return '<div class="sbk-row"><span>' + esc(k) + '</span><b>' + esc(v) + '</b></div>'; };
    return '<div class="sbk-done"><div class="sbk-tick">&#10003;</div><h2 class="sbk-h">You’re booked in</h2>' +
      '<p class="sbk-muted">Confirmation sent to ' + esc(b.email) + '</p></div>' +
      '<div class="sbk-rows">' +
      row('Treatment', b.service + ' · ' + b.dur) + row('Therapist', b.staff) +
      row('When', b.when) + row('Where', b.where) + row('Payment', b.pay) + row('Reference', b.ref) +
      '</div>' +
      '<p class="sbk-muted">We’ll also email you a reminder 24 hours before.</p>' +
      '<div class="sbk-note"><b>This is a demo</b><span>No appointment has been made and no card has been charged. ' +
      'On the live site this screen also offers an “Add to calendar” link and a self-service reschedule page.</span></div>' +
      '<div class="sbk-actions"><button type="button" class="sbk-link" data-a="again">Book another</button></div>';
  }

  /* ---------------- aside and bar ---------------- */
  function vAside(cta, label) {
    var s = svcOf(), d = s ? s.durs[+S.dur.split(':')[1]] : null;
    return '<aside class="sbk-aside"><div class="sbk-aside-in">' +
      '<div><div class="sbk-bname">' + esc(B.name) + '</div></div><hr>' +
      (d ? '<div class="sbk-sum"><div><b>' + esc(s.name) + '</b><span class="sbk-muted">' + durL(d.mins) + '</span></div><b>' + money(d.price) + '</b></div>' +
        (S.staff ? '<div class="sbk-with">' + av(STAFF[0], 36) + '<span>with ' + esc(STAFF[0].name) + '</span></div>' : '') +
        '<div class="sbk-loc">' + pin + '<span>' + esc(B.address) + '</span></div>' +
        (S.time ? '<div><b>' + esc(dLong(S.date)) + '</b><div class="sbk-muted">' + esc(t12(S.time)) + '</div></div>' : '')
        : '<div class="sbk-muted">No treatment selected yet</div>') +
      '<hr><div class="sbk-total"><span>Total</span><span>' + (d ? money(d.price) : '£0') + '</span></div>' +
      '<button type="button" class="sbk-btn sbk-btn-l" data-a="cta"' + (cta ? '' : ' disabled') + '>' + label + '</button>' +
      '</div></aside>';
  }

  function barText() {
    var s = svcOf();
    if (!s) return '<b>Nothing selected</b><span>Choose a treatment</span>';
    var d = s.durs[+S.dur.split(':')[1]];
    return '<b>' + money(d.price) + '</b><span>' + esc(s.name + ' · ' + durL(d.mins)) + '</span>';
  }

  /* ---------------- shell ---------------- */
  var el;
  function render() {
    if (S.step === 5) {
      el.innerHTML = '<div class="sbk-card"><section class="sbk-main">' + vDone() + '</section></div>' +
        '<div class="sbk-foot"><span>Demo preview · bookings are not live</span></div>';
      return;
    }
    var steps = [
      { h: 'Choose a treatment', v: vTreat, ok: !!S.dur, cta: 'Continue' },
      { h: 'Choose your therapist', v: vStaff, ok: !!S.staff, cta: 'Continue' },
      { h: 'Pick a time', v: vTime, ok: !!S.time, cta: 'Continue' },
      { h: 'Your details', v: vForm, ok: true, cta: 'Continue to payment' }
    ];
    var st = steps[S.step - 1];
    el.innerHTML = '<div class="sbk-card"><section class="sbk-main">' +
      '<div class="sbk-top">' + (S.step > 1 ? '<button type="button" class="sbk-back" data-a="back" aria-label="Back">←</button>' : '') +
      '<span class="sbk-count">Step ' + S.step + ' of 4</span></div>' +
      '<div class="sbk-prog">' + [1, 2, 3, 4].map(function (n) { return '<i class="' + (n <= S.step ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<h2 class="sbk-h">' + st.h + '</h2>' + st.v() +
      '<div class="sbk-grow"></div>' +
      '<div class="sbk-bar"><div class="sbk-bar-t">' + barText() + '</div>' +
      '<button type="button" class="sbk-btn" data-a="cta"' + (st.ok ? '' : ' disabled') + '>' + st.cta + '</button></div>' +
      '</section>' + vAside(st.ok, st.cta) + '</div>' +
      '<div class="sbk-foot"><span>Demo preview · bookings are not live</span></div>';
  }

  var ACT = {
    cat: function (v) { S.cat = v; },
    svc: function (v) {
      S.svc = +v.split(':')[0]; S.dur = v;
      S.date = null; S.time = null; S.slots = [];
    },
    staff: function (v) { S.staff = +v; },
    date: function (v) {
      S.date = v; S.time = null;
      S.slots = slotsFor(v, svcOf().durs[+S.dur.split(':')[1]].mins);
    },
    time: function (v) { S.time = v; },
    back: function () {
      S.step--;
      if (S.step === 1) { S.staff = null; }
      if (S.step < 3) { S.time = null; }
    },
    code: function () { S.formErr = 'That code was not recognised. In the demo no codes are set up.'; },
    again: function () {
      S = { step: 1, cat: 'All', svc: null, dur: null, staff: null, date: null, time: null, days: S.days, slots: [], f: {}, done: null };
    },
    cta: function () {
      if (S.step === 4) return submit();
      S.step++;
      if (S.step === 3 && !S.date) {
        var mins = svcOf().durs[+S.dur.split(':')[1]].mins;
        S.date = firstFree(mins) || S.days[0];
        S.slots = slotsFor(S.date, mins);
      }
      /* bring the top of the widget back into view, the way the embed does */
      var top = el.getBoundingClientRect().top;
      if (top < 0) window.scrollTo({ top: window.scrollY + top - 90, behavior: 'smooth' });
    }
  };

  function readForm() {
    ['name', 'email', 'phone', 'notes', 'code'].forEach(function (n) {
      var f = el.querySelector('[name="' + n + '"]');
      if (f) S.f[n] = f.value;
    });
  }

  function submit() {
    readForm();
    S.tried = true;
    var f = S.f;
    if (!f.name || f.name.trim().length < 2 || !/.+@.+\..+/.test(f.email || '') || !f.phone || f.phone.trim().length < 6) return;
    var s = svcOf(), d = s.durs[+S.dur.split(':')[1]];
    S.done = {
      email: f.email, service: s.name, dur: durL(d.mins), staff: STAFF[0].title,
      when: whenL(), where: B.address, pay: money(d.price) + ' paid by card',
      ref: 'RR-' + String(Math.abs(Math.round(toMin(S.time) * 7919 + d.price * 131))).slice(0, 5)
    };
    S.step = 5;
  }

  function boot() {
    el = document.querySelector('.sbk-root');
    if (!el) return;
    el.classList.add('sbkw');
    /* the widget has no media queries: below 760px of its own width it drops
       the summary rail and shows the sticky bar instead */
    var fit = function () { el.classList.toggle('sbk-narrow', el.clientWidth < 760); };
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(el);
    else addEventListener('resize', fit);
    el.addEventListener('click', function (e) {
      var t = e.target.closest('[data-a]');
      if (!t || t.disabled) return;
      if (S.step === 4) readForm();
      var fn = ACT[t.getAttribute('data-a')];
      if (fn) { fn(t.getAttribute('data-v')); render(); }
    });
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
