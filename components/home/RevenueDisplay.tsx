'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { loadHistory } from '@/utils/storage';

export default function RevenueDisplay() {
  const [winRate, setWinRate] = useState<number | null>(null);
  const [recordCount, setRecordCount] = useState(0);

  useEffect(() => {
    // ヒストリーから勝率と記録数を計算
    const history = loadHistory();
    setRecordCount(history.length);
    
    if (history.length === 0) {
      setWinRate(null);
      return;
    }
    
    const handsWithResult = history.filter(h => h.result);
    if (handsWithResult.length === 0) {
      setWinRate(null);
      return;
    }
    
    const wins = handsWithResult.filter(h => h.result?.won).length;
    const winRateValue = (wins / handsWithResult.length) * 100;
    setWinRate(winRateValue);
  }, []);

  return (
    <>
      {/* 狭幅対応: 勝率・記録数を上段にまとめ、縦スクロールなしで収める */}
      <motion.div
        className="fixed left-1/2 z-10 pointer-events-none flex flex-col items-center gap-0"
        style={{
          top: 'clamp(0.5rem, 5vh, 2rem)',
          transform: 'translateX(-50%)',
          maxWidth: '95vw',
        }}
      >
        {winRate !== null && (
          <motion.span
            style={{
              fontSize: 'clamp(2.5rem, 12vw, 150px)',
              fontWeight: 900,
              color: '#FFFFFF',
              mixBlendMode: 'difference',
              textShadow: '0 0 20px rgba(213, 0, 0, 0.5)',
              whiteSpace: 'nowrap',
              lineHeight: 1.1,
            }}
            animate={{ scale: [1, 1.03, 1], opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            勝率 {winRate.toFixed(1)}%
          </motion.span>
        )}
        <motion.span
          style={{
            fontSize: 'clamp(1.75rem, 8vw, 120px)',
            fontWeight: 900,
            color: '#FFFFFF',
            mixBlendMode: 'difference',
            textShadow: '0 0 20px rgba(213, 0, 0, 0.5)',
            whiteSpace: 'nowrap',
            lineHeight: 1.1,
          }}
          animate={{ scale: [1, 1.02, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          記録 {recordCount} ハンド
        </motion.span>
      </motion.div>
    </>
  );
}
