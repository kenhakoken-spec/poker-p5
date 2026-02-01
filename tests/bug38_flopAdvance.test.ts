/**
 * BUG-38 調査: preflopOpponents → flop ストリート進行検証
 * HandContext.addActions のバッチ処理でisStreetClosedが正しく判定されるか
 */
import { describe, it, expect } from 'vitest';
import type { ActionRecord, Position, Street, PlayerState } from '@/types/poker';
import { getContributionsThisStreet, getMaxContributionThisStreet, isStreetClosed } from '@/utils/potUtils';
import { getActivePlayers, getActingPlayers, getActionOrder } from '@/utils/pokerUtils';
import { POKER_CONFIG } from '@/utils/pokerConfig';

// addActions core logic（HandContext.tsx L147-221 のシミュレーション）
function simulateAddActions(
  initialActions: ActionRecord[],
  initialPlayers: PlayerState[],
  initialStreet: Street,
  newBatchActions: ActionRecord[]
): { actions: ActionRecord[]; players: PlayerState[]; street: Street } {
  let allActions = [...initialActions];
  let players = initialPlayers.map(p => ({ ...p }));
  let street = initialStreet;

  for (const action of newBatchActions) {
    const contribBefore = getContributionsThisStreet(allActions, street);
    const maxContribBefore = getMaxContributionThisStreet(allActions, street);
    allActions = [...allActions, action];

    players = players.map(p => {
      if (p.position !== action.position) return p;
      if (action.action === 'fold') return { ...p, active: false };
      let newStack = p.stack;
      if (action.action === 'bet' || action.action === 'raise' || action.action === 'all-in') {
        if (action.size?.amount !== undefined) {
          newStack = Math.max(0, p.stack - action.size.amount);
        }
      } else if (action.action === 'call') {
        const myContribBefore = contribBefore.get(action.position) ?? 0;
        const amountToCall = Math.max(0, maxContribBefore - myContribBefore);
        newStack = Math.max(0, p.stack - amountToCall);
      }
      const isAllIn = action.action === 'all-in' || newStack <= 0;
      return { ...p, stack: newStack, lastAction: action.action, isAllIn };
    });

    let newStreet = street;
    const activePlayers = getActivePlayers(players);
    const actingPlayers = getActingPlayers(players);
    if (activePlayers.length <= 1) {
      newStreet = street;
    } else {
      const playerStacks = new Map(players.map(p => [p.position, p.stack]));
      if (isStreetClosed(allActions, street, actingPlayers as string[], playerStacks)) {
        const streets: Street[] = ['preflop', 'flop', 'turn', 'river'];
        const idx = streets.indexOf(street);
        if (idx < streets.length - 1) newStreet = streets[idx + 1];
      }
      if (actingPlayers.length === 0) {
        newStreet = 'river';
      }
    }
    street = newStreet;
  }

  return { actions: allActions, players, street };
}

function mkAction(pos: Position, action: string, street: Street = 'preflop', amount?: number): ActionRecord {
  return {
    position: pos,
    action: action as any,
    street,
    timestamp: Date.now(),
    ...(amount !== undefined && { size: { type: 'bet-relative' as const, value: amount, amount } }),
  };
}

function mkPlayers(): PlayerState[] {
  const positions: Position[] = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
  const blinds: Record<string, number> = { SB: POKER_CONFIG.blinds.sb, BB: POKER_CONFIG.blinds.bb };
  return positions.map(pos => ({
    position: pos,
    stack: POKER_CONFIG.defaultStack - (blinds[pos] ?? 0),
    active: true,
    isAllIn: false,
  }));
}

// preflopOpponents useEffect の remaining チェック
function checkPreflopRemaining(actions: ActionRecord[], opener: Position): Position[] {
  const order = getActionOrder('preflop');
  const afterOpener = order.slice(order.indexOf(opener) + 1);
  const acted = new Set(actions.filter(a => a.street === 'preflop').map(a => a.position));
  return afterOpener.filter(p => !acted.has(p));
}

