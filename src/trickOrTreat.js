/**
 * Trick or Treat：糖纸街的十户人家。
 *
 * 这条副本只产出 buffCandies.js 里的普通增益糖，不碰诊断名。
 *
 * 规则：
 *   - 每户住着一位万圣夜人物，各自守着一颗固定的糖。
 *   - 敲门后可以「帮忙」：接下这一户的任务，完成后拿那一颗固定的糖。
 *   - 不想做任务可以「捣蛋」：抢过糖就跑，钻进这户屋后的巷子。
 *     跑到街尾的栅门、没被追上，拿到的一定是这一户自己的那颗糖；
 *     被追上，糖被拿回去，这一户留到下一趟。
 *   - 街尾的出口永远开着。没拿完、没敲过的门都可以留在身后。
 *
 * 两户的任务是一整间房：
 *   - 女巫的集合庭院（原追思小径第二段的赛道）
 *   - 男巫的电磁长夜（原追思小径第三段的赛道）
 * 其余八户各守一扇不同的门：找规律、心理统计选择题、屋顶追月、
 * 绷带记忆、线性代数、万圣夜问答、几何、古堡灯阵。
 *
 * 门口的东西也跟着这一户走：女巫门口长蘑菇和晶体，骷髅门口堆骨头，
 * 南瓜王门口一水儿的南瓜灯。街上的南瓜只留几颗，不再每家门口都堆一堆。
 */
import { BUFF_CANDIES } from './buffCandies.js';
import { YOKAI } from './parade.js';

function candyOf(type) {
  const candy = BUFF_CANDIES[type];
  return {
    candyType: type,
    candyName: candy.name,
    candyTag: candy.tag,
    candyGlyph: candy.glyph,
    candyAccent: candy.accent,
  };
}

function character(def) {
  return Object.freeze({
    ...def,
    ...candyOf(def.candyType),
  });
}

