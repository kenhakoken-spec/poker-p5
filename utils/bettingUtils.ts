import type { Position, Street, ActionRecord, BetSize, PlayerState } from '@/types/poker';
import { getActionOrder, getActivePlayers } from './pokerUtils';
import { calculateCurrentPot } from './potUtils';

// 最小ベット額（通常はビッグブラインド）
const MIN_BET = 1; // BB単位

/** THルール: ベットの最小額（BB）。プリフロップ最初のオープンは2BB、それ以外は1BB */
export function getMinBet(street: Street, lastBet?: number): number {
  if (street === 'preflop' && lastBet === undefined) return 2;
  return MIN_BET;
}

// 最小レイズ額を計算
export function calculateMinRaise(
  actions: ActionRecord[],
  street: Street,
  lastBet?: number
): number {
  if (!lastBet) return MIN_BET * 2; // 最初のベットは最小2BB
  
  // 最後のベット/レイズ額の2倍が最小レイズ
  return lastBet * 2;
}

// ベットサイズオプションを生成（Preflop: Bet-relative）
export function getPreflopBetSizes(
  stack: number,
  lastBet?: number
): BetSize[] {
  const sizes: BetSize[] = [];
  
  if (!lastBet) {
    // 最初のアクション: 2x, 3x のみ（オールインは別途追加）
    if (stack >= 2) {
      sizes.push({ type: 'bet-relative', value: 2, amount: 2 });
    }
    if (stack >= 3) {
      sizes.push({ type: 'bet-relative', value: 3, amount: 3 });
    }
  } else {
    // ベット/レイズに対するアクション: 2x, 3x のみ（オールインは別途追加）
    const minRaise = calculateMinRaise([], 'preflop', lastBet);
    const twoX = lastBet * 2;
    const threeX = lastBet * 3;
    
    if (stack >= twoX) {
      sizes.push({ type: 'bet-relative', value: 2, amount: twoX });
    }
    if (stack >= threeX) {
      sizes.push({ type: 'bet-relative', value: 3, amount: threeX });
    }
  }
  
  return sizes;
}

// ベットサイズオプションを生成（Postflop first action: Pot-relative）
export function getPostflopFirstActionBetSizes(
  pot: number,
  stack: number
): BetSize[] {
  const sizes: BetSize[] = [];
  
  const oneThird = Math.floor(pot / 3);
  const half = Math.floor(pot / 2);
  const potSize = pot;
  
  // スタック不足の選択肢は除外（オールインは別途追加）
  if (stack >= oneThird) {
    sizes.push({ type: 'pot-relative', value: 1/3, amount: oneThird });
  }
  if (stack >= half) {
    sizes.push({ type: 'pot-relative', value: 1/2, amount: half });
  }
  if (stack >= potSize) {
    sizes.push({ type: 'pot-relative', value: 1, amount: potSize });
  }
  
  return sizes;
}

// ベットサイズオプションを生成（Postflop against bet/raise: Bet-relative）
export function getPostflopBetSizes(
  stack: number,
  lastBet: number
): BetSize[] {
  const sizes: BetSize[] = [];
  
  const twoX = lastBet * 2;
  const threeX = lastBet * 3;
  
  // スタック不足の選択肢は除外（オールインは別途追加）
  if (stack >= twoX) {
    sizes.push({ type: 'bet-relative', value: 2, amount: twoX });
  }
  if (stack >= threeX) {
    sizes.push({ type: 'bet-relative', value: 3, amount: threeX });
  }
  
  return sizes;
}

// 利用可能なアクションを取得
export function getAvailableActions(
  position: Position,
  street: Street,
  actions: ActionRecord[],
  players: PlayerState[],
  pot: number,
  lastBet?: number
): { action: string; sizes?: BetSize[] }[] {
  const player = players.find(p => p.position === position);
  if (!player || !player.active) return [];
  
  const available: { action: string; sizes?: BetSize[] }[] = [];
  
  // フォールドは常に可能
  available.push({ action: 'fold' });
  
  // チェック/コールの判定
  const streetActions = actions.filter(a => a.street === street);
  const hasBet = streetActions.some(a => a.action === 'bet' || a.action === 'raise');
  
  if (!hasBet) {
    available.push({ action: 'check' });
  } else {
    if (lastBet && player.stack >= lastBet) {
      available.push({ action: 'call' });
    }
  }
  
  // ベット/レイズの判定
  if (player.stack > 0) {
    let sizes: BetSize[] = [];
    
    if (street === 'preflop') {
      sizes = getPreflopBetSizes(player.stack, lastBet);
    } else {
      if (!hasBet) {
        // Postflop first action: Pot-relative
        sizes = getPostflopFirstActionBetSizes(pot, player.stack);
      } else {
        // Postflop against bet/raise: Bet-relative
        if (lastBet) {
          sizes = getPostflopBetSizes(player.stack, lastBet);
        }
      }
    }
    
    if (sizes.length > 0) {
      if (hasBet) {
        available.push({ action: 'raise', sizes });
      } else {
        available.push({ action: 'bet', sizes });
      }
    }
    
    // オールインは常に追加（スタックが0より大きい場合）
    available.push({ action: 'all-in' });
  }
  
  return available;
}

// 全プレイヤーがオールインかどうかを判定
export function areAllPlayersAllIn(players: PlayerState[]): boolean {
  const activePlayers = players.filter(p => p.active);
  if (activePlayers.length === 0) return false;
  
  // 全アクティブプレイヤーがスタック0（オールイン済み）か、スタックが0でないがアクション不可能
  return activePlayers.every(p => p.stack === 0 || !p.active);
}

// 必然な選択肢を判定（フォールドしか選べない場合など）
export function getForcedAction(
  position: Position,
  street: Street,
  actions: ActionRecord[],
  players: PlayerState[],
  pot: number,
  lastBet?: number
): string | null {
  const available = getAvailableActions(position, street, actions, players, pot, lastBet);
  
  // 選択肢が1つしかない場合は自動実行
  if (available.length === 1) {
    return available[0].action;
  }
  
  // フォールドしか選べない場合（スタック不足など）
  const player = players.find(p => p.position === position);
  if (player && lastBet && player.stack < lastBet) {
    const canCall = available.some(a => a.action === 'call');
    if (!canCall) {
      return 'fold';
    }
  }
  
  return null;
}
