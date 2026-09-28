// ============================================================
// audio.js — per-chapter music (CC-licensed, see MUSIC_CREDITS)
//            + synthesized WebAudio soundscape fallback
// ============================================================
export const MUSIC_CREDITS = {
  z1: 'Shakuhachi track — Miyuki Nakajima, "Shakuhachi Classical" (CC BY-NC-ND 3.0, via Jamendo/Internet Archive)',
  z2: 'Shakuhachi track — Miyuki Nakajima, "Shakuhachi Classical" (CC BY-NC-ND 3.0, via Jamendo/Internet Archive)',
  z3: 'Shakuhachi track — Miyuki Nakajima, "Shakuhachi Classical" (CC BY-NC-ND 3.0, via Jamendo/Internet Archive)',
  z4: 'Shakuhachi track — Miyuki Nakajima, "Shakuhachi Classical" (CC BY-NC-ND 3.0, via Jamendo/Internet Archive)',
  z5: '"Epic Japanese Music feat. Mamoru Ogata" — Mogami of Yamagata (CC BY-SA 4.0, Internet Archive)',
};

export class AudioEngine {
  constructor() {
    this.ready = false;
    this.muted = false;
    this.ctx = null;
    this.timers = { drip: 0, clack: 0, heart: 0 };
    this.profile = {};
    this.target = {};
    this.cur = {};
    this._names = ['wind', 'rain', 'rumble', 'drone', 'shimmer', 'hiss'];
    // per-chapter music
    this.TRACKS = {
      z1: 'music/ch1_siege.mp3',
      z2: 'music/ch2_river.mp3',
      z3: 'music/ch3_dawn.mp3',
      z4: 'music/ch4_trials.mp3',
      z5: 'music/ch5_hope.mp3',
    };
    this.musicOn = true;
    this.musicLevel = 0.4;
    this._musicUrl = null;
    this._musicSrc = null;
    this._musicGain = null;
    this._musicBufs = {};
    this._pendingMusic = null;
  }

  init() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 6;
    this.master.connect(comp); comp.connect(ctx.destination);

    // music bus (per-chapter tracks)
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? 1 : 0;
    this.musicBus.connect(this.master);
    if (this._pendingMusic) { this.setZoneMusic(this._pendingMusic); this._pendingMusic = null; }

