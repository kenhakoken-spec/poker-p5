import { describe, it, expect } from 'vitest';
import type { Position, ActionRecord, PlayerState, Street } from '@/types/poker';
import {
  getAvailableActions,
  shouldSkipPlayer,
  isRunoutNeeded,
} from '@/utils/bettingUtils';
import { isStreetClosed } from '@/utils/potUtils';
import { getActivePlayers, getActingPlayers } from '@/utils/pokerUtils';

// ── Helpers ──────────────────────────────────────────────────

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
): ActionRecord {
  return {
    position,
    action: action as ActionRecord['action'],
    street: 'preflop' as Street,
    timestamp: Date.now(),
    ...(amount !== undefined && {
      size: { type: 'bet-relative' as const, value: amount, amount },
    }),
  };
}

function stackMap(players: PlayerState[]): Map<Position, number> {
  return new Map(players.map((p) => [p.position, p.stack]));
}

// ── trackStreetBettingState contribution reference ──────────
// Preflop init: SB=0.5, BB=1.0, currentBet=1
// "bet X" → prev + X = newLevel; stack reduced by X
// "raise X" → prev + X = newLevel
// "call" → prev += (currentBet − prev); stack reduced by that diff
// "all-in X" → prev + X = newLevel; stack → 0

describe('BUG-20 Phase1 シナリオ群A: HU Preflop 基本5件', () => {
  // ============================================================
  // Scenario 1: Open raise → Call
  //   SB raises to 3BB → BB calls → street closed
  // ============================================================
  describe('Scenario 1: Open raise → Call', () => {
    // SB bet 2.5 → SB total: 0.5+2.5=3.0, currentBet=3.0, SB stack=97.5
    const actionsAfterOpen = [mkAction('SB', 'bet', 2.5)];
    const playersAfterOpen = [mkPlayer('SB', 97.5), mkPlayer('BB', 100)];

    it('BB has fold/call/raise/all-in after SB open raise', () => {
      const result = getAvailableActions(
        'BB', 'preflop', actionsAfterOpen, playersAfterOpen, 4, 3,
      );
      const names = result.map((a) => a.action);
      expect(names).toContain('fold');
      expect(names).toContain('call');
      expect(names).toContain('raise');
      expect(names).toContain('all-in');
    });

    it('isStreetClosed=true after BB calls', () => {
      // BB call: callAmount = 3.0−1.0 = 2.0, BB stack: 100−2.0=98
      const actions = [...actionsAfterOpen, mkAction('BB', 'call')];
      const players = [mkPlayer('SB', 97.5), mkPlayer('BB', 98)];
      const acting = getActingPlayers(players);
      expect(isStreetClosed(actions, 'preflop', acting, stackMap(players))).toBe(true);
    });
  });

  // ============================================================
  // Scenario 2: Open raise → 3bet → Call
  //   SB raises 3BB → BB 3bets to 9BB → SB calls → street closed
  // ============================================================
  describe('Scenario 2: Open raise → 3bet → Call', () => {
    // SB bet 2.5 (total 3.0), BB raise 8 (total 1+8=9.0, stack=92)
    const actionsAfter3bet = [
      mkAction('SB', 'bet', 2.5),
      mkAction('BB', 'raise', 8),
    ];
    const playersAfter3bet = [mkPlayer('SB', 97.5), mkPlayer('BB', 92)];

    it('SB has fold/call/raise/all-in after BB 3bet', () => {
      const result = getAvailableActions(
        'SB', 'preflop', actionsAfter3bet, playersAfter3bet, 12, 9,
      );
      const names = result.map((a) => a.action);
      expect(names).toContain('fold');
      expect(names).toContain('call');
      expect(names).toContain('raise');
      expect(names).toContain('all-in');
    });

    it('isStreetClosed=true after SB calls 3bet', () => {
      // SB call: callAmount = 9.0−3.0 = 6.0, SB stack: 97.5−6.0=91.5
      const actions = [...actionsAfter3bet, mkAction('SB', 'call')];
      const players = [mkPlayer('SB', 91.5), mkPlayer('BB', 92)];
      const acting = getActingPlayers(players);
      expect(isStreetClosed(actions, 'preflop', acting, stackMap(players))).toBe(true);
    });
  });

  // ============================================================
  // Scenario 3: Open raise → 3bet → 4bet → Call
  //   SB 3BB → BB 9BB → SB 4bets to 20BB → BB calls → street closed
  // ============================================================
  describe('Scenario 3: Open raise → 3bet → 4bet → Call', () => {
    // SB bet 2.5, BB raise 8, SB raise 17 (SB total: 3+17=20, stack=80.5)
    const actionsAfter4bet = [
      mkAction('SB', 'bet', 2.5),
      mkAction('BB', 'raise', 8),
      mkAction('SB', 'raise', 17),
    ];
    const playersAfter4bet = [mkPlayer('SB', 80.5), mkPlayer('BB', 92)];

    it('BB has fold/call/raise/all-in after SB 4bet', () => {
      const result = getAvailableActions(
        'BB', 'preflop', actionsAfter4bet, playersAfter4bet, 29, 20,
      );
      const names = result.map((a) => a.action);
      expect(names).toContain('fold');
      expect(names).toContain('call');
      expect(names).toContain('raise');
      expect(names).toContain('all-in');
    });

    it('isStreetClosed=true after BB calls 4bet', () => {
      // BB call: callAmount = 20.0−9.0 = 11.0, BB stack: 92−11=81
      const actions = [...actionsAfter4bet, mkAction('BB', 'call')];
      const players = [mkPlayer('SB', 80.5), mkPlayer('BB', 81)];
      const acting = getActingPlayers(players);
      expect(isStreetClosed(actions, 'preflop', acting, stackMap(players))).toBe(true);
    });
  });

  // ============================================================
  // Scenario 4: Open raise → 3bet → 4bet all-in → Call
  //   SB 3BB → BB 9BB → SB all-in → BB calls → runout
  // ============================================================
  describe('Scenario 4: Open raise → 3bet → All-in → Call', () => {
    // SB bet 2.5 (stack 97.5), BB raise 8 (stack 92), SB all-in 97.5 (stack 0)
    // SB total: 3.0 + 97.5 = 100.5, currentBet = 100.5
    const actionsAfterAllIn = [
      mkAction('SB', 'bet', 2.5),
      mkAction('BB', 'raise', 8),
      mkAction('SB', 'all-in', 97.5),
    ];
    const playersAfterAllIn = [
      mkPlayer('SB', 0, true, true),
      mkPlayer('BB', 92),
    ];

    it('BB has fold/call only (restricted: SB all-in, BB only acting)', () => {
      const result = getAvailableActions(
        'BB', 'preflop', actionsAfterAllIn, playersAfterAllIn, 109.5, 100.5,
      );
      const names = result.map((a) => a.action);
      expect(names).toContain('fold');
      expect(names).toContain('call');
      expect(names).not.toContain('raise');
      expect(names).not.toContain('all-in');
    });

    it('shouldSkipPlayer returns true for all-in SB, false for BB', () => {
      expect(shouldSkipPlayer(playersAfterAllIn[0])).toBe(true);
      expect(shouldSkipPlayer(playersAfterAllIn[1])).toBe(false);
    });

    it('isStreetClosed=true and isRunoutNeeded=true after BB calls', () => {
      // BB call: callAmount = 100.5−9.0 = 91.5, BB stack: 92−91.5=0.5
      const actions = [...actionsAfterAllIn, mkAction('BB', 'call')];
      const players = [
        mkPlayer('SB', 0, true, true),
        mkPlayer('BB', 0.5),
      ];
      const acting = getActingPlayers(players);
      expect(isStreetClosed(actions, 'preflop', acting, stackMap(players))).toBe(true);
      expect(isRunoutNeeded(players)).toBe(true);
    });
  });

  // ============================================================
  // Scenario 5: Open raise → 3bet → 4bet all-in → Fold
  //   SB 3BB → BB 9BB → SB all-in → BB folds → hand over
  // ============================================================
  describe('Scenario 5: Open raise → 3bet → All-in → Fold', () => {
    const actionsAfterAllIn = [
      mkAction('SB', 'bet', 2.5),
      mkAction('BB', 'raise', 8),
      mkAction('SB', 'all-in', 97.5),
    ];
    const playersAfterAllIn = [
      mkPlayer('SB', 0, true, true),
      mkPlayer('BB', 92),
    ];

    it('BB has fold/call (same as Scenario 4)', () => {
      const result = getAvailableActions(
        'BB', 'preflop', actionsAfterAllIn, playersAfterAllIn, 109.5, 100.5,
      );
      const names = result.map((a) => a.action);
      expect(names).toContain('fold');
      expect(names).toContain('call');
      expect(names).not.toContain('raise');
    });

    it('After BB folds: only 1 active player (hand over)', () => {
      const players = [
        mkPlayer('SB', 0, true, true),
        mkPlayer('BB', 92, false), // folded
      ];
      const active = getActivePlayers(players);
      expect(active).toHaveLength(1);
      expect(active[0]).toBe('SB');
    });
  });
});
