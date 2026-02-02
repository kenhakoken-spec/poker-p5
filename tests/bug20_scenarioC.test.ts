import { describe, it, expect } from 'vitest';
import type { Position, ActionRecord, PlayerState } from '@/types/poker';
import { getAvailableActions } from '@/utils/bettingUtils';

// ヘルパー
function mkPlayer(
  position: Position,
  stack: number,
  active = true,
  isAllIn = false,
): PlayerState {
  return { position, stack, active, isAllIn };
}

function mkAction(
  position: Position,
  action: string,
  amount?: number,
  street = 'preflop' as const,
): ActionRecord {
  return {
    position,
    action: action as ActionRecord['action'],
    street,
    timestamp: Date.now(),
    ...(amount !== undefined && {
      size: { type: 'bet-relative' as const, value: amount, amount },
    }),
  };
}

function actionNames(result: { action: string }[]): string[] {
  return result.map((a) => a.action);
}

/**
 * BUG-20 Phase1: シナリオ群C（3way基本4件）
 *
 * 共通設定:
 *   - 3way preflop
 *   - プレイヤー: SB(100BB), BB(100BB), UTG(100BB)
 *   - SBブラインド=0.5BB, BBブラインド=1BB
 *   - 初期ポット=1.5BB
 *
 * trackStreetBettingState の contributions 初期値:
 *   SB: 0.5, BB: 1.0
 *
 * 各プレイヤー残スタック（ブラインド投入後）:
 *   SB: 99.5BB, BB: 99BB, UTG: 100BB
 */
