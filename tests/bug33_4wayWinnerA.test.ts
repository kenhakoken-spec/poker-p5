import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import { HandProvider, useHand } from '@/contexts/HandContext';
import type { Position, ActionRecord, Street } from '@/types/poker';
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

/** record/page.tsx L966-974 の勝者候補算出ロジックを再現 */
function getWinnerCandidates(
  players: { position: Position; active: boolean }[],
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

describe('BUG-33 Phase1: 4way勝者候補テスト シナリオ群A', () => {
  // ==========================================================
  // シナリオ1: 4way全員参加 → fold無し → 勝者候補4人
  //   Preflop: UTG raise 3 → CO call → SB call → BB call
  //   Flop: UTG all-in 97 → CO call → SB call → BB call
  //   → 全員 stack=0, isAllIn=true, active=true
  // ==========================================================
  describe('シナリオ1: 4way全員参加 fold無し → 勝者候補4人', () => {
    it('全フロー通過後: 全員all-in, foldなし, 勝者候補4人', () => {
      const { result } = renderHook(() => useHand(), { wrapper });

      act(() => {
        result.current.startNewHand(['UTG', 'CO', 'SB', 'BB'], null);
      });

      // Initial: UTG=100, CO=100, SB=99.5, BB=99
      const initPlayers = result.current.gameState!.players;
      expect(initPlayers.find(p => p.position === 'UTG')!.stack).toBe(defaultStack);
      expect(initPlayers.find(p => p.position === 'CO')!.stack).toBe(defaultStack);
      expect(initPlayers.find(p => p.position === 'SB')!.stack).toBe(defaultStack - blinds.sb);
      expect(initPlayers.find(p => p.position === 'BB')!.stack).toBe(defaultStack - blinds.bb);

      // Preflop: UTG raise 3, CO call, SB call, BB call
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
        result.current.addAction(mkAction('BB', 'call', 'preflop'));
      });

      // After preflop: all at 97
      let players = result.current.gameState!.players;
      for (const pos of ['UTG', 'CO', 'SB', 'BB'] as Position[]) {
        expect(players.find(p => p.position === pos)!.stack).toBe(97);
      }

      // Flop: UTG all-in 97, CO call, SB call, BB call
      act(() => {
        result.current.addAction(mkAction('UTG', 'all-in', 'flop', 97));
      });
      act(() => {
        result.current.addAction(mkAction('CO', 'call', 'flop'));
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

      // a. 全員: stack=0, isAllIn=true, active=true
      for (const pos of ['UTG', 'CO', 'SB', 'BB'] as Position[]) {
        const p = players.find(pl => pl.position === pos)!;
        expect(p.stack).toBe(0);
        expect(p.isAllIn).toBe(true);
        expect(p.active).toBe(true);
      }

      // b. foldedPositions: 空
      const folded = getFoldedPositions(actions);
      expect(folded.size).toBe(0);

      // c. winnerCandidates: 4人
      const candidates = getWinnerCandidates(players, actions);
      expect(candidates).toHaveLength(4);
      expect(candidates).toEqual(expect.arrayContaining(['UTG', 'CO', 'SB', 'BB']));

      // d. actingPlayers: 0（全員all-in → ランアウト）
      expect(getActingPlayers(players)).toHaveLength(0);
    });
  });

  // ==========================================================
  // シナリオ2: 4way 1人fold (preflop) → 勝者候補3人
  //   Preflop: UTG raise 3 → CO all-in 100 → SB call → BB call → UTG fold
  //   → CO/SB/BB stack=0, UTG stack=97 active=false
  // ==========================================================
  describe('シナリオ2: 4way preflop UTG fold → 勝者候補3人', () => {
    it('全フロー通過後: CO/SB/BB all-in, UTG fold, 勝者候補3人', () => {
      const { result } = renderHook(() => useHand(), { wrapper });

      act(() => {
        result.current.startNewHand(['UTG', 'CO', 'SB', 'BB'], null);
      });

      // Preflop: UTG raise 3
      act(() => {
        result.current.addAction(mkAction('UTG', 'raise', 'preflop', 3));
      });
      // CO 3bet all-in (stack=100, amount=100)
      act(() => {
        result.current.addAction(mkAction('CO', 'all-in', 'preflop', defaultStack));
      });
      // SB call (needs 100 - 0.5 = 99.5, stack=99.5 → 0)
      act(() => {
        result.current.addAction(mkAction('SB', 'call', 'preflop'));
      });
      // BB call (needs 100 - 1 = 99, stack=99 → 0)
      act(() => {
        result.current.addAction(mkAction('BB', 'call', 'preflop'));
      });
      // UTG fold
      act(() => {
        result.current.addAction(mkAction('UTG', 'fold', 'preflop'));
      });

      // Final state
      const players = result.current.gameState!.players;
      const actions = result.current.gameState!.actions;

      // a. プレイヤー状態
      const utg = players.find(p => p.position === 'UTG')!;
      expect(utg.stack).toBe(97);
      expect(utg.active).toBe(false);

      const co = players.find(p => p.position === 'CO')!;
      expect(co.stack).toBe(0);
      expect(co.isAllIn).toBe(true);
      expect(co.active).toBe(true);

      const sb = players.find(p => p.position === 'SB')!;
      expect(sb.stack).toBe(0);
      expect(sb.isAllIn).toBe(true);
      expect(sb.active).toBe(true);

      const bb = players.find(p => p.position === 'BB')!;
      expect(bb.stack).toBe(0);
      expect(bb.isAllIn).toBe(true);
      expect(bb.active).toBe(true);

      // b. foldedPositions: {UTG}
      const folded = getFoldedPositions(actions);
      expect(folded.size).toBe(1);
      expect(folded.has('UTG')).toBe(true);

      // c. winnerCandidates: 3人 (CO, SB, BB)
      const candidates = getWinnerCandidates(players, actions);
      expect(candidates).toHaveLength(3);
      expect(candidates).toContain('CO');
      expect(candidates).toContain('SB');
      expect(candidates).toContain('BB');
      expect(candidates).not.toContain('UTG');

      // d. actingPlayers: 0
      expect(getActingPlayers(players)).toHaveLength(0);
    });
  });

  // ==========================================================
  // シナリオ3: 4way フロップで1人fold → 勝者候補3人
  //   Preflop: UTG raise 3 → CO call → SB call → BB call (all at 97)
  //   Flop: UTG all-in 97 → CO call → SB fold → BB call
  //   → UTG/CO/BB stack=0, SB stack=97 active=false
  // ==========================================================
  describe('シナリオ3: 4way flop SB fold → 勝者候補3人', () => {
    it('全フロー通過後: UTG/CO/BB all-in, SB fold, 勝者候補3人', () => {
      const { result } = renderHook(() => useHand(), { wrapper });

      act(() => {
        result.current.startNewHand(['UTG', 'CO', 'SB', 'BB'], null);
      });

      // Preflop: UTG raise 3, CO call, SB call, BB call
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
        result.current.addAction(mkAction('BB', 'call', 'preflop'));
      });

      // After preflop: all at 97
      let players = result.current.gameState!.players;
      for (const pos of ['UTG', 'CO', 'SB', 'BB'] as Position[]) {
        expect(players.find(p => p.position === pos)!.stack).toBe(97);
      }

      // Flop: UTG all-in 97, CO call, SB fold, BB call
      act(() => {
        result.current.addAction(mkAction('UTG', 'all-in', 'flop', 97));
      });
      act(() => {
        result.current.addAction(mkAction('CO', 'call', 'flop'));
      });
      act(() => {
        result.current.addAction(mkAction('SB', 'fold', 'flop'));
      });
      act(() => {
        result.current.addAction(mkAction('BB', 'call', 'flop'));
      });

      // Final state
      players = result.current.gameState!.players;
      const actions = result.current.gameState!.actions;

      // a. プレイヤー状態
      const utg = players.find(p => p.position === 'UTG')!;
      expect(utg.stack).toBe(0);
      expect(utg.isAllIn).toBe(true);
      expect(utg.active).toBe(true);

      const co = players.find(p => p.position === 'CO')!;
      expect(co.stack).toBe(0);
      expect(co.isAllIn).toBe(true);
      expect(co.active).toBe(true);

      const sb = players.find(p => p.position === 'SB')!;
      expect(sb.stack).toBe(97);
      expect(sb.active).toBe(false);

      const bb = players.find(p => p.position === 'BB')!;
      expect(bb.stack).toBe(0);
      expect(bb.isAllIn).toBe(true);
      expect(bb.active).toBe(true);

      // b. foldedPositions: {SB}
      const folded = getFoldedPositions(actions);
      expect(folded.size).toBe(1);
      expect(folded.has('SB')).toBe(true);

      // c. winnerCandidates: 3人 (UTG, CO, BB)
      const candidates = getWinnerCandidates(players, actions);
      expect(candidates).toHaveLength(3);
      expect(candidates).toContain('UTG');
      expect(candidates).toContain('CO');
      expect(candidates).toContain('BB');
      expect(candidates).not.toContain('SB');

      // d. actingPlayers: 0
      expect(getActingPlayers(players)).toHaveLength(0);
    });
  });
});
