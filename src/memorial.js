/**
 * 「给老师送南瓜派」——心理世家的万圣夜。
 *
 * 玩家提着一盒南瓜派去墓园看老师（background.md 里的师祖）。去墓园的路被三扇门
 * 分成四段，每段路会想起一位曾经被老师点过灯的人，并在这一小段里短暂地带上
 * ta 身上可被观察到的行为特点。
 *
 * 四段依次对应 background.md 主线采用的四个病种：
 *   强迫症、惊恐障碍、精神分裂症、持续性抑郁（恶劣心境）。
 * 他们不是医生，而是各自领域里走到很远、也各自带着一处旧痛的人。
 *
 * 和「电磁长夜」里的糖果一样，这里只借用真实 ICD-10 诊断里「可被观察到的行为」
 * 做玩法，不描述、不评判真实的患病体验，也不构成诊断。区别是：
 *   - 糖果是 8–12 秒的临时状态，行为每隔 1–6 秒就触发一次；
 *   - 这里的记忆是整段路的底色：
 *       第一段每 5 秒一次「回去看看」的念头；
 *       第二段每 36–50 秒一次惊恐发作，玩家按住 E 呼吸，把收窄的视野慢慢打开；
 *       第三段是墓园里的双人潜行：提灯人的光、可以藏身的墓碑影子，
 *         以及一个只有你听得见的「回音」；
 *       第四段是周叔地下的简易电磁赛道，负重随路程一点点加深，停住只落在结实的落脚点上。
 *   - 每段的天空、远山、雾和整屏色偏都取这一段自己的病色（backdrop），
 *     玩家进场先认出颜色，再认出人。
 * 目的不是把病做成难关，而是让玩家在很轻的阻力里，陪他们走一小段。
 *
 * 路尽头是老师的墓。玩家把南瓜派放在碑前——老师生前最爱这一口。
 *
 * 第二段是阿岚的第一座集合庭院：第一道按 A、B 分格，第二道是一条 A → B 的接龙，
 * 门楣只画前两段，其余留问号。惊恐发作时世界收窄成角色身边的一个小孔，
 * 按一下或按住 E 呼吸，视野会重新打开。糖纸街女巫房间沿用同一套规则，只留一道门。
 *
 * 第三段是墓园里的另一双脚步：原来的「鬼鬼祟祟」缩成这一段，放进追思路线，
 * 不再单独成一条赛道。两名玩家分别操控「你」和「回音」，躲开提灯人的灯，
 * 在墓碑影子里潜行，压住石板替对方开门，两个人都到门口才算数。
 *
 * 第四段是周叔地下室里的简易电磁赛道：前两跳分别用负电和正电，再往后是一条被小岛分成两跳的宽裂隙。他的沉重不是一直压死玩家：
 * 路越走越沉，但路上有几盏旧灯，走到跟前会短暂「透亮」——颜色回来、脚步变轻，
 * 灯灭之后重量还会回来。这是慢性、难根治，不是一次性治愈。
 * 这一段只留电磁长夜最核心的铜球与电子：负电被电子推开，正电被电子吸住，
 * 借着力越过裂隙。熔岩井、骨槽和速度选择器仍留在糖纸街男巫的地窖。
 */

export const MEMORIAL_ROUTE = Object.freeze({
  id: 'memorial',
  name: '给老师送南瓜派',
  latin: 'Sir loved pumpkin pie',
  subtitle: '一盒南瓜派，四段夜路',
  totalStages: 4,
  intro: '万圣节晚上，你提着一盒南瓜派，去墓园看老师。',
  finale:
    '老师的墓前，你放下南瓜派。老师生前最爱这一口。做这一行，记住的是人，不是病名——这句话你一直带着。',
});

