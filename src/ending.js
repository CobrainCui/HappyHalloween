/**
 * 「给老师送南瓜派」的最后一幕：走进最后一道门之后。
 *
 * 这一幕不交给关卡去走，而是单独在画布上放一遍，全程只用第三人称：
 *   1. 先黑屏；
 *   2. 黑屏里开始落雪；
 *   3. 墓园淡入，主角从左边走到中间的大墓碑前，四双鞋跟在身后蹦蹦跳跳；
 *   4. 主角在碑前坐下，把南瓜派放在碑旁，和鞋分着吃；走和坐身上都还是路上穿的那套时装；
 *   5. 画面上方的叙述一句一句讲完这一夜，最后收黑，黑幕上打完最后一句话，再滚一遍名单。
 *
 * 画面是 512×288 的像素画；文字不画在画布里，而是排在 HUD 层的 DOM 上：
 * 放大后仍然清楚，也能用网页字体排长段落。画布里只剩墓园、雪和鞋。
 *
 * 时间轴全部按秒记，渲染只读 `this.time`。跳到结尾（skip）也只是把时间拨到
 * 收黑前，不会破坏画面上的前后关系。
 */

import { VIEW } from './config.js';
import { MEMORIAL_CHAPTERS } from './memorial.js';
import { paintShoe, shoeHeight, shoeStyleForStage } from './shoeFollowers.js';

const W = VIEW.WIDTH;
const H = VIEW.HEIGHT;

// 第三人称墓园的落地点与墓碑位置。
const GROUND = 224;
const GRAVE_X = 306;
const SIT_X = 262;

const TIMELINE = Object.freeze({
  snowStart: 0.5,
  walkStart: 3.6,
  sceneIn: 1.5,
  walkEnd: 9.4,
  // 坐下之后：把派放下、切块、吃第一口。全程不切主视角。
  pieSet: 10.2,
  cutStart: 11.4,
  eatStart: 14.0,
  // 旁白一直讲到雪落满墓园；收黑之后再把最后一句话打出来。
  end: 35.2,
  skipAfter: 5.2,
  // 收黑之后、结算页之前，在黑幕上滚一遍制作名单。按 E 可以跳过。
  creditsStart: 45.6,
  creditsEnd: 56.4,
});

// 片尾名单。改名字只动这里；role 靠右、name 靠左，中间留一条缝。
// role 和 name 都可以写成数组：一行排不下就往下接着排，同一格里对齐。
const CREDITS = Object.freeze([
  { role: ['生成灵感中...', '精心翻译中...'], name: '李濯言' },
  { role: '叙事主管', name: '胡欣婕' },
  { role: '补集', name: '崔子周' },
  { role: '特别鸣谢', name: ['510宿舍、Agents、爱尔兰人', '屈原、南瓜派'] },
]);

// 跳过时时间会直接跳到收黑前，中间那些刀叉声不能一口气全响。
const ALL_CUES = ['set-down', 'cut-0', 'cut-1', 'cut-2', 'cut-3', 'bite'];

/**
 * 落幕的旁白。中文在上、英文在下；每一块按时间淡入淡出。
 * 第三段的第二行换成了文言，落幕这里没有对应的文言，还是原文的英文。
 */
const CAPTIONS = Object.freeze({
  intro: {
    from: 5.2,
    to: 14.0,
    cn:
      '这些伟大的为人类事业奉献的、同时深受病痛折磨很久的社会工作者们，在老师的实验室里度过了无数痛苦且幸福的日子，他们戏谑地称自己为“Pharmakon”。',
    en:
      'the “poison & medicine”. Cure comes from pain, we believe, and it’s worthy dedicating for human welfare.',
    // 整句站住之后，Pharmakon 开始变形成 Pumpkin Avatar；注释在变形前后浮出来。
    morphFrom: 10.4,
    noteFrom: 10.2,
    note:
      '*Pharmakon:希腊语，中译为“药引”，它同时意味着“毒药”和“良药”。同一个词，既指伤害你的东西，也指治愈你的东西。',
  },
  story: {
    from: 14.6,
    to: 28.0,
    cn:
      '说是老师，其实是我的祖师爷了，除了有幸在冯桃老年拜访过她，我没有见过其他人，但这并不妨碍我穿越层层关卡，在万圣节为他们送来一点美味的南瓜派。',
    // 中文段落留在上方，下面一句一句往下换。
    lines: [
      { from: 21.4, to: 23.8, text: 'I admire you, Sir. I admire all of you.' },
      { from: 24.0, to: 26.0, text: '“老师你看，南瓜派还很热乎”' },
      { from: 26.2, to: 28.0, text: 'I miss you, Sir.' },
    ],
  },
  snow: {
    from: 28.4,
    to: 34.8,
    cn: '雪晦暗地落在墓园上，落在老师的前辈的墓碑上，落在我的肩头上，纷纷扬扬，飘落在每一个生者和死者的身上。',
    en: 'May pain melt as snow.',
  },
  final: {
    from: 35.6,
    to: 45.2,
    enFrom: 39.2,
    cn: '祝愿世间余岁安好，无病无灾，以及，万圣夜快乐。',
    en: 'May the living live long, may the departed rest well. Happy Halloween.',
  },
});

// 「We are the Pharmakon」→「Pumpkin Avatar」。
// 文档里的走位：P 留着，h 倒转缩短成 u，m 留着，o 往下伸成 p，k 留着，
// r 收窄挪成 i，n 留着；W 拆成两个 v，一个翻成 A，另一个留着；
// “are”的 a、“the”的 t、Pharmakon 的 a 和 r 拼出 Avatar。
const MORPH_FROM = 'We are the Pharmakon';
const MORPH_TO = 'Pumpkin Avatar';
// 源字母下标 → 目标字母下标。
const MORPH_MAP = new Map([
  [11, 0], // P → P
  [12, 1], // h → u
  [15, 2], // m → m
  [18, 3], // o → p
  [17, 4], // k → k
  [14, 5], // r → i
  [19, 6], // n → n
  [0, 8], // W → A
  [3, 10], // a（are）→ a
  [7, 11], // t（the）→ t
  [13, 12], // a（Pharmakon）→ a
  [4, 13], // r（are）→ r
]);
// 变形开始时每个字母先拧成的样子，再随着移动归位。
const MORPH_SHAPES = new Map([
  [12, 'rotate(180deg) scale(0.82, 0.72)'],
  [18, 'scale(0.9, 1.4)'],
  [0, 'scale(0.74, 0.82) rotate(-6deg)'],
  [14, 'scale(0.5, 1)'],
]);

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function lerp(from, to, t) {
  return from + (to - from) * t;
}

function smooth(t) {
  const value = clamp01(t);
  return value * value * (3 - 2 * value);
}

/** 一块文字从 from 淡入、到 to 淡出之后剩下的透明度。 */
function windowAlpha(time, from, to, fadeIn = 0.55, fadeOut = 0.6) {
  return Math.min(
    clamp01((time - from) / fadeIn),
    1 - clamp01((time - (to - fadeOut)) / fadeOut),
  );
}

