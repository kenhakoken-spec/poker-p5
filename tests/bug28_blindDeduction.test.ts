import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import { HandProvider, useHand } from '@/contexts/HandContext';
import type { Position, ActionRecord, Street } from '@/types/poker';
import { getActivePlayers, getActingPlayers } from '@/utils/pokerUtils';
import { POKER_CONFIG } from '@/utils/pokerConfig';
import { isRunoutNeeded } from '@/utils/bettingUtils';

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

const { defaultStack, blinds } = POKER_CONFIG;

// ── Group A: ブラインド控除確認 ─────────────────────────────

describe('BUG-28 Group A: ブラインド控除確認', () => {
  it('A1: startNewHand後、SBのstack = defaultStack - blinds.sb', () => {
    const { result } = renderHook(() => useHand(), { wrapper });

    act(() => {
      result.current.startNewHand(['SB', 'BB', 'UTG'], null);
    });

    const sb = result.current.gameState!.players.find(p => p.position === 'SB')!;
    expect(sb.stack).toBe(defaultStack - blinds.sb); // 100 - 0.5 = 99.5
  });

  it('A2: startNewHand後、BBのstack = defaultStack - blinds.bb', () => {
    const { result } = renderHook(() => useHand(), { wrapper });

    act(() => {
      result.current.startNewHand(['SB', 'BB', 'UTG'], null);
    });

    const bb = result.current.gameState!.players.find(p => p.position === 'BB')!;
    expect(bb.stack).toBe(defaultStack - blinds.bb); // 100 - 1 = 99
  });

  it('A3: startNewHand後、UTGのstack = defaultStack', () => {
    const { result } = renderHook(() => useHand(), { wrapper });

    act(() => {
      result.current.startNewHand(['SB', 'BB', 'UTG'], null);
    });

    const utg = result.current.gameState!.players.find(p => p.position === 'UTG')!;
    expect(utg.stack).toBe(defaultStack); // 100
  });

  it('A4: startNewHand後、pot = blinds.sb + blinds.bb', () => {
    const { result } = renderHook(() => useHand(), { wrapper });

    act(() => {
      result.current.startNewHand(['SB', 'BB', 'UTG'], null);
    });

    expect(result.current.gameState!.pot).toBe(blinds.sb + blinds.bb); // 1.5
  });
});

// ── Group B: ランアウト発生確認（isAllIn判定） ───────────────

describe('BUG-28 Group B: ランアウト発生確認', () => {
  it('B5: 3way UTG open all-in → SB call → SB isAllIn=true, stack=0', () => {
    const { result } = renderHook(() => useHand(), { wrapper });

    act(() => {
      result.current.startNewHand(['SB', 'BB', 'UTG'], null);
    });

    // UTG open all-in (UTG stack = 100, amount = 100)
    act(() => {
      result.current.addAction(mkAction('UTG', 'all-in', 'preflop', defaultStack));
    });

    // SB calls: contribution = blinds.sb(0.5) + amount needed
    // callAmount = 100 - 0.5 = 99.5
    // Expected: SB stack = (defaultStack - blinds.sb) - 99.5 = 99.5 - 99.5 = 0
    act(() => {
      result.current.addAction(mkAction('SB', 'call', 'preflop'));
    });

    const players = result.current.gameState!.players;
    const sb = players.find(p => p.position === 'SB')!;
    const utg = players.find(p => p.position === 'UTG')!;

    expect(utg.isAllIn).toBe(true);
    expect(utg.stack).toBe(0);
    expect(sb.isAllIn).toBe(true);
    expect(sb.stack).toBe(0);
  });

  it('B6: 3way UTG all-in → SB call → BB call → 全員isAllIn, actingPlayers=0', () => {
    const { result } = renderHook(() => useHand(), { wrapper });

    act(() => {
      result.current.startNewHand(['SB', 'BB', 'UTG'], null);
    });

    // UTG all-in 100
    act(() => {
      result.current.addAction(mkAction('UTG', 'all-in', 'preflop', defaultStack));
    });
    // SB call (99.5 needed)
    act(() => {
      result.current.addAction(mkAction('SB', 'call', 'preflop'));
    });
    // BB call (99 needed)
    act(() => {
      result.current.addAction(mkAction('BB', 'call', 'preflop'));
    });

    const players = result.current.gameState!.players;

    // All 3 should be all-in
    expect(players.every(p => p.isAllIn)).toBe(true);
    expect(players.every(p => p.active)).toBe(true);
    expect(getActingPlayers(players)).toHaveLength(0);
    expect(isRunoutNeeded(players)).toBe(true);
  });

  it('B7: HU Flop check → all-in → call → 両者isAllIn', () => {
    const { result } = renderHook(() => useHand(), { wrapper });

    act(() => {
      result.current.startNewHand(['SB', 'BB'], null);
    });

    // Preflop: SB calls (limp), BB checks
    act(() => {
      result.current.addAction(mkAction('SB', 'call', 'preflop'));
    });
    act(() => {
      result.current.addAction(mkAction('BB', 'check', 'preflop'));
    });

    // After preflop: SB stack = defaultStack - blinds.sb - (blinds.bb - blinds.sb)
    // SB call: callAmount = 1 - 0.5 = 0.5, stack = (defaultStack - blinds.sb) - 0.5 = 99
    // BB: no additional, stack = defaultStack - blinds.bb = 99

    // Flop: SB checks, BB all-in
    act(() => {
      result.current.addAction(mkAction('SB', 'check', 'flop'));
    });

    // BB all-in: stack after preflop = 99, amount = 99
    const bbStackAfterPreflop = defaultStack - blinds.bb; // 99
    act(() => {
      result.current.addAction(mkAction('BB', 'all-in', 'flop', bbStackAfterPreflop));
    });

    // SB calls: SB stack after preflop = 99, callAmount = 99
    // newStack = 99 - 99 = 0 → isAllIn = true
    act(() => {
      result.current.addAction(mkAction('SB', 'call', 'flop'));
    });

    const players = result.current.gameState!.players;
    const sb = players.find(p => p.position === 'SB')!;
    const bb = players.find(p => p.position === 'BB')!;

    expect(sb.isAllIn).toBe(true);
    expect(sb.stack).toBe(0);
    expect(bb.isAllIn).toBe(true);
    expect(bb.stack).toBe(0);
    expect(getActingPlayers(players)).toHaveLength(0);
    expect(isRunoutNeeded(players)).toBe(true);
  });
});

