'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function TestGeminiPage() {
  const [showCopyLink, setShowCopyLink] = useState(false);

  const handleShareAPI = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Poker Hand', text: 'テストテキスト' });
      } else {
        alert('Share API not supported');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText('テスト');
      setShowCopyLink(true);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        color: '#fff',
        padding: '20px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' }}>
        Gemini Link Test - 24 Patterns (A〜X)
      </h1>
      <p style={{ fontSize: '0.875rem', color: '#888', marginBottom: '32px' }}>
        ※ Vercel + Android Chrome実機でテストしてください
      </p>

      {/* ━━━ セクション1: 素のaタグ × target違い ━━━ */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px', color: '#0ff' }}>
          セクション1: 素のaタグ × target違い
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Pattern A */}
          <a
            href="https://gemini.google.com/app"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '12px 16px',
              background: '#1a1a1a',
              color: '#fff',
              textDecoration: 'none',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          >
            <strong style={{ color: '#0ff' }}>A.</strong> _blank + rel="noopener noreferrer"
          </a>

          {/* Pattern B */}
          <a
            href="https://gemini.google.com/app"
            target="_blank"
            style={{
              display: 'inline-block',
              padding: '12px 16px',
              background: '#1a1a1a',
              color: '#fff',
              textDecoration: 'none',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          >
            <strong style={{ color: '#0ff' }}>B.</strong> _blank のみ
          </a>

          {/* Pattern C */}
          <a
            href="https://gemini.google.com/app"
            target="_top"
            style={{
              display: 'inline-block',
              padding: '12px 16px',
              background: '#1a1a1a',
              color: '#fff',
              textDecoration: 'none',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          >
            <strong style={{ color: '#0ff' }}>C.</strong> _top
          </a>

          {/* Pattern D */}
          <a
            href="https://gemini.google.com/app"
            target="_self"
            style={{
              display: 'inline-block',
              padding: '12px 16px',
              background: '#1a1a1a',
              color: '#fff',
              textDecoration: 'none',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          >
            <strong style={{ color: '#0ff' }}>D.</strong> _self
          </a>

          {/* Pattern E */}
          <a
            href="https://gemini.google.com/app"
            style={{
              display: 'inline-block',
              padding: '12px 16px',
              background: '#1a1a1a',
              color: '#fff',
              textDecoration: 'none',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          >
            <strong style={{ color: '#0ff' }}>E.</strong> target指定なし
          </a>
        </div>
      </section>

      {/* ━━━ セクション2: URL変種 × _blank ━━━ */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px', color: '#0ff' }}>
          セクション2: URL変種 × _blank
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Pattern F */}
          <a
            href="https://gemini.google.com/"
            target="_blank"
            style={{
              display: 'inline-block',
              padding: '12px 16px',
              background: '#1a1a1a',
              color: '#fff',
              textDecoration: 'none',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          >
            <strong style={{ color: '#0ff' }}>F.</strong> gemini.google.com/ (ルート)
          </a>

          {/* Pattern G */}
          <a
            href="https://gemini.google.com/app?hl=ja"
            target="_blank"
            style={{
              display: 'inline-block',
              padding: '12px 16px',
              background: '#1a1a1a',
              color: '#fff',
              textDecoration: 'none',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          >
            <strong style={{ color: '#0ff' }}>G.</strong> ?hl=ja付き
          </a>

          {/* Pattern H */}
          <a
            href="https://g.co/gemini"
            target="_blank"
            style={{
              display: 'inline-block',
              padding: '12px 16px',
              background: '#1a1a1a',
              color: '#fff',
              textDecoration: 'none',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          >
            <strong style={{ color: '#0ff' }}>H.</strong> g.co/gemini (短縮URL)
          </a>

          {/* Pattern I */}
          <a
            href="https://gemini.google.com/app/new"
            target="_blank"
            style={{
              display: 'inline-block',
              padding: '12px 16px',
              background: '#1a1a1a',
              color: '#fff',
              textDecoration: 'none',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          >
            <strong style={{ color: '#0ff' }}>I.</strong> /app/new
          </a>
        </div>
      </section>

      {/* ━━━ セクション3: JS経由（window.open等） ━━━ */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px', color: '#0ff' }}>
          セクション3: JS経由（window.open等）
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Pattern J */}
          <button
            onClick={() => window.open('https://gemini.google.com/app', '_blank')}
            style={{
              padding: '12px 16px',
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <strong style={{ color: '#0ff' }}>J.</strong> window.open(_blank)
          </button>

          {/* Pattern K */}
          <button
            onClick={() => window.open('https://gemini.google.com/app')}
            style={{
              padding: '12px 16px',
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <strong style={{ color: '#0ff' }}>K.</strong> window.open(指定なし)
          </button>

          {/* Pattern L */}
          <button
            onClick={() => { location.href = 'https://gemini.google.com/app' }}
            style={{
              padding: '12px 16px',
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <strong style={{ color: '#0ff' }}>L.</strong> location.href
          </button>

          {/* Pattern M */}
          <button
            onClick={() => window.location.assign('https://gemini.google.com/app')}
            style={{
              padding: '12px 16px',
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <strong style={{ color: '#0ff' }}>M.</strong> location.assign
          </button>
        </div>
      </section>

      {/* ━━━ セクション4: React/Next.js的な実装 ━━━ */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px', color: '#0ff' }}>
          セクション4: React/Next.js的な実装
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Pattern N */}
          <Link
            href="https://gemini.google.com/app"
            target="_blank"
            style={{
              display: 'inline-block',
              padding: '12px 16px',
              background: '#1a1a1a',
              color: '#fff',
              textDecoration: 'none',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          >
            <strong style={{ color: '#0ff' }}>N.</strong> Next.js Link
          </Link>

          {/* Pattern O */}
          <motion.a
            href="https://gemini.google.com/app"
            target="_blank"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'inline-block',
              padding: '12px 16px',
              background: '#1a1a1a',
              color: '#fff',
              textDecoration: 'none',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          >
            <strong style={{ color: '#0ff' }}>O.</strong> framer-motion (motion.a)
          </motion.a>

          {/* Pattern P */}
          <div
            onClick={() => window.open('https://gemini.google.com/app', '_blank')}
            style={{
              padding: '12px 16px',
              background: '#1a1a1a',
              border: '1px solid #444',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <a
              href="https://gemini.google.com/app"
              target="_blank"
              style={{
                color: '#fff',
                textDecoration: 'none',
                fontSize: '1rem',
              }}
            >
              <strong style={{ color: '#0ff' }}>P.</strong> 親divがonClick、子aがhref（干渉パターン）
            </a>
          </div>
        </div>
      </section>

      {/* ━━━ セクション5: Android固有 ━━━ */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px', color: '#0ff' }}>
          セクション5: Android固有
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Pattern Q */}
          <a
            href="intent://gemini.google.com/app#Intent;scheme=https;package=com.google.android.apps.bard;end"
            style={{
              display: 'inline-block',
              padding: '12px 16px',
              background: '#1a1a1a',
              color: '#fff',
              textDecoration: 'none',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          >
            <strong style={{ color: '#0ff' }}>Q.</strong> Intent URI
          </a>

          {/* Pattern R */}
          <a
            href="intent://gemini.google.com/app#Intent;scheme=https;package=com.google.android.apps.bard;S.browser_fallback_url=https://gemini.google.com/app;end"
            style={{
              display: 'inline-block',
              padding: '12px 16px',
              background: '#1a1a1a',
              color: '#fff',
              textDecoration: 'none',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          >
            <strong style={{ color: '#0ff' }}>R.</strong> Intent URI + browser_fallback_url
          </a>

          {/* Pattern S */}
          <button
            onClick={handleShareAPI}
            style={{
              padding: '12px 16px',
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <strong style={{ color: '#0ff' }}>S.</strong> Share API (navigator.share)
          </button>
        </div>
      </section>

      {/* ━━━ セクション6: 環境干渉の再現（★最重要★） ━━━ */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px', color: '#f00' }}>
          セクション6: 環境干渉の再現（★最重要★）
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Pattern T: 完全再現 */}
          <div>
            <p style={{ fontSize: '0.875rem', color: '#888', marginBottom: '8px' }}>
              <strong style={{ color: '#0ff' }}>T.</strong> HistoryContent.tsx実装の完全再現
            </p>
            <div className="flex items-center gap-2 mb-4">
              <a
                href="https://gemini.google.com/app"
                target="_blank"
                rel="noopener"
                style={{
                  display: 'inline-block',
                  padding: '6px 10px',
                  background: '#D50000',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.75rem',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
                className="font-p5-en"
              >
                Open Gemini
              </a>
              <motion.button
                className="px-4 py-1.5 font-bold text-xs border bg-black border-white/30 text-gray-400"
                style={{ clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => console.log('Favorites clicked')}
              >
                ☆ Favorites
              </motion.button>
            </div>
          </div>

          {/* Pattern U: motion要素を除去 */}
          <div>
            <p style={{ fontSize: '0.875rem', color: '#888', marginBottom: '8px' }}>
              <strong style={{ color: '#0ff' }}>U.</strong> Tと同じだがmotion.buttonを普通のbuttonに変更
            </p>
            <div className="flex items-center gap-2 mb-4">
              <a
                href="https://gemini.google.com/app"
                target="_blank"
                rel="noopener"
                style={{
                  display: 'inline-block',
                  padding: '6px 10px',
                  background: '#D50000',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.75rem',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
                className="font-p5-en"
              >
                Open Gemini
              </a>
              <button
                className="px-4 py-1.5 font-bold text-xs border bg-black border-white/30 text-gray-400"
                style={{ clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}
                onClick={() => console.log('Favorites clicked')}
              >
                ☆ Favorites
              </button>
            </div>
          </div>

          {/* Pattern V: onClickを除去 */}
          <div>
            <p style={{ fontSize: '0.875rem', color: '#888', marginBottom: '8px' }}>
              <strong style={{ color: '#0ff' }}>V.</strong> Tと同じだがonClickイベントハンドラを全て除去
            </p>
            <div className="flex items-center gap-2 mb-4">
              <a
                href="https://gemini.google.com/app"
                target="_blank"
                rel="noopener"
                style={{
                  display: 'inline-block',
                  padding: '6px 10px',
                  background: '#D50000',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.75rem',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
                className="font-p5-en"
              >
                Open Gemini
              </a>
              <motion.button
                className="px-4 py-1.5 font-bold text-xs border bg-black border-white/30 text-gray-400"
                style={{ clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
              >
                ☆ Favorites
              </motion.button>
            </div>
          </div>

          {/* Pattern W: 親要素のCSSを除去 */}
          <div>
            <p style={{ fontSize: '0.875rem', color: '#888', marginBottom: '8px' }}>
              <strong style={{ color: '#0ff' }}>W.</strong> Tと同じだが親要素のCSS(flex, gap等)を全て除去
            </p>
            <div>
              <a
                href="https://gemini.google.com/app"
                target="_blank"
                rel="noopener"
                style={{
                  display: 'inline-block',
                  padding: '6px 10px',
                  background: '#D50000',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.75rem',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
                className="font-p5-en"
              >
                Open Gemini
              </a>
              <motion.button
                className="px-4 py-1.5 font-bold text-xs border bg-black border-white/30 text-gray-400"
                style={{ clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)' }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => console.log('Favorites clicked')}
              >
                ☆ Favorites
              </motion.button>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ セクション7: クリップボード+遷移（2段階） ━━━ */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px', color: '#0ff' }}>
          セクション7: クリップボード+遷移（2段階）
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Pattern X */}
          <div>
            {!showCopyLink ? (
              <button
                onClick={handleCopy}
                style={{
                  padding: '12px 16px',
                  background: '#1a1a1a',
                  color: '#fff',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <strong style={{ color: '#0ff' }}>X.</strong> Copy → コピー成功後にリンク表示
              </button>
            ) : (
              <a
                href="https://gemini.google.com/app"
                target="_blank"
                style={{
                  display: 'inline-block',
                  padding: '12px 16px',
                  background: '#0a0',
                  color: '#fff',
                  textDecoration: 'none',
                  border: '1px solid #0f0',
                  borderRadius: '4px',
                  fontSize: '1rem',
                }}
              >
                <strong style={{ color: '#0ff' }}>X.</strong> コピー成功！→ Geminiを開く
              </a>
            )}
          </div>
        </div>
      </section>

      <div style={{ marginTop: '40px', fontSize: '0.875rem', color: '#888' }}>
        <p>※ セクション6（T〜W）が最重要: HistoryContent.tsxとの干渉要素の切り分け</p>
        <p>※ 各パターンでGeminiアプリが起動するか実機で確認してください</p>
      </div>
    </div>
  );
}
