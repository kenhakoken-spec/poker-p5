'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { Position } from '@/types/poker';
import SuitBasedCardReel from './SuitBasedCardReel';

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
  onSelect: (heroPosition: Position, heroHand?: [string, string]) => void;
}

export default function HeroSelector({ onSelect }: HeroSelectorProps) {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [card1, setCard1] = useState<string | null>(null);
  const [card2, setCard2] = useState<string | null>(null);
  const [selectionComplete, setSelectionComplete] = useState(false);

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

  const handleConfirm = () => {
    if (selectedPosition) {
      onSelect(selectedPosition, hand ?? undefined);
    }
  };

  return (
    <div
      className="bg-black text-white overflow-hidden flex flex-col"
      style={{ minHeight: '100dvh', maxHeight: '100dvh' }}
    >
      {/* タイトル: P5風英字・軽いアイドリング */}
      <motion.h1
        className="font-p5-en text-xl sm:text-2xl font-black text-center pt-6 pb-4 px-4 whitespace-nowrap overflow-hidden text-ellipsis"
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
      <div className="flex-1 min-h-0 flex flex-col px-4 pb-4">
        <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-sm mx-auto w-full mt-4">
          {POSITIONS.map((position, i) => (
            <motion.button
              key={position}
              data-testid={`hero-position-${position}`}
              className={`py-4 sm:py-5 font-black text-base sm:text-lg polygon-button border-2 ${
                selectedPosition === position ? 'bg-p5-red border-white' : 'bg-black border-white hover:bg-gray-900'
              }`}
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

        {/* ハンド（必須）: 1デッキから2枚・リール表示 */}
        {selectedPosition && (
          <>
            <motion.div
              className="flex-1 min-h-0 flex flex-col overflow-auto pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex items-center justify-between py-2 shrink-0">
                <span className="text-sm font-bold text-white">Hand</span>
                {(card1 || card2) && (
                  <button
                    type="button"
                    className="text-sm text-p5-red font-bold"
                    onClick={clearHand}
                  >
                    やり直す
                  </button>
                )}
              </div>

              {/* 選択済み2枚の表示 — B14: 3Dフリップ */}
              <div className="flex justify-center gap-2 py-1 min-h-[4rem] shrink-0" style={{ perspective: '800px' }}>
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

              {/* スート縦並びリール: 4スート × 13ランク（縦スクロールなし） */}
              <div className="flex-1 min-h-0 flex flex-col min-h-0">
                <SuitBasedCardReel
                  usedCards={[]}
                  selected={[card1, card2].filter(Boolean) as string[]}
                  onSelect={handleCardSelect}
                  isSelectable={(card) => (!card1 ? true : card !== card1) && !card2 }
                  className="flex-1 min-h-0 shrink-0"
                />
              </div>
            </motion.div>

            {/* 開始: ハンド選択の下に配置（ポジション + カード2枚選択済みで有効） */}
            <div className="shrink-0 pt-3 pb-4 px-4 bg-black border-t border-white/10" data-testid="hero-start-area">
              <button
                type="button"
                className="w-full max-w-sm mx-auto py-4 bg-p5-red text-white font-black text-lg polygon-button block disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ transform: 'skewX(-10deg)' }}
                onClick={handleConfirm}
                disabled={!selectedPosition || !hand}
                aria-label="開始"
              >
                開始
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
