'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHand } from '@/contexts/HandContext';
import type { Position, Action, BetSize, ActionRecord, Street, ShowdownHand, PotWinner } from '@/types/poker';
import { getActivePlayers, getActingPlayers, getNextToAct, getActionOrder } from '@/utils/pokerUtils';
import { getTotalContributions, getContributionsThisStreet, getMaxContributionThisStreet } from '@/utils/potUtils';
import { getPreflopBetSizes } from '@/utils/bettingUtils';
import { evaluateHand } from '@/utils/handEvaluator';
import { getSelectablePositions, validateAction } from '@/utils/recordFlowValidation';
import pkg from '../../package.json';
import { POKER_CONFIG } from '@/utils/pokerConfig';
import HeroSelector from '@/components/poker/HeroSelector';
import PositionSelector from '@/components/poker/PositionSelector';
import ActionSizeSelector from '@/components/poker/ActionSizeSelector';
import PotDisplay from '@/components/poker/PotDisplay';
import ActionHistory from '@/components/poker/ActionHistory';
import BoardSelector from '@/components/poker/BoardSelector';
import SuitBasedCardReel from '@/components/poker/SuitBasedCardReel';

type Step =
  | 'start'
  | 'hero'
  | 'preflopWhoOpen'
  | 'preflopOpponents'
  | 'position'
  | 'action'
  | 'selectBoard'
  | 'winner'
  | 'showdown'
  | 'result';

type BoardStreet = 'flop' | 'turn' | 'river';

