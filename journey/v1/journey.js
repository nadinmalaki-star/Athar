/* ISOLATED PROTOTYPE (revision 2) — Section 03 cinematic journey.
 *
 * One pinned section, one scroll position, all stages reversible:
 *   A  directions scene assembles  (same motion logic as the Higgsfield scene: scatter, power2.inOut with 0.04 stagger,
 *                                    plane un-tilt, 0.7 s scrub catch-up). Revision 2: larger cards with subtitles, connectors
 *                                    that draw from the Ember core to each card as it arrives, a core halo that grows with assembly.
 *   T  the scene recedes; its Ember point travels onto the box's seam; the framed footage fades up
 *   B  the 241-frame graphite-box sequence, presented as a FRAMED stage (whole box always in view) + three narrative lines
 *   H  short still hold on the final composition
 *   R  the composition recedes into a secondary anchor beside the service layer
 *   S  the six directions: compact index -> active title -> subtitle -> two questions (scroll or click)
 *   E  the exit line, then the section releases into the page
 * Sound: event-based, Video 1's original audio (journey-audio.js) — the landing hit on frame 62, the light on frame 84, optional
 * pre-drop room tone; each plays at natural speed when its frame is on screen. Muted by default.
 * A/B (prototype only): ?view=framed|full  ?sharp=0|1  (and the on-page switch). ?debug=1  ?pace=0.8
 */
