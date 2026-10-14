import { parseCards, type CardValue } from '../lib/poker';

export const DRAW_STAGES = [
  { id: 'flop-turn', zh: '翻牌 → 转牌', en: 'Flop → Turn' },
  { id: 'flop-river', zh: '翻牌 → 河牌', en: 'Flop → River' },
  { id: 'turn-river', zh: '转牌 → 河牌', en: 'Turn → River' },
] as const;
export type DrawStage = typeof DRAW_STAGES[number]['id'];
export type DrawGoal = 'flush' | 'straight' | 'combo' | 'full-house';
export type DrawOptions = { holeCards: 1 | 2; quality: 'nut' | 'low'; flopSuitCount: number; turnSuitCount: number };
export type DrawScenario = { id: string; hand: CardValue[]; board: CardValue[]; goal: DrawGoal };

export const DRAWS = [
  { id: 'flush', zh: '同花听牌', en: 'Flush Draw' },
  { id: 'backdoor', zh: '后门同花', en: 'Backdoor Flush Draw' },
  { id: 'open-ended', zh: '两头顺', en: 'Open-ended Straight Draw' },
  { id: 'gutshot', zh: '卡顺', en: 'Gutshot Straight Draw' },
  { id: 'double-gutshot', zh: '双卡顺', en: 'Double Gutshot' },
  { id: 'combo', zh: '同花＋两头顺', en: 'Combo Draw' },
  { id: 'set', zh: '三条补葫芦／四条', en: 'Set → Full House / Quads' },
] as const;
export type DrawId = typeof DRAWS[number]['id'];

export function defaultDrawOptions(id: DrawId): DrawOptions {
  return { holeCards: id === 'backdoor' ? 1 : 2, quality: 'nut', flopSuitCount: 2, turnSuitCount: id === 'backdoor' ? 3 : 2 };
}

const FIXED = {
  'open-ended': { hand: 'Js Ts', flop: 'Kh Qh 2c', turn: '4h', goal: 'straight' },
  gutshot: { hand: 'Js 9s', flop: 'Kh Qh 2c', turn: '4h', goal: 'straight' },
  'double-gutshot': { hand: 'Js 9d', flop: 'Kh Th 7c', turn: '2c', goal: 'straight' },
  combo: { hand: '8h 7h', flop: 'Kh 6h 5c', turn: '2d', goal: 'combo' },
  set: { hand: '7s 7d', flop: 'Kh 7h 2c', turn: 'Qd', goal: 'full-house' },
} satisfies Record<string, { hand: string; flop: string; turn: string; goal: DrawGoal }>;

export function getDrawScenario(id: DrawId, stage: DrawStage, options = defaultDrawOptions(id)): DrawScenario {
  const turn = stage === 'turn-river';
  if (id !== 'flush' && id !== 'backdoor') {
    const example = FIXED[id];
    return { id: `${id}-${turn ? 'turn' : 'flop'}`, hand: parseCards(example.hand), board: parseCards(example.flop + (turn ? ` ${example.turn}` : '')), goal: example.goal };
  }
  const { holeCards, quality } = options;
  const count = turn ? options.turnSuitCount : options.flopSuitCount;
  const minimum = holeCards === 1 ? 2 : 1;
  if (count < minimum || count > (turn ? 4 : 3)) throw new RangeError('Invalid board suit count');
  const hand = parseCards(quality === 'nut' ? (holeCards === 1 ? 'Ah Qc' : 'Ah Qh') : (holeCards === 1 ? '8h Qc' : '8h 7h'));
  const hearts = parseCards('Kh Jh 6h 3h');
  const other = parseCards('5c 2d Tc');
  const flopCount = turn ? Math.min(count, count === 4 ? 3 : 2) : count;
  const board = [...hearts.slice(0, flopCount), ...other.slice(0, 3 - flopCount)];
  if (turn) board.push(count > flopCount ? hearts[flopCount] : other[3 - flopCount]);
  return { id: `flush-${holeCards}-${quality}-${turn ? 'turn' : 'flop'}-${count}`, hand, board, goal: 'flush' };
}

export const DRAW_SCENARIOS: DrawScenario[] = [];
for (const holeCards of [1, 2] as const) for (const quality of ['nut', 'low'] as const) {
  for (const stage of ['flop-turn', 'turn-river'] as const) {
    for (let count = holeCards === 1 ? 2 : 1; count <= (stage === 'turn-river' ? 4 : 3); count++) {
      DRAW_SCENARIOS.push(getDrawScenario('flush', stage, { holeCards, quality, flopSuitCount: count, turnSuitCount: count }));
    }
  }
}
for (const id of ['open-ended', 'gutshot', 'double-gutshot', 'combo', 'set'] as const) {
  DRAW_SCENARIOS.push(getDrawScenario(id, 'flop-turn'), getDrawScenario(id, 'turn-river'));
}

export const DRAW_SOURCES = [
  { title: '补牌与危险补牌', url: 'https://www.pokerstars.com/poker/learn/lesson/calculating-outs/' },
  { title: '范围与翻前行动', url: 'https://www.pokerstars.com/poker/learn/strategies/how-to-think-about-hand-ranges-in-poker/' },
  { title: '三同花牌面', url: 'https://www.pokerstars.com/poker/learn/strategies/betting-smaller-on-three-flush-flops/' },
  { title: '坚果牌与阻断牌', url: 'https://www.pokerstars.com/poker/games/rules/hand-rankings/the-nuts-and-blockers/' },
];
