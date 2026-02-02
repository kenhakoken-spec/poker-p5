import { describe, it, expect } from 'vitest';
import { evaluateHandRank } from '@/utils/handRank';

/**
 * handRank テスト（TDD: テスト先行）
 *
 * カード形式: "A♠", "K♥", "Q♦", "J♣", "10♠" 等
 * 標準ハンドランク名:
 *   Royal Flush, Straight Flush, Four of a Kind, Full House,
 *   Flush, Straight, Three of a Kind, Two Pair, One Pair, High Card
 */

describe('evaluateHandRank', () => {
  // ========================================
  // ■ 全10種ハンドランク（フロップ: hero2枚 + board3枚 = 5枚）
  // ========================================
  describe('全10種ハンドランク（5枚: フロップ）', () => {
    it('1. Royal Flush', () => {
      expect(evaluateHandRank(['A♠', 'K♠'], ['Q♠', 'J♠', '10♠'])).toBe('Royal Flush');
    });

    it('2. Straight Flush', () => {
      expect(evaluateHandRank(['9♥', '8♥'], ['7♥', '6♥', '5♥'])).toBe('Straight Flush');
    });

    it('3. Four of a Kind', () => {
      expect(evaluateHandRank(['A♠', 'A♥'], ['A♦', 'A♣', '9♠'])).toBe('Four of a Kind');
    });

    it('4. Full House', () => {
      expect(evaluateHandRank(['A♠', 'A♥'], ['A♦', '7♣', '7♠'])).toBe('Full House');
    });

    it('5. Flush', () => {
      expect(evaluateHandRank(['A♠', 'K♠'], ['3♠', '7♠', '9♠'])).toBe('Flush');
    });

    it('6. Straight', () => {
      expect(evaluateHandRank(['5♠', '6♥'], ['7♦', '8♣', '9♠'])).toBe('Straight');
    });

    it('7. Three of a Kind', () => {
      expect(evaluateHandRank(['A♠', 'A♥'], ['A♦', '7♣', '9♠'])).toBe('Three of a Kind');
    });

    it('8. Two Pair', () => {
      expect(evaluateHandRank(['A♠', 'A♥'], ['3♦', '3♣', '9♠'])).toBe('Two Pair');
    });

    it('9. One Pair', () => {
      expect(evaluateHandRank(['A♠', 'A♥'], ['3♦', '7♣', '9♠'])).toBe('One Pair');
    });

    it('10. High Card', () => {
      expect(evaluateHandRank(['A♠', 'K♥'], ['3♦', '7♣', '9♠'])).toBe('High Card');
    });
  });

  // ========================================
  // ■ エッジケース
  // ========================================
  describe('エッジケース', () => {
    it('Wheel (A-2-3-4-5): ローストレート', () => {
      expect(evaluateHandRank(['A♠', '2♥'], ['3♦', '4♣', '5♠'])).toBe('Straight');
    });

    it('Broadway Straight (A-K-Q-J-10): 異スート', () => {
      expect(evaluateHandRank(['A♠', 'K♥'], ['Q♦', 'J♣', '10♠'])).toBe('Straight');
    });

    it('Royal Flush: ♥スート', () => {
      expect(evaluateHandRank(['A♥', 'K♥'], ['Q♥', 'J♥', '10♥'])).toBe('Royal Flush');
    });

    it('5枚未満は空文字', () => {
      expect(evaluateHandRank(['A♠', 'K♥'], ['3♦'])).toBe('');
    });

    it('ボード3枚（フロップ）で正しく判定', () => {
      expect(evaluateHandRank(['J♠', 'J♥'], ['2♦', '5♣', '9♠'])).toBe('One Pair');
    });

    it('フラッシュ vs ストレート: 7枚からフラッシュを選ぶ', () => {
      // ストレート候補: 8,9,10,J,Q  フラッシュ候補: J♥,Q♥,9♥,3♥,5♥
      expect(evaluateHandRank(['J♥', '9♥'], ['Q♥', '10♣', '8♣', '3♥', '5♥'])).toBe('Flush');
    });
  });

  // ========================================
  // ■ 7枚（リバー）から最強5枚選択
  // ========================================
  describe('7枚から最強5枚選択（リバー）', () => {
    it('7枚からFull Houseを抽出', () => {
      // Hero: A♠,A♥ + Board: A♦,K♣,K♥,9♠,3♦
      // Best: A♠,A♥,A♦,K♣,K♥ = Full House
      expect(evaluateHandRank(['A♠', 'A♥'], ['A♦', 'K♣', 'K♥', '9♠', '3♦'])).toBe('Full House');
    });

    it('7枚からStraight Flushを抽出', () => {
      // Hero: 6♥,7♥ + Board: 8♥,9♥,10♥,K♠,2♦
      // Best: 6♥,7♥,8♥,9♥,10♥ = Straight Flush
      expect(evaluateHandRank(['6♥', '7♥'], ['8♥', '9♥', '10♥', 'K♠', '2♦'])).toBe('Straight Flush');
    });

    it('7枚からFour of a Kindを抽出', () => {
      // Hero: Q♠,Q♥ + Board: Q♦,Q♣,A♠,K♠,3♦
      // Best: Q♠,Q♥,Q♦,Q♣,A♠ = Four of a Kind
      expect(evaluateHandRank(['Q♠', 'Q♥'], ['Q♦', 'Q♣', 'A♠', 'K♠', '3♦'])).toBe('Four of a Kind');
    });

    it('7枚で3ペア候補から最強Two Pairを選ぶ', () => {
      // Hero: A♠,K♥ + Board: A♦,K♣,Q♠,Q♦,3♠
      // Best: AA+KK (Aces and Kings)
      expect(evaluateHandRank(['A♠', 'K♥'], ['A♦', 'K♣', 'Q♠', 'Q♦', '3♠'])).toBe('Two Pair');
    });

    it('リバーでRoyal Flush完成', () => {
      // Hero: A♥,K♥ + Board: Q♥,J♥,10♥,3♠,7♦
      expect(evaluateHandRank(['A♥', 'K♥'], ['Q♥', 'J♥', '10♥', '3♠', '7♦'])).toBe('Royal Flush');
    });

    it('ボードにストレートがあるがHEROがFlushを持つ', () => {
      // Hero: A♠,K♠ + Board: Q♠,J♦,10♣,9♠,2♠
      // Straight候補: A,K,Q,J,10  Flush候補: A♠,K♠,Q♠,9♠,2♠
      expect(evaluateHandRank(['A♠', 'K♠'], ['Q♠', 'J♦', '10♣', '9♠', '2♠'])).toBe('Flush');
    });
  });

  // ========================================
  // ■ ターン（6枚: hero2枚 + board4枚）
  // ========================================
  describe('ターン（6枚）', () => {
    it('フロップOne Pair → ターンTwo Pair', () => {
      expect(evaluateHandRank(['A♠', 'K♥'], ['A♦', '3♣', '7♠'])).toBe('One Pair');
      expect(evaluateHandRank(['A♠', 'K♥'], ['A♦', '3♣', '7♠', 'K♦'])).toBe('Two Pair');
    });

    it('フロップThree of a Kind → ターンFull House', () => {
      expect(evaluateHandRank(['8♠', '8♥'], ['8♦', 'K♣', '2♠'])).toBe('Three of a Kind');
      expect(evaluateHandRank(['8♠', '8♥'], ['8♦', 'K♣', '2♠', 'K♥'])).toBe('Full House');
    });

    it('ターンでStraight完成', () => {
      expect(evaluateHandRank(['5♠', '6♥'], ['7♦', '8♣', 'K♠'])).not.toBe('Straight');
      expect(evaluateHandRank(['5♠', '6♥'], ['7♦', '8♣', 'K♠', '9♥'])).toBe('Straight');
    });

    it('ターンでFlush完成', () => {
      expect(evaluateHandRank(['A♠', 'K♠'], ['3♠', '7♠', '9♥'])).not.toBe('Flush');
      expect(evaluateHandRank(['A♠', 'K♠'], ['3♠', '7♠', '9♥', '2♠'])).toBe('Flush');
    });
  });
});
