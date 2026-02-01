import { describe, it, expect } from 'vitest';
import type { Position, PlayerState } from '@/types/poker';
import { getActivePlayers, getActingPlayers } from '@/utils/pokerUtils';

/**
 * BUG-22 調査支援テスト: 勝者候補（winner candidates）ロジックの検証
 *
 * record/page.tsx L910-911 の勝者候補生成ロジック:
 *   gameState.players.filter(p => p.active).map(p => p.position)
 * は getActivePlayers() と同等。
 *
 * このテストでは、各種ゲーム状況におけるプレイヤー状態から
 * getActivePlayers（= 勝者候補）と getActingPlayers の正しさを検証する。
 */

function mkPlayer(
  position: Position,
  stack: number,
  active = true,
  isAllIn = false,
): PlayerState {
  return { position, stack, active, isAllIn };
}

describe('BUG-22: 勝者候補（winner candidates）ロジック検証', () => {
  // ============================================================
  // シナリオ1: HU 両者all-in → 2人が勝者候補
  // ============================================================
  describe('シナリオ1: HU 両者all-in → 2人が候補', () => {
    it('両者all-in(stack=0): getActivePlayers = 2人', () => {
      const players = [
        mkPlayer('SB', 0, true, true),
        mkPlayer('BB', 0, true, true),
      ];
      const active = getActivePlayers(players);
      expect(active).toEqual(['SB', 'BB']);
      expect(active).toHaveLength(2);
    });

    it('両者all-in(stack=0): getActingPlayers = 0人（全員all-in）', () => {
      const players = [
        mkPlayer('SB', 0, true, true),
        mkPlayer('BB', 0, true, true),
      ];
      const acting = getActingPlayers(players);
      expect(acting).toHaveLength(0);
    });

    it('SB all-in, BB call-all-in(stack=0): 両者が候補', () => {
      // SB all-in 100 → BB calls 100 (stack goes to 0)
      // HandContext L81: isAllIn = action.action === 'all-in' || newStack <= 0
      const players = [
        mkPlayer('SB', 0, true, true),   // all-in action
        mkPlayer('BB', 0, true, true),   // call → stack=0 → isAllIn=true
      ];
      const active = getActivePlayers(players);
      expect(active).toEqual(['SB', 'BB']);
    });

    it('SB all-in(short), BB calls(stack余り): 両者が候補', () => {
      // SB all-in 50, BB calls 50 (stack remains 50)
      const players = [
        mkPlayer('SB', 0, true, true),    // all-in
        mkPlayer('BB', 50, true, false),  // called, still has chips
      ];
      const active = getActivePlayers(players);
      expect(active).toEqual(['SB', 'BB']);
    });
  });

  // ============================================================
  // シナリオ2: 3way 1人fold, 2人参加 → 2人が候補
  // ============================================================
  describe('シナリオ2: 3way 1人fold → 2人が候補', () => {
    it('UTG fold, SB/BB active: 勝者候補 = SB, BB', () => {
      const players = [
        mkPlayer('UTG', 100, false, false),  // folded
        mkPlayer('SB', 80, true, false),
        mkPlayer('BB', 80, true, false),
      ];
      const active = getActivePlayers(players);
      expect(active).toEqual(['SB', 'BB']);
      expect(active).not.toContain('UTG');
    });

    it('SB fold, UTG all-in, BB active: 勝者候補 = UTG, BB', () => {
      const players = [
        mkPlayer('UTG', 0, true, true),     // all-in
        mkPlayer('SB', 100, false, false),   // folded
        mkPlayer('BB', 50, true, false),     // active
      ];
      const active = getActivePlayers(players);
      expect(active).toEqual(['UTG', 'BB']);
      expect(active).not.toContain('SB');
    });

    it('3way全員all-in: 勝者候補 = 3人', () => {
      const players = [
        mkPlayer('UTG', 0, true, true),
        mkPlayer('SB', 0, true, true),
        mkPlayer('BB', 0, true, true),
      ];
      const active = getActivePlayers(players);
      expect(active).toEqual(['UTG', 'SB', 'BB']);
      expect(active).toHaveLength(3);
    });

    it('2人fold → 1人のみactive（ハンド終了ケース）', () => {
      const players = [
        mkPlayer('UTG', 100, false, false),  // folded
        mkPlayer('SB', 100, false, false),   // folded
        mkPlayer('BB', 103, true, false),    // winner (pot collected)
      ];
      const active = getActivePlayers(players);
      expect(active).toEqual(['BB']);
      expect(active).toHaveLength(1);
    });
  });

  // ============================================================
  // シナリオ3: リレイズall-in時のプレイヤー状態確認
  // ============================================================
  describe('シナリオ3: リレイズall-in時のプレイヤー状態', () => {
    it('SB bet → BB raise → SB re-raise all-in: SB=all-in+active, BB=active', () => {
      // SB bet 10, BB raise 30, SB re-raise all-in (stack=0)
      const players = [
        mkPlayer('SB', 0, true, true),     // re-raise all-in
        mkPlayer('BB', 70, true, false),   // raised, still has chips (needs to act)
      ];
      const active = getActivePlayers(players);
      expect(active).toEqual(['SB', 'BB']);

      const acting = getActingPlayers(players);
      expect(acting).toEqual(['BB']); // BBのみアクション可能
    });

    it('SB bet → BB all-in → SB call(stack=0): 両者all-in候補', () => {
      // SB bet 10, BB all-in 100, SB calls (stack goes to 0)
      const players = [
        mkPlayer('SB', 0, true, true),   // called, stack=0 → isAllIn
        mkPlayer('BB', 0, true, true),   // all-in
      ];
      const active = getActivePlayers(players);
      expect(active).toEqual(['SB', 'BB']);
      expect(getActingPlayers(players)).toHaveLength(0);
    });

    it('3way: UTG raise → SB re-raise all-in → BB fold → UTG call: 候補=UTG,SB', () => {
      const players = [
        mkPlayer('UTG', 20, true, false),   // called the re-raise
        mkPlayer('SB', 0, true, true),      // re-raise all-in
        mkPlayer('BB', 100, false, false),   // folded
      ];
      const active = getActivePlayers(players);
      expect(active).toEqual(['UTG', 'SB']);
      expect(active).not.toContain('BB');
    });
  });

  // ============================================================
  // シナリオ4: record/page.tsx の winnerCandidates 生成ロジック再現
  // ============================================================
  describe('シナリオ4: winnerCandidates生成ロジック（record/page.tsx L910-911）', () => {
    it('players.filter(p => p.active) は getActivePlayers と同等', () => {
      const players = [
        mkPlayer('UTG', 0, true, true),
        mkPlayer('SB', 100, false, false),
        mkPlayer('BB', 50, true, false),
      ];
      // record/page.tsx L910-911 の実装を直接再現
      const winnerCandidates = players.filter(p => p.active).map(p => p.position);
      const fromUtil = getActivePlayers(players);
      expect(winnerCandidates).toEqual(fromUtil);
    });

    it('fold済みプレイヤーは候補から除外される', () => {
      const players = [
        mkPlayer('SB', 50, false, false),   // folded
        mkPlayer('BB', 150, true, false),    // winner
      ];
      const candidates = players.filter(p => p.active).map(p => p.position);
      expect(candidates).toEqual(['BB']);
      expect(candidates).not.toContain('SB');
    });

    it('all-inプレイヤーは候補に含まれる（active=true）', () => {
      const players = [
        mkPlayer('SB', 0, true, true),     // all-in but active
        mkPlayer('BB', 100, true, false),  // normal active
      ];
      const candidates = players.filter(p => p.active).map(p => p.position);
      expect(candidates).toContain('SB');
      expect(candidates).toContain('BB');
      expect(candidates).toHaveLength(2);
    });
  });

  // ============================================================
  // シナリオ5: handleWinnerSelect の losers 算出ロジック
  // ============================================================
  describe('シナリオ5: handleWinnerSelect losers算出（record/page.tsx L398-412）', () => {
    it('勝者1人選択時、残りのactiveプレイヤーがloser', () => {
      const players = [
        mkPlayer('SB', 0, true, true),
        mkPlayer('BB', 0, true, true),
      ];
      const activePlayers = getActivePlayers(players);
      const winner: Position = 'SB';
      const winners = [winner];
      const losers = activePlayers.filter(p => !winners.includes(p));
      expect(losers).toEqual(['BB']);
    });

    it('3way、1人fold、勝者1人: loser=残り1人のactive', () => {
      const players = [
        mkPlayer('UTG', 100, false, false),  // folded - not in activePlayers
        mkPlayer('SB', 0, true, true),
        mkPlayer('BB', 50, true, false),
      ];
      const activePlayers = getActivePlayers(players);
      const winner: Position = 'SB';
      const losers = activePlayers.filter(p => ![winner].includes(p));
      expect(losers).toEqual(['BB']);
      expect(losers).not.toContain('UTG'); // folded → not in active → not in losers
    });

    it('split pot（複数勝者）: 勝者以外がloser', () => {
      const players = [
        mkPlayer('UTG', 0, true, true),
        mkPlayer('SB', 0, true, true),
        mkPlayer('BB', 0, true, true),
      ];
      const activePlayers = getActivePlayers(players);
      const winners: Position[] = ['UTG', 'SB'];
      const losers = activePlayers.filter(p => !winners.includes(p));
      expect(losers).toEqual(['BB']);
    });
  });
});
