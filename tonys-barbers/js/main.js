// Tony's Barbers · Exmouth

const SHOP = {
  name: "Tony's Barbers",
  address: '12 The Parade, Exmouth, Devon EX8 1RW',
};
const HOURS = [ // [day, open, close] — Europe/London
  ['Monday', 9, 18], ['Tuesday', 9, 18], ['Wednesday', 9, 18], ['Thursday', 9, 19],
  ['Friday', 9, 19], ['Saturday', 9, 19], ['Sunday', 10, 16],
];
const fmtH = h => (h > 12 ? h - 12 : h) + (h >= 12 ? 'pm' : 'am');

// ---------- Live open / closed status ----------
function londonNow() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'long', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
  const g = t => (parts.find(p => p.type === t) || {}).value;
  return { day: g('weekday'), h: +g('hour') + +g('minute') / 60 };
}
function renderStatus() {
  const now = londonNow();
  const i = Math.max(0, HOURS.findIndex(x => x[0] === now.day));
  const [, o, c] = HOURS[i];
  const open = now.h >= o && now.h < c;
  let text;
  if (open) text = 'Open now · until ' + fmtH(c);
  else if (now.h < o) text = 'Closed · opens ' + fmtH(o) + ' today';
  else { const nx = HOURS[(i + 1) % 7]; text = 'Closed · opens ' + (i === 6 ? 'Monday' : 'tomorrow') + ' ' + fmtH(nx[1]); }
  document.querySelectorAll('[data-status]').forEach(el => {
    el.classList.toggle('is-open', open);
    const t = el.querySelector('[data-status-text]'); if (t) t.textContent = text;
  });
  document.querySelectorAll('[data-hours]').forEach(ul => {
    ul.innerHTML = HOURS.map(([d, o, c]) => `<li class="${d === now.day ? 'today' : ''}"><span>${d}</span><span>${fmtH(o)} – ${fmtH(c)}</span></li>`).join('');
  });
}
renderStatus();
setInterval(renderStatus, 60000);

// ---------- Nav scroll behaviour (Longis Bay) ----------
const nav = document.getElementById('nav');
let lastScrollY = window.scrollY, scrollDownFrom = window.scrollY, hideScrollY = 0;
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  const upThreshold = window.innerWidth <= 768 ? 80 : 0;
  nav?.classList.toggle('scrolled', y > 40);
  if (y <= 80) { nav?.classList.remove('nav--hidden'); scrollDownFrom = y; hideScrollY = 0; }
  else if (y > lastScrollY) {
    scrollDownFrom = Math.min(scrollDownFrom, y);
    if (y > scrollDownFrom + 10) { nav?.classList.add('nav--hidden'); hideScrollY = y; }
  } else if (y < lastScrollY) {
    scrollDownFrom = y;
    if (hideScrollY > 0 && y < hideScrollY - upThreshold) { nav?.classList.remove('nav--hidden'); hideScrollY = 0; }
  }
  lastScrollY = y;
}, { passive: true });

// ---------- Mobile nav drawer (Longis Bay) ----------
const mobileNav = document.getElementById('mobileNav');
const mobileOverlay = document.getElementById('mobileOverlay');
function openMobileNav() { mobileNav?.classList.add('open'); mobileOverlay?.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeMobileNav() { mobileNav?.classList.remove('open'); mobileOverlay?.classList.remove('open'); document.body.style.overflow = ''; }
document.getElementById('hamburger')?.addEventListener('click', openMobileNav);
document.getElementById('mobileClose')?.addEventListener('click', closeMobileNav);
mobileOverlay?.addEventListener('click', closeMobileNav);
mobileNav?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobileNav));

// ---------- Get directions: Apple Maps or Google Maps ----------
const sheet = document.getElementById('dirSheet');
const sheetOverlay = document.getElementById('dirOverlay');
const q = encodeURIComponent(SHOP.name + ', ' + SHOP.address);
const appleUrl = `https://maps.apple.com/?daddr=${encodeURIComponent(SHOP.address)}&q=${encodeURIComponent(SHOP.name)}&dirflg=d`;
const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${q}`;
const isApple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
const isAndroid = /Android/.test(navigator.userAgent);

if (sheet) {
  sheet.querySelector('[data-map="apple"]').href = appleUrl;
  sheet.querySelector('[data-map="google"]').href = googleUrl;
  // Put the native app first + flag it for the visitor's phone
  const pick = isApple ? 'apple' : isAndroid ? 'google' : null;
  if (pick) {
    const el = sheet.querySelector(`[data-map="${pick}"]`);
    el.classList.add('suggested');
    el.parentNode.insertBefore(el, el.parentNode.querySelector('[data-map]'));
  }
}
function openSheet() {
  closeMobileNav();
  sheet?.classList.add('open'); sheetOverlay?.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => sheet?.querySelector('[data-map]')?.focus(), 200);
}
function closeSheet() { sheet?.classList.remove('open'); sheetOverlay?.classList.remove('open'); document.body.style.overflow = ''; }
document.querySelectorAll('[data-directions]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); openSheet(); }));
sheetOverlay?.addEventListener('click', closeSheet);
sheet?.querySelector('.sheet__close')?.addEventListener('click', closeSheet);
sheet?.querySelectorAll('[data-map]').forEach(a => a.addEventListener('click', () => setTimeout(closeSheet, 300)));
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeSheet(); closeMobileNav(); } });
sheet?.querySelector('.sheet__copy')?.addEventListener('click', async e => {
  try { await navigator.clipboard.writeText(SHOP.address); e.target.textContent = 'Address copied ✓'; }
  catch { e.target.textContent = SHOP.address; }
  setTimeout(() => { e.target.textContent = 'Copy address'; }, 2200);
});

// ---------- Mobile action bar: tuck away while the Visit section is on screen ----------
const bar = document.querySelector('.actionbar');
// X hides the bar for the rest of the visit
const hideBar = () => { bar?.classList.add('dismissed'); document.body.classList.add('actionbar-off'); };
try { if (sessionStorage.getItem('tb-bar-off')) hideBar(); } catch {}
bar?.querySelector('.actionbar__close')?.addEventListener('click', () => {
  hideBar();
  try { sessionStorage.setItem('tb-bar-off', '1'); } catch {}
});
const visit = document.getElementById('visit');
if (bar && visit && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => bar.classList.toggle('hide', e.isIntersecting), { threshold: .25 }).observe(visit);
}

// ---------- Price list tabs (services page) ----------
const tabs = document.querySelectorAll('.tab');
tabs.forEach(t => t.addEventListener('click', () => {
  tabs.forEach(x => x.setAttribute('aria-selected', x === t));
  document.querySelectorAll('.price-panel').forEach(p => { p.hidden = p.id !== t.getAttribute('aria-controls'); });
}));
if (location.hash && document.querySelector(`.tab[aria-controls="${location.hash.slice(1)}"]`)) {
  document.querySelector(`.tab[aria-controls="${location.hash.slice(1)}"]`).click();
}

// ---------- Fade-up on scroll ----------
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
