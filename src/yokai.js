/**
 * 「百鬼夜行」同行者的像素画法。
 *
 * 同行者都是万圣夜装扮的客人：科学怪人、床单幽灵、沼泽怪、蝙蝠和两只骷髅。
 * 所有 sprite 都以「脚底中心」为原点、向上为负 y，
 * 与 Player.draw 的坐标约定一致。朝向已经由外层 ctx.scale(facing, 1) 翻转，
 * 所以这里只需要画朝右的样子。
 *
 * 只画外观，不参与物理：体型、碰撞盒仍然统一，避免同行者在窄台阶上
 * 因为肩膀宽了半格而掉下去。
 */

function shade(palette, key, fallback) {
  return palette?.[key] ?? fallback;
}

function drawShadow(ctx, airborne, width) {
  ctx.globalAlpha = airborne ? 0.08 : 0.24;
  ctx.fillStyle = '#120a19';
  ctx.fillRect(-Math.round(width / 2), -1, width, 2);
  ctx.globalAlpha = 1;
}

function drawChargeSparks(ctx, state) {
  if (!state.charge) return;
  const pulse = 0.45 + Math.sin(state.time * 11) * 0.25;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = state.charge > 0 ? '#ffd36e' : '#86e7ff';
  ctx.fillRect(-7, -10, 1, 1);
  ctx.fillRect(6, -8, 1, 1);
  ctx.fillRect(-6, -3, 1, 1);
  ctx.fillRect(4, -13, 1, 1);
  ctx.globalAlpha = 1;
}

function drawWaterRing(ctx, state, width) {
  if (!state.inWater) return;
  const ctxAlpha = 0.16 + Math.sin(state.time * 4.2) * 0.05;
  ctx.globalAlpha = ctxAlpha;
  ctx.fillStyle = '#8fe1de';
  ctx.fillRect(-Math.round(width / 2) - 2, -1, width + 4, 1);
  ctx.fillRect(-Math.round(width / 2) + 2, 1, width - 4, 1);
  ctx.globalAlpha = 1;
}

/** 科学怪人：方脑袋、脖子上的螺栓、一身缝补过的旧外套。 */
function drawFranken(ctx, variant, state, anim) {
  const p = variant.palette;
  const step = state.airborne ? 0 : Math.round(anim.swing);
  const legLift = state.airborne ? -2 : 0;

  // 靴子与腿：又短又重
  ctx.fillStyle = shade(p, 'dark', '#2c332e');
  ctx.fillRect(-7, -4 + legLift, 6, 4);
  ctx.fillRect(1, -4 + legLift, 6, 4);
  ctx.fillStyle = '#1d211f';
  ctx.fillRect(-7, -2 + legLift, 6, 2);
  ctx.fillRect(1, -2 + legLift, 6, 2);
  ctx.fillStyle = '#4a5348';
  ctx.fillRect(-5, -8 + legLift, 4, 5);
  ctx.fillRect(1, -8 + legLift, 4, 5);

  // 宽大的外套
  ctx.fillStyle = shade(p, 'dark', '#2c332e');
  ctx.fillRect(-8, -18, 16, 12);
  ctx.fillRect(-9, -15, 18, 7);
  ctx.fillStyle = '#3b453c';
  ctx.fillRect(-7, -17, 14, 10);
  ctx.fillStyle = '#8c9483';
  ctx.fillRect(-2, -17, 4, 4);
  ctx.fillStyle = shade(p, 'stitch', '#3f4a3b');
  ctx.fillRect(-1, -16, 2, 1);
  ctx.fillRect(-6, -14, 3, 1);
  ctx.fillRect(4, -12, 3, 1);

  // 手臂：垂在身体两侧，走路时前后摆
  ctx.fillStyle = shade(p, 'dark', '#2c332e');
  ctx.fillRect(-12, -17 + step, 4, 9);
  ctx.fillRect(8, -17 - step, 4, 9);
  ctx.fillStyle = shade(p, 'body', '#7fa86a');
  ctx.fillRect(-11, -8 + step, 3, 3);
  ctx.fillRect(8, -8 - step, 3, 3);
  ctx.fillStyle = shade(p, 'light', '#a8cf92');
  ctx.fillRect(-11, -8 + step, 2, 1);
  ctx.fillRect(8, -8 - step, 2, 1);

  // 脖子与两侧的螺栓
  ctx.fillStyle = shade(p, 'body', '#7fa86a');
  ctx.fillRect(-3, -20, 6, 3);
  ctx.fillStyle = shade(p, 'bolt', '#cfc6a8');
  ctx.fillRect(-7, -20, 2, 2);
  ctx.fillRect(5, -20, 2, 2);
  ctx.fillStyle = '#6a6552';
  ctx.fillRect(-6, -19, 1, 1);
  ctx.fillRect(5, -19, 1, 1);

  // 方脑袋与平顶黑发
  ctx.fillStyle = shade(p, 'dark', '#2c332e');
  ctx.fillRect(-6, -27, 12, 8);
  ctx.fillStyle = shade(p, 'body', '#7fa86a');
  ctx.fillRect(-5, -26, 10, 7);
  ctx.fillStyle = shade(p, 'light', '#a8cf92');
  ctx.fillRect(-5, -26, 3, 2);
  ctx.fillStyle = shade(p, 'dark', '#2c332e');
  ctx.fillRect(-6, -28, 12, 3);
  ctx.fillRect(-6, -25, 2, 1);
  ctx.fillRect(-3, -25, 2, 1);
  ctx.fillRect(0, -25, 2, 1);
  ctx.fillRect(3, -25, 2, 1);

  // 眼睛：两粒发黄的火星
  ctx.fillStyle = '#1d211f';
  ctx.fillRect(-4, -24, 3, 2);
  ctx.fillRect(1, -24, 3, 2);
  ctx.fillStyle = shade(p, 'eye', '#ffe36e');
  ctx.globalAlpha = 0.8 + Math.sin(state.time * 2.4) * 0.15;
  ctx.fillRect(-3, -24, 2, 1);
  ctx.fillRect(2, -24, 2, 1);
  ctx.globalAlpha = 1;

  // 嘴与额头的缝线
  ctx.fillStyle = '#2a2f28';
  ctx.fillRect(-2, -21, 5, 1);
  ctx.fillStyle = shade(p, 'stitch', '#3f4a3b');
  ctx.fillRect(-1, -22, 1, 1);
  ctx.fillRect(1, -22, 1, 1);
  ctx.fillRect(-1, -27, 1, 2);
  ctx.fillRect(-2, -26, 4, 1);
}

