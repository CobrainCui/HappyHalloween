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
    return this.setMuted(!this.muted);
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
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

  /** 面板开合：背包、名册、提示、暂停、赛道页共用的一声轻响。 */
  panel(open = true) {
    this.tone({
      startFreq: open ? 300 : 470,
      endFreq: open ? 470 : 300,
      duration: 0.09,
      type: 'triangle',
      volume: 0.028,
    });
    this.tone({
      startFreq: open ? 170 : 250,
      endFreq: open ? 250 : 165,
      duration: 0.12,
      type: 'sine',
      volume: 0.022,
      delay: 0.04,
    });
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

  /** 推着南瓜挪动：很低的一声木头摩擦，由 PumpkinWorld 限流后才响。 */
  push() {
    this.tone({
      startFreq: 96,
      endFreq: 68,
      duration: 0.07,
      type: 'square',
      volume: 0.012,
    });
  }

  /** 南瓜落到另一颗上：轻轻一记木碰，叠高时听得见。 */
  stack() {
    this.tone({
      startFreq: 176,
      endFreq: 116,
      duration: 0.07,
      type: 'sine',
      volume: 0.035,
    });
    this.tone({
      startFreq: 300,
      endFreq: 210,
      duration: 0.05,
      type: 'triangle',
      volume: 0.018,
      delay: 0.012,
    });
  }

  /** 抛出南瓜：一下短促的破风。 */
  toss() {
    this.tone({
      startFreq: 260,
      endFreq: 92,
      duration: 0.14,
      type: 'sawtooth',
      volume: 0.026,
    });
    this.tone({
      startFreq: 720,
      endFreq: 240,
      duration: 0.09,
      type: 'triangle',
      volume: 0.016,
      delay: 0.015,
    });
  }

  /** 指节敲木门：短、闷，两下叠在一起。 */
  knock() {
    this.tone({
      startFreq: 230,
      endFreq: 96,
      duration: 0.055,
      type: 'square',
      volume: 0.055,
    });
    this.tone({
      startFreq: 150,
      endFreq: 70,
      duration: 0.08,
      type: 'sine',
      volume: 0.045,
      delay: 0.028,
    });
  }

  /** 敲响石鼓：闷闷的一声鼓皮，后面拖一点余震。 */
  drum() {
    this.tone({
      startFreq: 124,
      endFreq: 52,
      duration: 0.26,
      type: 'sine',
      volume: 0.085,
    });
    this.tone({
      startFreq: 62,
      endFreq: 40,
      duration: 0.42,
      type: 'triangle',
      volume: 0.05,
      delay: 0.03,
    });
    this.tone({
      startFreq: 320,
      endFreq: 170,
      duration: 0.05,
      type: 'square',
      volume: 0.012,
      delay: 0.02,
    });
  }

  /** 捣蛋成功：三颗很快的跳音。 */
  trick() {
    [0, 0.07, 0.14].forEach((delay, index) => {
      this.tone({
        startFreq: 520 + index * 160,
        endFreq: 780 + index * 220,
        duration: 0.12,
        type: 'triangle',
        volume: 0.07,
        delay,
      });
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

  /** 吃一颗糖：糖纸窸窣一下，接着一口脆响。 */
  eat() {
    this.tone({
      startFreq: 980,
      endFreq: 660,
      duration: 0.045,
      type: 'square',
      volume: 0.02,
    });
    this.tone({
      startFreq: 760,
      endFreq: 520,
      duration: 0.05,
      type: 'square',
      volume: 0.016,
      delay: 0.055,
    });
    this.tone({
      startFreq: 320,
      endFreq: 500,
      duration: 0.14,
      type: 'triangle',
      volume: 0.028,
      delay: 0.11,
    });
  }

  /** 换上一套时装：布料抖开的一声轻响。 */
  equip() {
    this.tone({
      startFreq: 470,
      endFreq: 640,
      duration: 0.09,
      type: 'triangle',
      volume: 0.028,
    });
    this.tone({
      startFreq: 700,
      endFreq: 900,
      duration: 0.1,
      type: 'sine',
      volume: 0.022,
      delay: 0.07,
    });
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

  /** 谜题答对：两下干净的上行音，比 checkpoint 更亮。 */
  answerRight() {
    this.tone({
      startFreq: 560,
      endFreq: 560,
      duration: 0.08,
      type: 'triangle',
      volume: 0.04,
    });
    this.tone({
      startFreq: 840,
      endFreq: 840,
      duration: 0.12,
      type: 'sine',
      volume: 0.034,
      delay: 0.075,
    });
  }

  /** 谜题答错：只轻轻压一下，不吓人。 */
  answerWrong() {
    this.tone({
      startFreq: 240,
      endFreq: 190,
      duration: 0.12,
      type: 'triangle',
      volume: 0.026,
    });
  }

  /** 翻开一张牌：纸片弹起的一下。 */
  flip() {
    this.tone({
      startFreq: 620,
      endFreq: 480,
      duration: 0.05,
      type: 'triangle',
      volume: 0.018,
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

  /** 石门沉进地里：一整块石头往下磨。 */
  stoneGate() {
    this.tone({
      startFreq: 74,
      endFreq: 34,
      duration: 0.9,
      type: 'sawtooth',
      volume: 0.045,
    });
    this.tone({
      startFreq: 150,
      endFreq: 58,
      duration: 0.7,
      type: 'triangle',
      volume: 0.028,
      delay: 0.14,
    });
  }

  /** 旧灯亮起：暖一点的两声，比 tutorialChime 低而软。 */
  lamp() {
    this.tone({
      startFreq: 330,
      endFreq: 392,
      duration: 0.22,
      type: 'sine',
      volume: 0.038,
    });
    this.tone({
      startFreq: 494,
      endFreq: 587,
      duration: 0.3,
      type: 'sine',
      volume: 0.026,
      delay: 0.12,
    });
  }

  /** 送别一位同行者：一声很低的送别，不是庆祝。 */
  farewell() {
    this.tone({
      startFreq: 220,
      endFreq: 196,
      duration: 0.5,
      type: 'sine',
      volume: 0.045,
    });
    this.tone({
      startFreq: 165,
      endFreq: 131,
      duration: 0.7,
      type: 'triangle',
      volume: 0.03,
      delay: 0.18,
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

  /** 惊恐预兆：两下低沉的心跳，不和任何拾取音撞色。 */
  heartbeat() {
    this.tone({
      startFreq: 92,
      endFreq: 48,
      duration: 0.14,
      type: 'sine',
      volume: 0.07,
    });
    this.tone({
      startFreq: 78,
      endFreq: 42,
      duration: 0.18,
      type: 'sine',
      volume: 0.055,
      delay: 0.19,
    });
  }

  /** 跟着呼吸按对一次：音高随次数往上走，听得见自己在慢慢平复。 */
  breath(step = 1) {
    this.tone({
      startFreq: 420 + step * 60,
      endFreq: 620 + step * 80,
      duration: 0.22,
      type: 'sine',
      volume: 0.04,
    });
    this.tone({
      startFreq: 210 + step * 30,
      endFreq: 150,
      duration: 0.3,
      type: 'triangle',
      volume: 0.02,
      delay: 0.06,
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
