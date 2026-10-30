/**
 * 糖纸街后八户的门上谜题。
 *
 * 女巫和男巫的任务是整间房；其余八户不再搬南瓜，而是八种不同的门：
 *   skeleton   找规律（骨阵）
 *   ghost      初级心理统计选择题
 *   werewolf   高难度闯关（屋顶追月，数据在 level.js / game.js）
 *   mummy      绷带记号记忆（看一段、照着点一段，一段比一段长，段内记号不重复）
 *   franken    初级线性代数（选择 + 判断）
 *   cat        万圣夜来历与习俗选择题
 *   pumpkinKing 初中几何（带图推理：平行线、全等、等腰三角形、角平分线）
 *   vampire    古堡灯阵（点一扇窗，上下左右一起翻转）
 *
 * 这里只放题目和纯数据；面板渲染在 puzzleView.js，进度存在 session 里。
 */

export const TRICK_PUZZLES = Object.freeze({
  skeleton: {
    type: 'sequence',
    title: '骨牌上的数',
    intro: '阿骨把骨头摆成三排。最后一堆空着，等你按规矩补上。',
    rounds: [
      {
        values: [1, 2, 4, 8],
        prompt: '下一堆该有几根骨头？',
        options: [12, 16, 24, 32],
        answer: 1,
        why: '每一堆都是前一排的两倍。',
        hint: '看相邻两堆的倍数，不是加多少。',
      },
      {
        values: [1, 1, 2, 3, 5],
        prompt: '下一堆该有几根骨头？',
        options: [6, 7, 8, 10],
        answer: 2,
        why: '前两堆加起来，正好是下一堆。',
        hint: '把前两堆放到一起数一遍。',
      },
      {
        values: [2, 3, 5, 8, 12],
        prompt: '下一堆该有几根骨头？',
        options: [15, 16, 17, 20],
        answer: 2,
        why: '相邻两堆依次多 1、2、3、4，所以再往下该多 5。',
        hint: '先看每一对相邻的骨头差多少。',
      },
    ],
  },

  ghost: {
    type: 'quiz',
    subject: '心理统计',
    title: '床单上的统计题',
    intro: '小飘睡不着，抱着心理统计的复习卷数了一夜翻身。答对三题，窗子就亮一盏。',
    rounds: [
      {
        prompt:
          '小飘记了十个晚上：九晚各翻了 3 次身，剩下一晚做了噩梦，翻了 23 次。把这十个数放在一起，下面哪句话是对的？',
        options: [
          '中位数比平均数大',
          '平均数比中位数大',
          '平均数和中位数一样大',
          '只看平均数会低估它平常的一夜',
        ],
        answer: 1,
        why: '平均数 = (9 × 3 + 23) ÷ 10 = 5，中位数是第 5、6 个数的平均，还是 3。那晚的 23 次把平均数往上拖了。',
        hint: '先算平均数，再把这十个数排一排找正中间。',
      },
      {
        prompt:
          '小飘和另一个幽灵都考了 80 分。小飘那场平均 70、标准差 5；另一个那场平均 70、标准差 15。谁在自己那场里更少见？',
        options: [
          '另一个幽灵，因为那场的分数差得更开',
          '一样，两个都正好高出平均 10 分',
          '小飘，它的 +10 分相当于 2 个标准差，另一个只有 2/3 个',
          '看不出来，标准差和分数高低没关系',
        ],
        answer: 2,
        why: '比「高出平均多少」要拿各自的标准差当尺子：小飘是 10 ÷ 5 = 2 个标准差，另一个是 10 ÷ 15 ≈ 0.67 个。离平均两个标准差的那次更少见。',
        hint: '两人都高出平均 10 分，但两场考试的「一个标准差」一样长吗？',
      },
      {
        prompt:
          '两个研究都报告 p = .04。甲的研究样本 20 人，乙的研究样本 2000 人。下面哪句话最站得住？',
        options: [
          '乙的研究里，效应量很可能比甲的小',
          '乙的研究里，效应量很可能比甲的大',
          '两次的效应量一定相同，因为 p 一样',
          'p 一样，两个研究的结论一样可靠',
        ],
        answer: 0,
        why: 'p 同时受效应量和样本量影响：样本一大，很小的效应也能让 p 变小。所以在 p 相同的情况下，样本更大的那次，背后的效应往往更小。',
        hint: 'p 相同不等于效应相同——想想样本量在 p 里起了什么作用。',
      },
    ],
  },

  mummy: {
    type: 'echo',
    title: '绷带上的记号',
    intro:
      '绷布祝一层层松开绷带，上面依次亮起记号。照着顺序点一遍，它才会再松一截——每一段都比上一段长。',
    icons: ['pumpkin', 'ghost', 'bat', 'skull', 'candle', 'cat'],
    // 四段，一段比一段长：3、4、5、6 个记号。
    lengths: [3, 4, 5, 6],
  },

  franken: {
    type: 'quiz',
    subject: '线性代数',
    title: '四道矩阵题',
    intro: '阿壮的脑袋里塞满了矩阵，接线全乱了。答对四道题，线路就通。',
    rounds: [
      {
        prompt: 'A 是 2×3 的矩阵，B 是 3×2 的矩阵。AB 和 BA 各是多大？',
        options: [
          'AB 是 2×2，BA 是 3×3',
          '两个都是 2×2',
          'AB 是 3×3，BA 是 2×2',
          '只有 AB 乘得出来，BA 乘不了',
        ],
        answer: 0,
        why: 'AB 的行来自 A（2 行）、列来自 B（2 列），是 2×2；掉过来 BA 就是 3×3。中间那个 3 被吃掉了，两种顺序吃掉的不是同一头。',
        hint: '乘法只吃掉中间那两个数；换个顺序，站在中间的就不是同一对了。',
      },
      {
        prompt: '矩阵 A = [[1, 2], [2, 4]] 把整个平面映成什么？',
        options: [
          '整个平面，只是被拉长了两倍',
          '整个平面，方向也不变',
          '一条过原点的直线',
          '一条不过原点的直线',
        ],
        answer: 2,
        why: '第二列正好是第一列的两倍，两个列向量指向同一个方向。不管输入什么，输出都落在 (1, 2) 这条线上——平面被压成一条线，det A = 0，A 不可逆。',
        hint: '看看两列之间是不是倍数关系。',
      },
      {
        prompt: 'A、B 是同阶方阵。若 AB 可逆，则 A 和 B 都可逆。',
        options: ['对', '错'],
        answer: 0,
        why: 'det(AB) = det A × det B。乘积不为 0，两个因数就都不能为 0。',
        hint: '先把「可逆」翻译成行列式不为 0。',
      },
      {
        prompt: 'A、B 是同阶方阵。若 AB = 0，则 A = 0 或 B = 0。',
        options: ['对', '错'],
        answer: 1,
        why: '矩阵有「零因子」。比如 A = [[0, 1], [0, 0]]、B = [[1, 0], [0, 0]]，两个都不为零，乘起来却全是零。',
        hint: '找一个自己不全为零、却会把某个方向直接压成零的矩阵。',
      },
    ],
  },

  cat: {
    type: 'quiz',
    subject: '万圣夜',
    title: '黑猫的万圣夜问答',
    intro: '煤球蹲在门槛上，尾巴一甩一甩。它记得万圣夜所有的来历，也乐意考考你。',
    rounds: [
      {
        prompt: '万圣夜的南瓜灯，最早在爱尔兰是用什么雕的？',
        options: ['南瓜', '萝卜（芜菁）', '西瓜', '冬瓜'],
        answer: 1,
        why: '爱尔兰人本来用萝卜挖空、点蜡烛；到了美洲，南瓜更大更好雕，才慢慢变成了今天的样子。',
        hint: '南瓜是美洲的作物，比万圣夜本身晚得多。',
      },
      {
        prompt: 'Halloween（万圣夜）的前身，是凯尔特人的哪个节日？',
        options: ['丰收节 Lughnasadh', '冬至节 Yule', '夏末节 Samhain', '仲夏节 Midsummer'],
        answer: 2,
        why: 'Samhain 在 11 月 1 日的前夜。凯尔特人相信这一夜生者与死者的界限最薄，鬼魂会走动。',
        hint: '它是「夏天结束、冬天开始」的那一夜。',
      },
      {
        prompt: '孩子们敲门时说的「Trick or treat」，里面的 trick 最接近哪个意思？',
        options: ['糖果的包装', '恶作剧', '魔术表演', '敲门的声音'],
        answer: 1,
        why: '整句话是一句条件：不给糖，就捣蛋。trick 就是那个威胁里的恶作剧。',
        hint: '这是一句「不给糖就……」的条件句。',
      },
      {
        prompt: '黑猫为什么常在万圣夜里被当成女巫的同伴？',
        options: [
          '黑猫只在十月出没',
          '古罗马人把黑猫献给月亮',
          '黑猫的叫声听起来像女巫',
          '中世纪的欧洲人相信黑猫是女巫的化身或帮手',
        ],
        answer: 3,
        why: '中世纪的猎巫传说把黑猫和女巫绑在了一起；几百年后，这个印象就留在了万圣夜里。',
        hint: '和猫的习性没关系，和几百年前的传说有关。',
      },
    ],
  },

  pumpkinKing: {
    type: 'quiz',
    subject: '几何',
    title: '南瓜地上的图',
    intro: '老瓤把南瓜地画在了门上。图里的每条线都有讲究——看清楚，再答。',
    rounds: [
      {
        figure: 'parallelBend',
        prompt: '直线 l ∥ m，一条折线从 A 连到 B 再连到 C。∠B 和 ∠A、∠C 是什么关系？',
        options: [
          '∠B = 180° − ∠A − ∠C',
          '∠B = ∠A − ∠C',
          '∠B = ∠A + ∠C',
          '∠B 与 ∠A、∠C 没有固定的关系',
        ],
        answer: 2,
        why: '过 B 作一条和 l 平行的线，它把 ∠B 分成两个角：一个和 ∠A 是内错角，一个和 ∠C 是内错角。所以 ∠B = ∠A + ∠C。',
        hint: '在 B 那里补一条平行线，看看 ∠B 被分成了什么。',
      },
      {
        figure: 'ssa',
        prompt: '两个三角形有两边分别相等，还有其中一边的对角相等（图中打了记号）。它们一定全等吗？',
        options: [
          '不一定全等——这个角不是两条边的夹角',
          '一定全等，这是边角边（SAS）',
          '一定全等，这是边边边（SSS）',
          '一定不全等',
        ],
        answer: 0,
        why: '两边和其中一边的对角相等，推不出全等：那条边能像钟摆一样摆到两个位置，画出两个都满足条件、形状却不同的三角形。SAS 要的是两条边的夹角。',
        hint: '看看那个角，是不是夹在两条已知边中间。',
      },
      {
        figure: 'isosceles',
        prompt: 'AB = AC，AD 平分顶角 ∠A。图中的 AD 还一定是什么？',
        options: [
          '只是角平分线，不是高也不是中线',
          '一定是中线，但不一定是高',
          '一定是高，但不是中线',
          '也是底边 BC 上的高和中线',
        ],
        answer: 3,
        why: '等腰三角形底边上的高、底边上的中线、顶角的平分线是同一条线。两腰相等，AD 又是顶角平分线，所以它垂直平分 BC。',
        hint: '把三角形沿 AD 对折，两半会怎样？',
      },
      {
        figure: 'bisector',
        prompt: 'P 在 ∠AOB 的角平分线上，PD ⊥ OA，PE ⊥ OB。下面哪句一定对？',
        options: [
          'PD = PO',
          'PD = PE',
          'PD 和 PE 不一定相等',
          '只有 P 走到顶点 O 时才相等',
        ],
        answer: 1,
        why: '角平分线上的点到角两边的距离相等。PD、PE 都垂直于边，量度出来的正是这两个距离。',
        hint: '直角记号说明了 PD、PE 是什么。',
      },
    ],
  },

  vampire: {
    type: 'lanterns',
    title: '古堡的窗',
    intro:
      '德古的古堡暗了一大片。点一扇窗，它和上下左右的窗会一起翻转——亮的变暗，暗的变亮。点错了，马上再点同一扇就退回去。把每一轮的窗全部点亮。',
    // 两轮：3×3 和 4×4。
    sizes: [3, 4],
  },
});

