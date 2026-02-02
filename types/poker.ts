// ポジション定義（6MAX）
export type Position = 'UTG' | 'MP' | 'CO' | 'BTN' | 'SB' | 'BB';

// アクション定義
export type Action = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

// ストリート定義
export type Street = 'preflop' | 'flop' | 'turn' | 'river';

// FEAT-2: プレイヤー属性（ゲームロジック不干渉、メモ/分析用）
export type MentalState = 'neutral' | 'tilted';
export type PlayStyle = 'neutral' | 'tp' | 'tag' | 'lp' | 'lag';

export interface PlayerAttribute {
  position: Position;
  mentalState: MentalState;
  playStyle: PlayStyle;
}

// FEAT-1: ポジション別初期スタック設定
export interface InitialStackConfig {
  position: Position;
  stack: number; // 1-300 BB
}

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
  initialStacks?: InitialStackConfig[]; // FEAT-1: デフォルトと異なる場合のみ保存
  playerAttributes?: PlayerAttribute[]; // FEAT-2: Neutral以外がある場合のみ保存
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
  stack: number; // BB単位（実行時残スタック）
  initialStack?: number; // FEAT-1: 初期スタック（未設定時はPOKER_CONFIG.defaultStack）
  active: boolean;
  isAllIn: boolean;
  lastAction?: Action;
  mentalState?: MentalState; // FEAT-2（ゲームロジック不干渉）
  playStyle?: PlayStyle; // FEAT-2（ゲームロジック不干渉）
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
