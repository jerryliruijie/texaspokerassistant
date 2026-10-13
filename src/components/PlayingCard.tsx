import type { CardValue } from '../lib/poker';

const SUITS = { s: '♠', h: '♥', d: '♦', c: '♣' };
const SUIT_NAMES = { s: '黑桃', h: '红桃', d: '方块', c: '梅花' };

export function PlayingCard({ card, small = false, kicker = false }: { card: CardValue; small?: boolean; kicker?: boolean }) {
  const rank = card.rank === 'T' ? '10' : card.rank;
  return <span className={`playing-card ${card.suit === 'h' || card.suit === 'd' ? 'red' : ''} ${small ? 'small' : ''} ${kicker ? 'kicker' : ''}`} role="img" aria-label={`${SUIT_NAMES[card.suit]}${rank}${kicker ? '，踢脚牌 Kicker' : ''}`}>
    <span className="card-corner"><b>{rank}</b><span>{SUITS[card.suit]}</span></span>
    <span className="card-pip">{SUITS[card.suit]}</span>
    <span className="card-corner bottom"><b>{rank}</b><span>{SUITS[card.suit]}</span></span>
  </span>;
}
