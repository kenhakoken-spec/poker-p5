import type { ActionRecord, Position, Street, PlayerState, SidePot, PotWinner } from '@/types/poker';
import { POKER_CONFIG } from '@/utils/pokerConfig';

// STACK-RULE-001: 設定値から算出
const INITIAL_POT = POKER_CONFIG.blinds.sb + POKER_CONFIG.blinds.bb;
const DEFAULT_INITIAL_STACK = POKER_CONFIG.defaultStack;

/** このストリートでの各ポジションの投入額（BB単位）。プリフロはSB/BBのブラインドを含む */
export function getContributionsThisStreet(
  actions: ActionRecord[],
  street: Street,
  playerStacks?: Map<string, number>
): Map<string, number> {
  const contributions = new Map<string, number>();
  if (street === 'preflop') {
    contributions.set('SB', POKER_CONFIG.blinds.sb);
    contributions.set('BB', POKER_CONFIG.blinds.bb);
  }
  let currentBet = street === 'preflop' ? POKER_CONFIG.blinds.bb : 0;

  const streetActions = actions.filter((a) => a.street === street);
  for (const action of streetActions) {
    const pos = action.position;
    const prev = contributions.get(pos) ?? 0;

    if (action.action === 'bet' || action.action === 'raise' || action.action === 'all-in') {
      const amount = action.size?.amount ?? 0;
      contributions.set(pos, prev + amount);
      currentBet = Math.max(currentBet, prev + amount);
    } else if (action.action === 'call') {
      let callAmount = Math.max(0, currentBet - prev);
      // BUG-33: call時にスタック上限でキャップ（ショートスタックのコール過大計上を防止）
      if (playerStacks) {
        const stack = playerStacks.get(pos);
        if (stack !== undefined) {
          callAmount = Math.min(callAmount, stack);
        }
      }
      contributions.set(pos, prev + callAmount);
    }
  }

  return contributions;
}

/** このストリートの最大投入額（全員が合わせるべき額） */
export function getMaxContributionThisStreet(
  actions: ActionRecord[],
  street: Street
): number {
  const contributions = getContributionsThisStreet(actions, street);
  let max = 0;
  contributions.forEach((v) => {
    if (v > max) max = v;
  });
  return max;
}

/** プレイヤーごとのスタック（BB単位）。省略時は全員同額投入のみで判定 */
type PlayerStackMap = Map<string, number>;

/** ラウンドが閉じたか（全アクティブが同額投入済み or チェックのみ or 全員オールイン）TH準拠 */
export function isStreetClosed(
  actions: ActionRecord[],
  street: Street,
  activePositions: string[],
  playerStacks?: PlayerStackMap
): boolean {
  const streetActions = actions.filter((a) => a.street === street);
  const acted = new Set(streetActions.map((a) => a.position));
  const allActiveHaveActed = activePositions.every((p) => acted.has(p as Position));
  if (!allActiveHaveActed) return false;

  const hasBet = streetActions.some(
    (a) => a.action === 'bet' || a.action === 'raise' || a.action === 'all-in'
  );
  if (!hasBet) {
    return streetActions.length > 0 && activePositions.every((p) => acted.has(p as Position));
  }

  const contributions = getContributionsThisStreet(actions, street);
  const maxContrib = getMaxContributionThisStreet(actions, street);

  // 全員が同額投入済み or オールイン（スタック0）なら閉鎖
  for (const pos of activePositions) {
    const p = pos as Position;
    const c = contributions.get(p) ?? 0;
    const stack = playerStacks?.get(p) ?? 0;
    const isAllIn = stack <= 0;
    if (!isAllIn && c < maxContrib) return false;
  }
  return true;
}

