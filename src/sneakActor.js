/**
 * 第三段里「回音」的那一档外观。
 *
 * 回音不是另一个人，也不是小鬼：它就是另一个你。所以身体和主角共用
 * `player.js` 里的 drawPilgrim，连配色都不另开一套——帽子、南瓜头、
 * 斗篷和手里的灯全都是同一组像素、同一组颜色。只有三处不同：
 *
 *   1. 整个人是半透明的，站定、潜行、腾空各有不同的透明度；
 *   2. 头灯透出来的那圈光换成冷的，像被月光滤过；
 *   3. 它光着脚——皮鞋只有一双，穿在你脚上。
 *
 * 这样两个人并排站着就是「同一个人和他淡一点的倒影」；
 * 分开时靠暴露环、影子括角和影子线的颜色分谁是谁，不靠长相。
 */
export const ECHO_LOOK = Object.freeze({
  barefoot: true,
  // 头灯的光：同一盏灯，透过月光之后是冷的。
  glow: '192, 210, 255',
  glowScale: 1.35,
  /**
   * 回音的整体透明度：淡淡地明灭，像隔着一层雾；
   * 蹲低或缩进影子时再淡下去，腾空时稍微实一点。
   */
  alpha(player, time) {
    const breathe = Math.sin(time * 1.7 + player.x * 0.01) * 0.035;
    if (player.hidden) return 0.5 + breathe;
    if (player.crouching) return 0.58 + breathe;
    if (!player.onGround) return 0.78 + breathe;
    return 0.72 + breathe;
  },
});
