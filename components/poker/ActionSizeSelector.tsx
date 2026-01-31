'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { Action, BetSize, Position } from '@/types/poker';
import { getAvailableActions, getForcedAction, getMinBet, calculateMinRaise } from '@/utils/bettingUtils';
import { useHand } from '@/contexts/HandContext';
import { useEffect, useState } from 'react';

interface ActionSizeSelectorProps {
  position: string;
  onSelect: (action: Action, size?: BetSize) => void;
}

export default function ActionSizeSelector({ position, onSelect }: ActionSizeSelectorProps) {
  const { gameState } = useHand();
  const [availableActions, setAvailableActions] = useState<{ action: string; sizes?: BetSize[] }[]>([]);
  const [forcedAction, setForcedAction] = useState<string | null>(null);
  const [showAllInFlash, setShowAllInFlash] = useState(false);
  const [showBetSlider, setShowBetSlider] = useState(false);
  const [sliderAmount, setSliderAmount] = useState(2);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!gameState) return;

    const pos = position as Position;
    const actions = getAvailableActions(
      pos,
      gameState.street,
      gameState.actions,
      gameState.players,
      gameState.pot,
      gameState.lastBet
    );

    setAvailableActions(actions);

    const forced = getForcedAction(
      pos,
      gameState.street,
      gameState.actions,
      gameState.players,
      gameState.pot,
      gameState.lastBet
    );

    if (forced) {
      setForcedAction(forced);
      setTimeout(() => {
        onSelect(forced as Action);
      }, 500);
    }
  }, [gameState, position, onSelect]);

  if (forcedAction) {
    return (
      <div className="text-center p-8">
        <p className="font-p5-en text-2xl font-bold text-p5-red glow-red-text">AUTO: {forcedAction.toUpperCase()}</p>
      </div>
    );
  }

  const handleAllInClick = () => {
    setShowAllInFlash(true);
    setTimeout(() => {
      setShowAllInFlash(false);
      onSelect('all-in' as Action);
    }, 250);
  };

  const handleActionWithFeedback = (action: Action, size?: BetSize) => {
    if (action === 'all-in') {
      handleAllInClick();
      return;
    }
    setActionFeedback(action);
    setTimeout(() => {
      setActionFeedback(null);
      onSelect(action, size);
    }, 300);
  };

  const isAllIn = (size: BetSize, stack: number) => {
    return size.amount !== undefined && size.amount >= stack;
  };

  const formatBetSize = (size: BetSize): string => {
    const amountStr = size.amount != null ? ` (${size.amount} BB)` : '';
    if (size.type === 'pot-relative') {
      const percentage = Math.round(size.value * 100);
      return `${percentage}%${amountStr}`;
    }
    return `${size.value}x${amountStr}`;
  };

  const betOrRaiseItem = availableActions.find((a) => a.action === 'bet' || a.action === 'raise');
  const amounts = betOrRaiseItem?.sizes?.map((s) => s.amount ?? 0).filter((a) => a > 0) ?? [];
  const hasPresetSizes = amounts.length > 0;
  const player = gameState?.players.find((p) => p.position === position);
  const stack = player?.stack ?? 100;
  const sliderMin =
    betOrRaiseItem?.action === 'raise' && gameState
      ? calculateMinRaise(gameState.actions, gameState.street, gameState.lastBet)
      : gameState
      ? getMinBet(gameState.street, gameState.lastBet)
      : 1;
  const sliderMax = Math.max(sliderMin, stack);
  const hasSlider = !!betOrRaiseItem && stack > 0 && sliderMax >= sliderMin;
  const clampedSliderAmount = Math.min(sliderMax, Math.max(sliderMin, Math.round(sliderAmount)));

  const handleSliderBet = () => {
    if (!betOrRaiseItem || !gameState) return;
    const amount = clampedSliderAmount;
    const isPotRelative = betOrRaiseItem.sizes?.[0]?.type === 'pot-relative';
    const size: BetSize = isPotRelative
      ? { type: 'pot-relative', value: amount / gameState.pot, amount }
      : { type: 'bet-relative', value: amount / (gameState.lastBet || 1), amount };
    onSelect(betOrRaiseItem.action as Action, size);
  };

  // アクション名→英語表示（Bebas Neue用）
  const actionLabel = (action: string): string => {
    switch (action) {
      case 'fold': return 'FOLD';
      case 'check': return 'CHECK';
      case 'call': return 'CALL';
      case 'all-in': return 'ALL-IN';
      default: return action.toUpperCase();
    }
  };

  // UI-3: アクションボタンのスタイル差別化
  const actionButtonStyle = (action: string) => {
    switch (action) {
      case 'fold':
        return { bg: 'rgba(100,100,100,0.3)', border: 'border-gray-600', text: 'text-gray-300', extra: '' };
      case 'check':
        return { bg: 'rgba(0,180,0,0.15)', border: 'border-green-500/40', text: 'text-green-300', extra: '' };
      case 'call':
        return { bg: 'rgba(200,200,255,0.15)', border: 'border-blue-400/40', text: 'text-white', extra: '' };
      case 'bet':
        return { bg: 'rgba(200,0,0,0.2)', border: 'border-red-500/50', text: 'text-red-300', extra: '' };
      case 'raise':
        return { bg: 'rgba(200,0,0,0.25)', border: 'border-red-400/60', text: 'text-red-200', extra: '' };
      case 'all-in':
        return { bg: 'rgba(200,0,0,0.35)', border: 'border-red-500', text: 'text-white', extra: 'glow-red glow-red-text' };
      default:
        return { bg: 'black', border: 'border-white', text: 'text-white', extra: '' };
    }
  };

  // B5: アクションフィードバック背景色
  const feedbackBg = (action: string): string => {
    switch (action) {
      case 'fold': return 'black';
      case 'check': return 'rgba(0,200,0,0.3)';
      case 'call': return 'transparent';
      case 'raise': return 'rgba(213,0,0,0.15)';
      default: return 'transparent';
    }
  };

  return (
    <>
      {/* All-in フラッシュ + スクリーンシェイク */}
      <AnimatePresence>
        {showAllInFlash && (
          <motion.div
            className="fixed inset-0 bg-p5-red z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, x: [0, -3, 3, -2, 2, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="text-white font-p5-en font-black"
              style={{
                fontSize: 'clamp(80px, 40vw, 250px)',
                transform: 'skewX(-10deg)',
                textShadow: '0 0 40px rgba(255,255,255,0.5)',
              }}
              initial={{ scale: 0, y: 0 }}
              animate={{ scale: 1.5, y: -100 }}
              exit={{ scale: 0, y: -200 }}
              transition={{ duration: 0.25 }}
            >
              ALL-IN
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* B5: アクションフィードバックオーバーレイ */}
      <AnimatePresence>
        {actionFeedback && actionFeedback !== 'all-in' && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none overflow-hidden"
            style={{ background: feedbackBg(actionFeedback) }}
            initial={{ opacity: 0 }}
            animate={{ opacity: actionFeedback === 'fold' ? 0.5 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {actionFeedback === 'fold' && (
              <motion.span
                className="font-p5-en text-6xl sm:text-8xl font-black text-white/60"
                style={{ transform: 'skewX(-10deg)' }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.2, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                FOLD
              </motion.span>
            )}
            {actionFeedback === 'check' && (
              <motion.span
                className="font-p5-en text-5xl sm:text-7xl font-black text-green-400/70"
                style={{ transform: 'skewX(-10deg)' }}
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                CHECK
              </motion.span>
            )}
            {actionFeedback === 'call' && (
              <motion.div
                className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                initial={{ x: '-6rem' }}
                animate={{ x: '100vw' }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            )}
            {actionFeedback === 'raise' && (
              <motion.span
                className="font-p5-en text-5xl sm:text-7xl font-black text-p5-red"
                style={{
                  transform: 'skewX(-10deg)',
                  textShadow: '0 0 30px rgba(213,0,0,0.8), 0 0 60px rgba(213,0,0,0.4)',
                }}
                initial={{ y: 0, opacity: 0.5 }}
                animate={{ y: [0, -5, 0], opacity: 1 }}
                exit={{ y: -5, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                RAISE
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* アクションエリア */}
      <div
        className="space-y-4 p-4 sm:p-8 max-h-[70vh] overflow-y-auto scroll-inertia"
        style={{ scrollBehavior: 'smooth' }}
      >
        {availableActions.map((item, index) => {
          if (item.action === 'bet' || item.action === 'raise') {
            return (
              <div key={item.action} className="space-y-2">
                <p className="font-p5-en text-lg sm:text-xl font-bold mb-2 glow-red-text">
                  {item.action === 'bet' ? 'BET' : 'RAISE'}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {item.sizes?.map((size, sizeIndex) => {
                    const player = gameState?.players.find(p => p.position === position);
                    const stack = player?.stack || 100;
                    const isAllInSize = isAllIn(size, stack);

                    const sizeStyle = actionButtonStyle(item.action);

                    return (
                      <motion.button
                        key={sizeIndex}
                        className={`px-4 py-3 sm:px-6 sm:py-4 font-p5-en font-bold text-base sm:text-xl polygon-button border-2 ${sizeStyle.border} ${sizeStyle.text}`}
                        style={{ transform: 'skewX(-7deg)', background: sizeStyle.bg }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (index * 0.1) + (sizeIndex * 0.03) }}
                        whileHover={{ scale: 1.1, rotate: -3 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => {
                          if (isAllInSize) {
                            handleAllInClick();
                          } else {
                            handleActionWithFeedback(item.action as Action, size);
                          }
                        }}
                      >
                        {formatBetSize(size)}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          } else {
            const isAllInAction = item.action === 'all-in';
            const btnStyle = actionButtonStyle(item.action);

            return (
              <motion.button
                key={item.action}
                className={`w-full px-3 py-2 sm:px-4 sm:py-3 font-p5-en font-bold text-base sm:text-xl polygon-button border-2 ${btnStyle.border} ${btnStyle.text} ${btnStyle.extra}`}
                style={{
                  transform: 'skewX(-7deg)',
                  background: btnStyle.bg,
                  animation: !isAllInAction ? `idle-breathe 3s ease-in-out ${index * 0.2}s infinite` : undefined,
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                whileHover={{ scale: 1.1, rotate: -3 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleActionWithFeedback(item.action as Action)}
              >
                {actionLabel(item.action)}
              </motion.button>
            );
          }
        })}
        {hasSlider && (
          <>
            <button
              type="button"
              className="w-full py-2 mt-2 text-xs font-bold text-white/80 border border-white/40 rounded"
              onClick={() => setShowBetSlider((v) => !v)}
            >
              {showBetSlider ? 'スライダーを閉じる' : 'スライダーでベットサイズを選ぶ'}
            </button>
            {showBetSlider && betOrRaiseItem && (
              <div className="pt-2 pb-1 mt-2 border-t border-white/20">
                <p className="text-[10px] text-gray-400 mb-1">
                  {betOrRaiseItem.action === 'bet' ? 'BET' : 'RAISE'} (BB): {clampedSliderAmount} ({sliderMin}〜{sliderMax})
                </p>
                <input
                  type="range"
                  min={sliderMin}
                  max={sliderMax}
                  value={clampedSliderAmount}
                  onChange={(e) => setSliderAmount(Number(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded accent-p5-red"
                />
                <motion.button
                  type="button"
                  className="w-full py-3 mt-2 border-2 border-white font-p5-en font-black text-base polygon-button bg-black text-white"
                  style={{ transform: 'skewX(-7deg)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSliderBet}
                >
                  {betOrRaiseItem.action === 'bet' ? 'BET' : 'RAISE'} {clampedSliderAmount} BB
                </motion.button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
