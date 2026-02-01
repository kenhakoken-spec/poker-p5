'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import SuitBasedCardReel from './SuitBasedCardReel';

function getSuitColorClass(card: string): string {
  const s = card.slice(-1);
  if (s === '♥') return 'text-p5-red';
  if (s === '♦') return 'text-amber-400';
  if (s === '♣') return 'text-slate-400';
  return 'text-white';
}

type StreetBoard = 'flop' | 'turn' | 'river';

interface BoardSelectorProps {
  street: StreetBoard;
  count: number; // flop=3, turn=1, river=1
  usedCards: string[]; // 既に使ったカード（ホール＋既出ボード）
  previousBoard?: string[]; // 前ストリートのボードカード（ターン/リバー時に表示）
  onConfirm: (cards: string[]) => void;
}

export default function BoardSelector({ street, count, usedCards, previousBoard = [], onConfirm }: BoardSelectorProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const handleTap = (card: string) => {
    // BUG-6: 使用済みカードの選択を防止
    if (usedCards.includes(card)) return;
    if (selected.includes(card)) {
      setSelected(selected.filter((c) => c !== card));
      return;
    }
    if (selected.length >= count) return;
    setSelected([...selected, card]);
  };

  const label = street === 'flop' ? 'Flop (3 cards)' : street === 'turn' ? 'Turn (1 card)' : 'River (1 card)';

  return (
    <div className="flex flex-col h-full overflow-hidden flex-1 min-h-0">
      <div className="shrink-0 px-3 pt-2 pb-1 border-b border-white/20">
        <motion.h2 className="text-base font-black" style={{ transform: 'skewX(-7deg)' }}>
          Select {label}
        </motion.h2>
      </div>

      {/* 前ストリートのボードカード表示（ターン/リバー時） */}
      {previousBoard.length > 0 && (
        <div className="shrink-0 px-3 py-2 border-b border-white/10">
          <p className="text-[10px] text-gray-400 mb-1">Previous Board:</p>
          <div className="flex justify-center gap-2">
            {previousBoard.map((c, i) => (
              <motion.span
                key={c}
                className={`px-2 py-1 bg-gray-800 font-black text-sm rounded border border-white/30 ${getSuitColorClass(c)}`}
                style={{ transform: 'skewX(-8deg)' }}
                initial={{ opacity: 0, scale: 0.6, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
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
        </div>
      )}

      {/* 今回選択したカード表示 — B14: 3Dフリップ */}
      <div className="shrink-0 flex justify-center gap-2 py-1 min-h-[4rem]" style={{ perspective: '800px' }}>
        {selected.map((c, i) => (
          <motion.div
            key={c}
            className="w-[44px] min-h-[66px] relative"
            style={{
              transform: 'skewX(-8deg)',
              aspectRatio: '2/3',
              animation: `idle-breathe 3s ease-in-out ${i * 0.3}s infinite`,
            }}
            layoutId={c}
            initial={{ opacity: 0, scale: 0.5, y: 15 }}
            animate={{ opacity: 1, scale: 1.1, y: 0, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 16,
              delay: i * 0.06,
            }}
          >
            <motion.div
              className="w-full h-full relative"
              style={{ transformStyle: 'preserve-3d' }}
              initial={{ rotateY: 0 }}
              animate={{ rotateY: 180 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.06 + 0.1 }}
            >
              <div
                className="absolute inset-0 flex items-center justify-center bg-p5-red rounded-lg border-2 border-white shadow-lg"
                style={{ backfaceVisibility: 'hidden' }}
              />
              <div
                className={`absolute inset-0 flex items-center justify-center bg-gray-800 font-black text-base rounded-lg border-2 border-white shadow-lg ${getSuitColorClass(c)}`}
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                {c}
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* スート縦並びリール */}
      <div className="flex-1 min-h-0 flex flex-col">
        <SuitBasedCardReel
          usedCards={usedCards}
          selected={selected}
          onSelect={handleTap}
          isSelectable={(card) => !usedCards.includes(card) && (selected.includes(card) || selected.length < count)}
          className="flex-1 min-h-0 overflow-y-auto"
        />
      </div>

      {/* 確定ボタン — BUG-5: 視覚的disabled表示 */}
      <motion.button
        className={`shrink-0 mt-2 py-4 font-black polygon-button w-full ${
          selected.length === count
            ? 'bg-p5-red text-white'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
        style={{ transform: 'skewX(-7deg)' }}
        disabled={selected.length !== count}
        whileTap={selected.length === count ? { scale: 0.95 } : undefined}
        onClick={() => selected.length === count && onConfirm(selected)}
      >
        Confirm ({selected.length}/{count})
      </motion.button>
    </div>
  );
}
