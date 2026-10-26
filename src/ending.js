/**
 * 「给老师送南瓜派」的最后一幕：走进最后一道门之后。
 *
 * 这一幕不交给关卡去走，而是单独在画布上放一遍：
 *   1. 先黑屏；
 *   2. 黑屏里开始落雪；
 *   3. 墓园淡入，主角从左边走到中间的大墓碑前，四双皮鞋跟在身后蹦蹦跳跳；
 *   4. 主角在碑前坐下，和皮鞋分南瓜派；
 *   5. 走到碑前时切黑一秒，再换成主角的第一人称：看着自己把南瓜派放在碑旁、
 *      用刀叉切成小块，皮鞋围着墓碑和吃派的自己跳。
 *
 * 时间轴全部按秒记，渲染只读 `this.time`。跳到结尾（skip）也只是把时间拨到
 * 收黑前，不会破坏画面上的前后关系。
 */

import { VIEW } from './config.js';
import { MEMORIAL_CHAPTERS } from './memorial.js';
import { paintShoe } from './shoeFollowers.js';

const W = VIEW.WIDTH;
const H = VIEW.HEIGHT;

// 第三人称墓园的落地点与墓碑位置。
const GROUND = 224;
const GRAVE_X = 306;
const SIT_X = 272;

// 第一人称：墓碑更近，视线从坐着的膝盖上方望过去。
const POV_GROUND = 244;
const POV_GRAVE_X = 318;
const POV_TIN_X = 270;
const POV_TIN_Y = POV_GROUND + 2;

const TIMELINE = Object.freeze({
  snowStart: 0.5,
  walkStart: 3.6,
  sceneIn: 1.5,
  walkEnd: 9.4,
  cutEnd: 14.0,
  // 碑前切黑一整秒，之后才是主角的第一人称。
  povStart: 15.0,
  povEnd: 24.6,
  end: 26.0,
  skipAfter: 5.2,
});

// 跳过时时间会直接跳到收黑前，中间那些刀叉声不能一口气全响。
const ALL_CUES = ['set-down', 'cut-0', 'cut-1', 'cut-2', 'cut-3', 'bite'];

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

/**
 * 画布上的字先在透明小画布上排好，再整块贴上去。
 * 直接在游戏画布上 fillText，缩放后边缘会带彩色亚像素，和像素画不搭。
 */
