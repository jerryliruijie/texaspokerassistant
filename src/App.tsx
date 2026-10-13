import { useEffect, useLayoutEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import equityData from './data/equity.json';
import { RANKINGS } from './data/rankings';
import { actionOrder, POSITION_TERMS, relativePosition, SEATS, type PositionId, type Seat, type Street } from './data/positions';
import { cellColors, EQUITY_BANDS, equityBand, exampleCards, HANDS, handStats, matrixHand, RANKS, safePlayers, TERMS, type Page } from './lib/poker';
import { PlayingCard } from './components/PlayingCard';
import { Draws } from './components/Draws';

const EQUITIES: Record<string, number[]> = equityData.hands;
const STORAGE_KEY = 'pocket.preferences.v1';
type Preferences = { players: number; page: Page; hand: string };

function loadPreferences(): Preferences {
  const pages = ['hands', 'rankings', 'positions', 'draws'];
  const linkedPage = window.location.hash.slice(1).split('/')[0];
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      players: safePlayers(saved.players),
      page: pages.includes(linkedPage) ? linkedPage as Page : pages.includes(saved.page) ? saved.page : 'hands',
      hand: HANDS.includes(saved.hand) ? saved.hand : 'AA',
    };
  } catch { return { players: 6, page: pages.includes(linkedPage) ? linkedPage as Page : 'hands', hand: 'AA' }; }
}

type IconName = 'grid' | 'cards' | 'table' | 'draw' | 'info' | 'expand' | 'close' | 'chevron' | 'users' | 'arrow' | 'spade';
function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    grid: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M4 10h16M4 15h16M10 4v16M15 4v16" /></>,
    cards: <><rect x="8" y="4" width="12" height="16" rx="2" /><path d="m5 6-2 1 3 14a2 2 0 0 0 2 1l4-1M14 9l-2 3 2 3 2-3Z" /></>,
    draw: <><rect x="3" y="5" width="10" height="15" rx="2" /><path d="M7 9h2M7 12h2M17 4v8m-3-3 3 3 3-3M16 17h5" /></>,
    table: <><rect x="6" y="3" width="12" height="18" rx="6" /><path d="M2 8h1M2 16h1M21 8h1M21 16h1M11 10h2v4h-2Z" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7v.3" /></>,
    expand: <><path d="M9 4H4v5M15 4h5v5M20 15v5h-5M9 20H4v-5" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5" /></>,
    arrow: <path d="M4 12h16m-5-5 5 5-5 5" />,
    spade: <path d="M12 3c-2 4-8 7-8 11a4 4 0 0 0 8 0 4 4 0 0 0 8 0c0-4-6-7-8-11Zm0 11-3 7h6Z" />,
  };
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function SectionHeading({ zh, en, children }: { zh: string; en: string; children?: ReactNode }) {
  return <div className="section-heading"><h2>{zh}<span>{en}</span></h2>{children}</div>;
}

function PlayersSelector({ players, onChange }: { players: number; onChange: (players: number) => void }) {
  const id = useId();
  return <section className="players-panel" aria-label="牌桌人数 / Players">
    <div className="players-top"><label htmlFor={id}><Icon name="users" size={15} />牌桌人数 <span>PLAYERS</span></label><div className="players-value"><strong>{players}</strong><span>人桌</span></div></div>
    <input id={id} className="players-slider" type="range" min="2" max="8" step="1" value={players} onChange={event => onChange(Number(event.target.value))} style={{ '--progress': `${(players - 2) / 6 * 100}%` } as CSSProperties} aria-label="牌桌人数 / Players" aria-valuetext={`${players} 人桌，包含自己`} />
    <div className="slider-ticks">{[2, 3, 4, 5, 6, 7, 8].map(value => <button key={value} onClick={() => onChange(value)} className={value === players ? 'active' : ''} aria-label={`${value} 人桌`} aria-pressed={value === players}>{value}</button>)}</div>
  </section>;
}

