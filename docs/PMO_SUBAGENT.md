# PMO / サブエージェント運用（poker3）

Zenn / [multi-agent-shogun](https://github.com/yohey-w/multi-agent-shogun) を参考に、poker3 用に簡略化したタスクの渡し方・受け方・MCP の使いどころをまとめる。

## 役割分担

| 役割 | 担当 | やること |
|------|------|----------|
| **PMO（メインエージェント）** | 将軍・家老に相当 | タスク分解、指示書の作成、完了条件の明示、参照ファイルの指定。実装は書かない。 |
| **サブエージェント** | 足軽に相当 | 指示書に従い実装 → 単体/E2E 実行 → **MCP ブラウザで画面確認**まで実施。完了報告は「やったこと・変更ファイル・残課題」を短く。 |

## 指示書の書き方（PMO → サブエージェント）

- **形式**: 箇条書きで簡潔に（YAML のような構造でよい）。
- **必須項目**:
  - **何をやるか**: 機能・修正の概要
  - **どこまでやるか**: 完了条件（例: 「preflopOpponents で 1 ポジション選択＋Call/Raise 2 択になること」）
  - **参照ファイル**: 編集対象・参照すべきファイルのパス
- **推奨**: 変更後は **MCP ブラウザ（cursor-browser-extension）で画面確認する** ことを指示に含める。

例:

```yaml
タスク: 対向者フローを「次に動いた1ポジション」方式に変更
完了条件:
  - preflopOpponents が 2 段階（1ポジション選択 → Call/Raise 2択）
  - オープナーと選んだポジションの間は自動 fold
参照: app/record/page.tsx (preflopOpponents, handlePreflopOpponents)
確認: 実装後に MCP browser_navigate → browser_snapshot / browser_click で記録画面を確認
```

## サブエージェントの受け方

1. 指示書の「参照ファイル」を開き、完了条件を満たすように実装する。
2. 単体テスト・E2E を実行し、失敗があれば修正する。
3. **変更後は MCP ブラウザで画面確認する**: `browser_navigate` で記録画面を開き、`browser_snapshot` や `browser_click` でフローが意図どおりか確認する。
4. 完了報告: やったこと・変更したファイル・残課題（あれば）を短く返す。

## MCP の使いどころ

- **cursor-browser-extension**
  - フロント / 記録フローの変更後、実機同様の操作確認に使う。
  - `browser_navigate` → `browser_snapshot` / `browser_click` で E2E と併用。
- **project-0-poker3-serena (serena)**
  - コードベース検索・シンボル参照・メモリ書き込みなど、コンテキスト維持やタスク分解時に利用する。

## 注意

- 計画・タスク説明に「変更後は MCP ブラウザで画面確認する」を明記し、実装担当（サブエージェント）に渡す指示に含めること。
