import { useState } from 'react';
import generated from '../data/draw-statistics.json';
import { DRAWS, DRAW_STAGES, defaultDrawOptions, getDrawScenario, type DrawId, type DrawOptions, type DrawStage } from '../data/draws';
import { drawGuide } from '../data/draw-guide';
import type { DrawStatistics } from '../lib/draw-engine';
import { parseCards } from '../lib/poker';
import { PlayingCard } from './PlayingCard';

const STATISTICS: Record<string, DrawStatistics> = generated.scenarios;
const cards = (codes: string[]) => codes.length ? parseCards(codes.join(' ')) : [];
const percent = (probability: number) => `${(probability * 100).toFixed(1)}%`;

export function Draws() {
  const [stage, setStage] = useState<DrawStage>('flop-turn');
  const [open, setOpen] = useState<DrawId | null>(null);
  const [options, setOptions] = useState(() => Object.fromEntries(DRAWS.map(draw => [draw.id, defaultDrawOptions(draw.id)])) as Record<DrawId, DrawOptions>);
  const [selectedRisk, setSelectedRisk] = useState<string | null>(null);
  const changeOptions = (id: DrawId, patch: Partial<DrawOptions>) => {
    setSelectedRisk(null);
    setOptions(current => {
      const next = { ...current[id], ...patch };
      if (id === 'backdoor' && patch.holeCards) next.flopSuitCount = 3 - patch.holeCards;
      const minimum = next.holeCards === 1 ? 2 : 1;
      next.flopSuitCount = Math.max(minimum, next.flopSuitCount);
      next.turnSuitCount = Math.max(minimum, next.turnSuitCount);
      return { ...current, [id]: next };
    });
  };
  return <>
    <div className="segmented draw-stage" aria-label="听牌阶段 / Drawing stage">{DRAW_STAGES.map(item => <button key={item.id} className={stage === item.id ? 'active' : ''} aria-pressed={stage === item.id} onClick={() => { setStage(item.id); setSelectedRisk(null); }}><span>{item.zh}</span><small>{item.en}</small></button>)}</div>
    <div className="draw-columns" aria-hidden="true"><span>听牌类型<small>Draw</small></span><span>补牌<small>Outs</small></span><span>命中率<small>Hit probability</small></span><span /></div>
    <section className="draw-list" aria-label="听牌概率表">{DRAWS.map(draw => {
      const expanded = open === draw.id;
      const variant = options[draw.id];
      const scenario = getDrawScenario(draw.id, stage, variant);
      const stats = STATISTICS[`${scenario.id}:${stage}`];
      const guide = drawGuide(draw.id, scenario, stats);
      const configurable = draw.id === 'flush' || draw.id === 'backdoor';
      const suitCount = stage === 'turn-river' ? variant.turnSuitCount : variant.flopSuitCount;
      const shownCards = stats.backdoor ? stats.candidates : stats.outs;
      const riskTags = selectedRisk ? stats.risks[selectedRisk] ?? [] : [];
      const activeRisk = selectedRisk && stats.risks[selectedRisk] ? selectedRisk : null;
      return <article className={`draw-item ${expanded ? 'open' : ''}`} data-draw={draw.id} data-scenario={scenario.id} key={draw.id}>
        <button className="draw-toggle" aria-expanded={expanded} aria-controls={`draw-${draw.id}`} onClick={() => { setOpen(expanded ? null : draw.id); setSelectedRisk(null); }}>
          <span className="draw-name"><strong>{draw.zh}</strong><small>{draw.en}</small></span>
          <span className={`draw-outs-count ${stats.backdoor || stats.made ? 'draw-count-label' : ''}`}>{stats.made ? '—' : stats.backdoor ? <>连续<br />两张</> : stats.outs.length}</span>
          <span className={`draw-probability ${stats.made ? 'draw-made' : ''}`}>{stats.made ? '已成花' : <>{((stats.probability ?? 0) * 100).toFixed(1)}<small>%</small></>}</span>
          <svg className="draw-chevron" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
        </button>
        {expanded && <div className="draw-detail" id={`draw-${draw.id}`}>
          {configurable && <div className="draw-controls">
            <div className="draw-choice-row" aria-label="手牌花色张数">{([1, 2] as const).map(count => <button key={count} aria-pressed={variant.holeCards === count} onClick={() => changeOptions(draw.id, { holeCards: count })}><span>{count === 1 ? '单张手牌' : '双张手牌'}</span><small>{count === 1 ? 'One-card' : 'Two-card'}</small></button>)}</div>
            <div className="draw-board-choice"><span>公共牌 · 红桃</span><div>{draw.id === 'backdoor' && stage !== 'turn-river' ? <span className="draw-fixed-count">{suitCount} 张</span> : Array.from({ length: (stage === 'turn-river' ? 4 : 3) - (variant.holeCards === 1 ? 2 : 1) + 1 }, (_, index) => index + (variant.holeCards === 1 ? 2 : 1)).map(count => <button key={count} aria-label={`公共牌 ${count} 张红桃`} aria-pressed={suitCount === count} onClick={() => changeOptions(draw.id, stage === 'turn-river' ? { turnSuitCount: count } : { flopSuitCount: count })}>{count} 张</button>)}</div></div>
            <div className="draw-quality-choice" aria-label="同花大小">{(['nut', 'low'] as const).map(quality => <button key={quality} aria-pressed={variant.quality === quality} onClick={() => changeOptions(draw.id, { quality })}>{quality === 'nut' ? '持 A♥' : '持 8♥'}<small>{quality === 'nut' ? stats.made ? 'Nut flush' : 'Nut draw' : stats.made ? 'Low flush' : 'Low draw'}</small></button>)}</div>
          </div>}
          <div className="draw-example"><div><h3>手牌 <span>Hand</span></h3><div className="draw-example-hand">{scenario.hand.map(card => <PlayingCard key={card.rank + card.suit} card={card} />)}</div></div><div><h3>{stage === 'turn-river' ? '转牌' : '翻牌'} <span>{stage === 'turn-river' ? 'Turn' : 'Flop'}</span></h3><div className="draw-example-board">{scenario.board.map(card => <PlayingCard key={card.rank + card.suit} card={card} />)}{Array.from({ length: stage === 'flop-river' ? 2 : 1 }, (_, i) => <span className="draw-card-back" key={i} aria-hidden="true" />)}</div></div></div>
          <p className="draw-completion">{guide.completion}</p>
          {stats.backdoor && <div className="draw-setup"><span>转牌形成听花 <small>Four-flush on turn</small></span><strong>{percent(stats.setupProbability ?? 0)}</strong></div>}
          {stats.bestFlush.length > 0 && <div className="draw-best"><h3>当前同花 <span>Best Five</span></h3><div>{cards(stats.bestFlush).map(card => <PlayingCard card={card} small key={card.rank + card.suit} />)}</div></div>}
          {shownCards.length > 0 && <>
            <h3 className="draw-subheading">{stats.backdoor ? '候选红桃' : '补牌'} <span>{stats.backdoor ? 'Available Hearts' : 'Outs'}</span><b>{shownCards.length}</b></h3>
            <div className="draw-out-cards" aria-label={`${shownCards.length} 张${stats.backdoor ? '候选红桃' : '补牌'}`}>{cards(shownCards).map(card => {
              const code = card.rank + card.suit;
              const risky = Boolean(stats.risks[code]);
              const cardElement = <PlayingCard card={card} small />;
              const className = `${stats.overlaps.includes(code) ? 'overlap' : ''} ${risky ? 'risky' : ''}`;
              return risky ? <button key={code} className={className} data-risk={code} aria-label={`${code} 风险补牌 / Dirty Out`} aria-pressed={activeRisk === code} onClick={() => setSelectedRisk(activeRisk === code ? null : code)}>{cardElement}<i>·</i></button> : <span key={code} className={className}>{cardElement}</span>;
            })}</div>
          </>}
          {Object.keys(stats.risks).length > 0 && <div className="draw-risk-note"><span className="risk-dot" />风险补牌 <span>Dirty Outs</span><small>点牌查看</small></div>}
          {activeRisk && <div className="draw-risk-explanation" role="status">{riskTags.includes('board-pair') && <p>这张牌同时让公共牌配对；对手的三条、两对可能改善成葫芦或四条。</p>}{riskTags.includes('flush-board') && <p>这张顺子补牌也增加公共牌的同花连结；对手可能同时补成同花。</p>}</div>}
          {stats.overlaps.length > 0 && <div className="draw-overlap"><span>9 同花 + 8 顺子 − 2 重复</span><strong>{stats.outs.length} <small>Outs</small></strong></div>}
          {scenario.goal === 'flush' || scenario.goal === 'combo' ? <div className="draw-strength"><p>{guide.strength}</p>{stats.higherFlushCards.length > 0 && <div className="draw-higher-cards" aria-label="更大的未知红桃">{cards(stats.higherFlushCards).map(card => <PlayingCard card={card} small key={card.rank + card.suit} />)}</div>}</div> : null}
          <section className="draw-opponent"><h3>对手情况 <span>Opponent</span></h3><div className="draw-random-label">单个随机对手 <span>Random opponent</span></div><dl>{stats.opponent.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{percent(item.probability)}</dd></div>)}</dl><h4>范围判断 <span>Hand Range</span></h4><p>{guide.range}</p></section>
          <section className="draw-actions"><h3>行动线索 <span>Action Clues</span></h3>{guide.actions.map((text, index) => <p key={text}><b>{String(index + 1).padStart(2, '0')}</b><span>{text}</span></p>)}</section>
        </div>}
      </article>;
    })}</section>
  </>;
}