export const MEMORIAL_CHAPTERS = Object.freeze([
  {
    stage: 1,
    levelId: 'memorial-1',
    kind: 'ocd',
    // 前两段不需要背包；第四段进入电磁长夜后重新解锁。
    hasBackpack: false,
    stageLabel: '第一段',
    patient: '小满',
    disorder: '强迫性障碍',
    code: 'F42',
    icdName: '强迫性障碍',
    tag: '反复检查',
    accent: '#9fc7c4',
    // 每段的天色、远山与雾都取这一段自己的「病色」：青灰、紫褐、灰蓝。
    backdrop: {
      skyTop: '#071417',
      skyMid: '#0f2429',
      skyLow: '#20363a',
      haze: '159, 199, 196',
      farHill: '#173034',
      nearHill: '#0c1d20',
      mist: '166, 207, 201',
    },
    objective: '沿着墓园外墙走到第一扇门',
    intro:
      '第一段路，你想起小满。他做精密测量，同一步总要再量一遍。',
    // 开场坐在南瓜车上的那段路：车慢慢驶进墓园，四句独白把这一夜的来由讲完，
    // 车停稳后再下车。skipAfter 之前按互动键不算数，免得开场就误跳过。
    opening: {
      driveTime: 3.2,
      alightAt: 13,
      total: 14.4,
      skipAfter: 4.5,
      beats: [
        { at: 0.6, text: '万圣节晚上，你提着一盒南瓜派去墓园。', hold: 3600 },
        { at: 4.2, text: '老师的墓在最后一段。路上会先经过四个人。', hold: 3600 },
        { at: 7.6, text: '他们都听过老师讲课，也被自己的病缠过。', hold: 3600 },
        { at: 11, text: '老师说：做这一行，记住的是人，不是病名。', hold: 3600 },
      ],
    },
    memory:
      '小满数台阶，数到偶数才肯迈步。他数了三十年。',
    body: '每隔几秒，想回去看看南瓜车锁没锁。',
    mods: {},
    trigger: {
      kind: 'carriage',
      // 第一段是南瓜车检查：每 5 秒冒出一句，任务条倒计时 10 秒。
      firstInterval: [5, 5],
      interval: [5, 5],
      countdown: 10,
      line: '我要回去看看南瓜车锁没锁。',
      task: '去看看南瓜车锁没锁',
      success: '锁好了。南瓜车不会自己跑掉。',
      alarm: '……万一没锁呢？',
    },
  },
  {
    stage: 2,
    levelId: 'memorial-2',
    kind: 'panic',
    hasBackpack: false,
    stageLabel: '第二段',
    patient: '阿岚',
    disorder: '惊恐障碍',
    code: 'F41.0',
    icdName: '惊恐障碍',
    tag: '突发心悸',
    accent: '#b78aa8',
    backdrop: {
      skyTop: '#140812',
      skyMid: '#241122',
      skyLow: '#3a1f37',
      haze: '183, 138, 168',
      farHill: '#2c162b',
      nearHill: '#1a0d1a',
      mist: '190, 150, 178',
    },
    objective: '穿过第二段墓园夜路，把第一座庭院的东西分进对应位置',
    intro:
      '第二段路，你想起阿岚。她在高原气象站守了一个冬天；她留下第一座集合庭院，也有些晚上心跳会突然撞起来。',
    memory:
      '阿岚说，发作时世界会收窄成一个点。她学会跟着呼吸，一点一点把它打开。',
    body: '心跳偶尔突然撞起来，视野收窄成身边的一个小孔。按住 E 呼吸，视野会慢慢打开。',
    mods: {},
    trigger: {
      kind: 'panic',
      // 第一次来得早一点，让玩家学会呼吸；之后间隔拉得更开，不打断搬东西的节奏。
      firstInterval: [18, 24],
      interval: [36, 50],
      // 先给 1.2 秒的躯体预兆（心跳、画面脉动），再把视野收拢。
      premonition: 1.2,
      // 只要一次呼吸：按一下 E 或按住 E 都行，不卡时机。
      breaths: 1,
      beatPeriod: 1.5,
      // 平复后的「定神」时间：这段时间不会再发作，脚步也轻一点。
      calm: 11,
      patience: 13,
      premonitionNotice: '心跳快了一下。',
      notice: '心跳撞了起来。按住 E，慢慢呼吸。',
      success: '一次呼吸走完，四周慢慢打开了。',
      calmNotice: '你稳住了呼吸。',
      autoNotice: '呼吸自己慢了下来。四周重新打开。',
    },
  },
  {
    stage: 3,
    levelId: 'memorial-3',
    kind: 'schizophrenia',
    // 这一段沿用暗处的潜行规则：两个人、灯、影子和石板门。
    // 原来的「鬼鬼祟祟」整条线缩进这里，不再单独设置赛道。
    mood: 'sneak',
    hasBackpack: false,
    stageLabel: '第三段',
    patient: '阿遥',
    disorder: '精神分裂症',
    code: 'F20',
    icdName: '精神分裂症',
    tag: '听见另一双脚',
    accent: '#9db8a6',
    backdrop: {
      skyTop: '#06110f',
      skyMid: '#0f211d',
      skyLow: '#243a33',
      haze: '147, 183, 164',
      farHill: '#172c26',
      nearHill: '#0b1713',
      mist: '156, 189, 170',
    },
    objective: '躲开提灯人的光，你和回音都走到墓园门口',
    intro:
      '第三段路，你想起阿遥。她在山上守一台老无线电，能听见很远的声音，也听见一些别人听不见的。',
    memory:
      '阿遥说，声音最响的时候，她就把手放在旋钮上，一点点调频，直到只剩下自己的呼吸。',
    body: '这一段，你身边多了一个自己。躲进墓碑的影子，或按住 S / ↓ 潜行；你和回音都到门口才算数。',
    mods: {},
    // 这一段的「症状」就是潜行本身：提灯人的光、藏身的影子，以及另一个你。
    trigger: null,
  },
  {
    stage: 4,
    levelId: 'memorial-4',
    kind: 'dysthymia',
    // 第四段是周叔地下的简易电磁赛道；背包可用来换装，分格不再存在。
    hasBackpack: true,
    stageLabel: '第四段',
    patient: '周叔',
    disorder: '恶劣心境',
    code: 'F34.1',
    icdName: '持续性抑郁障碍（恶劣心境）',
    tag: '长期低沉',
    accent: '#8b96ad',
    backdrop: {
      skyTop: '#0a0c11',
      skyMid: '#141821',
      skyLow: '#252a36',
      haze: '139, 150, 173',
      farHill: '#222735',
      nearHill: '#141823',
      mist: '150, 158, 176',
    },
    objective: '带着电荷越过裂隙，走到老师的墓',
    intro:
      '第四段路沉入地下。你想起周叔，和他档案室里那台旧电磁仪。',
    memory:
      '周叔说，每一步都像踩在水里；可每天下午，他还是自己走到档案室，把灯打开。',
    body: '每一步更沉，颜色一点点褪去；旧灯会短暂透亮。铜球给电荷：负电被电子推开，正电被电子吸住；中间的小岛上也能换电荷。',
    // 基础手感只比平常沉一点；真正的「负重」由更新循环按路程一点点加深。
    mods: { moveScale: 0.94, jumpVelocityScale: 0.98 },
    trigger: {
      kind: 'slump',
      // 只在结实的落脚点上发作；停住不是定死，按住方向键能一步一步挪出去。
      firstInterval: [16, 22],
      interval: [24, 34],
      duration: 1.2,
      notice: '这一步抬不起来。',
    },
    // 路上旧灯的「透亮」时间。灯本身摆在 level.js 的第四段庭院规格里。
    solace: {
      duration: 9,
      line: '旧灯还亮着。这一步轻了一点。',
    },
    // 这一段除了周叔，还会经过老师的墓，所以有两盏灯。
    memoryCount: 2,
  },
]);

export const MEMORIAL_TOTAL_MEMORIES = MEMORIAL_CHAPTERS.reduce(
  (total, chapter) => total + (chapter.memoryCount ?? 1),
  0,
);

const CHAPTER_BY_STAGE = new Map(
  MEMORIAL_CHAPTERS.map((chapter) => [chapter.stage, chapter]),
);

export function getMemorialChapter(stage) {
  return CHAPTER_BY_STAGE.get(stage) ?? null;
}

export function memorialStageFromTheme(themeId) {
  const match = /^memorial-(\d+)$/.exec(themeId ?? '');
  return match ? Number(match[1]) : 0;
}

/** 把章节的连续修正合并进玩家当前的 effectMods。 */
export function applyMemorialMods(mods, chapter) {
  if (!chapter?.mods) return;
  mods.moveScale *= chapter.mods.moveScale ?? 1;
  mods.jumpVelocityScale *= chapter.mods.jumpVelocityScale ?? 1;
  mods.frictionScale *= chapter.mods.frictionScale ?? 1;
  mods.gravityScale *= chapter.mods.gravityScale ?? 1;
}
