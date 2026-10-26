import { PHYSICS, VIEW } from './config.js';

const T = VIEW.TILE;

/**
 * 地上的南瓜是可以推、可以抱起来抛、也可以叠高的实体。
 *
 * 尺寸与 renderer.drawPumpkin 的画法对齐：宽 14、高 12，
 * 位置用碰撞盒的左上角记录，底边正好坐在摆放格的地面上。
 * 南瓜之间只在「身体明显交叠」时才挡住横移，叠在一起的两颗
 * （上下相接、竖直方向没有交叠）因此可以被推着分开，上面的会自己掉下来。
 *
 * 一个世界里可以有多名玩家：每位玩家最多抱一颗南瓜，用 pumpkin.carrier 记录。
 * 普通线路只有主角；鬼鬼祟祟里两个小鬼都能推、抱、抛。
 */
export const PUMPKIN = Object.freeze({
  width: 14,
  height: 12,
  gravity: PHYSICS.gravity * 1.08,
  maxFall: PHYSICS.maxFall,
  groundFriction: 1400,
  airDrag: 30,
  pickupRadius: 32,
  // 没有可叠的目标时，抛起主要是竖直方向，只带一点点向前的分量；
  // 站在另一颗南瓜旁边抛时，会在 toss() 里对准它轻轻放下。
  tossVX: 46,
  tossVY: -300,
});

const overlapX = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x;

function approach(value, target, amount) {
  if (value < target) return Math.min(value + amount, target);
  return Math.max(value - amount, target);
}

export class PumpkinWorld {
  constructor(level) {
    this.level = level;
    this.pumpkins = (level.pumpkinSpawns ?? []).map((spawn, index) => ({
      id: `pumpkin-${index}`,
      x: spawn.x - PUMPKIN.width / 2,
      y: spawn.y - PUMPKIN.height,
      // 掉进深坑或岩浆后回到最初摆放的位置，避免关卡里的南瓜被永久弄丢。
      homeX: spawn.x - PUMPKIN.width / 2,
      homeY: spawn.y - PUMPKIN.height,
      w: PUMPKIN.width,
      h: PUMPKIN.height,
      vx: 0,
      vy: 0,
      variant: spawn.variant ?? 0,
      onGround: true,
      carrier: null,
    }));
    this.stats = { pushes: 0, pickups: 0, throws: 0, stacks: 0 };
  }

  /** players 可以是单个 Player，也可以是 [player, partner, ...]。 */
  update(dt, players) {
    const list = (Array.isArray(players) ? players : [players]).filter(Boolean);

    for (const pumpkin of this.pumpkins) {
      if (pumpkin.carrier) this.updateCarried(pumpkin);
    }
    for (const pumpkin of this.pumpkins) {
      if (pumpkin.carrier) continue;
      this.step(pumpkin, dt);
      // 掉进岩浆、裂隙、瘴气或掉出地图底部的南瓜，回到最初摆放的位置。
      if (
        pumpkin.y > this.level.pixelHeight + 120 ||
        this.level.overlapsHazard?.(pumpkin)
      ) {
        this.respawn(pumpkin);
      }
    }
    for (const player of list) this.resolvePlayer(player);
  }

  respawn(pumpkin) {
    pumpkin.x = pumpkin.homeX;
    pumpkin.y = pumpkin.homeY;
    pumpkin.vx = 0;
    pumpkin.vy = 0;
    pumpkin.onGround = true;
    pumpkin.carrier = null;
  }

  /** 手里的南瓜跟着头顶走，不参与落地碰撞。 */
  updateCarried(pumpkin) {
    const player = pumpkin.carrier;
    if (!player) return;
    pumpkin.x = player.centerX + player.facing * 6 - pumpkin.w / 2;
    pumpkin.y = player.y - pumpkin.h - 8;
    pumpkin.vx = 0;
    pumpkin.vy = 0;
    pumpkin.onGround = false;
  }

