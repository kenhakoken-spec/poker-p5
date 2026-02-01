import { describe, it, expect } from 'vitest';
import { evaluateHand } from '@/utils/handEvaluator';

/**
 * handEvaluator テスト（テストファースト方式）
 *
 * カード形式: "A♠", "K♥", "Q♦", "J♣", "10♠" 等
 * Suits: ♠(spade), ♥(heart), ♦(diamond), ♣(club)
 * Ranks: 2,3,4,5,6,7,8,9,10,J,Q,K,A
 */

describe('evaluateHand', () => {
  // ========================================
  // ■ 基本役判定（フロップ: hero2枚 + board3枚 = 5枚）
  // ========================================
  describe('基本役判定（フロップ: 5枚）', () => {
    it('High Card: 役なし', () => {
      const result = evaluateHand(['A♠', 'K♥'], ['3♦', '7♣', '9♠']);
      expect(result).toBe('High Card');
    });

    it('Pair: ワンペア', () => {
      const result = evaluateHand(['A♠', 'A♥'], ['3♦', '7♣', '9♠']);
      expect(result).toBe('Pair');
    });

    it('Two Pair: ツーペア', () => {
      const result = evaluateHand(['A♠', 'A♥'], ['3♦', '3♣', '9♠']);
      expect(result).toBe('Two Pair');
    });

    it('Trips: スリーカード', () => {
      const result = evaluateHand(['A♠', 'A♥'], ['A♦', '7♣', '9♠']);
      expect(result).toBe('Trips');
    });

    it('Straight: ストレート', () => {
      const result = evaluateHand(['5♠', '6♥'], ['7♦', '8♣', '9♠']);
      expect(result).toBe('Straight');
    });

    it('Flush: フラッシュ', () => {
      const result = evaluateHand(['A♠', 'K♠'], ['3♠', '7♠', '9♠']);
      expect(result).toBe('Flush');
    });

    it('Full House: フルハウス', () => {
      const result = evaluateHand(['A♠', 'A♥'], ['A♦', '7♣', '7♠']);
      expect(result).toBe('Full House');
    });

    it('Quads: フォーカード', () => {
      const result = evaluateHand(['A♠', 'A♥'], ['A♦', 'A♣', '9♠']);
      expect(result).toBe('Quads');
    });

    it('Straight Flush: ストレートフラッシュ', () => {
      const result = evaluateHand(['5♠', '6♠'], ['7♠', '8♠', '9♠']);
      expect(result).toBe('Straight Flush');
    });

    it('Royal Flush: ロイヤルフラッシュ', () => {
      const result = evaluateHand(['A♠', 'K♠'], ['Q♠', 'J♠', '10♠']);
      expect(result).toBe('Royal Flush');
    });
  });

  // ========================================
  // ■ エッジケース
  // ========================================
  describe('エッジケース', () => {
    it('ホイール（A-2-3-4-5）はストレートになる', () => {
      const result = evaluateHand(['A♠', '2♥'], ['3♦', '4♣', '5♠']);
      expect(result).toBe('Straight');
    });

    it('フラッシュ vs ストレート: フラッシュが勝つ（7枚からベスト5選択）', () => {
      // Hero: J♥, 9♥ + Board: Q♥, 10♣, 8♣, 3♥, 5♥
      // ストレート候補: 8,9,10,J,Q（異スート）
      // フラッシュ候補: J♥,Q♥,9♥,3♥,5♥（ハート5枚）
      // フラッシュ(rank5) > ストレート(rank4) → "Flush"
      const result = evaluateHand(['J♥', '9♥'], ['Q♥', '10♣', '8♣', '3♥', '5♥']);
      expect(result).toBe('Flush');
    });

    it('ボードペア + ヒーローペア = Two Pair', () => {
      const result = evaluateHand(['K♠', 'K♥'], ['3♦', '3♣', '9♠']);
      expect(result).toBe('Two Pair');
    });

    it('ヒーローポケットペア + ボードにトリップス材料なし = Pair', () => {
      const result = evaluateHand(['J♠', 'J♥'], ['2♦', '5♣', '9♠']);
      expect(result).toBe('Pair');
    });

    it('5枚未満の場合は空文字を返す', () => {
      const result = evaluateHand(['A♠', 'K♥'], ['3♦']);
      expect(result).toBe('');
    });
  });

  // ========================================
  // ■ ターン（hero2枚 + board4枚 = 6枚、C(6,5)=6通り）
  // ========================================
  describe('ターン（6枚）', () => {
    it('フロップでPair → ターンでTwo Pairに改善', () => {
      // フロップ: A♠,K♥ + A♦,3♣,7♠ = Pair (Aces)
      const flopResult = evaluateHand(['A♠', 'K♥'], ['A♦', '3♣', '7♠']);
      expect(flopResult).toBe('Pair');

      // ターン: K♦が落ちて Two Pair (Aces and Kings)
      const turnResult = evaluateHand(['A♠', 'K♥'], ['A♦', '3♣', '7♠', 'K♦']);
      expect(turnResult).toBe('Two Pair');
    });

    it('ターンでTripsに改善', () => {
      // フロップ: 8♠,8♥ + 8♦,K♣,2♠ = Trips
      // → フロップ時点で既にTrips
      const flopResult = evaluateHand(['8♠', '8♥'], ['8♦', 'K♣', '2♠']);
      expect(flopResult).toBe('Trips');

      // ターン: K♥が落ちて Full House (8s full of Kings)
      const turnResult = evaluateHand(['8♠', '8♥'], ['8♦', 'K♣', '2♠', 'K♥']);
      expect(turnResult).toBe('Full House');
    });

    it('ターンでストレート完成', () => {
      // フロップ: 5♠,6♥ + 7♦,8♣,K♠ = High Card (ストレート未完成)
      const flopResult = evaluateHand(['5♠', '6♥'], ['7♦', '8♣', 'K♠']);
      expect(flopResult).not.toBe('Straight');

      // ターン: 9♥が落ちてストレート完成 (5-6-7-8-9)
      const turnResult = evaluateHand(['5♠', '6♥'], ['7♦', '8♣', 'K♠', '9♥']);
      expect(turnResult).toBe('Straight');
    });
  });

  // ========================================
  // ■ リバー（hero2枚 + board5枚 = 7枚、C(7,5)=21通り）
  // ========================================
  describe('リバー（7枚）', () => {
    it('リバーで最強5枚を正しく選ぶ: Full House', () => {
      // Hero: A♠,A♥ + Board: A♦,K♣,K♥,9♠,3♦ = 7枚
      // ベスト5: A♠,A♥,A♦,K♣,K♥ = Full House (Aces full of Kings)
      const result = evaluateHand(['A♠', 'A♥'], ['A♦', 'K♣', 'K♥', '9♠', '3♦']);
      expect(result).toBe('Full House');
    });

    it('ボードにストレートがあるがヒーローがフラッシュを持つケース', () => {
      // Hero: A♠,K♠ + Board: Q♠,J♦,10♣,9♠,2♠ = 7枚
      // ボード+ヒーローでストレート: A,K,Q,J,10（異スート）
      // ヒーローフラッシュ: A♠,K♠,Q♠,9♠,2♠（スペード5枚）
      // フラッシュ(rank5) > ストレート(rank4)
      const result = evaluateHand(['A♠', 'K♠'], ['Q♠', 'J♦', '10♣', '9♠', '2♠']);
      expect(result).toBe('Flush');
    });

    it('7枚からストレートフラッシュを正しく抽出', () => {
      // Hero: 6♥,7♥ + Board: 8♥,9♥,10♥,K♠,2♦ = 7枚
      // ベスト5: 6♥,7♥,8♥,9♥,10♥ = Straight Flush
      const result = evaluateHand(['6♥', '7♥'], ['8♥', '9♥', '10♥', 'K♠', '2♦']);
      expect(result).toBe('Straight Flush');
    });

    it('7枚からQuadsを正しく抽出', () => {
      // Hero: Q♠,Q♥ + Board: Q♦,Q♣,A♠,K♠,3♦ = 7枚
      // ベスト5: Q♠,Q♥,Q♦,Q♣,A♠ = Quads (Queens, A kicker)
      const result = evaluateHand(['Q♠', 'Q♥'], ['Q♦', 'Q♣', 'A♠', 'K♠', '3♦']);
      expect(result).toBe('Quads');
    });

    it('7枚で複数Two Pair候補がある場合、最強のTwo Pairを選ぶ', () => {
      // Hero: A♠,K♥ + Board: A♦,K♣,Q♠,Q♦,3♠ = 7枚
      // 候補: AA+KK, AA+QQ, KK+QQ
      // ベスト: AA+KK+Q = Two Pair (Aces and Kings)
      // ※ 実際には3ペアだが5枚制約でTwo Pair
      const result = evaluateHand(['A♠', 'K♥'], ['A♦', 'K♣', 'Q♠', 'Q♦', '3♠']);
      expect(result).toBe('Two Pair');
    });

    it('リバーでロイヤルフラッシュ完成', () => {
      // Hero: A♥,K♥ + Board: Q♥,J♥,10♥,3♠,7♦ = 7枚
      // ベスト5: A♥,K♥,Q♥,J♥,10♥ = Royal Flush
      const result = evaluateHand(['A♥', 'K♥'], ['Q♥', 'J♥', '10♥', '3♠', '7♦']);
      expect(result).toBe('Royal Flush');
    });
  });
});
