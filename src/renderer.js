import { PALETTE, VIEW } from './config.js';
import { getItemDef } from './collectibles.js';
import {
  drawSneakAtmosphere,
  drawSneakBridgeTile,
  drawSneakDevice,
  drawSneakGateTile,
  drawSneakGateWard,
  drawSneakShadowZones,
  drawSneakTether,
} from './sneakDraw.js';

const T = VIEW.TILE;

function hash(col, row) {
  const value = Math.sin(col * 127.1 + row * 311.7 + 17.3) * 43758.5453;
  return value - Math.floor(value);
}

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

export class Renderer {
  constructor(canvas, level, particles) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.level = level;
    this.particles = particles;

    const random = seededRandom(20261031);

    this.stars = Array.from({ length: 76 }, () => ({
      x: random() * (VIEW.WIDTH + 80),
      y: 8 + random() * 142,
      size: random() < 0.16 ? 2 : 1,
      phase: random() * Math.PI * 2,
      speed: 0.7 + random() * 1.5,
    }));

    this.clouds = Array.from({ length: 3 }, (_, index) => ({
      x: random() * VIEW.WIDTH,
      y: 52 + index * 35 + random() * 16,
      width: 48 + random() * 52,
      speed: 2.4 + random() * 2.2,
      alpha: 0.1 + random() * 0.08,
    }));

    this.bats = Array.from({ length: 4 }, () => ({
      x: random() * VIEW.WIDTH,
      y: 38 + random() * 74,
      speed: 7 + random() * 8,
      phase: random() * Math.PI * 2,
      scale: random() < 0.5 ? 1 : 1.5,
    }));

