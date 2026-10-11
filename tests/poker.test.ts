import assert from 'node:assert/strict';
import { test } from 'node:test';
import equityData from '../src/data/equity.json';
import { RANKINGS } from '../src/data/rankings';
import { actionOrder, POSITION_TERMS, SEATS } from '../src/data/positions';
import { exampleCards, HANDS, handStats, matrixHand, safePlayers, type CardValue } from '../src/lib/poker';

test('169 unique classes cover exactly 1,326 equally likely combinations', () => {
  assert.equal(HANDS.length, 169);
  assert.equal(new Set(HANDS).size, 169);
  const counts = { pair: 0, suited: 0, offsuit: 0 };
  let combos = 0, probability = 0;
  for (const hand of HANDS) {
    const stats = handStats(hand);
    counts[stats.kind]++;
    combos += stats.combinations;
    probability += stats.probability;
    assert.equal(new Set(exampleCards(hand).map(card => card.rank + card.suit)).size, 2);
  }
  assert.deepEqual(counts, { pair: 13, suited: 78, offsuit: 78 });
  assert.equal(combos, 1326);
  assert.ok(Math.abs(probability - 1) < 1e-12);
});

test('matrix diagonal and triangles use conventional notation', () => {
  assert.equal(matrixHand(0, 0), 'AA');
  assert.equal(matrixHand(0, 1), 'AKs');
  assert.equal(matrixHand(1, 0), 'AKo');
  assert.equal(matrixHand(12, 12), '22');
  assert.equal(matrixHand(12, 7), '72o');
});

test('AA, AKs, AKo probabilities and expected waiting times', () => {
  for (const [hand, combinations, frequency] of [['AA', 6, 221], ['AKs', 4, 331.5], ['AKo', 12, 110.5]] as const) {
    const stats = handStats(hand);
    assert.equal(stats.combinations, combinations);
    assert.equal(stats.frequency, frequency);
    assert.equal(stats.probability, combinations / 1326);
  }
  assert.equal((handStats('AA').probability * 100).toFixed(3), '0.452');
  assert.equal((handStats('AKs').probability * 100).toFixed(3), '0.302');
  assert.equal((handStats('AKo').probability * 100).toFixed(3), '0.905');
});

test('all 1,183 equity values have provenance, sufficient samples and valid bounds', () => {
  assert.equal(equityData.meta.engine, 'HenryRLee/PokerHandEvaluator');
  assert.ok(equityData.meta.samplesPerHand >= 200_000);
  assert.equal(equityData.meta.seed, 20261011);
  assert.equal(Object.keys(equityData.hands).length, 169);
  const equities: Record<string, number[]> = equityData.hands;
  for (const hand of HANDS) {
    const values = equities[hand];
    assert.equal(values.length, 7, hand);
    values.forEach((value, index) => {
      assert.ok(Number.isFinite(value) && value >= 0 && value <= 1, hand);
      if (index) assert.ok(value <= values[index - 1], `${hand}: equity cannot increase with more random opponents on shared samples`);
    });
  }
});

test('combination-weighted equity matches symmetry: 1 / table size', () => {
  const equities: Record<string, number[]> = equityData.hands;
  for (let players = 2; players <= 8; players++) {
    const weighted = HANDS.reduce((sum, hand) => sum + handStats(hand).probability * equities[hand][players - 2], 0);
    assert.ok(Math.abs(weighted - 1 / players) < 0.002, `${players}: ${weighted}`);
    assert.ok(equities.AA[players - 2] > equities['72o'][players - 2]);
  }
  assert.ok(equities.AA[0] > .845 && equities.AA[0] < .86);
});

test('every 2–8 player table has unique seats, aliases and complete bilingual terms', () => {
  for (let players = 2; players <= 8; players++) {
    assert.equal(SEATS[players].length, players);
    assert.equal(new Set(SEATS[players].map(seat => seat.id)).size, players);
    for (const seat of SEATS[players]) {
      assert.ok(POSITION_TERMS[seat.id].zh && POSITION_TERMS[seat.id].en);
      if (seat.alias) assert.ok(POSITION_TERMS[seat.alias]);
    }
    for (const street of ['preflop', 'postflop'] as const) {
      const order = actionOrder(players, street);
      assert.equal(order.length, players);
      assert.equal(new Set(order).size, players);
    }
  }
  assert.equal(SEATS[4][3].alias, 'CO');
  assert.equal(SEATS[5][3].alias, 'HJ');
  assert.equal(SEATS[6][3].alias, 'LJ');
  assert.equal(SEATS[7][4].alias, 'LJ');
});

test('heads-up and three-handed action-order exceptions', () => {
  assert.deepEqual(actionOrder(2, 'preflop'), ['BTN/SB', 'BB']);
  assert.deepEqual(actionOrder(2, 'postflop'), ['BB', 'BTN/SB']);
  assert.deepEqual(actionOrder(3, 'preflop'), ['BTN', 'SB', 'BB']);
  assert.deepEqual(actionOrder(3, 'postflop'), ['SB', 'BB', 'BTN']);
});

test('4–8 handed preflop starts after BB, postflop starts at SB', () => {
  for (let players = 4; players <= 8; players++) {
    assert.equal(actionOrder(players, 'preflop')[0], 'UTG');
    assert.equal(actionOrder(players, 'preflop').at(-1), 'BB');
    assert.equal(actionOrder(players, 'postflop')[0], 'SB');
    assert.equal(actionOrder(players, 'postflop').at(-1), 'BTN');
  }
});

// Independent, test-only five-card classifier validates the illustrated examples.
function classify(cards: CardValue[]) {
  const values = cards.map(card => '23456789TJQKA'.indexOf(card.rank) + 2).sort((a, b) => b - a);
  const groups = [...new Set(values)].map(value => values.filter(v => v === value).length).sort((a, b) => b - a);
  const flush = new Set(cards.map(card => card.suit)).size === 1;
  const straight = groups.length === 5 && (values[0] - values[4] === 4 || values.join(',') === '14,5,4,3,2');
  if (flush && straight) return values[0] === 14 && values[1] === 13 ? 'royal-flush' : 'straight-flush';
  if (groups[0] === 4) return 'four-of-a-kind';
  if (groups[0] === 3 && groups[1] === 2) return 'full-house';
  if (flush) return 'flush';
  if (straight) return 'straight';
  if (groups[0] === 3) return 'three-of-a-kind';
  if (groups[0] === 2 && groups[1] === 2) return 'two-pair';
  return groups[0] === 2 ? 'one-pair' : 'high-card';
}

test('ten ranked illustrations contain distinct cards and match their advertised categories', () => {
  assert.equal(RANKINGS.length, 10);
  assert.deepEqual(RANKINGS.map(rank => rank.id), ['royal-flush', 'straight-flush', 'four-of-a-kind', 'full-house', 'flush', 'straight', 'three-of-a-kind', 'two-pair', 'one-pair', 'high-card']);
  for (const ranking of RANKINGS) {
    assert.equal(ranking.cards.length, 5);
    assert.equal(new Set(ranking.cards.map(card => card.rank + card.suit)).size, 5);
    assert.equal(classify(ranking.cards), ranking.id);
    assert.ok(ranking.en && ranking.zh && ranking.comparison && ranking.example);
  }
});

test('invalid persisted player counts safely default to 6', () => {
  for (const value of [null, undefined, '6', 0, 1, 9, 3.5, NaN]) assert.equal(safePlayers(value), 6);
  for (let players = 2; players <= 8; players++) assert.equal(safePlayers(players), players);
});
