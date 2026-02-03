'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { Position, MentalState, PlayStyle, InitialStackConfig, PlayerAttribute } from '@/types/poker';
import SuitBasedCardReel from './SuitBasedCardReel';
import StackOptionsPanel from './StackOptionsPanel';
import { POKER_CONFIG } from '@/utils/pokerConfig';

const POSITIONS: Position[] = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];

/** カード文字列（例: A♠）からスート色クラスを返す */
function getSuitColorClass(card: string): string {
  const suit = card.slice(-1);
  if (suit === '♠') return 'text-white';
  if (suit === '♥') return 'text-p5-red';
  if (suit === '♦') return 'text-amber-400';
  if (suit === '♣') return 'text-slate-400';
  return 'text-white';
}

interface HeroSelectorProps {
  onSelect: (
    heroPosition: Position,
    heroHand?: [string, string],
    initialStacks?: InitialStackConfig[],
    playerAttributes?: PlayerAttribute[]
  ) => void;
}

export default function HeroSelector({ onSelect }: HeroSelectorProps) {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [card1, setCard1] = useState<string | null>(null);
  const [card2, setCard2] = useState<string | null>(null);
  const [selectionComplete, setSelectionComplete] = useState(false);

  // FEAT-1/2: Stack & Attribute Options
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [initialStacks, setInitialStacks] = useState<Map<Position, number>>(
    new Map(POSITIONS.map((pos) => [pos, POKER_CONFIG.defaultStack]))
  );
  const [playerAttributes, setPlayerAttributes] = useState<Map<Position, { mentalState: MentalState; playStyle: PlayStyle }>>(
    new Map(POSITIONS.map((pos) => [pos, { mentalState: 'neutral', playStyle: 'neutral' }]))
  );

  const hand: [string, string] | null =
    card1 && card2 ? (card1 < card2 ? [card1, card2] : [card2, card1]) : null;

  const handlePositionSelect = (position: Position) => {
    setSelectedPosition(position);
  };

  const handleCardSelect = (card: string) => {
    if (!card1) {
      setCard1(card);
    } else if (card !== card1 && !card2) {
      setCard2(card);
      setSelectionComplete(true);
      setTimeout(() => setSelectionComplete(false), 800);
    }
  };

  const clearHand = () => {
    setCard1(null);
    setCard2(null);
  };

  const handleStackChange = (position: Position, stack: number) => {
    setInitialStacks(new Map(initialStacks.set(position, stack)));
  };

  const handleBulkStackChange = (stack: number) => {
    const newStacks = new Map<Position, number>();
    POSITIONS.forEach((pos) => newStacks.set(pos, stack));
    setInitialStacks(newStacks);
  };

  const handleAttributeChange = (position: Position, mental: MentalState, style: PlayStyle) => {
    setPlayerAttributes(new Map(playerAttributes.set(position, { mentalState: mental, playStyle: style })));
  };

  const handleConfirm = () => {
    if (selectedPosition) {
      // Convert Maps to arrays only if non-default values exist
      const stacksArray: InitialStackConfig[] = [];
      const attributesArray: PlayerAttribute[] = [];

      initialStacks.forEach((stack, pos) => {
        if (stack !== POKER_CONFIG.defaultStack) {
          stacksArray.push({ position: pos, stack });
        }
      });

      playerAttributes.forEach((attrs, pos) => {
        if (attrs.mentalState !== 'neutral' || attrs.playStyle !== 'neutral') {
          attributesArray.push({ position: pos, mentalState: attrs.mentalState, playStyle: attrs.playStyle });
        }
      });

      onSelect(
        selectedPosition,
        hand ?? undefined,
        stacksArray.length > 0 ? stacksArray : undefined,
        attributesArray.length > 0 ? attributesArray : undefined
      );
    }
  };

  return (
    <div className="bg-black text-white overflow-hidden flex flex-col flex-1 min-h-0">
      {!selectedPosition ? (
        <>
          {/* タイトル: P5風英字・軽いアイドリング */}
          <motion.h1
            className="font-p5-en text-xl sm:text-2xl font-black text-center pt-4 pb-2 px-4 whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ transform: 'skewX(-10deg)' }}
            initial={{ opacity: 0, y: -10 }}
            animate={{
              opacity: [1, 0.97, 1],
              y: 0,
              scale: [1, 1.008, 1],
            }}
            transition={{
              opacity: { duration: 2.8, repeat: Infinity, repeatType: 'reverse' },
              scale: { duration: 3.2, repeat: Infinity, repeatType: 'reverse' },
              y: { duration: 0.35 },
            }}
          >
            Select your position
          </motion.h1>

          {/* ポジション: 画面中央寄せ・余白を効かせたグリッド */}
          <div className="px-4 pb-4">
            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-sm mx-auto w-full mt-2">
              {POSITIONS.map((position, i) => (
                <motion.button
                  key={position}
                  data-testid={`hero-position-${position}`}
                  className="py-4 sm:py-5 font-black text-base sm:text-lg polygon-button border-2 bg-black border-white hover:bg-gray-900"
                  style={{ transform: 'skewX(-7deg)' }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePositionSelect(position)}
                >
                  {position}
                </motion.button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* コンパクトポジション表示 + Options + Change */}
          <div className="flex items-center justify-between px-4 py-2 shrink-0 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wide">Position</span>
              <span
                className="px-3 py-0.5 bg-p5-red text-white font-black text-sm polygon-button"
                style={{ transform: 'skewX(-7deg)' }}
              >
                {selectedPosition}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="px-3 py-1 bg-gray-800 text-white font-p5-en text-xs font-bold border border-white/20 rounded hover:bg-gray-700"
                style={{ transform: 'skewX(-5deg)' }}
                onClick={() => setIsOptionsOpen(true)}
              >
                Options
              </button>
              <button
                type="button"
                className="text-xs text-gray-400 hover:text-white"
                onClick={() => setSelectedPosition(null)}
              >
                Change
              </button>
            </div>
          </div>

          {/* ハンド選択エリア + カードリール */}
          <div className="flex-1 min-h-0 flex flex-col px-4 pb-16">
            <div className="flex items-center justify-between py-1.5 shrink-0">
              <span className="text-sm font-bold text-white">Hand</span>
              {(card1 || card2) && (
                <button
                  type="button"
                  className="text-sm text-p5-red font-bold"
                  onClick={clearHand}
                >
                  Reset
                </button>
              )}
            </div>

            {/* 選択済み2枚の表示 — B14: 3Dフリップ */}
            <div className="flex justify-center gap-2 py-1 min-h-[3.5rem] shrink-0" style={{ perspective: '800px' }}>
              <AnimatePresence mode="wait">
                {card1 && (
                  <motion.div
                    key="c1"
                    className="w-[52px] min-h-[72px] relative"
                    style={{
                      transform: 'skewX(-8deg)',
                      aspectRatio: '2/3',
                      animation: 'idle-breathe 3s ease-in-out 0s infinite',
                    }}
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1.1, y: 0, rotate: -5 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 16 }}
                  >
                    <motion.div
                      className="w-full h-full relative"
                      style={{ transformStyle: 'preserve-3d' }}
                      initial={{ rotateY: 0 }}
                      animate={{ rotateY: 180 }}
                      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
                    >
                      <div
                        className="absolute inset-0 flex items-center justify-center bg-p5-red rounded-lg border-2 border-white shadow-lg"
                        style={{ backfaceVisibility: 'hidden' }}
                      />
                      <div
                        className={`absolute inset-0 flex items-center justify-center bg-gray-800 font-black text-xl rounded-lg border-2 border-white shadow-lg ${getSuitColorClass(card1)}`}
                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                      >
                        {card1}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
                {card2 && (
                  <motion.div
                    key="c2"
                    className="w-[52px] min-h-[72px] relative"
                    style={{
                      transform: 'skewX(-8deg)',
                      aspectRatio: '2/3',
                      animation: 'idle-breathe 3s ease-in-out 0.3s infinite',
                    }}
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1.1, y: 0, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.08 }}
                  >
                    <motion.div
                      className="w-full h-full relative"
                      style={{ transformStyle: 'preserve-3d' }}
                      initial={{ rotateY: 0 }}
                      animate={{ rotateY: 180 }}
                      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.23 }}
                    >
                      <div
                        className="absolute inset-0 flex items-center justify-center bg-p5-red rounded-lg border-2 border-white shadow-lg"
                        style={{ backfaceVisibility: 'hidden' }}
                      />
                      <div
                        className={`absolute inset-0 flex items-center justify-center bg-gray-800 font-black text-xl rounded-lg border-2 border-white shadow-lg ${getSuitColorClass(card2)}`}
                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                      >
                        {card2}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
              {selectionComplete && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center bg-p5-red/30 pointer-events-none"
                  initial={{ opacity: 0, scale: 1.5 }}
                  animate={{ opacity: [0, 1, 0], scale: [1.5, 1, 1] }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              )}
            </div>

            {/* スート縦並びリール: カードリールが残りスペースを最大限使う */}
            <div className="flex-1 min-h-0 flex flex-col">
              <SuitBasedCardReel
                usedCards={[]}
                selected={[card1, card2].filter(Boolean) as string[]}
                onSelect={handleCardSelect}
                isSelectable={(card) => (!card1 ? true : card !== card1) && !card2}
                className="flex-1 min-h-0"
              />
            </div>
          </div>

          {/* Start: ポジション + カード2枚選択済みで有効・高さ最小化 */}
          <div className="fixed bottom-0 left-0 right-0 pt-2 pb-3 px-4 bg-black border-t border-white/10 z-30" data-testid="hero-start-area">
            <button
              type="button"
              className="w-full max-w-sm mx-auto py-3 bg-p5-red text-white font-black text-lg polygon-button block disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ transform: 'skewX(-10deg)' }}
              onClick={handleConfirm}
              disabled={!selectedPosition || !hand}
              aria-label="Start"
            >
              Start
            </button>
          </div>
        </>
      )}

      {/* FEAT-1/2: Stack Options Panel */}
      <StackOptionsPanel
        positions={POSITIONS}
        initialStacks={initialStacks}
        playerAttributes={playerAttributes}
        onStackChange={handleStackChange}
        onBulkStackChange={handleBulkStackChange}
        onAttributeChange={handleAttributeChange}
        onClose={() => setIsOptionsOpen(false)}
        isOpen={isOptionsOpen}
      />
    </div>
  );
}
