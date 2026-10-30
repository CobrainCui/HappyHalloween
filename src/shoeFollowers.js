/**
 * 身后的皮鞋。
 *
 * 给老师送南瓜派每走过一段，那一段的人就只剩下一双鞋跟在后面。
 * 它们不是同伴，也不说话：只是沿着玩家刚走过的那条路，保持固定的距离跟着。
 * 第四段走完时，completeRun 会用 setStage(totalStages + 1) 让 Pulse 那双也跟上来，
 * 四双鞋一起停在老师的碑前。
 *
 * 四双鞋不只是颜色不同：Sybil 留下的是系带皮鞋，Kurt 是阿尔卑斯山间的登山靴，
 * 冯桃是一双旧帆布鞋，Pulse 是观测台门口那双旧雨靴。轮廓、鞋底和鞋口的画法都不同，
 * 两只靴子的筒比皮鞋、帆布鞋高出一截，排成一队时一眼能分出是谁的。
 *
 * 「前进速度相同」是这套系统的底线：所有鞋都取样同一条足迹链上的点，
 * 排在前面的不会超过去，排在后面的也掉不了队。性格只写在落脚的方式里——
 *   Sybil：走几步就停下，像在确认什么，随后往后退半步再跟上来；
 *   Kurt：跟着呼吸起伏，偶尔屏住一口气，两只鞋一起停住再跟上；
 *   冯桃：总有一只鞋侧着，像在看着另一个自己；身后偶尔会多出一层很淡的复影；
 *   Pulse：每一步都沉一点，像整夜没睡，偶尔拖半步再跟上来。
 * 跟得慢一点：每走一像素只推进一点迈步相位，落脚才沉得住，不会像小跑。
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
// 每走一像素，鞋的迈步相位前进多少。跟得越慢，迈步越沉，别像小跑。
const STEP_RATE = 0.28;
const TELEPORT_DISTANCE = 56;
const FALL_SPEED = 280;

/**
 * 每位病人留下的鞋：样子（shoe）和落脚习惯（id）都不一样。
 * key 是段号；line 只在它第一次跟上来时说一次。
 */