/** 床单幽灵：一张挖了两个眼洞的旧床单，下摆被风吹得一起一伏。 */
function drawSheet(ctx, variant, state, anim) {
  const p = variant.palette;
  const sway = Math.sin(state.time * 2.2) * (state.airborne ? 2 : 1);
  const flutter = state.airborne ? Math.sin(state.time * 9) * 2 : 0;
  const bob = state.airborne ? -1 : 0;

  // 身体：一张罩住全身的床单
  ctx.fillStyle = shade(p, 'dark', '#b9ad9d');
  ctx.fillRect(-7, -24 + bob, 14, 19);
  ctx.fillRect(-8, -17 + bob, 16, 10);
  ctx.fillStyle = shade(p, 'body', '#ece6d8');
  ctx.fillRect(-6, -23 + bob, 12, 18);
  ctx.fillRect(-7, -16 + bob, 14, 9);
  ctx.fillStyle = shade(p, 'light', '#fffaf0');
  ctx.fillRect(-4, -22 + bob, 4, 13);
  ctx.fillRect(-6, -17 + bob, 2, 6);
  ctx.fillStyle = shade(p, 'shade', '#d8cfc0');
  ctx.fillRect(2, -21 + bob, 2, 9);
  ctx.fillRect(-1, -12 + bob, 3, 4);

  // 下摆：几片左右摆动的布角
  ctx.fillStyle = shade(p, 'dark', '#b9ad9d');
  ctx.fillRect(-8 + sway, -8 + bob, 4, 4);
  ctx.fillRect(-4 - sway, -8 + bob, 4, 3);
  ctx.fillRect(0 + sway, -8 + bob, 4, 4);
  ctx.fillRect(4 - sway, -8 + bob, 4, 3);
  ctx.fillStyle = shade(p, 'body', '#ece6d8');
  ctx.fillRect(-7 + sway, -8 + bob, 3, 2);
  ctx.fillRect(-3 - sway, -8 + bob, 3, 2);
  ctx.fillRect(1 + sway, -8 + bob, 3, 2);
  ctx.fillRect(5 - sway, -8 + bob, 3, 2);

  // 两侧的布褶，浮空时向上飘
  ctx.fillStyle = shade(p, 'body', '#ece6d8');
  const sleeve = state.airborne ? -2 + flutter : 0;
  ctx.fillRect(-9, -16 + sleeve + bob, 3, 6);
  ctx.fillRect(6, -16 - sleeve + bob, 3, 6);
  ctx.fillStyle = shade(p, 'dark', '#b9ad9d');
  ctx.fillRect(-9, -10 + sleeve + bob, 3, 1);
  ctx.fillRect(6, -10 - sleeve + bob, 3, 1);

  // 脸：两个眼洞和一张小小的嘴
  ctx.fillStyle = shade(p, 'eye', '#2a1c22');
  ctx.fillRect(-3, -20 + bob, 2, 3);
  ctx.fillRect(2, -20 + bob, 2, 3);
  ctx.fillRect(-1, -15 + bob, 2, 2);
  ctx.fillStyle = '#fffaf0';
  ctx.globalAlpha = 0.7;
  ctx.fillRect(-3, -20 + bob, 1, 1);
  ctx.fillRect(2, -20 + bob, 1, 1);
  ctx.globalAlpha = 1;

  // 被风吹起来的布角
  if (state.airborne) {
    ctx.fillStyle = shade(p, 'light', '#fffaf0');
    ctx.fillRect(5, -9 + flutter + bob, 2, 1);
    ctx.fillRect(-7, -10 - flutter + bob, 2, 1);
  }
}

