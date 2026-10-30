/**
 * 提示面板的内容。
 *
 * 每条线路（以及每一段、每一间房、每一课教程）都写一小串真正能过关的提示，
 * 按顺序陈列。玩家按 H 或点画面左上角的「提示」，就能在不离开这一局的情况下
 * 看到当前这一关该怎么走；提示只讲做法，不替玩家按任何键。
 */

import { getMemorialChapter, MEMORIAL_ROUTE } from './memorial.js';
import { getParadeChapter, getParadeTrack } from './parade.js';

/** 所有线路通用的快捷键。教程和提示面板都会完整列出。 */
export const CONTROL_KEYS = Object.freeze([
  '←  →  移动',
  '↑  跳跃（按住跳得更高）',
  '↓  下蹲 / 穿过木板 / 空中快速下落',
  'E  抱起 / 抛出身边的东西',
  'Q  摸装置 · 石鼓 / 铜球 / 南瓜车 / 糖门',
  'V  读路牌',
  'X  离开副本房间 / 掉头回街（按两下才走）',
  'Tab  背包 / 糖袋 / 百鬼名册',
  '空格  呼吸 / 第三段收紧影子线',
  'Esc / P  暂停',
  'R  重走这一段',
  'M  音效开关',
  'F  全屏',
  'H  提示',
]);

/** 手机上没有键盘：提示面板里换成画面上的虚拟按键。 */
export const CONTROL_KEYS_MOBILE = Object.freeze([
  '←  →  左手：左右移动',
  '↑  右手：跳跃（按住跳得更高）',
  '↓  右手：下蹲 / 下穿 / 空中快落',
  '互动  抱 / 抛 · 装置 · 路牌 · 敲门 · 呼吸 · 离开',
  '背包  骨头、衣橱和糖袋',
  '提示 / 暂停  底部中间',
]);

const TUTORIAL_STEP_HINTS = Object.freeze({
  move: '按住 ← 或 → 一直走。前面的光墙要等你走过这一段才会打开。',
  jump: '按 ↑ 跳。按住 ↑ 不放会跳得更高；跳过前面的石阶就能继续。',
  drop: '先跳上头顶的木板，站上去后按住 ↓，从木板穿下来。空中按 ↓ 落得更快。',
  collect: '走过地上的骨头，它们会自己收进背包。攒够头骨、肋骨、腿骨和左手骨就能拼出骷髅时装。',
  pumpkin: '用身体顶南瓜就能把它推走；靠近南瓜按 E 抱起，再按 E 抛出去。推和抛各做一次，门才开。',
  'pumpkin-stack': '把一颗南瓜推到高墙脚，再抱起另一颗按 E 抛到它头顶。等两颗叠稳，跳上去踩着翻过墙。',
  backpack: '按 Tab 打开背包：骨头、万圣节衣橱和糖袋都在里面，再按 Tab 或 Esc 关闭，前面的门才会消失。糖要去糖纸街的人家帮忙或捣蛋才有，在糖袋里点「吃一颗」或按数字键。',
  finish: '往右走到小径尽头的光门，教程就结束了。',
});

const MEMORIAL_HINTS = Object.freeze({
  1: [
    '沿墓园外墙一直往右走。尽头那堵高墙比人高，翻过去就是第一道门。',
    '南瓜能推、能抱、能叠：走过去用身体顶；靠近后按 E 抱起，再按 E 抛出。',
    '把一颗南瓜推到墙脚，抱起另一颗抛到它头顶，叠成两级台阶，再踩着翻过墙。',
    '强迫发作时，会想回去看看南瓜车锁没锁。走回南瓜车，按 Q 检查一下，计时就会停。',
    '路边有五块路牌，走近按 V，读一句 Sybil 的事；中文下面还有一行英文。',
    '旧床单在高墙顶上；高竖领和蒙眼布条在木板上方，先跳上木板，再普通跳一下就能够到。',
  ],
  2: [
    '两道石门都封到夜空，翻不过去。把地上的骷髅、幽灵、眼睛、骨头扔进门脚的坑里。',
    '每格按该进去的东西数挖好了坑，一个坑只收一颗。放对了坑会盖上盖子，人可以直接从上面走过去；放错了会被弹出来。',
    '第一道是交集：眼睛同时属于骷髅和幽灵，放「两边都有」的格子；骨头跟着骷髅，只放 A。',
    '第二道是接龙：骷髅→幽灵→蜡烛→骷髅。把 B 里的东西放到它前面那一样的小台下。',
    '心跳突然撞起来时按住空格呼吸，视野会慢慢打开；平复后有十几秒不会再发作。',
    '路边有五块路牌，走近按 V，读一句 Kurt 的事；中文下面还有一行英文。',
    '门后的矮台普通跳就能够到；燕尾披风在石门后的半空，要带着二段跳糖才拿得到。',
  ],
  3: [
    '你：W A S D；回音：方向键。两个人分开走，互动键也分开：你按 E，回音按 /。',
    '按住 S 或 ↓ 潜行，躲进墓碑的影子，绕开提灯人的灯光。',
    '两个人都走到门口才算过关。任何一个人被照到，两个人会一起退回影子记号。',
    '按住空格收紧影子线：站得稳的人当桩，可以把对方拉过来；跳上对方头顶也能叠高。',
  ],
  4: [
    '先在铜球旁按 Q 选电荷：负电被电子推开，正电被电子吸住。',
    '按库仑定律，离电子越近，力越大。裂隙就靠这一点跳过去；中间的小岛上可以再换一次电荷。',
    '被电子拉住、悬在半空时，按 Q 放掉电荷就会落下来。',
    '路越走越沉，走到旧灯跟前会短暂透亮。停住时按住方向键，一步一步也能挪出去。',
    '尖牙在起点上方；松开的布尾要弹簧糖，宽檐尖帽要飞天糖，黑猫布偶要冲刺糖。',
    '入口和碑前各有一块路牌，走近按 V 读；最后一道门后面就是老师的墓。',
  ],
});

