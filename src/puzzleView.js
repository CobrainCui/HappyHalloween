/**
 * 门上谜题的面板。只负责画 DOM、接收点击；进度对象由 game.js 传入，
 * 每次改动通过 onPersist 落盘。面板里只有这些玩法：
 * 找规律、选择题 / 判断题、绷带记号、古堡窗格、翻牌配对、找不同、天平。
 */
import { paintPuzzleIcon } from './puzzleIcons.js';
import { createPuzzleFigure } from './puzzleFigures.js';
import {
  createLanternBoard,
  echoSequence,
  getPuzzleProgress,
  normalizeCell,
  spotDifferences,
  toggleLantern,
} from './trickPuzzles.js';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function iconCanvas(icon, variant = 0, size = 40, className = '') {
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = size * scale;
  canvas.height = size * scale;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  if (className) canvas.className = className;
  paintPuzzleIcon(canvas, icon, variant);
  return canvas;
}
function iconGroup(parts, size = 28) {
  const wrap = element('span', 'puzzle-icon-group');
  for (const part of parts) {
    if (part.n === '?') {
      wrap.append(element('span', 'puzzle-question-mark', '?'));
      continue;
    }
    for (let index = 0; index < part.n; index += 1) {
      wrap.append(iconCanvas(part.icon, part.variant ?? 0, size, 'puzzle-inline-icon'));
    }
  }
  return wrap;
}

export class PuzzleView {
  constructor({
    stage,
    feedback,
    metaStep,
    metaMistakes,
    onSolved,
    onPersist,
    onSound,
  }) {
    this.stage = stage;
    this.feedback = feedback;
    this.metaStep = metaStep;
    this.metaMistakes = metaMistakes;
    this.onSolved = onSolved;
    this.onPersist = onPersist;
    this.onSound = onSound;
    this.house = null;
    this.puzzle = null;
    this.state = null;
    this.token = 0;
    this.timer = 0;
    this.busy = false;
    this.done = false;
    this.completed = false;
    this.balanceValue = 0;
  }

  open(house, state) {
    this.token += 1;
    this.clearTimer();
    this.house = house;
    this.puzzle = house?.puzzle ?? null;
    this.state = state;
    // 上一次是两张牌悬在半空时离开的：重开时从干净的牌面开始。
    if (
      this.puzzle?.type === 'memory' &&
      state &&
      Array.isArray(state.open) &&
      state.open.length >= 2
    ) {
      state.open = [];
      this.onPersist?.();
    }
    this.busy = false;
    this.done = false;
    this.completed = false;
    this.balanceValue = 0;
    this.echoSlots = [];
    this.echoButtons = new Map();
    this.echoStatus = null;
    // 绷带记号每次打开都从头放一遍，并且重新抽一段：
    // 同一段记号不会跟着存档反复出现，每次开门都是新的顺序。
    if (this.puzzle?.type === 'echo' && state) {
      const lengths = this.puzzle.lengths ?? [];
      const round = Math.min(Math.max(state.round ?? 0, 0), Math.max(0, lengths.length - 1));
      state.input = 0;
      state.phase = 'watch';
      state.seq = echoSequence(this.puzzle, lengths[round] ?? 3);
      this.onPersist?.();
    }
    this.stage.replaceChildren();
    this.feedback.textContent = '';
    this.feedback.className = 'trick-puzzle-feedback';
    if (!this.puzzle) {
      this.stage.append(element('p', 'trick-puzzle-empty', '这扇门后面没有谜题。'));
      return;
    }
    this.render();
  }

  close() {
    // 面板已经显示成功、但 650ms 的收尾还没走完时被关掉：把这一户直接结算，
    // 不要让玩家因为按了 Esc 就丢掉已经解开的门。
    const pending = this.done && !this.completed && this.house ? this.house.id : null;
    this.token += 1;
    this.clearTimer();
    this.busy = false;
    this.house = null;
    this.puzzle = null;
    this.state = null;
    this.stage.replaceChildren();
    this.feedback.textContent = '';
    this.feedback.className = 'trick-puzzle-feedback';
    this.metaStep.textContent = '';
    this.metaMistakes.textContent = '';
    this.echoSlots = [];
    this.echoButtons = new Map();
    this.echoStatus = null;
    if (pending) {
      this.completed = true;
      this.onSolved?.(pending);
    }
  }

  clearTimer() {
    if (this.timer) {
      window.clearTimeout(this.timer);
      this.timer = 0;
    }
  }

