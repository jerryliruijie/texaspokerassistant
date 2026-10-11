export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
export type Page = 'hands' | 'rankings' | 'positions';
export type HandKind = 'pair' | 'suited' | 'offsuit';
export type Term = { zh: string; en: string; abbr?: string };
export type CardValue = { rank: string; suit: 's' | 'h' | 'd' | 'c' };

export const TERMS = {
  pair: { zh: '对子', en: 'Pocket pair' },
  suited: { zh: '同花', en: 'Suited' },
  offsuit: { zh: '非同花', en: 'Offsuit' },
  equity: { zh: '摊牌胜率', en: 'Showdown equity' },
  probability: { zh: '发到概率', en: 'Deal probability' },
  frequency: { zh: '平均间隔', en: 'Average frequency' },
  combinations: { zh: '花色组合', en: 'Combinations' },
} satisfies Record<string, Term>;

export function matrixHand(row: number, column: number): string {
  if (row === column) return RANKS[row] + RANKS[column];
  return row < column ? RANKS[row] + RANKS[column] + 's' : RANKS[column] + RANKS[row] + 'o';
}

export const HANDS = RANKS.flatMap((_, row) => RANKS.map((_, column) => matrixHand(row, column)));

export function handKind(hand: string): HandKind {
  return hand.endsWith('s') ? 'suited' : hand.endsWith('o') ? 'offsuit' : 'pair';
}

export function handStats(hand: string) {
  const kind = handKind(hand);
  const combinations = kind === 'pair' ? 6 : kind === 'suited' ? 4 : 12;
  return { kind, combinations, probability: combinations / 1326, frequency: 1326 / combinations };
}

export function exampleCards(hand: string): CardValue[] {
  return [{ rank: hand[0], suit: 's' }, { rank: hand[1], suit: handKind(hand) === 'suited' ? 's' : 'h' }];
}

export function parseCards(cards: string): CardValue[] {
  return cards.split(' ').map(card => ({ rank: card[0], suit: card[1] as CardValue['suit'] }));
}

export const EQUITY_BANDS = [
  { id: 'strong', zh: '远高', en: 'STRONG', label: '远高于平均', minRatio: 1.5, backgroundColor: '#dfc28c', color: '#282419' },
  { id: 'above', zh: '略高', en: 'ABOVE', label: '略高于平均', minRatio: 1.1, backgroundColor: '#866b43', color: '#fff0d5' },
  { id: 'average', zh: '接近', en: 'EVEN', label: '接近平均', minRatio: 0.9, backgroundColor: '#626e55', color: '#f0f2e7' },
  { id: 'below', zh: '低于', en: 'BELOW', label: '低于平均', minRatio: 0, backgroundColor: '#2d3b40', color: '#bacbd0' },
] as const;

export function equityBand(equity: number, players: number) {
  const ratio = equity * players;
  return EQUITY_BANDS.find(band => ratio >= band.minRatio) ?? EQUITY_BANDS[3];
}

export function cellColors(equity: number, players: number) {
  const { backgroundColor, color } = equityBand(equity, players);
  return { backgroundColor, color };
}

export function safePlayers(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 2 && value <= 8 ? value : 6;
}
