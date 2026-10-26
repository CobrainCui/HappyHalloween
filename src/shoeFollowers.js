/**
 * 身后的皮鞋。
 *
 * 给老师送南瓜派每走过一段，那一段的人就只剩下一双鞋跟在后面。
 * 它们不是同伴，也不说话：只是沿着玩家刚走过的那条路，保持固定的距离跟着。
 * 第四段走完时，completeRun 会用 setStage(totalStages + 1) 让周叔那双也跟上来，
 * 四双鞋一起停在老师的碑前。
 *
 * 「前进速度相同」是这套系统的底线：所有鞋都取样同一条足迹链上的点，
 * 排在前面的不会超过去，排在后面的也掉不了队。性格只写在落脚的方式里——
 *   小满：走两步停半拍，像还在数台阶，停的时候往后撤半步再跟上来；
 *   阿岚：跟着呼吸起伏，偶尔屏住一口气，两只鞋一起停住再跟上；
 *   阿遥：总有一只鞋侧着，像在听另一双；偶尔身后会多出一层很淡的复影；
 *   周叔：每一步都沉一点，像脚下还带着水，偶尔拖半步再跟上来。
 *
 * 玩家跳跃、掉坑、读档、穿门都会让足迹断开：距离突然拉大时，鞋群直接
 * 落在角色身后重新排好，不会隔着半张地图追过来。角色站住不动时，身后的
 * 足迹会压回地面，鞋群也收住脚步、顺着落速落到脚下，不会挂在跳跃弧线的中间。
 */

import { MEMORIAL_CHAPTERS } from './memorial.js';

// 足迹链的采样间隔与最大保留距离（像素）。
const SAMPLE_GAP = 2.5;
const BASE_LAG = 24;
const PAIR_GAP = 21;
const STEP_RATE = 0.55;
const TELEPORT_DISTANCE = 56;
const FALL_SPEED = 280;

/**
 * 每位病人留下的鞋，都有自己的落脚习惯。
 * key 是段号；line 只在它第一次跟上来时说一次。
 */
const MANNERS = {
  1: {
    id: 'measure',
    line: '它走两步，停半拍，像还在数台阶。',
  },
  2: {
    id: 'breathe',
    line: '它偶尔屏住一口气，再轻轻跟上来。',
  },
  3: {
    id: 'listen',
    line: '它总侧着一点，像在听另一双。',
  },
  4: {
    id: 'weight',
    line: '它每一步都沉一点，像脚下还带着水。',
  },
};

function lerpPoint(from, to, t, facingFrom, facingTo) {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    facing: t < 0.5 ? facingFrom : facingTo,
  };
}

/** 从鞋当前的高度往下找第一块能站的地面；找不到就返回 null。 */
function groundBelow(level, x, y) {
  if (!level?.isSolid) return null;
  const tile = level.tileSize ?? 16;
  const col = Math.max(0, Math.min(level.width - 1, Math.floor(x / tile)));
  const startRow = Math.max(0, Math.floor((y + 1) / tile));
  for (let row = startRow; row < level.height; row += 1) {
    if (level.isSolid(col, row)) return row * tile;
  }
  return null;
}

export class ShoeFollowers {
  constructor() {
    this.pairs = [];
    this.trail = [];
    this.head = { x: 0, y: 0, facing: 1 };
    this.carry = 0;
    this.time = 0;
    this.idleTime = 0;
    this.trailGrounded = false;
  }

  /** 按当前走到了第几段，重新排出已经在身后的鞋。 */
  setStage(stage) {
    this.pairs = MEMORIAL_CHAPTERS.filter((chapter) => chapter.stage < stage).map(
      (chapter, index) => ({
        stage: chapter.stage,
        name: chapter.patient,
        accent: chapter.accent ?? '#c6b3e0',
        manner: MANNERS[chapter.stage] ?? MANNERS[1],
        x: 0,
        y: 0,
        facing: 1,
        lastX: null,
        lastY: null,
        stepPhase: index * 1.9 + 0.7,
        seed: chapter.stage * 2.7 + index * 1.3,
      }),
    );
    this.trail = [];
    this.carry = 0;
  }

