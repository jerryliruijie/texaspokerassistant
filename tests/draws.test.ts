import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DRAWS, drawProbability } from '../src/data/draws';
import { RANKS, type CardValue } from '../src/lib/poker';

const deck: CardValue[] = RANKS.flatMap(rank => (['s', 'h', 'd', 'c'] as const).map(suit => ({ rank, suit })));
const key = (card: CardValue) => card.rank + card.suit;
function completes(cards: CardValue[], kind: 'flush' | 'straight') {
  if (kind === 'flush') return ['s', 'h', 'd', 'c'].some(suit => cards.filter(card => card.suit === suit).length >= 5);
  const ranks = new Set(cards.map(card => '23456789TJQKA'.indexOf(card.rank) + 2));
  if (ranks.has(14)) ranks.add(1);
  return Array.from({ length: 10 }, (_, i) => i + 1).some(low => [0, 1, 2, 3, 4].every(offset => ranks.has(low + offset)));
}

test('every illustrated out is distinct, unseen, and exactly completes its stated draw on either street', () => {
  for (const draw of DRAWS) {
    for (const board of [draw.flop, [...draw.flop, draw.turn]]) {
      const known = [...draw.hand, ...board];
      const knownKeys = new Set(known.map(key));
      assert.equal(knownKeys.size, known.length);
      const actual = deck.filter(card => !knownKeys.has(key(card))).filter(card => {
        const cards = [...known, card];
        return draw.id === 'combo' ? completes(cards, 'flush') || completes(cards, 'straight') : completes(cards, draw.id === 'flush' ? 'flush' : 'straight');
      });
      assert.deepEqual(actual.map(key).sort(), draw.outs.map(key).sort(), draw.id);
      assert.equal(new Set(draw.outs.map(key)).size, draw.outs.length);
    }
    if (draw.overlaps) {
      const both = draw.outs.filter(card => completes([...draw.hand, ...draw.flop, card], 'flush') && completes([...draw.hand, ...draw.flop, card], 'straight'));
      assert.deepEqual(both.map(key).sort(), draw.overlaps.map(key).sort());
      assert.equal(draw.outs.length, 9 + 8 - draw.overlaps.length);
    }
  }
});

test('two-card hit probabilities match independent enumeration of all 1,081 runouts', () => {
  for (const draw of DRAWS) {
    const known = new Set([...draw.hand, ...draw.flop].map(key));
    const remaining = deck.filter(card => !known.has(key(card)));
    const outs = new Set(draw.outs.map(key));
    let hits = 0, total = 0;
    for (let i = 0; i < remaining.length; i++) for (let j = i + 1; j < remaining.length; j++) {
      total++;
      if (outs.has(key(remaining[i])) || outs.has(key(remaining[j]))) hits++;
    }
    assert.equal(total, 1081);
    assert.ok(Math.abs(drawProbability(draw.outs.length, 'flop-river') - hits / total) < 1e-12);
  }
});

test('standard percentages, street denominators, and probability bounds', () => {
  assert.equal((drawProbability(9, 'flop-turn') * 100).toFixed(1), '19.1');
  assert.equal((drawProbability(9, 'flop-river') * 100).toFixed(1), '35.0');
  assert.equal((drawProbability(9, 'turn-river') * 100).toFixed(1), '19.6');
  assert.equal((drawProbability(8, 'flop-river') * 100).toFixed(1), '31.5');
  assert.equal((drawProbability(4, 'flop-river') * 100).toFixed(1), '16.5');
  assert.equal((drawProbability(15, 'flop-river') * 100).toFixed(1), '54.1');
  assert.equal(drawProbability(0, 'flop-river'), 0);
  assert.equal(drawProbability(47, 'flop-river'), 1);
  assert.throws(() => drawProbability(-1, 'flop-turn'), RangeError);
});
