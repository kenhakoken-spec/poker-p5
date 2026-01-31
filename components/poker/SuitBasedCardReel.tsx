'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';

const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
// 4色で区別: ♠白, ♥赤, ♦金, ♣灰（P5風・視認性）
const SUITS = [
  { symbol: '♠', colorClass: 'text-white', name: 'spades' },
  { symbol: '♥', colorClass: 'text-p5-red', name: 'hearts' },
  { symbol: '♦', colorClass: 'text-amber-400', name: 'diamonds' },
  { symbol: '♣', colorClass: 'text-slate-400', name: 'clubs' },
];

interface SuitBasedCardReelProps {
  usedCards: string[];
  selected: string[];
  onSelect: (card: string) => void;
  isSelectable: (card: string) => boolean;
  className?: string;
}

/**
 * スート左固定・カード横スクロール・ランクのみ・4色
 * - 1行 = [スート固定列] + [カード横スクロール]
 * - カードにはスートを書かない（左にスートあり）
 * - 縦スクロールなしで4行を収める
 */
export default function SuitBasedCardReel({
  usedCards,
  selected,
  onSelect,
  isSelectable,
  className = '',
}: SuitBasedCardReelProps) {
  const [activeSuitIndex, setActiveSuitIndex] = useState(0);

  const handleSuitActivate = useCallback((index: number) => {
    setActiveSuitIndex(index);
  }, []);

  return (
    <div className={`flex flex-col gap-0 ${className}`} style={{ maxHeight: '100%' }}>
      <style>{`.suit-reel-scroll::-webkit-scrollbar{display:none}`}</style>
      {SUITS.map((suit, suitIndex) => (
        <div key={suit.name} className="flex items-stretch shrink-0 min-h-0 flex-1">
          {/* スート固定（左）+ B15赤インジケーター */}
          <div className="w-10 shrink-0 flex items-center justify-center pr-1 border-r border-white/20 relative">
            <motion.span
              className={`text-xl font-black ${suit.colorClass}`}
              style={{
                animation: `suit-pulse 2.5s ease-in-out ${suitIndex * 0.4}s infinite`,
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: suitIndex * 0.05,
                type: 'spring',
                stiffness: 380,
                damping: 16,
              }}
            >
              {suit.symbol}
            </motion.span>
            {/* B15: アクティブスート赤インジケーター */}
            {activeSuitIndex === suitIndex ? (
              <motion.div
                layoutId="suit-indicator"
                className="absolute bottom-0 left-1 right-1 rounded"
                style={{ height: 3, background: '#D50000', transform: 'skewX(-5deg)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            ) : (
              <div
                className="absolute bottom-0 left-1 right-1 h-px bg-white/10 rounded"
                style={{ transform: 'skewX(-5deg)' }}
              />
            )}
          </div>

          {/* カードリール（横スクロールのみ） */}
          <div
            className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden scroll-inertia suit-reel-scroll"
            style={{
              scrollSnapType: 'x proximity',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            } as React.CSSProperties}
            onScroll={() => handleSuitActivate(suitIndex)}
          >
            <div className="flex gap-1 px-2 py-0 min-w-max h-full items-center">
              {RANKS.map((rank, rankIndex) => {
                const card = `${rank}${suit.symbol}`;
                const used = usedCards.includes(card);
                const isSelected = selected.includes(card);
                const selectable = isSelectable(card);

                return (
                  <motion.button
                    key={card}
                    type="button"
                    data-testid={`card-${card}`}
                    className="shrink-0 w-10 h-11 sm:w-11 sm:h-12 flex items-center justify-center font-black border-2 rounded-lg text-lg"
                    style={{
                      transform: 'skewX(-8deg)',
                      scrollSnapAlign: 'center',
                      background: isSelected
                        ? '#D50000'
                        : used
                        ? '#1a1a1a'
                        : selectable
                        ? '#000'
                        : '#0a0a0a',
                      borderColor: isSelected
                        ? '#fff'
                        : selectable
                        ? 'rgba(255,255,255,0.8)'
                        : 'rgba(255,255,255,0.3)',
                      color: isSelected ? '#fff' : selectable ? 'inherit' : '#666',
                    }}
                    initial={{ opacity: 0, scale: 0.85, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 380,
                      damping: 18,
                      delay: suitIndex * 0.05 + rankIndex * 0.015,
                    }}
                    whileTap={selectable ? { scale: 0.92, y: 2 } : {}}
                    whileHover={selectable ? { scale: 1.05 } : {}}
                    onClick={() => {
                      handleSuitActivate(suitIndex);
                      if (selectable) onSelect(card);
                    }}
                    disabled={!selectable && !isSelected}
                  >
                    {/* ランクのみ・スート色で区別（スートは左列にあるためカードには書かない） */}
                    <span className={isSelected ? 'text-white' : selectable ? suit.colorClass : 'text-gray-500'}>
                      {rank}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
