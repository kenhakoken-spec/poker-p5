'use client';

import { motion } from 'framer-motion';
import ParticleBackground from '@/components/home/ParticleBackground';
import RevenueDisplay from '@/components/home/RevenueDisplay';
import MenuExpander from '@/components/home/MenuExpander';
import Link from 'next/link';

export default function Home() {
  return (
    <main
      className="relative w-full overflow-x-hidden overflow-y-hidden"
      style={{
        minHeight: '100dvh',
        maxHeight: '100dvh',
        background: 'transparent',
      }}
    >
      {/* 背景パーティクル */}
      <ParticleBackground />

      {/* 収支表示（狭幅でも全要素が見える配置） */}
      <RevenueDisplay />

      {/* 扇状展開メニュー */}
      <MenuExpander />

      {/* 記録開始ボタン（中央下・狭幅でも必ず表示） */}
      <motion.div
        className="fixed left-1/2 z-30 flex justify-center"
        style={{
          bottom: 'min(2rem, 5vh)',
          transform: 'translateX(-50%)',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Link href="/record">
          <motion.button
            className="px-8 py-4 sm:px-12 sm:py-6 bg-p5-red text-white font-bold text-xl sm:text-2xl polygon-button"
            style={{ transform: 'skewX(-7deg)' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
          >
            記録開始
          </motion.button>
        </Link>
      </motion.div>
    </main>
  );
}