const PARADE_HINTS = Object.freeze({
  1: [
    '目标：带科学怪人走到半山的第一座南瓜鸟居。',
    '你走多快，全队就走多快；你跳，所有同行者一起跳。',
    '走到石鼓前按 Q，请科学怪人跟上。',
    '科学怪人走得慢，但只有他的肩膀能撞塌裂石。',
  ],
  2: [
    '床单幽灵会被风托高，落到屋顶上。',
    '走到石鼓前按 Q 请她跟上；她轻，跳得高、落得慢。',
    '全队要一起到鸟居，别把她一个人留在屋檐上。',
  ],
  3: [
    '水里的沼泽怪游得快，能逆流上浮。',
    '贴着河床走更稳；废桥要潜水钻过去，气泡柱会把整队托回水面。',
    '水流会把不会游的脚冲回去，别在急流里停住。',
  ],
  4: [
    '蝙蝠在空中再按 ↑ 会二段跳；木乃伊每段替全队兜一次底。',
    '裂石只认科学怪人的肩膀，带他撞过去。',
    '池水不深，但别把队伍拆散。',
  ],
  5: [
    '骷髅兄弟凑齐后，全队跑得更快。',
    '狼人同行时，双击 ← / → 让全队冲刺；蝙蝠也在队里时，二段跳后还能在空中冲刺。',
    '墓园里的瘴气沟要整队一起跳过。',
  ],
  6: [
    '女巫在空中按住 ↑ 滑翔；黑猫贴墙再按 ↑，整队从墙上蹬出去。',
    '滑翔失手也不要紧，下层有一条备用长梯可以再上来。',
    '最后一扇是百鬼门：所有同行者都到齐，门才开。',
  ],
});

const PARADE_TRACK_HINTS = Object.freeze({
  easy: '简单赛道：碰到瘴气后全队回到落脚点，不用留下任何人。',
  normal: '普通赛道：每段更长、落脚点减半，水流更急，瘴气也更密。',
  hard: '困难赛道：每次碰到瘴气，都要从名册里留下一名同行者；他给队伍的加成也会跟着失效。提灯童子不能留下。',
});

const TRICK_STREET_HINTS = Object.freeze([
  '走近一扇门按 Q 敲门。可以「帮忙」做这一户的任务，也可以「捣蛋」抢糖跑后巷。',
  '帮忙：完成这一户的任务，拿它固定的一颗糖。',
  '捣蛋：抢了糖钻进后巷，一路往右跑到街尾的栅门；被追上糖会被拿回去。',
  '街尾的出口永远开着，没敲过的门可以留着以后再来。',
  '按 Tab 打开背包，糖袋在里面；拿到的糖可以带到任何一条夜路。',
  '女巫和男巫的门后是整间房；其余八户各是一道谜题或一次屋顶追月。',
]);

const WITCH_HINTS = Object.freeze([
  '门顶写着 A、B 各有什么。把地上每样东西扔进它归属的坑里：交集、只在 A、只在 B、两边都不在。',
  '眼睛和手两边都有；骨头跟着骷髅，只在 A 里；蜡烛两边都不在。',
  '六样东西都填进各自的坑，石门才会沉下去。放对的坑会盖上盖子，人可以直接从上面走过去；放错了会被弹出来。',
  '随时可以走回起点的后门，按两下 X 回糖纸街，这一户的糖留着下次再拿。',
]);