    // noise buffer
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;      // brown-ish
      d[i] = w * 0.5 + last * 3.5;
    }
    this.noiseBuf = buf;

    const mkBed = (filterType, freq, q = 0.6) => {
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = filterType; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start();
      return { src, f, g };
    };
    this.windBed = mkBed('lowpass', 380);
    this.rainBed = mkBed('bandpass', 3600, 0.4);
    this.rumbleBed = mkBed('lowpass', 95, 0.9);
    this.hissBed = mkBed('highpass', 5200, 0.7);

    // slow wind LFO
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.045;
    lfo.connect(lfoG); lfoG.connect(this.windBed.g.gain); lfo.start();

    // drone (tension) — detuned pair
    this.droneGain = ctx.createGain(); this.droneGain.gain.value = 0;
    this.droneGain.connect(this.master);
    [54.5, 55.3, 82.0].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = i === 2 ? 0.25 : 0.6;
      o.connect(g); g.connect(this.droneGain); o.start();
    });

    // shimmer pad — heavenly chord with tremolo
    this.shimmerGain = ctx.createGain(); this.shimmerGain.gain.value = 0;
    this.shimmerGain.connect(this.master);
    const trem = ctx.createOscillator(); trem.frequency.value = 0.28;
    const tremG = ctx.createGain(); tremG.gain.value = 0.4;
    trem.connect(tremG);
    [392, 523.25, 659.25, 783.99].forEach(f => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0.22;
      tremG.connect(g.gain);
      o.connect(g); g.connect(this.shimmerGain); o.start();
    });
    trem.start();

    this._names.forEach(n => { this.cur[n] = 0; this.target[n] = 0; });
    this.ready = true;
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.linearRampToValueAtTime(m ? 0 : 0.9, this.ctx.currentTime + 0.3);
  }

  /** profile: {wind, rain, rumble, drone, shimmer, hiss} target values 0..1 */
  setBed(profile) {
    this.profile = profile;
    this._names.forEach(n => { this.target[n] = profile[n] || 0; });
  }

  /* -------------- per-chapter music -------------- */
  async _loadTrack(url) {
    if (this._musicBufs[url]) return this._musicBufs[url];
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error('music http ' + res.status);
    const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
    this._musicBufs[url] = buf;
    return buf;
  }

  /** crossfade into the chapter track for zoneId (or null to stop) */
  async setZoneMusic(zoneId) {
    if (!this.ready) { this._pendingMusic = zoneId; return; }
    const url = zoneId ? this.TRACKS[zoneId] : null;
    if (url === this._musicUrl && url) return;
    let next = null;
    if (url) {
      try {
        const buf = await this._loadTrack(url);
        const src = this.ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        const g = this.ctx.createGain();
        g.gain.value = 0;
        src.connect(g); g.connect(this.musicBus);
        src.start();
        next = { src, g, url };
      } catch (e) {
        console.warn('music load failed (' + url + '): ' + e.message);
      }
    }
    // fade out the outgoing track
    const old = this._musicSrc;
    this._musicSrc = next; this._musicUrl = next ? next.url : null;
    if (old) {
      const g0 = old.g.gain, t0 = this.ctx.currentTime;
      g0.cancelScheduledValues(t0); g0.setValueAtTime(g0.value, t0);
      g0.linearRampToValueAtTime(0, t0 + 2.4);
      try { old.src.stop(t0 + 2.6); } catch (_) {}
    }
    if (next) {
      const t0 = this.ctx.currentTime;
      next.g.gain.setValueAtTime(0, t0);
      next.g.gain.linearRampToValueAtTime(this.musicLevel, t0 + 3.2);
    }
  }

  toggleMusicTrack(on) {
    this.musicOn = on != null ? !!on : !this.musicOn;
    if (this.musicBus) {
      const t0 = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(t0);
      this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, t0);
      this.musicBus.gain.linearRampToValueAtTime(this.musicOn ? 1 : 0, t0 + 0.8);
    }
    return this.musicOn;
  }

  update(dt) {
    if (!this.ready) return;
    // crossfade beds
    this._names.forEach(n => {
      this.cur[n] += (this.target[n] - this.cur[n]) * Math.min(1, dt * 0.9);
      const v = this.cur[n];
      if (n === 'drone') this.droneGain.gain.value = v * 0.16;
      else if (n === 'shimmer') this.shimmerGain.gain.value = v * 0.05;
      else this[n + 'Bed'].g.gain.value = v * (n === 'rain' ? 0.12 : n === 'wind' ? 0.14 : n === 'rumble' ? 0.5 : 0.05);
    });
    // ambient event schedulers
    const p = this.profile || {};
    this.timers.drip -= dt;
    if ((p.drip || 0) > 0 && this.timers.drip <= 0) {
      this.timers.drip = (1.2 + Math.random() * 2.6) / Math.max(0.2, p.drip);
      this._drip();
    }
    this.timers.clack -= dt;
    if ((p.clack || 0) > 0 && this.timers.clack <= 0) {
      this.timers.clack = 2.6;
      this._clackPattern();
    }
    if (p.heartBeat && this.timers.heart <= 0) {
      this.timers.heart = 1.15;
      this._heartbeat();
    }
  }

  /* -------------- tiny synth helpers -------------- */
  _env(g, t0, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + dec);
  }
  _noiseHit(dur, filterType, freq, q, peak, sweepTo = null) {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    const g = ctx.createGain();
    this._env(g, t0, 0.008, peak, dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0); src.stop(t0 + dur + 0.1);
  }
  _tone(freq, dur, peak, type = 'sine', slideTo = null) {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    const g = ctx.createGain();
    this._env(g, t0, 0.01, peak, dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.1);
  }

  /* -------------- one-shots -------------- */
  sfx(name) {
    if (!this.ready || this.muted) return;
    switch (name) {
      case 'boom':
        this._noiseHit(1.9, 'lowpass', 900, 0.7, 1.0, 55);
        this._tone(48, 1.6, 0.9, 'sine', 28);
        this._noiseHit(0.35, 'highpass', 900, 0.7, 0.5);
        break;
      case 'whoosh':
        this._noiseHit(0.7, 'bandpass', 320, 1.4, 0.35, 2600);
        break;
      case 'clack': case 'clack2':
        this._noiseHit(0.07, 'bandpass', 1500, 3.5, 0.5);
        this._tone(760, 0.06, 0.35, 'triangle', 540);
        break;
      case 'tick':
        this._noiseHit(0.03, 'highpass', 2400, 1, 0.22);
        this._tone(1650, 0.04, 0.12, 'square');
        break;
      case 'step':
        this._noiseHit(0.05, 'lowpass', 500, 1, 0.28);
        break;
      case 'bell': case 'chime':
        this._bell(660, 1.4, 0.22);
        if (name === 'chime') { this._bell(880, 1.2, 0.16, 0.14); this._bell(1318, 1.0, 0.12, 0.28); }
        break;
      case 'gong':
        [[98, .5], [147, .34], [220, .22], [311, .14]].forEach(([f, a]) => this._bell(f, 3.4, a, 0));
        this._noiseHit(0.3, 'bandpass', 400, 1, 0.3);
        break;
      case 'heartbeat':
        this._heartbeat();
        break;
      case 'whoosh2':
        this._noiseHit(1.1, 'bandpass', 180, 1.2, 0.4, 3200);
        break;
      case 'hush': {
        // crowd murmur collapsing to silence
        this._noiseHit(1.3, 'bandpass', 900, 0.8, 0.18, 300);
        break;
      }
      case 'swell':
        this._noiseHit(2.2, 'bandpass', 600, 0.8, 0.3, 4200);
        this._bell(523, 2.4, 0.14, 0.4);
        break;
      case 'dread':
        this._tone(65, 2.6, 0.4, 'sawtooth', 44);
        this._noiseHit(1.6, 'lowpass', 300, 1, 0.3, 90);
        break;
      case 'pop':
        this._tone(420, 0.09, 0.25, 'sine', 900);
        break;
    }
  }

  _bell(f, dur, peak, delay = 0) {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx, t0 = ctx.currentTime + delay;
    const car = ctx.createOscillator(); car.frequency.value = f;
    const mod = ctx.createOscillator(); mod.frequency.value = f * 2.756;
    const mg = ctx.createGain(); mg.gain.value = f * 1.8;
    mod.connect(mg); mg.connect(car.frequency);
    mg.gain.exponentialRampToValueAtTime(1, t0 + dur * 0.7);
    const g = ctx.createGain();
    this._env(g, t0, 0.01, peak, dur);
    car.connect(g); g.connect(this.master);
    car.start(t0); mod.start(t0);
    car.stop(t0 + dur + 0.2); mod.stop(t0 + dur + 0.2);
  }
  _drip() {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(1100 + Math.random() * 500, t0);
    o.frequency.exponentialRampToValueAtTime(340, t0 + 0.14);
    const g = ctx.createGain();
    this._env(g, t0, 0.004, 0.12, 0.3);
    // simple echo
    const dly = ctx.createDelay(1); dly.delayTime.value = 0.31;
    const fb = ctx.createGain(); fb.gain.value = 0.3;
    const eg = ctx.createGain(); eg.gain.value = 0.35;
    o.connect(g); g.connect(this.master);
    g.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(eg); eg.connect(this.master);
    o.start(t0); o.stop(t0 + 0.5);
  }
  _clackPattern() {
    // clack, clack-clack …
    this.sfx('clack');
    setTimeout(() => { this.sfx('clack2'); }, 240);
    setTimeout(() => { this.sfx('clack2'); }, 430);
  }
  _heartbeat() {
    if (!this.ready || this.muted) return;
    this._tone(58, 0.16, 0.5, 'sine', 36);
    setTimeout(() => this._tone(52, 0.14, 0.38, 'sine', 32), 210);
  }
}
