import { ELECTRON, FIELD, PLAYER, VIEW } from './config.js';
import { isBone, isCandy } from './collectibles.js';
import {
  MEMORIAL_CHAPTERS,
  MEMORIAL_ROUTE,
  memorialStageFromTheme,
} from './memorial.js';
import { SNEAK_BACKDROP, SNEAK_ROUTE, SNEAK_STAGES } from './sneak.js';
import { buildSneakData } from './sneakLevel.js';
import {
  PARADE_CHAPTERS,
  PARADE_ROUTE,
  getParadeTrack,
  paradeStageFromTheme,
} from './parade.js';

const T = VIEW.TILE;
const HEIGHT = 18;
const GROUND_ROW = 16;
const GROUND_Y = GROUND_ROW * T;

export const THEMES = Object.freeze([
  {
    id: 'tutorial',
    mode: 'tutorial',
    name: '月影小径',
    chapter: '新手教程',
    difficulty: 0,
    style: 'forest',
    mood: 'forest',
    objective: '学会走路、跳跃、下穿、拾取、南瓜与背包',
    brief: '没有危险。沿着月光熟悉方向键、背包，以及地上的南瓜。',
    startTip: '欢迎来到南瓜小径。慢慢走，不着急。',
  },
  {
    id: 'merged',
    mode: 'journey',
    name: '电磁长夜',
    chapter: '真实旅程',
    difficulty: 3,
    style: 'cavern',
    mood: 'ritual',
    objective: '先与孤立电子共处，再用速度选择器越过熔岩长井',
    brief: '一座把静电场、速度选择器和右手骨机关连在一起的地下长厅。',
    startTip: '身边的两颗铜球会给你不同的电荷。先选一种，再往深处走。',
  },
  // 追思线路「五盏灯」：前四段是墓园夜路；第五段沉入地下，
  // 直接使用「电磁长夜」的完整赛道。
  ...MEMORIAL_CHAPTERS.map((chapter) => ({
    id: chapter.levelId,
    mode: 'memorial',
    route: MEMORIAL_ROUTE.id,
    stage: chapter.stage,
    name: MEMORIAL_ROUTE.name,
    chapter: `${chapter.stageLabel} · ${chapter.patient}`,
    difficulty: 1,
    style: chapter.stage === 5 ? 'cavern' : 'forest',
    mood: 'memorial',
    objective: chapter.objective,
    brief: chapter.intro,
    startTip: chapter.body,
  })),
  // 百鬼夜行：六段夜路，一段比一段长，同行者一段比一段多。
  ...PARADE_CHAPTERS.map((chapter) => ({
    id: chapter.levelId,
    mode: 'parade',
    route: PARADE_ROUTE.id,
    stage: chapter.stage,
    name: PARADE_ROUTE.name,
    chapter: `${chapter.stageLabel} · ${chapter.name} · ${chapter.title}`,
    difficulty: chapter.stage + 1,
    style: 'forest',
    mood: 'parade',
    objective: chapter.objective,
    brief: chapter.intro,
    startTip: chapter.body,
    backdrop: chapter.backdrop,
    weather: chapter.weather,
  })),
  // 鬼鬼祟祟：双人同屏潜行，独立于其他线路。
  ...SNEAK_STAGES.map((stage) => ({
    id: stage.levelId,
    mode: 'sneak',
    route: SNEAK_ROUTE.id,
    stage: stage.stage,
    name: SNEAK_ROUTE.name,
    chapter: `第 ${stage.stage} 段 · ${stage.name}`,
    difficulty: stage.stage,
    style: 'forest',
    mood: 'sneak',
    objective: stage.objective,
    brief: stage.intro,
    startTip: stage.objective,
    // 后三段各有自己的天色：暖黄的晾糖场、紫灰的画像长廊、将亮未亮的屋顶。
    backdrop: stage.backdrop ?? SNEAK_BACKDROP,
  })),
]);

export const PLAYABLE_THEMES = THEMES.filter(
  (theme) =>
    theme.mode === 'journey' ||
    theme.mode === 'memorial' ||
    theme.mode === 'parade' ||
    theme.mode === 'sneak',
);

const THEME_BY_ID = new Map(THEMES.map((theme) => [theme.id, theme]));

/**
 * 前四段墓园小径的静态布局。数字单位都是地图格。
 * 地面始终连续，没有任何即死危险；只有高低差与可选木板。
 * 第五段不使用这张表：它在 build() 里交给 buildMerged(5) 的电磁长夜赛道。
 */
const MEMORIAL_STAGE_SPECS = [
  {
    // 第一段明显比其余几段长：从南瓜车到第一扇门将近 120 格。
    // 每 5 秒一次的检查、10 秒倒计时，走不出这么远的路——
    // 玩家最后一段必然是在超时报警里走完的，这正是这一段的记忆。
    width: 122,
    blocks: [
      [15, 15, 3, 1],
      [33, 15, 2, 1],
      [41, 15, 4, 1],
      // 路口的高墙：一个人跳不过去（4 格），得把南瓜推到墙边、
      // 抛起一颗叠好，踩着南瓜翻过去。墙前留了三颗南瓜。
      [54, 12, 2, 5],
      [62, 14, 3, 2],
      [72, 15, 5, 1],
      [86, 14, 4, 2],
      [96, 15, 3, 1],
      [104, 15, 2, 1],
      [112, 15, 4, 1],
    ],
    planks: [
      [22, 14, 4],
      [38, 14, 3],
      [60, 13, 4],
      [78, 13, 4],
      [90, 14, 4],
      [100, 12, 3],
      [108, 13, 4],
    ],
    lamps: [7, 20, 36, 43, 54, 60, 68, 84, 94, 102, 118],
    trees: [29, 45, 58, 80, 110],
    // 第一段开场：玩家乘南瓜车到这里，下车后才开始被操控。
    carriage: { tile: 2 },
    graves: [10, 18, 27, 39, 45, 56, 66, 76, 88, 98, 106, 116],
    fences: [[24, 3], [64, 3], [92, 2]],
    // 高墙前的南瓜是过关用的：50 号推到墙边，47 号抱起来抛上去叠高。
    pumpkins: [12, 34, 44, 47, 50, 68, 80, 98, 105, 113],
    skullPiles: [16, 40, 60, 76, 94, 111],
    memories: [{ tile: 70 }],
    checkpoint: 64,
    goal: 118,
  },
  {
    width: 56,
    blocks: [
      [10, 15, 3, 1],
      [17, 14, 3, 2],
      [28, 15, 4, 1],
      [37, 15, 2, 1],
      [44, 14, 3, 2],
      [50, 15, 2, 1],
    ],
    planks: [[23, 13, 4], [34, 13, 4], [48, 12, 3]],
    lamps: [6, 21, 31, 42, 54],
    trees: [4, 14, 34, 52],
    graves: [8, 15, 26, 33, 40, 47],
    fences: [[20, 2]],
    pumpkins: [12, 30, 45],
    skullPiles: [7, 36],
    memories: [{ tile: 30 }],
    checkpoint: 34,
    goal: 53,
  },
  {
    width: 58,
    blocks: [
      [12, 15, 4, 1],
      [20, 15, 6, 1],
      // 许奶奶这一段走得很轻、很慢，所有台阶都压到一格高。
      [30, 15, 4, 1],
      [38, 15, 3, 1],
      [46, 15, 5, 1],
    ],
    planks: [[16, 14, 3], [34, 14, 4], [42, 14, 3]],
    lamps: [6, 24, 36, 50],
    trees: [3, 28, 56],
    graves: [9, 15, 23, 32, 41, 48, 54],
    fences: [[26, 4]],
    pumpkins: [18, 39, 52],
    skullPiles: [11, 44],
    memories: [{ tile: 33 }],
    checkpoint: 36,
    goal: 55,
  },
  {
    width: 60,
    blocks: [
      [10, 15, 5, 1],
      [16, 14, 6, 2],
      [24, 13, 5, 1],
      [32, 15, 4, 1],
      [39, 14, 5, 2],
      [48, 15, 3, 1],
    ],
    planks: [[27, 12, 3], [45, 12, 3]],
    lamps: [7, 20, 29, 42, 54],
    trees: [4, 22, 37, 58],
    graves: [12, 19, 26, 35, 44, 51, 57],
    fences: [[31, 3]],
    pumpkins: [14, 36, 50],
    skullPiles: [15, 40],
    memories: [{ tile: 31 }],
    checkpoint: 34,
    goal: 57,
  },
];

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

function makeCheckpoint(x, y, label) {
  return { x, y: y ?? (GROUND_Y - PLAYER.HEIGHT), label };
}

function makePickup(id, type, x, y) {
  return { id, type, x, y, phase: (id.length * 1.7) % 6.28 };
}

/** 从地图顶部往下找第一块实心面，返回它的上沿像素 y。 */
function surfaceAt(rows, width, height, tileX) {
  const col = Math.max(0, Math.min(width - 1, tileX));
  for (let row = 0; row < height; row += 1) {
    const tile = rows[row][col];
    if (tile === '#' || tile === 'B' || tile === 'C') return row * T;
  }
  return height * T;
}

/** 百鬼夜行的石鼓：按 E 请一位（或两位）客人加入队伍。 */
function makeMaskDevice(id, x, y, yokaiIds, prompt) {
  return {
    id,
    type: 'mask',
    x,
    y,
    radius: 46,
    yokaiIds,
    prompt,
    joined: false,
  };
}

function makeWater(id, x, y, w, h, currentX, label, extras = {}) {
  return { id, x, y, w, h, currentX, label, ...extras };
}

/** 水底气泡柱：把站在里面的身体往上托，浅水也能借它跃出水面。 */
function makeUpdraft(id, x, y, w, h, force = -920, maxRise = -190, label = '上浮气泡') {
  return { id, x, y, w, h, force, maxRise, label };
}

/**
 * 普通 / 困难赛道的额外夜路插在每一段的这一段平地上。
 * 这些坐标都选在地面连续、附近没有水域的位置，插入后整段地图向右平移。
 */
const PARADE_ANNEX_AT = Object.freeze({ 1: 43, 2: 53, 3: 38, 4: 24, 5: 66, 6: 32 });
const PARADE_GROUND_ROW = Object.freeze({ 1: 16, 2: 18, 3: 16, 4: 22, 5: 22, 6: 30 });

/**
 * 在平地上切出几道瘴气沟（和原有地图一样，沟底就是瘴气），
 * 普通赛道两道，困难赛道三道，最后再加一面只有科学怪人能撞开的裂石壁。
 */
function buildParadeAnnex(track, groundRow, height, len) {
  const cols = Array.from({ length: len }, () => Array.from({ length: height }, () => '.'));
  for (let c = 0; c < len; c += 1) {
    for (let r = groundRow; r < height; r += 1) cols[c][r] = '#';
  }

  const gaps =
    track.id === 'hard'
      ? [
          [3, 1],
          [7, 2],
          [12, 3],
        ]
      : [
          [3, 1],
          [6, 2],
        ];

  for (const [start, width] of gaps) {
    for (let c = start; c < start + width; c += 1) {
      for (let r = groundRow; r < height; r += 1) cols[c][r] = '.';
    }
    // 两格以上的沟上方留一条单向木板：窄桥比硬跳稳，但掉下去一样会被冲散。
    if (width > 1) {
      for (let c = start; c < start + width; c += 1) cols[c][groundRow - 1] = 'P';
    }
  }

  const wallStart = track.id === 'hard' ? len - 5 : null;
  if (wallStart != null) {
    for (let c = wallStart; c < wallStart + 2 && c < len; c += 1) {
      for (let r = groundRow - 3; r < groundRow; r += 1) {
        if (cols[c][r] !== undefined) cols[c][r] = 'C';
      }
    }
  }

  return { cols, gaps, wallStart };
}

/**
 * 把普通 / 困难赛道的额外夜路插进关卡：先给插入点之后的装饰、装置、危险、
 * 落脚点、水域一起右移，再把新的地形列补进地图。这样不必为三条赛道各写一套地图。
 */