describe('BUG-20 Phase1: シナリオ群C（3way基本4件）', () => {
  // =================================================================
  // シナリオ 11: 3way Open → Call → Call (全員参加)
  // =================================================================
  describe('シナリオ11: 3way Open → Call → Call', () => {
    it('UTG raises 3BB → SBの選択肢にcall/fold/raise/all-inがある', () => {
      const actions = [mkAction('UTG', 'raise', 3)];
      // UTG: 100-3=97, SB: 99.5 (blind only), BB: 99 (blind only)
      const players = [
        mkPlayer('SB', 99.5),
        mkPlayer('BB', 99),
        mkPlayer('UTG', 97),
      ];
      const result = getAvailableActions('SB', 'preflop', actions, players, 4.5);
      const names = actionNames(result);

      expect(names).toContain('fold');
      expect(names).toContain('call');    // callAmount=3-0.5=2.5, stack 99.5>2.5
      expect(names).toContain('raise');   // 3 acting players → not restricted
      expect(names).toContain('all-in');
    });

    it('SB calls → BBの選択肢にcall/fold/raise/all-inがある', () => {
      const actions = [
        mkAction('UTG', 'raise', 3),
        mkAction('SB', 'call'),
      ];
      // SB called 2.5 more: 99.5-2.5=97
      const players = [
        mkPlayer('SB', 97),
        mkPlayer('BB', 99),
        mkPlayer('UTG', 97),
      ];
      const result = getAvailableActions('BB', 'preflop', actions, players, 7);
      const names = actionNames(result);

      expect(names).toContain('fold');
      expect(names).toContain('call');    // callAmount=3-1=2, stack 99>2
      expect(names).toContain('raise');   // 3 acting players → not restricted
      expect(names).toContain('all-in');
    });
  });

  // =================================================================
  // シナリオ 12: 3way Open → 3bet → Fold → Call
  // =================================================================
  describe('シナリオ12: 3way Open → 3bet → Fold → Call', () => {
    it('UTG raises 3BB → SB 3bets 9BB → BBの選択肢にcall/fold/raise/all-inがある', () => {
      // SB 3bet: blind(0.5) + raise amount(8.5) = total 9BB
      const actions = [
        mkAction('UTG', 'raise', 3),
        mkAction('SB', 'raise', 8.5),
      ];
      // SB: 99.5-8.5=91
      const players = [
        mkPlayer('SB', 91),
        mkPlayer('BB', 99),
        mkPlayer('UTG', 97),
      ];
      const result = getAvailableActions('BB', 'preflop', actions, players, 13.5);
      const names = actionNames(result);

      expect(names).toContain('fold');
      expect(names).toContain('call');    // callAmount=9-1=8, stack 99>8
      expect(names).toContain('raise');   // 3 acting players → not restricted
      expect(names).toContain('all-in');
    });

    it('BB folds → UTGの選択肢にcall/fold/raise/all-inがある', () => {
      const actions = [
        mkAction('UTG', 'raise', 3),
        mkAction('SB', 'raise', 8.5),
        mkAction('BB', 'fold'),
      ];
      const players = [
        mkPlayer('SB', 91),
        mkPlayer('BB', 99, false), // folded
        mkPlayer('UTG', 97),
      ];
      const result = getAvailableActions('UTG', 'preflop', actions, players, 13.5);
      const names = actionNames(result);

      expect(names).toContain('fold');
      expect(names).toContain('call');    // callAmount=9-3=6, stack 97>6
      expect(names).toContain('raise');   // 2 acting players (SB,UTG) → not restricted
      expect(names).toContain('all-in');
    });
  });

  // =================================================================
  // シナリオ 13: 3way Open → 3bet all-in → Call → Fold
  // =================================================================
  describe('シナリオ13: 3way Open → 3bet all-in → Call → Fold', () => {
    it('UTG raises 3BB → SB all-in 100BB → BBの選択肢にcall/fold/all-inがある', () => {
      // SB all-in: blind(0.5) + remaining(99.5) = total 100BB
      // currentBet = 100, minRaiseSize = 100-3 = 97
      const actions = [
        mkAction('UTG', 'raise', 3),
        mkAction('SB', 'all-in', 99.5),
      ];
      const players = [
        mkPlayer('SB', 0, true, true), // all-in
        mkPlayer('BB', 99),
        mkPlayer('UTG', 97),
      ];
      const result = getAvailableActions('BB', 'preflop', actions, players, 103.5);
      const names = actionNames(result);

      expect(names).toContain('fold');
      // BUG-46: BB callAmount = 100-1 = 99, BB stack = 99
      // stack === callAmount → All-in（TH準拠: 残スタック全額投入=オールイン）
      expect(names).toContain('all-in');
      expect(names).not.toContain('call');
    });

    it('BB calls (all-in) → UTGの選択肢にcall/foldがある（isRestricted判定）', () => {
      // BB matched the all-in → BB is also all-in (stack 99 = callAmount 99)
      const actions = [
        mkAction('UTG', 'raise', 3),
        mkAction('SB', 'all-in', 99.5),
        mkAction('BB', 'call'),
      ];
      const players = [
        mkPlayer('SB', 0, true, true),
        mkPlayer('BB', 0, true, true), // BB used all remaining to call
        mkPlayer('UTG', 97),
      ];
      const result = getAvailableActions('UTG', 'preflop', actions, players, 202.5);
      const names = actionNames(result);

      // UTG is the only acting player → isRestricted = true
      expect(names).toContain('fold');
      // BUG-46: UTG callAmount = 100-3 = 97, UTG stack = 97
      // stack === callAmount → All-in（TH準拠: 残スタック全額投入=オールイン）
      expect(names).toContain('all-in');
      expect(names).not.toContain('call');
      expect(names).not.toContain('raise'); // isRestricted
    });
  });

  // =================================================================
  // シナリオ 14: 3way Open → 3bet all-in → Call → Call
  // =================================================================
  describe('シナリオ14: 3way Open → 3bet all-in → Call → Call', () => {
    it('UTG raises 3BB → SB all-in 100BB → BB calls → UTGの選択肢確認', () => {
      const actions = [
        mkAction('UTG', 'raise', 3),
        mkAction('SB', 'all-in', 99.5),
        mkAction('BB', 'call'),
      ];
      const players = [
        mkPlayer('SB', 0, true, true),
        mkPlayer('BB', 0, true, true),
        mkPlayer('UTG', 97),
      ];
      const result = getAvailableActions('UTG', 'preflop', actions, players, 202.5);
      const names = actionNames(result);

      // Same as scenario 13 step 2: UTG only acting → isRestricted
      expect(names).toContain('fold');
      // BUG-46: stack === callAmount → All-in（TH準拠）
      expect(names).toContain('all-in');
      expect(names).not.toContain('call');
      expect(names).not.toContain('raise');
    });

    it('全員アクション完了後 → 全員all-inでアクション不要', () => {
      // 100BB equal stacks: SB/BB/UTG all end up all-in after matching
      // SB: all-in 100BB total, BB: call = all-in 100BB total, UTG: call = all-in 100BB total
      const actions = [
        mkAction('UTG', 'raise', 3),
        mkAction('SB', 'all-in', 99.5),
        mkAction('BB', 'all-in', 99),
        mkAction('UTG', 'all-in', 97),
      ];
      const players = [
        mkPlayer('SB', 0, true, true),
        mkPlayer('BB', 0, true, true),
        mkPlayer('UTG', 0, true, true),
      ];

      // All players all-in → no available actions for anyone
      expect(getAvailableActions('SB', 'preflop', actions, players, 300)).toEqual([]);
      expect(getAvailableActions('BB', 'preflop', actions, players, 300)).toEqual([]);
      expect(getAvailableActions('UTG', 'preflop', actions, players, 300)).toEqual([]);
    });
  });
});