function EquityLegend({ players }: { players: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const id = useId();
  const percent = (ratio: number) => `${(ratio * 100 / players).toFixed(1)}%`;
  const intervals = [`≥ ${percent(1.5)}`, `${percent(1.1)} ≤ 胜率 < ${percent(1.5)}`, `${percent(.9)} ≤ 胜率 < ${percent(1.1)}`, `< ${percent(.9)}`];
  return <div className="legend-wrap"><div className="matrix-legend"><div className="equity-band-keys">{EQUITY_BANDS.map((band, index) => <button key={band.id} onClick={() => setSelected(selected === index ? null : index)} aria-expanded={selected === index} aria-controls={id} aria-label={`${band.label}，查看区间`}><i style={{ backgroundColor: band.backgroundColor }} /><span>{band.zh}</span></button>)}</div><span className="baseline">平均胜率<b>{(100 / players).toFixed(1)}%</b></span></div>{selected !== null && <div className="band-explanation" id={id}><span>{EQUITY_BANDS[selected].label}</span><b>{intervals[selected]}</b><button aria-label="收起区间" onClick={() => setSelected(null)}><Icon name="close" size={14} /></button></div>}</div>;
}

function HandMatrix({ players, hand, onSelect, expanded = false }: { players: number; hand: string; onSelect: (hand: string) => void; expanded?: boolean }) {
  const [activeCell, setActiveCell] = useState(hand);
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setActiveCell(hand); }, [hand]);
  return <div className={`matrix ${expanded ? 'expanded-matrix' : ''}`} role="grid" aria-label="起手牌胜率矩阵 / Starting hand equity" aria-rowcount={14} aria-colcount={14} ref={gridRef} onKeyDown={event => {
    const current = HANDS.indexOf(activeCell);
    const directions: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 13, ArrowUp: -13 };
    if (!(event.key in directions)) return;
    event.preventDefault();
    if ((event.key === 'ArrowRight' && current % 13 === 12) || (event.key === 'ArrowLeft' && current % 13 === 0)) return;
    const next = Math.min(168, Math.max(0, current + directions[event.key]));
    setActiveCell(HANDS[next]);
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-hand="${HANDS[next]}"]`)?.focus();
  }}>
    <div className="matrix-row matrix-header" role="row"><span className="matrix-corner" role="columnheader">♠</span>{RANKS.map(rank => <span key={rank} role="columnheader">{rank}</span>)}</div>
    {RANKS.map((rank, row) => <div className="matrix-row" role="row" key={rank}><span className="matrix-row-label" role="rowheader">{rank}</span>{RANKS.map((_, column) => {
      const label = matrixHand(row, column);
      const equity = EQUITIES[label][players - 2];
      const kind = handStats(label).kind;
      const band = equityBand(equity, players);
      return <button key={label} data-hand={label} data-strength={band.id} role="gridcell" className={`matrix-cell ${label === hand ? 'selected' : ''} ${kind === 'pair' ? 'pair-cell' : ''}`} style={cellColors(equity, players)} tabIndex={activeCell === label ? 0 : -1} onFocus={() => setActiveCell(label)} onClick={() => onSelect(label)} aria-selected={label === hand} aria-label={`${label}，${TERMS[kind].zh}，摊牌胜率 ${(equity * 100).toFixed(1)}%，${band.label}`}>
        <span>{label.slice(0, 2)}{label.length === 3 && <small>{label[2]}</small>}</span>{expanded && <em>{(equity * 100).toFixed(1)}%</em>}
      </button>;
    })}</div>)}
  </div>;
}

function HandSummary({ hand, players, compact = false }: { hand: string; players: number; compact?: boolean }) {
  const { kind } = handStats(hand);
  const equity = EQUITIES[hand][players - 2] * 100;
  return <section className={`hand-summary ${compact ? 'compact' : ''}`} aria-label="当前手牌">
    <div className="selected-cards">{exampleCards(hand).map((card, index) => <PlayingCard key={index} card={card} />)}</div>
    <div className="hand-name"><strong>{hand}</strong><span>{TERMS[kind].zh}</span><small>{TERMS[kind].en}</small></div>
    <div className="equity-number"><span>摊牌胜率 <small>EQUITY</small></span><strong>{equity.toFixed(1)}<i>%</i></strong><small>{equityBand(equity / 100, players).label}</small></div>
  </section>;
}

function HandProbability({ hand }: { hand: string }) {
  const { probability, frequency, combinations } = handStats(hand);
  return <section className="probability-panel" aria-label="发牌概率">
    <div className="probability-main"><div><span>平均间隔</span></div><div><strong>{frequency === 221 ? '221' : `≈ ${Math.round(frequency)}`}</strong><span> 手 / 次</span></div></div>
    <div className="probability-bottom"><span><span>发到概率</span><b>{(probability * 100).toFixed(3)}%</b></span><i /><span><span>花色组合</span><b>{combinations}</b></span></div>
  </section>;
}

function Dialog({ title, english, children, onClose, wide = false }: { title: string; english: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; dialog.close(); previousFocus?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className={`bottom-sheet ${wide ? 'wide-sheet' : ''}`} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="sheet-inner"><header className="sheet-header"><div><h2 id={titleId}>{title}</h2><span>{english}</span></div><button className="icon-button" aria-label="关闭 / Close" onClick={onClose} autoFocus><Icon name="close" /></button></header>{children}</div>
  </dialog>;
}

function StartingHands({ players, hand, setPlayers, setHand, onExpand }: { players: number; hand: string; setPlayers: (players: number) => void; setHand: (hand: string) => void; onExpand: () => void }) {
  return <>
    <PlayersSelector players={players} onChange={setPlayers} />
    <HandSummary hand={hand} players={players} />
    <section className="matrix-section">
      <SectionHeading zh="手牌矩阵" en=""><button className="text-button" onClick={onExpand} aria-label="放大矩阵 / Expand matrix"><Icon name="expand" size={16} />放大</button></SectionHeading>
      <HandMatrix players={players} hand={hand} onSelect={setHand} />
      <EquityLegend players={players} />
    </section>
    <HandProbability hand={hand} />
  </>;
}

function Rankings() {
  const [open, setOpen] = useState<string | null>(null);
  return <>
    <div className="ranking-guide"><span><Icon name="spade" size={14} />由强到弱</span><Icon name="arrow" size={13} /></div>
    <section className="ranking-list" aria-label="牌型强度排名">{RANKINGS.map((ranking, index) => <article className={`ranking-item ${open === ranking.id ? 'open' : ''}`} key={ranking.id}>
      <button className="ranking-toggle" aria-expanded={open === ranking.id} aria-controls={`ranking-${ranking.id}`} onClick={() => setOpen(open === ranking.id ? null : ranking.id)}>
        <div className="ranking-title"><span className="rank-number">{String(index + 1).padStart(2, '0')}</span><div><h2>{ranking.zh}</h2><span>{ranking.en}</span></div><Icon name="chevron" size={16} /></div>
        <div className="ranking-cards">{ranking.cards.map((card, cardIndex) => <PlayingCard card={card} small key={cardIndex} kicker={cardIndex >= ({ 'four-of-a-kind': 4, 'three-of-a-kind': 3, 'two-pair': 4, 'one-pair': 2, 'high-card': 1 }[ranking.id] ?? 5)} />)}</div>
        <p>{ranking.description}</p>
      </button>
      {open === ranking.id && <div className="ranking-detail" id={`ranking-${ranking.id}`}><p className="ranking-composition">{ranking.description}</p><span>比较规则 <small>Comparison</small></span><p>{ranking.comparison}</p><div>{ranking.example}</div></div>}
    </article>)}</section>
    <div className="rules-note"><Icon name="info" size={16} /><p>七张选五张，比较最佳成牌。<span>Best five of seven. All suits are equal.</span></p></div>
  </>;
}

function PositionDetail({ players, seat, street }: { players: number; seat: Seat; street: Street }) {
  const term = POSITION_TERMS[seat.id];
  const order = actionOrder(players, street);
  return <section className="position-detail" aria-live="polite"><div className="position-detail-top"><div className="position-abbr">{seat.id}</div><div><h2>{term.zh}</h2><span>{term.en}</span></div><div className="action-index"><strong>{String(order.indexOf(seat.id) + 1).padStart(2, '0')}</strong><span>行动顺位 · ORDER</span></div></div>
    <div className="position-meta"><span>{relativePosition(players, seat)}</span>{seat.alias && <span>亦称 {POSITION_TERMS[seat.alias].zh} · {seat.alias}</span>}</div>
    <details className="position-more"><summary>位置说明 <span>Details</span><Icon name="chevron" size={14} /></summary><p>{term.description}</p>
    {players === 2 && <p className="heads-up-note">双人桌 / Heads-up：BTN = SB；翻前 SB → BB，翻后 BB → SB。</p>}</details>
  </section>;
}

function Positions({ players, setPlayers }: { players: number; setPlayers: (players: number) => void }) {
  const [street, setStreet] = useState<Street>('preflop');
  const [selected, setSelected] = useState<PositionId>('UTG');
  const seats = SEATS[players];
  const seat = seats.find(item => item.id === selected) ?? seats[0];
  const order = actionOrder(players, street);
  const selectSeat = (id: PositionId) => setSelected(id);
  const points = seats.map((_, index) => {
    const angle = index * 2 * Math.PI / players - Math.PI / 2;
    return { x: 50 + 39 * Math.cos(angle), y: 50 + 40 * Math.sin(angle) };
  });
  const orderedPoints = order.map(id => points[seats.findIndex(item => item.id === id)]);
  const marker = useId().replaceAll(':', '');
  return <>
    <PlayersSelector players={players} onChange={setPlayers} />
    <div className="segmented street-toggle" aria-label="行动轮次">{([{ id: 'preflop', zh: '翻前', en: 'PRE-FLOP' }, { id: 'postflop', zh: '翻后', en: 'POST-FLOP' }] as const).map(item => <button key={item.id} className={street === item.id ? 'active' : ''} onClick={() => setStreet(item.id)} aria-pressed={street === item.id}><span>{item.zh}</span><small>{item.en}</small></button>)}</div>
    <section className="table-stage" aria-label={`${players} 人牌桌，${street === 'preflop' ? '翻前' : '翻后'}行动顺序`}>
      <div className="poker-table"><div className="table-felt"><Icon name="spade" size={32} /><span>{players}-HANDED</span><small>{street === 'preflop' ? 'PRE-FLOP' : 'POST-FLOP'}</small><div className="table-community">{Array.from({ length: 5 }, (_, i) => <i key={i} className={street === 'postflop' && i < 3 ? 'face-up' : ''} />)}</div></div></div>
      <svg className="action-arrows" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><marker id={marker} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0 5 2.5 0 5" fill="currentColor" /></marker></defs>{orderedPoints.slice(0, -1).map((point, index) => {
        const next = orderedPoints[index + 1];
        const dx = next.x - point.x, dy = next.y - point.y;
        const length = Math.hypot(dx, dy);
        const inset = 10;
        return length > inset * 2 ? <path key={index} d={`M${point.x + dx / length * inset} ${point.y + dy / length * inset} L${next.x - dx / length * inset} ${next.y - dy / length * inset}`} markerEnd={`url(#${marker})`} /> : null;
      })}</svg>
      {seats.map((item, index) => <button key={item.id} className={`seat ${seat.id === item.id ? 'selected' : ''} ${order[0] === item.id ? 'first-to-act' : ''}`} style={{ left: `${points[index].x}%`, top: `${points[index].y}%` }} aria-pressed={seat.id === item.id} aria-label={`${POSITION_TERMS[item.id].zh} ${POSITION_TERMS[item.id].en}，第 ${order.indexOf(item.id) + 1} 个行动`} onClick={() => selectSeat(item.id)}>
        <span className="seat-number">{order.indexOf(item.id) + 1}</span>{index === 0 && <i className="dealer-chip">D</i>}<strong>{item.id}</strong><small>{item.id === 'BTN/SB' ? '按钮 · 小盲' : POSITION_TERMS[item.id].zh}</small>
      </button>)}
    </section>
    <div className="table-caption"><span><i />首位行动</span><span>顺时针 <Icon name="arrow" size={13} /></span></div>
    <div className="position-dock">
    <PositionDetail players={players} seat={seat} street={street} />
    <section className="action-order"><SectionHeading zh="行动顺序" en="ACTION ORDER" /><div>{order.map((id, index) => <span key={id}><button onClick={() => selectSeat(id)} className={seat.id === id ? 'active' : ''}>{id}</button>{index < order.length - 1 && <Icon name="chevron" size={10} />}</span>)}</div></section>
    </div>
  </>;
}