function makeTextSprite(text, fontSize, color, shadow = null) {
  const font = `${fontSize}px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`;
  const measurer = document.createElement('canvas').getContext('2d');
  measurer.font = font;
  const width = Math.ceil(measurer.measureText(text).width) + 6;
  const height = fontSize + 8;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.fillText(text, width / 2 + 1, height / 2 + 1);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, width / 2, height / 2);
  return canvas;
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

    // 四双鞋的记忆色。正常流程里 completeRun 之前已经排好四双，
    // 这里再兜一层，方便单独预览这一幕。
    const pairs = game.shoeFollowers?.pairs ?? [];
    this.accents = pairs.length
      ? pairs.map((pair) => pair.accent)
      : MEMORIAL_CHAPTERS.map((chapter) => chapter.accent);

    // 字先排成小画布，缩放时不会出现彩色描边。
    this.captionLabel = makeTextSprite(
      '老师，南瓜派还是热的。',
      13,
      'rgb(240, 233, 217)',
      'rgba(8, 10, 18, 0.85)',
    );
    this.skipLabel = makeTextSprite('按 E 或轻触跳过', 10, 'rgb(205, 213, 230)');
  }

  get canSkip() {
    return this.time >= TIMELINE.skipAfter && !this.finished;
  }

  /** 跳过直接拨到收黑前一秒，让最后一帧还有一段淡出。 */
  skip() {
    if (!this.canSkip) return false;
    for (const key of ALL_CUES) this.cues.add(key);
    this.time = Math.max(this.time, TIMELINE.end - 1);
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

    if (time >= TIMELINE.end) this.finished = true;
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

    cue('set-down', TIMELINE.povStart + 2.4, () =>
      audio.tone({ startFreq: 523, endFreq: 392, duration: 0.5, type: 'sine', volume: 0.04 }),
    );
    [4.4, 5.2, 6.0, 6.8].forEach((at, index) =>
      cue(`cut-${index}`, TIMELINE.povStart + at, () =>
        audio.tone({
          startFreq: 880,
          endFreq: 660,
          duration: 0.07,
          type: 'triangle',
          volume: 0.022,
        }),
      ),
    );
    cue('bite', TIMELINE.povStart + 7.4, () =>
      audio.tone({ startFreq: 300, endFreq: 210, duration: 0.18, type: 'sine', volume: 0.035 }),
    );
  }

  /** 黑幕浓度：开场全黑，场景淡入；碑前切黑一秒；最后收黑。 */
  blackAlpha(time) {
    if (time < TIMELINE.walkStart) return 1;
    if (time < TIMELINE.walkStart + TIMELINE.sceneIn) {
      return 1 - clamp01((time - TIMELINE.walkStart) / TIMELINE.sceneIn);
    }
    if (time < TIMELINE.cutEnd) return 0;
    // 切黑之后先整整黑一秒，再让主视角淡进来。
    if (time < TIMELINE.povStart) return 1;
    if (time < TIMELINE.povStart + 0.5) {
      return 1 - clamp01((time - TIMELINE.povStart) / 0.5);
    }
    if (time < TIMELINE.povEnd) return 0;
    return clamp01((time - TIMELINE.povEnd) / (TIMELINE.end - TIMELINE.povEnd));
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

    if (t >= TIMELINE.walkStart && t < TIMELINE.cutEnd) {
      // 场景本身还是全不透明，亮度交给后面那层黑幕。
      this.drawGraveyard(ctx, time);
    } else if (t >= TIMELINE.povStart) {
      this.drawPov(ctx, t - TIMELINE.povStart, time);
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

    if (this.canSkip && t < TIMELINE.end - 0.8) {
      this.drawSkipHint(ctx, t);
    }

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // 第三人称：墓园、走路、坐下
  // ---------------------------------------------------------------------------

  drawGraveyard(ctx, time) {
    const t = this.time;
    this.drawSky(ctx, 96, 56, 20);
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
      this.drawHoppingPair(ctx, shoeX, GROUND, accent, 4, 1.5, index === 0 ? 0.95 : 0.85, index, time);
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

  drawSeated(ctx, time, sitT) {
    const settle = smooth(sitT / 0.6);
    const eat = (Math.sin(time * 2.2) + 1) / 2;

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

    // 左手撑在雪地上，靠向派盘
    ctx.fillStyle = '#2a173b';
    ctx.fillRect(-9, -8, 4, 2);
    ctx.fillStyle = '#e2b98f';
    ctx.fillRect(-11, -7, 3, 2);

    // 举着派块的右手：跟着咀嚼的节奏在嘴边和膝上之间来回
    const handX = 4;
    const handY = -12 + Math.round(eat * 4);
    ctx.fillStyle = '#2a173b';
    const sleeveTop = Math.min(-10, handY + 2);
    ctx.fillRect(3, sleeveTop, 2, Math.max(1, Math.abs(handY + 12)));
    ctx.fillStyle = '#e2b98f';
    ctx.fillRect(handX, handY, 3, 2);
    // 手里的小块南瓜派
    ctx.fillStyle = '#d9a441';
    ctx.fillRect(handX, handY - 1, 3, 1);
    ctx.fillStyle = '#f0c979';
    ctx.fillRect(handX, handY - 2, 2, 1);

    // 南瓜头
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

    this.drawPieTin(ctx, SIT_X + 36, GROUND, time, 1.1);
  }

  // ---------------------------------------------------------------------------
  // 第一人称：碑旁的派盘、刀叉、围着跳的鞋
  // ---------------------------------------------------------------------------

  drawPov(ctx, povT, time) {
    this.drawSky(ctx, 96, 52, 22);
    this.drawGround(ctx, POV_GROUND);
    this.drawTree(ctx, 24, POV_GROUND, 1);
    this.drawTree(ctx, W - 26, POV_GROUND, -1);

    this.drawPovShoes(ctx, time, true);

    for (const [dx, w, h] of [
      [-72, 20, 34],
      [-45, 18, 30],
      [45, 18, 30],
      [72, 20, 34],
    ]) {
      this.drawTomb(ctx, POV_GRAVE_X + dx, POV_GROUND - 12, w, h, { small: true });
    }

    this.drawTomb(ctx, POV_GRAVE_X, POV_GROUND, 64, 104, {});

    this.drawPovShoes(ctx, time, false);

    // 派盘：先跟着手从画面下方端上来，再稳稳落在碑旁。
    const carry = smooth((povT - 0.9) / 1.6);
    const tinX = Math.round(lerp(256, POV_TIN_X, carry));
    const tinY = Math.round(lerp(H + 34, POV_TIN_Y, carry));
    const cuts = Math.max(0, Math.min(4, Math.ceil((povT - 4.2) / 0.8)));
    // 派落在雪上之后，盘边留一小圈暖光，把视线收在那里。
    if (povT > 1.6) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const warmth = 0.08 + Math.sin(time * 2.2) * 0.02;
      const glow = ctx.createRadialGradient(tinX, tinY - 6, 2, tinX, tinY - 6, 40);
      glow.addColorStop(0, `rgba(255, 170, 80, ${warmth})`);
      glow.addColorStop(1, 'rgba(255, 140, 60, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(tinX - 40, tinY - 48, 80, 52);
      ctx.restore();
    }
    this.drawPieTin(ctx, tinX, tinY, time, 2, cuts);

    this.drawCaption(ctx, povT);
    this.drawLap(ctx, time);
    this.drawPovHands(ctx, povT, time, tinX, tinY);
    this.drawNearShoes(ctx, time);
  }

  /** 主视角里绕着墓碑跳的鞋；前排更近、更大。 */
  drawPovShoes(ctx, time, back) {
    this.accents.forEach((accent, index) => {
      const angle = index * (Math.PI / 2) + time * 0.27 - Math.PI * 0.4;
      const isBack = Math.sin(angle) < 0;
      if (isBack !== back) return;
      const x = POV_GRAVE_X + Math.cos(angle) * 88;
      const y = POV_GROUND + Math.sin(angle) * 22;
      const facing = -Math.sin(angle) >= 0 ? 1 : -1;
      this.drawHoppingPair(
        ctx,
        x,
        y,
        accent,
        5,
        back ? 1.5 : 1.9,
        back ? 0.72 : 0.95,
        index,
        time,
        facing,
      );
    });
  }

  /** 镜头最近处的两双鞋：说明“围着吃派的主角”也包括自己脚边。 */
  drawNearShoes(ctx, time) {
    const positions = [
      [70, H - 16, 0, 2.2],
      [W - 74, H - 12, 2, 2],
    ];
    for (const [x, y, index, scale] of positions) {
      this.drawHoppingPair(
        ctx,
        x,
        y,
        this.accents[index] ?? this.accents[0],
        6,
        scale,
        0.8,
        index,
        time,
        index === 0 ? 1 : -1,
      );
    }
  }

  /** 第一人称的双手：端盘、拿刀叉切块、把第一块送到嘴边。 */
  drawPovHands(ctx, povT, time, tinX, tinY) {
    const carry = smooth((povT - 0.9) / 1.6);
    const cutting = clamp01((povT - 3.4) / 0.4) * (1 - clamp01((povT - 7.2) / 0.4));
    const lift = smooth((povT - 6.8) / 1.2) * (1 - smooth((povT - 8.6) / 0.6));
    const chew = Math.sin(time * 2.2) * 1.5;

    // 还没伸手时，两只手搭在自己的膝盖上。
    if (povT < 0.9 || povT > 9) {
      this.drawHand(ctx, 232, 268, -1);
      this.drawHand(ctx, 292, 268, 1);
    }

    // 端着派盘的两只手；放下之后顺着画面下沿收回去。
    if (carry > 0 && povT < 3.3) {
      const release = smooth((povT - 2.5) / 0.8);
      ctx.globalAlpha = 1 - release * 0.65;
      this.drawHand(ctx, tinX - 13, tinY + 4 + release * 26, -1);
      this.drawHand(ctx, tinX + 13, tinY + 4 + release * 26, 1);
      ctx.globalAlpha = 1;
      return;
    }

    // 落在雪地上以后，两只手从画面下方拿刀叉。
    const restY = H + 2;
    const handY = Math.round(lerp(restY, tinY - 4, cutting));
    const forkX = Math.round(lerp(tinX - 26, tinX - 17, cutting));
    const knifeX = Math.round(lerp(tinX + 28, tinX + 17, cutting));
    const knifeShift = Math.round(Math.sin((povT - 3.4) * 7.4) * 2 * cutting);

    this.drawHand(ctx, forkX, handY, -1);
    this.drawHand(ctx, knifeX + knifeShift, handY, 1);

    // 刀和叉：画得比雪地里的鞋粗一点，主视角里才看得清在切。
    if (cutting > 0.2) {
      ctx.globalAlpha = 0.95;
      // 叉子：柄 + 三根齿
      ctx.fillStyle = '#c9cfdd';
      ctx.fillRect(forkX, handY - 12, 2, 10);
      ctx.fillRect(forkX - 2, handY - 15, 7, 3);
      ctx.fillStyle = '#8c94a8';
      ctx.fillRect(forkX - 2, handY - 13, 7, 1);
      ctx.fillStyle = '#eef2fa';
      ctx.fillRect(forkX - 1, handY - 16, 1, 2);
      ctx.fillRect(forkX + 1, handY - 16, 1, 2);
      ctx.fillRect(forkX + 3, handY - 16, 1, 2);
      // 刀：柄 + 一片薄刃
      ctx.fillStyle = '#8a6045';
      ctx.fillRect(knifeX + knifeShift, handY - 9, 3, 8);
      ctx.fillStyle = '#dfe5f2';
      ctx.fillRect(knifeX + knifeShift - 9, handY - 14, 11, 3);
      ctx.fillStyle = '#aab3c9';
      ctx.fillRect(knifeX + knifeShift - 9, handY - 11, 11, 1);
      ctx.fillStyle = '#f2f5fb';
      ctx.fillRect(knifeX + knifeShift - 9, handY - 14, 11, 1);
      ctx.globalAlpha = 1;
    }

    // 第一块切好，右手把它举到嘴边；看不见嘴，只让手和派块一起沉到画面下沿。
    if (lift > 0.01) {
      const pieceX = Math.round(lerp(knifeX + knifeShift, 266, lift));
      const pieceY = Math.round(lerp(tinY - 6, H + 6, lift));
      ctx.save();
      ctx.globalAlpha = Math.min(1, lift * 1.5);
      this.drawHand(ctx, pieceX, pieceY + chew, 1);
      ctx.fillStyle = '#f0c979';
      ctx.fillRect(pieceX - 2, pieceY - 3 + chew, 5, 2);
      ctx.fillStyle = '#c9873c';
      ctx.fillRect(pieceX - 1, pieceY - 1 + chew, 3, 1);
      // 一点点碎屑
      ctx.fillStyle = '#e8c98b';
      ctx.fillRect(pieceX + 3, pieceY + 1 + chew, 1, 1);
      ctx.restore();
    }
  }

  drawHand(ctx, x, y, flip) {
    // 袖口
    ctx.fillStyle = '#2a173b';
    ctx.fillRect(x - 4, y + 2, 8, 7);
    ctx.fillStyle = '#42275b';
    ctx.fillRect(flip > 0 ? x - 4 : x + 1, y + 2, 2, 6);
    // 手
    ctx.fillStyle = '#e2b98f';
    ctx.fillRect(x - 3, y - 3, 7, 6);
    ctx.fillStyle = '#f0cba4';
    ctx.fillRect(x - 3, y - 3, 5, 1);
    ctx.fillStyle = '#c79a72';
    ctx.fillRect(flip > 0 ? x + 3 : x - 4, y - 1, 2, 3);
  }

  /** 画面底部自己的膝盖和鞋尖：提醒这是坐着的第一人称。 */
  drawLap(ctx, time) {
    const breathe = Math.round(Math.sin(time * 1.6) * 1);
    ctx.save();
    ctx.translate(0, breathe);

    // 盘着的腿：两个膝盖顶在画面下沿，斗篷从膝上盖下来。
    ctx.fillStyle = '#241535';
    ctx.fillRect(198, 264, 48, 14);
    ctx.fillRect(266, 264, 48, 14);
    ctx.fillRect(188, 276, 70, 12);
    ctx.fillRect(254, 276, 70, 12);
    ctx.fillRect(176, 283, 160, 5);
    // 两膝之间的一道暗缝
    ctx.fillStyle = '#120a18';
    ctx.fillRect(246, 264, 4, 14);
    // 膝头的高光和布料折线
    ctx.fillStyle = '#38234f';
    ctx.fillRect(202, 266, 26, 2);
    ctx.fillRect(270, 266, 26, 2);
    ctx.fillRect(196, 278, 38, 2);
    ctx.fillRect(282, 278, 38, 2);
    ctx.fillStyle = '#1b0f28';
    ctx.fillRect(236, 280, 2, 8);
    ctx.fillRect(292, 280, 2, 8);
    // 两只鞋尖从斗篷下面露出来
    ctx.fillStyle = '#2e1a16';
    ctx.fillRect(232, 281, 20, 6);
    ctx.fillRect(292, 281, 20, 6);
    ctx.fillStyle = '#8a6045';
    ctx.fillRect(248, 282, 3, 1);
    ctx.fillRect(292, 282, 3, 1);
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

  /** 一双蹦跳的皮鞋：两只能看清的鞋、一点记忆色和一小片影子。 */
  drawHoppingPair(ctx, x, y, accent, hop, scale = 1, alpha = 0.9, index = 0, time = 0, facing = 1) {
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
    paintShoe(ctx, -8, -liftLeft, facing, accent, alpha, 8);
    paintShoe(ctx, 1, -liftRight, facing, accent, alpha, 8);

    // 一点点往上飘的记忆色
    ctx.globalAlpha = 0.24 * alpha;
    ctx.fillStyle = accent;
    ctx.fillRect(
      Math.round(Math.sin(time * 2.2 + index * 1.3)),
      -Math.max(liftLeft, liftRight) - 7,
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
      );
    });
  }

  drawCaption(ctx, povT) {
    const alpha = clamp01((povT - 3) / 0.6) * (1 - clamp01((povT - 7.6) / 0.8));
    if (alpha <= 0) return;
    const label = this.captionLabel;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      label,
      Math.round(W / 2 - label.width / 2),
      Math.round(120 - label.height / 2),
    );
    ctx.restore();
  }

  drawSkipHint(ctx, time) {
    const alpha = 0.32 + Math.sin(time * 2.4) * 0.1;
    const label = this.skipLabel;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(label, W - 8 - label.width, 8);
    ctx.restore();
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
