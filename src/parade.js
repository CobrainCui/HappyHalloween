/**
 * 「魑魅魍魉」——一条和南瓜小径、四盏灯都无关的新线路，
 * 但仍然发生在万圣夜。
 *
 * 万圣节的晚上，雾见镇的南瓜灯一盏盏亮起来。子夜的第十三声钟敲过之后，
 * 镇上所有化装成鬼怪的孩子、屋檐下所有被刻成笑脸的影子，一起排成一支
 * 没有尽头的队伍——今年的魑魅魍魉，要从山道一直走到钟楼顶的百鬼门。
 *
 * 提灯的孩子提着祖传的南瓜灯笼走在队伍最前面。灯一旦点亮就不能放下：
 * 它照到哪里，鬼就跟到哪里；提灯人停下，队伍就会忘记自己要去哪儿。
 * 于是玩家成了整支队伍的头——你走多快，所有同行者就走多快；
 * 你跳，所有同行者一起跳。每经过一座石鼓，就有一位客人决定跟上你。
 * 到百鬼门前时一个都不能少，否则镇上的灯会在午夜一起熄灭。
 *
 * 六段路，队伍从一个人长到十一个人：
 *   山道 → 科学怪人：沉重，能撞塌裂石；
 *   雾町 → 床单幽灵：轻飘，跳得高、落得慢；
 *   雨川 → 沼泽怪：在水里灵活，能逆流上浮；
 *   废寺 → 蝙蝠与木乃伊：二段跳，以及每段一次的绷带兜底；
 *   墓园 → 骷髅兄弟与狼人：双腿提速，以及双击冲刺；
 *   钟楼 → 女巫与黑猫：滑翔，以及贴墙再蹬一次。
 *
 * 三条赛道：提灯夜路（原来的长度）、雾中长街（更长、落脚点更少）、
 * 无灯长夜（最长，每次有人被瘴气击中都要亲手留下一名同行者）。
 *
 * 单机，但玩家同时操控整支队伍：一套方向键，所有同行者一起响应。
 * 每个同行者的体型、重力、跳跃和水性都不同，所以同一个输入会在
 * 不同身体上长出不同的轨迹——关卡要同时容得下所有脚。
 */

export const PARADE_ROUTE = Object.freeze({
  id: 'parade',
  name: '魑魅魍魉',
  subtitle: '万圣夜的无尽队伍',
  totalStages: 6,
  intro:
    '第十三声钟响过，镇上的影子排成一队。你提着灯走在最前面。你走多快，后面的鬼就走多快。',
  finale:
    '百鬼门开了。所有人都到了。你把灯笼挂上门楣，影子们散了，回山里、雾里、水里和南瓜田。',
});

/**
 * 三条赛道共用同一段故事与六座地标，但长度、落脚点和「走散」的代价不同。
 * 简单赛道就是原来的六段夜路；普通与困难会在每一段里插进一截额外的夜路，
 * 并抽掉一部分落脚点。困难赛道里，每一次有人被瘴气击中都要亲手从名册上留下一人。
 *
 * annex：每段额外插入的夜路格数；0 = 保持原来的长度。
 * checkpointEvery：保留第 n 个落脚点（1 = 全部，2 = 隔一个，3 = 隔两个）。
 */
export const PARADE_TRACKS = Object.freeze([
  {
    id: 'easy',
    tier: '简单',
    name: '提灯夜路',
    badge: '原路',
    subtitle: '原来的六段 · 全部落脚点',
    detail: '全队被冲散后回到落脚点。',
    annex: 0,
    checkpointEvery: 1,
    currentScale: 1,
    lossRule: 'scatter',
    finale:
      '百鬼门开了。所有人都到了。你把灯笼挂上门楣，影子们散了，回山里、雾里、水里和南瓜田。',
  },
  {
    id: 'normal',
    tier: '普通',
    name: '雾中长街',
    badge: '加长',
    subtitle: '每段更长 · 落脚点减半',
    detail: '水流更急，瘴气更密。',
    annex: 10,
    checkpointEvery: 2,
    currentScale: 1.15,
    lossRule: 'scatter',
    finale:
      '百鬼门开了。影子比出发时多，也比出发时安静。你把灯笼举高，等最后一只脚跨过门槛。',
  },
  {
    id: 'hard',
    tier: '困难',
    name: '无灯长夜',
    badge: '送别',
    subtitle: '路最长 · 每次留下一人',
    detail: '有人中瘴气后留下一人，支援也会失效。提灯童子不能留下。',
    annex: 20,
    checkpointEvery: 3,
    currentScale: 1.3,
    lossRule: 'sacrifice',
    finale:
      '百鬼门开了。名册上有几个名字永远留在夜路上。灯没灭，剩下的人替他们走到了门前。',
  },
]);

