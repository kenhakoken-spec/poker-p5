import { describe, it, expect } from 'vitest';
import type { Position, Street, ActionRecord, PlayerState } from '@/types/poker';
import { getAvailableActions } from '@/utils/bettingUtils';
import { POKER_CONFIG } from '@/utils/pokerConfig';

// POKER_CONFIG: sb=0.5, bb=1, defaultStack=100

function mkPlayer(position: Position, stack: number, active = true, isAllIn = false): PlayerState {
  return { position, stack, active, isAllIn };
}

function mkAction(position: Position, action: string, amount?: number, street: Street = 'preflop'): ActionRecord {
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

function actionNames(result: { action: string }[]): string[] {
  return result.map(a => a.action);
}

describe('BUG-35: BB Preflop Fold Option', () => {
  const SB = POKER_CONFIG.blinds.sb;   // 0.5
  const BB = POKER_CONFIG.blinds.bb;   // 1
  const STACK = POKER_CONFIG.defaultStack; // 100

  it('HU: SB open → BB has Fold', () => {
    // SB raises adding 2 on top of 0.5 blind → total contrib 2.5, currentBet=2.5
    const actions: ActionRecord[] = [
      mkAction('SB', 'raise', 2),
    ];
    const players: PlayerState[] = [
      mkPlayer('SB', STACK - SB - 2),  // 97.5
      mkPlayer('BB', STACK - BB),       // 99
    ];
    const pot = SB + BB + 2; // 3.5
    const available = actionNames(getAvailableActions('BB', 'preflop', actions, players, pot));

    expect(available).toContain('fold');
    expect(available).toContain('call');
  });

  it('3way: UTG open → SB fold → BB has Fold', () => {
    // UTG raises adding 3 → total contrib 3, currentBet=3
    const actions: ActionRecord[] = [
      mkAction('UTG', 'raise', 3),
      mkAction('SB', 'fold'),
    ];
    const players: PlayerState[] = [
      mkPlayer('UTG', STACK - 3),       // 97
      mkPlayer('SB', STACK - SB, false), // 99.5, folded
      mkPlayer('BB', STACK - BB),        // 99
    ];
    const pot = SB + BB + 3; // 4.5
    const available = actionNames(getAvailableActions('BB', 'preflop', actions, players, pot));

    expect(available).toContain('fold');
    expect(available).toContain('call');
  });

  it('BB option (all limp/call, no raise): BB has Check + Fold + sizing action', () => {
    // UTG limps (calls 1), SB completes (calls to 1)
    // hasBet = false → code produces 'check' + 'bet' (not 'raise')
    const actions: ActionRecord[] = [
      mkAction('UTG', 'call'),
      mkAction('SB', 'call'),
    ];
    const players: PlayerState[] = [
      mkPlayer('UTG', STACK - BB),   // 99 (called 1)
      mkPlayer('SB', STACK - BB),    // 99 (completed to 1: 0.5 blind + 0.5 call)
      mkPlayer('BB', STACK - BB),    // 99
    ];
    const pot = BB * 3; // 3 (UTG 1 + SB 1 + BB 1)
    const available = actionNames(getAvailableActions('BB', 'preflop', actions, players, pot));

    expect(available).toContain('fold');
    expect(available).toContain('check');
    // BB option: sizing action available (bet or raise)
    expect(available.some(a => a === 'bet' || a === 'raise')).toBe(true);
  });

  it('BB facing raise: UTG raise → BB has Call + Fold + Raise', () => {
    // UTG raises adding 3 → contrib=3, currentBet=3
    const actions: ActionRecord[] = [
      mkAction('UTG', 'raise', 3),
    ];
    const players: PlayerState[] = [
      mkPlayer('UTG', STACK - 3),    // 97
      mkPlayer('SB', STACK - SB),    // 99.5 (hasn't acted yet, but we test BB)
      mkPlayer('BB', STACK - BB),    // 99
    ];
    const pot = SB + BB + 3; // 4.5
    const available = actionNames(getAvailableActions('BB', 'preflop', actions, players, pot));

    expect(available).toContain('fold');
    expect(available).toContain('call');
    expect(available).toContain('raise');
  });

  it('BB facing 3bet: UTG raise → CO 3bet → BB has Call + Fold + Raise', () => {
    // UTG raises adding 3 → contrib=3, currentBet=3
    // CO 3bets adding 9 → contrib=9, currentBet=9
    const actions: ActionRecord[] = [
      mkAction('UTG', 'raise', 3),
      mkAction('CO', 'raise', 9),
    ];
    const players: PlayerState[] = [
      mkPlayer('UTG', STACK - 3),    // 97
      mkPlayer('CO', STACK - 9),     // 91
      mkPlayer('SB', STACK - SB),    // 99.5
      mkPlayer('BB', STACK - BB),    // 99
    ];
    const pot = SB + BB + 3 + 9; // 13.5
    const available = actionNames(getAvailableActions('BB', 'preflop', actions, players, pot));

    expect(available).toContain('fold');
    expect(available).toContain('call');
    expect(available).toContain('raise');
  });
});
