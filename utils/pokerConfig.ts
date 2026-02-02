/**
 * STACK-RULE-001: ポーカー設定定数
 * スタック・ブラインド値のハードコード禁止。全て本ファイルから取得すること。
 */
export const POKER_CONFIG = {
  defaultStack: 100,
  minStack: 1,
  maxStack: 300,
  blinds: { sb: 0.5, bb: 1 },
} as const;
