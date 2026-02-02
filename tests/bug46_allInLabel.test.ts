import { describe, it, expect } from 'vitest';
import type { Position, ActionRecord, PlayerState } from '@/types/poker';
import { getAvailableActions } from '@/utils/bettingUtils';
import { POKER_CONFIG } from '@/utils/pokerConfig';

function mkPlayer(position: Position, stack: number, active = true, isAllIn = false): PlayerState {
  return { position, stack, active, isAllIn };
}

function mkAction(position: Position, action: string, amount?: number, street = 'preflop' as const): ActionRecord {
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

describe('BUG-46: All-in label when call amount >= remaining stack', () => {
  it('callAmount === stack → All-in（not Call）', () => {
    // 3way: UTG all-in 50, MP all-in 50, CO has exactly 50 stack
    // CO's callAmount = 50 = stack → should show "all-in", not "call"
    const actions: ActionRecord[] = [
      mkAction('UTG', 'all-in', 50),
      mkAction('MP', 'all-in', 50),
    ];
    const players: PlayerState[] = [
      mkPlayer('UTG', 0, true, true),
      mkPlayer('MP', 0, true, true),
      mkPlayer('CO', 50, true),
      mkPlayer('BTN', 100, true),
      mkPlayer('SB', 100, true),
      mkPlayer('BB', 100, true),
    ];
    const pot = 101.5; // SB(0.5) + BB(1) + UTG(50) + MP(50)
    const available = getAvailableActions('CO', 'preflop', actions, players, pot);

    // CO should see: fold + all-in (NOT call)
    const actionNames = available.map(a => a.action);
    expect(actionNames).toContain('all-in');
    expect(actionNames).not.toContain('call');
  });

  it('callAmount < stack → Call（normal）', () => {
    // UTG bets 10, MP has 100 stack → callAmount = 10 < 100 → "call"
    const actions: ActionRecord[] = [
      mkAction('UTG', 'bet', 10),
    ];
    const players: PlayerState[] = [
      mkPlayer('UTG', 90, true),
      mkPlayer('MP', 100, true),
      mkPlayer('CO', 100, true),
      mkPlayer('BTN', 100, true),
      mkPlayer('SB', 100, true),
      mkPlayer('BB', 100, true),
    ];
    const pot = 11.5; // SB(0.5) + BB(1) + UTG(10)
    const available = getAvailableActions('MP', 'preflop', actions, players, pot);

    const actionNames = available.map(a => a.action);
    expect(actionNames).toContain('call');
  });

  it('callAmount > stack → All-in（short all-in, restricted）', () => {
    // UTG all-in 80, MP all-in 80, CO has 30 stack and is the only acting player
    // CO is restricted (only acting player), callAmount = 80 > stack 30 → short all-in
    const actions: ActionRecord[] = [
      mkAction('SB', 'fold'),
      mkAction('BB', 'fold'),
      mkAction('UTG', 'all-in', 80),
      mkAction('MP', 'all-in', 80),
    ];
    const players: PlayerState[] = [
      mkPlayer('UTG', 0, true, true),
      mkPlayer('MP', 0, true, true),
      mkPlayer('CO', 30, true),
      mkPlayer('BTN', 100, false),
      mkPlayer('SB', 100, false),
      mkPlayer('BB', 100, false),
    ];
    const pot = 161.5;
    const available = getAvailableActions('CO', 'preflop', actions, players, pot);

    const actionNames = available.map(a => a.action);
    expect(actionNames).toContain('all-in');
    expect(actionNames).toContain('fold');
    expect(actionNames).not.toContain('call');
  });

  it('callAmount === stack in restricted scenario → All-in', () => {
    // Only acting player, call equals exact stack
    const actions: ActionRecord[] = [
      mkAction('SB', 'fold'),
      mkAction('BB', 'fold'),
      mkAction('UTG', 'all-in', 50),
      mkAction('MP', 'all-in', 50),
    ];
    const players: PlayerState[] = [
      mkPlayer('UTG', 0, true, true),
      mkPlayer('MP', 0, true, true),
      mkPlayer('CO', 50, true), // only acting player, callAmount = 50 = stack
      mkPlayer('BTN', 100, false),
      mkPlayer('SB', 100, false),
      mkPlayer('BB', 100, false),
    ];
    const pot = 101.5;
    const available = getAvailableActions('CO', 'preflop', actions, players, pot);

    const actionNames = available.map(a => a.action);
    expect(actionNames).toContain('all-in');
    expect(actionNames).not.toContain('call');
  });

  it('non-restricted player with callAmount === stack gets all-in without duplication', () => {
    // Multiple acting players, so not restricted, but callAmount === stack
    const actions: ActionRecord[] = [
      mkAction('UTG', 'all-in', 50),
    ];
    const players: PlayerState[] = [
      mkPlayer('UTG', 0, true, true),
      mkPlayer('MP', 50, true),  // callAmount = 50 = stack
      mkPlayer('CO', 100, true),
      mkPlayer('BTN', 100, true),
      mkPlayer('SB', 100, true),
      mkPlayer('BB', 100, true),
    ];
    const pot = 51.5;
    const available = getAvailableActions('MP', 'preflop', actions, players, pot);

    const actionNames = available.map(a => a.action);
    expect(actionNames).toContain('all-in');
    expect(actionNames).not.toContain('call');
    // all-in should appear exactly once (no duplication)
    expect(actionNames.filter(a => a === 'all-in').length).toBe(1);
  });
});
