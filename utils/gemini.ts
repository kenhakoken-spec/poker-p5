import type { History, Hand, ActionRecord, Street } from '@/types/poker';
import { loadHistory } from './storage';
import { calculateCurrentPot, getPotAfterEachAction } from './potUtils';

const GEMINI_PROMPT_SINGLE =
  'Based on the following Texas Hold\'em actions, please provide straightforward coaching advice.';

/** TH準拠の1アクション行（ストリート・ポジション・アクション・額・その時点のポット） */
export interface THActionRow {
  street: Street;
  position: string;
  action: string;
  amount?: number;
  potAfter: number;
}

/** Hand から TH 準拠のアクション配列を生成（時系列・各アクション後のポット付き） */
export function handToTHActions(hand: Hand): THActionRow[] {
  const potAfterEach = getPotAfterEachAction(hand.actions);
  return hand.actions.map((a: ActionRecord, i: number) => ({
    street: a.street,
    position: a.position,
    action: a.action,
    ...(a.action === 'bet' || a.action === 'raise' || a.action === 'all-in'
      ? { amount: a.size?.amount ?? 0 }
      : {}),
    potAfter: potAfterEach[i] ?? 0,
  }));
}

// GeminiにエクスポートするJSONを生成（全履歴）
export function generateGeminiExport(): string {
  const history = loadHistory();
  const prompt = `You are a Texas Hold'em pro. Review the following hand flows and provide flat coaching.

${JSON.stringify(history, null, 2)}`;
  return prompt;
}

// 単一ハンドをGemini用テキストに（プロンプト＋TH準拠JSON）
export function generateHandExport(hand: Hand): string {
  const thActions = handToTHActions(hand);
  const handForExport = {
    id: hand.id,
    date: hand.date,
    heroPosition: hand.heroPosition,
    heroHand: hand.heroHand,
    board: hand.board,
    winnerPosition: hand.winnerPosition,
    showdownHands: hand.showdownHands,
    result: hand.result,
    notes: hand.notes,
    finalPot: calculateCurrentPot(hand.actions),
    actions: thActions,
  };
  return `${GEMINI_PROMPT_SINGLE}\n\n${JSON.stringify(handForExport, null, 2)}`;
}

// BUG-18: 同期的コピー（execCommand使用、非同期API不使用）
export function syncCopyText(text: string): boolean {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// Export All: 同期コピー + Gemini URL（aタグ経由を推奨するが後方互換のため残す）
export function exportToGemini(): void {
  const exportText = generateGeminiExport();
  syncCopyText(exportText);
  window.open('https://gemini.google.com/app', '_blank');
}
