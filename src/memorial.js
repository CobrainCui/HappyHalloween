/**
 * 「五盏灯」——心理世家的万圣夜。
 *
 * 玩家替家里去墓园给逝去的病人和家族前辈点灯。去墓园的路被五扇门分成五段，
 * 每段路会想起一位曾经来访的人，并在这一小段里短暂地带上 ta 身上可被观察到的
 * 行为特点。
 *
 * 五个人依次对应 background.md 主线采用的五个病种：
 * 强迫症、广泛性焦虑、失眠、惊恐、持续性抑郁（恶劣心境）。
 * 他们不是医生，而是各自领域里走到很远、也各自带着一处旧痛的人。
 *
 * 和「电磁长夜」里的糖果一样，这里只借用真实 ICD-10 诊断里「可被观察到的行为」
 * 做玩法，不描述、不评判真实的患病体验，也不构成诊断。区别是：
 *   - 糖果是 8–12 秒的临时状态，行为每隔 1–6 秒就触发一次；
 *   - 这里的记忆是整段路的底色：前四段每 5 秒触发一次；
 *     第五段是电磁长夜，间隔拉长到 11–16 秒，给玩家留出跳过平台和裂隙的窗口；
 *   - 每段的天空、远山、雾和整屏色偏都取这一段自己的病色（backdrop），
 *     玩家进场先认出颜色，再认出人。
 * 目的不是把病做成难关，而是让玩家在很轻的阻力里，陪他们走一小段。
 */

export const MEMORIAL_ROUTE = Object.freeze({
  id: 'memorial',
  name: '五盏灯',
  subtitle: '心理世家的万圣夜',
  totalStages: 5,
  intro:
    '万圣节傍晚，你替家里去墓园。篮子里是五盏小灯，还有一盏留给家里人。',
  finale:
    '路的尽头是家里的墓。爷爷说过，做这一行，最后记住的不是病名，是人。',
});

export const MEMORIAL_CHAPTERS = Object.freeze([
  {
    stage: 1,
    levelId: 'memorial-1',
    stageLabel: '第一段',
    patient: '小满',
    disorder: '强迫性障碍',
    code: 'F42',
    icdName: '强迫性障碍',
    tag: '反复检查',
    accent: '#9fc7c4',
    // 每段的天色、远山与雾都取这一段自己的「病色」：青灰、赭黄、夜蓝、紫褐、灰蓝。
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
      '第一段路，你想起小满。他做最精密的测量，也总要把同一步再量一遍。',
    memory:
      '小满数台阶，必须数到偶数才肯迈下一步。他数了三十年。',
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
    stageLabel: '第二段',
    patient: '林老师',
    disorder: '广泛性焦虑障碍',
    code: 'F41.1',
    icdName: '广泛性焦虑障碍',
    tag: '提心吊胆',
    accent: '#d8b57a',
    backdrop: {
      skyTop: '#140f09',
      skyMid: '#241a10',
      skyLow: '#392a1a',
      haze: '216, 181, 122',
      farHill: '#2f2316',
      nearHill: '#1d150e',
      mist: '214, 178, 132',
    },
    objective: '走过石阶，再穿过第二扇门',
    intro:
      '第二段路，你想起林老师。她总把第二天可能出错的事先想一遍。',
    memory:
      '林老师的系统从没出过大错。她说，因为她每天先在心里把所有错走一遍。',
    body: '脚步更紧，偶尔没来由地惊跳一下。',
    mods: { moveScale: 0.94 },
    trigger: {
      kind: 'startle',
      firstInterval: [5, 5],
      interval: [5, 5],
      push: 66,
      hop: 112,
      notice: '肩膀自己缩了一下。',
    },
  },
  {
    stage: 3,
    levelId: 'memorial-3',
    stageLabel: '第三段',
    patient: '许奶奶',
    disorder: '非器质性失眠症',
    code: 'F51.0',
    icdName: '非器质性失眠症',
    tag: '微睡眠',
    accent: '#8fb6d6',
    backdrop: {
      skyTop: '#060c18',
      skyMid: '#0e1830',
      skyLow: '#1e2c48',
      haze: '143, 182, 214',
      farHill: '#16223a',
      nearHill: '#0c1526',
      mist: '150, 183, 214',
    },
    objective: '沿着夜路走到第三扇门',
    intro:
      '第三段路，你想起许奶奶。她在天文台守了几十年夜班。',
    memory:
      '许奶奶说，夜里最安静的时候，脑子反而最吵。',
    body: '走着走着会有一瞬走神，像睡着了。',
    mods: { moveScale: 0.96 },
    trigger: {
      kind: 'doze',
      firstInterval: [5, 5],
      interval: [5, 5],
      duration: 0.85,
      notice: '眼前暗了一瞬，像是走着睡着了。',
    },
  },
  {
    stage: 4,
    levelId: 'memorial-4',
    stageLabel: '第四段',
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
    objective: '穿过碑林，到第四扇门',
    intro:
      '第四段路，你想起阿岚。她在高原气象站守过一整个冬天。',
    memory:
      '阿岚第一次发作时以为自己缺氧。后来才知道，是身体把一次心跳误读成了警报。',
    body: '偶尔突然定住，四周收窄成一条隧道。',
    mods: {},
    trigger: {
      kind: 'panic',
      firstInterval: [5, 5],
      interval: [5, 5],
      duration: 1.15,
      tunnel: 2.4,
      notice: '心跳撞了起来，四周在收窄。跟着呼吸。',
    },
  },
  {
    stage: 5,
    levelId: 'memorial-5',
    stageLabel: '第五段',
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
    objective: '穿过电磁长夜，走到家族墓园',
    intro:
      '第五段路沉入地下。你想起周叔，和他那间常年不见光的档案室。',
    memory:
      '周叔不是懒。他说每一步都像踩在水里，抬起来要花很久。',
    body: '走得更慢、跳得更低，颜色一点点褪去。',
    mods: { moveScale: 0.7, jumpVelocityScale: 0.86 },
    trigger: {
      kind: 'slump',
      // 第五段是整条电磁长夜：停住之间留出足够跳过平台和裂隙的窗口，
      // 不能像平地那样每 5 秒一次，否则玩家会被反复定在半空。
      firstInterval: [8, 12],
      interval: [11, 16],
      duration: 1.25,
      notice: '这一步抬不起来。',
    },
    // 这一段除了周叔，还会经过家里人的墓，所以有两盏灯。
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
