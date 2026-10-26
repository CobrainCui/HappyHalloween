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
 * 其余八户各守一扇不同的门：找规律、脑筋急转弯、万圣知识问答、翻牌配对、
 * 找不同、天平推理、真假话，以及狼人的屋顶追月闯关。
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
    line: '我睡不着，在床单上写了三个问题。你答上来，羽毛糖给你。',
    taskTitle: '床单上的三个问题',
    taskText: '回答小飘的三道脑筋急转弯。',
    success: '三盏窗都亮了。小飘把床单掀开又盖上，羽毛糖落进你的袋子。',
    trickLine: '小飘追到一半被晾衣绳挂住了。羽毛糖在你口袋里。',
    task: { type: 'puzzle', puzzle: 'ghost' },
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
    line: '月亮要落山了。你踩着屋顶追上五个月亮记号，冲刺糖归你。',
    taskTitle: '追月亮',
    taskText: '在月亮落山前，按顺序踩过屋顶上的五个月亮记号。',
    success: '最后一个月亮记号在你脚下亮起来。阿嚎对着街尾长嚎，冲刺糖滚到你脚边。',
    trickLine: '阿嚎朝月亮追去了，没再回头。冲刺糖在你手里。',
    task: { type: 'chase', marks: 5, timeLimit: 20 },
  }),
  character({
    id: 'mummy',
    index: 6,
    tile: 59,
    name: '阿绷',
    title: '木乃伊',
    kind: '木乃伊',
    draw: 'mummy',
    palette: YOKAI.mummy.palette,
    accent: '#e6cf9c',
    candyType: 'moonGravity',
    line: '我的绷带下面藏着八对图案。你把它们一一配对，月亮糖就给你。',
    taskTitle: '绷带下的图案',
    taskText: '翻开十六张绷带牌，把八对图案全部配出来。',
    success: '最后一张绷带松开。阿绷把月亮糖递下来，身上轻了一截。',
    trickLine: '阿绷最后被自己的绷带绊住了。月亮糖还在你手里。',
    task: { type: 'puzzle', puzzle: 'mummy' },
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
    line: '我脑袋里的线路又乱了。你答对四个万圣节的问题，二段跳糖归你。',
    taskTitle: '四道万圣题',
    taskText: '回答阿壮提出的四道万圣节问题。',
    success: '最后一个答案落进阿壮的脑袋。他把二段跳糖拍在你手心。',
    trickLine: '阿壮一脚踩塌了半条巷子的木箱。二段跳糖在你手里。',
    task: { type: 'puzzle', puzzle: 'franken' },
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
    line: '两扇窗一模一样——才怪。你找出四处不同，蹬墙糖归你。',
    taskTitle: '两扇窗',
    taskText: '在右边的窗里找出四处和左边不一样的地方。',
    success: '煤球用尾巴扫了扫右边那扇窗。蹬墙糖从窗缝里滚出来。',
    trickLine: '煤球从屋顶一路跟到街尾，看你跑出去就坐下了。蹬墙糖归你。',
    task: { type: 'puzzle', puzzle: 'cat' },
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
    line: '盘子里的南瓜和糖，得按份量摆平。你把三杆秤都算对，疾风糖归你。',
    taskTitle: '南瓜秤',
    taskText: '根据三组平衡关系，算出每道题里南瓜换多少颗糖。',
    success: '三杆秤都平了。老瓤笑得南瓜籽乱蹦，把疾风糖放进你手里。',
    trickLine: '老瓤追得南瓜籽掉了一路。疾风糖在你手里。',
    task: { type: 'puzzle', puzzle: 'pumpkinKing' },
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
    line: '三只箱子，只有一只写着真话。你找出糖在哪只箱子，护身糖就归你。',
    taskTitle: '三只箱子',
    taskText: '每轮只有一句箱子上写的是真话，找出糖在哪只箱子。',
    success: '最后一只箱子开了。德古从阴影里递出护身糖，没露出牙。',
    trickLine: '德古化成一群蝙蝠追了半条街，最后没敢进灯光里。护身糖归你。',
    task: { type: 'puzzle', puzzle: 'vampire' },
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
    '你走到街尾。帮过的人、捣过蛋的人、没敲的门，都留在身后。糖袋里的糖可以带到任何一条路上：按 Q 打开，挑一颗吃掉。',
  roomLeave: '街上的门还开着。',
});

/**
 * 「捣蛋」不再给随机糖：抢过这一户的糖就跑，钻进糖纸街屋后的巷子。
 *
 * 这是一条纯竞速赛道：一直往右跑，跳过木箱、晾衣绳下的矮棚和屋顶断口；
 * 追兵从身后压上来，追上就把糖拿走。跑到街尾的栅门，拿到的永远是
 * 这一户自己的那颗糖——不抽奖，也不换糖。
 */
export const TRICK_RACE = Object.freeze({
  id: 'trick-race',
  name: '抢了就跑',
  place: '糖纸街后巷',
  intro:
    '你从这户手里抢过糖，转身钻进屋后的巷子。别回头——跑到街尾的栅门，这颗糖就归你；被追上，糖会被拿回去。',
  reminder: '一直往右跑。跳过木箱和屋顶断口；踩到糖浆会冲出去。被追上就要重来。',
  quit: '你掉头跑回街上。这户的糖还在他们手里。',
  escape: '你从栅门底下钻了出去。',
  // 被追的人跑得比平时快一点；这是副本里唯一一次真正的竞速。
  playerSpeedScale: 1.3,
  boostScale: 1.3,
  // 追兵从起跑线后方这么远开始；前 grace 秒不动，给玩家冲出后门的时间。
  startGap: 170,
  grace: 0.9,
  // 追兵基础速度随赛程从 128 涨到 138 px/s。玩家 135 px/s：
  // 跑得顺时追兵会被甩开，于是自动加速追到身后约 8 格；失误太多时
  // 追兵会贴近到 3 格内并稍微收力，留最后一次挣扎的机会。
  // 这不是随机，只是一条按距离写的追赶曲线。
  chaserStartSpeed: 128,
  chaserSpeedGain: 10,
  chaseLeadTiles: 8,
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

export function getTrickHouse(id) {
  return TRICK_HOUSE_BY_ID.get(id) ?? null;
}

export function getTrickHouseByRoom(room) {
  return TRICK_HOUSE_BY_ROOM.get(room) ?? null;
}