function applyParadeTrack(data, track, stage) {
  if (!track) return data;
  const at = PARADE_ANNEX_AT[stage];
  const groundRow = PARADE_GROUND_ROW[stage];
  const len = track.annex ?? 0;
  const T = VIEW.TILE;

  if (len > 0 && at != null && groundRow != null) {
    const before = at * T;
    const shiftX = (item) => {
      if (item && typeof item.x === 'number' && item.x >= before) item.x += len * T;
    };
    for (const key of [
      'decorations',
      'devices',
      'hazards',
      'checkpoints',
      'waterZones',
      'updrafts',
      'pickups',
    ]) {
      for (const item of data[key] ?? []) shiftX(item);
    }

    const annex = buildParadeAnnex(track, groundRow, data.height, len);
    for (let row = 0; row < data.height; row += 1) {
      data.rows[row].splice(
        at,
        0,
        ...annex.cols.map((col) => col[row]),
      );
    }
    data.width += len;
    data.goalX += len * T;

    for (const [start, width] of annex.gaps) {
      data.hazards.push({
        type: 'miasma',
        x: (at + start) * T,
        y: groundRow * T,
        w: width * T,
        h: 2 * T,
      });
    }

    const flameStart = track.id === 'hard' ? 12 : 6;
    data.decorations.push(
      {
        type: 'jackOLantern',
        x: (at + 1) * T,
        y: groundRow * T,
        variant: (at + 1) % 3,
        layer: 'front',
      },
      {
        type: 'paperLantern',
        x: (at + len - 1) * T,
        y: groundRow * T,
        layer: 'front',
      },
      {
        type: 'spiritFlame',
        x: (at + flameStart) * T,
        y: (groundRow - 1) * T,
        layer: 'front',
      },
      {
        type: 'candyBucket',
        x: (at + len - 2) * T,
        y: groundRow * T,
        layer: 'front',
      },
    );

    // 普通赛道在绕行的入口留一盏落脚灯；困难赛道只保留原来的落脚点。
    if (track.id === 'normal') {
      data.checkpoints.push(
        makeCheckpoint(
          (at + 1) * T,
          groundRow * T - PLAYER.HEIGHT,
          '绕行入口的灯',
        ),
      );
    }
    data.checkpoints.sort((a, b) => a.x - b.x);
  }

  // 普通赛道隔一个留一个落脚点，困难赛道只留三分之一；
  // 最后一段鸟居前的落脚点永远保留，避免整段后半程没有喘息的地方。
  const every = track.checkpointEvery ?? 1;
  if (every > 1) {
    const kept = data.checkpoints.filter((checkpoint, index) => index % every === 0);
    const last = data.checkpoints[data.checkpoints.length - 1];
    if (last && !kept.includes(last)) kept.push(last);
    data.checkpoints = kept.sort((a, b) => a.x - b.x);
  }

  // 水流更快：不会游的脚被冲回来的距离更远。
  if ((track.currentScale ?? 1) !== 1) {
    for (const zone of data.waterZones ?? []) {
      zone.currentX *= track.currentScale;
      if (zone.surfaceCurrentX != null) zone.surfaceCurrentX *= track.currentScale;
    }
  }

  data.track = track.id;
  return data;
}


/**
 * 教程与真实旅程共用一个 Level 类。
 * “电磁长夜”是一条完整流程：静电场大厅 → 两段熔岩速度选择器。
 * 目前仍是单张地图，方便继续调整和试玩。
 */
export class Level {
  constructor(themeId = 'tutorial', options = {}) {
    const theme = THEME_BY_ID.get(themeId);
    if (!theme) throw new Error(`Unknown theme: ${themeId}`);

    this.id = theme.id;
    this.theme = theme;
    this.style = theme.style;
    this.mood = theme.mood;
    this.areaName = theme.name;
    this.objective = theme.objective;
    this.route = theme.route ?? null;
    this.stage = theme.stage ?? 0;
    this.paradeTrack = theme.mode === 'parade'
      ? getParadeTrack(options.paradeTrack)
      : null;
    this.memorialChapter = theme.mode === 'memorial'
      ? MEMORIAL_CHAPTERS[this.stage - 1] ?? null
      : null;
    this.paradeChapter = theme.mode === 'parade'
      ? PARADE_CHAPTERS[this.stage - 1] ?? null
      : null;
    // 追思路、百鬼夜行和鬼鬼祟祟各自有天色；渲染层统一读 backdrop。
    this.backdrop = theme.backdrop ??
      (theme.mode === 'parade'
        ? this.paradeChapter?.backdrop ?? null
        : this.memorialChapter?.backdrop ?? null);
    this.weather = theme.weather ?? this.paradeChapter?.weather ?? null;
    this.goal = null;

    const built = this.build(themeId);
    const data = this.paradeTrack
      ? applyParadeTrack(built, this.paradeTrack, this.stage)
      : built;
    this.width = data.width;
    this.height = data.height ?? HEIGHT;
    this.tileSize = T;
    this.pixelWidth = this.width * T;
    this.pixelHeight = this.height * T;
    this.spawn = data.spawn;
    this.goalX = data.goalX;
    this.goalY = data.goalY ?? null;
    // 每一格都是可变的，科学怪人撞塌的“C”会直接改成“.”。
    this.tiles = data.rows.map((row) => row.slice());
    // 地上的南瓜是可推动、可抛起、可叠高的实体，不再交给静态装饰层。
    // 百鬼夜行里的「南瓜灯」（jackOLantern）用的是同一套南瓜画法，也一起变成实体。
    // 这里把摆放点从 decorations 里摘出来，交给 Game 的 PumpkinWorld 管理。
    const allDecorations = data.decorations ?? [];
    const isPumpkin = (decoration) =>
      decoration.type === 'pumpkin' || decoration.type === 'jackOLantern';
    this.pumpkinSpawns = allDecorations
      .filter(isPumpkin)
      .map((decoration) => ({
        x: decoration.x,
        y: decoration.y,
        variant: decoration.variant ?? 0,
      }));
    this.decorations = allDecorations.filter((decoration) => !isPumpkin(decoration));
    this.pickups = data.pickups;
    this.devices = data.devices;
    this.fieldZones = data.fieldZones;
    this.electrons = data.electrons;
    this.hazards = data.hazards;
    this.checkpoints = data.checkpoints;
    this.tutorialSteps = data.tutorialSteps ?? [];
    this.memorials = data.memorials ?? [];
    this.waterZones = data.waterZones ?? [];
    this.updrafts = data.updrafts ?? [];
    this.party = data.party ?? null;
    // 鬼鬼祟祟：双人出生点、石板门 / 影子桥、影子区与教学提示。
    this.spawn2 = data.spawn2 ?? {
      x: this.spawn.x + 24,
      y: this.spawn.y,
    };
    this.gates = data.gates ?? [];
    this.shadowZones = data.shadowZones ?? [];
    this.sneakHints = data.sneakHints ?? [];
  }

  build(themeId) {
    if (themeId === 'tutorial') return this.buildTutorial();
    if (themeId === 'merged') return this.buildMerged();
    // 第五段追思路：不再走五盏灯的平地布局，而是整条电磁长夜赛道。
    if (themeId === 'memorial-5') return this.buildMerged(5);
    if (themeId.startsWith('memorial-')) {
      return this.buildMemorial(memorialStageFromTheme(themeId));
    }
    if (themeId.startsWith('parade-')) {
      return this.buildParade(paradeStageFromTheme(themeId));
    }
    if (themeId.startsWith('sneak-')) {
      return buildSneakData(Number(themeId.slice('sneak-'.length)));
    }
    throw new Error(`No builder for ${themeId}`);
  }

  buildTutorial() {
    const width = 64;
    const rows = makeGrid(width, HEIGHT);

    paint(rows, 0, GROUND_ROW, width, 2, '#');
    paint(rows, 28, 15, 7, 3, '#');
    paint(rows, 48, 15, 7, 3, '#');
    paint(rows, 21, 14, 2, 2, 'B');
    paint(rows, 23, 15, 3, 1, 'B');

    const planks = [
      [6, 14, 5],
      [12, 12, 5],
      [18, 10, 5],
      [24, 8, 5],
      [42, 12, 5],
      [46, 10, 3],
      [49, 13, 5],
      [55, 11, 4],
      [59, 9, 4],
    ];
    for (const [x, y, w] of planks) paint(rows, x, y, w, 1, 'P');
    // 教学高墙：四格高（64px），一个人跳不过去。
    // 墙前放着三颗南瓜，要抱一颗抛到另一颗头顶叠成两级台阶，再踩着翻过去。
    paint(rows, 40, 12, 2, 4, '#');

    const decorations = [
      { type: 'tree', x: 18, y: GROUND_Y, scale: 1.05, layer: 'back' },
      { type: 'tree', x: 402, y: GROUND_Y, scale: 0.82, layer: 'back' },
      { type: 'tree', x: 690, y: GROUND_Y, scale: 1.15, layer: 'back' },
      { type: 'tree', x: 972, y: GROUND_Y, scale: 0.9, layer: 'back' },
      { type: 'grave', x: 100, y: GROUND_Y, variant: 0, layer: 'back' },
      { type: 'grave', x: 336, y: GROUND_Y, variant: 1, layer: 'back' },
      { type: 'grave', x: 658, y: GROUND_Y, variant: 2, layer: 'back' },
      { type: 'grave', x: 856, y: GROUND_Y, variant: 0, layer: 'back' },
      { type: 'skullPile', x: 140, y: GROUND_Y, layer: 'front' },
      { type: 'skullPile', x: 444, y: GROUND_Y, layer: 'front' },
      { type: 'skullPile', x: 712, y: GROUND_Y, layer: 'front' },
      { type: 'skullPile', x: 916, y: GROUND_Y, layer: 'front' },
      { type: 'skullPile', x: 986, y: GROUND_Y, layer: 'front' },
      { type: 'skullPile', x: 612, y: GROUND_Y, layer: 'front' },
      { type: 'skullPile', x: 820, y: 15 * T, layer: 'front' },
      // 教学用的南瓜：沿路排开，推得动，也能抱起来抛。
      { type: 'pumpkin', x: 200, y: GROUND_Y, variant: 0, layer: 'front' },
      { type: 'pumpkin', x: 232, y: GROUND_Y, variant: 1, layer: 'front' },
      { type: 'pumpkin', x: 264, y: GROUND_Y, variant: 2, layer: 'front' },
      { type: 'pumpkin', x: 128, y: GROUND_Y, variant: 1, layer: 'front' },
      { type: 'pumpkin', x: 468, y: 15 * 16, variant: 2, layer: 'front' },
      // 教学高墙前的三颗南瓜：靠墙的两颗正好叠成能跳上墙头的台阶。
      { type: 'pumpkin', x: 540, y: GROUND_Y, variant: 0, layer: 'front' },
      { type: 'pumpkin', x: 602, y: GROUND_Y, variant: 1, layer: 'front' },
      { type: 'pumpkin', x: 628, y: GROUND_Y, variant: 2, layer: 'front' },
      { type: 'pumpkin', x: 810, y: 15 * 16, variant: 0, layer: 'front' },
      { type: 'pumpkin', x: 988, y: GROUND_Y, variant: 1, layer: 'front' },
      { type: 'sign', x: 38, y: GROUND_Y, variant: 0, layer: 'front' },
      { type: 'lamp', x: 174, y: GROUND_Y, layer: 'front' },
      { type: 'lamp', x: 520, y: 15 * 16, layer: 'front' },
      { type: 'lamp', x: 804, y: 15 * 16, layer: 'front' },
      { type: 'lamp', x: 930, y: GROUND_Y, layer: 'front' },
      { type: 'mushroom', x: 246, y: GROUND_Y, layer: 'front' },
      { type: 'mushroom', x: 500, y: GROUND_Y, layer: 'front' },
      { type: 'fence', x: 900, y: GROUND_Y, length: 3, layer: 'front' },
    ];

    return {
      width,
      height: HEIGHT,
      rows,
      spawn: { x: 3 * T + 3, y: GROUND_Y - PLAYER.HEIGHT },
      // 光门放在整条练习小径的尽头：木板、台阶、高墙都走一遍再到门。
      goalX: 60 * T,
      decorations,
      pickups: [
        // 第一根肋骨放在矮木板上，顺手教一次起跳与按 ↓ 穿下木板。
        makePickup('tutorial-rib', 'rib', 100, 14 * T - 11),
        makePickup('tutorial-femur', 'femur', 280, GROUND_Y - 11),
        makePickup('tutorial-hand', 'rightHand', 328, GROUND_Y - 11),
        // 集齐头骨、肋骨、腿骨和一只左手骨，教程末尾会拼出第一套时装。
        makePickup('tutorial-skull', 'skull', 344, 14 * T - 11),
        makePickup('tutorial-left-hand', 'leftHand', 392, 15 * T - 11),
        // 教程里只放一颗糖，让玩家先认识「吃下糖果会短暂改变身体」。
        // 放在高墙之后，免得玉米糖的自动乱跳打断叠南瓜的练习。
        makePickup('tutorial-candy-01', 'candyCorn', 740, GROUND_Y - 11),
      ],
      devices: [],
      fieldZones: [],
      electrons: [],
      hazards: [],
      checkpoints: [],
      tutorialSteps: [
        {
          id: 'move',
          text: '用 ← → 在月光下走一走。',
          cheer: '就是这样，脚步很稳。',
        },
        {
          id: 'jump',
          text: '按 ↑ 跳一下。按住不放，会跳得更高。',
          cheer: '漂亮！身体比南瓜还轻。',
        },
        {
          id: 'drop',
          text: '跳上木板，再按住 ↓ 落下来。空中按 ↓ 会落得更快。',
          cheer: '上下都听你的。',
        },
        {
          id: 'collect',
          text: '走近发光的骨头，它会自己进背包。骨头能拼成骷髅时装。',
          cheer: '捡到了。背包会记住你走过的路。',
        },
        {
          id: 'pumpkin',
          text: '南瓜可以推。走到它旁边，用身体把它顶开。',
          cheer: '对，南瓜推得动，也不怕摔。',
        },
        {
          id: 'pumpkin-toss',
          text: '按 E 抱起南瓜，再按 E 抛出去。',
          cheer: '抛起来了。推、抛、叠高，南瓜都随你。',
        },
        {
          id: 'pumpkin-stack',
          text: '墙比人高。把南瓜抛到另一颗头顶叠好，踩着翻过去。',
          cheer: '叠好了。两颗南瓜，就够翻过一个人翻不过去的墙。',
        },
        {
          id: 'candy',
          text: '陌生人给的糖，小朋友不能乱吃。可惜我是大学生。',
          cheer: '吃都吃了，看看接下来身体会怎么反应。',
        },
        {
          id: 'backpack',
          text: '按 Tab 看背包：骨头、衣橱和糖果罐都在这儿。',
          cheer: '很好。骨头、时装和糖果都在这里。',
        },
        {
          id: 'finish',
          text: '小径尽头有一扇光门。慢慢走过去。',
          cheer: '',
        },
      ],
    };
  }

