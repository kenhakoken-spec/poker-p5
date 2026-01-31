'use client';

import { motion } from 'framer-motion';
import { useHand } from '@/contexts/HandContext';
import type { ActionRecord } from '@/types/poker';

function actionLabel(a: ActionRecord): string {
  if (a.action === 'fold') return `${a.position} FOLD`;
  if (a.action === 'check') return `${a.position} CHECK`;
  if (a.action === 'call') return `${a.position} CALL`;
  if (a.action === 'bet' && a.size?.amount) return `${a.position} BET ${a.size.amount}BB`;
  if (a.action === 'raise' && a.size?.amount) return `${a.position} RAISE ${a.size.amount}BB`;
  if (a.action === 'all-in') return `${a.position} ALL-IN`;
  return `${a.position} ${a.action.toUpperCase()}`;
}

const MAX_ITEMS = 5;

export default function ActionHistory() {
  const { gameState } = useHand();
  if (!gameState || gameState.actions.length === 0) return null;

  const recent = gameState.actions.slice(-MAX_ITEMS);

  return (
    <ul className="space-y-0 text-[10px] sm:text-xs">
      {recent.map((a, i) => (
        <motion.li
          key={`${a.position}-${a.street}-${a.timestamp}-${i}`}
          className="text-gray-400 font-p5-en font-bold"
          style={{ transform: 'skewX(-3deg)' }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
        >
          {actionLabel(a)}
        </motion.li>
      ))}
    </ul>
  );
}
