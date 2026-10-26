/**
 * 把 sneak.js 里第三段的赛道数据变成 Level 能读的地图。
 *
 * 这一段属于「给老师送南瓜派」，所以不再单独成图：
 * Level 的 buildMemorialSneak() 调它，再把病人记忆和追思路线的外壳接上。
 */
import { PLAYER } from './config.js';
import { SNEAK_STAGES } from './sneak.js';

const T = 16;
// 前两段是一屏高的后院；后面的晾糖场、画像长廊和屋顶会用更高的地图，
// 让镜头真的往上走（高度、地面行由每一段的 spec 决定）。
const DEFAULT_HEIGHT = 18;
const DEFAULT_GROUND_ROW = 16;

function makeGrid(width, height) {
  return Array.from({ length: height }, () => Array(width).fill('.'));
}

function paint(rows, x, y, width, height, tile) {
  for (let row = y; row < y + height; row += 1) {
    for (let col = x; col < x + width; col += 1) {
      if (rows[row]?.[col] !== undefined) rows[row][col] = tile;
    }
  }
}

function surfaceAt(rows, width, height, tileX) {
  const col = Math.max(0, Math.min(width - 1, tileX));
  for (let row = 0; row < height; row += 1) {
    const tile = rows[row][col];
    if (tile === '#' || tile === 'B' || tile === 'G' || tile === 'S') return row * T;
  }
  return height * T;
}

function makeCheckpoint(x, y, label) {
  return { x, y, label };
}

function addScenery(decorations, spec, groundAt) {
  for (const tileX of spec.trees ?? []) {
    decorations.push({
      type: 'tree',
      x: tileX * T,
      y: groundAt(tileX),
      scale: 0.76 + (tileX % 5) * 0.06,
      layer: 'back',
    });
  }
  for (const tileX of spec.graves ?? []) {
    decorations.push({
      type: 'grave',
      x: tileX * T,
      y: groundAt(tileX),
      variant: tileX % 3,
      layer: 'back',
    });
  }
  for (const tileX of spec.lamps ?? []) {
    decorations.push({
      type: 'lamp',
      x: tileX * T,
      y: groundAt(tileX),
      layer: 'front',
    });
  }
  for (const tileX of spec.pumpkins ?? []) {
    decorations.push({
      type: 'pumpkin',
      x: tileX * T,
      y: groundAt(tileX),
      variant: tileX % 3,
      layer: 'front',
    });
  }
  for (const tileX of spec.skullPiles ?? []) {
    decorations.push({
      type: 'skullPile',
      x: tileX * T,
      y: groundAt(tileX),
      layer: 'front',
    });
  }
  for (const [tileX, length] of spec.fences ?? []) {
    decorations.push({
      type: 'fence',
      x: tileX * T,
      y: groundAt(tileX),
      length,
      layer: 'front',
    });
  }
  decorations.push({
    type: 'sign',
    x: 2 * T,
    y: groundAt(2),
    variant: 0,
    layer: 'front',
  });
}

/** 地面段之间没铺地面的地方，就是黑水沟。 */
function makeGapHazards(spec, groundRow) {
  const spans = [...(spec.ground ?? [])].sort((a, b) => a[0] - b[0]);
  const hazards = [];
  for (let index = 0; index < spans.length - 1; index += 1) {
    const end = spans[index][1];
    const nextStart = spans[index + 1][0];
    if (nextStart <= end) continue;
    hazards.push({
      type: 'void',
      x: end * T,
      y: groundRow * T + 16,
      w: (nextStart - end) * T,
      h: 200,
      killY: groundRow * T + 16,
    });
  }
  return hazards;
}

