import type { History, Hand, ActionRecord, Street } from '@/types/poker';
import { loadHistory } from './storage';
import { calculateCurrentPot, getPotAfterEachAction } from './potUtils';

// FEAT: Gemini personality types for analysis
export type GeminiPersonality = 'neutral' | 'gto' | 'exploit' | 'coach';

// FEAT: Personality-based prompts for Gemini analysis
export const GEMINI_PROMPTS: Record<GeminiPersonality, { label: string; prompt: string }> = {
  neutral: {
    label: 'Neutral',
    prompt: '以下のポーカーハンド履歴を分析してください。プレイの良かった点と改善点を教えてください。',
  },
  gto: {
    label: 'GTO',
    prompt: 'GTO（ゲーム理論最適）の観点から、各ストリートのアクションを分析してください。レンジ構成、ベットサイズの適切さ、ポジション別の最適戦略との乖離を指摘してください。',
  },
  exploit: {
    label: 'Exploit',
    prompt: '相手の傾向を読み取り、エクスプロイト（搾取戦略）の観点から分析してください。相手のリーク、搾取ポイント、アジャストの提案をしてください。',
  },
  coach: {
    label: 'Strict Coach',
    prompt: '厳しいポーカーコーチとして、容赦なくミスを指摘してください。言い訳を許さず、改善すべきポイントを断定的に述べてください。良いプレイは簡潔に認め、悪いプレイには厳しく指摘してください。',
  },
};

// Legacy: Keep for backward compatibility
const GEMINI_PROMPT_SINGLE = GEMINI_PROMPTS.neutral.prompt;

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
  const prompt = `以下の全ハンド履歴を分析してください。各ハンドのプレイの良かった点と改善点を教えてください。

${JSON.stringify(history, null, 2)}`;
  return prompt;
}

// 単一ハンドをGemini用テキストに（プロンプト＋TH準拠JSON）
export function generateHandExport(hand: Hand, personality: GeminiPersonality = 'neutral'): string {
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
    initialStacks: hand.initialStacks ?? undefined,
    playerAttributes: hand.playerAttributes ?? undefined,
  };
  const prompt = GEMINI_PROMPTS[personality].prompt;
  return `${prompt}\n\n${JSON.stringify(handForExport, null, 2)}`;
}

// FEAT: Generate batch export for multiple hands
export function generateBatchExport(hands: Hand[], personality: GeminiPersonality = 'neutral'): string {
  const handsForExport = hands.map(hand => {
    const thActions = handToTHActions(hand);
    return {
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
      initialStacks: hand.initialStacks ?? undefined,
      playerAttributes: hand.playerAttributes ?? undefined,
    };
  });

  const batchData = {
    prompt: GEMINI_PROMPTS[personality].prompt,
    hands: handsForExport,
  };

  return JSON.stringify(batchData, null, 2);
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