/** 沼泽怪：带蹼的脚、背鳍和两排鳃，在水里比在岸上自在。 */
function drawSwamp(ctx, variant, state, anim) {
  const p = variant.palette;
  const step = state.moving ? Math.round(anim.swing) : 0;
  const swim = state.inWater;

  // 脚：带蹼，水里向后收
  ctx.fillStyle = shade(p, 'dark', '#244633');
  ctx.fillRect(-6 + step, -5, 5, 5);
  ctx.fillRect(1 - step, -5, 5, 5);
  ctx.fillStyle = shade(p, 'body', '#4f8c62');
  ctx.fillRect(-5 + step, -4, 4, 3);
  ctx.fillRect(2 - step, -4, 4, 3);
  if (swim) {
    ctx.fillStyle = shade(p, 'fin', '#d9b44a');
    ctx.fillRect(-8 + step, -3, 3, 1);
    ctx.fillRect(5 - step, -3, 3, 1);
  }

  // 身体与背鳍
  ctx.fillStyle = shade(p, 'dark', '#244633');
  ctx.fillRect(-5, -16, 11, 12);
  ctx.fillStyle = shade(p, 'body', '#4f8c62');
  ctx.fillRect(-4, -15, 9, 10);
  ctx.fillStyle = shade(p, 'light', '#83c787');
  ctx.fillRect(-3, -14, 4, 3);
  ctx.fillStyle = shade(p, 'fin', '#d9b44a');
  ctx.fillRect(-7, -17, 2, 4);
  ctx.fillRect(-8, -15, 2, 3);
  ctx.fillRect(-7, -12, 2, 2);
  // 鳞片与腹纹
  ctx.fillStyle = '#2f5a3f';
  ctx.fillRect(-1, -12, 2, 1);
  ctx.fillRect(2, -10, 2, 1);
  ctx.fillRect(0, -8, 3, 1);

  // 手臂：水里向后收成鳍，岸上垂在身侧
  if (swim) {
    ctx.fillStyle = shade(p, 'body', '#4f8c62');
    ctx.fillRect(5, -14, 4, 2);
    ctx.fillRect(7, -16, 3, 2);
    ctx.fillStyle = shade(p, 'fin', '#d9b44a');
    ctx.fillRect(9, -17, 2, 3);
  } else {
    ctx.fillStyle = shade(p, 'body', '#4f8c62');
    ctx.fillRect(4, -14 + step, 3, 6);
    ctx.fillStyle = shade(p, 'fin', '#d9b44a');
    ctx.fillRect(5, -9 + step, 3, 1);
  }

  // 头：头冠鳍、两排鳃和一张宽嘴
  ctx.fillStyle = shade(p, 'dark', '#244633');
  ctx.fillRect(-4, -23, 9, 8);
  ctx.fillStyle = shade(p, 'body', '#4f8c62');
  ctx.fillRect(-3, -22, 8, 6);
  ctx.fillStyle = shade(p, 'light', '#83c787');
  ctx.fillRect(-2, -21, 3, 2);
  ctx.fillStyle = shade(p, 'fin', '#d9b44a');
  ctx.fillRect(-1, -26, 4, 3);
  ctx.fillRect(0, -27, 2, 1);
  ctx.fillStyle = '#2f5a3f';
  ctx.fillRect(-4, -18, 2, 1);
  ctx.fillRect(-4, -16, 2, 1);

  // 眼睛：大而亮，水下会反光
  ctx.fillStyle = '#1c2b20';
  ctx.fillRect(-1, -20, 3, 3);
  ctx.fillRect(2, -20, 3, 3);
  ctx.fillStyle = shade(p, 'eye', '#ffe08a');
  ctx.fillRect(0, -19, 1, 1);
  ctx.fillRect(3, -19, 1, 1);
  ctx.fillStyle = '#1c2b20';
  ctx.fillRect(2, -17, 4, 1);

  // 背鳍上的小水珠
  if (swim) {
    ctx.fillStyle = '#9fe8e2';
    ctx.globalAlpha = 0.7;
    ctx.fillRect(-8, -19, 1, 1);
    ctx.fillRect(-5, -21, 1, 1);
    ctx.globalAlpha = 1;
  }
}

