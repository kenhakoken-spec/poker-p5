import type { Position, Street, ActionRecord, BetSize, PlayerState } from '@/types/poker';
import { getActionOrder, getActivePlayers } from './pokerUtils';
import { calculateCurrentPot } from './potUtils';
import { POKER_CONFIG } from '@/utils/pokerConfig';

// STACK-RULE-001: 最小ベット額はPOKER_CONFIGから取得
const MIN_BET = POKER_CONFIG.blinds.bb;

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

// ======================================================================
// BUG-14: TH準拠オールインロジック
// ======================================================================

/** ストリート内のベッティング状態を追跡（内部ヘルパー） */
function trackStreetBettingState(actions: ActionRecord[], street: Street): {
  currentBet: number;
  minRaiseSize: number;
  contributions: Map<string, number>;
  lastAggressionIsFullRaise: boolean;
} {
  const streetActions = actions.filter(a => a.street === street);

  const contributions = new Map<string, number>();
  if (street === 'preflop') {
    contributions.set('SB', POKER_CONFIG.blinds.sb);
    contributions.set('BB', POKER_CONFIG.blinds.bb);
  }

  let currentBet: number = street === 'preflop' ? POKER_CONFIG.blinds.bb : 0;
  let minRaiseSize: number = POKER_CONFIG.blinds.bb;
  let lastAggressionIsFullRaise = false;

  for (const action of streetActions) {
    const pos = action.position;
    const prev = contributions.get(pos) ?? 0;

    if (action.action === 'bet' || action.action === 'raise') {
      const amount = action.size?.amount ?? 0;
      const newLevel = prev + amount;
      if (newLevel > currentBet) {
        minRaiseSize = newLevel - currentBet;
        currentBet = newLevel;
        lastAggressionIsFullRaise = true;
      }
      contributions.set(pos, newLevel);
    } else if (action.action === 'all-in') {
      const amount = action.size?.amount ?? 0;
      const newLevel = prev + amount;
      if (newLevel > currentBet) {
        const increment = newLevel - currentBet;
        if (increment >= minRaiseSize) {
          // フルレイズ相当のオールイン
          minRaiseSize = increment;
          currentBet = newLevel;
          lastAggressionIsFullRaise = true;
        } else {
          // ショートオールイン（レイズ最低額未満）
          currentBet = newLevel;
          lastAggressionIsFullRaise = false;
        }
      } else {
        // ベットレベルにも達しないオールイン（コール以下）
        lastAggressionIsFullRaise = false;
      }
      contributions.set(pos, newLevel);
    } else if (action.action === 'call') {
      const callAmount = Math.max(0, currentBet - prev);
      contributions.set(pos, prev + callAmount);
    }
  }

  return { currentBet, minRaiseSize, contributions, lastAggressionIsFullRaise };
}

/** ルール1: オールイン済みプレイヤーはアクション不要 */
export function shouldSkipPlayer(player: PlayerState): boolean {
  return !player.active || player.isAllIn;
}

/** TH準拠: 現在のベットレベル（このストリートでマッチすべき額） */
export function getCurrentBetLevel(actions: ActionRecord[], street: Street): number {
  return trackStreetBettingState(actions, street).currentBet;
}

/** TH準拠: 最小レイズ増分（最後のフルレイズの増分） */
export function getLastRaiseIncrement(actions: ActionRecord[], street: Street): number {
  return trackStreetBettingState(actions, street).minRaiseSize;
}

/**
 * ショートオールイン判定
 * @param allInTotal オールイン後のプレイヤー合計投入額
 * @param currentBetLevel 現在のベットレベル
 * @param minRaiseSize 最小レイズ増分
 */
export function isShortAllIn(
  allInTotal: number,
  currentBetLevel: number,
  minRaiseSize: number
): boolean {
  if (allInTotal <= currentBetLevel) return true;
  return (allInTotal - currentBetLevel) < minRaiseSize;
}

/**
 * ルール2/3: 最後のアグレッシブアクションがアクション再開を引き起こすか
 * フルレイズ → true（全員に再アクション権）
 * ショートオールイン → false（既アクション者にはリレイズ権なし）
 */
export function didLastAggressionReopenAction(actions: ActionRecord[], street: Street): boolean {
  return trackStreetBettingState(actions, street).lastAggressionIsFullRaise;
}

/**
 * ルール4: ランアウト判定
 * アクティブ2人以上で、チップ保有者が0〜1人 → ランアウト
 */
