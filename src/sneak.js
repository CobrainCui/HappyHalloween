/**
 * 「鬼鬼祟祟」：一条独立的双人同屏潜行赛道。
 *
 * 两名玩家共用一副键盘：
 *   鬼鬼（青蓝色）—— A / D 移动，W 跳，S 潜行，E 抱 / 抛南瓜
 *   祟祟（暖黄色）—— ← / → 移动，↑ 跳，↓ 潜行，/ 抱 / 抛南瓜
 *   两个人共用 Space —— 按住收紧影子线
 *
 * 两个角色各有自己的互动键：鬼鬼按 E、祟祟按 /，谁按的谁动手，
 * 不会再因为另一个人离南瓜更近就替对方抱起来。
 *
 * 这条线不接「五盏灯」，也没有骨头、糖果和电磁场。
 * 玩法核心是潜行与配合：躲开守夜人的灯、踩住石板替对方开门、
 * 在只存在一会儿的影子桥上互相接应；两个人还能踩着对方头顶叠罗汉，
 * 按 Space 收紧影子线，把对方吊住或拉上高台。
 *
 * 每一段的地图数据（spec）由 level.js 的 buildSneak() 读取。
 * 坐标全部是地图格；地面固定在第 16 行。
 */
export const SNEAK_ROUTE = Object.freeze({
  id: 'sneak',
  name: '鬼鬼祟祟',
  totalStages: 5,
  intro:
    '午夜钟响时，屋顶会放烟花——全镇的孩子都知道，只有鬼不行。鬼鬼和祟祟要在第十三声钟响前爬上去。',
  finale:
    '第十三声钟响时，两只小鬼并排坐在屋脊上。老守夜人点着最后一根引线，回头看了一眼空荡荡的屋脊，像是早就知道那儿坐着谁。他没有赶他们走。',
  controls: {
    a: '鬼鬼 · A / D / W / S · E 抱南瓜',
    b: '祟祟 · ← / → / ↑ / ↓ · / 抱南瓜',
    rope: '两个人 · 按住 Space 收紧影子线',
  },
});

export const SNEAK_BACKDROP = Object.freeze({
  skyTop: '#060b12',
  skyMid: '#0e1c26',
  skyLow: '#23383f',
  haze: '122, 194, 186',
  farHill: '#12222a',
  nearHill: '#091218',
  mist: '132, 188, 188',
});

