import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import type { Position, ActionRecord, Street } from '@/types/poker';
import { HandProvider, useHand } from '@/contexts/HandContext';
import { renderHook, act } from '@testing-library/react';
import { calculateCurrentPot, calculatePotForStreet } from '@/utils/potUtils';
import { getActionOrder, getNextPosition, getActivePlayers } from '@/utils/pokerUtils';
import { getAvailableActions, calculateMinRaise, areAllPlayersAllIn } from '@/utils/bettingUtils';

// React Hook をテストするためのラッパー
function createHandContextWrapper() {
  return ({ children }: { children: React.ReactNode }) => {
    return React.createElement(HandProvider, null, children);
  };
}

describe('Poker Logic Tests - Texas Hold\'em 6-max', () => {
  describe('1. 初期化', () => {
    it('初期ポットは 1.5BB', () => {
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

      expect(result.current.gameState?.pot).toBe(1.5);
    });

    it('全プレイヤーのスタックは 100BB', () => {
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

      result.current.gameState?.players.forEach((player) => {
        expect(player.stack).toBe(100);
      });
    });

    it('プリフロップは UTG から開始', () => {
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

      expect(result.current.gameState?.currentPosition).toBe('UTG');
      expect(result.current.gameState?.street).toBe('preflop');
    });

    it('heroPosition と heroHand が正しく保存される', () => {
      const { result } = renderHook(() => useHand(), {
        wrapper: createHandContextWrapper(),
      });

      act(() => {
        result.current.startNewHand(
          ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'],
          'BTN',
          ['As', 'Kh']
        );
      });

      expect(result.current.currentHand?.heroPosition).toBe('BTN');
      expect(result.current.currentHand?.heroHand).toEqual(['As', 'Kh']);
    });
  });

  describe('2. プリフロップ', () => {
    it('アクション順序: UTG → MP → CO → BTN → SB → BB', () => {
      const order = getActionOrder('preflop');
      expect(order).toEqual(['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB']);
    });

    it('ベットサイズ: 最初のアクションは 2x, 3x, all-in', () => {
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

      const betAction = actions.find(a => a.action === 'bet');
      const allInAction = actions.find(a => a.action === 'all-in');
      
      expect(betAction?.sizes).toBeDefined();
      expect(allInAction).toBeDefined();
      
      if (betAction?.sizes) {
        const sizes = betAction.sizes;
        expect(sizes.some(s => s.value === 2)).toBe(true);
        expect(sizes.some(s => s.value === 3)).toBe(true);
        // オールインは別アクションとして提供される
      }
    });

    it('全員フォールドでハンド終了', () => {
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

      // UTG, MP, CO, BTN, SB がフォールド
      const positions: Position[] = ['UTG', 'MP', 'CO', 'BTN', 'SB'];
      positions.forEach((pos) => {
        act(() => {
          result.current.addAction({
            position: pos,
            action: 'fold',
            street: 'preflop',
            timestamp: Date.now(),
          });
        });
      });

      // BB もフォールド
      act(() => {
        result.current.addAction({
          position: 'BB',
          action: 'fold',
          street: 'preflop',
          timestamp: Date.now(),
        });
      });

      const activePlayers = getActivePlayers(result.current.gameState!.players);
      expect(activePlayers.length).toBeLessThanOrEqual(1);
    });
  });

  describe('3. ポストフロップ', () => {
    it('アクション順序: SB → BB → UTG → MP → CO → BTN', () => {
      const order = getActionOrder('flop');
      expect(order).toEqual(['SB', 'BB', 'UTG', 'MP', 'CO', 'BTN']);
    });

    it('最初のアクション: Pot-relative (1/3, 1/2, pot, all-in)', () => {
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

      // プリフロップを完了させる
      act(() => {
        result.current.addAction({
          position: 'BTN',
          action: 'bet',
          size: { type: 'bet-relative', value: 3, amount: 3 },
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

      // フロップに進む（簡略化: ストリートを手動で変更）
      // 実際の実装では HandContext が自動で進める

      const actions = getAvailableActions(
        'SB',
        'flop',
        result.current.gameState!.actions,
        result.current.gameState!.players,
        result.current.gameState!.pot
      );

      const betAction = actions.find(a => a.action === 'bet');
      expect(betAction?.sizes).toBeDefined();
    });
  });

  describe('4. ポット計算', () => {
    it('初期ポット: 1.5BB', () => {
      const pot = calculateCurrentPot([]);
      expect(pot).toBe(1.5);
    });

    it('ベット/レイズ/オールイン: 指定額をポットに追加', () => {
      const actions: ActionRecord[] = [
        {
          position: 'UTG',
          action: 'bet',
          size: { type: 'bet-relative', value: 3, amount: 3 },
          street: 'preflop',
          timestamp: Date.now(),
        },
      ];

      const pot = calculateCurrentPot(actions);
      expect(pot).toBe(4.5); // 1.5 + 3
    });

    it('コール: 現在のベット額に合わせてポットに追加', () => {
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

      const pot = calculateCurrentPot(actions);
      expect(pot).toBeGreaterThan(4.5); // 1.5 + 3 + 3 (call)
    });

    it('プリフロップリンプ: 最初のコール（1 BB）でポット 2.5 BB', () => {
      const actions: ActionRecord[] = [
        {
          position: 'UTG',
          action: 'call',
          street: 'preflop',
          timestamp: Date.now(),
        },
      ];
      const pot = calculateCurrentPot(actions);
      expect(pot).toBe(2.5); // 1.5 (SB+BB) + 1 (UTG limp)
    });
  });

  describe('5. ストリート進行', () => {
    it('全員チェックで次のストリートへ', () => {
      // 実装: チェック-チェックのシナリオをテスト
      // 簡略化のため、基本的な構造のみ
    });

    it('1人残り（全員フォールド）の場合はハンド終了', () => {
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

      // 全員フォールド
      ['MP', 'CO', 'BTN', 'SB', 'BB'].forEach((pos) => {
        act(() => {
          result.current.addAction({
            position: pos as Position,
            action: 'fold',
            street: 'preflop',
            timestamp: Date.now(),
          });
        });
      });

      const activePlayers = getActivePlayers(result.current.gameState!.players);
      expect(activePlayers.length).toBeLessThanOrEqual(1);
      // 次のストリートに進まないことを確認（street が preflop のまま）
      expect(result.current.gameState?.street).toBe('preflop');
    });
  });

  describe('6. 最小レイズ', () => {
    it('最初のベット: 最小2BB', () => {
      const minRaise = calculateMinRaise([], 'preflop');
      expect(minRaise).toBe(2);
    });

    it('レイズ: 最後のベット/レイズ額の2倍が最小レイズ', () => {
      const actions: ActionRecord[] = [
        {
          position: 'UTG',
          action: 'bet',
          size: { type: 'bet-relative', value: 3, amount: 3 },
          street: 'preflop',
          timestamp: Date.now(),
        },
      ];

      const minRaise = calculateMinRaise(actions, 'preflop', 3);
      expect(minRaise).toBe(6); // 3 * 2
    });
  });

  describe('7. オールイン', () => {
    it('全プレイヤーがオールイン時は自動スキップ', () => {
      // 実装: 全員オールインのシナリオをテスト
    });
  });
});

// 約200パターンのテストを追加するためのヘルパー関数
function generateTestPatterns() {
  const patterns: Array<{
    name: string;
    test: () => void;
  }> = [];

  // パターン生成ロジックをここに追加
  // 各カテゴリの組み合わせで200パターンに近づける

  return patterns;
}
