import { RANKS, type CardValue } from './poker';
import type { DrawGoal, DrawScenario, DrawStage } from '../data/draws';

export const DECK: CardValue[] = RANKS.flatMap(rank => (['s', 'h', 'd', 'c'] as const).map(suit => ({ rank, suit })));
export const cardCode = (card: CardValue) => card.rank + card.suit;
const rankValue = (rank: string) => '23456789TJQKA'.indexOf(rank) + 2;
export const chooseTwo = (n: number) => n * (n - 1) / 2;
export function remainingCards(known: CardValue[]) {
  const seen = new Set(known.map(cardCode));
  if (seen.size !== known.length || known.some(card => !DECK.some(item => cardCode(item) === cardCode(card)))) throw new Error('Invalid or duplicate card');
  return DECK.filter(card => !seen.has(cardCode(card)));
}
export function hasFlush(cards: CardValue[]) {
  return ['s', 'h', 'd', 'c'].some(suit => cards.filter(card => card.suit === suit).length >= 5);
}
export function hasStraight(cards: CardValue[]) {
  const values = new Set(cards.map(card => rankValue(card.rank)));
  if (values.has(14)) values.add(1);
  for (let top = 14; top >= 5; top--) if ([0, 1, 2, 3, 4].every(offset => values.has(top - offset))) return true;
  return false;
}
export function hasFullHouseOrQuads(cards: CardValue[]) {
  const counts = new Map<string, number>();
  for (const card of cards) counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  const sizes = [...counts.values()];
  return sizes.some(count => count >= 4) || [...counts].some(([rank, count]) => count >= 3 && [...counts].some(([other, size]) => other !== rank && size >= 2));
}
export function reachesGoal(cards: CardValue[], goal: DrawGoal) {
  return goal === 'flush' ? hasFlush(cards) : goal === 'straight' ? hasStraight(cards) : goal === 'combo' ? hasFlush(cards) || hasStraight(cards) : hasFullHouseOrQuads(cards);
}
export function bestFlush(cards: CardValue[]): CardValue[] {
  const candidates = ['s', 'h', 'd', 'c'].map(suit => {
    const suited = cards.filter(card => card.suit === suit).sort((a, b) => rankValue(b.rank) - rankValue(a.rank));
    for (let top = 14; top >= 5; top--) {
      const straight = [0, 1, 2, 3, 4].map(offset => suited.find(card => rankValue(card.rank) === (top - offset === 1 ? 14 : top - offset)));
      if (straight.every((card): card is CardValue => Boolean(card))) return straight;
    }
    return suited.slice(0, 5);
  }).filter(group => group.length === 5);
  return candidates.sort((a, b) => compareFlush(b, a))[0] ?? [];
}
export function compareFlush(left: CardValue[], right: CardValue[]) {
  if (left.length !== right.length) return left.length - right.length;
  const leftStraight = left.length === 5 && hasStraight(left);
  const rightStraight = right.length === 5 && hasStraight(right);
  if (leftStraight !== rightStraight) return leftStraight ? 1 : -1;
  if (leftStraight && rightStraight) return rankValue(left[0].rank) - rankValue(right[0].rank);
  for (let i = 0; i < left.length; i++) {
    const difference = rankValue(left[i].rank) - rankValue(right[i].rank);
    if (difference) return difference;
  }
  return 0;
}

export type OpponentStat = { label: string; hits: number; total: number; probability: number };
export type DrawStatistics = {
  made: boolean; probability: number | null; hits: number; total: number;
  outs: string[]; candidates: string[]; overlaps: string[]; risks: Record<string, string[]>;
  backdoor: boolean; setupProbability: number | null; bestFlush: string[];
  higherFlushCards: string[]; opponent: OpponentStat[];
};

function pairStatistic(deck: CardValue[], label: string, predicate: (cards: CardValue[]) => boolean): OpponentStat {
  let hits = 0;
  for (let i = 0; i < deck.length; i++) for (let j = i + 1; j < deck.length; j++) if (predicate([deck[i], deck[j]])) hits++;
  const total = chooseTwo(deck.length);
  return { label, hits, total, probability: hits / total };
}

export function calculateDrawStatistics(scenario: DrawScenario, stage: DrawStage): DrawStatistics {
  if ((stage === 'turn-river' ? 4 : 3) !== scenario.board.length) throw new Error('Stage and board do not match');
  const known = [...scenario.hand, ...scenario.board];
  const available = remainingCards(known);
  const made = reachesGoal(known, scenario.goal);
  const outs = made ? [] : available.filter(card => reachesGoal([...known, card], scenario.goal));
  const suitedCount = known.filter(card => card.suit === 'h').length;
  const backdoor = scenario.goal === 'flush' && suitedCount === 3 && scenario.board.length === 3;
  const candidates = backdoor ? available.filter(card => card.suit === 'h') : [];
  const overlaps = scenario.goal === 'combo' ? outs.filter(card => hasStraight([...known, card]) && hasFlush([...known, card])) : [];
  const risks: Record<string, string[]> = {};
  for (const card of outs) {
    const board = [...scenario.board, card];
    const tags: string[] = [];
    if (hasFlush([...known, card]) && scenario.board.some(item => item.rank === card.rank)) tags.push('board-pair');
    if (hasStraight([...known, card]) && ['s', 'h', 'd', 'c'].some(suit => board.filter(item => item.suit === suit).length >= 3)) tags.push('flush-board');
    if (tags.length) risks[cardCode(card)] = tags;
  }
  let hits = 0, total = 0;
  if (!made) {
    if (stage === 'flop-river') {
      for (let i = 0; i < available.length; i++) for (let j = i + 1; j < available.length; j++) {
        total++;
        if (reachesGoal([...known, available[i], available[j]], scenario.goal)) hits++;
      }
    } else { total = available.length; hits = outs.length; }
  }
  const heroFlush = bestFlush(known);
  const heroHigh = Math.max(...scenario.hand.filter(card => card.suit === 'h').map(card => rankValue(card.rank)), 0);
  const higherFlushCards = scenario.goal === 'flush' || scenario.goal === 'combo' ? available.filter(card => card.suit === 'h' && rankValue(card.rank) > heroHigh) : [];
  const preflop = remainingCards(scenario.hand);
  const flushGoal = scenario.goal === 'flush' || scenario.goal === 'combo';
  const before = pairStatistic(preflop, flushGoal ? '翻前 · 双张红桃' : '翻前 · 任意对子', pair => flushGoal ? pair.every(card => card.suit === 'h') : pair[0].rank === pair[1].rank);
  const boardHearts = scenario.board.filter(card => card.suit === 'h').length;
  const current = flushGoal ? (
    heroFlush.length ? pairStatistic(available, '当前 · 更大同花', pair => compareFlush(bestFlush([...scenario.board, ...pair]), heroFlush) > 0) :
    boardHearts >= 3 ? pairStatistic(available, '当前 · 已成同花', pair => hasFlush([...scenario.board, ...pair])) :
    pairStatistic(available, '当前 · 持有红桃', pair => pair.some(card => card.suit === 'h'))
  ) : pairStatistic(available, '当前 · 听花或成花', pair => [...scenario.board, ...pair].filter(card => card.suit === 'h').length >= 4);
  return {
    made, probability: made ? null : hits / total, hits, total,
    outs: outs.map(cardCode), candidates: candidates.map(cardCode), overlaps: overlaps.map(cardCode), risks,
    backdoor, setupProbability: backdoor ? candidates.length / available.length : null,
    bestFlush: heroFlush.map(cardCode), higherFlushCards: higherFlushCards.map(cardCode), opponent: [before, current],
  };
}
