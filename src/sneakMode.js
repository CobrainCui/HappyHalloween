/**
 * 「鬼鬼祟祟」的运行逻辑。
 *
 * 这些函数都直接操作 Game 实例，但不改 Game 的其它模式：
 * 只有 mode === 'sneak' 时才会被调用。把逻辑单独放在这里，
 * 是为了不把原有的单人 / 追思 / 百鬼夜行流程搅在一起。
 */
import { PLAYER, VIEW } from './config.js';
import { SNEAK_ROUTE, SNEAK_STAGES } from './sneak.js';

const LABELS = ['鬼鬼', '祟祟'];

/**
 * 叠罗汉：上面那个人站在下面那个人的「头顶」上。
 * 小鬼的画高约 27px，所以脚的落点比下面那个人的碰撞盒顶部再高 9px。
 */
const STACK_FEET = 27;
const STACK_CROUCH_FEET = 21;
const STACK_BOOST = 1.34;

/** 下面的人蹲下时身体变矮，头顶也跟着低下去。 */
const stackOffset = (lower) => (lower.crouching ? STACK_CROUCH_FEET : STACK_FEET);

/** 影子线。线只是两个人的联系，只有按住 Space 收紧时才真的产生拉力。 */
const ROPE = Object.freeze({
  attach: 148, // 超过这个距离，线就够不着
  maxLength: 132,
  minLength: 24,
  reel: 62, // 收线速度 px/s
  pull: 250, // 拉拽速度上限 px/s
  swing: 95, // 横向速度超过这个值，就算在荡，不收线
});

const jumpKey = (index) => (index === 0 ? 'W' : '↑');
const crouchKey = (index) => (index === 0 ? 'S' : '↓');

/** 一条新赛道开始时附在 session 上的潜行状态。 */
export function createSneakState() {
  return {
    spotted: 0,
    falls: 0,
    caughtCooldown: 0,
    checkpointIndex: -1,
    stageStartSpotted: 0,
    stageStartFalls: 0,
    hints: new Set(),
    warned: [false, false],
    goalTimer: 0,
    rope: {
      active: false,
      length: ROPE.maxLength,
      reeled: false,
      warned: false,
    },
    // 组合技第一次成功时各提示一次，跨段保留。
    combo: { stack: false, boost: false, rope: false, hoist: false, gate: false },
  };
}

export function sneakPlayers(game) {
  return [game.player, game.partner];
}

/** 进入一段新地图时，只清掉“这一段”的临时状态，保留整条赛道的被发现次数。 */
export function initSneakStage(game) {
  if (!game.session.sneak) game.session.sneak = createSneakState();
  const sneak = game.session.sneak;
  sneak.caughtCooldown = 1;
  sneak.checkpointIndex = -1;
  sneak.hints = new Set();
  sneak.warned = [false, false];
  sneak.goalTimer = 0;
  sneak.stageStartSpotted = sneak.spotted;
  sneak.stageStartFalls = sneak.falls;
  sneak.rope = {
    active: false,
    length: ROPE.maxLength,
    reeled: false,
    warned: false,
  };

  for (const player of sneakPlayers(game)) {
    player.exposure = 0;
    player.hidden = false;
    player.seen = false;
    player.standingOn = null;
    player.carrying = null;
  }
}

export function createSneakInput(input) {
  return {
    isDown: (action) => input.isDown(`p1${action}`),
    consumePress: (action) => input.consumePress(`p1${action}`),
    clearPressed: () => input.clearPressed(),
  };
}

export function sneakStageName(stage) {
  return SNEAK_STAGES[stage - 1]?.name ?? '';
}

