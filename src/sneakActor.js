/**
 * 「鬼鬼祟祟」里两只小鬼的画法。
 *
 * 玩家物理和碰撞仍然沿用 Player；这里只负责在脚下坐标 (sx, sy) 处
 * 画出一副小鬼身体。鬼鬼偏青蓝，祟祟偏暖黄；潜行时身体会变淡、压低，
 * 被灯照到时头顶会冒出一个越来越红的感叹号。
 */
const STYLES = [
  {
    body: '#d9edff',
    light: '#f6fbff',
    edge: '#8ec8e8',
    shadow: '#7aa9c4',
    eye: '#12202b',
    pupil: '#7fe0ff',
    glow: '126, 206, 255',
    leaf: null,
  },
  {
    body: '#ffe6c1',
    light: '#fff8e9',
    edge: '#e0b276',
    shadow: '#c49a67',
    eye: '#2a1c15',
    pupil: '#ffc45e',
    glow: '255, 196, 120',
    leaf: '#8fbf6a',
  },
];

export function drawSneakGhost(ctx, player, time, sx, sy) {
  const style = STYLES[player.ghostVariant ? 1 : 0];
  const crouch = player.crouching;
  const airborne = !player.onGround || player.hovering;
  const moving = player.onGround && Math.abs(player.vx) > 10;
  const alpha = player.hidden
    ? 0.34
    : crouch
      ? 0.55
      : airborne
        ? 0.9
        : 0.95;

  // 脚下的软阴影
  ctx.globalAlpha = airborne ? 0.07 : 0.2;
  ctx.fillStyle = '#0d0a12';
  ctx.fillRect(sx - 5, sy - 1, 10, 2);
  ctx.globalAlpha = 1;

  // 身周的冷/暖光：潜行和被影子遮住时会暗下去。
  const glowAlpha = player.hidden ? 0.05 : crouch ? 0.09 : 0.15;
  const pulse = 0.8 + Math.sin(time * 2.6 + player.x * 0.01) * 0.2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(sx, sy - 13, 1, sx, sy - 13, 27);
  glow.addColorStop(0, `rgba(${style.glow}, ${glowAlpha * pulse})`);
  glow.addColorStop(0.6, `rgba(${style.glow}, ${glowAlpha * 0.35})`);
  glow.addColorStop(1, `rgba(${style.glow}, 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(sx - 28, sy - 42, 56, 54);
  ctx.restore();

  ctx.save();
  ctx.translate(Math.round(sx), Math.round(sy));
  ctx.scale(player.facing, 1);
  // 潜行时整个人压扁一点，像贴着地面飘。
  const squash = crouch ? 0.74 : 1;
  ctx.scale(1, squash);
  ctx.globalAlpha = alpha;

  const sway = Math.round(Math.sin(time * 3.1 + player.x * 0.02) * (airborne ? 2 : 1));
  const walkLift = moving ? (Math.abs(Math.sin(player.walkPhase)) > 0.6 ? 1 : 0) : 0;

  // 身体：一团有波浪下摆的小鬼。
  ctx.fillStyle = style.body;
  ctx.fillRect(-4, -24 - walkLift, 8, 2);
  ctx.fillRect(-5, -22 - walkLift, 10, 3);
  ctx.fillRect(-6, -19, 12, 3);
  ctx.fillRect(-7, -16, 14, 11);
  ctx.fillRect(-6, -5, 12, 3);

  // 下摆：三片高低不一的布角。
  ctx.fillRect(-7, -2 + sway, 4, 4);
  ctx.fillRect(-3, -2, 5, 3);
  ctx.fillRect(1, -2 - sway, 4, 4);
  ctx.fillRect(4, -2 + sway, 3, 3);

  // 侧面的折痕与高光。
  ctx.fillStyle = style.edge;
  ctx.fillRect(-7, -16, 1, 10);
  ctx.fillRect(-6, -5, 1, 3);
  ctx.fillRect(6, -16, 1, 10);
  ctx.fillStyle = style.shadow;
  ctx.fillRect(-5, -3 + sway, 1, 1);
  ctx.fillRect(4, -3 - sway, 1, 1);

  ctx.fillStyle = style.light;
  ctx.fillRect(-4, -23 - walkLift, 4, 1);
  ctx.fillRect(-6, -18, 2, 2);
  ctx.fillRect(-5, -13, 1, 4);

  // 小手：潜行时缩在身体两侧。
  ctx.fillStyle = style.body;
  const armY = crouch ? -10 : -13;
  ctx.fillRect(-8, armY, 2, 4);
  ctx.fillRect(6, armY, 2, 4);
  ctx.fillStyle = style.edge;
  ctx.fillRect(-8, armY + 3, 2, 1);
  ctx.fillRect(6, armY + 3, 2, 1);

  // 眼睛。被灯照到时睁大一点。
  const eyeH = player.seen ? 4 : 3;
  ctx.fillStyle = style.eye;
  ctx.fillRect(-4, -14, 3, eyeH);
  ctx.fillRect(2, -14, 3, eyeH);
  ctx.fillStyle = style.pupil;
  const pupilShift = player.facing > 0 ? 1 : 0;
  ctx.fillRect(-3 + pupilShift, -13, 1, 1);
  ctx.fillRect(3 + pupilShift, -13, 1, 1);

  // 嘴：安静时是一条线，被照到时会张开。
  ctx.fillStyle = '#31202e';
  if (player.seen || (player.exposure ?? 0) > 0.6) {
    ctx.fillRect(-1, -9, 3, 2);
    ctx.fillStyle = '#0f0a12';
    ctx.fillRect(-1, -8, 3, 1);
  } else {
    ctx.fillRect(-1, -9, 3, 1);
  }

  // 祟祟头顶的一片叶子，用来在昏暗里分辨两个人。
  if (style.leaf) {
    ctx.fillStyle = style.leaf;
    ctx.fillRect(1, -26 - walkLift, 4, 1);
    ctx.fillRect(3, -27 - walkLift, 2, 1);
    ctx.fillStyle = '#6f9b4e';
    ctx.fillRect(4, -26 - walkLift, 1, 1);
  }

  // 暴露度：头顶的感叹号，颜色从黄变红。
  const exposure = player.exposure ?? 0;
  if (exposure > 0.12) {
    const blink = 0.6 + Math.sin(time * (8 + exposure * 14)) * 0.4;
    ctx.globalAlpha = alpha * (0.45 + exposure * 0.55) * blink;
    ctx.fillStyle = exposure > 0.65 ? '#ff5f52' : exposure > 0.35 ? '#ffb347' : '#ffe08a';
    ctx.fillRect(-1, -33, 2, 5);
    ctx.fillRect(-1, -27, 2, 2);
    ctx.globalAlpha = alpha;
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}
