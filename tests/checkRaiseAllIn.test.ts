import { describe, it, expect } from 'vitest';
import type { Position, ActionRecord, PlayerState } from '@/types/poker';
import {
  getAvailableActions,
  shouldSkipPlayer,
  getCurrentBetLevel,
  getLastRaiseIncrement,
} from '@/utils/bettingUtils';

function mkPlayer(position: Position, stack: number, active = true, isAllIn = false): PlayerState {
  return { position, stack, active, isAllIn };
}

function mkAction(
  position: Position,
  action: string,
  amount?: number,
  street: 'preflop' | 'flop' | 'turn' | 'river' = 'flop'
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

describe('BUG-17: check→raise/all-in シナリオ', () => {
  // ============================================================
  // シナリオ1: HU check→raise all-in
  // ============================================================
  describe('シナリオ1: HU check→raise all-in', () => {
    it('SB check → BB all-in → SBにcall/foldが出る', () => {
      const actions = [
        mkAction('SB', 'check'),
        mkAction('BB', 'all-in', 50),
      ];
      const players = [
        mkPlayer('SB', 100, true, false),
        mkPlayer('BB', 0, true, true),
      ];
      const result = getAvailableActions('SB', 'flop', actions, players, 51.5, 50);
      const names = result.map(a => a.action);

      expect(names).toContain('fold');
      expect(names).toContain('call');
    });

    it('SB check → BB all-in → BBはskip（all-in済み）', () => {
      const player = mkPlayer('BB', 0, true, true);
      expect(shouldSkipPlayer(player)).toBe(true);

      const players = [
        mkPlayer('SB', 100, true, false),
        player,
      ];
      expect(getAvailableActions('BB', 'flop', [], players, 1.5)).toEqual([]);
    });

    it('SB check → BB all-in → SBスタック十分時はcall可能', () => {
      // BB all-in 40, SB stack 100 >= lastBet 40
      const actions = [
        mkAction('SB', 'check'),
        mkAction('BB', 'all-in', 40),
      ];
      const players = [
        mkPlayer('SB', 100, true, false),
        mkPlayer('BB', 0, true, true),
      ];
      const result = getAvailableActions('SB', 'flop', actions, players, 41.5, 40);
      const names = result.map(a => a.action);

      expect(names).toContain('call');
      expect(names).not.toContain('all-in');
    });

    it('SB check → BB all-in → SBスタック不足時はall-in（コールオールイン）', () => {
      // BB all-in 100, SB stack 80 < lastBet 100
      const actions = [
        mkAction('SB', 'check'),
        mkAction('BB', 'all-in', 100),
      ];
      const players = [
        mkPlayer('SB', 80, true, false),
        mkPlayer('BB', 0, true, true),
      ];
      const result = getAvailableActions('SB', 'flop', actions, players, 101.5, 100);
      const names = result.map(a => a.action);

      expect(names).toContain('fold');
      expect(names).not.toContain('call');
      expect(names).toContain('all-in');
    });
  });

  // ============================================================
  // シナリオ2: HU check→bet
  // ============================================================
  describe('シナリオ2: HU check→bet', () => {
    it('SB check → BB bet → SBにcall/fold/raise/all-inが出る', () => {
      const actions = [
        mkAction('SB', 'check'),
        mkAction('BB', 'bet', 10),
      ];
      const players = [
        mkPlayer('SB', 100, true, false),
        mkPlayer('BB', 90, true, false),
      ];
      const result = getAvailableActions('SB', 'flop', actions, players, 11.5, 10);
      const names = result.map(a => a.action);

      expect(names).toContain('fold');
      expect(names).toContain('call');
      // 両者アクティブ → raise/all-in制限なし
      expect(names).toContain('all-in');
    });

    it('check後のbetで再アクション権が発生する（SBはcheck済みだが再度アクション可能）', () => {
      // SBがcheckした後、BBがbetしたことでSBにアクション権が戻る
      const actions = [
        mkAction('SB', 'check'),
        mkAction('BB', 'bet', 10),
      ];
      const players = [
        mkPlayer('SB', 100, true, false),
        mkPlayer('BB', 90, true, false),
      ];
      const result = getAvailableActions('SB', 'flop', actions, players, 11.5, 10);

      // SBはアクション可能（空配列ではない）
      expect(result.length).toBeGreaterThan(0);
      // fold以外の選択肢がある
      expect(result.some(a => a.action !== 'fold')).toBe(true);
    });
  });

  // ============================================================
  // シナリオ3: 3way check→check→raise all-in
  // ============================================================
  describe('シナリオ3: 3way check→check→raise all-in', () => {
    it('SB check → BB check → UTG all-in → SBにcall/foldが出る', () => {
      const actions = [
        mkAction('SB', 'check'),
        mkAction('BB', 'check'),
        mkAction('UTG', 'all-in', 50),
      ];
      const players = [
        mkPlayer('SB', 100, true, false),
        mkPlayer('BB', 100, true, false),
        mkPlayer('UTG', 0, true, true),
      ];
      const result = getAvailableActions('SB', 'flop', actions, players, 51.5, 50);
      const names = result.map(a => a.action);

      expect(names).toContain('fold');
      expect(names).toContain('call');
    });

    it('SB check → BB check → UTG all-in → BBにもcall/foldが出る', () => {
      const actions = [
        mkAction('SB', 'check'),
        mkAction('BB', 'check'),
        mkAction('UTG', 'all-in', 50),
      ];
      const players = [
        mkPlayer('SB', 100, true, false),
        mkPlayer('BB', 100, true, false),
        mkPlayer('UTG', 0, true, true),
      ];
      const result = getAvailableActions('BB', 'flop', actions, players, 51.5, 50);
      const names = result.map(a => a.action);

      expect(names).toContain('fold');
      expect(names).toContain('call');
      // SBもアクティブ → BBは制限なし
      expect(names).toContain('all-in');
    });

    it('UTGはall-in済みでskip', () => {
      const player = mkPlayer('UTG', 0, true, true);
      expect(shouldSkipPlayer(player)).toBe(true);
    });
  });

  // ============================================================
  // シナリオ4: trackStreetBettingState の検証
  //   getCurrentBetLevel / getLastRaiseIncrement 経由で確認
  // ============================================================
  describe('シナリオ4: ベッティングステート検証（check→raise）', () => {
    it('check→all-in: betLevelがall-in額になる', () => {
      const actions = [
        mkAction('SB', 'check'),
        mkAction('BB', 'all-in', 50),
      ];
      // check はベットレベルに影響しない。BB all-in 50 でcurrentBet=50
      expect(getCurrentBetLevel(actions, 'flop')).toBe(50);
    });

    it('check→bet: betLevelがbet額、raiseIncrementがbet額になる', () => {
      const actions = [
        mkAction('SB', 'check'),
        mkAction('BB', 'bet', 10),
      ];
      // フロップ初期 currentBet=0, BB bet 10 → currentBet=10, increment=10
      expect(getCurrentBetLevel(actions, 'flop')).toBe(10);
      expect(getLastRaiseIncrement(actions, 'flop')).toBe(10);
    });

    it('check→bet→raise: raiseIncrementが更新される', () => {
      const actions = [
        mkAction('SB', 'check'),
        mkAction('BB', 'bet', 10),
        mkAction('SB', 'raise', 30),
      ];
      // BB bet 10: currentBet=10, increment=10
      // SB raise 30: prev=0 → newLevel=30, increment=30-10=20
      expect(getCurrentBetLevel(actions, 'flop')).toBe(30);
      expect(getLastRaiseIncrement(actions, 'flop')).toBe(20);
    });
  });
});
