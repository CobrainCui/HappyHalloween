/**
 * 无素材音效：全部由 Web Audio 即时合成。
 * 浏览器要求先有一次用户手势，因此在“开始游戏”时调用 unlock()。
 */
export class AudioKit {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  unlock() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.42;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMuted() {
    this.muted = !this.muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.42, this.ctx.currentTime, 0.01);
    }
    return this.muted;
  }

  tone({ startFreq, endFreq, duration, type = 'triangle', volume = 0.1, delay = 0 }) {
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime + delay;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFreq, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  jump() {
    this.tone({
      startFreq: 190,
      endFreq: 420,
      duration: 0.13,
      type: 'triangle',
      volume: 0.075,
    });
    this.tone({
      startFreq: 420,
      endFreq: 620,
      duration: 0.06,
      type: 'sine',
      volume: 0.025,
      delay: 0.08,
    });
  }

  land(impact = 200) {
    const volume = Math.min(0.1, 0.035 + impact / 6000);
    this.tone({
      startFreq: 110,
      endFreq: 48,
      duration: 0.11,
      type: 'sine',
      volume,
    });
  }

  splash() {
    this.tone({
      startFreq: 540,
      endFreq: 150,
      duration: 0.16,
      type: 'sine',
      volume: 0.055,
    });
    this.tone({
      startFreq: 1180,
      endFreq: 420,
      duration: 0.09,
      type: 'triangle',
      volume: 0.022,
      delay: 0.015,
    });
  }

  pickup(special = false) {
    this.tone({
      startFreq: special ? 520 : 640,
      endFreq: special ? 860 : 760,
      duration: 0.1,
      type: 'triangle',
      volume: special ? 0.08 : 0.04,
    });
    if (special) {
      this.tone({
        startFreq: 880,
        endFreq: 1240,
        duration: 0.16,
        type: 'sine',
        volume: 0.05,
        delay: 0.08,
      });
    }
  }

  charge() {
    this.tone({
      startFreq: 130,
      endFreq: 760,
      duration: 0.22,
      type: 'sawtooth',
      volume: 0.045,
    });
    this.tone({
      startFreq: 620,
      endFreq: 960,
      duration: 0.12,
      type: 'triangle',
      volume: 0.04,
      delay: 0.16,
    });
  }

  discharge() {
    this.tone({
      startFreq: 420,
      endFreq: 90,
      duration: 0.18,
      type: 'sawtooth',
      volume: 0.035,
    });
  }

  spark() {
    this.tone({
      startFreq: 1400,
      endFreq: 520,
      duration: 0.07,
      type: 'square',
      volume: 0.018,
    });
  }

  calibrate() {
    this.tone({
      startFreq: 140,
      endFreq: 80,
      duration: 0.16,
      type: 'square',
      volume: 0.04,
    });
    this.tone({
      startFreq: 380,
      endFreq: 820,
      duration: 0.24,
      type: 'sine',
      volume: 0.045,
      delay: 0.08,
    });
  }

  error() {
    this.tone({
      startFreq: 150,
      endFreq: 105,
      duration: 0.18,
      type: 'square',
      volume: 0.035,
    });
  }

  checkpoint() {
    this.tone({
      startFreq: 330,
      endFreq: 440,
      duration: 0.16,
      type: 'sine',
      volume: 0.035,
    });
  }

  lava() {
    this.tone({
      startFreq: 90,
      endFreq: 34,
      duration: 0.4,
      type: 'sawtooth',
      volume: 0.075,
    });
    this.tone({
      startFreq: 220,
      endFreq: 70,
      duration: 0.25,
      type: 'triangle',
      volume: 0.04,
    });
  }

  death() {
    this.tone({
      startFreq: 180,
      endFreq: 52,
      duration: 0.34,
      type: 'triangle',
      volume: 0.055,
    });
  }

  tutorialChime() {
    this.tone({
      startFreq: 660,
      endFreq: 840,
      duration: 0.13,
      type: 'sine',
      volume: 0.04,
    });
    this.tone({
      startFreq: 990,
      endFreq: 1180,
      duration: 0.16,
      type: 'sine',
      volume: 0.03,
      delay: 0.1,
    });
  }

  complete() {
    const notes = [392, 523, 659, 784];
    notes.forEach((frequency, index) => {
      this.tone({
        startFreq: frequency,
        endFreq: frequency * 1.01,
        duration: 0.34,
        type: 'triangle',
        volume: 0.055,
        delay: index * 0.13,
      });
    });
  }
}
