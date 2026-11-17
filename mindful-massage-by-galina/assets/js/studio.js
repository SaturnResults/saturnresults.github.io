/* Mindful Massage by Galina — the studio side (demo).

   The diary is laid out the way the real Simple Bookings staff calendar is:
   60px to the hour, appointments placed absolutely by start minute and
   duration, hatched shading outside working hours, a red now line. Her real
   treatments, prices and opening hours drive it.

   Everything else is a week of invented appointments, generated from a fixed
   seed so the diary is the same every time it is opened. No names here belong
   to anyone. */
(function () {
  'use strict';

  var B = {
    name: 'Mindful Massage by Galina',
    /* her real week, off Treatwell. getDay(): 0 Sun … 6 Sat. Tuesday is closed. */
    hours: { 0: [10, 20], 1: [12, 20], 2: null, 3: [10, 20], 4: [10, 20], 5: [10, 20], 6: [11, 21] },
    dayStart: 9, dayEnd: 22      /* the window the diary draws */
  };

  /* Her menu, as listed on Treatwell. kind drives the block colour. */
  var SERVICES = [
    { id: 1, name: 'Signature Full Body Massage', kind: 'massage', durs: [[60, 79], [70, 89], [80, 99], [90, 109], [100, 119], [110, 129], [120, 139]] },
    { id: 2, name: 'Deep Tissue Massage', kind: 'deep', durs: [[60, 89], [70, 99], [80, 109], [90, 119], [100, 129], [110, 139]] },
    { id: 3, name: 'Swedish Massage', kind: 'massage', durs: [[60, 69], [70, 79], [80, 89], [90, 99], [100, 109]] },
    { id: 4, name: 'Back and Neck Massage', kind: 'short', durs: [[30, 45]] },
    { id: 5, name: 'Back, Neck & Shoulders Massage', kind: 'short', durs: [[40, 55]] },
    { id: 6, name: 'Back, Neck, Shoulders, Arm and Head', kind: 'short', durs: [[50, 65]] },
    { id: 7, name: 'Foot Massage', kind: 'short', durs: [[30, 35]] },
    { id: 8, name: 'Foot & Leg Massage', kind: 'short', durs: [[40, 55]] },
    { id: 9, name: 'Foot, Leg and Glute Massage', kind: 'short', durs: [[50, 65]] },
    { id: 10, name: 'Pregnancy Massage', kind: 'preg', durs: [[60, 75], [70, 85], [80, 95]] },
    { id: 11, name: 'Anti-Cellulite Massage', kind: 'short', durs: [[45, 65]] }
  ];

  /* Invented clients. Nothing here is a real person or a real record.
     The roster is built once from the two pools so it is the same on every
     load, and it is deliberately large: a regular comes every few weeks, so a
     book of sixty gives believable visit counts rather than one client
     apparently coming twice a week all year. */
  var FIRST = ['Megan', 'Sofia', 'Tom', 'Priya', 'Bogdan', 'Hannah', 'James', 'Claire', 'Rachel',
    'Daniel', 'Nina', 'Alex', 'Yasmin', 'Martin', 'Elena', 'Ruth', 'Oliver', 'Carla', 'Imogen',
    'Hassan', 'Freya', 'Nikolai', 'Aisling', 'Paul', 'Lucia', 'Devon', 'Marta', 'Gregor'];
  var LAST = ['Fairbrother', 'Renzi', 'Alderton', 'Nair', 'Iliev', 'Crowe', 'Okafor', 'Beaumont',
    'Lindqvist', 'Osei', 'Petrova', 'Whitfield', 'Haddad', 'Doyle', 'Castellani', 'Amankwah',
    'Stead', 'Mendes', 'Kowalski', 'Ferreira', 'Boateng', 'Lindgren'];
  var NAMES = (function () {
    var r = seedOf('mmg:roster'), seen = {}, out = [];
    while (out.length < 60) {
      var n = FIRST[Math.floor(r() * FIRST.length)] + ' ' + LAST[Math.floor(r() * LAST.length)];
      if (!seen[n]) { seen[n] = 1; out.push(n); }
    }
    return out;
  })();

  /* ---------------- helpers ---------------- */
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var money = function (n) { return '£' + n; };
  var durL = function (m) {
    if (m < 60) return m + ' min';
    var h = Math.floor(m / 60), r = m % 60;
    return h + ' hr' + (r ? ' ' + r + ' min' : '');
  };
  var hhmm = function (m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); };
  var t12 = function (m) {
    var h = Math.floor(m / 60), mm = m % 60, ap = h < 12 ? 'am' : 'pm';
    h = h % 12 || 12;
    return h + (mm ? ':' + ('0' + mm).slice(-2) : '') + ap;
  };
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var iso = function (d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  };
  var parse = function (s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  var initials = function (n) { return n.split(' ').map(function (p) { return p[0]; }).join('').slice(0, 2); };

  /* declared, not assigned, so the roster above can use it */
  function seedOf(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h = Math.imul(h ^ (h >>> 15), 2246822507); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
  }

  var today = new Date(); today.setHours(0, 0, 0, 0);
  var monday = function (d) {
    var x = new Date(d), off = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - off); return x;
  };

  /* ---------------- the diary ---------------- */
  /* A day of appointments, deterministic from the date so it never reshuffles. */
  var dayBookings = function (date) {
    var d = parse(date), h = B.hours[d.getDay()];
    if (!h) return [];
    var r = seedOf('mmg:' + date), out = [], at = h[0] * 60;
    var close = h[1] * 60;
    /* start a little into the day sometimes, so mornings are not always full */
    at += [0, 0, 30, 60, 90][Math.floor(r() * 5)];
    while (at < close - 30) {
      /* gaps are generous on purpose: one therapist doing 60 to 90 minute
         massages books four or five a day, not back to back all afternoon */
      if (r() < 0.36) { at += 30; continue; }
      var s = SERVICES[Math.floor(r() * SERVICES.length)];
      var dur = s.durs[Math.floor(r() * s.durs.length)];
      if (at + dur[0] > close) break;
      out.push({
        start: at, mins: dur[0], price: dur[1], svc: s,
        who: NAMES[Math.floor(r() * NAMES.length)],
        cancelled: r() < 0.05,
        paid: true
      });
      at += dur[0] + (r() < 0.5 ? 15 : 30);                   /* turnaround */
    }
    return out;
  };

  var weekOf = function (mon) {
    var out = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(mon); d.setDate(d.getDate() + i);
      var k = iso(d);
      out.push({ date: k, d: d, hours: B.hours[d.getDay()], bookings: dayBookings(k) });
    }
    return out;
  };

  var S = { view: 'diary', mon: monday(today), clientFilter: 'All' };

  /* ---------------- diary view ---------------- */
  function renderDiary() {
    var wk = weekOf(S.mon), px = 60, top = B.dayStart * 60, h = (B.dayEnd - B.dayStart) * 60;
    var last = new Date(S.mon); last.setDate(last.getDate() + 6);
    var range = S.mon.getDate() + ' ' + MON[S.mon.getMonth()] +
      ' – ' + last.getDate() + ' ' + MON[last.getMonth()] + ' ' + last.getFullYear();
    document.getElementById('calRange').textContent = range;

    var gut = '<div class="gut"><div class="colh"></div><div class="body" style="height:' + h + 'px">';
    for (var hr = B.dayStart; hr <= B.dayEnd; hr++) {
      gut += '<span style="top:' + ((hr - B.dayStart) * px) + 'px">' + t12(hr * 60) + '</span>';
    }
    gut += '</div></div>';

    var nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    var cols = wk.map(function (day) {
      var isToday = day.date === iso(today);
      var body = '';
      if (!day.hours) {
        body += '<div class="shade" style="top:0;height:' + h + 'px"></div>';
      } else {
        var o = day.hours[0] * 60 - top, c = day.hours[1] * 60 - top;
        if (o > 0) body += '<div class="shade" style="top:0;height:' + o + 'px"></div>';
        if (c < h) body += '<div class="shade" style="top:' + c + 'px;height:' + (h - c) + 'px"></div>';
      }
      day.bookings.forEach(function (b, i) {
        var past = isToday ? b.start + b.mins < nowMin : day.d < today;
        body += '<button type="button" class="blk blk--' + b.svc.kind + (past ? ' done' : '') +
          (b.cancelled ? ' cancelled' : '') + '" data-bk="' + day.date + ':' + i + '"' +
          ' style="top:' + (b.start - top) + 'px;height:' + (b.mins - 2) + 'px">' +
          '<b>' + esc(t12(b.start)) + ' ' + esc(b.who.split(' ')[0]) + '</b>' +
          (b.mins >= 45 ? '<span>' + esc(b.svc.name) + '</span>' : '') +
          (b.mins >= 70 ? '<em>' + esc(durL(b.mins)) + ' · ' + money(b.price) + '</em>' : '') +
          '</button>';
      });
      if (isToday && nowMin > top && nowMin < B.dayEnd * 60) {
        body += '<div class="now" style="top:' + (nowMin - top) + 'px"></div>';
      }
      return '<div class="col"><div class="colh' + (isToday ? ' is-today' : '') + (day.hours ? '' : ' is-shut') + '">' +
        '<strong>' + DAYS[day.d.getDay()] + ' ' + day.d.getDate() + '</strong>' +
        '<small>' + (day.hours ? day.bookings.filter(function (b) { return !b.cancelled; }).length + ' booked' : 'Closed') + '</small>' +
        '</div><div class="body" style="height:' + h + 'px">' + body + '</div></div>';
    }).join('');

    document.getElementById('cal').innerHTML = '<div class="cal-in">' + gut + cols + '</div>';

    /* the numbers above it */
    var all = wk.reduce(function (a, d) { return a.concat(d.bookings); }, [])
      .filter(function (b) { return !b.cancelled; });
    var take = all.reduce(function (a, b) { return a + b.price; }, 0);
    var mins = all.reduce(function (a, b) { return a + b.mins; }, 0);
    var r = seedOf('new:' + iso(S.mon));
    var fresh = Math.max(1, Math.round(all.length * (0.18 + r() * 0.14)));
    /* 35% + VAT is Treatwell's published commission on a new client's first
       booking. Shown on the average treatment price for this week. */
    var avg = all.length ? take / all.length : 0;
    var comm = Math.round(fresh * avg * 0.35 * 1.2);

    document.getElementById('stats').innerHTML =
      stat('Appointments', all.length, wk.filter(function (d) { return d.hours; }).length + ' working days') +
      stat('Hours booked', (mins / 60).toFixed(1), 'across the week') +
      stat('Taken', money(take.toLocaleString('en-GB')), 'before card fees') +
      stat('New clients', fresh, 'first visit this week') +
      '<div class="stat stat--note"><span>Kept, not commissioned</span><b>' + money(comm.toLocaleString('en-GB')) +
      '</b><em>What ' + fresh + ' new clients at 35% + VAT would have cost on a marketplace</em></div>';

    /* up next, skipping today if she is closed */
    var next = null;
    for (var i = 0; i < wk.length && !next; i++) {
      if (!wk[i].hours) continue;
      if (wk[i].d < today) continue;
      var list = wk[i].bookings.filter(function (b) {
        return !b.cancelled && (wk[i].date !== iso(today) || b.start > nowMin);
      });
      if (list.length) next = { day: wk[i], list: list.slice(0, 5) };
    }
    var un = document.getElementById('upnext');
    if (!next) {
      un.innerHTML = '<p class="muted" style="margin-top:12px">Nothing left this week.</p>';
    } else {
      var lbl = next.day.date === iso(today) ? 'Later today'
        : FULL[next.day.d.getDay()] + ' ' + next.day.d.getDate() + ' ' + MON[next.day.d.getMonth()];
      un.innerHTML = '<p class="muted">' + esc(lbl) + '</p><ul class="upnext">' + next.list.map(function (b) {
        return '<li><time>' + esc(t12(b.start)) + '</time><div>' +
          '<b>' + esc(b.who) + '</b><span>' + esc(b.svc.name + ' · ' + durL(b.mins)) + '</span></div></li>';
      }).join('') + '</ul>';
    }
  }
  function stat(label, value, note) {
    return '<div class="stat"><span>' + esc(label) + '</span><b>' + esc(value) + '</b><em>' + esc(note) + '</em></div>';
  }

  /* ---------------- bookings table ---------------- */
  function renderBookings() {
    var rows = [];
    for (var i = -3; i < 11; i++) {
      var d = new Date(today); d.setDate(d.getDate() + i);
      dayBookings(iso(d)).forEach(function (b) { rows.push({ d: d, b: b }); });
    }
    document.getElementById('bookingsBody').innerHTML = rows.map(function (r) {
      var b = r.b, past = r.d < today;
      return '<tr><td><div class="who"><span class="av">' + esc(initials(b.who)) + '</span><div><b>' +
        esc(b.who) + '</b><span class="sub">' + esc(b.svc.name) + '</span></div></div></td>' +
        '<td><b>' + DAYS[r.d.getDay()] + ' ' + r.d.getDate() + ' ' + MON[r.d.getMonth()] + '</b>' +
        '<span class="sub">' + esc(t12(b.start) + ' – ' + t12(b.start + b.mins)) + '</span></td>' +
        '<td>' + esc(durL(b.mins)) + '</td>' +
        '<td><span class="pill ' + (b.cancelled ? 'cancelled' : past ? '' : 'confirmed') + '">' +
        (b.cancelled ? 'Cancelled' : past ? 'Completed' : 'Confirmed') + '</span></td>' +
        '<td class="num"><b>' + money(b.price) + '</b></td></tr>';
    }).join('');
  }

  /* ---------------- clients ---------------- */
  function renderClients() {
    var tally = {};
    for (var i = -120; i < 14; i++) {
      var d = new Date(today); d.setDate(d.getDate() + i);
      dayBookings(iso(d)).forEach(function (b) {
        if (b.cancelled) return;
        var t = tally[b.who] || (tally[b.who] = { visits: 0, spend: 0, last: null, fav: {} });
        t.visits++; t.spend += b.price;
        if (d <= today && (!t.last || d > t.last)) t.last = new Date(d);
        t.fav[b.svc.name] = (t.fav[b.svc.name] || 0) + 1;
      });
    }
    var list = Object.keys(tally).map(function (n) {
      var t = tally[n];
      var fav = Object.keys(t.fav).sort(function (a, b) { return t.fav[b] - t.fav[a]; })[0];
      return { name: n, visits: t.visits, spend: t.spend, last: t.last, fav: fav };
    }).sort(function (a, b) { return b.spend - a.spend; });

    document.getElementById('clientCount').textContent = list.length + ' clients';
    document.getElementById('clientsBody').innerHTML = list.map(function (c) {
      return '<tr><td><div class="who"><span class="av">' + esc(initials(c.name)) + '</span><div><b>' +
        esc(c.name) + '</b><span class="sub">' + esc(c.fav) + '</span></div></div></td>' +
        '<td class="num">' + c.visits + '</td>' +
        '<td>' + (c.last ? DAYS[c.last.getDay()] + ' ' + c.last.getDate() + ' ' + MON[c.last.getMonth()] : '—') + '</td>' +
        '<td class="num"><b>' + money(c.spend.toLocaleString('en-GB')) + '</b></td></tr>';
    }).join('');
  }

  /* ---------------- treatments & hours ---------------- */
  function renderTreatments() {
    document.getElementById('treatments').innerHTML = SERVICES.map(function (s) {
      return '<div class="card"><h3>' + esc(s.name) + '</h3>' +
        '<p>' + s.durs.length + (s.durs.length === 1 ? ' length' : ' lengths') + ' bookable</p>' +
        '<div class="durs">' + s.durs.map(function (d) {
          return '<span><b>' + esc(durL(d[0])) + '</b> · ' + money(d[1]) + '</span>';
        }).join('') + '</div></div>';
    }).join('');

    document.getElementById('hours').innerHTML = [1, 2, 3, 4, 5, 6, 0].map(function (i) {
      var h = B.hours[i];
      return '<div class="hourrow' + (h ? '' : ' shut') + '"><b>' + FULL[i] + '</b>' +
        '<span class="times">' + (h ? hhmm(h[0] * 60) + ' – ' + hhmm(h[1] * 60) : 'Closed') + '</span></div>';
    }).join('');
  }

  /* ---------------- new booking drawer ---------------- */
  function freeTimes() {
    var box = document.getElementById('free');
    var svc = +document.getElementById('nbSvc').value, date = document.getElementById('nbDate').value;
    if (!svc || !date) { box.innerHTML = '<em>Pick a treatment and a day.</em>'; return; }
    var s = SERVICES.filter(function (x) { return x.id === svc; })[0];
    var mins = +document.getElementById('nbDur').value || s.durs[0][0];
    var any = document.getElementById('nbAny').checked;
    var d = parse(date), h = B.hours[d.getDay()];
    if (!h && !any) {
      box.innerHTML = '<em>Closed on ' + FULL[d.getDay()] + 's. Tick “allow outside working hours” to book anyway.</em>';
      return;
    }
    /* with the tick on, the whole drawn day opens up and clashes are allowed:
       that is how she squeezes in a regular on her day off */
    var from = any ? B.dayStart * 60 : h[0] * 60;
    var to = any ? B.dayEnd * 60 : h[1] * 60;
    var taken = dayBookings(date).filter(function (b) { return !b.cancelled; });
    var out = [];
    for (var m = from; m + mins <= to; m += 15) {
      var clash = !any && taken.some(function (b) { return m < b.start + b.mins && b.start < m + mins; });
      if (!clash) out.push(m);
    }
    box.innerHTML = out.length
      ? out.map(function (m) {
        var over = taken.some(function (b) { return m < b.start + b.mins && b.start < m + mins; });
        return '<button type="button" data-t="' + m + '"' + (over ? ' title="Overlaps an existing booking"' : '') + '>' +
          t12(m) + (over ? ' · busy' : '') + '</button>';
      }).join('')
      : '<em>Nothing free that day at ' + durL(mins) + '. Try a shorter length, or tick “allow outside working hours”.</em>';
  }

  function fillDurations() {
    var s = SERVICES.filter(function (x) { return x.id === +document.getElementById('nbSvc').value; })[0];
    var sel = document.getElementById('nbDur');
    sel.innerHTML = s ? s.durs.map(function (d) {
      return '<option value="' + d[0] + '">' + durL(d[0]) + ' · ' + money(d[1]) + '</option>';
    }).join('') : '';
  }

  function setDrawer(on) {
    document.getElementById('drawer').classList.toggle('on', on);
    document.getElementById('scrim').classList.toggle('on', on);
    if (on) document.getElementById('nbName').focus();
  }

  var toastT;
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 3200);
  }

  /* ---------------- shell ---------------- */
  function show(v) {
    S.view = v;
    [].forEach.call(document.querySelectorAll('.view'), function (n) { n.classList.toggle('on', n.id === 'view-' + v); });
    [].forEach.call(document.querySelectorAll('.side__nav button'), function (b) {
      b.setAttribute('aria-current', b.dataset.view === v ? 'true' : 'false');
    });
    var t = { diary: ['Diary', 'Your week at a glance'], bookings: ['Bookings', 'Everything booked, past and upcoming'],
      clients: ['Clients', 'Who comes in, how often, and what they book'],
      treatments: ['Treatments & hours', 'What you offer and when you are open'] }[v];
    document.getElementById('title').textContent = t[0];
    document.getElementById('subtitle').textContent = t[1];
    if (v === 'bookings') renderBookings();
    if (v === 'clients') renderClients();
    if (v === 'treatments') renderTreatments();
  }

  function boot() {
    [].forEach.call(document.querySelectorAll('.side__nav button'), function (b) {
      b.addEventListener('click', function () { show(b.dataset.view); });
    });
    document.getElementById('prevWeek').addEventListener('click', function () {
      S.mon.setDate(S.mon.getDate() - 7); renderDiary();
    });
    document.getElementById('nextWeek').addEventListener('click', function () {
      S.mon.setDate(S.mon.getDate() + 7); renderDiary();
    });
    document.getElementById('thisWeek').addEventListener('click', function () {
      S.mon = monday(today); renderDiary();
    });
    document.getElementById('cal').addEventListener('click', function (e) {
      var b = e.target.closest('[data-bk]');
      if (!b) return;
      var p = b.dataset.bk.split(':'), bk = dayBookings(p[0])[+p[1]];
      toast(bk.who + ' · ' + bk.svc.name + ' · ' + durL(bk.mins) + ' · ' + money(bk.price));
    });

    document.getElementById('newBooking').addEventListener('click', function () { setDrawer(true); });
    document.getElementById('closeDrawer').addEventListener('click', function () { setDrawer(false); });
    document.getElementById('cancelDrawer').addEventListener('click', function () { setDrawer(false); });
    document.getElementById('scrim').addEventListener('click', function () { setDrawer(false); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') setDrawer(false); });

    document.getElementById('nbSvc').innerHTML = SERVICES.map(function (s) {
      return '<option value="' + s.id + '">' + esc(s.name) + '</option>';
    }).join('');
    var d = new Date(today); d.setDate(d.getDate() + 1);
    document.getElementById('nbDate').value = iso(d);
    fillDurations(); freeTimes();

    document.getElementById('nbSvc').addEventListener('change', function () { fillDurations(); freeTimes(); });
    document.getElementById('nbDur').addEventListener('change', freeTimes);
    document.getElementById('nbDate').addEventListener('change', freeTimes);
    document.getElementById('nbAny').addEventListener('change', freeTimes);
    document.getElementById('free').addEventListener('click', function (e) {
      var b = e.target.closest('[data-t]');
      if (!b) return;
      [].forEach.call(this.querySelectorAll('.on'), function (x) { x.classList.remove('on'); });
      b.classList.add('on');
    });
    document.getElementById('saveBooking').addEventListener('click', function () {
      var n = document.getElementById('nbName').value.trim();
      var t = document.querySelector('#free .on');
      if (!n) { document.getElementById('nbName').focus(); return toast('Add a client name first.'); }
      if (!t) return toast('Pick a time first.');
      setDrawer(false);
      toast('Demo only — nothing was saved. On the live system ' + n.split(' ')[0] + ' would get a confirmation.');
    });

    show('diary');
    renderDiary();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
