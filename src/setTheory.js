/**
 * 追思小径第二、三段 · 集合庭院；糖纸街女巫房间沿用同一套规则，只留一道门。
 *
 * Kurt 把数学当作锚点：在混沌里推演久了，集合论只问他一件最朴素的事：
 * 「在不在里面」。这些门考交集、差集、补集和接龙映射：
 * A 里的每样东西都接到它后面的那一样，最后一样接回第一样。
 *
 * 玩法：
 *   - 每一颗元素都是一个完整的东西（骷髅、幽灵、眼睛、蜡烛……），身上不挂
 *     归属标签。门楣的成员板把图标放大两倍，旁边直接写出名字。
 *   - 分格门：地面分成四个边界清楚的格子，每格上方的牌子写着这一格认的具体
 *     运算：A − B、A ∩ B、B − A、A ∪ B 上加一横（两边都不在）。
 *     一颗元素只有进了自己归属对应的格子才算数；随便一颗放进去不算。
 *   - 映射门：地面是一排小台，每个台上立着 A 里的一个元素；门楣只画前几段
 *     接龙，其余留问号。玩家把 B 里的每样东西放到它前面那一样的小台下。
 *   - 一个萝卜一个坑：每格按该进这一格的东西数挖好坑，一个坑只收一颗。
 *     放对了东西沉进坑里，坑盖上盖子、和地面齐平，人可以踩着走过去；
 *     放错了东西会被坑弹出来，捡起来可以再放。全部分对，石门缓缓沉进地里。
 *   - 不写算式、不按键、不失败。门锁一次，之后一直开着。
 */

/**
 * 每样东西的名字。提示面板、互动提示和门楣上的成员板共用这一份，
 * 免得同一颗骷髅在一处叫「骷髅」、在另一处被笼统叫成「南瓜」。
 */
export const SET_ELEMENT_NAMES = Object.freeze({
  skull: '骷髅',
  ghost: '幽灵',
  eye: '眼睛',
  candle: '蜡烛',
  hand: '手',
  bone: '骨头',
});

export const SET_OPERATIONS = Object.freeze({
  intersect: {
    label: '交集',
    expression: 'A ∩ B',
    hint: '交集：门顶两边都写着的东西，放进 A∩B。',
    success: '门开了。同时属于 A 和 B 的，正好在中间。',
  },
  difference: {
    label: '差集',
    expression: 'A − B',
    hint: '差集：门顶只在 A 里出现、B 里没有的东西，放进 A−B。',
    success: '门开了。属于 A 不属于 B 的，站在 A−B 里。',
  },
  complement: {
    label: '补集',
    expression: 'Aᶜ',
    hint: '补集：门顶 A 里没有的东西，放进 A 加一横的那格。',
    success: '门开了。不在 A 里的，都站在 A 的外面。',
  },
});

export function getSetOperation(expr) {
  return SET_OPERATIONS[expr] ?? null;
}

/**
 * 接龙映射的答案表：B 里的每样东西，归到它在接龙里前面那一样的小台。
 *
 * chain 是 A 的顺序，每一段都是「这一样 → 后一样」，最后一样接回第一样：
 *   ['skull', 'ghost', 'candle'] 表示 骷髅 → 幽灵 → 蜡烛 → 骷髅。
 * 于是 B 里的幽灵归骷髅、蜡烛归幽灵、骷髅归蜡烛。
 * 返回值形如 { ghost: 'skull', candle: 'ghost', skull: 'candle' }。
 */
export function mappingTargets(chain) {
  const targets = Object.create(null);
  const size = chain?.length ?? 0;
  if (size < 2) return targets;
  for (let index = 0; index < size; index += 1) {
    targets[chain[(index + 1) % size]] = chain[index];
  }
  return targets;
}

/**
 * 这颗元素按自己的归属应该进哪一格/哪个小台。
 *   映射门：看它在接龙里的位置，归到前面那一样的小台（不读 membership，
 *           这样门楣上的接龙和地上的东西永远对得上）。
 *   两集合：membership 是 a / both / b / none。
 *   单集合：membership 是 a / both / notA。
 */
export function correctTrayId(element, gate) {
  if (!element) return null;
  if (gate.kind === 'mapping') {
    return gate.mappingTargets?.[element.look] ?? null;
  }
  const membership = element.membership;
  if (!gate.twoSets) {
    return membership === 'a' || membership === 'both' ? 'a' : 'notA';
  }
  if (membership === 'a' || membership === 'b' || membership === 'both') {
    return membership;
  }
  return 'none';
}

/**
 * 这颗元素现在实际在哪一格/哪个小台。
 * 只看中心点落在哪条地面格子里，并且脚底就踩在格子所在的面上：
 * 抱在手里、抛在空中、或叠在另一颗元素上的都不算。
 */
export function trayAt(element, gate) {
  if (!element || element.carrier || !element.onGround) return null;
  const cx = element.x + element.w / 2;
  const foot = element.y + element.h;
  const tray = gate.trays.find(
    (candidate) =>
      cx >= candidate.x &&
      cx <= candidate.x + candidate.w &&
      Math.abs(foot - candidate.y) <= 2,
  );
  return tray?.id ?? null;
}

/**
 * 一个萝卜一个坑：对的一颗落进这一格里空着的坑。
 * 落进去就看不见了，坑立刻盖上盖子，谁都能从上面走过去。
 * 同一格里的几颗从左到右填坑，一格放满了就把整格封住。
 */
