import { ELECTRON, FIELD, PLAYER, VIEW } from './config.js';
import { getItemDef, isBone, isCandy } from './collectibles.js';
import {
  MEMORIAL_CHAPTERS,
  MEMORIAL_ROUTE,
  memorialStageFromTheme,
} from './memorial.js';
import { buildSneakData } from './sneakLevel.js';
import { correctTrayId, mappingTargets } from './setTheory.js';
import {
  PARADE_CHAPTERS,
  PARADE_ROUTE,
  getParadeTrack,
  paradeStageFromTheme,
} from './parade.js';
import { TRICK_HOUSES, TRICK_RACE, TRICK_ROUTE, getTrickRace } from './trickOrTreat.js';

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
    objective: '学会走路、跳跃、下穿、拾取、南瓜、背包和糖袋',
    brief: '没有危险。路上熟悉移动、背包和南瓜。',
    startTip: '欢迎来到月影小径。慢慢走就行。',
  },
  {
    id: 'merged',
    mode: 'journey',
    name: '电磁长夜',
    chapter: '真实旅程',
    difficulty: 3,
    style: 'cavern',
    mood: 'ritual',
    objective: '靠近孤立电子，再用速度选择器越过熔岩长井',
    brief: '地下的长厅，有静电场、速度选择器和右手骨机关。',
    startTip: '两颗铜球给你不同的电荷。先选一种，再往里走。',
  },
  // 追思线路「四盏灯」：前两段是墓园夜路；第三段是双人潜行；
  // 第四段沉入地下，走一条只保留铜球与电子场的简易电磁赛道。
  ...MEMORIAL_CHAPTERS.map((chapter) => ({
    id: chapter.levelId,
    mode: 'memorial',
    route: MEMORIAL_ROUTE.id,
    stage: chapter.stage,
    name: MEMORIAL_ROUTE.name,
    chapter: `${chapter.stageLabel} · ${chapter.patient}`,
    difficulty: 1,
    style: chapter.kind === 'insomnia' ? 'cavern' : 'forest',
    // 第三段沿用潜行场景的绘制：影子区、提灯人、石板门与影子桥。
    mood: chapter.mood ?? 'memorial',
    objective: chapter.objective,
    brief: chapter.intro,
    startTip: chapter.body,
    backdrop: chapter.backdrop,
  })),
  // 魑魅魍魉：六段夜路，一段比一段长，同行者一段比一段多。
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
  // Trick or Treat：一条没有危险的糖纸街，十户人家各守一颗增益糖。
  {
    id: 'trick',
    mode: 'trick',
    stage: 1,
    name: TRICK_ROUTE.place,
    chapter: '副本 · Trick or Treat',
    difficulty: 1,
    style: 'forest',
    mood: 'forest',
    objective: '走完整条街；想帮谁就帮谁，街尾随时能走',
    brief: '十户人家各守一颗糖。帮忙，或者捣蛋。',
    startTip: TRICK_ROUTE.intro,
  },
  // 女巫的房间：集合庭院。原来是追思小径第二段的赛道。
  {
    id: 'trick-witch',
    mode: 'trick',
    room: 'witch',
    stage: 1,
    name: '莫尔的庭院',
    chapter: 'Trick or Treat · 集合庭院',
    difficulty: 2,
    style: 'forest',
    mood: 'memorial',
    objective: '按门顶的 A、B 把东西分进对应格子，让那道石门沉下去',
    brief: '女巫的庭院只有一道石门：六颗东西，按门顶的 A、B 各归各位。',
    startTip: '地上每样东西都推不动：按 E 抱起来，走到格子前再按 E 扔进去。门顶写着 A、B 里有什么。',
    backdrop: MEMORIAL_CHAPTERS[1]?.backdrop ?? null,
  },
  // 男巫的地窖：电磁长夜。原来是追思小径第四段的赛道。
  {
    id: 'trick-warlock',
    mode: 'trick',
    room: 'warlock',
    stage: 1,
    name: '奥兹的地窖',
    chapter: 'Trick or Treat · 电磁长夜',
    difficulty: 3,
    style: 'cavern',
    mood: 'ritual',
    objective: '穿过电子厅和两口熔岩井，走到地窖最深处的门',
    brief: '地下的长厅，有静电场、速度选择器和右手骨机关。',
    startTip: '两颗铜球给你不同的电荷。先选一种，再往里走。',
  },
  // 捣蛋后的后巷竞速：抢了糖就跑，跑到街尾的栅门才拿得到。
  {
    id: 'trick-race',
    mode: 'trick',
    race: true,
    stage: 1,
    name: TRICK_RACE.place,
    chapter: 'Trick or Treat · 抢了就跑',
    difficulty: 2,
    style: 'forest',
    mood: 'forest',
    objective: '跑到街尾的栅门，别被身后的人追上',
    brief: '屋后的巷子。木箱、屋顶断口和糖浆滑道，一条纯竞速赛道。',
    startTip: TRICK_RACE.intro,
  },
]);

export const PLAYABLE_THEMES = THEMES.filter(
  (theme) =>
    theme.mode === 'journey' ||
    theme.mode === 'memorial' ||
    theme.mode === 'parade' ||
    theme.mode === 'trick',
);

const THEME_BY_ID = new Map(THEMES.map((theme) => [theme.id, theme]));

/**
 * 追思小径前两段的地图规格。数字单位都是地图格。
 * 地面始终连续，只有高低差与可选木板。
 *
 * 第二段是一座「集合庭院」：分格门认交集，中间夹一道 A → B 的接龙。
 * 每颗元素是一个完整的东西（骨头、幽灵、眼睛、蜡烛、手、骷髅），
 * 身上不挂标签；门楣左侧的成员板放大图标并写出名字。
 * 地面四格写着具体运算：A−B / A∩B / B−A / A∪B 加一横；归属对应才计数。
 * 这里只读图，不做算术。
 *
 * 第三段不再用这套规格：它是一条双人潜行的墓园夜路，由 buildMemorialSneak()
 * 单独建；第四段是一条简易的电磁赛道，由 buildMemorialElectromagnetic() 建，见下面。
 */
const MEMORIAL_STAGE_SPECS = [
  {
    // 第一段很短：南瓜车到高墙只有三十来格，墙后几格就是出去的门。
    // 这一段的所有阻力都压在墙上——一个人跳不过去，必须把南瓜叠高。
    width: 46,
    blocks: [
      [12, 15, 3, 1],
      [27, 15, 2, 1],
      // 路口的高墙：一个人跳不过去（4 格），得把南瓜推到墙边、
      // 抛起一颗叠好，踩着南瓜翻过去。墙前只留两颗南瓜。
      // 翻过墙就是第一段的出口门，没有后半段路。
      [38, 12, 2, 5],
    ],
    planks: [
      [20, 14, 4],
      [31, 14, 3],
    ],
    lamps: [5, 16, 28, 34, 41],
    trees: [22, 33, 43],
    // 第一段路上的五块故事路牌：一块一句，中文在上、英文在下，按 V 读。
    // 从南瓜车落地点一直铺到高墙前，走一段读一句。
    roadSigns: [6, 11, 17, 23, 29],
    // 第一段开场：玩家乘南瓜车到这里，下车后才开始被操控。
    carriage: { tile: 2 },
    graves: [8, 14, 24, 31, 43],
    fences: [[24, 3]],
    // 高墙前只放两颗过关用的南瓜：35 号推到墙边，32 号抱起来抛上去叠高。
    // 路上不再散落多余的南瓜，走起来更干净。
    pumpkins: [32, 35],
    skullPiles: [14, 30],
    memories: [{ tile: 36 }],
    // 时装零件：不放在地上。旧床单在高墙顶上，高竖领、蒙眼布条在单向木板
    // 上方——先跳上木板，再普通跳一下就能够到，不依赖叠南瓜。
    // 骨头不再放这里：骷髅时装在教程里已经拼好了。
    pickups: [
      { id: 'sheet', type: 'sheet', tile: 38, height: 2 },
      { id: 'vampireCollar', type: 'vampireCollar', tile: 32, height: 5 },
      { id: 'mummyEye', type: 'mummyEye', tile: 21, height: 5 },
    ],
    // 叠南瓜用的高墙在哪一列：游戏里的走近提示要跟着地图走。
    stackWall: 38,
    checkpoint: 34,
    checkpointLabel: '第 1 段 · 高墙下',
    goal: 44,
  },
  {
    // 第二段 · Kurt 的第一座集合庭院。
    // 两道门：交集、接龙映射。门本身是一堵六格高的石墙，
    // 上方一直封到夜空，不能叠南瓜翻过去。
    //
    // 这一段按「身体部件」来理解集合：骷髅和幽灵都有眼睛，单独的眼球
    // 就同时属于两边；骨头是骷髅的一部分，骷髅在哪一边，骨头就跟着在哪一边。
    // 第二道门是 A → B 的接龙：门楣只画前两段，其余留问号；
    // 玩家把地上三件东西放到各自对应的小台下。
    // 每颗元素都是一个完整的东西（骷髅、幽灵、眼睛、骨头、手、蜡烛），
    // 身上不挂标签；门楣左侧的成员板放大图标并写出名字。
    width: 98,
    blocks: [
      [30, 15, 2, 1],
      [59, 15, 2, 1],
      [89, 15, 2, 1],
    ],
    planks: [[29, 14, 2], [58, 14, 2], [88, 14, 2]],
    // 第二段路上的五块故事路牌：一块一句，中文在上、英文在下，按 V 读。
    // 避开两道集合门的元素和格子，从第一道门前一直铺到第二扇门之后。
    roadSigns: [23, 32, 51, 67, 82],
    lamps: [3, 29, 33, 59, 63, 88, 90],
    trees: [30, 58, 65, 90],
    graves: [31, 60, 64, 88],
    fences: [[29, 2], [59, 2], [89, 2]],
    // 第二段是 Kurt 的第一座集合庭院；糖纸街女巫房间复用同一套规则，但只留一道门。
    // 普通南瓜只放在庭院外的空地上：格子旁边留干净，免得分不清哪颗是门里的元素。
    pumpkins: [30, 70],
    skullPiles: [30, 60, 64, 88],
    memories: [{ tile: 31 }],
    checkpoint: 31,
    goal: 94,
    // 背景里淡淡浮着的几组大圆：Kurt 草稿纸上的图，印在紫褐色的雾里。
    setRings: [
      { x: 180, y: 150, r: 46, gap: 30 },
      { x: 620, y: 144, r: 52, gap: 34 },
      { x: 1180, y: 152, r: 44, gap: 28 },
    ],
    setGates: [
      {
        // 交集：A = {骷髅, 骨头, 眼睛}，B = {幽灵, 眼睛}。眼睛同时在两边；
        // 骨头是骷髅的一部分，跟着骷髅只在 A 里。
        tile: 25,
        expr: 'intersect',
        tag: 'memorial-2-set-1',
        trayStart: 12,
        trayWidth: 2,
        trayGap: 1,
        hint: '交集：门顶写着 A 是骷髅、骨头和眼睛，B 是幽灵和眼睛。眼睛两边都在；骨头跟着骷髅，只在 A 里。',
        success: '门开了。眼睛同时属于骷髅和幽灵；骨头跟着骷髅，站在 A 这边。',
        elements: [
          { tile: 4, look: 'skull', membership: 'a' },
          { tile: 6, look: 'ghost', membership: 'b' },
          { tile: 8, look: 'eye', membership: 'both' },
          { tile: 10, look: 'bone', membership: 'a' },
        ],
      },
      {
        // 接龙映射：A 里的每样东西都接到它后面的那一样，最后一样接回第一样。
        // 门楣只画前两段（骷髅→幽灵、幽灵→蜡烛），最后一段留问号；
        // 地上放的是 B 里的三件东西，分别放到它们前面那一样的小台下。
        tile: 55,
        expr: 'mapping',
        kind: 'mapping',
        tag: 'memorial-2-set-2',
        trayStart: 42,
        trayWidth: 2,
        trayGap: 1,
        chain: ['skull', 'ghost', 'candle'],
        // 只画前两段，最后一段要玩家自己补。
        shownLinks: 2,
        hint: '门顶是一条接龙：骷髅→幽灵，幽灵→蜡烛。每样东西都接在它后面的那一样，蜡烛后面就回到骷髅。把地上的幽灵、蜡烛、骷髅放到对应的小台下。',
        success: '门开了。骷髅→幽灵→蜡烛→骷髅，首尾接成一个圈。',
        elements: [
          // 地上的是 B 里的东西：幽灵是骷髅的像，蜡烛是幽灵的像，骷髅是蜡烛的像。
          // 该去哪个小台由 chain 推出，不在这里另写一份答案。
          { tile: 33, look: 'ghost' },
          { tile: 36, look: 'candle' },
          { tile: 39, look: 'skull' },
        ],
      },
    ],
    // 第二段的时装零件都在半空：眼睛、旧绷带在两座石门后的矮石台上，
    // 普通跳一下就能够到；燕尾披风和旧扫帚在后半段，燕尾披风必须带二段跳糖。
    // 骨头不再放这里：骷髅时装在教程里已经拼好了。
    pickups: [
      { id: 'eyeHoles', type: 'eyeHoles', tile: 30, height: 4 },
      { id: 'mummyWrap', type: 'mummyWrap', tile: 59, height: 4 },
      { id: 'vampireCape', type: 'vampireCape', tile: 76, height: 5, requiresBuff: 'doubleJump' },
      { id: 'broom', type: 'broom', tile: 89, height: 4 },
    ],
  },
];