export function buildSneakData(stage) {
  const entry = SNEAK_STAGES[stage - 1];
  if (!entry) throw new Error(`No sneak stage ${stage}`);
  const spec = entry.spec;
  const width = spec.width;
  const height = spec.height ?? DEFAULT_HEIGHT;
  const groundRow = spec.groundRow ?? DEFAULT_GROUND_ROW;
  const rows = makeGrid(width, height);

  for (const [start, end] of spec.ground ?? [[0, width]]) {
    paint(rows, start, groundRow, end - start, Math.max(1, height - groundRow), '#');
  }
  for (const [x, y, w, h] of spec.blocks ?? []) paint(rows, x, y, w, h ?? 1, 'B');
  for (const [x, y, w] of spec.planks ?? []) paint(rows, x, y, w, 1, 'P');

  const groundAt = (tileX) => surfaceAt(rows, width, height, tileX);
  const decorations = [];
  addScenery(decorations, spec, groundAt);

  const devices = [];

  for (const plate of spec.plates ?? []) {
    devices.push({
      id: plate.id,
      type: 'plate',
      x: plate.tileX * T + T / 2,
      y: groundAt(plate.tileX),
      // 一般的石板只认脚底下这一小块；高台上的石板可以放宽，
      // 免得人落在边缘、没压到石板，就把自己锁在门的一边。
      radius: plate.radius ?? 15,
      pressed: false,
    });
  }

  for (const watcher of spec.watchers ?? []) {
    const base = watcher.dir > 0 ? 0.12 : Math.PI - 0.12;
    const centerX = watcher.tileX * T + T / 2;
    const patrol = watcher.patrol;
    devices.push({
      id: watcher.id,
      type: 'watcher',
      x: centerX,
      y: groundAt(watcher.tileX),
      dir: watcher.dir,
      range: watcher.range,
      halfAngle: watcher.halfAngle,
      sweep: watcher.sweep,
      speed: watcher.speed,
      phase: watcher.phase,
      clock: watcher.phase ?? 0,
      angle: base,
      alert: false,
      // 提着灯来回走的提灯人。patrol 是 [起步格, 折返格]，
      // 只铺在平地上，所以整段巡逻里脚下的高度不变。
      minX: patrol ? patrol[0] * T + T / 2 : null,
      maxX: patrol ? patrol[1] * T + T / 2 : null,
      patrolSpeed: (watcher.patrolSpeed ?? 1) * T,
      patrolClock: 0,
    });
  }

  const gates = (spec.gates ?? []).map((gateSpec) => {
    const char = gateSpec.kind === 'bridge' ? 'S' : 'G';
    const tiles = [];
    for (let row = gateSpec.y; row < gateSpec.y + gateSpec.h; row += 1) {
      for (let col = gateSpec.x; col < gateSpec.x + gateSpec.w; col += 1) {
        if (rows[row]?.[col] === undefined) continue;
        // 影子桥一开始不存在；铁门一开始立着。
        if (gateSpec.kind !== 'bridge') rows[row][col] = char;
        tiles.push({ col, row, char });
      }
    }

    // 铁门上方的符障：叠罗汉 + 蓄力弹跳能跳过 3 格高的门，
    // 但过不去这道一直顶到夜空的透明墙。开门时它会和门一起消失。
    // climbable 的门顶上留一道缝：可以用来当「另一种解法」的入口，
    // 踩着南瓜或叠罗汉翻过去，再用影子线把同伴拉过来。
    if (gateSpec.kind !== 'bridge' && !gateSpec.climbable) {
      for (let row = 0; row < gateSpec.y; row += 1) {
        for (let col = gateSpec.x; col < gateSpec.x + gateSpec.w; col += 1) {
          if (rows[row]?.[col] !== '.') continue;
          rows[row][col] = 'g';
          tiles.push({ col, row, char: 'g' });
        }
      }
    }

    return {
      ...gateSpec,
      char,
      tiles,
      open: false,
      latched: false,
      announced: false,
    };
  });

  const shadowZones = (spec.shadows ?? []).map(([x, y, w, h]) => ({
    x: x * T,
    y: y * T,
    w: w * T,
    h: h * T,
  }));

  const sneakHints = (spec.hints ?? []).map((hint) => ({
    x: hint.tileX * T,
    text: hint.text,
    mobileText: hint.mobileText ?? null,
    duration: hint.duration ?? 3800,
  }));

  const checkpoints = (spec.checkpoints ?? []).map((tileX, index) =>
    makeCheckpoint(
      tileX * T,
      groundAt(tileX) - PLAYER.HEIGHT,
      `第 ${entry.stage} 段 · 影子记号 ${index + 1}`,
    ),
  );

  return {
    width,
    height,
    rows,
    spawn: {
      x: spec.spawn * T + 3,
      y: groundAt(spec.spawn) - PLAYER.HEIGHT,
    },
    spawn2: {
      x: spec.spawn2 * T + 3,
      y: groundAt(spec.spawn2) - PLAYER.HEIGHT,
    },
    goalX: spec.goal * T,
    // 屋顶上的门在屋顶高度；两个人都得爬到那一层才算到。
    goalY: groundAt(spec.goal),
    decorations,
    pickups: [],
    devices,
    fieldZones: [],
    electrons: [],
    hazards: makeGapHazards(spec, groundRow),
    checkpoints,
    gates,
    shadowZones,
    sneakHints,
    tutorialSteps: [],
  };
}
