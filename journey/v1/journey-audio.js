/* Section 03 journey — event-based sound from the videos' original audio.
 *
 * Each sound belongs to one visual event and plays at its own natural speed, the same way every time, however the visitor
 * scrolls. Nothing is stretched, time-warped, chased or continuously synchronised to scroll — so the scroll pace can change
 * (journey.js PACE) without moving any sound off its picture. The owner's four moments:
 *   1 the light is pulled in   cards (impact.mp3) as the cards leave + the quiet room tone (ambience) as the box appears
 *   2 the fall                 impact: the original metallic landing, when frame 62 (the landing) is on screen
 *   3 the door opens           light: the light / opening sound on frame 84, then v2 (Video 2's quiet build) on frame 122
 *   4 the cards come out       v2surge: Video 2's surge on frame 150, the first panel lifting off
 * Attachment: an event fires when the DISPLAYED frame first reaches its frame while moving forward. Its file holds 15 ms before
 * the sound's first sample; that lead absorbs the audio device's latency so the attack is heard as it was in the source
 * (impact 19.6 ms, light 10.4 ms after its frame begins).
 * Clean behaviour: one hit per pass (an event re-arms only after the visitor has gone back before its build-up); flying far past
 * an event plays nothing late; a real step backward fades everything out and stays silent; a small wobble changes nothing.
 * The audio graph is injected, so the same logic runs in the page and in the offline test (_tests/audio_sim.js).
 */