const TRACK_BY_ID = new Map(PARADE_TRACKS.map((track) => [track.id, track]));

export function getParadeTrack(id) {
  return TRACK_BY_ID.get(id) ?? PARADE_TRACKS[0];
}

/** 组合技：两位同行者同时在队里时才成立。 */
export const PARADE_COMBOS = Object.freeze([
  {
    id: 'whirlwind',
    name: '扫帚旋风',
    members: ['bat', 'witch'],
    detail: '二段跳后按住 ↑',
  },
  {
    id: 'moondash',
    name: '月下连扑',
    members: ['wolf', 'bat'],
    detail: '二段跳后空中双击 ←/→',
  },
  {
    id: 'ninelives',
    name: '九命绷带',
    members: ['mummy', 'cat'],
    detail: '困难赛道每段免一次送别',
  },
]);

/** 同行者的图鉴。traits 由 Player 直接读取，draw 决定渲染时用哪副身体。 */
export const YOKAI = Object.freeze({
  lantern: {
    id: 'lantern',
    name: '提灯童子',
    title: '引路人',
    role: '你',
    stage: 0,
    draw: 'lantern',
    accent: '#ffb45e',
    traitLabel: '灯火',
    teamLabel: '引路',
    trait: '普通人的脚步。灯照到哪儿，队伍跟到哪儿。',
    line: '南瓜灯往哪儿照，路就往哪儿长。',
    traits: {},
  },
  franken: {
    id: 'franken',
    name: '科学怪人',
    title: '阿壮',
    role: '山里的客人',
    stage: 1,
    draw: 'franken',
    accent: '#9fcf8f',
    traitLabel: '沉重',
    teamLabel: '开路',
    trait: '走得慢、跳得低，但能撞塌裂石壁，全队都能过去。',
    line: '别盯我脖子上的螺丝。裂石我一肩膀就能顶开。顶开以后，糖分我一颗。',
    traits: {
      moveScale: 0.92,
      jumpScale: 0.96,
      gravityScale: 1.1,
      maxFallScale: 1.1,
      smash: true,
    },
    palette: {
      body: '#7fa86a',
      light: '#a8cf92',
      dark: '#2c332e',
      bolt: '#cfc6a8',
      stitch: '#3f4a3b',
      eye: '#ffe36e',
    },
  },
  sheet: {
    id: 'sheet',
    name: '床单幽灵',
    title: '小飘',
    role: '雾里的客人',
    stage: 2,
    draw: 'sheet',
    accent: '#ddd2ef',
    traitLabel: '轻飘',
    teamLabel: '全队轻风',
    trait: '自己跳得高、落得慢。同行时全队下落更轻。',
    line: '别拽我的床单。风一大，糖纸会吹跑，我得飘上屋檐去追。',
    traits: {
      moveScale: 1.05,
      jumpScale: 1.0,
      gravityScale: 0.62,
      maxFallScale: 0.56,
      frictionScale: 0.72,
    },
    palette: {
      body: '#ece6d8',
      light: '#fffaf0',
      dark: '#b9ad9d',
      shade: '#d8cfc0',
      eye: '#2a1c22',
    },
  },
  swamp: {
    id: 'swamp',
    name: '沼泽怪',
    title: '阿沼',
    role: '水里的客人',
    stage: 3,
    draw: 'swamp',
    accent: '#75c9a1',
    traitLabel: '水行',
    teamLabel: '全队划水',
    trait: '水里更快、更稳。同行时全队划水更省力。',
    line: '水里我比岸上自在。糖掉进河里，我潜下去捞。',
    traits: {
      moveScale: 0.94,
      jumpScale: 0.98,
      gravityScale: 1.02,
      water: true,
      waterMoveScale: 1.28,
      swim: 540,
    },
    palette: {
      body: '#4f8c62',
      light: '#83c787',
      dark: '#244633',
      fin: '#d9b44a',
      eye: '#ffe08a',
    },
  },
  bat: {
    id: 'bat',
    name: '蝙蝠',
    title: '小翼',
    role: '屋檐下的客人',
    stage: 4,
    draw: 'bat',
    accent: '#b18ad0',
    traitLabel: '二段跳',
    teamLabel: '全队二段跳',
    trait: '全队二段跳：起跳后松开 ↑，在空中再按一次。',
    line: '先跳，松开，再按一次。我带着全队再蹬一下。最高的那颗糖留给我。',
    traits: {
      moveScale: 1.0,
      jumpScale: 0.98,
      gravityScale: 0.95,
      extraJumps: 1,
    },
    palette: {
      body: '#5b3a66',
      light: '#8a5f97',
      dark: '#2a1732',
      wing: '#6d4a7a',
      wingLight: '#9a6fa8',
      eye: '#ffd86a',
      fang: '#fff4d6',
    },
  },
  mummy: {
    id: 'mummy',
    name: '木乃伊',
    title: '阿绷',
    role: '废寺里的客人',
    stage: 4,
    draw: 'mummy',
    accent: '#e6cf9c',
    traitLabel: '缠裹',
    teamLabel: '绷带兜底',
    trait: '每个落脚点一次：有人中瘴气时只把他拉回，全队不重来。',
    line: '别嫌我走得慢。绷带留着最后一圈，总有人用得上。',
    traits: {
      moveScale: 0.97,
      jumpScale: 1.0,
      gravityScale: 1.02,
    },
    palette: {
      body: '#ddd0ac',
      light: '#f3ead0',
      dark: '#8f8062',
      shade: '#b3a17c',
      eye: '#ffd86a',
    },
  },
  boneA: {
    id: 'boneA',
    name: '骷髅·一',
    title: '阿一',
    role: '墓园的客人',
    stage: 5,
    draw: 'skeleton',
    accent: '#e8957a',
    traitLabel: '碎步',
    teamLabel: '双子提速',
    trait: '腿短跑得快；两只骷髅都在时，全队提速。',
    line: '我们俩算一个还是两个？糖要两份，进门也要算两个。',
    traits: {
      moveScale: 1.1,
      jumpScale: 1.04,
      gravityScale: 0.95,
    },
    palette: {
      body: '#e9e1cc',
      light: '#fff9e8',
      dark: '#463b32',
      accent: '#c8553f',
      eye: '#ffb45e',
    },
  },
  boneB: {
    id: 'boneB',
    name: '骷髅·二',
    title: '阿二',
    role: '墓园的客人',
    stage: 5,
    draw: 'skeleton',
    accent: '#8fa8e0',
    traitLabel: '碎步',
    teamLabel: '双子提速',
    trait: '腿短跑得快；两只骷髅都在时，全队提速。',
    line: '门要是关着，我就从门缝底下爬进去，给你们开门。糖先归我。',
    traits: {
      moveScale: 1.08,
      jumpScale: 1.02,
      gravityScale: 0.96,
    },
    palette: {
      body: '#e9e1cc',
      light: '#fff9e8',
      dark: '#463b32',
      accent: '#5f74c8',
      eye: '#9fd0ff',
    },
  },
  wolf: {
    id: 'wolf',
    name: '狼人',
    title: '阿嚎',
    role: '墓园的客人',
    stage: 5,
    draw: 'wolf',
    accent: '#a9b8d8',
    traitLabel: '扑跃',
    teamLabel: '全队双击冲刺',
    trait: '地面快速双击 ←/→，全队向前冲一段。',
    line: '月亮一出来，脚就想跑。敲两下方向，全队一起扑。',
    traits: {
      moveScale: 1.04,
      jumpScale: 1.03,
      gravityScale: 0.98,
    },
    palette: {
      body: '#6e7686',
      light: '#a8b0bd',
      dark: '#2c313b',
      fur: '#8792a1',
      eye: '#ffe36e',
      fang: '#f6efd9',
    },
  },
  witch: {
    id: 'witch',
    name: '女巫',
    title: '阿帚',
    role: '钟楼的客人',
    stage: 6,
    draw: 'witch',
    accent: '#c9a6e8',
    traitLabel: '滑翔',
    teamLabel: '全队滑翔',
    trait: '全队滑翔：下落时按住 ↑，借扫帚的风。',
    line: '先跳，再按住 ↑。风会把整队兜住。别催，扫帚要先跟风商量。',
    traits: {
      moveScale: 1.02,
      jumpScale: 1.0,
      gravityScale: 1.0,
      glide: true,
    },
    palette: {
      body: '#7b5a9e',
      light: '#a98bc7',
      dark: '#2e1c3e',
      skin: '#8fbf7a',
      hat: '#3a2350',
      broom: '#a97a4a',
      eye: '#ffe36e',
    },
  },
  cat: {
    id: 'cat',
    name: '黑猫',
    title: '小夜',
    role: '钟楼里的客人',
    stage: 6,
    draw: 'cat',
    accent: '#b9a6d8',
    traitLabel: '猫步',
    teamLabel: '全队蹬墙跳',
    trait: '空中贴墙再按 ↑，全队蹬墙跳，不耗二段跳。',
    line: '墙不是用来挡的，是用来蹬的。跟着我的尾巴。',
    traits: {
      moveScale: 1.08,
      jumpScale: 1.05,
      gravityScale: 0.94,
    },
    palette: {
      body: '#2f2838',
      light: '#4a4056',
      dark: '#17111d',
      eye: '#ffe36e',
      nose: '#d88f8f',
      tail: '#3a3046',
    },
  },
});

