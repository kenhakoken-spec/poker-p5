/**
 * 記録フロー検証（THルール検証サブエージェントの監督用）
 * ポーカー流れ的に無理な操作を防ぐ。
 */
import type { Position, Action, BetSize, GameState, ActionRecord } from '@/types/poker';
import { getNextToAct, getActivePlayers, getActingPlayers, canAct } from './pokerUtils';
import { getAvailableActions, getMinBet, calculateMinRaise } from './bettingUtils';

/** このストリートで選択可能なポジション（＝次にアクションするポジションのみ） */
// BUG-45: getActivePlayers → getActingPlayers に変更。
// all-inプレイヤーはアクション不要なので選択可能候補から除外する。
export function getSelectablePositions(gameState: GameState): Position[] {
  const actingPlayers = getActingPlayers(gameState.players);
  const streetActions = gameState.actions.filter((a) => a.street === gameState.street);
  const next = getNextToAct(gameState.street, actingPlayers, streetActions);
  return next ? [next] : [];
}

/** 指定ポジションが今アクション可能か */
export function canSelectPosition(position: Position, gameState: GameState): boolean {
  return getSelectablePositions(gameState).includes(position);
}

/** 指定アクションがこのポジションで許可されているか（THルール: ベットは1BB以上〜スタック、レイズは最小レイズ〜スタック） */
export function isActionAllowed(
  position: Position,
  action: Action,
  size: BetSize | undefined,
  gameState: GameState
): boolean {
  if (!canAct(position, gameState.players, gameState.actions, gameState.street)) return false;
  const available = getAvailableActions(
    position,
    gameState.street,
    gameState.actions,
    gameState.players,
    gameState.pot,
    gameState.lastBet
  );
  if (action === 'bet' || action === 'raise') {
    const option = available.find((a) => a.action === action);
    if (!option) return false;
    const player = gameState.players.find((p) => p.position === position);
    const stack = player?.stack ?? 0;
    if (stack <= 0) return false;
    const amount = size?.amount;
    if (amount === undefined) return false;
    if (amount > stack) return false;
    if (action === 'bet') {
      const minBet = getMinBet(gameState.street, gameState.lastBet);
      return amount >= minBet;
    }
    const minRaise = calculateMinRaise(
      gameState.actions,
      gameState.street,
      gameState.lastBet
    );
    return amount >= minRaise;
  }
  return available.some((a) => a.action === action);
}

/** 記録するアクションがルール上有効か（addAction 前に呼ぶ） */
export function validateAction(
  record: ActionRecord,
  gameState: GameState
): { valid: boolean; reason?: string } {
  if (!canAct(record.position, gameState.players, gameState.actions, gameState.street)) {
    return { valid: false, reason: `${record.position} cannot act at this time` };
  }
  if (!isActionAllowed(record.position, record.action, record.size, gameState)) {
    return { valid: false, reason: `This action is not allowed` };
  }
  return { valid: true };
}