const WARLOCK_HINTS = Object.freeze([
  '铜球给电荷：负电被电子推开，正电被电子吸住。先选一种再往里走。',
  '速度选择器要看 HUD 的平衡速度：让速度向右，并和电场力抵消。',
  '右手骨放进骨槽可以让 B 对齐；两口熔岩井从左侧借力过去。',
  '走到地窖最深处的门就算完成；中途想走，回起点的后门按两下 X。',
]);

const RACE_HINTS = Object.freeze([
  '抢了糖就往右跑，别停。木箱和屋顶断口都能踩。',
  '在被追上之前跑到街尾的栅门；掉下去会从落脚点重来。',
  '糖浆滑道会加速，也可能把你甩出去——提前起跳。',
  '真要放弃，回到起点的后门按两下 X 掉头回街上。',
]);

const MERGED_HINTS = Object.freeze([
  '先在铜球旁选电荷：负电被电子推开，正电被电子吸住。',
  '速度选择器要让速度向右，并与场力平衡；看 HUD 上的平衡速度。',
  '熔岩井从左侧借力跳过，骨槽里放右手骨可以让 B 对齐。',
]);

/** 当前这一关的提示面板内容。任何线路、任何房间都能拿到一组能用的提示。 */
export function getHintContent(game) {
  const level = game?.level;
  const session = game?.session;
  if (!level) return null;

  const stage = level.stage ?? 1;
  const mode = game.mode;
  const themeName = level.theme?.name ?? '夜路';

  if (mode === 'tutorial') {
    const step = level.tutorialSteps?.[session?.tutorialStep ?? 0];
    const hints = step?.id
      ? [TUTORIAL_STEP_HINTS[step.id]].filter(Boolean)
      : [];
    if (!hints.length) hints.push('继续往右走到光门。');
    return {
      title: `新手教程 · ${themeName}`,
      stepLabel: `第 ${Math.min((session?.tutorialStep ?? 0) + 1, level.tutorialSteps?.length ?? 1)} 课`,
      objective: step?.text ?? level.objective,
      hints,
    };
  }

  if (mode === 'memorial') {
    const chapter = getMemorialChapter(stage);
    return {
      title: `给老师送南瓜派 · 第 ${stage}/${MEMORIAL_ROUTE.totalStages} 段`,
      stepLabel: chapter?.patient ? `${chapter.stageLabel} · ${chapter.patient}` : themeName,
      objective: chapter?.objective ?? level.objective,
      hints: MEMORIAL_HINTS[stage] ?? [],
    };
  }

  if (mode === 'parade') {
    const chapter = getParadeChapter(stage);
    const track = getParadeTrack(session?.paradeTrack);
    const hints = [...(PARADE_HINTS[stage] ?? [])];
    const trackHint = PARADE_TRACK_HINTS[track.id];
    if (trackHint) hints.push(trackHint);
    return {
      title: `魑魅魍魉 · 第 ${stage}/6 段`,
      stepLabel: chapter ? `${chapter.stageLabel} · ${chapter.name} · ${track.name}` : themeName,
      objective: chapter?.objective ?? level.objective,
      hints,
    };
  }

  if (mode === 'trick') {
    // 后巷竞速、两间整房，以及街面本身，各有各的提示。
    if (level.race) {
      return {
        title: 'Trick or Treat · 后巷追击',
        stepLabel: '抢了就跑',
        objective: '跑到街尾的栅门，别被身后的人追上',
        hints: [...RACE_HINTS],
      };
    }
    if (session?.trickRoom === 'witch' || level.id === 'trick-witch') {
      return {
        title: 'Trick or Treat · 莫尔的庭院',
        stepLabel: '集合庭院',
        objective: level.objective,
        hints: [...WITCH_HINTS],
      };
    }
    if (session?.trickRoom === 'warlock' || level.id === 'trick-warlock') {
      return {
        title: 'Trick or Treat · 奥兹的地窖',
        stepLabel: '电磁长夜',
        objective: level.objective,
        hints: [...WARLOCK_HINTS],
      };
    }
    return {
      title: `Trick or Treat · ${themeName}`,
      stepLabel: '糖纸街',
      objective: level.objective,
      hints: [...TRICK_STREET_HINTS],
    };
  }

  return {
    title: themeName,
    stepLabel: level.theme?.chapter ?? '',
    objective: level.objective,
    hints: [...MERGED_HINTS],
  };
}
