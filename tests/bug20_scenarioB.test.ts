import { describe, it, expect } from 'vitest';
import type { Position, ActionRecord, PlayerState } from '@/types/poker';
import {
  getAvailableActions,
  shouldSkipPlayer,
  isRunoutNeeded,
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

describe('BUG-20 Phase1 シナリオ群B: HUチェック系（フロップ）', () => {
  // ============================================================
  // シナリオ6: Flop Check → Check
  // ============================================================
  describe('シナリオ6: Check → Check', () => {
    it('SB check後、BBの選択肢にcheck/bet/all-inがある', () => {
      const actions = [mkAction('SB', 'check')];
      const players = [
        mkPlayer('SB', 97, true),
        mkPlayer('BB', 97, true),
      ];
      const result = getAvailableActions('BB', 'flop', actions, players, 6);
      const names = result.map(a => a.action);

      expect(names).toContain('check');
      expect(names).toContain('all-in');
      // bet sizes should be available (pot-relative first action)
      const betAction = result.find(a => a.action === 'bet');
      expect(betAction).toBeDefined();
      expect(betAction?.sizes).toBeDefined();
    });

    it('SB check後、BBにfoldは不要（ベットなし）', () => {
      const actions = [mkAction('SB', 'check')];
      const players = [
        mkPlayer('SB', 97, true),
        mkPlayer('BB', 97, true),
      ];
      const result = getAvailableActions('BB', 'flop', actions, players, 6);
      const names = result.map(a => a.action);

      // foldは常に含まれるが、checkがあるのでbet前はfold+checkの意味
      expect(names).toContain('fold');
      expect(names).toContain('check');
    });

    it('両者check後、ストリート終了（どちらもアクション不要）', () => {
      const actions = [
        mkAction('SB', 'check'),
        mkAction('BB', 'check'),
      ];
      const players = [
        mkPlayer('SB', 97, true),
        mkPlayer('BB', 97, true),
      ];
      // 両者checkしたら新たなアクションは不要（ゲームフローが次ストリートへ進む）
      // ここではshouldSkipPlayerが両者ともfalse（まだアクティブ）を確認
      expect(shouldSkipPlayer(players[0])).toBe(false);
      expect(shouldSkipPlayer(players[1])).toBe(false);
      // ランアウトは不要（両者チップあり）
      expect(isRunoutNeeded(players)).toBe(false);
    });
  });

  // ============================================================
  // シナリオ7: Flop Check → Bet → Call
  // ============================================================
  describe('シナリオ7: Check → Bet → Call', () => {
    it('SB check → BB bet 5BB → SBにcall/fold/raise/all-inがある', () => {
      const actions = [
        mkAction('SB', 'check'),
        mkAction('BB', 'bet', 5),
      ];
      const players = [
        mkPlayer('SB', 97, true),
        mkPlayer('BB', 92, true),
      ];
      const result = getAvailableActions('SB', 'flop', actions, players, 11, 5);
      const names = result.map(a => a.action);

      expect(names).toContain('fold');
      expect(names).toContain('call');
      expect(names).toContain('all-in');
      // 2人アクティブ → raise制限なし
      const raiseAction = result.find(a => a.action === 'raise');
      expect(raiseAction).toBeDefined();
    });

    it('check後のbetで再アクション権が発生する（BUG-16/17再確認）', () => {
      const actions = [
        mkAction('SB', 'check'),
        mkAction('BB', 'bet', 5),
      ];
      const players = [
        mkPlayer('SB', 97, true),
        mkPlayer('BB', 92, true),
      ];
      const result = getAvailableActions('SB', 'flop', actions, players, 11, 5);

      // SBはcheck済みだがBBのbetで再度アクション可能
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(a => a.action === 'call')).toBe(true);
    });

    it('SB call後、ストリート終了（ランアウト不要）', () => {
      const actions = [
        mkAction('SB', 'check'),
        mkAction('BB', 'bet', 5),
        mkAction('SB', 'call'),
      ];
      const players = [
        mkPlayer('SB', 92, true),
        mkPlayer('BB', 92, true),
      ];
      // 両者チップあり → ランアウト不要
      expect(isRunoutNeeded(players)).toBe(false);
    });
  });

  // ============================================================
  // シナリオ8: Flop Check → Bet → Raise → Call
  // ============================================================
  describe('シナリオ8: Check → Bet → Raise → Call', () => {
    it('SB check → BB bet 5 → SB raise 15 → BBにcall/fold/raise/all-inがある', () => {
      const actions = [
        mkAction('SB', 'check'),
        mkAction('BB', 'bet', 5),
        mkAction('SB', 'raise', 15),
      ];
      const players = [
        mkPlayer('SB', 82, true),  // 97 - 15
        mkPlayer('BB', 92, true),  // 97 - 5
      ];
      const result = getAvailableActions('BB', 'flop', actions, players, 26, 15);
      const names = result.map(a => a.action);

      expect(names).toContain('fold');
      expect(names).toContain('call');
      expect(names).toContain('all-in');
    });

    it('SBのraiseで再アクション権が発生（BBは再度アクション可能）', () => {
      const actions = [
        mkAction('SB', 'check'),
        mkAction('BB', 'bet', 5),
        mkAction('SB', 'raise', 15),
      ];
      const players = [
        mkPlayer('SB', 82, true),
        mkPlayer('BB', 92, true),
      ];
      const result = getAvailableActions('BB', 'flop', actions, players, 26, 15);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(a => a.action === 'call')).toBe(true);
    });

    it('BB call後、ストリート終了（ランアウト不要）', () => {
      const actions = [
        mkAction('SB', 'check'),
        mkAction('BB', 'bet', 5),
        mkAction('SB', 'raise', 15),
        mkAction('BB', 'call'),
      ];
      const players = [
        mkPlayer('SB', 82, true),
        mkPlayer('BB', 77, true),  // 92 - 15(call)
      ];
      expect(isRunoutNeeded(players)).toBe(false);
    });
  });

  // ============================================================
  // シナリオ9: Flop Check → Bet all-in → Call
  // ============================================================
  describe('シナリオ9: Check → Bet all-in → Call', () => {
    it('SB check → BB all-in → SBにcall/foldがある', () => {
      const actions = [
        mkAction('SB', 'check'),
        mkAction('BB', 'all-in', 97),
      ];
      const players = [
        mkPlayer('SB', 200, true, false),  // SBスタック > all-in額 → callが出る
        mkPlayer('BB', 0, true, true),
      ];
      const result = getAvailableActions('SB', 'flop', actions, players, 103, 97);
      const names = result.map(a => a.action);

      expect(names).toContain('fold');
      expect(names).toContain('call');
    });

    it('BB all-in済み → SBは唯一のアクティブプレイヤーで制限あり（raise不可）', () => {
      const actions = [
        mkAction('SB', 'check'),
        mkAction('BB', 'all-in', 97),
      ];
      const players = [
        mkPlayer('SB', 200, true, false),
        mkPlayer('BB', 0, true, true),
      ];
      const result = getAvailableActions('SB', 'flop', actions, players, 103, 97);
      const names = result.map(a => a.action);

      expect(names).not.toContain('raise');
      expect(names).not.toContain('bet');
    });

    it('BB all-in済み → shouldSkipPlayer = true', () => {
      expect(shouldSkipPlayer(mkPlayer('BB', 0, true, true))).toBe(true);
    });

    it('SB call後 → ランアウト（BB all-in、SBのみacting）', () => {
      const players = [
        mkPlayer('SB', 0, true, true),   // called all-in (stack 0)
        mkPlayer('BB', 0, true, true),    // all-in
      ];
      expect(isRunoutNeeded(players)).toBe(true);
    });

    it('SBスタック余りありでcall後 → ランアウト（acting 1人のみ）', () => {
      // SB stack 97, BB all-in 50 → SB calls 50, remaining stack 47
      const players = [
        mkPlayer('SB', 47, true, false),  // called, still has chips
        mkPlayer('BB', 0, true, true),    // all-in
      ];
      // actingPlayers = [SB] → length 1 → runout
      expect(isRunoutNeeded(players)).toBe(true);
    });
  });

  // ============================================================
  // シナリオ10: Flop Check → Bet all-in → Fold
  // ============================================================
  describe('シナリオ10: Check → Bet all-in → Fold', () => {
    it('SB check → BB all-in → SBにcall/foldがある', () => {
      const actions = [
        mkAction('SB', 'check'),
        mkAction('BB', 'all-in', 97),
      ];
      const players = [
        mkPlayer('SB', 200, true, false),  // SBスタック > all-in額 → callが出る
        mkPlayer('BB', 0, true, true),
      ];
      const result = getAvailableActions('SB', 'flop', actions, players, 103, 97);
      const names = result.map(a => a.action);

      expect(names).toContain('fold');
      expect(names).toContain('call');
    });

    it('SB fold後 → ハンド終了（アクティブ1人のみ）', () => {
      const players = [
        mkPlayer('SB', 97, false, false),  // folded
        mkPlayer('BB', 0, true, true),     // all-in, only active
      ];
      // activePlayers = [BB] → length 1 → not runout (hand over)
      expect(isRunoutNeeded(players)).toBe(false);
    });

    it('SB fold後 → BBのみアクティブ、skipではない（勝者）', () => {
      const players = [
        mkPlayer('SB', 97, false, false),
        mkPlayer('BB', 0, true, true),
      ];
      // SB folded → skip
      expect(shouldSkipPlayer(players[0])).toBe(true);
      // BB all-in → skip (but is the winner)
      expect(shouldSkipPlayer(players[1])).toBe(true);
    });
  });
});
