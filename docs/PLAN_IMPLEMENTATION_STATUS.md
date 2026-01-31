# 計画実装状況（poker3 MCP・UX・スタック・対向者）

## 実装済みと修正内容

| # | 計画項目 | 状態 | 実装箇所・備考 |
|---|----------|------|----------------|
| 1 | MCP活用・PMO/サブエージェント | ✅ | `docs/PMO_SUBAGENT.md` |
| 2 | カードP5風（斜め・バウンド） | ✅ | `CardReel.tsx`, `BoardSelector.tsx`, `HeroSelector.tsx` |
| 3 | 全員フォールド（No open）→ 勝者へ直行 | ✅ | `record/page.tsx` handlePreflopWhoOpen('none') → setStep('winner') |
| 4 | スタック計算（addAction / addActions） | ✅ 修正済 | `HandContext.tsx` コール額を contribution ベースで算出。**addActions の contribBefore を「現在の action 追加前」の hand.actions で計算するよう修正** |
| 5 | 対向者フロー（次に動いた1ポジション + Call/Raise） | ✅ | `record/page.tsx` preflopOpponents 2段階、handlePreflopOpponentsConfirm |
| 6 | マイハンド・マイポジション常時表示 | ✅ | `record/page.tsx` position/action ヘッダー |
| 7 | 残りポジション表示 | ✅ | 同上「残り: UTG, CO, BTN」 |
| 8 | リバー完了 → 勝者ステップ | ✅ | `record/page.tsx` useEffect (river + board 5枚 + nextToAct null) |

## 今回の追加修正

- **addActions の contribBefore バグ**: ループ内で `hand.actions` を「現在の action を足す前」で使うよう変更。これまで「足した後」の `hand.actions` で contribution を計算しており、コール時のスタック減算が誤る可能性があった。

## まだ直っていない可能性がある点

- 実際の操作で「こう動いてほしいのに動かない」箇所があれば、**どの画面で・何をしたときか**を教えてください。例:
  - 「No open のあと勝者画面にならない」
  - 「オープナーがベットしたあと、次に動いたポジションを1つ選ぶ画面にならない」
  - 「フロップ以降でストリートが進まない」
  - 「リバーでアクションしたあと勝者に進まない」
  - 「ポットやスタックの数字がおかしい」

上記のように具体的なフローを教えてもらえれば、その部分を重点的に直します。