/**
 * 糖纸街女巫莫尔的集合庭院。
 *
 * 和追思小径的庭院用同一套规则，但只留一道门：
 *   交集。六颗东西，按门顶的 A、B 各归各位。
 * 石头门后面不远就是回街上的出口，做完就能走。
 */
const WITCH_SET_SPEC = {
  width: 56,
  blocks: [],
  planks: [],
  lamps: [3, 26, 38, 48],
  trees: [12],
  graves: [8, 44],
  fences: [[18, 2]],
  pumpkins: [],
  skullPiles: [20, 42],
  memories: [],
  pickups: [],
  solaces: [],
  checkpoint: 40,
  checkpointLabel: '女巫庭院 · 石门后',
  goal: 50,
  setRings: [
    { x: 160, y: 150, r: 46, gap: 30 },
    { x: 620, y: 144, r: 52, gap: 34 },
  ],
  setGates: [
    {
      // 交集：A = {骷髅, 骨头, 眼睛, 手}，B = {幽灵, 眼睛, 手}。
      // 眼睛和手同时在两边；骨头是骷髅的一部分，跟着骷髅只在 A 里。
      tile: 34,
      expr: 'intersect',
      tag: 'witch-set-1',
      trayStart: 22,
      trayWidth: 2,
      trayGap: 1,
      hint: '交集：门顶 A 是骷髅、骨头、眼睛和手，B 是幽灵、眼睛和手。眼睛和手两边都在；骨头跟着骷髅，只在 A 里；蜡烛两边都不在。',
      success: '门开了。眼睛和手同时在 A 和 B 里；骨头跟着骷髅。',
      elements: [
        { tile: 6, look: 'skull', membership: 'a' },
        { tile: 8, look: 'ghost', membership: 'b' },
        { tile: 10, look: 'eye', membership: 'both' },
        { tile: 12, look: 'hand', membership: 'both' },
        { tile: 14, look: 'bone', membership: 'a' },
        { tile: 16, look: 'candle', membership: 'none' },
      ],
    },
  ],
};

/**
 * 门楣成员板上每样东西的显示顺序。骨头永远紧跟在骷髅后面：
 * 它不是一个不相干的第三样东西，而是骷髅这个集合的一部分。
 */
const MEMBER_ORDER = Object.freeze(['skull', 'bone', 'rib', 'ghost', 'eye', 'hand', 'candle']);

function sortMembers(members) {
  const rank = (member) => {
    const index = MEMBER_ORDER.indexOf(member.look);
    return index < 0 ? MEMBER_ORDER.length : index;
  };
  return members.slice().sort((left, right) => rank(left) - rank(right));
}

/** 集合门要在地面上标亮哪几个格子：这几个格子合起来就是这一门的「结果」。 */
function memorialTargetTrays(expr, twoSets) {
  if (!twoSets) return expr === 'complement' ? ['notA'] : ['a'];
  if (expr === 'intersect') return ['both'];
  if (expr === 'difference') return ['a'];
  if (expr === 'complement') return ['b', 'none'];
  return [];
}

/** 地面格子的颜色：A 金、B 蓝、交集紫，补集灰；映射门的三个小台统一用 B 的蓝。 */
function setTrayTint(id, mapping) {
  if (mapping) return '110, 170, 220';
  if (id === 'a') return '232, 190, 90';
  if (id === 'b') return '110, 170, 220';
  if (id === 'both') return '190, 150, 230';
  return '150, 140, 170';
}

/**
 * 接龙门的接龙必须是一圈不重复的东西，地上的每颗元素也得在圈里。
 * 把这两件事在造关卡时一次校验掉，运行时就不用再猜 membership 对不对。
 */
function mappingChainFor(spec, elements) {
  const chain = (spec.chain ?? []).slice();
  const label = spec.tag ?? `tile ${spec.tile}`;
  if (chain.length < 2) {
    throw new Error(`Mapping gate ${label}: chain needs at least two looks`);
  }
  if (new Set(chain).size !== chain.length) {
    throw new Error(`Mapping gate ${label}: chain has duplicate looks`);
  }

  const targets = mappingTargets(chain);
  for (const element of elements) {
    if (!element.look || !targets[element.look]) {
      throw new Error(
        `Mapping gate ${label}: element "${element.look ?? '?'}" is not in the chain`,
      );
    }
  }
  return { chain, targets };
}

/**
 * 造一道集合门。分格门和接龙门共用同一副骨架：
 *   - 石头墙身 + 一直封到夜空的符障，墙脚前是一排地面小台；
 *   - 每颗元素身上不挂标签，由门自己算出它该去哪个小台。
 *
 * 两种门只差在「该去哪」：
 *   - sort：membership 是集合归属，按 expr 落到 A−B / A∩B / B−A / 补集；
 *   - mapping：chain 是 A 的接龙顺序，B 里的东西归到它前面那一样的小台。
 * 接龙门的地面元素不写 membership，答案全部从 chain 推出来。
 */
