import { describe, it, expect } from 'vitest';
import type { Position, ActionRecord, PlayerState, PotWinner } from '@/types/poker';
import { calculateSidePots, getTotalContributions, calculateCurrentPot, calculatePotForStreet, calculateWinnings } from '@/utils/potUtils';

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

  describe('BUG-9: チョップ時のポット計算（ブラインド超過キャップ）', () => {
    it('BB all-in preflop: contribution capped at 100', () => {
      // BBがプリフロでオールイン（100BB）、SBコール
      // ブラインドが控除されないためBBの投入が101になるバグの修正確認
      const actions: ActionRecord[] = [
        mkAction('SB', 'call'),        // SBがBBにマッチ（0.5追加）
        mkAction('BB', 'all-in', 100), // BBのスタック全額（ブラインド未控除で100）
        mkAction('SB', 'call'),        // SBがBBにマッチ
      ];
      const contribs = getTotalContributions(actions);
      // BBの投入: blind(1) + all-in(100) = 101 → キャップで100
      expect(contribs.get('BB')).toBe(100);
      // SBの投入: blind(0.5) + call(0.5) + call(99) = 100
      expect(contribs.get('SB')).toBe(100);
    });

    it('SB all-in preflop: contribution capped at 100', () => {
      // SBがプリフロでオールイン（100BB）
      const actions: ActionRecord[] = [
        mkAction('SB', 'all-in', 100), // SBのスタック全額
        mkAction('BB', 'call'),        // BBコール
      ];
      const contribs = getTotalContributions(actions);
      // SBの投入: blind(0.5) + all-in(100) = 100.5 → キャップで100
      expect(contribs.get('SB')).toBe(100);
      // BBの投入: blind(1) + call(99.5) = 100.5 → キャップで100
      expect(contribs.get('BB')).toBe(100);
    });

    it('pot is correct when BB goes all-in (capped)', () => {
      // BBオールイン、SBコール → ポット = 200（100+100）
      const actions: ActionRecord[] = [
        mkAction('BB', 'all-in', 100),
        mkAction('SB', 'call'),
      ];
      const pot = calculateCurrentPot(actions);
      // 修正前: 201（SB=100.5, BB=101） → 修正後: 200（SB=100, BB=100）
      expect(pot).toBe(200);
    });

    it('chop pot split is correct with calculateWinnings', () => {
      // HU: SBとBBがオールイン、チョップ → 各100BB返却
      const actions: ActionRecord[] = [
        mkAction('SB', 'all-in', 100),
        mkAction('BB', 'call'),
      ];
      const players: PlayerState[] = [
        mkPlayer('SB', 0, true, true),
        mkPlayer('BB', 0, true, true),
      ];
      const pots = calculateSidePots(actions, players);
      const potWinners: PotWinner[] = [{
        potIndex: 0,
        potAmount: pots[0].amount,
        winners: ['SB', 'BB'] as Position[],
      }];
      const winnings = calculateWinnings(potWinners, pots[0].amount, ['SB', 'BB'] as Position[]);
      // 各プレイヤーは100BB（投入額と同じ）を獲得
      expect(winnings.get('SB')).toBe(100);
      expect(winnings.get('BB')).toBe(100);
    });

    it('3-way chop with all-in: pot correctly capped', () => {
      // UTG bet 3, BB all-in 100, SB all-in 100, UTG call
      const actions: ActionRecord[] = [
        mkAction('UTG', 'bet', 3),
        mkAction('SB', 'all-in', 100),
        mkAction('BB', 'all-in', 100),
        mkAction('UTG', 'call'),
      ];
      const contribs = getTotalContributions(actions);
      // 各プレイヤーの投入が100を超えないこと
      expect(contribs.get('SB')).toBe(100);
      expect(contribs.get('BB')).toBe(100);
      expect(contribs.get('UTG')).toBe(100);

      const pot = calculateCurrentPot(actions);
      // 全員100BBずつ → ポット = 300
      expect(pot).toBe(300);
    });

    it('non-all-in contributions are not affected by cap', () => {
      // 通常のベット（100未満）はキャップの影響を受けない
      const actions: ActionRecord[] = [
        mkAction('UTG', 'bet', 3),
        mkAction('BB', 'call'),
      ];
      const contribs = getTotalContributions(actions);
      expect(contribs.get('UTG')).toBe(3);
      expect(contribs.get('BB')).toBe(3);
      expect(contribs.get('SB')).toBe(0.5);

      const pot = calculateCurrentPot(actions);
      // SB(0.5) + BB(3) + UTG(3) = 6.5
      expect(pot).toBe(6.5);
    });

    it('calculateWinnings with single winner (no chop)', () => {
      const totalPot = 200;
      const winnings = calculateWinnings([], totalPot, 'BB' as Position);
      expect(winnings.get('BB')).toBe(200);
      expect(winnings.size).toBe(1);
    });

    it('calculateWinnings with potWinners for side pots', () => {
      const potWinners: PotWinner[] = [
        { potIndex: 0, potAmount: 60, winners: ['UTG', 'MP'] as Position[] },
        { potIndex: 1, potAmount: 40, winners: ['MP'] as Position[] },
      ];
      const winnings = calculateWinnings(potWinners, 100, ['UTG', 'MP'] as Position[]);
      // UTG: 60/2 = 30
      expect(winnings.get('UTG')).toBe(30);
      // MP: 60/2 + 40 = 70
      expect(winnings.get('MP')).toBe(70);
    });

    it('calculatePotForStreet with BB all-in on flop', () => {
      const actions: ActionRecord[] = [
        mkAction('UTG', 'bet', 3),
        mkAction('BB', 'call'),
        mkAction('BB', 'all-in', 97, 'flop'),
        mkAction('UTG', 'call', undefined, 'flop'),
      ];
      const pot = calculatePotForStreet(actions, 'flop');
      // Preflop: SB(0.5) + UTG(3) + BB(3) = 6.5
      // Flop: BB all-in 97 → BB total = 3+97=100, UTG call → UTG total should cap at 100
      // Total: SB(0.5) + BB(100) + UTG(100) = 200.5
      expect(pot).toBe(200.5);
    });
  });
});
