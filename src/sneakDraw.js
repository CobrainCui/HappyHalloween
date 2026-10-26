/**
 * 「鬼鬼祟祟」的场景绘制：影子区、守夜人的灯、石板、铁门和影子桥。
 *
 * 所有函数都由 Renderer 调用，只读取 level / game，不改变游戏状态。
 */
import { VIEW } from './config.js';

const T = VIEW.TILE;
const WARM = '255, 203, 122';
const ALERT = '255, 96, 78';

export function drawSneakShadowZones(renderer, time) {
  const ctx = renderer.ctx;
  const level = renderer.level;
  if (!level.shadowZones?.length) return;

  for (const zone of level.shadowZones) {
    const gradient = ctx.createLinearGradient(0, zone.y - 8, 0, zone.y + zone.h);
    gradient.addColorStop(0, 'rgba(4, 7, 14, 0)');
    gradient.addColorStop(0.35, 'rgba(4, 7, 14, 0.42)');
    gradient.addColorStop(1, 'rgba(3, 5, 11, 0.7)');
    ctx.fillStyle = gradient;
    ctx.fillRect(zone.x, zone.y - 8, zone.w, zone.h + 8);

    // 影子里很淡的一点冷光，像是在呼吸。
    const breathe = 0.05 + Math.sin(time * 1.4 + zone.x * 0.02) * 0.02;
    ctx.fillStyle = `rgba(116, 168, 190, ${breathe})`;
    ctx.fillRect(zone.x + 2, zone.y + zone.h - 2, zone.w - 4, 1);

    for (let index = 0; index < zone.w / 14; index += 1) {
      const x = zone.x + 6 + index * 14;
      const y = zone.y + zone.h - 3 - Math.sin(time * 0.9 + index * 1.7 + zone.x) * 2;
      ctx.fillStyle = 'rgba(132, 186, 200, 0.28)';
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }
}

export function drawSneakDevice(renderer, device, game, time) {
  if (device.type === 'watcher') {
    drawWatcher(renderer, device, time);
    return true;
  }
  if (device.type === 'plate') {
    drawPlate(renderer, device, time);
    return true;
  }
  return false;
}

function drawWatcher(renderer, device, time) {
  const ctx = renderer.ctx;
  const x = Math.round(device.x);
  const y = Math.round(device.y);
  const originX = x;
  const originY = y - 30;
  const angle = device.angle ?? (device.dir > 0 ? 0.12 : Math.PI - 0.12);
  const half = device.halfAngle ?? 0.32;
  const range = device.range ?? 150;
  const alert = Boolean(device.alert);
  const tint = alert ? ALERT : WARM;
  const flicker = 0.88 + Math.sin(time * 7.3 + x * 0.04) * 0.08;

  // 灯光锥。world 坐标已经由 Renderer 平移过。
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const cone = ctx.createRadialGradient(originX, originY, 4, originX, originY, range);
  cone.addColorStop(0, `rgba(${tint}, ${0.22 * flicker})`);
  cone.addColorStop(0.35, `rgba(${tint}, ${0.1 * flicker})`);
  cone.addColorStop(0.75, `rgba(${tint}, ${0.035 * flicker})`);
  cone.addColorStop(1, `rgba(${tint}, 0)`);
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.arc(originX, originY, range, angle - half, angle + half);
  ctx.closePath();
  ctx.fill();

  // 锥心更亮的一条窄光。
  const core = ctx.createRadialGradient(originX, originY, 3, originX, originY, range);
  core.addColorStop(0, `rgba(255, 238, 190, ${0.18 * flicker})`);
  core.addColorStop(0.6, `rgba(${tint}, 0.045)`);
  core.addColorStop(1, `rgba(${tint}, 0)`);
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.arc(originX, originY, range, angle - half * 0.38, angle + half * 0.38);
  ctx.closePath();
  ctx.fill();

  // 灯前飘的几粒尘。
  for (let index = 0; index < 4; index += 1) {
    const reach = 18 + ((time * (14 + index * 4) + index * 27) % Math.max(30, range - 24));
    const sway = Math.sin(time * 1.6 + index * 2.1) * 4;
    const px = originX + Math.cos(angle) * reach + Math.cos(angle + Math.PI / 2) * sway;
    const py = originY + Math.sin(angle) * reach + Math.sin(angle + Math.PI / 2) * sway;
    ctx.globalAlpha = 0.16 + index * 0.03;
    ctx.fillStyle = `rgb(${tint})`;
    ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // 老守夜人的身体：厚外套、尖帽、提灯。
  ctx.save();
  ctx.translate(x, y);

  // 灯杆与提灯
  ctx.fillStyle = '#2a1d22';
  ctx.fillRect(0, -31, 1, 10);
  ctx.fillRect(-1, -34, 3, 1);
  ctx.fillStyle = '#3f2b2c';
  ctx.fillRect(-4, -37, 8, 2);
  ctx.fillStyle = alert ? '#ff8a6e' : '#ffd88a';
  ctx.fillRect(-4, -35, 8, 6);
  ctx.fillStyle = alert ? '#ffc0a8' : '#fff2c2';
  ctx.fillRect(-2, -34, 4, 4);
  ctx.fillStyle = '#2a1d22';
  ctx.fillRect(-1, -35, 1, 6);
  ctx.fillRect(-4, -33, 8, 1);

  // 腿与外套
  ctx.fillStyle = '#1a131b';
  ctx.fillRect(-5, -10, 3, 10);
  ctx.fillRect(3, -10, 3, 10);
  ctx.fillStyle = '#241a23';
  ctx.fillRect(-6, -26, 12, 17);
  ctx.fillRect(-7, -21, 14, 9);
  ctx.fillStyle = '#3a2b35';
  ctx.fillRect(-5, -25, 3, 14);
  ctx.fillRect(2, -25, 3, 14);
  ctx.fillStyle = '#4d3a3d';
  ctx.fillRect(-6, -26, 12, 1);

  // 肩上的旧披风
  ctx.fillStyle = '#2e2029';
  ctx.fillRect(-8, -24, 16, 4);
  ctx.fillRect(-9, -21, 3, 8);
  ctx.fillRect(6, -21, 3, 8);

  // 头与尖帽
  ctx.fillStyle = '#d3b193';
  ctx.fillRect(-4, -31, 8, 6);
  ctx.fillRect(-3, -34, 6, 3);
  ctx.fillStyle = '#1e1420';
  ctx.fillRect(-6, -34, 12, 2);
  ctx.fillRect(-4, -38, 8, 4);
  ctx.fillRect(-2, -41, 5, 3);
  ctx.fillRect(0, -43, 3, 2);
  ctx.fillStyle = '#3c2a3c';
  ctx.fillRect(-6, -34, 12, 1);
  ctx.fillRect(-2, -40, 3, 1);

  // 侧脸：鼻子和一双在灯后发亮的小眼睛。
  ctx.fillStyle = '#d3b193';
  ctx.fillRect(4, -29, 2, 2);
  ctx.fillStyle = alert ? '#ff9b7d' : '#e8d39a';
  ctx.fillRect(-2, -29, 1, 1);
  ctx.fillRect(2, -29, 1, 1);
  ctx.fillStyle = '#2b1c1f';
  ctx.fillRect(-3, -25, 6, 1);
  ctx.fillRect(-2, -23, 4, 1);
  ctx.globalAlpha = 0.7;
  ctx.fillRect(-6, -13, 2, 2);
  ctx.fillRect(5, -12, 2, 2);
  ctx.globalAlpha = 1;

  ctx.restore();

  // 发现可疑动静时，头顶冒一个感叹号。
  if (alert) {
    const bob = Math.sin(time * 8) * 1.5;
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(x - 1, y - 55 + bob, 2, 5);
    ctx.fillRect(x - 1, y - 49 + bob, 2, 2);
  }
}

function drawPlate(renderer, device, time) {
  const ctx = renderer.ctx;
  const x = Math.round(device.x);
  const y = Math.round(device.y);
  const pressed = Boolean(device.pressed);
  const pulse = 0.6 + Math.sin(time * 3.2 + x * 0.03) * 0.2;

  // 这扇门要好几块石板一起踩住，而另一块已经亮了：
  // 没人踩的这块会一下一下地「招手」，让玩家知道该往哪儿站。
  const gate = (renderer.level.gates ?? []).find(
    (entry) => entry.mode === 'all' && entry.plates?.includes(device.id),
  );
  const beckon =
    gate &&
    !pressed &&
    gate.plates.some(
      (id) =>
        id !== device.id &&
        renderer.level.devices.find((entry) => entry.id === id)?.pressed,
    );

  ctx.save();
  ctx.translate(x, y);

  if (pressed) {
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, -4, 1, 0, -4, 24);
    glow.addColorStop(0, 'rgba(124, 236, 208, 0.2)');
    glow.addColorStop(1, 'rgba(124, 236, 208, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-26, -20, 52, 23);
    ctx.globalCompositeOperation = 'source-over';
  } else if (beckon) {
    ctx.globalCompositeOperation = 'lighter';
    const breathe = 0.5 + Math.sin(time * 4.6 + x * 0.02) * 0.5;
    const glow = ctx.createRadialGradient(0, -4, 1, 0, -4, 20);
    glow.addColorStop(0, `rgba(182, 255, 232, ${0.08 + breathe * 0.16})`);
    glow.addColorStop(1, 'rgba(182, 255, 232, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-22, -18, 44, 22);
    ctx.globalCompositeOperation = 'source-over';
  }

  // 嵌在地面里的旧石板
  ctx.fillStyle = '#17131b';
  ctx.fillRect(-13, -5, 26, 5);
  ctx.fillStyle = pressed ? '#3c5a52' : '#3a303c';
  ctx.fillRect(-12, -4, 24, 3);
  ctx.fillStyle = pressed ? '#7ce8c8' : '#5b4c5b';
  ctx.fillRect(-11, -4, 22, 1);

  // 石板中央的鬼面凹槽
  ctx.fillStyle = pressed ? '#0d2f2a' : '#171019';
  ctx.fillRect(-4, -4, 8, 2);
  ctx.fillRect(-3, -5, 6, 1);
  ctx.fillStyle = pressed ? '#b6ffe8' : '#6d5c6b';
  ctx.globalAlpha = pressed ? pulse : 0.6;
  ctx.fillRect(-3, -3, 1, 1);
  ctx.fillRect(2, -3, 1, 1);
  ctx.fillRect(-1, -2, 3, 1);
  ctx.globalAlpha = 1;

  // 两端的小石钉
  ctx.fillStyle = '#241c27';
  ctx.fillRect(-12, -5, 2, 2);
  ctx.fillRect(10, -5, 2, 2);
  ctx.restore();
}

/**
 * 铁门格子。门打开后格子本身会变回 '.'，这里只画关着的门。
 */
export function drawSneakGateTile(renderer, col, row) {
  const ctx = renderer.ctx;
  const x = col * T;
  const y = row * T;
  const above = renderer.level.getTile(col, row - 1);
  const below = renderer.level.getTile(col, row + 1);

  ctx.fillStyle = 'rgba(10, 8, 13, 0.4)';
  ctx.fillRect(x, y, T, T);

  // 竖栏
  ctx.fillStyle = '#211a25';
  ctx.fillRect(x + 3, y, 3, T);
  ctx.fillRect(x + 10, y, 3, T);
  ctx.fillStyle = '#4a3c4d';
  ctx.fillRect(x + 3, y, 1, T);
  ctx.fillRect(x + 10, y, 1, T);
  ctx.fillStyle = '#796a7c';
  ctx.fillRect(x + 3, y, 1, 2);
  ctx.fillRect(x + 10, y, 1, 2);

  // 横栏。相邻的门格会自然接上。
  ctx.fillStyle = '#241c2b';
  ctx.fillRect(x, y + 4, T, 2);
  ctx.fillRect(x, y + T - 6, T, 2);
  ctx.fillStyle = '#5a4a5f';
  ctx.fillRect(x, y + 4, T, 1);

  const pulse = 0.45 + Math.sin(performance.now() * 0.002 + x * 0.02) * 0.18;
  const gate = gateAtTile(renderer.level, col, row);
  const countsPlates = gate && gate.mode === 'all' && (gate.plates?.length ?? 0) > 1;
  if (countsPlates && row === gate.y + gate.h - 1) {
    // 要几块石板同时踩住的门，把符纹画成同等数量的印记：
    // 踩住一块就亮一枚，玩家不用猜这扇门到底在等什么。
    drawPlateSeals(ctx, x, y, gate, pulse);
  } else {
    // 一条发暗的青绿色符纹，提示这扇门认石板。
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#7cc9b0';
    ctx.fillRect(x + 7, y + 7, 2, 3);
    ctx.fillRect(x + 6, y + 10, 4, 1);
    ctx.fillRect(x + 7, y + 11, 2, 2);
    ctx.globalAlpha = 1;
  }

  if (above !== 'G') {
    ctx.fillStyle = '#2c2130';
    ctx.fillRect(x + 1, y, T - 2, 2);
    ctx.fillStyle = '#8b7a8e';
    ctx.fillRect(x + 4, y - 1, 2, 1);
    ctx.fillRect(x + 10, y - 1, 2, 1);
  }
  if (below !== 'G') {
    ctx.fillStyle = '#120d16';
    ctx.fillRect(x, y + T - 2, T, 2);
  }
}

/** 门格属于哪一扇门（影子桥不算）。 */
function gateAtTile(level, col, row) {
  for (const gate of level.gates ?? []) {
    if (gate.kind === 'bridge') continue;
    if (col < gate.x || col >= gate.x + gate.w) continue;
    if (row < gate.y || row >= gate.y + gate.h) continue;
    return gate;
  }
  return null;
}

/** 门底的一排小符：亮着的枚数 = 已经被踩住的石板数。 */
function drawPlateSeals(ctx, x, y, gate, pulse) {
  const total = gate.plates.length;
  const lit = gate.pressedCount ?? 0;
  const step = total > 3 ? 3 : 6;
  const startX = x + T / 2 - ((total - 1) * step) / 2;
  for (let index = 0; index < total; index += 1) {
    const px = Math.round(startX + index * step);
    const on = index < lit;
    ctx.globalAlpha = on ? 0.95 : 0.35 + pulse * 0.3;
    ctx.fillStyle = on ? '#b6ffe8' : '#356157';
    ctx.fillRect(px - 1, y + 8, 3, 4);
    ctx.fillRect(px, y + 7, 1, 1);
    ctx.fillRect(px, y + 12, 1, 1);
  }
  ctx.globalAlpha = 1;
}

/** 铁门上方的透明符障：淡淡地延伸到夜空，挡住想从头顶翻过去的小鬼。 */
export function drawSneakGateWard(renderer, col, row) {
  const ctx = renderer.ctx;
  const x = col * T;
  const y = row * T;
  const now = performance.now();
  const pulse = 0.68 + Math.sin(now * 0.0021 + row * 0.55 + col * 0.9) * 0.32;

  ctx.save();
  ctx.globalAlpha = 0.085 * pulse;
  ctx.fillStyle = '#7cc9b0';
  ctx.fillRect(x + 3, y, 1, T);
  ctx.fillRect(x + 10, y, 1, T);
  if ((row + col) % 4 === 0) {
    ctx.globalAlpha = 0.05 * pulse;
    ctx.fillRect(x, y + 7, T, 1);
  }
  // 偶尔从下往上飘一个很暗的符点。
  const mote = (row * 3 + Math.floor(now * 0.012)) % 11;
  ctx.globalAlpha = 0.11 * pulse;
  ctx.fillRect(x + 6 + (mote % 3), y + 2 + mote, 1, 1);
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** 影子桥的一格：半透明的暗紫色木板，边缘有细小的光。 */
export function drawSneakBridgeTile(renderer, col, row) {
  const ctx = renderer.ctx;
  const x = col * T;
  const y = row * T;
  const left = renderer.level.getTile(col - 1, row);
  const right = renderer.level.getTile(col + 1, row);
  const pulse = 0.65 + Math.sin(performance.now() * 0.003 + x * 0.03) * 0.15;

  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = 'rgba(24, 18, 34, 0.72)';
  ctx.fillRect(x, y, T, 5);

  const gloss = ctx.createLinearGradient(x, y, x, y + 5);
  gloss.addColorStop(0, `rgba(174, 146, 214, ${0.34 * pulse})`);
  gloss.addColorStop(0.45, 'rgba(110, 88, 150, 0.24)');
  gloss.addColorStop(1, 'rgba(48, 36, 70, 0.1)');
  ctx.fillStyle = gloss;
  ctx.fillRect(x + (left === 'S' ? 0 : 1), y, T - (left === 'S' ? 0 : 1) - (right === 'S' ? 0 : 1), 4);

  ctx.fillStyle = 'rgba(212, 193, 240, 0.62)';
  ctx.fillRect(x + 3, y, 5, 1);
  ctx.fillRect(x + 11, y + 1, 2, 1);
  ctx.fillStyle = 'rgba(255, 244, 211, 0.42)';
  ctx.fillRect(x + 7, y, 1, 1);

  // 桥下垂落的几缕影子。
  ctx.fillStyle = 'rgba(68, 48, 92, 0.4)';
  for (let index = 0; index < 3; index += 1) {
    const px = x + 3 + index * 5;
    const drop = 2 + ((Math.sin(performance.now() * 0.0015 + col + index) + 1) * 3);
    ctx.fillRect(px, y + 5, 1, drop);
  }
  ctx.restore();
}

/**
 * 两只鬼之间的影子线。
 *
 * 平时是一条松垮的虚线；按住 Space 时线绷紧、变亮，收线时还有光点
 * 往当桩的那个人那边跑。线的一端踩在另一端头顶上时，接触点会亮一下。
 */
export function drawSneakTether(renderer, game, time) {
  if (!game.player || !game.partner) return;
  const ctx = renderer.ctx;
  const rope = game.session?.sneak?.rope;
  const ax = game.player.centerX;
  const ay = game.player.feetY - 13;
  const bx = game.partner.centerX;
  const by = game.partner.feetY - 13;
  const distance = Math.hypot(bx - ax, by - ay);
  const upper =
    (game.player.standingOn && game.player) ||
    (game.partner.standingOn && game.partner) ||
    null;

  if (distance >= 16) {
    const active = Boolean(rope?.active);
    const taut = active && distance >= rope.length - 1;
    const sag = active
      ? Math.max(0, Math.min(14, (rope.length - distance) * 0.35))
      : Math.min(10, 6 + distance * 0.015);
    const dots = Math.max(8, Math.min(70, Math.floor(distance / 5)));

    ctx.save();
    if (active) ctx.globalCompositeOperation = 'lighter';
    for (let index = 0; index <= dots; index += 1) {
      const t = index / dots;
      const x = ax + (bx - ax) * t;
      const y = ay + (by - ay) * t + Math.sin(Math.PI * t) * sag;
      const wobble = taut ? Math.sin(time * 7.5 + index * 0.9) * 0.6 : 0;
      ctx.globalAlpha = active
        ? 0.5 + (index % 2) * 0.18
        : 0.1 + Math.sin(t * Math.PI) * 0.06;
      ctx.fillStyle = index % 2 === 0 ? '#a9e9ff' : '#ffd08a';
      ctx.fillRect(Math.round(x), Math.round(y + wobble), 1, 1);
    }

    // 收线时，光点从被拉的人那边流向当桩的人。
    if (active && rope.reeled) {
      const flow = (time * 1.6) % 1;
      for (let index = 0; index < 3; index += 1) {
        const t = (flow + index / 3) % 1;
        const x = ax + (bx - ax) * t;
        const y = ay + (by - ay) * t + Math.sin(Math.PI * t) * sag;
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = index === 0 ? '#ffffff' : '#bff5ff';
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // 两只手各握着一个线结。
  ctx.save();
  for (const [x, y, color] of [
    [ax, ay, '#9fe3ff'],
    [bx, by, '#ffcf8a'],
  ]) {
    ctx.globalAlpha = rope?.active ? 0.9 : 0.32;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // 踩在头顶上的接触点：一小圈被压出来的光。
  if (upper) {
    const lower = upper.standingOn;
    const cx = (upper.centerX + lower.centerX) / 2;
    const cy = lower.y - (lower.crouching ? 2 : 8);
    const pulse = 0.5 + Math.sin(time * 6) * 0.2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, 14);
    glow.addColorStop(0, `rgba(190, 240, 255, ${0.2 * pulse})`);
    glow.addColorStop(1, 'rgba(190, 240, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 14, cy - 14, 28, 28);
    ctx.globalAlpha = 0.6 * pulse;
    ctx.fillStyle = '#dff8ff';
    ctx.fillRect(Math.round(cx) - 5, Math.round(cy), 10, 1);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/** 屏幕层的冷色暗角，以及暴露时的红色边缘。 */
export function drawSneakAtmosphere(renderer, game, time) {
  if (game.mode !== 'sneak') return;
  const ctx = renderer.ctx;

  const vignette = ctx.createRadialGradient(
    VIEW.WIDTH / 2,
    VIEW.HEIGHT / 2,
    VIEW.WIDTH * 0.18,
    VIEW.WIDTH / 2,
    VIEW.HEIGHT / 2,
    VIEW.WIDTH * 0.62,
  );
  vignette.addColorStop(0, 'rgba(3, 8, 12, 0)');
  vignette.addColorStop(0.72, 'rgba(3, 8, 12, 0.16)');
  vignette.addColorStop(1, 'rgba(2, 5, 9, 0.48)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);

  const exposure = Math.max(
    game.player?.exposure ?? 0,
    game.partner?.exposure ?? 0,
  );
  if (exposure > 0.12) {
    const pulse = 0.55 + Math.sin(time * 10) * 0.45;
    const edge = ctx.createRadialGradient(
      VIEW.WIDTH / 2,
      VIEW.HEIGHT / 2,
      VIEW.WIDTH * 0.24,
      VIEW.WIDTH / 2,
      VIEW.HEIGHT / 2,
      VIEW.WIDTH * 0.64,
    );
    edge.addColorStop(0, 'rgba(255, 74, 58, 0)');
    edge.addColorStop(0.72, `rgba(214, 44, 38, ${0.04 + exposure * 0.1})`);
    edge.addColorStop(1, `rgba(150, 24, 22, ${(0.1 + exposure * 0.3) * pulse})`);
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);
  }
}