export const TRICK_HOUSES = Object.freeze([
  character({
    id: 'witch',
    index: 1,
    tile: 9,
    name: '莫尔',
    title: '女巫',
    kind: '女巫',
    draw: 'witch',
    palette: YOKAI.witch.palette,
    accent: '#c9a7ff',
    candyType: 'magnet',
    line: '我的庭院里，东西总在半夜换位置。你要是能按门顶的图把它们分回去，我就把磁力糖给你。',
    taskTitle: '集合庭院',
    taskText: '按门顶的图把庭院里的东西放回对应位置，让那道石门沉下去。',
    success: '石门沉下去了。莫尔把磁力糖放进你的袋子。',
    trickLine: '莫尔追到巷口就停了，喘着气骂了一句。你手里还攥着磁力糖。',
    task: { type: 'room', room: 'witch', levelId: 'trick-witch' },
    // 女巫门口：药草、菌子和一块会发光的晶体。
    decor: [
      { type: 'mushroom', dx: -4 },
      { type: 'mushroom', dx: -3 },
      { type: 'crystal', dx: 4, scale: 0.8 },
    ],
    raceTwist: '巷子被清空了，只剩一条条长屋顶——走屋顶才快。',
  }),
  character({
    id: 'warlock',
    index: 2,
    tile: 19,
    name: '奥兹',
    title: '男巫',
    kind: '男巫',
    draw: 'witch',
    palette: {
      body: '#3c3358',
      light: '#6a5a92',
      dark: '#191326',
      skin: '#c9a27a',
      eye: '#ffe08a',
      hat: '#241d38',
      broom: '#5a3a2e',
    },
    accent: '#8d7bff',
    candyType: 'flight',
    line: '地窖里的电子厅又漏电了。你替我走到最里面的门，飞天糖归你。',
    taskTitle: '电磁长夜',
    taskText: '穿过电子厅和两口熔岩井，走到地窖最深处的门。',
    success: '地窖的门开了。奥兹把飞天糖抛给你，转身去关总闸。',
    trickLine: '奥兹追到地窖后门就回去了，说总闸还没关。飞天糖在你手里。',
    task: { type: 'room', room: 'warlock', levelId: 'trick-warlock' },
    // 男巫门口：两块晶体和一枚刻着符文的石头。
    decor: [
      { type: 'crystal', dx: -4, scale: 0.7 },
      { type: 'crystal', dx: -3, scale: 0.95 },
      { type: 'rune', dx: 3 },
      { type: 'skullPile', dx: 4 },
    ],
    raceTwist: '桥洞和屋顶各是一条路：洞里糖浆多，桥上干净。',
  }),
  character({
    id: 'skeleton',
    index: 3,
    tile: 29,
    name: '阿骨',
    title: '骷髅',
    kind: '骷髅',
    draw: 'skeleton',
    palette: YOKAI.boneA.palette,
    accent: '#e9e1cc',
    candyType: 'spring',
    line: '骨头又乱了。你要是能看出它们排的规矩，弹簧糖就归你。',
    taskTitle: '骨牌上的数',
    taskText: '看阿骨摆的三排骨阵，接上最后一堆。',
    success: '最后一堆骨头落回原位。阿骨把弹簧糖弹到你手里。',
    trickLine: '阿骨追着追着散成了一地骨头。你攥着弹簧糖跑出了巷子。',
    task: { type: 'puzzle', puzzle: 'skeleton' },
    // 骷髅门口：两堆骨头，一块歪掉的墓碑，一段断栅栏。
    decor: [
      { type: 'grave', dx: -4, variant: 1, layer: 'back' },
      { type: 'skullPile', dx: -3 },
      { type: 'skullPile', dx: 3 },
      { type: 'fence', dx: 4, length: 2 },
    ],
    raceTwist: '一路都是矮矮的骨堆，抬脚抬个不停。',
  }),
  character({
    id: 'ghost',
    index: 4,
    tile: 39,
    name: '小飘',
    title: '床单幽灵',
    kind: '幽灵',
    draw: 'sheet',
    palette: YOKAI.sheet.palette,
    accent: '#d7ecff',
    candyType: 'feather',
    line: '我睡不着，在床单上抄了三道心理统计的题。你答上来，羽毛糖给你。',
    taskTitle: '床单上的统计题',
    taskText: '回答小飘出的三道初级心理统计题。',
    success: '三盏窗都亮了。小飘把床单掀开又盖上，羽毛糖落进你的袋子。',
    trickLine: '小飘追到一半被晾衣绳挂住了。羽毛糖在你口袋里。',
    task: { type: 'puzzle', puzzle: 'ghost' },
    // 幽灵门口：旧墓碑、晾衣绳旁的灯，还有一支点不着的蜡烛。
    decor: [
      { type: 'lamp', dx: -4 },
      { type: 'mushroom', dx: -3 },
      { type: 'grave', dx: 3, variant: 0, layer: 'back' },
      { type: 'candle', dx: 4 },
    ],
    raceTwist: '晾衣绳挂在屋顶之间，屋顶高、断口多。',
  }),
  character({
    id: 'werewolf',
    index: 5,
    tile: 49,
    name: '阿嚎',
    title: '狼人',
    kind: '狼人',
    draw: 'wolf',
    palette: YOKAI.wolf.palette,
    accent: '#d7b98a',
    candyType: 'dash',
    line: '月亮快落到屋脊后面了。你踩过屋顶的八道月光，冲刺糖归你——阿嚎就在最高的那条屋脊上。',
    taskTitle: '屋顶追月',
    taskText: '按号码踩过八道月光。阿嚎在最高的屋脊上来回走，碰到要重来——等它走开再上去。',
    success: '最后一道月光在你脚下亮起。阿嚎对天长嚎，冲刺糖滚到你脚边。',
    trickLine: '阿嚎朝月亮追去了，没再回头。冲刺糖在你手里。',
    task: {
      type: 'chase',
      marks: 8,
      // 给足来回一趟的时间：屋脊上要等阿嚎走开，时间卡太死就只剩硬冲。
      timeLimit: 18,
      // 八道月光：先在左边几级矮屋顶上折着往上爬，翻上最高的那条屋脊，
      // 从阿嚎的地盘横过去，再一级级落回右边。记号按平台顺序排，
      // 所以爬到顶以后要往右横穿，方向是折的。
      // 第六道（屋脊下来的第一级）往里收了一格，几乎就在第五道正下方：
      // 碰到屋脊上的阿嚎以后再往前走一小步就能落下来，不用摸到它折返的右端。
      platforms: [
        [42, 14, 3],
        [43, 12, 3],
        [40, 10, 3],
        [44, 8, 3],
        [48, 6, 10],
        [53, 8, 3],
        [52, 10, 3],
        [51, 12, 3],
      ],
      // 阿嚎在最高那条屋脊上（51～56 格之间）来回走。碰到它会被扑下屋顶，
      // 月亮记号全部作废。它慢，但守的正是必经的那一段；慢到看得清它什么时候走开。
      guard: { row: 6, leftTile: 51, rightTile: 56, speed: 26 },
    },
    // 狼人门口：一堆啃剩的骨头、一段被撞歪的栅栏和一棵蹭过爪子的树。
    decor: [
      { type: 'fence', dx: -4, length: 2 },
      { type: 'skullPile', dx: -3 },
      { type: 'grave', dx: 3, variant: 2, layer: 'back' },
      { type: 'tree', dx: 4, scale: 0.85, layer: 'back' },
    ],
    raceTwist: '他跑得最快——巷子里几乎没有能绊住他的东西。',
  }),
  character({
    id: 'mummy',
    index: 6,
    tile: 59,
    name: '绷布祝',
    title: '木乃伊',
    kind: '木乃伊',
    draw: 'mummy',
    palette: YOKAI.mummy.palette,
    accent: '#e6cf9c',
    candyType: 'moonGravity',
    line: '我的绷带一层套一层，每一层都留了记号。你照着顺序记下来，月亮糖就给你。',
    taskTitle: '绷带上的记号',
    taskText: '看清绷带依次亮起的记号，再照着顺序点一遍。一段比一段长。',
    success: '最后一圈绷带松开。绷布祝把月亮糖递下来，身上轻了一截。',
    trickLine: '绷布祝最后被自己的绷带绊住了。月亮糖还在你手里。',
    task: { type: 'puzzle', puzzle: 'mummy' },
    // 绷布祝门口：墓碑、一地的骨头，还有一支烧到一半的蜡烛。
    decor: [
      { type: 'grave', dx: -3, variant: 2, layer: 'back' },
      { type: 'mushroom', dx: -4 },
      { type: 'candle', dx: 3 },
      { type: 'skullPile', dx: 4 },
    ],
    raceTwist: '绷带铺成了矮墙，一截接一截，停不下来。',
  }),
  character({
    id: 'franken',
    index: 7,
    tile: 69,
    name: '阿壮',
    title: '科学怪人',
    kind: '科学怪人',
    draw: 'franken',
    palette: YOKAI.franken.palette,
    accent: '#9fcf8f',
    candyType: 'doubleJump',
    line: '我脑袋里的线路又乱了，全是矩阵。你答对四道线性代数的题，二段跳糖归你。',
    taskTitle: '四道矩阵题',
    taskText: '回答阿壮提出的四道初级线性代数题。',
    success: '最后一根线接上了。阿壮把二段跳糖拍在你手心。',
    trickLine: '阿壮一脚踩塌了半条巷子的木箱。二段跳糖在你手里。',
    task: { type: 'puzzle', puzzle: 'franken' },
    // 科学怪人门口：通电的晶体、他搬来的栅栏和一堆头骨。
    decor: [
      { type: 'skullPile', dx: -4 },
      { type: 'crystal', dx: -3, scale: 0.9 },
      { type: 'fence', dx: 3, length: 2 },
      { type: 'mushroom', dx: 4 },
    ],
    raceTwist: '木箱又高又宽，得跳着过；中间有一道箱梯，能爬到屋檐上。',
  }),
  character({
    id: 'cat',
    index: 8,
    tile: 79,
    name: '煤球',
    title: '黑猫',
    kind: '黑猫',
    draw: 'cat',
    palette: YOKAI.cat.palette,
    accent: '#a8d8ff',
    candyType: 'wallStep',
    line: '万圣夜的事我全都记得——南瓜灯、黑猫、敲门要糖。你答得上来，蹬墙糖让给你。',
    taskTitle: '黑猫的万圣夜问答',
    taskText: '回答四道关于万圣夜来历和习俗的选择题。',
    success: '煤球用尾巴扫了扫门槛，蹬墙糖从门缝里滚出来。',
    trickLine: '煤球从屋顶一路跟到街尾，看你跑出去就坐下了。蹬墙糖归你。',
    task: { type: 'puzzle', puzzle: 'cat' },
    // 黑猫门口：它蹲过的蘑菇和一段栅栏，树上还留着爪印。
    decor: [
      { type: 'tree', dx: -4, scale: 0.8, layer: 'back' },
      { type: 'fence', dx: -3, length: 2 },
      { type: 'mushroom', dx: 3 },
      { type: 'mushroom', dx: 4 },
    ],
    raceTwist: '屋檐一级高一级低，连着跳才甩得开。',
  }),
  character({
    id: 'pumpkinKing',
    index: 9,
    tile: 89,
    name: '老瓤',
    title: '南瓜王',
    kind: '南瓜王',
    draw: 'franken',
    palette: {
      body: '#c47a2c',
      light: '#f0a94c',
      dark: '#5a3418',
      bolt: '#f2d29a',
      stitch: '#7d4a1f',
      eye: '#fff0a8',
    },
    accent: '#ffb347',
    candyType: 'tailwind',
    line: '我的南瓜地是按图种的：平行线、三角形、角平分线，一样都糊弄不过去。你看得懂图，疾风糖归你。',
    taskTitle: '南瓜地上的图',
    taskText: '看图回答四道初中几何题：平行线、全等、等腰三角形和角平分线。',
    success: '四张图都看明白了。老瓤笑得南瓜籽乱蹦，把疾风糖放进你手里。',
    trickLine: '老瓤追得南瓜籽掉了一路。疾风糖在你手里。',
    task: { type: 'puzzle', puzzle: 'pumpkinKing' },
    // 南瓜王门口：一排南瓜灯，和一只装糖的桶。
    decor: [
      { type: 'candyBucket', dx: -4 },
      { type: 'jackOLantern', dx: -3, variant: 0 },
      { type: 'jackOLantern', dx: 3, variant: 1 },
      { type: 'jackOLantern', dx: 4, variant: 2 },
    ],
    raceTwist: '南瓜全堵在巷子里，推不开就跳。',
  }),
  character({
    id: 'vampire',
    index: 10,
    tile: 99,
    name: '德古',
    title: '吸血鬼',
    kind: '吸血鬼',
    draw: 'bat',
    palette: YOKAI.bat.palette,
    accent: '#ff8f9a',
    candyType: 'ward',
    line: '古堡的窗子灭了好几扇。你把它们全点亮，护身糖归你。',
    taskTitle: '古堡的窗',
    taskText: '点一扇窗，它和上下左右的窗都会翻转一次。把每一轮的窗全部点亮。',
    success: '最后一个窗格亮起来。德古从阴影里递出护身糖，没露出牙。',
    trickLine: '德古化成一群蝙蝠追了半条街，最后没敢进灯光里。护身糖归你。',
    task: { type: 'puzzle', puzzle: 'vampire' },
    // 吸血鬼门口：墓碑、一支蜡烛和门廊的灯。
    decor: [
      { type: 'fence', dx: -4, length: 2 },
      { type: 'grave', dx: -3, variant: 0, layer: 'back' },
      { type: 'candle', dx: 3 },
      { type: 'lamp', dx: 4 },
    ],
    raceTwist: '德古不急，但越往后他跑得越快。',
  }),
]);

