/* ───────────────────────────────────────────────────────────────────────────
   Find — reads a clinic's listing and website from their links

   A static page can't read another site, so two free public services do the
   fetching: r.jina.ai renders a page and hands back its text, images and
   links; images.weserv.nl re-serves an image with the CORS header a canvas
   needs, for sites whose own servers leave it off. Only public pages go
   through them. Everything found is a suggestion the builder shows and the
   person can undo.
   ─────────────────────────────────────────────────────────────────────────── */
(function (root) {
  'use strict';
  var P = root.SRParse;

  var reader = function (url, kind, fresh) {
    var h = { 'Accept': 'application/json', 'X-With-Images-Summary': 'all' };
    if (kind === 'listing') h['X-Return-Format'] = 'text';
    else h['X-With-Links-Summary'] = 'all';
    /* a cached snapshot of a site built in JavaScript can be empty */
    if (fresh) h['X-No-Cache'] = 'true';
    return fetch('https://r.jina.ai/' + url, { headers: h }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || !j.data) {
          var e = new Error(r.status === 429 ? 'too many requests, wait a minute' : (j.readableMessage || j.message || 'couldn’t open it'));
          e.status = r.status; throw e;
        }
        return j.data;
      });
    });
  };

  var images = function (d) {
    var im = d.images || {};
    return Object.keys(im).map(function (k) {
      return { alt: k.replace(/^Image [\d,\s]+:?\s*/, '').trim(), url: im[k] };
    }).filter(function (i) { return /^https?:\/\//.test(i.url); });
  };
  var JUNK = /\.(svg|ico|gif)(\?|$)|icon|sprite|avatar|badge|placeholder|spinner|loader|pixel|tracking|emoji|flag|payment|trustpilot|google-?play|app-?store|onetrust|mapbox|staticmap|review_photos|powered/i;
  var sameImage = function (u) { return u.replace(/[?#].*$/, '').replace(/\/v1\/(fill|fit|crop)\/.*$/, ''); };
  var uniq = function (xs) {
    var seen = {}, out = [];
    xs.forEach(function (u) { var k = sameImage(u); if (u && !seen[k]) { seen[k] = 1; out.push(u); } });
    return out;
  };
  /* Wix and Squarespace serve thumbnails by URL; ask for something bigger */
  var bigger = function (u) {
    if (/static\.wixstatic\.com\/media\//.test(u)) return u.replace(/\/v1\/.*$/, '');
    if (/squarespace-cdn\.com/.test(u)) return u.replace(/\?.*$/, '') + '?format=1500w';
    if (/ik\.imagekit\.io/.test(u)) return u.replace(/\?tr=[^&]*/, '?tr=w-1600');
    if (/[?&]size=\d+x\d+/.test(u)) return u.replace(/([?&])size=\d+x\d+&?/, '$1').replace(/[?&]$/, '');   /* Booksy */
    return u;
  };

  /* ── the booking listing ──────────────────────────────────────────────── */

  var listing = function (url) {
    return reader(url, 'listing').then(function (d) {
      return (d.text || d.content || '').length > 800 ? d : reader(url, 'listing', true);
    }).then(function (d) {
      var text = d.text || d.content || '';
      var r = P.quickFill(text);
      r.platform = P.platformOf(url) || r.platform;
      var key = (r.name || d.title || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').slice(0, 14).trim();
      var photos = images(d).filter(function (i) {
        var alt = i.alt.toLowerCase().replace(/[^a-z0-9 ]/g, '');
        return !JUNK.test(i.url) && key.length > 3 && alt.indexOf(key) >= 0;
      }).map(function (i) { return bigger(i.url); });
      var og = (d.metadata || {})['og:image'];
      if (og && !JUNK.test(og) && !photos.length) photos.push(og);
      r.photos = uniq(photos);
      r.text = text;
      return r;
    });
  };

  /* ── their own website ────────────────────────────────────────────────── */

  var SOCIAL = { instagram: /instagram\.com\/(?!p\/|reel|explore)[\w.]+/i, facebook: /facebook\.com\/(?!sharer|share|dialog|tr\b)[\w.\-]+/i, tiktok: /tiktok\.com\/@[\w.]+/i };

  /* Which image is their logo? Nothing labels it reliably: Fix Physio's is
     "fixphysio.svg", Therapy Clinic London's is "tcl-logo.png" with the
     clinic's name as its alt, and the one image on Fix Physio's page with
     "logo" in its name is the CSP's. So each candidate is scored, and badges
     from professional bodies, payment firms and booking platforms sink. */
  var THIRD = /\b(csp|cnhc|hcpc|gosc|nhs|bupa|axa|aviva|vitality|cigna|simplyhealth|fresha|treatwell|booksy|setmore|google|facebook|instagram|tiktok|whatsapp|trustpilot|trustindex|tripadvisor|yell|checkatrade|visa|mastercard|amex|paypal|apple|stripe|klarna|clearpay|wix|squarespace|wordpress|godaddy|award|winner|partner|member|accredit|association|society|council|register|insur|federation|institute)\b/i;
  var alnum = function (x) { return String(x || '').toLowerCase().replace(/[^a-z0-9]/g, ''); };
  var hostOf = function (u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  var coreOf = function (host) { return alnum(host.split('.')[0]); };

  /* 03330113433 → 0333 011 3433, the way people write them */
  var ukPhone = function (raw) {
    var d = String(raw).replace(/[^\d+]/g, '').replace(/^\+44/, '0').replace(/^0044/, '0');
    if (!/^0\d{9,10}$/.test(d)) return String(raw).trim();
    if (/^07/.test(d)) return d.slice(0, 5) + ' ' + d.slice(5);
    if (/^02/.test(d)) return d.slice(0, 3) + ' ' + d.slice(3, 7) + ' ' + d.slice(7);
    if (/^0[389]/.test(d)) return d.slice(0, 4) + ' ' + d.slice(4, 7) + ' ' + d.slice(7);
    return d.slice(0, 5) + ' ' + d.slice(5);
  };

  var website = function (url, hint) {
    return reader(url, 'site', true).then(function (d) {
      var out = { logos: [], photos: [], links: {}, fonts: [], theme: '', email: '', phone: '', title: d.title || '' };
      var meta = d.metadata || {}, ext = d.external || {};
      var imgs = images(d);
      var host = hostOf(d.url || url), core = coreOf(host);
      var nameKey = alnum(hint || meta['og:site_name'] || '');

      var scored = [];
      imgs.forEach(function (i, n) {
        var file = alnum(decodeURIComponent(i.url.split(/[?#]/)[0].split('/').pop() || ''));
        var both = i.url + ' ' + i.alt, sc = 0;
        if (/googleusercontent|gravatar|profile picture|avatar/i.test(both)) return;
        if (core.length > 3 && file.indexOf(core) >= 0) sc += 4;
        if (nameKey.length > 3 && (alnum(i.alt) === nameKey || alnum(i.alt).indexOf(nameKey) >= 0)) sc += 3;
        if (/logo/i.test(both)) sc += 3;
        if (n < 2) sc += 2;
        if (/\.(svg|png|webp)(\?|$)/i.test(i.url)) sc += 1;
        if (THIRD.test(both.replace(/[-_]/g, ' '))) sc -= 6;
        if (/[-_](light|white|inverse|reversed|wht)\b/i.test(i.url)) sc -= 3;
        if (/\.(jpe?g)(\?|$)/i.test(i.url) && !/logo/i.test(both)) sc -= 2;
        if (sc >= 4) scored.push({ u: i.url, sc: sc, n: n });
      });
      scored.sort(function (a, b) { return b.sc - a.sc || a.n - b.n; });
      out.logos = scored.map(function (x) { return x.u; });
      if (meta['og:logo']) out.logos.push(meta['og:logo']);
      /* their own touch icon, as a last resort; never the hosting platform's */
      var mine = function (u) { var h = hostOf(u); return h && (h === host || h.slice(-host.length - 1) === '.' + host); };
      Object.keys(ext['apple-touch-icon'] || {}).concat(Object.keys(ext['apple-touch-icon-precomposed'] || {})).forEach(function (u) {
        if (mine(u)) out.logos.push(u);
      });
      Object.keys(ext.icon || {}).forEach(function (u) {
        var sz = parseInt(((ext.icon[u] || {}).sizes || '').split('x')[0], 10);
        if (mine(u) && sz >= 96 && !/\.ico(\?|$)/i.test(u)) out.logos.push(u);
      });
      out.logos = uniq(out.logos);

      if (meta['og:image'] && !/logo/i.test(meta['og:image'])) out.photos.push(meta['og:image']);
      imgs.forEach(function (i) {
        if (!JUNK.test(i.url) && !/logo|googleusercontent|profile picture/i.test(i.url + ' ' + i.alt) && out.logos.indexOf(i.url) < 0) out.photos.push(bigger(i.url));
      });
      out.photos = uniq(out.photos);

      out.theme = meta['theme-color'] || meta['msapplication-TileColor'] || '';

      Object.keys(ext.stylesheet || {}).concat(Object.keys(ext.preload || {})).forEach(function (u) {
        var m = /fonts\.googleapis\.com\/css2?\?(.+)$/.exec(u);
        if (!m) return;
        m[1].split('&').forEach(function (p) {
          if (/^family=/.test(p)) p.slice(7).split('|').forEach(function (f) {
            var name = decodeURIComponent(f.split(':')[0].replace(/\+/g, ' ')).trim();
            if (name && out.fonts.indexOf(name) < 0) out.fonts.push(name);
          });
        });
      });

      (d.links || []).forEach(function (l) {
        var text = String(l[0] || ''), href = String(l[1] || '');
        Object.keys(SOCIAL).forEach(function (k) {
          var m = SOCIAL[k].exec(href);
          if (m && !out.links[k]) out.links[k] = href.replace(/[?&](utm_[^&]*|fbclid=[^&]*|igshid=[^&]*)/g, '').replace(/\?$/, '');
        });
        if (/^mailto:/i.test(href) && !out.email) out.email = decodeURIComponent(href.slice(7).split('?')[0]);
        if (/^tel:/i.test(href) && !out.phone) out.phone = ukPhone(decodeURIComponent(href.slice(4)));
        if (/privacy/i.test(text + href) && !/cookie/i.test(text) && !out.links.privacy && /^https?:/.test(href)) out.links.privacy = href;
        if (/terms|cancell?ation|booking policy/i.test(text) && !out.links.terms && /^https?:/.test(href)) out.links.terms = href;
      });
      return out;
    });
  };

  /* ── images ───────────────────────────────────────────────────────────── */

  var proxy = function (u, kind, w) {
    return 'https://images.weserv.nl/?url=' + encodeURIComponent(u) +
      (kind === 'logo' ? '&output=png' : '&output=jpg&q=86&w=' + (w || 1600) + '&we');
  };
  var thumb = function (u) { return proxy(u, 'photo', 240); };

  /* their own server first, then the proxy; whichever lets us read it */
  var blobOf = function (u, kind) {
    var grab = function (x) {
      return fetch(x, { mode: 'cors' }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.blob();
      }).then(function (b) {
        if (!/^image\//.test(b.type)) throw new Error('not an image');
        return b;
      });
    };
    return grab(u).catch(function () { return grab(proxy(u, kind)); });
  };

  /* the brand colour: the commonest saturated hue in the logo, skipping
     white, black and greys; and whether the logo is white-on-nothing */
  var paletteOf = function (img) {
    var c = document.createElement('canvas'), s = 64;
    var r = Math.min(1, s / Math.max(img.naturalWidth || s, img.naturalHeight || s));
    c.width = Math.max(1, Math.round((img.naturalWidth || s) * r));
    c.height = Math.max(1, Math.round((img.naturalHeight || s) * r));
    var x = c.getContext('2d');
    x.drawImage(img, 0, 0, c.width, c.height);
    var px;
    try { px = x.getImageData(0, 0, c.width, c.height).data; } catch (e) { return null; }
    var bins = {}, light = 0, solid = 0, clear = 0;
    for (var i = 0; i < px.length; i += 4) {
      var R = px[i], G = px[i + 1], B = px[i + 2], A = px[i + 3];
      if (A < 160) { clear++; continue; }
      solid++;
      var mx = Math.max(R, G, B) / 255, mn = Math.min(R, G, B) / 255, L = (mx + mn) / 2;
      var S = mx === mn ? 0 : (L > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn));
      if (L > 0.86) light++;
      if (S < 0.28 || L < 0.12 || L > 0.88) continue;
      var H;
      if (mx === mn) H = 0;
      else if (mx === R / 255) H = ((G - B) / 255 / (mx - mn)) % 6;
      else if (mx === G / 255) H = (B - R) / 255 / (mx - mn) + 2;
      else H = (R - G) / 255 / (mx - mn) + 4;
      var bin = Math.round(((H * 60 + 360) % 360) / 20);
      var b = bins[bin] || (bins[bin] = { n: 0, r: 0, g: 0, b: 0 });
      b.n++; b.r += R; b.g += G; b.b += B;
    }
    var best = null;
    Object.keys(bins).forEach(function (k) { if (!best || bins[k].n > best.n) best = bins[k]; });
    var hex = null;
    if (best && best.n >= Math.max(6, solid * 0.04)) {
      hex = '#' + [best.r, best.g, best.b].map(function (v) { return ('0' + Math.round(v / best.n).toString(16)).slice(-2); }).join('').toUpperCase();
    }
    return { accent: hex, whiteOnClear: clear > solid * 0.3 && light > solid * 0.7 };
  };

  root.SRFind = { listing: listing, website: website, blobOf: blobOf, thumb: thumb, paletteOf: paletteOf, platformOf: P.platformOf };
})(this);
