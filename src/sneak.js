/**
 * 「第三段 · 另一双脚步」：原来「鬼鬼祟祟」的潜行规则，缩进「给老师送南瓜派」。
 *
 * 这一段不再是一条独立赛道，也不再讲南瓜大宅、屋顶和烟花。两名玩家共用
 * 一副键盘，走在万圣夜的墓园外墙上：
 *
 *   你 —— A / D 移动，W 跳，S 潜行，E 抱 / 抛南瓜
 *   回音 —— ← / → 移动，↑ 跳，↓ 潜行，/ 抱 / 抛南瓜
 *   两个人共用 Space —— 按住收紧影子线
 *
 * 回音不是另一个人：它长得和你一模一样，只是半透明、只有你看得见。
 * 分得清谁是谁靠的是身上的状态（暴露环、影子括角、影子线），不是身材。
 *
 * 提灯人提着灯在墓碑间来回走；蹲进影子，灯就从头顶过去。
 * 两块石板同时压住，前面的门才升起来；影子桥只认石板，一个人压住，
 * 另一个人先过。两个人还能踩着对方头顶叠罗汉，或用影子线把同伴拉上来。
 *
 * 所有坐标都是地图格；地面固定在第 16 行。地图数据由 level.js 的
 * buildMemorialSneak() 读取，并接在追思路线的第三段上。
 */
export const SNEAK_CAST = Object.freeze(['你', '回音']);

export const SNEAK_STAGE = Object.freeze({
  stage: 3,
  levelId: 'memorial-3',
  name: '另一双脚步',
  subtitle: '你听见另一个自己在走',
  objective: '躲开提灯人的光，你和回音都走到墓园门口',
  intro:
    '第三段路，你想起阿遥。她在山上守一台老无线电，能听见很远的声音，也听见一些别人听不见的。',
  spec: {
    width: 74,
    height: 18,
    groundRow: 16,
    spawn: 3,
    spawn2: 5,
    goal: 71,
    checkpoints: [18, 44, 58],
    // 墓园外墙在这里断了一段，下面是黑水沟；影子桥是唯一的路。
    ground: [[0, 30], [34, 74]],
    blocks: [
      // 几块半埋的旧石台，让负重不高的这一段也有高低起伏。
      [12, 15, 3, 1],
      [42, 15, 2, 1],
      [56, 15, 2, 1],
    ],
    planks: [],
    gates: [
      {
        id: 'm3-gate-plates',
        kind: 'gate',
        x: 24,
        y: 13,
        w: 1,
        h: 3,
        plates: ['m3-plate-left', 'm3-plate-right'],
        mode: 'all',
        latch: true,
        // 门上没有封死：不想同时踩两块，也可以叠罗汉翻过去，
        // 再用影子线把留在门这边的人拉过来。
        climbable: true,
      },
      {
        id: 'm3-bridge',
        kind: 'bridge',
        x: 30,
        y: 16,
        w: 4,
        h: 1,
        plates: ['m3-bridge-near', 'm3-bridge-far'],
        mode: 'any',
        latch: false,
      },
    ],
    plates: [
      { id: 'm3-plate-left', tileX: 14 },
      { id: 'm3-plate-right', tileX: 19 },
      { id: 'm3-bridge-near', tileX: 27 },
      { id: 'm3-bridge-far', tileX: 36 },
    ],
    watchers: [
      {
        id: 'm3-watcher-graves',
        tileX: 44,
        // 提着灯在墓碑之间来回走。走到头就转身，光锥也跟着转。
        patrol: [40, 52],
        dir: 1,
        range: 150,
        halfAngle: 0.34,
        sweep: 0.6,
        speed: 0.8,
        phase: 0.4,
        patrolSpeed: 0.85,
      },
      {
        id: 'm3-watcher-gate',
        tileX: 66,
        patrol: [62, 70],
        dir: -1,
        range: 140,
        halfAngle: 0.33,
        sweep: 0.55,
        speed: 0.9,
        phase: 1.1,
        patrolSpeed: 0.8,
      },
    ],
    shadows: [
      [7, 14, 4, 2],
      [17, 14, 3, 2],
      [21, 14, 3, 2],
      [36, 14, 3, 2],
      [43, 14, 4, 2],
      [49, 14, 3, 2],
      [55, 14, 4, 2],
      [63, 14, 4, 2],
      [69, 14, 3, 2],
    ],
    hints: [
      {
        tileX: 3,
        text: '你 A / D / W / S，回音 ← / → / ↑ / ↓；跳是 W 和 ↑，两个人都到门口才算数。抱南瓜：你 E，回音 /。',
        mobileText:
          '左侧移动，右侧跳跃；回音会跟着你走。按住 ↓ 潜行，躲进墓碑的影子；你和回音都到门口才算数。',
        duration: 5600,
      },
      {
        tileX: 8,
        text: '按住 S（回音按 ↓）潜行。蹲低时，提灯人的光几乎照不到你们。',
        mobileText: '按住 ↓ 潜行。蹲低时，提灯人的光几乎照不到你们。',
        duration: 4400,
      },
      {
        tileX: 13,
        text: '一人踩一块石板，两块同时亮，前面的门才开。南瓜也能压住一块。',
        mobileText: '把南瓜推上一块石板，你和回音一起站上另一块，门就开。',
        duration: 4400,
      },
      {
        tileX: 25,
        text: '影子桥只认石板：一个人压住，另一个人先过；过去的人再压住另一头。',
        mobileText: '把南瓜推上近处的石板，影子桥就会一直铺着；你和回音一起过去。',
        duration: 4800,
      },
      {
        tileX: 36,
        text: '墓碑的影子里最安全。等提灯人转身再走。',
        duration: 4200,
      },
      {
        tileX: 60,
        text: '最后一段。两个人都到门口才算数。',
        duration: 3800,
      },
    ],
    trees: [6, 15, 25, 39, 50, 61, 72],
    graves: [9, 13, 21, 28, 37, 45, 52, 59, 65, 69],
    lamps: [4, 12, 24, 35, 48, 63, 73],
    pumpkins: [9, 16, 22, 26, 39, 46, 53, 60, 67],
    fences: [[11, 2], [38, 2], [55, 3]],
    skullPiles: [17, 29, 44, 58, 68],
  },
});

export const SNEAK_STAGES = Object.freeze([SNEAK_STAGE]);