export const TRICK_HOUSE_BY_ID = new Map(TRICK_HOUSES.map((house) => [house.id, house]));
export const TRICK_HOUSE_BY_ROOM = new Map(
  TRICK_HOUSES.filter((house) => house.task.type === 'room').map((house) => [
    house.task.room,
    house,
  ]),
);

export const TRICK_ROUTE = Object.freeze({
  id: 'trick',
  name: 'Trick or Treat',
  place: '糖纸街',
  totalHouses: TRICK_HOUSES.length,
  intro:
    '糖纸街的十户人家，各守着一颗糖。敲门问问：帮他们做完一件事，就能拿到那一颗；不想做，也可以抢了就跑——钻进屋后的巷子，没被追上，这颗糖就是你的。街尾随时可以走。',
  reminder: '帮忙 = 这一户的糖。捣蛋 = 抢了就跑，跑到街尾的栅门。街尾随时能离开。',
  complete:
    '你走到街尾。帮过的人、捣过蛋的人、没敲的门，都留在身后。糖袋里的糖可以带到任何一条路上：按 Tab 打开背包，挑一颗吃掉。',
  roomLeave: '街上的门还开着。',
});

/**
 * 「捣蛋」不再给随机糖：抢过这一户的糖就跑，钻进糖纸街屋后的巷子。
 *
 * 这是一条纯竞速赛道：一直往右跑，跳过木箱、晾衣绳下的矮棚和屋顶断口；
 * 追兵从身后压上来，追上就把糖拿走。跑到街尾的栅门，拿到的永远是
 * 这一户自己的那颗糖——不抽奖，也不换糖。
 *
 * 下面这些是公共的默认值；每一户在 TRICK_RACES 里改自己的巷子。
 */
