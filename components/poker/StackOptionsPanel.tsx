'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { Position, MentalState, PlayStyle } from '@/types/poker';
import { POKER_CONFIG } from '@/utils/pokerConfig';

const POSITIONS: Position[] = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];

interface StackOptionsPanelProps {
  positions: Position[];
  initialStacks: Map<Position, number>;
  playerAttributes: Map<Position, { mentalState: MentalState; playStyle: PlayStyle }>;
  onStackChange: (position: Position, stack: number) => void;
  onBulkStackChange: (stack: number) => void;
  onAttributeChange: (position: Position, mental: MentalState, style: PlayStyle) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function StackOptionsPanel({
  positions,
  initialStacks,
  playerAttributes,
  onStackChange,
  onBulkStackChange,
  onAttributeChange,
  onClose,
  isOpen,
}: StackOptionsPanelProps) {
  const [bulkStack, setBulkStack] = useState<number>(POKER_CONFIG.defaultStack);

  const handleBulkApply = () => {
    onBulkStackChange(bulkStack);
  };

  const handleResetToDefault = () => {
    setBulkStack(POKER_CONFIG.defaultStack);
    onBulkStackChange(POKER_CONFIG.defaultStack);
    positions.forEach((pos) => {
      onAttributeChange(pos, 'neutral', 'neutral');
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-gray-900 border-2 border-white rounded-lg z-50 max-h-[90dvh] overflow-hidden flex flex-col"
            style={{ transform: 'skewX(-3deg)' }}
            initial={{ opacity: 0, scale: 0.9, y: '-40%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%' }}
            exit={{ opacity: 0, scale: 0.9, y: '-40%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="bg-p5-red border-b-2 border-white p-4 flex justify-between items-center shrink-0">
              <h2 className="font-p5-en text-xl font-black text-white" style={{ transform: 'skewX(3deg)' }}>
                Table Options
              </h2>
              <button
                type="button"
                className="text-white text-2xl font-bold hover:text-gray-300"
                onClick={onClose}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ transform: 'skewX(3deg)' }}>
              {/* FEAT-3: Bulk Stack Control */}
              <div className="bg-gray-800 border border-white/20 rounded p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-white">Set All Stacks</span>
                  <span className="text-p5-red font-bold">{bulkStack} BB</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="300"
                  value={bulkStack}
                  onChange={(e) => setBulkStack(Number(e.target.value))}
                  className="w-full accent-p5-red"
                />
                <button
                  type="button"
                  className="w-full py-2 bg-p5-red text-white font-bold rounded hover:bg-red-700"
                  onClick={handleBulkApply}
                >
                  Apply to All
                </button>
              </div>

              {/* FEAT-1 + FEAT-2: Position Stack & Attributes List */}
              <div className="space-y-2">
                {positions.map((pos) => {
                  const stack = initialStacks.get(pos) ?? POKER_CONFIG.defaultStack;
                  const attrs = playerAttributes.get(pos) ?? { mentalState: 'neutral', playStyle: 'neutral' };

                  return (
                    <div
                      key={pos}
                      className="bg-gray-800 border border-white/20 rounded p-3 space-y-2"
                    >
                      {/* Position Label + Stack */}
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white w-12">{pos}</span>
                        <input
                          type="number"
                          min="1"
                          max="300"
                          value={stack}
                          onChange={(e) => onStackChange(pos, Number(e.target.value))}
                          className="flex-1 bg-gray-700 text-white font-bold px-2 py-1 rounded border border-white/20 text-sm"
                        />
                        <span className="text-white/60 text-sm">BB</span>
                      </div>

                      {/* Mental State */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/60 w-12">Mental</span>
                        <select
                          value={attrs.mentalState}
                          onChange={(e) =>
                            onAttributeChange(pos, e.target.value as MentalState, attrs.playStyle)
                          }
                          className="flex-1 bg-gray-700 text-white px-2 py-1 rounded border border-white/20 text-sm"
                        >
                          <option value="neutral">Neutral</option>
                          <option value="tilted">Tilted</option>
                        </select>
                      </div>

                      {/* Play Style */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/60 w-12">Style</span>
                        <select
                          value={attrs.playStyle}
                          onChange={(e) =>
                            onAttributeChange(pos, attrs.mentalState, e.target.value as PlayStyle)
                          }
                          className="flex-1 bg-gray-700 text-white px-2 py-1 rounded border border-white/20 text-sm"
                        >
                          <option value="neutral">N</option>
                          <option value="tp">TP</option>
                          <option value="tag">TAG</option>
                          <option value="lp">LP</option>
                          <option value="lag">LAG</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-800 border-t-2 border-white p-4 flex gap-2 shrink-0" style={{ transform: 'skewX(3deg)' }}>
              <button
                type="button"
                className="flex-1 py-2 bg-gray-700 text-white font-bold rounded hover:bg-gray-600"
                onClick={handleResetToDefault}
              >
                Reset to Default
              </button>
              <button
                type="button"
                className="flex-1 py-2 bg-p5-red text-white font-bold rounded hover:bg-red-700"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