function makeSetGate(rows, stage, index, spec) {
  const col = spec.tile;
  const topRow = GROUND_ROW - 6;
  paint(rows, col, topRow, 3, 6, 'B');
  paint(rows, col, 0, 3, topRow, 'g');

  const tiles = [];
  for (let row = 0; row < GROUND_ROW; row += 1) {
    for (let c = col; c < col + 3; c += 1) {
      tiles.push({ col: c, row, char: rows[row][c] });
    }
  }

  const kind = spec.kind ?? 'sort';
  const mapping = kind === 'mapping';
  const twoSets = mapping ? null : (spec.twoSets ?? spec.expr !== 'complement');
  const elements = (spec.elements ?? []).map((element) => ({ ...element }));

  // 骨头是骷髅的一部分：分格门里骷髅归哪一边，骨头就跟着归哪一边。
  // 接龙门按接龙位置算，不走 membership。
  if (!mapping) {
    const skull = elements.find((element) => element.look === 'skull');
    if (skull?.membership) {
      for (const element of elements) {
        if (element.look === 'bone') element.membership = skull.membership;
      }
    }
  }

  const mappingRule = mapping ? mappingChainFor(spec, elements) : null;
  if (mappingRule) {
    for (const element of elements) {
      // membership 只作为调试信息保留；判定时仍以 chain 为准。
      element.membership = mappingRule.targets[element.look];
    }
  }

  // 地面小台：两集合四格，单集合两格，接龙门是 A 里的每一样一个台。
  const trayIds = mapping
    ? mappingRule.chain
    : twoSets
      ? ['a', 'both', 'b', 'none']
      : ['a', 'notA'];
  const trayWidth = spec.trayWidth ?? 2;
  const trayGap = spec.trayGap ?? 1;
  const trayStart = spec.trayStart ?? col - trayIds.length * (trayWidth + trayGap) - 2;
  const targets = mapping ? trayIds : memorialTargetTrays(spec.expr, twoSets);
  const trays = trayIds.map((id, trayIndex) => ({
    id,
    x: (trayStart + trayIndex * (trayWidth + trayGap)) * T,
    w: trayWidth * T,
    y: GROUND_Y,
    tint: setTrayTint(id, mapping),
    target: targets.includes(id),
  }));

  const aMembers = mapping
    ? null
    : sortMembers(
        elements.filter(
          (element) => element.membership === 'a' || element.membership === 'both',
        ),
      );
  const bMembers = mapping
    ? null
    : sortMembers(
        elements.filter(
          (element) => element.membership === 'b' || element.membership === 'both',
        ),
      );
  const notAMembers = mapping
    ? null
    : sortMembers(
        elements.filter(
          (element) => element.membership !== 'a' && element.membership !== 'both',
        ),
      );

  const gate = {
    id: `memorial-${stage}-set-${index}`,
    kind,
    expr: spec.expr,
    tag: spec.tag,
    hint: spec.hint ?? '',
    success: spec.success ?? '',
    // 映射门：接龙顺序、门楣先画几段，以及每颗 B 东西该去的小台。
    chain: mappingRule?.chain ?? null,
    shownLinks: mappingRule
      ? Math.max(
          1,
          Math.min(
            mappingRule.chain.length - 1,
            spec.shownLinks ?? mappingRule.chain.length - 1,
          ),
        )
      : null,
    mappingTargets: mappingRule?.targets ?? null,
    x: col * T,
    centerX: (col + 1) * T + T / 2,
    y: GROUND_Y,
    top: topRow * T,
    w: 3 * T,
    h: 6 * T,
    twoSets,
    trays,
    aMembers,
    bMembers,
    notAMembers,
    pumpkinCount: elements.length,
    placed: 0,
    total: 0,
    tiles,
    solved: false,
    open: false,
    hinted: false,
    // 全部分对后，整扇门先缓缓沉进地里，沉完才撤碰撞。
    sinking: false,
    sinkT: 0,
    sinkDuration: 2.4,
  };

  // 一个萝卜一个坑：每一格按「该进这一格的元素数」挖出同样多的坑。
  // 坑铺满整格——两格的格子就是两个一格的坑，放对一颗就盖上一个盖子。
  // 不放任何东西的格子（比如交集门里的补集格）不挖坑，落进去只会被弹出来。
  const pitCounts = new Map(trays.map((tray) => [tray.id, 0]));
  for (const element of elements) {
    const want = correctTrayId(element, gate);
    if (want == null || !pitCounts.has(want)) continue;
    pitCounts.set(want, pitCounts.get(want) + 1);
  }
  for (const tray of trays) {
    const count = pitCounts.get(tray.id) ?? 0;
    const slots = Math.min(count, Math.max(1, Math.floor(tray.w / T)));
    const slotW = slots ? tray.w / slots : 0;
    tray.pits = count
      ? Array.from({ length: slots }, (_, index) => ({
          x: tray.x + index * slotW,
          w: slotW,
          y: tray.y,
          filled: false,
          filledAt: 0,
          element: null,
        }))
      : [];
  }

  return { gate, elements };
}

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

