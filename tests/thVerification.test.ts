/**
 * THルール検証サブエージェント用テスト
 * docs/TH_VERIFICATION_AGENT.md および docs/TEST_SPEC_TEXAS_HOLDEM.md に準拠
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import type { Position, ActionRecord, Street } from '@/types/poker';
import { HandProvider, useHand } from '@/contexts/HandContext';
import { renderHook, act } from '@testing-library/react';
import { getActionOrder, getActivePlayers, getNextPosition } from '@/utils/pokerUtils';
import { calculateCurrentPot, isStreetClosed } from '@/utils/potUtils';
import { getAvailableActions, calculateMinRaise } from '@/utils/bettingUtils';

function createHandContextWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(HandProvider, null, children);
}

describe('TH Verification - TEST_SPEC 準拠', () => {
  describe('初期化', () => {
    it('Postflop アクション順は SB → BB → UTG → MP → CO → BTN', () => {
      const order = getActionOrder('flop');
      expect(order).toEqual(['SB', 'BB', 'UTG', 'MP', 'CO', 'BTN']);
    });

    it('Preflop アクション順は UTG → MP → CO → BTN → SB → BB', () => {
      const order = getActionOrder('preflop');
      expect(order).toEqual(['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB']);
    });
  });

  describe('ポット計算', () => {
    it('空アクションで初期ポット 1.5BB', () => {
      expect(calculateCurrentPot([])).toBe(1.5);
    });

    it('UTG 3BB ベット + MP コールでポット 1.5 + 3 + 3 = 7.5BB', () => {
      const actions: ActionRecord[] = [
        {
          position: 'UTG',
          action: 'bet',
          size: { type: 'bet-relative', value: 3, amount: 3 },
          street: 'preflop',
          timestamp: Date.now(),
        },
        {
          position: 'MP',
          action: 'call',
          street: 'preflop',
          timestamp: Date.now(),
        },
      ];
      expect(calculateCurrentPot(actions)).toBe(7.5);
    });
  });

  describe('最小レイズ', () => {
    it('最初のベットなしなら最小レイズ 2BB', () => {
      expect(calculateMinRaise([], 'preflop')).toBe(2);
    });

    it('最後のベット 3BB なら最小レイズ 6BB', () => {
      expect(calculateMinRaise([], 'preflop', 3)).toBe(6);
    });
  });

  describe('ストリート進行（ラウンド閉鎖）', () => {
    it('Preflop: UTG ベット → 残り全員コール/フォールドでフロップへ進む', () => {
      const { result } = renderHook(() => useHand(), {
        wrapper: createHandContextWrapper(),
      });

      act(() => {
        result.current.startNewHand(
          ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'],
          'BTN',
          undefined
        );
      });

      expect(result.current.gameState?.street).toBe('preflop');

      // UTG 3BB
      act(() => {
        result.current.addAction({
          position: 'UTG',
          action: 'bet',
          size: { type: 'bet-relative', value: 3, amount: 3 },
          street: 'preflop',
          timestamp: Date.now(),
        });
      });

      act(() => {
        result.current.addAction({
          position: 'MP',
          action: 'call',
          street: 'preflop',
          timestamp: Date.now(),
        });
      });
      act(() => {
        result.current.addAction({
          position: 'CO',
          action: 'fold',
          street: 'preflop',
          timestamp: Date.now(),
        });
      });
      act(() => {
        result.current.addAction({
          position: 'BTN',
          action: 'call',
          street: 'preflop',
          timestamp: Date.now(),
        });
      });
      act(() => {
        result.current.addAction({
          position: 'SB',
          action: 'fold',
          street: 'preflop',
          timestamp: Date.now(),
        });
      });
      act(() => {
        result.current.addAction({
          position: 'BB',
          action: 'call',
          street: 'preflop',
          timestamp: Date.now(),
        });
      });

      // ラウンド閉鎖後は street が flop になるべき
      expect(result.current.gameState?.street).toBe('flop');
    });

    it('Flop: 全員同額でないとターンに進まない（TH準拠）', () => {
      const actions: ActionRecord[] = [
        { position: 'SB', action: 'bet', size: { type: 'pot-relative', value: 0.5, amount: 2 }, street: 'flop', timestamp: Date.now() },
      ];
      const active = ['SB', 'BB', 'UTG'];
      expect(isStreetClosed(actions, 'flop', active)).toBe(false);
      const withCall = [
        ...actions,
        { position: 'BB', action: 'call', street: 'flop', timestamp: Date.now() },
        { position: 'UTG', action: 'call', street: 'flop', timestamp: Date.now() },
      ];
      expect(isStreetClosed(withCall as ActionRecord[], 'flop', active)).toBe(true);
    });

    it('Preflop: 全員フォールドならストリートは preflop のまま（1人残り）', () => {
      const { result } = renderHook(() => useHand(), {
        wrapper: createHandContextWrapper(),
      });

      act(() => {
        result.current.startNewHand(
          ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'],
          'UTG',
          undefined
        );
      });

      ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'].forEach((pos) => {
        act(() => {
          result.current.addAction({
            position: pos as Position,
            action: 'fold',
            street: 'preflop',
            timestamp: Date.now(),
          });
        });
      });

      const active = getActivePlayers(result.current.gameState!.players);
      expect(active.length).toBe(0); // 全員フォールド
      expect(result.current.gameState?.street).toBe('preflop');
    });
  });

  describe('アクション順・次のポジション', () => {
    it('Preflop で UTG の次は MP（アクティブのみ）', () => {
      const order = getActionOrder('preflop');
      const active: Position[] = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
      const next = getNextPosition('UTG', 'preflop', active);
      expect(next).toBe('MP');
    });

    it('Postflop で SB の次は BB', () => {
      const active: Position[] = ['SB', 'BB', 'UTG', 'BTN'];
      const next = getNextPosition('SB', 'flop', active);
      expect(next).toBe('BB');
    });
  });

  describe('利用可能アクション', () => {
    it('Preflop 最初のアクション（UTG）で fold, bet, all-in が得られる', () => {
      const { result } = renderHook(() => useHand(), {
        wrapper: createHandContextWrapper(),
      });

      act(() => {
        result.current.startNewHand(
          ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'],
          'UTG',
          undefined
        );
      });

      const actions = getAvailableActions(
        'UTG',
        'preflop',
        [],
        result.current.gameState!.players,
        result.current.gameState!.pot
      );

      const actionTypes = actions.map((a) => a.action);
      expect(actionTypes).toContain('fold');
      expect(actionTypes).toContain('bet');
      expect(actionTypes).toContain('all-in');
    });

    it('ベット後は コール/レイズ/フォールド が得られる', () => {
      const { result } = renderHook(() => useHand(), {
        wrapper: createHandContextWrapper(),
      });

      act(() => {
        result.current.startNewHand(
          ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'],
          'MP',
          undefined
        );
      });

      act(() => {
        result.current.addAction({
          position: 'UTG',
          action: 'bet',
          size: { type: 'bet-relative', value: 3, amount: 3 },
          street: 'preflop',
          timestamp: Date.now(),
        });
      });

      const actions = getAvailableActions(
        'MP',
        'preflop',
        result.current.gameState!.actions,
        result.current.gameState!.players,
        result.current.gameState!.pot,
        3
      );

      const actionTypes = actions.map((a) => a.action);
      expect(actionTypes).toContain('fold');
      expect(actionTypes).toContain('call');
      expect(actionTypes).toContain('raise');
      expect(actionTypes).toContain('all-in');
    });
  });
});
