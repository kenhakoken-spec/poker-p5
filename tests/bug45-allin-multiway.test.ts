import { describe, it, expect } from 'vitest';
import type { Position, ActionRecord, PlayerState, Street } from '@/types/poker';
import {
  shouldSkipPlayer,
  getAvailableActions,
  areAllPlayersAllIn,
  isRunoutNeeded,
} from '@/utils/bettingUtils';
import {
  getActivePlayers,
  getActingPlayers,
  getNextToAct,
} from '@/utils/pokerUtils';
import {
  isStreetClosed,
  calculateSidePots,
} from '@/utils/potUtils';
import { POKER_CONFIG } from '@/utils/pokerConfig';

// STACK-RULE-001: use config values, never hardcode
const STACK = POKER_CONFIG.defaultStack;
const SB = POKER_CONFIG.blinds.sb;
const BB = POKER_CONFIG.blinds.bb;

function mkPlayer(pos: Position, stack: number, active = true, isAllIn = false): PlayerState {
  return { position: pos, stack, active, isAllIn };
}

function mkAction(pos: Position, action: string, amount?: number, street: Street = 'preflop'): ActionRecord {
  return {
    position: pos,
    action: action as ActionRecord['action'],
    street,
    timestamp: Date.now(),
    ...(amount !== undefined ? { size: { type: 'bet-relative' as const, value: amount, amount } } : {}),
  };
}