/** 整条赛道的主循环。 */
export function updateSneak(game, dt) {
  const sneak = game.session.sneak;
  const level = game.level;
  sneak.caughtCooldown = Math.max(0, sneak.caughtCooldown - dt);

  updateWatchers(level, dt);
  updateGates(game);
  const before = sneakPlayers(game).map((player) => ({
    x: player.x,
    y: player.y,
    feetY: player.feetY,
  }));
  game.player.update(dt, game.sneakInput, level);
  game.partner.update(dt, game.input, level);
  // 地上的南瓜和别的线路一样能推、抱、抛、叠高；两个小鬼都能碰它们。
  // 放在叠罗汉 / 影子线之前，踩在南瓜上的脚这一帧就算落地。
  if (game.pumpkins) game.pumpkins.update(dt, sneakPlayers(game));
  // 两个人之间的两件默契：踩在对方头顶上，以及一根可以收紧的影子线。
  updateStack(game, before);
  updateRope(game, dt);
  keepPairTogether(game);
  updateGates(game);

  updateExposure(game, dt);
  updateCheckpoints(game);
  updateHints(game);
  checkHazards(game);
  updateSneakCamera(game, dt);
  game.particles.update(dt);

  if (game.session.completed) return;
  const goalY = level.goalY;
  const atGoal = sneakPlayers(game).every(
    (player) =>
      player.centerX >= level.goalX - 6 &&
      // 屋顶上的门有高度：从屋檐下面走过不算到。
      (goalY == null || Math.abs(player.feetY - goalY) < 28),
  );
  if (!atGoal) {
    sneak.goalTimer = 0;
    return;
  }
  if (sneak.goalTimer <= 0) {
    sneak.goalTimer = 0.55;
    game.audio.checkpoint();
    game.notify('两个人都到门口了。', 1500);
  }
  sneak.goalTimer -= dt;
  if (sneak.goalTimer <= 0) game.advanceSneak();
}

function updateWatchers(level, dt) {
  for (const device of level.devices) {
    if (device.type !== 'watcher') continue;
    // 后几段的守夜人会提着灯来回走。走到头就转身，
    // 灯光锥也跟着转到另一边——院子里的影子会一段一段地换位置。
    if (device.minX != null && device.maxX != null) {
      device.patrolClock = (device.patrolClock ?? 0) + dt * device.patrolSpeed;
      const span = Math.max(0.001, device.maxX - device.minX);
      const cycle = device.patrolClock % (span * 2);
      if (cycle < span) {
        device.x = device.minX + cycle;
        device.dir = 1;
      } else {
        device.x = device.maxX - (cycle - span);
        device.dir = -1;
      }
    }
    device.clock = (device.clock ?? device.phase ?? 0) + dt;
    const base = device.dir > 0 ? 0.12 : Math.PI - 0.12;
    device.angle = base + Math.sin(device.clock * device.speed + device.phase) * device.sweep;
    device.alert = false;
  }
}

function playerOnPlate(player, plate) {
  return (
    player.onGround &&
    Math.abs(player.centerX - plate.x) < (plate.radius ?? 15) &&
    Math.abs(player.feetY - plate.y) < 6
  );
}

/** 南瓜也能当砝码：稳稳放在秤盘上就别再搬走，门会一直认它的重量。 */
function pumpkinOnPlate(pumpkin, plate) {
  if (pumpkin.carrier || !pumpkin.onGround) return false;
  return (
    Math.abs(pumpkin.x + pumpkin.w / 2 - plate.x) < (plate.radius ?? 15) &&
    Math.abs(pumpkin.y + pumpkin.h - plate.y) < 6
  );
}