export const TRICK_RACE = Object.freeze({
  id: 'trick-race',
  name: '抢了就跑',
  place: '糖纸街后巷',
  intro:
    '你从这户手里抢过糖，转身钻进屋后的巷子。别回头——跑到街尾的栅门，这颗糖就归你；被追上，糖会被拿回去。',
  reminder: '一直往右跑。巷子稳、头顶快：木箱、屋顶断口、桥洞、糖浆都是路。被追上就要重来。',
  quit: '你掉头跑回街上。这户的糖还在他们手里。',
  escape: '你从栅门底下钻了出去。',
  // 被追的人跑得比平时快一点；这是副本里唯一一次真正的竞速。
  playerSpeedScale: 1.3,
  boostScale: 1.3,
  // 追兵从起跑线后方这么远开始；前 grace 秒不动，给玩家冲出后门的时间。
  startGap: 170,
  grace: 0.9,
  // 追兵基础速度随赛程从 128 涨到 138 px/s。玩家 135 px/s：
  // 跑得顺时追兵会被甩开，于是自动加速追到身后约 5 格；失误太多时
  // 追兵会贴近到 3 格内并稍微收力，留最后一次挣扎的机会。
  // 这不是随机，只是一条按距离写的追赶曲线。
  chaserStartSpeed: 128,
  chaserSpeedGain: 10,
  chaseLeadTiles: 5,
  catchUpPerTile: 0.035,
  maxCatchUp: 1.25,
  mercyTiles: 3,
  mercyScale: 0.94,
  warnGapTiles: 6,
  dangerGapTiles: 3,
  // 后巷赛道：168 格宽，栅门在 160 格。地面没有即死缺口。
  lengthTiles: 168,
  spawnTile: 3,
  goalTile: 160,
});

/**
 * 十户人家各有一条自己的后巷。
 *
 * 每户的巷子用同样的零件搭，但排法和追兵都不一样。
 * 每条巷子都至少留两条走得通的路：巷子一条，上头一条（屋顶或桥面）。
 *   - crates   木箱 [x, 行, 宽]，一路砌到地面。两格高一跳能上，
 *              三格起要踩着旁边那一级爬（箱梯）；
 *   - roofs    单向木板 [x, 行, 宽]，从下面能跳上去，按 ↓ 落回巷子；
 *   - bridges  石桥面 [x, 行, 宽]，一格厚。底下留两格：能跑不能跳的桥洞，
 *              上面是一条比屋顶低一级的走道，两头踩一格木箱就上得去；
 *   - dips     巷底下沉一格 [x, 宽]，不掉命，只顿一下；
 *   - zones    糖浆加速带 [x, 宽, 倍率]；
 *   - chaser   这一户的追赶曲线（基础速度、增益、宽限）；
 *   - pumpkins  可推的南瓜，堵在屋顶快线的正下方。
 * 没写的字段沿用 TRICK_RACE 的默认值。
 */
