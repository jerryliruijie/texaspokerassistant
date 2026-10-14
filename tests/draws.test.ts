import assert from 'node:assert/strict';
import { test } from 'node:test';
import generated from '../src/data/draw-statistics.json';
import { DRAWS, DRAW_SCENARIOS, getDrawScenario, type DrawOptions } from '../src/data/draws';
import { bestFlush, calculateDrawStatistics, cardCode, compareFlush, DECK, remainingCards, type DrawStatistics } from '../src/lib/draw-engine';
import { parseCards, type CardValue } from '../src/lib/poker';

const table: Record<string, DrawStatistics> = generated.scenarios;
const options = (holeCards: 1 | 2, count: number, quality: 'nut' | 'low' = 'nut'): DrawOptions => ({ holeCards, quality, flopSuitCount: count, turnSuitCount: count });
const percentage = (value: number | null) => value === null ? null : (value * 100).toFixed(1);

test('all seven drawing groups and every selectable scenario have generated exact statistics', () => {
  assert.equal(DRAWS.length, 7);
  assert.equal(new Set(DRAW_SCENARIOS.map(scenario => scenario.id)).size, DRAW_SCENARIOS.length);
  let entries = 0;
  for (const scenario of DRAW_SCENARIOS) {
    const known = [...scenario.hand, ...scenario.board];
    assert.equal(new Set(known.map(cardCode)).size, known.length);
    for (const stage of scenario.board.length === 3 ? ['flop-turn', 'flop-river'] as const : ['turn-river'] as const) {
      const stats = table[`${scenario.id}:${stage}`];
      entries++;
      assert.ok(stats, scenario.id);
      assert.ok(stats.probability === null || stats.probability >= 0 && stats.probability <= 1);
      assert.equal(new Set(stats.outs).size, stats.outs.length);
      assert.ok(stats.outs.every(code => !known.some(card => cardCode(card) === code)));
      assert.equal(stats.made, stats.probability === null);
      if (!stats.made) assert.equal(stats.total, stage === 'flop-river' ? 1081 : stage === 'flop-turn' ? 47 : 46);
      assert.equal(stats.opponent.length, 2);
      assert.equal(stats.opponent[0].total, 1225);
      assert.equal(stats.opponent[1].total, scenario.board.length === 3 ? 1081 : 1035);
    }
  }
  assert.equal(Object.keys(table).length, entries);
});

test('single-card flush cases: backdoor, normal draw, turn draw and already made', () => {
  const backdoor = getDrawScenario('flush', 'flop-river', options(1, 2));
  const stats = table[`${backdoor.id}:flop-river`];
  assert.equal(percentage(stats.probability), '4.2');
  assert.equal(stats.hits, 45); // choose 2 of 10 remaining hearts, not hit at least one.
  assert.equal(stats.backdoor, true);
  assert.equal(stats.outs.length, 0);
  assert.equal(stats.candidates.length, 10);
  assert.equal(percentage(stats.setupProbability), '21.3');
  assert.equal(table[`${backdoor.id}:flop-turn`].probability, 0);
  for (const [stage, count, expected] of [['flop-turn', 3, '19.1'], ['flop-river', 3, '35.0'], ['turn-river', 3, '19.6']] as const) {
    const scenario = getDrawScenario('flush', stage, options(1, count));
    assert.equal(percentage(table[`${scenario.id}:${stage}`].probability), expected);
  }
  const made = getDrawScenario('flush', 'turn-river', options(1, 4));
  const madeStats = table[`${made.id}:turn-river`];
  assert.equal(madeStats.made, true);
  assert.equal(madeStats.probability, null);
  assert.equal(madeStats.bestFlush.length, 5);
  const missed = getDrawScenario('backdoor', 'turn-river', options(1, 2));
  assert.equal(table[`${missed.id}:turn-river`].probability, 0);
});

test('two-card flush cases and straight/combination golden probabilities', () => {
  const backdoor = getDrawScenario('backdoor', 'flop-river', options(2, 1));
  assert.equal(percentage(table[`${backdoor.id}:flop-river`].probability), '4.2');
  for (const [id, expected, outs] of [['flush', '35.0', 9], ['open-ended', '31.5', 8], ['gutshot', '16.5', 4], ['double-gutshot', '31.5', 8], ['combo', '54.1', 15]] as const) {
    const scenario = getDrawScenario(id, 'flop-river');
    const stats = table[`${scenario.id}:flop-river`];
    assert.equal(percentage(stats.probability), expected, id);
    assert.equal(stats.outs.length, outs);
  }
  assert.deepEqual(table['combo-flop:flop-turn'].overlaps.sort(), ['4h', '9h']);
});

