'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  size: number;
  shape: 'star' | 'fragment';
  color: string;
}

export default function ParticleBackground() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // 80個のパーティクルを生成（増やして動きを強調）
    const newParticles: Particle[] = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      angle: Math.random() * 360,
      speed: 0.5 + Math.random() * 0.8,
      size: 6 + Math.random() * 12, // サイズを大きく
      shape: Math.random() > 0.4 ? 'star' : 'fragment', // 星型を多めに
      color: Math.random() > 0.3 ? '#D50000' : '#FFFFFF', // 赤を多めに
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute ${
            particle.shape === 'star' ? 'star-shape' : 'fragment-shape'
          }`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
          }}
          animate={{
            x: [
              0,
              Math.cos((particle.angle * Math.PI) / 180) * 200,
              Math.cos((particle.angle * Math.PI) / 180) * 400,
            ],
            y: [
              0,
              Math.sin((particle.angle * Math.PI) / 180) * 200,
              Math.sin((particle.angle * Math.PI) / 180) * 400,
            ],
            rotate: [0, 360, 720],
            opacity: [0.4, 0.9, 0.4], // より見やすく
            scale: [1, 1.2, 1], // 脈動を追加
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}
