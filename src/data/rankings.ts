import { parseCards, type Term } from '../lib/poker';

export type Ranking = Term & { id: string; cards: ReturnType<typeof parseCards>; description: string; comparison: string; example: string };

export const RANKINGS: Ranking[] = [
  { id: 'royal-flush', zh: '皇家同花顺', en: 'Royal Flush', cards: parseCards('As Ks Qs Js Ts'), description: '同一花色的 A、K、Q、J、10。', comparison: '最高牌型，也是 A 高同花顺。花色不分大小；若公共牌构成皇家同花顺，所有未弃牌玩家平分底池。', example: 'A♠ K♠ Q♠ J♠ 10♠ 是皇家同花顺。' },
  { id: 'straight-flush', zh: '同花顺', en: 'Straight Flush', cards: parseCards('9h 8h 7h 6h 5h'), description: '同一花色、连续点数的五张牌。', comparison: '比较顺子顶张的点数。A 可用于 A2345，此时视为 5 高；不能组成 QKA23 这样的环绕顺子。', example: '9 高同花顺胜过 8 高同花顺。' },
  { id: 'four-of-a-kind', zh: '四条', en: 'Four of a Kind', cards: parseCards('Ks Kh Kd Kc As'), description: '四张相同点数，加一张踢脚牌。', comparison: '先比较四条的点数，相同时比较剩余一张踢脚牌（Kicker）。', example: 'K K K K A 胜过 K K K K Q。' },
  { id: 'full-house', zh: '葫芦', en: 'Full House', cards: parseCards('Qs Qh Qd 8s 8h'), description: '三张相同点数，加一组对子。', comparison: '先比较三条，再比较对子。即使对子较小，三条点数更大的葫芦仍然更强。', example: 'Q Q Q 2 2 胜过 J J J A A。' },
  { id: 'flush', zh: '同花', en: 'Flush', cards: parseCards('Ad Jd 8d 6d 3d'), description: '同一花色的五张牌，点数不连续。', comparison: '从最高张开始逐张比较，直至分出大小。花色本身没有强弱之分。', example: 'A J 8 6 3 同花胜过 A 10 9 7 4 同花。' },
  { id: 'straight', zh: '顺子', en: 'Straight', cards: parseCards('Ts 9h 8c 7d 6s'), description: '连续点数的五张牌，花色不全相同。', comparison: '只比较顺子顶张，其他牌不作为踢脚牌。A K Q J 10 最大；A 2 3 4 5 最小。', example: '10 高顺子胜过 9 高顺子。' },
  { id: 'three-of-a-kind', zh: '三条', en: 'Three of a Kind', cards: parseCards('8s 8h 8d Ac Qs'), description: '三张相同点数，加两张不同点数。', comparison: '先比较三条点数，相同时依次比较两张踢脚牌。手中对子形成的三条称为 Set，另有 Trips 的用法。', example: '8 8 8 A Q 胜过 8 8 8 A J。' },
  { id: 'two-pair', zh: '两对', en: 'Two Pair', cards: parseCards('Js Jh 6d 6c As'), description: '两组不同点数的对子，加一张踢脚牌。', comparison: '依次比较较大的对子、较小的对子、踢脚牌。七张牌中有三对时，只取最大的两对和最佳踢脚牌。', example: 'J J 6 6 A 胜过 J J 5 5 A。' },
  { id: 'one-pair', zh: '一对', en: 'One Pair', cards: parseCards('As Ah Kd 9c 5s'), description: '两张相同点数，加三张不同点数。', comparison: '先比较对子点数，再从大到小逐张比较三张踢脚牌。', example: 'A A K 9 5 胜过 A A Q J 10。' },
  { id: 'high-card', zh: '高张', en: 'High Card', cards: parseCards('As Jh 8d 6c 3s'), description: '没有组成以上牌型的五张牌。', comparison: '从最高张开始依次比较五张牌。五张点数全部相同时平局，不用第六张或第七张决定胜负。', example: 'A J 8 6 3 胜过 A 10 9 7 4。' },
];
