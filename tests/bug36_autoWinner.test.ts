import { describe, it, expect } from 'vitest';
import type { Position, ActionRecord, PlayerState } from '@/types/poker';
import { POKER_CONFIG } from '@/utils/pokerConfig';

/**
 * BUG-36: フォールド勝利自動決定の検証
 *
 * record/page.tsx の勝者候補算出ロジック（BUG-26準拠）:
 *   const foldedPositions = new Set(
 *     gameState.actions.filter(a => a.action === 'fold').map(a => a.position)
 *   );
 *   const nonFolded = gameState.players
 *     .filter(p => !foldedPositions.has(p.position))
 *     .map(p => p.position);
 *
 * nonFolded.length === 1 → 自動勝者（全員fold → 残り1人が自動的に勝者）
 * nonFolded.length > 1  → 自動勝者にならない（勝者選択画面へ）
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

/** record/page.tsx BUG-26準拠: fold済みpositionを算出 */
function getFoldedPositions(actions: ActionRecord[]): Set<string> {
  return new Set(
    actions.filter(a => a.action === 'fold').map(a => a.position),
  );
}

/** record/page.tsx BUG-26準拠: fold済み以外 = 勝者候補 */
function getNonFolded(
  players: PlayerState[],
  actions: ActionRecord[],
): Position[] {
  const foldedPositions = getFoldedPositions(actions);
  return players
    .filter(p => !foldedPositions.has(p.position))
    .map(p => p.position);
}

/** 自動勝者判定: nonFolded.length === 1 のとき自動勝者 */
function getAutoWinner(
  players: PlayerState[],
  actions: ActionRecord[],
): Position | null {
  const nonFolded = getNonFolded(players, actions);
  return nonFolded.length === 1 ? nonFolded[0] : null;
}

