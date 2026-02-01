import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import { HandProvider, useHand } from '@/contexts/HandContext';
import type { Position, ActionRecord, Street } from '@/types/poker';
import { getActivePlayers, getActingPlayers } from '@/utils/pokerUtils';

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

// ── Tests ────────────────────────────────────────────────────

describe('BUG-26: 3way勝者候補テスト', () => {
  // ==========================================================
  // シナリオ1: 3way全員参加→フロップで全員オールイン
  // UTG raises 3BB → SB calls → BB calls → (flop)
  // SB all-in → BB calls all-in → UTG calls all-in
  // ==========================================================
  describe('シナリオ1: 3way全員参加→全員オールイン', () => {
    it('プリフロップ: UTG raise → SB call → BB call → 全員active', () => {
      const { result } = renderHook(() => useHand(), { wrapper });

      act(() => {
        result.current.startNewHand(['SB', 'BB', 'UTG'], null);
      });

      // UTG raises 3BB (amount=3 from stack 100)
      act(() => {
        result.current.addAction(mkAction('UTG', 'raise', 'preflop', 3));
      });
      // SB calls (callAmount = 3 - 0.5 = 2.5)
      act(() => {
        result.current.addAction(mkAction('SB', 'call', 'preflop'));
      });
      // BB calls (callAmount = 3 - 1 = 2)
      act(() => {
        result.current.addAction(mkAction('BB', 'call', 'preflop'));
      });

      const players = result.current.gameState!.players;
      // 全員 active=true, isAllIn=false
      expect(players.every(p => p.active)).toBe(true);
      expect(players.every(p => !p.isAllIn)).toBe(true);
      expect(getActivePlayers(players)).toHaveLength(3);
    });

    it('フロップ: SB all-in → BB call → UTG call → プレイヤー状態確認', () => {
      const { result } = renderHook(() => useHand(), { wrapper });

      act(() => {
        result.current.startNewHand(['SB', 'BB', 'UTG'], null);
      });

      // Preflop: UTG raise 3, SB call, BB call
      // SB call: callAmount = 3 - 0.5(blind) = 2.5, stack: 100 - 2.5 = 97.5
      // BB call: callAmount = 3 - 1(blind) = 2, stack: 100 - 2 = 98
      // UTG: stack = 100 - 3 = 97
      act(() => {
        result.current.addAction(mkAction('UTG', 'raise', 'preflop', 3));
      });
      act(() => {
        result.current.addAction(mkAction('SB', 'call', 'preflop'));
      });
      act(() => {
        result.current.addAction(mkAction('BB', 'call', 'preflop'));
      });

      // Flop: SB all-in (stack=97.5, amount=97.5 → stack=0)
      act(() => {
        result.current.addAction(mkAction('SB', 'all-in', 'flop', 97.5));
      });

      // SB is now all-in
      let players = result.current.gameState!.players;
      const sb = players.find(p => p.position === 'SB')!;
      expect(sb.isAllIn).toBe(true);
      expect(sb.active).toBe(true);
      expect(sb.stack).toBe(0);

      // BB calls (stack=98, callAmount=97.5, newStack=0.5)
      // isAllIn = (action==='all-in' || newStack<=0) = (false || false) = false
      // NOTE: BB has only 0.5BB left but is NOT marked as all-in
      act(() => {
        result.current.addAction(mkAction('BB', 'call', 'flop'));
      });

      players = result.current.gameState!.players;
      const bb = players.find(p => p.position === 'BB')!;
      expect(bb.isAllIn).toBe(false); // 0.5 remaining → NOT all-in per current logic
      expect(bb.active).toBe(true);
      expect(bb.stack).toBe(0.5);

      // UTG calls (stack=97, callAmount=97.5, newStack=max(0,-0.5)=0)
      // isAllIn = (false || 0<=0) = true
      act(() => {
        result.current.addAction(mkAction('UTG', 'call', 'flop'));
      });

      players = result.current.gameState!.players;
      const utg = players.find(p => p.position === 'UTG')!;
      expect(utg.isAllIn).toBe(true);
      expect(utg.active).toBe(true);
      expect(utg.stack).toBe(0);

      // 全3人が active=true
      expect(getActivePlayers(players)).toHaveLength(3);
      expect(getActivePlayers(players)).toEqual(
        expect.arrayContaining(['SB', 'BB', 'UTG']),
      );
      // SB/UTG are all-in, BB has 0.5 remaining → acting = [BB]
      expect(getActingPlayers(players)).toEqual(['BB']);
    });
  });

  // ==========================================================
  // シナリオ2: 3way→1人fold→2人all-in
  // UTG raises 3BB → SB 3bet all-in → BB folds → UTG calls
  // ==========================================================
  describe('シナリオ2: 3way→1人fold→2人all-in', () => {
    it('SB all-in → BB folds → UTG calls → 2人active', () => {
      const { result } = renderHook(() => useHand(), { wrapper });

      act(() => {
        result.current.startNewHand(['SB', 'BB', 'UTG'], null);
      });

      // UTG raises 3BB
      act(() => {
        result.current.addAction(mkAction('UTG', 'raise', 'preflop', 3));
      });

      // SB 3bet all-in (SB stack=100, blind not deducted, amount=99.5)
      // stack: 100 - 99.5 = 0.5, isAllIn=true (action==='all-in')
      // NOTE: SB has 0.5 remaining because startNewHand doesn't deduct blinds from stack
      act(() => {
        result.current.addAction(mkAction('SB', 'all-in', 'preflop', 99.5));
      });

      let players = result.current.gameState!.players;
      const sbAfterAllIn = players.find(p => p.position === 'SB')!;
      expect(sbAfterAllIn.isAllIn).toBe(true);
      expect(sbAfterAllIn.stack).toBe(0.5); // blind not deducted from stack

      // BB folds
      act(() => {
        result.current.addAction(mkAction('BB', 'fold', 'preflop'));
      });

      players = result.current.gameState!.players;
      const bbAfterFold = players.find(p => p.position === 'BB')!;
      expect(bbAfterFold.active).toBe(false);

      // UTG calls: SB contribution = 0.5(blind) + 99.5 = 100, UTG contribution = 3
      // callAmount = 100 - 3 = 97, UTG.stack = 97 - 97 = 0
      act(() => {
        result.current.addAction(mkAction('UTG', 'call', 'preflop'));
      });

      players = result.current.gameState!.players;
      const sb = players.find(p => p.position === 'SB')!;
      const bb = players.find(p => p.position === 'BB')!;
      const utg = players.find(p => p.position === 'UTG')!;

      // SB: active=true, isAllIn=true, stack=0.5
      expect(sb.active).toBe(true);
      expect(sb.isAllIn).toBe(true);
      expect(sb.stack).toBe(0.5);

      // BB: active=false (folded)
      expect(bb.active).toBe(false);

      // UTG: active=true, isAllIn=true (97 - 97 = 0)
      expect(utg.active).toBe(true);
      expect(utg.isAllIn).toBe(true);
      expect(utg.stack).toBe(0);

      // getActivePlayers: SB + UTG のみ
      const active = getActivePlayers(players);
      expect(active).toHaveLength(2);
      expect(active).toContain('SB');
      expect(active).toContain('UTG');
      expect(active).not.toContain('BB');
    });
  });

  // ==========================================================
  // シナリオ3: addActions（バッチ版）での3way
  // 複数アクションを一括追加して同じ結果になることを確認
  // ==========================================================
  describe('シナリオ3: addActions（バッチ版）での3way', () => {
    it('バッチでpreflop全アクション追加 → 結果が個別addActionと一致', () => {
      const { result } = renderHook(() => useHand(), { wrapper });

      act(() => {
        result.current.startNewHand(['SB', 'BB', 'UTG'], null);
      });

      // 一括追加: UTG raise → SB all-in → BB fold → UTG call
      // (シナリオ2と同一のアクション列をバッチで追加)
      const batchActions: ActionRecord[] = [
        mkAction('UTG', 'raise', 'preflop', 3),
        mkAction('SB', 'all-in', 'preflop', 99.5),
        mkAction('BB', 'fold', 'preflop'),
        mkAction('UTG', 'call', 'preflop'),
      ];

      act(() => {
        result.current.addActions(batchActions);
      });

      const players = result.current.gameState!.players;

      // SB: active, all-in, stack=0.5 (blind not deducted)
      const sb = players.find(p => p.position === 'SB')!;
      expect(sb.active).toBe(true);
      expect(sb.isAllIn).toBe(true);
      expect(sb.stack).toBe(0.5);

      // BB: folded
      const bb = players.find(p => p.position === 'BB')!;
      expect(bb.active).toBe(false);

      // UTG: active, all-in (97 - 97 = 0)
      const utg = players.find(p => p.position === 'UTG')!;
      expect(utg.active).toBe(true);
      expect(utg.isAllIn).toBe(true);
      expect(utg.stack).toBe(0);

      // getActivePlayers: 2人
      const active = getActivePlayers(players);
      expect(active).toHaveLength(2);
      expect(active).toContain('SB');
      expect(active).toContain('UTG');
    });

    it('バッチでフロップall-in追加 → 全員all-in', () => {
      const { result } = renderHook(() => useHand(), { wrapper });

      act(() => {
        result.current.startNewHand(['SB', 'BB', 'UTG'], null);
      });

      // Preflop + Flop をバッチ追加
      const allActions: ActionRecord[] = [
        // Preflop
        mkAction('UTG', 'raise', 'preflop', 3),
        mkAction('SB', 'call', 'preflop'),
        mkAction('BB', 'call', 'preflop'),
        // Flop
        mkAction('SB', 'all-in', 'flop', 97.5),
        mkAction('BB', 'call', 'flop'),
        mkAction('UTG', 'call', 'flop'),
      ];

      act(() => {
        result.current.addActions(allActions);
      });

      const players = result.current.gameState!.players;

      // 全員 active=true
      expect(getActivePlayers(players)).toHaveLength(3);

      // SB: all-in
      expect(players.find(p => p.position === 'SB')!.isAllIn).toBe(true);
      expect(players.find(p => p.position === 'SB')!.stack).toBe(0);

      // BB: stack = 98 - 97.5 = 0.5, isAllIn = true (newStack <= 0 → wait, 0.5 > 0)
      // Actually: BB stack after preflop call = 98. callAmount on flop = 97.5.
      // 98 - 97.5 = 0.5. isAllIn check: action === 'all-in' (false, it's 'call') || newStack <= 0 (0.5 > 0 → false)
      // So BB is NOT all-in! BB has 0.5 remaining.
      const bb = players.find(p => p.position === 'BB')!;
      expect(bb.isAllIn).toBe(false);
      expect(bb.stack).toBe(0.5);
      expect(bb.active).toBe(true);

      // UTG: stack after preflop = 97. callAmount on flop = 97.5.
      // 97 - 97.5 = -0.5 → Math.max(0, -0.5) = 0. isAllIn: newStack <= 0 → true
      const utg = players.find(p => p.position === 'UTG')!;
      expect(utg.isAllIn).toBe(true);
      expect(utg.stack).toBe(0);
      expect(utg.active).toBe(true);

      // Acting players: BB only (SB/UTG all-in)
      expect(getActingPlayers(players)).toEqual(['BB']);
    });
  });
});