/** 名册顺序：从引路人到最后的两位钟楼客人，按石鼓出现的先后排列。 */
export const YOKAI_ORDER = Object.freeze([
  'lantern',
  'franken',
  'sheet',
  'swamp',
  'bat',
  'mummy',
  'boneA',
  'boneB',
  'wolf',
  'witch',
  'cat',
]);

export const PARADE_TOTAL_YOKAI = YOKAI_ORDER.length;

export const PARADE_CHAPTERS = Object.freeze([
  {
    stage: 1,
    levelId: 'parade-1',
    stageLabel: '第一段',
    name: '山道',
    title: '一之坂',
    subtitle: '山道 · 沉重的客人',
    objective: '带着科学怪人走到半山的第一座南瓜鸟居',
    intro:
      '第一段是上山路。石阶被雨冲得高低不平。路边石鼓上还留着上一位提灯人的手印。',
    body: '科学怪人走得慢，但裂石只认他的肩膀。',
    backdrop: {
      skyTop: '#12060d',
      skyMid: '#2a0f1b',
      skyLow: '#4a1e24',
      haze: '214, 92, 74',
      farHill: '#2a1118',
      nearHill: '#180a0e',
      mist: '220, 120, 100',
    },
    party: ['lantern'],
    joins: ['franken'],
    weather: null,
  },
  {
    stage: 2,
    levelId: 'parade-2',
    stageLabel: '第二段',
    name: '雾町',
    title: '纸灯巷',
    subtitle: '雾巷 · 轻飘的客人',
    objective: '穿过雾町的屋顶和巷子，走到二之南瓜鸟居',
    intro:
      '雾町的屋檐一层压一层。纸灯笼挂在半空，照不亮脚下。',
    body: '床单幽灵会被风托上屋顶。走到屋檐尽头，她会自己飘下来。',
    backdrop: {
      skyTop: '#0b0a14',
      skyMid: '#1b1830',
      skyLow: '#2f2b4a',
      haze: '150, 168, 214',
      farHill: '#191b2c',
      nearHill: '#0e0f1b',
      mist: '170, 184, 220',
    },
    party: ['lantern', 'franken'],
    joins: ['sheet'],
    weather: null,
  },
  {
    stage: 3,
    levelId: 'parade-3',
    stageLabel: '第三段',
    name: '雨川',
    title: '三之渡',
    subtitle: '雨河 · 水里的客人',
    objective: '渡过两条雨川，走到水边的三之南瓜鸟居',
    intro:
      '雨川把山路截成两段。水面上漂着没人送走的南瓜灯。',
    body: '贴着河床走更稳。废桥要潜水钻过去，气泡柱会把人托回水面。',
    backdrop: {
      skyTop: '#050d12',
      skyMid: '#0c1c26',
      skyLow: '#18323c',
      haze: '108, 196, 190',
      farHill: '#10262c',
      nearHill: '#081419',
      mist: '130, 200, 196',
    },
    party: ['lantern', 'franken', 'sheet'],
    joins: ['swamp'],
    weather: 'rain',
  },
  {
    stage: 4,
    levelId: 'parade-4',
    stageLabel: '第四段',
    name: '废寺',
    title: '四之庭',
    subtitle: '废寺 · 高处的客人',
    objective: '带蝙蝠和木乃伊走过废寺积水，到四之鸟居',
    intro:
      '废寺门槛边倒挂着蝙蝠，石棺里靠着木乃伊。',
    body: '二段跳和绷带兜底。裂石留给科学怪人。',
    backdrop: {
      skyTop: '#10040a',
      skyMid: '#270915',
      skyLow: '#45101c',
      haze: '255, 120, 92',
      farHill: '#2a0a13',
      nearHill: '#16050a',
      mist: '230, 120, 108',
    },
    party: ['lantern', 'franken', 'sheet', 'swamp'],
    joins: ['bat', 'mummy'],
    weather: null,
  },
  {
    stage: 5,
    levelId: 'parade-5',
    stageLabel: '第五段',
    name: '墓园',
    title: '五之冢',
    subtitle: '墓园 · 所有脚一起走',
    objective: '带骷髅兄弟和狼人穿过墓园，到五之鸟居',
    intro:
      '雾从墓穴里冒出来。两只骷髅和狼人在石鼓边等着。',
    body: '骷髅凑齐提速，狼人带全队双击冲刺。',
    backdrop: {
      skyTop: '#0b0710',
      skyMid: '#1d1326',
      skyLow: '#3a2438',
      haze: '170, 140, 190',
      farHill: '#201426',
      nearHill: '#100a14',
      mist: '180, 150, 200',
    },
    party: ['lantern', 'franken', 'sheet', 'swamp', 'bat', 'mummy'],
    joins: ['boneA', 'boneB', 'wolf'],
    weather: null,
  },
  {
    stage: 6,
    levelId: 'parade-6',
    stageLabel: '第六段',
    name: '钟楼',
    title: '百鬼门',
    subtitle: '钟楼 · 最后一程',
    objective: '带所有同行者登上钟楼顶的百鬼门（南瓜门）',
    intro:
      '钟楼风很大。女巫在最高一级，黑猫蹲在井沿。',
    body: '全队滑翔、蹬墙。下层长梯是备用路。',
    backdrop: {
      skyTop: '#080b16',
      skyMid: '#141c33',
      skyLow: '#2c3a58',
      haze: '140, 170, 220',
      farHill: '#1b2438',
      nearHill: '#0b101c',
      mist: '160, 180, 220',
    },
    party: [
      'lantern',
      'franken',
      'sheet',
      'swamp',
      'bat',
      'mummy',
      'boneA',
      'boneB',
      'wolf',
    ],
    joins: ['witch', 'cat'],
    weather: null,
  },
]);

const CHAPTER_BY_STAGE = new Map(
  PARADE_CHAPTERS.map((chapter) => [chapter.stage, chapter]),
);

export function getParadeChapter(stage) {
  return CHAPTER_BY_STAGE.get(stage) ?? null;
}

export function paradeStageFromTheme(themeId) {
  const match = /^parade-(\d+)$/.exec(themeId ?? '');
  return match ? Number(match[1]) : 0;
}

export function getYokai(id) {
  return YOKAI[id] ?? null;
}

/** 某一段开始时已经在队伍里的同行者（不含这一段新加入的）。 */
export function getParadeParty(stage) {
  return getParadeChapter(stage)?.party ?? ['lantern'];
}

/** 某一段会在路上加入的同行者。 */
export function getParadeJoins(stage) {
  return getParadeChapter(stage)?.joins ?? [];
}