function updateGates(game) {
  const level = game.level;
  const players = sneakPlayers(game);
  const pumpkins = game.pumpkins?.pumpkins ?? [];
  const plates = level.devices.filter((device) => device.type === 'plate');
  for (const plate of plates) {
    plate.pressed =
      players.some((player) => playerOnPlate(player, plate)) ||
      pumpkins.some((pumpkin) => pumpkinOnPlate(pumpkin, plate));
  }

  for (const gate of level.gates) {
    const pressed = gate.plates.map((id) => plates.find((plate) => plate.id === id)?.pressed);
    gate.pressedCount = pressed.filter(Boolean).length;
    let open = gate.mode === 'all' ? pressed.every(Boolean) : pressed.some(Boolean);

    // 「同时踩住」的门最容易被误会成「按顺序踩一遍」。
    // 只亮一块石板时明说还差几块，门上的小符也会跟着亮。
    if (
      gate.mode === 'all' &&
      gate.plates.length > 1 &&
      gate.pressedCount > 0 &&
      gate.pressedCount < gate.plates.length &&
      !gate.partialHinted
    ) {
      gate.partialHinted = true;
      game.notify(
        `门上的小符亮了 ${gate.pressedCount} / ${gate.plates.length} 块。另一块也要有人——或者一颗南瓜也行：两块同时压住，门才会升起来。`,
        3600,
      );
    }

    if (gate.latch && open && !gate.latched) {
      gate.latched = true;
      game.audio.tutorialChime();
    }
    if (gate.latched) open = true;

    // 门要合上时，如果还有人站在门框里，就先别合，免得把人夹住。
    // 铁门的符障一直顶到夜空，所以检查的高度也一直算到顶上。
    if (!open && gate.open) {
      const gx = gate.x * level.tileSize;
      const isGate = gate.kind !== 'bridge';
      const gy = isGate ? 0 : gate.y * level.tileSize;
      const gw = gate.w * level.tileSize;
      const gh = isGate
        ? (gate.y + gate.h) * level.tileSize
        : gate.h * level.tileSize;
      const occupied = players.some((player) => {
        const box = player.bounds;
        return (
          box.x < gx + gw &&
          box.x + box.w > gx &&
          box.y < gy + gh &&
          box.y + box.h > gy
        );
      });
      if (occupied) open = true;
    }

    if (open === gate.open) continue;
    gate.open = open;
    level.setGateOpen(gate, open);
    if (open) {
      game.audio.checkpoint();
      if (!gate.announced) {
        gate.announced = true;
        game.notify(
          gate.latch
            ? '门把这一下记住了。以后你们各自走开，它也不会再关上。'
            : gate.kind === 'bridge'
              ? '影子桥铺开了。压着秤盘的人一松脚（或南瓜被搬走），桥就会散。'
              : '石板压住了，门开着。压着秤盘的人一松脚（或南瓜被搬走），门就会合上。',
          2600,
        );
      }
    }
  }
}

/**
 * 叠罗汉。上面的小鬼落到下面那个人的头顶时会被接住；
 * 之后他跟着对方一起走、一起跳，按自己的跳跃键就能从头顶弹开。
 * 如果下面的人正蹲着，弹开的那一下会高很多——这是第一个组合技。
 */