  /** 把足迹链重新铺在角色身后，鞋群从这一刻重新排队。 */
  resetAt(x, y, facing = 1) {
    this.head = { x, y, facing };
    this.carry = 0;
    this.idleTime = 0;
    this.trailGrounded = false;
    this.trail = [];
    const reach = this.trailReach();
    for (let distance = 0; distance <= reach; distance += SAMPLE_GAP) {
      this.trail.push({
        x: x - facing * distance,
        y,
        facing,
        dist: distance,
      });
    }
    for (const pair of this.pairs) {
      pair.lastX = null;
      pair.lastY = null;
      pair.moving = false;
    }
    this.place(0);
  }

  /** 最远的那双鞋要走到多远，再留一点余量给插值。 */
  trailReach() {
    return BASE_LAG + PAIR_GAP * Math.max(0, this.pairs.length - 1) + 12;
  }

  /**
   * 每帧跟着主角采样一次足迹。
   * @param {number} dt
   * @param {{centerX:number, feetY:number, facing:number, vx:number, onGround:boolean}} player
   * @param {object} [level] 用来在角色停下时把鞋落到地面
   */
  update(dt, player, level = null) {
    this.time += dt;
    if (!player) return;

    const x = player.centerX;
    const y = player.feetY;
    const facing = player.facing || 1;
    // 角色站住不动时，鞋群也别停在半空：落到脚下的地面，脚步也收住。
    const idle = Boolean(player.onGround) && Math.abs(player.vx ?? 0) < 6;
    this.idleTime = idle ? this.idleTime + dt : 0;
    if (!idle) this.trailGrounded = false;

    if (!this.trail.length || !Number.isFinite(this.head.x)) {
      this.resetAt(x, y, facing);
      return;
    }

    const moved = Math.hypot(x - this.head.x, y - this.head.y);
    // 重生、读档、穿门都会把角色整个挪走：不让鞋群隔着半张地图追。
    if (moved > TELEPORT_DISTANCE) {
      this.resetAt(x, y, facing);
      return;
    }

    // 只把横向路程记进足迹链：原地跳一下不该让身后的鞋挤到脚边。
    // 纵向的位置仍然记在采样点上，所以跳过缺口时鞋群会沿着同一条弧线过去。
    const horizontal = Math.abs(x - this.head.x);

    this.head.x = x;
    this.head.y = y;
    this.head.facing = facing;
    this.carry += horizontal;

    if (this.carry >= SAMPLE_GAP) {
      const step = this.carry;
      for (const point of this.trail) point.dist += step;
      this.trail.unshift({ x, y, facing, dist: 0 });
      this.carry = 0;

      const reach = this.trailReach() + 8;
      while (this.trail.length > 4 && this.trail[this.trail.length - 1].dist > reach) {
        this.trail.pop();
      }
    }

    // 停下超过一小会儿：把身后这段足迹链压回地面，鞋就不会挂在跳跃弧线的中间。
    if (level && this.idleTime > 0.12 && !this.trailGrounded) {
      this.groundTrail(level);
      this.trailGrounded = true;
    }

    this.place(dt);
  }

  /** 把身后的足迹点压到各自脚下的地面；没有地面的点保留原高度。 */
  groundTrail(level) {
    const reach = this.trailReach() + 8;
    for (const point of this.trail) {
      if (point.dist > reach) continue;
      const ground = groundBelow(level, point.x, point.y);
      if (ground != null) point.y = ground;
    }
  }

  /** 把每双鞋放到足迹链上固定的距离处；下落时按落速收，不会吊在半空。 */
  place(dt = 0) {
    this.pairs.forEach((pair, index) => {
      const target = this.sampleAt(BASE_LAG + PAIR_GAP * index);
      if (!target) return;

      const horizontalMoved = pair.lastX == null ? 0 : Math.abs(target.x - pair.lastX);
      // 只有横向在动才迈步；原地落下或站着时把脚步收住。
      pair.moving = horizontalMoved > 0.05;
      if (pair.moving) pair.stepPhase += horizontalMoved * STEP_RATE;

      // 目标在脚下就按落速落下去；目标在头上（跳上台阶）则直接跟上。
      if (dt > 0 && target.y > pair.y + 0.05) {
        pair.y = Math.min(target.y, pair.y + FALL_SPEED * dt);
      } else {
        pair.y = target.y;
      }
      pair.x = target.x;
      pair.facing = target.facing;
      pair.lastX = target.x;
      pair.lastY = target.y;
    });
  }

