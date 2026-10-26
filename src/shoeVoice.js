/**
 * 皮鞋的声音。
 *
 * 主题：一双新鞋被穿久了，会从不合脚慢慢变得合脚——哪里压脚就松一点，
 * 哪里磨得重就凹一点。这种变化到底算不算「学习」，像机器学习里的适应一样，
 * 是个没有定论的问题。皮鞋只说身上发生了什么，不替玩家下结论。
 *
 * 规则见 agent.md：一句话、平实、不抒情、只谈脚感和磨损，不编造玩家没做过的行为。
 * 触发由 main.js 的 updateHud（每 100ms）驱动，这里只做「什么时候该开口」的判断。
 */

const AMBIENT = {
  // 崭新、发硬、不合脚（fit < 0.5）
  new: [
    '左脚外侧有点挤，我先记着。',
    '刚穿上都硬，走一阵会松。',
    '后跟还空着一块，走起来会晃。',
    '现在我还是鞋匠做的样子，不是你的脚。',
    '你落脚比我想的重。',
    '脚背这里压着，我慢慢会让开。',
    '我不太跟脚，你走慢一点。',
    '每走一步，我都变一点。',
    '前面是落叶，踩上去会滑。',
    '你还没走顺，我也还没顺你。',
  ],
  // 正在合脚（0.5 ~ 0.78）
  worn: [
    '左边磨得快一点，你走路偏左。',
    '现在弯的地方，正好是你的脚背。',
    '你抬脚的时候，我知道该在哪儿松。',
    '前掌比刚穿上软了。',
    '你拐弯会先压外侧，我跟着让。',
    '石头硌过的地方，皮已经凹下去了。',
    '我好像开始知道下一步你会怎么踩。这算学会了吗？',
    '走同样的路，我比前几天省力了。',
    '鞋跟磨掉一层，正好贴住你的脚跟。',
  ],
  // 像自己的脚（>= 0.78）
  old: [
    '现在已经分不清，是我变了，还是你的脚变了。',
    '你停的时候，我也松下来。',
    '下一步多高，我大概能猜到。',
    '我身上有你脚的样子。这算学会了吗？我也说不准。',
    '一双鞋被穿久了会合脚。有人说这也算学习。',
    '换个人穿，我大概又得不合脚。',
    '没人教我，我只是被穿久了。',
    '我不知道是记住了你，还是只是被磨成了这样。',
    '现在我合你的脚了，可我什么都没想。',
  ],
};

const SITUATION = {
  rest: [
    '站着也行。',
    '你歇着，我晾一晾里头。',
    '这地方很静。',
    '再站一会儿，脚会凉。',
  ],
  jump: [
    '跳的时候你脚趾会抓一下。',
    '落地轻一点，鞋底还薄。',
    '跳多了，前掌弯的地方更明显了。',
    '你每次跳，我都跟着弯一下。',
  ],
  defeat: [
    '摔了就摔了，我还在脚上。',
    '这次没踩稳，起来吧。',
    '鞋没坏，接着走。',
  ],
  complete: [
    '到了，你可以把我脱下来。',
    '走完了。我现在合你的脚了。是学会的，还是磨出来的？',
  ],
};

// 皮鞋话要少：开局先安静一阵，之后隔一分半到两分钟才说一句，别打断走路。
const MIN_INTRO_MS = 30000;
const COOLDOWN_MIN = 90000;
const COOLDOWN_JITTER = 45000;
const REST_MS = 15000;

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export class ShoeVoice {
  /**
   * @param {object} options
   * @param {string[]} [options.extraLines] 班级版追加的私货台词（公开版留空）
   */
  constructor({ extraLines = [] } = {}) {
    this.extra = Array.isArray(extraLines) ? extraLines.filter(Boolean) : [];
    this.bag = [];
    this.reset();
  }

  reset() {
    this.startedAt = null;
    this.lastSpokenAt = 0;
    this.cooldown = COOLDOWN_MIN;
    this.lastFitStage = -1;
    this.lastProgress = 0;
    this.lastProgressAt = 0;
    this.lastJumps = 0;
    this.saidDefeat = false;
    this.saidComplete = false;
  }

  /** 按合脚度取词库；班级私货只在「像自己的脚」阶段之后掺进来，避免冲淡主题 */
  poolFor(fit) {
    const base = fit >= 0.78 ? AMBIENT.old : fit >= 0.5 ? AMBIENT.worn : AMBIENT.new;
    return fit >= 0.78 && this.extra.length ? base.concat(this.extra) : base;
  }

  draw(list) {
    if (!list || !list.length) return null;
    if (!this.bag.length) this.bag = shuffle(list);
    const line = this.bag.pop();
    return line ?? null;
  }

  /**
   * @param {object} snap
   * @param {string} snap.state  game.state
   * @param {string} snap.mode   game.mode
   * @param {number} snap.fit    0~1 合脚度
   * @param {number} snap.progress 0~1 关卡进度
   * @param {number} snap.jumps  本局跳跃次数
   * @param {number} snap.now    performance.now()
   * @returns {string|null}
   */
  tick({ state, mode, fit = 0.4, progress = 0, jumps = 0, now = 0 }) {
    // 皮鞋只属于追思小径；其它线路没有鞋，也不说话。
    if (mode !== 'memorial') return null;

    if (state === 'defeat') {
      if (this.saidDefeat) return null;
      this.saidDefeat = true;
      return this.draw(SITUATION.defeat);
    }
    if (state === 'complete') {
      if (this.saidComplete) return null;
      this.saidComplete = true;
      return this.draw(SITUATION.complete);
    }
    if (state !== 'playing') return null;

    if (this.startedAt === null) this.startedAt = now;
    if (now - this.startedAt < MIN_INTRO_MS) return null;

    const stage = fit >= 0.78 ? 2 : fit >= 0.5 ? 1 : 0;
    const fitChanged = this.lastFitStage >= 0 && stage > this.lastFitStage;
    // 合脚度换档是整局最重要的两句，允许插队；其它话要等冷却。
    if (!fitChanged && now - this.lastSpokenAt < this.cooldown) return null;

    const moved = Math.abs(progress - this.lastProgress) > 0.004;
    const idleFor = moved ? 0 : now - (this.lastProgressAt || now);
    const jumped = jumps - this.lastJumps >= 6;

    this.lastProgress = progress;
    if (moved) this.lastProgressAt = now;
    this.lastFitStage = stage;

    let line = null;
    if (fitChanged) {
      // 刚变得更合脚，先说这个——这是全局最该被玩家听见的一句。
      line = this.draw(this.poolFor(fit));
    } else if (idleFor >= REST_MS) {
      line = this.draw(SITUATION.rest);
    } else if (jumped) {
      line = this.draw(SITUATION.jump);
    } else if (moved) {
      // 走路时才偶尔说一句；站着或刚停下时不主动找话。
      line = this.draw(this.poolFor(fit));
    }

    if (!line) return null;

    this.lastSpokenAt = now;
    this.lastJumps = jumps;
    this.cooldown = COOLDOWN_MIN + Math.random() * COOLDOWN_JITTER;
    return line;
  }
}
