import { describe, it, expect } from 'vitest';
import type { Position, ActionRecord, PlayerState } from '@/types/poker';
import { getActivePlayers, getActingPlayers } from '@/utils/pokerUtils';
import { POKER_CONFIG } from '@/utils/pokerConfig';

/**
 * BUG-31 Phase1: 勝者候補テスト シナリオ群B（4-6）
 *
 * record/page.tsx の勝者候補算出ロジック（BUG-26準拠）:
 *   const foldedPositions = new Set(
 *     gameState.actions.filter(a => a.action === 'fold').map(a => a.position)
 *   );
 *   const winnerCandidates = gameState.players
 *     .filter(p => !foldedPositions.has(p.position))
 *     .map(p => p.position);
 *
 * POKER_CONFIG: defaultStack=100, blinds.sb=0.5, blinds.bb=1
 */

const { defaultStack, blinds } = POKER_CONFIG;

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
  street = 'preflop' as const,
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

/** record/page.tsx BUG-26準拠: アクション履歴からfold済みpositionを算出 */
function getFoldedPositions(actions: ActionRecord[]): Set<string> {
  return new Set(
    actions.filter(a => a.action === 'fold').map(a => a.position),
  );
}

/** record/page.tsx BUG-26準拠: fold済み以外のプレイヤーが勝者候補 */
function getWinnerCandidates(
  players: PlayerState[],
  actions: ActionRecord[],
): Position[] {
  const foldedPositions = getFoldedPositions(actions);
  return players
    .filter(p => !foldedPositions.has(p.position))
    .map(p => p.position);
}