  schedule(callback, delay) {
    const token = this.token;
    this.clearTimer();
    this.timer = window.setTimeout(() => {
      if (token !== this.token) return;
      this.timer = 0;
      callback();
    }, delay);
  }

  persist() {
    this.onPersist?.();
  }

  /** 面板不直接拿音效对象：对错各报一个名字，由 main.js 转给 AudioKit。 */
  sound(name) {
    this.onSound?.(name);
  }

  setFeedback(text, tone = '') {
    this.feedback.textContent = text;
    this.feedback.className = `trick-puzzle-feedback${tone ? ` is-${tone}` : ''}`;
  }

  updateMeta() {
    if (!this.puzzle) return;
    const progress = getPuzzleProgress(this.puzzle, this.state);
    this.metaStep.textContent = progress.text;
    if (this.puzzle.type === 'memory') {
      this.metaMistakes.textContent = `翻牌 ${this.state.moves ?? 0} 次`;
    } else if (this.puzzle.type === 'spot') {
      this.metaMistakes.textContent = `看错 ${this.state.mistakes ?? 0} 次`;
    } else if (this.puzzle.type === 'balance') {
      this.metaMistakes.textContent = `称错 ${this.state.mistakes ?? 0} 次`;
    } else if (this.puzzle.type === 'lanterns') {
      this.metaMistakes.textContent = `点灯 ${this.state.moves ?? 0} 次`;
    } else if (this.puzzle.type === 'echo') {
      this.metaMistakes.textContent = `记错 ${this.state.mistakes ?? 0} 次`;
    } else {
      this.metaMistakes.textContent = `答错 ${this.state.mistakes ?? 0} 次`;
    }
  }

  render() {
    if (!this.puzzle) return;
    this.updateMeta();
    this.stage.replaceChildren();
    const type = this.puzzle.type;
    if (type === 'memory') this.renderMemory();
    else if (type === 'spot') this.renderSpot();
    else if (type === 'balance') this.renderBalance();
    else if (type === 'echo') this.renderEcho();
    else if (type === 'lanterns') this.renderLanterns();
    else this.renderRound();
  }

  finish(message = '门开了。') {
    if (this.done) return;
    this.done = true;
    this.setFeedback(message, 'success');
    this.persist();
    this.schedule(() => {
      this.completed = true;
      this.onSolved?.(this.house.id);
    }, 650);
  }

  /* ---------------- 找规律 / 选择题 / 判断题 ---------------- */

  renderRound() {
    this.stage.replaceChildren();
    this.setFeedback('');
    const rounds = this.puzzle.rounds ?? [];
    const round = rounds[this.state.step];
    if (!round) {
      this.finish('最后一题也答对了。');
      return;
    }

    if (this.puzzle.type === 'sequence') {
      const sequence = element('div', 'puzzle-sequence');
      for (const value of round.values) {
        const chip = element('div', 'puzzle-bone-chip');
        chip.append(iconCanvas('bone', 0, 26, 'puzzle-bone-icon'));
        chip.append(element('b', null, String(value)));
        sequence.append(chip);
      }
      const blank = element('div', 'puzzle-bone-chip is-blank');
      blank.append(iconCanvas('bone', 0, 26, 'puzzle-bone-icon'));
      blank.append(element('b', null, '?'));
      sequence.append(blank);
      this.stage.append(sequence);
    }

    const question = element('p', 'puzzle-question');
    if (this.puzzle.type === 'quiz') {
      // 题目按科目标：小飘是心理统计，阿壮是线性代数，德古两种都出。
      question.append(
        element(
          'span',
          'puzzle-question-tag',
          `${this.puzzle.subject ?? '问题'} · 第 ${this.state.step + 1} 题`,
        ),
      );
    }
    question.append(document.createTextNode(round.prompt));
    this.stage.append(question);

    // 几何题的图：夹在题干和选项中间。没有图就只出文字题。
    if (round.figure) {
      const figure = createPuzzleFigure(round.figure);
      if (figure) this.stage.append(figure);
    }

    // 只有两个选项就是判断题：按钮放大、居中，不挂字母。
    const judge = this.puzzle.type === 'quiz' && round.options.length === 2;
    const optionClass = judge
      ? 'puzzle-options is-judge'
      : this.puzzle.type === 'sequence'
        ? 'puzzle-options is-numbers'
        : 'puzzle-options is-quiz';
    const options = element('div', optionClass);
    round.options.forEach((option, index) => {
      const button = element('button', 'puzzle-option');
      button.type = 'button';
      if (this.puzzle.type === 'sequence') {
        button.append(element('span', 'puzzle-number', String(option)));
        button.append(element('span', 'puzzle-option-unit', '根'));
      } else if (judge) {
        button.classList.add('is-judge');
        button.append(element('span', 'puzzle-option-text', String(option)));
      } else {
        button.append(
          element('span', 'puzzle-option-letter', String.fromCharCode(65 + index)),
        );
        button.append(element('span', 'puzzle-option-text', String(option)));
      }
      button.addEventListener('click', () => this.chooseRoundOption(index, button));
      options.append(button);
    });
    this.stage.append(options);
  }

