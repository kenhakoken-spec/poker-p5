/**
 * UI-24: ポーカーハンド役判定
 * ヒーローカード(2枚) + ボード(3〜5枚)から最強の5枚を選び役名を返す
 * カード形式: "A♠", "K♥", "Q♦", "J♣", "10♠" 等
 */

const RANK_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS = ['♠', '♥', '♦', '♣'];

function rankValue(rank: string): number {
  return RANK_ORDER.indexOf(rank);
}

function parseCard(card: string): { rank: string; suit: string } | null {
  if (!card || card.length < 2) return null;
  const suit = card.slice(-1);
  const rank = card.slice(0, -1);
  if (!SUITS.includes(suit) || !RANK_ORDER.includes(rank)) return null;
  return { rank, suit };
}

/** 5枚の手札の役ランクを数値で返す (高い方が強い) + タイブレーク用キッカー配列 */
function evaluate5(cards: { rank: string; suit: string }[]): { handRank: number; kickers: number[]; name: string } {
  const values = cards.map(c => rankValue(c.rank)).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  // ストレート判定 (A-low含む)
  let isStraight = false;
  let straightHigh = values[0];

  // 通常ストレート
  if (values[0] - values[4] === 4 && new Set(values).size === 5) {
    isStraight = true;
    straightHigh = values[0];
  }
  // A-low ストレート (A,2,3,4,5 → values=[12,3,2,1,0])
  if (!isStraight && values[0] === 12 && values[1] === 3 && values[2] === 2 && values[3] === 1 && values[4] === 0) {
    isStraight = true;
    straightHigh = 3; // 5-high
  }

  // ランク別カウント
  const counts = new Map<number, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  if (isStraight && isFlush) {
    if (straightHigh === 12) {
      return { handRank: 9, kickers: [straightHigh], name: 'Royal Flush' };
    }
    return { handRank: 8, kickers: [straightHigh], name: 'Straight Flush' };
  }
  if (groups[0][1] === 4) {
    const quad = groups[0][0];
    const kicker = groups[1][0];
    return { handRank: 7, kickers: [quad, kicker], name: 'Quads' };
  }
  if (groups[0][1] === 3 && groups[1][1] === 2) {
    return { handRank: 6, kickers: [groups[0][0], groups[1][0]], name: 'Full House' };
  }
  if (isFlush) {
    return { handRank: 5, kickers: values, name: 'Flush' };
  }
  if (isStraight) {
    return { handRank: 4, kickers: [straightHigh], name: 'Straight' };
  }
  if (groups[0][1] === 3) {
    const trips = groups[0][0];
    const rest = values.filter(v => v !== trips).sort((a, b) => b - a);
    return { handRank: 3, kickers: [trips, ...rest], name: 'Trips' };
  }
  if (groups[0][1] === 2 && groups[1][1] === 2) {
    const high = Math.max(groups[0][0], groups[1][0]);
    const low = Math.min(groups[0][0], groups[1][0]);
    const kicker = values.find(v => v !== high && v !== low)!;
    return { handRank: 2, kickers: [high, low, kicker], name: 'Two Pair' };
  }
  if (groups[0][1] === 2) {
    const pair = groups[0][0];
    const rest = values.filter(v => v !== pair).sort((a, b) => b - a);
    return { handRank: 1, kickers: [pair, ...rest], name: 'Pair' };
  }
  return { handRank: 0, kickers: values, name: 'High Card' };
}

/** C(n,5) の全組み合わせを列挙 */
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

/**
 * ヒーローカード + ボードカードから最強役名を返す
 * @param heroCards ヒーローの2枚 (e.g. ["A♠", "K♥"])
 * @param boardCards ボードの3〜5枚 (e.g. ["Q♦", "J♣", "10♠"])
 * @returns 役名 (e.g. "Straight")
 */
export function evaluateHand(heroCards: string[], boardCards: string[]): string {
  const allCards = [...heroCards, ...boardCards]
    .map(parseCard)
    .filter((c): c is { rank: string; suit: string } => c !== null);

  if (allCards.length < 5) return '';

  const combos = combinations(allCards, 5);
  let best: { handRank: number; kickers: number[]; name: string } | null = null;

  for (const combo of combos) {
    const result = evaluate5(combo);
    if (!best) {
      best = result;
      continue;
    }
    if (result.handRank > best.handRank) {
      best = result;
    } else if (result.handRank === best.handRank) {
      for (let i = 0; i < result.kickers.length; i++) {
        if (result.kickers[i] > (best.kickers[i] ?? 0)) {
          best = result;
          break;
        }
        if (result.kickers[i] < (best.kickers[i] ?? 0)) break;
      }
    }
  }

  return best?.name ?? '';
}