export function isRunoutNeeded(players: PlayerState[]): boolean {
  const activePlayers = players.filter(p => p.active);
  if (activePlayers.length <= 1) return false;
  const actingPlayers = activePlayers.filter(p => !p.isAllIn);
  return actingPlayers.length <= 1;
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

  // ルール1: オールイン済みプレイヤーはアクション不要
  if (player.isAllIn) return [];

  // BUG-16: アクション履歴からベット状態を自力計算（lastBetパラメータに依存しない）
  const bettingState = trackStreetBettingState(actions, street);
  const effectiveBetLevel = bettingState.currentBet;
  const playerContrib = bettingState.contributions.get(position) ?? 0;
  const callAmount = Math.max(0, effectiveBetLevel - playerContrib);
  // lastBetが渡されない場合はeffectiveBetLevelで代替（サイズ計算用）
  const effectiveLastBet = lastBet ?? (effectiveBetLevel > 0 ? effectiveBetLevel : undefined);

  const available: { action: string; sizes?: BetSize[] }[] = [];

  // フォールドは常に可能
  available.push({ action: 'fold' });

  // チェック/コールの判定
  const streetActions = actions.filter(a => a.street === street);
  // BUG-12: all-inもbet/raiseとして扱う（オールイン後にcheck/betが出るのを防止）
  const hasBet = streetActions.some(a => a.action === 'bet' || a.action === 'raise' || a.action === 'all-in');

  if (!hasBet) {
    available.push({ action: 'check' });
  } else {
    // BUG-46: callAmountをアクション履歴から計算（lastBetに依存しない）
    // stack > callAmount: call可能
    // stack === callAmount: All-in（残スタック全額投入=TH準拠オールイン）
    // stack < callAmount: call不可（ショートオールインは別途処理）
    if (callAmount > 0 && player.stack > callAmount) {
      available.push({ action: 'call' });
    } else if (callAmount > 0 && player.stack === callAmount) {
      // BUG-46: コール額が残スタックと同額 → All-in表示
      available.push({ action: 'all-in' });
    }
  }

  // ルール5: 残り1人の制限チェック
  const actingPlayers = players.filter(p => p.active && !p.isAllIn);
  const isOnlyActingPlayer = actingPlayers.length === 1 && actingPlayers[0].position === position;
  const isRestricted = isOnlyActingPlayer && hasBet;

  // ベット/レイズの判定
  if (!isRestricted && player.stack > 0) {
    let sizes: BetSize[] = [];

    if (street === 'preflop') {
      sizes = getPreflopBetSizes(player.stack, effectiveLastBet);
    } else {
      if (!hasBet) {
        // Postflop first action: Pot-relative
        sizes = getPostflopFirstActionBetSizes(pot, player.stack);
      } else {
        // Postflop against bet/raise: Bet-relative
        if (effectiveLastBet) {
          sizes = getPostflopBetSizes(player.stack, effectiveLastBet);
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

    // BUG-46: all-inが既に追加済み（callAmount===stack）でなければ追加
    if (!available.some(a => a.action === 'all-in')) {
      available.push({ action: 'all-in' });
    }
  } else if (isRestricted && player.stack > 0) {
    // BUG-20: 制限中のショートオールイン（stack < callAmount: ベット額に届かない場合のみ）
    // BUG-46: stack === callAmount の場合はall-inとして上で処理済み
    if (hasBet && callAmount > 0 && player.stack < callAmount) {
      available.push({ action: 'all-in' });
    }
  }

  return available;
}

// 全プレイヤーがオールインかどうかを判定
export function areAllPlayersAllIn(players: PlayerState[]): boolean {
  const activePlayers = players.filter(p => p.active);
  if (activePlayers.length === 0) return false;
  
  // 全アクティブプレイヤーがオールイン済み（BUG-14: !p.active は常にfalseだったバグを修正）
  return activePlayers.every(p => p.isAllIn || p.stack === 0);
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
  
  // BUG-12: スタック不足でcallもall-inもできない場合のみ自動fold
  const player = players.find(p => p.position === position);
  if (player && lastBet && player.stack < lastBet) {
    const canCall = available.some(a => a.action === 'call');
    const canAllIn = available.some(a => a.action === 'all-in');
    if (!canCall && !canAllIn) {
      return 'fold';
    }
  }
  
  return null;
}
