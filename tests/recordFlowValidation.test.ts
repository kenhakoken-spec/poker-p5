/**
 * 記録フロー検証（THルール検証サブエージェント監督用）
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import type { Position, ActionRecord, Street } from '@/types/poker';
import { HandProvider, useHand } from '@/contexts/HandContext';
import { renderHook, act } from '@testing-library/react';
import {
  getSelectablePositions,
  canSelectPosition,
  isActionAllowed,
  validateAction,
} from '@/utils/recordFlowValidation';

function createHandContextWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(HandProvider, null, children);
}

describe('Record flow validation', () => {
  describe('getSelectablePositions', () => {
    it('Preflop 最初は UTG のみ選択可能', () => {
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
      const selectable = getSelectablePositions(result.current.gameState!);
      expect(selectable).toEqual(['UTG']);
    });

    it('UTG fold 後は MP のみ選択可能', () => {
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
      act(() => {
        result.current.addAction({
          position: 'UTG',
          action: 'fold',
          street: 'preflop',
          timestamp: Date.now(),
        });
      });
      const selectable = getSelectablePositions(result.current.gameState!);
      expect(selectable).toEqual(['MP']);
    });
  });

  describe('canSelectPosition', () => {
    it('Preflop 最初は UTG のみ true', () => {
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
      expect(canSelectPosition('UTG', result.current.gameState!)).toBe(true);
      expect(canSelectPosition('MP', result.current.gameState!)).toBe(false);
    });
  });

  describe('validateAction', () => {
    it('正しいアクションは valid', () => {
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
      const record: ActionRecord = {
        position: 'UTG',
        action: 'fold',
        street: 'preflop',
        timestamp: Date.now(),
      };
      const { valid } = validateAction(record, result.current.gameState!);
      expect(valid).toBe(true);
    });

    it('順番外のポジションのアクションは invalid', () => {
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
      const record: ActionRecord = {
        position: 'MP',
        action: 'fold',
        street: 'preflop',
        timestamp: Date.now(),
      };
      const { valid, reason } = validateAction(record, result.current.gameState!);
      expect(valid).toBe(false);
      expect(reason).toContain('このタイミングでアクションできません');
    });
  });
});
