'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Hand, ActionRecord, Position, Street, GameState, PlayerState, ShowdownHand } from '@/types/poker';
import { addHand } from '@/utils/storage';
import { getActionOrder, getActivePlayers, getActingPlayers } from '@/utils/pokerUtils';
import { calculateCurrentPot, isStreetClosed, getContributionsThisStreet, getMaxContributionThisStreet, calculateSidePots } from '@/utils/potUtils';

interface HandContextType {
  currentHand: Hand | null;
  gameState: GameState | null;
  startNewHand: (positions: Position[], heroPosition: Position | null, heroHand?: [string, string]) => void;
  addAction: (action: ActionRecord) => void;
  addActions: (actions: ActionRecord[]) => void;
  setBoardCards: (street: 'flop' | 'turn' | 'river', cards: string[]) => void;
  setWinnerAndShowdown: (winnerPosition: Position | Position[], showdownHands?: import('@/types/poker').ShowdownHand[]) => void;
  finishHand: (result?: { won: boolean; amount: number }) => void;
  reset: () => void;
}

const HandContext = createContext<HandContextType | undefined>(undefined);

export function HandProvider({ children }: { children: ReactNode }) {
  const [currentHand, setCurrentHand] = useState<Hand | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  const startNewHand = useCallback((positions: Position[], heroPosition: Position | null, heroHand?: [string, string]) => {
    const hand: Hand = {
      id: Date.now().toString(),
      date: Date.now(),
      positions,
      heroPosition,
      heroHand,
      actions: [],
    };

    const players: PlayerState[] = positions.map((pos) => ({
      position: pos,
      stack: 100, // デフォルト100BB
      active: true,
      isAllIn: false,
    }));

    const state: GameState = {
      street: 'preflop',
      currentPosition: getActionOrder('preflop')[0],
      players,
      pot: 1.5, // SB + BB
      actions: [],
    };

    setCurrentHand(hand);
    setGameState(state);
  }, []);

  const addAction = useCallback((action: ActionRecord) => {
    if (!currentHand || !gameState) return;

    const newActions = [...currentHand.actions, action];
    const updatedHand = { ...currentHand, actions: newActions };

    // ゲームステートを更新（コール額はこのストリートの最大投入額−自分の投入額で算出）
    const contributionsBefore = getContributionsThisStreet(currentHand.actions, gameState.street);
    const maxContribBefore = getMaxContributionThisStreet(currentHand.actions, gameState.street);

    const updatedPlayers = gameState.players.map((player) => {
      if (player.position === action.position) {
        if (action.action === 'fold') {
          return { ...player, active: false };
        }
        let newStack = player.stack;
        if (action.action === 'bet' || action.action === 'raise' || action.action === 'all-in') {
          if (action.size?.amount !== undefined) {
            newStack = Math.max(0, player.stack - action.size.amount);
          }
        } else if (action.action === 'call') {
          const myContribBefore = contributionsBefore.get(action.position) ?? 0;
          const amountToCall = Math.max(0, maxContribBefore - myContribBefore);
          newStack = Math.max(0, player.stack - amountToCall);
        }
        const isAllIn = action.action === 'all-in' || newStack <= 0;
        return { ...player, stack: newStack, lastAction: action.action, isAllIn };
      }
      return player;
    });

    const newPot = calculateCurrentPot(newActions);
    // BUG-14: Short all-in should not lower lastBet; use Math.max to prevent it
    const actionAmount = action.size?.amount;
    const newLastBet = actionAmount !== undefined
      ? Math.max(actionAmount, gameState.lastBet ?? 0)
      : gameState.lastBet;

    // サイドポット計算（all-inが発生した場合）
    const hasAllIn = updatedPlayers.some(p => p.isAllIn && p.active);
    const sidePots = hasAllIn ? calculateSidePots(newActions, updatedPlayers) : undefined;

    // ストリート進行とハンド終了条件の判定
    let newStreet = gameState.street;
    const activePlayers = getActivePlayers(updatedPlayers);
    const actingPlayers = getActingPlayers(updatedPlayers);

    // 1人残り（全員フォールド）の場合はハンド終了（次のストリートに進まない）
    if (activePlayers.length <= 1) {
      newStreet = gameState.street;
    } else {
      // TH準拠: ラウンドが閉じたときのみ次ストリート
      // actingPlayers（active && !isAllIn）のみをチェック対象とする
      const actingPositions = actingPlayers as string[];
      const playerStacks = new Map(updatedPlayers.map((p) => [p.position, p.stack]));
      if (isStreetClosed(newActions, gameState.street, actingPositions, playerStacks)) {
        const streets: Street[] = ['preflop', 'flop', 'turn', 'river'];
        const currentIndex = streets.indexOf(gameState.street);
        if (currentIndex < streets.length - 1) {
          newStreet = streets[currentIndex + 1];
        }
      }
      // ランアウト: 全員all-in（actingPlayers === 0）→ riverまで自動進行
      if (actingPlayers.length === 0) {
        newStreet = 'river';
      }
    }

    // BUG-14: ストリート遷移時はlastBetをリセット（新ストリートでは誰もベットしていない）
    const finalLastBet = newStreet !== gameState.street ? undefined : newLastBet;

    const updatedState: GameState = {
      ...gameState,
      street: newStreet,
      players: updatedPlayers,
      pot: newPot,
      lastBet: finalLastBet,
      actions: newActions,
      sidePots,
    };

    setCurrentHand(updatedHand);
    setGameState(updatedState);
  }, [currentHand, gameState]);

  const addActions = useCallback(
    (actions: ActionRecord[]) => {
      if (!currentHand || !gameState || actions.length === 0) return;
      let hand = currentHand;
      let state = gameState;
      for (const action of actions) {
        const contribBefore = getContributionsThisStreet(hand.actions, state.street);
        const maxContribBefore = getMaxContributionThisStreet(hand.actions, state.street);
        const newActions = [...hand.actions, action];
        hand = { ...hand, actions: newActions };

        const updatedPlayers = state.players.map((p) => {
          if (p.position !== action.position) return p;
          if (action.action === 'fold') {
            return { ...p, active: false };
          }
          let newStack = p.stack;
          if (action.action === 'bet' || action.action === 'raise' || action.action === 'all-in') {
            if (action.size?.amount !== undefined) {
              newStack = Math.max(0, p.stack - action.size.amount);
            }
          } else if (action.action === 'call') {
            const myContribBefore = contribBefore.get(action.position) ?? 0;
            const amountToCall = Math.max(0, maxContribBefore - myContribBefore);
            newStack = Math.max(0, p.stack - amountToCall);
          }
          const isAllIn = action.action === 'all-in' || newStack <= 0;
          return { ...p, stack: newStack, lastAction: action.action, isAllIn };
        });

        const newPot = calculateCurrentPot(newActions);
        // BUG-14: Short all-in should not lower lastBet
        const actionAmt = action.size?.amount;
        const newLastBet = actionAmt !== undefined
          ? Math.max(actionAmt, state.lastBet ?? 0)
          : state.lastBet;

        // サイドポット計算
        const hasAllIn = updatedPlayers.some(p => p.isAllIn && p.active);
        const sidePots = hasAllIn ? calculateSidePots(newActions, updatedPlayers) : undefined;

        let newStreet = state.street;
        const activePlayers = getActivePlayers(updatedPlayers);
        const actingPlayers = getActingPlayers(updatedPlayers);
        if (activePlayers.length <= 1) {
          newStreet = state.street;
        } else {
          const playerStacks = new Map(updatedPlayers.map((p) => [p.position, p.stack]));
          if (isStreetClosed(newActions, state.street, actingPlayers as string[], playerStacks)) {
            const streets: Street[] = ['preflop', 'flop', 'turn', 'river'];
            const idx = streets.indexOf(state.street);
            if (idx < streets.length - 1) newStreet = streets[idx + 1];
          }
          // ランアウト: 全員all-in（actingPlayers === 0）→ riverまで自動進行
          if (actingPlayers.length === 0) {
            newStreet = 'river';
          }
        }
        // BUG-14: ストリート遷移時はlastBetをリセット
        const finalLastBet = newStreet !== state.street ? undefined : newLastBet;
        state = {
          ...state,
          street: newStreet,
          players: updatedPlayers,
          pot: newPot,
          lastBet: finalLastBet,
          actions: newActions,
          sidePots,
        };
      }
      setCurrentHand(hand);
      setGameState(state);
    },
    [currentHand, gameState]
  );

  const setBoardCards = useCallback((street: 'flop' | 'turn' | 'river', cards: string[]) => {
    setGameState((s) => {
      if (!s) return null;
      const prev = s.board ?? [];
      const next =
        street === 'flop' ? [...cards] : street === 'turn' ? [...prev, ...cards] : [...prev, ...cards];
      return { ...s, board: next };
    });
    setCurrentHand((h) => {
      if (!h) return null;
      const prev = h.board ?? [];
      const next =
        street === 'flop' ? [...cards] : street === 'turn' ? [...prev, ...cards] : [...prev, ...cards];
      return { ...h, board: next };
    });
  }, []);

  const setWinnerAndShowdown = useCallback(
    (winnerPosition: Position | Position[], showdownHands?: ShowdownHand[]) => {
      if (!currentHand) return;
      setCurrentHand((h) =>
        h ? { ...h, winnerPosition, showdownHands: showdownHands ?? h.showdownHands } : null
      );
    },
    [currentHand]
  );

  const finishHand = useCallback(
    (result?: { won: boolean; amount: number }) => {
      if (!currentHand) return;

      const finishedHand: Hand = {
        ...currentHand,
        result,
      };

      addHand(finishedHand);
      setCurrentHand(null);
      setGameState(null);
    },
    [currentHand]
  );

  const reset = useCallback(() => {
    setCurrentHand(null);
    setGameState(null);
  }, []);

  return (
    <HandContext.Provider
      value={{
        currentHand,
        gameState,
        startNewHand,
        addAction,
        addActions,
        setBoardCards,
        setWinnerAndShowdown,
        finishHand,
        reset,
      }}
    >
      {children}
    </HandContext.Provider>
  );
}

export function useHand() {
  const context = useContext(HandContext);
  if (context === undefined) {
    throw new Error('useHand must be used within a HandProvider');
  }
  return context;
}
