'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadHistory, saveHistory } from '@/utils/storage';
import { generateHandExport } from '@/utils/gemini';
import { calculateCurrentPot } from '@/utils/potUtils';
import type { Hand, ActionRecord } from '@/types/poker';

const STREET_ORDER = ['preflop', 'flop', 'turn', 'river'] as const;

function formatAction(a: ActionRecord): string {
  let s = `${a.position} ${a.action}`;
  if (a.size) {
    if (a.size.type === 'bet-relative') s += ` ${a.size.value}x`;
    else s += ` ${a.size.value}pot`;
  }
  return s;
}

function groupByStreet(actions: ActionRecord[]) {
  const groups: Partial<Record<string, ActionRecord[]>> = {};
  for (const a of actions) {
    if (!groups[a.street]) groups[a.street] = [];
    groups[a.street]!.push(a);
  }
  return groups;
}

const SUIT_MAP: Record<string, { symbol: string; color: string }> = {
  s: { symbol: '♠', color: '#d1d5db' },
  h: { symbol: '♥', color: '#ef4444' },
  d: { symbol: '♦', color: '#ef4444' },
  c: { symbol: '♣', color: '#d1d5db' },
  '♠': { symbol: '♠', color: '#d1d5db' },
  '♥': { symbol: '♥', color: '#ef4444' },
  '♦': { symbol: '♦', color: '#ef4444' },
  '♣': { symbol: '♣', color: '#d1d5db' },
};

function CardText({ card, hero }: { card: string; hero?: boolean }) {
  const rank = card.slice(0, -1);
  const suitChar = card.slice(-1).toLowerCase();
  const suit = SUIT_MAP[suitChar] ?? SUIT_MAP[card.slice(-1)];
  if (!suit) return <span>{card}</span>;
  return (
    <span style={{ fontWeight: hero ? 700 : 400 }}>
      <span style={{ color: hero ? '#ffffff' : '#9ca3af' }}>{rank}</span>
      <span style={{ color: suit.color }}>{suit.symbol}</span>
    </span>
  );
}