function InfoContent({ page }: { page: Page }) {
  if (page === 'draws') return <div className="info-content"><section><h3>补牌 <span>Outs</span></h3><p>表中命中率指所选阶段至少出现一张列出的补牌。翻牌后有 47 张未知牌，转牌后有 46 张；重叠补牌只计一次。</p><a href="https://www.pokerstars.com/poker/learn/lesson/calculating-outs/" target="_blank" rel="noreferrer">听牌与补牌 · PokerStars ↗</a></section></div>;
  return <div className="info-content">
    {page === 'hands' ? <>
      <section><h3>胜率口径 <span>Equity model</span></h3><p>对手随机持牌，所有人看到河牌。数值为赢得底池的平均份额：独赢记 1，平局按平分人数计入。</p><p>平均胜率为 1 ÷ 总人数。颜色按与平均值的比例分档：远高 ≥ 1.5 倍，略高 1.1–1.5 倍，接近 0.9–1.1 倍，低于 &lt; 0.9 倍。</p></section>
      <section><h3>牌名标记 <span>Hand notation</span></h3><div className="notation-row"><b>AA</b><span>对子 / Pocket pair</span></div><div className="notation-row"><b>AKs</b><span>s = 同花 / Suited</span></div><div className="notation-row"><b>AKo</b><span>o = 非同花 / Offsuit</span></div><p>T 代表 10。矩阵对角线为对子，右上为同花，左下为非同花。</p></section>
      <section><h3>数据方法 <span>Methodology</span></h3><p>每类起手牌 {equityData.meta.samplesPerHand.toLocaleString('en-US')} 次蒙特卡洛模拟（Monte Carlo），按多人平局分摊。结果为模拟估计。</p><dl><dt>计算引擎</dt><dd><a href={equityData.meta.source} target="_blank" rel="noreferrer">PokerHandEvaluator {equityData.meta.engineVersion} ↗</a></dd><dt>随机种子</dt><dd>{equityData.meta.seed}</dd></dl></section>
      <section><h3>发牌概率 <span>Deal probability</span></h3><p>标准 52 张牌共有 1,326 种两张牌组合。指定对子有 6 种、同花牌有 4 种、非同花牌有 12 种。发到概率不随桌上人数改变。</p><p>平均间隔 = 1 ÷ 发到概率，是长期数学期望。</p></section>
    </> : page === 'rankings' ? <><section><h3>成牌规则 <span>Best five cards</span></h3><p>从两张手牌与五张公共牌中选出最强的五张，可使用零张、一张或两张手牌。花色没有大小之分。</p><p>五张最终成牌完全相同时平分底池。皇家同花顺单独列出，它也是最高的同花顺。</p><a href="https://www.pokerstars.com/poker/games/rules/hand-rankings/" target="_blank" rel="noreferrer">牌型规则 · PokerStars ↗</a></section></> : <><section><h3>位置与行动 <span>Position & action</span></h3><p>从按钮开始顺时针排座；人数减少时，同一个座位可能具有两个名称。位置详情同时标出适用的别名。</p><p>翻前从大盲之后开始，三人桌即按钮位。翻后从按钮之后仍在局中的首位玩家开始。</p><p>双人桌按钮兼小盲：翻前先行动，翻后后行动。图示假设所有玩家都未弃牌。</p><a href="https://www.pokerstars.com/poker/learn/news/strategy-to-play-heads-up-poker/" target="_blank" rel="noreferrer">双人桌规则 · PokerStars ↗</a></section></>}
  </div>;
}