(function(){
  var root = document.querySelector('.journey'); if (!root) return;
  var Q = new URLSearchParams(location.search);
  var DEBUG = Q.get('debug') === '1', PACE = Math.min(2, Math.max(0.4, parseFloat(Q.get('pace')) || 1));
  // PROTO: the isolated prototype declares itself (window.JOURNEY_PROTOTYPE); only then do the A/B switches exist. The site
  // always runs the approved presentation: framed view, no sharpening, ambience on.
  var PROTO = window.JOURNEY_PROTOTYPE === true, BASE = 'journey/v1/';
  var VIEW = PROTO && Q.get('view') === 'full' ? 'full' : 'framed', SHARP = PROTO && Q.get('sharp') === '1';
  var mqPhone = matchMedia('(max-width: 768px)'), mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  var $ = function(s){ return root.querySelector(s); }, $$ = function(s){ return [].slice.call(root.querySelectorAll(s)); };

  var sticky = $('.jr-sticky'), cine = $('.jr-cine'), canvas = $('.jr-canvas'), shade = $('.jr-shade');
  var head = $('.jr-head'), arch = $('.jr-arch'), archStage = $('.jr-arch-stage'), plane = $('.jr-plane'), linksSvg = $('.jr-links');
  var core = $('.jr-core'), halo = $('.jr-halo'), nodes = $$('.jr-node'), bridge = $('.jr-bridge'), beatsBox = $('.jr-beats'), beats = $$('.jr-beat');
  var svc = $('.jr-svc'), dirBtns = $$('.jr-dir'), dets = $$('.jr-det'), exitLine = $('.jr-exit'), soundBtn = $('.jr-sound'), detailBox = $('.jr-detail');
  root.setAttribute('data-view', VIEW);

  // ---------------------------------------------------------------- stage lengths (in svh of scroll travel)
  var SEG_D = { A:75, AH:25, T:50, B:245, H:30, R:50, S:228, E:45 };
  var SEG_M = { A:45, AH:20, T:40, B:175, H:25, R:40, S:204, E:40 };
  var ORDER = ['A', 'AH', 'T', 'B', 'H', 'R', 'S', 'E'];
  var seg = {}, total = 0;
  function layoutSegments(){
    var src = mqPhone.matches ? SEG_M : SEG_D; total = 0;
    ORDER.forEach(function(k){ var len = src[k] * PACE; seg[k] = { a:total, len:len }; total += len; });
    root.style.setProperty('--jr-travel', total.toFixed(2));
  }
  function local(k, u){ var s = seg[k]; return Math.min(1, Math.max(0, (u - s.a) / s.len)); }

  // ---------------------------------------------------------------- easing (GSAP equivalents)
  var clamp01 = function(v){ return v < 0 ? 0 : v > 1 ? 1 : v; };
  var p2io = function(t){ return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };      // power2.inOut
  var p3o = function(t){ return 1 - Math.pow(1 - t, 3); };                                   // power3.out (scrub)
  var sstep = function(t){ t = clamp01(t); return t * t * (3 - 2 * t); };
  var win = function(v, a, b){ return clamp01((v - a) / (b - a)); };
  var lerp = function(a, b, t){ return a + (b - a) * t; };

  // ---------------------------------------------------------------- Stage A: the directions scene
  // the source layout, opened slightly around the core for the larger cards (x*1.18, y*1.12 about the centre)
  var DESKTOP_LAYOUT = { experience:{x:26.4,y:23.1}, system:{x:44.1,y:38.8}, automation:{x:64.2,y:27.6}, product:{x:71.2,y:56.7}, portal:{x:35.8,y:63.4}, ai:{x:53.5,y:76.9} };
  var MOBILE_LAYOUT = { experience:{x:50,y:9}, system:{x:50,y:24}, automation:{x:50,y:39}, product:{x:50,y:61}, portal:{x:50,y:76}, ai:{x:50,y:91} };
  var SCATTER = [ {x:-130,y:-70,z:-240,r:16}, {x:110,y:-40,z:160,r:-12}, {x:-40,y:120,z:-160,r:10},
                  {x:150,y:60,z:90,r:-18}, {x:-160,y:40,z:200,r:14}, {x:60,y:-120,z:-90,r:-8} ];
  var lines = [], lineLen = [];
  function placeNodes(){
    var L = mqPhone.matches ? MOBILE_LAYOUT : DESKTOP_LAYOUT, NS = 'http://www.w3.org/2000/svg';
    var W = archStage.clientWidth, H = archStage.clientHeight, cx = W / 2, cy = H / 2;
    linksSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); linksSvg.textContent = ''; lines = []; lineLen = [];
    nodes.forEach(function(n){
      var p = L[n.getAttribute('data-id')]; n.style.left = p.x + '%'; n.style.top = p.y + '%';
      var x2 = W * p.x / 100, y2 = H * p.y / 100, ln = document.createElementNS(NS, 'line');
      ln.setAttribute('x1', cx); ln.setAttribute('y1', cy); ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
      var len = Math.hypot(x2 - cx, y2 - cy); ln.style.strokeDasharray = len + ' ' + len; ln.style.strokeDashoffset = len;
      linksSvg.appendChild(ln); lines.push(ln); lineLen.push(len);
    });
  }
  // the source timeline: plane tween 0..1, card i tween 0.04i .. 0.04i+0.82 (total 1.02); each connector draws from the core
  // while its card is on its way, and completes as the card lands (the card's border then takes the Ember)
  function drawArch(c){
    var mob = mqPhone.matches, spread = mob ? 0.2 : 1.15, T = c * 1.02;
    var pt = clamp01(T);
    plane.style.transform = 'rotate(' + lerp(mob ? 0 : -5, 0, pt) + 'deg) rotateX(' + lerp(mob ? 8 : 16, 0, pt) + 'deg)';
    nodes.forEach(function(n, i){
      var s = SCATTER[i % SCATTER.length], lt = clamp01((T - 0.04 * i) / 0.82), k = 1 - p2io(lt);
      var x = s.x * spread * k, y = (mob ? 0 : s.y * spread) * k, z = (mob ? 0 : s.z * 1.15) * k, ry = (mob ? 0 : s.r) * k, rx = (mob ? 0 : s.r * 0.35) * k;
      n.style.transform = 'translate(-50%, -50%) translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,' + z.toFixed(2) + 'px) rotateY(' + ry.toFixed(3) + 'deg) rotateX(' + rx.toFixed(3) + 'deg)';
      n.style.opacity = (0.55 + 0.45 * sstep(win(lt, 0.0, 0.7))).toFixed(3);            // farther = quieter, sharpening on arrival
      var lp = sstep(win(lt, 0.28, 0.92));
      if (lines[i]) lines[i].style.strokeDashoffset = (lineLen[i] * (1 - lp)).toFixed(2);
      n.classList.toggle('is-linked', lp >= 0.999);
    });
    halo.style.opacity = sstep(win(c, 0.25, 1)).toFixed(3);
  }

  // ---------------------------------------------------------------- Stage B: frames
  var TOTAL = 241, AR = 1928 / 1076, pool = new Map(), painted = -1, ctx = canvas.getContext('2d');
  var SEAM = { x:0.6307, y:0.5246, h:0.333 };                               // the red seam in frame 1 (measured)
  var LAND = 62, LIGHT = 82;                                                 // box lands on frame 62; light wakes at frame 82 (measured)
  function folder(){ return (mqPhone.matches ? 'm' : 'd') + (SHARP ? '-s' : ''); }
  function frameUrl(i){ return BASE + 'frames/' + folder() + '/f-' + String(i + 1).padStart(4, '0') + '.webp'; }
  function windowSize(){ return mqPhone.matches ? { back:4, ahead:12, keepBack:6, keepAhead:16 } : { back:6, ahead:18, keepBack:8, keepAhead:26 }; }
  var failedAt = {};
  function ensure(i){
    if (i < 0 || i >= TOTAL || pool.has(i)) return;
    if (failedAt[i] && performance.now() - failedAt[i] < 600) return;
    var img = new Image(), e = { img:img, ready:false }; img.decoding = 'async'; pool.set(i, e);
    img.onload = function(){ e.ready = true; delete failedAt[i]; };
    img.onerror = function(){ if (pool.get(i) === e) pool.delete(i); failedAt[i] = performance.now(); };
    img.src = frameUrl(i);
  }
  function resetPool(){ pool.forEach(function(e){ e.img.onload = e.img.onerror = null; e.img.removeAttribute('src'); }); pool.clear(); painted = -1; }
  function evict(c){
    var w = windowSize();
    pool.forEach(function(e, k){ if (k !== 0 && k !== TOTAL - 1 && (k < c - w.keepBack || k > c + w.keepAhead)) { e.img.onload = e.img.onerror = null; e.img.removeAttribute('src'); pool.delete(k); } });
  }
  function nearestReady(i){ for (var d = 1; d < 60; d++) { if (pool.get(i - d) && pool.get(i - d).ready) return i - d; if (pool.get(i + d) && pool.get(i + d).ready) return i + d; } return -1; }

  // the stage box (CSS px inside the sticky viewport) — framed: a composed ~70% frame, the whole image visible;
  // full: the revision-1 full-bleed cover (A/B reference)
  var box = { x:0, y:0, w:0, h:0 }, boxKey = '';
  function layoutBox(){
    var vw = sticky.clientWidth, vh = sticky.clientHeight, mob = mqPhone.matches, b;
    if (VIEW === 'full') b = mob ? { x:0, y:0, w:vw, h:vh * 0.62 } : { x:0, y:0, w:vw, h:vh };
    else if (mob) b = { x:0, y:vh * 0.11, w:vw, h:vh * 0.44 };
    else { var w = Math.min(vw * 0.70, vh * 0.80 * AR), h = w / AR; b = { x:(vw - w) / 2, y:(vh - h) / 2 + vh * 0.02, w:w, h:h }; }
    var key = [b.x, b.y, b.w, b.h].map(Math.round).join(',');
    if (key !== boxKey) { boxKey = key; box = b; cine.style.left = b.x + 'px'; cine.style.top = b.y + 'px'; cine.style.width = b.w + 'px'; cine.style.height = b.h + 'px'; }
  }
  // mix: 0 = cover, 1 = contain; px/py = object-position. Phones track the box while it is closed.
  var fit = { cw:0, ch:0, dpr:1, mix:0, px:0.5, py:0.5 }, paintedKey = '';
  function sizeCanvas(){
    var cw = canvas.clientWidth, chh = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(cw * dpr), h = Math.round(chh * dpr);
    if (w !== canvas.width || h !== canvas.height) { canvas.width = w; canvas.height = h; painted = -1; }
    fit.cw = cw; fit.ch = chh; fit.dpr = dpr;
  }
  function coverRect(iw, ih){
    var s = lerp(Math.max(fit.cw / iw, fit.ch / ih), Math.min(fit.cw / iw, fit.ch / ih), fit.mix), dw = iw * s, dh = ih * s;
    return { x:(fit.cw - dw) * fit.px, y:(fit.ch - dh) * fit.py, w:dw, h:dh };
  }
  function paint(i){
    var e = pool.get(i); if (!e || !e.ready) return false;
    var key = fit.mix.toFixed(4) + '|' + fit.px.toFixed(4) + '|' + fit.py.toFixed(4);
    if (painted === i && paintedKey === key) return true;
    paintedKey = key;
    var iw = e.img.naturalWidth, ih = e.img.naturalHeight, cr = coverRect(iw, ih), d = fit.dpr;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#0b0b0c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(e.img, 0, 0, iw, ih, cr.x * d, cr.y * d, cr.w * d, cr.h * d);
    painted = i; root.setAttribute('data-frame', i + 1); return true;
  }

  // ---------------------------------------------------------------- sound: event-based, from Video 1's original audio
  // JourneySound (journey-audio.js): the original metallic landing on frame 62, the original light / opening on frame 84, and
  // (optional, A/B) the quiet original room tone before the drop. Each plays at its natural speed whenever its frame appears.
  // Opening stage (restored from revision 1): impact.mp3 as the cards begin to leave; it gives way to the first box sound.
  var audio = null, soundOn = false, snd = null, AMBIENCE = !(PROTO && Q.get('ambience') === '0');
  function soundLabel(){
    var ar = document.documentElement.lang === 'ar', l = soundBtn.querySelector('.jr-sound-l');
    l.setAttribute('data-ar', soundOn ? 'الصوت مفعّل' : 'تشغيل الصوت'); l.setAttribute('data-en', soundOn ? 'Sound on' : 'Sound off');
    l.textContent = l.getAttribute(ar ? 'data-ar' : 'data-en'); soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
  }
  soundBtn.addEventListener('click', function(){
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (soundOn) {                                                       // mute: a short fade, then suspend
      soundOn = false; soundLabel(); if (snd) snd.silence(0.15, true);
      if (audio) { var t = audio.ctx.currentTime; audio.master.gain.cancelScheduledValues(t); audio.master.gain.setValueAtTime(audio.master.gain.value, t);
        audio.master.gain.linearRampToValueAtTime(0, t + 0.15); setTimeout(function(){ if (!soundOn) audio.ctx.suspend(); }, 180); }
      return;
    }
    if (!Ctor || !window.JourneySound) return;
    if (!audio) {
      var ac = new Ctor(), master = ac.createGain(); master.connect(ac.destination);
      audio = { ctx:ac, master:master }; var buffers = {}, files = window.JourneySound.files();
      Promise.all(files.map(function(f){
        return fetch(BASE + 'audio/' + f).then(function(r){ return r.arrayBuffer(); }).then(function(x){ return ac.decodeAudioData(x); }).then(function(buf){ buffers[f] = buf; });
      })).then(function(){ snd = new window.JourneySound({ ctx:ac, dest:master, buffers:buffers, ambience:AMBIENCE }); }).catch(function(){});
    }
    audio.ctx.resume(); var t0 = audio.ctx.currentTime; audio.master.gain.cancelScheduledValues(t0); audio.master.gain.setValueAtTime(0, t0); audio.master.gain.linearRampToValueAtTime(1, t0 + 0.12);
    soundOn = true; soundLabel();
  });

  // ---------------------------------------------------------------- service layer
  var current = -1;
  function setCurrent(i){
    if (i === current) return; current = i;
    dirBtns.forEach(function(b, k){ b.classList.toggle('is-current', k === i); b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    dets.forEach(function(d, k){ d.classList.toggle('is-current', k === i); });
  }
  dirBtns.forEach(function(b, i){
    b.addEventListener('click', function(){
      var vh = sticky.offsetHeight / 100, top = root.getBoundingClientRect().top + scrollY;
      scrollTo({ top: top + (seg.S.a + seg.S.len * (i + 0.5) / 6) * vh, behavior: 'smooth' });
    });
  });
  function sizeDetail(){
    if (root.classList.contains('jr-static')) { detailBox.style.minHeight = ''; return; }
    var m = 0; dets.forEach(function(d){ m = Math.max(m, d.offsetHeight); }); detailBox.style.minHeight = Math.ceil(m + 4) + 'px';
  }

  // ---------------------------------------------------------------- the scroll position and its two smoothers
  var uRaw = 0, uScrub = 0, sFrom = 0, sTo = 0, sT0 = 0, SCRUB = 700;
  var qTarget = 0, qCur = 0, lastT = performance.now();
  function readScroll(){
    var vh = sticky.offsetHeight / 100, top = root.getBoundingClientRect().top;
    uRaw = Math.max(-100, Math.min(total + 100, -top / vh));
    sFrom = uScrub; sTo = uRaw; sT0 = performance.now(); qTarget = local('B', uRaw);
  }
  function frame(now){
    requestAnimationFrame(frame);
    var r = root.getBoundingClientRect(); if (!(r.bottom > -innerHeight && r.top < innerHeight * 2.5)) return;
    var dt = Math.min(64, now - lastT); lastT = now;
    uScrub = sFrom + (sTo - sFrom) * p3o(clamp01((now - sT0) / SCRUB));
    var a = 1 - Math.pow(1 - 0.18, dt / 16.667);
    qCur += (qTarget - qCur) * a; if (Math.abs(qTarget - qCur) < 0.0004) qCur = qTarget;
    render(uScrub);
  }

  function render(u){
    var mob = mqPhone.matches, rtl = document.documentElement.dir === 'rtl', vw = sticky.clientWidth, vh = sticky.clientHeight;
    var cA = local('A', u), tT = local('T', u), tR = local('R', u);

    // A + T: the scene assembles, then recedes into depth
    drawArch(cA);
    var away = sstep(win(tT, 0.0, 0.45));
    arch.style.opacity = (1 - away).toFixed(3);
    arch.style.transform = 'scale(' + lerp(1, 0.92, away).toFixed(4) + ')';
    core.style.opacity = tT > 0.22 ? '0' : '1';
    var headIn = 1 - sstep(win(tT, 0.0, 0.4));
    head.style.opacity = headIn.toFixed(3);
    head.style.transform = (mob ? '' : 'translateY(-50%) ') + 'translateY(' + (-(1 - headIn) * 34).toFixed(1) + 'px)';

    // the footage
    layoutBox(); sizeCanvas();
    var cineIn = sstep(win(tT, 0.55, 0.95)), anc = sstep(win(tR, 0, 0.62));    // the image settles first ...
    fit.mix = VIEW === 'framed' && !mob ? 1 : 0; fit.px = 0.5; fit.py = 0.5;
    if (mob) {                                                               // phones: follow the box while closed, open to the whole frame
      fit.px = lerp(0.8, 0.5, sstep(win(qCur, 0.5, 0.85)));
      fit.mix = lerp(VIEW === 'framed' ? lerp(0.3, 0.55, sstep(win(qCur, 0.72, 1))) : lerp(0, 0.45, sstep(win(qCur, 0.72, 1))), 1, anc);   // framed: the whole box, with margin
      fit.py = VIEW === 'framed' ? lerp(0.5, 0.12, anc) : lerp(0.42, 0.2, fit.mix);
    }
    // R: the composition moves beside the service layer and becomes secondary (desktop: scale into the free half)
    var sc = 1, tx = 0, ty = 0;
    if (!mob) {
      var sr = svc.getBoundingClientRect(), gap = Math.max(64, vw * 0.045), edge = Math.max(40, vw * 0.03);
      var L = rtl ? edge : sr.right + gap, Rr = rtl ? sr.left - gap : vw - edge;
      var vis = VIEW === 'full' ? Math.max(box.w / 1928, box.h / 1076) * 1928 : box.w;       // width of the drawn frame
      var target = Math.min((Rr - L) / 0.86, vh * 0.62 * AR);                                  // the objects (7-93 % of the frame) fill the free width
      sc = lerp(1, target / vis, anc);
      tx = lerp(0, (L + Rr) / 2 - (box.x + box.w / 2), anc); ty = lerp(0, vh * 0.53 - (box.y + box.h / 2), anc);
    }
    cine.style.opacity = cineIn.toFixed(3);
    cine.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) scale(' + sc.toFixed(4) + ')';
    shade.style.opacity = (anc * 0.3).toFixed(3);

    // frames (damped playhead) — and the cues follow what is painted
    var idx = Math.min(TOTAL - 1, Math.round(qCur * (TOTAL - 1)));
    if (u > seg.A.a - 60 && u < seg.T.a) { for (var k0 = 0; k0 < 12; k0++) ensure(k0); }
    if (snd && cineIn <= 0.5 && snd.last !== null) snd.silence(0.3);           // back into the opening scene: the box sounds leave
    if (snd && soundOn) snd.cardsUpdate(tT);                                    // the opening stage: the cards' exit, as displayed
    if (u >= seg.T.a - 10) {
      var w = windowSize();
      if (!paint(idx)) { var nr = nearestReady(idx); if (nr >= 0) paint(nr); }
      for (var k = idx - w.back; k <= idx + w.ahead; k++) ensure(k);
      if (u > seg.B.a + seg.B.len * 0.7) ensure(TOTAL - 1);
      evict(idx);
      if (snd && soundOn && painted >= 0 && cineIn > 0.5) snd.update(painted + 1);   // events follow the frame on screen
    }

    // bridge: the Ember point travels from the scene's core onto the seam of frame 1
    var bt = win(tT, 0.2, 0.8);
    if (tT > 0.2 && tT < 1) {
      var cr0 = core.getBoundingClientRect(), stR = sticky.getBoundingClientRect(), cb = canvas.getBoundingClientRect(), fr = coverRect(1928, 1076);
      var sx = cb.left - stR.left + fr.x + SEAM.x * fr.w, sy = cb.top - stR.top + fr.y + SEAM.y * fr.h, sh = SEAM.h * fr.h;
      if (!bridge._from || tT < 0.24) bridge._from = { x:cr0.left + cr0.width / 2 - stR.left, y:cr0.top + cr0.height / 2 - stR.top };
      var e = p2io(bt), hgt = lerp(11, sh, sstep(win(tT, 0.5, 0.85))), wid = lerp(11, 3, sstep(win(tT, 0.5, 0.8)));
      var bx = lerp(bridge._from.x, sx, e), by = lerp(bridge._from.y, sy, e), rot = lerp(45, 0, sstep(win(tT, 0.45, 0.7)));
      bridge.style.width = wid.toFixed(2) + 'px'; bridge.style.height = hgt.toFixed(2) + 'px';
      bridge.style.transform = 'translate(' + (bx - wid / 2).toFixed(2) + 'px,' + (by - hgt / 2).toFixed(2) + 'px) rotate(' + rot.toFixed(2) + 'deg)';
      bridge.style.opacity = (sstep(win(tT, 0.2, 0.26)) * (1 - sstep(win(tT, 0.86, 1)))).toFixed(3);
    } else { bridge.style.opacity = '0'; if (tT <= 0.2) bridge._from = null; }

    // narrative lines: placed against the visible frame, always inside the safe viewport
    var frD = coverRect(1928, 1076), visX = box.x + Math.max(0, frD.x), visY = box.y + Math.max(0, frD.y);
    var visW = Math.min(box.w, frD.w), visH = Math.min(box.h, frD.h), safe = Math.max(vh * 0.07, 56);
    if (!mob) {
      beatsBox.style.left = (visX + visW * 0.055).toFixed(1) + 'px'; beatsBox.style.width = (visW * 0.35).toFixed(1) + 'px';
      beatsBox.style.top = Math.min(visY + visH * 0.84, vh - safe).toFixed(1) + 'px';            // the lines rest on this baseline
    } else {
      beatsBox.style.left = (vw * 0.07).toFixed(1) + 'px'; beatsBox.style.width = (vw * 0.86).toFixed(1) + 'px';
      var maxH = 0; beats.forEach(function(b){ maxH = Math.max(maxH, b.offsetHeight); });
      beatsBox.style.top = Math.min(box.y + box.h + vh * 0.04 + maxH, vh - safe).toFixed(1) + 'px';
    }
    var q = qCur, B3 = [[0.03, 0.30], [0.36, 0.62], [0.68, mob ? 9 : 0.92]];
    beats.forEach(function(b, i){
      var w2 = B3[i], o = sstep(win(q, w2[0], w2[0] + 0.04)) * (1 - sstep(win(q, w2[1] - 0.04, w2[1])));
      o *= 1 - sstep(win(tR, 0, 0.3)); if (u < seg.B.a) o = 0;
      b.style.opacity = o.toFixed(3); b.style.transform = 'translateY(' + ((1 - o) * 12).toFixed(1) + 'px)';
    });

    // service layer
    var sv = sstep(win(tR, 0.55, 1));                                          // ... then the information arrives
    svc.classList.toggle('is-on', sv > 0.001);
    svc.style.opacity = sv.toFixed(3);
    svc.style.transform = (mob ? '' : 'translateY(-50%) ') + 'translateY(' + ((1 - sv) * 24).toFixed(1) + 'px)';
    setCurrent(uRaw >= seg.R.a + seg.R.len * 0.5 ? Math.min(5, Math.floor(local('S', uRaw) * 6)) : 0);
    exitLine.classList.toggle('is-on', uRaw >= seg.E.a);
    soundBtn.classList.toggle('is-on', u >= seg.T.a + seg.T.len * 0.5 && u < total);

    if (DEBUG) {
      var name = 'before'; ORDER.forEach(function(kk){ if (uRaw >= seg[kk].a) name = kk; }); if (uRaw >= total) name = 'released';
      dbg.textContent = 'stage ' + name + '  ' + (name in seg ? (local(name, uRaw) * 100).toFixed(0) + '%' : '') + '   view ' + VIEW + (SHARP ? ' +sharp' : '') +
        '\nscroll ' + uRaw.toFixed(0) + ' / ' + total.toFixed(0) + ' svh   pace ' + PACE +
        '\nframe ' + (painted + 1) + ' / ' + TOTAL + '   q ' + qCur.toFixed(3) + '   (lands f' + LAND + ', light f' + LIGHT + ')' +
        '\ncards ' + (cA * 100).toFixed(0) + '%   sound ' + (soundOn ? 'on' : 'off') + '   pool ' + pool.size +
        '\nsound: ' + (!snd ? (soundOn ? 'loading' : '—') : (Object.keys(snd.playing).join(' + ') || 'silent')) + '   ambience ' + (AMBIENCE ? 'on' : 'off') +
        (snd && snd.log.length ? '\nlast: ' + snd.log.slice(-3).map(function(e){ return e.ev + ' ' + e.id + (e.frame ? ' @f' + e.frame : '') + (e.why ? ' (' + e.why + ')' : ''); }).join(' | ') : '');
    }
  }

  // ---------------------------------------------------------------- A/B switch (prototype only)
  function abPanel(){
    if (!PROTO || Q.get('ab') === '0' || (mqPhone.matches && Q.get('ab') !== '1')) return;
    var p = document.createElement('div'); p.className = 'jr-ab';
    p.innerHTML = '<b>VIEW</b><button data-k="view" data-v="framed">Framed</button><button data-k="view" data-v="full">Full-bleed</button>' +
                  '<b>SHARPEN</b><button data-k="sharp" data-v="0">Off</button><button data-k="sharp" data-v="1">Mild</button>' +
                  '<b>AMBIENCE</b><button data-k="amb" data-v="1">On</button><button data-k="amb" data-v="0">Off</button>';
    function sync(){ [].forEach.call(p.querySelectorAll('button'), function(b){
      var k = b.getAttribute('data-k'), on = k === 'view' ? b.getAttribute('data-v') === VIEW : k === 'amb' ? (b.getAttribute('data-v') === '1') === AMBIENCE : (b.getAttribute('data-v') === '1') === SHARP;
      b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
    p.addEventListener('click', function(ev){
      var b = ev.target.closest('button'); if (!b) return;
      if (b.getAttribute('data-k') === 'view') { VIEW = b.getAttribute('data-v'); root.setAttribute('data-view', VIEW); boxKey = ''; painted = -1; }
      else if (b.getAttribute('data-k') === 'amb') { AMBIENCE = b.getAttribute('data-v') === '1'; if (snd) { snd.ambienceOn = AMBIENCE; if (!AMBIENCE) snd.fade('ambience', 0.3, 'switched off'); } }
      else { var s = b.getAttribute('data-v') === '1'; if (s !== SHARP) { SHARP = s; resetPool(); } }
      var url = new URL(location.href); url.searchParams.set('view', VIEW); url.searchParams.set('sharp', SHARP ? '1' : '0'); url.searchParams.set('ambience', AMBIENCE ? '1' : '0'); history.replaceState(null, '', url);
      sync();
    });
    sync(); document.body.appendChild(p);
  }

  // ---------------------------------------------------------------- reduced motion: a calm static section
  function setStatic(){
    root.classList.add('jr-static'); placeNodes(); drawArch(1);
    setCurrent(-1); dets.forEach(function(d){ d.classList.add('is-current'); });
  }

  var dbg = null;
  if (DEBUG) { dbg = document.createElement('div'); dbg.className = 'jr-debug'; document.body.appendChild(dbg); }
  if (mqReduce.matches) { setStatic(); return; }

  layoutSegments(); placeNodes(); soundLabel(); abPanel();
  mqPhone.addEventListener('change', function(){ resetPool(); layoutSegments(); placeNodes(); boxKey = ''; readScroll(); });
  new MutationObserver(function(){ soundLabel(); sizeDetail(); }).observe(document.documentElement, { attributes:true, attributeFilter:['lang'] });
  addEventListener('scroll', readScroll, { passive:true });
  addEventListener('resize', function(){ layoutSegments(); placeNodes(); boxKey = ''; readScroll(); sizeDetail(); });
  sizeDetail(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ sizeDetail(); placeNodes(); });
  readScroll(); uScrub = sTo; sFrom = sTo; qCur = qTarget;
  requestAnimationFrame(frame);
  window.__journey = { seg:seg, total:function(){ return total; },
    state:function(){ return { uRaw:uRaw, uScrub:uScrub, q:qCur, frame:painted + 1, pool:pool.size, sound:soundOn, current:current, view:VIEW, sharp:SHARP, snd:snd ? { playing:Object.keys(snd.playing), log:snd.log.slice(-12) } : null, ambience:AMBIENCE }; },
    // TEST ONLY (screenshots from a throttled background window): snap both smoothers to the scroll position and render
    settle:function(){ readScroll(); uScrub = sFrom = sTo = uRaw; qCur = qTarget; render(uScrub); return { want:Math.round(qCur * (TOTAL - 1)) + 1, frame:painted + 1 }; } };
})();
