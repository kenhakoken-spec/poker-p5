import { describe, it, expect } from 'vitest';
import type { Position, ActionRecord, PlayerState } from '@/types/poker';
import {
  getAvailableActions,
  shouldSkipPlayer,
  isRunoutNeeded,
  didLastAggressionReopenAction,
} from '@/utils/bettingUtils';

function mkPlayer(position: Position, stack: number, active = true, isAllIn = false): PlayerState {
  return { position, stack, active, isAllIn };
}

function mkAction(
  position: Position,
  action: string,
  amount?: number,
  street: 'preflop' | 'flop' | 'turn' | 'river' = 'preflop'
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

describe('BUG-16: ヘッズアップ+マルチウェイ オールインシナリオ', () => {
  // ============================================================
  // シナリオ1: HU check→all-in→相手がcall/fold可能
  // ============================================================
  describe('シナリオ1: HU check→all-in→相手がcall/fold可能', () => {
    it('SBがcheck後、BBがall-in → SBはcall/fold可能', () => {
      // フロップ: SB checks, BB all-in 50 (stack was 50)
      const actions = [
        mkAction('SB', 'check', undefined, 'flop'),
        mkAction('BB', 'all-in', 50, 'flop'),
      ];
      const players = [
        mkPlayer('SB', 100, true, false),
        mkPlayer('BB', 0, true, true),
      ];
      const result = getAvailableActions('SB', 'flop', actions, players, 51.5, 50);
      const actionNames = result.map(a => a.action);

      expect(actionNames).toContain('fold');
      expect(actionNames).toContain('call');
    });

    it('SBがcheck後、BBがall-in → SBにraiseは不要（唯一のアクティブプレイヤー制限）', () => {
      const actions = [
        mkAction('SB', 'check', undefined, 'flop'),
        mkAction('BB', 'all-in', 50, 'flop'),
      ];
      const players = [
        mkPlayer('SB', 100, true, false),
        mkPlayer('BB', 0, true, true),
      ];
      const result = getAvailableActions('SB', 'flop', actions, players, 51.5, 50);
      const actionNames = result.map(a => a.action);

      expect(actionNames).not.toContain('raise');
      expect(actionNames).not.toContain('bet');
    });

    it('BBのall-in済み状態ではgetAvailableActionsは空配列', () => {
      const players = [
        mkPlayer('SB', 100, true, false),
        mkPlayer('BB', 0, true, true),
      ];
      const result = getAvailableActions('BB', 'flop', [], players, 1.5);
      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // シナリオ2: HU bet→raise(all-in)→相手がcall/fold可能
  // ============================================================
  describe('シナリオ2: HU bet→all-in raise→相手がcall/fold可能', () => {
    it('SBがbet後、BBがall-in raise → SBはcall/fold可能（スタック十分）', () => {
      // フロップ: SB bets 10, BB all-in 80
      // SB stack after bet: 90, lastBet: 80
      const actions = [
        mkAction('SB', 'bet', 10, 'flop'),
        mkAction('BB', 'all-in', 80, 'flop'),
      ];
      const players = [
        mkPlayer('SB', 90, true, false),
        mkPlayer('BB', 0, true, true),
      ];
      const result = getAvailableActions('SB', 'flop', actions, players, 91.5, 80);
      const actionNames = result.map(a => a.action);

      expect(actionNames).toContain('fold');
      expect(actionNames).toContain('call');
      // 唯一のアクティブプレイヤー → raise制限
      expect(actionNames).not.toContain('raise');
    });

    it('SBがbet後、BBがall-in raise → SBスタック不足時はfold/all-in（コールオールイン）', () => {
      // フロップ: SB bets 10, BB all-in 100
      // SB stack after bet: 90, lastBet: 100 → stack < lastBet
      const actions = [
        mkAction('SB', 'bet', 10, 'flop'),
        mkAction('BB', 'all-in', 100, 'flop'),
      ];
      const players = [
        mkPlayer('SB', 90, true, false),
        mkPlayer('BB', 0, true, true),
      ];
      const result = getAvailableActions('SB', 'flop', actions, players, 111.5, 100);
      const actionNames = result.map(a => a.action);

      expect(actionNames).toContain('fold');
      expect(actionNames).toContain('call'); // stack === callAmount → call扱い（新仕様）
      expect(actionNames).not.toContain('all-in'); // call-all-inはcallとして返る
    });
  });

  // ============================================================
  // シナリオ3: 3way 1人all-in→残り2人がcall/fold/raise可能
  // ============================================================
  describe('シナリオ3: 3way 1人all-in→残り2人がcall/fold/raise可能', () => {
    it('UTGがall-in → MPはcall/fold/raise/all-in可能', () => {
      // プリフロップ: UTG all-in 50
      const actions = [mkAction('UTG', 'all-in', 50)];
      const players = [
        mkPlayer('UTG', 0, true, true),
        mkPlayer('MP', 100, true, false),
        mkPlayer('BB', 100, true, false),
      ];
      const result = getAvailableActions('MP', 'preflop', actions, players, 51.5, 50);
      const actionNames = result.map(a => a.action);

      expect(actionNames).toContain('fold');
      expect(actionNames).toContain('call');
      // MP is not the only acting player (BB also acting) → not restricted
      expect(actionNames).toContain('all-in');
    });

    it('UTGがall-in → BBも同様にcall/fold/all-in可能', () => {
      const actions = [mkAction('UTG', 'all-in', 50)];
      const players = [
        mkPlayer('UTG', 0, true, true),
        mkPlayer('MP', 100, true, false),
        mkPlayer('BB', 100, true, false),
      ];
      const result = getAvailableActions('BB', 'preflop', actions, players, 51.5, 50);
      const actionNames = result.map(a => a.action);

      expect(actionNames).toContain('fold');
      expect(actionNames).toContain('call');
      expect(actionNames).toContain('all-in');
    });

    it('UTGがall-in、MPがcall → BBは残り2人アクティブなので制限なし', () => {
      const actions = [
        mkAction('UTG', 'all-in', 50),
        mkAction('MP', 'call'),
      ];
      const players = [
        mkPlayer('UTG', 0, true, true),
        mkPlayer('MP', 50, true, false), // called, stack reduced
        mkPlayer('BB', 100, true, false),
      ];
      const result = getAvailableActions('BB', 'preflop', actions, players, 101.5, 50);
      const actionNames = result.map(a => a.action);

      expect(actionNames).toContain('fold');
      expect(actionNames).toContain('call');
      expect(actionNames).toContain('all-in');
    });

    it('UTGがall-in、MPがfold → BBは唯一のアクティブ → 制限あり（call/fold）', () => {
      const actions = [
        mkAction('UTG', 'all-in', 50),
        mkAction('MP', 'fold'),
      ];
      const players = [
        mkPlayer('UTG', 0, true, true),
        mkPlayer('MP', 100, false, false), // folded
        mkPlayer('BB', 100, true, false),
      ];
      const result = getAvailableActions('BB', 'preflop', actions, players, 51.5, 50);
      const actionNames = result.map(a => a.action);

      expect(actionNames).toContain('fold');
      expect(actionNames).toContain('call');
      // BBが唯一のアクティブ → raise/all-in制限
      expect(actionNames).not.toContain('raise');
      expect(actionNames).not.toContain('all-in');
    });
  });

  // ============================================================
  // シナリオ4: ショートオールイン（最低レイズ額未満）でアクション権制限
  // ============================================================
  describe('シナリオ4: ショートオールイン → アクション権制限', () => {
    it('UTG bet 6、MP short all-in 8(increment 2 < minRaise 5) → アクション再開しない', () => {
      // UTG bet 6: prev=0, newLevel=6, increment=6-1(BB)=5, currentBet=6, minRaise=5
      // MP all-in 8: prev=0, newLevel=8, increment=8-6=2 < minRaise=5 → short
      const actions = [
        mkAction('UTG', 'bet', 6),
        mkAction('MP', 'all-in', 8),
      ];
      expect(didLastAggressionReopenAction(actions, 'preflop')).toBe(false);
    });

    it('UTG bet 6、MP short all-in 8 → BBは通常通りcall/fold/raise可能（未アクション）', () => {
      const actions = [
        mkAction('UTG', 'bet', 6),
        mkAction('MP', 'all-in', 8),
      ];
      const players = [
        mkPlayer('UTG', 94, true, false),
        mkPlayer('MP', 0, true, true),
        mkPlayer('BB', 100, true, false),
      ];
      const result = getAvailableActions('BB', 'preflop', actions, players, 15.5, 8);
      const actionNames = result.map(a => a.action);

      expect(actionNames).toContain('fold');
      expect(actionNames).toContain('call');
      // BBは未アクション → 制限なし
      expect(actionNames).toContain('all-in');
    });

    it('フルレイズ相当のall-in → アクション再開する', () => {
      // UTG bet 6: increment=5, minRaise=5
      // MP all-in 15: increment=15-6=9 >= 5 → full raise
      const actions = [
        mkAction('UTG', 'bet', 6),
        mkAction('MP', 'all-in', 15),
      ];
      expect(didLastAggressionReopenAction(actions, 'preflop')).toBe(true);
    });

    it('ショートオールイン後、既アクション者(UTG)が唯一のアクティブ → 制限あり', () => {
      // UTG bet 6, MP short all-in 8, BB fold
      // UTGが唯一のアクティブ → isRestricted
      const actions = [
        mkAction('UTG', 'bet', 6),
        mkAction('MP', 'all-in', 8),
        mkAction('BB', 'fold'),
      ];
      const players = [
        mkPlayer('UTG', 94, true, false),
        mkPlayer('MP', 0, true, true),
        mkPlayer('BB', 100, false, false),
      ];
      const result = getAvailableActions('UTG', 'preflop', actions, players, 15.5, 8);
      const actionNames = result.map(a => a.action);

      expect(actionNames).toContain('fold');
      expect(actionNames).toContain('call');
      // UTGは唯一のアクティブ → raise/all-in制限
      expect(actionNames).not.toContain('raise');
      expect(actionNames).not.toContain('all-in');
    });
  });

  // ============================================================
  // シナリオ5: 全員all-inでランアウト判定
  // ============================================================
  describe('シナリオ5: 全員all-in → ランアウト判定', () => {
    it('HU: 両者all-in → isRunoutNeeded = true', () => {
      const players = [
        mkPlayer('SB', 0, true, true),
        mkPlayer('BB', 0, true, true),
      ];
      expect(isRunoutNeeded(players)).toBe(true);
    });

    it('3way: 全員all-in → isRunoutNeeded = true', () => {
      const players = [
        mkPlayer('UTG', 0, true, true),
        mkPlayer('MP', 0, true, true),
        mkPlayer('BB', 0, true, true),
      ];
      expect(isRunoutNeeded(players)).toBe(true);
    });

    it('3way: 2人all-in + 1人fold → isRunoutNeeded = true（アクティブ2人中全員all-in）', () => {
      const players = [
        mkPlayer('UTG', 0, true, true),
        mkPlayer('MP', 0, true, true),
        mkPlayer('BB', 100, false, false), // folded
      ];
      expect(isRunoutNeeded(players)).toBe(true);
    });

    it('3way: 2人all-in + 1人チップあり → isRunoutNeeded = true（アクティブ3人中acting 1人のみ）', () => {
      const players = [
        mkPlayer('UTG', 0, true, true),
        mkPlayer('MP', 0, true, true),
        mkPlayer('BB', 50, true, false), // calling with chips
      ];
      expect(isRunoutNeeded(players)).toBe(true);
    });

    it('全員all-in → shouldSkipPlayer = true for all', () => {
      const players = [
        mkPlayer('SB', 0, true, true),
        mkPlayer('BB', 0, true, true),
      ];
      for (const p of players) {
        expect(shouldSkipPlayer(p)).toBe(true);
      }
    });

    it('1人まだチップあり（acting 2人以上）→ isRunoutNeeded = false', () => {
      const players = [
        mkPlayer('UTG', 50, true, false),
        mkPlayer('MP', 50, true, false),
        mkPlayer('BB', 0, true, true),
      ];
      expect(isRunoutNeeded(players)).toBe(false);
    });
  });
});