    const fireflyCount = level.pixelHeight > 400 ? 58 : 34;
    this.fireflies = Array.from({ length: fireflyCount }, () => ({
      x: random() * level.pixelWidth,
      y: 52 + random() * Math.max(100, level.pixelHeight - 120),
      phase: random() * Math.PI * 2,
      drift: 2 + random() * 5,
      size: random() < 0.2 ? 2 : 1,
    }));
  }

  render(game, time) {
    const ctx = this.ctx;
    const cameraX = Math.round(game.camera.x);
    const cameraY = Math.round(game.camera.y);
    const isCavern = this.level.style === 'cavern';
    this.cameraY = cameraY;

    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    if (isCavern) {
      this.drawCavernBackground(time, cameraX, cameraY);
    } else {
      this.drawSky(time, cameraX);
      this.drawMoon(time);
      this.drawHills(cameraX);
      if (this.level.mood === 'memorial') this.drawChapel(cameraX, time);
      else if (this.level.mood === 'parade') this.drawParadeSkyline(cameraX, time);
      else this.drawHouse(cameraX, time);
      this.drawClouds(time);
      this.drawBats(time);
    }

    ctx.save();
    ctx.translate(-cameraX, -cameraY);

    this.drawDecorations('back', time, cameraX, game);
    if (isCavern || this.level.mood === 'parade' || this.level.mood === 'sneak') {
      this.drawHazards(time, cameraX);
    }
    this.drawTiles(cameraX, cameraY);
    if (this.level.mood === 'sneak') drawSneakShadowZones(this, time);
    this.drawWaterZones(time, cameraX);
    this.drawDecorations('front', time, cameraX, game);
    this.drawPumpkins(game, time, cameraX, cameraY);
    this.drawFieldZones(time, cameraX);
    this.drawExitGate(time, cameraX);
    this.drawCheckpoints(game, time, cameraX);
    this.drawElectrons(time, cameraX);
    this.drawDevices(game, time, cameraX);
    if (this.level.mood === 'sneak') drawSneakTether(this, game, time);
    this.drawPickups(game, time, cameraX);
    this.drawFireflies(time, cameraX);

    ctx.restore();

    this.drawCandyAura(game, cameraX, cameraY, time);
    // 开场坐在南瓜车里时先不画玩家，车厢窗口里单独画一个小身影。
    if (!game.session?.carriageRiding) {
      const members = game.members ?? [game.player];
      // 鬼鬼祟祟里两只鬼可能叠在一起：让站得高的那只后画，压在对方身上。
      const ordered =
        game.mode === 'sneak'
          ? [...members].sort((left, right) => right.feetY - left.feetY)
          : members;
      for (const member of ordered) {
        member.draw(ctx, cameraX, cameraY, time);
      }
    }
    this.particles.draw(ctx, cameraX, cameraY);
    this.drawWaterOverlay(time, cameraX, cameraY, game);

    if (isCavern) {
      this.drawCavernMist(time, cameraX);
      this.drawCavernForeground(time, cameraX);
    } else {
      this.drawMist(time, cameraX);
      this.drawCobwebs();
    }

    if (this.level.weather === 'rain') this.drawRain(time, cameraX);
    this.drawShoeFlash(game);
    this.drawDamageFlash(game);
    this.drawMemorialAtmosphere(game, time);
    this.drawParadeAtmosphere(game, time);
    drawSneakAtmosphere(this, game, time);
  }

  /**
   * 糖果状态的可视化：几种状态同时存在时，每种各留一圈颜色很淡的光，
   * 再沿身体缓慢游走几粒同色火星。
   */
  drawCandyAura(game, cameraX, cameraY, time) {
    const effects = game.session?.candyEffects;
    if (!effects) return;
    const types = Object.keys(effects);
    if (types.length === 0) return;

    const ctx = this.ctx;
    const sx = Math.round(game.player.centerX - cameraX);
    const sy = Math.round(game.player.centerY - cameraY - 2);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    types.forEach((type, index) => {
      const glow = getItemDef(type).glow;
      const pulse = 0.1 + Math.sin(time * 4.6 + index * 1.7) * 0.045;
      const radius = 20 + index * 4;
      const gradient = ctx.createRadialGradient(sx, sy, 1, sx, sy, radius);
      gradient.addColorStop(0, `rgba(${glow}, ${pulse})`);
      gradient.addColorStop(0.65, `rgba(${glow}, ${pulse * 0.4})`);
      gradient.addColorStop(1, `rgba(${glow}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);

      const angle = time * (1.5 + index * 0.4) + index * 2.1;
      const px = sx + Math.cos(angle) * (14 + index * 2);
      const py = sy - 5 + Math.sin(angle * 1.3) * (10 + index);
      ctx.fillStyle = `rgba(${glow}, 0.9)`;
      ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
    });

    // 睡眠发作时，头顶冒出两个小小的 Z。
    if (game.session?.sleeping) {
      ctx.fillStyle = '#c9f2ff';
      ctx.globalAlpha = 0.55 + Math.sin(time * 3.2) * 0.2;
      const drawZ = (x, y, size) => {
        ctx.fillRect(x, y, size, 1);
        for (let i = 1; i < size; i += 1) {
          ctx.fillRect(x + size - 1 - i, y + i, 1, 1);
        }
        ctx.fillRect(x, y + size - 1, size, 1);
      };
      const zx = sx + 7;
      const zy = sy - 24 - Math.sin(time * 1.6) * 2;
      drawZ(zx, zy, 4);
      drawZ(zx + 5, zy - 7, 3);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  drawSky(time, cameraX) {
    const ctx = this.ctx;
    // 追思路线：天色直接取这一段的病色，和 memorial.js 里的 backdrop 对应。
    const backdrop = this.level.backdrop ?? this.level.memorialChapter?.backdrop;
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW.HEIGHT);
    gradient.addColorStop(0, backdrop?.skyTop ?? PALETTE.skyTop);
    gradient.addColorStop(0.55, backdrop?.skyMid ?? PALETTE.skyMid);
    gradient.addColorStop(1, backdrop?.skyLow ?? '#38233c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);

    const hazeTint = backdrop?.haze ?? '111, 69, 105';
    const haze = ctx.createRadialGradient(400, 190, 8, 400, 190, 260);
    haze.addColorStop(0, `rgba(${hazeTint}, ${backdrop ? 0.19 : 0.22})`);
    haze.addColorStop(1, `rgba(${hazeTint}, 0)`);
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);

    for (const star of this.stars) {
      const x = ((star.x - cameraX * 0.025) % (VIEW.WIDTH + 80) + VIEW.WIDTH + 80) % (VIEW.WIDTH + 80) - 40;
      const twinkle = 0.35 + Math.sin(time * star.speed + star.phase) * 0.25;
      ctx.globalAlpha = Math.max(0.12, twinkle);
      ctx.fillStyle = star.size === 2 ? '#f4e6c8' : '#cfc1e0';
      ctx.fillRect(Math.round(x), Math.round(star.y), star.size, star.size);

      if (star.size === 2 && twinkle > 0.45) {
        ctx.globalAlpha = 0.25;
        ctx.fillRect(Math.round(x) - 2, Math.round(star.y) + 1, 6, 1);
        ctx.fillRect(Math.round(x) + 1, Math.round(star.y) - 2, 1, 6);
      }
    }
    ctx.globalAlpha = 1;
  }

  drawMoon(time) {
    const ctx = this.ctx;
    const x = 409;
    const y = 60;
    const r = 27;
    const pulse = 1 + Math.sin(time * 0.55) * 0.025;
    // 百鬼夜行的月亮是红的，比平常的月亮大一圈、低一点。
    const blood = this.level.mood === 'parade';
    if (blood) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const bloodHalo = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 3.6);
      bloodHalo.addColorStop(0, 'rgba(255, 132, 96, 0.16)');
      bloodHalo.addColorStop(0.45, 'rgba(218, 78, 62, 0.06)');
      bloodHalo.addColorStop(1, 'rgba(180, 50, 42, 0)');
      ctx.fillStyle = bloodHalo;
      ctx.fillRect(x - 110, y - 110, 220, 220);
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 3.2);
    halo.addColorStop(0, blood ? 'rgba(255, 164, 126, 0.14)' : 'rgba(246, 227, 183, 0.12)');
    halo.addColorStop(0.42, blood ? 'rgba(216, 92, 70, 0.06)' : 'rgba(218, 193, 155, 0.05)');
    halo.addColorStop(1, blood ? 'rgba(216, 92, 70, 0)' : 'rgba(218, 193, 155, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(x - 100, y - 100, 200, 200);
    ctx.restore();

    for (let row = -r; row < r; row += 4) {
      const half = Math.round(Math.sqrt(r * r - row * row) * pulse / 4) * 4;
      ctx.fillStyle = blood ? '#ffb08c' : PALETTE.moon;
      ctx.fillRect(x - half, y + row, half * 2, 4);
    }

    ctx.globalAlpha = 0.38;
    ctx.fillStyle = blood ? '#c65a4c' : PALETTE.moonShade;
    ctx.fillRect(x - 13, y - 9, 7, 5);
    ctx.fillRect(x + 6, y + 3, 10, 6);
    ctx.fillRect(x - 5, y + 12, 4, 4);
    ctx.fillRect(x + 1, y - 18, 5, 3);
    ctx.globalAlpha = 1;

    ctx.fillStyle = blood ? 'rgba(255, 206, 168, 0.38)' : 'rgba(255, 244, 208, 0.35)';
    ctx.fillRect(x - 22, y - 18, 10, 2);
  }

  drawClouds(time) {
    const ctx = this.ctx;
    for (const cloud of this.clouds) {
      const x = ((cloud.x + time * cloud.speed) % (VIEW.WIDTH + 160)) - 80;
      ctx.fillStyle = `rgba(28, 17, 42, ${cloud.alpha})`;
      ctx.fillRect(Math.round(x), Math.round(cloud.y), Math.round(cloud.width), 4);
      ctx.fillRect(Math.round(x + 10), Math.round(cloud.y - 4), Math.round(cloud.width * 0.62), 4);
      ctx.fillRect(Math.round(x + 25), Math.round(cloud.y + 4), Math.round(cloud.width * 0.78), 3);
    }
  }

  drawBats(time) {
    const ctx = this.ctx;
    for (const bat of this.bats) {
      const x = ((bat.x + time * bat.speed) % (VIEW.WIDTH + 120)) - 60;
      const y = bat.y + Math.sin(time * 0.9 + bat.phase) * 5;
      const flap = Math.sin(time * 8 + bat.phase) > 0;
      const s = bat.scale;

      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      ctx.scale(s, s);
      ctx.fillStyle = 'rgba(16, 9, 22, 0.88)';

      if (flap) {
        ctx.fillRect(-6, -2, 4, 1);
        ctx.fillRect(-9, -3, 3, 1);
        ctx.fillRect(2, -2, 4, 1);
        ctx.fillRect(6, -3, 3, 1);
      } else {
        ctx.fillRect(-6, 1, 4, 1);
        ctx.fillRect(-9, 2, 3, 1);
        ctx.fillRect(2, 1, 4, 1);
        ctx.fillRect(6, 2, 3, 1);
      }
      ctx.fillRect(-2, -1, 4, 3);
      ctx.fillRect(-1, -2, 2, 1);
      ctx.restore();
    }
  }

  drawHills(cameraX) {
    const ctx = this.ctx;
    const backdrop = this.level.backdrop ?? this.level.memorialChapter?.backdrop;

    ctx.fillStyle = backdrop?.farHill ?? PALETTE.farHill;
    for (let x = -16; x <= VIEW.WIDTH + 16; x += 16) {
      const wave =
        Math.sin((x + cameraX * 0.12) * 0.013) * 11 +
        Math.sin((x + cameraX * 0.12) * 0.031 + 1.2) * 4;
      const top = 213 - wave;
      ctx.fillRect(x, Math.round(top), 16, VIEW.HEIGHT - top);
    }

    ctx.fillStyle = backdrop?.nearHill ?? PALETTE.nearHill;
    for (let x = -16; x <= VIEW.WIDTH + 16; x += 16) {
      const wave =
        Math.sin((x + cameraX * 0.24) * 0.019 + 2.4) * 8 +
        Math.cos((x + cameraX * 0.24) * 0.011) * 5;
      const top = 241 - wave;
      ctx.fillRect(x, Math.round(top), 16, VIEW.HEIGHT - top);
    }
  }

  /**
   * 百鬼夜行的远景：雾见城的屋顶与一座塔。
   * 只做剪影和窗户里的灯，不参与任何玩法。
   */
  drawParadeSkyline(cameraX, time) {
    const ctx = this.ctx;
    const backdrop = this.level.backdrop;
    const silhouette = backdrop?.nearHill ?? '#150a10';
    const roofLight = backdrop?.farHill ?? '#2a1118';
    const parallax = cameraX * 0.16;

    // 一排屋顶，按视差缓慢移动
    const roof = (x, w, h) => {
      const base = 238;
      ctx.fillStyle = silhouette;
      ctx.fillRect(x, base - h, w, h);
      // 屋脊
      ctx.fillRect(x - 3, base - h - 2, w + 6, 3);
      ctx.fillRect(x + 4, base - h - 5, w - 8, 3);
      // 窗户
      ctx.fillStyle = 'rgba(255, 176, 96, 0.34)';
      ctx.fillRect(x + 7, base - h + 6, 4, 4);
      ctx.fillRect(x + w - 12, base - h + 10, 3, 4);
      ctx.fillStyle = 'rgba(255, 210, 140, 0.24)';
      ctx.fillRect(x + 7, base - h + 7, 1, 1);
    };

    for (let i = -2; i < 7; i += 1) {
      const spacing = 104;
      const x = ((i * spacing - parallax) % (7 * spacing) + 7 * spacing) % (7 * spacing) - 70;
      const h = 34 + ((i * 37) % 23);
      roof(Math.round(x), 62 + (i % 3) * 10, h);
    }

    // 远处的塔：三层屋檐，窗口里有灯
    const towerX = ((470 - cameraX * 0.08) % 640 + 640) % 640 - 90;
    ctx.fillStyle = silhouette;
    ctx.fillRect(towerX + 20, 142, 32, 96);
    for (let tier = 0; tier < 3; tier += 1) {
      const y = 152 + tier * 26;
      const w = 58 - tier * 8;
      ctx.fillStyle = roofLight;
      ctx.fillRect(towerX + 36 - w / 2, y, w, 4);
      ctx.fillStyle = silhouette;
      ctx.fillRect(towerX + 36 - w / 2 + 4, y - 3, w - 8, 3);
      ctx.fillStyle = 'rgba(255, 188, 108, 0.4)';
      ctx.fillRect(towerX + 32, y + 9, 3, 5);
      ctx.fillRect(towerX + 40, y + 9, 3, 5);
    }
    ctx.fillStyle = silhouette;
    ctx.fillRect(towerX + 34, 132, 4, 12);

    // 塔尖上停着一只不肯走的乌鸦
    const crow = Math.sin(time * 0.8) > 0;
    ctx.fillStyle = '#0a0509';
    ctx.fillRect(towerX + 32, 129, 6, 3);
    ctx.fillRect(towerX + 37, 128, 3, 2);
    if (crow) ctx.fillRect(towerX + 40, 128, 2, 1);
  }

  drawHouse(cameraX, time) {
    const ctx = this.ctx;
    const x = Math.round(414 - cameraX * 0.13);
    const baseY = 254;

    ctx.save();
    ctx.translate(x, baseY);
    ctx.fillStyle = '#190f24';

    // 主楼
    ctx.fillRect(0, -46, 68, 46);
    ctx.fillRect(-8, -64, 30, 64);
    ctx.fillRect(45, -56, 28, 56);

    // 尖顶（阶梯状像素屋面）
    for (let i = 0; i < 8; i += 1) {
      ctx.fillRect(-18 + i * 2, -92 + i * 4, 50 - i * 4, 4);
    }
    for (let i = 0; i < 6; i += 1) {
      ctx.fillRect(50 + i * 2, -76 + i * 4, 18 - i * 2, 4);
    }
    ctx.fillRect(-5, -42, 68, 4);

    // 烟囱
    ctx.fillRect(39, -72, 8, 18);
    ctx.fillRect(37, -73, 12, 3);

    // 窗口的暖光
    const flicker = 0.65 + Math.sin(time * 5.3) * 0.1 + Math.sin(time * 11.7) * 0.05;
    ctx.globalAlpha = flicker;
    ctx.fillStyle = '#e8a456';
    ctx.fillRect(9, -38, 7, 9);
    ctx.fillRect(32, -38, 7, 9);
    ctx.fillRect(53, -46, 6, 8);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ffd17d';
    ctx.fillRect(7, -40, 11, 13);
    ctx.fillRect(30, -40, 11, 13);
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#190f24';
    ctx.fillRect(11, -38, 1, 9);
    ctx.fillRect(14, -38, 1, 9);
    ctx.fillRect(34, -38, 1, 9);
    ctx.fillRect(37, -38, 1, 9);
    ctx.fillRect(55, -46, 1, 8);
    ctx.fillRect(58, -46, 1, 8);

    // 屋顶上的小尖饰
    ctx.fillRect(-2, -98, 2, 8);
    ctx.fillRect(68, -80, 2, 6);
    ctx.restore();
  }

  /** 墓园远处的小教堂。只作为背景剪影，不参与碰撞。 */
  drawChapel(cameraX, time) {
    const ctx = this.ctx;
    const x = Math.round(430 - cameraX * 0.1);
    const baseY = 254;

    ctx.save();
    ctx.translate(x, baseY);
    ctx.fillStyle = '#180f22';

    // 中殿
    ctx.fillRect(-34, -42, 68, 42);
    // 两坡屋顶
    for (let i = 0; i < 7; i += 1) {
      ctx.fillRect(-34 + i * 3, -48 - i * 3, 68 - i * 6, 3);
    }
    // 钟楼
    ctx.fillRect(18, -74, 20, 74);
    ctx.fillRect(21, -84, 14, 10);
    // 尖顶
    for (let i = 0; i < 6; i += 1) {
      ctx.fillRect(24 + i, -88 - i * 3, 8 - i * 2, 3);
    }
    ctx.fillRect(27, -106, 1, 9);
    ctx.fillRect(25, -103, 5, 1);

    // 屋顶的冷色边
    ctx.fillStyle = '#2a1c32';
    ctx.fillRect(-33, -50, 66, 2);
    ctx.fillRect(20, -86, 16, 1);

    // 拱窗里的暖光
    const flicker = 0.58 + Math.sin(time * 4.1) * 0.08 + Math.sin(time * 9.3) * 0.04;
    ctx.globalAlpha = flicker;
    ctx.fillStyle = '#e2a055';
    ctx.fillRect(-20, -32, 6, 12);
    ctx.fillRect(-20, -36, 6, 2);
    ctx.fillRect(-1, -32, 6, 12);
    ctx.fillRect(-1, -36, 6, 2);
    ctx.fillRect(24, -66, 8, 9);
    ctx.globalAlpha = flicker * 0.22;
    ctx.fillStyle = '#ffd17d';
    ctx.fillRect(-23, -37, 12, 20);
    ctx.fillRect(-4, -37, 12, 20);
    ctx.globalAlpha = 1;

    // 窗棂
    ctx.fillStyle = '#180f22';
    ctx.fillRect(-17, -34, 1, 14);
    ctx.fillRect(2, -34, 1, 14);
    ctx.fillRect(27, -64, 1, 7);

    // 门前的小径
    ctx.fillStyle = 'rgba(59, 45, 66, 0.55)';
    ctx.fillRect(-10, 0, 20, 2);
    ctx.restore();
  }

  drawTiles(cameraX, cameraY) {
    const ctx = this.ctx;
    const level = this.level;
    const isCavern = level.style === 'cavern';
    const startCol = Math.max(0, Math.floor(cameraX / T) - 1);
    const endCol = Math.min(level.width - 1, Math.ceil((cameraX + VIEW.WIDTH) / T) + 1);
    const startRow = Math.max(0, Math.floor(cameraY / T) - 1);
    const endRow = Math.min(level.height - 1, Math.ceil((cameraY + VIEW.HEIGHT) / T) + 1);

    for (let row = startRow; row <= endRow; row += 1) {
      for (let col = startCol; col <= endCol; col += 1) {
        const tile = level.getTile(col, row);
        if (tile === '#') {
          if (isCavern) this.drawCavernEarthTile(col, row);
          else this.drawEarthTile(col, row);
        } else if (tile === 'B') {
          if (isCavern) this.drawCavernStoneTile(col, row);
          else this.drawStoneTile(col, row);
        } else if (tile === 'P') {
          if (isCavern) this.drawCavernPlankTile(col, row);
          else this.drawPlankTile(col, row);
        } else if (tile === 'C') {
          this.drawCrackedTile(col, row);
        } else if (tile === 'G') {
          drawSneakGateTile(this, col, row);
        } else if (tile === 'g') {
          drawSneakGateWard(this, col, row);
        } else if (tile === 'S') {
          drawSneakBridgeTile(this, col, row);
        }

        if (
          isCavern &&
          (tile === '#' || tile === 'B' || tile === 'P') &&
          level.getTile(col, row - 1) === '.'
        ) {
          this.drawSurfaceBones(col, row);
        }
      }
    }
  }

  drawSurfaceBones(col, row) {
    const ctx = this.ctx;
    const x = col * T;
    const y = row * T;
    const n = hash(col + 71, row + 23);
    const n2 = hash(col + 5, row + 41);

    ctx.save();
    ctx.globalAlpha = 0.56;
    ctx.fillStyle = '#c9b99f';

    if (n < 0.28) {
      ctx.fillRect(x + 3, y - 2, 5, 1);
      ctx.fillRect(x + 2, y - 3, 1, 2);
      ctx.fillRect(x + 8, y - 3, 1, 2);
      ctx.fillStyle = '#9e8f7a';
      ctx.fillRect(x + 4, y - 1, 3, 1);
    } else if (n < 0.52) {
      ctx.fillRect(x + 3, y - 4, 4, 3);
      ctx.fillRect(x + 4, y - 5, 2, 1);
      ctx.fillStyle = '#2a1b23';
      ctx.fillRect(x + 4, y - 3, 1, 1);
      ctx.fillRect(x + 6, y - 3, 1, 1);
    } else if (n < 0.76) {
      ctx.fillRect(x + 2, y - 1, 7, 1);
      ctx.fillRect(x + 1, y - 2, 2, 1);
      ctx.fillRect(x + 8, y - 2, 2, 1);
      ctx.fillStyle = '#8e806f';
      ctx.fillRect(x + 4, y - 1, 4, 1);
    } else {
      ctx.fillRect(x + 4, y - 3, 1, 2);
      ctx.fillRect(x + 3, y - 4, 3, 1);
      ctx.fillRect(x + 2, y - 2, 2, 1);
      ctx.fillRect(x + 6, y - 1, 2, 1);
    }

    if (n2 > 0.64) {
      ctx.fillStyle = '#b4a48c';
      ctx.fillRect(x + 11, y - 2, 3, 1);
      ctx.fillRect(x + 10, y - 3, 1, 1);
    } else if (n2 < 0.14) {
      ctx.fillStyle = '#817465';
      ctx.fillRect(x + 12, y - 1, 2, 1);
    }

    ctx.restore();
  }

  drawCavernEarthTile(col, row) {
    const ctx = this.ctx;
    const x = col * T;
    const y = row * T;
    const n = hash(col + 11, row + 3);
    const n2 = hash(col * 3, row + 17);
    const mood = this.level.mood;
    const accent = mood === 'arcane' ? '#446c7d' : mood === 'ritual' ? '#6f3a4d' : '#5e3a30';

    ctx.fillStyle = '#150f19';
    ctx.fillRect(x, y, T, T);
    ctx.fillStyle = '#241a26';
    ctx.fillRect(x + 1, y + 1, T - 2, T - 2);

    ctx.fillStyle = '#2c202c';
    ctx.fillRect(x + 2 + Math.floor(n * 7), y + 6 + Math.floor(n2 * 6), 4, 2);
    ctx.fillStyle = '#0f0b13';
    if (n > 0.55) ctx.fillRect(x + 4, y + 9, 1, 4);
    if (n2 > 0.7) ctx.fillRect(x + 11, y + 4, 1, 3);
    ctx.fillStyle = accent;
    ctx.fillRect(x + 3 + Math.floor(n2 * 7), y + 10 + Math.floor(n * 3), 2, 1);

    const above = this.level.getTile(col, row - 1);
    if (above !== '#' && above !== 'B') {
      ctx.fillStyle = '#332931';
      ctx.fillRect(x, y, T, 3);
      ctx.fillStyle = mood === 'arcane' ? '#527a80' : mood === 'ritual' ? '#77404e' : '#755044';
      ctx.fillRect(x, y, T, 1);
      ctx.fillStyle = accent;
      ctx.fillRect(x + (n > 0.5 ? 2 : 9), y + 2, 3, 1);
      if (n2 > 0.62) {
        ctx.fillStyle = mood === 'arcane' ? '#6d9aa0' : '#965145';
        ctx.fillRect(x + Math.floor(n * 13), y - 2, 1, 2);
      }
    }

    const left = this.level.getTile(col - 1, row);
    const right = this.level.getTile(col + 1, row);
    if (left === '.') {
      ctx.fillStyle = 'rgba(5, 3, 7, 0.4)';
      ctx.fillRect(x, y, 2, T);
    }
    if (right === '.') {
      ctx.fillStyle = 'rgba(5, 3, 7, 0.35)';
      ctx.fillRect(x + T - 2, y, 2, T);
    }
  }

  drawCavernStoneTile(col, row) {
    const ctx = this.ctx;
    const x = col * T;
    const y = row * T;
    const n = hash(col + 7, row + 19);
    const mood = this.level.mood;

    ctx.fillStyle = '#18131c';
    ctx.fillRect(x, y, T, T);
    ctx.fillStyle = '#302635';
    ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
    ctx.fillStyle = '#211925';
    ctx.fillRect(x, y + 7, T, 1);
    ctx.fillRect(x, y + 15, T, 1);
    ctx.fillRect(x + (n > 0.5 ? 5 : 10), y + 1, 1, 6);
    ctx.fillStyle = '#45354a';
    ctx.fillRect(x + 2, y + 1, 5, 1);
    ctx.fillRect(x + 10, y + 9, 3, 1);
    ctx.fillStyle = mood === 'arcane' ? '#3e6974' : mood === 'ritual' ? '#66333f' : '#53352f';
    if (n > 0.55) ctx.fillRect(x + 4, y + 11, 2, 1);
    if (n < 0.2) ctx.fillRect(x + 12, y + 3, 1, 2);
  }

  drawCavernPlankTile(col, row) {
    const ctx = this.ctx;
    const x = col * T;
    const y = row * T;
    const n = hash(col + 31, row + 4);
    const mood = this.level.mood;
    const metal = mood === 'arcane' ? '#3b4b51' : '#4b3a34';
    const metalLight = mood === 'arcane' ? '#6b8b90' : '#84614b';

    ctx.fillStyle = 'rgba(5, 3, 7, 0.28)';
    ctx.fillRect(x, y + 6, T, 2);
    ctx.fillStyle = '#211820';
    ctx.fillRect(x, y, T, 6);
    ctx.fillStyle = metal;
    ctx.fillRect(x, y + 1, T, 4);
    ctx.fillStyle = metalLight;
    ctx.fillRect(x, y + 1, T, 1);
    ctx.fillStyle = '#2b2025';
    ctx.fillRect(x + Math.floor(n * 9) + 1, y + 3, 4, 1);
    ctx.fillStyle = '#b69a6f';
    ctx.fillRect(x + 2, y + 3, 1, 1);
    ctx.fillRect(x + 13, y + 3, 1, 1);

    if (n > 0.72) {
      ctx.fillStyle = mood === 'arcane' ? '#39585d' : '#334c36';
      ctx.fillRect(x + 6, y + 6, 1, 3);
      ctx.fillRect(x + 7, y + 9, 1, 2);
    }

    if (this.level.getTile(col - 1, row) !== 'P') {
      ctx.fillStyle = '#171015';
      ctx.fillRect(x, y + 1, 2, 5);
    }
    if (this.level.getTile(col + 1, row) !== 'P') {
      ctx.fillStyle = '#171015';
      ctx.fillRect(x + T - 2, y + 1, 2, 5);
    }
  }

  drawEarthTile(col, row) {
    const ctx = this.ctx;
    const x = col * T;
    const y = row * T;
    const n = hash(col, row);
    const n2 = hash(col + 9, row + 4);

    ctx.fillStyle = PALETTE.earthDark;
    ctx.fillRect(x, y, T, T);
    ctx.fillStyle = PALETTE.earth;
    ctx.fillRect(x + 1, y + 1, T - 2, T - 2);

    // 土壤里的颗粒和裂纹
    ctx.fillStyle = '#352131';
    ctx.fillRect(x + 2 + Math.floor(n * 8), y + 7 + Math.floor(n2 * 6), 3, 2);
    ctx.fillRect(x + 9 + Math.floor(n2 * 4), y + 11, 2, 1);
    ctx.fillStyle = '#160c16';
    if (n > 0.55) ctx.fillRect(x + 4, y + 10, 1, 4);
    if (n2 > 0.72) ctx.fillRect(x + 12, y + 5, 1, 3);
    ctx.fillStyle = '#4b3140';
    ctx.fillRect(x + 6, y + 4 + Math.floor(n2 * 6), 2, 1);

    const above = this.level.getTile(col, row - 1);
    if (above !== '#' && above !== 'B') {
      ctx.fillStyle = PALETTE.moss;
      ctx.fillRect(x, y, T, 3);
      ctx.fillStyle = PALETTE.mossLight;
      ctx.fillRect(x, y, T, 1);
      ctx.fillStyle = '#4a5f36';
      ctx.fillRect(x + (n > 0.5 ? 2 : 10), y + 3, 3, 1);
      if (n2 > 0.55) {
        ctx.fillStyle = PALETTE.mossLight;
        ctx.fillRect(x + Math.floor(n * 13), y - 2, 1, 2);
        ctx.fillRect(x + Math.floor(n * 13) + 2, y - 1, 1, 1);
      }
    }

    const left = this.level.getTile(col - 1, row);
    const right = this.level.getTile(col + 1, row);
    if (left === '.' || (left !== '#' && left !== 'B' && left !== 'P')) {
      ctx.fillStyle = 'rgba(13, 7, 17, 0.35)';
      ctx.fillRect(x, y, 2, T);
    }
    if (right === '.' || (right !== '#' && right !== 'B' && right !== 'P')) {
      ctx.fillStyle = 'rgba(13, 7, 17, 0.3)';
      ctx.fillRect(x + T - 2, y, 2, T);
    }
  }

  drawStoneTile(col, row) {
    const ctx = this.ctx;
    const x = col * T;
    const y = row * T;
    const n = hash(col + 3, row + 8);

    ctx.fillStyle = '#382742';
    ctx.fillRect(x, y, T, T);
    ctx.fillStyle = PALETTE.stone;
    ctx.fillRect(x + 1, y + 1, T - 2, T - 2);

    ctx.fillStyle = '#2b1c36';
    ctx.fillRect(x, y + 7, T, 1);
    ctx.fillRect(x, y + 15, T, 1);
    ctx.fillRect(x + (n > 0.5 ? 5 : 10), y + 1, 1, 6);
    ctx.fillRect(x + (n > 0.5 ? 12 : 3), y + 8, 1, 7);

    ctx.fillStyle = PALETTE.stoneLight;
    ctx.fillRect(x + 2, y + 1, 5, 1);
    ctx.fillRect(x + 10, y + 9, 3, 1);
    ctx.fillStyle = '#26172f';
    if (n > 0.6) ctx.fillRect(x + 4, y + 11, 3, 1);

    const above = this.level.getTile(col, row - 1);
    if (above !== 'B' && above !== '#') {
      ctx.fillStyle = '#6e587a';
      ctx.fillRect(x, y, T, 1);
      ctx.fillStyle = PALETTE.moss;
      ctx.fillRect(x + Math.floor(n * 8), y - 1, 3, 1);
    }
  }

  /** 裂石：普通石头被一条发红的裂缝劈开，只等科学怪人的肩膀。 */
  drawCrackedTile(col, row) {
    const ctx = this.ctx;
    const x = col * T;
    const y = row * T;
    const n = hash(col + 13, row + 27);

    ctx.fillStyle = '#2f2536';
    ctx.fillRect(x, y, T, T);
    ctx.fillStyle = '#55495c';
    ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
    ctx.fillStyle = '#6b5d70';
    ctx.fillRect(x + 2, y + 1, 5, 1);
    ctx.fillRect(x + 10, y + 9, 4, 1);

    // 裂缝：一条贯穿的暗红折线
    ctx.fillStyle = '#2a1720';
    ctx.fillRect(x + 6, y, 2, 5);
    ctx.fillRect(x + 5, y + 5, 3, 3);
    ctx.fillRect(x + 7, y + 8, 2, 4);
    ctx.fillRect(x + 9, y + 12, 2, 4);
    ctx.fillStyle = '#8e3b3c';
    ctx.fillRect(x + 7, y + 2, 1, 4);
    ctx.fillRect(x + 6, y + 6, 1, 3);
    ctx.fillRect(x + 8, y + 10, 1, 4);
    ctx.fillStyle = 'rgba(255, 128, 92, 0.45)';
    ctx.fillRect(x + 7, y + 1, 1, 2);
    ctx.fillRect(x + 8, y + 9, 1, 1);

    if (n > 0.5) {
      ctx.fillStyle = '#3a2d40';
      ctx.fillRect(x + 2, y + 9, 3, 1);
      ctx.fillRect(x + 12, y + 4, 2, 2);
    }

    const above = this.level.getTile(col, row - 1);
    if (above !== 'C' && above !== 'B' && above !== '#') {
      ctx.fillStyle = '#7d6a84';
      ctx.fillRect(x, y, T, 1);
    }
  }

  drawPlankTile(col, row) {
    const ctx = this.ctx;
    const x = col * T;
    const y = row * T;
    const n = hash(col + 21, row + 2);

    // 投影
    ctx.fillStyle = 'rgba(10, 5, 14, 0.22)';
    ctx.fillRect(x, y + 6, T, 2);

    ctx.fillStyle = '#3b2428';
    ctx.fillRect(x, y, T, 6);
    ctx.fillStyle = PALETTE.wood;
    ctx.fillRect(x, y + 1, T, 4);
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fillRect(x, y + 1, T, 1);
    ctx.fillStyle = '#8c5c4d';
    ctx.fillRect(x + 2, y + 2, 4, 1);

    // 木纹和钉子
    ctx.fillStyle = '#402529';
    ctx.fillRect(x + Math.floor(n * 9) + 1, y + 3, 4, 1);
    ctx.fillRect(x + 7, y + 4, 5, 1);
    ctx.fillStyle = '#b28e67';
    ctx.fillRect(x + 2, y + 3, 1, 1);
    ctx.fillRect(x + 13, y + 3, 1, 1);

    // 青苔与垂下的细藤
    if (n > 0.35) {
      ctx.fillStyle = PALETTE.moss;
      ctx.fillRect(x + Math.floor(n * 10), y, 4, 1);
    }
    if (n > 0.7) {
      ctx.fillStyle = '#33482c';
      ctx.fillRect(x + 5, y + 6, 1, 3);
      ctx.fillRect(x + 6, y + 9, 1, 2);
      ctx.fillStyle = '#577443';
      ctx.fillRect(x + 7, y + 6, 1, 2);
    }

    const leftEmpty = this.level.getTile(col - 1, row) !== 'P';
    const rightEmpty = this.level.getTile(col + 1, row) !== 'P';
    if (leftEmpty) {
      ctx.fillStyle = '#2a171d';
      ctx.fillRect(x, y + 1, 2, 5);
    }
    if (rightEmpty) {
      ctx.fillStyle = '#2a171d';
      ctx.fillRect(x + T - 2, y + 1, 2, 5);
    }
  }

  /**
   * 雨川与废寺积水：半透明的青色水层、贴着水面的波纹，
   * 以及顺着 currentX 漂走的细碎水光。水画在石块之上、角色之下。
   */
  drawWaterZones(time, cameraX) {
    const zones = this.level.waterZones ?? [];
    if (!zones.length) return;
    const ctx = this.ctx;
    const cameraY = this.cameraY ?? 0;

    for (const zone of zones) {
      if (zone.x + zone.w < cameraX - 20 || zone.x > cameraX + VIEW.WIDTH + 20) continue;
      if (zone.y + zone.h < cameraY - 20 || zone.y > cameraY + VIEW.HEIGHT + 20) continue;

      ctx.save();
      ctx.beginPath();
      ctx.rect(zone.x, zone.y, zone.w, zone.h);
      ctx.clip();

      const deep = ctx.createLinearGradient(0, zone.y, 0, zone.y + zone.h);
      deep.addColorStop(0, 'rgba(104, 196, 194, 0.22)');
      deep.addColorStop(0.55, 'rgba(38, 100, 118, 0.38)');
      deep.addColorStop(1, 'rgba(16, 46, 62, 0.62)');
      ctx.fillStyle = deep;
      ctx.fillRect(zone.x, zone.y, zone.w, zone.h);

      // 深水里的几道斜光：越深的水面，越能看出自己已经沉下去了。
      if (zone.h > 2.5 * T) {
        ctx.globalAlpha = 0.055;
        ctx.fillStyle = '#c8fff7';
        for (let i = 0; i < 4; i += 1) {
          const seed = hash(i + 13, zone.x);
          const x = zone.x + seed * zone.w;
          const slant = 6 + seed * 10;
          ctx.beginPath();
          ctx.moveTo(x, zone.y);
          ctx.lineTo(x + slant, zone.y + zone.h);
          ctx.lineTo(x + slant + 6, zone.y + zone.h);
          ctx.lineTo(x + 6, zone.y);
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // 水下的暗纹
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = '#6ec9c4';
      for (let x = zone.x + 6; x < zone.x + zone.w; x += 19) {
        const y = zone.y + 9 + Math.sin(x * 0.12 + time * 1.6) * 4 + (x % 13);
        ctx.fillRect(Math.round(x), Math.round(y), 5, 1);
      }
      ctx.globalAlpha = 1;

      // 水面：一条亮的边和缓慢起伏的波纹
      ctx.fillStyle = 'rgba(176, 240, 232, 0.42)';
      ctx.fillRect(zone.x, zone.y, zone.w, 1);
      for (let x = zone.x; x < zone.x + zone.w; x += 7) {
        const y =
          zone.y +
          Math.sin(x * 0.09 + time * 2.4) * 1.6 +
          Math.sin(x * 0.031 - time * 1.1) * 1.2;
        ctx.fillRect(Math.round(x), Math.round(y), 4, 1);
      }

      // 水流方向：细小的水光顺着 currentX 漂
      const drift = zone.currentX ?? 0;
      const dir = Math.sign(drift) || -1;
      ctx.globalAlpha = 0.55;
      for (let i = 0; i < 14; i += 1) {
        const seed = hash(i + 9, zone.x);
        const travel = (time * Math.abs(drift || 18) + seed * zone.w) % (zone.w + 30);
        const x =
          dir > 0
            ? zone.x - 15 + travel
            : zone.x + zone.w + 15 - travel;
        const y = zone.y + 7 + seed * Math.max(8, zone.h - 14);
        ctx.fillStyle = seed > 0.5 ? '#bdf6ef' : '#79d6d0';
        ctx.fillRect(Math.round(x), Math.round(y), 3, 1);
      }
      ctx.globalAlpha = 1;

      // 水面急流：贴着水皮的一条更快、更亮的水线，只有浅处才吃得到。
      if (zone.surfaceCurrentX) {
        const sDir = Math.sign(zone.surfaceCurrentX) || -1;
        ctx.globalAlpha = 0.62;
        for (let i = 0; i < 10; i += 1) {
          const seed = hash(i + 71, zone.y);
          const travel =
            (time * Math.abs(zone.surfaceCurrentX) * 0.9 + seed * zone.w) %
            (zone.w + 24);
          const x =
            sDir > 0
              ? zone.x - 12 + travel
              : zone.x + zone.w + 12 - travel;
          const y = zone.y + 3 + seed * 6;
          ctx.fillStyle = seed > 0.5 ? '#e6fffb' : '#bdf6ef';
          ctx.fillRect(Math.round(x), Math.round(y), 3 + (i % 3), 1);
        }
        ctx.globalAlpha = 1;
      }

      // 漂浮的倒影光斑
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i += 1) {
        const seed = hash(i + 41, zone.y);
        const x = zone.x + seed * zone.w + Math.sin(time * 0.7 + i) * 6;
        const y = zone.y + 4 + seed * (zone.h - 10);
        ctx.globalAlpha = 0.12 + seed * 0.1;
        ctx.fillStyle = '#a8fff4';
        ctx.fillRect(Math.round(x), Math.round(y), 6, 1);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }
  }

  /**
   * 水面下的第二层：画在角色之后，把整个水体压成半透明的蓝，
   * 再补上水面线、气泡柱和深水暗角。这样角色和水才真的像在两个介质里。
   */
  drawWaterOverlay(time, cameraX, cameraY, game) {
    const zones = this.level.waterZones ?? [];
    if (!zones.length) return;
    const ctx = this.ctx;

    for (const zone of zones) {
      const sx = zone.x - cameraX;
      const sy = zone.y - cameraY;
      if (sx + zone.w < -20 || sx > VIEW.WIDTH + 20) continue;
      if (sy + zone.h < -20 || sy > VIEW.HEIGHT + 20) continue;

      ctx.save();
      ctx.beginPath();
      ctx.rect(sx, sy, zone.w, zone.h);
      ctx.clip();

      // 压在角色上的水色
      ctx.fillStyle = 'rgba(20, 72, 96, 0.18)';
      ctx.fillRect(sx, sy, zone.w, zone.h);

      // 水下的漂浮光斑
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 8; i += 1) {
        const seed = hash(i + 5, zone.x);
        const x = sx + seed * zone.w + Math.sin(time * 0.8 + i * 1.7) * 7;
        const y = sy + 4 + seed * (zone.h - 8);
        ctx.globalAlpha = 0.06 + seed * 0.08;
        ctx.fillStyle = '#a8fff4';
        ctx.fillRect(Math.round(x), Math.round(y), 5 + (i % 3), 1);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      // 水面线：从角色身前划过，探出水面的部分会停在它上面。
      ctx.fillStyle = 'rgba(186, 250, 240, 0.5)';
      ctx.fillRect(sx, sy, zone.w, 1);
      for (let x = 0; x < zone.w; x += 7) {
        const worldX = zone.x + x;
        const y =
          sy +
          Math.sin(worldX * 0.09 + time * 2.4) * 1.6 +
          Math.sin(worldX * 0.031 - time * 1.1) * 1.2;
        ctx.fillRect(Math.round(sx + x), Math.round(y), 4, 1);
      }

      // 水体里慢慢往上冒的小气泡
      const count = Math.max(6, Math.round(zone.w / 22));
      for (let i = 0; i < count; i += 1) {
        const seed = hash(i + 31, zone.x);
        const travel = (time * (11 + seed * 17) + seed * zone.h) % (zone.h + 18);
        const x = sx + 4 + seed * (zone.w - 8) + Math.sin(time * 1.6 + i) * 2;
        const y = sy + zone.h - travel;
        ctx.globalAlpha = 0.16 + seed * 0.26;
        ctx.fillStyle = '#c8fff7';
        ctx.fillRect(Math.round(x), Math.round(y), seed > 0.72 ? 2 : 1, 1);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // 气泡柱：从河床一路冒到水面，画在角色前面，经过的人像是被它托着。
    for (const up of this.level.updrafts ?? []) {
      const ux = up.x - cameraX;
      const uy = up.y - cameraY;
      if (ux + up.w < -20 || ux > VIEW.WIDTH + 20) continue;
      if (uy + up.h < -20 || uy > VIEW.HEIGHT + 20) continue;

      ctx.globalAlpha = 0.09;
      ctx.fillStyle = '#9ff6ea';
      ctx.fillRect(ux, uy, up.w, up.h);
      ctx.globalAlpha = 0.16;
      ctx.fillRect(Math.round(ux + up.w / 2) - 3, uy, 6, up.h);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#d7fff7';
      ctx.fillRect(ux + 1, uy, up.w - 2, 1);
      ctx.globalAlpha = 1;

      for (let i = 0; i < 44; i += 1) {
        const seed = hash(i + 17, up.x);
        const travel = (time * (34 + seed * 38) + seed * (up.h + 20)) % (up.h + 20);
        const x = ux + 3 + seed * (up.w - 6) + Math.sin(time * 2.4 + i * 0.7) * 2;
        const y = uy + up.h - travel;
        ctx.globalAlpha = 0.38 + seed * 0.5;
        ctx.fillStyle = seed > 0.5 ? '#e6fffb' : '#8fe1de';
        const size = seed > 0.82 ? 2 : 1;
        ctx.fillRect(Math.round(x), Math.round(y), size, size);
      }
      ctx.globalAlpha = 1;
    }

    // 领队沉在水里时，整个画面再压一层很淡的深水蓝。
    const leader = game?.player;
    const water = leader && this.level.getWaterAt
      ? this.level.getWaterAt(leader.centerX, leader.centerY)
      : null;
    if (water) {
      const depth = Math.min(1, Math.max(0, (leader.centerY - water.y) / water.h));
      ctx.fillStyle = `rgba(10, 48, 68, ${0.025 + depth * 0.075})`;
      ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);
    }
  }

  drawDecorations(layer, time, cameraX, game = null) {
    const decorations = this.level.decorations
      .filter((decoration) => decoration.layer === layer)
      .sort((a, b) => a.y - b.y);

    for (const decoration of decorations) {
      if (decoration.x < cameraX - 120 || decoration.x > cameraX + VIEW.WIDTH + 120) continue;
      if (decoration.y < this.cameraY - 230 || decoration.y > this.cameraY + VIEW.HEIGHT + 230) continue;

      const lit = Boolean(
        decoration.lightId && game?.session?.litLights?.has(decoration.lightId),
      );

      switch (decoration.type) {
        case 'tree':
          this.drawTree(decoration);
          break;
        case 'grave':
          this.drawGrave(decoration);
          break;
        case 'pumpkin':
          this.drawPumpkin(decoration, time);
          break;
        case 'jackOLantern':
          this.drawPumpkin(decoration, time);
          break;
        case 'candyBucket':
          this.drawCandyBucket(decoration, time);
          break;
        case 'lamp':
          this.drawLamp(decoration, time);
          break;
        case 'sign':
          this.drawSign(decoration);
          break;
        case 'mushroom':
          this.drawMushroom(decoration);
          break;
        case 'fence':
          this.drawFence(decoration);
          break;
        case 'crystal':
          this.drawCrystal(decoration, time);
          break;
        case 'stalagmite':
          this.drawStalagmite(decoration);
          break;
        case 'stalactite':
          this.drawStalactite(decoration);
          break;
        case 'skullPile':
          this.drawSkullPile(decoration);
          break;
        case 'chain':
          this.drawChain(decoration);
          break;
        case 'rune':
          this.drawRune(decoration, time);
          break;
        case 'memory':
          this.drawMemory(decoration, time, lit);
          break;
        case 'candle':
          this.drawCandle(decoration, time, lit);
          break;
        case 'torii':
          this.drawTorii(decoration);
          break;
        case 'stoneLantern':
          this.drawStoneLantern(decoration, time);
          break;
        case 'paperLantern':
          this.drawPaperLantern(decoration, time);
          break;
        case 'lanternString':
          this.drawLanternString(decoration, time);
          break;
        case 'bamboo':
          this.drawBamboo(decoration);
          break;
        case 'spiritFlame':
          this.drawSpiritFlame(decoration, time);
          break;
        default:
          break;
      }
    }
  }

  /**
   * 路上想起的人：一团很淡的、提灯的人影。
   * 玩家经过并放下灯之后，人影会稍微亮一点，像终于被看见。
   */
  drawMemory(decoration, time, lit) {
    const ctx = this.ctx;
    const breathe = Math.sin(time * 0.9 + decoration.x * 0.01) * 1.5;
    const alpha = lit ? 0.34 : 0.18;

    ctx.save();
    ctx.translate(Math.round(decoration.x), Math.round(decoration.y + breathe));
    ctx.globalCompositeOperation = 'lighter';

    const aura = ctx.createRadialGradient(0, -18, 2, 0, -18, 28);
    aura.addColorStop(0, `rgba(214, 224, 255, ${lit ? 0.16 : 0.09})`);
    aura.addColorStop(1, 'rgba(180, 196, 255, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(-30, -50, 60, 54);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#c9d3ef';
    // 头与肩
    ctx.fillRect(-3, -30, 6, 5);
    ctx.fillRect(-4, -25, 8, 7);
    ctx.fillRect(-5, -22, 10, 12);
    // 斗篷下摆
    ctx.fillRect(-6, -10, 3, 8);
    ctx.fillRect(-2, -10, 3, 10);
    ctx.fillRect(2, -10, 3, 8);
    // 提灯的光点
    ctx.fillStyle = lit ? '#ffe0a1' : '#9fb1d6';
    ctx.fillRect(6, -12, 2, 2);

    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#eef3ff';
    ctx.fillRect(-2, -28, 1, 1);
    ctx.restore();
  }

  /** 墓前的小蜡烛。没有点亮时只有一截白蜡。 */
  drawCandle(decoration, time, lit) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(decoration.x), Math.round(decoration.y));

    ctx.fillStyle = '#2a1d2c';
    ctx.fillRect(-3, -2, 7, 2);
    ctx.fillStyle = '#d8cdb8';
    ctx.fillRect(-1, -7, 3, 5);
    ctx.fillStyle = '#f1e7d2';
    ctx.fillRect(-1, -7, 1, 4);

    if (lit) {
      const flicker = 0.78 + Math.sin(time * 7.5 + decoration.x) * 0.18;
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(0, -10, 1, 0, -10, 22);
      glow.addColorStop(0, `rgba(255, 214, 128, ${0.22 * flicker})`);
      glow.addColorStop(0.5, `rgba(255, 167, 74, ${0.08 * flicker})`);
      glow.addColorStop(1, 'rgba(255, 150, 60, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-24, -34, 48, 42);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = flicker;
      ctx.fillStyle = '#ffe1a0';
      ctx.fillRect(-1, -10, 2, 3);
      ctx.fillStyle = '#fff6d8';
      ctx.fillRect(0, -10, 1, 1);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = '#5b4c58';
      ctx.fillRect(0, -9, 1, 2);
    }

    ctx.restore();
  }

  /** 山道口的鸟居：两块暗红的木柱和一道横梁，是这一夜的界碑。 */
  drawTorii(decoration) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(decoration.x), Math.round(decoration.y));
    const scale = decoration.scale ?? 1;
    ctx.scale(scale, scale);

    // 远处的暗色投影
    ctx.fillStyle = 'rgba(10, 4, 8, 0.3)';
    ctx.fillRect(-26, -44, 52, 3);

    // 柱
    ctx.fillStyle = '#2b0d12';
    ctx.fillRect(-22, -46, 6, 46);
    ctx.fillRect(16, -46, 6, 46);
    ctx.fillStyle = '#6f1f26';
    ctx.fillRect(-21, -45, 3, 44);
    ctx.fillRect(17, -45, 3, 44);
    ctx.fillStyle = '#a93a38';
    ctx.fillRect(-21, -44, 1, 38);
    ctx.fillRect(18, -44, 1, 38);

    // 上梁与下梁
    ctx.fillStyle = '#2b0d12';
    ctx.fillRect(-29, -53, 58, 5);
    ctx.fillRect(-32, -57, 64, 3);
    ctx.fillRect(-24, -42, 48, 3);
    ctx.fillStyle = '#7c2329';
    ctx.fillRect(-28, -52, 56, 3);
    ctx.fillRect(-31, -56, 62, 1);
    ctx.fillRect(-23, -41, 46, 1);
    ctx.fillStyle = '#b9463e';
    ctx.fillRect(-26, -52, 40, 1);
    ctx.fillRect(-23, -41, 30, 1);

    // 梁下的纸垂
    ctx.fillStyle = 'rgba(232, 224, 206, 0.8)';
    for (const sx of [-14, -5, 5, 14]) {
      ctx.fillRect(sx, -48, 2, 5);
      ctx.fillRect(sx + 1, -44, 2, 3);
    }

    ctx.restore();
  }

  /** 石灯笼：一圈小小的暖光，给夜路定个尺度。 */
  drawStoneLantern(decoration, time) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(decoration.x), Math.round(decoration.y));
    const flicker = 0.72 + Math.sin(time * 2.1 + decoration.x * 0.02) * 0.08;

    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, -22, 2, 0, -22, 26);
    glow.addColorStop(0, `rgba(255, 198, 120, ${0.18 * flicker})`);
    glow.addColorStop(1, 'rgba(255, 160, 80, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-28, -50, 56, 54);
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = '#241a24';
    ctx.fillRect(-7, -4, 14, 4);
    ctx.fillRect(-4, -16, 8, 12);
    ctx.fillStyle = '#4a3a48';
    ctx.fillRect(-6, -3, 12, 1);
    ctx.fillRect(-3, -15, 1, 11);
    ctx.fillStyle = '#2c2030';
    ctx.fillRect(-8, -19, 16, 4);
    ctx.fillRect(-6, -27, 12, 8);
    ctx.fillStyle = '#5a4758';
    ctx.fillRect(-7, -26, 14, 2);
    ctx.fillStyle = '#ffd28a';
    ctx.globalAlpha = flicker;
    ctx.fillRect(-3, -25, 6, 5);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff0c6';
    ctx.fillRect(-1, -24, 2, 3);
    ctx.fillStyle = '#2c2030';
    ctx.fillRect(-10, -30, 20, 4);
    ctx.fillRect(-6, -33, 12, 3);
    ctx.fillStyle = '#5f4a5e';
    ctx.fillRect(-9, -29, 18, 1);
    ctx.restore();
  }

  /** 立在地上的纸灯笼，灯罩是这一夜最暖的颜色。 */
  drawPaperLantern(decoration, time) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(decoration.x), Math.round(decoration.y));
    const sway = Math.sin(time * 0.9 + decoration.x * 0.013) * 1.2;
    const flicker = 0.78 + Math.sin(time * 3.2 + decoration.x * 0.04) * 0.08;

    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, -42, 2, 0, -42, 34);
    glow.addColorStop(0, `rgba(255, 170, 96, ${0.17 * flicker})`);
    glow.addColorStop(1, 'rgba(255, 130, 60, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-36, -78, 72, 80);
    ctx.globalCompositeOperation = 'source-over';

    ctx.strokeStyle = '#2a1c22';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -38);
    ctx.lineTo(sway, -46);
    ctx.stroke();

    ctx.fillStyle = '#2a1c22';
    ctx.fillRect(-2, -1, 4, 1);
    ctx.fillStyle = '#c55432';
    ctx.fillRect(sway - 5, -52, 10, 8);
    ctx.fillRect(sway - 4, -44, 8, 4);
    ctx.fillStyle = '#f08a4c';
    ctx.fillRect(sway - 4, -51, 8, 7);
    ctx.fillStyle = '#ffd08a';
    ctx.globalAlpha = flicker;
    ctx.fillRect(sway - 2, -49, 4, 4);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#3a1410';
    ctx.fillRect(sway - 5, -44, 10, 1);
    ctx.fillRect(sway - 5, -53, 10, 1);
    ctx.fillRect(sway - 1, -43, 2, 3);
    ctx.restore();
  }

  /** 横跨街道的一串纸灯笼，绳子会微微下垂。 */
  drawLanternString(decoration, time) {
    const ctx = this.ctx;
    const length = decoration.length ?? 120;
    const x0 = Math.round(decoration.x);
    const y0 = Math.round(decoration.y);
    const sag = 10;

    ctx.save();
    ctx.strokeStyle = 'rgba(44, 30, 34, 0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= length; i += 6) {
      const t = i / length;
      const y = y0 + Math.sin(t * Math.PI) * sag;
      if (i === 0) ctx.moveTo(x0 + i, y);
      else ctx.lineTo(x0 + i, y);
    }
    ctx.stroke();

    const count = Math.max(2, Math.floor(length / 26));
    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.5) / count;
      const x = x0 + length * t;
      const y = y0 + Math.sin(t * Math.PI) * sag;
      const flicker = 0.7 + Math.sin(time * 2.4 + i * 1.7) * 0.12;

      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(x, y + 7, 1, x, y + 7, 13);
      glow.addColorStop(0, `rgba(255, 182, 104, ${0.14 * flicker})`);
      glow.addColorStop(1, 'rgba(255, 150, 70, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 14, y - 8, 28, 30);
      ctx.globalCompositeOperation = 'source-over';

      ctx.fillStyle = '#2a1c22';
      ctx.fillRect(x, y, 1, 3);
      ctx.fillStyle = '#ba4b2e';
      ctx.fillRect(x - 3, y + 4, 6, 6);
      ctx.fillRect(x - 2, y + 10, 4, 2);
      ctx.fillStyle = '#f39a58';
      ctx.fillRect(x - 2, y + 5, 4, 4);
      ctx.fillStyle = '#ffe0a8';
      ctx.globalAlpha = flicker;
      ctx.fillRect(x - 1, y + 6, 2, 2);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /** 一丛瘦竹，给山道和废寺立几根竖直的线。 */
  drawBamboo(decoration) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(decoration.x), Math.round(decoration.y));
    const scale = decoration.scale ?? 1;
    ctx.scale(scale, scale);
    const n = hash(decoration.x, 3);

    const stalk = (x, height, lean) => {
      ctx.fillStyle = '#233a2c';
      ctx.fillRect(x + lean, -height, 3, height);
      ctx.fillStyle = '#41684a';
      ctx.fillRect(x + lean, -height, 1, height);
      ctx.fillStyle = '#2c4a36';
      for (let y = -height + 7; y < 0; y += 9) {
        ctx.fillRect(x + lean, y, 3, 1);
      }
      ctx.fillStyle = '#5f8f5c';
      for (let i = 0; i < 3; i += 1) {
        const ly = -height + 6 + i * 11;
        ctx.fillRect(x + lean - 5 - i, ly, 5, 1);
        ctx.fillRect(x + lean + 4 + i, ly + 3, 5, 1);
        ctx.fillRect(x + lean - 8 - i, ly + 1, 3, 1);
      }
    };

    stalk(-6, 42 + n * 8, -1);
    stalk(4, 52 + (1 - n) * 6, 1);
    stalk(12, 36 + n * 5, 0);
    ctx.restore();
  }

  /** 一团不肯走的鬼火。 */
  drawSpiritFlame(decoration, time) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(decoration.x), Math.round(decoration.y));
    const bob = Math.sin(time * 1.7 + decoration.x * 0.02) * 2.5;
    const flicker = 0.7 + Math.sin(time * 5.3 + decoration.x) * 0.2;

    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, -14 + bob, 1, 0, -14 + bob, 22);
    glow.addColorStop(0, `rgba(150, 220, 255, ${0.16 * flicker})`);
    glow.addColorStop(0.5, `rgba(132, 118, 255, ${0.07 * flicker})`);
    glow.addColorStop(1, 'rgba(110, 90, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-24, -38 + bob, 48, 44);
    ctx.restore();

    ctx.save();
    ctx.translate(Math.round(decoration.x), Math.round(decoration.y + bob));
    ctx.fillStyle = '#7fd7ff';
    ctx.globalAlpha = 0.85;
    ctx.fillRect(-2, -17, 4, 4);
    ctx.fillRect(-1, -21, 3, 5);
    ctx.fillStyle = '#d8f8ff';
    ctx.fillRect(0, -19, 1, 3);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#8f9bff';
    ctx.fillRect(-4, -14, 2, 2);
    ctx.fillRect(3, -16, 2, 2);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawTree(decoration) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(decoration.x), Math.round(decoration.y));
    ctx.scale(decoration.scale, decoration.scale);
    ctx.fillStyle = '#160d20';

    ctx.fillRect(-4, -50, 8, 50);
    ctx.fillRect(-7, -4, 4, 4);
    ctx.fillRect(3, -3, 5, 3);
    ctx.fillRect(-2, -55, 4, 7);
    ctx.fillRect(-12, -44, 9, 3);
    ctx.fillRect(-18, -50, 7, 3);
    ctx.fillRect(-17, -59, 3, 10);
    ctx.fillRect(-23, -61, 7, 2);
    ctx.fillRect(4, -48, 10, 3);
    ctx.fillRect(11, -54, 3, 8);
    ctx.fillRect(13, -58, 7, 2);
    ctx.fillRect(2, -38, 8, 2);
    ctx.fillRect(9, -42, 2, 5);
    ctx.fillRect(-10, -33, 7, 2);
    ctx.fillRect(-13, -39, 2, 7);
    ctx.fillRect(-2, -29, 8, 2);
    ctx.fillRect(5, -35, 2, 7);

    // 树干的冷色反光
    ctx.fillStyle = '#281a33';
    ctx.fillRect(-4, -49, 2, 44);
    ctx.fillRect(-11, -43, 5, 1);
    ctx.fillRect(4, -47, 5, 1);

    // 枯枝上的小果实 / 眼睛
    ctx.fillStyle = 'rgba(201, 149, 92, 0.5)';
    ctx.fillRect(-18, -60, 2, 2);
    ctx.fillRect(11, -53, 2, 2);
    ctx.restore();
  }

  drawGrave(decoration) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(decoration.x), Math.round(decoration.y));
    ctx.fillStyle = '#191021';
    ctx.fillRect(-8, -17, 16, 17);
    ctx.fillRect(-7, -20, 14, 3);
    ctx.fillRect(-5, -22, 10, 2);

    ctx.fillStyle = '#352a42';
    ctx.fillRect(-6, -18, 12, 18);
    ctx.fillRect(-5, -21, 10, 3);
    ctx.fillRect(-3, -23, 6, 2);
    ctx.fillStyle = '#4b3d59';
    ctx.fillRect(-5, -21, 7, 1);
    ctx.fillRect(-5, -17, 2, 14);

    ctx.fillStyle = '#271d32';
    if (decoration.variant === 1) {
      ctx.fillRect(-1, -17, 2, 9);
      ctx.fillRect(-4, -14, 8, 2);
    } else if (decoration.variant === 2) {
      ctx.fillRect(-3, -15, 6, 1);
      ctx.fillRect(-2, -13, 2, 1);
      ctx.fillRect(-1, -16, 1, 4);
    } else {
      ctx.fillRect(-3, -16, 6, 1);
      ctx.fillRect(-2, -14, 1, 1);
      ctx.fillRect(1, -14, 1, 1);
    }

    ctx.fillStyle = '#2b2037';
    ctx.fillRect(-8, -1, 16, 1);
    ctx.fillStyle = '#52663e';
    ctx.fillRect(-10, -1, 4, 1);
    ctx.fillRect(7, -1, 4, 1);
    ctx.restore();
  }

  /**
   * 地上会动、会被推、会被抱起来抛的南瓜。
   * 位置与碰撞盒都由 PumpkinWorld 维护，这里只按底边中心画同一套南瓜画法。
   */
  drawPumpkins(game, time, cameraX, cameraY) {
    const world = game.pumpkins;
    if (!world?.pumpkins?.length) return;
    const pumpkins = [...world.pumpkins].sort((a, b) => a.y + a.h - (b.y + b.h));
    for (const pumpkin of pumpkins) {
      if (pumpkin.x + pumpkin.w < cameraX - 120) continue;
      if (pumpkin.x > cameraX + VIEW.WIDTH + 120) continue;
      if (pumpkin.y + pumpkin.h < cameraY - 160) continue;
      if (pumpkin.y > cameraY + VIEW.HEIGHT + 160) continue;
      this.drawPumpkin(
        {
          x: pumpkin.x + pumpkin.w / 2,
          y: pumpkin.y + pumpkin.h,
          variant: pumpkin.variant,
        },
        time,
      );
    }
  }

  drawPumpkin(decoration, time) {
    const ctx = this.ctx;
    const x = Math.round(decoration.x);
    const y = Math.round(decoration.y);
    const variant = decoration.variant ?? 0;
    const flicker = 0.8 + Math.sin(time * 7 + x * 0.05) * 0.1 + Math.sin(time * 13 + y) * 0.05;

    ctx.save();
    ctx.translate(x, y);

    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, -8, 1, 0, -8, 25);
    glow.addColorStop(0, `rgba(255, 158, 62, ${0.1 * flicker})`);
    glow.addColorStop(0.5, `rgba(255, 120, 26, ${0.045 * flicker})`);
    glow.addColorStop(1, 'rgba(255, 100, 20, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-26, -34, 52, 45);
    ctx.globalCompositeOperation = 'source-over';

    // 茎与叶子
    ctx.fillStyle = '#3d5a2b';
    ctx.fillRect(-1, -14, 3, 4);
    ctx.fillStyle = '#6f9143';
    ctx.fillRect(0, -15, 2, 2);
    ctx.fillStyle = '#577238';
    ctx.fillRect(2, -13, 3, 1);
    ctx.fillRect(4, -12, 2, 1);

    // 南瓜本体
    ctx.fillStyle = PALETTE.pumpkinDark;
    ctx.fillRect(-3, -11, 7, 10);
    ctx.fillRect(-6, -10, 13, 8);
    ctx.fillRect(-5, -2, 11, 2);
    ctx.fillStyle = PALETTE.pumpkin;
    ctx.fillRect(-4, -11, 8, 9);
    ctx.fillRect(-7, -9, 14, 6);
    ctx.fillRect(-5, -3, 10, 2);
    ctx.fillStyle = PALETTE.pumpkinLight;
    ctx.fillRect(-5, -10, 4, 1);
    ctx.fillRect(-6, -8, 2, 3);
    ctx.fillStyle = '#d55e0c';
    ctx.fillRect(-2, -10, 1, 8);
    ctx.fillRect(2, -10, 1, 8);

    // 发光面孔
    ctx.fillStyle = '#26100f';
    if (variant === 1) {
      ctx.fillRect(-5, -8, 2, 2);
      ctx.fillRect(3, -8, 2, 2);
      ctx.fillRect(-3, -5, 6, 1);
      ctx.fillRect(-4, -4, 1, 1);
      ctx.fillRect(3, -4, 1, 1);
    } else if (variant === 2) {
      ctx.fillRect(-5, -9, 2, 1);
      ctx.fillRect(-4, -8, 1, 2);
      ctx.fillRect(3, -9, 2, 1);
      ctx.fillRect(3, -8, 1, 2);
      ctx.fillRect(-2, -4, 4, 1);
      ctx.fillRect(-1, -5, 2, 1);
    } else {
      ctx.fillRect(-5, -8, 2, 2);
      ctx.fillRect(3, -8, 2, 2);
      ctx.fillRect(-3, -5, 2, 2);
      ctx.fillRect(0, -4, 3, 2);
      ctx.fillRect(2, -6, 1, 2);
    }
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = PALETTE.candle;
    ctx.fillRect(-4, -8, 1, 1);
    ctx.fillRect(4, -8, 1, 1);
    ctx.fillRect(-2, -4, 1, 1);
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  /** 万圣夜路边的一小桶糖：不参与玩法，只是让百鬼队伍知道该往哪走。 */
  drawCandyBucket(decoration, time) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(decoration.x), Math.round(decoration.y));
    const bob = Math.sin(time * 1.8 + decoration.x * 0.02) * 0.6;

    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, -10, 1, 0, -10, 24);
    glow.addColorStop(0, 'rgba(255, 186, 106, 0.12)');
    glow.addColorStop(1, 'rgba(255, 140, 60, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-26, -32, 52, 38);
    ctx.globalCompositeOperation = 'source-over';

    // 桶
    ctx.fillStyle = '#2a1a18';
    ctx.fillRect(-7, -10, 14, 10);
    ctx.fillStyle = '#5a3530';
    ctx.fillRect(-6, -9, 12, 8);
    ctx.fillStyle = '#8a5a45';
    ctx.fillRect(-6, -9, 12, 1);
    ctx.fillRect(-5, -5, 10, 1);
    ctx.fillStyle = '#3a2420';
    ctx.fillRect(-8, -11, 16, 2);
    ctx.fillStyle = '#c89a6a';
    ctx.fillRect(-7, -11, 14, 1);

    // 露出来的糖
    const candies = [
      [-4, -15, '#ffcf5a'],
      [0, -17, '#c08aff'],
      [4, -14, '#7fe0b0'],
      [-1, -13, '#ff8fa8'],
    ];
    for (let i = 0; i < candies.length; i += 1) {
      const [x, y, color] = candies[i];
      const sway = Math.round(Math.sin(time * 2.4 + i * 1.7) * 0.7);
      ctx.fillStyle = color;
      ctx.fillRect(x + sway, y + Math.round(bob), 2, 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillRect(x + sway, y + Math.round(bob), 1, 1);
      ctx.fillStyle = '#e9dcc8';
      ctx.fillRect(x + sway - 1, y + 1 + Math.round(bob), 1, 1);
      ctx.fillRect(x + sway + 2, y + 1 + Math.round(bob), 1, 1);
    }

    ctx.restore();
  }

  drawLamp(decoration, time) {
    const ctx = this.ctx;
    const x = Math.round(decoration.x);
    const y = Math.round(decoration.y);
    const flicker = 0.9 + Math.sin(time * 9 + x) * 0.06 + Math.sin(time * 17) * 0.03;

    ctx.save();
    ctx.translate(x, y);

    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, -34, 1, 0, -34, 31);
    glow.addColorStop(0, `rgba(255, 198, 95, ${0.16 * flicker})`);
    glow.addColorStop(0.5, `rgba(255, 145, 48, ${0.055 * flicker})`);
    glow.addColorStop(1, 'rgba(255, 120, 30, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-32, -66, 64, 64);
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = '#221528';
    ctx.fillRect(-1, -30, 3, 30);
    ctx.fillRect(-4, -3, 9, 3);
    ctx.fillRect(-4, -30, 9, 2);
    ctx.fillStyle = '#51354a';
    ctx.fillRect(-1, -29, 1, 26);

    // 灯罩
    ctx.fillStyle = '#211528';
    ctx.fillRect(-5, -43, 10, 2);
    ctx.fillRect(-6, -32, 12, 2);
    ctx.fillRect(-4, -41, 1, 9);
    ctx.fillRect(3, -41, 1, 9);
    ctx.fillStyle = PALETTE.candle;
    ctx.globalAlpha = flicker;
    ctx.fillRect(-3, -40, 6, 7);
    ctx.fillStyle = '#fff1b9';
    ctx.fillRect(-1, -38, 3, 4);
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#1b1120';
    ctx.fillRect(-1, -41, 1, 9);
    ctx.fillRect(1, -41, 1, 9);
    ctx.fillRect(-6, -36, 12, 1);
    ctx.restore();
  }

  drawSign(decoration) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(decoration.x), Math.round(decoration.y));

    ctx.fillStyle = '#241620';
    ctx.fillRect(-1, -22, 3, 22);
    ctx.fillRect(-8, -27, 17, 11);
    ctx.fillStyle = '#5b3b34';
    ctx.fillRect(-7, -26, 15, 9);
    ctx.fillStyle = '#815843';
    ctx.fillRect(-7, -26, 15, 1);
    ctx.fillRect(-7, -25, 1, 7);
    ctx.fillStyle = '#3c2726';
    ctx.fillRect(-4, -23, 8, 1);
    ctx.fillRect(-4, -21, 5, 1);
    ctx.fillRect(0, -22, 1, 2);
    ctx.fillStyle = PALETTE.pumpkin;
    ctx.fillRect(4, -24, 2, 2);

    ctx.fillStyle = '#3c2726';
    ctx.fillRect(-11, -9, 12, 2);
    ctx.fillRect(-12, -6, 16, 2);
    ctx.restore();
  }

  drawMushroom(decoration) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(decoration.x), Math.round(decoration.y));

    ctx.fillStyle = '#d7c5ac';
    ctx.fillRect(-1, -4, 2, 4);
    ctx.fillStyle = '#6d3f69';
    ctx.fillRect(-4, -6, 8, 2);
    ctx.fillRect(-3, -7, 6, 1);
    ctx.fillRect(-2, -8, 4, 1);
    ctx.fillStyle = '#ad7aa8';
    ctx.fillRect(-3, -7, 2, 1);
    ctx.fillStyle = '#ddcbb1';
    ctx.fillRect(1, -7, 1, 1);
    ctx.fillRect(-1, -6, 1, 1);
    ctx.restore();
  }

  drawFence(decoration) {
    const ctx = this.ctx;
    const length = decoration.length ?? 1;

    ctx.save();
    ctx.translate(Math.round(decoration.x), Math.round(decoration.y));
    ctx.fillStyle = '#251820';

    for (let i = 0; i < length; i += 1) {
      const x = i * 16;
      ctx.fillRect(x, -18, 3, 18);
      ctx.fillRect(x - 1, -20, 5, 2);
    }
    ctx.fillRect(0, -14, (length - 1) * 16 + 3, 2);
    ctx.fillRect(0, -7, (length - 1) * 16 + 3, 2);
    ctx.fillStyle = '#4d3631';
    ctx.fillRect(1, -18, 1, 15);
    ctx.fillRect(0, -14, (length - 1) * 16 + 3, 1);
    ctx.restore();
  }

  drawCrystal(decoration, time) {
    const ctx = this.ctx;
    const mood = this.level.mood;
    const accent = mood === 'arcane' ? '#72ddff' : mood === 'ritual' ? '#d49bff' : '#ffb066';
    const dark = mood === 'arcane' ? '#2c5e76' : mood === 'ritual' ? '#5b3973' : '#7d432d';
    const x = Math.round(decoration.x);
    const y = Math.round(decoration.y);
    const scale = decoration.scale ?? 1;
    const pulse = 0.7 + Math.sin(time * 2.1 + x * 0.03) * 0.18;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, -12, 1, 0, -12, 27);
    glow.addColorStop(0, mood === 'arcane' ? `rgba(100, 220, 255, ${0.14 * pulse})` : `rgba(255, 150, 75, ${0.09 * pulse})`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-28, -40, 56, 45);
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = dark;
    ctx.fillRect(-4, -4, 9, 4);
    ctx.fillRect(-3, -12, 7, 9);
    ctx.fillRect(-1, -25, 3, 14);
    ctx.fillRect(2, -18, 3, 9);
    ctx.fillRect(-6, -13, 3, 7);

    ctx.fillStyle = accent;
    ctx.fillRect(-2, -22, 1, 14);
    ctx.fillRect(0, -26, 1, 22);
    ctx.fillRect(2, -16, 1, 8);
    ctx.fillRect(-5, -11, 1, 4);
    ctx.globalAlpha = 0.55 * pulse;
    ctx.fillRect(-7, -13, 2, 3);
    ctx.fillRect(5, -17, 2, 3);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawStalagmite(decoration) {
    const ctx = this.ctx;
    const scale = decoration.scale ?? 1;
    ctx.save();
    ctx.translate(Math.round(decoration.x), Math.round(decoration.y));
    ctx.scale(scale, scale);
    ctx.fillStyle = '#1b1420';
    ctx.fillRect(-9, -16, 18, 16);
    ctx.fillRect(-6, -26, 12, 10);
    ctx.fillRect(-3, -35, 6, 9);
    ctx.fillRect(0, -40, 2, 5);
    ctx.fillStyle = '#2a2030';
    ctx.fillRect(-6, -24, 2, 18);
    ctx.fillRect(-2, -32, 1, 10);
    ctx.fillStyle = this.level.mood === 'arcane' ? '#375f6b' : '#5a3831';
    ctx.fillRect(4, -14, 1, 6);
    ctx.restore();
  }

  drawStalactite(decoration) {
    const ctx = this.ctx;
    const scale = decoration.scale ?? 1;
    ctx.save();
    ctx.translate(Math.round(decoration.x), Math.round(decoration.y));
    ctx.scale(scale, scale);
    ctx.fillStyle = '#16101b';
    ctx.fillRect(-8, 0, 16, 8);
    ctx.fillRect(-5, 8, 10, 12);
    ctx.fillRect(-3, 20, 6, 11);
    ctx.fillRect(-1, 31, 3, 8);
    ctx.fillStyle = '#2b202f';
    ctx.fillRect(-5, 9, 2, 10);
    ctx.fillRect(-2, 20, 1, 8);
    ctx.restore();
  }

  drawSkullPile(decoration) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(decoration.x), Math.round(decoration.y));
    const skull = (x, y) => {
      ctx.fillRect(x - 3, y - 5, 7, 5);
      ctx.fillRect(x - 2, y - 7, 5, 2);
      ctx.fillStyle = '#21141e';
      ctx.fillRect(x - 2, y - 4, 1, 1);
      ctx.fillRect(x + 1, y - 4, 1, 1);
      ctx.fillRect(x - 1, y - 2, 3, 1);
      ctx.fillStyle = '#b7a68e';
    };

    ctx.fillStyle = '#b7a68e';
    skull(-2, -1);
    skull(5, -5);
    ctx.fillRect(-10, -2, 6, 2);
    ctx.fillRect(8, -2, 8, 2);
    ctx.fillRect(-8, -4, 2, 2);
    ctx.fillRect(12, -3, 2, 1);
    ctx.fillStyle = '#6e5f52';
    ctx.fillRect(-9, -1, 4, 1);
    ctx.restore();
  }

  drawChain(decoration) {
    const ctx = this.ctx;
    const length = decoration.length ?? 3;
    ctx.save();
    ctx.translate(Math.round(decoration.x), Math.round(decoration.y));
    ctx.fillStyle = 'rgba(92, 75, 89, 0.55)';
    for (let i = 0; i < length; i += 1) {
      ctx.fillRect(-1, i * 11, 2, 7);
      ctx.fillRect(-2, i * 11 + 7, 4, 2);
    }
    ctx.restore();
  }

  drawRune(decoration, time) {
    const ctx = this.ctx;
    const glow = 0.5 + Math.sin(time * 1.8 + decoration.x) * 0.18;
    ctx.save();
    ctx.translate(Math.round(decoration.x), Math.round(decoration.y));
    ctx.globalAlpha = glow;
    ctx.fillStyle = this.level.mood === 'arcane' ? '#62d4e8' : '#c05d50';
    ctx.fillRect(-9, -2, 18, 1);
    ctx.fillRect(-7, -4, 3, 1);
    ctx.fillRect(4, -4, 3, 1);
    ctx.fillRect(-4, -7, 1, 4);
    ctx.fillRect(3, -7, 1, 4);
    ctx.fillRect(-2, -6, 5, 1);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawFireflies(time, cameraX) {
    const ctx = this.ctx;
    const isCavern = this.level.style === 'cavern';
    const isArcane = this.level.mood === 'arcane';
    const glowColor = isArcane ? '#7adfff' : '#ffb257';
    const coreColor = isArcane ? '#e5fdff' : '#ffe3a7';

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const firefly of this.fireflies) {
      const x = firefly.x + Math.sin(time * 0.4 + firefly.phase) * firefly.drift;
      if (x < cameraX - 8 || x > cameraX + VIEW.WIDTH + 8) continue;

      const worldY =
        firefly.y +
        Math.sin(time * 0.7 + firefly.phase * 1.7) * firefly.drift +
        (isCavern ? -1.5 : 0);
      if (worldY < this.cameraY - 8 || worldY > this.cameraY + VIEW.HEIGHT + 8) continue;

      const screenX = Math.round(x);
      const y = Math.round(worldY);
      const alpha = Math.max(0, Math.sin(time * 1.8 + firefly.phase)) * (isCavern ? 0.85 : 0.7);

      ctx.globalAlpha = alpha * 0.25;
      ctx.fillStyle = glowColor;
      ctx.fillRect(screenX - 2, y - 2, 5, 5);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = coreColor;
      ctx.fillRect(screenX, y, firefly.size, firefly.size);
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawMist(time, cameraX) {
    const ctx = this.ctx;
    // 雾也取这一段的病色，让地面的近景和天色连成同一种颜色。
    const mist = this.level.backdrop?.mist ?? this.level.memorialChapter?.backdrop?.mist;
    const baseRgb = mist ?? '135, 105, 161';
    const layerRgb = mist ?? '182, 148, 199';
    const base = ctx.createLinearGradient(0, 205, 0, VIEW.HEIGHT);
    base.addColorStop(0, `rgba(${baseRgb}, 0)`);
    base.addColorStop(0.62, `rgba(${baseRgb}, 0.045)`);
    base.addColorStop(1, `rgba(${baseRgb}, 0.12)`);
    ctx.fillStyle = base;
    ctx.fillRect(0, 195, VIEW.WIDTH, VIEW.HEIGHT - 195);

    for (let layer = 0; layer < 3; layer += 1) {
      ctx.fillStyle = layer % 2 === 0
        ? `rgba(${layerRgb}, 0.028)`
        : `rgba(${layerRgb}, 0.022)`;

      const yBase = 224 + layer * 18;
      const speed = 4 + layer * 3;
      const phase = time * speed + cameraX * 0.04 * (layer + 1);

      for (let i = -1; i < 9; i += 1) {
        const x = i * 72 + (phase % 72);
        const y = yBase + Math.sin((x + phase) * 0.025 + layer) * 3;
        ctx.fillRect(Math.round(x), Math.round(y), 58, 2);
        ctx.fillRect(Math.round(x + 12), Math.round(y + 3), 34, 1);
        ctx.fillRect(Math.round(x + 35), Math.round(y - 2), 22, 1);
      }
    }
  }

  drawCobwebs() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(218, 202, 226, 0.1)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(26, 18);
    ctx.moveTo(0, 0);
    ctx.lineTo(10, 27);
    ctx.moveTo(0, 0);
    ctx.lineTo(36, 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 15, 0.25, 1.35);
    ctx.arc(0, 0, 25, 0.25, 1.35);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(VIEW.WIDTH, 0);
    ctx.lineTo(VIEW.WIDTH - 22, 14);
    ctx.moveTo(VIEW.WIDTH, 0);
    ctx.lineTo(VIEW.WIDTH - 9, 25);
    ctx.stroke();

    ctx.restore();
  }

  drawCavernBackground(time, cameraX, cameraY = 0) {
    const ctx = this.ctx;
    const mood = this.level.mood;
    const isArcane = mood === 'arcane';
    const isRitual = mood === 'ritual';
    // 第五段虽然换成洞穴赛道，天光和雾仍沿用这一段的病色。
    const backdrop = mood === 'memorial' ? this.level.memorialChapter?.backdrop : null;
    const top = backdrop?.skyTop ?? (isArcane ? '#070a16' : '#0a060d');
    const mid = backdrop?.skyMid ?? (isArcane ? '#111527' : isRitual ? '#1c0b1c' : '#1b0e17');
    const low = backdrop?.skyLow ?? (isArcane ? '#1c2436' : isRitual ? '#321421' : '#351512');
    const glowColor = backdrop?.haze ?? (isArcane ? '86, 208, 255' : isRitual ? '215, 84, 112' : '255, 112, 43');

    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW.HEIGHT);
    gradient.addColorStop(0, top);
    gradient.addColorStop(0.58, mid);
    gradient.addColorStop(1, low);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);

    const depthGlow = ctx.createRadialGradient(
      VIEW.WIDTH * 0.55,
      278,
      10,
      VIEW.WIDTH * 0.55,
      278,
      260,
    );
    depthGlow.addColorStop(0, `rgba(${glowColor}, ${isArcane ? 0.16 : 0.22})`);
    depthGlow.addColorStop(0.45, `rgba(${glowColor}, 0.05)`);
    depthGlow.addColorStop(1, `rgba(${glowColor}, 0)`);
    ctx.fillStyle = depthGlow;
    ctx.fillRect(0, 70, VIEW.WIDTH, VIEW.HEIGHT - 70);

    // 远处石柱
    ctx.save();
    ctx.translate(0, -cameraY * 0.055);
    const pillarColor = backdrop?.nearHill ?? (isArcane ? '#0e1220' : '#150d15');
    ctx.fillStyle = pillarColor;
    const wrap = VIEW.WIDTH + 190;
    for (let index = 0; index < 8; index += 1) {
      const x = ((index * 137 - cameraX * 0.11) % wrap + wrap) % wrap - 70;
      const height = 92 + Math.sin(index * 1.9) * 44;
      const width = 31 + (index % 3) * 12;
      const base = 273;
      ctx.fillRect(Math.round(x), Math.round(base - height), width, height);
      ctx.fillRect(Math.round(x - 5), Math.round(base - height + 12), width + 10, 7);
      ctx.fillRect(Math.round(x + 5), Math.round(base - height - 8), Math.max(6, width - 12), 10);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.fillRect(Math.round(x + 3), Math.round(base - height + 3), 2, Math.max(4, height - 18));
      ctx.fillStyle = pillarColor;
    }

    // 中景残破拱门
    const archX = Math.round(348 - cameraX * 0.18);
    ctx.fillStyle = backdrop?.farHill
      ?? (isArcane ? '#0b0e1a' : isRitual ? '#160b16' : '#130c12');
    ctx.fillRect(archX, 146, 17, 128);
    ctx.fillRect(archX + 89, 146, 17, 128);
    ctx.fillRect(archX + 17, 146, 72, 18);
    ctx.fillRect(archX + 27, 136, 53, 12);
    ctx.fillRect(archX + 39, 127, 30, 10);
    ctx.fillRect(archX + 8, 161, 5, 18);
    ctx.fillRect(archX + 104, 153, 6, 25);
    ctx.fillStyle = backdrop
      ? `rgba(${backdrop.haze}, 0.05)`
      : isArcane ? 'rgba(91, 221, 255, 0.07)' : 'rgba(255, 121, 48, 0.06)';
    ctx.fillRect(archX + 39, 164, 35, 63);
    ctx.restore();

    // 洞顶垂下的暗影
    ctx.fillStyle = 'rgba(4, 2, 7, 0.46)';
    for (let x = -10; x < VIEW.WIDTH + 20; x += 26) {
      const drop = 8 + ((Math.sin(x * 0.11 + cameraX * 0.01) + 1) * 10);
      ctx.fillRect(x, 0, 20, drop);
      ctx.fillRect(x + 5, drop, 8, 6);
    }

    // 浮尘
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let index = 0; index < this.stars.length; index += 2) {
      const star = this.stars[index];
      const x = ((star.x - cameraX * 0.04) % (VIEW.WIDTH + 60) + VIEW.WIDTH + 60) % (VIEW.WIDTH + 60) - 30;
      const y = 32 + (star.y * 1.55) % 180;
      const alpha = 0.08 + Math.max(0, Math.sin(time * 0.7 + star.phase)) * 0.1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = backdrop
        ? `rgb(${backdrop.haze})`
        : isArcane ? '#9ceaff' : '#ffc184';
      ctx.fillRect(Math.round(x), Math.round(y), star.size, star.size);
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // 远处的熔岩湖 / 冷光潭
    const pool = ctx.createLinearGradient(0, 225, 0, VIEW.HEIGHT);
    if (backdrop) {
      pool.addColorStop(0, `rgba(${backdrop.haze}, 0)`);
      pool.addColorStop(0.62, `rgba(${backdrop.haze}, 0.06)`);
      pool.addColorStop(1, `rgba(${backdrop.haze}, 0.17)`);
    } else if (isArcane) {
      pool.addColorStop(0, 'rgba(63, 124, 152, 0)');
      pool.addColorStop(0.62, 'rgba(69, 133, 164, 0.08)');
      pool.addColorStop(1, 'rgba(53, 94, 117, 0.22)');
    } else {
      pool.addColorStop(0, 'rgba(255, 112, 34, 0)');
      pool.addColorStop(0.58, 'rgba(255, 94, 26, 0.12)');
      pool.addColorStop(1, 'rgba(255, 116, 26, 0.32)');
    }
    ctx.fillStyle = pool;
    ctx.fillRect(0, 222, VIEW.WIDTH, VIEW.HEIGHT - 222);

    if (isArcane) {
      const runeGlow = 0.5 + Math.sin(time * 0.8) * 0.1;
      ctx.save();
      ctx.globalAlpha = runeGlow;
      ctx.strokeStyle = 'rgba(98, 207, 230, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(238 - cameraX * 0.1, 171, 48, 0, Math.PI * 2);
      ctx.arc(238 - cameraX * 0.1, 171, 58, 0.3, 2.3);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawHazards(time, cameraX) {
    const ctx = this.ctx;

    for (const hazard of this.level.hazards) {
      if (
        hazard.x + hazard.w < cameraX - 20 ||
        hazard.x > cameraX + VIEW.WIDTH + 20
      ) {
        continue;
      }

      if (hazard.type === 'void') {
        const gradient = ctx.createLinearGradient(0, hazard.y - 45, 0, hazard.y + hazard.h);
        gradient.addColorStop(0, 'rgba(11, 7, 17, 0)');
        gradient.addColorStop(0.55, 'rgba(13, 8, 23, 0.65)');
        gradient.addColorStop(1, 'rgba(7, 4, 12, 1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(hazard.x, hazard.y - 45, hazard.w, hazard.h + 45);
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = '#7960a0';
        for (let i = 0; i < 12; i += 1) {
          const x = hazard.x + ((i * 37 + time * 9) % hazard.w);
          const y = hazard.y - 20 + Math.sin(i * 2 + time) * 9;
          ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
        }
        ctx.globalAlpha = 1;
        continue;
      }

      if (hazard.type === 'spikes') {
        // 井顶倒挂尖刺：封住场区上方，防止被托起后从井顶越过去。
        ctx.save();
        ctx.fillStyle = '#1c1420';
        ctx.fillRect(hazard.x, hazard.y, hazard.w, 5);
        ctx.fillStyle = '#372a3b';
        ctx.fillRect(hazard.x, hazard.y, hazard.w, 2);

        const bite = 11;
        for (let x = hazard.x; x < hazard.x + hazard.w; x += bite) {
          ctx.fillStyle = '#c7b6a0';
          ctx.beginPath();
          ctx.moveTo(x, hazard.y + 4);
          ctx.lineTo(x + bite / 2, hazard.y + hazard.h);
          ctx.lineTo(x + bite, hazard.y + 4);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = 'rgba(255, 242, 215, 0.55)';
          ctx.fillRect(Math.round(x + bite / 2) - 1, hazard.y + 5, 1, Math.max(3, hazard.h - 9));
          ctx.fillStyle = '#6e5f52';
          ctx.fillRect(x, hazard.y + 3, 1, 1);
        }
        ctx.restore();
        continue;
      }

      if (hazard.type === 'miasma') {
        ctx.save();
        ctx.beginPath();
        ctx.rect(hazard.x, hazard.y - 6, hazard.w, hazard.h + 6);
        ctx.clip();

        const fog = ctx.createLinearGradient(0, hazard.y - 6, 0, hazard.y + hazard.h);
        fog.addColorStop(0, 'rgba(90, 54, 112, 0.16)');
        fog.addColorStop(0.55, 'rgba(58, 30, 76, 0.68)');
        fog.addColorStop(1, 'rgba(24, 10, 34, 0.94)');
        ctx.fillStyle = fog;
        ctx.fillRect(hazard.x, hazard.y - 6, hazard.w, hazard.h + 6);

        // 贴着地面的紫色雾
        for (let band = 0; band < 3; band += 1) {
          ctx.fillStyle =
            band === 0
              ? 'rgba(186, 132, 214, 0.4)'
              : band === 1
                ? 'rgba(122, 82, 168, 0.32)'
                : 'rgba(76, 46, 116, 0.26)';
          for (let x = hazard.x - 6; x < hazard.x + hazard.w + 6; x += 10) {
            const y =
              hazard.y +
              band * 3 +
              Math.sin(x * 0.1 + time * (1.2 + band * 0.4)) * (2 + band);
            ctx.fillRect(Math.round(x), Math.round(y), 10, 1);
          }
        }

        // 上升的鬼火
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 16; i += 1) {
          const seed = hash(i + 7, Math.round(hazard.x));
          const x = hazard.x + seed * hazard.w;
          const rise = (time * (8 + seed * 14) + seed * 40) % 26;
          const y = hazard.y + 10 - rise;
          ctx.globalAlpha = 0.28 + seed * 0.4;
          ctx.fillStyle = seed > 0.55 ? '#b9e6ff' : '#c193ff';
          ctx.fillRect(Math.round(x), Math.round(y), seed > 0.7 ? 2 : 1, 2);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();

        // 上方溢出的紫光
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const bloom = ctx.createLinearGradient(0, hazard.y - 34, 0, hazard.y + 6);
        bloom.addColorStop(0, 'rgba(150, 96, 200, 0)');
        bloom.addColorStop(1, 'rgba(150, 96, 200, 0.1)');
        ctx.fillStyle = bloom;
        ctx.fillRect(hazard.x - 4, hazard.y - 34, hazard.w + 8, 40);
        ctx.restore();
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(hazard.x, hazard.y, hazard.w, hazard.h);
      ctx.clip();

      const lava = ctx.createLinearGradient(0, hazard.y, 0, hazard.y + hazard.h + 10);
      lava.addColorStop(0, '#ffd66d');
      lava.addColorStop(0.2, '#ff9f2d');
      lava.addColorStop(0.62, '#e95314');
      lava.addColorStop(1, '#7b1b10');
      ctx.fillStyle = lava;
      ctx.fillRect(hazard.x, hazard.y - 2, hazard.w, hazard.h + 4);

      // 翻涌的表面
      for (let band = 0; band < 3; band += 1) {
        ctx.fillStyle = band === 0 ? 'rgba(255, 236, 144, 0.9)' : band === 1 ? 'rgba(255, 163, 55, 0.72)' : 'rgba(197, 56, 19, 0.5)';
        for (let x = hazard.x - 8; x < hazard.x + hazard.w + 8; x += 8) {
          const y =
            hazard.y +
            band * 4 +
            Math.sin(x * 0.08 + time * (1.4 + band * 0.35)) * (2.5 + band) +
            Math.sin(x * 0.023 - time * 0.8) * 2;
          ctx.fillRect(Math.round(x), Math.round(y), 9, band === 0 ? 3 : 1);
        }
      }

      // 冷却的岩壳与发亮的裂缝边缘
      for (let x = hazard.x; x < hazard.x + hazard.w; x += 17) {
        const seed = hash(x, 29);
        if (seed > 0.5) {
          ctx.fillStyle = 'rgba(49, 18, 18, 0.64)';
          ctx.fillRect(Math.round(x), hazard.y - 1, 6 + Math.round(seed * 7), 2);
        }
      }
      ctx.fillStyle = 'rgba(255, 239, 180, 0.5)';
      for (let x = hazard.x + 6; x < hazard.x + hazard.w; x += 31) {
        const y = hazard.y + Math.sin(x * 0.05 + time * 1.7) * 2;
        ctx.fillRect(Math.round(x), Math.round(y - 1), 4, 1);
      }

      // 气泡与亮斑
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 24; i += 1) {
        const seed = hash(i, 7);
        const x = hazard.x + seed * hazard.w;
        const rise = (time * (9 + seed * 15) + seed * 30) % 20;
        const y = hazard.y + 10 - rise;
        const size = seed > 0.5 ? 2 : 1;
        ctx.globalAlpha = 0.35 + seed * 0.4;
        ctx.fillStyle = seed > 0.5 ? '#ffbd57' : '#ffe6a1';
        ctx.fillRect(Math.round(x), Math.round(y), size, size);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();

      // 上方的热光
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const heat = ctx.createLinearGradient(0, hazard.y - 38, 0, hazard.y + 8);
      heat.addColorStop(0, 'rgba(255, 108, 32, 0)');
      heat.addColorStop(1, 'rgba(255, 122, 35, 0.12)');
      ctx.fillStyle = heat;
      ctx.fillRect(hazard.x - 4, hazard.y - 38, hazard.w + 8, 46);
      ctx.restore();
    }
  }

  drawFieldZones(time, cameraX) {
    if (!this.level.fieldZones.length) return;
    const ctx = this.ctx;
    const cameraY = this.cameraY ?? 0;
    const visibleTop = cameraY - 24;
    const visibleBottom = cameraY + VIEW.HEIGHT + 24;
    const electricColor = '103, 223, 255';
    const magneticColor = '195, 158, 255';

    for (const field of this.level.fieldZones) {
      if (field.x + field.w < cameraX - 10 || field.x > cameraX + VIEW.WIDTH + 10) continue;
      if (field.y + field.h < visibleTop || field.y > visibleBottom) continue;

      const balanced = this.level.isFieldBalanced(field);
      const top = Math.max(field.y, visibleTop);
      const bottom = Math.min(field.y + field.h, visibleBottom);

      ctx.save();
      ctx.beginPath();
      ctx.rect(field.x, top, field.w, bottom - top);
      ctx.clip();

      const tint = ctx.createLinearGradient(field.x, field.y, field.x + field.w, field.y);
      tint.addColorStop(0, 'rgba(150, 105, 220, 0.015)');
      tint.addColorStop(0.5, `rgba(150, 105, 220, ${balanced ? 0.06 : 0.035})`);
      tint.addColorStop(1, 'rgba(150, 105, 220, 0.012)');
      ctx.fillStyle = tint;
      ctx.fillRect(field.x, top, field.w, bottom - top);

      // 长电场线 + 方向箭头
      const dir = field.e.dir === 'up' ? -1 : 1;
      for (let x = field.x + 16; x < field.x + field.w; x += 48) {
        ctx.fillStyle = `rgba(${electricColor}, ${balanced ? 0.12 : 0.08})`;
        ctx.fillRect(x, top, 1, bottom - top);

        const arrowColor = `rgba(${electricColor}, ${balanced ? 0.28 : 0.18})`;
        const arrowSpacing = 88;
        // 箭头沿 E 的方向流动，和箭头指向保持一致。
        const phase = ((time * 16 * dir) % arrowSpacing + arrowSpacing) % arrowSpacing;
        for (let y = top + 26 + phase; y < bottom - 10; y += arrowSpacing) {
          this.drawFieldArrow(x, y, dir, arrowColor);
        }
      }

      // 磁场符号网格：⊗ 纸内，⊙ 纸外
      const glyphColor = `rgba(${magneticColor}, ${balanced ? 0.26 : 0.34})`;
      for (let x = field.x + 34; x < field.x + field.w; x += 58) {
        for (let y = Math.floor(top / 54) * 54 + 20; y < bottom - 12; y += 54) {
          this.drawBFieldGlyph(x, y, field.b.dir, glyphColor);
        }
      }

      ctx.strokeStyle = 'rgba(117, 199, 231, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(field.x, top);
      ctx.lineTo(field.x, bottom);
      ctx.moveTo(field.x + field.w, top);
      ctx.lineTo(field.x + field.w, bottom);
      ctx.stroke();

      if (field.y >= visibleTop && field.y <= visibleBottom) {
        ctx.fillStyle = 'rgba(124, 220, 246, 0.24)';
        for (let x = field.x; x < field.x + field.w; x += 14) {
          ctx.fillRect(x, field.y, 8, 1);
        }
      }

      if (!balanced) {
        ctx.fillStyle = 'rgba(255, 95, 85, 0.045)';
        ctx.fillRect(field.x, top, field.w, bottom - top);
      }

      ctx.restore();
    }
  }

  drawFieldArrow(x, y, direction, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 8);
    if (direction < 0) {
      ctx.fillRect(Math.round(x) - 2, Math.round(y) + 2, 5, 1);
      ctx.fillRect(Math.round(x) - 1, Math.round(y) + 1, 3, 1);
    } else {
      ctx.fillRect(Math.round(x) - 2, Math.round(y) + 6, 5, 1);
      ctx.fillRect(Math.round(x) - 1, Math.round(y) + 7, 3, 1);
    }
  }

  drawBFieldGlyph(x, y, direction, color) {
    const ctx = this.ctx;
    const px = Math.round(x);
    const py = Math.round(y);
    ctx.fillStyle = color;
    ctx.fillRect(px - 2, py - 2, 5, 1);
    ctx.fillRect(px - 2, py + 2, 5, 1);
    ctx.fillRect(px - 2, py - 1, 1, 3);
    ctx.fillRect(px + 2, py - 1, 1, 3);

    if (direction === 'in') {
      ctx.fillRect(px - 1, py - 1, 1, 1);
      ctx.fillRect(px + 1, py + 1, 1, 1);
      ctx.fillRect(px + 1, py - 1, 1, 1);
      ctx.fillRect(px - 1, py + 1, 1, 1);
    } else {
      ctx.fillRect(px, py, 1, 1);
    }
  }

  drawExitGate(time, cameraX) {
    const x = Math.round(this.level.goalX);
    if (x < cameraX - 60 || x > cameraX + VIEW.WIDTH + 60) return;

    const ctx = this.ctx;
    const baseY = (() => {
      const col = Math.floor(this.level.goalX / T);
      for (let row = 0; row < this.level.height; row += 1) {
        if (this.level.isSolid(col, row)) return row * T;
      }
      return 256;
    })();
    if (baseY < (this.cameraY ?? 0) - 90 || baseY > (this.cameraY ?? 0) + VIEW.HEIGHT + 90) return;

    if (this.level.mood === 'memorial') {
      this.drawMemorialGate(x, baseY, time);
      return;
    }

    if (this.level.mood === 'parade') {
      this.drawParadeGate(x, baseY, time);
      return;
    }

    const isArcane = this.level.mood === 'arcane';
    const glowColor =
      this.level.mood === 'sneak'
        ? '126, 230, 190'
        : isArcane
          ? '108, 229, 255'
          : '255, 171, 82';
    const pulse = 0.72 + Math.sin(time * 1.8) * 0.16;

    ctx.save();
    ctx.translate(x, baseY);
    ctx.globalCompositeOperation = 'lighter';
    const aura = ctx.createRadialGradient(0, -27, 2, 0, -27, 37);
    aura.addColorStop(0, `rgba(${glowColor}, ${0.2 * pulse})`);
    aura.addColorStop(1, `rgba(${glowColor}, 0)`);
    ctx.fillStyle = aura;
    ctx.fillRect(-38, -62, 76, 66);
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = '#1a121c';
    ctx.fillRect(-20, -38, 7, 38);
    ctx.fillRect(13, -38, 7, 38);
    ctx.fillRect(-14, -43, 28, 7);
    ctx.fillRect(-10, -47, 20, 5);
    ctx.fillRect(-20, -2, 40, 2);

    ctx.fillStyle = '#443348';
    ctx.fillRect(-19, -37, 2, 34);
    ctx.fillRect(14, -37, 2, 34);
    ctx.fillRect(-13, -42, 26, 2);

    const portal = ctx.createLinearGradient(0, -38, 0, 0);
    portal.addColorStop(0, `rgba(${glowColor}, ${0.55 * pulse})`);
    portal.addColorStop(0.5, `rgba(${glowColor}, ${0.2 * pulse})`);
    portal.addColorStop(1, 'rgba(8, 4, 12, 0.1)');
    ctx.fillStyle = portal;
    ctx.fillRect(-12, -37, 25, 37);

    ctx.globalAlpha = 0.7;
    ctx.fillStyle =
      isArcane ? '#c9f8ff' : this.level.mood === 'sneak' ? '#c9ffe8' : '#ffe0a1';
    for (let i = 0; i < 4; i += 1) {
      const fy = -34 + ((time * 15 + i * 9) % 31);
      const fx = -8 + ((i * 7 + time * 3) % 16);
      ctx.fillRect(Math.round(fx), Math.round(fy), 1, 2);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * 墓园门：两根石柱，中间是一扇铁门。
   * 门后不是传送阵，只是一段更暗的路；门缝里透出暖黄的灯光。
   */
  drawMemorialGate(x, baseY, time) {
    const ctx = this.ctx;
    const pulse = 0.74 + Math.sin(time * 1.6) * 0.12;

    ctx.save();
    ctx.translate(x, baseY);

    // 门后的暖光
    ctx.globalCompositeOperation = 'lighter';
    const aura = ctx.createRadialGradient(0, -30, 3, 0, -30, 46);
    aura.addColorStop(0, `rgba(255, 196, 120, ${0.16 * pulse})`);
    aura.addColorStop(0.55, `rgba(255, 158, 76, ${0.07 * pulse})`);
    aura.addColorStop(1, 'rgba(255, 140, 60, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(-52, -82, 104, 88);
    ctx.globalCompositeOperation = 'source-over';

    // 门内的光
    const doorGlow = ctx.createLinearGradient(0, -52, 0, 0);
    doorGlow.addColorStop(0, `rgba(255, 190, 110, ${0.22 * pulse})`);
    doorGlow.addColorStop(1, 'rgba(80, 40, 30, 0.05)');
    ctx.fillStyle = doorGlow;
    ctx.fillRect(-15, -52, 30, 52);
    ctx.fillStyle = '#120b16';
    ctx.fillRect(-16, -52, 1, 52);
    ctx.fillRect(15, -52, 1, 52);
    ctx.fillRect(-16, -53, 32, 1);

    // 铁门：竖栏 + 上方的拱
    ctx.fillStyle = '#2b2030';
    ctx.fillRect(-13, -48, 2, 48);
    ctx.fillRect(-5, -48, 2, 48);
    ctx.fillRect(3, -48, 2, 48);
    ctx.fillRect(11, -48, 2, 48);
    ctx.fillRect(-14, -36, 28, 2);
    ctx.fillRect(-14, -20, 28, 2);
    for (let i = 0; i < 5; i += 1) {
      const bx = -13 + i * 6;
      ctx.fillRect(bx + 1, -48 - Math.round(Math.sin((i / 4) * Math.PI) * 6), 1, 2);
    }
    ctx.fillStyle = '#4a3a4f';
    ctx.fillRect(-13, -48, 1, 48);
    ctx.fillRect(11, -48, 1, 48);

    // 两根石柱
    ctx.fillStyle = '#1b1420';
    ctx.fillRect(-26, -58, 11, 58);
    ctx.fillRect(16, -58, 11, 58);
    ctx.fillRect(-28, -62, 15, 5);
    ctx.fillRect(14, -62, 15, 5);
    ctx.fillStyle = '#352b3a';
    ctx.fillRect(-25, -57, 3, 56);
    ctx.fillRect(17, -57, 3, 56);
    ctx.fillRect(-26, -60, 10, 1);
    ctx.fillRect(17, -60, 9, 1);
    ctx.fillStyle = '#54445a';
    ctx.fillRect(-25, -56, 1, 50);
    ctx.fillRect(18, -56, 1, 50);

    // 石柱上各挂一盏小灯
    const lantern = (lx) => {
      ctx.fillStyle = '#2c2130';
      ctx.fillRect(lx - 2, -54, 4, 1);
      ctx.fillStyle = `rgba(255, 210, 130, ${pulse})`;
      ctx.fillRect(lx - 2, -52, 4, 5);
      ctx.fillStyle = '#fff1c4';
      ctx.fillRect(lx - 1, -51, 2, 3);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(lx, -49, 1, lx, -49, 14);
      g.addColorStop(0, `rgba(255, 196, 110, ${0.2 * pulse})`);
      g.addColorStop(1, 'rgba(255, 160, 80, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(lx - 15, -64, 30, 30);
      ctx.globalCompositeOperation = 'source-over';
    };
    lantern(-21);
    lantern(21);

    ctx.restore();
  }

  /**
   * 百鬼门：一座比路边鸟居更大、更旧的朱红鸟居。
   * 门下没有传送阵，只有一层被所有同行者的灯照出来的暖光。
   */
  drawParadeGate(x, baseY, time) {
    const ctx = this.ctx;
    const pulse = 0.72 + Math.sin(time * 1.5) * 0.1;

    ctx.save();
    ctx.translate(x, baseY);

    // 门后的暖光
    ctx.globalCompositeOperation = 'lighter';
    const aura = ctx.createRadialGradient(0, -34, 4, 0, -34, 62);
    aura.addColorStop(0, `rgba(255, 186, 108, ${0.2 * pulse})`);
    aura.addColorStop(0.5, `rgba(226, 104, 62, ${0.08 * pulse})`);
    aura.addColorStop(1, 'rgba(200, 76, 44, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(-70, -100, 140, 106);
    ctx.globalCompositeOperation = 'source-over';

    // 门内的一层光
    const door = ctx.createLinearGradient(0, -58, 0, 0);
    door.addColorStop(0, `rgba(255, 198, 126, ${0.2 * pulse})`);
    door.addColorStop(0.6, 'rgba(180, 74, 54, 0.08)');
    door.addColorStop(1, 'rgba(30, 10, 14, 0.02)');
    ctx.fillStyle = door;
    ctx.fillRect(-24, -58, 48, 58);

    // 两根粗柱
    ctx.fillStyle = '#200a0d';
    ctx.fillRect(-32, -64, 12, 64);
    ctx.fillRect(20, -64, 12, 64);
    ctx.fillStyle = '#6f1c22';
    ctx.fillRect(-30, -63, 8, 62);
    ctx.fillRect(22, -63, 8, 62);
    ctx.fillStyle = '#a93934';
    ctx.fillRect(-30, -62, 2, 52);
    ctx.fillRect(23, -62, 2, 52);
    ctx.fillStyle = '#4a1117';
    ctx.fillRect(-31, -4, 10, 4);
    ctx.fillRect(21, -4, 10, 4);

    // 横梁
    ctx.fillStyle = '#200a0d';
    ctx.fillRect(-42, -70, 84, 8);
    ctx.fillRect(-47, -76, 94, 5);
    ctx.fillRect(-36, -58, 72, 4);
    ctx.fillStyle = '#7a2027';
    ctx.fillRect(-41, -69, 82, 5);
    ctx.fillRect(-46, -75, 92, 3);
    ctx.fillRect(-35, -57, 70, 2);
    ctx.fillStyle = '#b8463c';
    ctx.fillRect(-38, -69, 52, 1);
    ctx.fillRect(-35, -57, 34, 1);

    // 门楣上的旧木匾
    ctx.fillStyle = '#1c0b0e';
    ctx.fillRect(-13, -68, 26, 11);
    ctx.fillStyle = '#40201f';
    ctx.fillRect(-12, -67, 24, 9);
    ctx.fillStyle = 'rgba(255, 214, 154, 0.55)';
    for (let i = 0; i < 3; i += 1) {
      ctx.fillRect(-7 + i * 6, -64, 3, 1);
      ctx.fillRect(-6 + i * 6, -62, 1, 2);
    }

    // 梁下垂着的纸垂与灯笼
    for (const sx of [-22, -8, 8, 22]) {
      ctx.fillStyle = 'rgba(232, 224, 206, 0.75)';
      ctx.fillRect(sx, -62, 2, 6);
      ctx.fillRect(sx + 1, -57, 2, 4);
    }
    for (const lx of [-26, 26]) {
      const flicker = 0.7 + Math.sin(time * 2.4 + lx) * 0.12;
      ctx.fillStyle = '#2a1c22';
      ctx.fillRect(lx - 2, -56, 4, 1);
      ctx.fillStyle = '#ca5432';
      ctx.fillRect(lx - 4, -54, 8, 6);
      ctx.fillStyle = '#ffd894';
      ctx.globalAlpha = flicker;
      ctx.fillRect(lx - 2, -53, 4, 3);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';
      const lg = ctx.createRadialGradient(lx, -51, 1, lx, -51, 15);
      lg.addColorStop(0, `rgba(255, 190, 110, ${0.18 * flicker})`);
      lg.addColorStop(1, 'rgba(255, 150, 70, 0)');
      ctx.fillStyle = lg;
      ctx.fillRect(lx - 16, -66, 32, 32);
      ctx.globalCompositeOperation = 'source-over';
    }

    // 门柱脚下的南瓜灯和门楣上的笑脸南瓜：百鬼门也是镇口的南瓜门。
    const pumpkinAt = (px, py, variant) => {
      ctx.fillStyle = '#c9520d';
      ctx.fillRect(px - 7, py - 10, 14, 9);
      ctx.fillRect(px - 5, py - 12, 10, 2);
      ctx.fillStyle = '#ff7d1a';
      ctx.fillRect(px - 6, py - 9, 12, 7);
      ctx.fillStyle = '#ffb347';
      ctx.fillRect(px - 5, py - 9, 3, 1);
      ctx.fillStyle = '#2a100f';
      ctx.fillRect(px - 4, py - 7, 2, 2);
      ctx.fillRect(px + 2, py - 7, 2, 2);
      ctx.fillRect(px - 2, py - 4, 4, 1);
      if (variant === 1) ctx.fillRect(px - 1, py - 6, 1, 1);
      ctx.fillStyle = '#6f9143';
      ctx.fillRect(px - 1, py - 13, 2, 2);
      ctx.globalCompositeOperation = 'lighter';
      const pg = ctx.createRadialGradient(px, py - 7, 1, px, py - 7, 18);
      pg.addColorStop(0, 'rgba(255, 158, 62, 0.14)');
      pg.addColorStop(1, 'rgba(255, 120, 30, 0)');
      ctx.fillStyle = pg;
      ctx.fillRect(px - 20, py - 26, 40, 30);
      ctx.globalCompositeOperation = 'source-over';
    };
    pumpkinAt(-34, 0, 0);
    pumpkinAt(34, 0, 1);
    pumpkinAt(0, -74, 2);

    // 门里飘着的细小灯尘
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 6; i += 1) {
      const fy = -54 + ((time * 13 + i * 11) % 52);
      const fx = -16 + ((i * 9 + time * 2.4) % 32);
      ctx.fillStyle = i % 2 ? '#ffd9a0' : '#ff9f78';
      ctx.fillRect(Math.round(fx), Math.round(fy), 1, 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore();
  }

  drawCheckpoints(game, time, cameraX) {
    const ctx = this.ctx;
    for (let index = 0; index < this.level.checkpoints.length; index += 1) {
      const checkpoint = this.level.checkpoints[index];
      if (checkpoint.x < cameraX - 40 || checkpoint.x > cameraX + VIEW.WIDTH + 40) continue;
      if (checkpoint.y < (this.cameraY ?? 0) - 80 || checkpoint.y > (this.cameraY ?? 0) + VIEW.HEIGHT + 80) continue;
      const active =
        game.mode === 'sneak'
          ? index <= (game.session.sneak?.checkpointIndex ?? -1)
          : index <= game.session.checkpointIndex;
      const x = Math.round(checkpoint.x);
      const y = checkpoint.y + 18;

      ctx.save();
      ctx.translate(x, y);
      if (active) {
        ctx.globalCompositeOperation = 'lighter';
        const glow = ctx.createRadialGradient(0, -14, 1, 0, -14, 24);
        glow.addColorStop(0, 'rgba(90, 222, 255, 0.14)');
        glow.addColorStop(1, 'rgba(90, 222, 255, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(-25, -38, 50, 42);
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.fillStyle = '#20151e';
      ctx.fillRect(-4, -10, 8, 10);
      ctx.fillRect(-6, -2, 12, 2);
      ctx.fillStyle = '#4c3848';
      ctx.fillRect(-4, -9, 2, 7);
      ctx.fillStyle = active ? '#7fe7ff' : '#342734';
      const flicker = active ? 0.75 + Math.sin(time * 10 + index) * 0.15 : 1;
      ctx.globalAlpha = flicker;
      ctx.fillRect(-2, -17, 4, 7);
      ctx.fillStyle = active ? '#d9fbff' : '#4b3a4b';
      ctx.fillRect(-1, -16, 2, 4);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  drawElectrons(time, cameraX) {
    const ctx = this.ctx;
    const cameraY = this.cameraY ?? 0;
    for (const electron of this.level.electrons) {
      if (electron.x < cameraX - electron.radius || electron.x > cameraX + VIEW.WIDTH + electron.radius) continue;
      if (electron.y + electron.radius < cameraY - 30 || electron.y - electron.radius > cameraY + VIEW.HEIGHT + 30) continue;

      const x = Math.round(electron.x);
      const y = Math.round(electron.y);
      const scale = electron.scale ?? 1;

      ctx.save();
      ctx.translate(x, y);
      ctx.globalCompositeOperation = 'lighter';

      const aura = ctx.createRadialGradient(0, 0, 4, 0, 0, electron.radius * 0.8);
      aura.addColorStop(0, 'rgba(100, 223, 255, 0.17)');
      aura.addColorStop(0.32, 'rgba(82, 145, 229, 0.05)');
      aura.addColorStop(1, 'rgba(65, 100, 200, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(-electron.radius, -electron.radius, electron.radius * 2, electron.radius * 2);

      ctx.globalCompositeOperation = 'source-over';

      // 电子本体
      ctx.save();
      ctx.scale(scale, scale);
      ctx.fillStyle = '#1a2746';
      ctx.fillRect(-7, -9, 14, 18);
      ctx.fillRect(-9, -7, 18, 14);
      ctx.fillRect(-8, -10, 16, 20);
      ctx.fillStyle = '#2c4f7b';
      ctx.fillRect(-7, -8, 14, 16);
      ctx.fillStyle = '#5dc9ef';
      ctx.fillRect(-5, -7, 5, 4);
      ctx.fillRect(-7, -4, 2, 7);
      ctx.fillStyle = '#bff6ff';
      ctx.fillRect(-3, -5, 4, 1);
      ctx.fillRect(2, -2, 3, 1);
      // 电子带负电：正中央画一个清晰的减号。
      ctx.fillStyle = '#e8fdff';
      ctx.fillRect(-4, -1, 9, 2);

      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#74dbf7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 6, Math.sin(time * 0.4 + electron.phase) * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
      ctx.restore();
    }
  }

  drawDevices(game, time, cameraX) {
    const cameraY = this.cameraY ?? 0;
    for (const device of this.level.devices) {
      if (device.x < cameraX - 70 || device.x > cameraX + VIEW.WIDTH + 70) continue;
      if (device.y < cameraY - 100 || device.y > cameraY + VIEW.HEIGHT + 100) continue;
      if (this.level.mood === 'sneak' && drawSneakDevice(this, device, game, time)) {
        continue;
      }
      if (device.type === 'charger') {
        this.drawCharger(device, game, time);
      } else if (device.type === 'boneSlot') {
        this.drawBoneSlot(device, game, time);
      } else if (device.type === 'carriage') {
        this.drawCarriage(device, game, time);
      } else if (device.type === 'mask') {
        this.drawMaskDevice(device, game, time);
      }
    }
  }

  /**
   * 路边的石鼓：一块嵌在石座里的旧面具，面具后面藏着一团还没跟上的影子。
   * 敲过之后眼睛暗下去，影子已经站到队伍里了。
   */
  drawMaskDevice(device, game, time) {
    const ctx = this.ctx;
    const joined = Boolean(device.joined);
    const nearby = game?.getNearbyParadeDevice?.()?.id === device.id;
    const pulse = 0.62 + Math.sin(time * 1.9 + device.x * 0.02) * 0.14;
    const glow = joined ? 0 : nearby ? 0.24 : 0.14;

    ctx.save();
    ctx.translate(Math.round(device.x), Math.round(device.y));

    if (!joined) {
      ctx.globalCompositeOperation = 'lighter';
      const aura = ctx.createRadialGradient(0, -22, 2, 0, -22, nearby ? 38 : 30);
      aura.addColorStop(0, `rgba(255, 156, 92, ${glow * pulse})`);
      aura.addColorStop(1, 'rgba(255, 120, 70, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(-42, -58, 84, 62);
      ctx.globalCompositeOperation = 'source-over';
    }

    // 石座
    ctx.fillStyle = '#211823';
    ctx.fillRect(-12, -6, 24, 6);
    ctx.fillStyle = '#4c3b4d';
    ctx.fillRect(-10, -5, 20, 2);
    ctx.fillStyle = '#352838';
    ctx.fillRect(-7, -16, 14, 10);
    ctx.fillStyle = '#5d4961';
    ctx.fillRect(-6, -15, 4, 1);

    // 面具：一块被烟熏黑的木面
    ctx.fillStyle = '#1a1119';
    ctx.fillRect(-9, -30, 18, 15);
    ctx.fillRect(-7, -33, 14, 4);
    ctx.fillStyle = joined ? '#3a2c32' : '#6b4038';
    ctx.fillRect(-8, -29, 16, 13);
    ctx.fillRect(-6, -32, 12, 3);
    ctx.fillStyle = joined ? '#4a3c42' : '#9a5a44';
    ctx.fillRect(-6, -28, 4, 2);
    ctx.fillRect(-8, -26, 2, 5);

    // 两只眼睛和一道裂开的嘴
    if (!joined) {
      ctx.fillStyle = '#2a1210';
      ctx.fillRect(-5, -26, 3, 3);
      ctx.fillRect(2, -26, 3, 3);
      ctx.fillStyle = '#ffca7a';
      ctx.globalAlpha = 0.7 + Math.sin(time * 3.2) * 0.24;
      ctx.fillRect(-4, -25, 2, 1);
      ctx.fillRect(3, -25, 2, 1);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#2a1210';
      ctx.fillRect(-3, -21, 6, 1);
      ctx.fillRect(-1, -20, 2, 1);
    } else {
      ctx.fillStyle = '#241820';
      ctx.fillRect(-5, -26, 3, 2);
      ctx.fillRect(2, -26, 3, 2);
      ctx.fillRect(-3, -21, 6, 1);
    }

    // 面具两侧的小角
    ctx.fillStyle = '#c8b08c';
    ctx.fillRect(-11, -32, 2, 5);
    ctx.fillRect(9, -32, 2, 5);

    // 还没加入的影子：一小团伏在面具后面
    if (!joined) {
      ctx.globalAlpha = 0.3 + Math.sin(time * 2.1) * 0.08;
      ctx.fillStyle = '#120a18';
      ctx.fillRect(-5, -40 - Math.sin(time * 1.6) * 2, 10, 8);
      ctx.fillRect(-3, -44 - Math.sin(time * 1.6) * 2, 6, 5);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffd29a';
      ctx.globalAlpha = 0.6 + Math.sin(time * 4.1) * 0.2;
      ctx.fillRect(-2, -41 - Math.sin(time * 1.6) * 2, 1, 1);
      ctx.fillRect(1, -41 - Math.sin(time * 1.6) * 2, 1, 1);
      ctx.globalAlpha = 1;
    }

    // 敲过之后飘着的一小簇余烬
    if (joined) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35;
      for (let i = 0; i < 3; i += 1) {
        const fy = -30 - ((time * 5 + i * 9) % 18);
        const fx = Math.sin(time + i * 2.2) * 5;
        ctx.fillStyle = '#ffcf92';
        ctx.fillRect(Math.round(fx), Math.round(fy), 1, 1);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
  }

  /** 第一段的南瓜车：开场载玩家驶入，之后停在原地等「回去看看」。 */
  drawCarriage(device, game, time) {
    const ctx = this.ctx;
    const session = game?.session;
    const riding = Boolean(session?.carriageRiding);
    const x = Math.round(riding ? session.carriageX : device.x);
    const y = Math.round(device.y);
    const quest = Boolean(session?.carriageQuest);
    const alarm = Boolean(session?.carriageAlarm);
    const nearby = game?.getNearbyDevice?.()?.id === device.id;
    const accent = alarm ? '255, 84, 76' : quest ? '255, 202, 108' : '255, 148, 58';
    const lockColor = alarm ? '#ff6b5f' : quest ? '#ffd37d' : '#b88a52';

    ctx.save();
    ctx.translate(x, y);

    // 车底与南瓜灯的暖光
    ctx.globalCompositeOperation = 'lighter';
    const floorGlow = ctx.createRadialGradient(0, -6, 2, 0, -6, nearby ? 38 : 30);
    floorGlow.addColorStop(0, `rgba(${accent}, ${nearby ? 0.2 : 0.11})`);
    floorGlow.addColorStop(1, `rgba(${accent}, 0)`);
    ctx.fillStyle = floorGlow;
    ctx.fillRect(-42, -24, 84, 28);
    ctx.globalCompositeOperation = 'source-over';

    // 车轮
    const wheel = (cx) => {
      ctx.fillStyle = '#170d12';
      ctx.fillRect(cx - 5, -8, 10, 8);
      ctx.fillRect(cx - 4, -9, 8, 9);
      ctx.fillStyle = '#3d2427';
      ctx.fillRect(cx - 4, -7, 8, 6);
      ctx.fillRect(cx - 2, -8, 4, 8);
      ctx.fillStyle = '#7a4a32';
      ctx.fillRect(cx - 1, -5, 2, 3);
    };
    wheel(-16);
    wheel(16);

    // 车轴与底盘
    ctx.fillStyle = '#2a161c';
    ctx.fillRect(-19, -13, 38, 4);
    ctx.fillStyle = '#4a2a25';
    ctx.fillRect(-17, -12, 34, 2);

    // 南瓜车厢
    ctx.fillStyle = '#7a2705';
    ctx.fillRect(-21, -31, 42, 18);
    ctx.fillRect(-17, -36, 34, 6);
    ctx.fillRect(-13, -39, 26, 4);
    ctx.fillStyle = '#c14c0a';
    ctx.fillRect(-20, -30, 40, 17);
    ctx.fillRect(-16, -35, 32, 6);
    ctx.fillRect(-12, -38, 24, 4);
    ctx.fillStyle = '#e2680e';
    ctx.fillRect(-18, -30, 36, 15);
    ctx.fillRect(-14, -34, 28, 5);
    ctx.fillRect(-10, -37, 20, 3);
    ctx.fillStyle = '#ff9d34';
    ctx.fillRect(-15, -33, 3, 12);
    ctx.fillRect(-6, -36, 3, 16);
    ctx.fillStyle = '#9a3307';
    ctx.fillRect(-11, -35, 2, 20);
    ctx.fillRect(-1, -38, 2, 24);
    ctx.fillRect(9, -35, 2, 20);
    ctx.fillStyle = '#7a2705';
    ctx.fillRect(-20, -16, 40, 2);

    // 藤蔓与瓜蒂
    ctx.fillStyle = '#4c632d';
    ctx.fillRect(-2, -44, 4, 7);
    ctx.fillRect(2, -43, 5, 2);
    ctx.fillRect(7, -41, 2, 2);
    ctx.fillStyle = '#739044';
    ctx.fillRect(-1, -44, 2, 3);

    // 车门与暖窗
    ctx.fillStyle = '#3a160e';
    ctx.fillRect(4, -33, 13, 16);
    ctx.fillRect(6, -35, 9, 3);
    ctx.fillStyle = '#ffcf7d';
    ctx.fillRect(6, -31, 9, 10);
    ctx.fillStyle = '#3a160e';
    ctx.fillRect(10, -31, 1, 10);
    ctx.fillRect(6, -27, 9, 1);

    if (riding) {
      // 坐在车里的主角：一个小小的人影。
      ctx.fillStyle = '#2a1630';
      ctx.fillRect(7, -28, 5, 7);
      ctx.fillStyle = '#f2d2a8';
      ctx.fillRect(8, -32, 3, 4);
      ctx.fillStyle = '#2a1630';
      ctx.fillRect(7, -33, 5, 2);
    }

    // 门锁
    ctx.fillStyle = lockColor;
    ctx.fillRect(8, -20, 6, 5);
    ctx.fillRect(9, -22, 4, 2);
    ctx.fillStyle = '#3a160e';
    ctx.fillRect(10, -19, 1, 2);

    // 前挂的小南瓜灯
    ctx.fillStyle = '#2a171d';
    ctx.fillRect(-25, -25, 3, 6);
    ctx.fillStyle = quest || alarm ? lockColor : '#ffce7c';
    ctx.fillRect(-29, -29, 7, 7);
    ctx.fillStyle = '#3a160e';
    ctx.fillRect(-27, -27, 3, 3);

    // 任务期间在车顶浮一个提示，超时变成红色。
    if (quest) {
      const bob = Math.sin(time * 5) * 2;
      ctx.globalCompositeOperation = 'lighter';
      const markerGlow = ctx.createRadialGradient(0, -52 + bob, 1, 0, -52 + bob, 14);
      markerGlow.addColorStop(0, `rgba(${accent}, 0.4)`);
      markerGlow.addColorStop(1, `rgba(${accent}, 0)`);
      ctx.fillStyle = markerGlow;
      ctx.fillRect(-16, -68 + bob, 32, 30);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = alarm ? '#ff5a52' : '#ffd27a';
      ctx.fillRect(-1, -57 + bob, 3, 7);
      ctx.fillRect(-1, -48 + bob, 3, 3);
    }

    ctx.restore();
  }

  drawCharger(device, game, time) {
    const ctx = this.ctx;
    const x = Math.round(device.x);
    const y = Math.round(device.y);
    const nearby = game.getNearbyDevice()?.id === device.id;
    const positive = device.charge > 0;
    const pulse = 0.7 + Math.sin(time * 5.2) * 0.18;
    const accent = positive ? '255, 188, 74' : '102, 225, 255';
    const orbLight = positive ? '#ffdba0' : '#9ce8ff';
    const orbDark = positive ? '#8a5329' : '#2d6174';

    ctx.save();
    ctx.translate(x, y);

    if (nearby) {
      ctx.globalCompositeOperation = 'lighter';
      const floorGlow = ctx.createRadialGradient(0, -2, 2, 0, -2, 31);
      floorGlow.addColorStop(0, `rgba(${accent}, 0.18)`);
      floorGlow.addColorStop(1, `rgba(${accent}, 0)`);
      ctx.fillStyle = floorGlow;
      ctx.fillRect(-30, -20, 60, 24);
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.fillStyle = '#1a151e';
    ctx.fillRect(-9, -5, 18, 5);
    ctx.fillRect(-6, -10, 12, 5);
    ctx.fillStyle = '#4a3d45';
    ctx.fillRect(-7, -9, 2, 4);
    ctx.fillRect(5, -9, 2, 4);
    ctx.fillStyle = '#57472d';
    ctx.fillRect(-1, -29, 2, 19);
    ctx.fillStyle = '#90724c';
    ctx.fillRect(0, -27, 1, 15);

    ctx.fillStyle = '#3a2b2b';
    ctx.fillRect(-5, -31, 10, 3);
    const orbGlow = ctx.createRadialGradient(0, -34, 1, 0, -34, 20);
    orbGlow.addColorStop(0, `rgba(${accent}, ${0.38 * pulse})`);
    orbGlow.addColorStop(1, `rgba(${accent}, 0)`);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = orbGlow;
    ctx.fillRect(-21, -56, 42, 42);
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = orbDark;
    ctx.fillRect(-6, -39, 12, 11);
    ctx.fillRect(-4, -41, 8, 14);
    ctx.fillStyle = orbLight;
    ctx.fillRect(-4, -38, 7, 7);
    ctx.fillRect(-2, -40, 5, 2);
    ctx.fillStyle = positive ? '#7d3d16' : '#20556b';
    // 正负号
    ctx.fillRect(-2, -35, 5, 1);
    if (positive) ctx.fillRect(0, -37, 1, 5);

    if (!nearby) {
      ctx.strokeStyle = `rgba(${accent}, ${0.35 * pulse})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-10, -31);
      ctx.lineTo(-4, -25);
      ctx.lineTo(-7, -22);
      ctx.lineTo(-1, -17);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawBoneSlot(device, game, time) {
    const ctx = this.ctx;
    const x = Math.round(device.x);
    const y = Math.round(device.y);
    const field = this.level.fieldZones.find((zone) => zone.id === device.fieldId);
    const balanced = field ? this.level.isFieldBalanced(field) : false;
    const hasBone = game.session.rightHandBones > 0;
    const nearby = game.getNearbyDevice()?.id === device.id;
    const pulse = 0.72 + Math.sin(time * 3.4) * 0.14;
    const solved = Boolean(device.solved);

    ctx.save();
    ctx.translate(x, y);
    if (nearby && !solved) {
      ctx.globalCompositeOperation = 'lighter';
      const floorGlow = ctx.createRadialGradient(0, -1, 2, 0, -1, 31);
      floorGlow.addColorStop(0, 'rgba(186, 133, 255, 0.18)');
      floorGlow.addColorStop(1, 'rgba(186, 133, 255, 0)');
      ctx.fillStyle = floorGlow;
      ctx.fillRect(-31, -20, 62, 24);
      ctx.globalCompositeOperation = 'source-over';
    }

    // 石台
    ctx.fillStyle = '#1b151f';
    ctx.fillRect(-12, -7, 24, 7);
    ctx.fillRect(-8, -17, 16, 10);
    ctx.fillStyle = '#4f3c51';
    ctx.fillRect(-7, -15, 2, 7);
    ctx.fillRect(5, -15, 2, 7);
    ctx.fillStyle = solved ? '#8fdcb1' : '#dcb06f';
    ctx.fillRect(-6, -19, 12, 2);

    if (solved) {
      // 嵌入的右手骨
      ctx.save();
      ctx.translate(0, -24);
      ctx.fillStyle = '#f2e5cd';
      ctx.fillRect(-3, 0, 7, 3);
      ctx.fillRect(-4, -3, 2, 4);
      ctx.fillRect(-1, -4, 1, 4);
      ctx.fillRect(1, -4, 1, 4);
      ctx.fillRect(3, -3, 1, 3);
      ctx.fillRect(2, 3, 2, 3);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.22 * pulse;
      ctx.fillStyle = '#9ceaff';
      ctx.fillRect(-10, -11, 20, 18);
      ctx.restore();
    } else {
      // 空骨槽：手骨形状的凹槽
      ctx.fillStyle = '#0d0910';
      ctx.fillRect(-4, -24, 8, 3);
      ctx.fillRect(-5, -27, 2, 3);
      ctx.fillRect(3, -27, 1, 3);
      ctx.fillStyle = hasBone ? '#7ee7ff' : '#5d3e67';
      ctx.globalAlpha = 0.45 + pulse * 0.2;
      ctx.fillRect(-3, -23, 6, 1);
      ctx.globalAlpha = 1;
    }

    // 目标场的方向提示
    const glyphY = -37;
    if (field) {
      const color = solved
        ? 'rgba(154, 240, 190, 0.9)'
        : 'rgba(220, 176, 111, 0.85)';
      this.drawBFieldGlyph(0, glyphY, field.b.dir, color);
    }

    ctx.restore();
  }

  drawPickups(game, time, cameraX) {
    const ctx = this.ctx;
    for (const pickup of game.activePickups) {
      if (pickup.collected) continue;
      if (pickup.x < cameraX - 24 || pickup.x > cameraX + VIEW.WIDTH + 24) continue;
      if (pickup.y < (this.cameraY ?? 0) - 40 || pickup.y > (this.cameraY ?? 0) + VIEW.HEIGHT + 40) continue;

      const bob = Math.sin(time * 2.1 + pickup.phase) * 2;
      const x = Math.round(pickup.x);
      const y = Math.round(pickup.y + bob);
      // 同一类东西共用一种光晕：骨头暖白、零件冷紫、糖果粉橙。
      const glowColor = getItemDef(pickup.type).glow;

      ctx.save();
      ctx.translate(x, y);
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 14);
      glow.addColorStop(0, `rgba(${glowColor}, 0.11)`);
      glow.addColorStop(1, `rgba(${glowColor}, 0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(-24, -24, 48, 48);
      ctx.globalCompositeOperation = 'source-over';

      ctx.globalAlpha = 0.9;
      this.drawPickupIcon(ctx, pickup.type);

      ctx.globalAlpha = 0.6 + Math.sin(time * 6 + pickup.phase) * 0.25;
      ctx.fillStyle = '#f2feff';
      ctx.fillRect(-1, -11, 1, 1);
      ctx.fillRect(7, -5, 1, 1);
      ctx.fillRect(-8, 4, 1, 1);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  drawPickupIcon(ctx, type) {
    ctx.fillStyle = '#f2e4cc';

    if (type === 'rib') {
      ctx.fillRect(-4, -1, 9, 2);
      ctx.fillRect(-5, -3, 2, 2);
      ctx.fillRect(4, -3, 2, 2);
      ctx.fillRect(-4, 0, 1, 2);
      ctx.fillRect(3, 0, 1, 2);
    } else if (type === 'femur') {
      ctx.fillRect(-5, -1, 10, 2);
      ctx.fillRect(-7, -2, 3, 2);
      ctx.fillRect(-7, 0, 3, 2);
      ctx.fillRect(4, -2, 3, 2);
      ctx.fillRect(4, 0, 3, 2);
    } else if (type === 'skull') {
      ctx.fillRect(-4, -5, 8, 6);
      ctx.fillRect(-3, -7, 6, 2);
      ctx.fillRect(-2, 1, 4, 2);
      ctx.fillStyle = '#2a1b27';
      ctx.fillRect(-3, -3, 2, 2);
      ctx.fillRect(1, -3, 2, 2);
      ctx.fillRect(-1, 0, 2, 1);
    } else if (type === 'rightHand') {
      ctx.fillRect(-4, -4, 8, 5);
      ctx.fillRect(-5, -5, 2, 4);
      ctx.fillRect(-2, -7, 1, 4);
      ctx.fillRect(0, -8, 1, 5);
      ctx.fillRect(2, -7, 1, 4);
      ctx.fillRect(4, -5, 1, 3);
      ctx.fillRect(3, 1, 2, 3);
      ctx.fillStyle = '#bca98f';
      ctx.fillRect(-4, -2, 1, 1);
      ctx.fillRect(0, -4, 2, 1);
    } else if (type === 'leftHand') {
      ctx.fillRect(-4, -4, 8, 5);
      ctx.fillRect(3, -5, 2, 4);
      ctx.fillRect(1, -7, 1, 4);
      ctx.fillRect(-1, -8, 1, 5);
      ctx.fillRect(-3, -7, 1, 4);
      ctx.fillRect(-5, -5, 1, 3);
      ctx.fillRect(-5, 1, 2, 3);
      ctx.fillStyle = '#bca98f';
      ctx.fillRect(3, -2, 1, 1);
      ctx.fillRect(-2, -4, 2, 1);
    } else if (type === 'sheet') {
      // 叠好的旧床单
      ctx.fillStyle = '#f4efe4';
      ctx.fillRect(-5, -5, 10, 9);
      ctx.fillStyle = '#d8d1c1';
      ctx.fillRect(-4, -3, 3, 5);
      ctx.fillRect(1, -3, 3, 5);
      ctx.fillStyle = '#e9e3d6';
      ctx.fillRect(-5, 3, 2, 1);
      ctx.fillRect(-1, 3, 2, 1);
      ctx.fillRect(3, 3, 2, 1);
    } else if (type === 'eyeHoles') {
      // 一块剪了两个洞的黑布
      ctx.fillStyle = '#1a1322';
      ctx.fillRect(-5, -3, 10, 6);
      ctx.fillStyle = '#e9e3d6';
      ctx.fillRect(-4, -2, 3, 3);
      ctx.fillRect(1, -2, 3, 3);
    } else if (type === 'wizardHat') {
      ctx.fillStyle = '#3a2366';
      ctx.fillRect(-5, 2, 10, 2);
      ctx.fillRect(-4, -1, 8, 3);
      ctx.fillRect(-3, -3, 6, 2);
      ctx.fillRect(-2, -5, 4, 2);
      ctx.fillRect(-1, -7, 3, 2);
      ctx.fillStyle = '#ff7d1a';
      ctx.fillRect(-4, 1, 8, 1);
      ctx.fillStyle = '#ffd678';
      ctx.fillRect(-1, -4, 1, 1);
    } else if (type === 'starCloak') {
      ctx.fillStyle = '#2c1a4d';
      ctx.fillRect(-5, -4, 10, 8);
      ctx.fillStyle = '#3f2a6b';
      ctx.fillRect(-4, -3, 3, 6);
      ctx.fillStyle = '#ffd678';
      ctx.fillRect(-2, -2, 1, 1);
      ctx.fillRect(2, 0, 1, 1);
      ctx.fillRect(0, 2, 1, 1);
      ctx.fillStyle = '#1b102c';
      ctx.fillRect(-5, 3, 10, 1);
    } else if (type === 'wand') {
      ctx.fillStyle = '#5b3a29';
      ctx.fillRect(-1, -2, 2, 7);
      ctx.fillStyle = '#ff9b3d';
      ctx.fillRect(-3, -5, 6, 4);
      ctx.fillStyle = '#ffd678';
      ctx.fillRect(-2, -4, 2, 2);
    } else if (type === 'spellbook') {
      ctx.fillStyle = '#4b2d38';
      ctx.fillRect(-5, -4, 10, 7);
      ctx.fillStyle = '#f2e4cc';
      ctx.fillRect(-4, -3, 8, 5);
      ctx.fillStyle = '#7f5046';
      ctx.fillRect(-1, -3, 1, 5);
      ctx.fillStyle = '#c9520d';
      ctx.fillRect(-5, -1, 2, 2);
    } else if (type === 'beard') {
      ctx.fillStyle = '#e6e0ea';
      ctx.fillRect(-5, -4, 10, 3);
      ctx.fillRect(-4, -1, 8, 2);
      ctx.fillRect(-3, 1, 6, 2);
      ctx.fillRect(-2, 3, 4, 1);
      ctx.fillRect(-1, 4, 2, 1);
      ctx.fillStyle = '#c8c0d2';
      ctx.fillRect(-3, -2, 2, 1);
      ctx.fillRect(1, 0, 2, 1);
    } else if (type === 'candyCorn') {
      ctx.fillStyle = '#fff4d8';
      ctx.fillRect(-2, -6, 4, 2);
      ctx.fillStyle = '#ffcf4a';
      ctx.fillRect(-3, -4, 6, 3);
      ctx.fillStyle = '#ff7d1a';
      ctx.fillRect(-3, -1, 5, 3);
      ctx.fillStyle = '#ffcf4a';
      ctx.fillRect(-2, 2, 3, 2);
      ctx.fillStyle = '#ff7d1a';
      ctx.fillRect(-1, 4, 2, 1);
    } else if (type === 'lollipop') {
      ctx.fillStyle = '#5b3a29';
      ctx.fillRect(-1, 0, 2, 7);
      ctx.fillStyle = '#ff6fa5';
      ctx.fillRect(-4, -6, 8, 6);
      ctx.fillRect(-5, -4, 10, 2);
      ctx.fillStyle = '#ffc2da';
      ctx.fillRect(-3, -5, 2, 2);
      ctx.fillStyle = '#fff4d8';
      ctx.fillRect(1, -4, 2, 1);
    } else if (type === 'chocolate') {
      ctx.fillStyle = '#5a3426';
      ctx.fillRect(-5, -4, 10, 8);
      ctx.fillStyle = '#8a563a';
      ctx.fillRect(-5, -4, 10, 2);
      ctx.fillStyle = '#3d2118';
      ctx.fillRect(-1, -3, 1, 7);
      ctx.fillRect(-5, 0, 10, 1);
    } else if (type === 'sourGummy') {
      // 酸味软糖：一枚绿色的小熊糖
      ctx.fillStyle = '#5ecf82';
      ctx.fillRect(-4, -1, 8, 6);
      ctx.fillStyle = '#8dffa8';
      ctx.fillRect(-3, -4, 6, 3);
      ctx.fillRect(-5, -5, 3, 3);
      ctx.fillRect(2, -5, 3, 3);
      ctx.fillStyle = '#3e9c62';
      ctx.fillRect(-4, -1, 1, 6);
      ctx.fillRect(3, -1, 1, 6);
      ctx.fillStyle = '#e9fff0';
      ctx.fillRect(-2, -3, 1, 1);
      ctx.fillRect(1, -3, 1, 1);
    } else if (type === 'licorice') {
      // 甘草糖：一截暗红色的麻花糖
      ctx.fillStyle = '#3b1a1c';
      ctx.fillRect(-2, -6, 4, 12);
      ctx.fillStyle = '#c86b6b';
      ctx.fillRect(-4, -6, 3, 3);
      ctx.fillRect(1, -3, 3, 3);
      ctx.fillRect(-4, 0, 3, 3);
      ctx.fillRect(1, 3, 3, 3);
      ctx.fillStyle = '#efa7a7';
      ctx.fillRect(-4, -6, 1, 1);
      ctx.fillRect(2, -3, 1, 1);
      ctx.fillRect(-4, 0, 1, 1);
      ctx.fillRect(2, 3, 1, 1);
    } else if (type === 'marshmallow') {
      // 棉花糖：一块蓬松的白粉色糖柱
      ctx.fillStyle = '#f7eef4';
      ctx.fillRect(-5, -4, 10, 8);
      ctx.fillStyle = '#fffafd';
      ctx.fillRect(-4, -5, 8, 2);
      ctx.fillRect(-6, -2, 2, 4);
      ctx.fillRect(4, -2, 2, 4);
      ctx.fillStyle = '#ffd9ec';
      ctx.fillRect(-5, 3, 10, 1);
      ctx.fillRect(2, -3, 3, 5);
      ctx.fillStyle = '#e8c8d8';
      ctx.fillRect(-4, -4, 1, 7);
    } else if (type === 'poppingCandy') {
      // 跳跳糖：一小把颜色各异、还在冒泡的糖粒
      ctx.fillStyle = '#ff9a6b';
      ctx.fillRect(-4, -1, 3, 3);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(0, -4, 3, 3);
      ctx.fillStyle = '#8dffa8';
      ctx.fillRect(2, 0, 3, 3);
      ctx.fillStyle = '#86e7ff';
      ctx.fillRect(-2, 3, 2, 2);
      ctx.fillStyle = '#fff4d8';
      ctx.fillRect(-5, 2, 1, 1);
      ctx.fillRect(4, -3, 1, 1);
      ctx.fillRect(1, 1, 1, 1);
    } else if (type === 'toffee') {
      // 太妃糖：琥珀色的方糖，两头拧着糖纸
      ctx.fillStyle = '#8a5a2c';
      ctx.fillRect(-4, -3, 7, 6);
      ctx.fillStyle = '#d9a15a';
      ctx.fillRect(-4, -3, 7, 2);
      ctx.fillRect(-4, 1, 7, 2);
      ctx.fillStyle = '#f0d29a';
      ctx.fillRect(-3, -2, 2, 1);
      ctx.fillStyle = '#c9a24a';
      ctx.fillRect(3, -3, 3, 2);
      ctx.fillRect(3, 1, 3, 2);
      ctx.fillStyle = '#f2e0a6';
      ctx.fillRect(4, -2, 1, 1);
    } else if (type === 'mint') {
      // 薄荷糖：白色糖片，中间刷着两道绿色
      ctx.fillStyle = '#eefcff';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.fillStyle = '#a9ecff';
      ctx.fillRect(-5, -2, 10, 4);
      ctx.fillStyle = '#7fd8f0';
      ctx.fillRect(-4, -3, 8, 1);
      ctx.fillRect(-4, 2, 8, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -4, 2, 1);
    } else if (type === 'nougat') {
      // 牛轧糖：米色糖块里嵌着几粒坚果
      ctx.fillStyle = '#e6cfa2';
      ctx.fillRect(-5, -4, 10, 8);
      ctx.fillStyle = '#f0d29a';
      ctx.fillRect(-5, -4, 10, 2);
      ctx.fillStyle = '#9a6b3c';
      ctx.fillRect(-3, -2, 2, 2);
      ctx.fillRect(1, 0, 2, 2);
      ctx.fillRect(-1, 2, 1, 1);
      ctx.fillStyle = '#fff0cf';
      ctx.fillRect(2, -3, 1, 1);
      ctx.fillRect(-4, 1, 1, 1);
    } else {
      // 兜底：一枚小骨头
      ctx.fillRect(-4, -1, 9, 2);
      ctx.fillRect(-6, -3, 3, 2);
      ctx.fillRect(4, -3, 3, 2);
    }
  }

  drawCavernMist(time, cameraX) {
    const ctx = this.ctx;
    const isArcane = this.level.mood === 'arcane';
    const tint = isArcane ? '91, 198, 225' : '255, 119, 48';

    const base = ctx.createLinearGradient(0, 190, 0, VIEW.HEIGHT);
    base.addColorStop(0, `rgba(${tint}, 0)`);
    base.addColorStop(0.65, `rgba(${tint}, 0.035)`);
    base.addColorStop(1, `rgba(${tint}, 0.105)`);
    ctx.fillStyle = base;
    ctx.fillRect(0, 184, VIEW.WIDTH, VIEW.HEIGHT - 184);

    for (let layer = 0; layer < 3; layer += 1) {
      ctx.fillStyle = `rgba(${tint}, ${0.018 + layer * 0.006})`;
      const yBase = 214 + layer * 23;
      const shift = time * (5 + layer * 4) + cameraX * 0.035 * (layer + 1);
      for (let i = -1; i < 10; i += 1) {
        const x = i * 66 + (shift % 66);
        const y = yBase + Math.sin((x + shift) * 0.03 + layer) * 3;
        ctx.fillRect(Math.round(x), Math.round(y), 54, 2);
        ctx.fillRect(Math.round(x + 15), Math.round(y - 2), 24, 1);
      }
    }
  }

  drawCavernForeground(time, cameraX) {
    const ctx = this.ctx;
    const isArcane = this.level.mood === 'arcane';
    const color = isArcane ? '#9ceaff' : '#ffb066';

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i += 1) {
      const seed = hash(i, 31);
      const speed = 2 + seed * 5;
      const x = ((seed * VIEW.WIDTH + time * speed * 7 - cameraX * 0.08) % (VIEW.WIDTH + 40) + VIEW.WIDTH + 40) % (VIEW.WIDTH + 40) - 20;
      const y = 220 - ((time * (6 + seed * 14) + seed * 80) % 210);
      ctx.globalAlpha = 0.08 + seed * 0.12;
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), seed > 0.75 ? 2 : 1, seed > 0.75 ? 2 : 1);
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    const vignette = ctx.createRadialGradient(
      VIEW.WIDTH / 2,
      VIEW.HEIGHT / 2,
      VIEW.WIDTH * 0.18,
      VIEW.WIDTH / 2,
      VIEW.HEIGHT / 2,
      VIEW.WIDTH * 0.62,
    );
    vignette.addColorStop(0, 'rgba(4, 2, 8, 0)');
    vignette.addColorStop(0.72, 'rgba(4, 2, 8, 0.16)');
    vignette.addColorStop(1, 'rgba(3, 1, 6, 0.54)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);
  }

  drawShoeFlash(game) {
    // 鞋头反光是追思小径的皮鞋专属；其它线路不画。
    if (game.introFlash <= 0 || game.mode !== 'memorial') return;
    const ctx = this.ctx;
    const duration = 0.9;
    const progress = 1 - game.introFlash / duration;
    const fade = Math.sin(Math.min(1, progress) * Math.PI);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(-70 + progress * (VIEW.WIDTH + 140), 0);
    ctx.rotate(-0.13);
    ctx.globalAlpha = 0.4 * fade;
    ctx.fillStyle = '#fff5d5';
    ctx.fillRect(0, -80, 1, 460);
    ctx.globalAlpha = 0.12 * fade;
    ctx.fillRect(-7, -80, 5, 460);
    ctx.fillRect(9, -80, 13, 460);
    ctx.globalAlpha = 0.035 * fade;
    ctx.fillRect(-18, -80, 40, 460);
    ctx.restore();

    if (game.introFlash > 0.12) {
      const sx = Math.round(game.player.centerX - game.camera.x);
      const sy = Math.round(game.player.feetY - game.camera.y);
      const sparkle = Math.min(1, game.introFlash * 2.2);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = sparkle * 0.85;
      ctx.fillStyle = '#fff6d7';
      const glints = [
        [-10, -2, 3],
        [7, -5, 2],
        [-2, -13, 2],
        [12, 1, 1],
      ];
      for (const [dx, dy, length] of glints) {
        ctx.fillRect(sx + dx - length, sy + dy, length * 2 + 1, 1);
        ctx.fillRect(sx + dx, sy + dy - length, 1, length * 2 + 1);
      }
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#ffd88a';
      ctx.fillRect(sx - 5, sy - 1, 11, 1);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  drawDamageFlash(game) {
    if (game.damageFlash <= 0) return;
    const ctx = this.ctx;
    const alpha = game.damageFlash * 0.45;
    const gradient = ctx.createRadialGradient(
      VIEW.WIDTH / 2,
      VIEW.HEIGHT / 2,
      VIEW.WIDTH * 0.18,
      VIEW.WIDTH / 2,
      VIEW.HEIGHT / 2,
      VIEW.WIDTH * 0.66,
    );
    gradient.addColorStop(0, 'rgba(255, 100, 30, 0)');
    gradient.addColorStop(0.72, `rgba(255, 74, 20, ${alpha * 0.3})`);
    gradient.addColorStop(1, `rgba(160, 25, 12, ${alpha})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);
  }

  /**
   * 追思路线的氛围叠加，都只是画面，不造成伤害：
   *   - 每一段：整屏轻轻压一层这一段的病色，天色、远山、雾也同色；
   *   - 第五段（恶劣心境）：世界慢慢褪色，偶尔透一口气；
   *   - 微睡眠：整屏暗下去一瞬；
   *   - 惊恐发作：视野从四周向内收成一条隧道，再自己慢慢打开；
   *   - 南瓜车任务超时：整屏红色报警、扫描带闪烁。
   */
  /** 雨川的雨。画在屏幕空间，不参与碰撞。 */
  drawRain(time, cameraX) {
    if (!this.level.weather || this.level.weather !== 'rain') return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.26;
    ctx.strokeStyle = 'rgba(176, 220, 226, 0.7)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 70; i += 1) {
      const seed = hash(i, 17);
      const speed = 210 + seed * 180;
      const x = ((seed * 613 + time * 26 - cameraX * 0.3) % (VIEW.WIDTH + 80)) - 40;
      const y = ((seed * 391 + time * speed) % (VIEW.HEIGHT + 40)) - 20;
      ctx.beginPath();
      ctx.moveTo(Math.round(x), Math.round(y));
      ctx.lineTo(Math.round(x - 4), Math.round(y + 10));
      ctx.stroke();
    }
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#a8d8dc';
    ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);
    ctx.restore();
  }

  /**
   * 百鬼夜行的氛围：引路灯在队伍中心照出一小圈暖光，
   * 边缘压一层凉色，越往画面外越暗。纯画面，不影响操作。
   */
  drawParadeAtmosphere(game, time) {
    if (game.mode !== 'parade') return;
    const ctx = this.ctx;
    const focus = game.getFocus?.() ?? {
      x: game.player.centerX,
      y: game.player.centerY,
    };
    const sx = Math.round(focus.x - game.camera.x);
    const sy = Math.round(focus.y - game.camera.y);
    const flicker = 0.96 + Math.sin(time * 3.1) * 0.03;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lamp = ctx.createRadialGradient(sx, sy - 8, 6, sx, sy - 8, 110);
    lamp.addColorStop(0, `rgba(255, 186, 112, ${0.075 * flicker})`);
    lamp.addColorStop(0.5, 'rgba(255, 150, 80, 0.028)');
    lamp.addColorStop(1, 'rgba(255, 130, 70, 0)');
    ctx.fillStyle = lamp;
    ctx.fillRect(sx - 120, sy - 128, 240, 240);
    ctx.restore();

    const vignette = ctx.createRadialGradient(
      VIEW.WIDTH / 2,
      VIEW.HEIGHT / 2,
      VIEW.WIDTH * 0.24,
      VIEW.WIDTH / 2,
      VIEW.HEIGHT / 2,
      VIEW.WIDTH * 0.68,
    );
    vignette.addColorStop(0, 'rgba(8, 3, 12, 0)');
    vignette.addColorStop(0.7, 'rgba(8, 3, 12, 0.12)');
    vignette.addColorStop(1, 'rgba(5, 2, 9, 0.4)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);

    // 被灯火照起来的一点点灰烬
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 10; i += 1) {
      const seed = hash(i + 3, 71);
      const x = sx - 46 + seed * 92 + Math.sin(time * 0.6 + i) * 6;
      const y = sy - 10 - ((time * (12 + seed * 16) + seed * 40) % 52);
      ctx.globalAlpha = 0.18 + seed * 0.18;
      ctx.fillStyle = seed > 0.5 ? '#ffd29a' : '#ff9f78';
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawMemorialAtmosphere(game, time) {
    if (game.mode !== 'memorial') return;
    const session = game.session;
    if (!session) return;
    const ctx = this.ctx;
    const backdrop = this.level.backdrop ?? this.level.memorialChapter?.backdrop;

    // 每一段都有自己的底色：一层很淡的同色光把地面和人物也染上这段的气息。
    if (backdrop) {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = `rgb(${backdrop.haze})`;
      ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);

      const horizon = ctx.createLinearGradient(0, 150, 0, VIEW.HEIGHT);
      horizon.addColorStop(0, `rgba(${backdrop.haze}, 0)`);
      horizon.addColorStop(0.55, `rgba(${backdrop.haze}, 0.03)`);
      horizon.addColorStop(1, `rgba(${backdrop.haze}, 0.07)`);
      ctx.fillStyle = horizon;
      ctx.fillRect(0, 150, VIEW.WIDTH, VIEW.HEIGHT - 150);
      ctx.restore();
    }

    // 恶劣心境：颜色随着路一点点淡下去；偶尔有一层很暖的光扫过，像短暂的好日子。
    if (this.level.stage === 5) {
      const span = Math.max(1, this.level.goalX - this.level.spawn.x);
      const progress = Math.max(
        0,
        Math.min(1, (game.player.centerX - this.level.spawn.x) / span),
      );

      ctx.save();
      ctx.globalCompositeOperation = 'saturation';
      ctx.globalAlpha = 0.36 + progress * 0.3;
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);
      ctx.restore();

      ctx.save();
      const fade = 0.12 + progress * 0.12 + Math.sin(time * 0.5) * 0.02;
      ctx.fillStyle = `rgba(54, 60, 74, ${fade})`;
      ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);
      const lift = Math.max(0, Math.sin(time * 0.21 + 1.4)) ** 8;
      if (lift > 0.01) {
        const glow = ctx.createLinearGradient(0, 0, 0, VIEW.HEIGHT);
        glow.addColorStop(0, `rgba(255, 213, 150, ${0.07 * lift})`);
        glow.addColorStop(1, 'rgba(255, 196, 120, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);
      }
      ctx.restore();
    }

    // 微睡眠：世界暗下去一小会儿。
    if (session.memorialDoze > 0) {
      const alpha = Math.min(0.62, session.memorialDoze * 0.75);
      ctx.save();
      ctx.fillStyle = `rgba(4, 5, 10, ${alpha})`;
      ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);
      ctx.restore();
    }

    // 惊恐发作：边缘合拢，中间只剩一小块还能看见，随后慢慢打开。
    if (session.memorialTunnel > 0) {
      // 2.4 秒与 memorial.js 里 panic 的 trigger.tunnel 对应。
      const total = 2.4;
      const progress = 1 - Math.min(1, session.memorialTunnel / total);
      const fade = Math.min(1, session.memorialTunnel / 1.5);
      const open = 18 + progress * 120;
      const cx = VIEW.WIDTH / 2;
      const cy = VIEW.HEIGHT / 2;
      const tunnel = ctx.createRadialGradient(cx, cy, open, cx, cy, VIEW.WIDTH * 0.66);
      tunnel.addColorStop(0, 'rgba(3, 4, 9, 0)');
      tunnel.addColorStop(0.55, `rgba(3, 4, 9, ${0.5 * fade})`);
      tunnel.addColorStop(1, `rgba(2, 2, 6, ${0.94 * fade})`);
      ctx.save();
      ctx.fillStyle = tunnel;
      ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);
      ctx.restore();
    }

    // 南瓜车任务超时：整屏红色报警闪烁。
    if (session.carriageAlarm) {
      const pulse = 0.5 + Math.sin(time * 11) * 0.5;
      ctx.save();
      ctx.fillStyle = `rgba(196, 24, 30, ${0.07 + pulse * 0.15})`;
      ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);
      ctx.strokeStyle = `rgba(255, 74, 70, ${0.4 + pulse * 0.45})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, VIEW.WIDTH - 4, VIEW.HEIGHT - 4);
      ctx.globalAlpha = 0.12 + pulse * 0.14;
      ctx.fillStyle = '#ff5a52';
      for (let y = 0; y < VIEW.HEIGHT; y += 24) {
        ctx.fillRect(0, y + Math.round(time * 60) % 24, VIEW.WIDTH, 2);
      }
      ctx.restore();
    }
  }
}