export const SNEAK_STAGES = Object.freeze([
  {
    stage: 1,
    levelId: 'sneak-1',
    name: '翻过后院',
    subtitle: '两只小鬼第一次一起出门',
    objective: '两人分别站上两块石板，一起进后院',
    intro:
      '鬼鬼和祟祟从篱笆底下钻进来。后院的门锁着，只有两块旧石板还认路。',
    spec: {
      width: 48,
      spawn: 3,
      spawn2: 5,
      goal: 45,
      checkpoints: [15],
      ground: [[0, 48]],
      blocks: [
        [14, 15, 3, 1],
        [37, 15, 2, 1],
      ],
      planks: [[8, 13, 4]],
      gates: [
        {
          id: 's1-gate',
          kind: 'gate',
          x: 27,
          y: 13,
          w: 1,
          h: 3,
          plates: ['s1-plate-18', 's1-plate-24'],
          mode: 'all',
          latch: true,
          // 第一扇门顶上没有符障：踩着南瓜（或叠罗汉）能翻过去一个人，
          // 再用影子线把留在门这边的同伴拉过来。
          climbable: true,
        },
      ],
      plates: [
        { id: 's1-plate-18', tileX: 18 },
        { id: 's1-plate-24', tileX: 24 },
      ],
      watchers: [],
      shadows: [],
      hints: [
        {
          tileX: 6,
          text: '鬼鬼 A / D，祟祟 ← / →；跳是 W 和 ↑，两人都到门才算过关。抱南瓜：鬼鬼 E，祟祟 /。',
          duration: 5200,
        },
        {
          tileX: 10,
          text: '跳到对方头顶，再按住跳，让他把你顶上去。',
        },
        {
          tileX: 16,
          text: '一人踩一块石板，两块同时亮门才开。南瓜也能压住一块。',
        },
        {
          tileX: 25,
          text: '凑不齐石板就翻门：踩南瓜过去一人，再按住 Space 用影子线拉同伴。',
          duration: 5200,
        },
        { tileX: 30, text: '门不会再合上。两个人一起走到后院的亮光里。' },
      ],
      trees: [7, 34, 44],
      graves: [10, 16, 35, 41],
      lamps: [6, 25, 43],
      pumpkins: [4, 20, 30, 38],
      fences: [[13, 3], [36, 2]],
      skullPiles: [12, 33],
    },
  },
  {
    stage: 2,
    levelId: 'sneak-2',
    name: '守夜人的灯',
    subtitle: '第一次学会屏住呼吸',
    objective: '避开灯，两个人都走到后门',
    intro:
      '老守夜人提着灯在院子里转。蹲下，屏住呼吸，灯就从你们头顶滑过去。',
    spec: {
      width: 56,
      spawn: 3,
      spawn2: 5,
      goal: 53,
      checkpoints: [20, 41],
      ground: [[0, 56]],
      blocks: [
        [14, 15, 3, 1],
        [45, 15, 2, 1],
      ],
      planks: [],
      gates: [],
      plates: [],
      watchers: [
        {
          id: 's2-watcher-1',
          tileX: 32,
          dir: -1,
          range: 180,
          halfAngle: 0.34,
          sweep: 0.62,
          speed: 0.75,
          phase: 0.6,
        },
      ],
      shadows: [
        [17, 14, 4, 2],
        [24, 14, 3, 2],
        [29, 14, 3, 2],
        [38, 14, 4, 2],
        [48, 14, 3, 2],
      ],
      hints: [
        { tileX: 8, text: '按住 S（祟祟按 ↓）潜行。潜行时灯照不到你们，但走得很慢。' },
        { tileX: 21, text: '灯扫过来的时候，躲进有墓碑的影子。' },
        { tileX: 30, text: '贴着他的背过去。老守夜人只朝一边看。' },
      ],
      trees: [7, 17, 24, 29, 39, 49],
      graves: [10, 18, 22, 25, 30, 38, 41, 48],
      lamps: [4, 8, 20, 37, 52],
      pumpkins: [12, 27, 34, 46],
      fences: [[13, 2], [44, 3]],
      skullPiles: [15, 33, 43],
    },
  },
  {
    stage: 3,
    levelId: 'sneak-3',
    name: '晾糖场',
    subtitle: '秤盘、南瓜和一条晒糖的长绳',
    objective: '穿过糖仓的秤门，两个人都到晾糖场尽头',
    intro:
      '糖仓的门锁在老秤上。两只小鬼搬来南瓜当砝码，还在晾架顶上找到一条不用过秤的路。',
    backdrop: {
      skyTop: '#0b0906',
      skyMid: '#1b140b',
      skyLow: '#3b2a12',
      haze: '255, 196, 106',
      farHill: '#1c160e',
      nearHill: '#0c0a06',
      mist: '232, 188, 116',
    },
    spec: {
      width: 76,
      height: 24,
      groundRow: 22,
      spawn: 3,
      spawn2: 5,
      goal: 73,
      checkpoints: [20, 50],
      ground: [[0, 58], [61, 76]],
      blocks: [
        // 路边的糖箱，也是叠高时的落脚点。
        [12, 20, 3, 2],
        // 晾架的踏脚：一个人先站上来，才有机会把同伴顶上架子。
        [33, 20, 2, 2],
        // 悬空的晾架。下面留出 3 格，地面路线可以从架子底下钻过去。
        [36, 17, 6, 2],
      ],
      // 晒糖的长绳一直通到尽头：从晾架顶上跳上去，就能从整段路上方走过去。
      planks: [[42, 16, 30]],
      gates: [
        {
          id: 's3-gate-scale',
          kind: 'gate',
          x: 29,
          y: 19,
          w: 1,
          h: 3,
          plates: ['s3-near', 's3-far'],
          mode: 'any',
          latch: false,
        },
        {
          id: 's3-gate-loft',
          kind: 'gate',
          x: 48,
          y: 19,
          w: 1,
          h: 3,
          plates: ['s3-high'],
          mode: 'all',
          latch: true,
          // 门上没有封死：不想爬晾架，也可以叠罗汉翻过去，再把同伴拉过来。
          climbable: true,
        },
      ],
      plates: [
        { id: 's3-near', tileX: 23 },
        { id: 's3-far', tileX: 35 },
        { id: 's3-high', tileX: 39, radius: 20 },
      ],
      watchers: [
        {
          id: 's3-watcher-1',
          tileX: 64,
          // 提着灯在晾糖场尽头来回走。
          patrol: [63, 69],
          dir: 1,
          range: 150,
          halfAngle: 0.34,
          sweep: 0.58,
          speed: 0.9,
          phase: 0.4,
          patrolSpeed: 0.9,
        },
      ],
      shadows: [
        [61, 20, 3, 2],
        [65, 20, 3, 2],
        [69, 20, 2, 2],
      ],
      hints: [
        {
          tileX: 5,
          text: '门锁在老秤上：把南瓜推上秤盘，门也认重量。',
        },
        {
          tileX: 18,
          text: '一人压住近的秤盘，另一人先过；过去后再压远的，把同伴换过来。',
          duration: 4400,
        },
        {
          tileX: 31,
          text: '晾架太高：一人蹲下，另一人踩肩弹上去。长绳一直通到尽头。',
          duration: 4600,
        },
        {
          tileX: 43,
          text: '上层石板压过一次，门就不再关；也可以叠罗汉翻过去，再用影子线拉人。',
          duration: 4800,
        },
        {
          tileX: 55,
          text: '跳过黑水沟；守夜人的灯扫过来时，躲进晾架的影子。',
        },
        { tileX: 66, text: '长绳的尽头就在前面。两个人都到才算数。' },
      ],
      trees: [7, 30, 55, 72],
      graves: [10, 18, 27, 45, 52, 70],
      lamps: [4, 14, 26, 44, 57, 70],
      pumpkins: [10, 15, 20, 26, 31, 44, 54, 63],
      fences: [[8, 3], [46, 2], [66, 3]],
      skullPiles: [16, 32, 52, 68],
    },
  },
  {
    stage: 4,
    levelId: 'sneak-4',
    name: '画像长廊',
    subtitle: '会跟着灯转的眼睛',
    objective: '越过塌掉一角的舞厅地板，两个人都到长廊尽头',
    intro:
      '画像长廊里挂着历代屋主。舞厅的地板塌了，影子桥只在有人压住秤盘时铺开。',
    backdrop: {
      skyTop: '#070812',
      skyMid: '#141125',
      skyLow: '#2a2340',
      haze: '162, 146, 226',
      farHill: '#121020',
      nearHill: '#080711',
      mist: '176, 162, 222',
    },
    spec: {
      width: 90,
      height: 26,
      groundRow: 24,
      spawn: 3,
      spawn2: 5,
      goal: 86,
      checkpoints: [14, 48, 66],
      // 舞厅地板在中间整片塌下去：下面是空的，掉下去就得退回影子记号。
      ground: [[0, 50], [57, 90]],
      blocks: [
        // 画廊里的长凳和两级旧台阶，通向上层画框。
        [10, 22, 3, 2],
        [28, 22, 2, 2],
        [31, 20, 3, 2],
      ],
      planks: [
        [34, 18, 16],
        [53, 18, 9],
        [64, 18, 8],
      ],
      gates: [
        {
          id: 's4-gate-portrait',
          kind: 'gate',
          x: 26,
          y: 21,
          w: 1,
          h: 3,
          plates: ['s4-left', 's4-right'],
          mode: 'all',
          latch: true,
        },
        {
          id: 's4-bridge',
          kind: 'bridge',
          x: 50,
          y: 24,
          w: 7,
          h: 1,
          plates: ['s4-near', 's4-far'],
          mode: 'any',
          latch: false,
        },
      ],
      plates: [
        { id: 's4-left', tileX: 16 },
        { id: 's4-right', tileX: 22 },
        { id: 's4-near', tileX: 46 },
        { id: 's4-far', tileX: 60 },
      ],
      watchers: [
        {
          id: 's4-watcher-1',
          tileX: 40,
          patrol: [36, 47],
          dir: 1,
          range: 155,
          halfAngle: 0.33,
          sweep: 0.6,
          speed: 0.85,
          phase: 0.3,
          patrolSpeed: 1,
        },
        {
          id: 's4-watcher-2',
          tileX: 68,
          patrol: [64, 74],
          dir: -1,
          range: 150,
          halfAngle: 0.33,
          sweep: 0.6,
          speed: 0.95,
          phase: 1.2,
          patrolSpeed: 1.1,
        },
      ],
      shadows: [
        [24, 22, 4, 2],
        [36, 22, 3, 2],
        [42, 22, 3, 2],
        [58, 22, 4, 2],
        [64, 22, 4, 2],
        [70, 22, 3, 2],
      ],
      hints: [
        { tileX: 5, text: '两杆秤盘同时压住，门才打开。南瓜也算重量。' },
        {
          tileX: 12,
          text: '一人踩一块秤盘；腾不出人就拿南瓜压住近的那块。',
          duration: 4400,
        },
        {
          tileX: 28,
          text: '长凳旁有台阶，能爬上旧画廊：没有灯，但路更窄。',
          duration: 4400,
        },
        {
          tileX: 44,
          text: '地板塌了。有人压住秤盘，影子桥才会铺开。',
          duration: 4400,
        },
        {
          tileX: 56,
          text: '上层画框也通到桥那头；两条路都到长廊尽头。',
          duration: 4600,
        },
        {
          tileX: 66,
          text: '长廊尽头还有一盏灯。蹲低，或从画框上面绕过去。',
          duration: 4000,
        },
      ],
      trees: [6, 20, 38, 47, 60, 78, 84],
      graves: [12, 24, 40, 44, 58, 66, 72, 80],
      lamps: [4, 18, 30, 45, 59, 68, 76, 86],
      pumpkins: [8, 14, 19, 24, 36, 43, 58, 62, 68, 72, 80],
      fences: [[8, 2], [34, 2], [62, 3], [74, 2]],
      skullPiles: [16, 32, 48, 58, 70, 82],
    },
  },
  {
    stage: 5,
    levelId: 'sneak-5',
    name: '屋顶上的烟花',
    subtitle: '第十三声钟响之前',
    objective: '翻过烟囱、越过最后一段影子桥，两个人都爬到屋脊',
    intro:
      '最后一程。老守夜人在屋顶摆今年的烟花。第十三声钟响前，两只鬼都要到屋脊上。',
    backdrop: {
      skyTop: '#061019',
      skyMid: '#102332',
      skyLow: '#2b4a56',
      haze: '255, 174, 118',
      farHill: '#12202a',
      nearHill: '#081017',
      mist: '246, 186, 148',
    },
    spec: {
      width: 100,
      height: 28,
      groundRow: 26,
      spawn: 3,
      spawn2: 5,
      goal: 96,
      checkpoints: [24, 50, 72],
      ground: [[0, 40], [46, 100]],
      blocks: [
        // 烟囱墙：一步跳不上去。先叠罗汉，再用影子线把下面的人吊上来；
        // 旁边的矮烟囱只是给叠罗汉垫脚的地方。
        [16, 24, 2, 2],
        [18, 21, 2, 5],
        // 屋顶下的矮台阶和石台：一块秤盘在地面，一块在台上。
        [51, 24, 2, 2],
        [54, 22, 4, 4],
        // 最后一段烟囱台阶，一级一级往屋顶上爬。
        [62, 24, 2, 2],
        [66, 22, 2, 2],
        [70, 20, 2, 2],
        [74, 18, 2, 2],
        [78, 16, 2, 2],
        [82, 14, 2, 2],
        [86, 12, 2, 2],
        // 屋顶本身。最右边的门和守夜人都在这层。
        [88, 12, 12, 6],
      ],
      // 屋檐：从烟囱顶跳上来，就能从整座院子和黑水沟上方走过去。
      planks: [[20, 20, 28]],
      gates: [
        {
          id: 's5-bridge',
          kind: 'bridge',
          x: 40,
          y: 26,
          w: 6,
          h: 1,
          plates: ['s5-near', 's5-far'],
          mode: 'any',
          latch: false,
        },
        {
          id: 's5-gate-terrace',
          kind: 'gate',
          x: 58,
          y: 23,
          w: 1,
          h: 3,
          plates: ['s5-low', 's5-high'],
          mode: 'all',
          latch: true,
          // 台上台下两块秤盘，也可以叠罗汉直接翻过去。
          climbable: true,
        },
      ],
      plates: [
        { id: 's5-near', tileX: 36 },
        { id: 's5-far', tileX: 50 },
        { id: 's5-low', tileX: 53 },
        { id: 's5-high', tileX: 55, radius: 22 },
      ],
      watchers: [
        {
          id: 's5-watcher-yard',
          tileX: 30,
          patrol: [24, 36],
          dir: 1,
          range: 155,
          halfAngle: 0.33,
          sweep: 0.6,
          speed: 0.9,
          phase: 0.2,
          patrolSpeed: 0.95,
        },
        {
          id: 's5-watcher-roof',
          tileX: 92,
          dir: -1,
          range: 140,
          halfAngle: 0.34,
          sweep: 0.55,
          speed: 0.9,
          phase: 0.7,
        },
      ],
      shadows: [
        [24, 24, 4, 2],
        [30, 24, 3, 2],
        [34, 24, 3, 2],
        [48, 24, 4, 2],
        // 屋顶上的烟囱影子：蹲在这里等灯扫过去。
        [88, 10, 3, 2],
      ],
      hints: [
        {
          tileX: 5,
          text: '烟囱墙太高：一人蹲下，另一人踩肩上去，再按住 Space 把下面的人吊上来。',
          duration: 5200,
        },
        {
          tileX: 20,
          text: '烟囱顶的屋檐能一直走到对岸；下面的路要过影子桥。',
          duration: 4400,
        },
        {
          tileX: 26,
          text: '灯扫到哪儿，影子就换到哪儿——等守夜人转身。',
          duration: 4200,
        },
        {
          tileX: 38,
          text: '影子桥认秤盘：留一人压住，或者让南瓜替你站着。',
          duration: 4200,
        },
        {
          tileX: 51,
          text: '上下各一块秤盘，一人站一块门就开；上面那块要先踩台阶。',
          duration: 4800,
        },
        {
          tileX: 64,
          text: '一级一级往上跳。最后一级就是屋顶。',
          duration: 4000,
        },
        {
          tileX: 85,
          text: '屋顶上蹲低，等灯扫过，再从烟囱影子里溜到屋脊。',
          duration: 4800,
        },
      ],
      trees: [6, 12, 26, 34, 48, 60, 72, 80],
      graves: [10, 22, 30, 38, 48, 66, 78],
      lamps: [4, 14, 24, 36, 50, 62, 84],
      pumpkins: [10, 13, 22, 28, 32, 38, 48, 60, 68],
      fences: [[8, 2], [30, 3], [46, 2], [74, 2]],
      skullPiles: [16, 32, 47, 64, 76],
    },
  },
]);