export default function HistoryContent({ isActive }: { isActive?: boolean }) {
  const [history, setHistory] = useState<Hand[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterFav, setFilterFav] = useState(false);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [memoText, setMemoText] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // BUG-27: navigator.share availability check (client-side only)
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  // BUG-13: isActive prop変更時にlocalStorageから再読み込み
  useEffect(() => {
    if (isActive) setHistory(loadHistory());
  }, [isActive]);

  const sorted = [...history].sort((a, b) => b.date - a.date);
  const filtered = filterFav ? sorted.filter(h => h.favorite) : sorted;

  const updateHand = (id: string, updates: Partial<Hand>) => {
    setHistory(prev => {
      const next = prev.map(h => h.id === id ? { ...h, ...updates } : h);
      saveHistory(next);
      return next;
    });
  };

  const toggleFavorite = (id: string) => {
    const hand = history.find(h => h.id === id);
    if (hand) updateHand(id, { favorite: !hand.favorite });
  };

  const deleteHand = (id: string) => {
    setHistory(prev => {
      const next = prev.filter(h => h.id !== id);
      saveHistory(next);
      return next;
    });
    if (expandedId === id) setExpandedId(null);
  };

  const startEditMemo = (hand: Hand) => {
    setEditingMemoId(hand.id);
    setMemoText(hand.memo || '');
  };

  const saveMemo = (id: string) => {
    updateHand(id, { memo: memoText || undefined });
    setEditingMemoId(null);
  };

  // BUG-18: 同期的コピー処理（非同期API一切不使用）
  const handleSelectAndCopy = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.select();
    try {
      const ok = document.execCommand('copy');
      if (ok) {
        setToast('Copied! Paste in Gemini to analyze');
        setTimeout(() => setToast(null), 3000);
        return;
      }
    } catch { /* ignore */ }
    setToast('Text selected — long press to copy');
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-6">
      <div className="max-w-lg mx-auto">
        <h1
          className="font-p5-en text-3xl sm:text-5xl font-black mb-4 sm:mb-6"
          style={{ transform: 'skewX(-7deg)' }}
        >
          History
        </h1>

        {/* Controls */}
        <div className="flex items-center gap-2 mb-4">
          {history.length > 0 && (
            <div className="flex flex-row gap-1.5">
              <a
                href="intent://gemini.google.com/app#Intent;scheme=https;package=com.google.android.apps.bard;end"
                className="inline-flex items-center px-2.5 py-1.5 bg-p5-red text-white font-bold text-xs border border-white/30 font-p5-en"
                style={{ clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}
              >
                Gemini App
              </a>
              <a
                href="https://gemini.google.com/app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2.5 py-1.5 bg-black text-white font-bold text-xs border border-white/30 font-p5-en"
                style={{ clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}
              >
                Gemini Web
              </a>
              {canShare && (
                <button
                  type="button"
                  className="px-2.5 py-1.5 bg-black text-white font-bold text-xs border border-white/30 font-p5-en"
                  style={{ clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}
                  onClick={() => navigator.share({ title: 'Poker Hands', url: 'https://gemini.google.com/app' }).catch(() => {})}
                >
                  Share
                </button>
              )}
            </div>
          )}
          <motion.button
            className={`px-4 py-1.5 font-bold text-xs border ${
              filterFav
                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                : 'bg-black border-white/30 text-gray-400'
            }`}
            style={{ clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setFilterFav(f => !f)}
          >
            {filterFav ? '★ Favorites' : '☆ Favorites'}
          </motion.button>
          <span className="text-xs text-gray-600 ml-auto">
            {filtered.length} hands
          </span>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">
            {filterFav ? 'No favorites yet' : 'No hands recorded'}
          </p>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((hand, index) => {
              const pot = calculateCurrentPot(hand.actions);
              const isExpanded = expandedId === hand.id;
              const isEditingMemo = editingMemoId === hand.id;
              const dateStr = new Date(hand.date).toLocaleString('en-US', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              });
              const streets = groupByStreet(hand.actions);

              return (
                <motion.div
                  key={hand.id}
                  className="border border-white/15 bg-black/80 overflow-hidden"
                  style={{ clipPath: 'polygon(1.5% 0%, 100% 0%, 98.5% 100%, 0% 100%)' }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  {/* Summary section */}
                  <div
                    className="px-3 py-2 cursor-pointer select-none hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedId(prev => prev === hand.id ? null : hand.id)}
                  >
                    {/* Line 1: core info + cards */}
                    <div className="flex items-center gap-1.5">
                      {/* Favorite */}
                      <button
                        className={`text-base shrink-0 ${hand.favorite ? 'text-yellow-400' : 'text-gray-700 hover:text-gray-500'}`}
                        onClick={e => { e.stopPropagation(); toggleFavorite(hand.id); }}
                      >
                        {hand.favorite ? '★' : '☆'}
                      </button>

                      {/* Position */}
                      <span className="font-p5-en text-xs font-bold shrink-0 text-white/80">
                        {hand.heroPosition ?? '—'}
                      </span>

                      {/* Result */}
                      {hand.result && (
                        <span
                          className={`font-p5-en text-xs font-black shrink-0 ${
                            hand.result.won ? 'text-p5-red' : 'text-gray-400'
                          }`}
                        >
                          {hand.result.won ? '+' : ''}{hand.result.amount}BB
                        </span>
                      )}

                      {/* Hero Hand */}
                      {hand.heroHand && hand.heroHand.length > 0 && (
                        <span className="shrink-0 text-xs flex items-center">
                          {hand.heroHand.map((c, i) => <CardText key={i} card={c} hero />)}
                        </span>
                      )}

                      {/* Separator */}
                      {(hand.heroHand && hand.heroHand.length > 0 && hand.board && hand.board.length > 0) && (
                        <span className="text-gray-600 text-[10px] shrink-0">|</span>
                      )}

                      {/* Board */}
                      {hand.board && hand.board.length > 0 ? (
                        <span className="shrink-0 text-[11px] flex items-center min-w-0">
                          {hand.board.map((c, i) => <CardText key={i} card={c} />)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-600 shrink-0 italic">No board</span>
                      )}

                      {/* Spacer */}
                      <span className="flex-1 min-w-0" />

                      {/* Delete */}
                      <button
                        className="text-red-600/50 hover:text-red-400 text-sm shrink-0 px-1"
                        onClick={e => { e.stopPropagation(); deleteHand(hand.id); }}
                      >
                        ×
                      </button>

                      {/* Expand indicator */}
                      <span
                        className={`text-gray-600 text-[10px] shrink-0 transition-transform duration-200 ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      >
                        ▶
                      </span>
                    </div>

                    {/* Line 2: date, pot, memo preview */}
                    <div className="flex items-center gap-1.5 pl-7 mt-0.5">
                      <span className="text-[10px] text-gray-600 shrink-0 tabular-nums">{dateStr}</span>
                      <span className="text-[10px] text-gray-700 shrink-0">{pot}BB</span>
                      {hand.memo && (
                        <span className="text-[10px] text-gray-500 truncate min-w-0 flex-1">
                          📝 {hand.memo}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 pt-1.5 border-t border-white/10 space-y-2">
                          {/* Actions by street */}
                          {STREET_ORDER.map(st => {
                            const acts = streets[st];
                            if (!acts || acts.length === 0) return null;
                            return (
                              <div key={st}>
                                <div className="font-p5-en text-[10px] text-p5-red font-bold uppercase tracking-wider">
                                  {st}
                                </div>
                                <div className="text-xs text-gray-300 leading-relaxed">
                                  {acts.map(formatAction).join(' → ')}
                                </div>
                              </div>
                            );
                          })}

                          {/* Memo section */}
                          {isEditingMemo ? (
                            <div className="space-y-1.5">
                              <textarea
                                className="w-full bg-gray-900 border border-white/20 text-white text-xs p-2 rounded resize-none focus:outline-none focus:border-p5-red"
                                rows={3}
                                value={memoText}
                                onChange={e => setMemoText(e.target.value)}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button
                                  className="font-p5-en text-xs text-p5-red font-bold hover:underline"
                                  onClick={() => saveMemo(hand.id)}
                                >
                                  Save
                                </button>
                                <button
                                  className="text-xs text-gray-500 hover:text-gray-300"
                                  onClick={() => setEditingMemoId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {hand.memo && (
                                <p className="text-xs text-gray-400 italic">📝 {hand.memo}</p>
                              )}
                              <button
                                className="text-[11px] text-gray-600 hover:text-white transition-colors"
                                onClick={() => startEditMemo(hand)}
                              >
                                {hand.memo ? 'Edit memo' : '+ Add memo'}
                              </button>
                            </div>
                          )}

                          {/* BUG-18: Hand export textarea (always visible) + sync copy + <a> link */}
                          <div className="space-y-1.5">
                            <textarea
                              ref={textareaRef}
                              className="w-full bg-black border border-white/20 text-white text-[10px] p-2 rounded resize-none focus:outline-none font-mono"
                              rows={5}
                              readOnly
                              value={generateHandExport(hand)}
                            />
                            <div className="flex gap-2">
                              <motion.button
                                type="button"
                                className="px-3 py-1.5 bg-p5-red text-white font-bold text-xs border border-white/30"
                                style={{ clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSelectAndCopy}
                              >
                                <span className="font-p5-en">Select All &amp; Copy</span>
                              </motion.button>
                              <a
                                href="intent://gemini.google.com/app#Intent;scheme=https;package=com.google.android.apps.bard;end"
                                className="inline-flex items-center px-2.5 py-1.5 bg-p5-red text-white font-bold text-xs border border-white/30 font-p5-en"
                                style={{ clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}
                              >
                                App
                              </a>
                              <a
                                href="https://gemini.google.com/app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-2.5 py-1.5 bg-black text-white font-bold text-xs border border-white/30 font-p5-en"
                                style={{ clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}
                              >
                                Web
                              </a>
                              {canShare && (
                                <button
                                  type="button"
                                  className="px-2.5 py-1.5 bg-black text-white font-bold text-xs border border-white/30 font-p5-en"
                                  style={{ clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}
                                  onClick={() => navigator.share({ title: 'Poker Hand', text: generateHandExport(hand) }).catch(() => {})}
                                >
                                  Share
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed bottom-6 left-1/2 z-50 px-6 py-3 bg-p5-red text-white font-bold text-sm border border-white/30"
            style={{ clipPath: 'polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%)', transform: 'translateX(-50%)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <span className="font-p5-en">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
