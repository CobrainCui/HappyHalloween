/**
 * 「第三段 · 另一双脚步」的场景绘制：影子区、提灯人的灯、石板、铁门和影子桥。
 *
 * 另外一组函数专门画两个人之间的「谁在影响谁」：
 * 石板到门的压线、门上的小符、两个人头顶的暴露环、影子里的安全括角、
 * 出屏箭头，以及门口的两个灯位。所有函数都由 Renderer 调用，
 * 只读取 level / game，不改变游戏状态。
 */
import { VIEW } from './config.js';

const T = VIEW.TILE;
const WARM = '255, 203, 122';
const ALERT = '255, 96, 78';

/**
 * 这一套颜色就是一套语言，说的是「谁在起作用」，不是说两个人的长相：
 * 你青蓝、回音暖黄、南瓜橙色、安全的影子薄荷色。
 * 两个人的身体长得一模一样（回音只是半透明），身份全靠这套颜色分。
 */
const GHOST_TINT = ['126, 206, 255', '255, 196, 120'];
const PUMPKIN_TINT = '255, 148, 72';
const SAFE_TINT = '124, 236, 208';

function plateTint(plate) {
  if (!plate) return SAFE_TINT;
  if (plate.byPlayer >= 0) return GHOST_TINT[plate.byPlayer] ?? SAFE_TINT;
  if (plate.byPumpkin) return PUMPKIN_TINT;
  return SAFE_TINT;
}

