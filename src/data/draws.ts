import { parseCards, type CardValue } from '../lib/poker';

export const DRAW_STAGES = [
  { id: 'flop-turn', zh: '翻牌 → 转牌', en: 'Flop → Turn' },
  { id: 'flop-river', zh: '翻牌 → 河牌', en: 'Flop → River' },
  { id: 'turn-river', zh: '转牌 → 河牌', en: 'Turn → River' },
] as const;

export type DrawStage = typeof DRAW_STAGES[number]['id'];
export type Draw = {
  id: string; zh: string; en: string; hand: CardValue[]; flop: CardValue[];
  turn: CardValue; outs: CardValue[]; overlaps?: CardValue[]; completion: string;
};

export const DRAWS: Draw[] = [
  {
    id: 'flush', zh: '同花听牌', en: 'Flush Draw',
    hand: parseCards('Ah Qh'), flop: parseCards('Jh 7h 3c'), turn: parseCards('2d')[0],
    outs: parseCards('Kh Th 9h 8h 6h 5h 4h 3h 2h'), completion: '任意一张红桃补成同花。',
  },
  {
    id: 'open-ended', zh: '两头顺', en: 'Open-ended Straight Draw',
    hand: parseCards('Js Ts'), flop: parseCards('Kd Qh 2c'), turn: parseCards('4d')[0],
    outs: parseCards('As Ah Ad Ac 9s 9h 9d 9c'), completion: '任意一张 A 或 9 补成顺子。',
  },
  {
    id: 'gutshot', zh: '卡顺', en: 'Gutshot Straight Draw',
    hand: parseCards('Js 9s'), flop: parseCards('Kd Qh 2c'), turn: parseCards('4d')[0],
    outs: parseCards('Ts Th Td Tc'), completion: '任意一张 10 补成顺子。',
  },
  {
    id: 'combo', zh: '同花＋两头顺', en: 'Combo Draw',
    hand: parseCards('8h 7h'), flop: parseCards('Kh 6h 5c'), turn: parseCards('2d')[0],
    outs: parseCards('Ah Qh Jh Th 9h 5h 4h 3h 2h 9s 9d 9c 4s 4d 4c'),
    overlaps: parseCards('9h 4h'), completion: '红桃补成同花，4 或 9 补成顺子。',
  },
];

// Hit at least one of the fixed, distinct outs among unseen cards.
export function drawProbability(outs: number, stage: DrawStage): number {
  const unseen = stage === 'turn-river' ? 46 : 47;
  if (!Number.isInteger(outs) || outs < 0 || outs > unseen) throw new RangeError('Invalid outs');
  if (stage !== 'flop-river') return outs / unseen;
  return 1 - (unseen - outs) * (unseen - outs - 1) / (unseen * (unseen - 1));
}
