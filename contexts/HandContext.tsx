'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import type { Hand, ActionRecord, Position, Street, GameState, PlayerState, ShowdownHand, InitialStackConfig, PlayerAttribute } from '@/types/poker';
import { addHand } from '@/utils/storage';
import { getActionOrder, getActivePlayers, getActingPlayers } from '@/utils/pokerUtils';
import { calculateCurrentPot, isStreetClosed, getContributionsThisStreet, getMaxContributionThisStreet, calculateSidePots } from '@/utils/potUtils';
import { POKER_CONFIG } from '@/utils/pokerConfig';

interface HandContextType {
  currentHand: Hand | null;
  gameState: GameState | null;
  startNewHand: (positions: Position[], heroPosition: Position | null, heroHand?: [string, string], initialStacks?: InitialStackConfig[], playerAttributes?: PlayerAttribute[]) => void;
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

  // BUG-45 P5/P6: refs で最新 state を追跡。addActions/addAction が React の
  // 非同期 setState 完了前に連続呼出しされても、常に最新 state を参照できる。
  const currentHandRef = useRef<Hand | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  currentHandRef.current = currentHand;
  gameStateRef.current = gameState;

  const startNewHand = useCallback((positions: Position[], heroPosition: Position | null, heroHand?: [string, string], initialStacks?: InitialStackConfig[], playerAttributes?: PlayerAttribute[]) => {
    // FEAT-1: デフォルトと異なるスタックがある場合のみ保存
    const hasNonDefaultStacks = initialStacks && initialStacks.some(s => s.stack !== POKER_CONFIG.defaultStack);
    // FEAT-2: Neutral以外がある場合のみ保存
    const hasNonDefaultAttrs = playerAttributes && playerAttributes.some(a => a.mentalState !== 'neutral' || a.playStyle !== 'neutral');

    const hand: Hand = {
      id: Date.now().toString(),
      date: Date.now(),
      positions,
      heroPosition,
      heroHand,
      actions: [],
      ...(hasNonDefaultStacks ? { initialStacks } : {}),
      ...(hasNonDefaultAttrs ? { playerAttributes } : {}),
    };

    // BUG-28 + STACK-RULE-001: ブラインドをスタックから控除
    const blindAmounts: Record<string, number> = {
      SB: POKER_CONFIG.blinds.sb,
      BB: POKER_CONFIG.blinds.bb,
    };
    // FEAT-1: ポジション別初期スタック
    const getInitialStack = (pos: Position): number => {
      const config = initialStacks?.find(s => s.position === pos);
      return config?.stack ?? POKER_CONFIG.defaultStack;
    };
    const players: PlayerState[] = positions.map((pos) => {
      const posInitialStack = getInitialStack(pos);
      const attr = playerAttributes?.find(a => a.position === pos);
      return {
        position: pos,
        stack: posInitialStack - (blindAmounts[pos] ?? 0),
        initialStack: posInitialStack,
        active: true,
        isAllIn: false,
        ...(attr?.mentalState && attr.mentalState !== 'neutral' ? { mentalState: attr.mentalState } : {}),
        ...(attr?.playStyle && attr.playStyle !== 'neutral' ? { playStyle: attr.playStyle } : {}),
      };
    });

    const state: GameState = {
      street: 'preflop',
      currentPosition: getActionOrder('preflop')[0],
      players,
      pot: POKER_CONFIG.blinds.sb + POKER_CONFIG.blinds.bb,
      actions: [],
    };

    currentHandRef.current = hand;
    gameStateRef.current = state;
    setCurrentHand(hand);
    setGameState(state);
  }, []);