export function drawSneakShadowZones(renderer, time) {
  const ctx = renderer.ctx;
  const level = renderer.level;
  if (!level.shadowZones?.length) return;

  for (const zone of level.shadowZones) {
    // 影子区要一眼看得出「这里能藏人」，所以给它清楚的深色轮廓，
    // 而不是只铺一层比夜色稍暗的灰。顶边是一道慢慢起伏的檐影，
    // 底下是更浓的黑；两者的交界就是「蹲进去就看不见」的界线。
    const gradient = ctx.createLinearGradient(0, zone.y - 10, 0, zone.y + zone.h);
    gradient.addColorStop(0, 'rgba(4, 7, 14, 0)');
    gradient.addColorStop(0.22, 'rgba(4, 7, 14, 0.46)');
    gradient.addColorStop(0.62, 'rgba(3, 5, 11, 0.7)');
    gradient.addColorStop(1, 'rgba(2, 4, 9, 0.86)');
    ctx.fillStyle = gradient;
    ctx.fillRect(zone.x, zone.y - 10, zone.w, zone.h + 10);

    // 顶边：一道起伏的冷色檐影，影子区之间一眼能分开。
    for (let x = 0; x < zone.w; x += 2) {
      const worldX = zone.x + x;
      const wave = Math.sin(time * 0.7 + worldX * 0.055) * 1.6;
      ctx.fillStyle = 'rgba(96, 150, 168, 0.16)';
      ctx.fillRect(Math.round(worldX), Math.round(zone.y - 3 + wave), 2, 1);
      ctx.fillStyle = 'rgba(8, 12, 20, 0.5)';
      ctx.fillRect(Math.round(worldX), Math.round(zone.y - 2 + wave), 2, 2);
    }

    // 悬在影子里的几道薄帘：慢慢左右摆，提示这块地方是「有厚度的」。
    for (let index = 0; index < Math.max(2, Math.floor(zone.w / 26)); index += 1) {
      const drift = Math.sin(time * 0.55 + index * 1.9 + zone.x * 0.01) * 2.5;
      const px = zone.x + 12 + index * 26 + drift;
      const sway = Math.sin(time * 0.9 + index * 2.3) * 1.5;
      ctx.fillStyle = 'rgba(30, 44, 58, 0.32)';
      for (let y = 0; y < zone.h - 4; y += 3) {
        ctx.fillRect(Math.round(px + sway * (y / zone.h)), Math.round(zone.y - 2 + y), 1, 2);
      }
    }

    // 底沿的一线冷光，像湿石头上反着的夜光。
    const breathe = 0.08 + Math.sin(time * 1.4 + zone.x * 0.02) * 0.025;
    ctx.fillStyle = `rgba(116, 168, 190, ${breathe})`;
    ctx.fillRect(zone.x + 2, zone.y + zone.h - 2, zone.w - 4, 1);
    ctx.fillStyle = 'rgba(3, 5, 11, 0.5)';
    ctx.fillRect(zone.x + 2, zone.y + zone.h - 1, zone.w - 4, 1);

    // 影子里慢慢游的尘。
    for (let index = 0; index < zone.w / 14; index += 1) {
      const x = zone.x + 6 + index * 14;
      const y = zone.y + zone.h - 3 - Math.sin(time * 0.9 + index * 1.7 + zone.x) * 2;
      ctx.fillStyle = 'rgba(132, 186, 200, 0.32)';
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }
}

/**
 * 石板和它那扇门之间的「压线」。
 *
 * 石板离门往往隔着半个院子，光靠提示文字玩家很难把两者连起来。
 * 这里在地面上铺一条很暗的虚线，谁压住石板，线就从石板亮起来、
 * 一路流到门口；两根线同时亮，门才起。门开过以后线还在，
 * 只是变成很淡的一层，提醒「这扇门是那块石板开的」。
 */
export function drawSneakPlateLinks(renderer, game, time) {
  const ctx = renderer.ctx;
  const level = renderer.level;
  const gates = level.gates ?? [];
  if (!gates.length) return;
  const plates = level.devices.filter((device) => device.type === 'plate');
  if (!plates.length) return;

  ctx.save();
  for (const gate of gates) {
    if (!gate.plates?.length) continue;
    const gx = (gate.x + gate.w / 2) * T;
    // 铁门的门槛在门格最底下；影子桥是一格厚的地板，走的那一面就是它自己那一行。
    const gy = gate.kind === 'bridge' ? gate.y * T : (gate.y + gate.h) * T;

    for (const id of gate.plates) {
      const plate = plates.find((entry) => entry.id === id);
      if (!plate) continue;
      const dx = gx - plate.x;
      if (Math.abs(dx) < 8 && Math.abs(gy - plate.y) < 8) continue;
      const lit = Boolean(plate.pressed);
      const tint = plateTint(plate);
      const sag =
        gate.kind === 'bridge' ? 2 : Math.min(9, 3 + Math.abs(dx) * 0.03);
      const dots = Math.max(6, Math.min(52, Math.floor(Math.hypot(dx, gy - plate.y) / 6)));
      const dim = gate.latched || gate.open ? 0.5 : 1;

      // 线本身：一排冷色点，压住后换成压秤人的颜色。
      // 亮着的线用 2px 宽，在这条很暗的夜路上才真的看得见。
      for (let index = 0; index <= dots; index += 1) {
        const t = index / dots;
        const x = plate.x + dx * t;
        const y = plate.y + (gy - plate.y) * t + Math.sin(Math.PI * t) * sag;
        const edge = Math.sin(Math.PI * t);
        ctx.globalAlpha = lit
          ? (0.5 + edge * 0.45) * dim
          : (0.16 + edge * 0.12) * dim;
        ctx.fillStyle = lit ? `rgb(${tint})` : `rgb(${SAFE_TINT})`;
        ctx.fillRect(Math.round(x), Math.round(y) - 1, lit ? 2 : 1, 1);
      }

      // 压住以后，光点从石板往门口流。
      if (lit) {
        ctx.globalCompositeOperation = 'lighter';
        for (let index = 0; index < 3; index += 1) {
          const t = (time * 0.32 + index / 3 + plate.x * 0.001) % 1;
          const x = plate.x + dx * t;
          const y = plate.y + (gy - plate.y) * t + Math.sin(Math.PI * t) * sag;
          ctx.globalAlpha = (0.62 + 0.35 * Math.sin(Math.PI * t)) * dim;
          ctx.fillStyle = `rgb(${tint})`;
          ctx.fillRect(Math.round(x), Math.round(y) - 1, 2, 2);
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // 门脚的一枚小石印：门开着、门格已经不在了，这里还记着是哪块石板开的。
    const marks = gate.plates.map((id) => plates.find((entry) => entry.id === id));
    const step = 7;
    const startX = gx - ((marks.length - 1) * step) / 2;
    const opened = gate.open || gate.latched;

    // 站在远处的石板上，门那头的门格会亮起一道同色的光柱。
    // 这是整条赛道上最远的两个装置，光柱负责把「你压的那块」和「那扇门」连起来。
    if (!opened && gate.kind !== 'bridge') {
      ctx.globalCompositeOperation = 'lighter';
      marks.forEach((plate, index) => {
        if (!plate?.pressed) return;
        const tint = plateTint(plate);
        const bx = gx + (index - (marks.length - 1) / 2) * 6;
        const pulse = 0.7 + Math.sin(time * 3.6 + index * 1.7) * 0.3;
        const grad = ctx.createLinearGradient(bx, gy - 66, bx, gy);
        grad.addColorStop(0, `rgba(${tint}, 0)`);
        grad.addColorStop(0.6, `rgba(${tint}, ${0.12 * pulse})`);
        grad.addColorStop(1, `rgba(${tint}, ${0.3 * pulse})`);
        ctx.fillStyle = grad;
        ctx.fillRect(bx - 5, gy - 66, 10, 66);
        // 中间更亮的一根芯，让门像真的被点亮了。
        ctx.globalAlpha = 0.35 + pulse * 0.35;
        ctx.fillStyle = `rgb(${tint})`;
        ctx.fillRect(bx, gy - 46, 1, 46);
        ctx.globalAlpha = 1;
        // 门框两侧的微光，越往上越淡，不像画了一个方框。
        const edgeGrad = ctx.createLinearGradient(bx, gy - 64, bx, gy);
        edgeGrad.addColorStop(0, `rgba(${tint}, 0)`);
        edgeGrad.addColorStop(1, `rgba(${tint}, ${0.34 * pulse})`);
        ctx.globalAlpha = 1;
        ctx.fillStyle = edgeGrad;
        ctx.fillRect(bx - 6, gy - 64, 1, 64);
        ctx.fillRect(bx + 5, gy - 64, 1, 64);
        ctx.fillStyle = `rgba(${tint}, ${0.4 * pulse})`;
        ctx.fillRect(bx - 6, gy - 1, 12, 1);
        for (let k = 0; k < 3; k += 1) {
          const rise = (time * 0.5 + k / 3 + index * 0.21) % 1;
          ctx.globalAlpha = (1 - rise) * 0.55 * pulse;
          ctx.fillStyle = `rgb(${tint})`;
          ctx.fillRect(Math.round(bx + (k - 1) * 2), Math.round(gy - rise * 60), 1, 1);
        }
      });
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    // 门槛上的一条旧石槽，开过门以后也留在门口，不会跟着门格一起消失。
    const barX = Math.round(startX) - 6;
    const barW = (marks.length - 1) * step + 12;
    const barY = Math.round(gy) - 7;

    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#0a1418';
    ctx.fillRect(barX, barY, barW, 7);
    ctx.fillRect(barX - 1, barY + 2, 1, 5);
    ctx.fillRect(barX + barW, barY + 2, 1, 5);
    ctx.globalAlpha = 0.2 + (opened ? 0.16 : 0);
    ctx.fillStyle = `rgb(${SAFE_TINT})`;
    ctx.fillRect(barX, barY, barW, 1);

    for (let index = 0; index < marks.length; index += 1) {
      const plate = marks[index];
      const tint = opened ? SAFE_TINT : plateTint(plate);
      const on = opened || plate?.pressed;
      const pulse = 0.6 + Math.sin(time * 3.4 + index * 1.4) * 0.25;
      const px = Math.round(startX + index * step);
      ctx.globalAlpha = on ? 0.65 + pulse * 0.35 : 0.3;
      ctx.fillStyle = `rgb(${tint})`;
      // 一枚嵌进石槽的小灯：底下宽一点，像被石头压着。
      ctx.fillRect(px - 1, barY + 2, 3, 4);
      ctx.fillRect(px - 2, barY + 5, 5, 1);
      if (on) {
        ctx.globalAlpha = 0.18 + pulse * 0.18;
        ctx.fillRect(px - 3, barY + 1, 7, 6);
      }
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
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

  // 潜行时灯的有效范围会缩到 34%，半角也缩一半。
  // 在灯锥里画一条更暗的「蹲下界线」，玩家能看见蹲下以后从哪儿开始就安全。
  const safeRange = range * 0.34;
  const safeHalf = half * 0.5;
  ctx.strokeStyle = `rgba(${tint}, 0.46)`;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.arc(originX, originY, safeRange, angle - safeHalf, angle + safeHalf);
  ctx.stroke();
  ctx.beginPath();
  for (const side of [-1, 1]) {
    const edge = angle + safeHalf * side;
    ctx.moveTo(
      originX + Math.cos(edge) * 3,
      originY + Math.sin(edge) * 3,
    );
    ctx.lineTo(
      originX + Math.cos(edge) * safeRange,
      originY + Math.sin(edge) * safeRange,
    );
  }
  ctx.stroke();
  ctx.setLineDash([]);

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

  // 提灯人的身体：厚外套、尖帽、提灯。
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
  const tint = pressed ? plateTint(device) : SAFE_TINT;
  const pulse = 0.6 + Math.sin(time * 3.2 + x * 0.03) * 0.2;
  const radius = device.radius ?? 15;

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

  // 地面上的「重量圈」：石板认的是这一圈里的脚和南瓜。
  // 平时是一圈很淡的虚线，压住以后整圈亮起来，玩家能看懂判定范围。
  const ringDots = 18;
  for (let index = 0; index < ringDots; index += 1) {
    const angle = (index / ringDots) * Math.PI * 2;
    const rx = Math.cos(angle) * (radius + 3);
    const ry = Math.sin(angle) * 3.4;
    ctx.globalAlpha = pressed
      ? 0.35 + pulse * 0.4
      : beckon
        ? 0.18 + pulse * 0.2
        : 0.1;
    ctx.fillStyle = `rgb(${beckon ? SAFE_TINT : tint})`;
    ctx.fillRect(Math.round(rx), Math.round(ry) - 1, 1, 1);
  }
  ctx.globalAlpha = 1;

  if (pressed) {
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, -4, 1, 0, -4, 24);
    glow.addColorStop(0, `rgba(${tint}, 0.2)`);
    glow.addColorStop(1, `rgba(${tint}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(-26, -20, 52, 23);
    ctx.globalCompositeOperation = 'source-over';
  } else if (beckon) {
    ctx.globalCompositeOperation = 'lighter';
    const breathe = 0.5 + Math.sin(time * 4.6 + x * 0.02) * 0.5;
    const glow = ctx.createRadialGradient(0, -4, 1, 0, -4, 20);
    glow.addColorStop(0, `rgba(${SAFE_TINT}, ${0.08 + breathe * 0.16})`);
    glow.addColorStop(1, `rgba(${SAFE_TINT}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(-22, -18, 44, 22);
    ctx.globalCompositeOperation = 'source-over';
  }

  // 嵌在地面里的旧石板
  ctx.fillStyle = '#17131b';
  ctx.fillRect(-13, -5, 26, 5);
  ctx.fillStyle = pressed ? '#3c5a52' : '#3a303c';
  ctx.fillRect(-12, -4, 24, 3);
  ctx.fillStyle = pressed ? `rgb(${tint})` : '#5b4c5b';
  ctx.fillRect(-11, -4, 22, 1);

  // 石板中央的鬼面凹槽
  ctx.fillStyle = pressed ? '#0d2f2a' : '#171019';
  ctx.fillRect(-4, -4, 8, 2);
  ctx.fillRect(-3, -5, 6, 1);
  ctx.fillStyle = pressed ? '#e6fff7' : '#6d5c6b';
  ctx.globalAlpha = pressed ? pulse : 0.6;
  ctx.fillRect(-3, -3, 1, 1);
  ctx.fillRect(2, -3, 1, 1);
  ctx.fillRect(-1, -2, 3, 1);
  ctx.globalAlpha = 1;

  // 两端的小石钉
  ctx.fillStyle = '#241c27';
  ctx.fillRect(-12, -5, 2, 2);
  ctx.fillRect(10, -5, 2, 2);

  // 压住以后，从石板上冒几粒「重量」的碎光。
  if (pressed) {
    ctx.globalCompositeOperation = 'lighter';
    for (let index = 0; index < 3; index += 1) {
      const rise = (time * 0.9 + index * 0.33) % 1;
      const px = -7 + index * 7 + Math.sin(time * 2 + index) * 1.5;
      const py = -4 - rise * 12;
      ctx.globalAlpha = (1 - rise) * 0.75;
      ctx.fillStyle = `rgb(${tint})`;
      ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // 「招手」的箭头：另一块已经压住了，这一块在等人。
  if (beckon) {
    const bob = Math.sin(time * 4.6) * 1.5;
    const alpha = 0.6 + Math.sin(time * 4.6) * 0.35;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgb(${SAFE_TINT})`;
    ctx.fillRect(-4, Math.round(-16 + bob), 9, 1);
    ctx.fillRect(-3, Math.round(-18 + bob), 7, 1);
    ctx.fillRect(-2, Math.round(-20 + bob), 5, 1);
    ctx.fillRect(-1, Math.round(-22 + bob), 3, 1);
    // 从箭头往下的一串小点，把视线引到石板上。
    ctx.globalAlpha = alpha * 0.55;
    for (let index = 0; index < 3; index += 1) {
      ctx.fillRect(0, Math.round(-12 + bob) + index * 3, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

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
  const countsPlates = gate && (gate.plates?.length ?? 0) > 0;
  if (countsPlates && row === gate.y + gate.h - 1) {
    // 要石板压住的门，把符纹画成和石板数量相同的印记：
    // 谁压住一块，对应的那枚就亮成他的颜色（你青蓝 / 回音暖黄 / 南瓜橙）。
    // 玩家在门口就能对上「还差哪一块」。
    drawPlateSeals(ctx, x, y, gate, pulse, renderer.level);
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

/** 门底的一排小符：亮着的枚数 = 已经被踩住的石板数，颜色 = 压秤的是谁。 */
function drawPlateSeals(ctx, x, y, gate, pulse, level) {
  const plates = gate.plates.map((id) =>
    level.devices.find((device) => device.id === id),
  );
  const total = plates.length;
  const step = total > 3 ? 4 : 6;
  const startX = x + T / 2 - ((total - 1) * step) / 2;
  // 底下垫一条暗槽，未亮的印记不会和铁门花纹糊在一起。
  ctx.fillStyle = 'rgba(6, 14, 18, 0.7)';
  ctx.fillRect(Math.round(startX) - 4, y + 6, (total - 1) * step + 8, 8);
  for (let index = 0; index < total; index += 1) {
    const plate = plates[index];
    const px = Math.round(startX + index * step);
    const on = Boolean(plate?.pressed) || gate.latched || gate.open;
    const tint = gate.latched || gate.open ? SAFE_TINT : plateTint(plate);
    ctx.globalAlpha = on ? 0.95 : 0.32 + pulse * 0.28;
    ctx.fillStyle = on ? `rgb(${tint})` : '#356157';
    ctx.fillRect(px - 1, y + 8, 3, 4);
    ctx.fillRect(px, y + 7, 1, 1);
    ctx.fillRect(px, y + 12, 1, 1);
    if (on) {
      ctx.globalAlpha = 0.25 + pulse * 0.25;
      ctx.fillRect(px - 2, y + 7, 5, 6);
    }
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
  const [a, b] = [game.player, game.partner];
  const ax = a.centerX;
  const ay = a.feetY - 13;
  const bx = b.centerX;
  const by = b.feetY - 13;
  const distance = Math.hypot(bx - ax, by - ay);
  const held = Boolean(rope?.held);
  const active = Boolean(rope?.active);
  const inRange = Boolean(rope?.inRange ?? true);
  const stacked = Boolean(a.standingOn || b.standingOn);
  const upper = a.standingOn ? a : b.standingOn ? b : null;

  // 够不着但又按着 Space：不再只弹一次提示，就在两个人中间画一根断掉的线。
  const broken = held && !inRange && !stacked;

  if (distance >= 16 && !broken) {
    const taut = active && distance >= rope.length - 1;
    const sag = active
      ? Math.max(0, Math.min(14, (rope.length - distance) * 0.35))
      : Math.min(10, 6 + distance * 0.015);
    const dots = Math.max(10, Math.min(90, Math.floor(distance / 3)));
    const pointAt = (t) => ({
      x: ax + (bx - ax) * t,
      y: ay + (by - ay) * t + Math.sin(Math.PI * t) * sag,
    });

    ctx.save();
    // 底线：一排 1px 的点，前一半是你的青蓝，后一半是回音的暖黄。
    // 按住 Space 时线变两像素粗，在黑背景里也能一眼看见。
    for (let index = 0; index <= dots; index += 1) {
      const t = index / dots;
      const point = pointAt(t);
      const wobble = taut ? Math.sin(time * 7.5 + index * 0.45) * 0.6 : 0;
      ctx.globalAlpha = active
        ? 0.8
        : 0.12 + Math.sin(t * Math.PI) * 0.07;
      ctx.fillStyle = `rgb(${t < 0.5 ? GHOST_TINT[0] : GHOST_TINT[1]})`;
      ctx.fillRect(Math.round(point.x), Math.round(point.y + wobble), 1, active ? 2 : 1);
    }

    if (active) {
      // 线上再叠一层很淡的光，绷紧时有金属丝的感觉。
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.12;
      for (let index = 0; index <= dots; index += 3) {
        const t = index / dots;
        const point = pointAt(t);
        ctx.fillStyle = `rgb(${t < 0.5 ? GHOST_TINT[0] : GHOST_TINT[1]})`;
        ctx.fillRect(Math.round(point.x), Math.round(point.y), 1, 2);
      }

      // 收线时，光点从被拉的人那边流向当桩的人。
      if (rope.reeled) {
        const flow = (time * 1.6) % 1;
        const otherIsA = (rope.otherIndex ?? 1) === 0;
        for (let index = 0; index < 3; index += 1) {
          const raw = (flow + index / 3) % 1;
          const t = otherIsA ? raw : 1 - raw;
          const point = pointAt(t);
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = index === 0 ? '#ffffff' : `rgb(${SAFE_TINT})`;
          ctx.fillRect(Math.round(point.x), Math.round(point.y), 1, 1);
        }
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  if (broken) {
    // 两头各留一小截线，最后在中间断掉：中间空出来，两端各带一个收口。
    ctx.save();
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const reach = Math.min(0.3, 24 / Math.max(1, distance));
    for (const [sx, sy, ex, ey, tint] of [
      [ax, ay, ax + (bx - ax) * reach, ay + (by - ay) * reach, GHOST_TINT[0]],
      [bx, by, bx + (ax - bx) * reach, by + (ay - by) * reach, GHOST_TINT[1]],
    ]) {
      for (let index = 0; index <= 10; index += 1) {
        const t = index / 10;
        ctx.globalAlpha = 0.34 * (1 - t * 0.55);
        ctx.fillStyle = `rgb(${tint})`;
        ctx.fillRect(
          Math.round(sx + (ex - sx) * t),
          Math.round(sy + (ey - sy) * t),
          1,
          1,
        );
      }
    }
    // 断口：两枚小竖线，中间留空，一下一下地闪。
    const pulse = 0.55 + Math.sin(time * 6) * 0.35;
    ctx.globalAlpha = 0.35 + pulse * 0.4;
    ctx.fillStyle = `rgb(${ALERT})`;
    ctx.fillRect(Math.round(mx) - 3, Math.round(my) - 2, 1, 5);
    ctx.fillRect(Math.round(mx) + 2, Math.round(my) - 2, 1, 5);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // 两只手各握着一个线结。
  ctx.save();
  for (const [x, y, color] of [
    [ax, ay, GHOST_TINT[0]],
    [bx, by, GHOST_TINT[1]],
  ]) {
    ctx.globalAlpha = active ? 0.95 : broken ? 0.35 : 0.32;
    ctx.fillStyle = `rgb(${color})`;
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // 当桩的那只鬼：脚下钉着一圈地面光，头顶挂一枚小小的锚。
  if (active && (rope.anchorIndex ?? -1) >= 0) {
    const anchor = rope.anchorIndex === 0 ? a : b;
    const tint = GHOST_TINT[rope.anchorIndex];
    const cx = Math.round(anchor.centerX);
    const fy = Math.round(anchor.feetY);
    const pulse = 0.6 + Math.sin(time * 5) * 0.25;

    ctx.save();
    // 地面上的桩圈
    ctx.globalAlpha = 0.3 + pulse * 0.25;
    ctx.fillStyle = `rgb(${tint})`;
    for (let index = 0; index < 12; index += 1) {
      const angle = (index / 12) * Math.PI * 2;
      ctx.fillRect(
        Math.round(cx + Math.cos(angle) * 9),
        Math.round(fy - 1 + Math.sin(angle) * 2.4),
        1,
        1,
      );
    }
    // 头顶一枚向下的三角：这根桩就钉在脚下，线往这里收。
    const top = Math.round(anchor.feetY - 39);
    ctx.globalAlpha = 0.5 + pulse * 0.4;
    ctx.fillRect(cx - 3, top, 7, 1);
    ctx.fillRect(cx - 2, top + 1, 5, 1);
    ctx.fillRect(cx - 1, top + 2, 3, 1);
    ctx.fillRect(cx, top + 3, 1, 1);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // 踩在头顶上的接触点：一小圈被压出来的光。
  // 下面的人蹲着时，这里同时是「蓄力弹跳就绪」的提示：
  // 接触点冒弹簧光，上面的人头顶浮起一串向上的箭头。
  if (upper) {
    const lower = upper.standingOn;
    const lowerIndex = lower === a ? 0 : 1;
    const cx = (upper.centerX + lower.centerX) / 2;
    const cy = lower.y - (lower.crouching ? 2 : 8);
    const pulse = 0.5 + Math.sin(time * (lower.crouching ? 9 : 6)) * 0.2;
    const tint = lower.crouching ? GHOST_TINT[lowerIndex] : '190, 240, 255';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, 14);
    glow.addColorStop(0, `rgba(${tint}, ${0.2 * pulse})`);
    glow.addColorStop(1, `rgba(${tint}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 14, cy - 14, 28, 28);
    ctx.globalAlpha = 0.6 * pulse;
    ctx.fillStyle = `rgb(${tint})`;
    ctx.fillRect(Math.round(cx) - 5, Math.round(cy), 10, 1);
    ctx.restore();
    ctx.globalAlpha = 1;

    if (lower.crouching) {
      // 弹簧就绪：接触点两道弧，上面的人头顶三枚往上走的箭头。
      ctx.save();
      ctx.globalAlpha = 0.5 + pulse * 0.4;
      ctx.fillStyle = `rgb(${tint})`;
      ctx.fillRect(Math.round(cx) - 6, Math.round(cy) + 2, 13, 1);
      ctx.fillRect(Math.round(cx) - 3, Math.round(cy) + 5, 7, 1);
      const top = Math.round(upper.feetY - upper.h - 8);
      // 叠罗汉时上面那只鬼会被画偏 8px，箭头也跟着画偏，免得浮在两个人中间。
      const arrowX = Math.round(upper.centerX - 8 * upper.facing);
      for (let index = 0; index < 3; index += 1) {
        const rise = ((time * 1.8 + index * 0.33) % 1) * 10;
        ctx.globalAlpha = (1 - rise / 10) * 0.8;
        const px = arrowX;
        const py = Math.round(top - rise);
        ctx.fillRect(px - 2, py, 5, 1);
        ctx.fillRect(px - 1, py - 1, 3, 1);
        ctx.fillRect(px, py - 2, 1, 1);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * 每只鬼身边的读数：暴露环、影子里的安全括角、以及「哪盏灯在看你」的视线。
 * 这些都是两个人互相看得见的信息，不能只藏在右上角的面板里。
 */
export function drawSneakPlayerReadouts(renderer, game, time) {
  if (!game.level?.sneak || !game.player || !game.partner) return;
  const ctx = renderer.ctx;
  const camX = Math.round(game.camera.x);
  const camY = Math.round(game.camera.y);
  const players = [game.player, game.partner];

  ctx.save();
  ctx.translate(-camX, -camY);

  players.forEach((player, index) => {
    const tint = GHOST_TINT[index];
    const cx = Math.round(player.centerX);
    const cy = Math.round(player.centerY - 2);
    const exposure = Math.max(0, Math.min(1, player.exposure ?? 0));

    // 哪盏灯在看你：从灯口到鬼心，一条断续的红线。
    // 这样「被看见」不只是头顶一个感叹号，而是连到具体的提灯人。
    if (player.seen && player.seenBy) {
      const sx = player.seenBy.x;
      const sy = player.seenBy.y - 30;
      const span = Math.hypot(cx - sx, cy - sy);
      const dots = Math.min(30, Math.max(4, Math.floor(span / 10)));
      ctx.save();
      for (let i = 1; i <= dots; i += 1) {
        const t = i / dots;
        const x = sx + (cx - sx) * t;
        const y = sy + (cy - sy) * t;
        const shimmer = 0.5 + Math.sin(time * 8 - i * 0.7) * 0.5;
        ctx.globalAlpha = 0.08 + shimmer * 0.15;
        ctx.fillStyle = `rgb(${ALERT})`;
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // 暴露环：围着鬼转一圈的弧，越长越危险。
    // 面板里的条子只有一个，这里两只鬼各有一个，分开站也看得清是谁快被照到。
    if (exposure > 0.03 || player.seen) {
      const radius = 15;
      const turn = -Math.PI / 2;
      const color =
        exposure > 0.82 ? ALERT : exposure > 0.55 ? '255, 179, 71' : '255, 224, 138';
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = `rgb(${tint})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = player.seen ? 0.85 : 0.6;
      ctx.strokeStyle = `rgb(${color})`;
      ctx.lineWidth = player.seen ? 2 : 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, turn, turn + Math.PI * 2 * exposure);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // 被灯照到：头顶一枚越来越红、越闪越快的感叹号。
    // 两个人都画——以前只有回音头上冒这个，现在谁快被看见，谁的头上就亮。
    if (exposure > 0.12) {
      const blink = 0.6 + Math.sin(time * (8 + exposure * 14)) * 0.4;
      const shiftX = player.standingOn ? -8 * player.facing : 0;
      const x = Math.round(player.centerX + shiftX);
      const y = Math.round(player.feetY) - 38;
      ctx.save();
      ctx.globalAlpha = (0.45 + exposure * 0.55) * blink;
      ctx.fillStyle =
        exposure > 0.65 ? `rgb(${ALERT})` : exposure > 0.35 ? '#ffb347' : '#ffe08a';
      ctx.fillRect(x - 1, y, 2, 5);
      ctx.fillRect(x - 1, y + 6, 2, 2);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // 藏在影子里：四个薄荷色括角，告诉你现在是安全的。
    // 不用太暗——玩家得始终看得见自己，安全状态靠括角说，而不是把人藏没。
    if (player.hidden && exposure < 0.2) {
      const pulse = 0.52 + Math.sin(time * 2.4 + index) * 0.16;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = `rgb(${SAFE_TINT})`;
      const left = cx - 12;
      const right = cx + 12;
      const top = cy - 15;
      const bottom = cy + 15;
      for (const [x, y, dx, dy] of [
        [left, top, 1, 1],
        [right, top, -1, 1],
        [left, bottom, 1, -1],
        [right, bottom, -1, -1],
      ]) {
        ctx.fillRect(x, y, 3 * dx, 1);
        ctx.fillRect(x, y, 1, 3 * dy);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  });

  ctx.restore();

  // 有谁出了画面：在屏幕边缘留一枚同色的箭头，方向就是他在的那边。
  // 两个人各看各的颜色，不会把同伴和自己弄混。
  // 边界要用镜头当前能看到的范围，手机端放大了镜头，屏幕会窄一些。
  const viewWidth = renderer.viewWidth ?? VIEW.WIDTH;
  const viewHeight = renderer.viewHeight ?? VIEW.HEIGHT;
  const margin = 14;
  players.forEach((actor, index) => {
    const sx = actor.centerX - camX;
    const sy = actor.centerY - camY;
    if (!(sx < -4 || sx > viewWidth + 4 || sy < -4 || sy > viewHeight + 4)) return;
    const px = Math.max(margin, Math.min(viewWidth - margin, sx));
    const py = Math.max(margin, Math.min(viewHeight - margin, sy));
    const horizontal = sx < -4 || sx > viewWidth + 4;
    const dir = horizontal
      ? Math.sign(sx - viewWidth / 2) || 1
      : Math.sign(sy - viewHeight / 2) || 1;
    const pulse = 0.6 + Math.sin(time * 3.2 + index) * 0.25;
    ctx.save();
    ctx.globalAlpha = 0.5 + pulse * 0.4;
    ctx.fillStyle = `rgb(${GHOST_TINT[index]})`;
    if (horizontal) {
      ctx.fillRect(px, py - 4, 2, 9);
      ctx.fillRect(px + dir * 2, py - 3, 2, 7);
      ctx.fillRect(px + dir * 4, py - 2, 2, 5);
    } else {
      ctx.fillRect(px - 4, py, 9, 2);
      ctx.fillRect(px - 3, py + dir * 2, 7, 2);
      ctx.fillRect(px - 2, py + dir * 4, 5, 2);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  });
}

/**
 * 门口的两个灯位：一个鬼一格。
 * 「两个人都到才算数」不再只是提示文字：谁到了，门边石牌上属于他的那盏就亮。
 *
 * 石牌放在门的左脚边，不放门楣：后几段门会出现在很高或很靠右的地方，
 * 门楣上的东西容易被右上角的面板盖住，放在地面这一层永远看得见。
 */
export function drawSneakGoalState(renderer, game, time) {
  const level = renderer.level;
  const ctx = renderer.ctx;
  const gx = Math.round(level.goalX);
  const baseY = Math.round(renderer.goalBaseY());
  const camY = renderer.cameraY ?? 0;
  if (baseY < camY - 90 || baseY > camY + VIEW.HEIGHT + 90) return;
  const ready = game.session?.sneak?.goalReady ?? [false, false];
  const pulse = 0.65 + Math.sin(time * 2.4) * 0.25;

  ctx.save();
  ctx.translate(gx - 34, baseY - 7);

  // 门边的一块旧石牌，两个小鬼形的灯位嵌在石槽里。
  ctx.fillStyle = 'rgba(8, 18, 20, 0.9)';
  ctx.fillRect(-16, 0, 32, 7);
  ctx.fillRect(-17, 2, 1, 5);
  ctx.fillRect(16, 2, 1, 5);
  ctx.fillStyle = 'rgba(124, 236, 208, 0.24)';
  ctx.fillRect(-16, 0, 32, 1);

  for (let index = 0; index < 2; index += 1) {
    const cx = -8 + index * 16;
    const tint = GHOST_TINT[index];
    const on = Boolean(ready[index]);
    // 没到的那个也留着同色的暗影，颜色不丢，只是暗下去。
    ctx.globalAlpha = on ? 0.92 : 0.3;
    ctx.fillStyle = `rgb(${tint})`;
    // 小鬼形灯位：圆头、肩膀、三片下摆，底下踩在石槽上。
    ctx.fillRect(cx - 2, -9, 5, 3);
    ctx.fillRect(cx - 3, -6, 7, 4);
    ctx.fillRect(cx - 2, -2, 2, 2);
    ctx.fillRect(cx, -2, 2, 2);
    ctx.fillRect(cx + 2, -2, 2, 2);
    if (on) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.18 + pulse * 0.3;
      ctx.fillRect(cx - 5, -11, 11, 12);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = on ? 1 : 0.4;
    ctx.fillStyle = on ? '#0b1a1a' : 'rgba(10, 24, 22, 0.75)';
    ctx.fillRect(cx - 1, -8, 1, 1);
    ctx.fillRect(cx + 1, -8, 1, 1);
  }
  ctx.globalAlpha = 1;

  // 只到了一个：亮着的那格头顶浮一颗小光点，提醒另一个还没来。
  if (ready.some(Boolean) && !ready.every(Boolean)) {
    const waiting = ready[0] ? 0 : 1;
    const cx = -8 + waiting * 16;
    const bob = Math.sin(time * 3) * 1.5;
    ctx.globalAlpha = 0.4 + pulse * 0.4;
    ctx.fillStyle = `rgb(${GHOST_TINT[waiting]})`;
    ctx.fillRect(cx, Math.round(-15 + bob), 1, 3);
    ctx.fillRect(cx - 1, Math.round(-12 + bob), 3, 1);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/** 屏幕层的冷色暗角，以及暴露时的红色边缘。 */
export function drawSneakAtmosphere(renderer, game, time) {
  if (!game.level?.sneak) return;
  const ctx = renderer.ctx;
  const viewWidth = renderer.viewWidth ?? VIEW.WIDTH;
  const viewHeight = renderer.viewHeight ?? VIEW.HEIGHT;

  const vignette = ctx.createRadialGradient(
    viewWidth / 2,
    viewHeight / 2,
    viewWidth * 0.18,
    viewWidth / 2,
    viewHeight / 2,
    viewWidth * 0.62,
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
      viewWidth / 2,
      viewHeight / 2,
      viewWidth * 0.24,
      viewWidth / 2,
      viewHeight / 2,
      viewWidth * 0.64,
    );
    edge.addColorStop(0, 'rgba(255, 74, 58, 0)');
    edge.addColorStop(0.72, `rgba(214, 44, 38, ${0.04 + exposure * 0.1})`);
    edge.addColorStop(1, `rgba(150, 24, 22, ${(0.1 + exposure * 0.3) * pulse})`);
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);
  }
}