function fillPit(element, tray, game) {
  const free = (tray.pits ?? []).filter((candidate) => !candidate.filled);
  if (!free.length) return false;
  // 落点在哪半边，就填最近的那个空坑。
  const cx = element.x + element.w / 2;
  const pit = free.reduce((best, candidate) =>
    Math.abs(candidate.x + candidate.w / 2 - cx) <
    Math.abs(best.x + best.w / 2 - cx)
      ? candidate
      : best,
  );

  const now = performance.now();
  pit.filled = true;
  pit.filledAt = now;
  pit.element = element;

  element.locked = true;
  element.inPit = true;
  element.pit = pit;
  element.sinkAt = now;
  element.vx = 0;
  element.vy = 0;
  element.onGround = true;
  // 落点已经在这一格里，这里只把它摆正到坑的中心。
  element.x = pit.x + (pit.w - element.w) / 2;
  element.y = pit.y - element.h;

  game.particles?.spawnSpark(element.x + element.w / 2, pit.y - 5, 6);
  game.audio?.answerRight?.();
  return true;
}

/**
 * 放错的一颗被坑弹出来：朝远离石门的方向弹回地面，玩家可以再捡起来重放。
 * 冷却的一小段时间里它不会被同一个坑连着弹，免得在原地抖。
 */
function rejectElement(element, gate, game) {
  const dir = element.x + element.w / 2 < gate.centerX ? -1 : 1;
  element.vx = dir * 120;
  element.vy = -210;
  element.onGround = false;
  element.rejectT = 0.55;
  game.audio?.error?.();
  game.particles?.spawnDust(element.x + element.w / 2, element.y + element.h, dir, 3);
}

/**
 * 每帧检查每一座集合门。
 *
 * 每颗被门盯着的元素都会拿到一份 setMarks：
 *   want = 按归属应去的格子，have = 现在实际所在的格子，correct = 两者一致。
 * 渲染层用它让放对了的元素亮起来；标记本身不画在元素身上。
 * 地面每一格按「该进这一格的元素数」挖出同样多的坑：对的一颗落进空坑，
 * 坑盖上盖子、人可以直接走过去；错的一颗被弹出来。全部分对，石门下沉。
 * 只有玩家走到门附近，门才会开始下沉——这样门不会在远处自己先开。
 */
export function updateSetGates(game, dt = 0) {
  const gates = game.level?.setGates;
  if (!gates?.length) return;

  const pumpkins = game.pumpkins?.pumpkins ?? [];
  const player = game.player;

  for (const gate of gates) {
    if (gate.solved) continue;
    if (!gate.tag) continue;

    // 所有位置都已经对：让石门缓缓沉下去，沉完再撤碰撞。
    if (gate.sinking) {
      gate.sinkT += dt;
      if (gate.sinkT < (gate.sinkDuration ?? 2.4)) continue;
      gate.sinking = false;
      gate.solved = true;
      gate.open = true;
      game.level.endGateSink(gate);
      game.level.setGateOpen(gate, true);
      game.particles.spawnSpark(gate.centerX, gate.y - 8, 20);
      continue;
    }

    const operation = getSetOperation(gate.expr);
    const watched = pumpkins.filter((pumpkin) => pumpkin.tag === gate.tag);
    let placed = 0;

    for (const pumpkin of watched) {
      // 已经落进坑里的，不再重算，也算作放好了。
      if (pumpkin.inPit) {
        placed += 1;
        continue;
      }

      const want = correctTrayId(pumpkin, gate);
      const have = trayAt(pumpkin, gate);

      if (pumpkin.rejectT > 0) {
        // 刚被弹出来的一颗还在空中，等它落稳再接下一次。
        pumpkin.rejectT = Math.max(0, pumpkin.rejectT - dt);
      } else if (have) {
        const tray = gate.trays.find((candidate) => candidate.id === have);
        if (want === have && tray && fillPit(pumpkin, tray, game)) {
          placed += 1;
        } else {
          // 进错了格，或者这一格的坑已经满了：弹出去。
          rejectElement(pumpkin, gate, game);
          if (!gate.rejectHinted) {
            gate.rejectHinted = true;
            game.notify(
              gate.rejectHint ||
                '放错了。这一格不收它，东西会被坑弹出来。看看门楣上 A、B 的归属，再把它放回去。',
              4200,
            );
          }
        }
      }

      pumpkin.setMarks = {
        // 映射门的 membership 在建造关卡时由接龙算出，这里只作为调试信息。
        membership: pumpkin.membership ?? 'none',
        want,
        have,
        correct: Boolean(want && have === want),
        gateId: gate.id,
      };
    }

    gate.placed = placed;
    gate.total = watched.length;
    if (!watched.length || !player) continue;
    if (Math.abs(player.centerX - gate.centerX) > 300) continue;

    if (!gate.hinted) {
      gate.hinted = true;
      game.notify(gate.hint || operation?.hint || '按门上列出的集合分格。', 5200);
    }

    if (placed < watched.length) continue;

    game.level.beginGateSink(gate);
    // 石门开始往地里沉：一整块石头的摩擦声，比通过音更重。
    game.audio.stoneGate();
    game.notify(gate.success || operation?.success || '门开了。', 3600);
  }
}

/** 给面板用的进度。 */
export function getSetGateState(level) {
  const gates = level?.setGates ?? [];
  if (!gates.length) return null;
  return {
    solved: gates.filter((gate) => gate.solved).length,
    total: gates.length,
  };
}