function updateStack(game, before) {
  const sneak = game.session.sneak;
  const [a, b] = sneakPlayers(game);
  const players = [a, b];

  players.forEach((upper, index) => {
    const lower = upper.standingOn;
    if (!lower) return;
    const lowerIndex = 1 - index;

    // 从头顶起跳：先松开，再决定要不要给这一跳蓄力加成。
    if (upper.vy < -60) {
      upper.standingOn = null;
      lower.carrying = null;
      if (lower.crouching) {
        upper.vy *= STACK_BOOST;
        // 被顶出去的这一跳不再因为松开跳跃键而被截短。
        upper.autoJumping = true;
        game.particles.spawnSpark(upper.centerX, upper.feetY, 12);
        if (!sneak.combo.boost) {
          sneak.combo.boost = true;
          game.audio.tutorialChime();
          game.notify(
            `蓄力弹跳！${LABELS[index]}被${LABELS[lowerIndex]}顶得更高了。`,
            3400,
          );
        }
      }
      return;
    }

    // 走出头顶的范围就自己掉下去。
    if (Math.abs(upper.centerX - lower.centerX) > (upper.w + lower.w) / 2 + 2) {
      upper.standingOn = null;
      lower.carrying = null;
      return;
    }

    // 跟着下面的人走、跳、掉下去。蹲下时头顶会一起矮一截。
    upper.y = lower.y - stackOffset(lower);
    const carriedX = upper.x + (lower.x - before[lowerIndex].x);
    if (!rectIsSolid(game.level, carriedX, upper.y, upper.w, upper.h)) {
      upper.x = carriedX;
    }
    upper.vy = 0;
    upper.onGround = true;
  });

  const [upper, lower] = a.feetY <= b.feetY ? [a, b] : [b, a];
  if (upper.standingOn || lower.carrying || lower.standingOn) return;
  // 只有真正落下来的人才会踩到对方头顶。站在墙头当桩的人（onGround、
  // vy ≈ 0）不能因为脚下刚好和下面那个人对齐，就被当成“踩在他头上”——
  // 否则影子线会以为自己踩住了，立刻松线。留 30px/s 的门槛，
  // 正常的跳落、蹲跳都远高于它。
  if (upper.onGround || upper.vy <= 30) return;

  const upperIndex = upper === a ? 0 : 1;
  const lowerIndex = 1 - upperIndex;
  // 和上面「走出头顶范围就掉下去」用同一个宽度，免得刚踩上就被判出去。
  if (Math.abs(upper.centerX - lower.centerX) > (upper.w + lower.w) / 2 + 2) return;

  // 脚的落点：下面那个人头顶上方（视觉上正好踩在脑袋上）。
  const headY = lower.y - stackOffset(lower) + upper.h;
  const prevFeetY = before[upperIndex].feetY;
  // 必须是「从上面落下来」的那一下。站在墙头当桩的人，上一帧的脚
  // 就已经和对方的头顶齐平了，不能被算成一次踩踏。
  const crossed = prevFeetY <= headY - 0.5 && upper.feetY >= headY - 1;
  const inBand = upper.feetY <= headY + 18;
  if (!crossed || !inBand) return;

  upper.y = lower.y - stackOffset(lower);
  upper.vy = 0;
  upper.onGround = true;
  upper.standingOn = lower;
  lower.carrying = upper;

  game.particles.spawnDust(lower.centerX, lower.y, 0, 3);
  game.audio.land(90);

  if (!sneak.combo.stack) {
    sneak.combo.stack = true;
    game.notify(
      `${LABELS[upperIndex]}站到${LABELS[lowerIndex]}头顶上了。头顶的人按 ${jumpKey(upperIndex)} 跳；` +
        `下面的人蹲下按住 ${crouchKey(lowerIndex)} 再让他跳，会弹得更高。`,
      4800,
    );
  }
}

/**
 * 影子线。
 *
 * 两只鬼之间一直垂着一根线，但只有按住 Space 时它才会绷紧：
 * 站着的那个人当桩，另一个人被慢慢收过来。线够不着时不会硬拽，
 * 免得把原本靠石板门分开的两个人拉回一起。
 */