/** B12: Persona 5-style skewed tap ripple button */
function P5Button({ children, className = '', style, onClick, disabled }: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
}) {
  const [rip, setRip] = useState<{ x: number; y: number; k: number } | null>(null);
  return (
    <motion.button
      type="button"
      className={`relative overflow-hidden ${className}`}
      style={style}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      onClick={(e) => {
        if (disabled) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setRip({ x: e.clientX - rect.left, y: e.clientY - rect.top, k: Date.now() });
        setTimeout(() => setRip(null), 500);
        onClick?.(e);
      }}
    >
      {children}
      {rip && (
        <motion.span
          key={rip.k}
          className="absolute pointer-events-none bg-p5-red/40"
          style={{ left: rip.x - 15, top: rip.y - 15, width: 30, height: 30, transform: 'skewX(-20deg)' }}
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scaleX: 10, scaleY: 5, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
    </motion.button>
  );
}

export default function RecordPage() {
  const { gameState, currentHand, startNewHand, addAction, addActions, setBoardCards, setWinnerAndShowdown, finishHand, reset } = useHand();
  const [step, setStep] = useState<Step>('start');
  // BUG-19: スタックベースのステップ履歴
  const [stepHistory, setStepHistory] = useState<Step[]>(['start']);
  const skipAutoRef = useRef(false);
  /** BUG-25: ストリート境界追跡 */
  const streetBoundaryIndexRef = useRef(1);
  const lastBoundaryStreetRef = useRef<Street | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [pendingBoardStreet, setPendingBoardStreet] = useState<BoardStreet | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<Position | Position[] | null>(null);
  const [flowError, setFlowError] = useState<string | null>(null);
  /** プリフロのオープナー（対向者ステップの基準） */
  const [preflopOpener, setPreflopOpener] = useState<Position | null>(null);
  /** 対向者ステップで選択した「次に動いたポジション」（1つのみ） */
  const [preflopNextToAct, setPreflopNextToAct] = useState<Position | null>(null);
  /** Who is Open でポジション選択後、ボトムシート表示用（オープナーの初回ベット選択） */
  const [whoOpenSelectedPosition, setWhoOpenSelectedPosition] = useState<Position | null>(null);
  /** Who is Open ボトムシート: スライダーでベットサイズを選ぶ（初期は非表示） */
  const [whoOpenShowSlider, setWhoOpenShowSlider] = useState(false);
  const [whoOpenSliderBB, setWhoOpenSliderBB] = useState(2);
  /** BUG-24: プリフロ対向者ボトムシート: スライダー */
  const [opponentShowSlider, setOpponentShowSlider] = useState(false);
  const [opponentSliderBB, setOpponentSliderBB] = useState(6);
  /** ショーダウンせり上がりシート表示 & 敗者ハンド入力 */
  const [showShowdownSheet, setShowShowdownSheet] = useState(false);
  const [showdownInputs, setShowdownInputs] = useState<ShowdownHand[]>([]);
  /** B6: ストリート遷移バナー */
  const [streetBanner, setStreetBanner] = useState<string | null>(null);
  const [prevStreet, setPrevStreet] = useState<Street | null>(null);
  /** A5: サイドポット勝者選択マップ (potIndex → winners) */
  const [potWinnerMap, setPotWinnerMap] = useState<Map<number, Position[]>>(new Map());
  /** A5: 確定済みポット勝者 */
  const [confirmedPotWinners, setConfirmedPotWinners] = useState<PotWinner[]>([]);
  /** UI-6: メモ */
  const [memo, setMemo] = useState('');

  /** BUG-19: Push step to history stack */
  const pushStep = (newStep: Step) => {
    setStepHistory(prev => [...prev, newStep]);
    setStep(newStep);
  };

  const activePlayers = gameState ? getActivePlayers(gameState.players) : [];
  const actingPlayers = gameState ? getActingPlayers(gameState.players) : [];
  const streetActions = gameState ? gameState.actions.filter((a) => a.street === gameState.street) : [];
  const nextToAct = gameState && pendingBoardStreet === null
    ? getNextToAct(gameState.street, actingPlayers, streetActions)
    : null;
  const allPlayersAllIn = activePlayers.length > 1 && actingPlayers.length === 0;
  // BUG-4: NEXT表示用 - 現在アクターの「次」のプレイヤーを算出
  const afterNextToAct = (() => {
    if (!nextToAct || !gameState) return null;
    const hypothetical: ActionRecord = {
      position: nextToAct,
      action: 'call' as Action,
      street: gameState.street,
      timestamp: 0,
    };
    return getNextToAct(gameState.street, actingPlayers, [...streetActions, hypothetical]);
  })();
  const board = gameState?.board ?? currentHand?.board ?? [];
  const boardLength = board.length;

  // BUG-25: ストリート境界検出（コンポーネント本体で検出、useEffectより先に設定）
  if (gameState && gameState.street !== 'preflop' && gameState.street !== lastBoundaryStreetRef.current) {
    streetBoundaryIndexRef.current = stepHistory.length;
    lastBoundaryStreetRef.current = gameState.street;
  }

  // B6: ストリート遷移バナー検知
  useEffect(() => {
    if (!gameState) return;
    const currentStreet = gameState.street;
    if (prevStreet !== null && currentStreet !== prevStreet && currentStreet !== 'preflop') {
      setStreetBanner(currentStreet.toUpperCase());
      setTimeout(() => setStreetBanner(null), 400); // UI-21: 800→400
    }
    setPrevStreet(currentStreet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.street]);

  // BUG-8: ボード選択判定をboardLengthベースに（ランアウト時のストリート不整合を解消）
  useEffect(() => {
    if (skipAutoRef.current) return;
    if (!gameState || step !== 'position') return;
    // プリフロップ中（street未進行）はボード選択不要
    if (gameState.street === 'preflop') return;
    if (boardLength < 3) {
      setPendingBoardStreet('flop');
      pushStep('selectBoard');
      return;
    }
    if (boardLength < 4) {
      setPendingBoardStreet('turn');
      pushStep('selectBoard');
      return;
    }
    if (boardLength < 5) {
      setPendingBoardStreet('river');
      pushStep('selectBoard');
      return;
    }
  }, [gameState, step, boardLength]);

  // リバー完了（ボード5枚・ラウンド閉鎖）時は「勝者」ステップへ遷移
  useEffect(() => {
    if (skipAutoRef.current) return;
    if (!gameState || step !== 'position') return;

    // リバー完了条件: ストリートがriver && ボード5枚 && (次のアクターなし or 全員all-in)
    const isRiverComplete =
      gameState.street === 'river' &&
      boardLength >= 5 &&
      (nextToAct === null || allPlayersAllIn);

    if (isRiverComplete) {
      pushStep('winner');
    }
  }, [gameState, step, boardLength, nextToAct, activePlayers, allPlayersAllIn]);

  // UI-10: nextToAct確定時はポジション選択をスキップして直接アクションへ
  useEffect(() => {
    if (skipAutoRef.current) return;
    if (step !== 'position' || !nextToAct || !gameState) return;
    // ボード選択が必要な場合はスキップしない
    if (gameState.street === 'flop' && boardLength < 3) return;
    if (gameState.street === 'turn' && boardLength < 4) return;
    if (gameState.street === 'river' && boardLength < 5) return;
    setSelectedPosition(nextToAct);
    pushStep('action');
  }, [step, nextToAct, gameState, boardLength]);

  // プリフロップ対向者: まだアクションしていないポジションがなければ position へ
  useEffect(() => {
    if (skipAutoRef.current) return;
    if (step !== 'preflopOpponents' || preflopOpener === null || !gameState) return;
    if (preflopNextToAct !== null) return;
    const order = getActionOrder('preflop');
    const afterOpener = order.slice(order.indexOf(preflopOpener) + 1);
    const acted = new Set(gameState.actions.filter((a) => a.street === 'preflop').map((a) => a.position));
    // BUG-14: オールイン済みプレイヤーもremainingから除外
    const allInPos = new Set(gameState.players.filter((p) => p.isAllIn && p.active).map((p) => p.position));
    const remaining = afterOpener.filter((p) => !acted.has(p) && !allInPos.has(p));
    if (remaining.length === 0) pushStep('position');
  }, [step, preflopOpener, preflopNextToAct, gameState]);

  // BUG-19: Clear Back navigation skip flag after auto-transition useEffects
  useEffect(() => {
    if (skipAutoRef.current) skipAutoRef.current = false;
  });

  const handleStart = () => pushStep('hero');

  const handleHeroSelect = (heroPosition: Position, heroHand?: [string, string]) => {
    const positions: Position[] = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
    startNewHand(positions, heroPosition, heroHand);
    setPreflopOpener(null);
    setPreflopNextToAct(null);
    setPotWinnerMap(new Map());
    setConfirmedPotWinners([]);
    setMemo('');
    pushStep('preflopWhoOpen');
  };

  /** Who is Open でポジション＋アクション（Call / Bet 2x・3x / All-in）を選択したあと実行 */
  const handlePreflopWhoOpenConfirm = (opener: Position, openSize: BetSize | 'all-in' | 'call') => {
    if (!gameState) return;
    const order = getActionOrder('preflop');
    const openerIndex = order.indexOf(opener);
    const folds = order.slice(0, openerIndex).map((pos) => ({
      position: pos,
      action: 'fold' as Action,
      street: 'preflop' as Street,
      timestamp: Date.now(),
    }));
    const openAction: ActionRecord =
      openSize === 'call'
        ? {
            position: opener,
            action: 'call' as Action,
            street: 'preflop' as Street,
            timestamp: Date.now(),
          }
        : {
            position: opener,
            action: openSize === 'all-in' ? ('all-in' as Action) : ('bet' as Action),
            street: 'preflop' as Street,
            timestamp: Date.now(),
            ...(openSize !== 'all-in' && { size: openSize }),
          };
    addActions([...folds, openAction]);
    setWhoOpenSelectedPosition(null);
    setPreflopOpener(opener);
    pushStep('preflopOpponents');
  };

  /** プリフロで「次に動いた1ポジション」の Call / Raise 2x・3x / All-in を確定 */
  const handlePreflopOpponentsConfirm = (nextPosition: Position, action: 'call' | 'raise' | 'all-in', raiseSize?: BetSize) => {
    if (!gameState || !currentHand || preflopOpener === null) return;
    const order = getActionOrder('preflop');
    const openerIndex = order.indexOf(preflopOpener);
    const nextIndex = order.indexOf(nextPosition);
    const alreadyActed = new Set(gameState.actions.filter((a) => a.street === 'preflop').map((a) => a.position));
    const between = order.slice(openerIndex + 1, nextIndex).filter((pos) => !alreadyActed.has(pos));
    const folds: ActionRecord[] = between.map((pos) => ({
      position: pos,
      action: 'fold' as Action,
      street: 'preflop' as Street,
      timestamp: Date.now(),
    }));
    const stack = gameState.players.find((p) => p.position === nextPosition)?.stack ?? POKER_CONFIG.defaultStack;
    const mainAction: ActionRecord = {
      position: nextPosition,
      action: action === 'call' ? ('call' as Action) : action === 'all-in' ? ('all-in' as Action) : ('raise' as Action),
      street: 'preflop' as Street,
      timestamp: Date.now(),
      ...(action === 'raise' && raiseSize && { size: raiseSize }),
      ...(action === 'all-in' && { size: { type: 'bet-relative', value: 0, amount: stack } }),
    };
    addActions([...folds, mainAction]);
    setPreflopNextToAct(null);
    setOpponentShowSlider(false);
    // プリフロップでは常に「次に動いたポジション」をユーザーに選ばせる（自動で進めない）
    pushStep('preflopOpponents');
  };

  const handlePositionSelect = (position: Position) => {
    if (!gameState) return;
    const allowed = getSelectablePositions(gameState);
    if (allowed.length > 0 && !allowed.includes(position)) return;
    setFlowError(null);
    setSelectedPosition(position);
    pushStep('action');
  };

  const handleActionSelect = (action: Action, size?: BetSize) => {
    if (!gameState || !selectedPosition) return;
    const actionRecord: ActionRecord = {
      position: selectedPosition,
      action,
      size,
      street: gameState.street,
      timestamp: Date.now(),
    };
    const { valid, reason } = validateAction(actionRecord, gameState);
    if (!valid) {
      // BUG-3: 正しいプレイヤーに自動リダイレクト（エラー表示ではなく自動スキップ）
      const correctNext = getNextToAct(gameState.street, actingPlayers, streetActions);
      if (correctNext && correctNext !== selectedPosition) {
        setFlowError(null);
        setSelectedPosition(correctNext);
        return;
      }
      setFlowError(reason ?? 'Invalid action');
      return;
    }
    setFlowError(null);
    addAction(actionRecord);
    setSelectedPosition(null);

    const newActions = [...gameState.actions, actionRecord];
    const updatedPlayers = gameState.players.map((p) => {
      if (p.position === selectedPosition) {
        if (action === 'fold') return { ...p, active: false };
        let newStack = p.stack;
        if (action === 'all-in' || (size?.amount !== undefined && size.amount >= p.stack)) {
          newStack = 0;
        } else if (action === 'call') {
          const contributions = getContributionsThisStreet(gameState.actions, gameState.street);
          const myContrib = contributions.get(selectedPosition) ?? 0;
          const maxContrib = getMaxContributionThisStreet(gameState.actions, gameState.street);
          const callAmount = Math.max(0, maxContrib - myContrib);
          newStack = Math.max(0, p.stack - callAmount);
        } else if (action === 'bet' || action === 'raise') {
          if (size?.amount !== undefined) {
            newStack = Math.max(0, p.stack - size.amount);
          }
        }
        return { ...p, isAllIn: action === 'all-in' || newStack <= 0 };
      }
      return p;
    });
    const active = getActivePlayers(updatedPlayers);
    const acting = getActingPlayers(updatedPlayers);

    if (active.length <= 1) {
      setTimeout(() => pushStep('winner'), 300); // UI-21: 600→300
      return;
    }

    // 全アクティブプレイヤーがall-in → ボード選択→勝者選択に直行（ランアウト）
    // BUG-25: 同期でpushStepしストリート境界を正確に検出
    if (acting.length === 0) {
      pushStep('position');
      return;
    }

    // プリフロでオープナーのベット/レイズ直後 → 対向者（誰がコールしたか）を一括選択
    const preflopStreetActions = newActions.filter((a) => a.street === 'preflop');
    const preflopBets = preflopStreetActions.filter((a) => a.action === 'bet' || a.action === 'raise' || a.action === 'all-in');
    const isOpenerJustActed = preflopOpener !== null && gameState.street === 'preflop' && preflopBets.length === 1;
    if (isOpenerJustActed) {
      pushStep('preflopOpponents');
      return;
    }

    // BUG-17: check→raise/all-in後もgetNextToActがcheckプレイヤーを正しく返す
    // （lastAggressor以降で未応答のプレイヤーを探す設計のため、checkのみのプレイヤーにも再アクション機会がある）
    const currentStreetActions = newActions.filter((a) => a.street === gameState.street);
    const auto = getNextToAct(gameState.street, acting, currentStreetActions);

    if (auto !== null) {
      setTimeout(() => {
        setSelectedPosition(auto);
        pushStep('action');
      }, 150); // UI-21: 300→150
    } else {
      pushStep('position');
    }
  };

  const handleBoardConfirm = (cards: string[]) => {
    if (!pendingBoardStreet || !gameState) return;
    // UI-11: カード枚数バリデーション（フロップ3枚/ターン・リバー1枚）
    const requiredCount = pendingBoardStreet === 'flop' ? 3 : 1;
    if (cards.length !== requiredCount) return;
    setBoardCards(pendingBoardStreet, cards);
    setPendingBoardStreet(null);

    // 全員all-inの場合: アクション不要、次ストリートへ直行
    if (allPlayersAllIn) {
      pushStep('position'); // position→selectBoard→winnerへ自動進行
      return;
    }

    // フロップ以降の自動化: nextToAct が自明な場合は自動選択して action ステップに直行
    const streetActionsAfterBoard = gameState.actions.filter((a) => a.street === gameState.street);
    const auto = getNextToAct(gameState.street, actingPlayers, streetActionsAfterBoard);

    if (auto !== null) {
      setSelectedPosition(auto);
      pushStep('action');
    } else {
      pushStep('position');
    }
  };

  const handleWinnerSelect = (winner: Position | Position[]) => {
    setSelectedWinner(winner);
    const winners = Array.isArray(winner) ? winner : [winner];
    const losers = activePlayers.filter((p) => !winners.includes(p));
    // 敗者のうちヒーロー以外のみ入力させる（ヒーローは既に heroHand で入力済み）
    const losersForInput = losers.filter((p) => p !== currentHand?.heroPosition);
    if (losersForInput.length === 0) {
      setWinnerAndShowdown(Array.isArray(winner) ? winner : [winner]);
      pushStep('result');
      return;
    }
    setWinnerAndShowdown(Array.isArray(winner) ? winner : [winner]);
    setShowdownInputs(losersForInput.map((position) => ({ position, hand: 'muck' as const })));
    setShowShowdownSheet(true);
  };

  /** A5: サイドポット勝者確定 */
  const handleSidePotConfirm = () => {
    if (!gameState?.sidePots) return;
    const pws: PotWinner[] = gameState.sidePots.map((pot, i) => ({
      potIndex: i,
      potAmount: pot.amount,
      winners: potWinnerMap.get(i) ?? [],
    }));
    setConfirmedPotWinners(pws);
    const allWinners = [...new Set(pws.flatMap(pw => pw.winners))];
    handleWinnerSelect(allWinners.length === 1 ? allWinners[0] : allWinners);
  };

  const handleShowdownDone = () => {
    const winners = Array.isArray(selectedWinner!) ? selectedWinner! : [selectedWinner!];
    const heroIsLoser = currentHand?.heroPosition != null && !winners.includes(currentHand.heroPosition);
    const finalShowdownHands: ShowdownHand[] = [...showdownInputs];
    if (heroIsLoser && currentHand?.heroPosition && currentHand?.heroHand?.length === 2) {
      finalShowdownHands.push({ position: currentHand.heroPosition, hand: currentHand.heroHand });
    }
    setWinnerAndShowdown(
      selectedWinner!,
      finalShowdownHands.length > 0 ? finalShowdownHands : undefined
    );
    setShowShowdownSheet(false);
    pushStep('result');
  };

  const setShowdownHand = (position: Position, hand: [string, string] | 'muck') => {
    setShowdownInputs((prev) =>
      prev.map((x) => (x.position === position ? { position, hand } : x))
    );
  };

  const handleFinish = (won: boolean, dynamicAmount?: number) => {
    const amount = dynamicAmount ?? (won ? 10 : -10);
    finishHand({ won, amount });
    // UI-12: memo をハンドのトップレベルフィールドとして localStorage に直接保存
    if (memo) {
      try {
        const raw = localStorage.getItem('poker3_history');
        if (raw) {
          const hands = JSON.parse(raw);
          if (hands.length > 0) {
            hands[hands.length - 1].memo = memo;
            localStorage.setItem('poker3_history', JSON.stringify(hands));
          }
        }
      } catch {
        // memo保存失敗（ハンド本体は保存済み）
      }
    }
    // BUG-7: タブ切替でヒストリーに遷移（router.pushだとタブナビから外れる）
    window.dispatchEvent(new CustomEvent('switchTab', { detail: 'history' }));
  };

  /** UI-35: TOP — 記録開始画面に戻る */
  const handleTop = () => {
    reset();
    setStep('start');
    setStepHistory(['start']);
    skipAutoRef.current = true;
    streetBoundaryIndexRef.current = 1;
    lastBoundaryStreetRef.current = null;
    setSelectedPosition(null);
    setPreflopOpener(null);
    setPreflopNextToAct(null);
    setOpponentShowSlider(false);
    setWhoOpenSelectedPosition(null);
    setSelectedWinner(null);
    setFlowError(null);
    setPendingBoardStreet(null);
    setPotWinnerMap(new Map());
    setConfirmedPotWinners([]);
    setMemo('');
    setShowShowdownSheet(false);
  };

  /** BUG-19: Back — スタックベースの戻り */
  const handleBack = () => {
    // preflopOpponents sub-state: アクション選択中なら選択をクリアするだけ
    if (step === 'preflopOpponents' && preflopNextToAct !== null) {
      setPreflopNextToAct(null);
      setOpponentShowSlider(false);
      return;
    }

    // BUG-25: ストリート境界チェック
    if (stepHistory.length <= streetBoundaryIndexRef.current) return;

    // 現在ステップに応じたstate cleanup
    if (step === 'action') setSelectedPosition(null);
    if (step === 'selectBoard') setPendingBoardStreet(null);

    skipAutoRef.current = true;
    const newHistory = stepHistory.slice(0, -1);
    setStepHistory(newHistory);
    setStep(newHistory[newHistory.length - 1]);
  };

  /** BUG-25: Back可能判定 — ストリート境界 + サブステート考慮 */
  const canGoBack = stepHistory.length > streetBoundaryIndexRef.current ||
    (step === 'preflopOpponents' && preflopNextToAct !== null);

  /** UI-35: Navigation overlay (fixed bottom-left) + UI-41: Back disabled state */
  const navOverlay = step !== 'start' ? (
    <div className="fixed bottom-2 left-2 z-30 flex gap-1.5">
      <button
        type="button"
        onClick={handleTop}
        className="px-2.5 py-1.5 text-[10px] font-p5-en font-bold text-white/50 border border-white/20 rounded bg-black/70 min-h-[32px]"
        style={{ transform: 'skewX(-5deg)' }}
      >
        TOP
      </button>
      <button
        type="button"
        onClick={handleBack}
        disabled={!canGoBack}
        className={`px-2.5 py-1.5 text-[10px] font-p5-en font-bold border rounded min-h-[32px] ${
          !canGoBack
            ? 'text-white/20 border-white/10 bg-black/40 cursor-not-allowed'
            : 'text-white/50 border-white/20 bg-black/70'
        }`}
        style={{ transform: 'skewX(-5deg)' }}
      >
        Back
      </button>
    </div>
  ) : null;

  const usedCardsForBoard = [
    ...(currentHand?.heroHand ?? []),
    ...(gameState?.board ?? []),
  ];

  if (step === 'start') {
    const titleText = 'Record Hand';
    // UI-29: p-4を除去し、flex + justify-center + items-center + h-full で縦方向中央
    return (
      <main className="h-[100dvh] overflow-hidden bg-black text-white flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex justify-center flex-wrap gap-0.5 mb-4">
            {titleText.split('').map((char, i) => (
              <motion.span
                key={i}
                className="text-4xl sm:text-6xl font-black inline-block"
                style={{ transform: 'skewX(-7deg)' }}
                initial={{ opacity: 0, y: 50, rotate: -180 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 15 }}
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
          </div>
          <motion.button
            className="px-10 py-5 bg-p5-red text-white font-bold text-xl polygon-button"
            style={{ transform: 'skewX(-7deg)' }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: titleText.length * 0.05 + 0.2, type: 'spring' }}
            whileTap={{ scale: 0.92 }}
            onClick={handleStart}
          >
            Start
          </motion.button>
        </div>
        {/* UI-51: バージョン表示を最下部中央に配置（mt-auto効果でflex末尾） */}
        <div className="text-center pb-4">
          <span className="text-[10px] font-p5-en text-white/30">v{pkg.version}</span>
        </div>
      </main>
    );
  }

  if (step === 'hero') {
    return (
      <>
        <HeroSelector onSelect={handleHeroSelect} />
        {navOverlay}
      </>
    );
  }

  if (step === 'preflopWhoOpen') {
    // UI-18 + UI-20: BBはプリフロップでオープンレイズ不可（グレーアウト表示）
    const order: Position[] = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
    const openerForSheet = whoOpenSelectedPosition;
    const stackForOpener = openerForSheet
      ? (gameState?.players.find((p) => p.position === openerForSheet)?.stack ?? POKER_CONFIG.defaultStack)
      : 0;
    const openSizes = openerForSheet ? getPreflopBetSizes(stackForOpener, undefined) : [];

    return (
      <main className="min-h-[100dvh] overflow-hidden bg-black text-white flex flex-col relative">
        <div className="shrink-0 px-3 pt-2 pb-1 border-b border-white/20">
          <motion.h2
            className="font-p5-en text-lg font-black whitespace-nowrap"
            style={{ transform: 'skewX(-7deg)' }}
            animate={{ opacity: [1, 0.96, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, repeatType: 'reverse' }}
          >
            Who is Open?
          </motion.h2>
          <p className="text-[10px] text-gray-400 mt-0.5">Select position, then open size</p>
        </div>
        <div className="flex-1 min-h-0 p-3 grid grid-cols-3 gap-2 content-start">
          {order.map((pos) => {
            const isHero = pos === currentHand?.heroPosition;
            // UI-20: BBはプリフロップでオープンレイズ不可のためグレーアウト
            const isBBDisabled = pos === 'BB';
            return (
              <P5Button
                key={pos}
                className={`h-14 px-2 font-black text-sm polygon-button w-full border-2 flex flex-col items-center justify-center ${
                  isBBDisabled
                    ? 'bg-black/40 text-white/30 opacity-40 cursor-not-allowed border-white/30'
                    : isHero ? 'bg-p5-red/20 border-p5-red ring-2 ring-p5-red ring-offset-2 ring-offset-black' : 'bg-black border-white'
                }`}
                style={{ transform: 'skewX(-7deg)', clipPath: 'polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%)' }}
                onClick={() => !isBBDisabled && setWhoOpenSelectedPosition(pos)}
                disabled={isBBDisabled}
              >
                {pos}
                {isHero && !isBBDisabled && <span className="block text-[10px] text-p5-red font-bold">(You)</span>}
              </P5Button>
            );
          })}
        </div>
        {/* ボトムシート: オープンサイズ（2x / 3x / All-in）・半透明オーバーレイ */}
        <AnimatePresence>
          {openerForSheet && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/50 z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setWhoOpenSelectedPosition(null)}
              />
              <motion.div
                className="fixed left-0 right-0 bottom-0 z-50 bg-black border-t-2 border-white p-4 pb-safe"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                <motion.h3
                  className="font-p5-en text-base font-black mb-3"
                  style={{ transform: 'skewX(-7deg)' }}
                  animate={{ opacity: [1, 0.97, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, repeatType: 'reverse' }}
                >
                  {openerForSheet} — Open size
                </motion.h3>
                {/* UI-23: Call=青白、Bet=赤、All-in=赤強調グロー（UI-3色分け統一） */}
                <div className="flex flex-col gap-2">
                  <motion.button
                    type="button"
                    className="w-full min-h-[44px] py-3 border-2 border-blue-400/40 font-black polygon-button text-white"
                    style={{ transform: 'skewX(-7deg)', background: 'rgba(200,200,255,0.15)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePreflopWhoOpenConfirm(openerForSheet, 'call')}
                  >
                    Call (1 BB)
                  </motion.button>
                  {openSizes.map((s) => (
                    <motion.button
                      key={s.amount ?? 0}
                      type="button"
                      className="w-full min-h-[44px] py-3 border-2 border-red-400/60 font-black polygon-button text-red-200"
                      style={{ transform: 'skewX(-7deg)', background: 'rgba(200,0,0,0.25)' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePreflopWhoOpenConfirm(openerForSheet, s)}
                    >
                      Bet {s.amount} BB
                    </motion.button>
                  ))}
                  <motion.button
                    type="button"
                    className="w-full min-h-[44px] py-3 border-2 border-red-500 font-black polygon-button text-white glow-red glow-red-text"
                    style={{ transform: 'skewX(-7deg)', background: 'rgba(200,0,0,0.35)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePreflopWhoOpenConfirm(openerForSheet, 'all-in')}
                  >
                    All-in
                  </motion.button>
                  <button
                    type="button"
                    className="w-full py-2 text-xs font-bold text-white/80 border border-white/40 rounded"
                    onClick={() => setWhoOpenShowSlider((v) => !v)}
                  >
                    {whoOpenShowSlider ? 'Close slider' : 'Choose bet size with slider'}
                  </button>
                  {whoOpenShowSlider && (
                    <div className="pt-2 pb-1 border-t border-white/20">
                      <p className="text-[10px] text-gray-400 mb-1">Bet size (BB): {whoOpenSliderBB}</p>
                      <input
                        type="range"
                        min={2}
                        max={Math.min(stackForOpener, 50)}
                        value={whoOpenSliderBB}
                        onChange={(e) => setWhoOpenSliderBB(Number(e.target.value))}
                        className="w-full h-2 bg-white/20 rounded accent-p5-red"
                      />
                      <motion.button
                        type="button"
                        className="w-full py-3 mt-2 border-2 border-white font-black text-sm polygon-button bg-black text-white"
                        style={{ transform: 'skewX(-7deg)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePreflopWhoOpenConfirm(openerForSheet, { type: 'bet-relative', value: whoOpenSliderBB, amount: whoOpenSliderBB })}
                      >
                        Bet {whoOpenSliderBB} BB
                      </motion.button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="mt-3 text-sm text-gray-400"
                  onClick={() => setWhoOpenSelectedPosition(null)}
                >
                  Cancel
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        {navOverlay}
      </main>
    );
  }

  if (step === 'preflopOpponents' && preflopOpener !== null) {
    const order = getActionOrder('preflop');
    const afterOpener = order.slice(order.indexOf(preflopOpener) + 1);
    const acted = gameState
      ? new Set(gameState.actions.filter((a) => a.street === 'preflop').map((a) => a.position))
      : new Set<string>();
    // BUG-14: オールイン済み + アクション済みプレイヤーを除外
    const allInPositions = gameState
      ? new Set(gameState.players.filter((p) => p.isAllIn && p.active).map((p) => p.position))
      : new Set<string>();
    const selectable = afterOpener.filter((p) => !acted.has(p) && !allInPositions.has(p));

    if (!gameState) return null;
    const opponentForSheet = preflopNextToAct;
    const stackForOpponent = opponentForSheet
      ? (gameState.players.find((p) => p.position === opponentForSheet)?.stack ?? POKER_CONFIG.defaultStack)
      : 0;
    const lastBet = gameState.lastBet;
    const minRaise = Math.max((lastBet ?? 2) * 2, 4);
    const raiseSizes = opponentForSheet
      ? getPreflopBetSizes(stackForOpponent, lastBet).filter((s) => s.amount && (s.amount ?? 0) > (lastBet ?? 0))
      : [];

    // UI-43: ポジション選択グリッド + せり上がりボトムシート（preflopWhoOpenと統一）
    return (
      <main className="min-h-[100dvh] overflow-hidden bg-black text-white flex flex-col relative">
        <div className="shrink-0 px-3 pt-2 pb-1 border-b border-white/20">
          <motion.h2
            className="font-p5-en text-lg font-black whitespace-nowrap"
            style={{ transform: 'skewX(-7deg)' }}
            animate={{ opacity: [1, 0.96, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: 'reverse' }}
          >
            Who acted next?
          </motion.h2>
          <p className="text-[10px] text-gray-400 mt-0.5">Select one (grey = already acted)</p>
        </div>
        <div className="flex-1 min-h-0 p-3 grid grid-cols-3 gap-2 content-start">
          {order.map((pos) => {
            const isAfterOpener = afterOpener.includes(pos);
            const hasActed = acted.has(pos);
            const isDisabled = !isAfterOpener || hasActed;
            const isHero = pos === currentHand?.heroPosition;

            return (
              <P5Button
                key={pos}
                className={`h-14 px-2 border-2 font-black text-sm polygon-button w-full flex flex-col items-center justify-center ${
                  isDisabled
                    ? 'bg-black/40 text-white/30 opacity-40 cursor-not-allowed border-white/30'
                    : isHero
                    ? 'bg-p5-red/20 border-p5-red text-white ring-2 ring-p5-red ring-offset-2 ring-offset-black'
                    : 'bg-black text-white border-white'
                }`}
                style={{ transform: 'skewX(-7deg)', clipPath: 'polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%)' }}
                onClick={() => { if (!isDisabled) { setPreflopNextToAct(pos); setOpponentShowSlider(false); setOpponentSliderBB(minRaise); } }}
                disabled={isDisabled}
              >
                {pos}
                {isHero && !isDisabled && <span className="block text-[10px] text-p5-red font-bold">(You)</span>}
              </P5Button>
            );
          })}
        </div>
        {/* UI-43: せり上がりボトムシート（preflopWhoOpenと同一パターン） */}
        <AnimatePresence>
          {opponentForSheet && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/50 z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setPreflopNextToAct(null)}
              />
              <motion.div
                className="fixed left-0 right-0 bottom-0 z-50 bg-black border-t-2 border-white p-4 pb-safe"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                <motion.h3
                  className="font-p5-en text-base font-black mb-3"
                  style={{ transform: 'skewX(-7deg)' }}
                  animate={{ opacity: [1, 0.97, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, repeatType: 'reverse' }}
                >
                  {opponentForSheet}{opponentForSheet === currentHand?.heroPosition ? ' (You)' : ''} — Action
                </motion.h3>
                <div className="flex flex-col gap-2">
                  <motion.button
                    type="button"
                    className="w-full min-h-[44px] py-3 border-2 border-blue-400/40 font-black polygon-button text-white"
                    style={{ transform: 'skewX(-7deg)', background: 'rgba(200,200,255,0.15)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePreflopOpponentsConfirm(opponentForSheet, 'call')}
                  >
                    Call
                  </motion.button>
                  {raiseSizes.map((s) => (
                    <motion.button
                      key={s.amount ?? 0}
                      type="button"
                      className="w-full min-h-[44px] py-3 border-2 border-red-400/60 font-black polygon-button text-red-200"
                      style={{ transform: 'skewX(-7deg)', background: 'rgba(200,0,0,0.25)' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePreflopOpponentsConfirm(opponentForSheet, 'raise', s)}
                    >
                      Raise {s.amount} BB
                    </motion.button>
                  ))}
                  <motion.button
                    type="button"
                    className="w-full min-h-[44px] py-3 border-2 border-red-500 font-black polygon-button text-white glow-red glow-red-text"
                    style={{ transform: 'skewX(-7deg)', background: 'rgba(200,0,0,0.35)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePreflopOpponentsConfirm(opponentForSheet, 'all-in')}
                  >
                    All-in ({stackForOpponent} BB)
                  </motion.button>
                  {/* BUG-24: スライダーでレイズサイズを選択 */}
                  <button
                    type="button"
                    className="w-full py-2 text-xs font-bold text-white/80 border border-white/40 rounded"
                    onClick={() => setOpponentShowSlider((v) => !v)}
                  >
                    {opponentShowSlider ? 'Close slider' : 'Choose raise size with slider'}
                  </button>
                  {opponentShowSlider && (
                    <div className="pt-2 pb-1 border-t border-white/20">
                      <p className="text-[10px] text-gray-400 mb-1">Raise size (BB): {opponentSliderBB}</p>
                      <input
                        type="range"
                        min={minRaise}
                        max={stackForOpponent}
                        value={opponentSliderBB}
                        onChange={(e) => setOpponentSliderBB(Number(e.target.value))}
                        className="w-full h-2 bg-white/20 rounded accent-p5-red"
                      />
                      <motion.button
                        type="button"
                        className="w-full py-3 mt-2 border-2 border-white font-black text-sm polygon-button bg-black text-white"
                        style={{ transform: 'skewX(-7deg)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          handlePreflopOpponentsConfirm(opponentForSheet, 'raise', { type: 'bet-relative', value: opponentSliderBB, amount: opponentSliderBB });
                        }}
                      >
                        Raise {opponentSliderBB} BB
                      </motion.button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="mt-3 text-sm text-gray-400"
                  onClick={() => setPreflopNextToAct(null)}
                >
                  Cancel
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        {navOverlay}
      </main>
    );
  }

  if (step === 'selectBoard' && pendingBoardStreet) {
    const count = pendingBoardStreet === 'flop' ? 3 : 1;
    // 前ストリートのボードカードを取得
    const previousBoard = pendingBoardStreet === 'turn' 
      ? board.slice(0, 3) 
      : pendingBoardStreet === 'river' 
      ? board.slice(0, 4) 
      : [];
    
    return (
      <main className="min-h-[100dvh] overflow-hidden bg-black text-white flex flex-col">
        <div className="p-1.5 border-b border-white/20 flex flex-wrap items-center justify-between gap-1 shrink-0 bg-black/80">
          <PotDisplay compact />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-p5-red" style={{ transform: 'skewX(-5deg)' }}>{(pendingBoardStreet ?? gameState?.street)?.toUpperCase()}</span>
            {activePlayers.length > 0 && (
              <span className="text-xs text-white/90 font-bold">In: {activePlayers.join(', ')}</span>
            )}
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <BoardSelector
            street={pendingBoardStreet}
            count={count}
            usedCards={usedCardsForBoard}
            previousBoard={previousBoard}
            onConfirm={handleBoardConfirm}
          />
        </div>
        {navOverlay}
      </main>
    );
  }

  if (step === 'winner') {
    // BUG-26: activeフラグに依存せず、アクション履歴からfold済みでないプレイヤーを直接算出
    // addActionsのバッチ処理でactiveフラグが不整合になるケースを回避
    const foldedPositions = gameState
      ? new Set(gameState.actions.filter(a => a.action === 'fold').map(a => a.position))
      : new Set<string>();
    const winnerCandidates = gameState
      ? gameState.players.filter(p => !foldedPositions.has(p.position)).map(p => p.position)
      : [];
    return (
      <main className="min-h-[100dvh] overflow-hidden bg-black text-white flex flex-col items-center justify-center p-4 relative">
        {/* A5: サイドポット対応勝者選択 */}
        {gameState?.sidePots && gameState.sidePots.length > 1 ? (
          <>
            <h2 className="text-xl sm:text-2xl font-black text-center mb-4" style={{ transform: 'skewX(-7deg)' }}>
              Select winner for each pot
            </h2>
            <div className="flex flex-col gap-3 max-w-sm mx-auto w-full overflow-auto max-h-[55vh] px-1">
              {gameState.sidePots.map((pot, idx) => (
                <div key={idx} className="border border-white/30 p-3 rounded bg-black/50">
                  <p className="font-p5-en text-sm font-bold mb-2" style={{ transform: 'skewX(-5deg)' }}>
                    Pot {idx + 1}: <span className="text-p5-red glow-red-text">{pot.amount} BB</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {pot.eligiblePositions.map((pos) => {
                      const isSelected = potWinnerMap.get(idx)?.includes(pos) ?? false;
                      const isHero = pos === currentHand?.heroPosition;
                      return (
                        <P5Button
                          key={pos}
                          className={`px-4 py-2 font-bold text-sm polygon-button border-2 ${
                            isSelected
                              ? 'bg-p5-red border-p5-red text-white'
                              : isHero
                              ? 'bg-p5-red/20 border-p5-red text-white'
                              : 'bg-black border-white text-white'
                          }`}
                          style={{ transform: 'skewX(-7deg)' }}
                          onClick={() => {
                            setPotWinnerMap(prev => {
                              const next = new Map(prev);
                              next.set(idx, [pos]);
                              return next;
                            });
                          }}
                        >
                          {pos}
                          {isHero && <span className="block text-[10px] font-bold">(You)</span>}
                        </P5Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {gameState.sidePots.every((_, i) => potWinnerMap.has(i)) && (
              <motion.button
                className="mt-4 w-full max-w-xs py-3 bg-p5-red text-white font-bold polygon-button"
                style={{ transform: 'skewX(-7deg)' }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleSidePotConfirm}
              >
                Confirm
              </motion.button>
            )}
          </>
        ) : (
          <>
            <h2 className="text-2xl sm:text-3xl font-black text-center mb-4" style={{ transform: 'skewX(-7deg)' }}>
              Who won?
            </h2>
            {/* BUG-16: winnerCandidatesでall-inプレイヤーも確実に表示 */}
            <div className="flex flex-wrap justify-center gap-3 max-w-sm">
              {winnerCandidates.map((pos) => {
                const isHero = pos === currentHand?.heroPosition;
                const playerState = gameState?.players.find(p => p.position === pos);
                const isAllIn = playerState?.isAllIn;
                return (
                  <P5Button
                    key={pos}
                    className={`px-6 py-4 font-bold polygon-button border-2 min-w-[5rem] ${
                      isHero
                        ? 'bg-p5-red border-white text-white'
                        : isAllIn
                        ? 'bg-amber-900/30 border-amber-400 text-amber-300'
                        : 'bg-black border-white text-white hover:bg-gray-800'
                    }`}
                    style={{ transform: 'skewX(-7deg)' }}
                    onClick={() => handleWinnerSelect(pos)}
                  >
                    {pos}
                    {isHero && <span className="block text-xs font-black text-white/90 mt-0.5">(You)</span>}
                    {isAllIn && !isHero && <span className="block text-[10px] font-bold text-amber-400">ALL-IN</span>}
                  </P5Button>
                );
              })}
            </div>
          </>
        )}
        {/* ショーダウン: せり上がりシート＋入力フォーム */}
        <AnimatePresence>
          {showShowdownSheet && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/50 z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowShowdownSheet(false)}
              />
              <motion.div
                className="fixed left-0 right-0 bottom-0 z-50 bg-black border-t-2 border-white p-4 pb-safe max-h-[85vh] overflow-y-auto"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                <h3 className="text-lg font-black mb-2" style={{ transform: 'skewX(-7deg)' }}>
                  Showdown (Optional)
                </h3>
                <p className="text-xs text-gray-400 mb-3">Muck or enter loser&apos;s hand. You can skip.</p>
                {showdownInputs.map(({ position, hand }) => {
                  const currentHandCards = hand !== 'muck' ? hand.filter(Boolean) : [];
                  const usedElsewhere = [
                    ...(currentHand?.heroHand ?? []),
                    ...(gameState?.board ?? []),
                    ...showdownInputs
                      .filter((x) => x.position !== position)
                      .flatMap((x) => (x.hand === 'muck' ? [] : x.hand)),
                  ];
                  const usedForReel = usedElsewhere.filter((c) => !currentHandCards.includes(c));
                  const isSelectable = (card: string) =>
                    !usedForReel.includes(card) || currentHandCards.includes(card);
                  return (
                    <div key={position} className="mb-4 p-2 border border-white/20 rounded">
                      <p className="text-sm font-bold text-white mb-2">{position}</p>
                      <div className="flex flex-wrap gap-2 items-center">
                        <button
                          type="button"
                          className={`px-3 py-1.5 text-sm font-bold border-2 rounded ${hand === 'muck' ? 'bg-p5-red border-white text-white' : 'bg-black border-white/50 text-white'}`}
                          onClick={() => setShowdownHand(position, 'muck')}
                        >
                          Muck
                        </button>
                        <button
                          type="button"
                          className={`px-3 py-1.5 text-sm font-bold border-2 rounded ${hand !== 'muck' ? 'bg-p5-red border-white text-white' : 'bg-black border-white/50 text-white'}`}
                          onClick={() => setShowdownHand(position, ['', ''])}
                        >
                          Enter Hand
                        </button>
                      </div>
                      {hand !== 'muck' && (
                        <div className="mt-2 h-48 overflow-hidden">
                          <SuitBasedCardReel
                            usedCards={usedForReel}
                            selected={currentHandCards}
                            isSelectable={isSelectable}
                            onSelect={(card) => {
                              const inSelected = currentHandCards.includes(card);
                              const next =
                                inSelected
                                  ? currentHandCards.filter((c) => c !== card)
                                  : currentHandCards.length < 2
                                    ? [...currentHandCards, card]
                                    : currentHandCards;
                              setShowdownHand(position, [next[0] ?? '', next[1] ?? '']);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                <motion.button
                  type="button"
                  className="w-full py-3 mt-2 bg-p5-red text-white font-bold polygon-button text-sm"
                  style={{ transform: 'skewX(-7deg)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleShowdownDone}
                >
                  Next
                </motion.button>
                <button
                  type="button"
                  className="mt-2 w-full text-sm text-gray-400"
                  onClick={() => setShowShowdownSheet(false)}
                >
                  Close
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        {navOverlay}
      </main>
    );
  }

  if (step === 'result') {
    const heroWon =
      selectedWinner != null &&
      currentHand?.heroPosition != null &&
      (Array.isArray(selectedWinner)
        ? selectedWinner.includes(currentHand.heroPosition)
        : selectedWinner === currentHand.heroPosition);

    // 動的損益計算: ポットからヒーローの投入額を引く
    const heroPos = currentHand?.heroPosition;
    const contributions = gameState ? getTotalContributions(gameState.actions) : new Map<string, number>();
    const heroContribution = heroPos ? (contributions.get(heroPos) ?? 0) : 0;
    const totalPot = gameState?.pot ?? 0;

    let heroProfit = 0;
    if (confirmedPotWinners.length > 0 && heroPos) {
      // A5: 確定済みポット勝者から正確な損益を計算
      let wonAmount = 0;
      for (const pw of confirmedPotWinners) {
        if (pw.winners.includes(heroPos)) {
          wonAmount += pw.potAmount;
        }
      }
      heroProfit = wonAmount - heroContribution;
    } else if (heroWon) {
      heroProfit = totalPot - heroContribution;
    } else {
      heroProfit = -heroContribution;
    }
    const displayAmount = Math.round(heroProfit * 10) / 10;

    return (
      <main className="min-h-[100dvh] overflow-hidden bg-black text-white p-4 flex flex-col items-center justify-center relative">
        {/* 背景演出 */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: heroWon
              ? 'linear-gradient(135deg, rgba(213,0,0,0.15) 0%, transparent 50%, rgba(213,0,0,0.1) 100%)'
              : 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(30,30,30,0.5) 100%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
        {/* 斜めスイープ */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: heroWon
              ? 'linear-gradient(135deg, transparent 40%, rgba(213,0,0,0.3) 50%, transparent 60%)'
              : 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.05) 50%, transparent 60%)',
          }}
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />

        <motion.h1
          className={`font-p5-en text-5xl sm:text-7xl font-black mb-3 text-center relative z-10 ${heroWon ? 'glow-red-text' : ''}`}
          style={{
            transform: 'skewX(-7deg)',
            color: heroWon ? '#D50000' : '#fff',
            textShadow: heroWon ? '0 0 30px rgba(213,0,0,0.6)' : 'none',
          }}
          initial={{ opacity: 0, x: -200 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          {heroWon ? 'VICTORY' : 'DEFEAT'}
        </motion.h1>

        <motion.p
          className={`font-p5-en text-3xl sm:text-5xl font-black mb-4 text-center relative z-10 ${heroWon ? 'text-white' : 'text-gray-400'}`}
          style={{
            transform: 'skewX(-5deg)',
            textShadow: heroWon ? '0 0 15px rgba(213,0,0,0.4)' : 'none',
          }}
          initial={{ opacity: 0, x: -150 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 180, damping: 14 }}
        >
          {displayAmount >= 0 ? '+' : ''}{displayAmount} BB
        </motion.p>

        {/* UI-6: メモ入力 */}
        <motion.div
          className="w-full max-w-xs relative z-10 mb-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <textarea
            className="w-full bg-black border-2 border-p5-red/60 text-white text-sm p-3 rounded resize-none focus:border-p5-red focus:outline-none placeholder-gray-500"
            rows={2}
            placeholder="Memo (location, opponent traits, thought process, etc.)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            style={{ transform: 'skewX(-2deg)' }}
          />
        </motion.div>

        <motion.button
          type="button"
          className="w-full max-w-xs py-4 bg-p5-red text-white font-bold text-lg polygon-button relative z-10"
          style={{ transform: 'skewX(-7deg)' }}
          whileTap={{ scale: 0.92 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={() => handleFinish(heroWon, displayAmount)}
        >
          Save to History
        </motion.button>

        {/* UI-28: Next Hand ボタン — 保存して次のハンドを即開始 */}
        <motion.button
          type="button"
          className="w-full max-w-xs py-3 mt-2 border-2 border-white/40 text-white/80 font-p5-en font-bold text-sm polygon-button relative z-10 bg-black/50"
          style={{ transform: 'skewX(-7deg)' }}
          whileTap={{ scale: 0.92 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          onClick={() => {
            // 現在のハンドを保存
            finishHand({ won: heroWon, amount: displayAmount });
            if (memo) {
              try {
                const raw = localStorage.getItem('poker3_history');
                if (raw) {
                  const hands = JSON.parse(raw);
                  if (hands.length > 0) {
                    hands[hands.length - 1].memo = memo;
                    localStorage.setItem('poker3_history', JSON.stringify(hands));
                  }
                }
              } catch { /* memo save failure */ }
            }
            // タブ切替せず次のハンドへ
            setStep('hero');
            setStepHistory(['hero']);
            streetBoundaryIndexRef.current = 1;
            lastBoundaryStreetRef.current = null;
            setSelectedPosition(null);
            setPreflopOpener(null);
            setPreflopNextToAct(null);
            setOpponentShowSlider(false);
            setWhoOpenSelectedPosition(null);
            setSelectedWinner(null);
            setPotWinnerMap(new Map());
            setConfirmedPotWinners([]);
            setMemo('');
          }}
        >
          NEXT HAND
        </motion.button>
        {navOverlay}
      </main>
    );
  }

  // position / action: 画面全体を使うレイアウト
  const heroPosition = currentHand?.heroPosition ?? null;
  const heroHand = currentHand?.heroHand ?? null;
  const getSuitColorClass = (card: string) => {
    const s = card.slice(-1);
    if (s === '♥') return 'text-p5-red';
    if (s === '♦') return 'text-amber-400';
    if (s === '♣') return 'text-slate-400';
    return 'text-white';
  };

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-black text-white flex flex-col relative">
      {/* B6: ストリート遷移バナー */}
      <AnimatePresence>
        {streetBanner && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-p5-red"
              initial={{ clipPath: 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)' }}
              animate={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
              exit={{ clipPath: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)' }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.span
              className="font-p5-en text-6xl sm:text-9xl font-black text-white relative z-10"
              style={{ transform: 'skewX(-10deg)', textShadow: '0 0 40px rgba(255,255,255,0.4)' }}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              {streetBanner}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* B13: ヘッダー帯 + B10: ヒーロープレミアム */}
      <div className="px-2 py-1.5 border-b border-white/20 shrink-0 bg-black/80 space-y-0.5 header-sweep-bg">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <PotDisplay compact />
          <span className="font-p5-en text-base sm:text-lg font-black text-p5-red glow-red-text" style={{ transform: 'skewX(-5deg)' }}>
            {gameState?.street.toUpperCase()}
          </span>
        </div>
        {/* B10: ヒーロー表示プレミアム化 */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {heroPosition != null && (
            <div className="relative px-3 py-1.5 border-2 border-p5-red bg-p5-red/20 rounded glow-red overflow-hidden">
              {/* 斜め赤アクセントバー */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, transparent 60%, rgba(213,0,0,0.15) 60%, rgba(213,0,0,0.15) 65%, transparent 65%)',
                }}
              />
              <span className="font-p5-en text-[10px] text-gray-400 block -mb-0.5">YOUR POSITION</span>
              <span className="font-p5-en font-black text-sm sm:text-base text-white">{heroPosition}</span>
              {/* アニメーション付きアンダーライン */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-p5-red"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                style={{ transformOrigin: 'left' }}
              />
            </div>
          )}
          {heroHand && heroHand.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="font-p5-en text-[10px] text-gray-400 mr-1">HAND</span>
              {heroHand.map((c, i) => (
                <motion.span
                  key={c}
                  className={`px-2 py-1 rounded border border-white/50 font-black text-sm ${getSuitColorClass(c)} bg-gray-800`}
                  initial={{ rotateY: 180, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1, y: [0, -3, 0] }}
                  transition={{
                    rotateY: { delay: 0.1 + i * 0.1, type: 'spring', stiffness: 300 },
                    opacity: { delay: 0.1 + i * 0.1, type: 'spring', stiffness: 300 },
                    y: { duration: 2, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut', delay: i * 0.3 },
                  }}
                >
                  {c}
                </motion.span>
              ))}
            </div>
          )}
        </div>
        {/* UI-34: プレイヤーステータス表示（現在=最大・最目立つ、次=中目立ち、残り=小、fold=グレーアウト） */}
        {gameState && (
          <div className="flex flex-wrap items-center gap-1.5">
            {gameState.players.map((p) => {
              const isCurrent = p.position === nextToAct;
              const isNext = p.position === afterNextToAct;
              const isFolded = !p.active;
              const isAllIn = p.isAllIn && p.active;
              const isHero = p.position === currentHand?.heroPosition;

              if (isFolded) {
                return <span key={p.position} className="font-p5-en text-[10px] text-gray-600 line-through opacity-40 px-0.5">{p.position}</span>;
              }
              if (isCurrent) {
                return (
                  <span key={p.position} className="font-p5-en font-black text-base bg-p5-red text-white px-3 py-1 rounded glow-red" style={{ transform: 'skewX(-5deg)' }}>
                    → {p.position}{isHero ? ' ★' : ''}
                  </span>
                );
              }
              if (isNext) {
                return (
                  <span key={p.position} className="font-p5-en font-bold text-sm text-p5-red border border-p5-red/50 px-2 py-0.5 rounded">
                    {p.position} ›
                  </span>
                );
              }
              return (
                <span key={p.position} className={`font-p5-en text-xs px-1 ${isAllIn ? 'text-amber-400 font-bold' : 'text-white/50'}`}>
                  {p.position}{isAllIn ? ' AI' : ''}
                </span>
              );
            })}
          </div>
        )}
        {/* B11: 斜めディバイダー */}
        <div className="p5-divider" />
      </div>

      {/* ボードカード表示 + UI-24: 役名 */}
      {board.length > 0 && (step === 'position' || step === 'action') && (
        <motion.div
          className="shrink-0 px-2 py-1 border-b border-white/10 bg-black/60"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <p className="font-p5-en text-[10px] text-gray-400">BOARD</p>
            {heroHand && heroHand.length === 2 && board.length >= 3 && (() => {
              const handName = evaluateHand(heroHand, board);
              return handName ? (
                <span className="font-p5-en text-[11px] font-bold text-p5-red" style={{ transform: 'skewX(-5deg)' }}>
                  {handName}
                </span>
              ) : null;
            })()}
          </div>
          <div className="flex justify-center gap-2 items-end" style={{ perspective: '800px' }}>
            {board.map((c, i) => (
              <motion.span
                key={c}
                className={`w-[44px] min-h-[66px] flex items-center justify-center bg-gray-800 font-black text-base rounded-lg border-2 border-white shadow-lg ${getSuitColorClass(c)}`}
                style={{
                  transform: 'skewX(-8deg)',
                  aspectRatio: '2/3',
                  animation: `idle-breathe 3s ease-in-out ${i * 0.25}s infinite`,
                }}
                initial={{ opacity: 0, scale: 0.6, rotateY: 180 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 16,
                  delay: i * 0.05,
                }}
              >
                {c}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}

      {/* B4: ステップ切替アニメーション */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step + (selectedPosition ?? '')}
          className="flex-1 min-h-0 overflow-hidden p-2 flex flex-col justify-center"
          initial={{ clipPath: 'polygon(100% 100%, 100% 100%, 100% 100%, 100% 100%)', opacity: 0 }}
          animate={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', opacity: 1 }}
          exit={{ clipPath: 'polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%)', opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {step === 'position' && (
            <>
              <h2 className="font-p5-en text-xl sm:text-2xl font-black mb-2 text-center glow-red-text" style={{ transform: 'skewX(-5deg)' }}>
                SELECT POSITION
              </h2>
              <p className="font-p5-en text-sm text-gray-400 text-center mb-2">
                {nextToAct ? `${nextToAct} ACTION` : 'NEXT STREET'}
              </p>
              <div className="flex-1 min-h-0 flex flex-col justify-center">
                <PositionSelector
                  onSelect={handlePositionSelect}
                  selected={selectedPosition ?? undefined}
                  allowedPositions={nextToAct ? [nextToAct] : []}
                />
              </div>
              {nextToAct && (
                <div className="flex justify-center mt-2">
                  <P5Button
                    className="px-6 py-3 bg-p5-red/80 text-white font-p5-en text-sm font-bold glow-red"
                    style={{ transform: 'skewX(-5deg)' }}
                    onClick={() => {
                      setFlowError(null);
                      setSelectedPosition(nextToAct);
                      pushStep('action');
                    }}
                  >
                    SELECT {nextToAct}
                  </P5Button>
                </div>
              )}
              {flowError && (
                <p className="text-p5-red text-sm text-center mt-2 font-bold" style={{ transform: 'skewX(-3deg)' }}>
                  {flowError}
                </p>
              )}
            </>
          )}
          {step === 'action' && selectedPosition && (
            <>
              {/* UI-31: ポジション名を大きなバッジ + 色分けで明確表示 */}
              <div className="text-center mb-2">
                <span
                  className={`font-p5-en text-3xl sm:text-4xl font-black inline-block px-5 py-1 rounded ${
                    selectedPosition === heroPosition
                      ? 'bg-p5-red text-white glow-red'
                      : 'bg-white/10 text-white border-2 border-white/40'
                  }`}
                  style={{ transform: 'skewX(-7deg)' }}
                >
                  {selectedPosition}
                  {/* UI-40: フロップ以降ヒーローアクション時にHERO表示 */}
                  {selectedPosition === heroPosition && gameState?.street !== 'preflop' && (
                    <span className="text-lg font-bold ml-2 opacity-80">HERO</span>
                  )}
                </span>
                <span className="font-p5-en text-base text-gray-400 block mt-0.5" style={{ transform: 'skewX(-5deg)' }}>
                  ACTION
                </span>
              </div>
              {flowError && (
                <p className="text-p5-red text-sm text-center mb-2 font-bold" style={{ transform: 'skewX(-3deg)' }}>
                  {flowError}
                </p>
              )}
              <div className="flex-1 min-h-0 flex flex-col justify-center">
                <ActionSizeSelector position={selectedPosition} onSelect={handleActionSelect} />
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="p-1.5 shrink-0 flex justify-end items-center border-t border-white/10">
        <div className="flex items-center gap-3">
          <ActionHistory />
          <span className="font-p5-en text-xs text-gray-500">{gameState?.actions.length ?? 0}</span>
        </div>
      </div>
      {navOverlay}
    </main>
  );
}