  buildMerged(memorialStage = 0) {
    const height = 48;

    // 两座安全岛和终点岛都留得宽一些：骨槽、铜球和落脚点摆开，
    // 站在岛上有转身的余量。井宽保持不变，后面的岛和井依次向右让。
    const islandA = { x: 47, w: 9 }; // 电子厅右侧的骨槽台
    const wellA = { x: islandA.x + islandA.w, w: 20 };
    const islandB = { x: wellA.x + wellA.w, w: 9 }; // 沉降井与逆流井之间
    const wellB = { x: islandB.x + islandB.w, w: 20 };
    const islandEnd = { x: wellB.x + wellB.w, w: 12 }; // 逆流井后的终点岛

    const width = islandEnd.x + islandEnd.w;
    const rows = makeGrid(width, height);
    const floorRow = 41;
    const floorY = floorRow * T;
    const spawnY = floorY - PLAYER.HEIGHT;

    // 左侧安全台、右侧骨槽安全台；中间是一条深裂隙。
    // 骨槽台有 9 格，走到骨槽与速度选择器附近时已离开电子场。
    paint(rows, 0, floorRow, 19, 7, '#');
    paint(rows, islandA.x, floorRow, islandA.w, 7, '#');
    paint(rows, islandB.x, floorRow, islandB.w, 7, '#');
    paint(rows, islandEnd.x, floorRow, islandEnd.w, 7, '#');

    // 电子大厅的两条路线：
    //   下层：四块窄平台，间隔 80px。不带电跳不过去；
    //         负电荷借坑底电子的斥力延长跳跃，才能落到下一块。
    //   上层：逐级抬升的阶梯。正电荷借上方电子的吸力攀爬。
    // 两条路线在右侧加宽后的骨槽台汇合。
    const platforms = [
      // 下层路线
      [21, 39, 2],
      [28, 39, 2],
      [35, 39, 2],
      [42, 39, 2],
      // 上层路线：只有第一段 48px 落差需要电子帮忙，
      // 之后都是普通可跳的 32px 台阶，避免被电子一直吸住。
      [24, 37, 3],
      [28, 34, 3],
      [32, 32, 3],
      [36, 30, 3],
      [40, 28, 3],
      [44, 26, 3],
    ];
    for (const [x, y, w] of platforms) paint(rows, x, y, w, 1, 'P');

    const decorations = [
      // 起始厅与左岸
      { type: 'rune', x: 96, y: floorY, layer: 'front' },
      { type: 'crystal', x: 146, y: floorY, scale: 0.9, layer: 'front' },
      { type: 'skullPile', x: 64, y: floorY, layer: 'front' },
      { type: 'skullPile', x: 112, y: floorY, layer: 'front' },
      { type: 'skullPile', x: 196, y: floorY, layer: 'front' },
      { type: 'skullPile', x: 280, y: floorY, layer: 'front' },
      { type: 'stalactite', x: 168, y: 104, scale: 0.8, layer: 'back' },
      { type: 'chain', x: 250, y: 120, length: 4, layer: 'back' },

      // 裂隙上空的背景
      { type: 'chain', x: 420, y: 120, length: 5, layer: 'back' },
      { type: 'stalactite', x: 470, y: 104, scale: 1.2, layer: 'back' },
      { type: 'stalactite', x: 560, y: 104, scale: 0.9, layer: 'back' },
      { type: 'chain', x: 660, y: 120, length: 7, layer: 'back' },
      { type: 'stalactite', x: 740, y: 104, scale: 1.1, layer: 'back' },

      // 下层路线
      { type: 'crystal', x: 352, y: 39 * T, scale: 0.75, layer: 'front' },
      { type: 'skullPile', x: 464, y: 39 * T, layer: 'front' },
      { type: 'skullPile', x: 576, y: 39 * T, layer: 'front' },
      { type: 'skullPile', x: 688, y: 39 * T, layer: 'front' },
      { type: 'stalagmite', x: 760, y: floorY, scale: 0.8, layer: 'back' },

      // 上层路线
      { type: 'skullPile', x: 408, y: 37 * T, layer: 'front' },
      { type: 'crystal', x: 536, y: 32 * T, scale: 0.9, layer: 'front' },
      { type: 'skullPile', x: 600, y: 30 * T, layer: 'front' },
      { type: 'crystal', x: 648, y: 28 * T, scale: 0.8, layer: 'front' },
      { type: 'skullPile', x: 720, y: 26 * T, layer: 'front' },

      // 右侧骨槽台：铜球、骨槽和装饰各自摆开，不再挤成一团。
      { type: 'crystal', x: 872, y: floorY, scale: 1.1, layer: 'front' },
      { type: 'rune', x: 886, y: floorY, layer: 'front' },

      // 后续安全岛
      { type: 'stalactite', x: 928, y: 104, scale: 0.9, layer: 'back' },
      { type: 'chain', x: 1008, y: 104, length: 6, layer: 'back' },
      { type: 'crystal', x: 1148, y: 104, scale: 1.2, layer: 'back' },

      // 岛 B：骨槽在左，第三对铜球在右，装饰退到两端。
      { type: 'stalagmite', x: 1216, y: floorY, scale: 0.8, layer: 'back' },
      { type: 'skullPile', x: 1224, y: floorY, layer: 'front' },
      { type: 'rune', x: 1238, y: floorY, layer: 'front' },
      { type: 'crystal', x: 1330, y: floorY, scale: 1.1, layer: 'front' },
      { type: 'skullPile', x: 1340, y: floorY, layer: 'front' },

      { type: 'stalactite', x: 1392, y: 104, scale: 1.1, layer: 'back' },
      { type: 'chain', x: 1482, y: 104, length: 5, layer: 'back' },
      { type: 'crystal', x: 1592, y: 104, scale: 0.9, layer: 'back' },

      // 终点岛：过完逆流井后，岛面一直铺到光门。
      { type: 'skullPile', x: 1684, y: floorY, layer: 'front' },
      { type: 'crystal', x: 1702, y: floorY, scale: 0.85, layer: 'front' },
      { type: 'stalagmite', x: 1770, y: floorY, scale: 1.2, layer: 'back' },
      { type: 'skullPile', x: 1786, y: floorY, layer: 'front' },

      { type: 'stalactite', x: 1810, y: 104, scale: 1.1, layer: 'back' },
      { type: 'chain', x: 1860, y: 104, length: 4, layer: 'back' },

      // 光门两侧各一堆头骨。
      { type: 'rune', x: 1824, y: floorY, layer: 'front' },
      { type: 'skullPile', x: 1850, y: floorY, layer: 'front' },

      // 洞穴里也有南瓜：放在几座安全岛上，推、抱、抛、叠高照样可用。
      { type: 'pumpkin', x: 48, y: floorY, variant: 0, layer: 'front' },
      { type: 'pumpkin', x: 192, y: floorY, variant: 1, layer: 'front' },
      { type: 'pumpkin', x: 280, y: floorY, variant: 2, layer: 'front' },
      { type: 'pumpkin', x: 888, y: floorY, variant: 1, layer: 'front' },
      { type: 'pumpkin', x: 1220, y: floorY, variant: 0, layer: 'front' },
      { type: 'pumpkin', x: 1840, y: floorY, variant: 2, layer: 'front' },
    ];

    const pickups = [
      // 起始厅：只有旧床单是直接放在地上的时装零件，给玩家一个入门样本。
      // 糖果变得稀少：起始厅只留一颗，其余沿旅程稀疏分布。
      makePickup('merged-rib-01', 'rib', 5 * T, floorY - 11),
      makePickup('merged-candy-01', 'candyCorn', 40, floorY - 11),
      makePickup('merged-rib-04', 'rib', 56, floorY - 11),
      makePickup('merged-femur-01', 'femur', 10 * T, floorY - 11),
      makePickup('merged-sheet-01', 'sheet', 104, floorY - 11),
      makePickup('merged-skull-01', 'skull', 13 * T, floorY - 11),
      makePickup('merged-beard-01', 'beard', 184, 620),
      makePickup('merged-hand-06', 'rightHand', 256, floorY - 11),
      makePickup('merged-hand-01', 'rightHand', 17 * T, floorY - 11),
      makePickup('merged-rib-02', 'rib', 18 * T, floorY - 11),

      // 下层路线：骨头仍是地面参照物，稀有零件浮在窄平台之间的裂隙上方。
      makePickup('merged-rib-low', 'rib', 352, 39 * T - 11),
      makePickup('merged-skull-low', 'skull', 464, 39 * T - 11),
      makePickup('merged-candy-low-01', 'sourGummy', 560, 39 * T - 11),
      makePickup('merged-hand-low-01', 'rightHand', 576, 39 * T - 11),
      // 跳跳糖浮在窄平台之间的裂隙上方：要靠电子的推力才够得到。
      makePickup('merged-candy-low-02', 'poppingCandy', 616, 590),
      makePickup('merged-rib-low-02', 'rib', 688, 39 * T - 11),
      // 右侧骨槽台留给第二对铜球，这颗右手骨挪到下层最后一块窄平台上。
      makePickup('merged-hand-low-02', 'rightHand', 700, 39 * T - 11),
      // 稀有：跳过低层平台间隙时才会碰到，失手会掉进裂隙。
      makePickup('merged-cloak-low', 'starCloak', 440, 580),
      makePickup('merged-eyes-low', 'eyeHoles', 520, 590),
      // 旧床单的第二份：比地面高 35px，需要一次完整的跳跃。
      makePickup('merged-sheet-02', 'sheet', 680, 580),

      // 上层路线：稀有零件都浮在高台与高台之间的空档里。糖果不再铺在这条线上。
      makePickup('merged-rib-high', 'rib', 392, 37 * T - 11),
      makePickup('merged-hand-high-01', 'rightHand', 424, 37 * T - 11),
      makePickup('merged-beard-high', 'beard', 408, 550),
      makePickup('merged-skull-high', 'skull', 480, 34 * T - 11),
      makePickup('merged-book-high', 'spellbook', 456, 510),
      makePickup('merged-rib-high-02', 'rib', 536, 32 * T - 11),
      makePickup('merged-left-high', 'leftHand', 512, 470),
      makePickup('merged-wand-high', 'wand', 552, 470),
      makePickup('merged-hand-high-02', 'rightHand', 600, 30 * T - 11),
      makePickup('merged-cloak-high', 'starCloak', 632, 432),
      makePickup('merged-rib-high-03', 'rib', 664, 28 * T - 11),
      makePickup('merged-hand-high-03', 'rightHand', 728, 26 * T - 11),
      // 最高处的破尖帽：要在最高一块平台上起跳才够得着。
      makePickup('merged-hat-high', 'wizardHat', 744, 370),

      // 右侧落脚点：骨头在地面，零件浮在需要起跳的高度。
      makePickup('merged-rib-03', 'rib', 52 * T, floorY - 11),
      makePickup('merged-candy-02', 'lollipop', 816, floorY - 11),
      // 太妃糖要跳一下才够得到，和书页的高度差不多。
      makePickup('merged-candy-03', 'toffee', 860, 600),
      makePickup('merged-book-01', 'spellbook', 816, 600),
      makePickup('merged-skull-02', 'skull', 896, floorY - 11),

      // 岛 B 新增了第三对铜球，地面只留一块右手骨，避免和铜球叠在一起。
      makePickup('merged-hand-03', 'rightHand', 1236, floorY - 11),
      makePickup('merged-left-01', 'leftHand', 1220, 620),
      // 棉花糖放在第三对铜球之后：吃下就能试着飞过下一口井。
      makePickup('merged-candy-06', 'marshmallow', 1345, floorY - 11),

      // 终点岛上的右手骨：消耗品要保证够用，沿岛面铺开。
      makePickup('merged-hand-05', 'rightHand', 1688, floorY - 11),
      makePickup('merged-rib-05', 'rib', 1708, floorY - 11),
      makePickup('merged-eyes-02', 'eyeHoles', 1724, 620),
      makePickup('merged-candy-04', 'chocolate', 1738, floorY - 11),
      makePickup('merged-hand-04', 'rightHand', 1760, floorY - 11),
      makePickup('merged-femur-02', 'femur', 1782, floorY - 11),
      // 终点岛的两颗糖离得很近：连着吃下，两种状态会短暂叠在一起。
      makePickup('merged-candy-05', 'licorice', 1806, floorY - 11),

      // 两口井里的悬浮零件：平衡速度维持得住，才够得到。
      makePickup('merged-left-field-a', 'leftHand', 1048, 610),
      // 井里也各藏一颗糖：牛轧糖在第一口井，薄荷糖在第二口井。
      makePickup('merged-candy-field-01', 'nougat', 1100, 620),
      makePickup('merged-candy-field-02', 'mint', 1520, 620),
      makePickup('merged-left-field-b', 'leftHand', 1592, 620),
      makePickup('merged-wand-field', 'wand', 1632, 615),
      // 骨火井移除后，破尖帽挪进逆流井，保证每种零件仍有两处可捡。
      makePickup('merged-hat-field', 'wizardHat', 1450, 615),

      makePickup('merged-skull-03', 'skull', 1800, 620),
    ];

    const devices = [
      {
        id: 'merged-charger-positive',
        type: 'charger',
        charge: 1,
        x: 8 * T,
        y: floorY,
        radius: 44,
      },
      {
        id: 'merged-charger-negative',
        type: 'charger',
        charge: -1,
        x: 15 * T,
        y: floorY,
        radius: 44,
      },
      // 出了电子大厅、进入第一口井之前，右侧骨槽台上的第二对铜球。
      // 挨着换磁场的骨槽摆放，让玩家在开井前可以重新选一次电荷；
      // 岛加宽后两只铜球之间也拉开了距离。
      {
        id: 'merged-charger-positive-2',
        type: 'charger',
        charge: 1,
        x: 48.4 * T,
        y: floorY,
        radius: 44,
      },
      {
        id: 'merged-charger-negative-2',
        type: 'charger',
        charge: -1,
        x: 50 * T,
        y: floorY,
        radius: 44,
      },
      // 第一口井和第二口井之间的安全岛：骨槽 B 右侧的第三对铜球。
      // 过完沉降井后可以在这里换一次电荷，再进逆流井。
      {
        id: 'merged-charger-positive-3',
        type: 'charger',
        charge: 1,
        x: 81 * T,
        y: floorY,
        radius: 44,
      },
      {
        id: 'merged-charger-negative-3',
        type: 'charger',
        charge: -1,
        x: 82.6 * T,
        y: floorY,
        radius: 44,
      },
      {
        id: 'merged-slot-A',
        type: 'boneSlot',
        x: 53 * T,
        y: floorY,
        radius: 48,
        fieldId: 'merged-A',
        solved: false,
        placedType: null,
      },
      {
        id: 'merged-slot-B',
        type: 'boneSlot',
        x: 78.5 * T,
        y: floorY,
        radius: 48,
        fieldId: 'merged-B',
        solved: false,
        placedType: null,
      },
    ];

    const fieldZones = [
      {
        id: 'merged-A',
        label: 'I · 沉降井',
        x: wellA.x * T,
        y: 104,
        w: wellA.w * T,
        h: 552,
        e: { mag: 6.0, dir: 'down' },
        b: { mag: 1.2, dir: 'out' },
      },
      {
        id: 'merged-B',
        label: 'II · 逆流井',
        x: wellB.x * T,
        y: 104,
        w: wellB.w * T,
        h: 552,
        e: { mag: 8.4, dir: 'up' },
        b: { mag: 1.2, dir: 'in' },
      },
    ];

    const electrons = [
      // 上层只需要一颗：悬在第一段 48px 落差的上方，
      // 把正电荷拉上去，同时把负电荷压回下层。
      // 它离后面的普通台阶足够远，不会把玩家一直吸在半空。
      { id: 'merged-electron-up-1', x: 424, y: 520, radius: 100, strength: 3600, scale: 1.2, phase: 1.2 },
      // 下层：悬在裂隙深处，把负电荷往上推，把正电荷压住。
      // 最后一颗在 x=600：右侧加宽平台在 752 之后完全离开它的场。
      { id: 'merged-electron-low-1', x: 408, y: 720, radius: 175, strength: 3600, scale: 1.0, phase: 0.8 },
      { id: 'merged-electron-low-2', x: 520, y: 720, radius: 175, strength: 3600, scale: 1.1, phase: 1.9 },
      { id: 'merged-electron-low-3', x: 600, y: 720, radius: 175, strength: 3600, scale: 1.0, phase: 3.6 },
    ];

    const memorials = [];
    if (memorialStage) {
      const chapter = MEMORIAL_CHAPTERS[memorialStage - 1];
      if (chapter) {
        // 第五段的两盏灯：入口处想起周叔，终点岛上是家里人的墓。
        const entries = [
          { x: 7.5 * T, patient: chapter.patient, line: chapter.memory },
          { x: (islandEnd.x + 4) * T, patient: '家里人', line: MEMORIAL_ROUTE.finale },
        ];
        entries.forEach((entry, index) => {
          const id = `memorial-${memorialStage}-memory-${index + 1}`;
          memorials.push({
            id,
            x: entry.x,
            y: floorY,
            patient: entry.patient,
            line: entry.line,
          });
          decorations.push({
            type: 'memory',
            id,
            lightId: id,
            x: entry.x,
            y: floorY,
            layer: 'front',
          });
          decorations.push({
            type: 'candle',
            lightId: id,
            x: entry.x + T,
            y: floorY,
            layer: 'front',
          });
        });
      }
    }

    return {
      width,
      height,
      rows,
      spawn: { x: 4 * T, y: spawnY },
      goalX: (islandEnd.x + 9) * T,
      decorations,
      pickups,
      devices,
      fieldZones,
      electrons,
      memorials,
      hazards: [
        { type: 'lava', x: wellA.x * T, y: 684, w: (islandEnd.x - wellA.x) * T, h: 84 },
        // 电子大厅中段是深裂隙，不能沿地面通过。
        // 横向判定按坑口，纵深用 killY 单独压到坑底：
        // 玩家要整个落下去（脚底接近关卡底部）才重置，掉到电子附近不算。
        { type: 'void', x: 19 * T, y: 700, w: 28 * T, h: 68, killY: 758 },
        // 每口井的顶部都封着倒挂尖刺，防止被场托起后从井顶越过去。
        ...fieldZones.map((field) => ({
          type: 'spikes',
          x: field.x - T,
          y: field.y,
          w: field.w + 2 * T,
          h: 32,
        })),
      ],
      checkpoints: [
        makeCheckpoint(18 * T, spawnY, '电子厅裂隙前'),
        makeCheckpoint(54 * T, spawnY, '电子厅尽头'),
        makeCheckpoint(77.5 * T, spawnY, '第二座骨槽'),
      ],
      tutorialSteps: [],
    };
  }

