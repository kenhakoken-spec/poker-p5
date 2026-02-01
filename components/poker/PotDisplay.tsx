'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useHand } from '@/contexts/HandContext';
import { getPotBeforeStreet, getPotIncreaseThisStreet } from '@/utils/potUtils';
import { useRef, useEffect, useState } from 'react';

interface PotDisplayProps {
  compact?: boolean;
}

export default function PotDisplay({ compact }: PotDisplayProps) {
  const { gameState } = useHand();
  const [popKey, setPopKey] = useState(0);
  const prevPot = useRef(0);

  const street = gameState?.street ?? 'preflop';
  const actions = gameState?.actions ?? [];
  const total = gameState?.pot ?? 0;
  const isPostflop = street !== 'preflop';
  const before = isPostflop ? getPotBeforeStreet(actions, street) : 0;
  const thisStreet = isPostflop ? getPotIncreaseThisStreet(actions, street) : 0;
  const sidePots = gameState?.sidePots;

  // Pot変動検出でスケールポップ
  useEffect(() => {
    if (total !== prevPot.current) {
      setPopKey((k) => k + 1);
      prevPot.current = total;
    }
  }, [total]);

  if (!gameState) return null;

  return (
    <motion.div
      className={`text-center ${compact ? 'p-1' : 'p-3'} relative`}
      animate={{
        scale: [1, 1.02, 1],
        opacity: [0.9, 1, 0.9],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {/* 背景アクセントライン */}
      {!compact && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ opacity: 0.08 }}
        >
          <div
            className="absolute w-full h-0.5 bg-p5-red top-1/3"
            style={{ transform: 'skewY(-3deg)' }}
          />
          <div
            className="absolute w-full h-0.5 bg-p5-red top-2/3"
            style={{ transform: 'skewY(3deg)' }}
          />
        </div>
      )}

      <AnimatePresence mode="popLayout">
        <motion.p
          key={popKey}
          className={`font-p5-en font-black text-white glow-red-text ${compact ? 'text-2xl sm:text-3xl' : 'text-4xl sm:text-6xl'}`}
          style={{ transform: 'skewX(-5deg)' }}
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          POT: {total.toFixed(1)} BB
        </motion.p>
      </AnimatePresence>

      {/* サイドポット表示 */}
      {!compact && sidePots && sidePots.length > 1 && (
        <div className="mt-2 space-y-1">
          {sidePots.map((pot, i) => (
            <motion.div
              key={i}
              className="text-xs font-bold glow-red-text"
              style={{ transform: 'skewX(-5deg)' }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <span className="font-p5-en text-p5-red">
                {i === 0 ? 'MAIN' : `SIDE ${i}`}
              </span>
              <span className="text-white ml-2">{pot.amount.toFixed(1)} BB</span>
              <span className="text-gray-400 ml-1">({pot.eligiblePositions.join(', ')})</span>
            </motion.div>
          ))}
        </div>
      )}

      {!compact && isPostflop && (before > 0 || thisStreet > 0) && (
        <p className="font-p5-en text-sm text-gray-400 mt-0.5" style={{ transform: 'skewX(-5deg)' }}>
          (prev: {before.toFixed(1)} + street: {thisStreet.toFixed(1)})
        </p>
      )}
      {!compact && (
        <p className="font-p5-en text-xl text-gray-400 mt-2 glow-red-text" style={{ transform: 'skewX(-5deg)' }}>
          {street.toUpperCase()}
        </p>
      )}
    </motion.div>
  );
}
