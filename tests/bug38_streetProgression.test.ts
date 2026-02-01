import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import { HandProvider, useHand } from '@/contexts/HandContext';
import type { Position, ActionRecord, Street } from '@/types/poker';
import { getActivePlayers, getActingPlayers } from '@/utils/pokerUtils';
import { isStreetClosed } from '@/utils/potUtils';
import { POKER_CONFIG } from '@/utils/pokerConfig';

// ── Helpers ──────────────────────────────────────────────────

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(HandProvider, null, children);

function mkAction(
  position: Position,
  action: string,
  amount?: number,
): ActionRecord {
  return {
    position,
    action: action as ActionRecord['action'],
    street: 'preflop' as Street,
    timestamp: Date.now(),
    ...(amount !== undefined && {
      size: { type: 'bet-relative' as const, value: amount, amount },
    }),
  };
}

// ── Tests ────────────────────────────────────────────────────

describe('BUG-38: プリフロップ→フロップ進行E2Eテスト', () => {

  // ================================================================
  // シナリオ1: 3人 BTN raise → SB call → BB call → フロップ
  // ================================================================
  describe('シナリオ1: 3人 BTN raise → SB call → BB call → フロップ進行', () => {
    it('全員コール完了後にストリートがflopに進む', () => {
      const { result } = renderHook(() => useHand(), { wrapper });
      act(() => { result.current.startNewHand(['BTN', 'SB', 'BB'], null); });

      act(() => {
        result.current.addActions([
          mkAction('BTN', 'raise', 3),
          mkAction('SB', 'call'),
          mkAction('BB', 'call'),
        ]);
      });

      const gs = result.current.gameState!;
      expect(gs.street).toBe('flop');
      expect(getActivePlayers(gs.players)).toHaveLength(3);
      expect(getActingPlayers(gs.players)).toHaveLength(3);
      // lastBetはストリート遷移でリセット（BUG-14）
      expect(gs.lastBet).toBeUndefined();
    });
  });

  // ================================================================
  // シナリオ2: 3人 BTN raise → SB call → BB fold → フロップ 2人
  // ================================================================
  describe('シナリオ2: 3人 BTN raise → SB call → BB fold → フロップ進行 残り2人', () => {
    it('BBフォールドでもストリートがflopに進み自動勝者にならない', () => {
      const { result } = renderHook(() => useHand(), { wrapper });
      act(() => { result.current.startNewHand(['BTN', 'SB', 'BB'], null); });

      act(() => {
        result.current.addActions([
          mkAction('BTN', 'raise', 3),
          mkAction('SB', 'call'),
          mkAction('BB', 'fold'),
        ]);
      });

      const gs = result.current.gameState!;
      expect(gs.street).toBe('flop');
      const active = getActivePlayers(gs.players);
      expect(active).toHaveLength(2);
      expect(active).toContain('BTN');
      expect(active).toContain('SB');
      expect(active).not.toContain('BB');
    });

    it('isStreetClosedがBBフォールド後も正しくtrueを返す', () => {
      const { result } = renderHook(() => useHand(), { wrapper });
      act(() => { result.current.startNewHand(['BTN', 'SB', 'BB'], null); });

      act(() => {
        result.current.addActions([
          mkAction('BTN', 'raise', 3),
          mkAction('SB', 'call'),
          mkAction('BB', 'fold'),
        ]);
      });

      const gs = result.current.gameState!;
      // フロップに進んだ＝プリフロップが閉じた証拠
      // 直接isStreetClosedでも検証: actingPlayersはフォールド済みBBを除外
      const actingOnPreflop = gs.players
        .filter(p => p.active && !p.isAllIn)
        .map(p => p.position);
      const stacks = new Map(gs.players.map(p => [p.position, p.stack]));
      const closed = isStreetClosed(gs.actions, 'preflop', actingOnPreflop as string[], stacks);
      expect(closed).toBe(true);
    });
  });

  // ================================================================
  // シナリオ3: 3人 BTN raise → SB fold → BB call → フロップ 2人
  // ================================================================
  describe('シナリオ3: 3人 BTN raise → SB fold → BB call → フロップ進行 残り2人', () => {
    it('SBフォールドでもストリートがflopに進む', () => {
      const { result } = renderHook(() => useHand(), { wrapper });
      act(() => { result.current.startNewHand(['BTN', 'SB', 'BB'], null); });

      act(() => {
        result.current.addActions([
          mkAction('BTN', 'raise', 3),
          mkAction('SB', 'fold'),
          mkAction('BB', 'call'),
        ]);
      });

      const gs = result.current.gameState!;
      expect(gs.street).toBe('flop');
      const active = getActivePlayers(gs.players);
      expect(active).toHaveLength(2);
      expect(active).toContain('BTN');
      expect(active).toContain('BB');
      expect(active).not.toContain('SB');
    });
  });

  // ================================================================
  // シナリオ4: 4人 UTG raise → CO call → SB call → BB call → フロップ
  // ================================================================
  describe('シナリオ4: 4人 UTG raise → CO call → SB call → BB call → フロップ進行', () => {
    it('4人全員アクション完了後にストリートがflopに進む', () => {
      const { result } = renderHook(() => useHand(), { wrapper });
      act(() => { result.current.startNewHand(['UTG', 'CO', 'SB', 'BB'], null); });

      act(() => {
        result.current.addActions([
          mkAction('UTG', 'raise', 3),
          mkAction('CO', 'call'),
          mkAction('SB', 'call'),
          mkAction('BB', 'call'),
        ]);
      });

      const gs = result.current.gameState!;
      expect(gs.street).toBe('flop');
      expect(getActivePlayers(gs.players)).toHaveLength(4);
      expect(getActingPlayers(gs.players)).toHaveLength(4);
    });

    it('フロップ進行後のスタック検証: 全員3BB投入', () => {
      const { result } = renderHook(() => useHand(), { wrapper });
      act(() => { result.current.startNewHand(['UTG', 'CO', 'SB', 'BB'], null); });

      act(() => {
        result.current.addActions([
          mkAction('UTG', 'raise', 3),
          mkAction('CO', 'call'),
          mkAction('SB', 'call'),
          mkAction('BB', 'call'),
        ]);
      });

      const gs = result.current.gameState!;
      // UTG: 100 - 3 = 97, CO: 100 - 3 = 97, SB: 99.5 - 2.5 = 97, BB: 99 - 2 = 97
      for (const p of gs.players) {
        expect(p.stack).toBe(97);
      }
    });
  });

  // ================================================================
  // シナリオ5: HU SB call(リンプ) → BB check → フロップ
  // ================================================================
  describe('シナリオ5: HU SB call(リンプ) → BB check → フロップ進行', () => {
    it('リンプポット（ベットなし）でもストリートがflopに進む', () => {
      const { result } = renderHook(() => useHand(), { wrapper });
      act(() => { result.current.startNewHand(['SB', 'BB'], null); });

      act(() => {
        result.current.addActions([
          mkAction('SB', 'call'),
          mkAction('BB', 'check'),
        ]);
      });

      const gs = result.current.gameState!;
      expect(gs.street).toBe('flop');
      expect(getActivePlayers(gs.players)).toHaveLength(2);
      // SB: 99.5 - 0.5 = 99, BB: 99 (check = 変更なし)
      const sb = gs.players.find(p => p.position === 'SB')!;
      const bb = gs.players.find(p => p.position === 'BB')!;
      expect(sb.stack).toBe(99);
      expect(bb.stack).toBe(99);
    });
  });

  // ================================================================
  // シナリオ6: 4人 UTG raise → CO call → SB fold → BB fold
  //   → 2人残り → フロップ進行（BUG-35: BBがfold可能）
  // ================================================================
  describe('シナリオ6: 4人 UTG raise → CO call → SB fold → BB fold → フロップ進行 (BUG-35)', () => {
    it('SB+BBフォールドでも2人残り→フロップに進む（自動勝者にならない）', () => {
      const { result } = renderHook(() => useHand(), { wrapper });
      act(() => { result.current.startNewHand(['UTG', 'CO', 'SB', 'BB'], null); });

      act(() => {
        result.current.addActions([
          mkAction('UTG', 'raise', 3),
          mkAction('CO', 'call'),
          mkAction('SB', 'fold'),
          mkAction('BB', 'fold'),
        ]);
      });

      const gs = result.current.gameState!;
      expect(gs.street).toBe('flop');
      const active = getActivePlayers(gs.players);
      expect(active).toHaveLength(2);
      expect(active).toContain('UTG');
      expect(active).toContain('CO');
      // BBフォールドがストリート進行を壊さないこと
      expect(active).not.toContain('SB');
      expect(active).not.toContain('BB');
    });

    it('isStreetClosedが複数フォールド後も正しく判定する', () => {
      const { result } = renderHook(() => useHand(), { wrapper });
      act(() => { result.current.startNewHand(['UTG', 'CO', 'SB', 'BB'], null); });

      act(() => {
        result.current.addActions([
          mkAction('UTG', 'raise', 3),
          mkAction('CO', 'call'),
          mkAction('SB', 'fold'),
          mkAction('BB', 'fold'),
        ]);
      });

      const gs = result.current.gameState!;
      const actingOnPreflop = gs.players
        .filter(p => p.active && !p.isAllIn)
        .map(p => p.position);
      const stacks = new Map(gs.players.map(p => [p.position, p.stack]));
      const closed = isStreetClosed(gs.actions, 'preflop', actingOnPreflop as string[], stacks);
      expect(closed).toBe(true);
    });
  });

  // ================================================================
  // シナリオ7: 3人 BTN raise → SB fold → BB fold
  //   → 1人残り → ストリート進行なし（BUG-36: 自動勝者発火条件）
  // ================================================================
  describe('シナリオ7: 3人 BTN raise → SB fold → BB fold → 自動勝者 (BUG-36)', () => {
    it('全員フォールドでストリートがpreflopのまま（進行しない）', () => {
      const { result } = renderHook(() => useHand(), { wrapper });
      act(() => { result.current.startNewHand(['BTN', 'SB', 'BB'], null); });

      act(() => {
        result.current.addActions([
          mkAction('BTN', 'raise', 3),
          mkAction('SB', 'fold'),
          mkAction('BB', 'fold'),
        ]);
      });

      const gs = result.current.gameState!;
      // activePlayers <= 1 → ストリート進行なし
      expect(gs.street).toBe('preflop');
      const active = getActivePlayers(gs.players);
      expect(active).toHaveLength(1);
      expect(active[0]).toBe('BTN');
    });

    it('fold-based残存プレイヤーが1人（BUG-36自動勝者判定条件）', () => {
      const { result } = renderHook(() => useHand(), { wrapper });
      act(() => { result.current.startNewHand(['BTN', 'SB', 'BB'], null); });

      act(() => {
        result.current.addActions([
          mkAction('BTN', 'raise', 3),
          mkAction('SB', 'fold'),
          mkAction('BB', 'fold'),
        ]);
      });

      const gs = result.current.gameState!;
      // record/page.tsx L374-381 の自動勝者判定ロジック再現
      const foldedPositions = new Set(
        gs.actions.filter(a => a.action === 'fold').map(a => a.position),
      );
      const remaining = gs.players
        .filter(p => !foldedPositions.has(p.position))
        .map(p => p.position);
      expect(remaining).toHaveLength(1);
      expect(remaining[0]).toBe('BTN');
      // fold-based判定とactive判定が一致する
      expect(remaining).toEqual(getActivePlayers(gs.players));
    });
  });
});
