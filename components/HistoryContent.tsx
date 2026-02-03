'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadHistory, saveHistory } from '@/utils/storage';
import { generateHandExport, generateBatchExport, type GeminiPersonality, GEMINI_PROMPTS } from '@/utils/gemini';
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
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // FEAT: Gemini personality selection
  const [personality, setPersonality] = useState<GeminiPersonality>('neutral');
  // FEAT: Batch selection for multiple hands
  const [selectedHands, setSelectedHands] = useState<Set<string>>(new Set());

  useEffect(() => {
    setHistory(loadHistory());
    // Z6-9: OS detection for Gemini link
    const ua = navigator.userAgent;
    setIsAndroid(/android/i.test(ua));
    setIsIOS(/iphone|ipad|ipod/i.test(ua));
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

  // Z6-9: Modern clipboard API with fallback
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast('Copied! Paste in Gemini to analyze');
      setTimeout(() => setToast(null), 3000);
    } catch {
      // Fallback: execCommand
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        const ok = document.execCommand('copy');
        if (ok) {
          setToast('Copied! Paste in Gemini to analyze');
          setTimeout(() => setToast(null), 3000);
        } else {
          setToast('Failed to copy');
          setTimeout(() => setToast(null), 3000);
        }
      } catch {
        setToast('Failed to copy');
        setTimeout(() => setToast(null), 3000);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  // FEAT: Toggle hand selection for batch operations
  const toggleHandSelection = (handId: string) => {
    setSelectedHands(prev => {
      const next = new Set(prev);
      if (next.has(handId)) {
        next.delete(handId);
      } else {
        next.add(handId);
      }
      return next;
    });
  };

  // FEAT: Clear all selections
  const clearAllSelections = () => {
    setSelectedHands(new Set());
  };

  // FEAT: Copy all selected hands
  const handleCopyAll = async () => {
    const selected = history.filter(h => selectedHands.has(h.id));
    if (selected.length === 0) return;
    const batchText = generateBatchExport(selected, personality);
    await handleCopy(batchText);
  };

  return (
    <main className="h-full overflow-y-auto scroll-smooth history-scroll bg-black text-white p-4 sm:p-6" data-testid="history-container">
      <div className="max-w-lg mx-auto">
        <h1
          className="font-p5-en text-3xl sm:text-5xl font-black mb-4 sm:mb-6"
          style={{ transform: 'skewX(-7deg)' }}
        >
          History
        </h1>

        {/* Controls */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
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
            <svg viewBox="0 0 16 16" className="w-3 h-3 inline-block mr-1" fill="currentColor">
              <path d="M1 2h14l-5 6v5l-4 2V8z"/>
            </svg>
            {filterFav ? '★ Favorites' : '☆ Favorites'}
          </motion.button>

          {/* FEAT: Gemini personality dropdown */}
          <div className="relative">
            <select
              value={personality}
              onChange={(e) => setPersonality(e.target.value as GeminiPersonality)}
              className="px-3 py-1.5 bg-gray-800/90 border border-white/20 text-white text-xs font-bold appearance-none pr-8 cursor-pointer hover:bg-gray-700/90 transition-colors focus:outline-none focus:border-p5-red"
              style={{ clipPath: 'polygon(2% 0%, 100% 0%, 98% 100%, 0% 100%)' }}
            >
              {(Object.keys(GEMINI_PROMPTS) as GeminiPersonality[]).map(key => (
                <option key={key} value={key}>
                  {GEMINI_PROMPTS[key].label}
                </option>
              ))}
            </select>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 text-xs pointer-events-none">▼</span>
          </div>

          <span className="text-xs text-gray-600 ml-auto" data-testid="history-hand-count">
            {filtered.length} hands
          </span>
        </div>

        {/* FEAT: Batch operation area (visible when 1+ hands selected) */}
        {selectedHands.size > 0 && (
          <motion.div
            className="mb-3 p-3 bg-gray-800/50 border border-p5-red/50 rounded-lg"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white">
                {selectedHands.size} selected
              </span>
              <motion.button
                type="button"
                className="px-3 py-1.5 bg-gray-700 text-white font-bold text-xs border border-white/20"
                style={{ clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCopyAll}
              >
                <span className="font-p5-en">Copy All</span>
              </motion.button>
              <a
                href={
                  isAndroid
                    ? 'intent://gemini.google.com/app/new#Intent;scheme=https;package=com.google.android.apps.bard;S.browser_fallback_url=https%3A%2F%2Fgemini.google.com%2Fapp%2Fnew;end'
                    : 'https://gemini.google.com/app/new'
                }
                target={isIOS ? '_blank' : undefined}
                rel="noopener noreferrer"
                onClick={handleCopyAll}
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  background: '#D50000',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.75rem',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.3)',
                  clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)',
                }}
                className="font-p5-en"
              >
                Copy All & Gemini
              </a>
              <button
                type="button"
                className="text-xs text-gray-400 hover:text-white ml-auto"
                onClick={clearAllSelections}
              >
                Clear All
              </button>
            </div>
          </motion.div>
        )}

        {/* List */}
        {filtered.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">
            {filterFav ? 'No favorites yet' : 'No hands recorded'}
          </p>
        ) : (
          <div className="space-y-1.5" data-testid="history-hand-list">
            {filtered.map((hand, index) => {
              // FEAT-1: initialStacks がある場合はポット計算に反映
              const stacksMap = hand.initialStacks
                ? new Map(hand.initialStacks.map(s => [s.position as string, s.stack]))
                : undefined;
              const pot = calculateCurrentPot(hand.actions, stacksMap);
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
                  className="border border-white/15 bg-black/80 overflow-hidden relative"
                  style={{ clipPath: 'polygon(1.5% 0%, 100% 0%, 98.5% 100%, 0% 100%)' }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  drag="x"
                  dragConstraints={{ left: -150, right: 150 }}
                  dragElastic={0.2}
                  onDragEnd={(e, { offset }) => {
                    if (Math.abs(offset.x) > 80) {
                      deleteHand(hand.id);
                    }
                  }}
                  whileDrag={{ scale: 0.98 }}
                >
                  {/* Summary section */}
                  <div
                    className="px-3 py-2 cursor-pointer select-none hover:bg-white/5 transition-colors"
                    data-testid={`hand-toggle-${hand.id}`}
                    onClick={() => setExpandedId(prev => prev === hand.id ? null : hand.id)}
                  >
                    {/* Line 1: core info + cards */}
                    <div className="flex items-center gap-1.5">
                      {/* FEAT: Checkbox for batch selection */}
                      <label
                        className="flex items-center justify-center shrink-0 cursor-pointer"
                        style={{ minWidth: '20px', minHeight: '44px' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedHands.has(hand.id)}
                          onChange={() => toggleHandSelection(hand.id)}
                          className="w-4 h-4 cursor-pointer accent-p5-red"
                        />
                      </label>

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
                        aria-label="Delete hand"
                      >
                        🗑
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
                        data-testid={`hand-expanded-${hand.id}`}
                      >
                        <div className="px-3 pb-3 pt-1.5 border-t border-white/10 space-y-2" data-testid={`hand-detail-${hand.id}`}>
                          {/* FEAT-1/2: Non-default stacks & player attributes */}
                          {(hand.initialStacks || hand.playerAttributes) && (
                            <div className="space-y-1" data-testid="hand-stacks-attrs">
                              {/* Stacks */}
                              {hand.initialStacks && hand.initialStacks.length > 0 && (
                                <div data-testid="hand-stacks">
                                  <span className="text-[10px] text-gray-500">[Stacks] </span>
                                  <span className="text-xs text-gray-300">
                                    {hand.initialStacks.map(s => `${s.position}: ${s.stack}bb`).join(' | ')}
                                  </span>
                                </div>
                              )}
                              {/* Player Attributes */}
                              {hand.playerAttributes && hand.playerAttributes.length > 0 && (
                                <div data-testid="hand-player-attrs">
                                  <span className="text-[10px] text-gray-500">[Players] </span>
                                  <span className="text-xs text-gray-300">
                                    {hand.playerAttributes.map(p => {
                                      const parts: string[] = [];
                                      if (p.mentalState && p.mentalState !== 'neutral') parts.push(p.mentalState);
                                      if (p.playStyle && p.playStyle !== 'neutral') parts.push(p.playStyle.toUpperCase());
                                      return `${p.position}: ${parts.join('/')}`;
                                    }).join(' | ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
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

                          {/* UI-56: Memo section with label and visual container */}
                          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                            <div className="font-p5-en text-[10px] text-p5-red font-bold uppercase tracking-wider mb-1.5">
                              Memo
                            </div>
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
                              <div>
                                {hand.memo && (
                                  <p className="text-xs text-white/80 mb-1.5">{hand.memo}</p>
                                )}
                                <button
                                  className="text-[11px] text-gray-600 hover:text-white transition-colors"
                                  onClick={() => startEditMemo(hand)}
                                >
                                  {hand.memo ? 'Edit memo' : '+ Add memo'}
                                </button>
                              </div>
                            )}
                          </div>

                          {/* UI-57: Hidden textarea for copy functionality + buttons */}
                          <div className="flex gap-2">
                            <textarea
                              ref={textareaRef}
                              readOnly
                              tabIndex={-1}
                              value={generateHandExport(hand, personality)}
                              aria-hidden="true"
                              style={{ position: 'fixed', left: '-9999px', opacity: 0 }}
                            />
                            {/* Copy button */}
                            <motion.button
                              type="button"
                              className="px-3 py-1.5 bg-gray-700 text-white font-bold text-xs border border-white/20"
                              style={{ clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleCopy(generateHandExport(hand, personality))}
                            >
                              <span className="font-p5-en">Copy</span>
                            </motion.button>
                            {/* Copy & Gemini button (Z6-9) */}
                            <a
                              href={
                                isAndroid
                                  ? 'intent://gemini.google.com/app/new#Intent;scheme=https;package=com.google.android.apps.bard;S.browser_fallback_url=https%3A%2F%2Fgemini.google.com%2Fapp%2Fnew;end'
                                  : 'https://gemini.google.com/app/new'
                              }
                              target={isIOS ? '_blank' : undefined}
                              rel="noopener noreferrer"
                              onClick={() => handleCopy(generateHandExport(hand, personality))}
                              style={{
                                display: 'inline-block',
                                padding: '6px 10px',
                                background: '#D50000',
                                color: '#fff',
                                fontWeight: 'bold',
                                fontSize: '0.75rem',
                                textDecoration: 'none',
                                border: '1px solid rgba(255,255,255,0.3)',
                                clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)',
                              }}
                              className="font-p5-en"
                            >
                              Copy & Gemini
                            </a>
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
