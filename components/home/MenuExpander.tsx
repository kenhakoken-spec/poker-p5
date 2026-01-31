'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const menuItems = [
  { label: '履歴', path: '/history' },
  { label: '設定', path: '/settings' },
  { label: '解析', path: '/analysis' },
];

// 右斜め30度を基準に、3つがずれて配置
const baseAngle = 30; // 基準角度
const angles = [baseAngle - 15, baseAngle, baseAngle + 15]; // ずれた角度
const radii = [140, 150, 145]; // 半径もずらす
const yOffsets = [-10, 0, 10]; // Yオフセットもずらす

export default function MenuExpander() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleMenuClick = (path: string) => {
    router.push(path);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-20 pointer-events-none">
      <div className="absolute inset-0 pointer-events-auto" onClick={handleToggle} onTouchStart={handleToggle} aria-label="Toggle menu" />
      {/* 狭幅対応: 閉じているときは右上に「メニュー」ヒント表示 */}
      {!isOpen && (
        <motion.div
          className="absolute top-2 right-2 sm:top-4 sm:right-4 z-30 pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-white/70 text-sm font-bold" style={{ transform: 'skewX(-5deg)' }}>
            タップでメニュー
          </span>
        </motion.div>
      )}
      {/* 中央の白いライン（視線誘導） */}
      <motion.div
        className="absolute w-1 h-full bg-white opacity-30 pointer-events-none"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* メニュー項目 */}
      {menuItems.map((item, i) => (
        <motion.div
          key={item.label}
          className="absolute"
          initial={{
            x: 0,
            y: 0,
            opacity: 0,
            rotate: 0,
            scale: 0,
          }}
          animate={
            isOpen
              ? {
                  x: Math.cos((angles[i] * Math.PI) / 180) * radii[i],
                  y: Math.sin((angles[i] * Math.PI) / 180) * radii[i] + yOffsets[i],
                  opacity: 1,
                  rotate: angles[i],
                  scale: 1,
                }
              : {
                  x: 0,
                  y: 0,
                  opacity: 0,
                  rotate: 0,
                  scale: 0,
                }
          }
          transition={{
            delay: i * 0.03, // stagger効果
            type: 'spring',
            stiffness: 200,
            damping: 15,
          }}
          style={{
            transformOrigin: 'center center',
          }}
        >
          <motion.button
            className="px-6 py-3 sm:px-8 sm:py-4 bg-black border-2 border-white text-white font-bold text-lg sm:text-xl polygon-button pointer-events-auto"
            style={{ transform: 'skewX(-7deg)' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => handleMenuClick(item.path)}
          >
            {item.label}
          </motion.button>
        </motion.div>
      ))}
    </div>
  );
}
