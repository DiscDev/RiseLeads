'use strict';
/* No video URL is attached until both motion permissions allow it. */
class MotionPreferences {
  constructor({window, buttons}) {
    this.window = window;
    this.buttons = buttons.filter(Boolean);
    this.listeners = [];
    this.preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    try { this.userOff = window.localStorage.getItem('riseleads-motion') === 'off'; } catch (_) { this.userOff = false; }
    for (const button of this.buttons) {
      button.hidden = false;
      button.addEventListener('click', () => {
        this.userOff = !this.userOff;
        try { window.localStorage.setItem('riseleads-motion', this.userOff ? 'off' : 'on'); } catch (_) { /* Storage is optional. */ }
        this.configure();
      });
    }
    this.preference.addEventListener('change', () => this.configure());
    this.configure();
  }
  subscribe(listener) { this.listeners.push(listener); listener(); }
  configure() {
    this.enabled = !this.preference.matches && !this.userOff;
    for (const button of this.buttons) {
      button.setAttribute('aria-pressed', String(!this.enabled));
      button.textContent = this.preference.matches ? 'Motion off: device preference' : this.enabled ? 'Turn motion off' : 'Turn motion on';
    }
    for (const listener of this.listeners) listener();
  }
}

class AmbientFilm {
  constructor(options) {
    Object.assign(this, options);
    this.mobile = this.window.matchMedia('(max-width: 700px)');
    this.video.muted = true;
    this.video.loop = true;
    this.video.playsInline = true;
    this.mobile.addEventListener('change', () => this.configure());
    this.window.addEventListener('scroll', () => this.schedule(), {passive:true});
    this.window.addEventListener('resize', () => this.schedule());
    this.document.addEventListener('visibilitychange', () => this.update());
    this.video.addEventListener('loadeddata', () => this.schedule());
    this.video.addEventListener('error', () => this.fail());
    this.video.addEventListener('playing', () => {
      if (this.isActive() && !this.failedSource) this.video.hidden = false;
      else this.video.pause();
    });
    this.motion.subscribe(() => this.configure());
  }
  isActive() {
    const rect = this.hero.getBoundingClientRect();
    return this.motion.enabled && !this.document.hidden && rect.top < this.window.innerHeight && rect.top + rect.height > 0;
  }
  configure() {
    if (!this.motion.enabled) {
      this.video.hidden = true;
      this.stop();
      if (this.video.getAttribute('src')) {
        this.video.removeAttribute('src');
        this.video.load();
      }
      this.status.textContent = 'Motion is off. All content remains available.';
      return;
    }
    this.update();
  }
  schedule() {
    if (this.pending || this.document.hidden) return;
    this.pending = true;
    this.window.requestAnimationFrame(() => { this.pending = false; this.update(); });
  }
  update() {
    if (!this.isActive()) { this.stop(); return; }
    const source = this.mobile.matches ? (this.video.dataset.mobile || this.video.dataset.desktop) : this.video.dataset.desktop;
    if (source && source === this.failedSource) return;
    if (source && this.video.getAttribute('src') !== source) {
      this.stop();
      this.failedSource = null;
      this.video.hidden = true;
      this.video.src = source;
      this.video.load();
    }
    if (source && this.video.readyState >= 2 && this.video.paused && !this.playPending) {
      const attempt = {};
      this.playPending = attempt;
      this.video.play().then(() => {
        if (this.playPending !== attempt) return;
        this.playPending = null;
        if (!this.isActive()) this.stop();
      }, () => {
        if (this.playPending !== attempt) return;
        this.playPending = null;
        this.fail();
      });
    }
  }
  stop() {
    this.playPending = null;
    this.video.pause();
  }
  fail() {
    this.failedSource = this.video.getAttribute('src');
    this.stop();
    this.video.hidden = true;
    this.status.textContent = 'Background film unavailable. The static visual and all content remain available.';
  }
}