function updateRope(game, dt) {
  const sneak = game.session.sneak;
  const rope = sneak.rope;
  const [a, b] = sneakPlayers(game);
  const held = game.input.isDown('rope');
  const stacked = Boolean(a.standingOn || b.standingOn);

  if (!held || stacked) {
    rope.active = false;
    rope.reeled = false;
    rope.length = ROPE.maxLength;
    rope.warned = false;
    return;
  }

  const distance = Math.hypot(b.centerX - a.centerX, b.centerY - a.centerY);
  if (!rope.active) {
    if (distance > ROPE.attach) {
      if (!rope.warned) {
        rope.warned = true;
        game.notify('影子线够不着。两个人先靠近一点，再按住 Space。', 2600);
      }
      rope.length = ROPE.maxLength;
      return;
    }
    rope.active = true;
    rope.length = Math.max(ROPE.minLength, Math.min(ROPE.maxLength, distance));
    if (!sneak.combo.rope) {
      sneak.combo.rope = true;
      game.audio.tutorialChime();
      game.notify(
        '影子线绷紧了。站稳的人当桩，按住 Space 收线，把对方拉过来。',
        4200,
      );
    }
  }

  const groundedA = a.onGround && !a.standingOn;
  const groundedB = b.onGround && !b.standingOn;
  let anchor = null;
  let other = null;
  let gateBetween = null;
  if (groundedA && groundedB) {
    gateBetween = closedGateBetween(game.level, a, b);
    if (gateBetween) {
      // 两个人被一扇能翻的门隔开时，让已经过去（更靠右）的那个当桩，
      // 把门这边的人往前进的方向拉——而不是把过去的人拉回来。
      [anchor, other] = a.centerX >= b.centerX ? [a, b] : [b, a];
    } else {
      // 两个人都站着时，位置高的那个当桩。
      [anchor, other] = a.feetY <= b.feetY ? [a, b] : [b, a];
    }
  } else if (groundedA) {
    anchor = a;
    other = b;
  } else if (groundedB) {
    anchor = b;
    other = a;
  }
  if (!anchor) return;

  const dx = anchor.centerX - other.centerX;
  const dy = anchor.centerY - other.centerY;
  const d = Math.max(0.001, Math.hypot(dx, dy));
  const nx = dx / d;
  const ny = dy / d;

  // 荡起来的时候不收线，让秋千保持长度；站稳或慢慢吊着时才收。
  const tangential = Math.abs(other.vx * -ny + other.vy * nx);
  rope.reeled = tangential < ROPE.swing;
  if (rope.reeled) {
    rope.length = Math.max(ROPE.minLength, rope.length - ROPE.reel * dt);
  }

  if (d > rope.length + 0.5) {
    // 把向外的速度抹掉，再往桩那边送一点。切向速度保留，所以还能荡。
    const radial = other.vx * nx + other.vy * ny;
    const desired = Math.min(ROPE.pull, 70 + (d - rope.length) * 16);
    if (radial < desired) {
      const add = (desired - radial) * 0.6;
      other.vx += nx * add;
      other.vy += ny * add;
    }

    // 位置修正分两个轴做：撞墙时只保留能走的那一半。
    const excess = Math.min(6, d - rope.length);
    if (excess > 0) {
      const level = game.level;
      const nextX = other.x + nx * excess;
      const nextY = other.y + ny * excess;
      if (!rectIsSolid(level, nextX, other.y, other.w, other.h)) other.x = nextX;
      if (!rectIsSolid(level, other.x, nextY, other.w, other.h)) {
        other.y = nextY;
        if (ny < -0.2) other.onGround = false;
      }
    }
  }

  // 吊在黑水沟上方：线绷着的时候，人不会掉进沟里。
  // 这只是把脚吊在沟沿下面，剩下的还是得靠收线把人拉上来。
  for (const hazard of game.level.hazards) {
    if (other.x >= hazard.x + hazard.w || other.x + other.w <= hazard.x) continue;
    const limit = (hazard.killY ?? hazard.y) - 2;
    if (other.y + other.h > limit) {
      other.y = limit - other.h;
      other.vy = Math.min(other.vy, 0);
      other.onGround = false;
    }
  }

  // 最后一截：人被吊到墙沿下面以后，替他把腿抬上去。
  // 线已经收到底、下面的人差不多和上面的人齐平了，就直接让他站到同一层。
  // 这时候两个人中间可能隔着一整面墙，所以不再要求他们靠得很近。
  // 隔着一扇能翻的门时也一样：线收到底，门这边的人会被整个拽过门，
  // 落到当桩的人身边——这是「同时踩住两块石板」之外的另一条路。
  // 阈值留到 34px：贴着高墙侧面被吊起来的人，脚会停在墙沿下方约 27px，
  // 比 26 多一点点；屋顶那面五格高的烟囱墙就靠这一截把人接上去。
  if (
    rope.reeled &&
    rope.length <= ROPE.minLength + 0.75 &&
    other.feetY <= anchor.feetY + 34 &&
    (!other.onGround || gateBetween)
  ) {
    const level = game.level;
    const standY = anchor.feetY - other.h;
    const candidates = [
      anchor.x - other.w - 3,
      anchor.x + anchor.w + 3,
      anchor.x + (anchor.w - other.w) / 2,
    ];
    for (const targetX of candidates) {
      const supported = Math.abs(level.surfaceYAt(targetX + other.w / 2) - anchor.feetY) < 1.5;
      if (!supported) continue;
      if (rectIsSolid(level, targetX, standY, other.w, other.h)) continue;
      other.x = targetX;
      other.y = standY;
      other.vx = 0;
      other.vy = 0;
      other.onGround = true;
      other.standingOn = null;
      anchor.carrying = null;
      game.particles.spawnDust(other.centerX, other.feetY, 0, 4);
      game.audio.land(120);
      if (gateBetween) {
        game.particles.spawnSpark(other.centerX, other.centerY, 14);
        if (!sneak.combo.gate) {
          sneak.combo.gate = true;
          const otherIndex = other === a ? 0 : 1;
          game.audio.checkpoint();
          game.notify(`拉过来了。${LABELS[otherIndex]}被影子线从门那边整个拽了过来。`, 3200);
        }
      } else if (!sneak.combo.hoist) {
        sneak.combo.hoist = true;
        const otherIndex = other === a ? 0 : 1;
        game.audio.checkpoint();
        game.notify(`拉上来了。${LABELS[otherIndex]}踩着墙，被影子线拽了上去。`, 3000);
      }
      return;
    }
  }
}

