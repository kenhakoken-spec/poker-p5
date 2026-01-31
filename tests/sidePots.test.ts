import { describe, it, expect } from 'vitest';
import type { Position, ActionRecord, PlayerState } from '@/types/poker';
import { calculateSidePots, getTotalContributions } from '@/utils/potUtils';

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

describe('Side Pot Calculation', () => {
  describe('getTotalContributions', () => {
    it('tracks preflop blinds correctly', () => {
      const actions: ActionRecord[] = [];
      const contribs = getTotalContributions(actions);
      expect(contribs.get('SB')).toBe(0.5);
      expect(contribs.get('BB')).toBe(1);
    });

    it('tracks bet and call correctly', () => {
      const actions: ActionRecord[] = [
        mkAction('UTG', 'bet', 3),
        mkAction('MP', 'call'),
      ];
      const contribs = getTotalContributions(actions);
      expect(contribs.get('UTG')).toBe(3);
      // MP calls 3BB (matching UTG's bet in preflop context)
      expect(contribs.get('MP')).toBe(3);
    });
  });

  describe('calculateSidePots', () => {
    it('no side pots when all players have equal contributions', () => {
      const actions: ActionRecord[] = [
        mkAction('UTG', 'bet', 10),
        mkAction('MP', 'call'),
      ];
      const players: PlayerState[] = [
        mkPlayer('UTG', 90, true),
        mkPlayer('MP', 90, true),
        mkPlayer('SB', 100, false), // folded
        mkPlayer('BB', 100, false), // folded
      ];
      const pots = calculateSidePots(actions, players);
      expect(pots.length).toBe(1);
      expect(pots[0].eligiblePositions).toContain('UTG');
      expect(pots[0].eligiblePositions).toContain('MP');
    });

    it('2 players all-in with different stacks', () => {
      // Player A has 50BB, Player B has 100BB
      // A goes all-in for 50, B calls
      const actions: ActionRecord[] = [
        mkAction('UTG', 'all-in', 50),
        mkAction('MP', 'call'),
      ];
      const players: PlayerState[] = [
        mkPlayer('UTG', 0, true, true),  // all-in 50
        mkPlayer('MP', 50, true),         // called 50, has 50 left
        mkPlayer('SB', 100, false),
        mkPlayer('BB', 100, false),
      ];
      const pots = calculateSidePots(actions, players);
      // Main pot: both eligible
      expect(pots.length).toBe(1); // same contribution level
      expect(pots[0].eligiblePositions).toContain('UTG');
      expect(pots[0].eligiblePositions).toContain('MP');
    });

    it('3 players with different all-in amounts', () => {
      // A: all-in 20, B: all-in 50, C: call 50
      const actions: ActionRecord[] = [
        mkAction('UTG', 'all-in', 20),
        mkAction('MP', 'all-in', 50),
        mkAction('CO', 'call'),
      ];
      const players: PlayerState[] = [
        mkPlayer('UTG', 0, true, true),  // contributed 20
        mkPlayer('MP', 0, true, true),   // contributed 50
        mkPlayer('CO', 50, true),         // contributed 50
        mkPlayer('SB', 100, false),
        mkPlayer('BB', 100, false),
      ];
      const pots = calculateSidePots(actions, players);
      // 3 unique active levels: 20, 50, 50 → unique: [20, 50]
      expect(pots.length).toBe(2);

      // Main pot (level 20): all 3 active players contribute up to 20 each
      expect(pots[0].eligiblePositions.length).toBe(3);
      expect(pots[0].eligiblePositions).toContain('UTG');
      expect(pots[0].eligiblePositions).toContain('MP');
      expect(pots[0].eligiblePositions).toContain('CO');

      // Side pot (level 50): only MP and CO eligible (contributed >=50)
      expect(pots[1].eligiblePositions.length).toBe(2);
      expect(pots[1].eligiblePositions).toContain('MP');
      expect(pots[1].eligiblePositions).toContain('CO');
      expect(pots[1].eligiblePositions).not.toContain('UTG');
    });

    it('fold + all-in scenario', () => {
      // UTG folds, MP all-in 30, CO calls
      const actions: ActionRecord[] = [
        mkAction('UTG', 'fold'),
        mkAction('MP', 'all-in', 30),
        mkAction('CO', 'call'),
      ];
      const players: PlayerState[] = [
        mkPlayer('UTG', 100, false),     // folded
        mkPlayer('MP', 0, true, true),   // all-in 30
        mkPlayer('CO', 70, true),         // called 30
        mkPlayer('SB', 100, false),
        mkPlayer('BB', 100, false),
      ];
      const pots = calculateSidePots(actions, players);
      expect(pots.length).toBe(1);
      expect(pots[0].eligiblePositions).toContain('MP');
      expect(pots[0].eligiblePositions).toContain('CO');
      expect(pots[0].eligiblePositions).not.toContain('UTG');
      // Pot should include SB/BB blinds + MP's 30 + CO's 30
      expect(pots[0].amount).toBeGreaterThan(0);
    });

    it('all-in runout: all active players all-in', () => {
      // All 3 players all-in with different amounts
      const actions: ActionRecord[] = [
        mkAction('UTG', 'all-in', 10),
        mkAction('MP', 'all-in', 30),
        mkAction('CO', 'all-in', 50),
      ];
      const players: PlayerState[] = [
        mkPlayer('UTG', 0, true, true),
        mkPlayer('MP', 0, true, true),
        mkPlayer('CO', 0, true, true),
        mkPlayer('SB', 100, false),
        mkPlayer('BB', 100, false),
      ];
      const pots = calculateSidePots(actions, players);

      // 3 different contribution levels: 10, 30, 50
      expect(pots.length).toBe(3);

      // Main pot: all 3 eligible
      expect(pots[0].eligiblePositions.length).toBe(3);

      // Side pot 1: MP and CO
      expect(pots[1].eligiblePositions.length).toBe(2);
      expect(pots[1].eligiblePositions).not.toContain('UTG');

      // Side pot 2: only CO
      expect(pots[2].eligiblePositions.length).toBe(1);
      expect(pots[2].eligiblePositions).toContain('CO');
    });

    it('single active player gets entire pot', () => {
      const actions: ActionRecord[] = [
        mkAction('UTG', 'bet', 3),
      ];
      const players: PlayerState[] = [
        mkPlayer('UTG', 97, true),
        mkPlayer('MP', 100, false),
        mkPlayer('SB', 100, false),
        mkPlayer('BB', 100, false),
      ];
      const pots = calculateSidePots(actions, players);
      expect(pots.length).toBe(1);
      expect(pots[0].eligiblePositions).toEqual(['UTG']);
    });
  });
});
