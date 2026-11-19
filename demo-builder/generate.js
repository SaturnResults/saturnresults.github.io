/* ───────────────────────────────────────────────────────────────────────────
   Generator — one clinic in, one self-contained index.html out

   The page is the template in template/ with the clinic poured in: their
   treatments as a plain array at the very top of the file so a price can be
   changed by hand, the rest as a JSON block the script reads, and a palette
   worked out from their one brand colour.
   ─────────────────────────────────────────────────────────────────────────── */
(function (root) {
  'use strict';
  var P = root.SRParse || (typeof require !== 'undefined' ? require('./parse.js') : null);

  var SITE = 'https://saturnresults.co.uk';
  var DEFAULTS = {
    accent: '#3D7068', paper: '#F8F7F4', hero: 'light', head: 'Fraunces', body: 'DM Sans',
    reassure: 'No account needed. Pay at the clinic.',
    hours: ['9am–6pm', '9am–6pm', '9am–6pm', '9am–6pm', '9am–6pm', '9am–6pm', 'Closed']
  };
  var DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  /* JSON that is safe inside a <script> element */
  var json = function (v) {
    return JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  };

  /* ── colour ───────────────────────────────────────────────────────────── */

  var rgb = function (h) {
    h = String(h || '').trim().replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  var hex = function (c) {
    return '#' + c.map(function (v) { return ('0' + Math.round(Math.max(0, Math.min(255, v))).toString(16)).slice(-2); }).join('').toUpperCase();
  };
  var mix = function (a, b, t) {
    var x = rgb(a), y = rgb(b);
    return hex([0, 1, 2].map(function (i) { return x[i] + (y[i] - x[i]) * t; }));
  };
  var rgba = function (a, o) { var c = rgb(a); return 'rgba(' + c.join(',') + ',' + o + ')'; };
  var lum = function (h) {
    return rgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
      .reduce(function (s, v, i) { return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0);
  };
  var contrast = function (a, b) {
    var x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  /* walk a colour toward black or white until it reads on the ground */
  var readable = function (fg, bg, ratio) {
    var to = lum(bg) > 0.4 ? '#000000' : '#FFFFFF', c = fg;
    for (var t = 0; t <= 1 && contrast(c, bg) < ratio; t += 0.04) c = mix(fg, to, t);
    return c;
  };

  var INK = '#16191D';

  var tokens = function (brand) {
    var accent = rgb(brand.accent) ? hex(rgb(brand.accent)) : DEFAULTS.accent;
    var paper = rgb(brand.paper) ? hex(rgb(brand.paper)) : DEFAULTS.paper;
    var onAccent = contrast(accent, '#FFFFFF') >= contrast(accent, INK) ? '#FFFFFF' : INK;
    var light = onAccent === '#FFFFFF';
    var t = {
      'paper': paper, 'raise': '#FFFFFF', 'sink': mix(paper, INK, 0.045),
      'ink': INK, 'ink-2': '#454C57', 'ink-3': readable('#6B7380', paper, 4.6),
      'line': mix(paper, INK, 0.11), 'line-2': mix(paper, INK, 0.2),
      'paper-veil': rgba(paper, 0.92),
      'accent': accent, 'accent-ink': readable(accent, paper, 4.6),
      'accent-wash': mix(accent, '#FFFFFF', 0.88), 'on-accent': onAccent,
      'on-accent-soft': light ? 'rgba(255,255,255,.8)' : 'rgba(22,25,29,.72)',
      'on-accent-veil': light ? 'rgba(255,255,255,.18)' : 'rgba(22,25,29,.08)',
      'good': '#1E6B44', 'good-wash': '#E5F2EA', 'bad': '#B42318',
      'flag': '#8A5A00', 'flag-wash': '#FCF4E4', 'flag-line': '#EBD9AE',
      'star': '#E39B0B', 'foot-bg': mix(paper, accent, 0.05),
      /* chart marks must hold 3:1 against the white card they sit on */
      'bar': readable(accent, '#FFFFFF', 3), 'bar-soft': mix(readable(accent, '#FFFFFF', 3), '#FFFFFF', 0.45),
      'lift': '0 1px 2px rgba(22,25,29,.05), 0 10px 28px -14px rgba(22,25,29,.2)'
    };
    var hero = brand.hero || 'light';
    if (hero === 'brand') {
      var on = onAccent;
      t['hero-bg'] = accent; t['hero-ink'] = on;
      t['hero-ink-2'] = light ? 'rgba(255,255,255,.82)' : 'rgba(22,25,29,.76)';
      t['hero-ink-3'] = light ? 'rgba(255,255,255,.64)' : 'rgba(22,25,29,.6)';
      t['hero-line'] = light ? 'rgba(255,255,255,.22)' : 'rgba(22,25,29,.16)';
      t['hero-card'] = light ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.4)';
      t['hero-card-shadow'] = 'none';
      t['hero-chip'] = light ? 'rgba(255,255,255,.18)' : 'rgba(22,25,29,.08)';
      t['hero-glow'] = 'radial-gradient(80% 70% at 100% 0%, rgba(255,255,255,.14), transparent 65%)';
      t['cta'] = light ? '#FFFFFF' : INK;
      t['on-cta'] = light ? readable(accent, '#FFFFFF', 4.6) : '#FFFFFF';
    } else if (hero === 'dark') {
      var night = mix(accent, '#0B0D10', 0.86);
      var lit = readable(accent, night, 3.2);
      t['hero-bg'] = night; t['hero-ink'] = '#FFFFFF';
      t['hero-ink-2'] = 'rgba(255,255,255,.76)'; t['hero-ink-3'] = 'rgba(255,255,255,.56)';
      t['hero-line'] = 'rgba(255,255,255,.14)'; t['hero-card'] = 'rgba(255,255,255,.06)';
      t['hero-card-shadow'] = 'none'; t['hero-chip'] = 'rgba(255,255,255,.12)';
      t['hero-glow'] = 'radial-gradient(80% 70% at 100% 0%, ' + rgba(accent, 0.34) + ', transparent 65%)';
      t['cta'] = lit;
      t['on-cta'] = contrast(lit, '#FFFFFF') >= contrast(lit, INK) ? '#FFFFFF' : INK;
    } else {
      t['hero-bg'] = paper; t['hero-ink'] = INK; t['hero-ink-2'] = t['ink-2']; t['hero-ink-3'] = t['ink-3'];
      t['hero-line'] = t['line']; t['hero-card'] = '#FFFFFF'; t['hero-card-shadow'] = t['lift'];
      t['hero-chip'] = t['accent-wash'];
      t['hero-glow'] = 'radial-gradient(70% 60% at 100% 0%, ' + rgba(accent, 0.13) + ', transparent 70%)';
      t['cta'] = accent; t['on-cta'] = onAccent;
    }
    return t;
  };

  /* ── type ─────────────────────────────────────────────────────────────── */

  var SERIF = /serif|garamond|playfair|lora|fraunces|baskerville|cormorant|merriweather|cinzel|caslon|crimson|bodoni|prata|marcellus|gloock|spectral|newsreader|cardo|domine|bitter|vollkorn|libre|instrument serif|young serif|abhaya|gilda|italiana|rufina|cormorant/i;
  var stack = function (name, isDisplay) {
    var fall = SERIF.test(name || '') ? 'ui-serif, Georgia, "Times New Roman", serif'
      : 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    if (!name) return isDisplay ? 'ui-serif, Georgia, serif' : fall;
    return '"' + name.replace(/"/g, '') + '", ' + fall;
  };
  var fontHref = function (name, spec) {
    return 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(name.trim()).replace(/%20/g, '+') +
      (spec ? ':' + spec : '') + '&display=swap';
  };
  var displayWeight = function (spec) {
    if (spec == null) return 600;
    if (/\b600\b/.test(spec)) return 600;
    if (/\b700\b/.test(spec)) return 700;
    if (/\b500\b/.test(spec)) return 500;
    return 400;
  };

  /* ── words ────────────────────────────────────────────────────────────── */

  var cats = function (cfg) {
    var out = [];
    (cfg.treatments || []).forEach(function (t) {
      var c = (t.cat || '').trim();
      if (c && out.indexOf(c) < 0) out.push(c);
    });
    return out;
  };
  var listWords = function (xs) {
    if (xs.length < 2) return xs.join('');
    return xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
  };
  var lowerFirst = function (s) { return /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s; };
  var catsPhrase = function (cfg) {
    var cs = cats(cfg).filter(function (c) { return !/^(treatments|featured|popular|other|services|packages|offers?)$/i.test(c); });
    if (!cs.length) return '';
    var stripped = false;
    var words = cs.slice(0, 3).map(function (c, i) {
      var s = c.replace(/\s+(treatments?|services?|therapy|therapies)$/i, function () { stripped = true; return ''; });
      return i ? lowerFirst(s) : s;
    });
    return listWords(words) + (stripped ? ' treatments' : '');
  };
  var whoLine = function (cfg) {
    var team = (cfg.team || []).filter(function (p) { return p.name; });
    if (team.length === 1) return team[0].name.split(' ')[0];
    if (cfg.owner) return cfg.owner + ' and the team';
    return 'the team';
  };
  var autoIntro = function (cfg) {
    var what = catsPhrase(cfg), who = whoLine(cfg);
    if (what) return what + ' with ' + who + '.';
    return 'Appointments with ' + who + (cfg.name ? ' at ' + cfg.name : '') + '.';
  };
  var area = function (cfg) { return (cfg.area || '').trim() || (P ? P.areaFrom(cfg.address || '') : ''); };

  /* ── hours ────────────────────────────────────────────────────────────── */

  var hoursOf = function (cfg) { return cfg.hours && cfg.hours.length === 7 ? cfg.hours : DEFAULTS.hours; };
  /* indexed by getDay(), 0 is Sunday */
  var runtimeHours = function (cfg) {
    var h = hoursOf(cfg), out = [];
    for (var g = 0; g < 7; g++) out.push(P.parseHoursText(h[(g + 6) % 7]) || []);
    return out;
  };

  /* ── links ────────────────────────────────────────────────────────────── */

  var url = function (u) {
    u = (u || '').trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    return 'https://' + u.replace(/^\/+/, '');
  };
  var social = function (kind, v) {
    v = (v || '').trim();
    if (!v) return '';
    if (/^@?[\w.]+$/.test(v) && !/\./.test(v.replace(/^@/, '').slice(-4))) {
      var h = v.replace(/^@/, '');
      return { instagram: 'https://www.instagram.com/' + h, facebook: 'https://www.facebook.com/' + h, tiktok: 'https://www.tiktok.com/@' + h }[kind];
    }
    return url(v);
  };
  var telHref = function (p) { return 'tel:' + String(p || '').replace(/[^\d+]/g, ''); };
  var mapsHref = function (cfg) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([cfg.name, cfg.address].filter(Boolean).join(', '));
  };

  var ICON = {
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3 6.5 7 1-5 5 1.2 7L12 18l-6.2 3.5L7 14.5l-5-5 7-1z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="20" x="2" y="2" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><path d="M17.5 6.5h.01"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.6 2.4 4.4 5 4.6"/></svg>',
    web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>'
  };

  /* ── the page ─────────────────────────────────────────────────────────── */

  /* what the booking page and the dashboard share: palette, type, mark,
     the treatment rows and the config their scripts read */
  var shared = function (cfg, refs, cssText, opts) {
    var brand = cfg.brand || {};
    var tk = tokens({ accent: brand.accent, paper: brand.paper, hero: brand.hero });
    var spec = cfg.fontSpec || {};
    var head = (brand.head || '').trim(), body = (brand.body || '').trim();
    var name = (cfg.name || '').trim() || 'Your clinic';
    var team = (cfg.team || []).filter(function (p) { return p.name && p.name.trim(); });

    var vars = Object.keys(tk).map(function (k) { return '--' + k + ':' + tk[k]; });
    vars.push('--display:' + stack(head, true), '--ui:' + stack(body), '--display-w:' + (head ? displayWeight(spec[head]) : 600));
    var css = ':root{' + vars.join(';') + ';color-scheme:light}\n[hidden]{display:none!important}\n' + cssText;

    var fonts = [];
    [head, body].forEach(function (f) {
      if (f && fonts.indexOf(f) < 0 && spec[f] !== null) fonts.push(f);   /* null: not on Google Fonts */
    });
    var fontLinks = fonts.length
      ? '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
        fonts.map(function (f) { return '<link rel="stylesheet" href="' + esc(fontHref(f, spec[f])) + '">'; }).join('\n')
      : '';

    var letter = esc((name.match(/[A-Za-z0-9]/) || ['S'])[0].toUpperCase());
    var favicon = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="' + tk.accent + '"/>' +
      '<text x="32" y="44" font-family="Georgia, serif" font-size="36" font-weight="700" text-anchor="middle" fill="' + tk['on-accent'] + '">' + letter + '</text></svg>');

    var mark = function () {
      return refs.logo
        ? '<img src="' + esc(refs.logo) + '" alt="' + esc(name) + '"' + (cfg.logo && cfg.logo.w ? ' width="' + cfg.logo.w + '" height="' + cfg.logo.h + '"' : '') + '>'
        : '<span class="word">' + esc(name) + '</span>';
    };

    var rows = (cfg.treatments || []).filter(function (t) { return t.name && t.name.trim(); }).map(function (t) {
      var o = { cat: (t.cat || '').trim() || 'Treatments', name: t.name.trim() };
      if (+t.mins) o.mins = +t.mins;
      if (+t.maxMins && +t.maxMins > +t.mins) o.maxMins = +t.maxMins;
      o.price = t.price === '' || t.price == null || isNaN(+t.price) ? null : +t.price;
      if (o.price != null && +t.was > o.price) o.was = +t.was;
      if (t.from && o.price != null) o.from = true;
      if (t.desc && t.desc.trim()) o.desc = t.desc.trim();
      if (t.note && t.note.trim()) o.note = t.note.trim();
      return o;
    });
    var treatmentsScript = [
      '<script>',
      '/* Treatments, exactly as the clinic lists them. Change a price or a length',
      '   here and save; nothing else needs touching. mins = minutes, price = £',
      '   (null when not listed), from = shown as "from £…", was = the price before',
      '   a discount, note = a condition shown with that treatment. */',
      'var TREATMENTS = [',
      rows.map(function (r) { return '  ' + json(r); }).join(',\n'),
      '];',
      '</script>'
    ].join('\n');

    var runtime = {
      slug: cfg.slug || '', name: name, phone: (cfg.phone || '').trim(),
      hours: runtimeHours(cfg),
      team: team.map(function (p) { return { name: p.name.trim(), role: (p.role || '').trim(), cats: p.cats || [] }; })
    };
    return { tk: tk, name: name, team: team, css: css, fontLinks: fontLinks, favicon: favicon, mark: mark,
      rows: rows, treatmentsScript: treatmentsScript, runtime: runtime };
  };

  /* refs: where each image will be served from — { logo, photos[], og } */
  var build = function (cfg, refs, tpl, opts) {
    opts = opts || {};
    refs = refs || { logo: null, photos: [] };
    var X = shared(cfg, refs, tpl.css, opts);
    var tk = X.tk, name = X.name, team = X.team, css = X.css, fontLinks = X.fontLinks, favicon = X.favicon, mark = X.mark;
    var site = url(cfg.website);
    var ar = area(cfg);
    var photos = (refs.photos || []).filter(Boolean);
    var year = new Date().getFullYear();
    var intro = (cfg.copy && cfg.copy.intro || '').trim() || autoIntro(cfg);
    var reassure = (cfg.copy && cfg.copy.reassure || '').trim() || DEFAULTS.reassure;
    var note = (cfg.copy && cfg.copy.note || '').trim();
    var hrs = hoursOf(cfg);
    var what = catsPhrase(cfg);
    var reviews = (cfg.reviewList || []).filter(function (r) { return r.text && r.text.trim(); }).slice(0, 9);
    var source = (cfg.reviewSource || '').trim();
    var listing = url(cfg.listing);

    var runtime = Object.assign(X.runtime, { note: note, reassure: reassure, builder: opts.source || null });

    /* ── trust strip ── */
    var trust = [];
    if (cfg.rating || cfg.reviews) {
      trust.push('<span class="trust-i stars">' + ICON.star + (cfg.rating ? esc(cfg.rating) : '') +
        (cfg.reviews ? '<span style="font-weight:400;color:var(--hero-ink-2)">' + (cfg.rating ? '&nbsp;· ' : '') + esc(cfg.reviews) + ' reviews</span>' : ' rating') + '</span>');
    }
    if (ar) trust.push('<span class="trust-i">' + ICON.pin + esc(ar) + '</span>');
    (cfg.accreditations || '').split(/\n|;/).map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (a) {
      trust.push('<span class="trust-i">' + ICON.shield + esc(a) + '</span>');
    });

    /* ── footer bits ── */
    var socials = [
      ['instagram', 'Instagram', social('instagram', cfg.links && cfg.links.instagram)],
      ['facebook', 'Facebook', social('facebook', cfg.links && cfg.links.facebook)],
      ['tiktok', 'TikTok', social('tiktok', cfg.links && cfg.links.tiktok)],
      ['web', 'Website', site]
    ].filter(function (s) { return s[2]; });
    var policy = [
      ['Privacy policy', url(cfg.links && cfg.links.privacy)],
      ['Terms & cancellations', url(cfg.links && cfg.links.terms)]
    ].filter(function (p) { return p[1]; });

    var hoursRows = DAY_NAMES.map(function (d, i) {
      var r = P.parseHoursText(hrs[i]);
      var txt = r == null ? hrs[i] : P.fmtHours(r);
      return '<div data-d="' + ((i + 1) % 7) + '"><b>' + d + '</b><span' + (r && !r.length ? ' class="shut"' : '') + '>' + esc(txt) + '</span></div>';
    }).join('\n        ');

    var desc = 'Book ' + (what ? lowerFirst(what) + ' ' : '') + 'at ' + name + (ar ? ', ' + ar : '') + '. Pick a treatment and a time in under a minute.';

    var H = [];
    H.push('<!doctype html>',
      '<html lang="en-GB">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
      '<title>Book · ' + esc(name) + '</title>',
      X.treatmentsScript,
      '<meta name="description" content="' + esc(desc) + '">',
      '<meta name="robots" content="noindex, nofollow">',
      '<meta name="demo-build" content="' + esc(opts.buildId || '') + '">',
      '<meta name="theme-color" content="' + tk['hero-bg'] + '">',
      '<meta property="og:type" content="website">',
      '<meta property="og:title" content="Book · ' + esc(name) + '">',
      '<meta property="og:description" content="Book your treatment in under a minute.">');
    if (opts.url) H.push('<meta property="og:url" content="' + esc(opts.url) + '">');
    if (refs.og) H.push('<meta property="og:image" content="' + esc(refs.og) + '">');
    H.push('<link rel="icon" href="' + favicon + '">');
    if (fontLinks) H.push(fontLinks);
    H.push('<style>', css, '</style>', '</head>', '<body>',
      '<a class="sr" href="#book">Skip to booking</a>',
      '',
      '<header class="bar" id="bar"><div class="shell bar-in">',
      '  <a class="logo" href="' + esc(site || '#top') + '" aria-label="' + esc(name) + (site ? ' website' : '') + '">' + mark() + '</a>',
      '  <nav class="nav" aria-label="Main">',
      '    <a href="#book">Treatments</a>');
    if (reviews.length) H.push('    <a href="#reviews">Reviews</a>');
    if (photos.length) H.push('    <a href="#gallery">Gallery</a>');
    H.push('    <a href="#find">Find us</a>',
      '  </nav>',
      '  <div class="acts">');
    if (cfg.phone) H.push('    <a class="call" href="' + esc(telHref(cfg.phone)) + '" aria-label="Call ' + esc(cfg.phone) + '">' + ICON.phone + '<span class="call-t">Call</span></a>');
    H.push('    <a class="book" href="#book">Book Now</a>',
      '  </div>',
      '</div></header>',
      '');
    if (trust.length) {
      H.push('<div class="trust"><div class="shell trust-in">', '  ' + trust.join('\n  '), '</div></div>', '');
    }
    H.push('<section class="hero" id="top"><div class="shell hero-in">',
      '  <div>',
      '    <h1>Book your treatment in under a minute.</h1>',
      '    <p class="lede">' + esc(intro) + '</p>',
      '    <ol class="steps3"><li>Tell us what hurts</li><li>Choose a practitioner</li><li>Pick a time</li></ol>',
      '  </div>',
      '  <div class="soon" id="soon">',
      '    <span class="soon-k">Next free appointment</span>',
      '    <div class="soon-when" id="soon-when">&nbsp;</div>',
      '    <div class="soon-what" id="soon-what">&nbsp;</div>',
      '    <button class="btn" id="soon-take" type="button">Take this one</button>',
      '  </div>',
      '</div></section>',
      '',
      '<main class="stage" id="book"><div class="shell stage-in">',
      '  <div class="flow" id="flow">',
      '    <div class="step" id="s-svc" data-state="now"></div>',
      '    <div class="step" id="s-who" data-state="wait"></div>',
      '    <div class="step" id="s-when" data-state="wait"></div>',
      '    <div class="step" id="s-you" data-state="wait"></div>',
      '  </div>',
      '  <aside class="rail" aria-label="Your booking"><div class="rail-c">',
      '    <span class="rail-k">Your booking</span>',
      '    <dl class="rail-rows" id="rail-rows"></dl>',
      '    <div class="rail-total"><b id="rail-total">&mdash;</b><span id="rail-dur"></span></div>',
      '    <button class="btn btn-p" id="rail-b" type="button" disabled>Confirm booking</button>',
      '    <p class="rail-fine">' + esc(reassure) + '</p>',
      '  </div></aside>',
      '</div></main>',
      '',
      '<div class="dock" id="dock" hidden><div class="shell dock-in">',
      '  <div class="dock-t" id="dock-t"></div>',
      '  <button class="btn btn-p" id="dock-b" type="button" hidden>Confirm booking</button>',
      '</div></div>',
      '',
      '<section class="done" id="done" aria-live="polite"><div class="shell"><div class="inner">',
      '  <div class="done-i">' + ICON.tick + '</div>',
      '  <h2>You’re booked in.</h2>',
      '  <p class="msg">We’ve sent a text to <b id="r-tel2"></b> confirming your appointment. ' +
        (cfg.phone ? 'Need to change anything? Call the clinic on <a href="' + esc(telHref(cfg.phone)) + '">' + esc(cfg.phone) + '</a>.' : 'Reply to it if anything changes.') + '</p>',
      '  <dl class="recap">',
      '    <div><dt>Treatment</dt><dd id="r-what"></dd></div>',
      '    <div><dt>When</dt><dd id="r-when"></dd></div>',
      '    <div><dt>With</dt><dd id="r-who"></dd></div>',
      '    <div><dt>Cost</dt><dd id="r-cost"></dd></div>',
      '    <div><dt>Text to</dt><dd id="r-tel"></dd></div>',
      '    <div><dt>Where</dt><dd>' + esc(cfg.address ? cfg.address : name) + '</dd></div>',
      '    <div class="note" hidden><dt>Please note</dt><dd id="r-note"></dd></div>',
      '  </dl>',
      '  <div class="row"><button class="btn btn-p" id="again" type="button">Book another</button>' +
        (cfg.address ? '<a class="btn" href="' + esc(mapsHref(cfg)) + '" target="_blank" rel="noopener">Get directions</a>' : '') + '</div>',
      '  <p class="owner">Showing this to the clinic? <a href="dashboard/">See this booking land in their dashboard</a></p>',
      '</div></div></section>',
      '');
    if (reviews.length) {
      var pct = Math.max(0, Math.min(100, (parseFloat(cfg.rating) || 0) / 5 * 100));
      H.push('<section class="reviews" id="reviews"><div class="shell">',
        '  <div class="rv-head">',
        '    <div><span class="sec-k">Reviews</span><h2 class="sec-h">What clients say</h2></div>');
      if (cfg.rating || cfg.reviews) {
        H.push('    <p class="rv-score">' + (cfg.rating ? '<span class="stars5" role="img" aria-label="' + esc(cfg.rating) + ' out of 5"><span style="width:' + pct + '%"></span></span><b>' + esc(cfg.rating) + '</b>' : '') +
          '<span>' + (cfg.reviews ? (cfg.rating ? 'from ' : '') + esc(cfg.reviews) + ' reviews' : 'rating') + (source ? ' on ' + esc(source) : '') + '</span></p>');
      }
      H.push('  </div>',
        '  <div class="rv-list">',
        reviews.map(function (r) {
          var meta = [r.treatment, r.when].map(function (x) { return (x || '').trim(); }).filter(Boolean).join(' · ');
          return '    <figure class="rvc">' +
            (r.rating ? '<span class="stars5 sm" role="img" aria-label="' + r.rating + ' out of 5"><span style="width:' + (r.rating / 5 * 100) + '%"></span></span>' : '') +
            '<blockquote>' + esc(r.text.trim()) + '</blockquote>' +
            '<figcaption><b>' + esc((r.name || '').trim() || 'Anonymous') + '</b>' + (meta ? '<span>' + esc(meta) + '</span>' : '') + '</figcaption></figure>';
        }).join('\n'),
        '  </div>');
      if (listing && source) H.push('  <a class="rv-more" href="' + esc(listing) + '" target="_blank" rel="noopener">Read ' + (cfg.reviews ? 'all ' + esc(cfg.reviews) + ' ' : 'more ') + 'reviews on ' + esc(source) + '</a>');
      H.push('</div></section>', '');
    }
    if (photos.length) {
      H.push('<section class="gallery" id="gallery"><div class="shell">',
        '  <span class="sec-k">The clinic</span>',
        '  <h2 class="sec-h">A look around ' + esc(name) + '</h2>',
        '  <div class="shots">',
        photos.map(function (p, i) {
          return '    <img src="' + esc(p) + '" alt="' + esc(name) + ', photo ' + (i + 1) + '" loading="lazy">';
        }).join('\n'),
        '  </div>',
        '</div></section>',
        '');
    }
    H.push('<footer id="find"><div class="shell">',
      '  <div class="f-grid">',
      '    <div>',
      '      <div class="f-logo">' + mark() + '</div>');
    if (cfg.about && cfg.about.trim()) H.push('      <p class="f-about">' + esc(cfg.about.trim()) + '</p>');
    if (socials.length) {
      H.push('      <div class="socials">' + socials.map(function (s) {
        return '<a href="' + esc(s[2]) + '" target="_blank" rel="noopener" aria-label="' + s[1] + '">' + ICON[s[0]] + '</a>';
      }).join('') + '</div>');
    }
    H.push('    </div>', '    <div>', '      <h3 class="f-h">Visit</h3>', '      <ul class="f-list">');
    if (cfg.address) H.push('        <li>' + esc(cfg.address) + '</li>');
    if (cfg.phone) H.push('        <li><a href="' + esc(telHref(cfg.phone)) + '">' + esc(cfg.phone) + '</a></li>');
    if (cfg.email) H.push('        <li><a href="mailto:' + esc(cfg.email.trim()) + '">' + esc(cfg.email.trim()) + '</a></li>');
    if (cfg.address) H.push('        <li><a href="' + esc(mapsHref(cfg)) + '" target="_blank" rel="noopener">Get directions</a></li>');
    H.push('        <li><a href="#book">Book online</a></li>');
    if (site) H.push('        <li><a href="' + esc(site) + '">Our website</a></li>');
    H.push('      </ul>', '    </div>',
      '    <div>', '      <h3 class="f-h">Opening times</h3>', '      <div class="f-hrs">', '        ' + hoursRows, '      </div>', '    </div>',
      '  </div>',
      '  <div class="f-bot"><span>&copy; ' + year + ' ' + esc(name) + '</span>' +
        (policy.length ? '<span class="sp">' + policy.map(function (p) { return '<a href="' + esc(p[1]) + '">' + p[0] + '</a>'; }).join('') + '</span>' : '') + '</div>',
      '  <p class="demo">Design demo built by <a href="https://saturnresults.co.uk">Saturn Results</a> for ' + esc(name) + '. Times shown are examples; nothing is booked. <a href="dashboard/">The clinic’s dashboard</a></p>',
      '</div></footer>',
      '',
      '<script type="application/json" id="demo-config">' + json(runtime) + '</script>',
      '<script>', tpl.js, '</script>',
      '</body>',
      '</html>', '');
    return H.join('\n');
  };

  /* ── the dashboard ────────────────────────────────────────────────────── */

  var buildDash = function (cfg, refs, tpl, opts) {
    opts = opts || {};
    refs = refs || { logo: null, photos: [] };
    var X = shared(cfg, refs, tpl.dcss, opts);
    var name = X.name, tk = X.tk;
    var bookUrl = opts.url ? opts.url.replace(/dashboard\/?$/, '') : SITE + '/results/' + (cfg.slug || 'your-clinic') + '/';
    var runtime = Object.assign(X.runtime, { owner: (cfg.owner || '').trim().split(' ')[0] });
    var H = [
      '<!doctype html>',
      '<html lang="en-GB">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
      '<title>Dashboard · ' + esc(name) + '</title>',
      X.treatmentsScript,
      '<meta name="robots" content="noindex, nofollow">',
      '<meta name="demo-build" content="' + esc(opts.buildId || '') + '">',
      '<meta name="theme-color" content="' + tk['hero-bg'] + '">',
      '<meta property="og:title" content="Dashboard · ' + esc(name) + '">',
      '<meta property="og:description" content="Your bookings, takings and diary in one place.">'
    ];
    if (refs.og) H.push('<meta property="og:image" content="' + esc(refs.og) + '">');
    H.push('<link rel="icon" href="' + X.favicon + '">');
    if (X.fontLinks) H.push(X.fontLinks);
    H.push('<style>', X.css, '</style>', '</head>', '<body id="dash">',
      '<header class="dh"><div class="shell dh-in">',
      '  <a class="logo" href="../" aria-label="' + esc(name) + ' booking page">' + X.mark() + '</a>',
      '  <span class="dh-tag">Dashboard</span>',
      '  <a class="dh-view" href="../">Booking page</a>',
      '</div></header>',
      '<div class="ribbon"><div class="shell">An example of the dashboard ' + esc(name) + ' would get. The clients and figures are made up from your real treatments and prices. <a href="../">Book something</a> and it lands here.</div></div>',
      '<main class="shell dash">',
      '  <section class="hello"><h1 id="hello">Good morning</h1><p id="today-line">&nbsp;</p></section>',
      '  <div class="new" id="new" role="status" hidden></div>',
      '  <section class="tiles" id="tiles" aria-label="At a glance"></section>',
      '  <div class="grid">',
      '    <section class="card cal" id="cal" aria-label="Calendar">',
      '      <div class="cal-top"><h2>Calendar</h2>',
      '        <div class="vseg" id="cal-view" role="radiogroup" aria-label="Calendar view"><button type="button" role="radio" data-v="day">Day</button><button type="button" role="radio" data-v="week">Week</button><button type="button" role="radio" data-v="month">Month</button></div></div>',
      '      <div class="cal-nav"><button class="nb" id="cal-prev" type="button" aria-label="Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>' +
        '<b id="cal-label" aria-live="polite"></b>' +
        '<button class="nb" id="cal-next" type="button" aria-label="Forward"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>' +
        '<button class="today-b" id="cal-today" type="button">Today</button></div>',
      '      <div class="cal-key" id="cal-key" hidden></div>',
      '      <div class="cal-body" id="cal-body"></div>',
      '      <div class="cal-detail" id="cal-detail" role="status" hidden></div>',
      '    </section>',
      '    <section class="card"><div class="card-h"><h2>Latest bookings</h2><span>Texts go out for you</span></div><ol class="feed" id="feed"></ol></section>',
      '    <section class="card"><div class="card-h"><h2 id="chart-t">Takings by week</h2><span>Last 8 weeks</span></div><div class="chart" id="chart"></div></section>',
      '    <section class="card"><div class="card-h"><h2>Most booked</h2><span>Last 30 days</span></div><ol class="top" id="top"></ol></section>',
      '    <section class="card link"><div class="card-h"><h2>Your booking link</h2></div>',
      '      <div class="url"><code id="url">' + esc(bookUrl.replace(/^https?:\/\//, '')) + '</code><button class="btn" id="copy" type="button">Copy</button></div>',
      '      <p>Put it in your Instagram bio, your Google profile and your WhatsApp status. Every booking lands here.</p></section>',
      '  </div>',
      '</main>',
      '<footer class="dfoot"><div class="shell">Design demo built by <a href="https://saturnresults.co.uk">Saturn Results</a> for ' + esc(name) + '. Every client and figure on this page is an example; nothing is real.</div></footer>',
      '<script type="application/json" id="demo-config">' + json(runtime) + '</script>',
      '<script>', tpl.djs, '</script>',
      '</body>', '</html>', '');
    return H.join('\n');
  };

  /* what was found, what was left out and what was assumed — the same list
     the brief asks to be reported */
  var gaps = function (cfg) {
    var g = [], t = (cfg.treatments || []).filter(function (x) { return x.name; });
    var priced = t.filter(function (x) { return x.price !== '' && x.price != null && !isNaN(+x.price); });
    if (!t.length) g.push(['bad', 'No treatments yet']);
    else if (!priced.length) g.push(['warn', 'No prices found, so treatments show without them']);
    var noDur = t.filter(function (x) { return !+x.mins; }).length;
    if (noDur) g.push(['warn', noDur + ' treatment' + (noDur > 1 ? 's have' : ' has') + ' no length, so ' + 'the diary treats ' + (noDur > 1 ? 'them' : 'it') + ' as the usual length']);
    var bad = (cfg.hours || []).filter(function (h) { return P.parseHoursText(h) == null; }).length;
    if (bad) g.push(['bad', bad + ' opening-hours day' + (bad > 1 ? 's' : '') + ' can’t be read']);
    if (cfg.hoursAssumed) g.push(['warn', 'Opening hours not found, so Mon–Sat 9am–6pm assumed']);
    if (!cfg.rating && !cfg.reviews) g.push(['info', 'Rating and review count left out']);
    if (!(cfg.reviewList || []).filter(function (r) { return r.text; }).length) g.push(['info', 'No reviews, so the reviews section is left out']);
    if (cfg.listed && t.length < cfg.listed) g.push(['warn', 'Their listing has ' + cfg.listed + ' treatments; ' + t.length + ' are in the demo']);
    if (!(cfg.accreditations || '').trim()) g.push(['info', 'No accreditations stated']);
    if (!cfg.logo) g.push(['info', 'No logo, so the name is set as a text wordmark']);
    if (!(cfg.photos || []).length) g.push(['info', 'No photos, so the gallery is left out']);
    if (!(cfg.team || []).filter(function (p) { return p.name; }).length) g.push(['info', 'No practitioners listed, so "Any available" only']);
    if (!cfg.owner) g.push(['info', 'No owner name, so the intro says "the team"']);
    if (!cfg.phone) g.push(['warn', 'No phone number, so tap-to-call is left out']);
    if (!cfg.address) g.push(['warn', 'No address, so "Where" shows the clinic name']);
    if (!cfg.email) g.push(['info', 'No email address']);
    if (!cfg.website) g.push(['info', 'No website, so the logo links to the top of the page']);
    var l = cfg.links || {};
    if (!l.instagram && !l.facebook && !l.tiktok) g.push(['info', 'No social links']);
    if (!l.privacy && !l.terms) g.push(['info', 'No policy links']);
    var b = cfg.brand || {};
    if (!b.accent || b.accent.toUpperCase() === DEFAULTS.accent) g.push(['info', 'No brand colour set, so the calm default teal is used']);
    return g;
  };

  var slugify = function (s) {
    return String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/['’]/g, '')
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  };

  var api = {
    SITE: SITE, DEFAULTS: DEFAULTS, build: build, buildDash: buildDash, tokens: tokens, gaps: gaps, slugify: slugify,
    autoIntro: autoIntro, area: area, fontHref: fontHref, url: url, contrast: contrast, rgb: rgb
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SRGen = api;
})(this);
