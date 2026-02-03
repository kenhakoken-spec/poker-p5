import type { Hand, ActionRecord, ShowdownHand } from '@/types/poker';
import { evaluateHandRank } from './handRank';

// App URL (後で変更しやすく定数化)
export const APP_URL = 'https://poker-p5.vercel.app/';

// ランダムスタイル（8種類）
const STYLES = [
  '劇画風',
  'アメコミ風',
  'サイバーパンク風',
  '水墨画風',
  '映画のクライマックスシーン',
  '浮世絵風',
  'ピクサー風アニメ',
  'レトロな油絵',
];

/**
 * ランダムスタイルを1つ選ぶ
 */
export function getRandomStyle(): string {
  return STYLES[Math.floor(Math.random() * STYLES.length)];
}

/**
 * カード表記変換：内部表記(例:'Ah')→表示表記(例:'A♥')
 * poker3の内部表記を確認して変換
 */
function formatCard(card: string): string {
  // カードは既に '♠', '♥', '♦', '♣' の絵文字を含んでいる可能性が高い
  // そのまま返す（HistoryContent.tsxでも同じ表記を使用）
  return card;
}

/**
 * カード配列を文字列に変換（例: ['A♥', 'K♦'] → 'A♥K♦'）
 */
function formatCards(cards: string[]): string {
  return cards.map(formatCard).join('');
}

/**
 * 役のランクを数値化（比較用）
 */
function getRankValue(rankName: string): number {
  const ranks: Record<string, number> = {
    'High Card': 1,
    'One Pair': 2,
    'Two Pair': 3,
    'Three of a Kind': 4,
    'Straight': 5,
    'Flush': 6,
    'Full House': 7,
    'Four of a Kind': 8,
    'Straight Flush': 9,
    'Royal Flush': 10,
  };
  return ranks[rankName] ?? 0;
}

/**
 * 一言分岐ロジック（5ケース）
 */
function getComment(hand: Hand): string {
  const heroWon = hand.result?.won ?? false;
  const board = hand.board ?? [];
  const heroCards = hand.heroHand ?? [];

  // Hero の役を判定
  let heroRank = 'High Card';
  if (heroCards.length === 2 && board.length >= 3) {
    heroRank = evaluateHandRank(heroCards, board);
  }
  const heroRankValue = getRankValue(heroRank);

  // 最後のアクションがfoldかどうか
  const lastAction = hand.actions[hand.actions.length - 1];
  const endedWithFold = lastAction?.action === 'fold';

  // showdownまで行ったか（fold以外で終了＋winnerPosition設定あり）
  const wentToShowdown = !endedWithFold && hand.winnerPosition != null;

  // Heroのbet/raise回数をカウント
  const heroPosition = hand.heroPosition;
  const heroBetRaiseCount = hand.actions.filter(
    a => a.position === heroPosition && (a.action === 'bet' || a.action === 'raise')
  ).length;

  // 1. バッドビート: Hero敗北 & Heroの役 >= Straight
  if (!heroWon && heroRankValue >= 5) {
    return 'え、待って。これまじ？捲られて死んだんだがｗ';
  }

  // 2. 大勝利: Hero勝利 & Heroの役 >= Straight
  if (heroWon && heroRankValue >= 5) {
    return '脳汁出たわ。完璧にハメたったｗｗ';
  }

  // 3. ブラフ成功: Hero勝利 & 相手がfoldで終了
  if (heroWon && endedWithFold) {
    return '心臓バクバク。ハンド何もないけど気合で捲ったｗｗｗ';
  }

  // 4. ブラフ失敗: Hero敗北 & showdownまで行った & Heroの役 <= One Pair & Heroがbet/raiseを1回以上実行
  if (!heroWon && wentToShowdown && heroRankValue <= 2 && heroBetRaiseCount >= 1) {
    return 'やっちまった。ブラフ見抜かれて全部持ってかれたｗ';
  }

  // 5. 通常: 上記以外
  return 'ポーカー難しすぎ。でも次は勝つぞ！';
}

/**
 * 対戦相手を選出（3ルール）
 */