/** 固定种子的随机数：每次重看这一幕，雪和树影都落在同一个地方。 */
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class MemorialEnding {
  constructor(game) {
    this.game = game;
    this.time = 0;
    this.finished = false;
    this.walkPhase = 0;
    // 音效只响一次：时间轴每帧都会经过同一个点。
    this.cues = new Set();

    const random = seededRandom(20261031);
    this.snow = Array.from({ length: 110 }, () => ({
      x: random() * W,
      y: random() * H,
      size: random() < 0.22 ? 2 : 1,
      speed: 13 + random() * 30,
      drift: 3 + random() * 12,
      phase: random() * Math.PI * 2,
      alpha: 0.28 + random() * 0.46,
    }));
    this.snowAlpha = 0;

    // 四双鞋的记忆色和鞋样。正常流程里 completeRun 之前已经排好四双，
    // 这里再兜一层，方便单独预览这一幕。
    const pairs = game.shoeFollowers?.pairs ?? [];
    this.accents = pairs.length
      ? pairs.map((pair) => pair.accent)
      : MEMORIAL_CHAPTERS.map((chapter) => chapter.accent);
    this.shoeStyles = pairs.length
      ? pairs.map((pair) => pair.shoe ?? 'oxford')
      : MEMORIAL_CHAPTERS.map((chapter) => shoeStyleForStage(chapter.stage));

    // 文字节点都在 HUD 层：画布里不排字，放大以后也不会糊成方块。
    this.caption = document.querySelector('#endingCaption');
    this.captionCn = document.querySelector('#endingCn');
    this.captionEn = document.querySelector('#endingEn');
    this.morph = document.querySelector('#endingMorph');
    this.morphLine = document.querySelector('#endingMorphLine');
    this.note = document.querySelector('#endingNote');
    this.final = document.querySelector('#endingFinal');
    this.finalCn = document.querySelector('#endingFinalCn');
    this.finalEn = document.querySelector('#endingFinalEn');
    this.caretCn = document.querySelector('#endingCaretCn');
    this.caretEn = document.querySelector('#endingCaretEn');
    this.credits = document.querySelector('#endingCredits');
    this.creditRowsEl = document.querySelector('#endingCreditRows');
    this.skipHint = document.querySelector('#endingSkip');

    this.morphPrepared = false;
    this.morphStarted = false;
    this.creditRowEls = [];
    this.resetText();
    this.buildCredits();
  }

  /** 片尾名单：分工在左、名字在右；改名单只动上面的 CREDITS。 */
  buildCredits() {
    this.creditRowEls = [
      { el: this.credits.querySelector('.ending-credits-title'), delay: 0 },
      { el: this.credits.querySelector('.ending-credits-latin'), delay: 0.5 },
    ];
    this.creditRowsEl.replaceChildren();
    let delay = 1.2;
    for (const item of CREDITS) {
      const row = document.createElement('div');
      row.className = 'ending-credit-row';
      const role = document.createElement('span');
      role.className = 'ending-credit-role';
      role.textContent = [].concat(item.role).join('\n');
      const name = document.createElement('span');
      name.className = 'ending-credit-name';
      name.textContent = [].concat(item.name).join('\n');
      row.append(role, name);
      this.creditRowsEl.append(row);
      this.creditRowEls.push({ el: row, delay });
      delay += 0.7;
    }
  }

  /** 每一幕重看时先把上一遍留下的字收干净。 */
  resetText() {
    for (const node of [
      this.caption,
      this.morph,
      this.note,
      this.final,
      this.credits,
      this.skipHint,
    ]) {
      if (node) node.hidden = true;
    }
    if (this.caption) this.caption.style.opacity = '0';
    if (this.morphLine) this.morphLine.replaceChildren();
    if (this.finalCn) this.finalCn.textContent = '';
    if (this.finalEn) this.finalEn.textContent = '';
    if (this.caretCn) this.caretCn.hidden = true;
    if (this.caretEn) this.caretEn.hidden = true;
  }

  get canSkip() {
    return this.time >= TIMELINE.skipAfter && !this.finished;
  }

  /**
   * 跳过碑前那一幕，直接拨到收黑前一秒，让最后一帧还有一段淡出；
   * 片尾名单照样放完。已经在名单里再按一次，就直接收掉。
   */
  skip() {
    if (!this.canSkip) return false;
    if (this.time < TIMELINE.end) {
      for (const key of ALL_CUES) this.cues.add(key);
      this.time = Math.max(this.time, TIMELINE.end - 1);
      return true;
    }
    this.time = Math.max(this.time, TIMELINE.creditsEnd - 0.2);
    return true;
  }

  update(dt) {
    const step = Math.min(0.05, Math.max(0, dt));
    this.time += step;
    const time = this.time;

    if (time > TIMELINE.snowStart) {
      this.snowAlpha = Math.min(1, this.snowAlpha + step * 1.4);
    }
    for (const flake of this.snow) {
      flake.y += flake.speed * step;
      flake.x += Math.sin(time * 0.8 + flake.phase) * flake.drift * step;
      if (flake.y > H + 4) {
        flake.y = -6 - (flake.phase % 1) * 18;
        flake.x = (flake.x + 137) % W;
      }
      if (flake.x < -4) flake.x += W + 8;
      else if (flake.x > W + 4) flake.x -= W + 8;
    }

    if (time > TIMELINE.walkStart && time < TIMELINE.walkEnd) {
      this.walkPhase += step * 9.2;
    }

    this.playCues(time);
    this.syncText(time);

    if (time >= TIMELINE.creditsEnd) this.finished = true;
  }

  /**
   * 文字的节拍：每块中文在上、英文（或文言）在下，块与块之间淡出淡入；
   * 收黑之后打最后一句话，再滚名单。文字和画面各自按 this.time 走。
   */
  syncText(time) {
    const intro = CAPTIONS.intro;
    const story = CAPTIONS.story;
    const snow = CAPTIONS.snow;
    const final = CAPTIONS.final;

    const inIntro = time >= intro.from && time < intro.to;
    const inStory = time >= story.from && time < story.to;
    const inSnow = time >= snow.from && time < snow.to;
    const showing = inIntro || inStory || inSnow;
    this.caption.hidden = !showing;

    if (showing) {
      if (inIntro) {
        this.caption.style.opacity = String(windowAlpha(time, intro.from, intro.to));
        this.setText(this.captionCn, intro.cn);
        this.setText(this.captionEn, intro.en);
        this.morph.hidden = false;
        // 先站住整句英文，等 morphFrom 再开始变形；节点一到就排好字母。
        this.prepareMorph();
        if (time >= intro.noteFrom) {
          this.note.hidden = false;
          this.setText(this.note, intro.note);
          this.note.style.opacity = String(windowAlpha(time, intro.noteFrom, intro.to, 0.6, 0.5));
        } else {
          this.note.hidden = true;
        }
        if (time >= intro.morphFrom) this.startMorph();
      } else if (inStory) {
        this.caption.style.opacity = String(windowAlpha(time, story.from, story.to));
        this.setText(this.captionCn, story.cn);
        const line = story.lines.find((entry) => time >= entry.from && time < entry.to);
        this.setText(this.captionEn, line ? line.text : '');
        this.morph.hidden = true;
        this.note.hidden = true;
      } else {
        this.caption.style.opacity = String(windowAlpha(time, snow.from, snow.to));
        this.setText(this.captionCn, snow.cn);
        this.setText(this.captionEn, snow.en);
        this.morph.hidden = true;
        this.note.hidden = true;
      }
    } else {
      this.note.hidden = true;
    }

    // 最后一句话：中文先打，再打英文；打完之后光标收起来。
    const finalShown = time >= final.from && time < final.to;
    this.final.hidden = !finalShown;
    if (finalShown) {
      const cnCount = Math.min(final.cn.length, Math.floor((time - final.from) * 7.5));
      const enCount = Math.min(
        final.en.length,
        Math.max(0, Math.floor((time - final.enFrom) * 17)),
      );
      this.setText(this.finalCn, final.cn.slice(0, cnCount));
      this.setText(this.finalEn, final.en.slice(0, enCount));
      this.caretCn.hidden = cnCount >= final.cn.length;
      // 英文还没开始打时，光标先不出现，免得空着一行闪。
      this.caretEn.hidden = time < final.enFrom || enCount >= final.en.length;
    }

    this.syncCredits(time);

    const showSkip =
      this.canSkip && (time < TIMELINE.end - 0.8 || time > TIMELINE.creditsStart + 1.4);
    this.skipHint.hidden = !showSkip;
  }

  /** 片尾名单：整块慢慢往上浮，一行行错开出现，最后一起淡下去。 */
  syncCredits(time) {
    if (time < TIMELINE.creditsStart) {
      this.credits.hidden = true;
      return;
    }
    this.credits.hidden = false;
    const span = TIMELINE.creditsEnd - TIMELINE.creditsStart;
    const drift = lerp(12, -14, clamp01((time - TIMELINE.creditsStart) / span));
    this.credits.style.transform = `translateX(-50%) translateY(${drift.toFixed(2)}px)`;
    const out = 1 - clamp01((time - (TIMELINE.creditsEnd - 2.2)) / 2.2);
    const elapsed = time - TIMELINE.creditsStart;
    for (const row of this.creditRowEls) {
      const alpha = Math.min(clamp01((elapsed - row.delay) / 0.9), out);
      row.el.style.opacity = String(alpha);
    }
  }

  setText(node, text) {
    if (!node) return;
    if (node.textContent !== text) node.textContent = text;
  }

  /**
   * 把「We are the Pharmakon」和「Pumpkin Avatar」拆成一个个绝对定位的字母。
   * 位置按真实字宽量，中文和英文的字体都走网页字体。
   */
  prepareMorph() {
    if (this.morphPrepared) return true;
    const width = this.morphLine.clientWidth;
    if (!width) return false;
    // 字号和字体跟着 CSS 走：手机上的字小一档，字母位置也要按小字量。
    const probe = document.createElement('span');
    probe.className = 'ending-morph-char';
    probe.textContent = 'M';
    probe.style.visibility = 'hidden';
    this.morphLine.append(probe);
    const computed = getComputedStyle(probe);
    const tracking = Math.max(0.8, (parseFloat(computed.fontSize) || 32) * 0.05);
    const ctx =
      this.measureCtx || (this.measureCtx = document.createElement('canvas').getContext('2d'));
    ctx.font = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
    probe.remove();
    const layout = (text) => {
      const chars = [...text];
      const widths = chars.map((ch) => ctx.measureText(ch).width + tracking);
      const total = widths.reduce((sum, value) => sum + value, 0) - tracking;
      let x = (width - total) / 2;
      return chars.map((ch, index) => {
        const item = { ch, left: x };
        x += widths[index];
        return item;
      });
    };
    this.morphFrom = layout(MORPH_FROM);
    this.morphTo = layout(MORPH_TO);
    this.morphSpans = this.morphFrom.map((item) => {
      if (item.ch === ' ') return null;
      const span = document.createElement('span');
      span.className = 'ending-morph-char';
      span.textContent = item.ch;
      span.style.left = `${item.left}px`;
      this.morphLine.append(span);
      return span;
    });
    this.morphPrepared = true;
    return true;
  }

  /** 整句站住之后开始变换：能用的字母挪去新位置，用不上的淡出。 */
  startMorph() {
    if (this.morphStarted || !this.prepareMorph()) return;
    this.morphStarted = true;
    const line = this.morphLine;

    // 先换上目标字母，并让每个字母按自己的走位先拧一下；这一步不走过渡。
    this.morphFrom.forEach((item, index) => {
      const span = this.morphSpans[index];
      const targetIndex = MORPH_MAP.get(index);
      if (!span || targetIndex === undefined) return;
      span.style.transition = 'none';
      span.textContent = this.morphTo[targetIndex].ch;
      span.style.transform = MORPH_SHAPES.get(index) ?? 'none';
    });
    void line.offsetWidth;

    // 再一起放开：该移动的移动，该淡出的淡出。
    this.morphFrom.forEach((item, index) => {
      const span = this.morphSpans[index];
      if (!span) return;
      span.style.transition = '';
      const targetIndex = MORPH_MAP.get(index);
      if (targetIndex === undefined) {
        span.style.transitionDelay = `${0.04 * (index % 5)}s`;
        span.style.transform = 'translateY(-10px) rotate(9deg) scale(0.82)';
        span.style.opacity = '0';
        return;
      }
      span.style.left = `${this.morphTo[targetIndex].left}px`;
      span.style.transform = 'none';
      span.style.opacity = '1';
    });

    // 「Avatar」里的 v 没有现成的字母，从 W 旁边冒出来。
    const origin = this.morphFrom[0];
    const v = document.createElement('span');
    v.className = 'ending-morph-char';
    v.textContent = 'v';
    v.style.left = `${origin.left + 14}px`;
    v.style.opacity = '0';
    v.style.transform = 'scale(0.6)';
    line.append(v);
    void v.offsetWidth;
    v.style.left = `${this.morphTo[9].left}px`;
    v.style.opacity = '1';
    v.style.transform = 'none';
  }

  /** 很简单的声音落点：放派、切块、吃第一口。 */
  playCues(time) {
    const audio = this.game.audio;
    if (!audio) return;
    const cue = (key, at, play) => {
      if (time < at || this.cues.has(key)) return;
      this.cues.add(key);
      play();
    };

    cue('set-down', TIMELINE.pieSet + 0.4, () =>
      audio.tone({ startFreq: 523, endFreq: 392, duration: 0.5, type: 'sine', volume: 0.04 }),
    );
    [0, 0.9, 1.8, 2.7].forEach((at, index) =>
      cue(`cut-${index}`, TIMELINE.cutStart + at, () =>
        audio.tone({
          startFreq: 880,
          endFreq: 660,
          duration: 0.07,
          type: 'triangle',
          volume: 0.022,
        }),
      ),
    );
    cue('bite', TIMELINE.eatStart + 1.1, () =>
      audio.tone({ startFreq: 300, endFreq: 210, duration: 0.18, type: 'sine', volume: 0.035 }),
    );
  }

  /** 黑幕浓度：开场全黑，场景淡入；最后再收黑。全程不做切视角的黑场。 */
  blackAlpha(time) {
    if (time < TIMELINE.walkStart) return 1;
    if (time < TIMELINE.walkStart + TIMELINE.sceneIn) {
      return 1 - clamp01((time - TIMELINE.walkStart) / TIMELINE.sceneIn);
    }
    if (time < TIMELINE.end - 1.4) return 0;
    return clamp01((time - (TIMELINE.end - 1.4)) / 1.4);
  }

  draw(renderer, time) {
    const ctx = renderer.ctx;
    const t = this.time;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#04050a';
    ctx.fillRect(0, 0, W, H);

    // 从头到尾都是同一个第三人称机位：走、坐下、放派、切块、吃。
    if (t >= TIMELINE.walkStart) {
      this.drawGraveyard(ctx, time);
    }

    const black = this.blackAlpha(t);
    if (black > 0) {
      ctx.globalAlpha = black;
      ctx.fillStyle = '#03040a';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // 雪画在黑幕之上：开场全黑的时候，先看见的应该是雪。
    this.drawSnow(ctx);

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // 第三人称：墓园、走路、坐下
  // ---------------------------------------------------------------------------

  drawGraveyard(ctx, time) {
    const t = this.time;
    // 月亮挪到左上角：画面正上方留给旁白，字压在月盘上会看不清。
    this.drawSky(ctx, 34, 22, 17);
    this.drawGround(ctx, GROUND);
    this.drawTree(ctx, 38, GROUND, 1);
    this.drawTree(ctx, W - 42, GROUND, -1);

    // 大碑后面并排四块小碑，方方正正，各刻一个十字。
    for (const [dx, w, h] of [
      [-82, 18, 30],
      [-56, 16, 27],
      [56, 16, 27],
      [82, 18, 30],
    ]) {
      this.drawTomb(ctx, GRAVE_X + dx, GROUND - 10, w, h, { small: true });
    }

    const sitT = t - TIMELINE.walkEnd;
    if (sitT > 0) this.drawOrbitShoes(ctx, time, true);

    this.drawTomb(ctx, GRAVE_X, GROUND, 44, 76, {});

    if (t < TIMELINE.walkEnd) {
      this.drawWalking(ctx, time);
    } else if (sitT > 0) {
      this.drawSeated(ctx, time, sitT);
      this.drawOrbitShoes(ctx, time, false);
      // 派盘始终留在这个第三人称画面里：先落在雪上，再一块块切开。
      this.drawSitPie(ctx, time);
    }
  }

  drawWalking(ctx, time) {
    const walk = clamp01((this.time - TIMELINE.walkStart) / (TIMELINE.walkEnd - TIMELINE.walkStart));
    // 从画面外一直走到碑前，速度保持匀，看起来才像真的在走。
    const x = -26 + (SIT_X + 26) * walk;

    // 鞋按固定间距跟在身后，边走边蹦。
    this.accents.forEach((accent, index) => {
      const shoeX = x - 30 - index * 29;
      if (shoeX < -18) return;
      this.drawHoppingPair(
        ctx,
        shoeX,
        GROUND,
        accent,
        4,
        1.5,
        index === 0 ? 0.95 : 0.85,
        index,
        time,
        1,
        this.shoeStyles[index],
      );
    });

    this.drawWalkingPlayer(ctx, x, GROUND, time);
  }

  /** 直接借用玩家自己的画法，路上换的时装、南瓜头都会跟着走进来。 */
  drawWalkingPlayer(ctx, x, feetY, time) {
    const player = this.game.player;
    const saved = {
      facing: player.facing,
      walkPhase: player.walkPhase,
      onGround: player.onGround,
      vx: player.vx,
      crouching: player.crouching,
      hovering: player.hovering,
      inWater: player.inWater,
      isGliding: player.isGliding,
      charge: player.charge,
    };

    player.facing = 1;
    player.walkPhase = this.walkPhase;
    player.onGround = true;
    player.vx = 40;
    player.crouching = false;
    player.hovering = false;
    player.inWater = false;
    player.isGliding = false;
    player.charge = 0;

    ctx.save();
    ctx.globalAlpha = 0.26;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(Math.round(x) - 10, Math.round(feetY) - 2, 20, 2);
    ctx.globalAlpha = 1;
    ctx.translate(Math.round(x), Math.round(feetY));
    ctx.scale(2, 2);
    // 传进玩家自己的坐标：画在本地原点，缩放已经由外面处理。
    player.draw(ctx, player.centerX, player.feetY, time);
    ctx.restore();

    Object.assign(player, saved);
  }

  /**
   * 坐在碑前。坐姿、呼吸和吃东西的节奏全共用，只有身上的时装跟着路上那套走。
   * 每套时装的脑袋、身子和袖子都不一样，所以分开画；没拼过时装就是提灯人本来的样子。
   */
  drawSeated(ctx, time, sitT) {
    const settle = smooth(sitT / 0.6);
    const eating = this.time >= TIMELINE.eatStart;
    const bite = eating ? (Math.sin(time * 2.2) + 1) / 2 : 0;

    ctx.save();
    ctx.translate(SIT_X, GROUND);
    // 刚坐下时轻轻沉一下，不用整段蹲起动画。
    ctx.translate(0, Math.round((1 - settle) * -2));
    ctx.scale(2, 2);

    // 雪上的影子
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(-13, -2, 30, 2);
    ctx.globalAlpha = 1;

    this.drawSeatedLegs(ctx);

    const costume = this.game.player?.costume ?? null;
    if (costume === 'ghost') this.drawSeatedGhost(ctx, time, eating, bite);
    else if (costume === 'skeleton') this.drawSeatedSkeleton(ctx, time, eating, bite);
    else if (costume === 'vampire') this.drawSeatedVampire(ctx, time, eating, bite);
    else if (costume === 'mummy') this.drawSeatedMummy(ctx, time, eating, bite);
    else if (costume === 'witch') this.drawSeatedWitch(ctx, time, eating, bite);
    else this.drawSeatedPilgrim(ctx, time, eating, bite);

    ctx.restore();

    // 头边的暖光，让坐着的这一小块地方亮一点
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(SIT_X, GROUND - 32, 2, SIT_X, GROUND - 32, 38);
    glow.addColorStop(0, 'rgba(255, 152, 58, 0.11)');
    glow.addColorStop(1, 'rgba(255, 100, 20, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(SIT_X - 38, GROUND - 70, 76, 72);
    ctx.restore();
  }

  /** 坐着时落到雪上的两条腿和皮鞋：后腿暗一点，前腿亮一点。 */
  drawSeatedLegs(ctx) {
    // 后面的那条腿，稍微暗一点
    ctx.fillStyle = '#140a19';
    ctx.fillRect(4, -6, 6, 2);
    ctx.fillRect(9, -4, 5, 2);
    ctx.fillStyle = '#241219';
    ctx.fillRect(13, -3, 4, 2);

    // 前腿：膝盖略高，小腿落到雪地上，再是皮鞋
    ctx.fillStyle = '#1a0e20';
    ctx.fillRect(3, -7, 6, 2);
    ctx.fillRect(8, -5, 6, 2);
    ctx.fillStyle = '#2e1a16';
    ctx.fillRect(12, -4, 5, 3);
    ctx.fillStyle = '#8a6045';
    ctx.fillRect(16, -4, 1, 1);
  }

  /**
   * 坐着时伸向派盘的两只手。动作共用，袖子和手背的颜色由时装给：
   * 阿飘是床单袖子，骷髅是骨头手，其余跟着各自的身子走。
   */
  drawSeatedArms(ctx, eating, bite, sleeve, skin) {
    // 左手撑在雪地上，靠向派盘
    ctx.fillStyle = sleeve;
    ctx.fillRect(-9, -8, 4, 2);
    ctx.fillStyle = skin;
    ctx.fillRect(-11, -7, 3, 2);

    // 举着派块的右手：派放下、切好之后才跟着咀嚼的节奏动。
    const handX = 4;
    const handY = -12 + Math.round(bite * 4);
    ctx.fillStyle = sleeve;
    const sleeveTop = Math.min(-10, handY + 2);
    ctx.fillRect(3, sleeveTop, 2, Math.max(1, Math.abs(handY + 12)));
    ctx.fillStyle = skin;
    ctx.fillRect(handX, handY, 3, 2);
    // 手里的小块南瓜派：还没开始吃时手里是空的。
    if (eating) {
      ctx.fillStyle = '#d9a441';
      ctx.fillRect(handX, handY - 1, 3, 1);
      ctx.fillStyle = '#f0c979';
      ctx.fillRect(handX, handY - 2, 2, 1);
    }
  }

  /** 南瓜头和那张脸：时装没把整个头包住时画这一套。 */
  drawSeatedPumpkinHead(ctx) {
    ctx.fillStyle = '#c9520d';
    ctx.fillRect(-3, -21, 6, 1);
    ctx.fillRect(-4, -20, 8, 1);
    ctx.fillRect(-5, -19, 10, 7);
    ctx.fillRect(-4, -12, 8, 1);
    ctx.fillStyle = '#ff7d1a';
    ctx.fillRect(-3, -20, 6, 1);
    ctx.fillRect(-4, -19, 8, 1);
    ctx.fillRect(-5, -18, 9, 6);
    ctx.fillRect(-4, -12, 8, 1);
    ctx.fillStyle = '#ffb347';
    ctx.fillRect(-3, -19, 4, 1);
    ctx.fillRect(-4, -18, 2, 2);
    ctx.fillStyle = '#c9520d';
    ctx.fillRect(-4, -16, 1, 4);
    ctx.fillRect(3, -16, 1, 4);

    // 脸：面朝右边的墓碑
    ctx.fillStyle = '#1b0d18';
    ctx.fillRect(-4, -17, 2, 1);
    ctx.fillRect(-3, -16, 1, 1);
    ctx.fillRect(2, -17, 2, 1);
    ctx.fillRect(2, -16, 1, 1);
    ctx.fillRect(-2, -14, 4, 1);
    ctx.fillRect(-1, -13, 2, 1);
    ctx.fillStyle = '#ffd678';
    ctx.globalAlpha = 0.8;
    ctx.fillRect(-3, -16, 1, 1);
    ctx.fillRect(3, -16, 1, 1);
    ctx.globalAlpha = 1;
  }

  /** 没穿时装：原来的提灯人，紫斗篷和歪尖帽。 */
  drawSeatedPilgrim(ctx, time, eating, bite) {
    // 斗篷：坐着时下摆铺在雪上，比站着矮一截
    ctx.fillStyle = '#2a173b';
    ctx.fillRect(-7, -12, 13, 3);
    ctx.fillRect(-8, -9, 15, 4);
    ctx.fillRect(-9, -5, 17, 3);
    ctx.fillRect(-8, -2, 15, 2);
    ctx.fillStyle = '#42275b';
    ctx.fillRect(-5, -11, 3, 6);
    ctx.fillRect(-7, -6, 4, 2);
    ctx.fillStyle = '#1b0f28';
    ctx.fillRect(-7, -3, 13, 1);
    ctx.fillRect(-9, -5, 2, 2);
    ctx.fillRect(7, -5, 2, 2);

    this.drawSeatedArms(ctx, eating, bite, '#2a173b', '#e2b98f');
    this.drawSeatedPumpkinHead(ctx);

    // 歪尖帽
    ctx.fillStyle = '#1e102c';
    ctx.fillRect(-7, -22, 14, 2);
    ctx.fillRect(-4, -24, 8, 2);
    ctx.fillRect(-3, -25, 7, 1);
    ctx.fillRect(-2, -26, 5, 1);
    ctx.fillRect(-1, -27, 3, 1);
    ctx.fillRect(-3, -28, 2, 1);
    ctx.fillStyle = '#3c2352';
    ctx.fillRect(-7, -22, 14, 1);
    ctx.fillRect(-3, -24, 4, 1);
    ctx.fillStyle = '#ff7d1a';
    ctx.fillRect(-4, -23, 8, 1);
    ctx.fillStyle = '#ffb347';
    ctx.fillRect(-4, -23, 3, 1);
  }

  /** 阿飘：旧床单罩住整个人，坐下时下摆摊在雪上，两边慢慢晃。 */
  drawSeatedGhost(ctx, time, eating, bite) {
    const sway = Math.round(Math.sin(time * 1.7));
    const breathe = Math.round(Math.sin(time * 1.1));

    ctx.fillStyle = '#e9e3d6';
    ctx.fillRect(-5, -28, 10, 2);
    ctx.fillRect(-6, -26, 12, 11);
    ctx.fillRect(-8, -16, 16, 12 + breathe);
    ctx.fillRect(-9, -4 + breathe, 18, 3);
    ctx.fillRect(-7, -1 + breathe, 13, 1);
    // 下摆两边一上一下地晃
    ctx.fillRect(-10, -3 + breathe + sway, 2, 2);
    ctx.fillRect(8, -3 + breathe - sway, 2, 2);

    // 布褶和翻边
    ctx.fillStyle = '#cfc7b6';
    ctx.fillRect(-6, -25, 1, 20 + breathe);
    ctx.fillRect(6, -25, 1, 16);
    ctx.fillRect(-1, -24, 1, 18 + breathe);
    ctx.fillRect(-9, -5 + breathe, 18, 1);
    ctx.fillStyle = '#f7f2e8';
    ctx.fillRect(-6, -28, 12, 1);
    ctx.fillRect(3, -22, 1, 10);

    // 剪出来的两个眼洞
    ctx.fillStyle = '#171020';
    ctx.fillRect(-2, -22, 3, 3);
    ctx.fillRect(2, -22, 3, 3);

    this.drawSeatedArms(ctx, eating, bite, '#e9e3d6', '#e2b98f');
  }

  /** 骷髅：头骨面具和一副肋骨，坐着时肋骨跟着呼吸轻轻起伏。 */
  drawSeatedSkeleton(ctx, time, eating, bite) {
    const breathe = Math.round((Math.sin(time * 1.6) + 1) / 2);

    // 深色底，肋骨之间才看得出空
    ctx.fillStyle = '#1b0f28';
    ctx.fillRect(-7, -12, 13, 3);
    ctx.fillRect(-8, -9, 15, 4);
    ctx.fillRect(-9, -5, 17, 3);
    ctx.fillRect(-8, -2, 15, 2);

    // 头骨面具盖住南瓜脸
    ctx.fillStyle = '#efe2c8';
    ctx.fillRect(-4, -22, 8, 2);
    ctx.fillRect(-5, -20, 10, 8);
    ctx.fillRect(-4, -12, 8, 2);
    ctx.fillRect(-3, -10, 6, 1);
    ctx.fillStyle = '#171020';
    ctx.fillRect(-4, -19, 3, 3);
    ctx.fillRect(1, -19, 3, 3);
    ctx.fillRect(-1, -16, 2, 2);
    ctx.fillStyle = '#c8b79a';
    ctx.fillRect(-3, -12, 1, 1);
    ctx.fillRect(-1, -12, 1, 1);
    ctx.fillRect(1, -12, 1, 1);
    ctx.fillRect(3, -12, 1, 1);

    // 肋骨和肩骨
    ctx.fillStyle = '#e9ddc6';
    for (let row = 0; row < 4; row += 1) {
      ctx.fillRect(-4, -11 + row * 2 + breathe, 8, 1);
    }
    ctx.fillRect(-1, -11, 2, 7 + breathe);
    ctx.fillRect(-6, -12, 2, 2);
    ctx.fillRect(4, -12, 2, 2);

    this.drawSeatedArms(ctx, eating, bite, '#e9ddc6', '#efe2c8');
  }

  /** 吸血鬼：高竖领、燕尾披风、尖牙，坐着时披风下摆轻轻抖。 */
  drawSeatedVampire(ctx, time, eating, bite) {
    const flutter = Math.round(Math.sin(time * 2.3));

    // 高竖领先画：立起来的领子藏在脑袋后面，只从两侧露出来
    ctx.fillStyle = '#2a0f1a';
    ctx.fillRect(-8, -24, 3, 12);
    ctx.fillRect(5, -24, 3, 12);
    ctx.fillStyle = '#5c1f2e';
    ctx.fillRect(-7, -23, 1, 10);
    ctx.fillRect(6, -23, 1, 10);

    // 燕尾披风：坐下时铺在雪上，燕尾一左一右地摆
    ctx.fillStyle = '#1d0e1a';
    ctx.fillRect(-6, -14, 12, 3);
    ctx.fillRect(-8, -11, 16, 6);
    ctx.fillRect(-10, -5, 20, 3);
    ctx.fillRect(-8, -2, 16, 2);
    ctx.fillRect(-11, -4 + flutter, 2, 3);
    ctx.fillRect(9, -4 - flutter, 2, 3);
    ctx.fillStyle = '#5c1f2e';
    ctx.fillRect(-4, -13, 2, 10);
    ctx.fillRect(3, -12, 1, 9);
    ctx.fillStyle = '#e0b35c';
    ctx.fillRect(-1, -14, 2, 2);

    this.drawSeatedArms(ctx, eating, bite, '#1d0e1a', '#e8ded2');

    // 苍白的脸
    ctx.fillStyle = '#e8ded2';
    ctx.fillRect(-4, -22, 8, 10);
    ctx.fillRect(-3, -12, 6, 1);
    ctx.fillStyle = '#1b1220';
    ctx.fillRect(-5, -26, 10, 3);
    ctx.fillRect(-6, -23, 2, 3);
    ctx.fillRect(4, -23, 2, 3);
    ctx.fillRect(-3, -23, 2, 1);
    ctx.fillRect(1, -23, 2, 1);
    ctx.fillStyle = '#3a2b3d';
    ctx.fillRect(-3, -26, 4, 1);
    // 眼睛和一点红色反光
    ctx.fillStyle = '#2a1020';
    ctx.fillRect(-3, -19, 2, 2);
    ctx.fillRect(1, -19, 2, 2);
    ctx.fillStyle = '#e04a5a';
    ctx.fillRect(-3, -19, 1, 1);
    ctx.fillRect(1, -19, 1, 1);
    // 嘴边的两颗尖牙
    ctx.fillStyle = '#4a1520';
    ctx.fillRect(-2, -15, 4, 1);
    ctx.fillStyle = '#f7f1e7';
    ctx.fillRect(-1, -15, 1, 2);
    ctx.fillRect(1, -15, 1, 2);
  }

  /** 木乃伊：旧绷带从头缠到脚，只留一条看路的缝，松开的布尾在身后晃。 */
  drawSeatedMummy(ctx, time, eating, bite) {
    const sway = Math.round(Math.sin(time * 1.9));

    // 松开的布尾拖在身后的雪上
    ctx.fillStyle = '#d9cba6';
    ctx.fillRect(-10 + sway, -13, 3, 1);
    ctx.fillRect(-11 + sway, -12, 2, 7);
    ctx.fillRect(-10 + sway, -5, 1, 2);
    ctx.fillStyle = '#c6b58d';
    ctx.fillRect(-11 + sway, -9, 1, 2);

    // 从头到脚缠满的旧绷带，坐下时摊开
    ctx.fillStyle = '#d9cba6';
    ctx.fillRect(-5, -25, 10, 12);
    ctx.fillRect(-7, -14, 14, 12);
    ctx.fillRect(-6, -3, 12, 3);

    // 一层层错开的布和底下的阴影
    ctx.fillStyle = '#c6b58d';
    ctx.fillRect(-5, -22, 10, 1);
    ctx.fillRect(-5, -19, 10, 1);
    ctx.fillRect(-7, -13, 14, 1);
    ctx.fillRect(-7, -10, 14, 1);
    ctx.fillRect(-7, -7, 14, 1);
    ctx.fillRect(-6, -3, 12, 1);
    ctx.fillStyle = '#f0e5c6';
    ctx.fillRect(-4, -24, 8, 1);
    ctx.fillRect(-6, -20, 8, 1);
    ctx.fillRect(-3, -16, 9, 1);
    ctx.fillRect(-6, -12, 7, 1);
    ctx.fillRect(-2, -8, 9, 1);
    ctx.fillRect(-6, -4, 8, 1);

    // 只留一条看路的缝
    ctx.fillStyle = '#171020';
    ctx.fillRect(-4, -21, 8, 2);
    ctx.fillStyle = '#ffd678';
    ctx.fillRect(-2, -21, 1, 1);

    this.drawSeatedArms(ctx, eating, bite, '#d9cba6', '#e7dcc0');
  }

  /** 小女巫：长袍、宽檐尖帽，扫帚靠在手边，黑猫布偶蹲在膝头。 */
  drawSeatedWitch(ctx, time, eating, bite) {
    const bob = Math.round(Math.sin(time * 2.6));

    // 长袍：盖住原来的斗篷，坐下时铺在雪上
    ctx.fillStyle = '#22392c';
    ctx.fillRect(-6, -14, 12, 3);
    ctx.fillRect(-8, -11, 16, 7);
    ctx.fillRect(-10, -4, 20, 3);
    ctx.fillStyle = '#33523d';
    ctx.fillRect(-4, -13, 2, 9);
    ctx.fillRect(3, -12, 1, 8);
    ctx.fillStyle = '#16261c';
    ctx.fillRect(-10, -2, 20, 1);

    // 旧扫帚靠在手边
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(-13, -24, 2, 22);
    ctx.fillStyle = '#c9a35b';
    ctx.fillRect(-15, -28, 7, 3);
    ctx.fillRect(-14, -30, 5, 2);
    ctx.fillStyle = '#8a6a35';
    ctx.fillRect(-15, -26, 7, 1);

    // 抱在臂弯里的黑猫布偶：坐着时蜷在膝头，耳朵刚好不碰南瓜下巴
    ctx.fillStyle = '#141018';
    ctx.fillRect(-6, -5 + bob, 6, 3);
    ctx.fillRect(-3, -8 + bob, 4, 4);
    ctx.fillRect(-3, -10 + bob, 1, 2);
    ctx.fillRect(0, -10 + bob, 1, 2);
    // 一点冷的反光，黑猫才不会在深色长袍上糊成一团
    ctx.fillStyle = '#3a3048';
    ctx.fillRect(-3, -8 + bob, 3, 1);
    ctx.fillRect(-6, -5 + bob, 2, 1);
    ctx.fillStyle = '#ffd678';
    ctx.fillRect(-2, -6 + bob, 1, 1);
    ctx.fillRect(0, -6 + bob, 1, 1);
    ctx.fillStyle = '#141018';
    ctx.fillRect(1, -3 + bob, 2, 1);

    this.drawSeatedArms(ctx, eating, bite, '#33523d', '#e2b98f');
    this.drawSeatedPumpkinHead(ctx);

    // 宽檐尖帽：帽檐比原来宽一圈
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(-9, -24, 18, 2);
    ctx.fillRect(-6, -26, 12, 2);
    ctx.fillRect(-5, -28, 10, 2);
    ctx.fillRect(-4, -30, 8, 2);
    ctx.fillRect(-3, -32, 6, 2);
    ctx.fillRect(-1, -33, 3, 1);
    ctx.fillStyle = '#31243f';
    ctx.fillRect(-9, -24, 18, 1);
    ctx.fillStyle = '#d79b3f';
    ctx.fillRect(-6, -26, 12, 1);
    ctx.fillStyle = '#f0c060';
    ctx.fillRect(-1, -26, 2, 1);
    ctx.fillStyle = '#8bbf9a';
    ctx.fillRect(-2, -30, 1, 1);
  }


  /**
   * 碑旁的派盘：坐下以后才从画面下方端上来，落在雪上。
   * 之后按时间轴一块块切开——始终是第三人称看到的那一只盘子。
   */
  drawSitPie(ctx, time) {
    const appear = smooth((this.time - TIMELINE.pieSet) / 0.9);
    if (appear <= 0.001) return;

    const x = SIT_X + 38;
    const y = Math.round(lerp(GROUND + 10, GROUND, appear));
    const cuts =
      this.time < TIMELINE.cutStart
        ? 0
        : Math.max(1, Math.min(4, Math.floor((this.time - TIMELINE.cutStart) / 0.9) + 1));

    // 盘边一小圈暖光，把视线收在那里。
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const warmth = 0.06 + Math.sin(time * 2.2) * 0.015;
    const glow = ctx.createRadialGradient(x, y - 6, 2, x, y - 6, 36);
    glow.addColorStop(0, `rgba(255, 170, 80, ${warmth})`);
    glow.addColorStop(1, 'rgba(255, 140, 60, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 36, y - 42, 72, 46);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = appear;
    this.drawPieTin(ctx, x, y, time, 1.3, cuts);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // 共用的画法
  // ---------------------------------------------------------------------------

  drawSky(ctx, moonX, moonY, moonR) {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#04060d');
    sky.addColorStop(0.55, '#0a1020');
    sky.addColorStop(1, '#161e31');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // 月亮的光晕
    const halo = ctx.createRadialGradient(moonX, moonY, 2, moonX, moonY, moonR * 5.5);
    halo.addColorStop(0, 'rgba(196, 212, 240, 0.18)');
    halo.addColorStop(0.45, 'rgba(170, 190, 226, 0.06)');
    halo.addColorStop(1, 'rgba(150, 175, 215, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(moonX - moonR * 5.5, moonY - moonR * 5.5, moonR * 11, moonR * 11);

    // 月亮本身：用一圈圈横条拼成一个像素圆，不加圆弧，保持像素画的手感。
    ctx.fillStyle = '#d6dfef';
    for (let y = -moonR; y <= moonR; y += 1) {
      const half = Math.round(Math.sqrt(Math.max(0, moonR * moonR - y * y)));
      if (half > 0) ctx.fillRect(moonX - half, moonY + y, half * 2, 1);
    }
    ctx.fillStyle = '#b9c5db';
    // 几处淡淡的月海，不用连成一道，免得月亮看起来像被劈开。
    ctx.fillRect(moonX - 10, moonY - 8, 5, 3);
    ctx.fillRect(moonX - 7, moonY - 5, 3, 2);
    ctx.fillRect(moonX + 5, moonY + 1, 4, 4);
    ctx.fillRect(moonX + 2, moonY + 7, 3, 2);
    ctx.fillRect(moonX - 6, moonY + 9, 6, 2);
    ctx.fillRect(moonX + 9, moonY - 6, 3, 2);

    // 零星的星，落雪的天里不亮，只是给夜空一点层次。
    ctx.fillStyle = '#c9d4ea';
    for (const [x, y, alpha] of [
      [158, 34, 0.26],
      [226, 72, 0.2],
      [46, 96, 0.18],
      [374, 40, 0.22],
      [442, 96, 0.16],
      [318, 26, 0.18],
    ]) {
      ctx.globalAlpha = alpha;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;

    // 很低的一条远山
    ctx.fillStyle = '#0a0f1a';
    ctx.fillRect(0, 190, W, 24);
    for (const [x, w, h] of [
      [20, 90, 10],
      [110, 76, 14],
      [186, 60, 8],
      [260, 110, 12],
      [360, 84, 16],
      [448, 70, 9],
    ]) {
      ctx.fillRect(x, 190 - h, w, h);
    }
  }

  drawGround(ctx, groundY) {
    const ground = ctx.createLinearGradient(0, groundY - 4, 0, H);
    ground.addColorStop(0, '#3a4259');
    ground.addColorStop(0.45, '#232a3c');
    ground.addColorStop(1, '#12151f');
    ctx.fillStyle = ground;
    ctx.fillRect(0, groundY - 4, W, H - groundY + 4);

    // 雪面：一条亮边，几道浅浅的雪堆
    ctx.fillStyle = '#7c88a8';
    ctx.fillRect(0, groundY - 3, W, 1);
    ctx.fillStyle = '#525d7c';
    ctx.fillRect(0, groundY - 2, W, 2);
    ctx.fillStyle = '#3e4762';
    for (const [x, w, h] of [
      [24, 62, 3],
      [104, 40, 2],
      [176, 72, 3],
      [268, 48, 2],
      [352, 66, 3],
      [436, 50, 2],
    ]) {
      ctx.fillRect(x, groundY - h, w, h);
    }
    // 雪面远处的起伏：一条更淡的曲线，让地不至于是一块黑板
    ctx.fillStyle = '#465070';
    for (const [x, w] of [
      [60, 26],
      [148, 34],
      [240, 22],
      [330, 38],
      [420, 30],
      [488, 18],
    ]) {
      ctx.fillRect(x, groundY + 8, w, 1);
    }

    // 雪粒的几点反光
    ctx.fillStyle = '#aebada';
    ctx.globalAlpha = 0.5;
    for (let index = 0; index < 40; index += 1) {
      const x = (index * 97 + 31) % W;
      const y = groundY + 5 + ((index * 53) % 56);
      ctx.fillRect(x, y, index % 7 === 0 ? 2 : 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  drawTree(ctx, x, baseY, flip) {
    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(flip, 1);
    ctx.fillStyle = '#070910';
    // 树干，往上收窄
    ctx.fillRect(-2, -50, 4, 50);
    ctx.fillRect(-1, -62, 2, 14);
    // 左边的枝：沿对角线一格一格伸出去
    ctx.fillRect(-4, -44, 4, 2);
    ctx.fillRect(-7, -48, 4, 2);
    ctx.fillRect(-10, -52, 4, 2);
    ctx.fillRect(-14, -55, 5, 2);
    ctx.fillRect(-17, -60, 4, 2);
    ctx.fillRect(-19, -66, 2, 7);
    ctx.fillRect(-14, -58, 2, 4);
    ctx.fillRect(-11, -54, 2, 5);
    // 右边的枝
    ctx.fillRect(1, -38, 4, 2);
    ctx.fillRect(4, -42, 4, 2);
    ctx.fillRect(7, -46, 4, 2);
    ctx.fillRect(10, -49, 5, 2);
    ctx.fillRect(13, -54, 4, 2);
    ctx.fillRect(14, -61, 2, 8);
    ctx.fillRect(9, -51, 2, 5);
    // 顶上的枝杈
    ctx.fillRect(-1, -68, 2, 7);
    ctx.fillRect(-4, -71, 4, 2);
    ctx.fillRect(1, -73, 2, 3);
    // 枝上的雪
    ctx.fillStyle = '#5d6889';
    ctx.fillRect(-17, -61, 4, 1);
    ctx.fillRect(-14, -56, 5, 1);
    ctx.fillRect(10, -50, 5, 1);
    ctx.fillRect(13, -55, 4, 1);
    ctx.fillRect(-4, -72, 4, 1);
    ctx.restore();
  }

  drawTomb(ctx, cx, baseY, w, h, { small = false } = {}) {
    const left = Math.round(cx - w / 2);
    const top = Math.round(baseY - h);

    // 基座
    ctx.fillStyle = '#121722';
    ctx.fillRect(left - 4, baseY - 5, w + 8, 5);
    ctx.fillStyle = '#3b455f';
    ctx.fillRect(left - 4, baseY - 5, w + 8, 1);

    // 方方正正的碑身
    ctx.fillStyle = '#1b2130';
    ctx.fillRect(left, top, w, h - 4);
    ctx.fillStyle = '#343c55';
    ctx.fillRect(left + 2, top + 2, w - 4, h - 8);

    // 顶上的雪
    ctx.fillStyle = '#8d9abb';
    ctx.fillRect(left, top - 1, w, 2);
    ctx.fillStyle = '#c4cfe6';
    ctx.fillRect(left + 2, top - 1, w - 5, 1);

    // 内框
    ctx.fillStyle = '#242c40';
    ctx.fillRect(left + 5, top + 6, w - 10, h - 16);
    ctx.fillStyle = '#4c5675';
    ctx.fillRect(left + 5, top + 6, w - 10, 1);
    ctx.fillRect(left + 5, top + 6, 1, h - 16);
    ctx.fillStyle = '#141a26';
    ctx.fillRect(left + 5, top + h - 11, w - 10, 1);
    ctx.fillRect(left + w - 6, top + 6, 1, h - 16);

    // 刻进去的十字
    const bar = small ? 2 : 3;
    const arm = small ? 4 : 7;
    const crossTop = top + (small ? 10 : 15);
    const crossHeight = small ? 12 : 22;
    const crossArmY = top + (small ? 14 : 22);
    const center = Math.round(cx - bar / 2);
    ctx.fillStyle = '#101521';
    ctx.fillRect(center, crossTop, bar, crossHeight);
    ctx.fillRect(Math.round(cx - arm), crossArmY, arm * 2 + bar, bar);
    // 刻痕的左上边留一点高光，十字才不像贴上去的
    ctx.fillStyle = '#525d7d';
    ctx.fillRect(center, crossTop, 1, crossHeight);
    ctx.fillRect(Math.round(cx - arm), crossArmY, arm * 2 + bar, 1);
    // 横臂上的薄雪
    ctx.fillStyle = '#8d9abb';
    ctx.fillRect(Math.round(cx - arm), crossArmY - 1, arm * 2 + bar, 1);

    // 大碑下面两行浅浅的刻字
    if (!small) {
      ctx.fillStyle = '#2b3347';
      ctx.fillRect(left + 11, top + 50, w - 22, 1);
      ctx.fillRect(left + 14, top + 54, w - 28, 1);
      ctx.fillRect(left + 17, top + 58, w - 34, 1);
    }

    // 碑脚堆起来的一点雪
    ctx.fillStyle = '#7f8cab';
    ctx.fillRect(left - 3, baseY - 2, 8, 2);
    ctx.fillRect(left + w - 6, baseY - 2, 9, 2);
  }

  /** 派盘。`scale` 只放大盘子本身，切痕仍按像素对齐。 */
  drawPieTin(ctx, x, y, time, scale = 1.4, cuts = 0) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);

    // 盘底与边缘
    ctx.fillStyle = '#22202a';
    ctx.fillRect(-10, -3, 20, 4);
    ctx.fillStyle = '#3d3844';
    ctx.fillRect(-10, -3, 20, 1);
    ctx.fillStyle = '#857a77';
    ctx.fillRect(-10, -3, 1, 2);

    // 派皮外沿：矮矮一圈，馅料在中间
    ctx.fillStyle = '#a3662d';
    ctx.fillRect(-10, -6, 20, 3);
    ctx.fillStyle = '#c9873c';
    ctx.fillRect(-10, -6, 20, 1);
    ctx.fillStyle = '#c9772e';
    ctx.fillRect(-8, -6, 16, 2);
    ctx.fillStyle = '#8f4f22';
    ctx.fillRect(-5, -6, 2, 1);
    ctx.fillRect(2, -5, 3, 1);
    ctx.fillRect(-8, -5, 2, 1);
    // 顶上烤出来的一圈小褶
    ctx.fillStyle = '#e0a24c';
    ctx.fillRect(-9, -7, 18, 1);
    ctx.fillStyle = '#f0c979';
    ctx.fillRect(-7, -8, 5, 1);
    ctx.fillRect(-1, -8, 4, 1);
    ctx.fillRect(5, -8, 3, 1);

    // 切痕：从上往下切出四个小块
    if (cuts > 0) {
      ctx.fillStyle = '#7a3f1b';
      for (let index = 0; index < cuts; index += 1) {
        const cutX = -6 + index * 4;
        ctx.fillRect(cutX, -8, 1, 4);
      }
      // 第一刀先从中间分开
      if (cuts >= 2) ctx.fillRect(0, -8, 1, 4);
    }

    // 热气：两点很淡的白，慢慢往上飘
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#f6e6c4';
    for (let index = 0; index < 2; index += 1) {
      const rise = (time * 3.2 + index * 9) % 12;
      ctx.fillRect(
        -3 + index * 6 + Math.round(Math.sin(time * 1.4 + index) * 1.5),
        -9 - rise,
        1,
        1,
      );
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** 一双蹦跳的鞋：两只能看清的鞋、一点记忆色和一小片影子。 */
  drawHoppingPair(
    ctx,
    x,
    y,
    accent,
    hop,
    scale = 1,
    alpha = 0.9,
    index = 0,
    time = 0,
    facing = 1,
    style = 'oxford',
  ) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);

    ctx.globalAlpha = 0.18 * alpha;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(-10, 0, 20, 2);
    // 鞋底一圈很淡的记忆色，四双鞋在雪地上不至于只剩黑点。
    ctx.globalAlpha = 0.16 * alpha;
    ctx.fillStyle = accent;
    ctx.fillRect(-9, 1, 18, 1);
    ctx.globalAlpha = 1;

    // 两只鞋错开蹦：先落一只、再落另一只，才像一双鞋在跳。
    const phase = time * 6.6 + index * 1.3;
    const liftLeft = Math.round(Math.abs(Math.sin(phase)) * hop);
    const liftRight = Math.round(Math.abs(Math.sin(phase + 1.9)) * hop);
    paintShoe(ctx, -8, -liftLeft, facing, accent, alpha, 8, style);
    paintShoe(ctx, 1, -liftRight, facing, accent, alpha, 8, style);

    // 一点点往上飘的记忆色
    ctx.globalAlpha = 0.24 * alpha;
    ctx.fillStyle = accent;
    ctx.fillRect(
      Math.round(Math.sin(time * 2.2 + index * 1.3)),
      -Math.max(liftLeft, liftRight) - shoeHeight(style) - 1,
      1,
      1,
    );
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** 坐在碑前时，四双鞋围着墓碑和分派的自己绕圈。 */
  drawOrbitShoes(ctx, time, back) {
    const sitT = this.time - TIMELINE.walkEnd;
    const blend = smooth(sitT / 1.6);
    this.accents.forEach((accent, index) => {
      const angle = index * (Math.PI / 2) + time * 0.3 - Math.PI * 0.42;
      const isBack = Math.sin(angle) < 0;
      if (blend > 0.55 && isBack !== back) return;
      const orbitX = GRAVE_X + Math.cos(angle) * 72;
      const orbitY = GROUND + Math.sin(angle) * 14;
      const trailX = SIT_X - 28 - index * 27;
      const trailY = GROUND;
      const x = lerp(trailX, orbitX, blend);
      const y = lerp(trailY, orbitY, blend);
      const facing = -Math.sin(angle) >= 0 ? 1 : -1;
      this.drawHoppingPair(
        ctx,
        x,
        y,
        accent,
        4.5,
        blend > 0.55 ? (isBack ? 1.25 : 1.45) : 1.4,
        blend > 0.55 && isBack ? 0.72 : 0.92,
        index,
        time,
        facing,
        this.shoeStyles[index],
      );
    });
  }

  drawSnow(ctx) {
    if (this.snowAlpha <= 0) return;
    ctx.save();
    for (const flake of this.snow) {
      const twinkle = 0.75 + Math.sin(flake.phase + this.time * 1.6) * 0.25;
      ctx.globalAlpha = flake.alpha * this.snowAlpha * twinkle;
      ctx.fillStyle = flake.size === 1 ? '#dfe7f5' : '#ffffff';
      ctx.fillRect(Math.round(flake.x), Math.round(flake.y), flake.size, flake.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
