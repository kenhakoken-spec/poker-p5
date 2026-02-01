import type { History, Hand } from '@/types/poker';

const STORAGE_KEY = 'poker3_history';

export function saveHistory(history: History): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save history:', error);
  }
}

export function loadHistory(): History {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as Hand[];
    // 古いデータに heroPosition がない場合の補完（確定事項 #7: 互換捨ててよいがクラッシュ防止）
    return parsed.map((hand) => ({
      ...hand,
      heroPosition: hand.heroPosition ?? null,
      heroHand: hand.heroHand,
    }));
  } catch (error) {
    console.error('Failed to load history:', error);
    return [];
  }
}

export function addHand(hand: Hand): void {
  const history = loadHistory();
  history.push(hand);
  saveHistory(history);
}
