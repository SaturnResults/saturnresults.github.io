/* ───────────────────────────────────────────────────────────────────────────
   Demo builder

   Fill in a clinic, watch the demo build itself in the preview, publish it to
   saturnresults.co.uk/results/<slug>/ in one commit. Drafts live in this
   browser (IndexedDB); the GitHub token lives in localStorage and is only ever
   sent to api.github.com.
   ─────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var G = window.SRGen, P = window.SRParse, F = window.SRFind;
  var SITE = G.SITE;
  var $ = function (id) { return document.getElementById(id); };
  var el = function (t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var uid = function () { return Math.random().toString(36).slice(2, 10); };
  var debounce = function (fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; };
  var getPath = function (o, p) { return p.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); };
  var setPath = function (o, p, v) { var ks = p.split('.'), last = ks.pop();
    ks.forEach(function (k) { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }); o[last] = v; };

  var toastT;
  var toast = function (msg, ms) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, ms || 3200);
  };
  var copy = function (text, what) {
    var done = function () { toast((what || 'Copied') + ' to the clipboard'); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
    function fallback() {
      var ta = el('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Couldn’t copy — select it and copy by hand'); }
      ta.remove();
    }
  };

  /* ── settings (this browser only) ─────────────────────────────────────── */

  var SETTINGS_KEY = 'srdb.settings';
  var settings = (function () {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (e) {}
    return Object.assign({ token: '', repo: 'SaturnResults/saturnresults.github.io', branch: 'main', sender: 'Harry', dev: 'phone' }, s);
  })();
  var saveSettings = function () { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {} };

  /* ── drafts (IndexedDB) ───────────────────────────────────────────────── */

  var dbp = null, memory = {};
  var db = function () {
    if (!dbp) dbp = new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('no indexedDB'));
      var r = indexedDB.open('sr-demo-builder', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('drafts', { keyPath: 'id' }); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
    return dbp;
  };
  var store = function (mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var tx = d.transaction('drafts', mode), req = fn(tx.objectStore('drafts'));
        tx.oncomplete = function () { res(req && req.result); };
        tx.onerror = function () { rej(tx.error); };
      });
    });
  };
  var allDrafts = function () {
    return store('readonly', function (s) { return s.getAll(); })
      .catch(function () { return Object.keys(memory).map(function (k) { return memory[k]; }); });
  };
  var putDraft = function (d) {
    memory[d.id] = d;
    return store('readwrite', function (s) { return s.put(JSON.parse(JSON.stringify(d))); }).catch(function () {});
  };
  var delDraft = function (id) {
    delete memory[id];
    return store('readwrite', function (s) { return s.delete(id); }).catch(function () {});
  };

  var blank = function () {
    var D = G.DEFAULTS;
    return {
      v: 1, id: uid(), name: '', slug: '', slugEdited: false, owner: '', website: '', listing: '',
      phone: '', email: '', address: '', area: '', about: '', rating: '', reviews: '', accreditations: '',
      treatments: [], team: [], hours: D.hours.slice(), hoursAssumed: true,
      brand: { accent: D.accent, paper: D.paper, hero: D.hero, head: D.head, body: D.body },
      fontSpec: { 'Fraunces': 'wght@400;600;700', 'DM Sans': 'wght@400;500;700' },
      logo: null, photos: [],
      copy: { intro: '', reassure: D.reassure, note: '' },
      links: { instagram: '', facebook: '', tiktok: '', privacy: '', terms: '' },
      reviewList: [], reviewSource: '', listed: null, found: { logos: [], photos: [] }, siteFonts: [],
      wa: '', published: null, updated: Date.now()
    };
  };

  var cfg = blank();

  /* Saving is pinned to the draft that changed, so switching clinic inside
     the 400ms wait can't lose the last edit or save it over the wrong one */
  var dirty = null;
  var saveNow = function () {
    if (!dirty) return Promise.resolve();
    var d = dirty; dirty = null; d.updated = Date.now();
    return putDraft(d).then(paintDrafts);
  };
  var flush = debounce(saveNow, 400);
  var save = function () { if (dirty && dirty !== cfg) saveNow(); dirty = cfg; flush(); };

  /* Slow work (reading their site, copying images, publishing) belongs to the
     draft it started in. If the screen has moved to another clinic by the
     time it finishes, the result goes into that draft's saved copy instead. */
  var settle = function (me) {
    if (me === cfg) return true;
    me.updated = Date.now(); putDraft(me);
    return false;
  };

  /* is this draft already a clinic, and is it the one these links are for? */
  var hasContent = function (c) {
    return !!((c.name || '').trim() || c.treatments.some(function (t) { return t.name; }) ||
      c.logo || c.photos.length || (c.reviewList || []).length);
  };
  var linkKey = function (u) {
    return G.url(u || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
  };
  var nameKey = function (n) { return String(n || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, ''); };
  var namesMatch = function (a, b) {
    var x = nameKey(a), y = nameKey(b);
    if (x.length < 4 || y.length < 4) return true;
    return x === y || x.indexOf(y) >= 0 || y.indexOf(x) >= 0;
  };
  var sameClinic = function (L, W) {
    if (!hasContent(cfg)) return 'same';
    var bf = cfg.builtFrom;
    if (!bf) return 'unknown';
    if (L && bf.listing) return linkKey(L) === linkKey(bf.listing) ? 'same' : 'other';
    if (W && bf.website) return linkKey(W) === linkKey(bf.website) ? 'same' : 'other';
    return 'unknown';
  };

  /* ── templates ────────────────────────────────────────────────────────── */

  var tpl = null;
  var loadTemplates = function () {
    return Promise.all(['template/demo.css', 'template/demo.js', 'template/dash.css', 'template/dash.js'].map(function (u) {
      return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(u); return r.text(); });
    })).then(function (x) { tpl = { css: x[0], js: x[1], dcss: x[2], djs: x[3] }; });
  };

  /* ── changes ──────────────────────────────────────────────────────────── */

  var changed = function () { save(); refresh(); };
  var refresh = debounce(function () { renderPreview(); paintPub(); paintHints(); }, 220);

  /* plain fields: data-k is the path into cfg */
  var bindFields = function () {
    document.querySelectorAll('[data-k]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var k = inp.dataset.k, v = inp.value;
        setPath(cfg, k, v);
        if (k === 'name' && !cfg.slugEdited) { cfg.slug = G.slugify(v); $('slug').value = cfg.slug; checkExists(); }
        if (k === 'brand.accent' && G.rgb(v)) $('accent-pick').value = '#' + G.rgb(v).map(function (n) { return ('0' + n.toString(16)).slice(-2); }).join('');
        if (k === 'brand.paper' && G.rgb(v)) $('paper-pick').value = '#' + G.rgb(v).map(function (n) { return ('0' + n.toString(16)).slice(-2); }).join('');
        if (k === 'brand.head' || k === 'brand.body') { checkFontSoon(); paintPairs(); }
        if (k === 'name') paintPairNames();
        if (k === 'brand.paper') paintPairs();
        changed();
      });
    });
  };
  var fillFields = function () {
    document.querySelectorAll('[data-k]').forEach(function (inp) {
      var v = getPath(cfg, inp.dataset.k);
      inp.value = v == null ? '' : v;
    });
    $('accent-pick').value = (cfg.brand.accent || G.DEFAULTS.accent).slice(0, 7).toLowerCase();
    $('paper-pick').value = (cfg.brand.paper || G.DEFAULTS.paper).slice(0, 7).toLowerCase();
    $('slug').value = cfg.slug || '';
  };

  var paintHints = function () {
    $('area').placeholder = G.area(Object.assign({}, cfg, { area: '' })) || 'e.g. Chiswick W4';
    $('intro').placeholder = G.autoIntro(cfg);
    var n = cfg.treatments.filter(function (t) { return t.name; }).length;
    $('t-count').textContent = n ? n + ' treatment' + (n > 1 ? 's' : '') : '';
    $('hrs-assumed').hidden = !cfg.hoursAssumed;
  };

  /* ── treatments ───────────────────────────────────────────────────────── */

  var openRows = {};
  var catList = function () {
    var out = [];
    cfg.treatments.forEach(function (t) { var c = t.cat || 'Treatments'; if (out.indexOf(c) < 0) out.push(c); });
    return out;
  };
  var num = function (v) { v = String(v).replace(/[£,\s]/g, ''); return v === '' || isNaN(+v) ? null : +v; };

  var paintTreatments = function () {
    var box = $('treat');
    box.innerHTML = '';
    var cats = catList();
    if (!cats.length) {
      box.appendChild(el('div', 'empty', 'No treatments yet. Paste their listing into Quick fill, or add a category.'));
      return;
    }
    var dl = el('datalist'); dl.id = 'cat-list';
    cats.forEach(function (c) { var o = el('option'); o.value = c; dl.appendChild(o); });
    box.appendChild(dl);

    cats.forEach(function (c) {
      var g = el('div', 'cat');
      var h = el('div', 'cat-h');
      var ci = el('input'); ci.value = c; ci.setAttribute('aria-label', 'Category name');
      var cur = c;
      ci.addEventListener('input', function () {
        var v = ci.value;
        cfg.treatments.forEach(function (t) { if ((t.cat || 'Treatments') === cur) t.cat = v; });
        cur = v; changed();
      });
      ci.addEventListener('change', function () { paintTreatments(); paintTeam(); });
      var del = el('button', 'more', '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>');
      del.type = 'button'; del.title = 'Delete this category'; del.setAttribute('aria-label', 'Delete category');
      del.onclick = function () {
        var n = cfg.treatments.filter(function (t) { return (t.cat || 'Treatments') === cur && t.name; }).length;
        if (n && !confirm('Delete “' + cur + '” and its ' + n + ' treatment' + (n > 1 ? 's' : '') + '?')) return;
        cfg.treatments = cfg.treatments.filter(function (t) { return (t.cat || 'Treatments') !== cur; });
        paintTreatments(); paintTeam(); changed();
      };
      h.appendChild(ci); h.appendChild(del);
      g.appendChild(h);

      cfg.treatments.filter(function (t) { return (t.cat || 'Treatments') === c; }).forEach(function (t) {
        g.appendChild(treatRow(t));
      });
      var add = el('div', 'cat-add');
      var ab = el('button', 'btn', '+ Treatment'); ab.type = 'button';
      ab.onclick = function () {
        var t = { id: uid(), cat: cur, name: '', mins: 60, price: null };
        var idx = -1;
        cfg.treatments.forEach(function (x, i) { if ((x.cat || 'Treatments') === cur) idx = i; });
        cfg.treatments.splice(idx + 1, 0, t);
        paintTreatments();
        var inp = document.querySelector('[data-tid="' + t.id + '"] input');
        if (inp) inp.focus();
        changed();
      };
      add.appendChild(ab);
      g.appendChild(add);
      box.appendChild(g);
    });
  };

  var treatRow = function (t) {
    if (!t.id) t.id = uid();
    var row = el('div', 'trow'); row.dataset.tid = t.id;
    var line = el('div', 'tline');
    var n = el('input'); n.value = t.name || ''; n.placeholder = 'Treatment, exactly as listed'; n.setAttribute('aria-label', 'Treatment name');
    n.oninput = function () { t.name = n.value; changed(); };
    var mw = el('span', 'num'), m = el('input'); m.inputMode = 'numeric'; m.value = t.mins || ''; m.setAttribute('aria-label', 'Minutes');
    m.oninput = function () { t.mins = num(m.value); changed(); };
    mw.appendChild(m); mw.appendChild(el('i', '', 'min'));
    var pw = el('span', 'num gbp'), p = el('input'); p.inputMode = 'decimal'; p.value = t.price == null ? '' : t.price; p.placeholder = '—'; p.setAttribute('aria-label', 'Price in pounds');
    p.oninput = function () { t.price = num(p.value); changed(); };
    pw.appendChild(p); pw.appendChild(el('i', '', '£'));
    var more = el('button', 'more', '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>');
    more.type = 'button'; more.setAttribute('aria-label', 'More about this treatment');
    more.setAttribute('aria-expanded', !!openRows[t.id]);
    more.onclick = function () { openRows[t.id] = !openRows[t.id]; row.replaceWith(treatRow(t)); };
    [n, mw, pw, more].forEach(function (x) { line.appendChild(x); });
    row.appendChild(line);

    if (openRows[t.id]) {
      var d = el('div', 'tdet');
      var field = function (label, key, opts) {
        opts = opts || {};
        var f = el('label', 'fld' + (opts.span ? ' span2' : ''));
        f.appendChild(el('span', '', label));
        var i = el('input');
        if (opts.list) i.setAttribute('list', opts.list);
        if (opts.num) i.inputMode = 'decimal';
        i.value = t[key] == null ? '' : t[key];
        i.placeholder = opts.ph || '';
        i.oninput = function () { t[key] = opts.num ? num(i.value) : i.value; changed(); };
        if (opts.change) i.onchange = opts.change;
        f.appendChild(i);
        return f;
      };
      d.appendChild(field('Category', 'cat', { list: 'cat-list', change: function () { paintTreatments(); paintTeam(); } }));
      var chk = el('label', 'chk');
      var cb = el('input'); cb.type = 'checkbox'; cb.checked = !!t.from;
      cb.onchange = function () { t.from = cb.checked; changed(); };
      chk.appendChild(cb); chk.appendChild(document.createTextNode('Show as “from £…”'));
      d.appendChild(chk);
      d.appendChild(field('Was (before discount)', 'was', { num: true, ph: '£' }));
      d.appendChild(field('Up to (minutes)', 'maxMins', { num: true, ph: 'for a range' }));
      d.appendChild(field('Description', 'desc', { span: true, ph: 'Their own words, if they give any' }));
      d.appendChild(field('Condition for this treatment', 'note', { span: true, ph: 'e.g. A family member must be present' }));
      var rm = el('button', 'btn ghost del', 'Delete treatment'); rm.type = 'button';
      rm.onclick = function () {
        cfg.treatments = cfg.treatments.filter(function (x) { return x !== t; });
        delete openRows[t.id];
        paintTreatments(); changed();
      };
      var rmw = el('div', 'span2'); rmw.appendChild(rm);
      d.appendChild(rmw);
      row.appendChild(d);
    }
    return row;
  };

  $('add-cat').onclick = function () {
    var base = 'New category', name = base, k = 2, cats = catList();
    while (cats.indexOf(name) >= 0) name = base + ' ' + k++;
    var t = { id: uid(), cat: name, name: '', mins: 60, price: null };
    cfg.treatments.push(t);
    paintTreatments();
    var h = $('treat').lastElementChild.querySelector('.cat-h input');
    if (h) { h.focus(); h.select(); }
    changed();
  };

  /* ── team ─────────────────────────────────────────────────────────────── */

  var paintTeam = function () {
    var box = $('team');
    box.innerHTML = '';
    var cats = catList();
    cfg.team.forEach(function (p) {
      var w = el('div', 'person');
      var l = el('div', 'person-l');
      var n = el('input'); n.value = p.name || ''; n.placeholder = 'Name'; n.setAttribute('aria-label', 'Name');
      n.oninput = function () { p.name = n.value; changed(); };
      var r = el('input'); r.value = p.role || ''; r.placeholder = 'Role or specialism'; r.setAttribute('aria-label', 'Role');
      r.oninput = function () { p.role = r.value; changed(); };
      var x = el('button', 'more', '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>');
      x.type = 'button'; x.setAttribute('aria-label', 'Remove');
      x.onclick = function () { cfg.team = cfg.team.filter(function (q) { return q !== p; }); paintTeam(); changed(); };
      [n, r, x].forEach(function (e) { l.appendChild(e); });
      w.appendChild(l);
      if (cats.length > 1) {
        var pc = el('div', 'pcats');
        pc.appendChild(el('span', '', (p.cats && p.cats.length) ? 'Only does:' : 'Does everything. Only does:'));
        cats.forEach(function (c) {
          var b = el('button', 'pc', esc(c)); b.type = 'button';
          b.setAttribute('aria-pressed', !!(p.cats && p.cats.indexOf(c) >= 0));
          b.onclick = function () {
            p.cats = p.cats || [];
            var i = p.cats.indexOf(c);
            if (i >= 0) p.cats.splice(i, 1); else p.cats.push(c);
            paintTeam(); changed();
          };
          pc.appendChild(b);
        });
        w.appendChild(pc);
      }
      box.appendChild(w);
    });
  };
  $('add-person').onclick = function () {
    cfg.team.push({ name: '', role: '', cats: [] });
    paintTeam();
    var ins = $('team').querySelectorAll('.person-l input');
    if (ins.length) ins[ins.length - 2].focus();
    changed();
  };

  /* ── hours ────────────────────────────────────────────────────────────── */

  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var paintHours = function () {
    var box = $('hours');
    box.innerHTML = '';
    DAYS.forEach(function (d, i) {
      var r = el('div', 'hr');
      r.appendChild(el('b', '', d));
      var inp = el('input'); inp.value = cfg.hours[i] || ''; inp.setAttribute('aria-label', d + ' opening hours'); inp.placeholder = 'Closed';
      var st = el('i');
      var check = function () {
        var p = P.parseHoursText(inp.value);
        st.className = p == null ? 'bad' : 'ok';
        st.textContent = p == null ? 'can’t read' : P.fmtHours(p);
      };
      inp.oninput = function () { cfg.hours[i] = inp.value; cfg.hoursAssumed = false; check(); changed(); };
      check();
      r.appendChild(inp); r.appendChild(st);
      box.appendChild(r);
    });
    var cp = el('button', 'link hrs-copy', 'Copy Monday to Tuesday–Friday'); cp.type = 'button';
    cp.onclick = function () { for (var i = 1; i < 5; i++) cfg.hours[i] = cfg.hours[0]; cfg.hoursAssumed = false; paintHours(); changed(); };
    box.appendChild(cp);
  };

  /* ── look ─────────────────────────────────────────────────────────────── */

  var paintSeg = function (id, val) {
    $(id).querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-checked', b.dataset.v === val); });
  };
  $('hero-seg').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    cfg.brand.hero = b.dataset.v; paintSeg('hero-seg', b.dataset.v); changed();
  });
  ['accent', 'paper'].forEach(function (k) {
    $(k + '-pick').addEventListener('input', function () {
      cfg.brand[k] = this.value.toUpperCase(); $(k).value = cfg.brand[k]; changed();
    });
  });

  /* Ask Google Fonts for the usual weights and read back which ones the family
     really has; it has also been known to answer 400 for a missing weight,
     which takes the whole stylesheet down, so narrow the ask if it does.
     A family it doesn't know at all is marked null and left to the fallback. */
  var SPECS = ['wght@400;500;600;700', 'wght@400;700', 'wght@400', ''];
  var fontJobs = {};
  var checkFont = function (name) {
    name = (name || '').trim();
    if (!name) return Promise.resolve('');
    if (name in cfg.fontSpec) return Promise.resolve(cfg.fontSpec[name]);
    if (fontJobs[name]) return fontJobs[name];
    var tryAt = function (i) {
      if (i >= SPECS.length) return Promise.resolve(null);
      /* Google's error page carries no CORS header, so a family it doesn't
         know comes back as a failed fetch rather than a 400 */
      return fetch(G.fontHref(name, SPECS[i])).then(function (r) {
        if (!r.ok) return tryAt(i + 1);
        return r.text().then(function (css) {
          var ws = [];
          css.replace(/font-weight:\s*(\d+)/g, function (_, w) { if (ws.indexOf(w) < 0) ws.push(w); });
          return ws.length ? 'wght@' + ws.sort().join(';') : SPECS[i];
        });
      }, function () { return navigator.onLine === false ? undefined : tryAt(i + 1); });
    };
    fontJobs[name] = tryAt(0).then(function (spec) {
      delete fontJobs[name];
      if (spec !== undefined) { cfg.fontSpec[name] = spec; save(); }
      return spec;
    });
    return fontJobs[name];
  };
  var paintFonts = function () {
    [['head', 'head-stat'], ['body', 'body-stat']].forEach(function (x) {
      var name = (cfg.brand[x[0]] || '').trim(), s = $(x[1]);
      if (!name) { s.className = 'fstat wait'; s.textContent = 'system font'; return; }
      var spec = cfg.fontSpec[name];
      if (spec === undefined) { s.className = 'fstat wait'; s.textContent = 'checking…'; }
      else if (spec === null) { s.className = 'fstat bad'; s.textContent = 'not on Google Fonts'; }
      else { s.className = 'fstat ok'; s.textContent = '✓'; }
    });
  };
  var checkFontSoon = debounce(function () {
    paintFonts();
    Promise.all([checkFont(cfg.brand.head), checkFont(cfg.brand.body)]).then(function () { paintFonts(); refresh(); });
  }, 600);

  /* ── font pairings ────────────────────────────────────────────────────── */

  /* Pairs that suit a clinic, each a heading face and a text face. The weights
     are the ones each family has, so the page never asks Google for a weight
     it would refuse. */
  var PAIRS = [
    ['Soft serif', 'Fraunces', 'DM Sans'],
    ['Classic', 'Playfair Display', 'DM Sans'],
    ['Elegant', 'Cormorant Garamond', 'Jost'],
    ['Warm', 'Lora', 'Mulish'],
    ['Statement', 'DM Serif Display', 'Outfit'],
    ['Luxe', 'Cinzel', 'Jost'],
    ['Spa', 'Marcellus', 'Josefin Sans'],
    ['Traditional', 'Libre Baskerville', 'Source Sans 3'],
    ['Modern', 'Manrope', 'Manrope'],
    ['Fresh', 'Plus Jakarta Sans', 'Plus Jakarta Sans'],
    ['Friendly', 'Nunito', 'Nunito'],
    ['Characterful', 'Bricolage Grotesque', 'Figtree']
  ];
  var WEIGHTS = {
    'DM Serif Display': 'wght@400', 'Marcellus': 'wght@400', 'Libre Baskerville': 'wght@400;700'
  };
  var specFor = function (f) { return WEIGHTS[f] || 'wght@400;500;600;700'; };

  /* the previews need the fonts in the builder too; fetched once, when the
     section first comes into view */
  var previewFonts = {};
  var loadPreviewFont = function (f, spec) {
    if (!f || previewFonts[f]) return;
    previewFonts[f] = 1;
    var l = el('link'); l.rel = 'stylesheet'; l.href = G.fontHref(f, spec);
    document.head.appendChild(l);
  };
  var pairsSeen = false;
  var sitePair = function () {
    var fs = (cfg.siteFonts || []).filter(Boolean);
    if (!fs.length) return null;
    var serif = fs.filter(function (f) { return /serif|garamond|playfair|lora|fraunces|baskerville|cormorant|cinzel|marcellus|gloock|prata|bodoni/i.test(f) && !/sans/i.test(f); })[0];
    var head = serif || fs[0], body = fs.filter(function (f) { return f !== head; })[0] || fs[0];
    return ['Their website', head, body, true];
  };
  var allPairs = function () { var sp = sitePair(); return sp ? [sp].concat(PAIRS) : PAIRS; };

  var paintPairs = function () {
    var box = $('fpairs');
    if (!box) return;
    box.innerHTML = '';
    box.style.setProperty('--fp-paper', G.rgb(cfg.brand.paper) ? cfg.brand.paper : G.DEFAULTS.paper);
    var head = (cfg.brand.head || '').trim(), body = (cfg.brand.body || '').trim();
    allPairs().forEach(function (p) {
      var on = p[1] === head && p[2] === body;
      var b = el('button', 'fp'); b.type = 'button';
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', on);
      var hw = (cfg.fontSpec[p[1]] || specFor(p[1])).indexOf('600') >= 0 ? 600 : ((cfg.fontSpec[p[1]] || specFor(p[1])).indexOf('700') >= 0 ? 700 : 400);
      b.innerHTML = '<span class="fp-h" style="font-family:\'' + esc(p[1]) + '\', Georgia, serif;font-weight:' + hw + '">' + esc(cfg.name.trim() || 'Your clinic') + '</span>' +
        '<span class="fp-b" style="font-family:\'' + esc(p[2]) + '\', system-ui, sans-serif">Book your treatment in under a minute.</span>' +
        '<span class="fp-n"><b>' + esc(p[0]) + '</b> · ' + esc(p[1] === p[2] ? p[1] : p[1] + ' + ' + p[2]) + '</span>';
      b.onclick = function () {
        cfg.brand.head = p[1]; cfg.brand.body = p[2];
        /* a pair from their site gets its weights checked like a typed name */
        if (!p[3]) [p[1], p[2]].forEach(function (f) { if (!cfg.fontSpec[f]) cfg.fontSpec[f] = specFor(f); });
        fillFields(); paintFonts(); paintPairs(); checkFontSoon(); changed();
      };
      box.appendChild(b);
      if (pairsSeen) { loadPreviewFont(p[1], p[3] ? '' : specFor(p[1])); loadPreviewFont(p[2], p[3] ? '' : specFor(p[2])); }
    });
  };
  var paintPairNames = function () {
    Array.prototype.forEach.call(document.querySelectorAll('.fp-h'), function (h) { h.textContent = cfg.name.trim() || 'Your clinic'; });
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es, io) {
      if (!es.some(function (e) { return e.isIntersecting; })) return;
      pairsSeen = true; io.disconnect(); paintPairs();
    }, { rootMargin: '300px' }).observe($('fonts-card'));
  } else { pairsSeen = true; }

  /* ── images ───────────────────────────────────────────────────────────── */

  var loadImg = function (src) {
    return new Promise(function (res, rej) {
      var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src;
    });
  };
  var asDataURL = function (blob) {
    return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(blob); });
  };
  var EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/avif': 'avif' };

  /* photos are cut to 1600px JPEGs; a logo keeps its own format and its
     transparency unless it is enormous */
  var readImage = function (blob, kind) {
    var type = blob.type || '';
    if (type === 'image/svg+xml') {
      return asDataURL(blob).then(function (src) {
        return loadImg(src).then(function (i) { return { src: src, ext: 'svg', w: i.naturalWidth || 300, h: i.naturalHeight || 100 }; },
          function () { return { src: src, ext: 'svg', w: 300, h: 100 }; });
      });
    }
    var ou = URL.createObjectURL(blob);
    return loadImg(ou).then(function (img) {
      var max = kind === 'logo' ? 900 : 1600;
      var W = img.naturalWidth, H = img.naturalHeight, sc = Math.min(1, max / Math.max(W, H));
      var w = Math.round(W * sc), h = Math.round(H * sc);
      if (kind === 'logo' && sc === 1 && blob.size < 300000 && EXT[type]) {
        return asDataURL(blob).then(function (src) { URL.revokeObjectURL(ou); return { src: src, ext: EXT[type], w: w, h: h }; });
      }
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var x = c.getContext('2d');
      var png = kind === 'logo' && type !== 'image/jpeg';
      if (!png) { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); }
      x.imageSmoothingQuality = 'high';
      x.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(ou);
      return { src: c.toDataURL(png ? 'image/png' : 'image/jpeg', png ? undefined : 0.82), ext: png ? 'png' : 'jpg', w: w, h: h };
    });
  };

  /* take a copy so the demo doesn't depend on their site staying up: their
     server if it allows it, the image proxy if not */
  var importImage = function (u, kind) {
    u = G.url(u);
    return F.blobOf(u, kind).then(function (b) { return readImage(b, kind); })
      .then(function (img) { img.from = u; return img; });
  };
  /* a link typed by hand: if no copy can be made at all, link to it */
  var imageFromUrl = function (u, kind) {
    u = G.url(u);
    return importImage(u, kind).catch(function () {
      return loadImg(u).then(function (i) {
        toast('Couldn’t copy that image, so the demo links to it on their site instead', 4500);
        return { src: u, ext: (u.split('?')[0].match(/\.(jpe?g|png|webp|gif|svg|avif)$/i) || [0, 'jpg'])[1].toLowerCase().replace('jpeg', 'jpg'),
          w: i.naturalWidth, h: i.naturalHeight, remote: true, from: u };
      });
    });
  };

  /* their logo sets the brand colour when none has been chosen, and a white
     logo needs a dark header to be seen at all */
  var brandFromLogo = function (img, me) {
    me = me || cfg;
    return loadImg(img.src).then(function (i) {
      var pal = F.paletteOf(i), got = [];
      if (!pal) return got;
      var isDefault = !me.brand.accent || me.brand.accent.toUpperCase() === G.DEFAULTS.accent;
      if (pal.accent && isDefault) { me.brand.accent = pal.accent; got.push('brand colour'); }
      if (pal.whiteOnClear && me.brand.hero === 'light') { me.brand.hero = pal.accent ? 'brand' : 'dark'; got.push('a darker header for their white logo'); }
      return got;
    }, function () { return []; });
  };

  var paintLogo = function () {
    var b = $('logo-img');
    b.innerHTML = cfg.logo ? '<img alt="" src="' + esc(cfg.logo.src) + '">' : '<span>No logo</span>';
    $('logo-x').hidden = !cfg.logo;
  };
  var setLogo = function (p) {
    var me = cfg;
    p.then(function (img) {
      me.logo = img;
      return brandFromLogo(img, me).then(function (got) {
        if (!settle(me)) return;
        paintLogo(); paintFound();
        if (got.length) { fillFields(); paintSeg('hero-seg', cfg.brand.hero); toast('Took ' + got.join(' and ') + ' from the logo'); }
        changed();
      });
    }, function () { toast('That image couldn’t be read'); });
  };
  $('logo-file').onchange = function () { if (this.files[0]) setLogo(readImage(this.files[0], 'logo')); this.value = ''; };
  $('logo-url').onclick = function () {
    var u = prompt('Link to their logo image');
    if (u) setLogo(imageFromUrl(u, 'logo'));
  };
  $('logo-x').onclick = function () { cfg.logo = null; paintLogo(); changed(); };

  var paintPhotos = function () {
    var box = $('shots');
    box.innerHTML = '';
    cfg.photos.forEach(function (ph, i) {
      var s = el('div', 'shot');
      s.innerHTML = '<img alt="" loading="lazy" src="' + esc(ph.src) + '"><span class="shot-n">' + (i + 1) + '</span>';
      var bar = el('div', 'shot-b');
      var mk = function (txt, label, fn) { var b = el('button', '', txt); b.type = 'button'; b.setAttribute('aria-label', label); b.onclick = fn; bar.appendChild(b); };
      mk('‹', 'Move earlier', function () { if (i) { cfg.photos.splice(i - 1, 0, cfg.photos.splice(i, 1)[0]); paintPhotos(); changed(); } });
      mk('×', 'Remove photo', function () { cfg.photos.splice(i, 1); paintPhotos(); changed(); });
      mk('›', 'Move later', function () { if (i < cfg.photos.length - 1) { cfg.photos.splice(i + 1, 0, cfg.photos.splice(i, 1)[0]); paintPhotos(); changed(); } });
      s.appendChild(bar);
      box.appendChild(s);
    });
  };
  var addPhotos = function (files) {
    files = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type); });
    if (!files.length) return;
    toast('Adding ' + files.length + ' photo' + (files.length > 1 ? 's' : '') + '…');
    var me = cfg;
    files.reduce(function (p, f) {
      return p.then(function () { return readImage(f, 'photo').then(function (img) { img.id = uid(); me.photos.push(img); if (me === cfg) paintPhotos(); }); })
        .catch(function () { toast('One photo couldn’t be read'); });
    }, Promise.resolve()).then(function () { if (settle(me)) changed(); });
  };
  $('photo-file').onchange = function () { addPhotos(this.files); this.value = ''; };
  $('photo-url').onclick = function () {
    var u = prompt('Link to a photo (one at a time)');
    var me = cfg;
    if (u) imageFromUrl(u, 'photo').then(function (img) { img.id = uid(); me.photos.push(img); if (settle(me)) { paintPhotos(); changed(); } },
      function () { toast('That link didn’t load as an image'); });
  };
  document.addEventListener('paste', function (e) {
    var a = document.activeElement;
    if (a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && a.type !== 'file'))) return;
    var files = e.clipboardData && e.clipboardData.files;
    if (files && files.length) { e.preventDefault(); addPhotos(files); }
  });
  [['logo-drop', function (f) { setLogo(readImage(f[0], 'logo')); }], ['shots', addPhotos]].forEach(function (x) {
    var z = $(x[0]).closest('.card') || $(x[0]);
    z.addEventListener('dragover', function (e) { e.preventDefault(); $(x[0]).classList.add('over'); });
    z.addEventListener('dragleave', function () { $(x[0]).classList.remove('over'); });
    z.addEventListener('drop', function (e) {
      e.preventDefault(); $(x[0]).classList.remove('over');
      var f = Array.prototype.filter.call(e.dataTransfer.files, function (q) { return /^image\//.test(q.type); });
      if (f.length) x[1](f);
    });
  });

  /* ── what was found ───────────────────────────────────────────────────── */

  /* fills the gaps from a parsed listing; never overwrites what's been typed */
  var applyListing = function (r, ask) {
    var got = [];
    ['name', 'rating', 'reviews', 'phone', 'email', 'address', 'area'].forEach(function (k) {
      if (r[k] && !String(cfg[k] || '').trim()) { cfg[k] = r[k]; got.push(k === 'reviews' ? 'review count' : k); }
    });
    if (got.indexOf('name') >= 0 && !cfg.slugEdited) { cfg.slug = G.slugify(cfg.name); checkExists(); }
    if (r.hours && (cfg.hoursAssumed || !cfg.hours.some(function (h) { return h; }))) { cfg.hours = r.hours; cfg.hoursAssumed = false; got.push('opening hours'); }
    if (r.team && r.team.length && !cfg.team.filter(function (p) { return p.name; }).length) {
      cfg.team = r.team.map(function (p) { return { name: p.name, role: p.role, cats: [] }; });
      got.push(r.team.length + ' practitioner' + (r.team.length > 1 ? 's' : ''));
    }
    if (r.treatments && r.treatments.length) {
      var have = cfg.treatments.filter(function (t) { return t.name; }).length;
      var rows = r.treatments.map(function (t) { return Object.assign({ id: uid() }, t); });
      if (!have || (ask && confirm('Replace your ' + have + ' treatments with the ' + rows.length + ' found?\n\nCancel adds them to the end instead.'))) cfg.treatments = rows;
      else if (ask) cfg.treatments = cfg.treatments.concat(rows);
      var cats = catList().length;
      if (!have || ask) got.unshift(rows.length + ' treatment' + (rows.length > 1 ? 's' : '') + (cats > 1 ? ' in ' + cats + ' categories' : ''));
    }
    if (r.listed) cfg.listed = r.listed;
    if (r.platform && !cfg.reviewSource) cfg.reviewSource = r.platform;
    if (r.reviewList && r.reviewList.length && !cfg.reviewList.length) {
      cfg.reviewList = r.reviewList.map(function (x) { return Object.assign({ id: uid() }, x); });
      got.push(r.reviewList.length + ' review' + (r.reviewList.length > 1 ? 's' : ''));
    }
    return got;
  };
  var repaintAll = function () {
    fillFields(); paintSeg('hero-seg', cfg.brand.hero || 'light');
    paintTreatments(); paintTeam(); paintHours(); paintReviews(); paintLogo(); paintPhotos(); paintFound(); paintFonts(); paintPairs();
  };

  $('qf-go').onclick = function () {
    var text = $('qf-text').value, out = $('qf-out');
    if (!text.trim()) { out.className = 'qf-out bad'; out.textContent = 'Paste something first'; return; }
    var r = P.quickFill(text);
    if (!r.platform) r.platform = F.platformOf(cfg.listing);
    if (hasContent(cfg) && r.name && cfg.name && !namesMatch(r.name, cfg.name)) {
      var bf = cfg.builtFrom || {};
      var keepL = linkKey(cfg.listing) && linkKey(cfg.listing) !== linkKey(bf.listing) ? cfg.listing : '';
      var keepW = linkKey(cfg.website) && linkKey(cfg.website) !== linkKey(bf.website) ? cfg.website : '';
      freshDraft(keepL, keepW, { keepPaste: true, name: r.name }).then(function () { $('qf-go').onclick(); });
      return;
    }
    var got = applyListing(r, true);
    repaintAll(); changed();
    if (got.length) {
      out.className = 'qf-out ok';
      out.textContent = 'Found ' + got.join(', ') + '. Check them against the listing.';
    } else {
      out.className = 'qf-out bad';
      out.textContent = 'Nothing recognisable. Try copying just the treatments section.';
    }
    if (r.listed && r.treatments.length < r.listed)
      toast('Their listing has ' + r.listed + ' treatments but only ' + r.treatments.length + ' were open when copied. Open the rest and paste again to add them.', 7000);
  };

  /* ── build from links ─────────────────────────────────────────────────── */

  var finding = false, runs = 0;
  var firstThat = function (list, fn) {
    return list.reduce(function (p, x) { return p.catch(function () { return fn(x); }); }, Promise.reject());
  };
  var goodPhoto = function (img) {
    var a = img.w / img.h;
    return Math.max(img.w, img.h) >= 500 && a < 2.8 && a > 0.35;
  };

  /* Links for a different clinic start a new draft: the one on screen keeps
     its own links and stays in the list, and the new clinic starts empty, so
     nothing of the last one carries over. */
  var freshDraft = function (L, W, opts) {
    opts = opts || {};
    var old = cfg, was = (old.name || '').trim() || 'The last clinic';
    var bf = old.builtFrom;
    old.listing = bf ? bf.listing || '' : (linkKey(old.listing) === linkKey(L) ? '' : old.listing);
    old.website = bf ? bf.website || '' : (linkKey(old.website) === linkKey(W) ? '' : old.website);
    dirty = old;
    return saveNow().then(allDrafts).then(function (ds) {
      /* a clinic that already has a draft here opens that one, not a copy */
      var mine = ds.filter(function (x) {
        var b = x.builtFrom;
        if (x.id === old.id) return false;
        if (b && ((L && linkKey(b.listing) === linkKey(L)) || (!L && W && linkKey(b.website) === linkKey(W)))) return true;
        return !!(opts.name && x.name && nameKey(x.name) === nameKey(opts.name));
      }).sort(function (a, b) { return b.updated - a.updated; })[0];
      var d = mine || blank();
      if (!mine) { d.listing = L || ''; d.website = W || ''; }
      else if (W && !d.website) d.website = W;
      return putDraft(d).then(function () {
        var paste = $('qf-text').value;
        load(d, { keepLog: opts.keepLog });
        if (opts.keepPaste) $('qf-text').value = paste;
        toast(mine ? 'You already had a draft for ' + (d.name || 'this clinic') + ', so it’s open again. ' + was + ' is saved in the list.'
          : 'New clinic, so this is a fresh draft. ' + was + ' is saved in the list at the top.', 6000);
      });
    });
  };

  var ABANDON = new Error('moved on');
  $('find-go').onclick = function () {
    if (finding) return;
    var L = G.url(cfg.listing), W = G.url(cfg.website);
    if (!L && !W) { toast('Paste their listing link first'); document.querySelector('[data-k=listing]').focus(); return; }
    var verdict = sameClinic(L, W);
    if (verdict === 'other') { freshDraft(L, W).then(function () { $('find-go').onclick(); }); return; }
    finding = true;
    $('find-go').disabled = true;
    $('find-log').innerHTML = ''; $('find-out').textContent = '';
    var me = cfg, run = ++runs;
    me.builtFrom = verdict === 'same' ? { listing: L, website: W } : null;
    /* each step checks the draft on screen is still the one being built */
    var still = function () { if (cfg !== me || run !== runs) throw ABANDON; };
    var step = function (msg) {
      var li = el('li', 'wait', esc(msg)); $('find-log').appendChild(li);
      return {
        ok: function (m) { li.className = 'ok'; li.textContent = m; },
        bad: function (m) { li.className = 'bad'; li.textContent = m; },
        say: function (m) { li.className = ''; li.textContent = m; }
      };
    };
    var photoUrls = [], logoUrls = [], themeHex = '';

    var p = Promise.resolve();
    if (L) p = p.then(function () {
      var s = step('Reading ' + (F.platformOf(L) || 'their listing') + '…');
      return F.listing(L).then(function (r) {
        still();
        /* a draft made before links were remembered: tell by the name */
        if (!me.builtFrom && r.name && me.name && !namesMatch(r.name, me.name)) {
          return freshDraft(L, W, { keepLog: true }).then(function () { me = cfg; return r; });
        }
        return r;
      }).then(function (r) {
        still();
        me.builtFrom = { listing: L, website: W };
        var got = applyListing(r, false);
        photoUrls = photoUrls.concat(r.photos || []);
        repaintAll(); changed();
        s.ok((F.platformOf(L) || 'Listing') + ': ' + (got.length ? got.join(', ') : 'nothing new'));
        if (r.listed && r.treatments.length < r.listed)
          step('').say('Their listing has ' + r.listed + ' treatments but only shows ' + r.treatments.length + ' until a category is opened. Paste the rest below if you need them.');
        if (!r.treatments.length) step('').bad('No treatments came through. Use “Or paste the page instead” below.');
      }, function (e) { if (e === ABANDON) throw e; s.bad('Couldn’t read the listing (' + e.message + '). Use “Or paste the page instead” below.'); });
    });
    if (W) p = p.then(function () {
      var s = step('Reading their website…');
      return F.website(W, cfg.name).then(function (w) {
        still();
        me.builtFrom = { listing: L, website: W };
        var got = [];
        logoUrls = w.logos;
        photoUrls = photoUrls.concat(w.photos);
        themeHex = w.theme;
        ['instagram', 'facebook', 'tiktok', 'privacy', 'terms'].forEach(function (k) {
          if (w.links[k] && !cfg.links[k]) { cfg.links[k] = w.links[k]; got.push(k === 'privacy' || k === 'terms' ? k + ' link' : k); }
        });
        if (w.email && !cfg.email) { cfg.email = w.email; got.push('email'); }
        if (w.phone && !cfg.phone) { cfg.phone = w.phone; got.push('phone'); }
        var defFonts = cfg.brand.head === G.DEFAULTS.head && cfg.brand.body === G.DEFAULTS.body;
        cfg.siteFonts = w.fonts.slice();
        if (w.fonts.length && defFonts) {
          var serif = w.fonts.filter(function (f) { return /serif|garamond|playfair|lora|fraunces|baskerville|cormorant|cinzel|marcellus|gloock|prata|bodoni/i.test(f) && !/sans/i.test(f); })[0];
          cfg.brand.head = serif || w.fonts[0];
          cfg.brand.body = w.fonts.filter(function (f) { return f !== cfg.brand.head; })[0] || w.fonts[0];
          got.push('their fonts');
          checkFontSoon();
        }
        repaintAll(); changed();
        s.ok('Website: ' + (got.length ? got.join(', ') : 'read') + (w.logos.length ? '' : ', no logo marked as one'));
      }, function (e) { if (e === ABANDON) throw e; s.bad('Couldn’t read their website (' + e.message + ')'); });
    });
    p = p.then(function () {
      still();
      cfg.found.logos = logoUrls.slice();
      if (cfg.logo) return;
      if (!logoUrls.length) { step('').say('No logo found, so the name is set as a wordmark in their font'); return; }
      var s = step('Getting their logo…');
      return firstThat(logoUrls, function (u) {
        return importImage(u, 'logo').then(function (img) { if (img.w < 40 || img.h < 16) throw new Error('tiny'); return img; });
      }).then(function (img) {
        still();
        cfg.logo = img;
        return brandFromLogo(img, me).then(function (got) { s.ok('Logo' + (got.length ? ', and ' + got.join(' and ') + ' from it' : '')); });
      }, function (e) { if (e === ABANDON) throw e; s.bad('Found a logo but couldn’t load it'); });
    });
    p = p.then(function () {
      still();
      var isDefault = !cfg.brand.accent || cfg.brand.accent.toUpperCase() === G.DEFAULTS.accent;
      if (isDefault && themeHex && G.rgb(themeHex)) {
        var c = G.rgb(themeHex), mx = Math.max.apply(null, c), mn = Math.min.apply(null, c);
        if (mx - mn > 40) {
          cfg.brand.accent = themeHex.toUpperCase();
          /* a white logo was given a dark header for want of a colour; their own colour suits it better */
          if (cfg.logo && cfg.brand.hero === 'dark') cfg.brand.hero = 'brand';
          step('').ok('Brand colour from their site');
        }
      }
      var want = Math.max(0, 8 - cfg.photos.length), used = {};
      cfg.photos.forEach(function (ph) { if (ph.from) used[ph.from] = 1; });
      var todo = photoUrls.filter(function (u) { return !used[G.url(u)]; });
      if (!want || !todo.length) { cfg.found.photos = todo; if (!todo.length && !cfg.photos.length) step('').say('No photos found, so the gallery is left out'); return; }
      var s = step('Getting photos…'), added = 0, i = 0;
      var next = function () {
        if (added >= want || i >= todo.length) return Promise.resolve();
        var u = todo[i++];
        return importImage(u, 'photo').then(function (img) {
          still();
          if (!goodPhoto(img)) return;
          img.id = uid(); cfg.photos.push(img); added++; paintPhotos();
        }, function () {}).then(next);
      };
      return next().then(function () {
        cfg.found.photos = todo.slice(i);
        if (added) s.ok(added + ' photo' + (added > 1 ? 's' : '') + (cfg.found.photos.length ? ', ' + cfg.found.photos.length + ' more to choose from' : ''));
        else s.bad('Photos were found but none were big enough to use');
      });
    });
    p.then(function () {
      finding = false; $('find-go').disabled = false;
      repaintAll(); changed(); lastHtml = '';
      $('find-out').className = 'qf-out ok';
      $('find-out').textContent = 'Done. Check it against their listing.';
    }, function (e) {
      /* switched to another clinic part-way: drop the rest, keep what's saved */
      if (run === runs) { finding = false; $('find-go').disabled = false; }
      if (e !== ABANDON) { $('find-out').className = 'qf-out bad'; $('find-out').textContent = 'Something went wrong: ' + e.message; }
    });
  };

  /* ── the trays of other logos and photos found ────────────────────────── */

  var paintFound = function () {
    var f = cfg.found || { logos: [], photos: [] };
    var cur = cfg.logo && cfg.logo.from;
    var logos = (f.logos || []).filter(function (u) { return G.url(u) !== cur; });
    $('logo-found').hidden = !logos.length;
    $('logo-alts').innerHTML = '';
    logos.forEach(function (u) {
      var b = el('button', 'alt logo', '<img alt="" loading="lazy" src="' + esc(u) + '">'); b.type = 'button';
      b.title = 'Use this as the logo';
      b.onclick = function () { b.disabled = true; setLogo(importImage(u, 'logo')); };
      $('logo-alts').appendChild(b);
    });
    var photos = f.photos || [];
    $('photo-found').hidden = !photos.length;
    $('photo-alts').innerHTML = '';
    photos.forEach(function (u) {
      var b = el('button', 'alt', '<img alt="" loading="lazy" src="' + esc(F.thumb(u)) + '">'); b.type = 'button';
      b.title = 'Add this photo';
      b.onclick = function () {
        b.disabled = true;
        var me = cfg;
        importImage(u, 'photo').then(function (img) {
          img.id = uid(); me.photos.push(img);
          me.found.photos = me.found.photos.filter(function (x) { return x !== u; });
          if (settle(me)) { paintPhotos(); paintFound(); changed(); }
        }, function () { b.remove(); toast('That one wouldn’t load'); });
      };
      $('photo-alts').appendChild(b);
    });
  };

  /* ── reviews ──────────────────────────────────────────────────────────── */

  var paintReviews = function () {
    var box = $('revs');
    box.innerHTML = '';
    $('rv-count').textContent = cfg.reviewList.length ? cfg.reviewList.length + ' shown under the booking' : 'Real ones only, shown under the booking';
    cfg.reviewList.forEach(function (r) {
      var w = el('div', 'rv');
      var l = el('div', 'rv-l');
      var inp = function (key, ph, label) {
        var i = el('input'); i.value = r[key] || ''; i.placeholder = ph; i.setAttribute('aria-label', label);
        i.oninput = function () { r[key] = i.value; changed(); };
        return i;
      };
      l.appendChild(inp('name', 'Name, as shown', 'Reviewer name'));
      l.appendChild(inp('when', 'Month and year', 'When'));
      var x = el('button', 'more', '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>');
      x.type = 'button'; x.setAttribute('aria-label', 'Remove review');
      x.onclick = function () { cfg.reviewList = cfg.reviewList.filter(function (q) { return q !== r; }); paintReviews(); changed(); };
      l.appendChild(x);
      w.appendChild(l);
      var t = el('textarea'); t.rows = 2; t.value = r.text || ''; t.placeholder = 'Their words, exactly'; t.setAttribute('aria-label', 'Review text');
      t.oninput = function () { r.text = t.value; changed(); };
      w.appendChild(t);
      var m = el('div', 'rv-m');
      m.appendChild(inp('treatment', 'Treatment (optional)', 'Treatment'));
      var sel = el('select'); sel.setAttribute('aria-label', 'Stars');
      [['', 'No stars'], ['5', '★★★★★'], ['4', '★★★★'], ['3', '★★★'], ['2', '★★'], ['1', '★']].forEach(function (o) {
        var op = el('option', '', o[1]); op.value = o[0]; op.selected = String(r.rating || '') === o[0]; sel.appendChild(op);
      });
      sel.onchange = function () { r.rating = sel.value ? +sel.value : null; changed(); };
      m.appendChild(sel);
      w.appendChild(m);
      box.appendChild(w);
    });
  };
  $('add-review').onclick = function () {
    cfg.reviewList.push({ id: uid(), name: '', text: '', when: '', treatment: '', rating: null });
    paintReviews();
    var ts = $('revs').querySelectorAll('.rv-l input');
    if (ts.length) ts[ts.length - 2].focus();
    changed();
  };

  /* ── preview ──────────────────────────────────────────────────────────── */

  /* The preview is rebuilt on every keystroke, so it points at blob URLs
     made once per image rather than inlining every photo again each time. */
  var blobs = new Map();
  var blobUrl = function (src) {
    if (!/^data:/.test(src)) return src;
    if (blobs.has(src)) return blobs.get(src);
    var i = src.indexOf(','), type = src.slice(5, i).split(';')[0];
    var bin = /;base64$/.test(src.slice(0, i)) ? atob(src.slice(i + 1)) : decodeURIComponent(src.slice(i + 1));
    var a = new Uint8Array(bin.length);
    for (var k = 0; k < bin.length; k++) a[k] = bin.charCodeAt(k) & 255;
    var u = URL.createObjectURL(new Blob([a], { type: type }));
    blobs.set(src, u);
    return u;
  };
  var refsFor = function (mode) {
    var pick = mode === 'preview' ? blobUrl : function (s) { return s; };
    return {
      logo: cfg.logo ? pick(cfg.logo.src) : null,
      photos: cfg.photos.map(function (p) { return pick(p.src); }),
      og: mode === 'download' ? (cfg.photos.concat(cfg.logo ? [cfg.logo] : []).filter(function (p) { return p.remote; }).map(function (p) { return p.src; })[0] || null) : null
    };
  };
  var html = function (mode, refs, extra) {
    return G.build(cfg, refs || refsFor(mode), tpl, Object.assign({ source: sourceOf(refs || refsFor(mode)) }, extra || {}));
  };

  /* what the builder needs to open this demo again later, without the
     images inlined */
  var sourceOf = function (refs) {
    var s = {};
    Object.keys(cfg).forEach(function (k) {
      if (['treatments', 'id', 'wa', 'logo', 'photos', 'found'].indexOf(k) < 0) s[k] = cfg[k];
    });
    s = JSON.parse(JSON.stringify(s));
    var real = function (r) { return r && !/^(data|blob):/.test(r) ? r : null; };
    s.logo = cfg.logo ? { ref: real(refs.logo), w: cfg.logo.w, h: cfg.logo.h } : null;
    s.photos = (refs.photos || []).map(real);
    return s;
  };

  var dashHtml = function (refs, extra) {
    var up = function (r) { return !r || /^(https?|data|blob):/.test(r) ? r : '../' + r; };
    return G.buildDash(cfg, { logo: up(refs.logo), photos: (refs.photos || []).map(up), og: refs.og }, tpl, extra || {});
  };

  var view = 'page', lastHtml = '';
  var setView = function (v) {
    view = v; paintSeg('view-seg', v); lastHtml = ''; renderPreview();
  };
  $('view-seg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setView(b.dataset.v); });

  var renderPreview = function () {
    if (!tpl) return;
    var h = view === 'dash' ? dashHtml(refsFor('preview')) : html('preview');
    if (h === lastHtml) return;
    var same = lastHtml.slice(0, 40) === h.slice(0, 40) && (lastHtml.indexOf('id="dash"') >= 0) === (h.indexOf('id="dash"') >= 0);
    lastHtml = h;
    var f = $('pv'), y = 0;
    try { if (same) y = f.contentWindow.scrollY || 0; } catch (e) {}
    f.onload = function () {
      try {
        f.contentWindow.scrollTo(0, y);
        /* the page's links to the dashboard and back switch the preview */
        f.contentDocument.addEventListener('click', function (e) {
          var a = e.target.closest && e.target.closest('a');
          if (!a) return;
          var href = a.getAttribute('href') || '';
          if (/^dashboard\/?$/.test(href)) { e.preventDefault(); setView('dash'); }
          else if (/^\.\.\/?(#.*)?$/.test(href)) { e.preventDefault(); setView('page'); }
        }, true);
      } catch (e) {}
    };
    f.srcdoc = h;
    $('pv-url').textContent = liveUrl(true) + (view === 'dash' ? 'dashboard/' : '');
  };

  var sizeFrame = function () {
    var st = $('pv-stage'), fr = $('pv-frame');
    var W = st.clientWidth, H = st.clientHeight;
    if (!W || !H) return;
    var dev = document.body.dataset.dev, narrow = window.innerWidth < 1000;
    var fw, fh, sc, left, top;
    if (dev === 'phone' && narrow) { fw = W; fh = H; sc = 1; left = 0; top = 0; }
    else if (dev === 'phone') {
      fw = 375; fh = 812; sc = Math.min(1, (H - 48) / fh, (W - 48) / fw);
      left = (W - fw * sc) / 2; top = 24;
    } else {
      fw = 1280; sc = Math.min(1, (W - (narrow ? 0 : 32)) / fw); fh = (H - (narrow ? 0 : 32)) / sc;
      left = (W - fw * sc) / 2; top = narrow ? 0 : 16;
    }
    fr.style.width = fw + 'px'; fr.style.height = fh + 'px';
    fr.style.transform = 'scale(' + sc + ')';
    fr.style.left = left + 'px'; fr.style.top = top + 'px';
    fr.style.borderRadius = dev === 'phone' && !narrow ? '' : '0';
  };
  var setDev = function (d) {
    document.body.dataset.dev = d; settings.dev = d; saveSettings();
    paintSeg('dev-seg', d); sizeFrame();
  };
  $('dev-seg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setDev(b.dataset.v); });
  window.addEventListener('resize', debounce(sizeFrame, 80));
  $('pv-open').onclick = function () {
    if (!tpl) return;
    var u = URL.createObjectURL(new Blob([html('download')], { type: 'text/html' }));
    window.open(u, '_blank');
    setTimeout(function () { URL.revokeObjectURL(u); }, 60000);
  };

  /* ── panes ────────────────────────────────────────────────────────────── */

  var setPane = function (p) {
    document.body.dataset.pane = p;
    window.scrollTo(0, 0);
    if (p === 'preview') requestAnimationFrame(sizeFrame);
  };
  document.querySelectorAll('.tabs button').forEach(function (b) { b.onclick = function () { setPane(b.dataset.pane); }; });
  $('go-pub').onclick = function () { document.body.dataset.sheet = document.body.dataset.sheet === '1' ? '' : '1'; };
  $('pub-x').onclick = function () { document.body.dataset.sheet = ''; };

  /* ── publish panel ────────────────────────────────────────────────────── */

  var liveUrl = function (bare) {
    var u = SITE + '/results/' + (cfg.slug || 'your-clinic') + '/';
    return bare ? u.replace(/^https:\/\//, '') : u;
  };
  var waDefault = function () {
    var hi = cfg.owner && cfg.owner.trim() ? 'Hi ' + cfg.owner.trim().split(' ')[0] : 'Hi';
    return hi + ', it’s ' + (settings.sender || 'Harry') + ' from Saturn Results. Here’s the booking page I built for ' +
      (cfg.name.trim() || 'you') + ': ' + liveUrl(true) + '\n\n' +
      'Have a go at booking something, it takes under a minute. Then have a look at the dashboard you’d run it all from: ' +
      liveUrl(true) + 'dashboard/\n\nLet me know what you think!';
  };
  var waNumber = function () {
    var d = String(cfg.phone || '').replace(/[^\d+]/g, '');
    if (/^\+447\d{9}$/.test(d)) return d.slice(1);
    if (/^07\d{9}$/.test(d)) return '44' + d.slice(1);
    return '';
  };
  var paintPub = function () {
    var ta = $('wa-text');
    if (document.activeElement !== ta) ta.value = cfg.wa || waDefault();
    $('wa-reset').hidden = !cfg.wa;
    var n = waNumber();
    $('wa-open').href = 'https://wa.me/' + n + '?text=' + encodeURIComponent(ta.value);
    $('wa-open').textContent = n ? 'Open their WhatsApp' : 'Open in WhatsApp';
    var g = G.gaps(cfg);
    $('gaps').innerHTML = g.length ? g.map(function (x) { return '<li class="' + x[0] + '">' + esc(x[1]) + '</li>'; }).join('')
      : '<li class="ok">Nothing left out</li>';
  };
  $('wa-text').oninput = function () { cfg.wa = this.value === waDefault() ? '' : this.value; save(); paintPub(); };
  $('wa-reset').onclick = function () { cfg.wa = ''; paintPub(); save(); };
  $('wa-copy').onclick = function () { copy($('wa-text').value, 'Message copied'); };
  $('report').onclick = function () {
    var g = G.gaps(cfg);
    var r = 'Live URL: ' + liveUrl(true) + '\n\nWhatsApp to ' + (cfg.owner || 'the owner') + ':\n' + $('wa-text').value +
      '\n\nLeft out or assumed:\n' + (g.length ? g.map(function (x) { return '- ' + x[1]; }).join('\n') : '- Nothing') + '\n';
    copy(r, 'Report copied');
  };

  $('slug').addEventListener('input', function () {
    var v = G.slugify(this.value);
    cfg.slug = v; cfg.slugEdited = !!this.value;
    changed(); checkExists();
  });
  $('slug').addEventListener('change', function () { this.value = cfg.slug; });

  var existsFor = '';
  var checkExists = debounce(function () {
    var slug = cfg.slug, box = $('exists');
    if (!slug) { box.hidden = true; return; }
    existsFor = slug;
    fetch(SITE + '/results/' + slug + '/?_=' + Date.now(), { cache: 'no-store' }).then(function (r) {
      if (existsFor !== slug) return;
      if (!r.ok) { box.hidden = true; return; }
      return r.text().then(function (t) {
        var m = /<title>([^<]*)<\/title>/i.exec(t);
        var title = m ? m[1].replace(/&middot;|·/g, '·').trim() : 'a page';
        var mine = cfg.published && cfg.published.slug === slug;
        box.hidden = false;
        box.textContent = mine ? 'Published before. Publishing again updates it.'
          : 'Something already lives here (“' + title + '”). Publishing replaces it.';
      });
    }).catch(function () { box.hidden = true; });
  }, 600);

  /* ── publishing ───────────────────────────────────────────────────────── */

  var log = function (msg, cls) { var li = el('li', cls || '', esc(msg)); $('log').appendChild(li); return li; };

  var b64text = function (s) {
    var bytes = new TextEncoder().encode(s), bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  var b64data = function (d) {
    var i = d.indexOf(','), head = d.slice(0, i);
    return /;base64$/.test(head) ? d.slice(i + 1) : b64text(decodeURIComponent(d.slice(i + 1)));
  };

  var gh = function (path, method, body) {
    return fetch('https://api.github.com/repos/' + settings.repo + path, {
      method: method || 'GET',
      headers: Object.assign({
        'Accept': 'application/vnd.github+json',
        'Authorization': 'Bearer ' + settings.token.trim(),
        'X-GitHub-Api-Version': '2022-11-28'
      }, body ? { 'Content-Type': 'application/json' } : {}),
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    }).then(function (r) {
      if (r.ok) return r.status === 204 ? null : r.json();
      return r.json().catch(function () { return {}; }).then(function (j) {
        var e = new Error(j.message || r.statusText); e.status = r.status; throw e;
      });
    });
  };
  var ghWhy = function (e) {
    if (e.status === 401) return 'GitHub didn’t accept the token. Check it in Settings.';
    if (e.status === 403 || e.status === 404) return 'The token can’t write to ' + settings.repo + '. It needs Contents: Read and write on that repository.';
    if (e.status === 422 || e.status === 409) return 'The site changed while publishing. Try again.';
    return 'GitHub said: ' + (e.message || 'something went wrong');
  };

  var busy = false;
  $('publish').onclick = function () { publish(1); };

  var publish = function (attempt) {
    if (busy && attempt === 1) return;
    var why = !cfg.name.trim() ? 'Give the clinic a name first'
      : !cfg.slug ? 'Give it an address first'
      : !cfg.treatments.filter(function (t) { return t.name; }).length ? 'Add at least one treatment first'
      : !tpl ? 'Still loading, try again in a second' : '';
    if (why) { toast(why); return; }
    if (!settings.token) { toast('Add a GitHub token in Settings to publish'); openSettings(); return; }

    busy = true;
    $('publish').disabled = true;
    if (attempt === 1) { $('log').innerHTML = ''; $('live').hidden = true; }
    var me = cfg, slug = cfg.slug, base = 'results/' + slug + '/';
    var buildId = uid() + uid();
    var files = [], keep = {}, refs = { logo: null, photos: [] };

    var place = function (img, name) {
      if (!img) return null;
      if (/^data:/.test(img.src)) {
        var path = 'img/' + name + '.' + (img.ext || 'jpg');
        files.push({ path: base + path, b64: b64data(img.src) });
        return path;
      }
      var mine = SITE + '/' + base;
      if (img.src.indexOf(mine) === 0) { var rel = img.src.slice(mine.length).split('?')[0]; keep[base + rel] = 1; return rel; }
      return img.src;
    };

    var step = log(attempt > 1 ? 'Trying again…' : 'Checking fonts…');
    Promise.all([checkFont(cfg.brand.head), checkFont(cfg.brand.body)]).then(function () {
      refs.logo = place(cfg.logo, 'logo');
      refs.photos = cfg.photos.map(function (p, i) { return place(p, 'photo-' + (i + 1)); });
      var abs = function (r) { return !r ? null : (/^https?:/.test(r) ? r : SITE + '/' + base + r); };
      refs.og = abs(refs.photos[0]) || abs(refs.logo);
      var page = G.build(cfg, refs, tpl, { buildId: buildId, url: liveUrl(), source: sourceOf(refs) });
      files.push({ path: base + 'index.html', b64: b64text(page) });
      files.push({ path: base + 'dashboard/index.html', b64: b64text(dashHtml(refs, { buildId: buildId, url: liveUrl() + 'dashboard/' })) });
      step.textContent = 'Reading the site';

      var head, tree;
      return gh('/git/ref/heads/' + settings.branch).then(function (ref) {
        head = ref.object.sha;
        return gh('/git/commits/' + head);
      }).then(function (c) {
        tree = c.tree.sha;
        return gh('/git/trees/' + tree + '?recursive=1');
      }).then(function (t) {
        var old = t.truncated ? [] : t.tree.filter(function (e) { return e.type === 'blob' && e.path.indexOf(base) === 0; }).map(function (e) { return e.path; });
        step.className = 'ok';
        step = log('Uploading ' + files.length + ' file' + (files.length > 1 ? 's' : ''));
        return files.reduce(function (p, f) {
          return p.then(function () {
            return gh('/git/blobs', 'POST', { content: f.b64, encoding: 'base64' }).then(function (b) { f.sha = b.sha; });
          });
        }, Promise.resolve()).then(function () { return old; });
      }).then(function (old) {
        var mine = {};
        files.forEach(function (f) { mine[f.path] = 1; });
        var entries = files.map(function (f) { return { path: f.path, mode: '100644', type: 'blob', sha: f.sha }; });
        old.forEach(function (p) { if (!mine[p] && !keep[p]) entries.push({ path: p, mode: '100644', type: 'blob', sha: null }); });
        step.className = 'ok';
        step = log('Committing');
        return gh('/git/trees', 'POST', { base_tree: tree, tree: entries });
      }).then(function (nt) {
        return gh('/git/commits', 'POST', { message: 'Add demo: ' + me.name.trim(), tree: nt.sha, parents: [head] });
      }).then(function (nc) {
        return gh('/git/refs/heads/' + settings.branch, 'PATCH', { sha: nc.sha }).then(function () { return nc; });
      }).then(function (nc) {
        step.className = 'ok';
        step.textContent = 'Committed ' + nc.sha.slice(0, 7) + ' to ' + settings.branch;
        /* the next publish of this draft can keep the photos already up */
        if (me.logo && /^data:/.test(me.logo.src)) me.logo.src = SITE + '/' + base + refs.logo;
        me.photos.forEach(function (p, i) { if (/^data:/.test(p.src)) p.src = SITE + '/' + base + refs.photos[i]; });
        me.published = { slug: slug, at: Date.now(), sha: nc.sha };
        if (settle(me)) save();
        waitLive(slug, buildId);
      });
    }).catch(function (e) {
      busy = false; $('publish').disabled = false;
      if ((e.status === 422 || e.status === 409) && attempt < 3) { step.textContent = 'The site moved on, retrying'; return publish(attempt + 1); }
      step.className = 'bad';
      step.textContent = e.status ? ghWhy(e) : 'Couldn’t reach GitHub: ' + e.message;
    });
  };

  var waitLive = function (slug, buildId) {
    var li = log('Waiting for the site to update. Usually under a minute.');
    var t0 = Date.now();
    var tick = function () {
      fetch(SITE + '/results/' + slug + '/?_=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (t) {
          if (t.indexOf(buildId) >= 0) return done(true);
          if (Date.now() - t0 > 240000) return done(false);
          setTimeout(tick, 5000);
        }, function () { if (Date.now() - t0 > 240000) done(false); else setTimeout(tick, 5000); });
    };
    var done = function (ok) {
      busy = false; $('publish').disabled = false;
      li.className = ok ? 'ok' : '';
      li.textContent = ok ? 'Live' : 'Committed, but the site hasn’t shown it yet. Give it another minute.';
      $('live').hidden = false;
      $('live-a').href = liveUrl(); $('live-a').textContent = liveUrl(true);
      checkExists();
    };
    setTimeout(tick, 8000);
  };
  $('live-copy').onclick = function () { copy(liveUrl(), 'Link copied'); };

  $('download').onclick = function () {
    if (!tpl) return;
    Promise.all([checkFont(cfg.brand.head), checkFont(cfg.brand.body)]).then(function () {
      var a = el('a');
      a.href = URL.createObjectURL(new Blob([html('download')], { type: 'text/html' }));
      a.download = 'index.html';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 10000);
    });
  };

  /* ── settings ─────────────────────────────────────────────────────────── */

  var openSettings = function () {
    $('set-sender').value = settings.sender || '';
    $('set-token').value = settings.token || '';
    $('set-repo').value = settings.repo;
    $('set-branch').value = settings.branch;
    $('set-out').textContent = '';
    $('dlg-settings').showModal();
  };
  $('settings').onclick = openSettings;
  $('dlg-settings').addEventListener('close', function () {
    if (this.returnValue !== 'save') return;
    settings.sender = $('set-sender').value.trim() || 'Harry';
    settings.token = $('set-token').value.trim();
    settings.repo = $('set-repo').value.trim() || 'SaturnResults/saturnresults.github.io';
    settings.branch = $('set-branch').value.trim() || 'main';
    saveSettings(); paintPub();
    toast('Settings saved on this device');
  });
  $('set-check').onclick = function () {
    var out = $('set-out'), keep = { token: settings.token, repo: settings.repo };
    settings.token = $('set-token').value.trim(); settings.repo = $('set-repo').value.trim();
    out.className = 'qf-out'; out.textContent = 'Checking…';
    gh('').then(function (r) {
      var ok = r.permissions && r.permissions.push;
      out.className = 'qf-out ' + (ok ? 'ok' : 'bad');
      out.textContent = ok ? 'Can publish to ' + r.full_name : 'Can read ' + r.full_name + ' but not write to it';
    }, function (e) { out.className = 'qf-out bad'; out.textContent = ghWhy(e); })
      .then(function () { settings.token = keep.token; settings.repo = keep.repo; });
  };

  /* ── drafts ───────────────────────────────────────────────────────────── */

  var paintDrafts = function () {
    allDrafts().then(function (ds) {
      ds.sort(function (a, b) { return b.updated - a.updated; });
      var sel = $('draft');
      sel.innerHTML = '';
      if (!ds.some(function (d) { return d.id === cfg.id; })) ds.unshift(cfg);
      ds.forEach(function (d) {
        var o = el('option'); o.value = d.id;
        o.textContent = (d.id === cfg.id ? cfg.name : d.name) || 'Untitled clinic';
        o.selected = d.id === cfg.id;
        sel.appendChild(o);
      });
      var del = el('option'); del.value = '__delete'; del.textContent = 'Delete this draft…';
      sel.appendChild(del);
    });
  };
  var load = function (d, opts) {
    opts = opts || {};
    if (dirty) saveNow();
    var b = blank();
    /* a copy, so nothing on screen shares a list with any other draft */
    d = JSON.parse(JSON.stringify(d));
    cfg = Object.assign(b, d);
    if (!opts.keepLog) { runs++; finding = false; $('find-go').disabled = false; }
    ['brand', 'copy', 'links'].forEach(function (k) { cfg[k] = Object.assign({}, b[k], d[k] || {}); });
    cfg.fontSpec = Object.assign({}, b.fontSpec, d.fontSpec || {});
    if (!cfg.hours || cfg.hours.length !== 7) cfg.hours = b.hours;
    cfg.treatments.forEach(function (t) { if (!t.id) t.id = uid(); });
    try { localStorage.setItem('srdb.current', cfg.id); } catch (e) {}
    openRows = {}; lastHtml = '';
    fillFields(); paintSeg('hero-seg', cfg.brand.hero || 'light');
    if (!cfg.reviewList) cfg.reviewList = [];
    cfg.found = Object.assign({ logos: [], photos: [] }, cfg.found || {});
    paintTreatments(); paintTeam(); paintHours(); paintReviews(); paintLogo(); paintPhotos(); paintFound(); paintFonts(); paintPairs(); paintHints();
    if (!opts.keepLog) { $('find-log').innerHTML = ''; $('find-out').textContent = ''; }
    $('log').innerHTML = ''; $('live').hidden = !cfg.published;
    if (cfg.published) { $('live-a').href = liveUrl(); $('live-a').textContent = liveUrl(true); }
    $('qf-out').textContent = '';
    paintDrafts(); refresh(); checkExists(); checkFontSoon();
  };
  $('draft').onchange = function () {
    var v = this.value;
    if (v === '__delete') {
      if (confirm('Delete the draft “' + (cfg.name || 'Untitled clinic') + '” from this device? A published demo stays up.')) {
        delDraft(cfg.id).then(function () {
          return allDrafts();
        }).then(function (ds) {
          ds.sort(function (a, b) { return b.updated - a.updated; });
          load(ds[0] || blank());
        });
      } else paintDrafts();
      return;
    }
    allDrafts().then(function (ds) {
      var d = ds.filter(function (x) { return x.id === v; })[0];
      if (d) load(d);
    });
  };
  $('new').onclick = function () {
    var d = blank();
    if (dirty) saveNow();
    putDraft(d).then(function () { load(d); setPane('edit'); $('qf-text').value = ''; window.scrollTo(0, 0); $('pane-edit').scrollTop = 0; toast('New clinic started. The last one is saved in the list at the top.'); });
  };

  /* open a demo that is already live, from the config it carries */
  $('open').onclick = function () {
    var v = prompt('Address of a published demo (e.g. revive-and-repair-clinic or its full link)');
    if (!v) return;
    var slug = v.trim().replace(/^https?:\/\/[^/]+/, '').replace(/^\/?results\//, '').replace(/\/.*$/, '').replace(/^\//, '');
    slug = G.slugify(slug);
    if (!slug) return;
    toast('Opening ' + slug + '…');
    fetch(SITE + '/results/' + slug + '/?_=' + Date.now(), { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('not found');
      return r.text();
    }).then(function (t) {
      var doc = new DOMParser().parseFromString(t, 'text/html');
      var cj = doc.getElementById('demo-config');
      var conf = cj ? JSON.parse(cj.textContent) : null;
      if (!conf || !conf.builder) throw new Error('not built here');
      var m = /var TREATMENTS = (\[[\s\S]*?\n\]);/.exec(t);
      var treatments = m ? JSON.parse(m[1]) : [];
      var s = conf.builder, base = SITE + '/results/' + slug + '/';
      var abs = function (r) { return !r ? null : (/^https?:/.test(r) ? r : base + r); };
      var d = Object.assign({}, s, { id: uid(), treatments: treatments.map(function (x) { return Object.assign({ id: uid() }, x); }) });
      d.logo = s.logo && s.logo.ref ? { src: abs(s.logo.ref), w: s.logo.w, h: s.logo.h, ext: s.logo.ref.split('.').pop() } : null;
      d.photos = (s.photos || []).filter(Boolean).map(function (r) { return { id: uid(), src: abs(r), ext: r.split('.').pop() }; });
      d.slug = slug; d.slugEdited = true;
      d.published = d.published || { slug: slug, at: Date.now() };
      return allDrafts().then(function (ds) {
        var same = ds.filter(function (x) { return x.slug === slug; })[0];
        if (same) {
          if (!confirm('You already have a draft for ' + slug + ' on this device.\n\nOK replaces it with the live version. Cancel opens your draft instead.')) {
            load(same); return;
          }
          d.id = same.id;
        }
        return putDraft(d).then(function () { load(d); toast('Opened ' + (d.name || slug)); });
      });
    }).catch(function (e) {
      toast(e.message === 'not built here' ? 'That page wasn’t made with the builder, so it can’t be opened here' : 'No demo found at /results/' + slug + '/', 5000);
    });
  };

  /* ── boot ─────────────────────────────────────────────────────────────── */

  bindFields();
  document.body.dataset.dev = settings.dev || 'phone';
  paintSeg('dev-seg', document.body.dataset.dev);
  paintSeg('view-seg', 'page');

  loadTemplates().then(function () {
    return allDrafts();
  }, function () {
    toast('Couldn’t load the page template. Open the builder from saturnresults.co.uk/demo-builder/', 8000);
    return allDrafts();
  }).then(function (ds) {
    var cur = null;
    try { cur = localStorage.getItem('srdb.current'); } catch (e) {}
    ds.sort(function (a, b) { return b.updated - a.updated; });
    var d = ds.filter(function (x) { return x.id === cur; })[0] || ds[0];
    if (!d) { d = blank(); putDraft(d); }
    load(d);
    requestAnimationFrame(sizeFrame);
  });
})();