function selectOpponent(hand: Hand): string | null {
  const heroPosition = hand.heroPosition;
  const heroWon = hand.result?.won ?? false;
  const winnerPosition = hand.winnerPosition;
  const showdownHands = hand.showdownHands ?? [];

  // 最後のアクションがfoldかどうか
  const lastAction = hand.actions[hand.actions.length - 1];
  const endedWithFold = lastAction?.action === 'fold';

  if (!heroPosition) return null;

  // Hero敗北 → 勝者
  if (!heroWon && winnerPosition) {
    const winner = Array.isArray(winnerPosition) ? winnerPosition[0] : winnerPosition;
    return winner;
  }

  // Hero勝利 & showdown → ハンドが見えてる敗者（次点でただの敗者）
  if (heroWon && !endedWithFold) {
    // showdownHands からHero以外を探す
    const opponentHand = showdownHands.find(sh => sh.position !== heroPosition && sh.hand !== 'muck');
    if (opponentHand) return opponentHand.position;

    // ハンドが見えてない敗者（参加者からHeroを除く）
    const opponent = hand.positions.find(p => p !== heroPosition);
    if (opponent) return opponent;
  }

  // Hero勝利 & fold → foldした敗者
  if (heroWon && endedWithFold) {
    return lastAction.position;
  }

  return null;
}

/**
 * 展開テキスト生成
 */
function getMatchup(hand: Hand): string {
  const heroPosition = hand.heroPosition;
  const heroCards = hand.heroHand ?? [];
  const board = hand.board ?? [];
  const opponent = selectOpponent(hand);

  if (!heroPosition || !opponent) return '';

  // 最後のアクションがfoldかどうか
  const lastAction = hand.actions[hand.actions.length - 1];
  const endedWithFold = lastAction?.action === 'fold';

  // Hero の役
  let heroRank = '';
  if (heroCards.length === 2 && board.length >= 3) {
    heroRank = evaluateHandRank(heroCards, board);
  }

  // showdown時
  if (!endedWithFold && hand.showdownHands) {
    const opponentHand = hand.showdownHands.find(sh => sh.position === opponent);
    let opponentCards: string[] = [];
    if (opponentHand && opponentHand.hand !== 'muck') {
      opponentCards = opponentHand.hand;
    }

    let opponentRank = '';
    if (opponentCards.length === 2 && board.length >= 3) {
      opponentRank = evaluateHandRank(opponentCards, board);
    }

    const heroText = `Hero(${formatCards(heroCards)}${heroRank ? ' ' + heroRank : ''})`;
    const opponentText = opponentCards.length > 0 && opponentRank
      ? `${opponent}(${formatCards(opponentCards)} ${opponentRank})`
      : opponent;

    return `${heroText} vs ${opponentText}`;
  }

  // fold時
  if (endedWithFold) {
    const heroText = `Hero(${formatCards(heroCards)})`;
    const actionText = lastAction.position === heroPosition ? 'fold' : 'bet';
    const opponentAction = lastAction.position === heroPosition ? '' : ` → ${opponent} fold`;
    return `${heroText} ${actionText}${opponentAction}`;
  }

  return '';
}

/**
 * ボードカード表示
 */
function getBoardText(hand: Hand): string {
  const board = hand.board ?? [];
  if (board.length === 0) return ''; // プリフロップ終了
  return formatCards(board);
}

/**
 * X投稿テキスト生成（メイン関数）
 * @returns https://twitter.com/intent/tweet?text=... のURL文字列
 */
export function generateXPostText(hand: Hand): string {
  const style = getRandomStyle();
  const comment = getComment(hand);
  const boardText = getBoardText(hand);
  const matchup = getMatchup(hand);

  // テンプレート組み立て
  let text = `.@grok 【${style}】でこのポーカーを1枚絵にして！\n`;
  text += `${comment}\n`;
  if (boardText) {
    text += `Board: ${boardText}\n`;
  }
  text += `${matchup}\n`;
  text += `#LivePoker ${APP_URL}`;

  // URLエンコード
  const encodedText = encodeURIComponent(text);
  return `https://twitter.com/intent/tweet?text=${encodedText}`;
}
