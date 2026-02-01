import { describe, it, expect } from 'vitest';
import type { Position, ActionRecord, PlayerState } from '@/types/poker';
import {
  shouldSkipPlayer,
  getCurrentBetLevel,
  getLastRaiseIncrement,
  isShortAllIn,
  didLastAggressionReopenAction,
  isRunoutNeeded,
  getAvailableActions,
  areAllPlayersAllIn,
} from '@/utils/bettingUtils';

function mkPlayer(position: Position, stack: number, active = true, isAllIn = false): PlayerState {
  return { position, stack, active, isAllIn };
}

function mkAction(position: Position, action: string, amount?: number, street = 'preflop' as const): ActionRecord {
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

describe('BUG-14: TH準拠オールインルール', () => {
  // ============================================================
  // ルール1: オールインプレイヤーのスキップ
  // ============================================================
  describe('ルール1: shouldSkipPlayer', () => {
    it('オールイン済みプレイヤーはスキップ', () => {
      expect(shouldSkipPlayer(mkPlayer('UTG', 0, true, true))).toBe(true);
    });

    it('フォールド済みプレイヤーはスキップ', () => {
      expect(shouldSkipPlayer(mkPlayer('UTG', 100, false, false))).toBe(true);
    });

    it('アクティブでチップありのプレイヤーはスキップしない', () => {
      expect(shouldSkipPlayer(mkPlayer('UTG', 100, true, false))).toBe(false);
    });

    it('getAvailableActionsがオールイン済みプレイヤーに空配列を返す', () => {
      const players = [
        mkPlayer('UTG', 0, true, true), // all-in
        mkPlayer('BB', 90, true),
      ];
      const result = getAvailableActions('UTG', 'preflop', [], players, 10);
      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // ルール2: ショートオールイン
  // ============================================================
  describe('ルール2: ショートオールイン判定', () => {
    it('オールイン額 < ベットレベル → ショート', () => {
      // allInTotal=4, currentBet=6, minRaise=3
      expect(isShortAllIn(4, 6, 3)).toBe(true);
    });

    it('オールイン額 = ベットレベル → ショート（レイズなし）', () => {
      expect(isShortAllIn(6, 6, 3)).toBe(true);
    });

    it('オールイン額がベットレベルを超えるがレイズ最低額未満 → ショート', () => {
      // allInTotal=7, currentBet=6, minRaise=3 → increment=1 < 3
      expect(isShortAllIn(7, 6, 3)).toBe(true);
    });

    it('オールイン額がレイズ最低額以上 → フルレイズ', () => {
      // allInTotal=9, currentBet=6, minRaise=3 → increment=3 >= 3
      expect(isShortAllIn(9, 6, 3)).toBe(false);
    });

    it('オールイン額がレイズ最低額を大幅に超える → フルレイズ', () => {
      expect(isShortAllIn(20, 6, 3)).toBe(false);
    });
  });

  describe('ルール2: didLastAggressionReopenAction', () => {
    it('ベットはアクション再開する', () => {
      const actions = [mkAction('UTG', 'bet', 3)];
      expect(didLastAggressionReopenAction(actions, 'preflop')).toBe(true);
    });

    it('レイズはアクション再開する', () => {
      const actions = [
        mkAction('UTG', 'bet', 3),
        mkAction('MP', 'raise', 6),
      ];
      expect(didLastAggressionReopenAction(actions, 'preflop')).toBe(true);
    });

    it('フルレイズ相当のオールインはアクション再開する', () => {
      // UTG bet 3 (increment 2 from BB=1), MP all-in 10 (increment 7 >= 2)
      const actions = [
        mkAction('UTG', 'bet', 3),
        mkAction('MP', 'all-in', 10),
      ];
      expect(didLastAggressionReopenAction(actions, 'preflop')).toBe(true);
    });

    it('ショートオールインはアクション再開しない', () => {
      // UTG bet 3 (increment 2), MP all-in 1 (MP has 0.5 + 1 = 1.5, but prev=0, newLevel=1 < currentBet=3)
      // Actually: UTG bet amount=3, prev=0 → newLevel=3, currentBet=3, increment=3-1=2, minRaise=2
      // MP all-in amount=4: prev=0, newLevel=4, increment=4-3=1 < minRaise=2 → short
      const actions = [
        mkAction('UTG', 'bet', 3),
        mkAction('MP', 'all-in', 4),
      ];
      expect(didLastAggressionReopenAction(actions, 'preflop')).toBe(false);
    });

    it('3人: ベット→ショートオールイン→フルオールイン', () => {
      // UTG bet 3 (increment 2), MP short all-in 4 (increment 1 < 2), CO full all-in 10 (increment 6 >= 2)
      const actions = [
        mkAction('UTG', 'bet', 3),
        mkAction('MP', 'all-in', 4),
        mkAction('CO', 'all-in', 10),
      ];
      expect(didLastAggressionReopenAction(actions, 'preflop')).toBe(true);
    });

    it('アグレッシブアクションなし', () => {
      const actions = [mkAction('UTG', 'check', undefined, 'flop')];
      expect(didLastAggressionReopenAction(actions, 'flop')).toBe(false);
    });
  });

  // ============================================================
  // ルール3: フルオールイン（レイズ最低額以上）
  // ============================================================
  describe('ルール3: getLastRaiseIncrement / getCurrentBetLevel', () => {
    it('プリフロップ初期状態: currentBet=1(BB), minRaise=1', () => {
      expect(getCurrentBetLevel([], 'preflop')).toBe(1);
      expect(getLastRaiseIncrement([], 'preflop')).toBe(1);
    });

    it('ポストフロップ初期状態: currentBet=0, minRaise=1', () => {
      expect(getCurrentBetLevel([], 'flop')).toBe(0);
      expect(getLastRaiseIncrement([], 'flop')).toBe(1);
    });

    it('UTG bet 3 → currentBet=3, raiseIncrement=2', () => {
      const actions = [mkAction('UTG', 'bet', 3)];
      expect(getCurrentBetLevel(actions, 'preflop')).toBe(3);
      expect(getLastRaiseIncrement(actions, 'preflop')).toBe(2);
    });

    it('UTG bet 3, MP raise 9 → currentBet=9, raiseIncrement=6', () => {
      const actions = [
        mkAction('UTG', 'bet', 3),
        mkAction('MP', 'raise', 9),
      ];
      expect(getCurrentBetLevel(actions, 'preflop')).toBe(9);
      expect(getLastRaiseIncrement(actions, 'preflop')).toBe(6);
    });

    it('フルオールインはminRaiseSizeを更新する', () => {
      // UTG bet 3 (increment 2), MP all-in 10 (increment 7 >= 2 → full)
      const actions = [
        mkAction('UTG', 'bet', 3),
        mkAction('MP', 'all-in', 10),
      ];
      expect(getCurrentBetLevel(actions, 'preflop')).toBe(10);
      expect(getLastRaiseIncrement(actions, 'preflop')).toBe(7);
    });

    it('ショートオールインはminRaiseSizeを更新しない', () => {
      // UTG bet 3 (increment 2), MP all-in 4 (increment 1 < 2 → short)
      const actions = [
        mkAction('UTG', 'bet', 3),
        mkAction('MP', 'all-in', 4),
      ];
      expect(getCurrentBetLevel(actions, 'preflop')).toBe(4);
      // minRaiseSize stays at 2 (from UTG's bet)
      expect(getLastRaiseIncrement(actions, 'preflop')).toBe(2);
    });

    it('ポストフロップ: SB bet 5, BB raise 15', () => {
      const actions = [
        mkAction('SB', 'bet', 5, 'flop'),
        mkAction('BB', 'raise', 15, 'flop'),
      ];
      // SB: prev=0, newLevel=5, increment=5-0=5
      // BB: prev=0, newLevel=15, increment=15-5=10
      expect(getCurrentBetLevel(actions, 'flop')).toBe(15);
      expect(getLastRaiseIncrement(actions, 'flop')).toBe(10);
    });
  });

  // ============================================================
  // ルール4: ランアウト判定
  // ============================================================
  describe('ルール4: isRunoutNeeded', () => {
    it('全員オールインでランアウト', () => {
      const players = [
        mkPlayer('UTG', 0, true, true),
        mkPlayer('MP', 0, true, true),
        mkPlayer('BB', 0, true, true),
      ];
      expect(isRunoutNeeded(players)).toBe(true);
    });

    it('1人のみアクティブ（fold済み） → ランアウトではない（ハンド終了）', () => {
      const players = [
        mkPlayer('UTG', 100, true),
        mkPlayer('MP', 100, false), // folded
        mkPlayer('BB', 100, false), // folded
      ];
      expect(isRunoutNeeded(players)).toBe(false);
    });

    it('1人チップあり + 他全員オールイン → ランアウト', () => {
      const players = [
        mkPlayer('UTG', 50, true, false),
        mkPlayer('MP', 0, true, true),
        mkPlayer('BB', 0, true, true),
      ];
      expect(isRunoutNeeded(players)).toBe(true);
    });

    it('2人チップあり → ランアウトではない', () => {
      const players = [
        mkPlayer('UTG', 50, true),
        mkPlayer('MP', 50, true),
        mkPlayer('BB', 0, true, true),
      ];
      expect(isRunoutNeeded(players)).toBe(false);
    });

    it('全員アクティブでチップあり → ランアウトではない', () => {
      const players = [
        mkPlayer('UTG', 100, true),
        mkPlayer('MP', 100, true),
        mkPlayer('BB', 100, true),
      ];
      expect(isRunoutNeeded(players)).toBe(false);
    });
  });

  // ============================================================
  // ルール5: 残り1人の制限
  // ============================================================
  describe('ルール5: 残り1人 vs all-in の制限', () => {
    it('1人 vs all-in: fold/callのみ（raise/all-in不可）', () => {
      const actions = [mkAction('UTG', 'all-in', 50)];
      const players = [
        mkPlayer('UTG', 0, true, true),  // all-in
        mkPlayer('BB', 90, true, false),  // only acting player
        mkPlayer('SB', 100, false),       // folded
      ];
      const result = getAvailableActions('BB', 'preflop', actions, players, 51.5, 50);
      const actionNames = result.map(a => a.action);
      expect(actionNames).toContain('fold');
      expect(actionNames).toContain('call');
      expect(actionNames).not.toContain('raise');
      expect(actionNames).not.toContain('all-in');
      expect(actionNames).not.toContain('bet');
    });

    it('1人 vs all-in: スタック不足時はfold/all-in（コールオールイン）', () => {
      const actions = [mkAction('UTG', 'all-in', 50)];
      const players = [
        mkPlayer('UTG', 0, true, true),
        mkPlayer('BB', 30, true, false),  // stack < lastBet
        mkPlayer('SB', 100, false),
      ];
      const result = getAvailableActions('BB', 'preflop', actions, players, 51.5, 50);
      const actionNames = result.map(a => a.action);
      expect(actionNames).toContain('fold');
      expect(actionNames).toContain('all-in'); // call-all-in
      expect(actionNames).not.toContain('call');
      expect(actionNames).not.toContain('raise');
    });

    it('2人アクティブ（どちらもチップあり）→ 制限なし', () => {
      const actions = [mkAction('UTG', 'bet', 3)];
      const players = [
        mkPlayer('UTG', 97, true),
        mkPlayer('BB', 97, true),
        mkPlayer('SB', 100, false),
      ];
      const result = getAvailableActions('BB', 'preflop', actions, players, 4.5, 3);
      const actionNames = result.map(a => a.action);
      expect(actionNames).toContain('fold');
      expect(actionNames).toContain('call');
      expect(actionNames).toContain('all-in');
    });
  });

  // ============================================================
  // areAllPlayersAllIn バグ修正
  // ============================================================
  describe('areAllPlayersAllIn バグ修正', () => {
    it('全員オールイン → true', () => {
      const players = [
        mkPlayer('UTG', 0, true, true),
        mkPlayer('BB', 0, true, true),
      ];
      expect(areAllPlayersAllIn(players)).toBe(true);
    });

    it('1人チップあり → false', () => {
      const players = [
        mkPlayer('UTG', 0, true, true),
        mkPlayer('BB', 50, true, false),
      ];
      expect(areAllPlayersAllIn(players)).toBe(false);
    });

    it('全員非アクティブ → false', () => {
      const players = [
        mkPlayer('UTG', 100, false),
        mkPlayer('BB', 100, false),
      ];
      expect(areAllPlayersAllIn(players)).toBe(false);
    });

    it('stack=0 but isAllIn=false → true（スタック0はオールイン扱い）', () => {
      const players = [
        mkPlayer('UTG', 0, true, false),
        mkPlayer('BB', 0, true, false),
      ];
      expect(areAllPlayersAllIn(players)).toBe(true);
    });
  });

  // ============================================================
  // 統合シナリオテスト
  // ============================================================
  describe('統合シナリオ', () => {
    it('HU: SB all-in, BB がcall/fold選択', () => {
      const actions = [mkAction('SB', 'all-in', 100)];
      const players = [
        mkPlayer('SB', 0, true, true),
        mkPlayer('BB', 99, true, false),
      ];
      const result = getAvailableActions('BB', 'preflop', actions, players, 101.5, 100);
      const actionNames = result.map(a => a.action);
      expect(actionNames).toContain('fold');
      // BB stack(99) < lastBet(100) → no call, only all-in
      expect(actionNames).not.toContain('call');
      expect(actionNames).toContain('all-in');
      expect(actionNames).not.toContain('raise');
    });

    it('3人: UTG bet 3, MP short all-in 4 → ショート判定', () => {
      const actions = [
        mkAction('UTG', 'bet', 3),
        mkAction('MP', 'all-in', 4),
      ];
      // ショートオールイン確認
      expect(didLastAggressionReopenAction(actions, 'preflop')).toBe(false);

      // BB（残り1人ではない、UTGもアクティブ）→ 制限なし
      const players = [
        mkPlayer('UTG', 97, true),
        mkPlayer('MP', 0, true, true),
        mkPlayer('BB', 97, true),
        mkPlayer('SB', 100, false),
      ];
      const result = getAvailableActions('BB', 'preflop', actions, players, 8.5, 4);
      const actionNames = result.map(a => a.action);
      expect(actionNames).toContain('fold');
      expect(actionNames).toContain('call');
      expect(actionNames).toContain('all-in');
    });

    it('3人: UTG bet 3, MP full all-in 10 → アクション再開', () => {
      const actions = [
        mkAction('UTG', 'bet', 3),
        mkAction('MP', 'all-in', 10),
      ];
      expect(didLastAggressionReopenAction(actions, 'preflop')).toBe(true);
    });

    it('全員オールイン → ランアウト判定', () => {
      const players = [
        mkPlayer('UTG', 0, true, true),
        mkPlayer('MP', 0, true, true),
        mkPlayer('CO', 0, true, true),
        mkPlayer('SB', 100, false),
        mkPlayer('BB', 100, false),
      ];
      expect(isRunoutNeeded(players)).toBe(true);
      expect(areAllPlayersAllIn(players)).toBe(true);
    });

    it('SBオールイン済み → getAvailableActionsは空配列', () => {
      const players = [
        mkPlayer('SB', 0, true, true),
        mkPlayer('BB', 90, true),
      ];
      expect(getAvailableActions('SB', 'preflop', [], players, 10)).toEqual([]);
    });
  });
});
