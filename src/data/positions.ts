import type { Term } from '../lib/poker';

export type PositionId = 'BTN' | 'SB' | 'BB' | 'UTG' | 'UTG+1' | 'LJ' | 'HJ' | 'CO' | 'BTN/SB';
export type Seat = { id: PositionId; alias?: PositionId };
export const POSITION_TERMS: Record<PositionId, Term & { description: string }> = {
  BTN: { zh: '按钮位', en: 'Button', abbr: 'BTN', description: '庄家按钮所在的位置。三人及以上牌桌中，按钮、小盲、大盲依次顺时针排列。翻后在其余玩家之后行动。' },
  SB: { zh: '小盲位', en: 'Small Blind', abbr: 'SB', description: '按钮顺时针下一位，发牌前投入小盲注。通常为大盲的一半；翻后在所有未弃牌玩家中最先行动。' },
  BB: { zh: '大盲位', en: 'Big Blind', abbr: 'BB', description: '小盲顺时针下一位，发牌前投入大盲注。翻前首轮最后行动；有人加注时，后续行动可能再次回到前面的玩家。' },
  UTG: { zh: '枪口位', en: 'Under the Gun', abbr: 'UTG', description: '四人及以上牌桌中，大盲顺时针下一位，是翻前首位自愿行动的玩家。短桌中也可能同时称为 CO、HJ 或 LJ。' },
  'UTG+1': { zh: '枪口后一位', en: 'Under the Gun +1', abbr: 'UTG+1', description: '枪口位顺时针下一位，翻前第二个行动。七人桌中，这个座位也称为前劫位 LJ。' },
  LJ: { zh: '前劫位', en: 'Lojack', abbr: 'LJ', description: '按钮前第三个座位。八人桌中位于 UTG+1 之后、HJ 之前；六人桌中与枪口位重合。' },
  HJ: { zh: '劫位', en: 'Hijack', abbr: 'HJ', description: '按钮前第二个座位，位于 CO 之前。五人桌中与枪口位重合。' },
  CO: { zh: '关煞位', en: 'Cutoff', abbr: 'CO', description: '按钮前一个座位。翻后通常较晚行动；四人桌中与枪口位重合。' },
  'BTN/SB': { zh: '按钮位 · 小盲位', en: 'Button / Small Blind', abbr: 'BTN/SB', description: '双人桌中，按钮同时投入小盲注。翻前先行动，翻后后行动；另一名玩家为大盲位。' },
};

export const SEATS: Record<number, Seat[]> = {
  2: [{ id: 'BTN/SB' }, { id: 'BB' }],
  3: [{ id: 'BTN' }, { id: 'SB' }, { id: 'BB' }],
  4: [{ id: 'BTN' }, { id: 'SB' }, { id: 'BB' }, { id: 'UTG', alias: 'CO' }],
  5: [{ id: 'BTN' }, { id: 'SB' }, { id: 'BB' }, { id: 'UTG', alias: 'HJ' }, { id: 'CO' }],
  6: [{ id: 'BTN' }, { id: 'SB' }, { id: 'BB' }, { id: 'UTG', alias: 'LJ' }, { id: 'HJ' }, { id: 'CO' }],
  7: [{ id: 'BTN' }, { id: 'SB' }, { id: 'BB' }, { id: 'UTG' }, { id: 'UTG+1', alias: 'LJ' }, { id: 'HJ' }, { id: 'CO' }],
  8: [{ id: 'BTN' }, { id: 'SB' }, { id: 'BB' }, { id: 'UTG' }, { id: 'UTG+1' }, { id: 'LJ' }, { id: 'HJ' }, { id: 'CO' }],
};

export type Street = 'preflop' | 'postflop';
export function actionOrder(players: number, street: Street): PositionId[] {
  const seats = SEATS[players];
  if (!seats) return [];
  const first = players === 2 ? (street === 'preflop' ? 0 : 1) : street === 'preflop' ? 3 % players : 1;
  return [...seats.slice(first), ...seats.slice(0, first)].map(seat => seat.id);
}

export function relativePosition(players: number, seat: Seat): string {
  const index = SEATS[players].findIndex(item => item.id === seat.id);
  if (index === 0) return players === 2 ? '按钮与小盲合一' : '庄家按钮所在位置';
  return `按钮顺时针第 ${index} 位`;
}