  /**
   * 「五盏灯」前四段的墓园夜路。
   *
   * 每段都是一张短而平缓的地图：地面连续，没有岩浆和深坑，
   * 只有几级矮石阶和可选的单向木板。真正的阻力来自这一段的记忆——
   * 玩家会短暂带上那位病人可被观察到的行为特点。
   * 段与段之间用一扇墓园门连接，走到门边就进入下一段。
   * 第五段不走这里，而是由 buildMerged(5) 接管整条电磁长夜赛道。
   */
  buildMemorial(stage) {
    const chapter = MEMORIAL_CHAPTERS[stage - 1];
    const spec = MEMORIAL_STAGE_SPECS[stage - 1];
    if (!chapter || !spec) throw new Error(`No memorial stage ${stage}`);

    const width = spec.width;
    const rows = makeGrid(width, HEIGHT);
    paint(rows, 0, GROUND_ROW, width, 2, '#');

    for (const [x, y, w, h] of spec.blocks) paint(rows, x, y, w, h ?? 1, 'B');
    for (const [x, y, w] of spec.planks) paint(rows, x, y, w, 1, 'P');

    // 站在这一列时，脚下最高的实心面在哪一行。
    const surfaceOf = (tileX) => {
      const col = Math.max(0, Math.min(width - 1, tileX));
      for (let row = 0; row < HEIGHT; row += 1) {
        const tile = rows[row][col];
        if (tile === '#' || tile === 'B') return row * T;
      }
      return HEIGHT * T;
    };

    const groundAt = (tileX) => surfaceOf(tileX);

    const decorations = [
      { type: 'sign', x: 5 * T, y: groundAt(5), variant: 0, layer: 'front' },
    ];

    for (const tileX of spec.trees) {
      decorations.push({
        type: 'tree',
        x: tileX * T,
        y: groundAt(tileX),
        scale: 0.78 + (tileX % 5) * 0.07,
        layer: 'back',
      });
    }

    for (const tileX of spec.graves) {
      decorations.push({
        type: 'grave',
        x: tileX * T,
        y: groundAt(tileX),
        variant: tileX % 3,
        layer: 'back',
      });
    }

    for (const tileX of spec.lamps) {
      decorations.push({
        type: 'lamp',
        x: tileX * T,
        y: groundAt(tileX),
        layer: 'front',
      });
    }

    for (const tileX of spec.pumpkins) {
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

    const memorials = [];
    const memorySpecs = spec.memories ?? [];
    memorySpecs.forEach((memory, index) => {
      const id = `memorial-${stage}-memory-${index + 1}`;
      const x = memory.tile * T;
      const surface = groundAt(memory.tile);
      memorials.push({
        id,
        x,
        y: surface,
        patient: memory.family ? '家里人' : chapter.patient,
        line: memory.family ? MEMORIAL_ROUTE.finale : chapter.memory,
      });
      decorations.push({
        type: 'memory',
        id,
        lightId: id,
        x,
        y: surface,
        layer: 'front',
      });
      decorations.push({
        type: 'candle',
        lightId: id,
        x: x + T,
        y: surface,
        layer: 'front',
      });
    });

    const devices = [];
    if (spec.carriage) {
      const tileX = spec.carriage.tile;
      devices.push({
        id: `memorial-${stage}-carriage`,
        type: 'carriage',
        x: tileX * T,
        y: groundAt(tileX),
        radius: 36,
      });
    }

    return {
      width,
      height: HEIGHT,
      rows,
      spawn: { x: 2 * T + 3, y: groundAt(2) - PLAYER.HEIGHT },
      goalX: spec.goal * T,
      decorations,
      pickups: [],
      devices,
      fieldZones: [],
      electrons: [],
      hazards: [],
      checkpoints: [
        makeCheckpoint(
          spec.checkpoint * T,
          groundAt(spec.checkpoint) - PLAYER.HEIGHT,
          `第 ${stage} 段 · 半途的灯`,
        ),
      ],
      memorials,
      tutorialSteps: [],
    };
  }

  /**
   * 「百鬼夜行」的六段夜路。
   *
   * 每一段的地图都为「最慢的那双脚」留了路：科学怪人最多只能跨过两格宽的缺口、
   * 登上一格高的台阶；床单幽灵和蝙蝠可以走屋顶上的高空路，但门永远在地面上，
   * 她们最后要自己飘下来。水里的沼泽怪快，但岸上的队伍不会等她。
   * 终点鸟居只认「所有同行者都到齐」。
   */
  buildParade(stage) {
    const chapter = PARADE_CHAPTERS[stage - 1];
    if (!chapter) throw new Error(`No parade stage ${stage}`);
    if (stage === 1) return this.buildParadeOne(chapter);
    if (stage === 2) return this.buildParadeTwo(chapter);
    if (stage === 3) return this.buildParadeThree(chapter);
    if (stage === 4) return this.buildParadeFour(chapter);
    if (stage === 5) return this.buildParadeFive(chapter);
    return this.buildParadeSix(chapter);
  }

  /** 第一段 · 山道 · 一之坂：两个身体，一座要撞开的石壁。 */
  buildParadeOne(chapter) {
    const width = 78;
    const height = 18;
    const groundRow = 16;
    const rows = makeGrid(width, height);
    paint(rows, 0, groundRow, width, 2, '#');

    // 上山的三级缓坡
    paint(rows, 17, 15, 3, 1, 'B');
    paint(rows, 20, 14, 4, 2, 'B');
    paint(rows, 24, 14, 6, 2, 'B');
    paint(rows, 31, 14, 10, 2, 'B');
    paint(rows, 41, 15, 2, 1, 'B');

    // 一格宽的断口，底下是瘴气
    paint(rows, 30, 16, 1, 2, '.');

    // 三格高的裂石壁：普通跳跃越不过去，只能让科学怪人撞开
    paint(rows, 46, 13, 2, 3, 'C');

    // 一座窄木桥，底下也漏着瘴气
    paint(rows, 55, 16, 4, 2, '.');
    paint(rows, 55, 15, 4, 1, 'P');

    // 终点前的两级石阶
    paint(rows, 63, 15, 3, 1, 'B');
    paint(rows, 66, 14, 12, 2, 'B');

    const groundAt = (tileX) => surfaceAt(rows, width, height, tileX);
    const decorations = [
      { type: 'torii', x: 3 * T, y: groundAt(3), layer: 'back' },
      { type: 'torii', x: 42 * T, y: groundAt(42), layer: 'back' },
      { type: 'bamboo', x: 14 * T, y: groundAt(14), scale: 1, layer: 'back' },
      { type: 'bamboo', x: 60 * T, y: groundAt(60), scale: 0.85, layer: 'back' },
      { type: 'tree', x: 21 * T, y: groundAt(21), scale: 0.92, layer: 'back' },
      { type: 'tree', x: 68 * T, y: groundAt(68), scale: 1.05, layer: 'back' },
      { type: 'stoneLantern', x: 7 * T, y: groundAt(7), layer: 'front' },
      { type: 'stoneLantern', x: 52 * T, y: groundAt(52), layer: 'front' },
      { type: 'stoneLantern', x: 70 * T, y: groundAt(70), layer: 'front' },
      { type: 'paperLantern', x: 12 * T, y: groundAt(12), layer: 'front' },
      { type: 'paperLantern', x: 36 * T, y: groundAt(36), layer: 'front' },
      { type: 'paperLantern', x: 58 * T, y: groundAt(58), layer: 'front' },
      { type: 'lanternString', x: 15 * T, y: 6 * T, length: 9 * T, layer: 'back' },
      { type: 'lanternString', x: 47 * T, y: 7 * T, length: 8 * T, layer: 'back' },
      { type: 'spiritFlame', x: 31 * T, y: 15 * T, layer: 'front' },
      { type: 'skullPile', x: 26 * T, y: groundAt(26), layer: 'front' },

      { type: 'skullPile', x: 64 * T, y: groundAt(64), layer: 'front' },
    ];

    // 万圣夜的南瓜灯：从山脚一路点到南瓜鸟居。
    decorations.push(
      ...[5, 20, 33, 49, 57, 68].map((tileX) => ({
        type: 'jackOLantern',
        x: tileX * T,
        y: groundAt(tileX),
        variant: tileX % 3,
        layer: 'front',
      })),
    );
    decorations.push({ type: 'candyBucket', x: 61 * T, y: groundAt(61), layer: 'front' });

    return {
      width,
      height,
      rows,
      spawn: { x: 2 * T + 3, y: groundAt(2) - PLAYER.HEIGHT },
      goalX: 73 * T,
      goalY: 14 * T,
      decorations,
      pickups: [],
      devices: [
        makeMaskDevice(
          'parade-1-mask-franken',
          9 * T,
          groundAt(9),
          ['franken'],
          '敲响石鼓，请科学怪人同行',
        ),
      ],
      fieldZones: [],
      electrons: [],
      hazards: [
        { type: 'miasma', x: 30 * T, y: 16 * T, w: 1 * T, h: 2 * T },
        { type: 'miasma', x: 55 * T, y: 16 * T, w: 4 * T, h: 2 * T },
      ],
      checkpoints: [
        makeCheckpoint(24 * T, groundAt(24) - PLAYER.HEIGHT, '山腰的第一块平石'),
        makeCheckpoint(43 * T, groundAt(43) - PLAYER.HEIGHT, '裂石壁前'),
        makeCheckpoint(62 * T, groundAt(62) - PLAYER.HEIGHT, '木桥之后'),
      ],
      waterZones: [],
      party: chapter.party,
      tutorialSteps: [],
    };
  }

  /** 第二段 · 雾町 · 纸灯巷：屋檐上的高空路与地面的雾巷，在终点前重新并拢。 */
  buildParadeTwo(chapter) {
    const width = 82;
    const height = 22;
    const groundRow = 18;
    const rows = makeGrid(width, height);
    paint(rows, 0, groundRow, width, 2, '#');

    // 上屋檐的六级石阶
    paint(rows, 10, 17, 1, 1, 'B');
    paint(rows, 11, 16, 1, 1, 'B');
    paint(rows, 12, 15, 1, 1, 'B');
    paint(rows, 13, 14, 1, 1, 'B');
    paint(rows, 14, 13, 6, 5, 'B');

    // 屋顶上的单向木板：床单幽灵跳得上去，别的脚会从下面穿过去落到雾巷
    paint(rows, 22, 10, 9, 1, 'P');
    paint(rows, 33, 10, 8, 1, 'P');
    paint(rows, 43, 10, 5, 1, 'P');
    paint(rows, 49, 13, 4, 1, 'P');

    // 雾巷里的几只木箱
    paint(rows, 26, 17, 2, 1, 'B');
    paint(rows, 36, 17, 2, 1, 'B');
    paint(rows, 54, 17, 2, 1, 'B');

    // 巷尾的断口
    paint(rows, 58, 18, 1, 2, '.');

    // 终点前的高台与石阶
    paint(rows, 63, 17, 1, 1, 'B');
    paint(rows, 64, 16, 3, 2, 'B');
    paint(rows, 67, 15, 6, 3, 'B');

    const groundAt = (tileX) => surfaceAt(rows, width, height, tileX);
    const decorations = [
      { type: 'torii', x: 3 * T, y: groundAt(3), layer: 'back' },
      { type: 'torii', x: 69 * T, y: groundAt(69), layer: 'back' },
      { type: 'bamboo', x: 8 * T, y: groundAt(8), scale: 0.9, layer: 'back' },
      { type: 'bamboo', x: 45 * T, y: groundAt(45), scale: 1.1, layer: 'back' },
      { type: 'tree', x: 32 * T, y: groundAt(32), scale: 0.8, layer: 'back' },
      { type: 'tree', x: 75 * T, y: groundAt(75), scale: 0.95, layer: 'back' },
      { type: 'paperLantern', x: 16 * T, y: groundAt(16), layer: 'front' },
      { type: 'paperLantern', x: 31 * T, y: groundAt(31), layer: 'front' },
      { type: 'paperLantern', x: 50 * T, y: groundAt(50), layer: 'front' },
      { type: 'paperLantern', x: 61 * T, y: groundAt(61), layer: 'front' },
      { type: 'stoneLantern', x: 23 * T, y: groundAt(23), layer: 'front' },
      { type: 'stoneLantern', x: 57 * T, y: groundAt(57), layer: 'front' },
      { type: 'lanternString', x: 19 * T, y: 7 * T, length: 10 * T, layer: 'back' },
      { type: 'lanternString', x: 40 * T, y: 6 * T, length: 11 * T, layer: 'back' },
      { type: 'lanternString', x: 52 * T, y: 8 * T, length: 8 * T, layer: 'back' },
      { type: 'spiritFlame', x: 59 * T, y: 17 * T, layer: 'front' },

      { type: 'skullPile', x: 28 * T, y: groundAt(28), layer: 'front' },
    ];

    decorations.push(
      ...[4, 20, 32, 47, 53, 66, 74].map((tileX) => ({
        type: 'jackOLantern',
        x: tileX * T,
        y: groundAt(tileX),
        variant: tileX % 3,
        layer: 'front',
      })),
    );
    decorations.push({ type: 'candyBucket', x: 62 * T, y: groundAt(62), layer: 'front' });

    return {
      width,
      height,
      rows,
      spawn: { x: 2 * T + 3, y: groundAt(2) - PLAYER.HEIGHT },
      goalX: 78 * T,
      goalY: 18 * T,
      decorations,
      pickups: [],
      devices: [
        makeMaskDevice(
          'parade-2-mask-sheet',
          6 * T,
          groundAt(6),
          ['sheet'],
          '摇响纸铃，请床单幽灵同行',
        ),
      ],
      fieldZones: [],
      electrons: [],
      hazards: [
        { type: 'miasma', x: 58 * T, y: 18 * T, w: 1 * T, h: 2 * T },
      ],
      checkpoints: [
        makeCheckpoint(30 * T, groundAt(30) - PLAYER.HEIGHT, '雾巷中段'),
        makeCheckpoint(56 * T, groundAt(56) - PLAYER.HEIGHT, '巷尾断口前'),
      ],
      waterZones: [],
      party: chapter.party,
      tutorialSteps: [],
    };
  }

  /** 第三段 · 雨川 · 三之渡：深潭、气泡柱与被水淹掉的石桥。 */
  buildParadeThree(chapter) {
    const width = 92;
    const height = 24;
    const groundRow = 16;
    const rows = makeGrid(width, height);
    paint(rows, 0, groundRow, width, height - groundRow, '#');

    // 第一条雨川：四格深的雨潭。出口是一列沉在水下的石阶，
    // 不会游水的脚要顺着石阶一级级往上爬。
    paint(rows, 18, 16, 17, 4, '.');
    paint(rows, 18, 20, 14, 1, 'B'); // 河床铺石，不在水下长草
    paint(rows, 32, 16, 1, 3, '.'); // 台阶顶在 row19
    paint(rows, 33, 16, 1, 2, '.'); // 台阶顶在 row18
    paint(rows, 34, 16, 1, 1, '.'); // 台阶顶在 row17

    // 两岸之间的断口与窄桥
    paint(rows, 40, 16, 2, 2, '.');
    paint(rows, 40, 15, 2, 1, 'P');

    // 三格高的裂石壁
    paint(rows, 44, 13, 2, 3, 'C');

    // 第二条雨川：五格深的急流。河面上压着一段四格厚的废石桥，
    // 桥顶高得跳不上去，只能从水面下钻过去。
    paint(rows, 48, 16, 34, 5, '.');
    paint(rows, 48, 21, 34, 1, 'B'); // 河床铺石
    paint(rows, 56, 12, 11, 4, 'B');

    // 出口的水下石阶：从河床一直抬到水面
    paint(rows, 78, 20, 1, 4, 'B');
    paint(rows, 79, 19, 1, 5, 'B');
    paint(rows, 80, 18, 1, 6, 'B');
    paint(rows, 81, 17, 1, 7, 'B');

    const groundAt = (tileX) => surfaceAt(rows, width, height, tileX);
    const decorations = [
      { type: 'torii', x: 4 * T, y: groundAt(4), layer: 'back' },
      { type: 'torii', x: 46 * T, y: groundAt(46), layer: 'back' },
      { type: 'torii', x: 86 * T, y: groundAt(86), layer: 'back' },
      { type: 'bamboo', x: 12 * T, y: groundAt(12), scale: 0.9, layer: 'back' },
      { type: 'bamboo', x: 88 * T, y: groundAt(88), scale: 1.05, layer: 'back' },
      { type: 'tree', x: 38 * T, y: groundAt(38), scale: 0.85, layer: 'back' },
      { type: 'tree', x: 90 * T, y: groundAt(90), scale: 0.8, layer: 'back' },
      { type: 'stoneLantern', x: 13 * T, y: groundAt(13), layer: 'front' },
      { type: 'stoneLantern', x: 43 * T, y: groundAt(43), layer: 'front' },
      { type: 'stoneLantern', x: 86 * T, y: groundAt(86), layer: 'front' },
      { type: 'paperLantern', x: 8 * T, y: groundAt(8), layer: 'front' },
      { type: 'paperLantern', x: 37 * T, y: groundAt(37), layer: 'front' },
      { type: 'paperLantern', x: 84 * T, y: groundAt(84), layer: 'front' },
      { type: 'lanternString', x: 21 * T, y: 5 * T, length: 8 * T, layer: 'back' },
      { type: 'lanternString', x: 49 * T, y: 6 * T, length: 10 * T, layer: 'back' },
      { type: 'lanternString', x: 68 * T, y: 7 * T, length: 10 * T, layer: 'back' },
      { type: 'spiritFlame', x: 42 * T, y: 15 * T, layer: 'front' },
      { type: 'skullPile', x: 16 * T, y: groundAt(16), layer: 'front' },
      { type: 'skullPile', x: 84 * T, y: groundAt(84), layer: 'front' },
    ];

    decorations.push(
      ...[5, 16, 37, 43, 46, 84, 89].map((tileX) => ({
        type: 'jackOLantern',
        x: tileX * T,
        y: groundAt(tileX),
        variant: tileX % 3,
        layer: 'front',
      })),
    );
    decorations.push({ type: 'candyBucket', x: 85 * T, y: groundAt(85), layer: 'front' });

    return {
      width,
      height,
      rows,
      spawn: { x: 2 * T + 3, y: groundAt(2) - PLAYER.HEIGHT },
      goalX: 88 * T,
      goalY: 16 * T,
      decorations,
      pickups: [],
      devices: [
        makeMaskDevice(
          'parade-3-mask-swamp',
          8 * T,
          groundAt(8),
          ['swamp'],
          '朝河里拍三下手，请沼泽怪同行',
        ),
      ],
      fieldZones: [],
      electrons: [],
      hazards: [
        { type: 'miasma', x: 40 * T, y: 16 * T, w: 2 * T, h: 2 * T },
      ],
      checkpoints: [
        makeCheckpoint(14 * T, groundAt(14) - PLAYER.HEIGHT, '第一条雨川前'),
        makeCheckpoint(37 * T, groundAt(37) - PLAYER.HEIGHT, '第一条雨川后'),
        makeCheckpoint(43 * T, groundAt(43) - PLAYER.HEIGHT, '裂石壁前'),
        makeCheckpoint(47 * T, groundAt(47) - PLAYER.HEIGHT, '第二条雨川前'),
        makeCheckpoint(84 * T, groundAt(84) - PLAYER.HEIGHT, '第二条雨川后'),
      ],
      waterZones: [
        makeWater('parade-3-water-a', 18 * T, 16 * T, 17 * T, 5 * T, -26, '雨川·深潭'),
        makeWater(
          'parade-3-water-b',
          48 * T,
          16 * T,
          23 * T,
          6 * T,
          -34,
          '雨川·急流',
          { surfaceCurrentX: -150 },
        ),
        makeWater('parade-3-water-c', 71 * T, 16 * T, 11 * T, 6 * T, -20, '雨川·回水'),
      ],
      updrafts: [
        makeUpdraft('parade-3-bubble-a', 27 * T, 16 * T, 2 * T, 4 * T, -920, -190),
        makeUpdraft('parade-3-bubble-b', 73 * T, 16 * T, 2 * T, 5 * T, -980, -200),
      ],
      party: chapter.party,
      tutorialSteps: [],
    };
  }

  /** 第四段 · 废寺 · 四之庭：五个身体，积水、石梁和两面裂石壁。 */
  buildParadeFour(chapter) {
    const width = 96;
    const height = 26;
    const groundRow = 22;
    const rows = makeGrid(width, height);
    paint(rows, 0, groundRow, width, height - groundRow, '#');

    // 第一面裂石壁
    paint(rows, 16, 19, 2, 3, 'C');

    // 瘴气坑
    paint(rows, 22, 22, 1, 2, '.');

    // 废寺前的积水：三格深，水面上压着一段塌下来的石梁，
    // 只能从水下钻过去；出口有一道气泡柱把人托回水面。
    paint(rows, 30, 22, 14, 3, '.');
    paint(rows, 30, 25, 14, 1, 'B'); // 池底铺石
    paint(rows, 34, 18, 4, 4, 'B');
    paint(rows, 41, 24, 1, 2, 'B');
    paint(rows, 42, 23, 1, 3, 'B');
    paint(rows, 43, 22, 1, 4, 'B');

    // 石阶前的瘴气沟：三格宽，只留一条窄木板
    paint(rows, 44, 22, 3, 2, '.');
    paint(rows, 44, 21, 3, 1, 'P');

    // 七级石阶，每一级只抬一格：科学怪人也能一级一级上来。
    // 台阶彼此相连，落脚不会掉回地面；难度来自队伍的长度，而不是像素级跳跃。
    const steps = [
      [47, 21],
      [53, 20],
      [59, 19],
      [65, 18],
      [71, 17],
      [77, 16],
      [83, 15],
    ];
    for (const [x, topRow] of steps) {
      paint(rows, x, topRow, 6, height - topRow, 'B');
    }

    // 半山腰的第三面裂石壁，正好压在石阶上
    paint(rows, 65, 15, 2, 3, 'C');

    // 最高处的平台与最后一面裂石壁，门就在它后面
    paint(rows, 89, 15, 7, height - 15, 'B');
    paint(rows, 90, 12, 2, 3, 'C');

    const groundAt = (tileX) => surfaceAt(rows, width, height, tileX);
    const decorations = [
      { type: 'torii', x: 2 * T, y: groundAt(2), layer: 'back' },
      { type: 'torii', x: 20 * T, y: groundAt(20), layer: 'back' },
      { type: 'torii', x: 48 * T, y: groundAt(48), layer: 'back' },
      { type: 'torii', x: 86 * T, y: groundAt(86), layer: 'back' },
      { type: 'bamboo', x: 8 * T, y: groundAt(8), scale: 1.1, layer: 'back' },
      { type: 'bamboo', x: 26 * T, y: groundAt(26), scale: 0.9, layer: 'back' },
      { type: 'bamboo', x: 78 * T, y: groundAt(78), scale: 1.0, layer: 'back' },
      { type: 'tree', x: 13 * T, y: groundAt(13), scale: 0.95, layer: 'back' },
      { type: 'tree', x: 92 * T, y: groundAt(92), scale: 0.8, layer: 'back' },
      { type: 'stoneLantern', x: 7 * T, y: groundAt(7), layer: 'front' },
      { type: 'stoneLantern', x: 28 * T, y: groundAt(28), layer: 'front' },
      { type: 'stoneLantern', x: 47 * T, y: groundAt(47), layer: 'front' },
      { type: 'stoneLantern', x: 85 * T, y: groundAt(85), layer: 'front' },
      { type: 'paperLantern', x: 11 * T, y: groundAt(11), layer: 'front' },
      { type: 'paperLantern', x: 25 * T, y: groundAt(25), layer: 'front' },
      { type: 'paperLantern', x: 62 * T, y: groundAt(62), layer: 'front' },
      { type: 'paperLantern', x: 88 * T, y: groundAt(88), layer: 'front' },
      { type: 'lanternString', x: 4 * T, y: 8 * T, length: 12 * T, layer: 'back' },
      { type: 'lanternString', x: 30 * T, y: 9 * T, length: 14 * T, layer: 'back' },
      { type: 'lanternString', x: 58 * T, y: 7 * T, length: 12 * T, layer: 'back' },
      { type: 'lanternString', x: 80 * T, y: 6 * T, length: 10 * T, layer: 'back' },
      { type: 'spiritFlame', x: 23 * T, y: 21 * T, layer: 'front' },
      { type: 'spiritFlame', x: 49 * T, y: 20 * T, layer: 'front' },
      { type: 'skullPile', x: 18 * T, y: groundAt(18), layer: 'front' },

      { type: 'skullPile', x: 74 * T, y: groundAt(74), layer: 'front' },
    ];

    decorations.push(
      ...[3, 18, 27, 43, 47, 60, 75, 87].map((tileX) => ({
        type: 'jackOLantern',
        x: tileX * T,
        y: groundAt(tileX),
        variant: tileX % 3,
        layer: 'front',
      })),
    );
    decorations.push({ type: 'candyBucket', x: 48 * T, y: groundAt(48), layer: 'front' });

    return {
      width,
      height,
      rows,
      spawn: { x: 2 * T + 3, y: groundAt(2) - PLAYER.HEIGHT },
      goalX: 94 * T,
      goalY: 15 * T,
      decorations,
      pickups: [],
      devices: [
        makeMaskDevice(
          'parade-4-mask-bat',
          5 * T,
          groundAt(5),
          ['bat'],
          '在檐下摇铃，请蝙蝠同行',
        ),
        makeMaskDevice(
          'parade-4-mask-mummy',
          20 * T,
          groundAt(20),
          ['mummy'],
          '拍了拍石棺，请木乃伊同行',
        ),
      ],
      fieldZones: [],
      electrons: [],
      hazards: [
        { type: 'miasma', x: 22 * T, y: 22 * T, w: 1 * T, h: 2 * T },
        { type: 'miasma', x: 44 * T, y: 22 * T, w: 3 * T, h: 2 * T },
      ],
      checkpoints: [
        makeCheckpoint(14 * T, groundAt(14) - PLAYER.HEIGHT, '第一面石壁前'),
        makeCheckpoint(20 * T, groundAt(20) - PLAYER.HEIGHT, '瘴气坑前'),
        makeCheckpoint(28 * T, groundAt(28) - PLAYER.HEIGHT, '积水前'),
        makeCheckpoint(43 * T, groundAt(43) - PLAYER.HEIGHT, '积水之后'),
        makeCheckpoint(62 * T, groundAt(62) - PLAYER.HEIGHT, '第三面石壁前'),
        makeCheckpoint(85 * T, groundAt(85) - PLAYER.HEIGHT, '最高的石阶'),
      ],
      waterZones: [
        makeWater('parade-4-water', 30 * T, 22 * T, 13 * T, 4 * T, -12, '废寺积水'),
      ],
      updrafts: [
        makeUpdraft('parade-4-bubble', 38 * T, 22 * T, 2 * T, 3 * T, -900, -185),
      ],
      party: chapter.party,
      tutorialSteps: [],
    };
  }

  /** 第五段 · 墓园 · 五之冢：七个身体，屋顶、墓穴积水和长阶。 */
  buildParadeFive(chapter) {
    const width = 112;
    const height = 28;
    const groundRow = 22;
    const rows = makeGrid(width, height);
    paint(rows, 0, groundRow, width, height - groundRow, '#');

    // 通向墓园屋顶的六级石台：床单幽灵会顺着它跳上高空木板路
    const roofSteps = [
      [18, 21],
      [20, 20],
      [22, 19],
      [24, 18],
      [26, 17],
      [28, 16],
    ];
    for (const [x, topRow] of roofSteps) {
      paint(rows, x, topRow, 2, 1, 'B');
    }
    paint(rows, 30, 13, 9, 1, 'P');

    // 低处：瘴气坑、窄木板与第一面裂石壁
    paint(rows, 31, 22, 3, 2, '.');
    paint(rows, 31, 21, 3, 1, 'P');
    paint(rows, 35, 19, 2, 3, 'C');

    // 墓穴积水：五格深，石梁压在水面上，出口是沉在水下的石阶
    paint(rows, 44, 22, 20, 5, '.');
    paint(rows, 44, 27, 20, 1, 'B');
    paint(rows, 50, 18, 6, 4, 'B');
    paint(rows, 60, 26, 1, 2, 'B');
    paint(rows, 61, 25, 1, 3, 'B');
    paint(rows, 62, 24, 1, 4, 'B');
    paint(rows, 63, 23, 1, 5, 'B');

    // 第二面裂石壁与石阶前的瘴气沟
    paint(rows, 72, 19, 2, 3, 'C');
    paint(rows, 77, 22, 3, 2, '.');
    paint(rows, 77, 21, 3, 1, 'P');

    // 通往五之冢的长阶
    const steps = [
      [82, 21],
      [88, 20],
      [94, 19],
      [100, 18],
    ];
    for (const [x, topRow] of steps) {
      paint(rows, x, topRow, 6, height - topRow, 'B');
    }
    // 石阶上的第三面裂石壁
    paint(rows, 96, 16, 2, 3, 'C');
    // 最高平台
    paint(rows, 106, 17, 6, height - 17, 'B');

    const groundAt = (tileX) => surfaceAt(rows, width, height, tileX);
    const decorations = [
      { type: 'torii', x: 2 * T, y: groundAt(2), layer: 'back' },
      { type: 'torii', x: 41 * T, y: groundAt(41), layer: 'back' },
      { type: 'torii', x: 104 * T, y: groundAt(104), layer: 'back' },
      { type: 'tree', x: 12 * T, y: groundAt(12), scale: 0.9, layer: 'back' },
      { type: 'tree', x: 68 * T, y: groundAt(68), scale: 0.95, layer: 'back' },
      { type: 'bamboo', x: 17 * T, y: groundAt(17), scale: 0.95, layer: 'back' },
      { type: 'bamboo', x: 86 * T, y: groundAt(86), scale: 1.05, layer: 'back' },
      { type: 'fence', x: 11 * T, y: groundAt(11), layer: 'back' },
      { type: 'fence', x: 38 * T, y: groundAt(38), layer: 'back' },
      { type: 'fence', x: 67 * T, y: groundAt(67), layer: 'back' },
      { type: 'stoneLantern', x: 8 * T, y: groundAt(8), layer: 'front' },
      { type: 'stoneLantern', x: 43 * T, y: groundAt(43), layer: 'front' },
      { type: 'stoneLantern', x: 80 * T, y: groundAt(80), layer: 'front' },
      { type: 'stoneLantern', x: 107 * T, y: groundAt(107), layer: 'front' },
      { type: 'paperLantern', x: 15 * T, y: groundAt(15), layer: 'front' },
      { type: 'paperLantern', x: 39 * T, y: groundAt(39), layer: 'front' },
      { type: 'paperLantern', x: 66 * T, y: groundAt(66), layer: 'front' },
      { type: 'paperLantern', x: 84 * T, y: groundAt(84), layer: 'front' },
      { type: 'lanternString', x: 22 * T, y: 6 * T, length: 10 * T, layer: 'back' },
      { type: 'lanternString', x: 50 * T, y: 7 * T, length: 12 * T, layer: 'back' },
      { type: 'lanternString', x: 90 * T, y: 8 * T, length: 10 * T, layer: 'back' },
      { type: 'skullPile', x: 14 * T, y: groundAt(14), layer: 'front' },
      { type: 'skullPile', x: 69 * T, y: groundAt(69), layer: 'front' },
      { type: 'spiritFlame', x: 39 * T, y: 22 * T, layer: 'front' },
      { type: 'candle', x: 5 * T, y: groundAt(5), lit: true, layer: 'front' },
      { type: 'candle', x: 40 * T, y: groundAt(40), lit: true, layer: 'front' },
      { type: 'candle', x: 66 * T, y: groundAt(66), lit: true, layer: 'front' },
      ...[5, 9, 13, 16, 39, 66, 68, 70, 75, 101].map((tileX, index) => ({
        type: 'grave',
        x: tileX * T,
        y: groundAt(tileX),
        variant: index % 3,
        layer: index % 2 === 0 ? 'back' : 'front',
      })),
    ];

    decorations.push(
      ...[6, 16, 40, 65, 80, 107].map((tileX) => ({
        type: 'jackOLantern',
        x: tileX * T,
        y: groundAt(tileX),
        variant: tileX % 3,
        layer: 'front',
      })),
    );
    decorations.push({ type: 'candyBucket', x: 65 * T, y: groundAt(65), layer: 'front' });

    return {
      width,
      height,
      rows,
      spawn: { x: 2 * T + 3, y: groundAt(2) - PLAYER.HEIGHT },
      goalX: 109 * T,
      goalY: 17 * T,
      decorations,
      pickups: [],
      devices: [
        makeMaskDevice(
          'parade-5-mask-skeletons',
          7 * T,
          groundAt(7),
          ['boneA', 'boneB'],
          '敲响石鼓，请两只骷髅一起同行',
        ),
        makeMaskDevice(
          'parade-5-mask-wolf',
          65 * T,
          groundAt(65),
          ['wolf'],
          '对着月亮长嚎，请狼人同行',
        ),
      ],
      fieldZones: [],
      electrons: [],
      hazards: [
        { type: 'miasma', x: 31 * T, y: 22 * T, w: 3 * T, h: 2 * T },
        { type: 'miasma', x: 77 * T, y: 22 * T, w: 3 * T, h: 2 * T },
      ],
      checkpoints: [
        makeCheckpoint(14 * T, groundAt(14) - PLAYER.HEIGHT, '墓园入口'),
        makeCheckpoint(30 * T, groundAt(30) - PLAYER.HEIGHT, '瘴气坑前'),
        makeCheckpoint(40 * T, groundAt(40) - PLAYER.HEIGHT, '第一面石壁后'),
        makeCheckpoint(43 * T, groundAt(43) - PLAYER.HEIGHT, '墓穴积水前'),
        makeCheckpoint(64 * T, groundAt(64) - PLAYER.HEIGHT, '积水之后'),
        makeCheckpoint(80 * T, groundAt(80) - PLAYER.HEIGHT, '长阶前'),
        makeCheckpoint(92 * T, groundAt(92) - PLAYER.HEIGHT, '第三面石壁前'),
        makeCheckpoint(106 * T, groundAt(106) - PLAYER.HEIGHT, '五之冢前'),
      ],
      waterZones: [
        makeWater('parade-5-water', 44 * T, 22 * T, 20 * T, 6 * T, -20, '墓穴积水'),
      ],
      updrafts: [
        makeUpdraft('parade-5-bubble', 57 * T, 22 * T, 2 * T, 5 * T, -920, -190),
      ],
      party: chapter.party,
      tutorialSteps: [],
    };
  }

  /** 第六段 · 钟楼 · 百鬼门：八个身体，最后一程。 */
  buildParadeSix(chapter) {
    const width = 126;
    const height = 36;
    const groundRow = 30;
    const rows = makeGrid(width, height);
    paint(rows, 0, groundRow, width, height - groundRow, '#');

    // 钟楼底层的水井：四格深，出口是石阶和气泡柱
    paint(rows, 19, 30, 10, 4, '.');
    paint(rows, 19, 34, 10, 1, 'B');
    paint(rows, 26, 33, 1, 2, 'B');
    paint(rows, 27, 32, 1, 3, 'B');
    paint(rows, 28, 31, 1, 4, 'B');

    // 主楼梯：一圈一圈往上盘
    const steps = [
      [37, 29],
      [43, 28],
      [49, 27],
      [55, 26],
      [61, 25],
      [67, 24],
    ];
    for (const [x, topRow] of steps) {
      paint(rows, x, topRow, 6, height - topRow, 'B');
    }
    paint(rows, 45, 25, 2, 3, 'C');

    // 上层起飞台：一级一级的单向石台，通往滑翔缺口
    paint(rows, 73, 23, 4, 1, 'B');
    paint(rows, 77, 22, 4, 1, 'B');
    paint(rows, 81, 21, 4, 1, 'B');
    paint(rows, 85, 20, 4, 1, 'B');

    // 下层长梯：断口、裂石和滑翔缺口下的水潭
    paint(rows, 73, 28, 6, 1, 'B');
    paint(rows, 79, 27, 3, 1, 'P');
    paint(rows, 82, 28, 6, 1, 'B');
    paint(rows, 84, 25, 2, 3, 'C');
    paint(rows, 88, 28, 4, 1, 'B');
    paint(rows, 92, 27, 3, 1, 'P');
    paint(rows, 95, 28, 8, 1, 'B');
    paint(rows, 103, 27, 1, 1, 'B');
    paint(rows, 104, 26, 1, 1, 'B');
    paint(rows, 105, 25, 1, 1, 'B');
    paint(rows, 103, 24, 6, 1, 'B');

    // 滑翔缺口下的水潭：掉下去也能游回来
    paint(rows, 89, 30, 14, 4, '.');
    paint(rows, 89, 34, 14, 1, 'B');

    // 最后一段塔阶与百鬼门
    paint(rows, 109, 23, 6, height - 23, 'B');
    paint(rows, 115, 22, 6, height - 22, 'B');
    paint(rows, 121, 21, 5, height - 21, 'B');
    paint(rows, 111, 20, 2, 3, 'C');
    paint(rows, 117, 22, 3, 2, '.');
    paint(rows, 117, 21, 3, 1, 'P');

    const groundAt = (tileX) => surfaceAt(rows, width, height, tileX);
    const decorations = [
      { type: 'torii', x: 2 * T, y: groundAt(2), layer: 'back' },
      { type: 'torii', x: 40 * T, y: groundAt(40), layer: 'back' },
      { type: 'torii', x: 61 * T, y: groundAt(61), layer: 'back' },
      { type: 'torii', x: 122 * T, y: groundAt(122), layer: 'back' },
      { type: 'lamp', x: 10 * T, y: groundAt(10), layer: 'front' },
      { type: 'lamp', x: 33 * T, y: groundAt(33), layer: 'front' },
      { type: 'lamp', x: 58 * T, y: groundAt(58), layer: 'front' },
      { type: 'lamp', x: 75 * T, y: groundAt(75), layer: 'front' },
      { type: 'lamp', x: 110 * T, y: groundAt(110), layer: 'front' },
      { type: 'stoneLantern', x: 7 * T, y: groundAt(7), layer: 'front' },
      { type: 'stoneLantern', x: 30 * T, y: groundAt(30), layer: 'front' },
      { type: 'stoneLantern', x: 70 * T, y: groundAt(70), layer: 'front' },
      { type: 'stoneLantern', x: 104 * T, y: groundAt(104), layer: 'front' },
      { type: 'paperLantern', x: 15 * T, y: groundAt(15), layer: 'front' },
      { type: 'paperLantern', x: 36 * T, y: groundAt(36), layer: 'front' },
      { type: 'paperLantern', x: 63 * T, y: groundAt(63), layer: 'front' },
      { type: 'paperLantern', x: 82 * T, y: groundAt(82), layer: 'front' },
      { type: 'paperLantern', x: 107 * T, y: groundAt(107), layer: 'front' },
      { type: 'lanternString', x: 20 * T, y: 6 * T, length: 12 * T, layer: 'back' },
      { type: 'lanternString', x: 60 * T, y: 8 * T, length: 12 * T, layer: 'back' },
      { type: 'lanternString', x: 95 * T, y: 10 * T, length: 12 * T, layer: 'back' },
      { type: 'lanternString', x: 115 * T, y: 12 * T, length: 10 * T, layer: 'back' },
      { type: 'chain', x: 34 * T, y: 4 * T, length: 10 * T, layer: 'back' },
      { type: 'chain', x: 78 * T, y: 4 * T, length: 12 * T, layer: 'back' },
      { type: 'skullPile', x: 14 * T, y: groundAt(14), layer: 'front' },
      { type: 'skullPile', x: 35 * T, y: groundAt(35), layer: 'front' },
      { type: 'skullPile', x: 72 * T, y: groundAt(72), layer: 'front' },
      { type: 'candle', x: 6 * T, y: groundAt(6), lit: true, layer: 'front' },
      { type: 'candle', x: 30 * T, y: groundAt(30), lit: true, layer: 'front' },
      { type: 'candle', x: 104 * T, y: groundAt(104), lit: true, layer: 'front' },
    ];

    decorations.push(
      ...[6, 32, 58, 70, 106, 122].map((tileX) => ({
        type: 'jackOLantern',
        x: tileX * T,
        y: groundAt(tileX),
        variant: tileX % 3,
        layer: 'front',
      })),
    );
    decorations.push({ type: 'candyBucket', x: 106 * T, y: groundAt(106), layer: 'front' });

    return {
      width,
      height,
      rows,
      spawn: { x: 2 * T + 3, y: groundAt(2) - PLAYER.HEIGHT },
      goalX: 124 * T,
      goalY: 21 * T,
      decorations,
      pickups: [],
      devices: [
        makeMaskDevice(
          'parade-6-mask-witch',
          7 * T,
          groundAt(7),
          ['witch'],
          '在钟楼下摇铃，请女巫同行',
        ),
        makeMaskDevice(
          'parade-6-mask-cat',
          31 * T,
          groundAt(31),
          ['cat'],
          '敲敲井沿，请黑猫同行',
        ),
      ],
      fieldZones: [],
      electrons: [],
      hazards: [
        { type: 'miasma', x: 73 * T, y: 28 * T, w: 16 * T, h: 2 * T },
        { type: 'miasma', x: 117 * T, y: 22 * T, w: 3 * T, h: 2 * T },
      ],
      checkpoints: [
        makeCheckpoint(14 * T, groundAt(14) - PLAYER.HEIGHT, '钟楼底层'),
        makeCheckpoint(30 * T, groundAt(30) - PLAYER.HEIGHT, '水井之后'),
        makeCheckpoint(58 * T, groundAt(58) - PLAYER.HEIGHT, '中段石阶'),
        makeCheckpoint(70 * T, groundAt(70) - PLAYER.HEIGHT, '起飞台前'),
        makeCheckpoint(88 * T, groundAt(88) - PLAYER.HEIGHT, '下层长梯'),
        makeCheckpoint(104 * T, groundAt(104) - PLAYER.HEIGHT, '滑翔落点'),
        makeCheckpoint(116 * T, groundAt(116) - PLAYER.HEIGHT, '百鬼门前'),
      ],
      waterZones: [
        makeWater('parade-6-well', 19 * T, 30 * T, 10 * T, 5 * T, -10, '钟楼水井'),
        makeWater('parade-6-pool', 89 * T, 30 * T, 14 * T, 5 * T, 0, '钟楼水潭'),
      ],
      updrafts: [
        makeUpdraft('parade-6-well-bubble', 24 * T, 30 * T, 2 * T, 4 * T, -920, -190),
        makeUpdraft('parade-6-pool-bubble', 94 * T, 30 * T, 2 * T, 4 * T, -920, -190),
      ],
      party: chapter.party,
      tutorialSteps: [],
    };
  }

  getTotalBones() {
    return this.pickups.filter((pickup) => isBone(pickup.type)).length;
  }

  getTotalCandies() {
    return this.pickups.filter((pickup) => isCandy(pickup.type)).length;
  }

  getTile(col, row) {
    if (col < 0 || col >= this.width) return '#';
    if (row < 0) return '.';
    if (row >= this.height) return '#';
    return this.tiles[row][col];
  }

  isSolid(col, row) {
    const tile = this.getTile(col, row);
    return (
      tile === '#' ||
      tile === 'B' ||
      tile === 'C' ||
      tile === 'G' ||
      // 鬼鬼祟祟的铁门上方那层看不见的符障：挡跳跃，不挡视线以外的路。
      tile === 'g' ||
      tile === 'S'
    );
  }

  isOneWay(col, row) {
    return this.getTile(col, row) === 'P';
  }

  isSolidAtPixel(x, y) {
    return this.isSolid(Math.floor(x / T), Math.floor(y / T));
  }

  /**
   * 裂石（'C'）的整列垮塌。科学怪人撞到其中一格时，会把同一列里上下相连的
   * 裂石一起撞掉。返回被撞掉的矩形，供 Game 生成碎屑。
   */
  breakColumn(col, row) {
    if (col < 0 || col >= this.width || row < 0 || row >= this.height) return null;
    if (this.getTile(col, row) !== 'C') return null;

    let top = row;
    while (top - 1 >= 0 && this.tiles[top - 1][col] === 'C') top -= 1;
    let bottom = row;
    while (bottom + 1 < this.height && this.tiles[bottom + 1][col] === 'C') bottom += 1;

    for (let r = top; r <= bottom; r += 1) this.tiles[r][col] = '.';
    return {
      x: col * T,
      y: top * T,
      w: T,
      h: (bottom - top + 1) * T,
    };
  }

  /** 玩家中心是否在某一处水里。水只改手感，不造成伤害。 */
  getWaterAt(x, y) {
    if (!this.waterZones?.length) return null;
    for (const zone of this.waterZones) {
      if (
        x >= zone.x &&
        x <= zone.x + zone.w &&
        y >= zone.y &&
        y <= zone.y + zone.h
      ) {
        return zone;
      }
    }
    return null;
  }

  /** 玩家中心是否在某一道气泡柱里。气泡只往上托，不造成伤害。 */
  getUpdraftAt(x, y) {
    if (!this.updrafts?.length) return null;
    for (const zone of this.updrafts) {
      if (
        x >= zone.x &&
        x <= zone.x + zone.w &&
        y >= zone.y &&
        y <= zone.y + zone.h
      ) {
        return zone;
      }
    }
    return null;
  }

  getFieldAt(x, y) {
    for (const field of this.fieldZones) {
      if (
        x >= field.x &&
        x <= field.x + field.w &&
        y >= field.y &&
        y <= field.y + field.h
      ) {
        return {
          ...field,
          balanced: this.isFieldBalanced(field),
        };
      }
    }
    return null;
  }

  /**
   * 速度选择器里的洛伦兹加速度（px/s²）。
   *
   * 屏幕坐标取 x 向右、y 向下、z 指向纸内，三者构成右手系，
   * 所以 F = q(E + v × B) 可以直接逐分量计算：
   *   v × B = (vy·Bz, −vx·Bz)
   *
   * E 竖直、B 垂直纸面，因此电场力只改竖直速度，磁场力同时改横竖：
   * 竖直速度产生的横向磁力会把偏离平衡的速度转成横向修正，
   * 悬浮轨迹因此始终由同一套场矢量决定。
   */
  getFieldAcceleration(field, charge, vx, vy) {
    if (!field || charge === 0) return { x: 0, y: 0 };

    const eY = field.e.dir === 'up' ? -field.e.mag : field.e.mag;
    const bZ = field.b.dir === 'in' ? field.b.mag : -field.b.mag;
    const vxMeters = vx / FIELD.pixelsPerMeter;
    const vyMeters = vy / FIELD.pixelsPerMeter;

    return {
      x: charge * vyMeters * bZ * FIELD.chargeToMass,
      y: charge * (eY - vxMeters * bZ) * FIELD.chargeToMass,
    };
  }

  isFieldBalanced(field) {
    return (
      (field.e.dir === 'down' && field.b.dir === 'in') ||
      (field.e.dir === 'up' && field.b.dir === 'out')
    );
  }

  getNearbyElectron(x, y) {
    let nearest = null;
    for (const electron of this.electrons) {
      const distance = Math.hypot(electron.x - x, electron.y - y);
      if (distance <= electron.radius && (!nearest || distance < nearest.distance)) {
        nearest = { ...electron, distance };
      }
    }
    return nearest;
  }

  /**
   * 所有孤立电子在 (x, y) 处对电荷 charge 的合加速度（px/s²）。
   * 电子带负电：正电荷沿电场线被吸引，负电荷逆电场线被排斥。
   * 多个电子按矢量叠加，避免 HUD 只依据“最近电子”而误报方向。
   */
  getElectronAcceleration(x, y, charge) {
    if (charge === 0) return { x: 0, y: 0 };

    let ax = 0;
    let ay = 0;
    for (const electron of this.electrons) {
      const dx = electron.x - x;
      const dy = electron.y - y;
      const distance = Math.hypot(dx, dy);
      if (distance <= 0 || distance > electron.radius) continue;

      const falloff = 1 - distance / electron.radius;
      const acceleration = Math.min(
        ELECTRON.maxAcceleration,
        electron.strength * falloff * falloff,
      );
      const polarity = charge < 0 ? -1 : 1;
      ax += polarity * (dx / distance) * acceleration;
      ay += polarity * (dy / distance) * acceleration;
    }
    return { x: ax, y: ay };
  }

  getNearbyDevice(box) {
    let closest = null;
    let closestDistance = Infinity;
    const centerX = box.x + box.w / 2;
    const centerY = box.y + box.h / 2;

    for (const device of this.devices) {
      const dx = device.x - centerX;
      const dy = device.y - 16 - centerY;
      const distance = Math.hypot(dx, dy);
      if (distance <= device.radius && distance < closestDistance) {
        closest = device;
        closestDistance = distance;
      }
    }
    return closest;
  }

  overlapsHazard(box) {
    for (const hazard of this.hazards) {
      // 深渊用 killY 判定坠落深度；其它危险仍按碰撞盒顶端。
      const triggerY = hazard.killY ?? hazard.y;
      if (
        box.x < hazard.x + hazard.w &&
        box.x + box.w > hazard.x &&
        box.y < hazard.y + hazard.h &&
        box.y + box.h > triggerY
      ) {
        return hazard;
      }
    }
    return null;
  }

  /** 改动一格地形。科学怪人撞墙和鬼鬼祟祟的门都用它。 */
  setTile(col, row, tile) {
    if (col < 0 || col >= this.width || row < 0 || row >= this.height) return;
    this.tiles[row][col] = tile;
  }

  /**
   * 石板门 / 影子桥的开关。
   * 铁门「active」= 放行（格子变空）；影子桥「active」= 桥存在（格子变实）。
   */
  setGateOpen(gate, active) {
    if (gate.kind === 'bridge') {
      const tile = active ? gate.char : '.';
      for (const { col, row } of gate.tiles) this.setTile(col, row, tile);
      return;
    }
    // 铁门的每一格可以有自己的字符：门洞里的格子是 'G'，
    // 一直顶到夜空的符障是 'g'，开门时两种一起消失。
    for (const cell of gate.tiles) {
      this.setTile(cell.col, cell.row, active ? '.' : cell.char ?? gate.char);
    }
  }

  /** 从地图顶部往下找第一块可站立面的上沿像素 y。 */
  surfaceYAt(x) {
    const col = Math.max(0, Math.min(this.width - 1, Math.floor(x / T)));
    for (let row = 0; row < this.height; row += 1) {
      if (this.isSolid(col, row)) return row * T;
    }
    return this.height * T;
  }

  isInShadow(x, y) {
    return this.shadowZones.some(
      (zone) =>
        x >= zone.x &&
        x <= zone.x + zone.w &&
        y >= zone.y &&
        y <= zone.y + zone.h,
    );
  }

  /** 守夜人的灯会被墙和关着的门挡住。 */
  hasLineOfSight(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / 6));
    for (let index = 1; index < steps; index += 1) {
      const x = x1 + (dx * index) / steps;
      const y = y1 + (dy * index) / steps;
      if (this.isSolidAtPixel(x, y)) return false;
    }
    return true;
  }
}