/** 两个人之间有没有一扇关着、而且顶上留了缝的门。 */
function closedGateBetween(level, a, b) {
  for (const gate of level.gates ?? []) {
    if (!gate.climbable || gate.open || gate.kind === 'bridge') continue;
    const gx = gate.x * level.tileSize;
    const gw = gate.w * level.tileSize;
    const aIsLeft = a.x + a.w <= gx && b.x >= gx + gw;
    const bIsLeft = b.x + b.w <= gx && a.x >= gx + gw;
    if (!aIsLeft && !bIsLeft) continue;
    return gate;
  }
  return null;
}

/** 一个矩形是否压到实心格。影子线的位置修正用它避免把人塞进墙里。 */
function rectIsSolid(level, x, y, w, h) {
  const T = VIEW.TILE;
  const left = Math.floor(x / T);
  const right = Math.floor((x + w - 0.001) / T);
  const top = Math.floor(y / T);
  const bottom = Math.floor((y + h - 0.001) / T);
  for (let row = top; row <= bottom; row += 1) {
    for (let col = left; col <= right; col += 1) {
      if (level.isSolid(col, row)) return true;
    }
  }
  return false;
}

function watcherSees(level, watcher, player) {
  const originX = watcher.x;
  const originY = watcher.y - 30;
  const dx = player.centerX - originX;
  const dy = player.centerY - originY;
  const distance = Math.hypot(dx, dy);

  let range = watcher.range;
  let halfAngle = watcher.halfAngle;
  if (player.crouching) {
    // 屏住呼吸：只有贴到灯底下才会被看见。
    range *= 0.34;
    halfAngle *= 0.5;
  }
  if (distance > range) return false;

  let diff = Math.atan2(dy, dx) - watcher.angle;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  if (Math.abs(diff) > halfAngle) return false;
  return level.hasLineOfSight(originX, originY, player.centerX, player.centerY);
}

/**
 * 两只鬼是一对。屏幕只有 512px 宽，如果一个人跑得太远，
 * 镜头会把两个人都丢掉；这里用一根很软的「影子绳」把他们拉在 400px 内。
 * 正常解谜时两人相距不到 300px，几乎不会触发。
 */
function keepPairTogether(game) {
  const player = game.player;
  const partner = game.partner;
  const spread = partner.centerX - player.centerX;
  const maxSpread = 400;
  if (Math.abs(spread) <= maxSpread) return;
  const dir = Math.sign(spread);
  const push = (Math.abs(spread) - maxSpread) / 2;
  player.x += dir * push;
  partner.x -= dir * push;
}