  getCarried(player) {
    return this.pumpkins.find((pumpkin) => pumpkin.carrier === player) ?? null;
  }

  step(pumpkin, dt) {
    const wasSupported = this.isSupported(pumpkin);
    pumpkin.onGround = wasSupported;

    const friction = wasSupported ? PUMPKIN.groundFriction : PUMPKIN.airDrag;
    pumpkin.vx = approach(pumpkin.vx, 0, friction * dt);
    pumpkin.vy = Math.min(pumpkin.vy + PUMPKIN.gravity * dt, PUMPKIN.maxFall);

    if (pumpkin.vx !== 0) {
      const dx = pumpkin.vx * dt;
      const moved = this.moveX(pumpkin, dx);
      if (Math.abs(moved) < Math.abs(dx) - 1e-4) pumpkin.vx = 0;
    }

    if (pumpkin.vy !== 0) {
      const prevBottom = pumpkin.y + pumpkin.h;
      const landedOn = this.moveY(pumpkin, pumpkin.vy * dt, prevBottom);
      if (landedOn) {
        pumpkin.vy = 0;
        pumpkin.onGround = true;
        if (landedOn === 'pumpkin' && !wasSupported) this.stats.stacks += 1;
      }
    }
  }

  isSupported(pumpkin) {
    const bottom = pumpkin.y + pumpkin.h;
    const row = Math.floor((bottom + 0.5) / T);
    if (Math.abs(bottom - row * T) <= 0.9) {
      const colLeft = Math.floor((pumpkin.x + 1) / T);
      const colRight = Math.floor((pumpkin.x + pumpkin.w - 1) / T);
      for (let col = colLeft; col <= colRight; col += 1) {
        const tile = this.level.getTile(col, row);
        if (tile === '#' || tile === 'B' || tile === 'C' || tile === 'P') return true;
      }
    }

    for (const other of this.pumpkins) {
      if (other === pumpkin || other.carrier) continue;
      if (!overlapX(pumpkin, other)) continue;
      if (Math.abs(bottom - other.y) <= 0.9) return true;
    }
    return false;
  }

  moveX(pumpkin, dx) {
    const startX = pumpkin.x;
    pumpkin.x += dx;

    const rowTop = Math.floor((pumpkin.y + 1) / T);
    const rowBottom = Math.floor((pumpkin.y + pumpkin.h - 1) / T);
    if (dx > 0) {
      const col = Math.floor((pumpkin.x + pumpkin.w - 0.001) / T);
      for (let row = rowTop; row <= rowBottom; row += 1) {
        if (this.level.isSolid(col, row)) {
          pumpkin.x = col * T - pumpkin.w;
          pumpkin.vx = 0;
          break;
        }
      }
    } else if (dx < 0) {
      const col = Math.floor(pumpkin.x / T);
      for (let row = rowTop; row <= rowBottom; row += 1) {
        if (this.level.isSolid(col, row)) {
          pumpkin.x = (col + 1) * T;
          pumpkin.vx = 0;
          break;
        }
      }
    }

    // 并排的两颗互相挡住；上下叠着的时候竖直方向几乎没有交叠，不挡横移。
    for (const other of this.pumpkins) {
      if (other === pumpkin || other.carrier) continue;
      const vOverlap =
        Math.min(pumpkin.y + pumpkin.h, other.y + other.h) -
        Math.max(pumpkin.y, other.y);
      if (vOverlap <= 4 || !overlapX(pumpkin, other)) continue;
      pumpkin.x = dx > 0 ? other.x - pumpkin.w : other.x + other.w;
      pumpkin.vx = 0;
    }

    return pumpkin.x - startX;
  }