class ScrollFilm {
  constructor(options) {
    Object.assign(this, options);
    this.pending = false;
    this.failed = false;
    this.mobile = this.window.matchMedia('(max-width: 700px)');
    this.motion = this.motion || new MotionPreferences({window:this.window, buttons:[this.button]});
    this.mobile.addEventListener?.('change', () => this.configure());
    this.window.addEventListener('scroll', () => this.schedule(), {passive:true});
    this.window.addEventListener('resize', () => this.schedule());
    this.document.addEventListener('visibilitychange', () => this.schedule());
    this.video.addEventListener('loadedmetadata', () => this.schedule());
    this.video.addEventListener('loadeddata', () => { if (this.enabled && !this.failed) this.video.hidden = false; this.schedule(); });
    this.video.addEventListener('seeked', () => { if (this.enabled && !this.failed && this.video.readyState >= 2) this.video.hidden = false; this.schedule(); });
    this.video.addEventListener('error', () => { this.failed = true; this.video.hidden = true; this.status.textContent = 'Film unavailable. The static visual and all chapters remain available.'; });
    this.motion.subscribe(() => this.configure());
  }
  configure() {
    this.enabled = this.motion.enabled;
    if (!this.enabled) {
      this.video.hidden = true;
      this.video.pause();
      if (this.video.getAttribute?.('src') || this.video.src) {
        this.video.removeAttribute('src');
        this.video.load();
      }
      this.status.textContent = 'Motion is off. All chapters remain readable.';
    } else {
      const source = this.mobile.matches ? (this.video.dataset.mobile || this.video.dataset.desktop) : this.video.dataset.desktop;
      if (source && this.video.getAttribute?.('src') !== source && this.video.src !== source) {
        this.failed = false;
        this.video.hidden = true;
        this.video.src = source;
        this.video.load();
      }
      this.status.textContent = source ? 'Scroll to explore. The film follows your reading position.' : 'Film pending owner review. All chapters remain readable.';
    }
    this.schedule();
  }
  schedule() {
    if (this.pending || this.document.hidden) return;
    this.pending = true;
    this.window.requestAnimationFrame(() => { this.pending = false; this.update(); });
  }
  update() {
    if (this.document.hidden) return;
    const rect = this.journey.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height - this.window.innerHeight)));
    this.progress.style.width = `${progress * 100}%`;
    let chapter = 0;
    this.chapters.forEach((element, i) => { if (element.getBoundingClientRect().top < this.window.innerHeight * 0.65) chapter = i; });
    this.label.textContent = `0${chapter + 1} / ${this.chapters[chapter].dataset.chapter}`;
    if (!this.enabled || this.failed || rect.top >= this.window.innerHeight || rect.top + rect.height <= 0) return;
    if (!Number.isFinite(this.video.duration) || this.video.readyState < 1 || this.video.seeking) return;
    const target = progress * Math.max(0, this.video.duration - 0.04);
    if (Math.abs(this.video.currentTime - target) > 0.025) {
      try { this.video.currentTime = target; } catch (_) { /* Keep poster while a media seek is unavailable. */ }
    }
  }
}
if (typeof module !== 'undefined' && module.exports) module.exports = {ScrollFilm, MotionPreferences, AmbientFilm};
if (typeof document !== 'undefined') {
  const motion = new MotionPreferences({window,buttons:[document.getElementById('hero-motion-toggle'),document.getElementById('motion-toggle')]});
  const ambient = document.getElementById('ambient-film');
  if (ambient) new AmbientFilm({video:ambient,hero:document.querySelector('.hero'),status:document.getElementById('ambient-status'),motion,window,document});
  const video = document.getElementById('journey-film');
  if (video) {
    new ScrollFilm({video, button:document.getElementById('motion-toggle'), journey:document.getElementById('journey'), chapters:[...document.querySelectorAll('.chapter')], label:document.getElementById('chapter-label'), progress:document.getElementById('stage-progress'), status:document.getElementById('media-status'), motion, window, document});
  }
}