describe('BUG-36: フォールド勝利自動決定の検証', () => {
  // =================================================================
  // シナリオ 1: HU SB open → BB fold → 自動勝者 SB
  // =================================================================
  describe('シナリオ1: HU SB open → BB fold → 自動勝者SB', () => {
    const players: PlayerState[] = [
      mkPlayer('SB', defaultStack - blinds.sb - 3), // raised 3BB (posted 0.5 blind + 2.5 raise)
      mkPlayer('BB', defaultStack - blinds.bb, false), // folded
    ];
    const actions: ActionRecord[] = [
      mkAction('SB', 'raise', 3),
      mkAction('BB', 'fold'),
    ];

    it('foldedPositions: BBのみ', () => {
      const folded = getFoldedPositions(actions);
      expect(folded.size).toBe(1);
      expect(folded.has('BB')).toBe(true);
    });

    it('nonFolded: SBのみ（1人）', () => {
      const nonFolded = getNonFolded(players, actions);
      expect(nonFolded).toHaveLength(1);
      expect(nonFolded).toContain('SB');
    });

    it('自動勝者 = SB', () => {
      expect(getAutoWinner(players, actions)).toBe('SB');
    });
  });

  // =================================================================
  // シナリオ 2: 3way UTG open → SB fold → BB fold → 自動勝者 UTG
  // =================================================================
  describe('シナリオ2: 3way UTG open → SB fold → BB fold → 自動勝者UTG', () => {
    const players: PlayerState[] = [
      mkPlayer('UTG', defaultStack - 3),              // raised 3BB
      mkPlayer('SB', defaultStack - blinds.sb, false), // folded
      mkPlayer('BB', defaultStack - blinds.bb, false), // folded
    ];
    const actions: ActionRecord[] = [
      mkAction('UTG', 'raise', 3),
      mkAction('SB', 'fold'),
      mkAction('BB', 'fold'),
    ];

    it('foldedPositions: SB, BB', () => {
      const folded = getFoldedPositions(actions);
      expect(folded.size).toBe(2);
      expect(folded.has('SB')).toBe(true);
      expect(folded.has('BB')).toBe(true);
    });

    it('nonFolded: UTGのみ（1人）', () => {
      const nonFolded = getNonFolded(players, actions);
      expect(nonFolded).toHaveLength(1);
      expect(nonFolded).toContain('UTG');
    });

    it('自動勝者 = UTG', () => {
      expect(getAutoWinner(players, actions)).toBe('UTG');
    });
  });

  // =================================================================
  // シナリオ 3: 4way UTG open → CO fold → SB fold → BB fold → 自動勝者 UTG
  // =================================================================
  describe('シナリオ3: 4way UTG open → CO fold → SB fold → BB fold → 自動勝者UTG', () => {
    const players: PlayerState[] = [
      mkPlayer('UTG', defaultStack - 3),              // raised 3BB
      mkPlayer('CO', defaultStack, false),             // folded (no blind)
      mkPlayer('SB', defaultStack - blinds.sb, false), // folded
      mkPlayer('BB', defaultStack - blinds.bb, false), // folded
    ];
    const actions: ActionRecord[] = [
      mkAction('UTG', 'raise', 3),
      mkAction('CO', 'fold'),
      mkAction('SB', 'fold'),
      mkAction('BB', 'fold'),
    ];

    it('foldedPositions: CO, SB, BB', () => {
      const folded = getFoldedPositions(actions);
      expect(folded.size).toBe(3);
      expect(folded.has('CO')).toBe(true);
      expect(folded.has('SB')).toBe(true);
      expect(folded.has('BB')).toBe(true);
    });

    it('nonFolded: UTGのみ（1人）', () => {
      const nonFolded = getNonFolded(players, actions);
      expect(nonFolded).toHaveLength(1);
      expect(nonFolded).toContain('UTG');
    });

    it('自動勝者 = UTG', () => {
      expect(getAutoWinner(players, actions)).toBe('UTG');
    });
  });

  // =================================================================
  // シナリオ 4: 3way 1人fold, 2人残り → 自動勝者にならない
  // =================================================================
  describe('シナリオ4: 3way UTG open → CO fold → SB call → 2人残り、自動勝者にならない', () => {
    const players: PlayerState[] = [
      mkPlayer('UTG', defaultStack - 3),                        // raised 3BB
      mkPlayer('CO', defaultStack, false),                       // folded
      mkPlayer('SB', defaultStack - blinds.sb - 2.5),           // called (0.5 blind + 2.5 call = 3BB total)
    ];
    const actions: ActionRecord[] = [
      mkAction('UTG', 'raise', 3),
      mkAction('CO', 'fold'),
      mkAction('SB', 'call'),
    ];

    it('foldedPositions: COのみ', () => {
      const folded = getFoldedPositions(actions);
      expect(folded.size).toBe(1);
      expect(folded.has('CO')).toBe(true);
    });

    it('nonFolded: UTG, SB（2人）', () => {
      const nonFolded = getNonFolded(players, actions);
      expect(nonFolded).toHaveLength(2);
      expect(nonFolded).toContain('UTG');
      expect(nonFolded).toContain('SB');
    });

    it('自動勝者にならない（null）', () => {
      expect(getAutoWinner(players, actions)).toBeNull();
    });
  });

  // =================================================================
  // シナリオ 5: Flop後fold → 自動勝者
  //   Preflop: UTG open → CO call → SB fold → BB fold (UTG,CO go to flop)
  //   Flop: UTG bet → CO fold → 自動勝者 UTG
  // =================================================================
  describe('シナリオ5: Flop後 UTG bet → CO fold → 自動勝者UTG', () => {
    const preflopActions: ActionRecord[] = [
      mkAction('UTG', 'raise', 3, 'preflop'),
      mkAction('CO', 'call', undefined, 'preflop'),
      mkAction('SB', 'fold', undefined, 'preflop'),
      mkAction('BB', 'fold', undefined, 'preflop'),
    ];
    const flopActions: ActionRecord[] = [
      mkAction('UTG', 'bet', 5, 'flop'),
      mkAction('CO', 'fold', undefined, 'flop'),
    ];
    const allActions = [...preflopActions, ...flopActions];

    // UTG: 100-3(preflop)-5(flop bet)=92
    // CO: folded on flop, stack=97 (100-3 preflop call)
    // SB: folded preflop
    // BB: folded preflop
    const players: PlayerState[] = [
      mkPlayer('UTG', defaultStack - 3 - 5),           // 92
      mkPlayer('CO', defaultStack - 3, false),          // 97, folded on flop
      mkPlayer('SB', defaultStack - blinds.sb, false),  // folded preflop
      mkPlayer('BB', defaultStack - blinds.bb, false),  // folded preflop
    ];

    it('foldedPositions: CO, SB, BB（3人）', () => {
      const folded = getFoldedPositions(allActions);
      expect(folded.size).toBe(3);
      expect(folded.has('CO')).toBe(true);
      expect(folded.has('SB')).toBe(true);
      expect(folded.has('BB')).toBe(true);
    });

    it('nonFolded: UTGのみ（1人）', () => {
      const nonFolded = getNonFolded(players, allActions);
      expect(nonFolded).toHaveLength(1);
      expect(nonFolded).toContain('UTG');
    });

    it('自動勝者 = UTG', () => {
      expect(getAutoWinner(players, allActions)).toBe('UTG');
    });

    it('preflopのfoldとflopのfoldが両方foldedPositionsに含まれる', () => {
      const folded = getFoldedPositions(allActions);
      // SB/BB: preflop fold, CO: flop fold → 全てfoldedに含まれる
      expect(folded.has('SB')).toBe(true);  // preflop fold
      expect(folded.has('BB')).toBe(true);  // preflop fold
      expect(folded.has('CO')).toBe(true);  // flop fold
      expect(folded.has('UTG')).toBe(false); // never folded
    });
  });
});