  const addAction = useCallback((action: ActionRecord) => {
    // BUG-45 P5/P6: ref 経由で最新 state を取得（stale closure 防止）
    const hand = currentHandRef.current;
    const state = gameStateRef.current;
    if (!hand || !state) return;

    // BUG-45: all-in/inactive プレイヤーへの fold は無効（stale between ガード）
    const targetPlayer = state.players.find(p => p.position === action.position);
    if (action.action === 'fold' && targetPlayer && (!targetPlayer.active || targetPlayer.isAllIn)) {
      return;
    }

    // BUG-43: all-in で size 未設定の場合、アクションレコードにスタック全額を補完
    const fixedAction = (action.action === 'all-in' && action.size?.amount === undefined)
      ? { ...action, size: { type: 'bet-relative' as const, value: 0, amount: state.players.find(p => p.position === action.position)?.stack ?? 0 } }
      : action;

    const newActions = [...hand.actions, fixedAction];
    const updatedHand = { ...hand, actions: newActions };

    // ゲームステートを更新（コール額はこのストリートの最大投入額−自分の投入額で算出）
    const contributionsBefore = getContributionsThisStreet(hand.actions, state.street);
    const maxContribBefore = getMaxContributionThisStreet(hand.actions, state.street);

    const updatedPlayers = state.players.map((player) => {
      if (player.position === fixedAction.position) {
        if (fixedAction.action === 'fold') {
          return { ...player, active: false };
        }
        let newStack = player.stack;
        if (fixedAction.action === 'bet' || fixedAction.action === 'raise' || fixedAction.action === 'all-in') {
          if (fixedAction.size?.amount !== undefined) {
            newStack = Math.max(0, player.stack - fixedAction.size.amount);
          }
        } else if (fixedAction.action === 'call') {
          const myContribBefore = contributionsBefore.get(fixedAction.position) ?? 0;
          const amountToCall = Math.max(0, maxContribBefore - myContribBefore);
          newStack = Math.max(0, player.stack - amountToCall);
        }
        const isAllIn = fixedAction.action === 'all-in' || newStack <= 0;
        return { ...player, stack: newStack, lastAction: fixedAction.action, isAllIn };
      }
      return player;
    });

    // FEAT-1: players配列のinitialStackからMap生成（potUtils透過用）
    const initialStacksMap = new Map(state.players.map(p => [p.position as string, p.initialStack ?? POKER_CONFIG.defaultStack]));
    const newPot = calculateCurrentPot(newActions, initialStacksMap);
    // BUG-14: Short all-in should not lower lastBet; use Math.max to prevent it
    const actionAmount = fixedAction.size?.amount;
    const newLastBet = actionAmount !== undefined
      ? Math.max(actionAmount, state.lastBet ?? 0)
      : state.lastBet;

    // サイドポット計算（all-inが発生した場合）
    const hasAllIn = updatedPlayers.some(p => p.isAllIn && p.active);
    const sidePots = hasAllIn ? calculateSidePots(newActions, updatedPlayers, initialStacksMap) : undefined;

    // ストリート進行とハンド終了条件の判定
    let newStreet = state.street;
    const activePlayers = getActivePlayers(updatedPlayers);
    const actingPlayers = getActingPlayers(updatedPlayers);

    // 1人残り（全員フォールド）の場合はハンド終了（次のストリートに進まない）
    if (activePlayers.length <= 1) {
      newStreet = state.street;
    } else {
      // TH準拠: ラウンドが閉じたときのみ次ストリート
      // actingPlayers（active && !isAllIn）のみをチェック対象とする
      const actingPositions = actingPlayers as string[];
      const playerStacks = new Map(updatedPlayers.map((p) => [p.position, p.stack]));
      if (isStreetClosed(newActions, state.street, actingPositions, playerStacks)) {
        const streets: Street[] = ['preflop', 'flop', 'turn', 'river'];
        const currentIndex = streets.indexOf(state.street);
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
    const finalLastBet = newStreet !== state.street ? undefined : newLastBet;

    const updatedState: GameState = {
      ...state,
      street: newStreet,
      players: updatedPlayers,
      pot: newPot,
      lastBet: finalLastBet,
      actions: newActions,
      sidePots,
    };

    // BUG-45: ref を即座に更新（次の連続呼出しで最新 state を参照可能にする）
    currentHandRef.current = updatedHand;
    gameStateRef.current = updatedState;
    setCurrentHand(updatedHand);
    setGameState(updatedState);
  }, []);

  const addActions = useCallback(
    (actions: ActionRecord[]) => {
      // BUG-45 P5/P6: ref 経由で最新 state を取得（stale closure 防止）
      if (!currentHandRef.current || !gameStateRef.current || actions.length === 0) return;
      let hand: Hand = currentHandRef.current;
      let state: GameState = gameStateRef.current;
      for (const action of actions) {
        // BUG-45: all-in/inactive プレイヤーへの fold はスキップ（stale between ガード）
        const targetPlayer = state.players.find(p => p.position === action.position);
        if (action.action === 'fold' && targetPlayer && (!targetPlayer.active || targetPlayer.isAllIn)) {
          continue;
        }

        // BUG-43: all-in で size 未設定の場合、アクションレコードにスタック全額を補完
        const fa = (action.action === 'all-in' && action.size?.amount === undefined)
          ? { ...action, size: { type: 'bet-relative' as const, value: 0, amount: state.players.find(pl => pl.position === action.position)?.stack ?? 0 } }
          : action;

        const contribBefore = getContributionsThisStreet(hand.actions, state.street);
        const maxContribBefore = getMaxContributionThisStreet(hand.actions, state.street);
        const newActions = [...hand.actions, fa];
        hand = { ...hand, actions: newActions };

        const updatedPlayers = state.players.map((p) => {
          if (p.position !== fa.position) return p;
          if (fa.action === 'fold') {
            return { ...p, active: false };
          }
          let newStack = p.stack;
          if (fa.action === 'bet' || fa.action === 'raise' || fa.action === 'all-in') {
            if (fa.size?.amount !== undefined) {
              newStack = Math.max(0, p.stack - fa.size.amount);
            }
          } else if (fa.action === 'call') {
            const myContribBefore = contribBefore.get(fa.position) ?? 0;
            const amountToCall = Math.max(0, maxContribBefore - myContribBefore);
            newStack = Math.max(0, p.stack - amountToCall);
          }
          const isAllIn = fa.action === 'all-in' || newStack <= 0;
          return { ...p, stack: newStack, lastAction: fa.action, isAllIn };
        });

        // FEAT-1: players配列のinitialStackからMap生成（potUtils透過用）
        const initialStacksMap = new Map(state.players.map(pl => [pl.position as string, pl.initialStack ?? POKER_CONFIG.defaultStack]));
        const newPot = calculateCurrentPot(newActions, initialStacksMap);
        // BUG-14: Short all-in should not lower lastBet
        const actionAmt = fa.size?.amount;
        const newLastBet = actionAmt !== undefined
          ? Math.max(actionAmt, state.lastBet ?? 0)
          : state.lastBet;

        // サイドポット計算
        const hasAllIn = updatedPlayers.some(p => p.isAllIn && p.active);
        const sidePots = hasAllIn ? calculateSidePots(newActions, updatedPlayers, initialStacksMap) : undefined;

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
      // BUG-45: ref を即座に更新（次の連続呼出しで最新 state を参照可能にする）
      currentHandRef.current = hand;
      gameStateRef.current = state;
      setCurrentHand(hand);
      setGameState(state);
    },
    []
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
      if (!currentHandRef.current) return;
      setCurrentHand((h) => {
        if (!h) return null;
        const updated = { ...h, winnerPosition, showdownHands: showdownHands ?? h.showdownHands };
        currentHandRef.current = updated;
        return updated;
      });
    },
    []
  );

  const finishHand = useCallback(
    (result?: { won: boolean; amount: number }) => {
      const hand = currentHandRef.current;
      if (!hand) return;

      const finishedHand: Hand = {
        ...hand,
        result,
      };

      addHand(finishedHand);
      currentHandRef.current = null;
      gameStateRef.current = null;
      setCurrentHand(null);
      setGameState(null);
    },
    []
  );

  const reset = useCallback(() => {
    currentHandRef.current = null;
    gameStateRef.current = null;
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