export function getTrickPuzzle(houseId) {
  return TRICK_PUZZLES[houseId] ?? null;
}

/** 谜题里的一格：null 是空格；xxOut / xxFull 是另一种画法。 */
export function normalizeCell(cell) {
  if (!cell) return null;
  if (cell === 'candleOut') return { icon: 'candle', variant: 1 };
  if (cell === 'moonFull') return { icon: 'moon', variant: 1 };
  if (cell === 'catGold') return { icon: 'cat', variant: 1 };
  return { icon: cell, variant: 0 };
}

export function cellKey(cell) {
  const normalized = normalizeCell(cell);
  return normalized ? `${normalized.icon}:${normalized.variant}` : null;
}

/** 找不同：左右两扇窗里所有不一样的格子。 */
export function spotDifferences(puzzle) {
  const differences = [];
  for (let index = 0; index < puzzle.left.length; index += 1) {
    if (cellKey(puzzle.left[index]) !== cellKey(puzzle.right[index])) {
      differences.push(index);
    }
  }
  return differences;
}

function shuffle(list, random) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** 绷带记号的一段新序列：先把记号洗一遍再取，段内不会有重复的记号。 */
export function echoSequence(puzzle, length, random = Math.random) {
  const pool = puzzle?.icons ?? [];
  if (!pool.length) return [];
  const sequence = [];
  while (sequence.length < length) {
    const batch = shuffle([...pool], random);
    // 比记号还长时才会用到这一段：接缝处别让同一个记号连在一起。
    if (sequence.length && batch.length > 1 && batch[0] === sequence[sequence.length - 1]) {
      const swap = 1 + Math.floor(random() * (batch.length - 1));
      [batch[0], batch[swap]] = [batch[swap], batch[0]];
    }
    sequence.push(...batch);
  }
  return sequence.slice(0, length);
}

