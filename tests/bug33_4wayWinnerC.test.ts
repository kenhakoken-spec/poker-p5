import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import { HandProvider, useHand } from '@/contexts/HandContext';
import type { Position, ActionRecord, Street, PlayerState } from '@/types/poker';
import { getActivePlayers, getActingPlayers } from '@/utils/pokerUtils';
import { POKER_CONFIG } from '@/utils/pokerConfig';

// ── Helpers ──────────────────────────────────────────────────

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(HandProvider, null, children);

function mkAction(
  position: Position,
  action: string,
  street: Street,
  amount?: number,
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

/** record/page.tsx L966-972 の勝者候補算出ロジックを再現 */
function getWinnerCandidates(
  players: PlayerState[],
  actions: ActionRecord[],
): Position[] {
  const foldedPositions = new Set(
    actions.filter(a => a.action === 'fold').map(a => a.position),
  );
  return players
    .filter(p => !foldedPositions.has(p.position))
    .map(p => p.position);
}

function getFoldedPositions(actions: ActionRecord[]): Set<Position> {
  return new Set(
    actions.filter(a => a.action === 'fold').map(a => a.position),
  );
}

const { defaultStack, blinds } = POKER_CONFIG;

// ── Tests ────────────────────────────────────────────────────

describe('BUG-33 Phase1: 4way勝者候補テスト シナリオ群C（混合4way 6-7）', () => {
  // ==========================================================
  // シナリオ6: 4way混合 — BB 3bet all-in、SB fold → 勝者候補3人
  //   UTG open 3 → CO call → SB call → BB 3bet all-in
  //   → UTG call → CO call → SB fold
  //   結果: UTG/CO/BB all-in, SB fold → 勝者候補3人
  // ==========================================================
  describe('シナリオ6: 4way BB all-in、SB fold → 勝者候補3人', () => {
    it('初期スタック: UTG=100, CO=100, SB=99.5, BB=99', () => {
      const { result } = renderHook(() => useHand(), { wrapper });

      act(() => {
        result.current.startNewHand(['UTG', 'CO', 'SB', 'BB'], null);
      });

      const initPlayers = result.current.gameState!.players;
      expect(initPlayers.find(p => p.position === 'UTG')!.stack).toBe(defaultStack);
      expect(initPlayers.find(p => p.position === 'CO')!.stack).toBe(defaultStack);
      expect(initPlayers.find(p => p.position === 'SB')!.stack).toBe(defaultStack - blinds.sb);
      expect(initPlayers.find(p => p.position === 'BB')!.stack).toBe(defaultStack - blinds.bb);
    });

    it('Preflop: UTG open 3 → CO call → SB call → BB all-in 99', () => {
      const { result } = renderHook(() => useHand(), { wrapper });

      act(() => {
        result.current.startNewHand(['UTG', 'CO', 'SB', 'BB'], null);
      });

      // UTG open 3: stack=100-3=97, contrib=3
      act(() => {
        result.current.addAction(mkAction('UTG', 'raise', 'preflop', 3));
      });
      expect(result.current.gameState!.players.find(p => p.position === 'UTG')!.stack).toBe(97);

      // CO call: maxContrib=3, CO contrib=0, callAmount=3, stack=100-3=97
      act(() => {
        result.current.addAction(mkAction('CO', 'call', 'preflop'));
      });
      expect(result.current.gameState!.players.find(p => p.position === 'CO')!.stack).toBe(97);

      // SB call: maxContrib=3, SB contrib=0.5, callAmount=2.5, stack=99.5-2.5=97
      act(() => {
        result.current.addAction(mkAction('SB', 'call', 'preflop'));
      });
      expect(result.current.gameState!.players.find(p => p.position === 'SB')!.stack).toBe(97);

      // BB all-in 99: stack=99-99=0, contrib=1+99=100
      act(() => {
        result.current.addAction(mkAction('BB', 'all-in', 'preflop', 99));
      });
      const bb = result.current.gameState!.players.find(p => p.position === 'BB')!;
      expect(bb.stack).toBe(0);
      expect(bb.isAllIn).toBe(true);
    });

    it('全フロー通過後: UTG/CO/BB all-in, SB fold, 勝者候補3人', () => {
      const { result } = renderHook(() => useHand(), { wrapper });

      act(() => {
        result.current.startNewHand(['UTG', 'CO', 'SB', 'BB'], null);
      });

      // Preflop: UTG open 3, CO call, SB call, BB all-in 99
      act(() => {
        result.current.addAction(mkAction('UTG', 'raise', 'preflop', 3));
      });
      act(() => {
        result.current.addAction(mkAction('CO', 'call', 'preflop'));
      });
      act(() => {
        result.current.addAction(mkAction('SB', 'call', 'preflop'));
      });
      act(() => {
        result.current.addAction(mkAction('BB', 'all-in', 'preflop', 99));
      });

      // UTG call: maxContrib=100(BB), UTG contrib=3, callAmount=97, stack=97-97=0
      act(() => {
        result.current.addAction(mkAction('UTG', 'call', 'preflop'));
      });
      // CO call: maxContrib=100, CO contrib=3, callAmount=97, stack=97-97=0
      act(() => {
        result.current.addAction(mkAction('CO', 'call', 'preflop'));
      });
      // SB fold
      act(() => {
        result.current.addAction(mkAction('SB', 'fold', 'preflop'));
      });

      // Final state
      const players = result.current.gameState!.players;
      const actions = result.current.gameState!.actions;
      const utg = players.find(p => p.position === 'UTG')!;
      const co = players.find(p => p.position === 'CO')!;
      const sb = players.find(p => p.position === 'SB')!;
      const bb = players.find(p => p.position === 'BB')!;

      // a. stack, isAllIn, active状態
      expect(utg.stack).toBe(0);
      expect(utg.isAllIn).toBe(true);
      expect(utg.active).toBe(true);

      expect(co.stack).toBe(0);
      expect(co.isAllIn).toBe(true);
      expect(co.active).toBe(true);

      expect(bb.stack).toBe(0);
      expect(bb.isAllIn).toBe(true);
      expect(bb.active).toBe(true);

      expect(sb.active).toBe(false);
      expect(sb.stack).toBe(97);

      // b. foldedPositions: {SB}
      const folded = getFoldedPositions(actions);
      expect(folded.size).toBe(1);
      expect(folded.has('SB')).toBe(true);

      // c. winnerCandidates: UTG, CO, BB (SB excluded)
      const candidates = getWinnerCandidates(players, actions);
      expect(candidates).toHaveLength(3);
      expect(candidates).toContain('UTG');
      expect(candidates).toContain('CO');
      expect(candidates).toContain('BB');
      expect(candidates).not.toContain('SB');

      // d. actingPlayers: 0 (UTG/CO/BB all-in, SB folded)
      expect(getActingPlayers(players)).toHaveLength(0);
    });
  });

  // ==========================================================
  // シナリオ7: 4way 2人fold — SB 4bet all-in、UTG+CO fold → 勝者候補2人
  //   UTG open 3 → CO 3bet 9 → SB 4bet all-in → BB call
  //   → UTG fold → CO fold
  //   結果: SB/BB all-in, UTG+CO fold → 勝者候補2人
  // ==========================================================
  describe('シナリオ7: 4way 2人fold → 勝者候補2人', () => {
    it('Preflop序盤: UTG open 3, CO 3bet 9', () => {
      const { result } = renderHook(() => useHand(), { wrapper });

      act(() => {
        result.current.startNewHand(['UTG', 'CO', 'SB', 'BB'], null);
      });

      // UTG open 3: stack=100-3=97
      act(() => {
        result.current.addAction(mkAction('UTG', 'raise', 'preflop', 3));
      });
      expect(result.current.gameState!.players.find(p => p.position === 'UTG')!.stack).toBe(97);

      // CO 3bet 9: stack=100-9=91, contrib=9
      act(() => {
        result.current.addAction(mkAction('CO', 'raise', 'preflop', 9));
      });
      expect(result.current.gameState!.players.find(p => p.position === 'CO')!.stack).toBe(91);
    });

    it('全フロー通過後: SB/BB all-in, UTG+CO fold, 勝者候補2人', () => {
      const { result } = renderHook(() => useHand(), { wrapper });

      act(() => {
        result.current.startNewHand(['UTG', 'CO', 'SB', 'BB'], null);
      });

      // UTG open 3: stack=100-3=97, contrib=3
      act(() => {
        result.current.addAction(mkAction('UTG', 'raise', 'preflop', 3));
      });
      // CO 3bet 9: stack=100-9=91, contrib=9
      act(() => {
        result.current.addAction(mkAction('CO', 'raise', 'preflop', 9));
      });
      // SB 4bet all-in: amount=99.5(全スタック), stack=99.5-99.5=0
      // SB contrib = 0.5(blind) + 99.5 = 100
      act(() => {
        result.current.addAction(mkAction('SB', 'all-in', 'preflop', 99.5));
      });
      // BB call: maxContrib=100, BB contrib=1, callAmount=99, stack=99-99=0
      act(() => {
        result.current.addAction(mkAction('BB', 'call', 'preflop'));
      });
      // UTG fold
      act(() => {
        result.current.addAction(mkAction('UTG', 'fold', 'preflop'));
      });
      // CO fold
      act(() => {
        result.current.addAction(mkAction('CO', 'fold', 'preflop'));
      });

      // Final state
      const players = result.current.gameState!.players;
      const actions = result.current.gameState!.actions;
      const utg = players.find(p => p.position === 'UTG')!;
      const co = players.find(p => p.position === 'CO')!;
      const sb = players.find(p => p.position === 'SB')!;
      const bb = players.find(p => p.position === 'BB')!;

      // a. stack, isAllIn, active状態
      expect(sb.stack).toBe(0);
      expect(sb.isAllIn).toBe(true);
      expect(sb.active).toBe(true);

      expect(bb.stack).toBe(0);
      expect(bb.isAllIn).toBe(true);
      expect(bb.active).toBe(true);

      expect(utg.active).toBe(false);
      expect(utg.stack).toBe(97);

      expect(co.active).toBe(false);
      expect(co.stack).toBe(91);

      // b. foldedPositions: {UTG, CO}
      const folded = getFoldedPositions(actions);
      expect(folded.size).toBe(2);
      expect(folded.has('UTG')).toBe(true);
      expect(folded.has('CO')).toBe(true);

      // c. winnerCandidates: SB, BB (UTG+CO excluded)
      const candidates = getWinnerCandidates(players, actions);
      expect(candidates).toHaveLength(2);
      expect(candidates).toContain('SB');
      expect(candidates).toContain('BB');
      expect(candidates).not.toContain('UTG');
      expect(candidates).not.toContain('CO');

      // d. actingPlayers: 0 (SB/BB all-in, UTG/CO folded)
      expect(getActingPlayers(players)).toHaveLength(0);
    });
  });
});