  /** 返回 'tile' / 'pumpkin' 表示落地，null 表示还在空中。 */
  moveY(pumpkin, dy, prevBottom) {
    pumpkin.y += dy;
    const colLeft = Math.floor((pumpkin.x + 1) / T);
    const colRight = Math.floor((pumpkin.x + pumpkin.w - 1) / T);

    if (dy > 0) {
      const row = Math.floor((pumpkin.y + pumpkin.h - 0.001) / T);
      for (let col = colLeft; col <= colRight; col += 1) {
        const tile = this.level.getTile(col, row);
        const solid = tile === '#' || tile === 'B' || tile === 'C';
        const oneWay = tile === 'P' && prevBottom <= row * T + 0.9;
        if (solid || oneWay) {
          pumpkin.y = row * T - pumpkin.h;
          return 'tile';
        }
      }

      for (const other of this.pumpkins) {
        if (other === pumpkin || other.carrier) continue;
        if (!overlapX(pumpkin, other)) continue;
        if (prevBottom <= other.y + 1.5 && pumpkin.y + pumpkin.h >= other.y) {
          pumpkin.y = other.y - pumpkin.h;
          return 'pumpkin';
        }
      }
    } else if (dy < 0) {
      const row = Math.floor(pumpkin.y / T);
      for (let col = colLeft; col <= colRight; col += 1) {
        if (this.level.isSolid(col, row)) {
          pumpkin.y = (row + 1) * T;
          return 'tile';
        }
      }
      for (const other of this.pumpkins) {
        if (other === pumpkin || other.carrier) continue;
        if (!overlapX(pumpkin, other)) continue;
        if (pumpkin.y <= other.y + other.h && pumpkin.y + pumpkin.h > other.y) {
          pumpkin.y = other.y + other.h;
          return 'pumpkin';
        }
      }
    }
    return null;
  }

  /**
   * 玩家与南瓜的接触：从上方落到南瓜上会被它接住；
   * 从侧面撞上去则把南瓜推开，推到墙或另一颗南瓜跟前时自己也停下。
   */
  resolvePlayer(player) {
    for (const pumpkin of this.pumpkins) {
      if (pumpkin.carrier) continue;
      let box = player.bounds;
      if (!overlapX(box, pumpkin)) continue;

      const feet = player.feetY;
      if (
        player.vy >= 0 &&
        feet >= pumpkin.y - 2 &&
        feet <= pumpkin.y + pumpkin.h * 0.7
      ) {
        player.y = pumpkin.y - player.h;
        player.vy = 0;
        player.onGround = true;
        continue;
      }

      box = player.bounds;
      const vOverlap =
        Math.min(box.y + box.h, pumpkin.y + pumpkin.h) - Math.max(box.y, pumpkin.y);
      if (vOverlap <= 4) continue;

      // 推的方向跟着玩家的朝向走。只看两个中心的相对位置时，
      // 南瓜被推到墙边、玩家还压在里面，会误判成往回推，产生抖动。
      const dir = player.facing >= 0 ? 1 : -1;
      const penetration =
        dir > 0
          ? box.x + box.w - pumpkin.x
          : pumpkin.x + pumpkin.w - box.x;
      if (penetration <= 0) continue;

      const moved = Math.abs(this.moveX(pumpkin, dir * penetration));
      if (moved > 0.01) this.stats.pushes += moved;
      const remaining = penetration - moved;
      if (remaining > 0.01) {
        if (dir > 0) player.x -= remaining;
        else player.x += remaining;
        if (Math.sign(player.vx) === dir) player.vx = 0;
      }
    }
  }

