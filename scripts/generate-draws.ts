import { writeFileSync, readFileSync } from 'node:fs';
import { DRAW_SCENARIOS, type DrawStage } from '../src/data/draws';
import { calculateDrawStatistics, type DrawStatistics } from '../src/lib/draw-engine';

const results: Record<string, DrawStatistics> = {};
for (const scenario of DRAW_SCENARIOS) {
  const stages: DrawStage[] = scenario.board.length === 3 ? ['flop-turn', 'flop-river'] : ['turn-river'];
  for (const stage of stages) results[`${scenario.id}:${stage}`] = calculateDrawStatistics(scenario, stage);
}
const serialized = JSON.stringify({ version: 2, method: 'exact-card-enumeration', scenarios: results }, null, 2) + '\n';
const path = new URL('../src/data/draw-statistics.json', import.meta.url);
if (process.argv.includes('--check')) {
  if (readFileSync(path, 'utf8').replaceAll('\r\n', '\n') !== serialized) throw new Error('Drawing statistics need regeneration');
  console.log(`Verified ${Object.keys(results).length} exact drawing scenarios`);
} else {
  writeFileSync(path, serialized);
  console.log(`Generated ${Object.keys(results).length} exact drawing scenarios`);
}