/** 点一盏窗：它自己和上下左右一起翻转。 */
export function toggleLantern(lit, size, index) {
  const row = Math.floor(index / size);
  const col = index % size;
  const flip = (r, c) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return;
    const at = r * size + c;
    lit[at] = !lit[at];
  };
  flip(row, col);
  flip(row - 1, col);
  flip(row + 1, col);
  flip(row, col - 1);
  flip(row, col + 1);
}

/**
 * 一轮古堡窗的初始灯面：从「全亮」倒着点几扇窗做出来，
 * 所以一定点得亮（把同样几扇再点一遍就回去了）。
 */
export function createLanternBoard(size, random = Math.random) {
  const total = size * size;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const lit = Array(total).fill(true);
    const cells = shuffle([...Array(total).keys()], random);
    // 比窗格小两下起：倒推时点得少，玩家也就用几步能点回来。
    const count = Math.max(2, size - 2 + Math.floor(random() * 2));
    for (const index of cells.slice(0, count)) toggleLantern(lit, size, index);
    // 恰好点回全亮的一轮没有谜题可言，换一组。
    if (lit.some((on) => !on)) return lit;
  }
  const fallback = Array(total).fill(true);
  fallback[0] = false;
  return fallback;
}

/** 新开一扇谜题门时的初始进度。 */
export function createPuzzleState(puzzle, random = Math.random) {
  if (!puzzle) return { step: 0, mistakes: 0 };
  if (puzzle.type === 'memory') {
    const deck = shuffle([...puzzle.icons, ...puzzle.icons], random);
    return { deck, matched: [], open: [], moves: 0 };
  }
  if (puzzle.type === 'spot') {
    return { found: [], mistakes: 0 };
  }
  if (puzzle.type === 'echo') {
    return {
      round: 0,
      seq: echoSequence(puzzle, puzzle.lengths[0], random),
      input: 0,
      phase: 'watch',
      mistakes: 0,
    };
  }
  if (puzzle.type === 'lanterns') {
    return {
      round: 0,
      lit: createLanternBoard(puzzle.sizes[0], random),
      moves: 0,
      mistakes: 0,
    };
  }
  return { step: 0, mistakes: 0 };
}