  chooseRoundOption(index, button) {
    if (this.busy || this.done) return;
    const round = this.puzzle.rounds[this.state.step];
    if (!round) return;

    if (index !== round.answer) {
      if (button.classList.contains('is-wrong')) return;
      button.classList.add('is-wrong');
      button.disabled = true;
      this.state.mistakes = (this.state.mistakes ?? 0) + 1;
      this.sound('answerWrong');
      this.setFeedback(`不对。${round.hint ?? '再想想。'}`, 'wrong');
      this.updateMeta();
      this.persist();
      return;
    }

    button.classList.add('is-right');
    this.busy = true;
    this.sound('answerRight');
    this.setFeedback(round.why ?? '对了。', 'success');
    this.state.step += 1;
    this.updateMeta();
    this.persist();
    const done = this.state.step >= (this.puzzle.rounds?.length ?? 0);
    if (done) {
      this.busy = false;
      this.finish('最后一题也答对了。');
      return;
    }
    this.schedule(() => {
      this.busy = false;
      this.render();
    }, 850);
  }

  /* ---------------- 天平 ---------------- */

  renderBalance() {
    this.stage.replaceChildren();
    this.setFeedback('');
    const rounds = this.puzzle.rounds ?? [];
    const round = rounds[this.state.step];
    if (!round) {
      this.finish('三杆秤都平了。');
      return;
    }

    const equations = element('div', 'puzzle-equations');
    for (const equation of round.equations) {
      const row = element('div', 'puzzle-equation');
      row.append(iconGroup(equation.left, 26));
      row.append(element('span', 'puzzle-equals', '='));
      row.append(iconGroup(equation.right, 26));
      equations.append(row);
    }
    this.stage.append(equations);

    const question = element('div', 'puzzle-equation is-question');
    question.append(iconGroup(round.question.left, 30));
    question.append(element('span', 'puzzle-equals', '='));
    question.append(iconGroup(round.question.right, 30));
    this.stage.append(question);

    const scale = element('div', 'puzzle-scale');
    const beam = element('div', 'puzzle-scale-beam');
    const leftPan = element('div', 'puzzle-pan is-left');
    leftPan.append(iconGroup(round.question.left, 32));
    const rightPan = element('div', 'puzzle-pan is-right');
    const candyHolder = element('span', 'puzzle-pan-candy');
    candyHolder.append(iconCanvas('candy', 0, 26));
    candyHolder.append(element('b', null, String(this.balanceValue)));
    rightPan.append(candyHolder);
    beam.append(leftPan, rightPan);
    scale.append(beam);
    this.stage.append(scale);

    const controls = element('div', 'puzzle-scale-controls');
    const minus = element('button', 'puzzle-step-button', '−');
    minus.type = 'button';
    minus.disabled = this.balanceValue <= 0;
    minus.addEventListener('click', () => this.changeBalance(-1));
    const value = element('span', 'puzzle-scale-value', `${this.balanceValue} 颗`);
    const plus = element('button', 'puzzle-step-button', '＋');
    plus.type = 'button';
    plus.disabled = this.balanceValue >= round.max;
    plus.addEventListener('click', () => this.changeBalance(1));
    const weigh = element('button', 'primary-button puzzle-weigh', '称一称');
    weigh.type = 'button';
    weigh.addEventListener('click', () => this.weigh());
    controls.append(minus, value, plus, weigh);
    this.stage.append(controls);

    this.positionScale(beam);
  }

  changeBalance(delta) {
    const round = this.puzzle.rounds[this.state.step];
    if (!round || this.busy) return;
    this.balanceValue = Math.max(0, Math.min(round.max, this.balanceValue + delta));
    this.renderBalance();
  }

