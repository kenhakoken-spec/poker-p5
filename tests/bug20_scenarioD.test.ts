/**
 * BUG-20 Phase1: シナリオ群D — ショートオールイン・ランアウト（4件）
 *
 * テスト対象: isShortAllIn, didLastAggressionReopenAction, isRunoutNeeded,
 *             shouldSkipPlayer, getAvailableActions
 */
import { describe, it, expect } from 'vitest';
import type { Position, ActionRecord, PlayerState } from '@/types/poker';
import {
  shouldSkipPlayer,
  isShortAllIn,
  didLastAggressionReopenAction,
  isRunoutNeeded,
  getAvailableActions,
  getCurrentBetLevel,
  getLastRaiseIncrement,
} from '@/utils/bettingUtils';

// ── helpers ──────────────────────────────────────────────────
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
  street: 'preflop' | 'flop' | 'turn' | 'river' = 'preflop',
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

// ══════════════════════════════════════════════════════════════
// Scenario 15: 3way preflop — Open → Call → Short All-in
// ══════════════════════════════════════════════════════════════
describe('Scenario 15: 3way Open → Call → Short All-in', () => {
  // UTG(50BB) raises to 3BB → SB(100BB) calls → BB(4BB) all-in 3BB more (total 4BB)
  // BB's all-in: increment = 4 - 3 = 1 < minRaiseSize(2) → SHORT
  //
  // UTG: already acted + short all-in → no re-action right
  // SB: must respond to BB's all-in → call/fold available

  const actions: ActionRecord[] = [
    mkAction('UTG', 'raise', 3, 'preflop'),
    mkAction('SB', 'call', undefined, 'preflop'),
    mkAction('BB', 'all-in', 3, 'preflop'), // prev=1(blind), +3 → total=4BB
  ];

  // Players AFTER these actions
  const players: PlayerState[] = [
    mkPlayer('UTG', 47, true, false),  // 50 - 3 = 47 remaining
    mkPlayer('SB', 97, true, false),   // 100 - 3 = 97 remaining
    mkPlayer('BB', 0, true, true),     // 4 - 4 = 0, all-in
  ];

  const pot = 3 + 3 + 4; // 10BB

  it('isShortAllIn: BB all-in 4BB is short (increment 1 < minRaise 2)', () => {
    // After UTG raises to 3BB: currentBet=3, minRaiseSize=2 (3-1)
    // BB all-in total = 4BB, increment = 4-3 = 1
    expect(isShortAllIn(4, 3, 2)).toBe(true);
  });

  it('didLastAggressionReopenAction: false (BB short all-in does not reopen)', () => {
    expect(didLastAggressionReopenAction(actions, 'preflop')).toBe(false);
  });

  it('getCurrentBetLevel: 4BB after BB all-in', () => {
    expect(getCurrentBetLevel(actions, 'preflop')).toBe(4);
  });

  it('SB has action (call/fold): SB must respond to BB all-in', () => {
    const result = getAvailableActions('SB', 'preflop', actions, players, pot);
    const actionNames = result.map(a => a.action);
    expect(actionNames).toContain('fold');
    // SB contributed 3, currentBet=4 → callAmount=1, stack(97) > 1 → call available
    expect(actionNames).toContain('call');
  });

  it('UTG has limited action: short all-in does not reopen for UTG', () => {
    // UTG already acted (raised). BB's short all-in does NOT reopen action.
    // didLastAggressionReopenAction = false confirms this.
    // However getAvailableActions itself doesn't enforce turn order —
    // the game loop should check didLastAggressionReopenAction.
    // We verify getAvailableActions mechanically returns options (call diff = 1BB):
    const result = getAvailableActions('UTG', 'preflop', actions, players, pot);
    const actionNames = result.map(a => a.action);
    // UTG can mechanically call the 1BB difference, but game should skip UTG
    // because didLastAggressionReopenAction = false
    expect(didLastAggressionReopenAction(actions, 'preflop')).toBe(false);
    // Record: getAvailableActions returns actions, but game should NOT give UTG a turn
    expect(actionNames.length).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario 16: All 3 players All-in → Runout needed
// ══════════════════════════════════════════════════════════════
describe('Scenario 16: All 3 players All-in → Runout', () => {
  // Preflop: UTG(50BB) all-in → SB(100BB) all-in → BB(100BB) all-in

  const actions: ActionRecord[] = [
    mkAction('UTG', 'all-in', 50, 'preflop'),   // prev=0, total=50
    mkAction('SB', 'all-in', 99.5, 'preflop'),  // prev=0.5(blind), total=100
    mkAction('BB', 'all-in', 99, 'preflop'),     // prev=1(blind), total=100
  ];

  const players: PlayerState[] = [
    mkPlayer('UTG', 0, true, true),
    mkPlayer('SB', 0, true, true),
    mkPlayer('BB', 0, true, true),
  ];

  it('isRunoutNeeded: true (all active, all all-in)', () => {
    expect(isRunoutNeeded(players)).toBe(true);
  });

  it('shouldSkipPlayer: true for all players', () => {
    expect(shouldSkipPlayer(players[0])).toBe(true);
    expect(shouldSkipPlayer(players[1])).toBe(true);
    expect(shouldSkipPlayer(players[2])).toBe(true);
  });

  it('getAvailableActions: empty for all players (all all-in)', () => {
    expect(getAvailableActions('UTG', 'preflop', actions, players, 250)).toEqual([]);
    expect(getAvailableActions('SB', 'preflop', actions, players, 250)).toEqual([]);
    expect(getAvailableActions('BB', 'preflop', actions, players, 250)).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario 17: 2 All-in + 1 Fold → Runout needed
// ══════════════════════════════════════════════════════════════
describe('Scenario 17: 2 All-in + 1 Fold → Runout', () => {
  // Preflop: UTG(50BB) all-in → SB(100BB) all-in → BB(100BB) fold

  const actions: ActionRecord[] = [
    mkAction('UTG', 'all-in', 50, 'preflop'),
    mkAction('SB', 'all-in', 99.5, 'preflop'),
    mkAction('BB', 'fold', undefined, 'preflop'),
  ];

  const players: PlayerState[] = [
    mkPlayer('UTG', 0, true, true),
    mkPlayer('SB', 0, true, true),
    mkPlayer('BB', 100, false, false), // folded → active=false
  ];

  it('isRunoutNeeded: true (2 active players, 0 acting)', () => {
    expect(isRunoutNeeded(players)).toBe(true);
  });

  it('shouldSkipPlayer: true for UTG (all-in), true for SB (all-in), true for BB (inactive)', () => {
    expect(shouldSkipPlayer(players[0])).toBe(true); // all-in
    expect(shouldSkipPlayer(players[1])).toBe(true); // all-in
    expect(shouldSkipPlayer(players[2])).toBe(true); // inactive (folded)
  });

  it('getAvailableActions: empty for all', () => {
    expect(getAvailableActions('UTG', 'preflop', actions, players, 150)).toEqual([]);
    expect(getAvailableActions('SB', 'preflop', actions, players, 150)).toEqual([]);
    expect(getAvailableActions('BB', 'preflop', actions, players, 150)).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario 18: Flop — Bet → Full Raise All-in → Short All-in
//              → Original bettor's action rights
// ══════════════════════════════════════════════════════════════
describe('Scenario 18: Flop Bet → Raise all-in → Short all-in → Re-action', () => {
  // Flop: SB(200BB) bets 10BB → BB(100BB) raise all-in 100BB → UTG(50BB) all-in 50BB (short)
  //
  // BB raise: prev=0, +100 → total=100, increment=100-10=90 >= minRaise(10) → FULL RAISE
  // UTG all-in: prev=0, +50 → total=50, 50 < currentBet(100) → below bet level → SHORT
  //
  // SB action rights:
  //   - BB's full raise (90BB increment) reopened action for SB
  //   - UTG's short all-in did NOT reopen further
  //   - didLastAggressionReopenAction = false (last aggression = UTG short)
  //   - But SB hasn't matched BB's 100BB yet → SB should have call/fold/all-in

  const actions: ActionRecord[] = [
    mkAction('SB', 'bet', 10, 'flop'),
    mkAction('BB', 'all-in', 100, 'flop'),
    mkAction('UTG', 'all-in', 50, 'flop'),
  ];

  // Players AFTER these actions
  const players: PlayerState[] = [
    mkPlayer('SB', 190, true, false),   // 200 - 10 = 190 remaining
    mkPlayer('BB', 0, true, true),      // 100 - 100 = 0, all-in
    mkPlayer('UTG', 0, true, true),     // 50 - 50 = 0, all-in
  ];

  const pot = 10 + 100 + 50; // 160BB

  it('BB raise is a full raise (increment 90 >= minRaise 10)', () => {
    const actionsBeforeUTG = actions.slice(0, 2);
    expect(didLastAggressionReopenAction(actionsBeforeUTG, 'flop')).toBe(true);
  });

  it('UTG all-in is short (50 < currentBet 100)', () => {
    // UTG total=50, currentBet after BB=100, UTG doesn't even reach bet level
    expect(isShortAllIn(50, 100, 90)).toBe(true);
  });

  it('didLastAggressionReopenAction: false after UTG short all-in', () => {
    expect(didLastAggressionReopenAction(actions, 'flop')).toBe(false);
  });

  it('getCurrentBetLevel: 100BB (BB all-in)', () => {
    expect(getCurrentBetLevel(actions, 'flop')).toBe(100);
  });

  it('SB has action: must respond to BB 100BB raise', () => {
    const result = getAvailableActions('SB', 'flop', actions, players, pot);
    const actionNames = result.map(a => a.action);
    // SB contributed 10, currentBet=100 → callAmount=90, stack(190) > 90 → call available
    expect(actionNames).toContain('fold');
    expect(actionNames).toContain('call');
  });

  it('SB is not restricted (other acting players exist... wait, only SB is acting)', () => {
    // actingPlayers = players active && !isAllIn = [SB only]
    // isOnlyActingPlayer = true, hasBet = true → isRestricted = true
    // Under restriction: SB can fold + call (if stack > callAmount) or all-in
    // SB stack=190, callAmount=90, 190 > 90 → call should be available
    const result = getAvailableActions('SB', 'flop', actions, players, pot);
    const actionNames = result.map(a => a.action);

    // Under isRestricted, bet/raise sizes are NOT added, but all-in may be
    // The code: if isRestricted && hasBet && callAmount > 0 && player.stack <= callAmount → all-in
    // Here stack(190) > callAmount(90) → this condition is false → no all-in from restricted path
    // But call was already added in the non-restricted check above
    // So SB should have: fold, call
    // (raise/all-in may or may not be present depending on restriction logic)
    expect(actionNames).toContain('fold');
    expect(actionNames).toContain('call');
  });

  it('isRunoutNeeded after SB calls: true', () => {
    // If SB calls, all active players have matched bets or are all-in
    // actingPlayers with chips = 0 or 1 → runout
    const playersAfterCall: PlayerState[] = [
      mkPlayer('SB', 100, true, false),  // 190 - 90 = 100 remaining
      mkPlayer('BB', 0, true, true),
      mkPlayer('UTG', 0, true, true),
    ];
    // SB is the only acting player (not all-in) → actingPlayers.length = 1 ≤ 1
    expect(isRunoutNeeded(playersAfterCall)).toBe(true);
  });
});
