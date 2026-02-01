/**
 * STACK-RULE-001: ポーカー設定定数
 * スタック・ブラインド値のハードコード禁止。全て本ファイルから取得すること。
 */
export const POKER_CONFIG = {
  defaultStack: 100,
  blinds: { sb: 0.5, bb: 1 },
} as const;
