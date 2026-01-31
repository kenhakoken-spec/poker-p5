import { test, expect } from '@playwright/test';

test.describe('Record flow E2E', () => {
  test('TOP → 記録開始 → ヒーロー選択（ハンド必須）→ Who is Open? → 結果まで最短で完了', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');
    await expect(page).toHaveURL('/');

    await page.getByRole('link', { name: /記録開始/ }).click();
    await expect(page).toHaveURL('/record');

    await page.getByRole('button', { name: /開始/ }).first().click();
    await expect(page.getByText(/Select your position/)).toBeVisible();

    // ポジション選択
    await page.getByTestId('hero-position-BB').click();
    
    // ハンド選択（必須）: 2枚選ぶまで「開始」は無効
    await expect(page.getByTestId('hero-start-area')).toBeVisible({ timeout: 5000 });
    const startBtn = page.getByRole('button', { name: '開始' });
    await expect(startBtn).toBeDisabled();
    
    // カード2枚選択（SuitBasedCardReelに対応）
    await page.getByTestId('card-A♠').click();
    await page.getByTestId('card-K♠').click();
    await expect(startBtn).toBeEnabled();
    
    await startBtn.click();
    await expect(page.getByText(/Who is Open/)).toBeVisible();

    // Who is Open: UTG を選択 → ボトムシートで Bet 3 BB
    await page.getByRole('button', { name: 'UTG' }).click();
    await expect(page.getByText(/Open size/)).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: /Bet 3/ }).click();
    // プリフロ対向者: Who acted next? → BB → Call でラウンド閉鎖
    await expect(page.getByText(/Who acted next\?/)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'BB' }).click();
    await page.getByRole('button', { name: 'Call' }).click();
    await expect(page.getByText(/アクション|次のストリート|ポジション選択/)).toBeVisible({ timeout: 5000 });
  });

  test('Who is Open で Call (1 BB)（リンプ）を選んで記録が進む', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/record');
    await page.getByRole('button', { name: /開始/ }).first().click();
    await expect(page.getByText(/Select your position/)).toBeVisible();
    await page.getByTestId('hero-position-UTG').click();
    await expect(page.getByTestId('hero-start-area')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('card-A♠').click();
    await page.getByTestId('card-K♥').click();
    await page.getByRole('button', { name: '開始' }).click();
    await expect(page.getByText(/Who is Open/)).toBeVisible();
    await page.getByRole('button', { name: 'UTG' }).click();
    await expect(page.getByText(/Open size/)).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: 'Call (1 BB)' }).click();
    await expect(page.getByText(/Who acted next\?/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/アクション|次のストリート|ポジション選択/)).toBeVisible({ timeout: 5000 });
  });

  test('記録開始 → ヒーローBTN（ハンド必須）→ Who is Open CO → CO 3x → Opponents確定 → ポジション/勝者', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/record');
    await page.getByRole('button', { name: /開始/ }).first().click();
    
    // ポジション選択
    await page.getByTestId('hero-position-BTN').click();
    
    // ハンド選択（必須）
    await expect(page.getByTestId('hero-start-area')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('card-A♠').click();
    await page.getByTestId('card-K♠').click();
    
    await page.getByRole('button', { name: '開始' }).click();
    await page.getByRole('button', { name: 'CO' }).click();
    await expect(page.getByText(/Open size/)).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: /Bet 3/ }).click();
    
    // Who acted next? または次のステップに進む
    await expect(page.getByText(/Who acted next\?|Who is Open\?|ポジション選択|勝者は/)).toBeVisible({ timeout: 10000 });
    
    // Who is Open? が表示されている場合、BTN を選択
    const opponentsVisible = await page.getByText(/Who is Open\?/).isVisible();
    if (opponentsVisible) {
      await page.getByRole('button', { name: 'BTN' }).click();
      // Call または Raise のボタンが表示されるのを待つ
      await page.waitForSelector('button:has-text("Call")', { timeout: 5000 });
      await page.getByRole('button', { name: 'Call' }).click();
    }
    
    // 自動化により、次のプレイヤーのアクション画面 または 勝者選択画面に進む
    await expect(page.getByText(/アクション|勝者は/)).toBeVisible({ timeout: 10000 });
  });

  test('完全フロー: Preflop → Flop → Turn → River → 勝者選択', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/record');

    // ステップ1: ハンド記録開始
    await page.getByRole('button', { name: /開始/ }).first().click();
    
    // ステップ2: ヒーロー選択 (BTN, A♠K♠)
    await page.getByTestId('hero-position-BTN').click();
    await expect(page.getByTestId('hero-start-area')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('card-A♠').click();
    await page.getByTestId('card-K♠').click();
    await page.getByRole('button', { name: '開始' }).click();

    // ステップ3: Preflop - CO opens 3x (bottom sheet), then Who acted next? → BTN → Call
    await expect(page.getByText(/Who is Open/)).toBeVisible();
    await page.getByRole('button', { name: 'CO' }).click();
    await expect(page.getByText(/Open size/)).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: /Bet 3/ }).click();
    await expect(page.getByText(/Who acted next\?/)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'BTN' }).click();
    await page.getByRole('button', { name: 'Call' }).click();

    // Who acted next? → SB → Fold
    await expect(page.getByText(/Who acted next\?|SB.*action/)).toBeVisible({ timeout: 5000 });
    if (await page.getByText(/Who acted next\?/).isVisible()) {
      await page.getByRole('button', { name: 'SB' }).click();
      await page.getByRole('button', { name: /Fold|フォールド/ }).first().click();
    }

    // Who acted next? → BB → Call
    await expect(page.getByText(/Who acted next\?|BB.*action|Flop|Select/)).toBeVisible({ timeout: 5000 });
    if (await page.getByText(/Who acted next\?/).isVisible()) {
      await page.getByRole('button', { name: 'BB' }).click();
      await page.getByRole('button', { name: 'Call' }).click();
    }

    // ステップ4: Flop ボード選択 (Q♠ J♠ 10♠)
    await expect(page.getByText(/FLOP/)).toBeVisible();
    await expect(page.getByText(/フロップ 3枚を選んでください/)).toBeVisible();
    await page.getByTestId('card-Q♠').click();
    await page.getByTestId('card-J♠').click();
    await page.getByTestId('card-10♠').click();
    await page.getByRole('button', { name: '確定' }).click();

    // Flop: 全員チェック (BB → CO → BTN)
    // 自動化により、ボード選択後は直接 BB のアクション選択画面へ
    await expect(page.getByText(/BB - アクション/)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /チェック/ }).click();
    
    await expect(page.getByText(/CO - アクション/)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /チェック/ }).click();
    
    await expect(page.getByText(/BTN - アクション/)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /チェック/ }).click();

    // ステップ5: Turn ボード選択 (9♠)
    await expect(page.getByText(/TURN/)).toBeVisible();
    await expect(page.getByText(/ターン 1枚を選んでください/)).toBeVisible();
    await page.getByTestId('card-9♠').click();
    await page.getByRole('button', { name: '確定' }).click();

    // Turn: 全員チェック (BB → CO → BTN)
    // 自動化により、ボード選択後は直接 BB のアクション選択画面へ
    await expect(page.getByText(/BB - アクション/)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /チェック/ }).click();
    
    await expect(page.getByText(/CO - アクション/)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /チェック/ }).click();
    
    await expect(page.getByText(/BTN - アクション/)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /チェック/ }).click();

    // ステップ6: River ボード選択 (8♠)
    await expect(page.getByText(/RIVER/)).toBeVisible();
    await expect(page.getByText(/リバー 1枚を選んでください/)).toBeVisible();
    await page.getByTestId('card-8♠').click();
    await page.getByRole('button', { name: '確定' }).click();

    // River: 全員チェック (BB → CO → BTN)
    // 自動化により、ボード選択後は直接 BB のアクション選択画面へ
    await expect(page.getByText(/BB - アクション/)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /チェック/ }).click();
    
    await expect(page.getByText(/CO - アクション/)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /チェック/ }).click();
    
    await expect(page.getByText(/BTN - アクション/)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /チェック/ }).click();

    // ステップ7: 勝者選択画面に遷移することを確認
    await expect(page.getByText(/勝者は/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'CO' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'BTN' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'BB' })).toBeVisible();

    // 勝者を選択
    await page.getByRole('button', { name: 'BTN' }).click();
    
    // ショーダウン画面
    await expect(page.getByText(/ショーダウン/)).toBeVisible();
    await page.getByRole('button', { name: /次へ/ }).click();

    // 結果入力
    await expect(page.getByText(/結果/)).toBeVisible();
    await page.getByRole('button', { name: /勝利/ }).click();

    // TOPに戻ることを確認
    await expect(page).toHaveURL('/', { timeout: 5000 });
  });
});
