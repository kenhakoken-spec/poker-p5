import type { History, Hand, ActionRecord, Street } from '@/types/poker';
import { loadHistory } from './storage';
import { calculateCurrentPot, getPotAfterEachAction } from './potUtils';

const GEMINI_PROMPT_SINGLE =
  'テキサスホールデムにおいて以下のアクションをもとにフラットにアドバイスをしてほしい。';

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

// クリップボードにコピー
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

// Gemini Web/Appを起動
export function launchGemini(text: string): void {
  // Gemini WebのURL
  const geminiUrl = `https://gemini.google.com/app`;
  
  // 新しいウィンドウで開く
  window.open(geminiUrl, '_blank');
  
  // テキストをクリップボードにコピー
  copyToClipboard(text);
}

// Gemini統合（エクスポート + 自動コピー + 起動）
export async function exportToGemini(): Promise<void> {
  const exportText = generateGeminiExport();
  const copied = await copyToClipboard(exportText);
  if (copied) {
    launchGemini(exportText);
  } else {
    alert('クリップボードへのコピーに失敗しました');
  }
}

// 単一ハンドをコピーしてGeminiを起動（Copy＆Gem）
export async function exportHandToGemini(hand: Hand): Promise<void> {
  const exportText = generateHandExport(hand);
  const copied = await copyToClipboard(exportText);
  if (copied) {
    window.open('https://gemini.google.com/app', '_blank');
  } else {
    alert('クリップボードへのコピーに失敗しました');
  }
}
