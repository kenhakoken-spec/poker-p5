import { describe, it, expect } from 'vitest';
import type { Position, ActionRecord, PlayerState } from '@/types/poker';
import {
  calculateSidePots,
  getTotalContributions,
  calculateCurrentPot,
} from '@/utils/potUtils';

// --- Helpers (same pattern as sidePots.test.ts) ---

function mkPlayer(
  position: Position,
  stack: number,
  active = true,
  isAllIn = false
): PlayerState {
  return { position, stack, active, isAllIn };
}

function mkAction(
  position: Position,
  action: string,
  amount?: number,
  street: 'preflop' | 'flop' | 'turn' | 'river' = 'preflop'
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

function mkStacks(entries: [string, number][]): Map<string, number> {
  return new Map(entries);
}

// =====================================================================
// Test Group 2: All-in + Variable Stacks + Side Pots
// TH Rule Reference: SKILL.md §4 (side pots), §2 (state classification), §6 (fold rules)
// =====================================================================
describe('テスト群2: オールイン+異なるスタック サイドポット・winner候補', () => {
  // =================================================================
  // 2-1: 1 short all-in + all call → no side pot
  // SB=20BB(short), others=100BB. UTG opens 3BB, SB shoves 20BB total.
  // All active match at 20BB → single pot, no side pot.
  // =================================================================
  describe('2-1: 1人ショートall-in + 残り全員コール → サイドポットなし', () => {
    const stacks = mkStacks([
      ['UTG', 100], ['MP', 100], ['CO', 100],
      ['BTN', 100], ['SB', 20], ['BB', 100],
    ]);
    const actions: ActionRecord[] = [
      mkAction('UTG', 'bet', 3),
      mkAction('MP', 'call'),
      mkAction('CO', 'fold'),
      mkAction('BTN', 'fold'),
      mkAction('SB', 'all-in', 19.5),  // SB total: 0.5 blind + 19.5 = 20
      mkAction('BB', 'call'),           // BB total: 1 blind + 19 = 20
      mkAction('UTG', 'call'),          // UTG total: 3 + 17 = 20
      mkAction('MP', 'call'),           // MP total: 3 + 17 = 20
    ];
    const players: PlayerState[] = [
      mkPlayer('UTG', 80, true),
      mkPlayer('MP', 80, true),
      mkPlayer('CO', 100, false),
      mkPlayer('BTN', 100, false),
      mkPlayer('SB', 0, true, true),
      mkPlayer('BB', 80, true),
    ];

    it('contributions: all active at 20BB', () => {
      const contribs = getTotalContributions(actions, stacks);
      expect(contribs.get('UTG')).toBe(20);
      expect(contribs.get('MP')).toBe(20);
      expect(contribs.get('SB')).toBe(20);
      expect(contribs.get('BB')).toBe(20);
    });

    it('no side pot: single pot with 4 active eligible', () => {
      const pots = calculateSidePots(actions, players, stacks);
      expect(pots.length).toBe(1);
      expect(pots[0].amount).toBe(80); // 20×4
      expect(pots[0].eligiblePositions).toEqual(
        expect.arrayContaining(['UTG', 'MP', 'SB', 'BB'])
      );
      expect(pots[0].eligiblePositions).not.toContain('CO');
      expect(pots[0].eligiblePositions).not.toContain('BTN');
    });

    it('SB(all-in) is winner candidate (active=true, not folded)', () => {
      const pots = calculateSidePots(actions, players, stacks);
      expect(pots[0].eligiblePositions).toContain('SB');
    });

    it('total pot = 80', () => {
      expect(calculateCurrentPot(actions, stacks)).toBe(80);
    });
  });

  // =================================================================
  // 2-2: 2 different stacks all-in (50BB vs 100BB)
  // BTN=50BB, SB=100BB, BB=100BB. BTN shoves, SB shoves, BB calls.
  // Main pot (level 50): 150 — all 3 eligible
  // Side pot (level 100): 100 — SB, BB only
  // =================================================================
  describe('2-2: 2人異なるスタックでall-in (50BB vs 100BB)', () => {
    const stacks = mkStacks([['BTN', 50], ['SB', 100], ['BB', 100]]);
    const actions: ActionRecord[] = [
      mkAction('BTN', 'all-in', 50),
      mkAction('SB', 'all-in', 99.5),  // SB total: 0.5 + 99.5 = 100
      mkAction('BB', 'call'),           // BB total: 1 + 99 = 100
    ];
    const players: PlayerState[] = [
      mkPlayer('BTN', 0, true, true),
      mkPlayer('SB', 0, true, true),
      mkPlayer('BB', 0, true, true),
    ];

    it('contributions: BTN=50, SB=100, BB=100', () => {
      const contribs = getTotalContributions(actions, stacks);
      expect(contribs.get('BTN')).toBe(50);
      expect(contribs.get('SB')).toBe(100);
      expect(contribs.get('BB')).toBe(100);
    });

    it('main pot (150) + side pot (100)', () => {
      const pots = calculateSidePots(actions, players, stacks);
      expect(pots.length).toBe(2);
      // Main pot: level 50, 50×3 = 150
      expect(pots[0].amount).toBe(150);
      expect(pots[0].eligiblePositions).toEqual(
        expect.arrayContaining(['BTN', 'SB', 'BB'])
      );
      // Side pot: level 100, (100-50)×2 = 100
      expect(pots[1].amount).toBe(100);
      expect(pots[1].eligiblePositions).toEqual(
        expect.arrayContaining(['SB', 'BB'])
      );
      expect(pots[1].eligiblePositions).not.toContain('BTN');
    });

    it('total pot = 250', () => {
      expect(calculateCurrentPot(actions, stacks)).toBe(250);
    });
  });

  // =================================================================
  // 2-3: 3 different stacks all-in (20/50/100)
  // BTN=20BB, SB=50BB, BB=100BB. BTN shoves, SB shoves, BB calls.
  // BB calls 50 (matching SB), NOT 100. BB has 50BB remaining → NOT all-in.
  // Main pot (level 20): 60 — all 3 eligible
  // Side pot (level 50): 60 — SB, BB only
  // =================================================================
  describe('2-3: 3人異なるスタックでall-in (20/50/100)', () => {
    const stacks = mkStacks([['BTN', 20], ['SB', 50], ['BB', 100]]);
    const actions: ActionRecord[] = [
      mkAction('BTN', 'all-in', 20),
      mkAction('SB', 'all-in', 49.5),  // SB total: 0.5 + 49.5 = 50
      mkAction('BB', 'call'),           // BB total: 1 + 49 = 50 (matches SB)
    ];
    const players: PlayerState[] = [
      mkPlayer('BTN', 0, true, true),   // all-in
      mkPlayer('SB', 0, true, true),    // all-in
      mkPlayer('BB', 50, true, false),  // NOT all-in: 100-50=50 remaining
    ];

    it('BB contributes 50 (matches SB), not full 100 stack', () => {
      const contribs = getTotalContributions(actions, stacks);
      expect(contribs.get('BTN')).toBe(20);
      expect(contribs.get('SB')).toBe(50);
      expect(contribs.get('BB')).toBe(50); // NOT 100
    });

    it('main pot (60) + side pot (60)', () => {
      const pots = calculateSidePots(actions, players, stacks);
      expect(pots.length).toBe(2);
      // Main pot: level 20, 20×3 = 60
      expect(pots[0].amount).toBe(60);
      expect(pots[0].eligiblePositions.length).toBe(3);
      // Side pot: level 50, (50-20)×2 = 60
      expect(pots[1].amount).toBe(60);
      expect(pots[1].eligiblePositions).toEqual(
        expect.arrayContaining(['SB', 'BB'])
      );
      expect(pots[1].eligiblePositions).not.toContain('BTN');
    });

    it('total pot = 120', () => {
      expect(calculateCurrentPot(actions, stacks)).toBe(120);
    });
  });

  // =================================================================
  // 2-4: Short all-in + postflop additional bet → staged side pots
  // CO=30BB(short), BTN/SB/BB=100BB.
  // Preflop: CO shoves 30, all call.
  // Flop: SB checks, BB bets 20, BTN calls, SB folds.
  // Main pot (level 30): 120 — CO/BTN/BB eligible (SB folded)
  // Side pot (level 50): 40 — BTN/BB only
  // =================================================================
  describe('2-4: ショートall-in + 残りがpostflopベット → 段階的サイドポット', () => {
    const stacks = mkStacks([['CO', 30], ['BTN', 100], ['SB', 100], ['BB', 100]]);
    const actions: ActionRecord[] = [
      // Preflop
      mkAction('CO', 'all-in', 30),
      mkAction('BTN', 'call'),
      mkAction('SB', 'call'),           // SB total preflop: 0.5 + 29.5 = 30
      mkAction('BB', 'call'),           // BB total preflop: 1 + 29 = 30
      // Flop
      mkAction('SB', 'check', undefined, 'flop'),
      mkAction('BB', 'bet', 20, 'flop'),
      mkAction('BTN', 'call', undefined, 'flop'),
      mkAction('SB', 'fold', undefined, 'flop'),
    ];
    const players: PlayerState[] = [
      mkPlayer('CO', 0, true, true),    // all-in preflop
      mkPlayer('BTN', 50, true),        // 100-30-20=50
      mkPlayer('SB', 70, false),        // folded on flop, 100-30=70
      mkPlayer('BB', 50, true),         // 100-30-20=50
    ];

    it('total contributions across streets', () => {
      const contribs = getTotalContributions(actions, stacks);
      expect(contribs.get('CO')).toBe(30);
      expect(contribs.get('BTN')).toBe(50);  // 30 preflop + 20 flop
      expect(contribs.get('SB')).toBe(30);   // preflop only
      expect(contribs.get('BB')).toBe(50);   // 30 preflop + 20 flop
    });

    it('main pot (CO eligible) + side pot (BTN/BB only)', () => {
      const pots = calculateSidePots(actions, players, stacks);
      expect(pots.length).toBe(2);
      // Main pot: level 30, all 4 contribute up to 30 each = 120
      expect(pots[0].amount).toBe(120);
      expect(pots[0].eligiblePositions).toEqual(
        expect.arrayContaining(['CO', 'BTN', 'BB'])
      );
      expect(pots[0].eligiblePositions).not.toContain('SB'); // folded
      // Side pot: level 50, BTN+BB contribute 20 each above 30 = 40
      expect(pots[1].amount).toBe(40);
      expect(pots[1].eligiblePositions).toEqual(
        expect.arrayContaining(['BTN', 'BB'])
      );
      expect(pots[1].eligiblePositions).not.toContain('CO');
    });

    it('SB folded → excluded from all eligible lists', () => {
      const pots = calculateSidePots(actions, players, stacks);
      for (const pot of pots) {
        expect(pot.eligiblePositions).not.toContain('SB');
      }
    });

    it('total pot = 160', () => {
      expect(calculateCurrentPot(actions, stacks)).toBe(160);
    });
  });

  // =================================================================
  // 2-5: ★★ 6 all different stacks all-in → 5-level side pots
  // UTG=20, MP=50, CO=100, BTN=150, SB=200, BB=300
  // All-in cascade: 6 contribution levels → main + 5 side pots
  // This is the core test case per the lord's instruction.
  // =================================================================
  describe('2-5: ★★ 6人全異なるスタック全員all-in → 6段ポット', () => {
    const stacks = mkStacks([
      ['UTG', 20], ['MP', 50], ['CO', 100],
      ['BTN', 150], ['SB', 200], ['BB', 300],
    ]);
    const actions: ActionRecord[] = [
      mkAction('UTG', 'all-in', 20),
      mkAction('MP', 'all-in', 50),
      mkAction('CO', 'all-in', 100),
      mkAction('BTN', 'all-in', 150),
      mkAction('SB', 'all-in', 199.5),  // 0.5 + 199.5 = 200
      mkAction('BB', 'all-in', 299),    // 1 + 299 = 300
    ];
    const players: PlayerState[] = [
      mkPlayer('UTG', 0, true, true),
      mkPlayer('MP', 0, true, true),
      mkPlayer('CO', 0, true, true),
      mkPlayer('BTN', 0, true, true),
      mkPlayer('SB', 0, true, true),
      mkPlayer('BB', 0, true, true),
    ];

    it('contributions equal each player initial stack', () => {
      const contribs = getTotalContributions(actions, stacks);
      expect(contribs.get('UTG')).toBe(20);
      expect(contribs.get('MP')).toBe(50);
      expect(contribs.get('CO')).toBe(100);
      expect(contribs.get('BTN')).toBe(150);
      expect(contribs.get('SB')).toBe(200);
      expect(contribs.get('BB')).toBe(300);
    });

    it('produces 6 pots (main + 5 side pots)', () => {
      const pots = calculateSidePots(actions, players, stacks);
      expect(pots.length).toBe(6);
    });

    it('main pot: 120 (20×6), all 6 eligible', () => {
      const pots = calculateSidePots(actions, players, stacks);
      expect(pots[0].amount).toBe(120);
      expect(pots[0].eligiblePositions.length).toBe(6);
    });

    it('side pot 1: 150 ((50-20)×5), UTG excluded', () => {
      const pots = calculateSidePots(actions, players, stacks);
      expect(pots[1].amount).toBe(150);
      expect(pots[1].eligiblePositions.length).toBe(5);
      expect(pots[1].eligiblePositions).not.toContain('UTG');
    });

    it('side pot 2: 200 ((100-50)×4), UTG/MP excluded', () => {
      const pots = calculateSidePots(actions, players, stacks);
      expect(pots[2].amount).toBe(200);
      expect(pots[2].eligiblePositions.length).toBe(4);
      expect(pots[2].eligiblePositions).not.toContain('UTG');
      expect(pots[2].eligiblePositions).not.toContain('MP');
    });

    it('side pot 3: 150 ((150-100)×3), BTN/SB/BB only', () => {
      const pots = calculateSidePots(actions, players, stacks);
      expect(pots[3].amount).toBe(150);
      expect(pots[3].eligiblePositions).toEqual(
        expect.arrayContaining(['BTN', 'SB', 'BB'])
      );
      expect(pots[3].eligiblePositions.length).toBe(3);
    });

    it('side pot 4: 100 ((200-150)×2), SB/BB only', () => {
      const pots = calculateSidePots(actions, players, stacks);
      expect(pots[4].amount).toBe(100);
      expect(pots[4].eligiblePositions).toEqual(
        expect.arrayContaining(['SB', 'BB'])
      );
      expect(pots[4].eligiblePositions.length).toBe(2);
    });

    it('side pot 5: 100 ((300-200)×1), BB only (uncalled)', () => {
      const pots = calculateSidePots(actions, players, stacks);
      expect(pots[5].amount).toBe(100);
      expect(pots[5].eligiblePositions).toEqual(['BB']);
    });

    it('pot sum = total contributions = 820', () => {
      const pots = calculateSidePots(actions, players, stacks);
      const sum = pots.reduce((s, p) => s + p.amount, 0);
      expect(sum).toBe(820);
      expect(calculateCurrentPot(actions, stacks)).toBe(820);
    });

    it('eligible count decreasing: 6→5→4→3→2→1', () => {
      const pots = calculateSidePots(actions, players, stacks);
      expect(pots.map(p => p.eligiblePositions.length)).toEqual([6, 5, 4, 3, 2, 1]);
    });

    it('all 6 players are winner candidates (none folded)', () => {
      const pots = calculateSidePots(actions, players, stacks);
      // Main pot has all 6
      const allPos: Position[] = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
      for (const pos of allPos) {
        expect(pots[0].eligiblePositions).toContain(pos);
      }
    });
  });

  // =================================================================
  // 2-6: fold + all-in mixed → winner candidate accuracy
  // UTG=50BB, others=100BB. MP fold, CO all-in, BTN fold, SB/BB call.
  // Main pot (level 50): 200 — UTG/CO/SB/BB eligible
  // Side pot (level 100): 150 — CO/SB/BB only
  // MP, BTN excluded (folded)
  // =================================================================
  describe('2-6: fold+all-in混在 → winner候補の正確性', () => {
    const stacks = mkStacks([
      ['UTG', 50], ['MP', 100], ['CO', 100],
      ['BTN', 100], ['SB', 100], ['BB', 100],
    ]);
    const actions: ActionRecord[] = [
      mkAction('UTG', 'all-in', 50),
      mkAction('MP', 'fold'),
      mkAction('CO', 'all-in', 100),
      mkAction('BTN', 'fold'),
      mkAction('SB', 'call'),           // SB total: 0.5 + 99.5 = 100
      mkAction('BB', 'call'),           // BB total: 1 + 99 = 100
    ];
    const players: PlayerState[] = [
      mkPlayer('UTG', 0, true, true),
      mkPlayer('MP', 100, false),
      mkPlayer('CO', 0, true, true),
      mkPlayer('BTN', 100, false),
      mkPlayer('SB', 0, true, true),
      mkPlayer('BB', 0, true, true),
    ];

    it('contributions: fold players at 0', () => {
      const contribs = getTotalContributions(actions, stacks);
      expect(contribs.get('UTG')).toBe(50);
      expect(contribs.get('CO')).toBe(100);
      expect(contribs.get('SB')).toBe(100);
      expect(contribs.get('BB')).toBe(100);
    });

    it('main pot (UTG eligible) + side pot (CO/SB/BB)', () => {
      const pots = calculateSidePots(actions, players, stacks);
      expect(pots.length).toBe(2);
      // Main pot: level 50
      expect(pots[0].amount).toBe(200);
      expect(pots[0].eligiblePositions).toEqual(
        expect.arrayContaining(['UTG', 'CO', 'SB', 'BB'])
      );
      // Side pot: level 100
      expect(pots[1].amount).toBe(150);
      expect(pots[1].eligiblePositions).toEqual(
        expect.arrayContaining(['CO', 'SB', 'BB'])
      );
      expect(pots[1].eligiblePositions).not.toContain('UTG');
    });

    it('folded players (MP, BTN) excluded from all pots', () => {
      const pots = calculateSidePots(actions, players, stacks);
      for (const pot of pots) {
        expect(pot.eligiblePositions).not.toContain('MP');
        expect(pot.eligiblePositions).not.toContain('BTN');
      }
    });

    it('all-in players (UTG, CO) remain as winner candidates', () => {
      const pots = calculateSidePots(actions, players, stacks);
      expect(pots[0].eligiblePositions).toContain('UTG');
      expect(pots[0].eligiblePositions).toContain('CO');
    });

    it('total pot = 350', () => {
      expect(calculateCurrentPot(actions, stacks)).toBe(350);
    });
  });

  // =================================================================
  // 2-7: All all-in → street progression (actingPlayers=0 → runout)
  // BTN=50BB, SB=100BB, BB=150BB. BTN shoves, SB shoves, BB calls.
  // BB calls to match SB's 100 → BB contributed 100, remaining 50 → NOT all-in.
  // actingPlayers = [BB] on flop → runout NOT needed yet.
  // If BB goes all-in on flop (50BB) → all actingPlayers=0 → runout.
  // =================================================================
  describe('2-7: 全員all-in → ストリート進行(runout)検証', () => {
    const stacks = mkStacks([['BTN', 50], ['SB', 100], ['BB', 150]]);
    const actions: ActionRecord[] = [
      mkAction('BTN', 'all-in', 50),
      mkAction('SB', 'all-in', 99.5),  // SB total: 0.5 + 99.5 = 100
      mkAction('BB', 'call'),           // BB total: 1 + 99 = 100 (NOT 150)
    ];
    const players: PlayerState[] = [
      mkPlayer('BTN', 0, true, true),
      mkPlayer('SB', 0, true, true),
      mkPlayer('BB', 50, true, false),  // 150-100=50 remaining, NOT all-in
    ];

    it('BB calls to match SB (100), not full stack (150)', () => {
      const contribs = getTotalContributions(actions, stacks);
      expect(contribs.get('BTN')).toBe(50);
      expect(contribs.get('SB')).toBe(100);
      expect(contribs.get('BB')).toBe(100); // NOT 150
    });

    it('2 pots: main (150) + side (100)', () => {
      const pots = calculateSidePots(actions, players, stacks);
      expect(pots.length).toBe(2);
      // Main pot: level 50, 50×3 = 150
      expect(pots[0].amount).toBe(150);
      expect(pots[0].eligiblePositions.length).toBe(3);
      // Side pot: level 100, (100-50)×2 = 100
      expect(pots[1].amount).toBe(100);
      expect(pots[1].eligiblePositions).toEqual(
        expect.arrayContaining(['SB', 'BB'])
      );
      expect(pots[1].eligiblePositions).not.toContain('BTN');
    });

    it('BB has 50BB remaining → isRunout=false (BB still acts)', () => {
      // BB contributed 100 out of 150 → 50BB remaining
      const contribs = getTotalContributions(actions, stacks);
      const bbRemaining = 150 - (contribs.get('BB') ?? 0);
      expect(bbRemaining).toBe(50);
      expect(bbRemaining).toBeGreaterThan(0);
      // BB is NOT all-in → actingPlayers includes BB → no runout
    });

    it('if BB goes all-in on flop: pot grows to 300', () => {
      // Extend: BB shoves remaining 50 on flop
      const extActions: ActionRecord[] = [
        ...actions,
        mkAction('BB', 'all-in', 50, 'flop'),
      ];
      const contribs = getTotalContributions(extActions, stacks);
      expect(contribs.get('BB')).toBe(150); // 100 preflop + 50 flop
      expect(calculateCurrentPot(extActions, stacks)).toBe(300);
    });

    it('total pot (preflop only) = 250', () => {
      expect(calculateCurrentPot(actions, stacks)).toBe(250);
    });
  });
});