const MANNERS = {
  1: {
    id: 'check',
    shoe: 'oxford',
    line: '它走几步就停下，像在确认什么。',
  },
  2: {
    id: 'breathe',
    shoe: 'hiking',
    line: '它偶尔屏住一口气，再轻轻跟上来。',
  },
  3: {
    id: 'listen',
    shoe: 'canvas',
    line: '它总侧着一点，像在看着另一个你走。',
  },
  4: {
    id: 'weight',
    shoe: 'rainboot',
    line: '它每一步都沉一点，像整夜没睡。',
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
      (chapter, index) => {
        const manner = MANNERS[chapter.stage] ?? MANNERS[1];
        const shoe = SHOE_STYLES[manner.shoe] ?? SHOE_STYLES.oxford;
        return {
          stage: chapter.stage,
          name: chapter.patient,
          accent: chapter.accent ?? '#c6b3e0',
          manner,
          shoe: shoe.id,
          shoeName: shoe.name,
          x: 0,
          y: 0,
          facing: 1,
          lastX: null,
          lastY: null,
          stepPhase: index * 1.9 + 0.7,
          seed: chapter.stage * 2.7 + index * 1.3,
        };
      },
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

/**
 * 鞋的像素画。
 *
 * 八像素宽的鞋，要让人认得出「这是一只鞋」，靠的只有两件事：
 * 轮廓前低后高（鞋跟那头立着、鞋尖那头塌下去），以及鞋底比鞋面多探出去一点。
 * 所以每只鞋都先按「后跟在左、鞋尖朝右」画一遍，再由 paintShoe 按朝向整体镜像；
 * 靴子把后跟那条竖线一路拔高成筒，皮鞋和帆布鞋只留矮矮的一级。
 * dy 为负是往上，y = 0 是地面，x = 0 是后跟。
 */
function shoeBrush(ctx, alpha) {
  return (color, light, dx, dy, dw, dh) => {
    if (dw <= 0 || dh <= 0) return;
    ctx.globalAlpha = alpha * light;
    ctx.fillStyle = color;
    ctx.fillRect(dx, dy, dw, dh);
  };
}

/** 系带皮鞋：低帮、后跟一级一级抬起来，鞋尖只有薄薄一层。Sybil 的那双，也是玩家自己脚上那种。 */
function drawOxford(ctx, w, accent, alpha) {
  const fill = shoeBrush(ctx, alpha);
  const heel = Math.max(2, w - 5);
  fill('#0d080b', 1, 0, -1, w, 1); // 鞋底，一直铺到鞋尖
  fill('#35221b', 1, 0, -2, w, 1); // 鞋身：鞋尖那头只剩这一层
  fill('#35221b', 1, 0, -3, w - 3, 1); // 鞋面往后跟抬起来
  fill('#433026', 1, 0, -4, heel, 1); // 后跟的鞋帮
  fill('#5d3c2b', 1, 0, -4, Math.max(1, heel - 1), 1); // 鞋口一线旧皮
  fill('#8a6a4c', 0.4, 2, -3, Math.max(1, w - 5), 1); // 鞋带
  fill(accent, 0.85, w - 2, -2, 1, 1); // 鞋尖擦亮的一点
  fill('#9a7150', 0.34, 0, -1, 1, 1); // 后跟磨旧
  fill('#9a7150', 0.34, 0, -2, 1, 1);
}

/**
 * 登山靴：后背一条直线立起来，鞋头伸出去的靴形，筒口一道护踝、两粒鞋带扣、齿底。
 * Kurt 在阿尔卑斯山间穿的那种。
 */
function drawHikingBoot(ctx, w, accent, alpha) {
  const fill = shoeBrush(ctx, alpha);
  const shaft = Math.max(2, w - 5); // 筒身宽度，和后跟齐平
  const top = 8; // 靴口高度
  fill('#1d1a15', 1, 0, -1, w, 1); // 齿底
  for (let x = 0; x < w; x += 2) fill('#0d080b', 1, x, -1, 1, 1); // 齿
  fill('#3d3327', 1, 0, -2, w, 1); // 鞋头
  fill('#3d3327', 1, 0, -3, w - 2, 1); // 脚背
  fill('#2a221b', 1, 0, -4, w - 3, 1); // 脚踝，比筒身宽出来一点
  fill('#2a221b', 1, 0, -5, shaft + 1, 1); // 筒身往下收进脚踝
  fill('#3d3327', 1, 0, -top, shaft, top - 5); // 靴筒，后背一条直线
  fill('#6f5a41', 1, 0, -top, shaft, 1); // 靴口
  fill('#bba985', 0.55, shaft - 1, -top + 1, 1, 1); // 鞋带扣
  fill('#bba985', 0.45, shaft - 1, -top + 3, 1, 1);
  fill('#7d6247', 0.85, w - 3, -3, 2, 1); // 鞋头的包皮
  fill(accent, 0.8, w - 2, -2, 1, 1); // 鞋头反光
}

/** 帆布鞋：矮帮、白橡胶底和包住鞋尖的一圈白边、后跟一块记忆色的贴片。冯桃的那双。 */
function drawCanvas(ctx, w, accent, alpha) {
  const fill = shoeBrush(ctx, alpha);
  const collar = Math.max(2, w - 6);
  fill('#cfc7b4', 1, 0, -1, w, 1); // 白橡胶底
  fill('#dcd5c2', 1, w - 1, -2, 1, 2); // 鞋尖一圈白边，只包住最前面那一列
  fill('#3d4048', 1, 0, -2, w - 1, 1); // 帆布鞋面
  fill('#3d4048', 1, 0, -3, w - 2, 1);
  fill('#4a4e58', 1, 0, -4, collar, 1); // 鞋口
  fill('#efe9da', 0.5, 2, -3, Math.max(1, w - 6), 1); // 鞋带
  fill(accent, 0.75, 0, -3, 2, 1); // 后跟的贴片
}

/** 雨靴：筒口往外翻、后背一条直线、厚底。Pulse 那双在观测台门口站了一整夜。 */
function drawRainBoot(ctx, w, accent, alpha) {
  const fill = shoeBrush(ctx, alpha);
  const shaft = Math.max(2, w - 4); // 筒身宽度
  const top = 8; // 靴口高度
  fill('#101010', 1, 0, -1, w, 1); // 厚底
  fill('#20282a', 1, 0, -2, w, 1); // 底边
  fill('#2c3a35', 1, 0, -3, w - 1, 1); // 鞋头
  fill('#37463f', 1, 0, -4, w - 2, 1); // 脚背，和筒身分开一点
  fill('#2c3a35', 1, 0, -top + 1, shaft, top - 4); // 靴筒，后背和后跟连成一条直线
  fill('#54695f', 1, 0, -top + 1, shaft, 1); // 靴口
  fill('#54695f', 1, 0, -top, shaft + 1, 1); // 筒口往外翻出来的一圈
  fill('#6d8477', 0.45, 0, -top + 2, 1, top - 6); // 筒口的一线亮
  fill(accent, 0.8, w - 2, -3, 1, 1); // 鞋头反光
  fill('#43544a', 0.6, 0, -2, 1, 1); // 跟上的一点水光
}

/** 鞋的样式表：id 写进每双鞋，画法各自不同，height 是鞋口到地面的高度。 */
export const SHOE_STYLES = {
  oxford: { id: 'oxford', name: '皮鞋', height: 4, draw: drawOxford },
  hiking: { id: 'hiking', name: '登山靴', height: 8, draw: drawHikingBoot },
  canvas: { id: 'canvas', name: '帆布鞋', height: 4, draw: drawCanvas },
  rainboot: { id: 'rainboot', name: '雨靴', height: 8, draw: drawRainBoot },
};

/** 这一段的那位留下的鞋是什么样式。 */
export function shoeStyleForStage(stage) {
  return MANNERS[stage]?.shoe ?? SHOE_STYLES.oxford.id;
}

/**
 * 走完某一段时报给界面的那双鞋：谁的、什么样子、走起来什么样。
 * 只取这一段本来就有的事实，卡片上的字由 main.js 排版。
 */
export function shoeRewardFor(stage) {
  const chapter = MEMORIAL_CHAPTERS.find((item) => item.stage === stage);
  if (!chapter) return null;
  const manner = MANNERS[stage] ?? MANNERS[1];
  const shoe = SHOE_STYLES[manner.shoe] ?? SHOE_STYLES.oxford;
  return {
    stage,
    stageLabel: chapter.stageLabel,
    patient: chapter.patient,
    accent: chapter.accent ?? '#c6b3e0',
    shoe: shoe.id,
    shoeName: shoe.name,
    line: manner.line,
    // 开篇的人物小传：有就压在卡片上，没有就退回这一双鞋的落脚习惯。
    bio: chapter.bio ?? null,
    bioEn: chapter.bioEn ?? null,
    // 后两段没有单独的小传：背包里的详情退到这一段的开场白。
    intro: chapter.intro ?? null,
    // 通关后由这一段的病人留给主角的话。
    blessing: chapter.blessing ?? null,
  };
}

/** 某一种鞋从地面到鞋口有多高：鞋底下的微光、飘起来的火星要让它一让。 */
export function shoeHeight(style) {
  return (SHOE_STYLES[style] ?? SHOE_STYLES.oxford).height;
}

/**
 * 画一只鞋。路上跟着的鞋和结尾碑前那几双都画成 8 格宽；默认 6 格留给更小的场合。
 * 鞋尖朝 facing 那一头；朝左时整只鞋镜像，而不只是翻一下高光——
 * 轮廓是前低后高的，只翻高光会露馅。
 */
export function paintShoe(ctx, x, y, facing, accent, alpha, width = 6, style = 'oxford') {
  const spec = SHOE_STYLES[style] ?? SHOE_STYLES.oxford;
  const w = Math.max(5, Math.round(width));
  const dir = facing >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(Math.round(x) + (dir > 0 ? 0 : w), Math.round(y));
  ctx.scale(dir, 1);
  spec.draw(ctx, w, accent, alpha);
  ctx.restore();
  ctx.globalAlpha = 1;
}

/**
 * 拿到一双鞋的那张卡片里画的一双：和路上跟着的同一套画法，
 * 只是并排摆好给你看清楚。调用方自己 ctx.scale 放大，这里按逻辑像素摆。
 * 两只鞋的横向位置和 drawPair 里一致（后跟相隔一格，共 17 格宽）。
 */
export function paintShoePair(
  ctx,
  { style = 'oxford', accent = '#c6b3e0', centerX = 0, groundY = 0, alpha = 1 } = {},
) {
  const top = shoeHeight(style);
  // 先铺一层很淡的记忆色，再压一道脚下的影子——和路上那双一样，
  // 不然黑鞋在暗底板上只剩一坨看不出轮廓的东西。
  const glow = ctx.createRadialGradient(
    centerX,
    groundY - top * 0.6,
    1,
    centerX,
    groundY - top * 0.6,
    13,
  );
  glow.addColorStop(0, accent);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalAlpha = 0.24 * alpha;
  ctx.fillStyle = glow;
  ctx.fillRect(centerX - 14, groundY - 17, 28, 23);
  ctx.globalAlpha = 0.16 * alpha;
  ctx.fillStyle = accent;
  ctx.fillRect(centerX - 9, groundY, 18, 1);
  ctx.globalAlpha = 0.24 * alpha;
  ctx.fillStyle = '#0a0910';
  ctx.fillRect(centerX - 9, groundY - 1, 18, 2);
  ctx.globalAlpha = 1;

  paintShoe(ctx, centerX - 8, groundY, 1, accent, 0.78 * alpha, 8, style);
  paintShoe(ctx, centerX + 1, groundY, 1, accent, 0.95 * alpha, 8, style);
}

function drawPair(ctx, pair, sx, sy, time) {
  const accent = pair.accent;
  const manner = pair.manner?.id ?? 'check';
  const facing = pair.facing >= 0 ? 1 : -1;
  const swing = Math.sin(pair.stepPhase);

  const stride = pair.moving ? Math.round(swing * 2.5) : 0;
  let front = stride * facing;
  let shiftX = 0;
  let bob = 0;
  let echo = 0;
  let liftLeft = stride > 0;
  let liftRight = stride < 0;

  if (manner === 'check') {
    // Sybil：走几步就停下来，像在确认什么；停的时候往后退半步，再跟上来。
    const checking = Math.sin(pair.stepPhase * 0.31 + pair.seed) > 0.86;
    if (checking) {
      front = 0;
      shiftX = -facing * 4;
      liftLeft = false;
      liftRight = false;
    }
  } else if (manner === 'breathe') {
    // Kurt：跟着呼吸轻轻起伏，偶尔屏住一口气，两只鞋一起停住。
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
    // 冯桃：总有一只鞋侧着，像在看着另一个自己；身后偶尔多出一层很淡的复影。
    shiftX = Math.round(Math.sin(time * 0.85 + pair.seed) * 2);
    echo = Math.sin(time * 0.45 + pair.seed) > 0.4 ? 0.1 : 0;
  } else if (manner === 'weight') {
    // Pulse：每一步都沉一点，像整夜没睡；偶尔拖着半步再跟上来。
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
  // 靴子比皮鞋高出一截：影子上的那圈微光、飘起来的火星都要跟着让一让。
  const top = shoeHeight(pair.shoe);

  // 很淡的一圈记忆色，让鞋在夜里不至于只剩两个黑点。
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = accent;
  ctx.fillRect(centerX - 11, bodyY - top - 3, 22, top + 4);
  ctx.globalAlpha = 0.07;
  ctx.fillRect(centerX - 9, bodyY - top - 1, 18, top + 2);

  // 鞋底下一层很淡的记忆色，让它在暗地上也能被看见。
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = accent;
  ctx.fillRect(centerX - 9, groundY, 18, 1);

  // 脚下很淡的影子：鞋还在走，穿鞋的人已经不在了。
  ctx.globalAlpha = 0.17;
  ctx.fillStyle = '#0a0910';
  ctx.fillRect(centerX - 9, groundY - 1, 18, 2);
  ctx.globalAlpha = 1;

  // 冯桃身后的复影：只是第二层几乎看不见的鞋。
  if (echo > 0) {
    const echoY = bodyY - Math.round(top * 0.6);
    ctx.globalAlpha = echo;
    ctx.fillStyle = accent;
    ctx.fillRect(centerX - 8 - facing * 4, echoY, 8, 3);
    ctx.fillRect(centerX + 1 - facing * 4, echoY, 8, 3);
    ctx.globalAlpha = 1;
  }

  const leftX = centerX - 8 + front;
  const rightX = centerX + 1 - front;
  // 靠后画的那只压暗一点，一双鞋才有前后，不像两块并排的木头。
  // 迈出去的那只鞋抬起一像素，脚步才像一步而不是滑过去。
  paintShoe(ctx, leftX, bodyY + (liftLeft ? -1 : 0), facing, accent, 0.78, 8, pair.shoe);
  paintShoe(ctx, rightX, bodyY + (liftRight ? -1 : 0), facing, accent, 0.95, 8, pair.shoe);

  // 一点往上飘的记忆火星：只有鞋，没有身体。
  const wisp = (time * 0.9 + pair.seed * 0.37) % 1;
  ctx.globalAlpha = (1 - wisp) * 0.3;
  ctx.fillStyle = accent;
  ctx.fillRect(
    centerX + Math.round(Math.sin((time + pair.seed) * 1.7)),
    Math.round(bodyY - top - 2 - wisp * 9),
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
