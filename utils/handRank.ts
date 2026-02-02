/**
 * FEAT: HEROハンドランク判定（標準ポーカー名称版）
 * 既存の evaluateHand をラップし、標準的なハンドランク名を返す。
 *
 * 名称マッピング:
 *   evaluateHand        → evaluateHandRank
 *   'Quads'             → 'Four of a Kind'
 *   'Trips'             → 'Three of a Kind'
 *   'Pair'              → 'One Pair'
 *   その他はそのまま
 */
import { evaluateHand } from './handEvaluator';

const NAME_MAP: Record<string, string> = {
  'Quads': 'Four of a Kind',
  'Trips': 'Three of a Kind',
  'Pair': 'One Pair',
};

/**
 * HEROカード(2枚) + ボードカード(3〜5枚) から最強役の標準名を返す
 * @param heroCards HEROの2枚 (e.g. ["A♠", "K♥"])
 * @param boardCards ボードの3〜5枚 (e.g. ["Q♦", "J♣", "10♠"])
 * @returns 標準ハンドランク名 ("Royal Flush", "Four of a Kind", "One Pair" 等)
 */
export function evaluateHandRank(heroCards: string[], boardCards: string[]): string {
  const name = evaluateHand(heroCards, boardCards);
  return NAME_MAP[name] ?? name;
}