// ストリートごとのポットを計算
export function calculatePotForStreet(
  actions: ActionRecord[],
  street: Street
): number {
  let pot = INITIAL_POT;
  
  // 現在のストリート以前のすべてのアクションを処理
  const relevantActions = actions.filter(a => {
    const streetOrder: Street[] = ['preflop', 'flop', 'turn', 'river'];
    const currentStreetIndex = streetOrder.indexOf(street);
    const actionStreetIndex = streetOrder.indexOf(a.street);
    return actionStreetIndex <= currentStreetIndex;
  });
  
  // 各アクションでポットに追加される額を計算
  let currentBet = 0; // 現在のストリートでのベット額を追跡
  let playerContributions: Map<string, number> = new Map(); // 各プレイヤーの投入額を追跡

  // ブラインドを初期状態として常に設定（プリフロップアクションは全ストリートで処理されるため）
  // INITIAL_POTにブラインドが含まれるので、playerContributionsにも反映が必要
  currentBet = POKER_CONFIG.blinds.bb;
  playerContributions.set('SB', POKER_CONFIG.blinds.sb);
  playerContributions.set('BB', POKER_CONFIG.blinds.bb);

  for (const action of relevantActions) {
    const playerKey = action.position;
    const currentContribution = playerContributions.get(playerKey) || 0;
    
    if (action.action === 'bet' || action.action === 'raise' || action.action === 'all-in') {
      if (action.size?.amount) {
        // ベット/レイズ/オールイン: 指定額を投入
        const amountToAdd = action.size.amount;
        pot += amountToAdd;
        currentBet = Math.max(currentBet, currentContribution + amountToAdd);
        playerContributions.set(playerKey, currentContribution + amountToAdd);
      }
    } else if (action.action === 'call') {
      // コール: 現在のベット額に合わせる
      const callAmount = Math.max(0, currentBet - currentContribution);
      if (callAmount > 0) {
        pot += callAmount;
        playerContributions.set(playerKey, currentContribution + callAmount);
      }
    }
    // check/fold はポットに追加しない
  }

  // BUG-9修正: ブラインドがスタックから控除されないため、
  // オールイン時にplayerContributionsがinitialStackを超える場合がある。
  // ポットを各プレイヤーのキャップ済み投入額の合計として再計算する。
  let correctedPot = 0;
  playerContributions.forEach((contrib) => {
    correctedPot += Math.min(contrib, DEFAULT_INITIAL_STACK);
  });
  return correctedPot;
}

// 現在のポットを計算
export function calculateCurrentPot(actions: ActionRecord[]): number {
  // 最後のストリートを取得
  const streets: Street[] = ['preflop', 'flop', 'turn', 'river'];
  let lastStreet: Street = 'preflop';
  
  for (const action of actions) {
    const streetIndex = streets.indexOf(action.street);
    const lastStreetIndex = streets.indexOf(lastStreet);
    if (streetIndex > lastStreetIndex) {
      lastStreet = action.street;
    }
  }
  
  return calculatePotForStreet(actions, lastStreet);
}
/** 指定ストリート開始前（前ストリート終了時点）のポット */
export function getPotBeforeStreet(actions: ActionRecord[], street: Street): number {
  const streets: Street[] = ['preflop', 'flop', 'turn', 'river'];
  const idx = streets.indexOf(street);
  if (idx <= 0) return INITIAL_POT;
  return calculatePotForStreet(actions, streets[idx - 1]);
}

/** 指定ストリートでの増分（このストリートで増えたポット額） */
export function getPotIncreaseThisStreet(actions: ActionRecord[], street: Street): number {
  const total = calculatePotForStreet(actions, street);
  const before = getPotBeforeStreet(actions, street);
  return Math.max(0, total - before);
}

/** 各アクション直後のポット（BB）。TH準拠エクスポート用 */
export function getPotAfterEachAction(actions: ActionRecord[]): number[] {
  return actions.map((_, i) => calculateCurrentPot(actions.slice(0, i + 1)));
}

