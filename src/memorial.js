/**
 * 「给老师送南瓜派」——心理世家的万圣夜。
 *
 * 玩家提着一盒南瓜派去墓园看老师（background.md 里的师祖）。去墓园的路被三扇门
 * 分成四段，每段路会想起一位曾经被老师点过灯的人，并在这一小段里短暂地带上
 * ta 身上可被观察到的行为特点。
 *
 * 四段依次对应 background.md 主线采用的四个病种：
 *   强迫症、惊恐障碍、人格解体、失眠障碍。
 * 他们不是医生，而是各自领域里走到很远、也各自带着一处旧痛的人。
 *
 * 和「电磁长夜」里的糖果一样，这里只借用真实 ICD-10 诊断里「可被观察到的行为」
 * 做玩法，不描述、不评判真实的患病体验，也不构成诊断。区别是：
 *   - 糖果是 8–12 秒的临时状态，行为每隔 1–6 秒就触发一次；
 *   - 这里的记忆是整段路的底色：
 *       第一段每 5 秒一次头痛，随后是「回去看看」的强迫念头；
 *       第二段每 36–50 秒一次惊恐发作，玩家按住空格呼吸，把收窄的视野慢慢打开；
 *       第三段是墓园里的双人潜行：提灯人的光、可以藏身的墓碑影子，
 *         以及一个只有你听得见的「回音」；
 *       第四段是 Pulse 地下的简易电磁赛道，失眠的重量随路程一点点加深，停住只落在结实的落脚点上。
 *   - 每段的天空、远山、雾和整屏色偏都取这一段自己的病色（backdrop），
 *     玩家进场先认出颜色，再认出人。
 * 目的不是把病做成难关，而是让玩家在很轻的阻力里，陪他们走一小段。
 *
 * 路尽头是老师的墓。玩家把南瓜派放在碑前——老师生前最爱这一口。
 *
 * 第二段是 Kurt 的第一座集合庭院：第一道按 A、B 分格，第二道是一条 A → B 的接龙，
 * 门楣只画前两段，其余留问号。惊恐发作时世界收窄成角色身边的一个小孔，
 * 按一下或按住空格呼吸，视野会重新打开。糖纸街女巫房间沿用同一套规则，只留一道门。
 *
 * 第三段是墓园里的另一双脚步：原来的「鬼鬼祟祟」缩成这一段，放进追思路线，
 * 不再单独成一条赛道。两名玩家分别操控「你」和「回音」，躲开提灯人的灯，
 * 在墓碑影子里潜行，压住石板替对方开门，两个人都到门口才算数。
 *
 * 第四段是 Pulse 旧观测台底下的简易电磁赛道：前两跳分别用负电和正电，再往后是一条被小岛分成两跳的宽裂隙。他的失眠不是一直压死玩家：
 * 路越走越沉，但路上有几盏旧灯，走到跟前会短暂「透亮」——颜色回来、脚步变轻，
 * 灯灭之后重量还会回来。这是慢性、难根治，不是一次性治愈。
 * 这一段只留电磁长夜最核心的铜球与电子：负电被电子推开，正电被电子吸住，
 * 借着力越过裂隙。熔岩井、骨槽和速度选择器仍留在糖纸街男巫的地窖。
 */