/** 存档里读回来的进度是不是还能用；不能用就整段重开。 */
export function isValidPuzzleState(puzzle, state) {
  if (!puzzle || !state || typeof state !== 'object') return false;
  if (puzzle.type === 'memory') {
    const size = (puzzle.pairs ?? 0) * 2;
    return (
      Array.isArray(state.deck) &&
      state.deck.length === size &&
      Array.isArray(state.matched) &&
      Array.isArray(state.open) &&
      state.matched.every((index) => Number.isInteger(index) && index >= 0 && index < size) &&
      state.open.every((index) => Number.isInteger(index) && index >= 0 && index < size)
    );
  }
  if (puzzle.type === 'spot') {
    return (
      Array.isArray(state.found) && state.found.every((index) => Number.isInteger(index))
    );
  }
  if (puzzle.type === 'echo') {
    const icons = new Set(puzzle.icons ?? []);
    const rounds = puzzle.lengths?.length ?? 0;
    return (
      Number.isInteger(state.round) &&
      state.round >= 0 &&
      state.round < rounds &&
      Array.isArray(state.seq) &&
      state.seq.length > 0 &&
      state.seq.every((icon) => icons.has(icon)) &&
      Number.isInteger(state.input) &&
      state.input >= 0 &&
      state.input <= state.seq.length
    );
  }
  if (puzzle.type === 'lanterns') {
    const size = puzzle.sizes?.[state.round];
    return (
      Number.isInteger(state.round) &&
      state.round >= 0 &&
      state.round < (puzzle.sizes?.length ?? 0) &&
      Array.isArray(state.lit) &&
      state.lit.length === size * size &&
      state.lit.every((on) => typeof on === 'boolean')
    );
  }
  return (
    Number.isFinite(state.step) &&
    state.step >= 0 &&
    state.step <= (puzzle.rounds?.length ?? 0)
  );
}

