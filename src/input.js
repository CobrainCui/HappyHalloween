const KEY_ACTIONS = new Map([
  ['ArrowLeft', 'left'],
  ['ArrowRight', 'right'],
  ['ArrowUp', 'up'],
  ['ArrowDown', 'down'],
  // E 只负责抱起 / 抛出身边的东西，不再兼任装置、呼吸或离开。
  // （装置用的 Q 只在 main.js 里分派，不需要按住状态。）
  ['KeyE', 'interact'],
  // 第三段：你用 WASD，回音用方向键，各走一套。
  ['KeyA', 'p1left'],
  ['KeyD', 'p1right'],
  ['KeyW', 'p1up'],
  ['KeyS', 'p1down'],
  // 空格是两个「按住」的动作：第三段收紧影子线，惊恐发作时呼吸。
  // 两段不会同时出现，各读各的动作名。
  ['Space', ['rope', 'breath']],
]);

/** 一个物理键可以对应多个动作；查表时统一成数组。 */
function actionsFor(code) {
  const value = KEY_ACTIONS.get(code);
  if (!value) return null;
  return Array.isArray(value) ? value : [value];
}

/**
 * 只负责键盘状态。UI 快捷键（Esc / R / M）由 main.js 处理。
 */
export class Input {
  constructor(target = window) {
    this.keys = new Set();
    this.pressed = new Set();
    this.enabled = true;

    target.addEventListener('keydown', (event) => {
      // 别把 Ctrl+W / Alt+D 这类浏览器快捷键吃掉。
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const actions = actionsFor(event.code);
      if (!actions) return;

      // 没在玩的时候，Space 仍然应该能点亮当前聚焦的按钮。
      if (
        event.code === 'Space' &&
        !this.enabled &&
        event.target?.closest?.('button, a, input, select, textarea')
      ) {
        return;
      }

      event.preventDefault();
      if (!this.enabled) return;

      for (const action of actions) {
        if (!event.repeat) this.pressed.add(action);
        this.keys.add(action);
      }
    });

    target.addEventListener('keyup', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const actions = actionsFor(event.code);
      if (!actions) return;

      event.preventDefault();
      for (const action of actions) this.keys.delete(action);
    });

    window.addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAll();
    });
  }

  isDown(action) {
    return this.enabled && this.keys.has(action);
  }

  /**
   * 触屏按键走同一个动作集合。
   * 「按下」同时进入 keys（持续按住）与 pressed（这一帧刚按下），
   * 和键盘的 keydown 行为保持一致。
   */
  press(action) {
    if (!this.enabled) return;
    this.keys.add(action);
    this.pressed.add(action);
  }

  release(action) {
    this.keys.delete(action);
  }

  consumePress(action) {
    if (!this.pressed.has(action)) return false;
    this.pressed.delete(action);
    return true;
  }

  /**
   * 给同一帧里的多位同行者各分一份输入。
   *
   * 「按住」是全局状态，所有同行者都能看到；
   * 「刚按下」只应被每个人各消费一次，所以每份 fork 都带一份 pressed 副本。
   * 所有 fork 都更新完之后，由 Game 调用 clearPressed() 收走这一帧的按下事件。
   */
  fork() {
    const parent = this;
    const pressed = new Set(this.pressed);
    return {
      isDown: (action) => parent.isDown(action),
      consumePress: (action) => {
        if (!pressed.has(action)) return false;
        pressed.delete(action);
        return true;
      },
      clearPressed: () => pressed.clear(),
    };
  }

  clearPressed() {
    this.pressed.clear();
  }

  releaseAll() {
    this.keys.clear();
    this.pressed.clear();
  }
}
