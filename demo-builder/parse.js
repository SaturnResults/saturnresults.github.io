/* ───────────────────────────────────────────────────────────────────────────
   Quick fill — reads a pasted listing page

   Select-all, copy on a Fresha, Treatwell or Booksy page and the text comes
   out as one item per line: a treatment's name, then its length and price in
   either order, wrapped in buttons and promo lines. This walks those lines
   and keeps what it can be sure of. It never guesses a number: anything it
   cannot read is left blank for a person to fill in.
   ─────────────────────────────────────────────────────────────────────────── */
(function (root) {
  'use strict';

  var DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  var UNIT_H = '(?:h|hr|hrs|hour|hours)\\.?';
  var UNIT_M = '(?:m|min|mins|minute|minutes)\\.?';
  var ONE_DUR = '(?:\\d+\\s*' + UNIT_H + '(?:\\s*\\d+\\s*' + UNIT_M + ')?|\\d+\\s*' + UNIT_M + ')';
  var DUR_LINE = new RegExp('^' + ONE_DUR + '(?:\\s*(?:-|–|—|to)\\s*' + ONE_DUR + ')?$', 'i');
  var DUR_ANY = new RegExp('\\b' + ONE_DUR + '(?:\\s*(?:-|–|—|to)\\s*' + ONE_DUR + ')?\\b', 'i');
  var PRICE_LINE = /^(?:from\s*)?(?:£\s?\d[\d,]*(?:\.\d{1,2})?\+?\s*)+$/i;
  var PRICE_ANY = /(?:from\s*)?£\s?\d[\d,]*(?:\.\d{1,2})?\+?(?:\s*£\s?\d[\d,]*(?:\.\d{1,2})?\+?)?/i;
  var POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/;

  var NOISE = new RegExp('^(?:' + [
    'book', 'book now', 'select', 'selected', 'show details', 'details', 'see all', 'see more',
    'read more', 'show more', 'view', 'add', 'choose', '•', '·', '\\|', '\\+\\d+', '-',
    'save up to \\d+%', 'save \\d+%', 'lowest price in 30 days.*', 'sponsored',
    'popular services', 'popular', 'featured', 'services', 'all', 'price varies',
    'show all photos', 'photos', 'verified review', 'report', 'go back', 'share', 'new',
    'last minute', 'browse services', 'deal', 'offer', 'promo', '\\d+% off'
  ].join('|') + ')$', 'i');

  /* stop words for team and name scans: the section headings on all three */
  var SECTION = /^(?:reviews?|venue reviews|about|about us|opening times|opening hours|business hours|location|amenities|additional information|services|venue awards|payment methods|packages|social media|team|meet the team)$/i;

  var clean = function (s) {
    return String(s).replace(/\u00a0/g, ' ').replace(/ +/g, ' ').replace(/^[ \t]+|[ \t]+$/g, '');
  };

  var toMins = function (s) {
    var h = /(\d+)\s*h/i.exec(s), m = /(\d+)\s*m/i.exec(s);
    var t = (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0);
    return t || null;
  };
  var parseDur = function (s) {
    var parts = s.split(/\s*(?:-|–|—|\bto\b)\s*/i).filter(Boolean);
    var a = toMins(parts[0]), b = parts[1] ? toMins(parts[1]) : null;
    return { mins: a, maxMins: b && b > a ? b : null };
  };
  var parsePrice = function (s) {
    var amts = [], m, re = /£\s?(\d[\d,]*(?:\.\d{1,2})?)/g;
    while ((m = re.exec(s))) amts.push(parseFloat(m[1].replace(/,/g, '')));
    if (!amts.length) return /^free$/i.test(s.trim()) ? { price: 0 } : null;
    var out = { price: amts[amts.length - 1] };
    if (amts.length > 1 && amts[0] > out.price) out.was = amts[0];
    if (/^\s*from/i.test(s) || /\+/.test(s)) out.from = true;
    return out;
  };

  /* ── treatments ───────────────────────────────────────────────────────── */

  var parseServices = function (lines) {
    var out = [], cat = null, text = [], dur = null, price = null, bounded = false;
    var counts = {};
    lines.forEach(function (l) { counts[l] = (counts[l] || 0) + 1; });
    var names = {};

    var close = function () {
      if ((dur || price) && text.length) {
        var name, desc = '';
        var t = text.slice();
        /* Fresha prints each category as a heading that also sits in its tab
           bar, so a short line seen twice ahead of a name is the category */
        if (bounded && t.length >= 2 && counts[t[0]] >= 2 && t[0].length <= 40 && !names[t[0]]) {
          cat = t.shift();
        }
        if (bounded && t.length <= 3) { name = t[0]; desc = t.slice(1).join(' '); }
        else { name = t[t.length - 1]; }
        if (name && name.length <= 140) {
          var item = { cat: cat || 'Treatments', name: name };
          if (dur) { item.mins = dur.mins; if (dur.maxMins) item.maxMins = dur.maxMins; }
          if (price) { item.price = price.price; if (price.was) item.was = price.was; if (price.from) item.from = true; }
          if (desc && desc.length <= 300) item.desc = desc;
          out.push(item);
          names[name] = 1;
        }
      }
      text = []; dur = null; price = null; bounded = true;
    };

    for (var i = 0; i < lines.length; i++) {
      var l = lines[i], next = lines[i + 1] || '';
      var tw = /^(.+?)\s*\((\d+)\)$/.exec(l);

      if (/^\d+\s+services?$/i.test(next) && !PRICE_LINE.test(l) && !DUR_LINE.test(l)) {
        close(); cat = l; i++; continue;                       /* Booksy */
      }
      if (tw && !/\d/.test(tw[1]) && tw[1].length <= 50) {
        close(); cat = tw[1]; continue;                        /* Treatwell */
      }
      if (/^lowest price in 30 days/i.test(l) || NOISE.test(l)) continue;
      if (PRICE_LINE.test(l) || /^free$/i.test(l)) {
        if (price) close();
        price = parsePrice(l);
        if (dur) close();
        continue;
      }
      if (DUR_LINE.test(l)) {
        if (dur) close();
        dur = parseDur(l);
        if (price) close();
        continue;
      }

      /* a whole treatment on one line: "Sports massage, 60 min, £55" or a
         row pasted out of a spreadsheet */
      var cells = l.split('\t').map(clean).filter(Boolean);
      if (cells.length >= 3) {
        var num = cells.filter(function (c) { return /^(?:£\s?)?\d+(?:\.\d{1,2})?(?:\s*(?:min|mins|m))?$/i.test(c); });
        if (num.length >= 2) {
          if (dur || price) close();
          var words = cells.filter(function (c) { return num.indexOf(c) < 0; });
          var row = { cat: words.length > 1 ? words[0] : (cat || 'Treatments'), name: words[words.length - 1] };
          var mm = num[0].replace(/[^\d.]/g, ''), pp = num[1].replace(/[^\d.]/g, '');
          if (/£/.test(num[0]) && !/£/.test(num[1])) { var sw = mm; mm = pp; pp = sw; }
          row.mins = Math.round(+mm) || null;
          row.price = parseFloat(pp);
          out.push(row);
          text = []; bounded = true;
          continue;
        }
      }
      var pm = PRICE_ANY.exec(l), dm = DUR_ANY.exec(l);
      if (pm && dm) {
        if (dur || price) close();
        if (text.length && text[text.length - 1].length <= 40) cat = text[text.length - 1];
        var nm = clean(l.replace(pm[0], ' ').replace(dm[0], ' ').replace(/[()\[\]|]/g, ' ')
          .replace(/\s*[-–—,:·•]\s*(?=[-–—,:·•]|$)/g, ' ').replace(/^[-–—,:·•\s]+|[-–—,:·•\s]+$/g, ''));
        if (nm) {
          var one = { cat: cat || 'Treatments', name: nm };
          var d1 = parseDur(dm[0]), p1 = parsePrice(pm[0]);
          one.mins = d1.mins; if (d1.maxMins) one.maxMins = d1.maxMins;
          if (p1) { one.price = p1.price; if (p1.was) one.was = p1.was; if (p1.from) one.from = true; }
          out.push(one);
        }
        text = []; bounded = true;
        continue;
      }

      if (dur || price) close();
      text.push(l);
    }
    close();

    /* the "popular" or "featured" strip repeats treatments listed again
       under their own category, so keep one of each and prefer the category */
    var seen = {}, res = [];
    out.forEach(function (t) {
      var k = t.name.toLowerCase() + '|' + (t.mins || '') + '|' + (t.price == null ? '' : t.price);
      if (seen[k]) {
        if (/^(treatments|featured|popular.*)$/i.test(seen[k].cat) && !/^(treatments|featured|popular.*)$/i.test(t.cat)) seen[k].cat = t.cat;
        return;
      }
      seen[k] = t;
      res.push(t);
    });
    return res;
  };

  /* ── opening hours ────────────────────────────────────────────────────── */

  /* "9", "9am", "9:30", "17:00", "6:00 PM" → minutes, with am/pm if given */
  var parseClock = function (s) {
    var m = /^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/i.exec(clean(s).toLowerCase());
    if (!m) return null;
    var h = +m[1], mi = m[2] ? +m[2] : 0, ap = m[3] ? m[3][0] : null;
    if (h > 24 || mi > 59) return null;
    if (ap === 'p' && h < 12) h += 12;
    if (ap === 'a' && h === 12) h = 0;
    return { m: h * 60 + mi, ap: ap, h24: !ap && (h > 12 || /^0\d/.test(m[1]) || (m[2] && h >= 13)) };
  };

  /* "10am–2pm, 4–6pm" → [[600,840],[960,1080]]; "Closed" or blank → [] */
  var parseHoursText = function (s) {
    s = clean(s || '');
    if (!s || /^(closed|shut|off|-|–)$/i.test(s)) return [];
    var out = [];
    var ranges = s.split(/\s*(?:,|&|\band\b|;)\s*/i).filter(Boolean);
    for (var i = 0; i < ranges.length; i++) {
      var p = ranges[i].split(/\s*(?:-|–|—|\bto\b|till|until)\s*/i);
      if (p.length !== 2) return null;
      var a = parseClock(p[0]), b = parseClock(p[1]);
      if (!a || !b) return null;
      var am = a.m, bm = b.m;
      /* nobody opens at one in the morning: "1-5" and "6-8pm" are afternoon
         and evening, and "10-2" or "9-6" run past midday */
      if (!a.ap && !a.h24 && am < 420 && (b.ap === 'p' || (!b.ap && !b.h24))) am += 720;
      if (!b.ap && !b.h24 && bm <= am) bm += 720;
      if (bm <= am) return null;
      out.push([am, bm]);
    }
    return out;
  };

  var fmtClock = function (m) {
    var h = Math.floor(m / 60), x = m % 60, ap = h >= 12 && h < 24 ? 'pm' : 'am';
    var hr = h % 12; if (hr === 0) hr = 12;
    return hr + (x ? ':' + ('0' + x).slice(-2) : '') + ap;
  };
  var fmtHours = function (ranges) {
    if (!ranges || !ranges.length) return 'Closed';
    return ranges.map(function (r) { return fmtClock(r[0]) + '–' + fmtClock(r[1]); }).join(', ');
  };

  var parseWeek = function (joined) {
    var T = '\\d{1,2}(?:[:.]\\d{2})?\\s*(?:am|pm)?';
    var R = T + '\\s*(?:-|–|—|to)\\s*' + T;
    var re = new RegExp('\\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\\.?\\s*:?\\s*(closed|' + R + '(?:\\s*(?:,|&|and)\\s*' + R + ')*)', 'gi');
    var week = [null, null, null, null, null, null, null], m, n = 0;
    while ((m = re.exec(joined))) {
      var d = DAY_KEYS.indexOf(m[1].toLowerCase());
      if (d < 0 || week[d] != null) continue;
      var r = parseHoursText(m[2]);
      if (r == null) continue;
      week[d] = fmtHours(r);
      n++;
    }
    if (n < 4) return null;
    return week.map(function (w) { return w == null ? 'Closed' : w; });
  };

  /* ── everything else ──────────────────────────────────────────────────── */

  var parseTeam = function (lines) {
    var team = [], seen = {};
    var push = function (n, r) {
      n = clean(n);
      if (!n || seen[n.toLowerCase()] || n.length > 40 || /\d/.test(n)) return;
      seen[n.toLowerCase()] = 1;
      team.push({ name: n, role: r ? clean(r) : '' });
    };
    for (var i = 0; i < lines.length; i++) {
      if (!/^(team|meet the team|our team|the team|staff)$/i.test(lines[i])) continue;
      for (var j = i + 1; j < Math.min(lines.length, i + 60); j++) {
        var l = lines[j];
        if (/^see all$/i.test(l)) continue;
        if (SECTION.test(l)) break;
        if (/^[A-Z]{1,3}$/.test(l) && lines[j + 1]) {
          var name = lines[j + 1], role = lines[j + 2] || '';
          var roleOk = role && !/^[A-Z]{1,3}$/.test(role) && !/^[1-5][.,]\d$/.test(role) &&
            !SECTION.test(role) && !/^see all$/i.test(role) && role.length <= 50 && !/reviews?$/i.test(role);
          push(name, roleOk ? role : '');
          j += roleOk ? 2 : 1;
        }
      }
      if (team.length) break;
    }
    if (!team.length) {
      lines.forEach(function (l) {
        var m = /^(?:staffer|staff member|treatment by|with)\s*:?\s*(.+)$/i.exec(l);
        if (m && /^staffer/i.test(l)) push(m[1], '');
      });
    }
    return team;
  };

  var parseRating = function (joined) {
    var m = /\b([1-5][.,]\d)\s*rating with\s*([\d,]+)\s*(?:votes|reviews|ratings)/i.exec(joined) ||
            /\b([1-5][.,]\d)\s*(?:\|\s*)?(?:\(\s*)?([\d,]+)\s*\)?\s*(?:reviews|ratings|votes)\b/i.exec(joined) ||
            /\b([1-5][.,]\d)\s*\(([\d,]+)\)/.exec(joined);
    if (!m) return null;
    return { rating: m[1].replace(',', '.'), reviews: m[2].replace(/,/g, '') };
  };

  var parseAddress = function (lines) {
    for (var i = 0; i < lines.length; i++) {
      var g = /^(.*?)\s*get directions$/i.exec(lines[i]);
      if (g && g[1].length > 6) return tidyAddress(g[1]);
    }
    for (var k = 0; k < lines.length; k++) {
      if (POSTCODE.test(lines[k]) && lines[k].length < 140 && !/£/.test(lines[k])) return tidyAddress(lines[k]);
    }
    return null;
  };
  var tidyAddress = function (a) {
    var parts = a.split(/\s*,\s*/).filter(Boolean), out = [];
    parts.forEach(function (p) { if (!out.length || out[out.length - 1].toLowerCase() !== p.toLowerCase()) out.push(p); });
    return out.join(', ');
  };
  var areaFrom = function (address) {
    if (!address) return '';
    var pc = POSTCODE.exec(address.toUpperCase());
    var parts = address.split(/\s*,\s*/);
    var place = parts.filter(function (p, i) {
      return i > 0 && !/\d/.test(p) && !/^(england|scotland|wales|uk|united kingdom|great britain)$/i.test(p);
    });
    /* with a postcode, the first locality after the street and its district
       ("Chiswick W4"); without one, the town at the end ("London") */
    if (pc) return [place[0] || '', pc[1]].filter(Boolean).join(' ');
    return place[place.length - 1] || '';
  };

  var parseName = function (lines) {
    for (var i = 0; i < lines.length; i++) {
      if (!/^[1-5][.,]\d(?:\s*rating.*)?$/i.test(lines[i])) continue;
      for (var j = i - 1; j >= Math.max(0, i - 6); j--) {
        var l = lines[j];
        if (POSTCODE.test(l) || NOISE.test(l) || SECTION.test(l) || /^[A-Z\s]+$/.test(l) || /\d{2,}/.test(l)) continue;
        if (l.split(/\s+/).length < 2 || l.length > 60) continue;
        return l;
      }
      return null;
    }
    return null;
  };

  var parsePhone = function (joined) {
    var m = /(?:\+44\s?\(?0?\)?\s?|\b0)(?:\d[\s-]?){9,10}\b/.exec(joined);
    if (!m) return null;
    var d = m[0].replace(/[^\d+]/g, '');
    if (/^\+44/.test(d)) d = '0' + d.slice(3);
    if (!/^0\d{9,10}$/.test(d)) return null;
    return /^07/.test(d) ? d.slice(0, 5) + ' ' + d.slice(5) : (/^02/.test(d) ? d.slice(0, 3) + ' ' + d.slice(3, 7) + ' ' + d.slice(7) : d.slice(0, 5) + ' ' + d.slice(5));
  };

  var quickFill = function (raw) {
    var lines = String(raw || '').split(/\r?\n/).map(clean).filter(Boolean);
    var joined = lines.join(' ');
    var out = { treatments: parseServices(lines), team: parseTeam(lines), hours: parseWeek(joined) };
    var r = parseRating(joined);
    if (r) { out.rating = r.rating; out.reviews = r.reviews; }
    var addr = parseAddress(lines);
    if (addr) { out.address = addr; out.area = areaFrom(addr); }
    var name = parseName(lines);
    if (name) out.name = name;
    var ph = parsePhone(joined);
    if (ph) out.phone = ph;
    var em = /[\w.+-]+@[\w-]+\.[\w.-]+\w/.exec(joined);
    if (em) out.email = em[0];
    return out;
  };

  var api = {
    quickFill: quickFill, parseHoursText: parseHoursText, fmtHours: fmtHours,
    fmtClock: fmtClock, areaFrom: areaFrom, parseDur: parseDur, parsePrice: parsePrice
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SRParse = api;
})(this);
