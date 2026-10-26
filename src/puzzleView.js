/**
 * 门上谜题的面板。只负责画 DOM、接收点击；进度对象由 game.js 传入，
 * 每次改动通过 onPersist 落盘。八户各有各的玩法：
 * 找规律、脑筋急转弯、知识问答、翻牌配对、找不同、天平、真假话。
 */
import { paintPuzzleIcon } from './puzzleIcons.js';
import {
  getPuzzleProgress,
  normalizeCell,
  spotDifferences,
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
  }) {
    this.stage = stage;
    this.feedback = feedback;
    this.metaStep = metaStep;
    this.metaMistakes = metaMistakes;
    this.onSolved = onSolved;
    this.onPersist = onPersist;
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
    else if (type === 'deduction') this.renderDeduction();
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

  /* ---------------- 找规律 / 脑筋急转弯 / 知识问答 ---------------- */

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
    if (this.puzzle.type === 'riddle') {
      question.append(element('span', 'puzzle-question-tag', '小飘的问题'));
    } else if (this.puzzle.type === 'trivia') {
      question.append(element('span', 'puzzle-question-tag', `第 ${this.state.step + 1} 题`));
    }
    question.append(document.createTextNode(round.prompt));
    this.stage.append(question);

    const optionClass =
      this.puzzle.type === 'riddle'
        ? 'puzzle-options is-lanterns'
        : this.puzzle.type === 'trivia'
          ? 'puzzle-options is-wires'
          : 'puzzle-options is-numbers';
    const options = element('div', optionClass);
    round.options.forEach((option, index) => {
      const button = element('button', 'puzzle-option');
      button.type = 'button';
      if (this.puzzle.type === 'riddle') {
        button.append(element('span', 'puzzle-lantern', ''));
      } else if (this.puzzle.type === 'trivia') {
        button.append(element('span', 'puzzle-bolt', '⚡'));
      } else {
        button.append(element('span', 'puzzle-number', String(option)));
        button.append(element('span', 'puzzle-option-unit', '根'));
      }
      if (this.puzzle.type !== 'sequence') {
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
      this.setFeedback(`不对。${round.hint ?? '再想想。'}`, 'wrong');
      this.updateMeta();
      this.persist();
      return;
    }

    button.classList.add('is-right');
    this.busy = true;
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

  /* ---------------- 真假话：三只箱子 ---------------- */

  renderDeduction() {
    this.stage.replaceChildren();
    this.setFeedback('');
    const rounds = this.puzzle.rounds ?? [];
    const round = rounds[this.state.step];
    if (!round) {
      this.finish('三只箱子都开了。');
      return;
    }

    this.stage.append(element('p', 'puzzle-question', round.prompt));

    const boxes = element('div', 'puzzle-boxes');
    round.boxes.forEach((box, index) => {
      const button = element('button', 'puzzle-box');
      button.type = 'button';
      button.append(element('span', 'puzzle-box-label', box.label));
      const lid = element('span', 'puzzle-box-lid');
      lid.append(element('span', 'puzzle-box-inscription', box.text));
      lid.append(iconCanvas('candy', 0, 34, 'puzzle-box-candy'));
      button.append(lid);
      button.addEventListener('click', () => this.chooseBox(index, button));
      boxes.append(button);
    });
    this.stage.append(boxes);
  }

  chooseBox(index, button) {
    if (this.busy || this.done) return;
    const round = this.puzzle.rounds[this.state.step];
    if (!round) return;

    if (index !== round.answer) {
      button.classList.add('is-wrong');
      this.state.mistakes = (this.state.mistakes ?? 0) + 1;
      this.setFeedback(`这只箱子是空的。${round.hint ?? ''}`, 'wrong');
      this.updateMeta();
      this.persist();
      const token = this.token;
      window.setTimeout(() => {
        if (token === this.token) button.classList.remove('is-wrong');
      }, 600);
      return;
    }

    button.classList.add('is-open');
    this.busy = true;
    this.setFeedback(round.why ?? '找到了。', 'success');
    this.state.step += 1;
    this.updateMeta();
    this.persist();
    const done = this.state.step >= (this.puzzle.rounds?.length ?? 0);
    if (done) {
      this.busy = false;
      this.finish('最后一只箱子也开了。');
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
      this.setFeedback(
        this.balanceValue < round.answer ? '右边轻了。' : '右边重了。',
        'wrong',
      );
      this.updateMeta();
      this.persist();
      return;
    }

    this.busy = true;
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
      slot.classList.add('is-wrong');
      this.setFeedback('这一格两边一样。', 'wrong');
      this.updateMeta();
      this.persist();
      window.setTimeout(() => slot.classList.remove('is-wrong'), 500);
      return;
    }

    this.state.found = [...found, index];
    this.persist();
    this.updateMeta();
    this.renderSpot();
  }
}
