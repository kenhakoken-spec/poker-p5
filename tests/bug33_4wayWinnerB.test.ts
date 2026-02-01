import { describe, it, expect } from 'vitest';
import type { Position, ActionRecord, PlayerState } from '@/types/poker';
import { getActivePlayers, getActingPlayers } from '@/utils/pokerUtils';
import { POKER_CONFIG } from '@/utils/pokerConfig';

/**
 * BUG-33 Phase1: 4way+勝者候補テスト シナリオ群B（4-5）
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
  street: 'preflop' | 'flop' = 'preflop',
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

describe('BUG-33 Phase1: 4way+勝者候補テスト シナリオ群B（4-5）', () => {
  // プリフロップ後の残スタック計算:
  // 全員が3BBにcall → 各プレイヤー残 = defaultStack - 3 = 97
  // (SB: 100-0.5blind-2.5call=97, BB: 100-1blind-2call=97, 他: 100-3raise/call=97)
  const stackAfterPreflop = defaultStack - 3; // 97

  // =================================================================
  // シナリオ 4: 5way preflop+flop
  // UTG open 3→MP call→CO call→SB call→BB call
  // →Flop→UTG all-in→MP call→CO call→SB call→BB fold
  // → 勝者候補4人（BB fold）
  // =================================================================
  describe('シナリオ4: 5way flop UTG all-in→MP/CO/SB call→BB fold → 候補4人', () => {
    const preflopActions: ActionRecord[] = [
      mkAction('UTG', 'raise', 3, 'preflop'),
      mkAction('MP', 'call', undefined, 'preflop'),
      mkAction('CO', 'call', undefined, 'preflop'),
      mkAction('SB', 'call', undefined, 'preflop'),
      mkAction('BB', 'call', undefined, 'preflop'),
    ];

    const flopActions: ActionRecord[] = [
      mkAction('UTG', 'all-in', stackAfterPreflop, 'flop'), // 97
      mkAction('MP', 'call', undefined, 'flop'),
      mkAction('CO', 'call', undefined, 'flop'),
      mkAction('SB', 'call', undefined, 'flop'),
      mkAction('BB', 'fold', undefined, 'flop'),
    ];

    const allActions = [...preflopActions, ...flopActions];

    const players: PlayerState[] = [
      mkPlayer('UTG', 0, true, true),          // all-in on flop
      mkPlayer('MP', 0, true, true),            // called all-in → stack=0
      mkPlayer('CO', 0, true, true),            // called all-in → stack=0
      mkPlayer('SB', 0, true, true),            // called all-in → stack=0
      mkPlayer('BB', stackAfterPreflop, false, false), // folded, stack=97
    ];

    it('foldedPositions: BBのみ', () => {
      const folded = getFoldedPositions(allActions);
      expect(folded.size).toBe(1);
      expect(folded.has('BB')).toBe(true);
    });

    it('winnerCandidates: 4人（UTG, MP, CO, SB）', () => {
      const candidates = getWinnerCandidates(players, allActions);
      expect(candidates).toHaveLength(4);
      expect(candidates).toContain('UTG');
      expect(candidates).toContain('MP');
      expect(candidates).toContain('CO');
      expect(candidates).toContain('SB');
      expect(candidates).not.toContain('BB');
    });

    it('プレイヤー状態確認', () => {
      // UTG/MP/CO/SB: all-in, stack=0
      for (const pos of ['UTG', 'MP', 'CO', 'SB'] as Position[]) {
        const p = players.find(pl => pl.position === pos)!;
        expect(p.stack).toBe(0);
        expect(p.isAllIn).toBe(true);
        expect(p.active).toBe(true);
      }

      // BB: folded, stack=97
      const bb = players.find(p => p.position === 'BB')!;
      expect(bb.stack).toBe(stackAfterPreflop);
      expect(bb.isAllIn).toBe(false);
      expect(bb.active).toBe(false);
    });

    it('actingPlayers: 0人（UTG/MP/CO/SB all-in, BB folded → ランアウト）', () => {
      const acting = getActingPlayers(players);
      expect(acting).toHaveLength(0);
    });

    it('getActivePlayers と winnerCandidates が一致', () => {
      const activePlayers = getActivePlayers(players);
      const candidates = getWinnerCandidates(players, allActions);
      expect(candidates).toEqual(activePlayers);
    });
  });

  // =================================================================
  // シナリオ 5: 6way preflop+flop
  // UTG open 3→MP call→CO call→BTN call→SB call→BB call
  // →Flop→UTG all-in→全員call
  // → 勝者候補6人（fold無し）
  // =================================================================
  describe('シナリオ5: 6way flop UTG all-in→全員call → 候補6人', () => {
    const preflopActions: ActionRecord[] = [
      mkAction('UTG', 'raise', 3, 'preflop'),
      mkAction('MP', 'call', undefined, 'preflop'),
      mkAction('CO', 'call', undefined, 'preflop'),
      mkAction('BTN', 'call', undefined, 'preflop'),
      mkAction('SB', 'call', undefined, 'preflop'),
      mkAction('BB', 'call', undefined, 'preflop'),
    ];

    const flopActions: ActionRecord[] = [
      mkAction('UTG', 'all-in', stackAfterPreflop, 'flop'), // 97
      mkAction('MP', 'call', undefined, 'flop'),
      mkAction('CO', 'call', undefined, 'flop'),
      mkAction('BTN', 'call', undefined, 'flop'),
      mkAction('SB', 'call', undefined, 'flop'),
      mkAction('BB', 'call', undefined, 'flop'),
    ];

    const allActions = [...preflopActions, ...flopActions];

    // 全員all-in (stack=0)
    const players: PlayerState[] = [
      mkPlayer('UTG', 0, true, true),
      mkPlayer('MP', 0, true, true),
      mkPlayer('CO', 0, true, true),
      mkPlayer('BTN', 0, true, true),
      mkPlayer('SB', 0, true, true),
      mkPlayer('BB', 0, true, true),
    ];

    it('foldedPositions: 空（誰もfoldしていない）', () => {
      const folded = getFoldedPositions(allActions);
      expect(folded.size).toBe(0);
    });

    it('winnerCandidates: 6人（全員）', () => {
      const candidates = getWinnerCandidates(players, allActions);
      expect(candidates).toHaveLength(6);
      expect(candidates).toContain('UTG');
      expect(candidates).toContain('MP');
      expect(candidates).toContain('CO');
      expect(candidates).toContain('BTN');
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

    it('getActivePlayers と winnerCandidates が一致', () => {
      const activePlayers = getActivePlayers(players);
      const candidates = getWinnerCandidates(players, allActions);
      expect(candidates).toEqual(activePlayers);
    });
  });
});