/** 存档里读回来的进度可能缺字段，补齐后再交给面板。 */
export function normalizePuzzleState(puzzle, state, random = Math.random) {
  if (!puzzle) return { step: 0, mistakes: 0 };
  const fresh = createPuzzleState(puzzle, random);
  if (!isValidPuzzleState(puzzle, state)) return fresh;

  if (puzzle.type === 'memory') {
    const inRange = (index) => Number.isInteger(index) && index >= 0 && index < state.deck.length;
    const open = Array.isArray(state.open) ? state.open.filter(inRange).slice(0, 2) : [];
    return {
      deck: state.deck,
      matched: Array.isArray(state.matched) ? state.matched.filter(inRange) : [],
      // 只保留一张翻开的牌；两张悬着的牌是上一次比较到一半，重开时清掉。
      open: open.length === 1 ? open : [],
      moves: Number.isFinite(state.moves) ? Math.max(0, state.moves) : 0,
    };
  }

  if (puzzle.type === 'spot') {
    const valid = new Set(spotDifferences(puzzle));
    return {
      found: Array.isArray(state.found)
        ? [...new Set(state.found.filter((index) => valid.has(index)))]
        : [],
      mistakes: Number.isFinite(state.mistakes) ? Math.max(0, state.mistakes) : 0,
    };
  }

  if (puzzle.type === 'echo') {
    return {
      round: state.round,
      seq: [...state.seq],
      // 重新打开时从头听一遍，进度归零。
      input: 0,
      phase: 'watch',
      mistakes: Number.isFinite(state.mistakes) ? Math.max(0, state.mistakes) : 0,
    };
  }

  if (puzzle.type === 'lanterns') {
    return {
      round: state.round,
      lit: [...state.lit],
      moves: Number.isFinite(state.moves) ? Math.max(0, state.moves) : 0,
      mistakes: Number.isFinite(state.mistakes) ? Math.max(0, state.mistakes) : 0,
    };
  }

  const total = puzzle.rounds?.length ?? 0;
  return {
    step: Number.isFinite(state.step) ? Math.max(0, Math.min(total, state.step)) : 0,
    mistakes: Number.isFinite(state.mistakes) ? Math.max(0, state.mistakes) : 0,
  };
}

/** 面板进度，也给街上的任务条用。 */
export function getPuzzleProgress(puzzle, state) {
  const fallback = { progress: 0, total: 1, ratio: 0, text: '' };
  if (!puzzle) return fallback;
  if (puzzle.type === 'memory') {
    const matchedCards = new Set(state?.matched ?? []).size;
    const matched = Math.floor(matchedCards / 2);
    const total = puzzle.pairs;
    return {
      progress: matched,
      total,
      ratio: total > 0 ? matched / total : 0,
      text: `配对 ${matched}/${total}`,
    };
  }
  if (puzzle.type === 'spot') {
    const found = state?.found?.length ?? 0;
    const total = spotDifferences(puzzle).length;
    return {
      progress: found,
      total,
      ratio: total > 0 ? found / total : 0,
      text: `找到 ${found}/${total} 处`,
    };
  }
  if (puzzle.type === 'echo') {
    const total = puzzle.lengths?.length ?? 1;
    const round = Math.min(state?.round ?? 0, total);
    return {
      progress: round,
      total,
      ratio: total > 0 ? round / total : 0,
      text: round >= total ? '都记住了' : `第 ${round + 1}/${total} 段`,
    };
  }
  if (puzzle.type === 'lanterns') {
    const total = puzzle.sizes?.length ?? 1;
    const round = Math.min(state?.round ?? 0, total);
    return {
      progress: round,
      total,
      ratio: total > 0 ? round / total : 0,
      text: round >= total ? '窗都亮了' : `第 ${round + 1}/${total} 轮`,
    };
  }
  const total = puzzle.rounds?.length ?? 1;
  const step = Math.min(state?.step ?? 0, total);
  return {
    progress: step,
    total,
    ratio: total > 0 ? step / total : 0,
    text: step >= total ? '都答对了' : `第 ${step + 1}/${total} 题`,
  };
}
