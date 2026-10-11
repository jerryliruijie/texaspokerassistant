"""Reproducible random-opponent Hold'em equities, shared samples for 2-8 players.

Install: python -m pip install --target .tools/python -r scripts/requirements.txt
Generate: npm run data:generate
Independent check: npm run data:generate -- --verify
"""
from __future__ import annotations

import argparse
import importlib.metadata
import json
import math
import os
from pathlib import Path
import random
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools' / 'python'))
from phevaluator import evaluate_cards

RANKS = 'AKQJT98765432'
HANDS = [a + b if i == j else a + b + 's' if i < j else b + a + 'o'
         for i, a in enumerate(RANKS) for j, b in enumerate(RANKS)]
DESTINATION = ROOT / 'src' / 'data' / 'equity.json'


def pot_share(hero: int, opponents: list[int]) -> float:
    """PH ranks: smaller is better. Return the hero's fractional share."""
    if any(rank < hero for rank in opponents):
        return 0.0
    return 1.0 / (1 + sum(rank == hero for rank in opponents))


def simulate(job: tuple[str, int, int]) -> tuple[str, list[float]]:
    hand, samples, seed = job
    first = ('23456789TJQKA'.index(hand[0]) * 4)
    second = ('23456789TJQKA'.index(hand[1]) * 4) + (0 if hand.endswith('s') else 1)
    deck = [card for card in range(52) if card not in (first, second)]
    rng = random.Random(seed)
    sample = rng.sample
    evaluate = evaluate_cards
    totals = [0.0] * 7
    for _ in range(samples):
        drawn = sample(deck, 19)
        board = drawn[:5]
        hero = evaluate(first, second, *board)
        ties = 1
        for opponent in range(7):
            offset = 5 + opponent * 2
            other = evaluate(drawn[offset], drawn[offset + 1], *board)
            if other < hero:
                # Once beaten, the hero gets zero for every larger table too.
                break
            if other == hero:
                ties += 1
            totals[opponent] += 1 / ties
    return hand, [round(total / samples, 8) for total in totals]


def verify_engine() -> None:
    assert evaluate_cards('As', 'Ks', 'Qs', 'Js', 'Ts', '2d', '3c') == 1
    assert evaluate_cards('As', '2d', '3c', '4h', '5s', 'Kd', 'Qc') < evaluate_cards('As', 'Ad', 'Kc', 'Qh', '9s', '3d', '2c')
    board = ['As', 'Ks', 'Qs', 'Js', 'Ts']
    rank = evaluate_cards('2d', '3c', *board)
    assert rank == evaluate_cards('8h', '9h', *board)
    assert pot_share(rank, [rank] * 7) == 1 / 8
    assert pot_share(100, [100, 200]) == 0.5
    assert pot_share(100, [100, 99]) == 0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--samples', type=int, default=200_000)
    parser.add_argument('--seed', type=int, default=20261011)
    parser.add_argument('--workers', type=int, default=min(4, os.cpu_count() or 1))
    parser.add_argument('--verify', action='store_true')
    args = parser.parse_args()
    if args.samples < 1 or args.workers < 1:
        parser.error('samples and workers must be positive')
    verify_engine()
    started = time.monotonic()
    hands = ['AA', 'AKs', 'AKo', 'JTs', '22', '72o'] if args.verify else HANDS
    samples = 50_000 if args.verify else args.samples
    seed = args.seed + 1_000_000 if args.verify else args.seed
    results = {}
    print(f'{len(hands)} hands x {samples:,} trials x 7 table sizes; {args.workers} workers', flush=True)
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        jobs = {pool.submit(simulate, (hand, samples, seed + HANDS.index(hand) * 7919)): hand for hand in hands}
        for future in as_completed(jobs):
            hand, equity = future.result()
            results[hand] = equity
            if args.verify or len(results) % 10 == 0 or len(results) == len(hands):
                print(f'{len(results)}/{len(hands)} {hand}: {[round(x * 100, 2) for x in equity]} ({time.monotonic() - started:.0f}s)', flush=True)
    if args.verify:
        recorded = json.loads(DESTINATION.read_text(encoding='utf-8'))
        # Six-sigma conservative bound using Var(share) <= 1/4.
        tolerance = 6 * math.sqrt(0.25 / samples + 0.25 / recorded['meta']['samplesPerHand'])
        delta = max(abs(value - recorded['hands'][hand][index])
                    for hand, values in results.items() for index, value in enumerate(values))
        assert delta < tolerance, (delta, tolerance)
        print(f'PASS: engine, ties, shared board; independent max delta {delta:.5f} < {tolerance:.5f}', flush=True)
        return
    payload = {
        'meta': {
            'schemaVersion': 1,
            'engine': 'HenryRLee/PokerHandEvaluator',
            'engineVersion': importlib.metadata.version('phevaluator'),
            'source': 'https://github.com/HenryRLee/PokerHandEvaluator',
            'seed': args.seed,
            'samplesPerHand': samples,
            'players': [2, 3, 4, 5, 6, 7, 8],
            'method': 'Monte Carlo; uniform random opponents; no folding; shared river board; split-pot equity',
            'cardEncoding': 'rank * 4 + suit; ranks 2..A; suits c,d,h,s',
        },
        'hands': {hand: results[hand] for hand in HANDS},
    }
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    DESTINATION.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {DESTINATION} in {time.monotonic() - started:.0f}s', flush=True)


if __name__ == '__main__':
    main()
