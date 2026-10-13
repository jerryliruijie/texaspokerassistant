import { useState } from 'react';
import { DRAWS, DRAW_STAGES, drawProbability, type DrawStage } from '../data/draws';
import { PlayingCard } from './PlayingCard';

export function Draws() {
  const [stage, setStage] = useState<DrawStage>('flop-turn');
  const [open, setOpen] = useState<string | null>(null);
  return <>
    <div className="segmented draw-stage" aria-label="听牌阶段 / Drawing stage">{DRAW_STAGES.map(item => <button key={item.id} className={stage === item.id ? 'active' : ''} aria-pressed={stage === item.id} onClick={() => setStage(item.id)}><span>{item.zh}</span><small>{item.en}</small></button>)}</div>
    <div className="draw-columns" aria-hidden="true"><span>听牌类型<small>Draw</small></span><span>补牌<small>Outs</small></span><span>命中率<small>Hit probability</small></span><span /></div>
    <section className="draw-list" aria-label="听牌概率表">{DRAWS.map(draw => {
      const expanded = open === draw.id;
      const board = stage === 'turn-river' ? [...draw.flop, draw.turn] : draw.flop;
      const probability = drawProbability(draw.outs.length, stage) * 100;
      return <article className={`draw-item ${expanded ? 'open' : ''}`} data-draw={draw.id} key={draw.id}>
        <button className="draw-toggle" aria-expanded={expanded} aria-controls={`draw-${draw.id}`} onClick={() => setOpen(expanded ? null : draw.id)}>
          <span className="draw-name"><strong>{draw.zh}</strong><small>{draw.en}</small></span>
          <span className="draw-outs-count">{draw.outs.length}</span>
          <span className="draw-probability">{probability.toFixed(1)}<small>%</small></span>
          <svg className="draw-chevron" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
        </button>
        {expanded && <div className="draw-detail" id={`draw-${draw.id}`}>
          <div className="draw-example"><div><h3>手牌 <span>Hand</span></h3><div className="draw-example-hand">{draw.hand.map(card => <PlayingCard key={card.rank + card.suit} card={card} />)}</div></div><div><h3>{stage === 'turn-river' ? '转牌' : '翻牌'} <span>{stage === 'turn-river' ? 'Turn' : 'Flop'}</span></h3><div className="draw-example-board">{board.map(card => <PlayingCard key={card.rank + card.suit} card={card} />)}{stage === 'flop-river' && <><span className="draw-card-back" aria-hidden="true" /><span className="draw-card-back" aria-hidden="true" /></>}{stage !== 'flop-river' && <span className="draw-card-back" aria-hidden="true" />}</div></div></div>
          <p className="draw-completion">{draw.completion}</p>
          <div className="draw-out-cards" aria-label={`${draw.outs.length} 张补牌`}>{draw.outs.map(card => <span key={card.rank + card.suit} className={draw.overlaps?.some(overlap => overlap.rank === card.rank && overlap.suit === card.suit) ? 'overlap' : ''}><PlayingCard card={card} small /></span>)}</div>
          {draw.overlaps && <div className="draw-overlap"><span>9 同花 + 8 顺子 − 2 重复</span><strong>15 <small>Outs</small></strong><p>4♥、9♥ 同时补成顺子与同花。</p></div>}
        </div>}
      </article>;
    })}</section>
  </>;
}