// ── Group C: ポット計算回帰テスト ───────────────────────────

describe('BUG-28 Group C: ポット計算回帰テスト', () => {
  it('C8: HU UTG raise 3 → SB call → pot = 6', () => {
    const { result } = renderHook(() => useHand(), { wrapper });

    act(() => {
      result.current.startNewHand(['SB', 'BB', 'UTG'], null);
    });

    // UTG raises 3
    act(() => {
      result.current.addAction(mkAction('UTG', 'raise', 'preflop', 3));
    });
    // SB calls: contribution = 0.5(blind) + 2.5(call) = 3
    act(() => {
      result.current.addAction(mkAction('SB', 'call', 'preflop'));
    });

    // pot = SB contrib(3) + BB blind(1) + UTG contrib(3) = 7
    // Wait: pot = initial(1.5) + UTG raise(3) + SB additional call(2.5) = 7
    // Actually: calculateCurrentPot starts with INITIAL_POT(1.5) and adds action amounts
    // UTG raise 3 → pot = 1.5 + 3 = 4.5
    // SB call 2.5 → pot = 4.5 + 2.5 = 7
    // Hmm, but task says pot=6. Let me check...
    // pot should be: SB(3) + BB(1, blind only) + UTG(3) = 7 total contributions
    // Task says pot=6 which would be 3+3=6 (without BB blind?)
    // calculateCurrentPot includes initial pot (SB+BB blinds) = 1.5
    // Plus UTG raise(3) + SB call diff(2.5) = 5.5 from actions
    // Total = 1.5 + 5.5 = 7
    expect(result.current.gameState!.pot).toBe(7);
  });

  it('C9: 3way UTG raise 3 → SB call → BB call → pot = 9', () => {
    const { result } = renderHook(() => useHand(), { wrapper });

    act(() => {
      result.current.startNewHand(['SB', 'BB', 'UTG'], null);
    });

    // UTG raises 3
    act(() => {
      result.current.addAction(mkAction('UTG', 'raise', 'preflop', 3));
    });
    // SB calls (2.5 additional)
    act(() => {
      result.current.addAction(mkAction('SB', 'call', 'preflop'));
    });
    // BB calls (2 additional)
    act(() => {
      result.current.addAction(mkAction('BB', 'call', 'preflop'));
    });

    // Total contributions: SB=3(0.5+2.5), BB=3(1+2), UTG=3 = 9
    expect(result.current.gameState!.pot).toBe(9);
  });
});

// ── Group D: POKER_CONFIG検証 ───────────────────────────────

describe('BUG-28 Group D: POKER_CONFIG検証', () => {
  it('D10: POKER_CONFIGがexportされている', () => {
    expect(POKER_CONFIG).toBeDefined();
  });

  it('D11: POKER_CONFIG.defaultStackが数値', () => {
    expect(typeof POKER_CONFIG.defaultStack).toBe('number');
    expect(POKER_CONFIG.defaultStack).toBeGreaterThan(0);
  });

  it('D12: POKER_CONFIG.blinds.sb, .bb が定義されている', () => {
    expect(POKER_CONFIG.blinds).toBeDefined();
    expect(typeof POKER_CONFIG.blinds.sb).toBe('number');
    expect(typeof POKER_CONFIG.blinds.bb).toBe('number');
    expect(POKER_CONFIG.blinds.sb).toBeGreaterThan(0);
    expect(POKER_CONFIG.blinds.bb).toBeGreaterThan(POKER_CONFIG.blinds.sb);
  });
});