/** 蝙蝠：一只会扑腾两下的夜行客，落地时把翅膀收成小斗篷。 */
function drawBat(ctx, variant, state, anim) {
  const p = variant.palette;
  const flap = state.airborne ? Math.sin(state.time * 12) : 0;
  const lift = Math.round(flap * 3);
  const bob = state.airborne ? -1 : 0;
  const step = state.moving ? Math.round(anim.swing) : 0;

  // 小爪
  ctx.fillStyle = shade(p, 'dark', '#2a1732');
  ctx.fillRect(-3 + step, -3, 2, 3);
  ctx.fillRect(1 - step, -3, 2, 3);

  // 翅膀：飞起来时张开并上下扑腾
  if (state.airborne) {
    ctx.fillStyle = shade(p, 'wing', '#6d4a7a');
    // 翼根先贴在身体两侧，再向外展开
    ctx.fillRect(-6, -17 - lift, 4, 4);
    ctx.fillRect(2, -17 - lift, 4, 4);
    ctx.fillRect(-12, -17 - lift, 5, 2);
    ctx.fillRect(-15, -19 - lift, 4, 2);
    ctx.fillRect(-13, -15 + lift, 5, 3);
    ctx.fillRect(-16, -16 + lift, 3, 2);
    ctx.fillRect(7, -17 - lift, 5, 2);
    ctx.fillRect(11, -19 - lift, 4, 2);
    ctx.fillRect(8, -15 + lift, 5, 3);
    ctx.fillRect(13, -16 + lift, 3, 2);
    ctx.fillStyle = shade(p, 'wingLight', '#9a6fa8');
    ctx.fillRect(-11, -18 - lift, 3, 1);
    ctx.fillRect(8, -18 - lift, 3, 1);
  } else {
    ctx.fillStyle = shade(p, 'wing', '#6d4a7a');
    ctx.fillRect(-7, -16 + bob, 3, 11);
    ctx.fillRect(4, -16 + bob, 3, 11);
    ctx.fillStyle = shade(p, 'wingLight', '#9a6fa8');
    ctx.fillRect(-6, -15 + bob, 1, 7);
    ctx.fillRect(5, -15 + bob, 1, 7);
  }

  // 身体
  ctx.fillStyle = shade(p, 'dark', '#2a1732');
  ctx.fillRect(-4, -18 + bob, 9, 15);
  ctx.fillStyle = shade(p, 'body', '#5b3a66');
  ctx.fillRect(-3, -17 + bob, 7, 13);
  ctx.fillStyle = shade(p, 'light', '#8a5f97');
  ctx.fillRect(-2, -16 + bob, 2, 6);

  // 耳朵
  ctx.fillStyle = shade(p, 'dark', '#2a1732');
  ctx.fillRect(-4, -24 + bob, 3, 6);
  ctx.fillRect(2, -24 + bob, 3, 6);
  ctx.fillStyle = shade(p, 'body', '#5b3a66');
  ctx.fillRect(-3, -23 + bob, 2, 4);
  ctx.fillRect(2, -23 + bob, 2, 4);

  // 眼睛与尖牙
  ctx.fillStyle = shade(p, 'eye', '#ffd86a');
  ctx.globalAlpha = 0.85 + Math.sin(state.time * 4 + 1) * 0.15;
  ctx.fillRect(-2, -15 + bob, 1, 2);
  ctx.fillRect(2, -15 + bob, 1, 2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = shade(p, 'fang', '#fff4d6');
  ctx.fillRect(-1, -11 + bob, 1, 2);
  ctx.fillRect(1, -11 + bob, 1, 2);
}

/** 骷髅兄弟：两副被糖撑得咯吱响的小骨架，靠围巾的颜色分辨。 */
function drawSkeleton(ctx, variant, state, anim) {
  const p = variant.palette;
  const step = state.moving ? Math.round(anim.swing * 1.6) : 0;
  const bob = state.airborne ? -2 : state.moving ? (Math.abs(anim.swing) > 0.65 ? -1 : 0) : 0;

  // 腿骨
  ctx.fillStyle = shade(p, 'body', '#e9e1cc');
  ctx.fillRect(-3 + step, -6, 2, 5);
  ctx.fillRect(1 - step, -5, 2, 4);
  ctx.fillStyle = shade(p, 'dark', '#463b32');
  ctx.fillRect(-3 + step, -4, 2, 1);
  ctx.fillRect(1 - step, -3, 2, 1);
  // 脚
  ctx.fillStyle = shade(p, 'light', '#fff9e8');
  ctx.fillRect(-4 + step, -1, 3, 1);
  ctx.fillRect(1 - step, -1, 3, 1);

  // 骨盆与脊柱
  ctx.fillStyle = shade(p, 'body', '#e9e1cc');
  ctx.fillRect(-3, -9 + bob, 6, 3);
  ctx.fillStyle = shade(p, 'dark', '#463b32');
  ctx.fillRect(-2, -9 + bob, 1, 2);
  ctx.fillRect(0, -9 + bob, 1, 2);
  ctx.fillRect(2, -9 + bob, 1, 2);

  // 胸腔：一排肋骨
  ctx.fillStyle = shade(p, 'body', '#e9e1cc');
  ctx.fillRect(-5, -16 + bob, 10, 2);
  ctx.fillRect(-4, -14 + bob, 8, 5);
  ctx.fillStyle = shade(p, 'dark', '#463b32');
  ctx.fillRect(-2, -14 + bob, 1, 5);
  ctx.fillRect(0, -14 + bob, 1, 5);
  ctx.fillRect(2, -14 + bob, 1, 5);
  ctx.fillRect(-4, -12 + bob, 8, 1);
  ctx.fillRect(-4, -10 + bob, 8, 1);

  // 细手臂
  ctx.fillStyle = shade(p, 'body', '#e9e1cc');
  ctx.fillRect(-6, -14 + bob + step, 1, 5);
  ctx.fillRect(5, -14 + bob - step, 1, 5);
  ctx.fillStyle = shade(p, 'light', '#fff9e8');
  ctx.fillRect(-6, -10 + bob + step, 2, 1);
  ctx.fillRect(5, -10 + bob - step, 2, 1);

  // 围巾：两兄弟各一条不同颜色
  ctx.fillStyle = shade(p, 'accent', '#c8553f');
  ctx.fillRect(-4, -18 + bob, 8, 2);
  ctx.fillRect(3, -17 + bob, 2, 4);

  // 头骨
  ctx.fillStyle = shade(p, 'body', '#e9e1cc');
  ctx.fillRect(-4, -25 + bob, 8, 8);
  ctx.fillRect(-3, -26 + bob, 6, 2);
  ctx.fillStyle = shade(p, 'light', '#fff9e8');
  ctx.fillRect(-3, -25 + bob, 2, 2);
  // 眼窝
  ctx.fillStyle = '#201a16';
  ctx.fillRect(-3, -24 + bob, 2, 3);
  ctx.fillRect(1, -24 + bob, 2, 3);
  ctx.fillStyle = shade(p, 'eye', '#ffb45e');
  ctx.globalAlpha = 0.85 + Math.sin(state.time * 5 + variant.id.length) * 0.15;
  ctx.fillRect(-3, -23 + bob, 1, 1);
  ctx.fillRect(2, -23 + bob, 1, 1);
  ctx.globalAlpha = 1;
  // 鼻孔与牙
  ctx.fillStyle = '#201a16';
  ctx.fillRect(0, -22 + bob, 1, 1);
  ctx.fillStyle = '#c9c0ad';
  ctx.fillRect(-3, -20 + bob, 6, 1);
  ctx.fillStyle = '#201a16';
  ctx.fillRect(-2, -20 + bob, 1, 1);
  ctx.fillRect(0, -20 + bob, 1, 1);
  ctx.fillRect(2, -20 + bob, 1, 1);

  // 抄着的小手
  ctx.fillStyle = shade(p, 'light', '#fff9e8');
  ctx.fillRect(-6, -9 + bob, 2, 1);
  ctx.fillRect(5, -9 + bob, 2, 1);
}

function drawWaterBubbles(ctx, state) {
  if (!state.inWater) return;
  const t = state.time;
  const drift = Math.round(Math.sin(t * 4.2) * 2);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#bdf6ef';
  ctx.fillRect(5 + drift, -25, 1, 1);
  ctx.fillRect(-6 - drift, -18, 2, 1);
  ctx.fillRect(3, -13 + drift, 1, 1);
  ctx.globalAlpha = 1;
}

/** 借扫帚的风滑翔时，身边会拖出几道很短的风线。 */
function drawGlideWind(ctx, state) {
  if (!state.gliding) return;
  const t = state.time;
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = '#c8fff7';
  const shift = Math.round(Math.sin(t * 6) * 1);
  ctx.fillRect(-11 + shift, -19, 5, 1);
  ctx.fillRect(6, -14 - shift, 5, 1);
  ctx.fillRect(-8, -9 + shift, 6, 1);
  ctx.globalAlpha = 1;
}

/** 女巫：尖顶帽、紫裙子，骑扫帚的时候横着飞。 */
function drawWitch(ctx, variant, state, anim) {
  const p = variant.palette;
  const step = state.airborne ? 0 : Math.round(anim.swing);
  const bob = state.airborne ? -1 : 0;

  if (state.gliding) {
    // 横握的扫帚
    ctx.fillStyle = shade(p, 'broom', '#a97a4a');
    ctx.fillRect(-12, -3, 22, 2);
    ctx.fillStyle = '#d9b06a';
    ctx.fillRect(8, -5, 4, 6);
    ctx.fillRect(11, -4, 3, 4);
    ctx.fillStyle = '#7a5732';
    ctx.fillRect(-12, -3, 2, 2);
    // 收起的腿
    ctx.fillStyle = shade(p, 'dark', '#2e1c3e');
    ctx.fillRect(-3, -5, 3, 2);
    ctx.fillRect(1, -5, 3, 2);
  } else {
    // 腿与鞋
    ctx.fillStyle = shade(p, 'dark', '#2e1c3e');
    ctx.fillRect(-3 + step, -5, 2, 5);
    ctx.fillRect(1 - step, -5, 2, 5);
    ctx.fillStyle = '#1d1328';
    ctx.fillRect(-4 + step, -1, 3, 1);
    ctx.fillRect(1 - step, -1, 3, 1);
  }

  // 紫色长裙
  ctx.fillStyle = shade(p, 'dark', '#2e1c3e');
  ctx.fillRect(-4, -17 + bob, 9, 12);
  ctx.fillRect(-6, -9 + bob, 13, 5);
  ctx.fillStyle = shade(p, 'body', '#7b5a9e');
  ctx.fillRect(-3, -16 + bob, 7, 11);
  ctx.fillRect(-5, -8 + bob, 11, 3);
  ctx.fillStyle = shade(p, 'light', '#a98bc7');
  ctx.fillRect(-2, -15 + bob, 2, 6);
  ctx.fillRect(-4, -7 + bob, 3, 1);
  ctx.fillStyle = '#4a2f63';
  ctx.fillRect(-5, -5 + bob, 1, 2);
  ctx.fillRect(-1, -5 + bob, 1, 2);
  ctx.fillRect(3, -5 + bob, 1, 2);

  // 手臂：一只拎着扫帚
  ctx.fillStyle = shade(p, 'skin', '#8fbf7a');
  ctx.fillRect(-6, -14 + bob, 2, 4);
  ctx.fillRect(4, -14 + bob, 2, 4);

  // 扫帚柄（站着时）
  if (!state.gliding) {
    ctx.fillStyle = shade(p, 'broom', '#a97a4a');
    ctx.fillRect(8, -18 + bob, 1, 16);
    ctx.fillStyle = '#d9b06a';
    ctx.fillRect(6, -4 + bob, 5, 4);
    ctx.fillRect(5, -2 + bob, 7, 2);
    ctx.fillStyle = '#7a5732';
    ctx.fillRect(8, -3 + bob, 1, 2);
  }

  // 绿色的脸、尖鼻子和两粒黄眼睛
  ctx.fillStyle = shade(p, 'skin', '#8fbf7a');
  ctx.fillRect(-4, -24 + bob, 8, 7);
  ctx.fillRect(-3, -25 + bob, 6, 1);
  ctx.fillStyle = '#a8d38f';
  ctx.fillRect(-3, -24 + bob, 2, 2);
  ctx.fillStyle = shade(p, 'skin', '#8fbf7a');
  ctx.fillRect(4, -21 + bob, 2, 1);
  ctx.fillStyle = '#1d1328';
  ctx.fillRect(-3, -22 + bob, 2, 2);
  ctx.fillRect(1, -22 + bob, 2, 2);
  ctx.fillStyle = shade(p, 'eye', '#ffe36e');
  ctx.fillRect(-3, -22 + bob, 1, 1);
  ctx.fillRect(2, -22 + bob, 1, 1);
  ctx.fillStyle = '#3a2330';
  ctx.fillRect(-1, -19 + bob, 3, 1);

  // 尖顶帽
  ctx.fillStyle = shade(p, 'hat', '#3a2350');
  ctx.fillRect(-7, -26 + bob, 14, 2);
  ctx.fillRect(-4, -28 + bob, 8, 2);
  ctx.fillRect(-3, -30 + bob, 6, 2);
  ctx.fillRect(-2, -32 + bob, 4, 2);
  ctx.fillStyle = '#553470';
  ctx.fillRect(-7, -26 + bob, 14, 1);
  ctx.fillRect(-3, -29 + bob, 4, 1);
  ctx.fillStyle = shade(p, 'light', '#a98bc7');
  ctx.fillRect(-5, -25 + bob, 10, 1);
  ctx.fillStyle = '#ffcf6a';
  ctx.fillRect(1, -25 + bob, 2, 1);
}

/** 木乃伊：一圈圈旧绷带，手臂僵直地伸在前面，身后拖着一条松开的布尾。 */
function drawMummy(ctx, variant, state, anim) {
  const p = variant.palette;
  const step = state.airborne ? 0 : Math.round(anim.swing);
  const bob = state.airborne ? -1 : 0;
  const sway = Math.sin(state.time * 3.4) * (state.airborne ? 2 : 1);

  // 脚：也被绷带缠着
  ctx.fillStyle = shade(p, 'dark', '#8f8062');
  ctx.fillRect(-5 + step, -4, 4, 4);
  ctx.fillRect(1 - step, -4, 4, 4);
  ctx.fillStyle = shade(p, 'shade', '#b3a17c');
  ctx.fillRect(-5 + step, -4, 4, 1);
  ctx.fillRect(1 - step, -4, 4, 1);

  // 下身：层层叠叠的绷带
  ctx.fillStyle = shade(p, 'dark', '#8f8062');
  ctx.fillRect(-6, -15 + bob, 12, 11);
  ctx.fillStyle = shade(p, 'body', '#ddd0ac');
  ctx.fillRect(-5, -14 + bob, 10, 10);
  ctx.fillStyle = shade(p, 'shade', '#b3a17c');
  ctx.fillRect(-5, -11 + bob, 10, 1);
  ctx.fillRect(-4, -7 + bob, 9, 1);
  ctx.fillStyle = shade(p, 'light', '#f3ead0');
  ctx.fillRect(-3, -13 + bob, 2, 7);

  // 胸口：斜缠的布条
  ctx.fillStyle = shade(p, 'body', '#ddd0ac');
  ctx.fillRect(-6, -23 + bob, 12, 9);
  ctx.fillStyle = shade(p, 'shade', '#b3a17c');
  ctx.fillRect(-6, -21 + bob, 12, 1);
  ctx.fillRect(-6, -18 + bob, 12, 1);
  ctx.fillStyle = shade(p, 'light', '#f3ead0');
  ctx.fillRect(-5, -22 + bob, 9, 1);
  ctx.fillRect(-4, -19 + bob, 8, 1);
  ctx.fillStyle = shade(p, 'dark', '#8f8062');
  ctx.fillRect(-1, -23 + bob, 1, 9);

  // 两条向前伸的僵直手臂
  ctx.fillStyle = shade(p, 'dark', '#8f8062');
  ctx.fillRect(4, -22 + bob, 9, 4);
  ctx.fillRect(4, -17 + bob, 9, 4);
  ctx.fillStyle = shade(p, 'body', '#ddd0ac');
  ctx.fillRect(4, -21 + bob, 8, 2);
  ctx.fillRect(4, -16 + bob, 8, 2);
  ctx.fillStyle = shade(p, 'light', '#f3ead0');
  ctx.fillRect(9, -21 + bob, 2, 1);
  ctx.fillRect(9, -16 + bob, 2, 1);

  // 头：只露出一条眼缝
  ctx.fillStyle = shade(p, 'dark', '#8f8062');
  ctx.fillRect(-5, -31 + bob, 10, 9);
  ctx.fillStyle = shade(p, 'body', '#ddd0ac');
  ctx.fillRect(-4, -30 + bob, 8, 8);
  ctx.fillStyle = shade(p, 'shade', '#b3a17c');
  ctx.fillRect(-4, -27 + bob, 8, 1);
  ctx.fillRect(-3, -24 + bob, 7, 1);
  ctx.fillStyle = shade(p, 'light', '#f3ead0');
  ctx.fillRect(-3, -29 + bob, 4, 2);
  ctx.fillStyle = shade(p, 'eye', '#ffd86a');
  ctx.globalAlpha = 0.8 + Math.sin(state.time * 2.6) * 0.16;
  ctx.fillRect(-3, -28 + bob, 2, 1);
  ctx.fillRect(2, -28 + bob, 2, 1);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#2a2418';
  ctx.fillRect(-4, -28 + bob, 8, 1);

  // 身后拖着的布尾
  ctx.fillStyle = shade(p, 'shade', '#b3a17c');
  ctx.globalAlpha = 0.85;
  ctx.fillRect(-9, -14 + bob + sway, 3, 1);
  ctx.fillRect(-12, -12 + bob - sway, 3, 1);
  ctx.fillRect(-14, -9 + bob + sway, 2, 1);
  ctx.globalAlpha = 1;
}

/** 狼人：灰毛、尖耳朵、反曲的腿和一条总在动的尾巴。 */
function drawWolf(ctx, variant, state, anim) {
  const p = variant.palette;
  const step = state.airborne ? 0 : Math.round(anim.swing);
  const bob = state.airborne ? -1 : 0;
  const tail = Math.sin(state.time * 4.2) * (state.airborne ? 3 : 2);

  // 反曲的腿与爪子
  ctx.fillStyle = shade(p, 'dark', '#2c313b');
  ctx.fillRect(-6 + step, -6, 4, 6);
  ctx.fillRect(2 - step, -6, 4, 6);
  ctx.fillStyle = shade(p, 'fur', '#8792a1');
  ctx.fillRect(-5 + step, -9, 3, 4);
  ctx.fillRect(2 - step, -9, 3, 4);
  ctx.fillStyle = '#f6efd9';
  ctx.fillRect(-7 + step, -1, 2, 1);
  ctx.fillRect(2 - step, -1, 2, 1);

  // 尾巴：在身后画一道向上卷的弧
  ctx.fillStyle = shade(p, 'dark', '#2c313b');
  ctx.fillRect(-10, -16 + bob, 3, 2);
  ctx.fillRect(-12, -18 + bob - tail, 3, 2);
  ctx.fillRect(-12, -21 + bob - tail, 3, 2);
  ctx.fillStyle = shade(p, 'fur', '#8792a1');
  ctx.fillRect(-11, -17 + bob - tail, 2, 1);
  ctx.fillRect(-11, -20 + bob - tail, 2, 1);

  // 佝偻的躯干与浅色胸毛
  ctx.fillStyle = shade(p, 'dark', '#2c313b');
  ctx.fillRect(-6, -19 + bob, 12, 11);
  ctx.fillStyle = shade(p, 'body', '#6e7686');
  ctx.fillRect(-5, -18 + bob, 10, 10);
  ctx.fillStyle = shade(p, 'light', '#a8b0bd');
  ctx.fillRect(-2, -17 + bob, 4, 8);
  ctx.fillStyle = shade(p, 'fur', '#8792a1');
  ctx.fillRect(-5, -18 + bob, 2, 6);
  ctx.fillRect(4, -15 + bob, 2, 5);

  // 手臂与爪
  ctx.fillStyle = shade(p, 'dark', '#2c313b');
  ctx.fillRect(-9, -18 + bob + step, 3, 8);
  ctx.fillRect(6, -18 + bob - step, 3, 8);
  ctx.fillStyle = shade(p, 'body', '#6e7686');
  ctx.fillRect(-8, -11 + bob + step, 2, 2);
  ctx.fillRect(6, -11 + bob - step, 2, 2);
  ctx.fillStyle = '#f6efd9';
  ctx.fillRect(-9, -9 + bob + step, 1, 1);
  ctx.fillRect(8, -9 + bob - step, 1, 1);

  // 头：耳朵、长嘴、獠牙
  ctx.fillStyle = shade(p, 'dark', '#2c313b');
  ctx.fillRect(-6, -29 + bob, 12, 10);
  ctx.fillRect(-5, -32 + bob, 3, 4);
  ctx.fillRect(2, -32 + bob, 3, 4);
  ctx.fillStyle = shade(p, 'body', '#6e7686');
  ctx.fillRect(-5, -28 + bob, 9, 8);
  ctx.fillRect(-4, -31 + bob, 2, 3);
  ctx.fillRect(3, -31 + bob, 2, 3);
  ctx.fillStyle = shade(p, 'light', '#a8b0bd');
  ctx.fillRect(-3, -27 + bob, 5, 3);
  ctx.fillRect(4, -26 + bob, 3, 3);
  ctx.fillStyle = shade(p, 'dark', '#2c313b');
  ctx.fillRect(7, -25 + bob, 1, 1);
  ctx.fillStyle = shade(p, 'eye', '#ffe36e');
  ctx.fillRect(-2, -27 + bob, 2, 1);
  ctx.fillRect(2, -27 + bob, 1, 1);
  ctx.fillStyle = '#201a16';
  ctx.fillRect(-2, -26 + bob, 1, 1);
  ctx.fillRect(2, -26 + bob, 1, 1);
  ctx.fillStyle = shade(p, 'fang', '#f6efd9');
  ctx.fillRect(1, -23 + bob, 1, 2);
  ctx.fillRect(4, -23 + bob, 1, 2);
}

/** 黑猫：瘦小的身体、尖耳朵、黄眼睛，尾巴从身后绕上来。 */
function drawCat(ctx, variant, state, anim) {
  const p = variant.palette;
  const step = state.airborne ? 0 : Math.round(anim.swing);
  const bob = state.airborne ? -1 : 0;
  const tail = Math.sin(state.time * 3.6) * (state.airborne ? 3 : 2);

  // 脚
  ctx.fillStyle = shade(p, 'dark', '#17111d');
  ctx.fillRect(-4 + step, -4, 3, 4);
  ctx.fillRect(1 - step, -4, 3, 4);
  ctx.fillStyle = shade(p, 'light', '#4a4056');
  ctx.fillRect(-4 + step, -1, 2, 1);
  ctx.fillRect(1 - step, -1, 2, 1);

  // 尾巴：从身后绕上来
  ctx.fillStyle = shade(p, 'tail', '#3a3046');
  ctx.fillRect(-8, -12 + bob, 3, 2);
  ctx.fillRect(-10, -15 + bob + tail, 3, 2);
  ctx.fillRect(-10, -18 + bob + tail, 2, 2);
  ctx.fillRect(-9, -20 + bob + tail, 2, 1);

  // 瘦小的身体
  ctx.fillStyle = shade(p, 'dark', '#17111d');
  ctx.fillRect(-4, -18 + bob, 8, 14);
  ctx.fillStyle = shade(p, 'body', '#2f2838');
  ctx.fillRect(-3, -17 + bob, 6, 12);
  ctx.fillStyle = shade(p, 'light', '#4a4056');
  ctx.fillRect(-2, -16 + bob, 2, 7);
  ctx.fillRect(-1, -10 + bob, 3, 4);

  // 手臂与爪
  ctx.fillStyle = shade(p, 'body', '#2f2838');
  ctx.fillRect(-6, -16 + bob + step, 2, 6);
  ctx.fillRect(4, -16 + bob - step, 2, 6);
  ctx.fillStyle = shade(p, 'light', '#4a4056');
  ctx.fillRect(-7, -11 + bob + step, 2, 1);
  ctx.fillRect(5, -11 + bob - step, 2, 1);

  // 头与尖耳朵
  ctx.fillStyle = shade(p, 'dark', '#17111d');
  ctx.fillRect(-5, -25 + bob, 10, 8);
  ctx.fillRect(-5, -28 + bob, 3, 4);
  ctx.fillRect(2, -28 + bob, 3, 4);
  ctx.fillStyle = shade(p, 'body', '#2f2838');
  ctx.fillRect(-4, -24 + bob, 8, 6);
  ctx.fillRect(-4, -27 + bob, 2, 3);
  ctx.fillRect(2, -27 + bob, 2, 3);
  ctx.fillStyle = '#8a6d8f';
  ctx.fillRect(-4, -27 + bob, 1, 2);
  ctx.fillRect(3, -27 + bob, 1, 2);

  // 黄眼睛与胡须
  const blink = Math.sin(state.time * 1.7) > 0.96;
  ctx.fillStyle = shade(p, 'eye', '#ffe36e');
  if (!blink) {
    ctx.fillRect(-3, -23 + bob, 2, 1);
    ctx.fillRect(2, -23 + bob, 2, 1);
  }
  ctx.fillStyle = shade(p, 'nose', '#d88f8f');
  ctx.fillRect(0, -21 + bob, 1, 1);
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#c8bdd4';
  ctx.fillRect(4, -21 + bob, 4, 1);
  ctx.fillRect(4, -20 + bob, 3, 1);
  ctx.globalAlpha = 1;
}

const DRAWERS = {
  franken: drawFranken,
  sheet: drawSheet,
  swamp: drawSwamp,
  bat: drawBat,
  skeleton: drawSkeleton,
  witch: drawWitch,
  mummy: drawMummy,
  wolf: drawWolf,
  cat: drawCat,
};

/**
 * 入口：影子、身体、水纹与电荷标记都按同一套顺序画。
 * state 里带的是 Player 每帧已经算好的状态，渲染层不再碰物理。
 */
export function drawYokaiSprite(ctx, sx, sy, variant, state) {
  const drawer = DRAWERS[variant.draw] ?? drawSkeleton;
  const swing = Math.sin(state.walkPhase ?? 0);
  const anim = { swing };

  const airborne = state.airborne || state.inWater;
  ctx.save();
  ctx.translate(sx, sy);
  drawShadow(ctx, airborne, variant.draw === 'franken' ? 14 : 10);
  ctx.restore();

  ctx.save();
  ctx.translate(sx, sy);

  // 床单幽灵浮空时整体轻微倾斜，像被风托着。
  if (variant.draw === 'sheet' && state.airborne) {
    ctx.translate(0, 0);
    ctx.rotate(Math.sin(state.time * 2.4) * 0.045);
  }

  // 除了沼泽怪，其他身体在水里都会轻轻上浮、慢慢晃。
  if (state.inWater && variant.draw !== 'swamp') {
    ctx.translate(0, Math.round(Math.sin(state.time * 3.1)));
    ctx.rotate(Math.sin(state.time * 2.2) * 0.04);
  }

  // 女巫滑翔时扫帚会兜风，身体跟着风轻轻摆。
  if (variant.draw === 'witch' && state.gliding) {
    ctx.rotate(Math.sin(state.time * 2.6) * 0.035);
  }

  ctx.scale(state.facing, 1);
  drawer(ctx, variant, state, anim);
  drawGlideWind(ctx, state);
  drawWaterBubbles(ctx, state);
  ctx.restore();

  ctx.save();
  ctx.translate(sx, sy);
  drawWaterRing(ctx, state, variant.draw === 'franken' ? 14 : 10);
  drawChargeSparks(ctx, state);
  ctx.restore();
}