export const MEMORIAL_ROUTE = Object.freeze({
  id: 'memorial',
  name: '给老师送南瓜派',
  latin: 'Sir Loved Pumpkin Pie',
  subtitle: '一盒南瓜派，四段夜路',
  totalStages: 4,
  intro: '十月的最后一个星期六，我烤了一只南瓜派，要去拜访我的老师。',
  introEn:
    'Time to visit Sir with my handmade pumpkin pie again, I guess. How time flies! Can’t believe it’s been a year.',
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
    patient: 'Sybil',
    disorder: '强迫症',
    code: 'F42',
    icdName: '强迫症',
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
      '第一段路，你想起 Sybil：英国籍，伟大的航天工程师，深受强迫症困扰。',
    // 开篇（人物小传）：皮鞋卡片与右上角人物描写都读这一份，中英文各一行。
    bio: 'Sybil，英国籍，伟大的航天工程师，深受强迫症困扰',
    bioEn:
      'Sybil was a great British lady who built many things that can fly. She suffered from OCD badly.',
    // 开场坐在南瓜车上的那段路：车慢慢驶进墓园，开场白写在画面上方，
    // 中英文各一行；南瓜派教程默认折叠，点开才展开。skipAfter 之前按 Q
    // 不算数，免得开场就误跳过。
    opening: {
      driveTime: 11,
      alightAt: 20.5,
      total: 23,
      skipAfter: 7,
      beats: [
        {
          at: 0.8,
          hold: 7000,
          cn: '十月的最后一个星期六，我烤了一只南瓜派，要去拜访我的老师。',
          en: 'Time to visit Sir with my handmade pumpkin pie again, I guess. How time flies! Can’t believe it’s been a year.',
        },
        {
          at: 8.0,
          hold: 8000,
          cn: '你要知道，想要烤出一只像样的南瓜派……',
          en: 'You know, a delicious pumpkin pie must...',
          tutorial: true,
        },
        {
          at: 16.6,
          hold: 6000,
          cn: '哦我必须要快点儿走，南瓜派凉了可就不好吃了。',
          en: 'OMG I have to hurry, or the pie might get cold.',
        },
      ],
      // 教程原文只有中文，不另造英文。
      tutorial: {
        label: '南瓜派教程',
        cn:
          '你要知道，想要烤出一只像样的南瓜派，必须先接受一个事实：南瓜不是越多越好。我用了半个，烤过之后再压成泥。糖当然不能省，但也不能多到让派馅在烤箱里鼓成一张脸。鸡蛋要一个一个的加，加一个搅匀了再加下一个，酥皮要用冷黄油，冷到手指一按就陷进去，面团不能揉，一揉就变硬，像在吃一张信封。派皮进烤箱之前要先空烤一会儿，不然底会——我第一次做的时候就不知道这件事……',
      },
    },
    // 路上的五块路牌：一块一句，中文在上、英文在下，按 V 读。
    roadSigns: [
      {
        cn: 'Sybil是老师实验室里那个最早来帮忙的社会工作者之一。',
        en: 'Sybil was one of the pioneers who followed Sir to pursue their ambition.',
      },
      {
        cn: '她见不得老师的实验室总是糊满灰尘、乱七八糟，为此当了很久的免费清洁工。',
        en: 'She couldn’t stand the mess in the lab, so she cleaned it up on duty, for years.',
      },
      {
        cn: 'Sybil绝对是所有参与研究的人里最用心的那一个，毕竟强迫症嘛，会把自己发作的时间、持续长度和触发因素记在一个小本子上，精确到分钟。',
        en: 'Definitely she was the most immersed one to mark down every detail about the disease.',
      },
      {
        cn: '强迫症发作的时候很痛苦，每一天都像是一场无休止的苦役，除了疲惫和绝望，什么也换不来。苦难变陈旧了，失去了刺激性的强度，只剩下绵长的、没有尽头的重复。',
        en: 'She lived with and against OCD. Pain appeared, and then faded away, repeatedly. Hopelessly.',
      },
      {
        cn: 'Sybil离世的时候很匆忙，没来得及和我的老师好好告别。她同时为航天界和心理学界做出了很多贡献，现在她要去一个不需要确认任何事的地方了。',
        en: 'She left in a hurry, before she could check and settle everything for the last time.',
      },
    ],
    memory:
      'Sybil离世的时候很匆忙，没来得及和我的老师好好告别。',
    memoryEn:
      'She left in a hurry, before she could check and settle everything for the last time.',
    body: 'Sybil，英国籍，伟大的航天工程师，深受强迫症困扰',
    bodyEn:
      'Sybil was a great British lady who built many things that can fly. She suffered from OCD badly.',
    mods: {},
    trigger: {
      kind: 'carriage',
      // 第一段是南瓜车检查：每 5 秒冒出一句，任务条倒计时 10 秒。
      firstInterval: [5, 5],
      interval: [5, 5],
      countdown: 10,
      line: '头痛来了，有预谋的逐渐弥漫的疼痛，像一块冰冷的金属片慢慢嵌入前额',
      lineEn: 'My head hurts. Pain spreads. Something’s cutting my brain apart.',
      task: '去看看南瓜车锁没锁',
      success: '锁好了。南瓜车不会自己跑掉。',
      alarm: '……万一没锁呢？',
    },
    // 通关后（走到第一扇门）才出现：这一段的病人留给主角的话。
    blessing: {
      cn: '祝福你，孩子，希望你无需紧绷，也无需忧虑。',
      en: 'Best wishes, honey. Wish you a life without worries and tension.',
    },
  },
  {
    stage: 2,
    levelId: 'memorial-2',
    kind: 'panic',
    hasBackpack: false,
    stageLabel: '第二段',
    patient: 'Kurt',
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
      '第二段路，你想起 Kurt：奥地利籍的数学家，思维缜密，却极易被突发刺激裹挟。',
    // 开篇（人物小传）：鞋子卡片与右上角人物描写都读这一份，中英文各一行。
    bio: 'Kurt，奥地利籍，一名患有惊恐障碍的数学家，思维缜密却极易被突发刺激裹挟',
    bioEn: 'Kurt was a rigorous Austrian who lived in mathematics and lifelong panic.',
    // 路上的五块路牌：一块一句，中文在上、英文在下，按 V 读。
    roadSigns: [
      {
        cn: 'Kurt天赋异禀，曾推演出混沌边界的数论猜想，足以在无序的混沌之中，锚定理性的坐标。',
        en: 'Kurt was a math genius. A lighthouse in chaos. A fulcrum in reason.',
      },
      {
        cn: '可惊恐障碍长久如影随形，纵使埋首严丝合缝的推演，濒死般的恐慌仍会毫无征兆袭来。',
        en: 'Panic disorder is a lingering shadow. A killer lies in ambush. A poison freezes the blood.',
      },
      {
        cn: '听闻教授投身疑难心理疾病的研究，他主动奔赴，自愿成为被试。',
        en: 'He wanted to be rescued, which was Sir trying to conquer.',
      },
      {
        cn: '不只为自救，他渴望将自身痛苦、理性与恐慌撕扯的全过程交付研究，只希望自己的挣扎能为同陷黑暗之人劈开微光。',
        en: 'May the pain become medicine, may the struggle become inspiration.',
      },
      {
        cn: '某个深夜，Kurt伏于满是草稿的桌前，惊恐骤然爆发，汹涌的濒死感吞没了他。于是在他热爱的数字与符号间，Kurt永远停下了笔。',
        en: 'Panic swallowed his life, on the night humans lost their genius while Kurt separated from his beloved math.',
      },
    ],
    memory:
      '某个深夜，Kurt伏于满是草稿的桌前，惊恐骤然爆发，汹涌的濒死感吞没了他。',
    memoryEn:
      'Panic swallowed his life, on the night humans lost their genius while Kurt separated from his beloved math.',
    body: 'Kurt，奥地利籍，一名患有惊恐障碍的数学家，思维缜密却极易被突发刺激裹挟',
    bodyEn: 'Kurt was a rigorous Austrian who lived in mathematics and lifelong panic.',
    mods: {},
    trigger: {
      kind: 'panic',
      // 第一次来得早一点，让玩家学会呼吸；之后间隔拉得更开，不打断搬东西的节奏。
      firstInterval: [18, 24],
      interval: [36, 50],
      // 先给 1.2 秒的躯体预兆（心跳、画面脉动），再把视野收拢。
      premonition: 1.2,
      // 只要一次呼吸：按一下空格或按住空格都行，不卡时机。
      breaths: 1,
      beatPeriod: 1.5,
      // 平复后的「定神」时间：这段时间不会再发作，脚步也轻一点。
      calm: 11,
      patience: 13,
      premonitionNotice: '心跳快了一下。',
      // 疾病发作：照文档第二幕的原文，中文一行、英文一行。
      line: '无边寒意骤然攥紧胸腔，世界退成模糊残影，只剩濒溺般的恐慌在骨血里翻涌。',
      lineEn:
        'I can’t feel my heartbeat. I can’t feel my breath. Please, I don’t want to die...please.',
      success: '一次呼吸走完，四周慢慢打开了。',
      calmNotice: '你稳住了呼吸。',
      autoNotice: '呼吸自己慢了下来。四周重新打开。',
    },
    // 通关后（走到第二扇门）才出现：这一段的病人留给主角的话。
    blessing: {
      cn: '倘若前路有突如其来的震颤与黑暗，记得深呼吸。愿所有困于骤然恐慌的灵魂，都能得到平静。',
      en: 'Keep breathing and keep calm. May every soul live in peace.',
    },
  },
  {
    stage: 3,
    levelId: 'memorial-3',
    kind: 'depersonalization',
    // 这一段沿用暗处的潜行规则：两个人、灯、影子和石板门。
    // 原来的「鬼鬼祟祟」整条线缩进这里，不再单独设置赛道。
    // 「回音」正好是人格解体的样子：身体还在这里，人却隔着一层看自己。
    mood: 'sneak',
    hasBackpack: false,
    stageLabel: '第三段',
    patient: '冯桃',
    disorder: '人格解体',
    code: 'F48.1',
    icdName: '人格解体-现实解体综合征',
    tag: '隔纱观己',
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
      '第三段路，你想起冯桃。她的笔写尽人间悲欢，人却常年困在与自我剥离的雾里。',
    // 第三段没有单独的疾病发作：发作就是整段路本身——身边多了一个自己。
    // 疾病发作的两行放在面板上，一直看得见。
    bio: '冯桃，中国籍，笔触温柔的小说家，常年深陷人格解体的迷雾，活在与自我剥离的悬空世界里。',
    bioEn: '有女冯桃，其文亹亹。身缚于世，其心不毁。',
    // 路上的两块路牌：一块写她与人间，一块写她交付出去的那份剥离。
    roadSigns: [
      {
        cn: '冯桃是写尽人间悲欢的小说家，笔下字句总能轻轻戳破旁人藏起的心事。她敏锐善感，可以感知世间喜乐悲欢，却长久困在人格解体的雾里，像旁观一个陌生的影子。',
        en: '观世欣戚，以抒感喟。人谓灵秀，彼其掩扉。',
      },
      {
        cn: '她自愿投奔教授的研究，把这份灵魂和肉身相离的荒芜，尽数交付记录。漫长的剥离感慢慢蚀空了她，于是她彻底沉进那层与世界隔绝的虚空里。',
        en: '同道相酬，芝兰其菲。寄身冥罔，天地其恢。',
      },
    ],
    memory:
      '漫长的剥离感慢慢蚀空了她，于是她彻底沉进那层与世界隔绝的虚空里。',
    memoryEn: '寄身冥罔，天地其恢。',
    body: '你像隔着一层朦胧薄纱观望自己，灵魂与躯体遥遥相离。',
    bodyEn: '魂魄离兮渺渺，形骸杳兮昧昧。',
    mods: {},
    // 这一段的「症状」就是潜行本身：提灯人的光、藏身的影子，以及另一个你。
    trigger: null,
    // 通关后（走到第三扇门）才出现：这一段的人留给主角的话。
    blessing: {
      cn: '上天亲吻你敏感的灵魂，说它是种天赋，眼泪只是附带品。',
      en: '祈于苍天，毋使心忧。',
    },
  },
  {
    stage: 4,
    levelId: 'memorial-4',
    kind: 'insomnia',
    // 第四段是 Pulse 旧观测台底下的简易电磁赛道；背包可用来换装，分格不再存在。
    hasBackpack: true,
    stageLabel: '第四段',
    patient: 'Pulse',
    disorder: '失眠障碍',
    code: 'F51.0',
    icdName: '非器质性失眠症',
    tag: '长夜清醒',
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
      '第四段路沉入地下。你想起 Pulse，那个整夜守着望远镜、睡不着的人。',
    // 开篇（人物小传）：鞋子卡片与右上角人物描写都读这一份，中英文各一行。
    bio: 'Pulse，西班牙籍，潜心凝望星河的天体物理观测者，长久被顽固失眠困住，在永夜般的清醒里独对苍穹。',
    bioEn:
      'A physicist named Pulse observed the night sky; for company, he had insomnia by his side.',
    // 这一段只有两块路牌：一块在入口，一块在碑前。每块四行——
    // 两句中文、两句英文，中文在上、英文在下。
    roadSigns: [
      {
        cn: 'Pulse是天体物理观测者，曾捕捉到转瞬即逝的脉冲星信号，为宇宙的时序添上一笔记录。\n他狂热偏执，喋喋不休，神经质的思维如此跳脱；他和冯桃是忘年交，总被她嫌弃聒噪。',
        en: 'A miracle flashed before it died; he caught it, wrote it down, and discovered what’s inside.\nHe kept talking and thinking, indulging in the electrical signals that spread; he got roasted by his friend, which was easy to understand.',
      },
      {
        cn: '失眠是有重量的，漫漫长夜里他只能守着望远镜枯坐，一遍遍凝望星空。\n漫长的岁月里，他一直和失眠为伴，直到垂垂老矣，终于在星河璀璨里，停下了絮语。',
        en: 'He was always awake along with moon and star, along with a telescope and celestial bodies that were really far.\nYears went by, but insomnia never abandoned this guy, until time wrinkled his skin and closed his eye.',
      },
    ],
    memory:
      '漫长的岁月里，他一直和失眠为伴，直到垂垂老矣，终于在星河璀璨里，停下了絮语。',
    memoryEn:
      'Years went by, but insomnia never abandoned this guy, until time wrinkled his skin and closed his eye.',
    body: '失眠是有重量的：每一步更沉，颜色一点点褪去；旧灯会短暂透亮。铜球给电荷：负电被电子推开，正电被电子吸住；中间的小岛上也能换电荷。',
    // 基础手感只比平常沉一点；真正的「负重」由更新循环按路程一点点加深。
    mods: { moveScale: 0.94, jumpVelocityScale: 0.98 },
    trigger: {
      kind: 'slump',
      // 只在结实的落脚点上发作；停住不是定死，按住方向键能一步一步挪出去。
      firstInterval: [16, 22],
      interval: [24, 34],
      duration: 1.2,
      // 疾病发作：照文档第四幕的原文，中文一行、英文一行。
      line: '今晚的宇宙有遗忘的浩渺和狂热的精确',
      lineEn: 'Tonight the universe is likely to forget; my Milky Way flows with precision.',
      notice: '这一步抬不起来。',
    },
    // 路上旧灯的「透亮」时间。灯本身摆在 level.js 的第四段庭院规格里。
    solace: {
      duration: 9,
      line: '旧灯还亮着。这一步轻了一点。',
    },
    // 这一段除了 Pulse，还会经过老师的墓，所以有两盏灯。
    memoryCount: 2,
    // 通关后（走到第四扇门）才出现：这一段的人留给主角的话。
    blessing: {
      cn: '亲爱的年轻人，祝你拥有良好的睡眠，健康的身体，有前进的勇气以及万事都平淡的心境。',
      en: 'Good night, my young and brave friend. I wish you a healthy body and a calm mind.',
    },
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