(function(root, factory){
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.JourneySound = factory();
})(this, function(){
  var EVENTS = [
    { id:'impact', frame:62, rearm:50, file:'v1-impact.wav', gain:1.0, lead:0.015, delay:0.0196, late:6 },   // rearm: before the lift
    { id:'light',  frame:84, rearm:74, file:'v1-light.wav',  gain:1.0, lead:0.015, delay:0.0104, late:6 },
    // VIDEO 2 layer: Video 2's original audio (swell.mp3, 0-2.6 s, at its original level 0.6) split at its surge (1.245 s) so
    // each half belongs to its own picture, whatever the scroll speed (2026-11-20, the owner's four moments):
    //   v2       the quiet build (0-1.245 s): the door opening, from Video 2's first frame (122)
    //   v2surge  the surge (from 1.245 s, with the same 15 ms lead as the other hits): the cards leaving the box — the
    //            first panel lifts off on frame 150; it takes over from the build
    // Neither fades or touches a Video 1 sound.
    { id:'v2', frame:122, rearm:112, file:'v2-build.wav', gain:0.6, lead:0, delay:0, late:6, layer:2 },
    { id:'v2surge', frame:150, rearm:140, file:'v2-surge.wav', gain:0.6, lead:0.015, delay:0.01, late:8, layer:2, replaces:'v2' }
  ];
  var AMBIENCE = { id:'ambience', from:2, until:40, rearm:1, file:'v1-ambience.wav', gain:0.45 };   // starts between frames 2-40
  // OPENING STAGE (restored from revision 1): impact.mp3 — the original asset, byte-identical (Video 1 audio 1.05-2.45 s, the
  // box on its cables) — plays as the cards begin to leave; it gives way as soon as the first box sound begins.
  var CARDS = { id:'cards', at:0.04, file:'impact.mp3', gain:0.95 };

  function Sound(o){
    this.ctx = o.ctx; this.dest = o.dest; this.buffers = o.buffers; this.ambienceOn = o.ambience !== false;
    this.events = EVENTS; this.amb = AMBIENCE;
    this.armed = {}; var me = this; EVENTS.concat([AMBIENCE]).forEach(function(e){ me.armed[e.id] = true; });
    this.playing = {}; this.last = null; this.back = 0; this.log = [];
    this.cardsArmed = true; this.cardsLast = null;
  }
  Sound.EVENTS = EVENTS; Sound.AMBIENCE = AMBIENCE; Sound.CARDS = CARDS;
  Sound.files = function(){ return EVENTS.map(function(e){ return e.file; }).concat([AMBIENCE.file, CARDS.file]); };
  var S = Sound.prototype;
  S.latency = function(){ return this.ctx.outputLatency || this.ctx.baseLatency || 0; };
  S.play = function(e, shown){
    var b = this.buffers[e.file]; if (!b) return;
    var ctx = this.ctx, t = ctx.currentTime, s = ctx.createBufferSource(), g = ctx.createGain();
    // skip just enough of the 15 ms lead that the attack is heard `delay` after the frame appeared: heard = latency + lead - skip
    var skip = e.lead ? Math.max(0, Math.min(e.lead, e.lead + this.latency() - e.delay)) : 0;
    if (e !== CARDS && e.layer !== 2) this.fade('cards', 0.35, 'the box takes over');   // the opening-stage sound never overlaps the box sounds
    if (this.playing[e.id]) this.fade(e.id, 0.08, 'replaced');           // never two copies of the same sound
    if (e.replaces) this.fade(e.replaces, 0.06, 'the surge takes over');  // the build gives way to the surge
    s.buffer = b; s.connect(g); g.connect(this.dest);
    if (e === this.amb) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(e.gain, t + 0.3); } else g.gain.setValueAtTime(e.gain, t);
    s.start(t, skip);
    var me = this, p = { s:s, g:g }; this.playing[e.id] = p;
    s.onended = function(){ if (me.playing[e.id] === p) delete me.playing[e.id]; };
    this.log.push({ at:t, ev:'play', id:e.id, frame:shown, skipMs:+(skip * 1000).toFixed(1) });
  };
  S.fade = function(id, sec, why){
    var p = this.playing[id]; if (!p) return; delete this.playing[id];
    var t = this.ctx.currentTime, g = p.g.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + sec);
    try { p.s.stop(t + sec + 0.02); } catch (e) {}
    this.log.push({ at:t, ev:'fade', id:id, why:why });
  };
  S.fadeAll = function(sec, why){ for (var id in this.playing) this.fade(id, sec, why); };
  // shown: the 1-based frame number on screen (241-frame sequence; Video 1 = frames 1-121). Call every animation frame.
  S.update = function(shown){
    var prev = this.last; this.last = shown;
    if (prev === null) { var me = this; this.events.forEach(function(e){ me.armed[e.id] = shown < e.frame; }); this.armed.ambience = shown <= this.amb.until; return; }
    if (shown === prev) return;
    var me = this;
    if (shown < prev) {                                                     // backward
      this.back += prev - shown;
      if (this.back >= 3) this.fadeAll(0.2, 'backward');                   // a real step back (not a wobble): silence
      this.events.forEach(function(e){ if (shown < e.rearm) me.armed[e.id] = true; });
      if (shown <= this.amb.rearm) this.armed.ambience = true;
      return;
    }
    this.back = 0;                                                          // forward
    if (this.playing.ambience && shown >= this.events[0].frame) this.fade('ambience', 0.25, 'past the landing');   // belongs before the drop only
    if (this.ambienceOn && this.armed.ambience && shown >= this.amb.from && shown <= this.amb.until && !this.playing.ambience) {
      this.armed.ambience = false; this.play(this.amb, shown);
    }
    this.events.forEach(function(e){
      if (prev < e.frame && shown >= e.frame && me.armed[e.id]) {
        me.armed[e.id] = false;
        if (shown - e.frame > e.late) { me.log.push({ at:me.ctx.currentTime, ev:'skip', id:e.id, frame:shown, why:'flew past' }); return; }
        if (e.id === 'impact') me.fade('ambience', 0.12, 'gives way to the hit');
        me.play(e, shown);
      }
    });
  };
  // the opening stage: x = progress of the cards' exit (0 = scene assembled, 1 = scene gone and the box in view), as displayed.
  S.cardsUpdate = function(x){
    var prev = this.cardsLast; this.cardsLast = x;
    if (prev === null) { this.cardsArmed = x < CARDS.at; return; }
    if (x <= 0) this.cardsArmed = true;                                   // the scene is whole again: it may play on the next exit
    if (x < prev) { this.cardsBack = (this.cardsBack || 0) + (prev - x);   // a real step back (accumulated, not per frame)
      if (this.cardsBack >= 0.06) this.fade('cards', 0.2, 'backward'); return; }
    if (x > prev) this.cardsBack = 0;
    if (prev < CARDS.at && x >= CARDS.at && this.cardsArmed) {
      this.cardsArmed = false;
      if (x - CARDS.at > 0.5) { this.log.push({ at:this.ctx.currentTime, ev:'skip', id:'cards', why:'flew past' }); return; }
      this.play(CARDS, null);
    }
  };
  // silence the box stage only (leaving the cinematic for the opening scene must not cut the opening-stage sound)
  S.silence = function(sec, all){ for (var id in this.playing) if (all || id !== 'cards') this.fade(id, sec || 0.15, 'silence'); this.last = null; if (all) this.cardsLast = null; };
  return Sound;
});