  positionScale(beam) {
    const round = this.puzzle.rounds[this.state.step];
    if (!round) return;
    const diff = this.balanceValue - round.answer;
    beam.classList.toggle('is-even', diff === 0);
    beam.style.setProperty('--tilt', `${Math.max(-9, Math.min(9, diff * 1.1))}deg`);
  }

  weigh() {
    const round = this.puzzle.rounds[this.state.step];
    if (!round || this.busy || this.done) return;
    if (this.balanceValue !== round.answer) {
      this.state.mistakes = (this.state.mistakes ?? 0) + 1;
      this.sound('answerWrong');
      this.setFeedback(
        this.balanceValue < round.answer ? '右边轻了。' : '右边重了。',
        'wrong',
      );
      this.updateMeta();
      this.persist();
      return;
    }

    this.busy = true;
    this.sound('answerRight');
    this.setFeedback(round.why ?? '秤平了。', 'success');
    this.state.step += 1;
    this.updateMeta();
    this.persist();
    const done = this.state.step >= (this.puzzle.rounds?.length ?? 0);
    if (done) {
      this.busy = false;
      this.balanceValue = 0;
      this.finish('最后一杆秤也平了。');
      return;
    }
    this.schedule(() => {
      this.busy = false;
      this.balanceValue = 0;
      this.render();
    }, 750);
  }

  /* ---------------- 绷带记号（看一段、照着点一段） ---------------- */

  renderEcho() {
    this.stage.replaceChildren();
    const seq = this.state.seq ?? [];

    const wrap = element('div', 'puzzle-echo');
    const status = element('p', 'puzzle-echo-status', '');
    wrap.append(status);

    // 这一轮要记几个记号，就摆几格；记住一格亮一格。
    const slots = element('div', 'puzzle-echo-slots');
    const slotNodes = [];
    for (let index = 0; index < seq.length; index += 1) {
      const slot = element('span', 'puzzle-echo-slot');
      slots.append(slot);
      slotNodes.push(slot);
    }
    wrap.append(slots);
    this.echoSlots = slotNodes;
    this.echoStatus = status;

    const pad = element('div', 'puzzle-echo-pad');
    this.echoButtons = new Map();
    for (const icon of this.puzzle.icons ?? []) {
      const button = element('button', 'puzzle-echo-button');
      button.type = 'button';
      button.dataset.icon = icon;
      button.append(iconCanvas(icon, 0, 44));
      button.addEventListener('click', () => this.chooseEcho(icon));
      pad.append(button);
      this.echoButtons.set(icon, button);
    }
    wrap.append(pad);
    this.stage.append(wrap);

    this.updateEchoUi();
    this.busy = false;
    this.playEcho();
  }

  updateEchoUi() {
    const input = this.state?.input ?? 0;
    (this.echoSlots ?? []).forEach((slot, index) => {
      slot.classList.toggle('is-lit', index < input);
    });
    if (this.echoStatus) {
      const round = (this.state?.round ?? 0) + 1;
      const total = this.puzzle?.lengths?.length ?? 1;
      this.echoStatus.textContent =
        this.state?.phase === 'watch'
          ? `第 ${round}/${total} 段 · 看好了`
          : `第 ${round}/${total} 段 · 轮到你了`;
    }
    this.updateMeta();
  }

  /** 绷带闪一下：playback 用它点名，玩家点对也用它回应。 */
  flashEcho(icon) {
    for (const [key, button] of this.echoButtons ?? []) {
      button.classList.toggle('is-on', key === icon);
    }
  }

  playEcho() {
    this.clearTimer();
    const token = this.token;
    const seq = this.state?.seq ?? [];
    this.busy = true;
    this.state.phase = 'watch';
    this.state.input = 0;
    this.persist();
    this.updateEchoUi();
    this.setFeedback('看好了——绷带上的记号会依次亮起。');

    let index = 0;
    const step = () => {
      if (token !== this.token) return;
      this.flashEcho(null);
      if (index >= seq.length) {
        this.busy = false;
        this.state.phase = 'input';
        this.persist();
        this.updateEchoUi();
        this.setFeedback('轮到你了：照着顺序点。');
        return;
      }
      const icon = seq[index];
      index += 1;
      this.flashEcho(icon);
      this.sound('flip');
      // 两个记号连在一起时也要看得清是两个：先亮一会儿，再暗下去。
      window.setTimeout(() => {
        if (token === this.token) this.flashEcho(null);
      }, 240);
      this.schedule(step, 430);
    };
    this.schedule(step, 360);
  }

