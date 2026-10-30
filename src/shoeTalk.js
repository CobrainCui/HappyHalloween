/**
 * 与皮鞋对话。
 *
 * 读完鞋那封信之后，可以在信纸底部把它叫出来说几句。这一幕不接管游戏状态：
 * 一个独立的全屏浮层，画布上主角和鞋面对面站着，只有鞋在动——它说话时一直跳，
 * 主角站着不动，等它问完第四个问题，才愣一下，冒出一句「我去，皮鞋会说话！」。
 *
 * 主角直接用 Player.drawPilgrim 画，时装（costume）跟着当前这一局，
 * 换了衣服再来，画面上也是换了衣服的人。
 *
 * 气泡是一个一个来的：上一条收回去之后才轮到下一条，中间留一小段空。
 * 最后一句停一会儿，这一幕就自己收起来（onFinish），不用玩家再点一次「收起」。
 */

import { Player } from './player.js';
import { paintShoe } from './shoeFollowers.js';

const SCENE_W = 720;
const SCENE_H = 360;
const GROUND = 300;
const PLAYER_X = 252;
const SHOE_X = 486;

/** 鞋问的四句，顺序不能乱。 */
export const SHOE_QUESTIONS = Object.freeze([
  '我们在另一个世界里还会是鞋和人吗？',
  '你觉得生命的意义是什么？',
  '你觉得学习的定义是什么？',
  '我能像老师一样伟大吗？',
]);

/** 主角愣完之后的那一句。 */
export const PLAYER_LINE = '我去，皮鞋会说话！';

/**
 * 「皮鞋学习论」：背包里的鞋、字幕下面的按钮、对话里的说明卡都读这一份，
 * 只在这里写一遍。
 */
export const SHOE_THEORY = Object.freeze({
  title: '皮鞋学习论',
  body:
    '学习指经由反复经验带来行为或潜能持久的变化。新皮鞋刚被穿戴时生硬磨脚，在一次次行走磨合中，皮革慢慢舒展，贴合脚掌骨骼，变得舒服合脚。依照定义，有的同学认为皮鞋学习了。游戏里这双鞋甚至在漫长同行之中习得了共情，主人因磨脚而痛苦，它也随之一同痛苦。',
});

const BUBBLE_HOLD = 3000;
const ANSWER_HOLD = 3600;
// 最后一句之后再空一会儿，才把整幕收起来：让人读完，又不至于停在那儿等人点。
const CLOSING_HOLD = 1500;

export class ShoeTalk {
  /**
   * @param {{canvas: HTMLCanvasElement, bubbleLayer: HTMLElement}} options
   */
  constructor({ canvas, bubbleLayer }) {
    this.canvas = canvas;
    this.bubbleLayer = bubbleLayer;
    this.ctx = canvas?.getContext('2d') ?? null;
    this.costume = null;
    this.talking = false;
    this.time = 0;
    this.lastFrame = 0;
    this.raf = 0;
    this.token = 0;
    this.timers = [];
    this.bubble = null;
    /** 第几条问题出现时通知外面（用来轻轻提示「皮鞋学习论」按钮）。 */
    this.onQuestion = null;
    /** 最后一句也停够时间了：外面可以把这一幕收起来。 */
    this.onFinish = null;

    this.player = new Player(0, 0);
    this.player.facing = 1;
    this.player.onGround = true;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.walkPhase = 0;
    this.player.crouching = false;
    this.player.hovering = false;
    this.player.inWater = false;
    this.player.isGliding = false;
    this.player.charge = 0;
    this.player.standingOn = null;
    this.player.appearance = 'pumpkin';

    this.loop = this.loop.bind(this);
  }

  /** 叫它开口。costume 是这一局身上的时装，没有就穿原本那身。 */
  start(costume = null) {
    this.costume = costume ?? null;
    this.player.costume = this.costume;
    this.stop(false);
    this.talking = false;
    this.time = 0;
    this.lastFrame = performance.now();
    this.loop(this.lastFrame);
    this.runSequence(++this.token);
  }

