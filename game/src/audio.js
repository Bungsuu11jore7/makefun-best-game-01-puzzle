// TIDAL LOCKS — all sound is synthesized with WebAudio; no audio files.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicTimer = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  click() { this.ensure(); this.tone(520, 0.07, 'triangle', 0.18, 0, 760); }
  undo() { this.ensure(); this.tone(420, 0.09, 'triangle', 0.16, 0, 260); }
  denied() { this.ensure(); this.tone(140, 0.16, 'sawtooth', 0.12, 0, 90); }
  bubble() { this.ensure(); this.tone(300 + Math.random() * 500, 0.12, 'sine', 0.12, 0, 700); }
  splash() {
    this.ensure();
    this.tone(900, 0.25, 'sine', 0.2, 0, 180);
    this.tone(500, 0.3, 'triangle', 0.12, 0.05, 120);
  }
  win() {
    this.ensure();
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.2, i * 0.11));
  }
  lose() {
    this.ensure();
    [330, 262, 196].forEach((f, i) => this.tone(f, 0.25, 'sawtooth', 0.1, i * 0.14));
  }

  /** Gentle looping tide arpeggio while playing. */
  startMusic() {
    this.ensure();
    if (!this.ctx || this.musicTimer) return;
    const notes = [262, 330, 392, 494, 392, 330];
    let i = 0;
    this.musicTimer = setInterval(() => {
      if (!this.muted) this.tone(notes[i % notes.length], 0.5, 'sine', 0.045);
      i += 1;
    }, 620);
  }

  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  }
}
