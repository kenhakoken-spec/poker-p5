# THルール検証サブエージェント

## 概要

テキサスホールデム 6-max ルールに準拠しているかを**検証専用**で担当するサブエージェントの定義書。実装は行わず、検証・報告・修正依頼までを行う。

## 責務

1. **検証仕様の準拠確認**: [TEST_SPEC_TEXAS_HOLDEM.md](./TEST_SPEC_TEXAS_HOLDEM.md) の全カテゴリについて、コード（HandContext, potUtils, bettingUtils, pokerUtils）と動作が一致しているかを検証する。
2. **記録フロー監督**: ポーカー流れ的に無理な操作ができないようにする。`utils/recordFlowValidation.ts` で「次にアクションするポジションのみ選択可能」「許可されたアクションのみ送信可能」を強制し、UI（PositionSelector の allowedPositions、addAction 前の validateAction）で制約する。
3. **検証の実行**: `tests/` 以下の TH 準拠用テスト（単体・統合・recordFlowValidation）を実行し、失敗があれば原因を特定して報告する。
4. **回帰防止**: ロジック変更のたびに検証を回し、「止まらずに検証を繰り返す」サイクルを維持する。
5. **成果物**: 検証結果レポート（パス/失敗一覧）、失敗時の再現手順・期待値 vs 実際の値、必要なら修正依頼リスト。

## 検証観点（TEST_SPEC との対応）

| カテゴリ | 観点 |
|----------|------|
| 初期化 | 初期ポット 1.5BB、全員 100BB、Preflop は UTG から、Postflop は SB から、heroPosition/heroHand 保存 |
| プリフロップ | アクション順 UTG→MP→CO→BTN→SB→BB、ベット 2x/3x/all-in、全員フォールドでハンド終了 |
| ポストフロップ | アクション順 SB→BB→UTG→MP→CO→BTN、Pot-relative/Bet-relative、チェック/ベット-コールで次ストリート |
| ポット計算 | 初期 1.5BB、ベット/レイズ/コールで加算、ストリートごと正確 |
| ストリート進行 | ラウンド閉鎖時のみ次ストリート、全員チェックで次、最後のアグレッサーに手番が戻り全員コール/フォールドで次、1人残りはハンド終了 |
| ハンド終了 | 1人残りで終了、リバー完了で終了、全員オールインでストリート進行 |
| アクション可否 | チェック/コール/ベット/レイズ/フォールドの条件が正しい |
| 最小レイズ | 最初のベット最小2BB、レイズは前の2倍が最小 |
| BBオプション | 全員リンプ時 BB はチェック or レイズ可能 |
| マルチウェイ/ヘッズアップ | 3人以上・2人のアクション順が正しい |
| オールイン | 全員オールイン時自動スキップ、ポット・ストリート進行が正しい |

## 実行方法

```bash
npm run test
```

- 対象: `tests/pokerLogic.test.ts`, `tests/thVerification*.test.ts`（存在する場合）
- 失敗時: 失敗したテスト名・期待値・実際の値をレポートし、該当する utils/contexts の修正依頼を出す。

## 検証ループ

1. 実装側が HandContext / potUtils / bettingUtils / pokerUtils を変更する。
2. TH検証サブエージェントが `npm run test` を実行する。
3. 全パスなら「TH準拠検証パス」と報告。失敗なら原因・再現手順・修正依頼を出し、実装側が修正。
4. 修正後、再度 2 に戻り、全パスするまで繰り返す。

## 記録フロー監督（無効操作の防止）

- **選択可能ポジション**: このストリートで「次にアクションする」ポジションのみ選択可能。`getSelectablePositions(gameState)` で 1 件のみ返す。PositionSelector に `allowedPositions` を渡し、それ以外は disabled。
- **送信可能アクション**: addAction 前に `validateAction(record, gameState)` で検証。無効なら addAction せずエラー表示。

## 参照ファイル

- 検証仕様: [docs/TEST_SPEC_TEXAS_HOLDEM.md](./TEST_SPEC_TEXAS_HOLDEM.md)
- 記録フロー検証: [utils/recordFlowValidation.ts](../utils/recordFlowValidation.ts)
- 単体テスト: [tests/pokerLogic.test.ts](../tests/pokerLogic.test.ts), [tests/recordFlowValidation.test.ts](../tests/recordFlowValidation.test.ts)
- TH検証拡張テスト: [tests/thVerification.test.ts](../tests/thVerification.test.ts)
- ロジック: [contexts/HandContext.tsx](../contexts/HandContext.tsx), [utils/potUtils.ts](../utils/potUtils.ts), [utils/bettingUtils.ts](../utils/bettingUtils.ts), [utils/pokerUtils.ts](../utils/pokerUtils.ts)
