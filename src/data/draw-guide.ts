import type { DrawId, DrawScenario } from './draws';
import type { DrawStatistics } from '../lib/draw-engine';

export function drawGuide(id: DrawId, scenario: DrawScenario, stats: DrawStatistics) {
  const hearts = scenario.board.filter(card => card.suit === 'h').length;
  const single = scenario.hand.filter(card => card.suit === 'h').length === 1;
  let completion = '';
  if (scenario.goal === 'flush') {
    completion = stats.made ? '已成同花，比较下面的最佳五张。' : stats.backdoor ? '转牌、河牌都需要红桃，才能补成同花。' : stats.outs.length ? '再来一张红桃，即可补成同花。' : '还差两张红桃，河牌一张无法补成同花。';
  } else if (id === 'open-ended') completion = '任意一张 A 或 9 补成顺子。';
  else if (id === 'gutshot') completion = '任意一张 10 补成顺子。';
  else if (id === 'double-gutshot') completion = '8 补成 7–J，Q 补成 9–K，两处都能成顺。';
  else if (id === 'combo') completion = '红桃补成同花，4 或 9 补成顺子；4♥、9♥ 只计一次。';
  else completion = scenario.board.length === 3 ? '另一张 7 补成四条；K 或 2 补成葫芦。' : '转牌 Q 新增三张补牌，现在 K、Q、2 或另一张 7 都能改善成牌。';
  const range = scenario.goal === 'flush' || scenario.goal === 'combo'
    ? '早位开池通常比后位更紧；后位开池和盲注防守会包含更多同花牌。再加注 / 3-bet 既可能有强牌，也可能有带阻断牌的诈唬。'
    : '早位开池需要重视强对子与强高张；后位开池、盲注防守可包含更多连张。翻前跟注范围仍可能保留小对子与同花牌。';
  const actions: string[] = [];
  if (hearts >= 4) actions.push('四张红桃的公共牌，一张红桃就能成花；持低红桃时，大额下注或过牌加注需要重点比较更大的红桃。');
  else if (hearts === 3) actions.push('三同花牌面 / Monotone：对手持两张红桃已经成花；持续下注 / C-bet 后继续跟注或加注的范围，还需考虑大红桃听花。');
  else if (stats.backdoor) actions.push('后门听牌需要连续改善。小额持续下注可以来自较宽范围；面对后续大额下注，要重新看转牌是否真正增加补牌。');
  else if (id === 'set') actions.push('三条 / Set 可以改善成葫芦；若后续出现第三张红桃，对手的同花也进入需要比较的范围。');
  else actions.push('小额持续下注可能覆盖较宽范围；大额下注要同时考虑强成牌、强听牌和诈唬组合。');
  actions.push(hearts >= 4 ? '过牌加注 / Check-raise：对照更大同花与不带红桃的诈唬组合，结合翻前位置和后续行动继续缩小范围。' : hearts === 3 ? '过牌加注 / Check-raise：同时考虑已成同花与带高红桃的半诈唬，结合翻前位置和后续行动继续缩小范围。' : '过牌加注 / Check-raise：同时考虑两对、三条和强听牌；单次行动不足以锁定某一手牌。');
  if (scenario.goal !== 'full-house') actions.push('公共牌配对后，需要加入葫芦、四条；多人底池也应重视更多对手仍能组成的强牌。');
  const strength = stats.higherFlushCards.length
    ? stats.made ? '非坚果同花 / Non-nut Flush：下面这些更大的红桃仍在未知牌中，可让对手组成更大同花。' : `${single ? '单张' : '双张'}低花听牌 / Low Flush Draw：下面这些更大的红桃仍在未知牌中，成花后要继续比较。`
    : stats.made ? '坚果同花 / Nut Flush：A♥ 阻断更大的普通同花，公共牌配对时仍需比较葫芦与四条。' : 'A♥ 坚果同花听牌 / Nut Flush Draw：A♥ 阻断更大的同花，公共牌配对时仍需比较葫芦与四条。';
  return { completion, range, actions, strength };
}
