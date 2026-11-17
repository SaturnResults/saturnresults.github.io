/* Mindful Massage by Galina — demo booking widget.
   Renders the same markup and the same four steps as the Simple Bookings
   widget on tonykosokophysiotherapy.com, so the look and the flow are the
   studio's own but the shape is identical. Nothing is sent anywhere: the
   availability is generated on the page and the last step just shows what a
   confirmation would look like. */
(function () {
  'use strict';

  var B = {
    name: 'Mindful Massage by Galina',
    address: 'Mindful Massage by Galina, 300 Chiswick High Road, Room 20, London, W4 1NP',
    policy: 'Please arrive 10 to 15 minutes early for a complimentary consultation, so you get every minute of hands-on time.',
    /* her real week, off Treatwell. getDay(): 0 Sun … 6 Sat. Tuesday is closed. */
    hours: { 0: [10, 20], 1: [12, 20], 2: null, 3: [10, 20], 4: [10, 20], 5: [10, 20], 6: [11, 21] }
  };

  /* Treatments, lengths and prices exactly as listed on her Treatwell page.
     Where Treatwell splits one treatment across several entries — the
     pregnancy massage is listed three times, once per length — they are one
     card here with a button per length. */
  var CATS = ['Classic Massages', 'Therapeutic Massages', 'Weight Loss & Cellulite', 'Monthly Membership'];

  var ramp = function (start, step, mins) {
    return mins.map(function (m, i) { return { mins: m, price: start + step * i }; });
  };

  var SERVICES = [
    { id: 1, cat: 'Classic Massages', name: 'Signature Full Body Massage',
      desc: 'Pressure: medium to firm. Blends Swedish and deep tissue with trigger point work, built around what you come in with, and gives individual attention to the areas that need it.',
      durs: ramp(79, 10, [60, 70, 80, 90, 100, 110, 120]) },
    { id: 2, cat: 'Classic Massages', name: 'Deep Tissue Massage',
      desc: 'Pressure: firm to very strong. Firmer pressure with specific attention to knots and trigger points, to ease tension, free up range of motion and relieve long-standing pain.',
      durs: ramp(89, 10, [60, 70, 80, 90, 100, 110]) },
    { id: 3, cat: 'Classic Massages', name: 'Swedish Massage',
      desc: 'Pressure: light to firm. A way to let go of stress and muscle tension and reset the postural habits that come from repetitive work.',
      durs: ramp(69, 10, [60, 70, 80, 90, 100]) },
    { id: 4, cat: 'Classic Massages', name: 'Back and Neck Massage with aromatic oil',
      desc: 'The answer to tension held in the upper body, whether from knots or from how you sit all day.',
      durs: [{ mins: 30, price: 45 }] },
    { id: 5, cat: 'Classic Massages', name: 'Back, Neck & Shoulders Massage with aromatic oil',
      desc: 'Releases tension across the whole of the upper back, increases range of motion and relieves long-standing pain.',
      durs: [{ mins: 40, price: 55 }] },
    { id: 6, cat: 'Classic Massages', name: 'Back, Neck, Shoulders, Arm and Head Massage with aromatic oil',
      desc: 'Everything in the shoulders treatment, carried through the arms and finished at the scalp.',
      durs: [{ mins: 50, price: 65 }] },
    { id: 7, cat: 'Classic Massages', name: 'Foot Massage',
      desc: 'The soothing side of massage with the therapeutic side of reflexology. For anyone on their feet all day, or carrying stress in their body.',
      durs: [{ mins: 30, price: 35 }] },
    { id: 8, cat: 'Classic Massages', name: 'Foot & Leg Massage with aromatic oil',
      desc: 'The foot treatment worked up through the calves and thighs.',
      durs: [{ mins: 40, price: 55 }] },
    { id: 9, cat: 'Classic Massages', name: 'Foot, Leg and Glute Massage with aromatic oil',
      desc: 'The full lower body, feet to glutes, for legs that have been standing or running all week.',
      durs: [{ mins: 50, price: 65 }] },

    /* Treatwell lists this as three separate treatments, one per length. */
    { id: 10, cat: 'Therapeutic Massages', name: 'Pregnancy Massage',
      desc: 'For the stress and discomfort of pregnancy, and a faster recovery afterwards. Manages stress, relieves muscle tension and leaves you better prepared.',
      durs: [{ mins: 60, price: 75 }, { mins: 70, price: 85 }, { mins: 80, price: 95 }] },

    { id: 11, cat: 'Weight Loss & Cellulite', name: 'Anti-Cellulite Massage',
      desc: 'Pinching and rolling techniques worked over the areas you want to target, to break down the fat underneath.',
      durs: [{ mins: 45, price: 65 }] },

    { id: 12, cat: 'Monthly Membership', name: 'Signature Full Body Massage',
      desc: 'The signature massage at the member rate. Pressure: medium to firm.',
      durs: ramp(69, 10, [60, 70]).concat([{ mins: 80, price: 85 }, { mins: 90, price: 95 }, { mins: 100, price: 105 }, { mins: 110, price: 115 }, { mins: 120, price: 125 }]) },
    { id: 13, cat: 'Monthly Membership', name: 'Deep Tissue Massage',
      desc: 'The deep tissue massage at the member rate. Pressure: firm to very strong.',
      durs: ramp(79, 10, [60, 70]).concat([{ mins: 80, price: 95 }, { mins: 90, price: 105 }, { mins: 100, price: 115 }, { mins: 110, price: 125 }]) },
    { id: 14, cat: 'Monthly Membership', name: 'Swedish Massage',
      desc: 'The Swedish massage at the member rate. Pressure: light to firm.',
      durs: ramp(59, 10, [60, 70]).concat([{ mins: 80, price: 75 }, { mins: 90, price: 85 }, { mins: 100, price: 95 }]) }
  ];
  var STAFF = [{ id: 1, name: 'Galina', title: 'Massage therapist', color: '#D9C7A8' }];

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
  var hhmm = function (m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); };
  var t12 = function (t) {
    var m = toMin(t), h = Math.floor(m / 60), mm = m % 60, ap = h < 12 ? 'am' : 'pm';
    h = h % 12 || 12;
    return h + (mm ? ':' + (mm < 10 ? '0' + mm : mm) : '') + ap;
  };
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  var iso = function (d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  };
  var parse = function (s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  var dShort = function (s) { var d = parse(s); return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3); };
  var dLong = function (s) { var d = parse(s); return FULL[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; };
  var pin = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"></path><circle cx="12" cy="9.5" r="2.5"></circle></svg>';

  /* A small deterministic hash, so the mock diary is the same on every render
     of a given day instead of reshuffling under the cursor. */
  var seed = function (str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h = Math.imul(h ^ (h >>> 15), 2246822507); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
  };

  /* Slots inside her actual opening hours for that weekday, thinned out so the
     diary looks worked rather than wide open. Tuesdays are closed, and today
     only offers times at least two hours out. */
  var slotsFor = function (date, mins) {
    var day = parse(date).getDay(), h = B.hours[day];
    if (!h) return [];
    var r = seed(date + ':' + mins);
    if (r() < 0.3) return [];
    var open = h[0] * 60, close = h[1] * 60, step = mins <= 45 ? 30 : 60, out = [];
    if (date === iso(new Date())) {
      var now = new Date();
      open = Math.max(open, Math.ceil((now.getHours() * 60 + now.getMinutes() + 120) / 30) * 30);
    }
    for (var m = open; m + mins <= close; m += step) {
      if (r() < 0.45) out.push(hhmm(m));
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
              '<b>' + durL(d.mins) + '</b><span>' + money(d.price) + '</span></button>';
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
      var shut = !B.hours[parse(S.date).getDay()];
      return h + '<div class="sbk-empty"><b>' + (shut ? 'Closed on ' + FULL[parse(S.date).getDay()] + 's' : 'No times left on this day') + '</b><span class="sbk-muted">' +
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
    return dLong(S.date) + ', ' + t12(S.time) + ' – ' + t12(hhmm(toMin(S.time) + d.mins));
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
      '<label class="sbk-field"><span>Anything I should know, or an oil you would like? <em>Optional</em></span><textarea name="notes" rows="3">' + esc(f.notes || '') + '</textarea></label>' +
      '<div class="sbk-codebox"><div class="sbk-field"><span>Member or gift card code?</span><div class="sbk-coderow">' +
      '<input name="code" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="e.g. MM-AB12-CD34" value="' + esc(f.code || '') + '">' +
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
  var el, hop;
  var AUTO = { svc: 1, staff: 1, time: 1 };

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
      email: f.email, service: s.name, dur: durL(d.mins), staff: 'Galina Gospodinova',
      when: whenL(), where: B.address, pay: money(d.price) + ' paid by card',
      ref: 'MM-' + String(Math.abs(Math.round(toMin(S.time) * 7919 + d.price * 131))).slice(0, 5)
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
      var a = t.getAttribute('data-a'), fn = ACT[a];
      if (!fn) return;
      fn(t.getAttribute('data-v'));
      render();
      /* Choosing a treatment, a therapist or a time is the whole of that step,
         so it carries you on by itself rather than making you press Continue
         as well. Picking a day is not in here: that only loads the times. */
      if (AUTO[a] && S.step < 4) {
        clearTimeout(hop);
        hop = setTimeout(function () { ACT.cta(); render(); }, 180);
      }
    });
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
