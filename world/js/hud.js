// ============================================================
// hud.js — menu, captions, projected world-labels, title cards
// ============================================================
import { Vector3 } from 'three';
import { CHAPTERS, VOLUME } from './chapters.js';

export class Hud {
  constructor(callbacks = {}) {
    this.cb = callbacks;
    this.$ = (id) => document.getElementById(id);
    this.menu = this.$('menu');
    this.hud = this.$('hud');
    this.titlecard = this.$('titlecard');
    this._fadeEl = this.$('fade');
    this._flashEl = this.$('flash');
    this.vignette = this.$('vignette');
    this.caption = this.$('caption');
    this.labelsBox = this.$('labels');
    this.labels = new Map();
    this._labelSeq = 0;

    this.$('btn-menu').onclick = () => cb('menu');
    this.$('btn-music').onclick = () => cb('music');
    this.$('btn-mute').onclick = () => cb('mute');
    this.$('btn-prev').onclick = () => cb('prev');
    this.$('btn-next').onclick = () => cb('next');
    this.$('btn-nextzone').onclick = () => cb('nextzone');
    const cb = (k) => callbacks[k] && callbacks[k]();

    // step counter widget
    this.sc = document.createElement('div');
    this.sc.id = 'stepcounter';
    this.sc.innerHTML = '<div class="sc-num">0</div><div class="sc-lbl">steps walked</div><div class="sc-grade"></div>';
    this.hud.appendChild(this.sc);
    this._scNum = this.sc.querySelector('.sc-num');
    this._scGrade = this.sc.querySelector('.sc-grade');

    // keyboard
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') cb('next');
      else if (e.key === 'ArrowLeft') cb('prev');
      else if (e.key === 'Escape') cb('menu');
      else if (e.key === 'm' || e.key === 'M') cb('mute');
      else if (e.key === 'n' || e.key === 'N') cb('music');
      else if (e.key === ' ') { e.preventDefault(); cb('next'); }
    });

    this.buildMenu();
  }

  /* ---------------- menu ---------------- */
  buildMenu() {
    const box = this.$('chapter-cards');
    box.innerHTML = '';
    CHAPTERS.forEach(ch => {
      const card = document.createElement('div');
      card.className = 'card' + (ch.locked ? ' locked' : '');
      const statusCls = ch.locked ? 'queued' : (this._seen?.has(ch.id) ? 'read' : 'published');
      card.innerHTML = `
        <div class="card-num">${ch.cn.replace('第', '').replace('章', '')}</div>
        <div class="card-kicker">Chapter ${ch.n} · ${ch.cn}</div>
        <div class="card-title">${ch.title}</div>
        <div class="card-quote">${ch.hook}</div>
        <div class="card-status ${statusCls}">${ch.locked ? 'Queued' : (this._seen?.has(ch.id) ? '↻ Revisit' : 'Published')}</div>
        <div class="card-cta">${ch.locked ? 'awaiting the bench…' : 'Enter the world →'}</div>
        <div class="card-progress"></div>`;
      if (!ch.locked) card.onclick = () => this.cb.pick && this.cb.pick(ch.id);
      box.appendChild(card);
    });
  }
  markSeen(id) {
    if (!this._seen) this._seen = new Set();
    this._seen.add(id);
    this.buildMenu();
  }

  showMenu() { this.menu.classList.remove('hidden'); this.hud.classList.add('hidden'); }
  hideMenu() { this.menu.classList.add('hidden'); }
  showHud() { this.hud.classList.remove('hidden'); }
  hideHud() { this.hud.classList.add('hidden'); }

  /* ---------------- chapter / beats ---------------- */
  setChapter(ch) {
    this.$('hud-cn').textContent = ch.cn;
    this.$('hud-title').textContent = ch.title;
    this._ch = ch;
  }
  setBeats(total) {
    const dots = this.$('dots');
    dots.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const d = document.createElement('button');
      d.className = 'dot'; d.title = `Beat ${i + 1}`;
      d.onclick = () => this.cb.goBeat && this.cb.goBeat(i);
      dots.appendChild(d);
    }
    this._dots = [...dots.children];
  }
  setBeat(i, { kicker = '', html = '' } = {}, { last = false, hasNextZone = false } = {}) {
    if (this._dots) this._dots.forEach((d, k) => {
      d.classList.toggle('on', k === i);
      d.classList.toggle('seen', k < i);
    });
    this.$('btn-prev').disabled = i === 0;
    this.$('caption').classList.remove('cap-in');
    void this.$('caption').offsetWidth; // restart animation
    this.$('caption').classList.add('cap-in');
    this.$('cap-kicker').textContent = kicker;
    this.$('cap-text').innerHTML = html;
    this.$('btn-nextzone').classList.toggle('hidden', !(last && hasNextZone));
    this.$('btn-next').disabled = false;
  }

  /* ---------------- title card ---------------- */
  titleCard(kicker, title, quote, dur = 3200) {
    const el = this.titlecard;
    el.classList.remove('hidden', 'tc-out');
    this.$('tc-kicker').textContent = kicker;
    this.$('tc-title').textContent = title;
    this.$('tc-quote').innerHTML = quote || '';
    clearTimeout(this._tcT);
    this._tcT = setTimeout(() => {
      el.classList.add('tc-out');
      setTimeout(() => el.classList.add('hidden'), 700);
    }, dur);
  }

  /* ---------------- fades / flash ---------------- */
  fade(to, ms = 550) {
    this._fadeEl.style.transition = `opacity ${ms}ms ease`;
    this._fadeEl.style.opacity = String(to);
  }
  flashFx(peak = 0.95, hold = 70, decay = 550) {
    this._flashEl.style.transition = 'none';
    this._flashEl.style.opacity = String(peak);
    setTimeout(() => {
      this._flashEl.style.transition = `opacity ${decay}ms ease`;
      this._flashEl.style.opacity = '0';
    }, hold);
  }
  setVignette(v) { this.vignette.style.opacity = String(v); }

  /* ---------------- world labels ---------------- */
  addLabel({ text, sub = '', cls = '', getPos, follow = null, once = false }) {
    const el = document.createElement('div');
    el.className = 'wlabel ' + cls;
    el.innerHTML = `<div class="wl-text">${text}</div>${sub ? `<div class="wl-sub">${sub}</div>` : ''}`;
    this.labelsBox.appendChild(el);
    const handle = {
      id: ++this._labelSeq, el, getPos, enabled: true,
      remove: () => { el.remove(); this.labels.delete(handle.id); },
      setVisible: (v) => el.classList.toggle('wl-hidden', !v),
    };
    this.labels.set(handle.id, handle);
    return handle;
  }
  clearLabels() { this.labels.forEach(l => l.el.remove()); this.labels.clear(); }
  updateLabels(camera, w, h) {
    const v = this._v || (this._v = new Vector3());
    this.labels.forEach(l => {
      if (!l.enabled) return;
      try {
        const p = l.getPos();
        v.copy(p).project(camera);
        const behind = v.z > 1;
        if (behind || v.x < -1.2 || v.x > 1.2 || v.y < -1.2 || v.y > 1.2) {
          l.el.style.opacity = '0';
        } else {
          l.el.style.opacity = '';
          l.el.style.left = `${(v.x * 0.5 + 0.5) * w}px`;
          l.el.style.top = `${(-v.y * 0.5 + 0.5) * h}px`;
        }
      } catch (e) { /* label target gone */ }
    });
  }

  /* ---------------- aptitude step counter ---------------- */
  showSteps(on) { this.sc.classList.toggle('on', !!on); }
  setSteps(n, grade = '') {
    this._scNum.textContent = n;
    if (grade) this._scGrade.textContent = grade;
    this._scNum.style.transform = 'scale(1.18)';
    setTimeout(() => { this._scNum.style.transform = 'scale(1)'; }, 90);
  }
  clearGrade() { this._scGrade.textContent = ''; }

  setMuteIcon(muted) { this.$('btn-mute').textContent = muted ? '✕' : '♪'; }
  setMusicIcon(on) { this.$('btn-music').textContent = on ? '♫ Music' : '♫ Off'; }
}