  chooseEcho(icon) {
    if (this.busy || this.done) return;
    const seq = this.state.seq ?? [];
    if (icon === seq[this.state.input]) {
      this.state.input += 1;
      this.sound('answerRight');
      this.flashEcho(icon);
      window.setTimeout(() => this.flashEcho(null), 220);
      this.persist();

      if (this.state.input < seq.length) {
        this.updateEchoUi();
        return;
      }

      // 这一段记全了。
      const nextRound = (this.state.round ?? 0) + 1;
      const total = this.puzzle.lengths?.length ?? 1;
      if (nextRound >= total) {
        this.state.round = nextRound;
        this.persist();
        this.updateEchoUi();
        this.finish('最后一段绷带也松开了。');
        return;
      }

      this.busy = true;
      this.setFeedback('对了。绷带又松一截——下一段更长。', 'success');
      // 先把下一段写进进度：中途关掉面板，再打开时也是从新的一段开始，
      // 不会停在「这一段已经记完、却还没换段」的半截上。
      this.state.round = nextRound;
      this.state.seq = echoSequence(this.puzzle, this.puzzle.lengths[nextRound]);
      this.state.input = 0;
      this.persist();
      this.schedule(() => {
        this.busy = false;
        this.renderEcho();
      }, 900);
      return;
    }

    // 点错了：这一段从头再放一遍，不换记号。
    this.state.mistakes = (this.state.mistakes ?? 0) + 1;
    this.sound('answerWrong');
    this.setFeedback('不是这个。这一段从头再放一遍。', 'wrong');
    this.persist();
    this.updateMeta();
    this.busy = true;
    this.schedule(() => {
      this.busy = false;
      this.playEcho();
    }, 700);
  }

  /* ---------------- 古堡灯阵（点一扇，上下左右一起翻转） ---------------- */

  renderLanterns() {
    this.stage.replaceChildren();
    const sizes = this.puzzle.sizes ?? [];
    const round = this.state.round ?? 0;
    if (round >= sizes.length) {
      this.finish('所有窗都亮了。');
      return;
    }
    if (!this.busy) this.setFeedback('');

    const size = sizes[round];
    const lit = this.state.lit ?? [];
    const grid = element('div', 'puzzle-lantern-grid');
    grid.style.setProperty('--lantern-size', String(size));
    lit.forEach((on, index) => {
      const cell = element('button', 'puzzle-lantern-cell');
      cell.type = 'button';
      cell.classList.toggle('is-lit', on);
      cell.append(iconCanvas('candle', on ? 0 : 1, 42));
      cell.addEventListener('click', () => this.flipLantern(index));
      grid.append(cell);
    });
    this.stage.append(grid);

    if (!this.busy) {
      this.setFeedback(
        `第 ${round + 1}/${sizes.length} 轮。点亮所有窗——点一扇，它和上下左右一起翻转。`,
      );
    }
  }

  flipLantern(index) {
    if (this.busy || this.done) return;
    const size = this.puzzle.sizes[this.state.round];
    toggleLantern(this.state.lit, size, index);
    this.state.moves = (this.state.moves ?? 0) + 1;
    this.sound('flip');
    this.persist();

    if (!this.state.lit.every(Boolean)) {
      this.updateMeta();
      this.renderLanterns();
      return;
    }

    // 这一轮全亮了。
    this.sound('answerRight');
    const nextRound = this.state.round + 1;
    const total = this.puzzle.sizes.length;
    if (nextRound >= total) {
      this.state.round = nextRound;
      this.persist();
      this.updateMeta();
      this.finish('所有窗都亮了。');
      return;
    }

    this.busy = true;
    this.setFeedback('这一轮的窗全亮了。下一轮更大。', 'success');
    this.renderLanterns();
    // 先把下一轮的灯面写进进度：中途退出也不会停在一轮「全亮却没过」的窗里。
    this.state.round = nextRound;
    this.state.lit = createLanternBoard(this.puzzle.sizes[nextRound]);
    this.persist();
    this.schedule(() => {
      this.busy = false;
      this.renderLanterns();
    }, 850);
  }

  /* ---------------- 翻牌配对 ---------------- */