function makePickup(id, type, x, y, options = {}) {
  return {
    id,
    type,
    x,
    y,
    phase: (id.length * 1.7) % 6.28,
    // 少数最难的零件要带着对应增益糖才拿得到；见 collectibles / buffCandies。
    requiresBuff: options.requiresBuff ?? null,
  };
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

/** 魑魅魍魉的石鼓：按 Q 请一位（或两位）客人加入队伍。 */
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


/*
 * 这一版不在路上摆糖。
 * 糖果全部来自 Trick or Treat 的糖纸街：帮一户人家或捣蛋拿到糖，收进糖袋，
 * 放在背包里，按 Tab 打开背包就能吃一颗。以后真要在哪条路上放糖，再把拾取物加回对应关卡。
 */


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
    this.room = theme.room ?? null;
    this.paradeTrack = theme.mode === 'parade'
      ? getParadeTrack(options.paradeTrack)
      : null;
    this.memorialChapter = theme.mode === 'memorial'
      ? MEMORIAL_CHAPTERS[this.stage - 1] ?? null
      : null;
    this.paradeChapter = theme.mode === 'parade'
      ? PARADE_CHAPTERS[this.stage - 1] ?? null
      : null;
    // 追思路、魑魅魍魉和第三段潜行各自有天色；渲染层统一读 backdrop。
    this.backdrop = theme.backdrop ??
      (theme.mode === 'parade'
        ? this.paradeChapter?.backdrop ?? null
        : this.memorialChapter?.backdrop ?? null);
    this.weather = theme.weather ?? this.paradeChapter?.weather ?? null;
    this.goal = null;

    const built = this.build(themeId, options);
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
    // 第一段叠南瓜的高墙位置，供走近时的操作提示使用。
    this.stackWallX = data.stackWallX ?? null;
    // 每一格都是可变的，科学怪人撞塌的“C”会直接改成“.”。
    this.tiles = data.rows.map((row) => row.slice());
    // 地上的南瓜是可推动、可抛起、可叠高的实体，不再交给静态装饰层。
    // 魑魅魍魉里的「南瓜灯」（jackOLantern）用的是同一套南瓜画法，也一起变成实体。
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
        // 第二段的集合门靠这个 tag 认领自己的元素；look 决定它长什么样，
        // membership 是内部用的归属（a / b / both / none），不再画在元素身上。
        tag: decoration.tag ?? null,
        look: decoration.look ?? null,
        membership: decoration.membership ?? null,
      }));
    this.decorations = allDecorations.filter((decoration) => !isPumpkin(decoration));
    this.pickups = data.pickups;
    this.devices = data.devices;
    this.fieldZones = data.fieldZones;
    this.electrons = data.electrons;
    // 电子用哪套力的模型：'coulomb' 是库仑定律（1/r²），
    // 'bubble' 是早期有界气泡力，只有电磁长夜还在用。
    this.electronModel = data.electronModel ?? 'bubble';
    this.hazards = data.hazards;
    this.checkpoints = data.checkpoints;
    this.tutorialSteps = data.tutorialSteps ?? [];
    // 教程里每一课尽头的光墙：做完对应的一步才会打开。
    // open 由 Game 跟着 session.tutorialStep 同步，isSolid 负责把它变成物理阻挡。
    this.tutorialGates = (data.tutorialGates ?? []).map((gate) => ({
      ...gate,
      open: false,
    }));
    this.memorials = data.memorials ?? [];
    // 第四段电磁长夜里沿途的旧灯：走到跟前会短暂「透亮」。
    this.solaces = data.solaces ?? [];
    // 第二段的集合门：地面四格、门墙格子与这一局的开关状态。
    this.setGates = data.setGates ?? [];
    // 糖纸街的任务地标：八户不同的门，以及狼人的屋顶追月。
    this.trickTasks = data.trickTasks ?? [];
    // 捣蛋后的后巷竞速：追兵起点、糖浆加速带、晾衣绳与全程长度。
    this.race = data.race ?? null;
    // 正在下沉的集合门留下的空格子：画地形时跳过，由 setDraw 单独画下沉的石门。
    this.sinkingCells = new Set();
    this.waterZones = data.waterZones ?? [];
    this.updrafts = data.updrafts ?? [];
    this.party = data.party ?? null;
    // 第三段：双人出生点、石板门 / 影子桥、影子区与教学提示。
    // 这一段现在长在追思路线的第三段里，所以用 sneak 标记区分，
    // 不能只看 mode——mode 仍然是 memorial。
    this.sneak = Boolean(data.sneak) || this.mood === 'sneak';
    this.spawn2 = data.spawn2 ?? {
      x: this.spawn.x + 24,
      y: this.spawn.y,
    };
    this.gates = data.gates ?? [];
    this.shadowZones = data.shadowZones ?? [];
    this.sneakHints = data.sneakHints ?? [];
  }

  build(themeId, options = {}) {
    if (themeId === 'tutorial') return this.buildTutorial();
    if (themeId === 'trick') return this.buildTrickOrTreat();
    if (themeId === 'trick-race') return this.buildTrickRace(options.trickRaceHouse ?? null);
    if (themeId === 'trick-witch') return this.buildTrickRoom('witch');
    if (themeId === 'trick-warlock') return this.buildTrickRoom('warlock');
    if (themeId === 'merged') return this.buildMerged();
    if (themeId.startsWith('memorial-')) {
      const stage = memorialStageFromTheme(themeId);
      // 第二段是第一座集合庭院；第三段是双人潜行；
      // 第四段是 Pulse 地下的简易电磁赛道。
      // 糖纸街的女巫房间复用同一套集合门，但只留一道。
      if (stage === 3) return this.buildMemorialSneak();
      if (stage === 4) return this.buildMemorialElectromagnetic();
      return this.buildMemorial(stage, { withSetGates: true, pickups: true });
    }
    if (themeId.startsWith('parade-')) {
      return this.buildParade(paradeStageFromTheme(themeId));
    }
    if (themeId.startsWith('sneak-')) {
      return buildSneakData(Number(themeId.slice('sneak-'.length)));
    }
    throw new Error(`No builder for ${themeId}`);
  }

  /**
   * 新手教程：一条很短的直线小径，每一步都和一扇「教程门」对应。
   *
   * 路线只教这一局真正要用的东西：走 → 跳 → 下穿木板 → 拾取 → 推 / 抛南瓜
   * → 叠高翻墙 → 打开背包和糖袋 → 走到光门。每做完一步，下一扇门才会打开；
   * 没做对应动作，路就到这里为止，不会一路走到底却什么都没学会。
   */
  buildTutorial() {
    const width = 52;
    const rows = makeGrid(width, HEIGHT);

    paint(rows, 0, GROUND_ROW, width, 2, '#');
    // 一步高的石阶：只能跳过去，对应「↑」这一课。
    paint(rows, 10, 15, 2, 1, 'B');
    // 头顶的木板：要跳上去，再按住 ↓ 穿下来。
    paint(rows, 16, 14, 4, 1, 'P');
    // 教学高墙：四格高（64px），一个人跳不过去。
    // 墙前放两颗南瓜，要抱一颗抛到另一颗头顶叠成两级台阶，再踩着翻过去；
    // 路中间另有一颗，先在「南瓜」这一课练一次推和抛。
    paint(rows, 40, 12, 2, 5, '#');

    const decorations = [
      { type: 'sign', x: 3 * T, y: GROUND_Y, variant: 0, layer: 'front' },
      { type: 'tree', x: 5 * T, y: GROUND_Y, scale: 1.05, layer: 'back' },
      { type: 'tree', x: 21 * T, y: GROUND_Y, scale: 0.82, layer: 'back' },
      { type: 'tree', x: 33 * T, y: GROUND_Y, scale: 1.12, layer: 'back' },
      { type: 'tree', x: 48 * T, y: GROUND_Y, scale: 0.9, layer: 'back' },
      { type: 'grave', x: 13 * T, y: GROUND_Y, variant: 0, layer: 'back' },
      { type: 'grave', x: 29 * T, y: GROUND_Y, variant: 1, layer: 'back' },
      { type: 'grave', x: 47 * T, y: GROUND_Y, variant: 2, layer: 'back' },
      { type: 'skullPile', x: 20 * T, y: GROUND_Y, layer: 'front' },
      { type: 'skullPile', x: 36 * T, y: GROUND_Y, layer: 'front' },
      { type: 'skullPile', x: 45 * T, y: GROUND_Y, layer: 'front' },
      // 教学用的南瓜：一颗在路上练推和抛，两颗靠墙正好叠成台阶。
      { type: 'pumpkin', x: 30 * T, y: GROUND_Y, variant: 0, layer: 'front' },
      { type: 'pumpkin', x: 35 * T, y: GROUND_Y, variant: 1, layer: 'front' },
      { type: 'pumpkin', x: 37 * T, y: GROUND_Y, variant: 2, layer: 'front' },
      { type: 'lamp', x: 12 * T, y: GROUND_Y, layer: 'front' },
      { type: 'lamp', x: 27 * T, y: GROUND_Y, layer: 'front' },
      { type: 'lamp', x: 43 * T, y: GROUND_Y, layer: 'front' },
      { type: 'mushroom', x: 18 * T, y: GROUND_Y, layer: 'front' },
      { type: 'mushroom', x: 39 * T, y: GROUND_Y, layer: 'front' },
      // 每一课尽头的光墙：做完这一课才消失。
      ...[8, 14, 22, 28, 33, 44, 46].map((tile, index) => ({
        type: 'tutorialGate',
        x: tile * T,
        y: GROUND_Y,
        index,
        layer: 'front',
      })),
    ];

    return {
      width,
      height: HEIGHT,
      rows,
      spawn: { x: 3 * T + 3, y: GROUND_Y - PLAYER.HEIGHT },
      // 光门放在整条练习小径的尽头：木板、石阶、高墙都走一遍再到门。
      goalX: 49 * T,
      // 叠南瓜的高墙列：教程最后一步要翻过它。
      stackWallX: 40 * T,
      decorations,
      pickups: [
        // 拾取区：骨头放在「拾取」这一课的门后，走到这里就会经过。
        // 集齐头骨、肋骨、腿骨和一只左手骨，教程末尾会拼出第一套时装。
        makePickup('tutorial-rib', 'rib', 23 * T + T / 2, GROUND_Y - 11),
        makePickup('tutorial-hand', 'rightHand', 24 * T + T / 2, GROUND_Y - 11),
        makePickup('tutorial-skull', 'skull', 25 * T + T / 2, GROUND_Y - 11),
        makePickup('tutorial-femur', 'femur', 26 * T + T / 2, GROUND_Y - 11),
        makePickup('tutorial-left-hand', 'leftHand', 27 * T + T / 2, GROUND_Y - 11),
        // 路上没有糖：糖要去糖纸街的人家换，收进背包的糖袋里。
      ],
      devices: [],
      fieldZones: [],
      electrons: [],
      hazards: [],
      checkpoints: [],
      tutorialSteps: [
        {
          id: 'move',
          text: '按住 ← / → 走一走。前面的光墙要等你走过这一段才打开。',
          cheer: '好，就这样走。',
        },
        {
          id: 'jump',
          text: '按 ↑ 跳。按住 ↑ 不放，会跳得更高。跳过前面的石阶。',
          cheer: '好，跳起来了。',
        },
        {
          id: 'drop',
          text: '跳上头顶的木板，再按住 ↓ 从木板上穿下来。空中按 ↓ 会落得更快。',
          cheer: '好，能上能下。',
        },
        {
          id: 'collect',
          text: '走过骨头，它们会自己进背包。攒够骨头能拼成骷髅时装。',
          cheer: '捡到了。骨头和右手骨都收好了。',
        },
        {
          id: 'pumpkin',
          text: '南瓜能推：用身体顶它。靠近后按 E 抱起，再按 E 抛出去。',
          cheer: '推得动，也抛得出。',
        },
        {
          id: 'pumpkin-stack',
          text: '墙比人高。把一颗南瓜推到墙脚，再抱一颗按 E 抛到它头顶，踩着南瓜翻过去。',
          cheer: '叠好了。踩着南瓜翻过去。',
        },
        {
          id: 'backpack',
          text: '糖不在路上捡：糖纸街的人家会给你糖，收进背包的糖袋。按 Tab 打开背包，骨头、衣橱和糖袋都在这里。',
          cheer: '好。骨头和衣橱在背包，糖在糖袋。',
        },
        {
          id: 'finish',
          text: '小径尽头有一扇光门。走过去。',
          cheer: '',
        },
      ],
      // 和 tutorialSteps 一一对应：index 是它守着的那一课。
      tutorialGates: [
        { step: 0, tile: 8 },
        { step: 1, tile: 14 },
        { step: 2, tile: 22 },
        { step: 3, tile: 28 },
        { step: 4, tile: 33 },
        { step: 5, tile: 44 },
        { step: 6, tile: 46 },
      ],
    };
  }

  /**
   * Trick or Treat · 糖纸街。
   *
   * 十户万圣夜人家沿街排开。每户门口有一扇 candyDoor：
   * 敲门后由 Game 打开人物对话，选择「帮忙」做任务，或「捣蛋」抢了糖跑进后巷。
   * 女巫和男巫的任务是整间房（集合庭院 / 电磁长夜），
   * 其余八户各自守一扇不同的门：找规律、心理统计选择题、屋顶追月、
   * 绷带记号、线性代数、万圣夜问答、几何、古堡窗阵。
   * 门口摆什么跟着这一户走（house.decor）；街尾的出口永远开着，没做完也可以走。
   */
  buildTrickOrTreat() {
    const width = 118;
    const rows = makeGrid(width, HEIGHT);
    paint(rows, 0, GROUND_ROW, width, 2, '#');

    // 门与门之间的一级矮台阶：能跳过去，也能踩着南瓜翻。
    for (const tile of [14, 24, 34, 44, 54, 64, 74, 84, 94, 104]) {
      paint(rows, tile, GROUND_ROW - 1, 2, 1, 'B');
    }
    // 几段可选的高处木板，走上去能看见街对面的屋顶。
    for (const [x, y, w] of [
      [26, 12, 4],
      [86, 12, 4],
    ]) {
      paint(rows, x, y, w, 1, 'P');
    }
    // 狼人「屋顶追月」的屋顶跟着这一户的任务数据走：
    // 从街面折上去，到顶再折回左边、落回低处，方向是折的。
    const chaseHouse = TRICK_HOUSES.find((house) => house.task.type === 'chase');
    const chasePlatforms = chaseHouse?.task.platforms ?? [];
    for (const [x, y, w] of chasePlatforms) paint(rows, x, y, w, 1, 'P');

    const groundAt = (tileX) => surfaceAt(rows, width, HEIGHT, tileX);
    const groundYAt = (tileX) => groundAt(tileX);

    // 每户门口摆自己的东西：女巫门口是菌子和晶体，骷髅门口是骨头，
    // 南瓜王门口一排南瓜灯……不再每家都堆一堆南瓜。
    const houseDecor = TRICK_HOUSES.flatMap((house) =>
      (house.decor ?? []).map((item) => {
        const tileX = house.tile + item.dx;
        return {
          type: item.type,
          x: tileX * T,
          y: groundYAt(tileX),
          variant: item.variant ?? 0,
          scale: item.scale,
          length: item.length,
          layer: item.layer ?? 'front',
        };
      }),
    );

    const decorations = [
      { type: 'sign', x: 3 * T, y: groundYAt(3), variant: 1, layer: 'front' },
      { type: 'sign', x: 108 * T, y: groundYAt(108), variant: 0, layer: 'front' },
      { type: 'candyBucket', x: 5 * T, y: groundYAt(5), layer: 'front' },
      { type: 'candyBucket', x: 55 * T, y: groundYAt(55), layer: 'front' },
      { type: 'candyBucket', x: 105 * T, y: groundYAt(105), layer: 'front' },
      // 树和栅栏在门与门之间，给街道一点纵深。
      ...[4, 16, 28, 40, 52, 64, 76, 88, 100, 112].map((tileX) => ({
        type: 'tree',
        x: tileX * T,
        y: groundYAt(tileX),
        scale: 0.78 + (tileX % 3) * 0.12,
        layer: 'back',
      })),
      { type: 'fence', x: 12 * T, y: groundYAt(12), length: 3, layer: 'front' },
      { type: 'fence', x: 48 * T, y: groundYAt(48), length: 3, layer: 'front' },
      { type: 'fence', x: 78 * T, y: groundYAt(78), length: 3, layer: 'front' },
      ...[12, 32, 52, 72, 92, 108].map((tileX) => ({
        type: 'lamp',
        x: tileX * T,
        y: groundYAt(tileX),
        layer: 'front',
      })),
      // 街上只留几颗南瓜：推、抱、叠高照样能用，但不再每家门前堆一堆。
      ...[16, 47, 67, 97, 111].map((tileX, index) => ({
        type: 'pumpkin',
        x: tileX * T,
        y: groundYAt(tileX),
        variant: index % 3,
        layer: 'front',
      })),
      ...houseDecor,
    ];

    const trickTasks = [];

    if (chaseHouse) {
      const task = chaseHouse.task;
      const marks = Math.min(task.marks ?? 5, chasePlatforms.length);
      const zones = chasePlatforms.slice(0, marks).map(([x, row, w], index) => ({
        index,
        x: (x + w / 2) * T - T,
        y: (row - 1) * T,
        w: 2 * T,
        h: T * 1.4,
      }));
      // 阿嚎在最高那条屋脊上来回走：碰到它就会被扑下屋顶。
      const guardDef = chaseHouse.task.guard ?? null;
      const guard = guardDef
        ? {
            left: guardDef.leftTile * T,
            right: guardDef.rightTile * T,
            x: ((guardDef.leftTile + guardDef.rightTile) / 2) * T,
            y: guardDef.row * T,
            speed: guardDef.speed ?? 32,
            dir: 1,
          }
        : null;
      trickTasks.push({
        id: `trick-task-${chaseHouse.id}`,
        houseId: chaseHouse.id,
        // 渲染层要画守在屋脊上的阿嚎；只在接了任务以后才露出来。
        house: chaseHouse,
        kind: 'chase',
        need: marks,
        accent: chaseHouse.accent,
        zones,
        guard,
        timeLimit: task.timeLimit ?? 30,
        timeLeft: task.timeLimit ?? 30,
        markIndex: 0,
        running: false,
        progress: 0,
        start: {
          x: (chasePlatforms[0][0] - 2) * T,
          y: GROUND_Y - PLAYER.HEIGHT,
        },
      });
    }

    const devices = TRICK_HOUSES.map((house) => ({
      id: `trick-door-${house.id}`,
      type: 'candyDoor',
      x: house.tile * T,
      y: GROUND_Y,
      radius: 48,
      houseId: house.id,
      houseIndex: house.index,
      accent: house.accent,
      buffType: house.candyType,
      buffName: house.candyName,
      buffTag: house.candyTag,
      done: false,
      helped: false,
      tricked: false,
      active: false,
      flash: 0,
    }));

    return {
      width,
      height: HEIGHT,
      rows,
      spawn: { x: 2 * T + 3, y: GROUND_Y - PLAYER.HEIGHT },
      // 街尾的出口永远开着；没拿完也可以走。
      goalX: 112 * T,
      decorations,
      pickups: [],
      devices,
      trickTasks,
      fieldZones: [],
      electrons: [],
      hazards: [],
      checkpoints: [],
      waterZones: [],
      tutorialSteps: [],
    };
  }

  /**
   * 女巫 / 男巫的房间。两间都复用原来的追思小径赛道：
   *   witch  —— 集合庭院（一道集合门，比追思第二段更短）
   *   warlock —— 电磁长夜（电子厅和熔岩井）
   * 房间里加一扇回街上的后门；任务完成或随时离开都走它。
   */
  buildTrickRoom(room) {
    if (room === 'witch') {
      const data = this.buildMemorial(2, {
        spec: WITCH_SET_SPEC,
        withSetGates: true,
        memorials: false,
        pickups: false,
      });
      data.devices.push({
        id: 'trick-exit-witch',
        type: 'trickExit',
        x: 1 * T,
        y: data.spawn.y + PLAYER.HEIGHT,
        radius: 42,
      });
      data.trickTasks = [];
      return data;
    }

    if (room === 'warlock') {
      const data = this.buildMerged();
      const floorY = 41 * T;
      // 任务房间不再放时装零件；只留骨槽要用的右手骨。
      data.pickups = data.pickups.filter((pickup) => {
        const def = getItemDef(pickup.type);
        if (def.category === 'part') return false;
        if (def.category === 'bone') return pickup.type === 'rightHand';
        return true;
      });
      data.devices.push({
        id: 'trick-exit-warlock',
        type: 'trickExit',
        x: 2 * T,
        y: floorY,
        radius: 42,
      });
      data.trickTasks = [];
      return data;
    }

    throw new Error(`No trick room ${room}`);
  }

  /**
   * 捣蛋后的「抢了就跑」：糖纸街屋后的后巷。
   *
   * 这是一条纯竞速赛道，没有谜题、没有即死缺口，唯一的失败是被追上。
   * 全程从 0 到 160 格，地面连续；木箱都只有一到两格高，普通跳就能过。
   * 屋顶是可选的快线：上面没有木箱和南瓜，但断口要跳准；
   * 落在巷子里不会死，只是把时间还回去。
   *
   * 每一户都有自己的后巷（见 trickOrTreat.js 的 TRICK_RACES）：
   * 木箱、屋顶、糖浆、南瓜和追兵的速度都跟着这一户走。
   * 没有指定门口时，用一张通用的默认巷道。
   */
  buildTrickRace(houseId = null) {
    const variant = getTrickRace(houseId);
    const width = TRICK_RACE.lengthTiles;
    const rows = makeGrid(width, HEIGHT);
    paint(rows, 0, GROUND_ROW, width, 2, '#');

    // 巷底下沉一格：跳进去再跳出来，不掉命，只让节奏顿一下。
    for (const [start, span] of variant?.dips ?? []) {
      for (let x = start; x < start + span; x += 1) rows[GROUND_ROW][x] = '.';
    }

    // 木箱：一到两格高，普通跳都能过去；它们只负责打断节奏，不负责拦住人。
    const crates = variant?.crates ?? [
      [8, 15, 1], [14, 15, 2], [16, 14, 1], [21, 15, 1], [28, 15, 1],
      [37, 15, 1], [46, 15, 2], [48, 14, 2], [52, 15, 1], [53, 14, 1],
      [60, 15, 1], [68, 15, 1], [76, 14, 2], [89, 15, 1], [94, 14, 2],
      [99, 15, 1], [106, 15, 1], [110, 15, 2], [116, 15, 1], [117, 14, 1],
      [124, 15, 2], [132, 14, 2], [144, 15, 1], [150, 15, 2],
    ];
    for (const [x, y, w] of crates) {
      // 贴着地面的木箱可以是一格或两格高；两格的顶在 row14，
      // 普通跳刚好够到，不会变成翻不过去的墙。
      paint(rows, x, y, w, GROUND_ROW - y, 'B');
    }

    // 屋顶快线：单向木板，从下面能跳上去，按 ↓ 可以落回巷子。
    const roofs = variant?.roofs ?? [
      [18, 12, 6], [26, 12, 6], [54, 12, 7], [63, 12, 8], [73, 12, 8],
      [81, 13, 4], [85, 14, 4], [118, 12, 7], [128, 12, 7], [138, 12, 3],
    ];
    for (const [x, y, w] of roofs) paint(rows, x, y, w, 1, 'P');

    // 石桥面：一格厚，架在巷子上方两格。
    // 底下是一条能跑不能跳的桥洞，上面是一条比屋顶低一级的走道；
    // 两头摆一格高的木箱，正好够跳上去。
    const bridges = variant?.bridges ?? [];
    for (const [x, y, w] of bridges) paint(rows, x, y, w, 1, 'B');

    const groundAt = (tileX) => surfaceAt(rows, width, HEIGHT, tileX);
    const groundYAt = (tileX) => groundAt(tileX);
    // 街上的布景要落在巷子的地面上，而不是踩在木箱顶上：
    // 树长在木箱上、路灯架在箱子上都太怪。
    // 所以布景只摆在空出来的巷子上：木箱、桥墩、坑里的那几格直接跳过。
    const streetY = GROUND_ROW * T;
    const clearAt = (tileX, span = 1) => {
      for (let i = 0; i < span; i += 1) {
        const col = tileX + i;
        if (col < 0 || col >= width) return false;
        // 木箱和桥墩占掉的两格、以及塌下去的坑，都不摆东西。
        if (rows[GROUND_ROW - 1][col] !== '.' || rows[GROUND_ROW - 2][col] !== '.') return false;
        if (rows[GROUND_ROW][col] === '.') return false;
      }
      return true;
    };

    // 巷子里的南瓜是活的：可以推开、抱走，也可以直接跳过去。
    // 它们放在屋顶快线的正下方，逼玩家在「快但险」和「稳但挤」之间选一条。
    // 落在木箱上的南瓜会被挤到箱子顶上，所以只留巷子里空出来的那几格。
    const pumpkins = (variant?.pumpkins ?? [21, 25, 29, 58, 64, 70, 78, 90, 91, 102, 111, 120, 126, 134, 139, 145, 148])
      .filter((tileX) => clearAt(tileX));

    const props = (variant?.props ?? [
      ['sign', 5, { variant: 1 }],
      ['sign', 36, { variant: 0 }],
      ['sign', 88, { variant: 1 }],
      ['sign', 142, { variant: 0 }],
      ['tree', 12], ['tree', 33], ['tree', 50], ['tree', 71],
      ['tree', 90], ['tree', 112], ['tree', 136], ['tree', 154],
      ['fence', 10, { length: 2 }],
      ['fence', 34, { length: 2 }],
      ['fence', 82, { length: 3 }],
      ['fence', 140, { length: 2 }],
      ['lamp', 6], ['lamp', 24], ['lamp', 42], ['lamp', 58], ['lamp', 74],
      ['lamp', 92], ['lamp', 108], ['lamp', 126], ['lamp', 142], ['lamp', 156],
      ['candyBucket', 15], ['candyBucket', 39], ['candyBucket', 69],
      ['candyBucket', 95], ['candyBucket', 133], ['candyBucket', 155],
      ['mushroom', 27], ['mushroom', 61], ['mushroom', 93], ['mushroom', 129],
    ])
      // 布景跟着每一户走（见 trickOrTreat.js 的 props），落在木箱、
      // 桥墩或者坑里的那几格直接跳过。
      .map(([type, tileX, extra = {}]) => ({
        type,
        x: tileX * T,
        y: streetY,
        layer: extra.layer ?? (type === 'tree' || type === 'grave' ? 'back' : 'front'),
        ...extra,
      }))
      .filter((decor) => clearAt(Math.floor(decor.x / T), decor.length ?? 1));

    const decorations = [
      ...props,
      ...pumpkins.map((tileX, index) => ({
        type: 'pumpkin',
        x: tileX * T,
        y: groundYAt(tileX),
        variant: (tileX + index) % 3,
        layer: 'front',
      })),
    ];

    const spawn = {
      x: TRICK_RACE.spawnTile * T + 3,
      y: GROUND_Y - PLAYER.HEIGHT,
    };
    const goalX = TRICK_RACE.goalTile * T;

    // 糖浆加速带：踩上去会往前冲一小段。每一户的段数和倍率都不一样。
    // 第四项可选：铺在第几行（填了就铺在屋顶上）。屋顶上的焦糖是快线的报酬。
    const zoneSpecs = variant?.zones ?? [
      [40, 5, 1.15],
      [96, 6, 1.25],
      [152, 4, 1.1],
    ];
    const speedZones = zoneSpecs.map(([x, w, boost, row]) => {
      const surfaceY = row == null ? GROUND_Y : row * T;
      return {
        x: x * T,
        y: surfaceY - 10,
        w: w * T,
        h: 12,
        boost,
        label: '糖浆',
      };
    });

    // 晾衣绳：纯装饰，给后巷一点纵深。线从这头拉到那头。
    const laundrySpecs = variant?.laundry ?? [
      [12, 9.5, 15],
      [30, 10, 12],
      [55, 8.5, 18],
      [118, 8.5, 16],
    ];
    const laundry = laundrySpecs.map(([x, y, w]) => ({
      x: x * T,
      y: y * T,
      w: w * T,
    }));

    // 这一户的路况提示：分岔、糖浆、最后直道。每趟只提示一次。
    const hintSpecs = variant?.hints ?? [
      { at: 12, text: '屋顶是快线：没有木箱，但断口要跳准。' },
      { at: 36, text: '前面有糖浆。踩上去会冲一段。' },
      { at: 138, text: '最后一段。栅门就在前面。' },
    ];
    const hints = hintSpecs.map((hint) => ({
      at: hint.at * T,
      text: hint.text,
      shown: false,
    }));

    const chaserSpec = variant?.chaser ?? {};
    const chaser = {
      startSpeed: chaserSpec.startSpeed ?? TRICK_RACE.chaserStartSpeed,
      speedGain: chaserSpec.speedGain ?? TRICK_RACE.chaserSpeedGain,
      chaseLeadTiles: chaserSpec.chaseLeadTiles ?? TRICK_RACE.chaseLeadTiles,
      catchUpPerTile: chaserSpec.catchUpPerTile ?? TRICK_RACE.catchUpPerTile,
      maxCatchUp: chaserSpec.maxCatchUp ?? TRICK_RACE.maxCatchUp,
      mercyTiles: chaserSpec.mercyTiles ?? TRICK_RACE.mercyTiles,
      mercyScale: chaserSpec.mercyScale ?? TRICK_RACE.mercyScale,
    };

    return {
      width,
      height: HEIGHT,
      rows,
      spawn,
      goalX,
      decorations,
      pickups: [],
      devices: [
        {
          id: 'trick-race-backdoor',
          type: 'trickRaceExit',
          x: 2 * T,
          y: GROUND_Y,
          radius: 44,
        },
      ],
      trickTasks: [],
      fieldZones: [],
      electrons: [],
      hazards: [],
      checkpoints: [],
      waterZones: [],
      tutorialSteps: [],
      race: {
        id: TRICK_RACE.id,
        houseId,
        spawn,
        goalX,
        chaserStartX: spawn.x - TRICK_RACE.startGap,
        grace: chaserSpec.grace ?? TRICK_RACE.grace,
        speedZones,
        laundry,
        hints,
        accent: '#ffcf72',
        playerSpeedScale: variant?.playerScale ?? TRICK_RACE.playerSpeedScale,
        boostScale: TRICK_RACE.boostScale,
        chaser,
      },
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
      // 男巫地窖只留两口骨槽必需的右手骨；时装零件已经回到追思小径，
      // 糖果这一版只在糖纸街换、放在糖袋里。
      makePickup('warlock-hand-a', 'rightHand', 256, floorY - 11),
      makePickup('warlock-hand-b', 'rightHand', 1236, floorY - 11),
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
    const solaces = [];
    if (memorialStage) {
      const chapter = MEMORIAL_CHAPTERS[memorialStage - 1];
      if (chapter) {
        // 第四段的两盏灯：入口处想起 Pulse，终点岛上是老师的墓。
        const entries = [
          { x: 7.5 * T, patient: chapter.patient, line: chapter.memory },
          { x: (islandEnd.x + 4) * T, patient: '老师', line: MEMORIAL_ROUTE.finale },
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

        // 第四段的四盏旧灯：都摆在结实的落脚点上。走到跟前会自动点起，
        // 给一段「透亮」——颜色回来、脚步变轻，灯灭之后重量还回来。
        if (chapter.kind === 'insomnia') {
          const solaceSpecs = [
            { x: 17.5 * T, line: '旧灯还亮着。这一步轻了一点。' },
            { x: 49 * T, line: '灯芯还有温度。颜色回来了一会儿。' },
            { x: 80.5 * T, line: '有人在这里等过。脚下没那么沉了。' },
            { x: 111 * T, line: '最后一段了。灯照着，慢慢走。' },
          ];
          solaceSpecs.forEach((spec, index) => {
            const id = `memorial-${memorialStage}-solace-${index + 1}`;
            solaces.push({ id, x: spec.x, y: floorY, line: spec.line });
            decorations.push({
              type: 'solace',
              solaceId: id,
              x: spec.x,
              y: floorY,
              layer: 'front',
            });
          });
        }
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
      // 这一段的 80px 裂隙是按早期有界气泡力摆的：换成 1/r² 以后
      // 那几跳要连着重新摆平台和电子，所以暂时还用旧模型。
      electronModel: 'bubble',
      electrons,
      memorials,
      solaces,
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
   * 「四盏灯」第一、二段的墓园夜路。
   *
   * 每段都是一张平缓的地图：地面连续，没有岩浆和深坑，
   * 只有几级矮石阶和可选的单向木板。真正的阻力来自这一段的记忆——
   * 玩家会短暂带上那位病人可被观察到的行为特点。
   * 第二段有一座集合庭院；糖纸街的女巫房间复用同一套门，但只留一道。
   * 第四段的下沉电磁赛道见 buildMemorialElectromagnetic()。
   */
  buildMemorial(stage, options = {}) {
    const chapter = MEMORIAL_CHAPTERS[stage - 1];
    const spec = options.spec ?? MEMORIAL_STAGE_SPECS[stage - 1];
    if (!chapter || !spec) throw new Error(`No memorial stage ${stage}`);
    const withSetGates = options.withSetGates ?? false;
    const includeMemorials = options.memorials ?? true;
    const includePickups = options.pickups ?? true;

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

    const decorations = [];

    if (spec.roadSigns?.length) {
      // 路上的故事路牌不是装饰：每一块都挂着一句这一段的文案，按 V 能读。
      spec.roadSigns.forEach((tileX, index) => {
        decorations.push({
          type: 'sign',
          x: tileX * T,
          y: groundAt(tileX),
          variant: index,
          layer: 'front',
          story: true,
          signId: `memorial-${stage}-sign-${index + 1}`,
          signIndex: index,
        });
      });
    } else {
      decorations.push({ type: 'sign', x: 5 * T, y: groundAt(5), variant: 0, layer: 'front' });
    }

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

    if (withSetGates) {
      for (const ring of spec.setRings ?? []) {
        decorations.push({
          type: 'setRing',
          x: ring.x,
          y: ring.y,
          r: ring.r,
          gap: ring.gap,
          layer: 'back',
        });
      }
    }

    // 追思小径第二段和糖纸街女巫房间的集合门。墙身是实体石头，
    // 头顶再封一层看不见的符障，所以除了把每颗元素放进对应的格子，
    // 没有别的路可以翻过去。
    const setGates = [];
    if (withSetGates) {
      for (const gateSpec of spec.setGates ?? []) {
        const { gate, elements } = makeSetGate(
          rows,
          stage,
          setGates.length + 1,
          gateSpec,
        );
        setGates.push(gate);

        // 这一段的元素都属于某一道门。tag 让门只认自己那一组，
        // 玩家把别的元素搬来搬去不会误开门。
        elements.forEach((element, elementIndex) => {
          const tileX = element.tile;
          decorations.push({
            type: 'pumpkin',
            x: tileX * T + T / 2,
            y: groundAt(tileX) - (element.lift ?? 0) * T,
            variant: (elementIndex + tileX) % 3,
            look: element.look ?? 'skull',
            membership: element.membership ?? 'none',
            layer: 'front',
            tag: gateSpec.tag,
          });
        });
      }
    }

    const memorials = [];
    if (includeMemorials) {
      const memorySpecs = spec.memories ?? [];
      memorySpecs.forEach((memory, index) => {
        const id = `memorial-${stage}-memory-${index + 1}`;
        const x = memory.tile * T;
        const surface = groundAt(memory.tile);
        memorials.push({
          id,
          x,
          y: surface,
          patient: memory.family ? '老师' : chapter.patient,
          line: memory.family ? MEMORIAL_ROUTE.finale : chapter.memory,
          lineEn: memory.family ? null : chapter.memoryEn ?? null,
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
    }

    const solaces = [];
    for (const [index, solaceSpec] of (spec.solaces ?? []).entries()) {
      const id = `memorial-${stage}-solace-${index + 1}`;
      const x = solaceSpec.tile * T;
      const y = groundAt(solaceSpec.tile);
      solaces.push({ id, x, y, line: solaceSpec.line ?? '旧灯还亮着。' });
      decorations.push({
        type: 'solace',
        solaceId: id,
        x,
        y,
        layer: 'front',
      });
    }

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
      // 叠南瓜的高墙在哪一列（像素）：game 走近平墙时要提示怎么做。
      stackWallX: spec.stackWall != null ? spec.stackWall * T : null,
      decorations,
      // 时装零件按「格 + 离地高度」摆放：前两段没有背包，捡到就直接进收藏。
      pickups: (includePickups ? spec.pickups ?? [] : []).map((pickup) =>
        makePickup(
          `memorial-${stage}-${pickup.id}`,
          pickup.type,
          pickup.tile * T + T / 2,
          groundAt(pickup.tile) - (pickup.height ?? 1) * T,
          { requiresBuff: pickup.requiresBuff },
        ),
      ),
      devices,
      fieldZones: [],
      electrons: [],
      hazards: [],
      checkpoints: [
        makeCheckpoint(
          spec.checkpoint * T,
          groundAt(spec.checkpoint) - PLAYER.HEIGHT,
          spec.checkpointLabel ?? `第 ${stage} 段 · 半途的灯`,
        ),
      ],
      memorials,
      solaces,
      setGates,
      tutorialSteps: [],
    };
  }

  /**
   * 追思小径第三段 · 另一双脚步。
   *
   * 原来的「鬼鬼祟祟」缩成这一段：两名玩家分别控制「你」和「回音」，
   * 走在万圣夜的墓园外墙。提灯人提着灯来回走，影子区可以藏身；
   * 两块石板同时压住才开门，影子桥认石板，两个人都到门口才算过。
   *
   * 地图数据仍在 sneak.js / sneakLevel.js，这里只把它接进追思路线：
   * 加上冯桃的记忆、蜡烛，并且把这一段标成 sneak，交给 sneakMode 更新。
   */
  buildMemorialSneak() {
    const chapter = MEMORIAL_CHAPTERS[2];
    const data = buildSneakData(1);

    // 记忆和蜡烛要贴着地面放。sneakLevel 已经按同一套地面规则建过图，
    // 这里从 rows 里找一次支撑面，免得把记忆悬在半空。
    const surfaceAt = (tileX) => {
      const col = Math.max(0, Math.min(data.width - 1, tileX));
      for (let row = 0; row < data.height; row += 1) {
        const tile = data.rows[row][col];
        if (tile === '#' || tile === 'B' || tile === 'G' || tile === 'S') return row * T;
      }
      return data.height * T;
    };

    const memoryTile = 8;
    const memoryId = 'memorial-3-memory-1';
    const memoryX = memoryTile * T;
    const memoryY = surfaceAt(memoryTile);
    data.memorials = [
      {
        id: memoryId,
        x: memoryX,
        y: memoryY,
        patient: chapter?.patient ?? '冯桃',
        line: chapter?.memory ?? '',
        lineEn: chapter?.memoryEn ?? null,
      },
    ];
    data.decorations.push({
      type: 'memory',
      id: memoryId,
      lightId: memoryId,
      x: memoryX,
      y: memoryY,
      layer: 'front',
    });
    data.decorations.push({
      type: 'candle',
      lightId: memoryId,
      x: memoryX + T,
      y: memoryY,
      layer: 'front',
    });

    // 第三段的两块故事路牌：一块在门前的石台边，一块在影子桥之后。
    // 和别的段落一样，按 V 摊开，中文在上、文言在下。
    for (const [index, tileX] of [20, 47].entries()) {
      data.decorations.push({
        type: 'sign',
        x: tileX * T,
        y: surfaceAt(tileX),
        variant: index,
        layer: 'front',
        story: true,
        signId: `memorial-3-sign-${index + 1}`,
        signIndex: index,
      });
    }

    // 这一段没有旧灯、集合门和拾取物；它的阻力全在提灯人和石板上。
    data.solaces = [];
    data.setGates = [];
    data.pickups = [];
    data.sneak = true;
    return data;
  }

  /**
   * 追思小径第四段 · 简易电磁赛道。
   *
   * Pulse 的旧观测台在地下。这一段只留下电磁长夜最核心的一件东西：
   * 铜球给的电荷，和悬在裂隙里的电子。没有熔岩井、骨槽、速度选择器，
   * 也不需要右手骨——那些都留在糖纸街男巫奥兹的地窖。
   *
   * 这一段按库仑定律走：F = k·q·Q/r²，越靠近电子，推/拉得越紧。
   * 两道裂隙各认一种电荷：
   *   - 第一道：电子悬在裂隙下方，负电荷被推上去，借力越过；
   *   - 第二道：电子悬在裂隙上方，正电荷被拉过去，借力越过。
   * 再往后是一条被小岛分成两跳的宽裂隙：第一跳仍是负电，跳上岛以后
   * 用岛上的铜球换成正电，再借对岸上方的电子跳过第二跳。
   * 三道之间都有铜球，可以随时换电荷。走错电荷不会死，
   * 只会掉进裂隙、退回上一个落脚点，电荷还留着。
   *
   * 失眠的重量、四盏旧灯和两处记忆照旧。走完就是老师的墓。
   */
  buildMemorialElectromagnetic() {
    const chapter = MEMORIAL_CHAPTERS[3];
    const width = 116;
    const height = 30;
    const floorRow = 20;
    const floorY = floorRow * T;
    const rows = makeGrid(width, height);

    // 前两道裂隙各是一跳；后面再添一段更长的电：一条宽裂隙被中间的小岛
    // 分成两跳，玩家要先跳上小岛、换一次电荷，再跳过去。
    const gapA = { x: 30, w: 5 };
    const gapB = { x: 66, w: 5 };
    const gapC1 = { x: 76, w: 5 };
    const gapC2 = { x: 87, w: 5 };
    for (const [start, end] of [
      [0, gapA.x],
      [gapA.x + gapA.w, gapB.x],
      [gapB.x + gapB.w, gapC1.x],
      [gapC1.x + gapC1.w, gapC2.x],
      [gapC2.x + gapC2.w, width],
    ]) {
      paint(rows, start, floorRow, end - start, 10, '#');
    }

    // 几块一脚就能跳上去的矮石台，让负重下的路有一点起伏。
    for (const [x, y, w, h] of [
      [12, floorRow - 2, 3, 2],
      [44, floorRow - 1, 3, 1],
      [101, floorRow - 1, 3, 1],
    ]) {
      paint(rows, x, y, w, h, 'B');
    }

    const groundAt = (tileX) => surfaceAt(rows, width, height, tileX);

    const decorations = [
      { type: 'rune', x: 4 * T, y: groundAt(4), layer: 'front' },
      { type: 'crystal', x: 6 * T, y: groundAt(6), scale: 0.9, layer: 'front' },
      { type: 'crystal', x: 21 * T, y: groundAt(21), scale: 0.75, layer: 'front' },
      { type: 'crystal', x: 42 * T, y: groundAt(42), scale: 0.9, layer: 'front' },
      { type: 'crystal', x: 57 * T, y: groundAt(57), scale: 0.8, layer: 'front' },
      { type: 'crystal', x: 93 * T, y: groundAt(93), scale: 1.0, layer: 'front' },
      { type: 'crystal', x: 96 * T, y: groundAt(96), scale: 0.85, layer: 'front' },
      { type: 'crystal', x: 104 * T, y: groundAt(104), scale: 1.05, layer: 'front' },
      { type: 'stalagmite', x: 15 * T, y: groundAt(15), scale: 0.8, layer: 'back' },
      { type: 'stalagmite', x: 47 * T, y: groundAt(47), scale: 0.9, layer: 'back' },
      { type: 'stalagmite', x: 95 * T, y: groundAt(95), scale: 0.8, layer: 'back' },
      { type: 'stalactite', x: 12 * T, y: 104, scale: 0.9, layer: 'back' },
      { type: 'stalactite', x: 33 * T, y: 104, scale: 1.2, layer: 'back' },
      { type: 'stalactite', x: 52 * T, y: 104, scale: 0.9, layer: 'back' },
      { type: 'stalactite', x: 69 * T, y: 104, scale: 1.2, layer: 'back' },
      { type: 'stalactite', x: 84 * T, y: 104, scale: 0.8, layer: 'back' },
      { type: 'stalactite', x: 106 * T, y: 104, scale: 1.0, layer: 'back' },
      { type: 'chain', x: 22 * T, y: 104, length: 6, layer: 'back' },
      { type: 'chain', x: 50 * T, y: 104, length: 5, layer: 'back' },
      { type: 'chain', x: 76 * T, y: 104, length: 6, layer: 'back' },
      { type: 'chain', x: 100 * T, y: 104, length: 4, layer: 'back' },
      { type: 'skullPile', x: 18 * T, y: groundAt(18), layer: 'front' },
      { type: 'skullPile', x: 38 * T, y: groundAt(38), layer: 'front' },
      { type: 'skullPile', x: 55 * T, y: groundAt(55), layer: 'front' },
      { type: 'skullPile', x: 74 * T, y: groundAt(74), layer: 'front' },
      { type: 'skullPile', x: 94 * T, y: groundAt(94), layer: 'front' },
      { type: 'pumpkin', x: 9 * T, y: groundAt(9), variant: 0, layer: 'front' },
      { type: 'pumpkin', x: 25 * T, y: groundAt(25), variant: 1, layer: 'front' },
      { type: 'pumpkin', x: 58 * T, y: groundAt(58), variant: 2, layer: 'front' },
      { type: 'pumpkin', x: 73 * T, y: groundAt(73), variant: 1, layer: 'front' },
      { type: 'pumpkin', x: 99 * T, y: groundAt(99), variant: 0, layer: 'front' },
    ];

    // 这一段只留两块路牌：一块在入口，一块在碑前。中间不摆，
    // 免得读牌子打断过裂隙的节奏。每块四行，两句中文、两句英文。
    for (const [index, tileX] of [3, 110].entries()) {
      decorations.push({
        type: 'sign',
        x: tileX * T,
        y: groundAt(tileX),
        variant: index,
        layer: 'front',
        story: true,
        signId: `memorial-4-sign-${index + 1}`,
        signIndex: index,
      });
    }

    const memorials = [];
    const memoryEntries = [
      {
        tile: 8,
        patient: chapter?.patient ?? 'Pulse',
        line: chapter?.memory ?? '',
        lineEn: chapter?.memoryEn ?? null,
      },
      { tile: 108, patient: '老师', line: MEMORIAL_ROUTE.finale },
    ];
    for (const [index, entry] of memoryEntries.entries()) {
      const id = `memorial-4-memory-${index + 1}`;
      const x = entry.tile * T;
      const y = groundAt(entry.tile);
      memorials.push({
        id,
        x,
        y,
        patient: entry.patient,
        line: entry.line,
        lineEn: entry.lineEn ?? null,
      });
      decorations.push({ type: 'memory', id, lightId: id, x, y, layer: 'front' });
      decorations.push({ type: 'candle', lightId: id, x: x + T, y, layer: 'front' });
    }

    const solaces = [];
    const solaceSpecs = [
      { tile: 5, line: '旧灯还亮着。这一步轻了一点。' },
      { tile: 24, line: '灯芯还有温度。下面的电子会把负电托起来。' },
      { tile: 60, line: '有人在这里等过。上面的电子会把正电拉过去；过了它，记得换回负电。' },
      { tile: 96, line: '最后一段了。灯照着，慢慢走。' },
    ];
    for (const [index, spec] of solaceSpecs.entries()) {
      const id = `memorial-4-solace-${index + 1}`;
      const x = spec.tile * T;
      const y = groundAt(spec.tile);
      solaces.push({ id, x, y, line: spec.line });
      decorations.push({ type: 'solace', solaceId: id, x, y, layer: 'front' });
    }

    return {
      width,
      height,
      rows,
      spawn: { x: 2 * T + 3, y: groundAt(2) - PLAYER.HEIGHT },
      goalX: 112 * T,
      decorations,
      pickups: [
        makePickup('memorial-4-fangs', 'fangs', 8 * T, groundAt(8) - 3 * T),
        makePickup('memorial-4-mummyTail', 'mummyTail', 40 * T, groundAt(40) - 6 * T, {
          requiresBuff: 'spring',
        }),
        makePickup('memorial-4-witchHat', 'witchHat', 94 * T, groundAt(94) - 9 * T, {
          requiresBuff: 'flight',
        }),
        makePickup('memorial-4-catDoll', 'catDoll', 98 * T, groundAt(98) - 3 * T, {
          requiresBuff: 'dash',
        }),
      ],
      devices: [
        // 第一对铜球：负电过第一道裂隙。
        {
          id: 'memorial-4-charger-positive-a',
          type: 'charger',
          charge: 1,
          x: 20 * T,
          y: floorY,
          radius: 44,
        },
        {
          id: 'memorial-4-charger-negative-a',
          type: 'charger',
          charge: -1,
          x: 22 * T,
          y: floorY,
          radius: 44,
        },
        // 第二对铜球：过了第一道裂隙后换成正电，过第二道。
        {
          id: 'memorial-4-charger-positive-b',
          type: 'charger',
          charge: 1,
          x: 50 * T,
          y: floorY,
          radius: 44,
        },
        {
          id: 'memorial-4-charger-negative-b',
          type: 'charger',
          charge: -1,
          x: 52 * T,
          y: floorY,
          radius: 44,
        },
        // 第三对铜球：过了第二道裂隙后，换回负电去跳宽裂隙的第一跳。
        {
          id: 'memorial-4-charger-positive-c',
          type: 'charger',
          charge: 1,
          x: 72 * T,
          y: floorY,
          radius: 44,
        },
        {
          id: 'memorial-4-charger-negative-c',
          type: 'charger',
          charge: -1,
          x: 74 * T,
          y: floorY,
          radius: 44,
        },
        // 宽裂隙中间的小岛：跳上岛以后换成正电，再跳第二跳。
        // 正电球放在靠第二跳的一侧，落地后不用走回头路。
        {
          id: 'memorial-4-charger-negative-d',
          type: 'charger',
          charge: -1,
          x: 82 * T,
          y: floorY,
          radius: 44,
        },
        {
          id: 'memorial-4-charger-positive-d',
          type: 'charger',
          charge: 1,
          x: 85 * T,
          y: floorY,
          radius: 44,
        },
      ],
      fieldZones: [],
      // 这一段按库仑定律算电场力：F = k·q·Q/r²，越近越强，没有边界。
      electronModel: 'coulomb',
      electrons: [
        // 第一道裂隙：电子悬在坑里偏前一点，负电荷被它向上、向前推开。
        // radius 只是画面上的光晕范围，力本身不受它限制。
        {
          id: 'memorial-4-electron-low',
          x: 32.5 * T,
          y: 370,
          radius: 200,
          scale: 1.2,
          phase: 0.9,
        },
        // 第二道裂隙：电子悬在裂隙上方偏左的地方。
        // 正电荷起跳后越靠近它，向上的拉力越大，刚好被带过裂隙。
        {
          id: 'memorial-4-electron-high',
          x: 67 * T,
          y: 150,
          radius: 150,
          scale: 1.2,
          phase: 2.2,
        },
        // 宽裂隙的第一跳：电子在坑里托住负电。
        {
          id: 'memorial-4-electron-c1',
          x: 78.5 * T,
          y: 370,
          radius: 210,
          scale: 1.2,
          phase: 1.4,
        },
        // 宽裂隙的第二跳：小岛上换成正电以后，对岸上方的电子把人拉过去。
        {
          id: 'memorial-4-electron-c2',
          x: 87 * T,
          y: 160,
          radius: 150,
          scale: 1.2,
          phase: 3.1,
        },
      ],
      hazards: [
        // 裂隙的致死面贴着台沿往下一点：掉下去就退回上一个落脚点。
        // 不能留太深——1/r² 的拉力会在电子上方托住人，
        // 致死面抬高以后，托在半空也会被算作掉下去。
        { type: 'void', x: gapA.x * T, y: 400, w: gapA.w * T, h: 80, killY: 350 },
        { type: 'void', x: gapB.x * T, y: 400, w: gapB.w * T, h: 80, killY: 350 },
        { type: 'void', x: gapC1.x * T, y: 400, w: gapC1.w * T, h: 80, killY: 350 },
        { type: 'void', x: gapC2.x * T, y: 400, w: gapC2.w * T, h: 80, killY: 350 },
      ],
      checkpoints: [
        makeCheckpoint(38 * T, groundAt(38) - PLAYER.HEIGHT, '第 4 段 · 第一道裂隙后'),
        makeCheckpoint(58 * T, groundAt(58) - PLAYER.HEIGHT, '第 4 段 · 第二道裂隙前'),
        makeCheckpoint(73.5 * T, groundAt(74) - PLAYER.HEIGHT, '第 4 段 · 宽裂隙前'),
        makeCheckpoint(84 * T, groundAt(84) - PLAYER.HEIGHT, '第 4 段 · 宽裂隙的小岛'),
        makeCheckpoint(93 * T, groundAt(93) - PLAYER.HEIGHT, '第 4 段 · 宽裂隙后'),
      ],
      memorials,
      solaces,
      tutorialSteps: [],
    };
  }

  /**
   * 「魑魅魍魉」的六段夜路。
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
    // 潭面只挖到 31 格，32–34 三格留着，再被下面的三笔削成台阶；
    // 若把 32–34 也一起挖空，台阶就没了，掉进潭里的人会卡在岸边。
    paint(rows, 18, 16, 14, 4, '.');
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

  /**
   * 教程门跟着当前步骤开合：已经做完的课门都打开，当前这一课的门还关着。
   * 读档和重来都走这里，门的物理状态不会和教程进度对不上。
   */
  syncTutorialGates(step = 0) {
    if (!this.tutorialGates?.length) return;
    for (const gate of this.tutorialGates) gate.open = step > gate.step;
  }

  isSolid(col, row) {
    // 教程里还没做完的那一课：整列都有一道看不见的光墙，跳也翻不过去。
    if (this.tutorialGates?.length) {
      for (const gate of this.tutorialGates) {
        if (!gate.open && col === gate.tile && row < GROUND_ROW) return true;
      }
    }
    const tile = this.getTile(col, row);
    return (
      tile === '#' ||
      tile === 'B' ||
      tile === 'C' ||
      tile === 'G' ||
      // 第三段的铁门上方那层看不见的符障：挡跳跃，不挡视线以外的路。
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
   *
   * 库仑定律 F = k·q·Q/r²：
   *   - 方向沿两个电荷的连线，同号相斥、异号相吸；
   *   - 大小随距离平方反比，场没有边界，几个电子按矢量叠加；
   *   - 电子在画面上有大小，当成半径 ELECTRON.radius 的均匀带电球：
   *     球外严格是 1/r²，球内按高斯定律线性减小，r → 0 时不会发散。
   * 没有「靠近到某个半径就封顶」这种事，力的大小完全由 r 决定。
   */
  getElectronAcceleration(x, y, charge) {
    if (charge === 0) return { x: 0, y: 0 };
    if (this.electronModel === 'bubble') {
      return this.getBubbleAcceleration(x, y, charge);
    }

    let ax = 0;
    let ay = 0;
    for (const electron of this.electrons) {
      const dx = x - electron.x;
      const dy = y - electron.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 1e-4) continue;

      const electronCharge = electron.charge ?? -1;
      const radius = ELECTRON.radius;
      const falloff =
        distance > radius ? 1 / (distance * distance) : distance / radius ** 3;
      // q 与 Q 同号时为正：力背离电子（相斥）；异号时为负：力指向电子（相吸）。
      const acceleration =
        ELECTRON.coulombConstant * charge * electronCharge * falloff;

      ax += (dx / distance) * acceleration;
      ay += (dy / distance) * acceleration;
    }
    return { x: ax, y: ay };
  }

  /**
   * 早期「有界气泡」模型：半径内按 (1 - d/R)² 衰减，半径外为零，加速度封顶。
   * 电磁长夜（糖纸街）的 80px 裂隙是按这套力摆的，暂时保留。
   */
  getBubbleAcceleration(x, y, charge) {
    let ax = 0;
    let ay = 0;
    for (const electron of this.electrons) {
      const dx = electron.x - x;
      const dy = electron.y - y;
      const distance = Math.hypot(dx, dy);
      if (distance <= 0 || distance > electron.radius) continue;

      const falloff = 1 - distance / electron.radius;
      const acceleration = Math.min(
        ELECTRON.legacyMaxAcceleration,
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

  /** 改动一格地形。科学怪人撞墙和第三段的门都用它。 */
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

  /**
   * 集合门开始下沉：格子先不再按地形画（否则原地会留一堵墙），
   * 碰撞保留到 endGateSink 再撤。
   */
  beginGateSink(gate) {
    gate.sinking = true;
    gate.sinkT = 0;
    for (const cell of gate.tiles ?? []) {
      this.sinkingCells.add(`${cell.col},${cell.row}`);
    }
  }

  endGateSink(gate) {
    gate.sinking = false;
    for (const cell of gate.tiles ?? []) {
      this.sinkingCells.delete(`${cell.col},${cell.row}`);
    }
  }

  isSinkingCell(col, row) {
    return this.sinkingCells.has(`${col},${row}`);
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

  /** 提灯人的灯会被墙和关着的门挡住。 */
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
