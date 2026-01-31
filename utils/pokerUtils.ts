import type { Position, Street, ActionRecord, PlayerState } from '@/types/poker';

// 6MAXポジション順序（Preflop）
export const PREFLOP_POSITIONS: Position[] = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];

// 6MAXポジション順序（Postflop）
export const POSTFLOP_POSITIONS: Position[] = ['SB', 'BB', 'UTG', 'MP', 'CO', 'BTN'];

// ストリートに応じたアクション順序を取得
export function getActionOrder(street: Street): Position[] {
  return street === 'preflop' ? PREFLOP_POSITIONS : POSTFLOP_POSITIONS;
}

// このストリートで最初にアクションするポジションを取得
export function getFirstToAct(street: Street, activePlayers: Position[]): Position | null {
  const order = getActionOrder(street);
  return order.find((p) => activePlayers.includes(p)) ?? null;
}

// このストリートでまだアクションしていないポジションのうち次にアクションするポジション
// bet/raise後は、アグレッサー以降で未応答のプレイヤーに再アクション機会を与える
export function getNextToAct(
  street: Street,
  activePlayers: Position[],
  streetActions: ActionRecord[]
): Position | null {
  const order = getActionOrder(street);

  if (streetActions.length === 0) {
    return order.find((p) => activePlayers.includes(p)) ?? null;
  }

  // 最後のbet/raise/all-inを探す
  let lastAggressiveIdx = -1;
  for (let i = streetActions.length - 1; i >= 0; i--) {
    const a = streetActions[i].action;
    if (a === 'bet' || a === 'raise' || a === 'all-in') {
      lastAggressiveIdx = i;
      break;
    }
  }

  if (lastAggressiveIdx === -1) {
    // bet/raiseなし（チェックのみ）: 未アクションの最初のプレイヤー
    const acted = new Set(streetActions.map((a) => a.position));
    return order.find((p) => activePlayers.includes(p) && !acted.has(p)) ?? null;
  }

  // bet/raise後: アグレッサー以降で未応答のプレイヤーを探す
  const lastAggressor = streetActions[lastAggressiveIdx].position;
  const actedSinceAggression = new Set<string>();
  actedSinceAggression.add(lastAggressor);
  for (let i = lastAggressiveIdx + 1; i < streetActions.length; i++) {
    actedSinceAggression.add(streetActions[i].position);
  }

  const aggressorIdx = order.indexOf(lastAggressor);
  for (let i = 1; i < order.length; i++) {
    const idx = (aggressorIdx + i) % order.length;
    const pos = order[idx];
    if (activePlayers.includes(pos) && !actedSinceAggression.has(pos)) {
      return pos;
    }
  }

  return null;
}

// 次のポジションを取得
export function getNextPosition(
  currentPosition: Position,
  street: Street,
  activePlayers: Position[]
): Position | null {
  const order = getActionOrder(street);
  const currentIndex = order.indexOf(currentPosition);
  
  if (currentIndex === -1) return null;
  
  // 次のアクティブなプレイヤーを探す
  for (let i = 1; i < order.length; i++) {
    const nextIndex = (currentIndex + i) % order.length;
    const nextPosition = order[nextIndex];
    
    if (activePlayers.includes(nextPosition)) {
      return nextPosition;
    }
  }
  
  return null;
}

// プレイヤーがアクティブかどうかを判定
export function isPlayerActive(
  position: Position,
  players: PlayerState[]
): boolean {
  const player = players.find(p => p.position === position);
  return player?.active ?? false;
}

// アクティブなプレイヤーのリストを取得（all-in含む）
export function getActivePlayers(players: PlayerState[]): Position[] {
  return players.filter(p => p.active).map(p => p.position);
}

// アクション可能なプレイヤーのリストを取得（active かつ isAllIn でない）
export function getActingPlayers(players: PlayerState[]): Position[] {
  return players.filter(p => p.active && !p.isAllIn).map(p => p.position);
}

// アクションが可能かどうかを判定
export function canAct(
  position: Position,
  players: PlayerState[],
  actions: ActionRecord[],
  street: Street
): boolean {
  if (!isPlayerActive(position, players)) return false;
  // BUG-3: getActingPlayers + getNextToAct に統一（all-inプレイヤー除外、アグレッション考慮）
  const acting = getActingPlayers(players);
  if (!acting.includes(position)) return false;
  const streetActions = actions.filter(a => a.street === street);
  const next = getNextToAct(street, acting, streetActions);
  return next === position;
}