  renderMemory() {
    this.stage.replaceChildren();
    const pairs = this.puzzle.pairs;
    const matched = new Set(this.state.matched ?? []);
    const open = new Set(this.state.open ?? []);
    const grid = element('div', 'puzzle-memory-grid');
    grid.style.setProperty('--puzzle-columns', String(this.puzzle.columns ?? 4));

    (this.state.deck ?? []).forEach((icon, index) => {
      const card = element('button', 'puzzle-memory-card');
      card.type = 'button';
      const visible = matched.has(index) || open.has(index);
      card.classList.toggle('is-open', visible);
      card.classList.toggle('is-matched', matched.has(index));
      if (visible) {
        const canvas = iconCanvas(icon, 0, 46, 'puzzle-memory-icon');
        card.append(canvas);
      } else {
        card.append(element('span', 'puzzle-bandage', ''));
      }
      card.addEventListener('click', () => this.flipCard(index));
      grid.append(card);
    });
    this.stage.append(grid);

    if (matched.size >= pairs * 2) {
      this.finish('最后一对绷带也松开了。');
      return;
    }
    if (!open.size) {
      this.setFeedback(`翻开两张一样的。还剩 ${pairs - matched.size / 2} 对。`);
    }
  }

  flipCard(index) {
    if (this.busy || this.done) return;
    const matched = this.state.matched ?? [];
    const open = this.state.open ?? [];
    if (open.length >= 2) return;
    if (matched.includes(index) || open.includes(index)) return;

    open.push(index);
    this.state.open = open;
    this.sound('flip');
    if (open.length < 2) {
      this.persist();
      this.renderMemory();
      return;
    }

    this.state.moves = (this.state.moves ?? 0) + 1;
    const [first, second] = open;
    if (this.state.deck[first] === this.state.deck[second]) {
      this.state.matched = [...matched, first, second];
      this.state.open = [];
      this.sound('answerRight');
      this.persist();
      this.updateMeta();
      this.renderMemory();
      if (!this.done) this.setFeedback('一对。', 'success');
      return;
    }

    this.busy = true;
    this.persist();
    this.updateMeta();
    this.renderMemory();
    this.setFeedback('不一样。绷带又缠回去了。', '');
    this.schedule(() => {
      this.state.open = [];
      this.busy = false;
      this.persist();
      this.renderMemory();
    }, 650);
  }

  /* ---------------- 找不同 ---------------- */

  renderSpot() {
    this.stage.replaceChildren();
    const differences = spotDifferences(this.puzzle);
    const found = new Set(this.state.found ?? []);
    const columns = this.puzzle.columns ?? 4;
    const wrap = element('div', 'puzzle-spot');

    const makeWindow = (title, cells, interactive) => {
      const panel = element('div', 'puzzle-window');
      panel.style.setProperty('--puzzle-columns', String(columns));
      panel.append(element('p', 'puzzle-window-label', title));
      const grid = element('div', 'puzzle-window-grid');
      grid.style.setProperty('--puzzle-columns', String(columns));
      cells.forEach((cell, index) => {
        const normalized = normalizeCell(cell);
        const tag = interactive ? 'button' : 'div';
        const slot = element(tag, 'puzzle-window-cell');
        if (interactive) slot.type = 'button';
        if (found.has(index)) slot.classList.add('is-found');
        if (normalized) {
          slot.append(iconCanvas(normalized.icon, normalized.variant, 34));
        } else {
          slot.classList.add('is-empty');
        }
        if (interactive) {
          slot.addEventListener('click', () => this.chooseSpot(index, slot));
        }
        grid.append(slot);
      });
      panel.append(grid);
      return panel;
    };

    wrap.append(makeWindow('煤球看见的', this.puzzle.left, false));
    wrap.append(makeWindow('你看见的', this.puzzle.right, true));
    this.stage.append(wrap);

    if (found.size >= differences.length) {
      this.finish('四处都找到了。');
      return;
    }
    this.setFeedback(`右边还有 ${differences.length - found.size} 处不一样。`);
  }

  chooseSpot(index, slot) {
    if (this.done) return;
    const differences = spotDifferences(this.puzzle);
    const found = this.state.found ?? [];
    if (found.includes(index)) return;

    if (!differences.includes(index)) {
      this.state.mistakes = (this.state.mistakes ?? 0) + 1;
      this.sound('answerWrong');
      slot.classList.add('is-wrong');
      this.setFeedback('这一格两边一样。', 'wrong');
      this.updateMeta();
      this.persist();
      window.setTimeout(() => slot.classList.remove('is-wrong'), 500);
      return;
    }

    this.state.found = [...found, index];
    this.sound('answerRight');
    this.persist();
    this.updateMeta();
    this.renderSpot();
  }
}