const NAV: { id: Page; title: string; en: string; icon: IconName }[] = [{ id: 'hands', title: '起手牌', en: 'HANDS', icon: 'grid' }, { id: 'rankings', title: '牌型', en: 'RANKINGS', icon: 'cards' }, { id: 'positions', title: '位置', en: 'POSITIONS', icon: 'table' }, { id: 'draws', title: '听牌', en: 'DRAWS', icon: 'draw' }];

export default function App() {
  const [preferences, setPreferences] = useState(loadPreferences);
  type Route = { page: Page; overlay: 'info' | 'matrix' | null };
  const [route, setRoute] = useState<Route>(() => ({ page: preferences.page, overlay: null }));
  const routeRef = useRef(route);
  const scrollPositions = useRef<Record<Page, number>>({ hands: 0, rankings: 0, positions: 0, draws: 0 });
  const { players, hand } = preferences;
  const { page, overlay } = route;
  const heading = { hands: ['起手牌', 'Starting Hands'], rankings: ['牌型排名', 'Hand Rankings'], positions: ['牌桌位置', 'Positions'], draws: ['听牌', 'Draws'] }[page];
  const setPlayers = (value: number) => setPreferences(current => ({ ...current, players: safePlayers(value) }));
  const setHand = (value: string) => setPreferences(current => ({ ...current, hand: value }));
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...preferences, page })); } catch { /* Browsing also works when storage is disabled. */ } }, [preferences, page]);
  useEffect(() => {
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    history.replaceState({ pocket: routeRef.current }, '', `#${routeRef.current.page}`);
    const onPop = (event: PopStateEvent) => {
      const next = event.state?.pocket as Route | undefined;
      if (!next || !NAV.some(item => item.id === next.page)) return;
      if (next.page !== routeRef.current.page) scrollPositions.current[routeRef.current.page] = window.scrollY;
      routeRef.current = next;
      setRoute(next);
    };
    window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener('popstate', onPop); history.scrollRestoration = previousRestoration; };
  }, []);
  useLayoutEffect(() => { window.scrollTo({ top: scrollPositions.current[page], behavior: 'instant' }); }, [page]);
  const navigate = (next: Route) => {
    if (next.page !== page) scrollPositions.current[page] = window.scrollY;
    history.pushState({ pocket: next }, '', `#${next.page}${next.overlay ? `/${next.overlay}` : ''}`);
    routeRef.current = next;
    setRoute(next);
  };
  const changePage = (next: Page) => {
    if (next === page) { window.scrollTo({ top: 0, behavior: 'instant' }); return; }
    navigate({ page: next, overlay: null });
  };
  return <div className="app-shell">
    <header className="masthead"><div className="app-title"><span className="brand-symbol"><Icon name="spade" size={19} /></span><div><h1>{heading[0]}</h1><span>{heading[1]}</span></div></div><button className="icon-button info-button" onClick={() => navigate({ page, overlay: 'info' })} aria-label="规则与数据说明 / Information"><Icon name="info" size={21} /></button></header>
    <main>
      <div className="page page-hands" hidden={page !== 'hands'}><StartingHands players={players} hand={hand} setPlayers={setPlayers} setHand={setHand} onExpand={() => navigate({ page, overlay: 'matrix' })} /></div>
      <div className="page page-rankings" hidden={page !== 'rankings'}><Rankings /></div>
      <div className="page page-positions" hidden={page !== 'positions'}><Positions players={players} setPlayers={setPlayers} /></div>
      <div className="page page-draws" hidden={page !== 'draws'}><Draws /></div>
    </main>
    <nav className="bottom-nav" aria-label="主导航 / Main navigation">{NAV.map(item => <button key={item.id} onClick={() => changePage(item.id)} className={page === item.id ? 'active' : ''} aria-current={page === item.id ? 'page' : undefined}><span className="nav-icon"><Icon name={item.icon} size={21} /></span><span>{item.title}</span><small>{item.en}</small></button>)}</nav>
    {overlay === 'info' && <Dialog title="规则与数据" english="Notes & Methodology" onClose={() => history.back()}><InfoContent page={page} /></Dialog>}
    {overlay === 'matrix' && <Dialog title="手牌矩阵" english={`${players} 人桌 · Starting Hands`} wide onClose={() => history.back()}>
      <HandSummary hand={hand} players={players} compact />
      <div className="matrix-scroll"><HandMatrix players={players} hand={hand} onSelect={setHand} expanded /></div>
      <EquityLegend players={players} />
    </Dialog>}
  </div>;
}