function updateExposure(game, dt) {
  const level = game.level;
  const sneak = game.session.sneak;
  const players = sneakPlayers(game);
  const watchers = level.devices.filter((device) => device.type === 'watcher');

  players.forEach((player, index) => {
    const inShadow = level.isInShadow(player.centerX, player.centerY);
    player.hidden = inShadow;

    if (sneak.caughtCooldown > 0) {
      player.exposure = Math.max(0, (player.exposure ?? 0) - dt * 1.6);
      player.seen = false;
      return;
    }

    let seen = false;
    if (!inShadow) {
      for (const watcher of watchers) {
        if (watcherSees(level, watcher, player)) {
          seen = true;
          watcher.alert = true;
          break;
        }
      }
    }
    player.seen = seen;

    if (seen) {
      player.exposure = Math.min(1, (player.exposure ?? 0) + dt * (player.crouching ? 0.62 : 0.88));
    } else {
      player.exposure = Math.max(0, (player.exposure ?? 0) - dt * 0.95);
    }

    if (seen && player.exposure > 0.5 && !sneak.warned[index]) {
      sneak.warned[index] = true;
      game.notify(
        `守夜人的灯扫到${LABELS[index]}了。按住 ${index === 0 ? 'S' : '↓'} 潜行，或躲进影子。`,
        2400,
      );
    }
    if (!seen && player.exposure < 0.08) sneak.warned[index] = false;

    if (player.exposure >= 1) caughtByWatcher(game, index);
  });
}

function caughtByWatcher(game, index) {
  const sneak = game.session.sneak;
  if (sneak.caughtCooldown > 0) return;

  sneak.spotted += 1;
  sneak.caughtCooldown = 2.2;
  game.damageFlash = 1;
  game.audio.error();
  game.audio.death();

  for (const player of sneakPlayers(game)) {
    player.exposure = 0;
    game.particles.spawnDeathBurst(player.centerX, player.centerY, 'spikes');
  }

  game.notify(
    `守夜人的灯照到了${LABELS[index]}。两只鬼是一对，一起退回影子记号。`,
    3000,
  );
  respawnSneakPair(game);
}

export function respawnSneakPair(game) {
  const level = game.level;
  const sneak = game.session.sneak;
  const checkpoint = level.checkpoints[sneak.checkpointIndex];

  if (checkpoint) {
    const ground = level.surfaceYAt(checkpoint.x) - PLAYER.HEIGHT;
    game.player.reset(checkpoint.x - 14, ground);
    game.partner.reset(checkpoint.x + 14, ground);
  } else {
    game.player.reset(level.spawn.x, level.spawn.y);
    game.partner.reset(level.spawn2.x, level.spawn2.y);
  }

  for (const player of sneakPlayers(game)) {
    player.exposure = 0;
    player.hidden = false;
    player.seen = false;
    player.standingOn = null;
    player.carrying = null;
  }
  sneak.rope.active = false;
  sneak.rope.reeled = false;
  sneak.rope.length = ROPE.maxLength;
  sneak.rope.warned = false;
  sneak.goalTimer = 0;
  updateSneakCamera(game, 0, true);
}

function updateCheckpoints(game) {
  const sneak = game.session.sneak;
  const checkpoints = game.level.checkpoints;
  for (let index = sneak.checkpointIndex + 1; index < checkpoints.length; index += 1) {
    const checkpoint = checkpoints[index];
    const bothReached = sneakPlayers(game).every(
      (player) => player.centerX >= checkpoint.x,
    );
    if (!bothReached) break;
    sneak.checkpointIndex = index;
    game.audio.checkpoint();
    game.notify(`影子记号 · 两个人都走到了这里（${checkpoint.label}）`, 2200);
  }
}

function updateHints(game) {
  const sneak = game.session.sneak;
  game.level.sneakHints.forEach((hint, index) => {
    if (sneak.hints.has(index)) return;
    const reached = sneakPlayers(game).some((player) => player.centerX >= hint.x);
    if (!reached) return;
    sneak.hints.add(index);
    game.notify(hint.text, hint.duration ?? 3800);
  });
}

function checkHazards(game) {
  const sneak = game.session.sneak;
  if (sneak.caughtCooldown > 0) return;
  for (const player of sneakPlayers(game)) {
    if (!game.level.overlapsHazard(player.bounds)) continue;
    sneak.falls += 1;
    sneak.caughtCooldown = 1.8;
    game.damageFlash = 0.7;
    game.audio.death();
    game.notify('有一只鬼掉进了黑水沟。两只鬼重新牵起手，回到影子记号。', 2800);
    respawnSneakPair(game);
    return;
  }
}

