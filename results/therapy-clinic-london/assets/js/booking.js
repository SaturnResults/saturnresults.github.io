/* ───────────────────────────────────────────────────────────────────────────
   Therapy Clinic London — booking demo

   Every treatment, duration and price below is their real Fresha menu, kept
   exactly. What changes is the way it is asked for. Their menu is 18 entries
   split into Men's and Women's tabs, with prices and promotions inside the
   service names; it is really four things a person might need, each with a
   couple of lengths. So the plain-English name leads and their own wording is
   kept underneath, because that is what will appear on the receipt.

   Availability is generated in the browser from a seeded number, so the diary
   looks the same on every load but is not real.
   ─────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var el = function (t, c, h) { var e = document.createElement(t);
    if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };

  /* ── their clinic ─────────────────────────────────────────────────────── */

  var PHONE = '07860 610127';

  /* minutes from midnight. They run split shifts and close Monday and Friday,
     which is the whole reason this page leads with the next opening rather
     than a calendar: there is not much of a week to hunt through. */
  var HOURS = {
    0: [[660, 780], [840, 1080]],   /* Sun  11-1, 2-6 */
    1: [],                          /* Mon  closed    */
    2: [[1080, 1200]],              /* Tue  6-8pm     */
    3: [[600, 840], [960, 1080]],   /* Wed  10-2, 4-6 */
    4: [[600, 840], [960, 1080]],   /* Thu  10-2, 4-6 */
    5: [],                          /* Fri  closed    */
    6: [[660, 780], [840, 1080]]    /* Sat  11-1, 2-6 */
  };
  var MON_EVE = { 1: [[1080, 1200]] };   /* the out-of-hours Monday package */

  var LEAD = 120;   /* nothing bookable inside two hours */
  var GAP  = 15;    /* the room is turned around between patients */

  var NEEDS = [
    { id: 'pain',   n: 'Back, neck or joint pain', s: 'Osteopathy and posture work',
      i: 'M12 20V10M12 10l-4 4M12 10l4 4M8 4h8M9 7h6' },
    { id: 'sports', n: 'Sports injury or recovery', s: 'Deep tissue and sports massage',
      i: 'M4 12h16M7 8v8M17 8v8M10 10v4M14 10v4' },
    { id: 'hijama', n: 'Hijama (wet cupping)', s: 'Sunnah cupping, with infrared heat',
      i: 'M7 5h10v6a5 5 0 0 1-10 0zM10 19h4' },
    { id: 'ruqyah', n: 'Ruqyah', s: 'Qur’an-based, with full-body hijama',
      i: 'M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2zM9 8h6M9 12h6' }
  ];

  /* grp: which of their two menus this sits on. Their split, not mine. */
  var SERVICES = [
    /* ── Men's Treatments ───────────────────────────────────────────────── */
    { id: 'm1', grp: 'm', mins: 60, price: 95, needs: ['pain', 'sports'], tag: 'Most booked',
      n: 'Posture alignment & sports massage',
      o: 'RECOVERY £95! SMS Body Posture Alignment, a 15min Sports Massage! Worth £120!' },
    { id: 'm2', grp: 'm', mins: 30, price: 85, needs: ['pain', 'sports'],
      n: 'Posture adjustment & 15 min massage',
      o: 'SMS Full Body Posture Adjustment & 15 mins Sports Massage' },
    { id: 'm8', grp: 'm', mins: 60, price: 120, needs: ['pain', 'hijama'],
      n: 'Posture adjustment & full-body hijama',
      o: 'SMS Full Body Posture Adjustment & Full Body Hijamah Wet Cupping Both Back & Front of Body.' },
    { id: 'm11', grp: 'm', mins: 30, price: 75, needs: ['pain', 'hijama'],
      n: 'Posture alignment & hijama',
      o: 'Full SMS Body Posture Alignment & Hijamah Wet Cupping' },
    { id: 'm9', grp: 'm', mins: 10, price: 55, needs: ['pain'],
      n: 'Posture alignment only', sub: 'For regular maintenance',
      o: 'SMS Full Body Posture Alignment' },
    { id: 'm5', grp: 'm', mins: 25, price: 55, needs: ['hijama'],
      n: 'Hijama with infrared heat',
      o: 'Hijamah Wet Cupping & Infrared Deep Tissue Heat' },
    { id: 'm6', grp: 'm', mins: 60, price: 90, needs: ['sports'],
      n: 'Sports massage', o: 'Sports Massage Therapy - 1hr' },
    { id: 'm7', grp: 'm', mins: 30, price: 45, needs: ['sports'],
      n: 'Sports massage', o: 'Sports Massage Therapy - 30mins' },
    { id: 'm10', grp: 'm', mins: 30, price: 50, needs: ['pain', 'hijama'], child: true,
      n: 'Posture alignment & hijama', sub: 'Under 14s',
      o: 'Under 14s Basic SMS Body Posture Alignment & Hijamah' },
    { id: 'm4', grp: 'm', mins: 60, price: 159, needs: ['pain', 'sports', 'hijama'],
      hours: MON_EVE, tag: 'Monday evening only',
      n: 'Recovery package, out of hours',
      sub: 'Posture adjustment, sports massage and hijama',
      o: 'MONDAY EVENING OUT OF HOURS: RECOVERY PACKAGE PROMOTION: Full Body Posture Adjustment, 15Min Sports Massage and Hijamah Wet Cupping.' },
    { id: 'm3', grp: 'm', mins: 90, price: 299, needs: ['ruqyah'], must: true,
      n: 'Ruqyah with full-body hijama',
      o: 'General Ruqyah Package: (FAMILY MEMBER MUST BE PRESENT): - Full Body Back & Front Hijamah with Ruqyah.' },

    /* ── Women's Treatments ─────────────────────────────────────────────── */
    { id: 'w7', grp: 'f', mins: 45, price: 60, needs: ['pain'], first: true,
      n: 'Osteopathy, first visit', sub: 'Consultation, posture adjustment and deep muscle work',
      o: 'Women’s First Visit Osteopathy (Chiropractory) Treatment inc. Posture Adjustment & Deep Muscle Work.' },
    { id: 'w6', grp: 'f', mins: 30, price: 60, needs: ['pain'], back: true,
      n: 'Osteopathy, follow-up',
      o: 'Follow up Osteopathy (Chiropractory) Treatment inc. Posture Adjustment & Deep Muscle Work.' },
    { id: 'w5', grp: 'f', mins: 60, price: 95, needs: ['pain', 'hijama'], first: true, tag: 'Most booked',
      n: 'Osteopathy & hijama, first visit',
      o: 'First Osteopathy (Chiropractory) Treatment inc. Posture Adjustment & Deep Muscle Work & Hijamah Wet Cupping' },
    { id: 'w3', grp: 'f', mins: 60, price: 95, needs: ['sports', 'hijama'],
      n: 'Body relief massage & hijama', sub: '30 minutes of massage',
      o: '30min Body Relief Massage & Hijamah Wet Cupping' },
    { id: 'w4', grp: 'f', mins: 45, price: 75, needs: ['sports', 'hijama'],
      n: 'Body relief massage & hijama', sub: '15 minutes of massage',
      o: '15min Body Relief Massage & Hijamah Wet Cupping' },
    { id: 'w1', grp: 'f', mins: 90, price: 199, needs: ['pain', 'sports', 'hijama'],
      n: 'Recovery package',
      sub: 'Osteopathy, deep massage, massage cupping and hijama',
      o: 'Women’s Recovery Package: Osteopathy (30min) , 30min Deep Massage, 10mins Massage Cupping & Hijamah Wet Cupping' },
    { id: 'w2', grp: 'f', mins: 90, price: 299, needs: ['ruqyah'], must: true,
      n: 'Ruqyah with full-body hijama',
      o: 'General Ruqyah Package: (FAMILY MEMBER MUST BE PRESENT): - Full Body Back & Front Hijamah with Ruqyah.' }
  ];

  /* Which therapist sees which patient is the question their menu structure
     implies and their booking flow hides. Here it is asked plainly, second.
     The mapping of each name to a menu is inferred — confirm it with Ramiz. */
  var TEAM = [
    { id: 'ramiz',  n: 'Ramiz',   r: 'Head Therapist',   g: 'm', note: '23 years. Founded the clinic.' },
    { id: 'raul',   n: 'Raul',    r: 'Therapist',        g: 'm' },
    { id: 'bilal',  n: 'M Bilal', r: 'Therapist',        g: 'm' },
    { id: 'mariam', n: 'Mariam',  r: 'Osteopath',        g: 'f' },
    { id: 'jamila', n: 'Jamila',  r: 'Therapist',        g: 'f' }
  ];

  /* ── state ────────────────────────────────────────────────────────────── */

  var S = { need: null, who: null, svc: null, child: false, back: false,
            day: null, time: null, name: '', tel: '' };

  var svcById = function (id) {
    for (var i = 0; i < SERVICES.length; i++) if (SERVICES[i].id === id) return SERVICES[i];
    return null;
  };
  var hoursFor = function (s) { return (s && s.hours) ? s.hours : HOURS; };

  /* ── the diary ────────────────────────────────────────────────────────── */

  var ds = function (d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) +
           '-' + ('0' + d.getDate()).slice(-2);
  };
  var parse = function (s) { var p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]); };

  var rng = function (str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () {
      h = Math.imul(h ^ (h >>> 15), 2246822507); h ^= h >>> 13;
      return (h >>> 0) / 4294967296;
    };
  };

  /* existing appointments for a day, derived once per date so the page is
     stable across renders */
  var cache = {};
  var booked = function (dstr, hrs) {
    var key = dstr + (hrs === HOURS ? '' : '!');
    if (cache[key]) return cache[key];
    var r = rng('tcl' + key), out = [];
    var shifts = hrs[parse(dstr).getDay()] || [];
    for (var s = 0; s < shifts.length; s++) {
      var a = shifts[s][0], b = shifts[s][1];
      /* these shifts are two to four hours, not a full day, so the same
         density that reads as 'busy' on a long day reads as 'shut' here */
      var load = 0.18 + r() * 0.2;
      var t = a + Math.floor(r() * 3) * 15;
      while (t < b - 20) {
        if (r() < load) {
          var len = [25, 30, 45, 60, 60, 90][Math.floor(r() * 6)];
          if (t + len <= b) { out.push([t, t + len]); t += len + GAP; continue; }
        }
        t += 15;
      }
    }
    cache[key] = out;
    return out;
  };

  /* free starts on a day, grouped by shift so a split day reads as two
     sittings rather than one list with a hole in it */
  var freeShifts = function (dstr, svc) {
    var hrs = hoursFor(svc), mins = svc ? svc.mins : 30;
    var day = parse(dstr), shifts = hrs[day.getDay()] || [];
    var busy = booked(dstr, hrs);
    var now = new Date();
    var isToday = ds(now) === dstr;
    var cut = isToday ? now.getHours() * 60 + now.getMinutes() + LEAD : -1;
    var res = [];
    for (var s = 0; s < shifts.length; s++) {
      var a = shifts[s][0], b = shifts[s][1], list = [];
      for (var t = a; t + mins <= b; t += 15) {
        if (t < cut) continue;
        var clash = false;
        for (var i = 0; i < busy.length; i++) {
          if (t < busy[i][1] + GAP && busy[i][0] < t + mins + GAP) { clash = true; break; }
        }
        if (!clash) list.push(t);
      }
      if (list.length) res.push({ from: a, to: b, times: list });
    }
    return res;
  };

  var slotFree = function (dstr, t, svc) {
    var sh = freeShifts(dstr, svc);
    for (var i = 0; i < sh.length; i++) if (sh[i].times.indexOf(t) >= 0) return true;
    return false;
  };

  var nextOpening = function (svc) {
    var d = new Date();
    for (var i = 0; i < 45; i++) {
      var k = ds(d), sh = freeShifts(k, svc);
      if (sh.length) return { day: k, time: sh[0].times[0] };
      d.setDate(d.getDate() + 1);
    }
    return null;
  };

  /* ── formatting ───────────────────────────────────────────────────────── */

  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var hhmm = function (m) {
    var h = Math.floor(m / 60), x = m % 60, ap = h >= 12 ? 'pm' : 'am';
    var hr = h % 12; if (hr === 0) hr = 12;
    return hr + (x ? ':' + ('0' + x).slice(-2) : '') + ap;
  };
  var dayWord = function (dstr) {
    var t = new Date(), d = parse(dstr);
    if (ds(t) === dstr) return 'Today';
    t.setDate(t.getDate() + 1);
    if (ds(t) === dstr) return 'Tomorrow';
    return DAYS[d.getDay()];
  };
  var dayLong = function (dstr) {
    var d = parse(dstr);
    return dayWord(dstr) + ', ' + d.getDate() + ' ' + MON[d.getMonth()];
  };
  var dur = function (m) {
    if (m < 60) return m + ' min';
    if (m === 60) return '1 hour';
    if (m % 60 === 0) return (m / 60) + ' hours';
    return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
  };
  var money = function (p) { return '£' + p; };

  var ICON = {
    tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 6.5 7 1-5 5 1.2 7L12 18l-6.2 3.5L7 14.5l-5-5 7-1z"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 8v5M12 17h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>'
  };
  var icon = function (d) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
           'stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';
  };

  /* ── steps ────────────────────────────────────────────────────────────── */

  var STEPS = ['need', 'who', 'svc', 'when', 'you'];
  var at = 0;

  /* How far down the page the fixed header reaches right now. It is taller
     before you scroll than after, so measure it rather than guess. */
  var barBottom = function () {
    var b = $('bar');
    return (b ? b.getBoundingClientRect().height : 0) + 14;
  };

  /* Some browsers quietly ignore behavior:"smooth" — if nothing has moved a
     moment later, jump there instead, so the step is revealed either way. */
  var scrollToY = function (y) {
    y = Math.max(0, Math.round(y));
    var from = window.scrollY;
    if (Math.abs(y - from) < 2) return;
    try { window.scrollTo({ top: y, behavior: 'smooth' }); }
    catch (e) { window.scrollTo(0, y); }
    setTimeout(function () {
      if (Math.abs(window.scrollY - from) < 2) window.scrollTo(0, y);
    }, 220);
  };

  /* Bring a step into view, and only if it is not already there.
     Pinning every step to the top of the window is right on a phone, where one
     step fills the screen. On a desktop the next step is usually already
     visible, and scrolling anyway throws the page down for no reason. */
  var reveal = function (node) {
    var top = barBottom();
    var vh = window.innerHeight;
    var r = node.getBoundingClientRect();

    if (r.top >= top && r.bottom <= vh - 12) return;   /* already in view */

    var y;
    if (r.top < top || r.height > vh - top - 12) {
      y = r.top + window.scrollY - top;                /* sit under the header */
    } else {
      y = r.bottom + window.scrollY - vh + 12;         /* just clear the bottom */
    }
    scrollToY(y);
  };

  var setStep = function (i) {
    at = i;
    for (var k = 0; k < STEPS.length; k++) {
      var box = $('s-' + STEPS[k]);
      if (!box) continue;
      box.dataset.state = k < i ? 'done' : (k === i ? 'now' : 'wait');
    }
    paint();
    var cur = $('s-' + STEPS[i]);
    if (cur && i > 0) reveal(cur);
  };

  var fold = function (box, k, v, step) {
    box.innerHTML = '';
    var b = el('button', 'fold');
    b.innerHTML = '<span class="tick">' + ICON.tick + '</span>' +
      '<span class="fold-t"><span class="fold-k">' + k + '</span>' +
      '<span class="fold-v">' + v + '</span></span><span class="ch">Change</span>';
    b.onclick = function () { setStep(step); };
    box.appendChild(b);
  };

  /* 1 — what do you need */
  var paintNeed = function () {
    var box = $('s-need');
    if (box.dataset.state === 'done') {
      var n = NEEDS.filter(function (x) { return x.id === S.need; })[0];
      return fold(box, 'Looking for', n ? n.n : 'Not sure', 0);
    }
    box.innerHTML = '';
    box.appendChild(head(1, 'What can we help with?'));
    var b = el('div', 'step-b'), g = el('div', 'opts');
    NEEDS.forEach(function (n) {
      var o = el('button', 'opt');
      o.setAttribute('aria-pressed', S.need === n.id);
      o.innerHTML = '<span class="opt-i">' + icon(n.i) + '</span>' +
        '<span class="opt-t"><b class="opt-n">' + n.n + '</b>' +
        '<span class="opt-s">' + n.s + '</span></span>';
      o.onclick = function () { S.need = n.id; S.svc = null; setStep(1); };
      g.appendChild(o);
    });
    b.appendChild(g);
    var msg = 'Not sure which? Pick the closest — Ramiz will confirm on the phone before your visit.';
    if (S.day && S.time != null) {
      msg = 'Holding ' + dayLong(S.day) + ' at ' + hhmm(S.time) + ' while you choose.';
    }
    b.appendChild(el('p', 'fine', msg));
    box.appendChild(b);
  };

  /* 2 — who would you like to see */
  var paintWho = function () {
    var box = $('s-who');
    if (box.dataset.state === 'done') {
      var t = { f: 'A female therapist', m: 'A male therapist', any: 'No preference' }[S.who];
      return fold(box, 'Seeing', t, 1);
    }
    if (box.dataset.state === 'wait') { box.innerHTML = ''; box.appendChild(head(2, 'Who would you prefer to see?')); return; }
    box.innerHTML = '';
    box.appendChild(head(2, 'Who would you prefer to see?'));
    var b = el('div', 'step-b'), g = el('div', 'opts');
    [['f', 'A female therapist', 'f'], ['m', 'A male therapist', 'm'], ['any', 'No preference', null]]
      .forEach(function (row) {
        var names = TEAM.filter(function (p) { return row[2] ? p.g === row[2] : true; })
                        .map(function (p) { return p.n; }).join(', ');
        var o = el('button', 'opt');
        o.setAttribute('aria-pressed', S.who === row[0]);
        o.innerHTML = '<span class="opt-i">' +
          icon('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0') + '</span>' +
          '<span class="opt-t"><b class="opt-n">' + row[1] + '</b>' +
          '<span class="opt-s">' + names + '</span></span>';
        o.onclick = function () { S.who = row[0]; S.svc = null; setStep(2); };
        g.appendChild(o);
      });
    b.appendChild(g);
    box.appendChild(b);
  };

  /* 3 — the treatment itself */
  var listFor = function () {
    var grp = S.who === 'f' ? 'f' : (S.who === 'm' ? 'm' : null);
    return SERVICES.filter(function (s) {
      if (grp && s.grp !== grp) return false;
      if (S.need && s.needs.indexOf(S.need) < 0) return false;
      if (s.child && !S.child) return false;
      if (!s.child && S.child && s.grp === 'm') return false;
      if (s.first && S.back) return false;
      if (s.back && !S.back) return false;
      return true;
    });
  };

  var paintSvc = function () {
    var box = $('s-svc');
    if (box.dataset.state === 'done') {
      var s = svcById(S.svc);
      return fold(box, 'Treatment', s ? s.n + ' · ' + dur(s.mins) + ' · ' + money(s.price) : '', 2);
    }
    if (box.dataset.state === 'wait') { box.innerHTML = ''; box.appendChild(head(3, 'Which treatment?')); return; }
    box.innerHTML = '';
    box.appendChild(head(3, 'Which treatment?'));
    var b = el('div', 'step-b'), g = el('div', 'cards');
    var list = listFor();

    if (!list.length) {
      g.appendChild(el('div', 'none', '<b>Nothing matches that combination.</b>' +
        'Try another therapist, or ring the clinic on ' + PHONE + '.'));
    }

    list.forEach(function (s) {
      var c = el('button', 'card');
      if (S.svc === s.id) c.dataset.on = '1';
      var meta = [dur(s.mins)];
      if (s.sub) meta.push(s.sub);
      c.innerHTML =
        '<span class="card-top"><span class="card-n">' + s.n + '</span>' +
        '<span class="card-p tnum">' + money(s.price) + '</span></span>' +
        '<span class="card-m">' + meta.map(function (m, i) {
          return i ? '<span>· ' + m + '</span>' : '<span>' + m + '</span>'; }).join('') +
        (s.tag ? '<span class="tag">' + s.tag + '</span>' : '') + '</span>' +
        '<span class="card-o">Their name for it: ' + s.o + '</span>';
      c.onclick = function () {
        S.svc = s.id;
        /* if they came in off "take this one", keep that slot when the new
           treatment still fits it, and go straight to their details */
        if (S.day && S.time != null && slotFree(S.day, S.time, s)) { setStep(4); }
        else { S.day = null; S.time = null; setStep(3); }
      };
      g.appendChild(c);
    });
    b.appendChild(g);

    /* The one condition the clinic really does impose. It belongs beside the
       treatments it applies to — shown only once a treatment is chosen, it is
       never seen, because choosing folds this step away. */
    var anyMust = false;
    for (var q = 0; q < list.length; q++) if (list[q].must) anyMust = true;
    if (anyMust) {
      var w = el('div', 'must');
      w.innerHTML = ICON.warn + '<span><b>A family member must be present.</b> ' +
        'The clinic asks that someone comes with you for the ruqyah session.</span>';
      b.appendChild(w);
    }

    /* toggles that change which menu applies */
    var togs = el('div', 'togs');
    if (S.need !== 'ruqyah') {
      togs.appendChild(toggle('child', 'Booking for a child under 14',
        'Shorter session, £50', S.child, function () {
          S.child = !S.child; S.back = false; S.svc = null; paint();
        }));
    }
    if (S.who === 'f' && S.need === 'pain') {
      togs.appendChild(toggle('back', 'I’ve been treated here before',
        'Follow-up rate, £60', S.back, function () {
          S.back = !S.back; S.svc = null; paint();
        }));
    }
    if (togs.children.length) b.appendChild(togs);
    box.appendChild(b);
  };

  var toggle = function (id, title, sub, on, fn) {
    var t = el('button', 'tog');
    t.setAttribute('aria-pressed', !!on);
    t.innerHTML = '<span class="tog-s"></span><span class="tog-t"><b>' + title +
      '</b><span>' + sub + '</span></span>';
    t.onclick = fn;
    return t;
  };

  /* 4 — when */
  var paintWhen = function () {
    var box = $('s-when');
    if (box.dataset.state === 'done') {
      return fold(box, 'Appointment', dayLong(S.day) + ' at ' + hhmm(S.time), 3);
    }
    if (box.dataset.state === 'wait') { box.innerHTML = ''; box.appendChild(head(4, 'When suits you?')); return; }
    box.innerHTML = '';
    box.appendChild(head(4, 'When suits you?'));
    var b = el('div', 'step-b');
    var svc = svcById(S.svc);

    var strip = el('div', 'days');
    var d = new Date(), chosen = false;
    for (var i = 0; i < 14; i++) {
      var k = ds(d), sh = freeShifts(k, svc), free = 0;
      sh.forEach(function (x) { free += x.times.length; });
      var btn = el('button', 'day');
      btn.setAttribute('aria-pressed', S.day === k);
      var open = (hoursFor(svc)[parse(k).getDay()] || []).length > 0;
      if (!free) btn.disabled = true; else if (!S.day && !chosen) { S.day = k; chosen = true; btn.setAttribute('aria-pressed', 'true'); }
      /* a clinic that is open but fully booked is not closed, and saying so
         sends people away on exactly the days they most want */
      btn.innerHTML = '<i>' + DAYS[parse(k).getDay()].slice(0, 3) + '</i><b>' + parse(k).getDate() + '</b>' +
        '<em>' + (free ? free + ' free' : (!open ? 'closed'
            : (ds(new Date()) === k ? 'too late' : 'full'))) + '</em>';
      (function (kk) { btn.onclick = function () { S.day = kk; S.time = null; paint(); }; })(k);
      strip.appendChild(btn);
      d.setDate(d.getDate() + 1);
    }
    b.appendChild(strip);

    var shifts = S.day ? freeShifts(S.day, svc) : [];
    if (!shifts.length) {
      b.appendChild(el('div', 'none', '<b>Nothing left that day.</b>Pick another from the strip above.'));
    }
    shifts.forEach(function (sh) {
      var w = el('div', 'shift');
      w.appendChild(el('div', 'shift-k', hhmm(sh.from) + ' – ' + hhmm(sh.to)));
      var g = el('div', 'times');
      sh.times.forEach(function (t) {
        var x = el('button', 'time tnum', hhmm(t));
        x.setAttribute('aria-pressed', S.time === t);
        x.onclick = function () { S.time = t; setStep(4); };
        g.appendChild(x);
      });
      w.appendChild(g);
      b.appendChild(w);
    });
    box.appendChild(b);
  };

  /* 5 — who you are */
  var paintYou = function () {
    var box = $('s-you');
    if (box.dataset.state === 'wait') { box.innerHTML = ''; box.appendChild(head(5, 'Last thing')); return; }
    if (box.querySelector('.fields')) return;   /* don't blow away what they typed */
    box.innerHTML = '';
    box.appendChild(head(5, 'Last thing'));
    var b = el('div', 'step-b'), f = el('div', 'fields');
    f.innerHTML =
      '<div class="f" id="f-name"><label for="i-name">Your name</label>' +
      '<input id="i-name" type="text" autocomplete="name" enterkeyhint="next" placeholder="First and last name">' +
      '<span class="err">We need a name for the appointment</span></div>' +
      '<div class="f" id="f-tel"><label for="i-tel">Mobile</label>' +
      '<input id="i-tel" type="tel" autocomplete="tel" inputmode="tel" enterkeyhint="done" placeholder="07…">' +
      '<span class="err">A mobile number, so we can text you the confirmation</span></div>';
    b.appendChild(f);
    b.appendChild(el('p', 'fine',
      'No account, no card. You’ll get a text confirming it, and the clinic will ring if ' +
      'they need anything before your visit.'));
    box.appendChild(b);
    $('i-name').oninput = function () { S.name = this.value; $('f-name').removeAttribute('data-bad'); dock(); };
    $('i-tel').oninput = function () { S.tel = this.value; $('f-tel').removeAttribute('data-bad'); dock(); };
  };

  var head = function (n, t) {
    var h = el('div', 'step-h');
    h.innerHTML = '<span class="n">' + n + '</span><h2>' + t + '</h2>';
    return h;
  };

  /* ── the dock ─────────────────────────────────────────────────────────── */

  var dock = function () {
    var d = $('dock'), t = $('dock-t'), b = $('dock-b');
    var svc = svcById(S.svc);
    var bits = [];
    if (svc) bits.push(svc.n);
    if (S.day && S.time != null) bits.push(dayLong(S.day) + ', ' + hhmm(S.time));
    t.innerHTML = '<b>' + (bits[0] || 'Pick what you need') + '</b>' +
      '<span>' + (bits[1] || (svc ? dur(svc.mins) + ' · ' + money(svc.price) : 'Takes about a minute')) + '</span>';

    if (at < 4) {
      b.textContent = 'Continue';
      b.disabled = true;
      d.style.display = 'none';
      return;
    }
    d.style.display = '';
    b.textContent = 'Confirm booking';
    b.disabled = false;
  };

  /* On a wide screen the dock gives way to a panel that follows you down the
     page, so the booking reads as a running summary rather than a strip. */
  var rail = function () {
    var rows = $('rail-rows');
    if (!rows) return;
    var svc = svcById(S.svc);
    var need = NEEDS.filter(function (x) { return x.id === S.need; })[0];
    var whoTxt = { f: 'A female therapist', m: 'A male therapist',
                   any: 'First available' }[S.who];
    var set = [
      ['Looking for', need ? need.n : null],
      ['Treatment',   svc ? svc.n : null],
      ['Seeing',      whoTxt || null],
      ['When',        (S.day && S.time != null)
                        ? dayLong(S.day) + ', ' + hhmm(S.time) : null]
    ];
    rows.innerHTML = '';
    set.forEach(function (r) {
      var d = el('div');
      d.innerHTML = '<dt>' + r[0] + '</dt><dd class="' + (r[1] ? '' : 'dim') +
                    '">' + (r[1] || 'Not yet') + '</dd>';
      rows.appendChild(d);
    });
    $('rail-total').textContent = svc ? money(svc.price) : '\u2014';
    $('rail-dur').textContent = svc ? dur(svc.mins) + ' \u00b7 pay at the clinic' : '';
    $('rail-b').disabled = !(at >= 4 && svc && S.day && S.time != null);
  };

  /* their header is transparent over the dark hero and goes white once you
     scroll past it, so this mirrors that */
  var stick = function () {
    var b = $('bar');
    if (!b) return;
    if (document.body.dataset.done === '1' || window.scrollY > 24) {
      b.setAttribute('data-stuck', '1');
    } else {
      b.removeAttribute('data-stuck');
    }
  };

  var confirm = function () {
    var ok = true;
    if (!S.name.trim()) { $('f-name').dataset.bad = '1'; ok = false; }
    if (S.tel.replace(/\D/g, '').length < 10) { $('f-tel').dataset.bad = '1'; ok = false; }
    if (!ok) { ($('f-name').dataset.bad ? $('i-name') : $('i-tel')).focus(); return; }

    var svc = svcById(S.svc);
    var who = { f: 'a female therapist', m: 'a male therapist', any: 'first available therapist' }[S.who];
    $('r-what').textContent = svc.n;
    $('r-when').textContent = dayLong(S.day) + ' at ' + hhmm(S.time);
    $('r-who').textContent = who;
    $('r-cost').textContent = money(svc.price) + ' · ' + dur(svc.mins) + ' · pay at the clinic';
    $('r-tel').textContent = S.tel;
    $('r-note').parentNode.style.display = svc.must ? '' : 'none';
    document.body.dataset.done = '1';
    stick();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── hero ─────────────────────────────────────────────────────────────── */

  var paintHero = function () {
    var n = nextOpening(null);
    if (!n) return;
    $('soon-when').textContent = dayLong(n.day) + ', ' + hhmm(n.time);
    $('soon-what').textContent = 'The clinic is closed Mondays and Fridays, so this is the next one.';
    $('soon-take').onclick = function () {
      S.day = n.day; S.time = n.time;
      scrollToY($('flow').getBoundingClientRect().top + window.scrollY - barBottom());
      setStep(0);
    };
  };

  /* ── boot ─────────────────────────────────────────────────────────────── */

  var paint = function () {
    paintNeed(); paintWho(); paintSvc(); paintWhen(); paintYou(); dock(); rail();
  };

  var todayHours = function () {
    var t = new Date().getDay();
    var rows = document.querySelectorAll('.f-hrs [data-d]');
    for (var i = 0; i < rows.length; i++) {
      if (+rows[i].dataset.d === t) rows[i].setAttribute('data-today', '1');
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    paintHero();
    setStep(0);
    todayHours();
    $('dock-b').onclick = confirm;
    $('rail-b').onclick = confirm;
    $('again').onclick = function () { location.reload(); };
    window.addEventListener('scroll', stick, { passive: true });
    stick();
  });
})();
