(function(){
  'use strict';

  /* ════ her business, read from the Treatwell listing ════════════════════ */

  /* Opening hours by getDay(), in minutes from midnight. Tuesday she's shut. */
  var HOURS = {0:[600,1200], 1:[720,1200], 2:null, 3:[600,1200], 4:[600,1200], 5:[600,1200], 6:[660,1260]};
  var LEAD  = 120;   /* nothing bookable inside two hours */
  var GAP   = 15;    /* she turns the room around between clients */

  /* Treatwell lists 16 entries; several are the same treatment at a different
     length, and three more are the same treatments at the member rate. Here
     each treatment is one card: lengths are buttons, member rates a toggle.
     d: [minutes, price, member price] */
  var SVC = [
    {id:'sig', tags:['full'], pop:true, press:3,
     name:'Signature Full Body', full:'Signature Full Body Massage',
     one:'Built around whatever you walk in with', pressure:'Medium to firm',
     desc:'Swedish and deep tissue blended with trigger-point work, customised to your issues and preferences, giving individual attention to the areas that need it.',
     d:[[60,79,69],[70,89,79],[80,99,85],[90,109,95],[100,119,105],[110,129,115],[120,139,125]]},

    {id:'deep', tags:['full','knots'], press:5,
     name:'Deep Tissue', full:'Deep Tissue Massage',
     one:'For knots and trigger points that need real pressure', pressure:'Firm to very strong',
     desc:'Firmer pressure with specific attention to muscle knots and trigger points, to ease tension, increase range of motion and relieve long-standing pain.',
     d:[[60,89,79],[70,99,89],[80,109,95],[90,119,105],[100,129,115],[110,139,125]]},

    {id:'swed', tags:['full','stress'], press:2,
     name:'Swedish', full:'Swedish Massage',
     one:'The gentle one, for stress rather than injury', pressure:'Light to firm',
     desc:'A way to let go of stress and muscle tension and reset the postural habits that come from repetitive work or overusing the same few muscles.',
     d:[[60,69,59],[70,79,69],[80,89,75],[90,99,85],[100,109,95]]},

    {id:'bn', tags:['upper'], press:3,
     name:'Back & Neck', full:'Back and Neck Massage with aromatic oil',
     one:'The quick fix for a desk-bound week', pressure:'Medium to firm',
     desc:'The answer to muscle tension caused by knots or postural problems in the upper body. Released tension, more range of motion, less long-standing pain.',
     d:[[30,45]]},

    {id:'bns', tags:['upper'], pop:true, press:3,
     name:'Back, Neck & Shoulders', full:'Back, Neck & Shoulders Massage with aromatic oil',
     one:'Her most-booked short treatment', pressure:'Medium to firm',
     desc:'Worked across the whole of the upper back and into the shoulders, where most desk tension ends up sitting.',
     d:[[40,55]]},

    {id:'bnsah', tags:['upper','stress'], press:3,
     name:'Back, Neck, Shoulders, Arms & Head', full:'Back, Neck, Shoulders, Arm and Head Massage with aromatic oil',
     one:'Everything above the waist, finished at the scalp', pressure:'Medium to firm',
     desc:'The shoulders treatment carried down through the arms and finished with the head and scalp.',
     d:[[50,65]]},

    {id:'foot', tags:['lower'], press:2,
     name:'Foot', full:'Foot Massage',
     one:'Massage and reflexology, for feet that have had enough', pressure:'Light to firm',
     desc:'Combines the soothing side of massage with the therapeutic benefits of reflexology. Made for anyone on their feet all day, or carrying stress in their body.',
     d:[[30,35]]},

    {id:'footleg', tags:['lower'], press:2,
     name:'Foot & Leg', full:'Foot & Leg Massage with aromatic oil',
     one:'Taken up through the calves', pressure:'Light to firm',
     desc:'The foot treatment worked up through the calves, with aromatic oil.',
     d:[[40,55]]},

    {id:'footglute', tags:['lower'], press:3,
     name:'Foot, Leg & Glute', full:'Foot, Leg and Glute Massage with aromatic oil',
     one:'The full lower body, feet to glutes', pressure:'Medium to firm',
     desc:'For legs that have been standing, running or cycling all week — feet, calves, thighs and glutes.',
     d:[[50,65]]},

    {id:'preg', tags:['preg'], press:1,
     name:'Pregnancy', full:'Pregnancy Massage',
     one:'Side-lying and gentle, at any stage', pressure:'Gentle',
     desc:'For the stress and discomfort of pregnancy, and a faster recovery afterwards. Manages stress, relieves muscle tension and leaves you better prepared.',
     d:[[60,75],[70,85],[80,95]]},

    {id:'cell', tags:['cell'], press:4,
     name:'Anti-Cellulite', full:'Anti-Cellulite Massage',
     one:'Pinching and rolling, worked over the areas you choose', pressure:'Firm',
     desc:'Special techniques including pinching and rolling, targeted at the areas you want to work on, to break down the fat underneath.',
     d:[[45,65]]}
  ];

  var INTENT = [
    {k:'full',  t:'Full body',        i:'M12 3.4a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8ZM12 7.6v6.1M12 13.7 9.3 21M12 13.7 14.7 21M12 9.2 7.6 11M12 9.2l4.4 1.8'},
    {k:'upper', t:'Back & shoulders', i:'M6 7.5c2-1.6 10-1.6 12 0M7 12h10M8.5 16.5h7M12 5.5v13'},
    {k:'lower', t:'Legs & feet',      i:'M9.5 3.5v8.2l-1.4 5.1a2 2 0 0 0 1.4 2.5l2.1.5M14.5 3.5v8.2l1.4 5.1a2 2 0 0 1-1.4 2.5l-2.1.5'},
    {k:'knots', t:'A specific knot',  i:'M12 5.2c3.8 0 6.8 3 6.8 6.8s-3 6.8-6.8 6.8-6.8-3-6.8-6.8 3-6.8 6.8-6.8ZM12 9.4a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Z'},
    {k:'stress',t:'Just to switch off',i:'M5 16c2.4-4 4.3-6 7-6s4.6 2 7 6M8.8 9.2C9.4 6.6 10.6 5 12 5s2.6 1.6 3.2 4.2M6.5 19.4h11'},
    {k:'preg',  t:'Pregnancy',        i:'M12.5 3.6a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6ZM12.5 7.8v4.4c2.6 0 4.2 1.5 4.2 3.6s-1.6 3.6-4.2 3.6M12.5 19.4 10 21M12.5 11.6 9.4 13'},
    {k:'cell',  t:'Anti-cellulite',   i:'M4.8 8.4c2.6-2 4.4 2 7 0s4.4 2 7 0M4.8 13c2.6-2 4.4 2 7 0s4.4 2 7 0M4.8 17.6c2.6-2 4.4 2 7 0s4.4 2 7 0'}
  ];


  /* ════ small helpers ════════════════════════════════════════════════════ */
  var $ = function(id){ return document.getElementById(id); };
  var esc = function(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var DAY3 = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var DAYF = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var MON3 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  var money = function(n){ return '£' + n; };
  var durTxt = function(m){
    if (m < 60) return m + ' min';
    var h = Math.floor(m/60), r = m%60;
    return h + (r ? ' hr ' + r + ' min' : ' hour' + (h>1?'s':''));
  };
  var clock = function(mins){
    var h = Math.floor(mins/60), m = mins%60, ap = h<12 ? 'am' : 'pm';
    h = h%12 || 12;
    return h + (m ? ':' + (m<10?'0':'') + m : '') + ap;
  };
  var iso = function(d){
    return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
  };
  var fromIso = function(s){ var p = s.split('-'); return new Date(+p[0], +p[1]-1, +p[2]); };

  var today = new Date(); today.setHours(0,0,0,0);
  var todayIso = iso(today);
  var nowMins = (function(){ var n = new Date(); return n.getHours()*60 + n.getMinutes(); })();

  var dayLabel = function(ds){
    var d = fromIso(ds), delta = Math.round((d - today)/86400000);
    if (delta === 0) return 'Today';
    if (delta === 1) return 'Tomorrow';
    return DAYF[d.getDay()] + ' ' + d.getDate() + ' ' + MON3[d.getMonth()];
  };

  /* Deterministic hash, so the diary reads the same on every render instead of
     reshuffling under the user's thumb. */
  var rng = function(str){
    var h = 2166136261;
    for (var i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function(){ h = Math.imul(h ^ (h>>>15), 2246822507); h ^= h>>>13; return (h>>>0)/4294967296; };
  };

  /* ════ the diary ════════════════════════════════════════════════════════
     A day is built as a list of appointments she already has, not as a list of
     random free chips — so a 2-hour massage genuinely finds fewer openings than
     a 30-minute one, the way a real diary behaves. */
  var bookedCache = {};
  var booked = function(ds){
    if (bookedCache[ds]) return bookedCache[ds];
    var d = fromIso(ds), hrs = HOURS[d.getDay()];
    if (!hrs){ return (bookedCache[ds] = []); }
    var r = rng('galina|' + ds), out = [];
    var open = hrs[0], close = hrs[1];
    /* she fills up towards the weekend */
    var load = 0.28 + r()*0.26 + (d.getDay()===6 || d.getDay()===5 ? 0.14 : 0);
    var lens = [30,40,50,60,60,60,70,80,90,90,120];
    var t = open + Math.floor(r()*50);
    while (t < close - 30){
      var len = lens[Math.floor(r()*lens.length)];
      if (t + len > close) break;
      if (r() < load){ out.push([t, t+len]); t = t + len + GAP + Math.floor(r()*3)*15; }
      else { t += 30; }
    }
    return (bookedCache[ds] = out);
  };

  var freeTimes = function(ds, mins){
    var d = fromIso(ds), hrs = HOURS[d.getDay()];
    if (!hrs) return [];
    var open = hrs[0], close = hrs[1], taken = booked(ds), out = [];
    var floor = open;
    if (ds === todayIso) floor = Math.max(open, Math.ceil((nowMins + LEAD)/15)*15);
    for (var t = floor; t + mins <= close; t += 15){
      var ok = true;
      for (var i=0;i<taken.length;i++){
        if (t < taken[i][1] + GAP && t + mins + GAP > taken[i][0]){ ok = false; break; }
      }
      if (ok) out.push(t);
    }
    /* she doesn't offer every quarter hour — a tidy start time, or right after
       someone else finishes */
    return out.filter(function(t){
      if (t % 30 === 0) return true;
      for (var i=0;i<taken.length;i++){ if (t === taken[i][1] + GAP) return true; }
      return false;
    });
  };

  var DAYS = (function(){
    var a = [];
    for (var i=0;i<14;i++){ var d = new Date(today); d.setDate(d.getDate()+i); a.push(iso(d)); }
    return a;
  })();

  var firstFree = function(mins){
    for (var i=0;i<DAYS.length;i++){
      var f = freeTimes(DAYS[i], mins);
      if (f.length) return {date:DAYS[i], time:f[0]};
    }
    return null;
  };

  /* ════ state ════════════════════════════════════════════════════════════ */
  var S = {
    intent:null,
    svc:null,      /* service object */
    dur:null,      /* [mins, price, memberPrice] */
    member:false,
    date:null,
    time:null,
    step:1
  };
  var priceFor = function(dur){ return (S.member && dur.length > 2) ? dur[2] : dur[1]; };
  var svcById = function(id){ for (var i=0;i<SVC.length;i++){ if (SVC[i].id === id) return SVC[i]; } return null; };

  /* ════ hero: the soonest hour she has ═══════════════════════════════════ */
  var heroSvc = svcById('sig'), heroDur = heroSvc.d[0];
  var heroSlot = firstFree(heroDur[0]);

  function paintHero(){
    if (!heroSlot){ $('soonWhen').textContent = 'Fully booked for a fortnight'; $('soonWhat').textContent = 'Text me and I will find you something'; $('soonTake').hidden = true; return; }
    $('soonWhen').textContent = dayLabel(heroSlot.date) + ', ' + clock(heroSlot.time);
    $('soonWhat').textContent = '60 minutes, Signature Full Body · ' + money(heroDur[1]);
  }

  /* ════ step 1 — treatment ═══════════════════════════════════════════════ */
  function paintChips(){
    $('chips').innerHTML = INTENT.map(function(c){
      return '<button class="chip" type="button" role="button" aria-pressed="'+(S.intent===c.k)+'" data-k="'+c.k+'">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+c.i+'"/></svg>' +
        esc(c.t) + '</button>';
    }).join('') +
    '<button class="chip" type="button" id="allChip" aria-pressed="'+(S.intent==='all')+'" data-k="all">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>' +
      'Show me everything</button>';
  }

  function listFor(k){
    if (!k) return [];
    if (k === 'all') return SVC.slice();
    return SVC.filter(function(s){ return s.tags.indexOf(k) > -1; });
  }

  function paintCards(){
    var list = listFor(S.intent);
    if (!list.length){ $('cards').innerHTML = ''; return; }

    $('cards').innerHTML = list.map(function(s){
      var on = S.svc && S.svc.id === s.id;
      var sel = on && S.dur ? S.dur : s.d[0];
      var hasMem = s.d[0].length > 2;

      /* the shortest length is shown as picked from the start on every card, so
         the price underneath always belongs to a visible button */
      var durs = s.d.map(function(d){
        var p = (S.member && d.length > 2) ? d[2] : d[1];
        var was = (S.member && d.length > 2 && d[2] !== d[1]) ? '<span class="was">'+money(d[1])+'</span>' : '';
        return '<button class="dur" type="button" aria-pressed="'+(sel[0]===d[0])+'" data-s="'+s.id+'" data-m="'+d[0]+'">' +
          '<b>'+d[0]+' min</b><span>'+was+money(p)+'</span></button>';
      }).join('');

      var bars = '';
      for (var i=1;i<=5;i++) bars += '<i class="'+(i<=s.press?'on':'')+'"></i>';

      var price = (S.member && sel.length > 2) ? sel[2] : sel[1];

      return '<article class="card" data-s="'+s.id+'" data-on="'+(on?1:0)+'">' +
        '<div class="card-h"><div class="card-n">' +
          '<h3 class="card-t">'+esc(s.name)+'</h3>' +
          '<p class="card-f">'+esc(s.one)+'</p>' +
        '</div>' + (s.pop ? '<span class="tagp">Most booked</span>' : '') + '</div>' +
        '<p class="press"><span class="bars" aria-hidden="true">'+bars+'</span>'+esc(s.pressure)+ (hasMem && S.member ? ' · member rate' : '') +'</p>' +
        '<div class="durs" role="group" aria-label="How long">'+durs+'</div>' +
        '<p class="more">'+esc(s.desc)+'</p>' +
        '<div class="card-x"><button class="lnk" type="button" data-read="'+s.id+'">What is it?</button></div>' +
        '<div class="card-go">' +
          '<p class="price tnum">'+money(price)+'<small>'+durTxt(sel[0])+'</small></p>' +
          '<button class="btn '+(on?'btn-p':'btn-g')+'" type="button" data-choose="'+s.id+'">'+(on?'Chosen':'Choose')+'</button>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  /* ════ step 2 — day and time ════════════════════════════════════════════ */
  function paintDays(){
    if (!S.dur) return;
    var mins = S.dur[0];
    $('days').innerHTML = DAYS.map(function(ds){
      var d = fromIso(ds), shut = !HOURS[d.getDay()];
      var n = shut ? 0 : freeTimes(ds, mins).length;
      var note = shut ? 'Closed' : (n ? n + ' free' : 'Full');
      return '<button class="day" type="button" aria-pressed="'+(S.date===ds)+'" data-d="'+ds+'" ' +
        'data-shut="'+(shut?1:0)+'" data-none="'+(!shut && !n?1:0)+'" '+(shut||!n?'disabled':'')+'>' +
        '<u>'+(ds===todayIso?'Today':DAY3[d.getDay()])+'</u><b class="tnum">'+d.getDate()+'</b><i>'+note+'</i></button>';
    }).join('');
  }

  function paintTimes(){
    if (!S.dur){ $('times').innerHTML = ''; return; }
    if (!S.date){
      var nx = firstFree(S.dur[0]);
      $('times').innerHTML = '<div class="empty">Pick a day above and I’ll show you what’s free.' +
        (nx ? ' <b>The soonest is ' + esc(dayLabel(nx.date)) + ' at ' + clock(nx.time) + '.</b>' +
          '<button class="btn btn-g" type="button" id="jump">Take that one</button>' : '') + '</div>';
      if (nx) $('jump').addEventListener('click', function(){ S.date = nx.date; S.time = nx.time; paintDays(); paintTimes(); settleTime(); });
      return;
    }
    var mins = S.dur[0], list = freeTimes(S.date, mins);

    if (!list.length){
      var nxt = firstFree(mins);
      $('times').innerHTML = '<div class="empty"><b>Nothing left that day for ' + durTxt(mins) + '.</b>' +
        (nxt ? ' My next opening is ' + esc(dayLabel(nxt.date)) + ' at ' + clock(nxt.time) + '.' +
          '<button class="btn btn-g" type="button" id="jump">Take ' + esc(dayLabel(nxt.date)) + ', ' + clock(nxt.time) + '</button>' : '') +
        '</div>';
      if (nxt) $('jump').addEventListener('click', function(){ S.date = nxt.date; S.time = nxt.time; paintDays(); paintTimes(); settleTime(); });
      return;
    }

    var bands = [
      {k:'Morning',   f:function(t){ return t < 720; }},
      {k:'Afternoon', f:function(t){ return t >= 720 && t < 1020; }},
      {k:'Evening',   f:function(t){ return t >= 1020; }}
    ];
    var soonest = list[0];

    $('times').innerHTML = bands.map(function(b){
      var ts = list.filter(b.f);
      if (!ts.length) return '';
      return '<div class="band"><p class="band-k">'+b.k+'</p><div class="times" role="group" aria-label="'+b.k+' times">' +
        ts.map(function(t){
          var first = t === soonest;
          return '<button class="time" type="button" aria-pressed="'+(S.time===t)+'" data-t="'+t+'">' +
            '<span>'+clock(t)+(first?'<span class="fl">Soonest</span>':'')+'</span></button>';
        }).join('') + '</div></div>';
    }).join('');
  }

  /* ════ folding, dock and flow ═══════════════════════════════════════════ */
  function setStep(n){
    S.step = n;
    [1,2,3].forEach(function(i){
      var el = $('s'+i), open = $('open'+i), fold = $('fold'+i);
      var state = i === n ? 'open' : (i < n ? 'done' : 'idle');
      el.setAttribute('data-state', state);
      if (open) open.hidden = (state !== 'open');
      if (fold) fold.hidden = (state !== 'done');
    });
    paintDock();
  }

  function settleSvc(){
    $('fold1v').textContent = S.svc.name + ' · ' + durTxt(S.dur[0]) + ' · ' + money(priceFor(S.dur));
    if (S.date && freeTimes(S.date, S.dur[0]).indexOf(S.time) === -1){ S.date = null; S.time = null; }
    paintDays(); paintTimes();
    setStep(2);
    jumpTo('s2');
  }

  function settleTime(){
    $('fold2v').textContent = dayLabel(S.date) + ', ' + clock(S.time);
    setStep(3);
    jumpTo('s3');
  }

  function jumpTo(id){
    var el = $(id);
    requestAnimationFrame(function(){
      var top = el.getBoundingClientRect().top + window.pageYOffset - 68;
      window.scrollTo({top:top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    });
  }

  function sentence(){
    if (!S.svc || !S.dur) return null;
    var bits = [S.svc.name, durTxt(S.dur[0])];
    if (S.date && S.time) bits.push(dayLabel(S.date) + ' ' + clock(S.time));
    return bits.join(' · ') + ' · ' + money(priceFor(S.dur));
  }

  function paintDock(){
    var dock = $('dock'), v = sentence();
    if (!v || document.body.getAttribute('data-done') === '1'){ dock.setAttribute('data-up','0'); return; }
    dock.setAttribute('data-up','1');
    $('dockV').textContent = v;
    if (S.step === 1){ $('dockK').textContent = 'So far'; $('dockBtn').textContent = 'Pick a time'; }
    else if (S.step === 2){ $('dockK').textContent = 'So far'; $('dockBtn').textContent = S.time ? 'Your details' : 'Pick a time'; }
    else { $('dockK').textContent = 'Ready'; $('dockBtn').textContent = 'Confirm'; }
  }

  /* ════ events ═══════════════════════════════════════════════════════════ */
  $('chips').addEventListener('click', function(e){
    var b = e.target.closest('.chip'); if (!b) return;
    S.intent = (S.intent === b.dataset.k) ? null : b.dataset.k;
    paintChips(); paintCards();
  });

  $('cards').addEventListener('click', function(e){
    var read = e.target.closest('[data-read]');
    if (read){
      var card = read.closest('.card');
      var open = card.getAttribute('data-open') === '1';
      card.setAttribute('data-open', open ? '0' : '1');
      read.textContent = open ? 'What is it?' : 'Less';
      return;
    }
    var dur = e.target.closest('.dur');
    if (dur){
      var s = svcById(dur.dataset.s), m = +dur.dataset.m;
      S.svc = s;
      for (var i=0;i<s.d.length;i++){ if (s.d[i][0] === m) S.dur = s.d[i]; }
      paintCards(); paintDock();
      return;
    }
    var ch = e.target.closest('[data-choose]');
    if (ch){
      var sv = svcById(ch.dataset.choose);
      if (!S.svc || S.svc.id !== sv.id || !S.dur){ S.svc = sv; S.dur = sv.d[0]; }
      paintCards(); settleSvc();
    }
  });

  $('memSw').addEventListener('click', function(){
    S.member = !S.member;
    this.setAttribute('aria-pressed', S.member);
    this.setAttribute('aria-checked', S.member);
    paintCards(); paintDock();
  });

  $('days').addEventListener('click', function(e){
    var b = e.target.closest('.day'); if (!b || b.disabled) return;
    S.date = b.dataset.d; S.time = null;
    paintDays(); paintTimes(); paintDock();
  });

  $('times').addEventListener('click', function(e){
    var b = e.target.closest('.time'); if (!b) return;
    S.time = +b.dataset.t;
    paintTimes();
    settleTime();
  });

  $('fold1').addEventListener('click', function(){ setStep(1); jumpTo('s1'); });
  $('fold2').addEventListener('click', function(){ setStep(2); jumpTo('s2'); });

  $('soonTake').addEventListener('click', function(){
    if (!heroSlot) return;
    S.intent = 'full'; S.svc = heroSvc; S.dur = heroDur;
    S.date = heroSlot.date; S.time = heroSlot.time;
    paintChips(); paintCards();
    $('fold1v').textContent = S.svc.name + ' · ' + durTxt(S.dur[0]) + ' · ' + money(priceFor(S.dur));
    $('fold2v').textContent = dayLabel(S.date) + ', ' + clock(S.time);
    paintDays(); paintTimes();
    setStep(3);
    jumpTo('s3');
    setTimeout(function(){ $('iName').focus({preventScroll:true}); }, 420);
  });

  $('soonPick').addEventListener('click', function(){
    S.intent = S.intent || 'full';
    paintChips(); paintCards();
    setStep(1); jumpTo('s1');
  });

  /* ── confirm ─────────────────────────────────────────────────────────── */
  function confirmIt(){
    var name = $('iName').value.trim(), tel = $('iTel').value.trim();
    var digits = tel.replace(/\D/g,'');
    var bad = null;
    $('fName').classList.remove('bad'); $('fTel').classList.remove('bad');

    if (!name){ bad = 'I need a first name to put in the diary.'; $('fName').classList.add('bad'); $('iName').focus(); }
    else if (digits.length < 10){ bad = 'That mobile number looks short — I need it to text your confirmation.'; $('fTel').classList.add('bad'); $('iTel').focus(); }

    var box = $('errBox');
    if (bad){ box.textContent = bad; box.hidden = false; return; }
    box.hidden = true;

    var price = priceFor(S.dur);
    $('doneH').textContent = name + ', you’re in the book.';
    $('doneLede').textContent = 'I’ve texted ' + tel + ' to confirm, and I’ll send one more the day before. Reply to that message any time to move it.';
    $('dWhen').innerHTML = esc(dayLabel(S.date)) + ', ' + clock(S.time) +
      '<small>Finishes about ' + clock(S.time + S.dur[0]) + '. Come 10–15 minutes early.</small>';
    $('dWhat').innerHTML = esc(S.svc.full) + '<small>' + durTxt(S.dur[0]) + (S.member ? ' · member rate' : '') + ' · with Galina</small>';
    $('dPay').innerHTML = money(price) + '<small>Cash, on the day. Nothing taken now.</small>';

    try{ localStorage.setItem('mmg:last', JSON.stringify({s:S.svc.id, m:S.dur[0], n:name})); }catch(e){}

    document.body.setAttribute('data-done','1');
    paintDock();
    window.scrollTo({top:0, behavior:'auto'});
    $('done').focus && $('done').focus();
  }

  $('dockBtn').addEventListener('click', function(){
    if (S.step === 1){ if (S.svc && S.dur) settleSvc(); return; }
    if (S.step === 2){
      if (S.date && S.time) settleTime();
      else jumpTo('s2');
      return;
    }
    confirmIt();
  });

  $('againBtn').addEventListener('click', function(){
    document.body.setAttribute('data-done','0');
    S.svc = null; S.dur = null; S.date = null; S.time = null; S.intent = null;
    $('iName').value = ''; $('iTel').value = ''; $('iNote').value = '';
    paintChips(); paintCards(); setStep(1);
    window.scrollTo({top:0, behavior:'auto'});
  });

  /* ── copy buttons ────────────────────────────────────────────────────── */
  function copyText(text, btn, okLabel){
    var done = function(){
      var old = btn.innerHTML;
      btn.textContent = okLabel;
      setTimeout(function(){ btn.innerHTML = old; }, 1800);
    };
    try{
      navigator.clipboard.writeText(text).then(done, function(){ fallback(); });
    }catch(e){ fallback(); }
    function fallback(){
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.select();
      try{ document.execCommand('copy'); done(); }catch(e2){}
      document.body.removeChild(ta);
    }
  }

  $('copyBtn').addEventListener('click', function(){
    var txt = 'Massage with Galina\n' +
      dayLabel(S.date) + ', ' + clock(S.time) + '\n' +
      S.svc.full + ' — ' + durTxt(S.dur[0]) + ' — ' + money(priceFor(S.dur)) + '\n' +
      'Room 20, 300 Chiswick High Road, Chiswick, London W4 1NP\n' +
      '07426 413706 — arrive 10–15 minutes early';
    copyText(txt, this, 'Copied');
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function(b){
    b.addEventListener('click', function(){ copyText(b.dataset.copy, b, 'Copied'); });
  });

  /* ── price sheet ─────────────────────────────────────────────────────── */
  function paintSheet(){
    var groups = [
      {k:'Classic massages', ids:['sig','deep','swed','bn','bns','bnsah','foot','footleg','footglute']},
      {k:'Therapeutic', ids:['preg']},
      {k:'Weight loss & cellulite', ids:['cell']}
    ];
    $('sheetB').innerHTML = groups.map(function(g){
      return '<div class="menu-g"><p class="menu-k">'+g.k+'</p>' + g.ids.map(function(id){
        var s = svcById(id);
        return '<div class="mi"><p class="mi-t">'+esc(s.full)+'</p><p class="mi-d">'+esc(s.desc)+'</p>' +
          '<div class="mi-p">' + s.d.map(function(d){
            return '<span class="tnum">'+d[0]+' min <b>'+money(d[1])+'</b>' + (d.length>2 ? ' <span style="color:var(--amber)">· member '+money(d[2])+'</span>' : '') + '</span>';
          }).join('') + '</div>' +
          '<button class="btn btn-g" type="button" data-book="'+s.id+'">Book this</button></div>';
      }).join('') + '</div>';
    }).join('') +
    '<div class="menu-g"><p class="menu-k">Good to know</p><div class="mi">' +
      '<p class="mi-d">Monthly members pay £10 to £14 less on the Signature, Deep Tissue and Swedish massages. ' +
      'Every treatment uses organic and natural essential oils, and you choose your blend when you arrive — ' +
      'or Galina will make one up for you. Cash accepted, paid on the day.</p></div></div>';
  }

  function openSheet(on){
    $('sheetScrim').setAttribute('data-up', on?'1':'0');
    $('sheet').setAttribute('data-up', on?'1':'0');
    document.body.style.overflow = on ? 'hidden' : '';
  }
  $('menuBtn').addEventListener('click', function(){ openSheet(true); });
  $('sheetX').addEventListener('click', function(){ openSheet(false); });
  $('sheetScrim').addEventListener('click', function(){ openSheet(false); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') openSheet(false); });

  $('sheetB').addEventListener('click', function(e){
    var b = e.target.closest('[data-book]'); if (!b) return;
    var s = svcById(b.dataset.book);
    S.svc = s; S.dur = s.d[0]; S.intent = s.tags[0];
    openSheet(false);
    document.body.setAttribute('data-done','0');
    paintChips(); paintCards(); settleSvc();
  });

  /* The reviews and the opening hours live on the other pages now. */

  /* ── boot ────────────────────────────────────────────────────────────── */
  /* her three full-body massages are open from the start: the page arrives
     with something to choose rather than an empty shelf, and it saves a tap */
  S.intent = 'full';

  /* a returning visitor gets the kind of thing they booked last time instead */
  try{
    var last = JSON.parse(localStorage.getItem('mmg:last') || 'null');
    if (last && svcById(last.s)) S.intent = svcById(last.s).tags[0];
  }catch(e){}

  paintHero();
  paintChips();
  paintCards();
  paintSheet();
  setStep(1);
})();