  stop(clearBubble = true) {
    this.token += 1;
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers = [];
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.talking = false;
    if (clearBubble) this.removeBubble();
  }

  wait(ms, token) {
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => resolve(token === this.token), ms);
      this.timers.push(timer);
    });
  }

  async runSequence(token) {
    // 先让它安静半秒，画面里两个人站定了，鞋再开口。
    if (!(await this.wait(650, token))) return;

    for (let index = 0; index < SHOE_QUESTIONS.length; index += 1) {
      this.showBubble(SHOE_QUESTIONS[index], 'shoe');
      this.talking = true;
      this.onQuestion?.(index);
      if (!(await this.wait(BUBBLE_HOLD, token))) return;
      this.talking = false;
      this.hideBubble();
      if (!(await this.wait(300, token))) return;
    }

    // 主角愣一下：先冒一串省略号，再开口。
    this.showBubble('……', 'player', 'is-thought');
    if (!(await this.wait(1150, token))) return;
    this.hideBubble();
    if (!(await this.wait(260, token))) return;

    this.showBubble(PLAYER_LINE, 'player');
    if (!(await this.wait(ANSWER_HOLD, token))) return;
    // 说完最后一句，鞋落回地面，整幕再停一小会儿，就交给外面收起来。
    this.talking = false;
    if (!(await this.wait(CLOSING_HOLD, token))) return;
    this.onFinish?.();
  }

  showBubble(text, who, extraClass = '') {
    this.removeBubble();
    if (!this.bubbleLayer) return;
    const bubble = document.createElement('p');
    bubble.className = `shoe-talk-bubble is-${who}`;
    if (extraClass) bubble.classList.add(extraClass);
    bubble.textContent = text;
    this.bubbleLayer.append(bubble);
    this.bubble = bubble;
    // 下一帧再亮起来，才有「弹出来」的那一下。
    requestAnimationFrame(() => bubble.classList.add('is-visible'));
  }

  hideBubble() {
    const bubble = this.bubble;
    if (!bubble) return;
    this.bubble = null;
    bubble.classList.remove('is-visible');
    // 淡出之后再摘掉这一个节点；下一句这时候已经来了也不会被误删。
    window.setTimeout(() => bubble.remove(), 260);
  }

  removeBubble() {
    this.bubble = null;
    this.bubbleLayer?.replaceChildren();
  }

  loop(now) {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    this.time += dt;
    this.draw();
  }

  draw() {
    const canvas = this.canvas;
    const ctx = this.ctx;
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    // 把 720×360 的舞台等比放进画布，多出来的地方留黑。
    const scale = Math.min(canvas.width / SCENE_W, canvas.height / SCENE_H);
    const ox = (canvas.width - SCENE_W * scale) / 2;
    const oy = (canvas.height - SCENE_H * scale) / 2;
    ctx.setTransform(scale, 0, 0, scale, ox, oy);

    this.drawStage(ctx);
    this.drawPlayer(ctx);
    this.drawShoe(ctx);
  }

  drawStage(ctx) {
    const time = this.time;
    // 夜里的地面：一片很暗的紫，脚下一圈暖光。
    const sky = ctx.createLinearGradient(0, 0, 0, SCENE_H);
    sky.addColorStop(0, '#0a0710');
    sky.addColorStop(0.62, '#140d1c');
    sky.addColorStop(1, '#08050d');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, SCENE_W, SCENE_H);

    const floor = ctx.createLinearGradient(0, GROUND, 0, GROUND + 52);
    floor.addColorStop(0, '#1c1324');
    floor.addColorStop(1, '#0a0610');
    ctx.fillStyle = floor;
    ctx.fillRect(0, GROUND, SCENE_W, SCENE_H - GROUND);

    ctx.strokeStyle = 'rgba(198, 179, 224, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, GROUND + 0.5);
    ctx.lineTo(SCENE_W, GROUND + 0.5);
    ctx.stroke();

    // 两团很淡的灯光：主角那边偏橙，鞋那边偏冷。
    const warm = ctx.createRadialGradient(PLAYER_X, GROUND - 40, 4, PLAYER_X, GROUND - 40, 190);
    warm.addColorStop(0, 'rgba(255, 176, 84, 0.14)');
    warm.addColorStop(1, 'rgba(255, 176, 84, 0)');
    ctx.fillStyle = warm;
    ctx.fillRect(PLAYER_X - 190, GROUND - 230, 380, 260);

    const cool = ctx.createRadialGradient(SHOE_X, GROUND - 26, 4, SHOE_X, GROUND - 26, 200);
    cool.addColorStop(0, 'rgba(198, 179, 224, 0.14)');
    cool.addColorStop(1, 'rgba(198, 179, 224, 0)');
    ctx.fillStyle = cool;
    ctx.fillRect(SHOE_X - 200, GROUND - 200, 400, 240);

    // 一点飘着的灰：让空舞台不至于一动不动。
    for (let index = 0; index < 14; index += 1) {
      const drift = (time * (6 + (index % 4) * 2) + index * 37) % (SCENE_W + 40);
      const y = 48 + ((index * 53) % (GROUND - 40));
      ctx.globalAlpha = 0.06 + (index % 3) * 0.02;
      ctx.fillStyle = index % 2 ? '#c6b3e0' : '#ffcf72';
      ctx.fillRect(Math.round(SCENE_W - drift), Math.round(y), 2, 1);
    }
    ctx.globalAlpha = 1;
  }

  drawPlayer(ctx) {
    const player = this.player;
    player.costume = this.costume;
    ctx.save();
    ctx.translate(PLAYER_X, GROUND);
    // 主角比像素原图大一圈，站在画面左边，脸朝着鞋。
    ctx.scale(5.4, 5.4);
    player.drawPilgrim(ctx, 0, 0, this.time);
    ctx.restore();
  }

  drawShoe(ctx) {
    const time = this.time;
    // 说每一句的时候一直跳；停顿时落回地面，只剩一点点呼吸。
    const bounce = this.talking
      ? -Math.abs(Math.sin(time * 7.4)) * 9
      : Math.sin(time * 1.6) * 0.8;
    const tilt = this.talking ? Math.sin(time * 7.4) * 0.03 : 0;

    // 鞋底下一层很暖的记忆色：夜里能认出这是一双鞋，而不是一团黑。
    const glow = ctx.createRadialGradient(SHOE_X, GROUND - 18, 6, SHOE_X, GROUND - 18, 150);
    glow.addColorStop(0, 'rgba(255, 207, 114, 0.22)');
    glow.addColorStop(0.55, 'rgba(255, 207, 114, 0.07)');
    glow.addColorStop(1, 'rgba(255, 207, 114, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(SHOE_X - 160, GROUND - 180, 320, 230);

    // 影子随着跳起来变小、变淡。
    const lift = Math.max(0, -bounce) / 9;
    ctx.save();
    ctx.globalAlpha = 0.3 - lift * 0.16;
    ctx.fillStyle = '#050308';
    ctx.beginPath();
    ctx.ellipse(SHOE_X, GROUND + 2, 124 - lift * 26, 10 - lift * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const alpha = 0.95;
    ctx.save();
    ctx.translate(SHOE_X, GROUND + bounce);
    ctx.scale(15, 15);
    // 鞋尖朝着主角：整双鞋镜像过来。
    ctx.scale(-1, 1);
    ctx.rotate(tilt);
    paintShoe(ctx, -8, 0, 1, '#ffcf72', 0.78 * alpha, 8, 'oxford');
    paintShoe(ctx, 1, 0, 1, '#ffcf72', 0.95 * alpha, 8, 'oxford');
    ctx.restore();
  }
}