describe('BUG-45: 3way以上+オールイン — テキサスホールデムルール検証', () => {

  // ====================================================================
  // 3人テーブル (BTN / SB / BB)
  // ====================================================================

  describe('T1: BTN raise → SB call → BB all-in → BTN call → SB call — 3人全員all-in', () => {
    // Initial: BTN=STACK, SB=STACK-SB, BB=STACK-BB
    // Preflop action order: BTN, SB, BB
    // BB all-in 残り全額 → BTN/SB call で全員スタック0
    const bbAllInAmt = STACK - BB;   // 99
    const btnCallAmt = STACK - 3;    // 97 (100 - initial raise)
    const sbCallAmt = STACK - SB - (3 - SB); // 97 (100 - 0.5 - 2.5)

    const actions: ActionRecord[] = [
      mkAction('BTN', 'raise', 3),
      mkAction('SB', 'call'),
      mkAction('BB', 'all-in', bbAllInAmt),
      mkAction('BTN', 'call'),
      mkAction('SB', 'call'),
    ];

    // After: every player stack=0, all-in, active
    const players: PlayerState[] = [
      mkPlayer('BTN', 0, true, true),
      mkPlayer('SB', 0, true, true),
      mkPlayer('BB', 0, true, true),
    ];

    it('全3人がactiveに含まれる', () => {
      const active = getActivePlayers(players);
      expect(active).toHaveLength(3);
      expect(active).toContain('BTN');
      expect(active).toContain('SB');
      expect(active).toContain('BB');
    });

    it('actingPlayersは空（全員all-in）', () => {
      expect(getActingPlayers(players)).toHaveLength(0);
    });

    it('areAllPlayersAllIn = true', () => {
      expect(areAllPlayersAllIn(players)).toBe(true);
    });

    it('ランアウトが必要', () => {
      expect(isRunoutNeeded(players)).toBe(true);
    });

    it('全員shouldSkipPlayer = true', () => {
      for (const p of players) {
        expect(shouldSkipPlayer(p)).toBe(true);
      }
    });

    it('全員のgetAvailableActionsが空配列', () => {
      for (const p of players) {
        expect(getAvailableActions(p.position, 'preflop', actions, players, 300)).toEqual([]);
      }
    });

    it('ショーダウン: 全3人が全ポットの勝者候補', () => {
      const sidePots = calculateSidePots(actions, players);
      for (const pot of sidePots) {
        expect(pot.eligiblePositions).toContain('BTN');
        expect(pot.eligiblePositions).toContain('SB');
        expect(pot.eligiblePositions).toContain('BB');
      }
    });

    it('ストリート完了', () => {
      const acting = getActingPlayers(players);
      const stacks = new Map(players.map(p => [p.position, p.stack]));
      expect(isStreetClosed(actions, 'preflop', acting, stacks)).toBe(true);
    });
  });


  describe('T2: BTN raise → SB all-in → BB fold → BTN call — 2人ショーダウン', () => {
    const sbAllInAmt = STACK - SB; // 99.5

    const actions: ActionRecord[] = [
      mkAction('BTN', 'raise', 3),
      mkAction('SB', 'all-in', sbAllInAmt),
      mkAction('BB', 'fold'),
      mkAction('BTN', 'call'),
    ];

    const players: PlayerState[] = [
      mkPlayer('BTN', 0, true, true),
      mkPlayer('SB', 0, true, true),
      mkPlayer('BB', STACK - BB, false, false),
    ];

    it('BTN,SBのみactive（BBはfold）', () => {
      const active = getActivePlayers(players);
      expect(active).toHaveLength(2);
      expect(active).toContain('BTN');
      expect(active).toContain('SB');
      expect(active).not.toContain('BB');
    });

    it('ランアウトが必要（2人active、0人acting）', () => {
      expect(isRunoutNeeded(players)).toBe(true);
    });

    it('ショーダウン: BTN,SBのみ勝者候補（BBはfold）', () => {
      const sidePots = calculateSidePots(actions, players);
      for (const pot of sidePots) {
        expect(pot.eligiblePositions).toContain('BTN');
        expect(pot.eligiblePositions).toContain('SB');
        expect(pot.eligiblePositions).not.toContain('BB');
      }
    });

    it('BBのgetAvailableActionsは空（fold済み）', () => {
      expect(getAvailableActions('BB', 'preflop', actions, players, 200)).toEqual([]);
    });
  });


  describe('T3: BTN all-in → SB all-in → BB all-in — 即ショーダウン', () => {
    const actions: ActionRecord[] = [
      mkAction('BTN', 'all-in', STACK),
      mkAction('SB', 'all-in', STACK - SB),
      mkAction('BB', 'all-in', STACK - BB),
    ];

    const players: PlayerState[] = [
      mkPlayer('BTN', 0, true, true),
      mkPlayer('SB', 0, true, true),
      mkPlayer('BB', 0, true, true),
    ];

    it('全員all-in → 即ショーダウン', () => {
      expect(areAllPlayersAllIn(players)).toBe(true);
      expect(isRunoutNeeded(players)).toBe(true);
    });

    it('3人全員が勝者候補', () => {
      const active = getActivePlayers(players);
      expect(active).toHaveLength(3);
    });

    it('getNextToActがnull（全員all-in済み）', () => {
      const acting = getActingPlayers(players);
      const streetActions = actions.filter(a => a.street === 'preflop');
      expect(getNextToAct('preflop', acting, streetActions)).toBeNull();
    });

    it('ストリート完了', () => {
      const acting = getActingPlayers(players);
      const stacks = new Map(players.map(p => [p.position, p.stack]));
      expect(isStreetClosed(actions, 'preflop', acting, stacks)).toBe(true);
    });
  });


  describe('T4: フロップでBB(short)がall-in → BTN/SBはターンでアクション可能', () => {
    // BB is short-stacked (20BB). After preflop call (2BB), BB has 17BB on flop.
    // Flop: SB bet 5 → BB all-in 17 → BTN call → SB call
    // Result: BTN/SB have chips, BB is all-in. Turn continues for BTN/SB.

    const preflopActions: ActionRecord[] = [
      mkAction('BTN', 'raise', 3),
      mkAction('SB', 'call'),
      mkAction('BB', 'call'),
    ];

    const flopActions: ActionRecord[] = [
      ...preflopActions,
      mkAction('SB', 'bet', 5, 'flop'),
      mkAction('BB', 'all-in', 17, 'flop'),
      mkAction('BTN', 'call', undefined, 'flop'),
      mkAction('SB', 'call', undefined, 'flop'),
    ];

    // BTN: 97 - 17 = 80, SB: 97 - 5 - 12 = 80, BB: 0 (all-in)
    const playersAfterFlop: PlayerState[] = [
      mkPlayer('BTN', 80, true, false),
      mkPlayer('SB', 80, true, false),
      mkPlayer('BB', 0, true, true),
    ];

    it('BBはall-inでスキップ', () => {
      expect(shouldSkipPlayer(playersAfterFlop[2])).toBe(true);
    });

    it('BBのgetAvailableActionsは空（ターン）', () => {
      expect(getAvailableActions('BB', 'turn', flopActions, playersAfterFlop, 60)).toEqual([]);
    });

    it('BTN,SBはターンでアクション可能', () => {
      const acting = getActingPlayers(playersAfterFlop);
      expect(acting).toContain('BTN');
      expect(acting).toContain('SB');
      expect(acting).not.toContain('BB');
    });

    it('ランアウトは不要（BTN,SBがチップ保有）', () => {
      expect(isRunoutNeeded(playersAfterFlop)).toBe(false);
    });

    it('BBはactiveで勝者候補に含まれる（all-inだが未fold）', () => {
      const active = getActivePlayers(playersAfterFlop);
      expect(active).toContain('BB');
      expect(active).toHaveLength(3);
    });

    it('フロップ完了', () => {
      const acting = getActingPlayers(playersAfterFlop);
      const stacks = new Map(playersAfterFlop.map(p => [p.position, p.stack]));
      expect(isStreetClosed(flopActions, 'flop', acting, stacks)).toBe(true);
    });
  });


  // ====================================================================
  // 4人テーブル (UTG / CO / SB / BB)
  // ====================================================================

  describe('T5: UTG raise → CO all-in(short) → SB call → BB fold → UTG call — 3人フロップへ', () => {
    // CO short-stacked (25BB). CO's all-in is amount=25, total contrib=25.
    // UTG raise to 3 → CO all-in to 25 (full raise, increment=22 >= minRaise=2)
    // After SB call, BB fold, UTG must call to match 25.

    const actions: ActionRecord[] = [
      mkAction('UTG', 'raise', 3),
      mkAction('CO', 'all-in', 25),
      mkAction('SB', 'call'),
      mkAction('BB', 'fold'),
      mkAction('UTG', 'call'),  // UTG matches 25 (pays 22 more)
    ];

    const playersAfter: PlayerState[] = [
      mkPlayer('UTG', 75, true, false),
      mkPlayer('CO', 0, true, true),
      mkPlayer('SB', 75 - SB, true, false), // 99.5 - 25 + 0.5 = 74.5... let me recalculate
      // SB: started 99.5 (STACK-SB), called 25 total (SB contrib = 0.5 + 24.5 = 25), stack = 99.5-24.5 = 75
      mkPlayer('BB', STACK - BB, false, false),
    ];

    it('UTG,CO,SBがactive（BBはfold）', () => {
      const active = getActivePlayers(playersAfter);
      expect(active).toHaveLength(3);
      expect(active).toContain('UTG');
      expect(active).toContain('CO');
      expect(active).toContain('SB');
      expect(active).not.toContain('BB');
    });

    it('COはall-inでフロップではスキップ', () => {
      expect(shouldSkipPlayer(playersAfter[1])).toBe(true);
      expect(getAvailableActions('CO', 'flop', actions, playersAfter, 76)).toEqual([]);
    });

    it('UTG,SBがフロップでアクション可能', () => {
      const acting = getActingPlayers(playersAfter);
      expect(acting).toContain('UTG');
      expect(acting).toContain('SB');
      expect(acting).not.toContain('CO');
    });

    it('COは勝者候補に含まれる（all-inだがactive）', () => {
      expect(getActivePlayers(playersAfter)).toContain('CO');
    });

    it('ランアウトは不要（UTG,SBがアクション可能）', () => {
      expect(isRunoutNeeded(playersAfter)).toBe(false);
    });
  });


  describe('T6: UTG all-in → CO all-in → SB all-in → BB all-in — 4人即ショーダウン', () => {
    const actions: ActionRecord[] = [
      mkAction('UTG', 'all-in', STACK),
      mkAction('CO', 'all-in', STACK),
      mkAction('SB', 'all-in', STACK - SB),
      mkAction('BB', 'all-in', STACK - BB),
    ];

    const players: PlayerState[] = [
      mkPlayer('UTG', 0, true, true),
      mkPlayer('CO', 0, true, true),
      mkPlayer('SB', 0, true, true),
      mkPlayer('BB', 0, true, true),
    ];

    it('全員all-in → 即ショーダウン', () => {
      expect(areAllPlayersAllIn(players)).toBe(true);
      expect(isRunoutNeeded(players)).toBe(true);
    });

    it('4人全員が勝者候補', () => {
      const active = getActivePlayers(players);
      expect(active).toHaveLength(4);
      expect(active).toContain('UTG');
      expect(active).toContain('CO');
      expect(active).toContain('SB');
      expect(active).toContain('BB');
    });

    it('actingPlayersは0', () => {
      expect(getActingPlayers(players)).toHaveLength(0);
    });

    it('ストリート完了', () => {
      const acting = getActingPlayers(players);
      const stacks = new Map(players.map(p => [p.position, p.stack]));
      expect(isStreetClosed(actions, 'preflop', acting, stacks)).toBe(true);
    });
  });


  describe('T7: 4人フロップ — UTG bet → CO all-in(short) → SB fold → BB call → UTG call → ターンへ', () => {
    // CO short-stacked (25BB). After preflop (each called 3), CO has 22.
    // Postflop order: SB, BB, UTG, CO
    // Flop: SB check → BB check → UTG bet 6 → CO all-in 22 → SB fold → BB call → UTG call

    const preflopActions: ActionRecord[] = [
      mkAction('UTG', 'raise', 3),
      mkAction('CO', 'call'),
      mkAction('SB', 'call'),
      mkAction('BB', 'call'),
    ];

    const flopActions: ActionRecord[] = [
      ...preflopActions,
      mkAction('SB', 'check', undefined, 'flop'),
      mkAction('BB', 'check', undefined, 'flop'),
      mkAction('UTG', 'bet', 6, 'flop'),
      mkAction('CO', 'all-in', 22, 'flop'),
      mkAction('SB', 'fold', undefined, 'flop'),
      mkAction('BB', 'call', undefined, 'flop'),
      mkAction('UTG', 'call', undefined, 'flop'),
    ];

    const playersAfterFlop: PlayerState[] = [
      mkPlayer('UTG', 75, true, false),
      mkPlayer('CO', 0, true, true),
      mkPlayer('SB', 97, false, false),  // folded on flop
      mkPlayer('BB', 75, true, false),
    ];

    it('UTG,BBがターンでアクション可能。COはall-inスキップ', () => {
      const acting = getActingPlayers(playersAfterFlop);
      expect(acting).toContain('UTG');
      expect(acting).toContain('BB');
      expect(acting).not.toContain('CO');
      expect(acting).not.toContain('SB');
    });

    it('COはall-inだがactiveで勝者候補', () => {
      const active = getActivePlayers(playersAfterFlop);
      expect(active).toContain('CO');
    });

    it('ランアウトは不要（UTG,BBが残り）', () => {
      expect(isRunoutNeeded(playersAfterFlop)).toBe(false);
    });

    it('COのgetAvailableActionsは空（ターン）', () => {
      expect(getAvailableActions('CO', 'turn', flopActions, playersAfterFlop, 80)).toEqual([]);
    });

    it('SBのgetAvailableActionsは空（fold済み）', () => {
      expect(getAvailableActions('SB', 'turn', flopActions, playersAfterFlop, 80)).toEqual([]);
    });

    it('勝者候補はUTG,CO,BBの3人（SBはfold）', () => {
      const active = getActivePlayers(playersAfterFlop);
      expect(active).toHaveLength(3);
      expect(active).not.toContain('SB');
    });
  });


  // ====================================================================
  // 5人テーブル
  // ====================================================================

  describe('T8: 5人中2人fold → 3人フロップ → 1人(BB short)がall-in → 残り2人call', () => {
    // 5 players: UTG, CO, BTN, SB, BB
    // BB short-stacked (25BB). After preflop call, BB has 22.
    // Preflop: UTG fold, CO fold, BTN raise 3, SB call, BB call
    // Flop: SB check, BB all-in 22, BTN call, SB call

    const preflopActions: ActionRecord[] = [
      mkAction('UTG', 'fold'),
      mkAction('CO', 'fold'),
      mkAction('BTN', 'raise', 3),
      mkAction('SB', 'call'),
      mkAction('BB', 'call'),
    ];

    const flopActions: ActionRecord[] = [
      ...preflopActions,
      mkAction('SB', 'check', undefined, 'flop'),
      mkAction('BB', 'all-in', 22, 'flop'),
      mkAction('BTN', 'call', undefined, 'flop'),
      mkAction('SB', 'call', undefined, 'flop'),
    ];

    const playersAfterFlop: PlayerState[] = [
      mkPlayer('UTG', STACK, false, false),
      mkPlayer('CO', STACK, false, false),
      mkPlayer('BTN', 75, true, false),
      mkPlayer('SB', 75, true, false),
      mkPlayer('BB', 0, true, true),
    ];

    it('BBはall-inでターンスキップ', () => {
      expect(shouldSkipPlayer(playersAfterFlop[4])).toBe(true);
    });

    it('BTN,SBがターンでアクション可能', () => {
      const acting = getActingPlayers(playersAfterFlop);
      expect(acting).toContain('BTN');
      expect(acting).toContain('SB');
      expect(acting).not.toContain('BB');
      expect(acting).toHaveLength(2);
    });

    it('勝者候補はBTN,SB,BB（activeの3人）', () => {
      const active = getActivePlayers(playersAfterFlop);
      expect(active).toHaveLength(3);
      expect(active).toContain('BTN');
      expect(active).toContain('SB');
      expect(active).toContain('BB');
    });

    it('ランアウトは不要（BTN,SBがアクション可能）', () => {
      expect(isRunoutNeeded(playersAfterFlop)).toBe(false);
    });

    it('UTG,COはfold済みで勝者候補外', () => {
      const active = getActivePlayers(playersAfterFlop);
      expect(active).not.toContain('UTG');
      expect(active).not.toContain('CO');
    });
  });


  describe('T9: 5人中1人fold → 4人フロップ → 全員all-in — 即ショーダウン', () => {
    // 5 players: UTG, CO, BTN, SB, BB
    // Preflop: UTG fold, CO raise 3, BTN call, SB call, BB call
    // Flop: All 4 remaining go all-in (postflop order: SB, BB, CO, BTN)

    const preflopActions: ActionRecord[] = [
      mkAction('UTG', 'fold'),
      mkAction('CO', 'raise', 3),
      mkAction('BTN', 'call'),
      mkAction('SB', 'call'),
      mkAction('BB', 'call'),
    ];

    const remainingStack = STACK - 3; // 97 each after preflop

    const flopActions: ActionRecord[] = [
      ...preflopActions,
      mkAction('SB', 'all-in', remainingStack - SB, 'flop'), // 97 - 0.5 adjusted for SB blind
      mkAction('BB', 'all-in', remainingStack - BB, 'flop'),
      mkAction('CO', 'all-in', remainingStack, 'flop'),
      mkAction('BTN', 'all-in', remainingStack, 'flop'),
    ];

    const playersAfterFlop: PlayerState[] = [
      mkPlayer('UTG', STACK, false, false),
      mkPlayer('CO', 0, true, true),
      mkPlayer('BTN', 0, true, true),
      mkPlayer('SB', 0, true, true),
      mkPlayer('BB', 0, true, true),
    ];

    it('全アクティブがall-in → 即ショーダウン', () => {
      expect(areAllPlayersAllIn(playersAfterFlop)).toBe(true);
      expect(isRunoutNeeded(playersAfterFlop)).toBe(true);
    });

    it('4人が勝者候補（UTGはfold除外）', () => {
      const active = getActivePlayers(playersAfterFlop);
      expect(active).toHaveLength(4);
      expect(active).toContain('CO');
      expect(active).toContain('BTN');
      expect(active).toContain('SB');
      expect(active).toContain('BB');
      expect(active).not.toContain('UTG');
    });

    it('actingPlayersは0（ランアウトへ）', () => {
      expect(getActingPlayers(playersAfterFlop)).toHaveLength(0);
    });

    it('UTGのgetAvailableActionsは空（fold済み）', () => {
      expect(getAvailableActions('UTG', 'flop', flopActions, playersAfterFlop, 400)).toEqual([]);
    });
  });


  // ====================================================================
  // サイドポット検証: 異なるall-in額
  // ====================================================================

  describe('サイドポット: 3人が異なるスタックでall-in', () => {
    // BTN=100BB, SB=60BB(short), BB=30BB(very short)
    // All 3 go all-in on preflop
    // Expected side pots:
    //   Main pot: 30*3=90 (BTN,SB,BB eligible)
    //   Side pot 1: (60-30)*2=60 (BTN,SB eligible)
    //   Side pot 2: (100-60)*1=40 (BTN only)

    const actions: ActionRecord[] = [
      mkAction('BTN', 'all-in', STACK),
      mkAction('SB', 'all-in', 60 - SB),  // SB total: 0.5 + 59.5 = 60
      mkAction('BB', 'all-in', 30 - BB),   // BB total: 1 + 29 = 30
    ];

    const players: PlayerState[] = [
      mkPlayer('BTN', 0, true, true),
      mkPlayer('SB', 0, true, true),
      mkPlayer('BB', 0, true, true),
    ];

    it('サイドポットが正しく分割される', () => {
      const sidePots = calculateSidePots(actions, players);
      expect(sidePots.length).toBeGreaterThanOrEqual(2);

      // Main pot: all 3 eligible
      const mainPot = sidePots[0];
      expect(mainPot.eligiblePositions).toContain('BTN');
      expect(mainPot.eligiblePositions).toContain('SB');
      expect(mainPot.eligiblePositions).toContain('BB');

      // Last pot: BTN only (highest contributor)
      const lastPot = sidePots[sidePots.length - 1];
      expect(lastPot.eligiblePositions).toContain('BTN');
      expect(lastPot.eligiblePositions).not.toContain('BB');
    });

    it('メインポット額は最少スタック×3', () => {
      const sidePots = calculateSidePots(actions, players);
      // BB contributed 30, so main pot = 30 * 3 = 90
      expect(sidePots[0].amount).toBe(90);
    });

    it('全ポットの合計がプレイヤー投入額の合計と一致', () => {
      const sidePots = calculateSidePots(actions, players);
      const totalPot = sidePots.reduce((sum, p) => sum + p.amount, 0);
      // BTN=100, SB=60, BB=30 → total=190
      expect(totalPot).toBe(190);
    });

    it('BBは最少投入ポットのみ獲得可能', () => {
      const sidePots = calculateSidePots(actions, players);
      const bbEligiblePots = sidePots.filter(p => p.eligiblePositions.includes('BB'));
      expect(bbEligiblePots).toHaveLength(1);
      expect(bbEligiblePots[0].amount).toBe(90);
    });
  });


  describe('サイドポット: 4人中1人fold、残り3人が異なるスタックでall-in', () => {
    // UTG=100, CO=50(short), SB=30(very short), BB folds
    // UTG all-in 100, CO all-in 50, SB all-in 29.5 (30-SB), BB fold

    const actions: ActionRecord[] = [
      mkAction('UTG', 'all-in', STACK),
      mkAction('CO', 'all-in', 50),
      mkAction('SB', 'all-in', 30 - SB), // SB total: 0.5 + 29.5 = 30
      mkAction('BB', 'fold'),
    ];

    const players: PlayerState[] = [
      mkPlayer('UTG', 0, true, true),
      mkPlayer('CO', 0, true, true),
      mkPlayer('SB', 0, true, true),
      mkPlayer('BB', STACK - BB, false, false),
    ];

    it('BBはfold、勝者候補に含まれない', () => {
      const sidePots = calculateSidePots(actions, players);
      for (const pot of sidePots) {
        expect(pot.eligiblePositions).not.toContain('BB');
      }
    });

    it('SBはメインポットのみ獲得可能', () => {
      const sidePots = calculateSidePots(actions, players);
      const sbPots = sidePots.filter(p => p.eligiblePositions.includes('SB'));
      expect(sbPots).toHaveLength(1);
    });

    it('UTGは全ポットの獲得候補', () => {
      const sidePots = calculateSidePots(actions, players);
      for (const pot of sidePots) {
        expect(pot.eligiblePositions).toContain('UTG');
      }
    });
  });
});
