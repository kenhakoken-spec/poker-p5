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

describe('BUG-31 Phase1: 勝者候補テスト シナリオ群A', () => {
  // ==========================================================
  // シナリオ1: 2人HU → fold無し → 勝者候補2人
  //   SB raises 3BB → BB calls → Flop → SB check → BB all-in → SB call
  //   (Positions: SB, BB — standard HU)
  // ==========================================================
  describe('シナリオ1: HU fold無し → 勝者候補2人', () => {
    it('全フロー通過後: 両者all-in, foldなし, 勝者候補2人', () => {
      const { result } = renderHook(() => useHand(), { wrapper });

      act(() => {
        result.current.startNewHand(['SB', 'BB'], null);
      });

      // Initial: SB=99.5, BB=99, pot=1.5
      const initPlayers = result.current.gameState!.players;
      expect(initPlayers.find(p => p.position === 'SB')!.stack).toBe(defaultStack - blinds.sb);
      expect(initPlayers.find(p => p.position === 'BB')!.stack).toBe(defaultStack - blinds.bb);

      // Preflop: SB raises to 3BB (amount=2.5, contribution: 0.5+2.5=3)
      act(() => {
        result.current.addAction(mkAction('SB', 'raise', 'preflop', 2.5));
      });
      // BB calls (callAmount = 3 - 1 = 2)
      act(() => {
        result.current.addAction(mkAction('BB', 'call', 'preflop'));
      });

      // After preflop: SB=97, BB=97
      let players = result.current.gameState!.players;
      expect(players.find(p => p.position === 'SB')!.stack).toBe(97);
      expect(players.find(p => p.position === 'BB')!.stack).toBe(97);

      // Flop: SB checks, BB all-in 97
      act(() => {
        result.current.addAction(mkAction('SB', 'check', 'flop'));
      });
      act(() => {
        result.current.addAction(mkAction('BB', 'all-in', 'flop', 97));
      });

      // SB calls (callAmount = 97, stack = 97 - 97 = 0)
      act(() => {
        result.current.addAction(mkAction('SB', 'call', 'flop'));
      });

      // Final state
      players = result.current.gameState!.players;
      const actions = result.current.gameState!.actions;
      const sb = players.find(p => p.position === 'SB')!;
      const bb = players.find(p => p.position === 'BB')!;

      // a. stack, isAllIn, active
      expect(sb.stack).toBe(0);
      expect(sb.isAllIn).toBe(true);
      expect(sb.active).toBe(true);
      expect(bb.stack).toBe(0);
      expect(bb.isAllIn).toBe(true);
      expect(bb.active).toBe(true);

      // b. foldedPositions
      const folded = getFoldedPositions(actions);
      expect(folded.size).toBe(0);

      // c. winnerCandidates
      const candidates = getWinnerCandidates(players, actions);
      expect(candidates).toHaveLength(2);
      expect(candidates).toContain('SB');
      expect(candidates).toContain('BB');

      // d. actingPlayers (for runout)
      expect(getActingPlayers(players)).toHaveLength(0);
    });
  });

  // ==========================================================
  // シナリオ2: 3way → fold無し → 勝者候補3人
  //   UTG raises 3BB → SB calls → BB calls → Flop
  //   → UTG all-in → SB call → BB call
  // ==========================================================
  describe('シナリオ2: 3way fold無し → 勝者候補3人', () => {
    it('全フロー通過後: 全員all-in, foldなし, 勝者候補3人', () => {
      const { result } = renderHook(() => useHand(), { wrapper });

      act(() => {
        result.current.startNewHand(['SB', 'BB', 'UTG'], null);
      });

      // Initial: SB=99.5, BB=99, UTG=100
      // Preflop: UTG raise 3, SB call (2.5), BB call (2)
      act(() => {
        result.current.addAction(mkAction('UTG', 'raise', 'preflop', 3));
      });
      act(() => {
        result.current.addAction(mkAction('SB', 'call', 'preflop'));
      });
      act(() => {
        result.current.addAction(mkAction('BB', 'call', 'preflop'));
      });

      // After preflop: SB=97, BB=97, UTG=97
      let players = result.current.gameState!.players;
      expect(players.find(p => p.position === 'SB')!.stack).toBe(97);
      expect(players.find(p => p.position === 'BB')!.stack).toBe(97);
      expect(players.find(p => p.position === 'UTG')!.stack).toBe(97);

      // Flop: UTG all-in 97, SB call, BB call
      act(() => {
        result.current.addAction(mkAction('UTG', 'all-in', 'flop', 97));
      });
      act(() => {
        result.current.addAction(mkAction('SB', 'call', 'flop'));
      });
      act(() => {
        result.current.addAction(mkAction('BB', 'call', 'flop'));
      });

      // Final state
      players = result.current.gameState!.players;
      const actions = result.current.gameState!.actions;

      // a. All three: stack=0, isAllIn=true, active=true
      for (const pos of ['SB', 'BB', 'UTG'] as Position[]) {
        const p = players.find(pl => pl.position === pos)!;
        expect(p.stack).toBe(0);
        expect(p.isAllIn).toBe(true);
        expect(p.active).toBe(true);
      }

      // b. foldedPositions: none
      const folded = getFoldedPositions(actions);
      expect(folded.size).toBe(0);

      // c. winnerCandidates: 3
      const candidates = getWinnerCandidates(players, actions);
      expect(candidates).toHaveLength(3);
      expect(candidates).toEqual(expect.arrayContaining(['SB', 'BB', 'UTG']));

      // d. actingPlayers: 0 (all all-in)
      expect(getActingPlayers(players)).toHaveLength(0);
    });
  });

  // ==========================================================
  // シナリオ3: 3way → UTG fold → 勝者候補2人
  //   UTG raise 3 → SB 3bet 9 → BB call → UTG call → Flop
  //   → SB all-in → BB call → UTG fold
  // ==========================================================
  describe('シナリオ3: 3way UTG fold → 勝者候補2人', () => {
    it('全フロー通過後: SB/BB all-in, UTG fold, 勝者候補2人', () => {
      const { result } = renderHook(() => useHand(), { wrapper });

      act(() => {
        result.current.startNewHand(['SB', 'BB', 'UTG'], null);
      });

      // Preflop:
      // UTG raise 3: contrib=3, stack=100-3=97
      act(() => {
        result.current.addAction(mkAction('UTG', 'raise', 'preflop', 3));
      });
      // SB 3bet (amount=8.5, contrib=0.5+8.5=9): stack=99.5-8.5=91
      act(() => {
        result.current.addAction(mkAction('SB', 'raise', 'preflop', 8.5));
      });
      // BB call (callAmount=9-1=8): stack=99-8=91
      act(() => {
        result.current.addAction(mkAction('BB', 'call', 'preflop'));
      });
      // UTG call (callAmount=9-3=6): stack=97-6=91
      act(() => {
        result.current.addAction(mkAction('UTG', 'call', 'preflop'));
      });

      // After preflop: all at 91
      let players = result.current.gameState!.players;
      expect(players.find(p => p.position === 'SB')!.stack).toBe(91);
      expect(players.find(p => p.position === 'BB')!.stack).toBe(91);
      expect(players.find(p => p.position === 'UTG')!.stack).toBe(91);

      // Flop: SB all-in 91, BB call, UTG fold
      act(() => {
        result.current.addAction(mkAction('SB', 'all-in', 'flop', 91));
      });
      act(() => {
        result.current.addAction(mkAction('BB', 'call', 'flop'));
      });
      act(() => {
        result.current.addAction(mkAction('UTG', 'fold', 'flop'));
      });

      // Final state
      players = result.current.gameState!.players;
      const actions = result.current.gameState!.actions;
      const sb = players.find(p => p.position === 'SB')!;
      const bb = players.find(p => p.position === 'BB')!;
      const utg = players.find(p => p.position === 'UTG')!;

      // a. SB: stack=0, isAllIn=true, active=true
      expect(sb.stack).toBe(0);
      expect(sb.isAllIn).toBe(true);
      expect(sb.active).toBe(true);

      // BB: stack=0, isAllIn=true (91-91=0), active=true
      expect(bb.stack).toBe(0);
      expect(bb.isAllIn).toBe(true);
      expect(bb.active).toBe(true);

      // UTG: active=false (folded), stack=91
      expect(utg.active).toBe(false);
      expect(utg.stack).toBe(91);

      // b. foldedPositions: {UTG}
      const folded = getFoldedPositions(actions);
      expect(folded.size).toBe(1);
      expect(folded.has('UTG')).toBe(true);

      // c. winnerCandidates: SB, BB (UTG excluded)
      const candidates = getWinnerCandidates(players, actions);
      expect(candidates).toHaveLength(2);
      expect(candidates).toContain('SB');
      expect(candidates).toContain('BB');
      expect(candidates).not.toContain('UTG');

      // d. actingPlayers: 0 (SB/BB all-in, UTG folded)
      expect(getActingPlayers(players)).toHaveLength(0);
    });
  });
});