test('set redraw counts change from seven on the flop to ten on a blank turn', () => {
  assert.equal(table['set-flop:flop-turn'].outs.length, 7);
  assert.equal(table['set-turn:turn-river'].outs.length, 10);
  assert.equal(percentage(table['set-turn:turn-river'].probability), '21.7');
  // Both cards missing K, 2 and 7 can still make a full house if their ranks match.
  const fixedOutHits = 1 - 40 * 39 / (47 * 46);
  assert.ok((table['set-flop:flop-river'].probability ?? 0) > fixedOutHits);
  assert.equal(percentage(table['set-flop:flop-river'].probability), '33.4');
});

test('opponent odds respect known cards and card removal, using independently counted combinations', () => {
  const high = getDrawScenario('flush', 'turn-river', options(1, 4));
  const low = getDrawScenario('flush', 'turn-river', options(1, 4, 'low'));
  assert.equal(table[`${high.id}:turn-river`].opponent[0].hits, 66); // 12 remaining hearts choose 2 before flop.
  assert.equal(table[`${high.id}:turn-river`].opponent[1].hits, 0); // No higher flush than A on this board.
  const stats = table[`${low.id}:turn-river`];
  assert.deepEqual(stats.higherFlushCards, ['Ah', 'Qh', 'Th', '9h']);
  assert.equal(stats.opponent[1].hits, 4 * 42 + 6); // At least one of four higher hearts among 46 cards.
  const monotone = getDrawScenario('flush', 'flop-turn', options(1, 3));
  assert.equal(table[`${monotone.id}:flop-turn`].opponent[1].hits, 36); // 9 unseen hearts choose 2.
  assert.equal(table[`${monotone.id}:flop-turn`].opponent[1].total, 1081);
});

test('risk markers correspond to simultaneous board pairing or flush completion texture', () => {
  const flush = getDrawScenario('flush', 'flop-turn');
  assert.ok(table[`${flush.id}:flop-turn`].risks['5h'].includes('board-pair'));
  assert.ok(table['open-ended-flop:flop-turn'].risks['Ah'].includes('flush-board'));
  assert.ok(table['open-ended-flop:flop-turn'].risks['9h'].includes('flush-board'));
  assert.equal(table['open-ended-flop:flop-turn'].risks['Ac'], undefined);
});

test('best five flush cards, board-only ties, wheel and straight-flush ordering', () => {
  const board = parseCards('Ah Kh Qh Jh 9h');
  assert.equal(compareFlush(bestFlush([...board, ...parseCards('8h 7c')]), bestFlush([...board, ...parseCards('6h 5c')])), 0);
  assert.deepEqual(bestFlush(parseCards('Kh Jh 6h 3h Ah Qc')).map(cardCode), ['Ah', 'Kh', 'Jh', '6h', '3h']);
  const wheel = bestFlush(parseCards('Ah 2h 3h 4h 5h Kc Qc'));
  assert.deepEqual(wheel.map(cardCode), ['5h', '4h', '3h', '2h', 'Ah']);
  assert.ok(compareFlush(bestFlush(parseCards('Ah 6h 5h 4h 3h 2h Qc')), wheel) > 0);
  assert.ok(compareFlush(wheel, bestFlush(parseCards('Ah Kh Qh 9h 8h 2c 3c'))) > 0);
});

// Independently classify all five-card subsets to verify dynamic full-house runouts.
function fullHouseInFive(cards: CardValue[]) {
  const counts = [...new Set(cards.map(card => card.rank))].map(rank => cards.filter(card => card.rank === rank).length).sort((a, b) => b - a);
  return counts[0] === 4 || counts[0] === 3 && counts[1] === 2;
}
test('full-house probability matches independent five-card subset enumeration', () => {
  const scenario = getDrawScenario('set', 'flop-river');
  const known = [...scenario.hand, ...scenario.board];
  const available = DECK.filter(card => !known.some(item => cardCode(item) === cardCode(card)));
  let hits = 0;
  for (let i = 0; i < available.length; i++) for (let j = i + 1; j < available.length; j++) {
    const seven = [...known, available[i], available[j]];
    let matched = false;
    for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) if (fullHouseInFive(seven.filter((_, index) => index !== a && index !== b))) matched = true;
    if (matched) hits++;
  }
  assert.equal(table['set-flop:flop-river'].hits, hits);
});

test('invalid or duplicate cards and incompatible stages are rejected', () => {
  assert.throws(() => remainingCards(parseCards('Ah Ah')));
  assert.throws(() => calculateDrawStatistics(getDrawScenario('set', 'flop-turn'), 'turn-river'));
});