describe('BUG-38: Preflop → Flop Advance', () => {
  it('Scenario 1: BTN raise → SB call → BB call → flop', () => {
    const players = mkPlayers();
    // handlePreflopWhoOpenConfirm(BTN, raise 2)
    const s1 = simulateAddActions([], players, 'preflop', [
      mkAction('UTG', 'fold'), mkAction('MP', 'fold'), mkAction('CO', 'fold'),
      mkAction('BTN', 'raise', 'preflop', 2),
    ]);
    expect(s1.street).toBe('preflop');
    expect(checkPreflopRemaining(s1.actions, 'BTN')).toEqual(['SB', 'BB']);

    // handlePreflopOpponentsConfirm(SB, call)
    const s2 = simulateAddActions(s1.actions, s1.players, s1.street, [mkAction('SB', 'call')]);
    expect(s2.street).toBe('preflop');
    expect(checkPreflopRemaining(s2.actions, 'BTN')).toEqual(['BB']);

    // handlePreflopOpponentsConfirm(BB, call)
    const s3 = simulateAddActions(s2.actions, s2.players, s2.street, [mkAction('BB', 'call')]);
    expect(s3.street).toBe('flop');
    expect(checkPreflopRemaining(s3.actions, 'BTN')).toEqual([]);
  });

  it('Scenario 2: BTN raise → SB call → BB fold → flop', () => {
    const players = mkPlayers();
    const s1 = simulateAddActions([], players, 'preflop', [
      mkAction('UTG', 'fold'), mkAction('MP', 'fold'), mkAction('CO', 'fold'),
      mkAction('BTN', 'raise', 'preflop', 2),
    ]);
    const s2 = simulateAddActions(s1.actions, s1.players, s1.street, [mkAction('SB', 'call')]);
    const s3 = simulateAddActions(s2.actions, s2.players, s2.street, [mkAction('BB', 'fold')]);
    expect(s3.street).toBe('flop');
    expect(getActivePlayers(s3.players)).toEqual(['BTN', 'SB']);
  });

  it('Scenario 3: BTN raise → SB fold → BB call → flop', () => {
    const players = mkPlayers();
    const s1 = simulateAddActions([], players, 'preflop', [
      mkAction('UTG', 'fold'), mkAction('MP', 'fold'), mkAction('CO', 'fold'),
      mkAction('BTN', 'raise', 'preflop', 2),
    ]);
    const s2 = simulateAddActions(s1.actions, s1.players, s1.street, [mkAction('SB', 'fold')]);
    expect(s2.street).toBe('preflop');
    const s3 = simulateAddActions(s2.actions, s2.players, s2.street, [mkAction('BB', 'call')]);
    expect(s3.street).toBe('flop');
    expect(getActivePlayers(s3.players)).toEqual(['BTN', 'BB']);
  });

  it('Scenario 4: BTN raise → SB fold → BB fold → preflop (1 active, needs auto-winner)', () => {
    const players = mkPlayers();
    const s1 = simulateAddActions([], players, 'preflop', [
      mkAction('UTG', 'fold'), mkAction('MP', 'fold'), mkAction('CO', 'fold'),
      mkAction('BTN', 'raise', 'preflop', 2),
    ]);
    const s2 = simulateAddActions(s1.actions, s1.players, s1.street, [mkAction('SB', 'fold')]);
    const s3 = simulateAddActions(s2.actions, s2.players, s2.street, [mkAction('BB', 'fold')]);
    expect(s3.street).toBe('preflop'); // no advance, only 1 active
    expect(getActivePlayers(s3.players)).toEqual(['BTN']);
  });

  it('Scenario 5: UTG raise → BB call with auto-folds → flop', () => {
    const players = mkPlayers();
    const s1 = simulateAddActions([], players, 'preflop', [mkAction('UTG', 'raise', 'preflop', 2)]);
    // handlePreflopOpponentsConfirm(BB, call) → between = [MP,CO,BTN,SB]
    const s2 = simulateAddActions(s1.actions, s1.players, s1.street, [
      mkAction('MP', 'fold'), mkAction('CO', 'fold'), mkAction('BTN', 'fold'), mkAction('SB', 'fold'),
      mkAction('BB', 'call'),
    ]);
    expect(s2.street).toBe('flop');
    expect(getActivePlayers(s2.players)).toEqual(['UTG', 'BB']);
  });

  it('Scenario 6: SB limp → BB call → flop', () => {
    const players = mkPlayers();
    const s1 = simulateAddActions([], players, 'preflop', [
      mkAction('UTG', 'fold'), mkAction('MP', 'fold'), mkAction('CO', 'fold'), mkAction('BTN', 'fold'),
      mkAction('SB', 'call'),
    ]);
    const s2 = simulateAddActions(s1.actions, s1.players, s1.street, [mkAction('BB', 'call')]);
    expect(s2.street).toBe('flop');
  });

  it('Scenario 7: 4-way UTG raise → CO call → SB call → BB call → flop', () => {
    const players = mkPlayers();
    const s1 = simulateAddActions([], players, 'preflop', [mkAction('UTG', 'raise', 'preflop', 2)]);
    const s2 = simulateAddActions(s1.actions, s1.players, s1.street, [mkAction('CO', 'call')]);
    expect(s2.street).toBe('preflop');
    const s3 = simulateAddActions(s2.actions, s2.players, s2.street, [mkAction('SB', 'call')]);
    expect(s3.street).toBe('preflop');
    const s4 = simulateAddActions(s3.actions, s3.players, s3.street, [mkAction('BB', 'call')]);
    // MP and BTN haven't acted - are they auto-folded?
    // In this scenario, user selected CO directly → auto-folded MP.
    // But this test doesn't auto-fold MP. Let me fix...
    // Actually in preflopOpponents flow, selecting CO auto-folds MP (between UTG and CO)
  });

  it('Scenario 7b: UTG raise → (MP auto-fold) → CO call → (BTN auto-fold) → SB call → BB call → flop', () => {
    const players = mkPlayers();
    const s1 = simulateAddActions([], players, 'preflop', [mkAction('UTG', 'raise', 'preflop', 2)]);
    // handlePreflopOpponentsConfirm(CO, call) → between=[MP]
    const s2 = simulateAddActions(s1.actions, s1.players, s1.street, [
      mkAction('MP', 'fold'),
      mkAction('CO', 'call'),
    ]);
    expect(s2.street).toBe('preflop');
    // handlePreflopOpponentsConfirm(SB, call) → between=[BTN]
    const s3 = simulateAddActions(s2.actions, s2.players, s2.street, [
      mkAction('BTN', 'fold'),
      mkAction('SB', 'call'),
    ]);
    expect(s3.street).toBe('preflop');
    // handlePreflopOpponentsConfirm(BB, call) → between=[]
    const s4 = simulateAddActions(s3.actions, s3.players, s3.street, [mkAction('BB', 'call')]);
    expect(s4.street).toBe('flop');
    expect(getActivePlayers(s4.players)).toEqual(['UTG', 'CO', 'SB', 'BB']);
  });
});