export function updateSneakCamera(game, dt, snap = false) {
  const level = game.level;
  const maxX = Math.max(0, level.pixelWidth - VIEW.WIDTH);
  const maxY = Math.max(0, level.pixelHeight - VIEW.HEIGHT);
  const mid = (game.player.centerX + game.partner.centerX) / 2;
  const avgVx = (game.player.vx + game.partner.vx) / 2;
  const lookAhead = Math.max(-20, Math.min(20, avgVx * 0.16));
  const targetX = Math.max(0, Math.min(maxX, mid - VIEW.WIDTH * 0.5 + lookAhead));
  // 晾糖场、长廊和屋顶比一屏高：镜头要同时框住两个人，
  // 而不是只盯着高的那一个，否则站在低处的同伴会从画面下方掉出去。
  const topY = Math.min(game.player.centerY, game.partner.centerY);
  const bottomY = Math.max(game.player.centerY, game.partner.centerY);
  const targetY = Math.max(
    0,
    Math.min(maxY, (topY + bottomY) / 2 - VIEW.HEIGHT * 0.5 - VIEW.TILE),
  );

  if (snap || dt <= 0) {
    game.camera.x = targetX;
    game.camera.y = targetY;
    return;
  }
  const smoothing = 1 - Math.exp(-dt * 7.5);
  game.camera.x += (targetX - game.camera.x) * smoothing;
  game.camera.y += (targetY - game.camera.y) * smoothing;
  game.camera.x = Math.max(0, Math.min(maxX, game.camera.x));
  game.camera.y = Math.max(0, Math.min(maxY, game.camera.y));
}

function exposureState(player) {
  if (player.hidden && (player.exposure ?? 0) < 0.2) return '影子里';
  if ((player.exposure ?? 0) > 0.82) return '暴露';
  if ((player.exposure ?? 0) > 0.55) return '快躲';
  if ((player.exposure ?? 0) > 0.2) return '被注意';
  return player.crouching ? '潜行' : '安静';
}

export function getSneakHud(game) {
  const sneak = game.session.sneak ?? createSneakState();
  const players = sneakPlayers(game);
  const stackedIndex = players.findIndex((player) => player.standingOn);
  let combo = '';
  if (stackedIndex >= 0) {
    const lowerIndex = 1 - stackedIndex;
    combo = `${LABELS[stackedIndex]} 站在 ${LABELS[lowerIndex]} 头上`;
    if (players[lowerIndex].crouching) combo += ' · 蓄力';
  } else if (sneak.rope?.active) {
    combo = sneak.rope.reeled ? '影子线 · 收线中' : '影子线 · 绷紧';
  }

  return {
    stage: game.level.stage,
    total: SNEAK_ROUTE.totalStages,
    name: sneakStageName(game.level.stage),
    objective: game.level.objective,
    names: LABELS,
    exposures: players.map((player) => Math.max(0, Math.min(1, player.exposure ?? 0))),
    states: players.map(exposureState),
    crouching: players.map((player) => player.crouching),
    combo,
    ropeActive: Boolean(sneak.rope?.active),
    spotted: sneak.spotted,
    falls: sneak.falls,
    checkpoint:
      sneak.checkpointIndex < 0
        ? '起点'
        : `${sneak.checkpointIndex + 1}/${game.level.checkpoints.length}`,
  };
}

export function getSneakCompletion(game) {
  const sneak = game.session.sneak ?? createSneakState();
  return {
    spotted: sneak.spotted,
    falls: sneak.falls,
    stages: SNEAK_ROUTE.totalStages,
  };
}

/** 让「R 重来」只退回这一段开始时的被发现 / 失足次数，而不是整条赛道清零。 */
export function rewindSneakStageScore(game) {
  const sneak = game.session.sneak;
  if (!sneak) return;
  sneak.spotted = sneak.stageStartSpotted ?? sneak.spotted;
  sneak.falls = sneak.stageStartFalls ?? sneak.falls;
}
