'use client';

import { motion } from 'framer-motion';
import { useRef, useEffect } from 'react';

interface CardReelProps {
  cards: string[];
  usedCards: string[];
  selectableCount: number; // 1枚目用=1, 2枚目用=1 など、今何枚選ぶか
  selected: string[];
  onSelect: (card: string) => void;
  /** 選択可能か（1枚目なら全カード、2枚目なら used 以外） */
  isSelectable: (card: string) => boolean;
  className?: string;
}

/** P5風リール: 横スクロールで大きなカードを表示 */
export default function CardReel({
  cards,
  usedCards,
  selectableCount,
  selected,
  onSelect,
  isSelectable,
  className = '',
}: CardReelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden scroll-inertia"
        style={{ scrollSnapType: 'x proximity', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex gap-3 px-4 py-3 min-w-max" style={{ scrollSnapAlign: 'start' }}>
          {cards.map((card, index) => {
            const used = usedCards.includes(card);
            const selected_ = selected.includes(card);
            const selectable = isSelectable(card);
            return (
              <motion.button
                key={card}
                type="button"
                className="shrink-0 w-14 h-20 sm:w-16 sm:h-24 flex items-center justify-center font-black text-sm sm:text-base border-2 rounded-lg scroll-snap-align-start"
                style={{
                  transform: 'skewX(-8deg)',
                  scrollSnapAlign: 'center',
                  background: selected_ ? '#D50000' : used ? '#1a1a1a' : selectable ? '#000' : '#0a0a0a',
                  borderColor: selected_ ? '#fff' : selectable ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
                  color: selected_ || selectable ? '#fff' : '#666',
                }}
                initial={{ opacity: 0, scale: 0.85, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 380,
                  damping: 18,
                  delay: index * 0.02,
                }}
                whileTap={selectable ? { scale: 0.92, y: 2 } : {}}
                whileHover={selectable ? { scale: 1.05 } : {}}
                onClick={() => selectable && onSelect(card)}
                disabled={!selectable && !selected_}
              >
                {card}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