export const TRICK_RACES = Object.freeze({
  // 女巫：一条接一条的长屋顶。屋顶几乎不断，只在三格宽的断口上跳；
  // 巷子里木箱稀、糖浆多——掉下来不疼，只是要从巷子里重新爬上去。
  witch: {
    crates: [
      [12, 14, 2], [20, 15, 2], [39, 14, 2], [50, 15, 2], [74, 14, 2],
      [82, 15, 2], [97, 14, 2], [118, 15, 2], [132, 14, 2], [145, 14, 2],
      [152, 15, 2],
    ],
    roofs: [
      [14, 12, 8], [23, 12, 7], [32, 12, 8], [42, 12, 9], [53, 12, 8],
      [64, 12, 10], [77, 12, 8], [88, 12, 9], [100, 12, 9], [112, 12, 8],
      [123, 12, 9], [135, 12, 9], [147, 12, 11],
    ],
    dips: [],
    zones: [[26, 5, 1.15], [66, 6, 1.18, 12], [90, 6, 1.2], [136, 6, 1.15, 12]],
    pumpkins: [30, 58, 86, 114, 150],
    laundry: [[16, 8, 18], [60, 7.5, 16], [124, 8, 17]],
    // 后巷陈设跟着这一户走：药草、菌子、几块发光的晶体。
    props: [
      ['sign', 5, { variant: 1 }], ['mushroom', 14], ['mushroom', 15],
      ['crystal', 25, { scale: 0.8 }], ['tree', 33], ['mushroom', 47],
      ['crystal', 63, { scale: 0.9 }], ['sign', 78, { variant: 0 }],
      ['lamp', 92], ['mushroom', 104], ['crystal', 121, { scale: 0.85 }],
      ['tree', 136], ['sign', 146, { variant: 1 }], ['candyBucket', 155],
    ],
    chaser: { startSpeed: 124, speedGain: 8, grace: 1.0 },
    hints: [
      { at: 6, text: '屋顶是一条接一条的快线：踩木箱跳上去，断口跳过去。' },
      { at: 58, text: '掉下来不疼，只是要从巷子里重新找木箱爬上去。' },
      { at: 138, text: '最后一段屋顶。栅门就在前面。' },
    ],
  },

  // 男巫：三段桥洞，糖浆全铺在洞里。洞口一格木箱能跳上桥面，
  // 桥面走完接一段屋顶——钻洞稳，上桥快，容易在人堆里挑花眼。
  warlock: {
    crates: [
      [16, 15, 2], [22, 14, 2], [29, 15, 1], [48, 15, 1], [54, 14, 2],
      [64, 15, 2], [70, 15, 1], [79, 15, 1], [100, 15, 2], [106, 14, 2],
      [118, 15, 1], [124, 15, 2], [129, 15, 1], [148, 14, 2], [154, 15, 1],
    ],
    roofs: [[40, 12, 7], [58, 12, 9], [90, 12, 8], [108, 12, 9], [138, 12, 7]],
    bridges: [[30, 13, 10], [80, 13, 10], [130, 13, 8]],
    dips: [],
    zones: [
      [32, 6, 1.2], [50, 4, 1.15], [82, 6, 1.25], [132, 4, 1.2], [150, 4, 1.15],
    ],
    pumpkins: [20, 44, 68, 96, 116, 146],
    laundry: [[24, 8, 15], [72, 7.5, 16], [122, 8, 15]],
    // 后巷陈设：通着电的晶体、刻着符文的石头、一堆头骨。
    props: [
      ['sign', 8, { variant: 0 }], ['crystal', 18, { scale: 0.75 }],
      ['crystal', 19], ['rune', 27], ['skullPile', 46], ['crystal', 62],
      ['lamp', 74], ['rune', 95], ['crystal', 112, { scale: 0.9 }],
      ['sign', 120], ['skullPile', 138], ['lamp', 152],
    ],
    chaser: { startSpeed: 120, speedGain: 10 },
    hints: [
      { at: 6, text: '桥洞里能跑不能跳，糖浆就铺在里面。' },
      { at: 22, text: '洞口那格木箱是上桥面的台阶——钻洞还是上桥，自己挑。' },
      { at: 140, text: '最后一段。栅门就在前面。' },
    ],
  },

  // 骷髅：骨头矮墙一截接一截，几乎一路都在跳；中段一座断开的石桥，
  // 桥面中间有个缺口，掉下去就得从桥洞里钻过去。
  skeleton: {
    crates: [
      [10, 15, 1], [15, 15, 1], [20, 15, 1], [26, 15, 1], [31, 15, 1],
      [33, 14, 2], [36, 15, 1], [42, 15, 1], [47, 15, 1], [52, 15, 1],
      [58, 15, 1], [59, 15, 1], [76, 15, 1],
      [82, 15, 1], [85, 14, 2], [87, 15, 1], [93, 15, 1], [98, 15, 1],
      [104, 15, 1], [109, 15, 1], [115, 15, 1], [122, 15, 1], [127, 15, 1],
      [133, 15, 1], [135, 14, 2], [138, 15, 1], [144, 15, 1], [150, 15, 1],
      [155, 15, 1],
    ],
    roofs: [[22, 12, 6], [40, 12, 7], [88, 12, 8], [130, 12, 8]],
    bridges: [[60, 13, 6], [67, 13, 7]],
    dips: [[74, 2], [111, 2]],
    zones: [[12, 4, 1.12], [48, 4, 1.15], [100, 5, 1.18], [142, 4, 1.15]],
    pumpkins: [24, 55, 79, 110, 128, 153],
    laundry: [[18, 9, 14], [92, 9, 14]],
    // 后巷陈设：一地骨头、歪掉的墓碑和断栅栏。
    props: [
      ['sign', 6], ['skullPile', 13], ['grave', 24, { variant: 1 }],
      ['skullPile', 30], ['fence', 45, { length: 2 }], ['skullPile', 61],
      ['grave', 78, { variant: 0 }], ['sign', 90], ['skullPile', 101],
      ['fence', 118, { length: 3 }], ['skullPile', 131],
      ['grave', 142, { variant: 2 }], ['lamp', 154],
    ],
    chaser: { startSpeed: 126, speedGain: 6 },
    hints: [
      { at: 6, text: '阿骨把骨头摆成一跺一跺的：踏上节奏比蛮跑快。' },
      { at: 60, text: '桥面中间断开一格，掉下去就得从桥洞里钻过去。' },
      { at: 140, text: '最后一段骨堆。栅门就在前面。' },
    ],
  },

  // 幽灵：屋顶又高又断，断口都是三格；中段一整排更高的屋檐在巷子上头，
  // 从矮屋顶一级一级跳上去，再一口气滑到中段尽头。
  ghost: {
    crates: [
      [10, 14, 2], [20, 15, 2], [38, 15, 2], [57, 14, 2], [70, 15, 2],
      [96, 15, 2], [107, 14, 2], [118, 15, 2], [126, 14, 2], [140, 15, 2],
      [144, 14, 2],
    ],
    roofs: [
      [12, 12, 6], [21, 12, 6], [30, 12, 7], [40, 12, 6], [49, 12, 7],
      [58, 12, 6], [65, 11, 3], [68, 10, 9], [79, 10, 9], [90, 10, 8],
      [110, 12, 7], [119, 12, 7], [128, 12, 7], [137, 12, 7], [146, 12, 7],
    ],
    dips: [],
    zones: [[46, 5, 1.18], [70, 6, 1.2, 10], [91, 5, 1.15, 10], [136, 5, 1.16]],
    pumpkins: [16, 34, 52, 74, 101, 121, 148],
    laundry: [
      [12, 8.5, 14], [34, 7.5, 15], [58, 8, 16], [96, 7.5, 17], [126, 8, 15],
    ],
    // 后巷陈设：路灯、晾衣绳下面的蜡烛和两块墓碑。
    props: [
      ['sign', 7], ['lamp', 14], ['grave', 27, { variant: 0 }],
      ['lamp', 41], ['candle', 55], ['mushroom', 66], ['lamp', 79],
      ['grave', 92, { variant: 1 }], ['sign', 105], ['candle', 119],
      ['lamp', 133], ['mushroom', 147], ['candyBucket', 156],
    ],
    chaser: { startSpeed: 126, speedGain: 8, mercyScale: 0.92 },
    hints: [
      { at: 6, text: '小飘的屋顶断口都是三格：跳之前先看落脚点。' },
      { at: 64, text: '前面一排更高的屋檐——从矮屋顶一级一级跳上去。' },
      { at: 120, text: '后半段还有一排屋顶。别在巷子里磨。' },
    ],
  },

  // 狼人：最空的一条巷子，也是最快的追兵。只有两段矮屋顶可以抄，
  // 其余全靠糖浆和不停脚。他仍然贴得最紧，但追得不那么死：
  // 起步多给一点时间，领先到 5.5 格才加速，追上来的幅度也收小了，
  // 4 格内就开始收力——一顿两顿还追得回来，连摔三次才会被扑倒。
  werewolf: {
    crates: [
      [24, 15, 1], [40, 14, 2], [92, 15, 1], [110, 14, 2], [126, 15, 1],
      [150, 15, 2],
    ],
    roofs: [[42, 12, 8], [112, 12, 8]],
    dips: [],
    zones: [[36, 5, 1.2], [72, 5, 1.15], [100, 5, 1.2], [144, 4, 1.15]],
    pumpkins: [30, 70, 104, 138],
    laundry: [[64, 8.5, 16]],
    // 后巷陈设：树、被撞歪的栅栏、啃剩的骨头。
    props: [
      ['sign', 9], ['tree', 20, { scale: 0.8 }], ['fence', 32, { length: 2 }],
      ['skullPile', 45], ['tree', 58], ['grave', 66, { variant: 2 }],
      ['fence', 78, { length: 3 }], ['sign', 96],
      ['tree', 108, { scale: 0.9 }], ['skullPile', 122],
      ['fence', 136, { length: 2 }], ['lamp', 150],
    ],
    chaser: {
      startSpeed: 126,
      speedGain: 11,
      grace: 0.9,
      chaseLeadTiles: 5.5,
      catchUpPerTile: 0.06,
      maxCatchUp: 1.28,
      mercyTiles: 3.5,
      mercyScale: 0.9,
    },
    playerScale: 1.36,
    hints: [
      { at: 6, text: '阿嚎的巷子最空，也最快——别停，一点都别停。' },
      { at: 130, text: '最后一段。他还在后面。' },
    ],
  },

  // 木乃伊：一截接一截的矮墙，几乎一路都在跳；中段一段断开两处的桥洞，
  // 钻洞最省力，但洞里没有糖浆。
  mummy: {
    crates: [
      [12, 15, 1], [18, 15, 1], [24, 15, 1], [29, 14, 2], [31, 15, 1],
      [36, 15, 2], [44, 15, 1], [50, 15, 1], [56, 15, 2], [63, 15, 1],
      [70, 15, 1], [76, 15, 1], [83, 15, 1], [87, 15, 1], [99, 15, 1],
      [102, 15, 1], [108, 15, 2], [115, 15, 1], [117, 14, 2], [122, 15, 1],
      [128, 15, 1], [135, 15, 1], [141, 15, 1], [148, 15, 1], [154, 15, 1],
    ],
    roofs: [[30, 12, 6], [118, 12, 7]],
    bridges: [[88, 13, 4], [93, 13, 4]],
    dips: [],
    zones: [[47, 4, 1.12], [90, 4, 1.15], [104, 4, 1.15], [140, 4, 1.12]],
    pumpkins: [22, 60, 98, 133, 151],
    laundry: [[40, 9, 14], [74, 9, 15], [126, 9, 15]],
    // 后巷陈设：墓碑、蜡烛和一卷卷的绷带（蘑菇当绷带疙瘩）。
    props: [
      ['sign', 6], ['grave', 16, { variant: 2 }], ['candle', 27],
      ['skullPile', 39], ['mushroom', 51], ['grave', 63, { variant: 0 }],
      ['candle', 75], ['sign', 86], ['skullPile', 100],
      ['grave', 112, { variant: 1 }], ['mushroom', 126], ['candle', 140],
      ['lamp', 153],
    ],
    chaser: { startSpeed: 122, speedGain: 10 },
    hints: [
      { at: 6, text: '绷布祝的巷子里全是矮墙：一截接一截，停不下来。' },
      { at: 84, text: '前面是一段桥洞：钻过去比爬上去省力。' },
      { at: 130, text: '最后几道绷带。栅门就在前面。' },
    ],
  },

  // 科学怪人：木箱又高又宽，得跳着过；中段是一座箱梯，
  // 一格一级爬上最高的那排屋檐，从整片箱子上面走过去。
  franken: {
    crates: [
      [16, 14, 3], [28, 14, 2], [42, 14, 3], [56, 14, 2], [66, 14, 3],
      [70, 13, 3], [74, 12, 3], [104, 14, 3], [118, 14, 2], [132, 14, 3],
      [146, 14, 2],
    ],
    roofs: [[31, 12, 7], [78, 11, 10], [90, 11, 9], [122, 12, 7]],
    dips: [[36, 2], [98, 2], [126, 2]],
    zones: [[34, 5, 1.15], [84, 4, 1.2], [142, 4, 1.15]],
    pumpkins: [22, 47, 62, 84, 110, 120, 138, 152],
    laundry: [[44, 8.5, 15], [128, 8.5, 16]],
    // 后巷陈设：通着电的晶体、头骨、他搬来的栅栏。
    props: [
      ['sign', 7], ['crystal', 20, { scale: 0.9 }], ['skullPile', 33],
      ['fence', 46, { length: 2 }], ['mushroom', 60],
      ['crystal', 72, { scale: 0.8 }], ['skullPile', 86], ['sign', 100],
      ['crystal', 112], ['fence', 124, { length: 3 }], ['mushroom', 140],
      ['skullPile', 154],
    ],
    chaser: { startSpeed: 124, speedGain: 10 },
    hints: [
      { at: 6, text: '阿壮搬来的木箱有两格高——跳之前留一步。' },
      { at: 64, text: '前面是一道箱梯：一格一级踩上去，能上屋檐。' },
      { at: 120, text: '最后几排木箱。栅门就在前面。' },
    ],
  },

  // 黑猫：屋檐一级高一级低，一路高低起伏；每一段都够长，
  // 跳早了落在段中间，跳晚了就掉回巷子从头爬。
  cat: {
    crates: [
      [8, 15, 2], [24, 15, 2], [48, 14, 2], [56, 15, 2], [62, 15, 1],
      [86, 15, 2], [96, 14, 2], [104, 15, 1], [118, 15, 2], [138, 15, 1],
      [152, 14, 2],
    ],
    roofs: [
      [10, 13, 6], [18, 12, 6], [26, 11, 6], [34, 10, 6], [42, 11, 6],
      [50, 12, 6], [58, 13, 6], [66, 12, 6], [74, 11, 6], [82, 10, 6],
      [90, 11, 6], [98, 12, 6], [106, 13, 6], [114, 12, 6], [122, 11, 6],
      [130, 10, 6], [138, 11, 6], [146, 12, 6], [154, 13, 6],
    ],
    dips: [],
    zones: [
      [36, 5, 1.18], [34, 4, 1.16, 10], [84, 6, 1.22], [82, 4, 1.18, 10],
      [134, 4, 1.16, 10],
    ],
    pumpkins: [22, 46, 79, 112, 144],
    laundry: [[20, 8, 14], [56, 7.5, 15], [136, 8, 14]],
    // 后巷陈设：树、菌子和它蹭过爪子的栅栏。
    props: [
      ['sign', 6], ['tree', 14, { scale: 0.8 }], ['mushroom', 26],
      ['fence', 40, { length: 2 }], ['tree', 54], ['mushroom', 68],
      ['lamp', 82], ['sign', 96], ['mushroom', 110],
      ['tree', 124, { scale: 0.9 }], ['fence', 138, { length: 2 }],
      ['candyBucket', 152],
    ],
    chaser: { startSpeed: 126, speedGain: 8 },
    hints: [
      { at: 6, text: '煤球的屋檐一级高一级低：跳准了才跟得上，掉下来就得重新爬。' },
      { at: 112, text: '最后一排屋檐。栅门就在前面。' },
    ],
  },

  // 南瓜王：巷子里塞满了南瓜，推不开就跳；两段长屋顶架在南瓜地上，
  // 上去以后一路清净，代价是要先踩木箱。
  pumpkinKing: {
    crates: [
      [20, 15, 1], [38, 15, 1], [56, 14, 2], [62, 15, 1], [68, 14, 2],
      [86, 15, 1], [110, 15, 1], [116, 14, 2], [134, 15, 1],
    ],
    roofs: [[58, 12, 8], [69, 12, 8], [118, 12, 9]],
    dips: [],
    zones: [[44, 5, 1.18], [92, 5, 1.25], [146, 4, 1.15]],
    pumpkins: [
      16, 22, 28, 34, 41, 47, 53, 59, 66, 72, 78, 84, 91, 97,
      103, 109, 114, 122, 128, 136, 141, 147, 153,
    ],
    laundry: [[30, 8.5, 15], [100, 8.5, 16]],
    // 后巷陈设：装糖的桶、蘑菇和路灯，南瓜自己铺了一地。
    props: [
      ['sign', 8], ['candyBucket', 18], ['mushroom', 32], ['sign', 46],
      ['candyBucket', 60], ['lamp', 74], ['mushroom', 88],
      ['candyBucket', 102], ['sign', 116], ['lamp', 130],
      ['candyBucket', 144], ['mushroom', 156],
    ],
    chaser: { startSpeed: 125, speedGain: 9 },
    hints: [
      { at: 6, text: '老瓤把南瓜全推进了巷子：推不开就跳过去。' },
      { at: 60, text: '屋顶上清净——先踩木箱跳上去。' },
      { at: 140, text: '最后一段南瓜。栅门就在前面。' },
    ],
  },

  // 吸血鬼：路最长、夜最深；桥洞、高檐、糖浆一样来一段，
  // 德古起步慢，越往后越快。
  vampire: {
    crates: [
      [20, 14, 2], [28, 15, 2], [34, 14, 2], [44, 15, 2], [49, 15, 1],
      [60, 15, 2], [64, 14, 2], [76, 15, 2], [88, 14, 2], [92, 15, 2],
      [100, 14, 2], [114, 15, 2], [120, 14, 2], [132, 15, 2], [140, 14, 2],
      [152, 15, 2],
    ],
    roofs: [
      [22, 12, 7], [36, 12, 7], [66, 12, 4], [70, 11, 9], [80, 11, 7],
      [102, 12, 8], [142, 12, 8],
    ],
    bridges: [[50, 13, 8]],
    dips: [],
    zones: [[44, 5, 1.15], [56, 6, 1.2], [88, 5, 1.2], [132, 4, 1.2]],
    pumpkins: [26, 46, 96, 124, 148],
    laundry: [[36, 8, 14], [80, 7.5, 16], [124, 8, 15]],
    // 后巷陈设：墓碑、蜡烛，和门口那几盏灯。
    props: [
      ['sign', 7], ['grave', 18, { variant: 0 }], ['candle', 30],
      ['lamp', 42], ['grave', 56, { variant: 1 }], ['candle', 68],
      ['fence', 80, { length: 2 }], ['sign', 94],
      ['grave', 108, { variant: 2 }], ['candle', 122], ['lamp', 136],
      ['grave', 150],
    ],
    chaser: { startSpeed: 118, speedGain: 16, grace: 1.2 },
    hints: [
      { at: 6, text: '德古不急。但越往后，他跑得越快。' },
      { at: 64, text: '中段有一排更高的屋檐，能一路走过去。' },
      { at: 120, text: '天快亮了——他就在后面。栅门就在前面。' },
    ],
  },
});

export function getTrickHouse(id) {
  return TRICK_HOUSE_BY_ID.get(id) ?? null;
}

export function getTrickHouseByRoom(room) {
  return TRICK_HOUSE_BY_ROOM.get(room) ?? null;
}

export function getTrickRace(houseId) {
  return (houseId && TRICK_RACES[houseId]) || null;
}
