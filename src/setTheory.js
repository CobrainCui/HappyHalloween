/**
 * 追思小径第二、三段 · 集合庭院；糖纸街女巫房间沿用同一套规则，只留一道门。
 *
 * 阿岚在高原气象站值冬时读一本集合论笔记。她后来常说，集合论只问一件事：
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
 *   - 元素放对了会亮起来。全部分对，整扇石门缓缓沉进地里，门才真正打开。
 *   - 不写算式、不按键、不失败。门锁一次，之后一直开着。
 */

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
 * 每帧检查每一座集合门。
 *
 * 每颗被门盯着的元素都会拿到一份 setMarks：
 *   want = 按归属应去的格子，have = 现在实际所在的格子，correct = 两者一致。
 * 渲染层用它让放对了的元素亮起来；标记本身不画在元素身上。
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
      const want = correctTrayId(pumpkin, gate);
      const have = trayAt(pumpkin, gate);
      const correct = want !== null && have === want;
      if (correct) placed += 1;
      pumpkin.setMarks = {
        // 映射门的 membership 在建造关卡时由接龙算出，这里只作为调试信息。
        membership: pumpkin.membership ?? 'none',
        want,
        have,
        correct,
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
    game.audio.checkpoint();
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
