// ポジション定義（6MAX）
export type Position = 'UTG' | 'MP' | 'CO' | 'BTN' | 'SB' | 'BB';

// アクション定義
export type Action = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

// ストリート定義
export type Street = 'preflop' | 'flop' | 'turn' | 'river';

// ベットサイズタイプ
export type BetSizeType = 'bet-relative' | 'pot-relative';

// ベットサイズ
export interface BetSize {
  type: BetSizeType;
  value: number; // 2x, 3x, 1/3, 1/2, pot, all-in
  amount?: number; // BB単位での実際の額
}

// アクション記録
export interface ActionRecord {
  position: Position;
  action: Action;
  size?: BetSize;
  street: Street;
  timestamp: number;
}

// ショーダウンハンド（勝者/敗者のハンド入力）
export interface ShowdownHand {
  position: Position;
  hand: [string, string] | 'muck';
}

// ハンド記録
export interface Hand {
  id: string;
  date: number;
  positions: Position[];
  heroPosition: Position | null;
  heroHand?: [string, string];
  actions: ActionRecord[];
  board?: string[]; // 5枚: flop[3] + turn[1] + river[1]
  winnerPosition?: Position | Position[]; // チョップ時は複数
  showdownHands?: ShowdownHand[];
  potWinners?: PotWinner[];
  result?: {
    won: boolean;
    amount: number;
  };
  notes?: string;
  memo?: string;
  favorite?: boolean;
}

// ヒストリー（全ハンド）
export type History = Hand[];

// サイドポット
export interface SidePot {
  amount: number;
  eligiblePositions: Position[];
}

// ポット勝者（各ポットの勝者記録用）
export interface PotWinner {
  potIndex: number;
  potAmount: number;
  winners: Position[];
}

// プレイヤーステート
export interface PlayerState {
  position: Position;
  stack: number; // BB単位
  active: boolean;
  isAllIn: boolean;
  lastAction?: Action;
}

// ゲームステート
export interface GameState {
  street: Street;
  currentPosition?: Position;
  players: PlayerState[];
  pot: number;
  lastBet?: number;
  actions: ActionRecord[];
  board?: string[]; // 5枚: flop[3] + turn[1] + river[1]
  sidePots?: SidePot[];
}