describe('BUG-31 Phase1: 勝者候補テスト シナリオ群B（4-6）', () => {
  // =================================================================
  // シナリオ 4: 3way preflop: UTG open 3→SB 3bet all-in→BB call→UTG call
  //            → 勝者候補3人（fold無し）
  // =================================================================
  describe('シナリオ4: 3way UTG open→SB all-in→BB call→UTG call → 候補3人', () => {
    // SB: 100 - 0.5(blind) = 99.5 remaining → all-in 99.5 → stack=0
    // BB: 100 - 1(blind) = 99 remaining → call 99(=100-1) → stack=0
    // UTG: 100 → raise 3 → call 97(=100-3) → stack=0
    // currentBet = 100 (SB all-in total)
    const actions: ActionRecord[] = [
      mkAction('UTG', 'raise', 3),
      mkAction('SB', 'all-in', defaultStack - blinds.sb),   // 99.5
      mkAction('BB', 'call'),
      mkAction('UTG', 'call'),
    ];

    // 全員がall-inの100BBをマッチ → 全員stack=0
    const players: PlayerState[] = [
      mkPlayer('UTG', 0, true, true),
      mkPlayer('SB', 0, true, true),
      mkPlayer('BB', 0, true, true),
    ];

    it('foldedPositions: 空（誰もfoldしていない）', () => {
      const folded = getFoldedPositions(actions);
      expect(folded.size).toBe(0);
    });

    it('winnerCandidates: 3人（UTG, SB, BB）', () => {
      const candidates = getWinnerCandidates(players, actions);
      expect(candidates).toHaveLength(3);
      expect(candidates).toContain('UTG');
      expect(candidates).toContain('SB');
      expect(candidates).toContain('BB');
    });

    it('全プレイヤー: stack=0, isAllIn=true, active=true', () => {
      for (const p of players) {
        expect(p.stack).toBe(0);
        expect(p.isAllIn).toBe(true);
        expect(p.active).toBe(true);
      }
    });

    it('actingPlayers: 0人（全員all-in → ランアウト）', () => {
      const acting = getActingPlayers(players);
      expect(acting).toHaveLength(0);
    });
  });

  // =================================================================
  // シナリオ 5: 3way preflop: UTG open 3→SB 3bet 9→BB 4bet all-in→UTG call→SB fold
  //            → 勝者候補2人（SB fold）
  // =================================================================
  describe('シナリオ5: 3way UTG open→SB 3bet→BB 4bet all-in→UTG call→SB fold → 候補2人', () => {
    // UTG raise 3 → contribution=3, remaining=97
    // SB 3bet 9 → blind(0.5)+raise(8.5)=9 total, remaining=91
    // BB 4bet all-in → blind(1)+all-in(99)=100 total, remaining=0
    // currentBet = 100
    // UTG call → need 100-3=97 more, remaining=0
    // SB fold → SB active=false, remaining=91
    const actions: ActionRecord[] = [
      mkAction('UTG', 'raise', 3),
      mkAction('SB', 'raise', 8.5),                         // 3bet to 9BB
      mkAction('BB', 'all-in', defaultStack - blinds.bb),    // 4bet all-in 99
      mkAction('UTG', 'call'),
      mkAction('SB', 'fold'),
    ];

    const players: PlayerState[] = [
      mkPlayer('UTG', 0, true, true),        // called all-in → stack=0
      mkPlayer('SB', 91, false, false),       // folded
      mkPlayer('BB', 0, true, true),          // all-in
    ];

    it('foldedPositions: SBのみ', () => {
      const folded = getFoldedPositions(actions);
      expect(folded.size).toBe(1);
      expect(folded.has('SB')).toBe(true);
    });

    it('winnerCandidates: 2人（UTG, BB）', () => {
      const candidates = getWinnerCandidates(players, actions);
      expect(candidates).toHaveLength(2);
      expect(candidates).toContain('UTG');
      expect(candidates).toContain('BB');
      expect(candidates).not.toContain('SB');
    });

    it('プレイヤー状態確認', () => {
      const utg = players.find(p => p.position === 'UTG')!;
      expect(utg.stack).toBe(0);
      expect(utg.isAllIn).toBe(true);
      expect(utg.active).toBe(true);

      const sb = players.find(p => p.position === 'SB')!;
      expect(sb.stack).toBe(91);
      expect(sb.isAllIn).toBe(false);
      expect(sb.active).toBe(false);

      const bb = players.find(p => p.position === 'BB')!;
      expect(bb.stack).toBe(0);
      expect(bb.isAllIn).toBe(true);
      expect(bb.active).toBe(true);
    });

    it('actingPlayers: 0人（UTG/BB all-in, SB folded → ランアウト）', () => {
      const acting = getActingPlayers(players);
      expect(acting).toHaveLength(0);
    });
  });

  // =================================================================
  // シナリオ 6: 4way: UTG open 3→CO call→SB call→BB call
  //            →Flop→UTG bet all-in→CO call→SB call→BB fold
  //            → 勝者候補3人（BB fold）
  // =================================================================
  describe('シナリオ6: 4way flop UTG all-in→CO call→SB call→BB fold → 候補3人', () => {
    // Preflop: 4way, all call UTG's 3BB open
    // UTG: raise 3, remaining=97
    // CO: call 3, remaining=97
    // SB: call 2.5 (3-0.5blind), remaining=97
    // BB: call 2 (3-1blind), remaining=97
    // Pot after preflop = 3*4 = 12
    //
    // Flop:
    // UTG bet all-in 97 → remaining=0
    // CO call 97 → remaining=0
    // SB call 97 → remaining=0
    // BB fold → remaining=97, active=false
    const preflopActions: ActionRecord[] = [
      mkAction('UTG', 'raise', 3, 'preflop'),
      mkAction('CO', 'call', undefined, 'preflop'),
      mkAction('SB', 'call', undefined, 'preflop'),
      mkAction('BB', 'call', undefined, 'preflop'),
    ];

    const flopActions: ActionRecord[] = [
      mkAction('UTG', 'all-in', 97, 'flop'),
      mkAction('CO', 'call', undefined, 'flop'),
      mkAction('SB', 'call', undefined, 'flop'),
      mkAction('BB', 'fold', undefined, 'flop'),
    ];

    const allActions = [...preflopActions, ...flopActions];

    const players: PlayerState[] = [
      mkPlayer('UTG', 0, true, true),       // all-in on flop
      mkPlayer('CO', 0, true, true),        // called all-in → stack=0
      mkPlayer('SB', 0, true, true),        // called all-in → stack=0
      mkPlayer('BB', 97, false, false),      // folded on flop
    ];

    it('foldedPositions: BBのみ', () => {
      const folded = getFoldedPositions(allActions);
      expect(folded.size).toBe(1);
      expect(folded.has('BB')).toBe(true);
    });

    it('winnerCandidates: 3人（UTG, CO, SB）', () => {
      const candidates = getWinnerCandidates(players, allActions);
      expect(candidates).toHaveLength(3);
      expect(candidates).toContain('UTG');
      expect(candidates).toContain('CO');
      expect(candidates).toContain('SB');
      expect(candidates).not.toContain('BB');
    });

    it('プレイヤー状態確認', () => {
      const utg = players.find(p => p.position === 'UTG')!;
      expect(utg.stack).toBe(0);
      expect(utg.isAllIn).toBe(true);
      expect(utg.active).toBe(true);

      const co = players.find(p => p.position === 'CO')!;
      expect(co.stack).toBe(0);
      expect(co.isAllIn).toBe(true);
      expect(co.active).toBe(true);

      const sb = players.find(p => p.position === 'SB')!;
      expect(sb.stack).toBe(0);
      expect(sb.isAllIn).toBe(true);
      expect(sb.active).toBe(true);

      const bb = players.find(p => p.position === 'BB')!;
      expect(bb.stack).toBe(97);
      expect(bb.isAllIn).toBe(false);
      expect(bb.active).toBe(false);
    });

    it('actingPlayers: 0人（UTG/CO/SB all-in, BB folded → ランアウト）', () => {
      const acting = getActingPlayers(players);
      expect(acting).toHaveLength(0);
    });

    it('getActivePlayers と winnerCandidates が一致する（全fold=active=false）', () => {
      const activePlayers = getActivePlayers(players);
      const candidates = getWinnerCandidates(players, allActions);
      expect(candidates).toEqual(activePlayers);
    });
  });
});