/** 全ストリートを通じた各プレイヤーの累計投入額（SB/BBブラインド含む） */
export function getTotalContributions(actions: ActionRecord[]): Map<string, number> {
  const contributions = new Map<string, number>();
  // ブラインド初期値
  contributions.set('SB', POKER_CONFIG.blinds.sb);
  contributions.set('BB', POKER_CONFIG.blinds.bb);

  let currentBetByStreet = new Map<string, number>(); // street -> currentBet
  let contribByStreet = new Map<string, Map<string, number>>(); // street -> position -> contribution

  // プリフロのブラインド初期設定
  const preflopContrib = new Map<string, number>();
  preflopContrib.set('SB', POKER_CONFIG.blinds.sb);
  preflopContrib.set('BB', POKER_CONFIG.blinds.bb);
  contribByStreet.set('preflop', preflopContrib);
  currentBetByStreet.set('preflop', POKER_CONFIG.blinds.bb);

  for (const action of actions) {
    const street = action.street;
    if (!contribByStreet.has(street)) {
      contribByStreet.set(street, new Map());
      currentBetByStreet.set(street, 0);
    }
    const streetContrib = contribByStreet.get(street)!;
    const pos = action.position;
    const prev = streetContrib.get(pos) ?? 0;
    let currentBet = currentBetByStreet.get(street) ?? 0;

    if (action.action === 'bet' || action.action === 'raise' || action.action === 'all-in') {
      const amount = action.size?.amount ?? 0;
      streetContrib.set(pos, prev + amount);
      currentBet = Math.max(currentBet, prev + amount);
      currentBetByStreet.set(street, currentBet);
    } else if (action.action === 'call') {
      const callAmount = Math.max(0, currentBet - prev);
      streetContrib.set(pos, prev + callAmount);
    }
  }

  // 全ストリートの投入を合算
  for (const [, streetContrib] of contribByStreet) {
    for (const [pos, amount] of streetContrib) {
      contributions.set(pos, (contributions.get(pos) ?? 0) + amount);
    }
  }

  // ブラインドは各ストリートのcontribに含まれるのでpreflopの初期値だけで十分
  // ただしpreflopのcontribにはブラインドが含まれているため二重計算を修正
  // 上でブラインドを初期値として設定し、かつpreflopContribにもブラインドを設定しているので
  // 合算時に二重になる。修正: contributions初期値をクリアし、ストリート合算だけにする
  contributions.clear();
  for (const [, streetContrib] of contribByStreet) {
    for (const [pos, amount] of streetContrib) {
      contributions.set(pos, (contributions.get(pos) ?? 0) + amount);
    }
  }

  // BUG-9修正: 各プレイヤーのcontributionをinitialStackでキャップ
  for (const [pos, amount] of contributions) {
    if (amount > DEFAULT_INITIAL_STACK) {
      contributions.set(pos, DEFAULT_INITIAL_STACK);
    }
  }

  return contributions;
}

/** サイドポットを計算する（オールイン時のポット分割） */
export function calculateSidePots(actions: ActionRecord[], players: PlayerState[]): SidePot[] {
  const contributions = getTotalContributions(actions);

  // BUG-33: fold-basedでアクティブ判定（p.activeフラグに依存しない）
  const foldedPositions = new Set(
    actions.filter(a => a.action === 'fold').map(a => a.position)
  );
  const activePositions = players
    .filter(p => !foldedPositions.has(p.position))
    .map(p => p.position);

  // 全プレイヤーの投入額を取得（fold含む）
  const allContribs: { position: Position; amount: number; isActive: boolean }[] =
    players.map(p => ({
      position: p.position,
      amount: contributions.get(p.position) ?? 0,
      isActive: !foldedPositions.has(p.position),
    }));

  // アクティブプレイヤーの投入額でユニークなレベルをソート
  const activeLevels = [...new Set(
    allContribs.filter(c => c.isActive).map(c => c.amount)
  )].sort((a, b) => a - b);

  if (activeLevels.length <= 1) {
    // サイドポットなし（全員同額 or 1人のみ）
    const totalPot = allContribs.reduce((sum, c) => sum + c.amount, 0);
    return [{
      amount: totalPot,
      eligiblePositions: activePositions,
    }];
  }

  const pots: SidePot[] = [];
  let previousLevel = 0;

  for (const level of activeLevels) {
    const increment = level - previousLevel;
    if (increment <= 0) continue;

    // このレベルまでの各プレイヤーの追加投入
    let potAmount = 0;
    const eligible: Position[] = [];

    for (const c of allContribs) {
      const playerContribAtLevel = Math.min(c.amount, level) - Math.min(c.amount, previousLevel);
      potAmount += playerContribAtLevel;
      // BUG-33: eligibleはfold-basedでこのレベル以上投入したプレイヤー
      if (c.isActive && c.amount >= level) {
        eligible.push(c.position);
      }
    }

    if (potAmount > 0) {
      pots.push({
        amount: potAmount,
        eligiblePositions: eligible,
      });
    }

    previousLevel = level;
  }

  return pots;
}

/** チョップ時の各プレイヤーの獲得額を計算（各ポットを勝者数で等分） */
export function calculateWinnings(
  potWinners: PotWinner[],
  totalPot: number,
  winners: Position | Position[]
): Map<string, number> {
  const winnings = new Map<string, number>();

  if (potWinners.length > 0) {
    for (const pw of potWinners) {
      if (pw.winners.length === 0) continue;
      const share = pw.potAmount / pw.winners.length;
      for (const w of pw.winners) {
        winnings.set(w, (winnings.get(w) ?? 0) + share);
      }
    }
  } else {
    const winnerArray = Array.isArray(winners) ? winners : [winners];
    if (winnerArray.length === 0) return winnings;
    const share = totalPot / winnerArray.length;
    for (const w of winnerArray) {
      winnings.set(w, share);
    }
  }

  return winnings;
}