  findNearby(player) {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const pumpkin of this.pumpkins) {
      if (pumpkin.carrier) continue;
      const dx = pumpkin.x + pumpkin.w / 2 - player.centerX;
      const dy = pumpkin.y + pumpkin.h / 2 - player.centerY;
      const distance = Math.hypot(dx, dy);
      if (distance > PUMPKIN.pickupRadius || distance >= nearestDistance) continue;
      nearest = pumpkin;
      nearestDistance = distance;
    }
    return nearest;
  }

  /**
   * 没有指定角色时，谁最该响应互动：
   *   - 单人：手里有就抛，手里没有就抱起身边的南瓜；
   *   - 双人：先让身边有空南瓜、且自己没抱东西的人去抱；
   *     两个人都没得抱时，再让抱着南瓜的人抛出。
   * 鬼鬼祟祟里两个人各有自己的互动键，通常会直接指定角色，只有兜底时才走这里。
   */
  pickPlayer(players) {
    const list = (Array.isArray(players) ? players : [players]).filter(Boolean);

    if (list.length === 1) {
      const player = list[0];
      if (this.getCarried(player) || this.findNearby(player)) return player;
      return null;
    }

    let best = null;
    let bestDistance = Infinity;
    for (const player of list) {
      if (this.getCarried(player)) continue;
      const pumpkin = this.findNearby(player);
      if (!pumpkin) continue;
      const dx = pumpkin.x + pumpkin.w / 2 - player.centerX;
      const dy = pumpkin.y + pumpkin.h / 2 - player.centerY;
      const distance = Math.hypot(dx, dy);
      if (distance >= bestDistance) continue;
      best = player;
      bestDistance = distance;
    }
    if (best) return best;

    return list.find((player) => this.getCarried(player)) ?? null;
  }

  /** 互动键：手里没有就抱起最近的一颗，手里有就抛出去。 */
  interact(player) {
    if (this.getCarried(player)) {
      this.toss(player);
      return 'toss';
    }
    const pumpkin = this.findNearby(player);
    if (!pumpkin) return null;
    pumpkin.carrier = player;
    pumpkin.vx = 0;
    pumpkin.vy = 0;
    this.stats.pickups += 1;
    this.updateCarried(pumpkin);
    return 'pickup';
  }

  toss(player) {
    const pumpkin = this.getCarried(player);
    if (!pumpkin) return;
    pumpkin.carrier = null;
    pumpkin.onGround = false;
    this.stats.throws += 1;

    // 面前就有一颗可以叠的南瓜：对准它的顶轻轻放上去。
    // 这样「抱起再抛」才真的能叠高，而不是靠玩家手动算抛物线。
    const target = this.findStackTarget(player, pumpkin);
    if (target) {
      pumpkin.x = target.x + (target.w - pumpkin.w) / 2;
      pumpkin.y = target.y - pumpkin.h - 8;
      pumpkin.vx = 0;
      pumpkin.vy = -150;
      return;
    }

    pumpkin.x = player.centerX + player.facing * 6 - pumpkin.w / 2;
    pumpkin.y = player.y - pumpkin.h - 8;
    pumpkin.vx = player.facing * PUMPKIN.tossVX;
    pumpkin.vy = PUMPKIN.tossVY;
  }

  /** 抛南瓜时，正前方近处有没有一颗可以接住它的南瓜。 */
  findStackTarget(player, carried) {
    let target = null;
    let targetDistance = Infinity;
    for (const other of this.pumpkins) {
      if (other === carried || other.carrier) continue;
      const dx = other.x + other.w / 2 - player.centerX;
      const dy = other.y + other.h / 2 - player.centerY;
      // 只认面朝方向、贴近自己的那一颗；脚边正下方踩着的那颗不算。
      if (dx * player.facing < -2) continue;
      if (Math.abs(dx) > 40 || Math.abs(dy) > 34) continue;
      if (Math.abs(dx) < 16 && Math.abs(other.y - player.feetY) < 6) continue;
      if (other.y + other.h > player.feetY + 6) continue;
      const distance = Math.hypot(dx, dy);
      if (distance >= targetDistance) continue;
      target = other;
      targetDistance = distance;
    }
    return target;
  }

  getPrompt(player, key = 'E') {
    if (this.getCarried(player)) {
      return {
        kind: 'pumpkin',
        key,
        available: true,
        text: '抛出南瓜 · 落到另一颗上会叠高',
      };
    }
    if (this.findNearby(player)) {
      return {
        kind: 'pumpkin',
        key,
        available: true,
        text: `抱起南瓜 · 再按 ${key} 抛出`,
      };
    }
    return null;
  }
}
