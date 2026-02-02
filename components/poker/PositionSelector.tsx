'use client';

import { motion } from 'framer-motion';
import type { Position } from '@/types/poker';

const POSITION_META: { position: Position; sub: string; clipPath: string; skew: number; accent: 'red' | 'white' }[] = [
  { position: 'UTG', sub: 'First Fire', clipPath: 'polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%)', skew: -12, accent: 'red' },
  { position: 'MP', sub: 'Middle Will', clipPath: 'polygon(0% 0%, 92% 0%, 100% 100%, 8% 100%)', skew: 8, accent: 'white' },
  { position: 'CO', sub: 'Hijack', clipPath: 'polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)', skew: -10, accent: 'red' },
  { position: 'BTN', sub: 'The Throne', clipPath: 'polygon(0% 5%, 95% 0%, 100% 95%, 5% 100%)', skew: -7, accent: 'red' },
  { position: 'SB', sub: 'Small Blind', clipPath: 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)', skew: -14, accent: 'white' },
  { position: 'BB', sub: 'Big Blind', clipPath: 'polygon(0% 0%, 90% 0%, 100% 100%, 10% 100%)', skew: 10, accent: 'red' },
];

interface PositionSelectorProps {
  onSelect: (position: Position) => void;
  selected?: Position;
  allowedPositions?: Position[];
  stacks?: { position: string; stack: number }[];
}

export default function PositionSelector({ onSelect, selected, allowedPositions, stacks }: PositionSelectorProps) {
  const isAllowed = (pos: Position) =>
    allowedPositions === undefined ? true : allowedPositions.includes(pos);

  const getStack = (pos: Position) => stacks?.find(s => s.position === pos)?.stack;

  return (
    <div className="flex flex-col items-center gap-3 sm:gap-4 p-3 sm:p-4 w-full max-w-md mx-auto">
      <motion.div
        className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white opacity-20 -translate-x-1/2 pointer-events-none"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.4 }}
        style={{ transformOrigin: 'center top' }}
      />
      {POSITION_META.map(({ position, clipPath, skew, accent }, index) => {
        const isSelected = selected === position;
        const allowed = isAllowed(position);
        const stackValue = getStack(position);
        return (
          <div key={position} className="flex items-center w-full gap-3">
            <motion.button
              type="button"
              className={`relative flex-1 px-5 py-4 sm:px-6 sm:py-5 font-black border-2 flex items-center justify-center min-h-[3.5rem] sm:min-h-[4rem] ${
                isSelected ? 'bg-p5-red border-white text-white glow-red-intense' : allowed ? 'bg-black border-white text-white hover:bg-gray-900 glow-red-pulse' : 'bg-gray-900/80 border-gray-600 text-gray-500 cursor-not-allowed'
              } ${accent === 'red' && !isSelected && allowed ? 'border-p5-red/50' : ''}`}
              style={{
                clipPath,
                transform: `skewX(${skew}deg)`,
              }}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20, rotate: index % 2 === 0 ? -3 : 3 }}
              animate={
                allowed && !isSelected
                  ? {
                      opacity: 1,
                      x: 0,
                      rotate: 0,
                      scale: [1, 1.02, 1],
                      borderColor: ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0.5)'],
                    }
                  : { opacity: 1, x: 0, rotate: 0 }
              }
              transition={
                allowed && !isSelected
                  ? {
                      opacity: { delay: index * 0.03, type: 'spring', stiffness: 180, damping: 14 },
                      x: { delay: index * 0.03, type: 'spring', stiffness: 180, damping: 14 },
                      rotate: { delay: index * 0.03, type: 'spring', stiffness: 180, damping: 14 },
                      scale: { duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 },
                      borderColor: { duration: 2, repeat: Infinity, ease: 'easeInOut', delay: index * 0.2 },
                    }
                  : { delay: index * 0.03, type: 'spring', stiffness: 180, damping: 14 }
              }
              whileHover={allowed ? { scale: 1.02, x: 2, borderColor: 'rgba(255,255,255,0.8)' } : {}}
              whileTap={allowed ? { scale: 0.92 } : {}}
              onClick={() => allowed && onSelect(position)}
              disabled={!allowed}
            >
              <span className="font-p5-en text-xl sm:text-2xl tracking-tight">{position}</span>
            </motion.button>
            {stackValue !== undefined && (
              <span
                className={`font-p5-en text-sm whitespace-nowrap shrink-0 min-w-[3.5rem] text-right ${
                  isSelected ? 'text-white/70' : 'text-gray-500'
                }`}
                style={{ transform: 'skewX(-5deg)' }}
              >
                {stackValue}<span className={`text-xs ml-0.5 ${isSelected ? 'text-white/50' : 'text-gray-600'}`}>BB</span>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