  /**
   * 在足迹链上取距主角 `distance` 像素的一点。
   * 最新的一段（还没满 SAMPLE_GAP 的部分）也参与插值，所以走动是连续的。
   */
  sampleAt(distance) {
    if (!this.trail.length) return null;
    const head = this.head;
    const first = this.trail[0];

    if (distance <= this.carry) {
      const t = this.carry > 0.001 ? Math.max(0, distance) / this.carry : 0;
      return lerpPoint(head, first, t, head.facing, first.facing);
    }

    let previous = first;
    let previousDistance = this.carry;
    for (let index = 1; index < this.trail.length; index += 1) {
      const point = this.trail[index];
      const pointDistance = this.carry + point.dist;
      if (pointDistance >= distance) {
        const span = pointDistance - previousDistance;
        const t = span > 0.001 ? (distance - previousDistance) / span : 1;
        return lerpPoint(previous, point, t, previous.facing, point.facing);
      }
      previous = point;
      previousDistance = pointDistance;
    }

    return { x: previous.x, y: previous.y, facing: previous.facing };
  }

  getNames() {
    return this.pairs.map((pair) => pair.name);
  }
}

/** 画一只皮鞋。路上跟着的鞋和结尾碑前那几双都画成 8 格宽；默认 6 格留给更小的场合。 */
export function paintShoe(ctx, x, y, facing, accent, alpha, width = 6) {
  const height = width >= 8 ? 5 : 4;
  // 鞋底
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#0d080b';
  ctx.fillRect(x, y - 1, width, 1);
  // 鞋面
  ctx.fillStyle = '#35221b';
  ctx.fillRect(x, y - height, width, height - 1);
  // 鞋口的一线旧皮
  ctx.fillStyle = '#5d3c2b';
  ctx.fillRect(x + 1, y - height, width - 2, 1);
  // 鞋头反光：朝向哪边，亮哪一头
  ctx.globalAlpha = alpha * 0.85;
  ctx.fillStyle = accent;
  const toeWidth = width >= 8 ? 2 : 1;
  ctx.fillRect(
    facing > 0 ? x + width - toeWidth : x,
    y - height,
    toeWidth,
    height - 2,
  );
  // 鞋带的一点浅色
  ctx.globalAlpha = alpha * 0.4;
  ctx.fillRect(x + 2, y - height + 1, width - 4, 1);
  // 后跟一点点磨旧的浅色
  ctx.globalAlpha = alpha * 0.34;
  ctx.fillStyle = '#9a7150';
  ctx.fillRect(facing > 0 ? x : x + width - 1, y - 1, 1, 1);
  ctx.globalAlpha = alpha;
}

