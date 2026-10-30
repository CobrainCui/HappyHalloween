/**
 * 触屏操作层：把画面上的虚拟按键翻译成 Input 里的动作。
 *
 * 游戏逻辑只认 left / right / up / down 这些动作，所以触屏和键盘
 * 走的是同一条路，不需要在 player / game 里区分设备。
 * 桌面端不会显示这一层，输入仍然完全由键盘负责。
 */

/** 手机 / 平板：粗指针且没有悬停。触屏笔记本仍按电脑端处理。 */
export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  // 加 ?mobile=1 可以在电脑浏览器里预览移动端布局，也方便真机调试前检查。
  if (new URLSearchParams(window.location.search).has('mobile')) return true;
  if (!window.matchMedia) return false;
  return (
    window.matchMedia('(pointer: coarse)').matches &&
    window.matchMedia('(hover: none)').matches
  );
}

export class TouchControls {
  constructor(root, input, handlers = {}) {
    this.root = root;
    this.input = input;
    this.handlers = handlers;
    this.active = false;
    this.resetCallbacks = [];

    for (const button of root.querySelectorAll('[data-touch-action]')) {
      this.bindActionButton(button);
    }

    this.bindTapButton(
      root.querySelector('#touchInteractButton'),
      handlers.onInteract,
      // 互动键允许长按：惊恐发作时一直按住再松开，也算一次呼吸。
      { allowLongHold: true },
    );
    this.bindTapButton(root.querySelector('#touchBagButton'), handlers.onBag);
    this.bindTapButton(root.querySelector('#touchHintButton'), handlers.onHint);
    this.bindTapButton(root.querySelector('#touchPauseButton'), handlers.onPause);

    // 长按虚拟键不该弹出系统菜单。
    root.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  bindActionButton(button) {
    const action = button.dataset.touchAction;
    const pointers = new Set();

    const press = (event) => {
      if (!this.active) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      pointers.add(event.pointerId);
      try {
        button.setPointerCapture?.(event.pointerId);
      } catch {
        // 指针已经失效时继续按住即可，松开仍会走 pointerup。
      }
      button.classList.add('is-down');
      this.input.press(action);
    };

    const release = (event) => {
      if (!pointers.delete(event.pointerId)) return;
      if (pointers.size > 0) return;
      button.classList.remove('is-down');
      this.input.release(action);
    };

    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);

    this.resetCallbacks.push(() => {
      pointers.clear();
      button.classList.remove('is-down');
      this.input.release(action);
    });
  }

  bindTapButton(button, handler, options = {}) {
    if (!button || typeof handler !== 'function') return;
    let downAt = 0;

    button.addEventListener('pointerdown', (event) => {
      if (!this.active) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      try {
        button.setPointerCapture?.(event.pointerId);
      } catch {
        // 同上：拿不到捕获也不影响这一下点按。
      }
      button.classList.add('is-down');
      downAt = performance.now();
    });

    // 点在按钮上才算数；手指滑出去再松开不会误触发。
    button.addEventListener('pointerup', (event) => {
      if (!this.active) return;
      button.classList.remove('is-down');
      const rect = button.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inside) return;
      if (!options.allowLongHold && performance.now() - downAt > 900) return;
      handler();
    });

    const cancel = () => button.classList.remove('is-down');
    button.addEventListener('pointercancel', cancel);
    button.addEventListener('lostpointercapture', cancel);

    this.resetCallbacks.push(() => button.classList.remove('is-down'));
  }

  setActive(active) {
    if (this.active === active) return;
    this.active = active;
    if (!active) this.reset();
  }

  reset() {
    for (const reset of this.resetCallbacks) reset();
  }

  setBagLabel(label) {
    const button = this.root.querySelector('#touchBagButton');
    if (button) button.textContent = label;
  }
}