function drawPair(ctx, pair, sx, sy, time) {
  const accent = pair.accent;
  const manner = pair.manner?.id ?? 'measure';
  const facing = pair.facing >= 0 ? 1 : -1;
  const swing = Math.sin(pair.stepPhase);

  const stride = pair.moving ? Math.round(swing * 2.5) : 0;
  let front = stride * facing;
  let shiftX = 0;
  let bob = 0;
  let echo = 0;
  let liftLeft = stride > 0;
  let liftRight = stride < 0;

  if (manner === 'measure') {
    // 小满：走两步就停半拍，像还在数台阶；停的时候往后撤半步，再跟上来。
    const checking = Math.sin(pair.stepPhase * 0.31 + pair.seed) > 0.86;
    if (checking) {
      front = 0;
      shiftX = -facing * 4;
      liftLeft = false;
      liftRight = false;
    }
  } else if (manner === 'breathe') {
    // 阿岚：跟着呼吸轻轻起伏，偶尔屏住一口气，两只鞋一起停住。
    bob = Math.sin(time * 1.15 + pair.seed) > 0.55 ? -1 : 0;
    const holding = Math.sin(time * 0.5 + pair.seed) > 0.965;
    if (holding) {
      front = 0;
      shiftX = 0;
      echo = 0.16;
      liftLeft = false;
      liftRight = false;
    }
  } else if (manner === 'listen') {
    // 阿遥：总有一只鞋侧着，像在听另一双；身后偶尔多出一层很淡的复影。
    shiftX = Math.round(Math.sin(time * 0.85 + pair.seed) * 2);
    echo = Math.sin(time * 0.45 + pair.seed) > 0.4 ? 0.1 : 0;
  } else if (manner === 'weight') {
    // 周叔：每一步都沉一点，像脚下还带着水；偶尔拖着半步再跟上来。
    bob = Math.sin(pair.stepPhase * 0.6 + pair.seed) > 0.45 ? 1 : 0;
    const dragging = Math.sin(pair.stepPhase * 0.23 + pair.seed) > 0.88;
    if (dragging) {
      front = facing;
      shiftX = 0;
      liftLeft = false;
      liftRight = false;
    }
  }

  // 角色停住时，鞋也把脚步收干净：不迈步、不横挪、不悬着。
  if (!pair.moving) {
    front = 0;
    shiftX = 0;
    bob = 0;
    liftLeft = false;
    liftRight = false;
  }

  const groundY = sy;
  const bodyY = sy + bob;
  const centerX = sx + shiftX;

  // 很淡的一圈记忆色，让鞋在夜里不至于只剩两个黑点。
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = accent;
  ctx.fillRect(centerX - 11, bodyY - 10, 22, 11);
  ctx.globalAlpha = 0.07;
  ctx.fillRect(centerX - 9, bodyY - 8, 18, 9);

  // 鞋底下一层很淡的记忆色，让它在暗地上也能被看见。
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = accent;
  ctx.fillRect(centerX - 9, groundY, 18, 1);

  // 脚下很淡的影子：鞋还在走，穿鞋的人已经不在了。
  ctx.globalAlpha = 0.17;
  ctx.fillStyle = '#0a0910';
  ctx.fillRect(centerX - 9, groundY - 1, 18, 2);
  ctx.globalAlpha = 1;

  // 阿遥身后的复影：只是第二层几乎看不见的鞋。
  if (echo > 0) {
    ctx.globalAlpha = echo;
    ctx.fillStyle = accent;
    ctx.fillRect(centerX - 8 - facing * 4, bodyY - 5, 8, 3);
    ctx.fillRect(centerX + 1 - facing * 4, bodyY - 5, 8, 3);
    ctx.globalAlpha = 1;
  }

  const leftX = centerX - 8 + front;
  const rightX = centerX + 1 - front;
  // 迈出去的那只鞋抬起一像素，脚步才像一步而不是滑过去。
  paintShoe(ctx, leftX, bodyY + (liftLeft ? -1 : 0), facing, accent, 0.92, 8);
  paintShoe(ctx, rightX, bodyY + (liftRight ? -1 : 0), facing, accent, 0.92, 8);

  // 一点往上飘的记忆火星：只有鞋，没有身体。
  const wisp = (time * 0.9 + pair.seed * 0.37) % 1;
  ctx.globalAlpha = (1 - wisp) * 0.3;
  ctx.fillStyle = accent;
  ctx.fillRect(
    centerX + Math.round(Math.sin((time + pair.seed) * 1.7)),
    Math.round(bodyY - 7 - wisp * 9),
    1,
    1,
  );
  ctx.globalAlpha = 1;
}

/** 在角色之前绘制，鞋群看起来走在人身后。 */
export function drawShoeFollowers(renderer, game, time, cameraX, cameraY) {
  const pairs = game.shoeFollowers?.pairs ?? [];
  if (!pairs.length || game.session?.carriageRiding) return;

  const ctx = renderer.ctx;
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  // 从最远的一双画起，近的那双压在前面。
  for (let index = pairs.length - 1; index >= 0; index -= 1) {
    const pair = pairs[index];
    if (!Number.isFinite(pair.x) || !Number.isFinite(pair.y)) continue;
    const sx = Math.round(pair.x - cameraX);
    const sy = Math.round(pair.y - cameraY);
    if (sx < -16 || sx > width + 16 || sy < -16 || sy > height + 16) continue;
    drawPair(ctx, pair, sx, sy, time);
  }
}
