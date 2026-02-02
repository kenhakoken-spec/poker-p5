'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function TestGeminiPage() {
  const [showCopyLinkY1, setShowCopyLinkY1] = useState(false);
  const [showCopyLinkY2, setShowCopyLinkY2] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // PWA判定
    const pwaCheck = window.matchMedia('(display-mode: standalone)').matches;
    setIsPWA(pwaCheck);
  }, []);

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

  const handleShareAPIWithURL = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Poker Hand',
          text: 'テスト',
          url: 'https://gemini.google.com/app',
        });
      } else {
        alert('Share API not supported');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const handleCopyY1 = async () => {
    try {
      await navigator.clipboard.writeText('テスト');
      setShowCopyLinkY1(true);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleCopyY2 = async () => {
    try {
      await navigator.clipboard.writeText('テスト');
      setShowCopyLinkY2(true);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleZ4 = async () => {
    try {
      await navigator.clipboard.writeText('テスト');
      document.getElementById('gem-link-z4')?.click();
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
        Gemini Link Test - 36 Patterns (A〜Z6)
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
            <strong style={{ color: '#0ff' }}>A.</strong> _blank + rel=&quot;noopener noreferrer&quot;
          </a>

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

      {/* ━━━ セクション5: Android Intent URI ━━━ */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px', color: '#0ff' }}>
          セクション5: Android Intent URI
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <a
            href="intent://gemini.google.com/#Intent;scheme=https;package=com.google.android.apps.bard;end"
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
            <strong style={{ color: '#0ff' }}>Q.</strong> Intent URI (パス無し)
          </a>

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
            <strong style={{ color: '#0ff' }}>R.</strong> Intent URI (/app付き)
          </a>

          <a
            href="intent://gemini.google.com/#Intent;scheme=https;package=com.google.android.apps.bard;S.browser_fallback_url=https%3A%2F%2Fgemini.google.com;end"
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
            <strong style={{ color: '#0ff' }}>S.</strong> Intent URI (fallback付き)
          </a>

          <a
            href="intent://gemini.google.com/app#Intent;scheme=https;package=com.google.android.apps.bard;S.browser_fallback_url=https%3A%2F%2Fgemini.google.com%2Fapp;end"
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
            <strong style={{ color: '#0ff' }}>T.</strong> Intent URI (/app + fallback)
          </a>
        </div>
      </section>

      {/* ━━━ セクション6: Web Share API ━━━ */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px', color: '#0ff' }}>
          セクション6: Web Share API
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
            <strong style={{ color: '#0ff' }}>U.</strong> Share API (navigator.share)
          </button>

          <button
            onClick={handleShareAPIWithURL}
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
            <strong style={{ color: '#0ff' }}>V.</strong> Share API (URL付き)
          </button>
        </div>
      </section>

      {/* ━━━ セクション7: PWA干渉の切り分け（★最重要★） ━━━ */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px', color: '#f00' }}>
          セクション7: PWA干渉の切り分け（★最重要★）
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#ff0', marginBottom: '16px' }}>
          ※ PWA standaloneモードが根本原因の可能性大
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* W1: 完全再現 */}
          <div>
            <p style={{ fontSize: '0.875rem', color: '#888', marginBottom: '8px' }}>
              <strong style={{ color: '#0ff' }}>W1.</strong> HistoryContent.tsx実装の完全再現
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

          {/* W2: motion除去 */}
          <div>
            <p style={{ fontSize: '0.875rem', color: '#888', marginBottom: '8px' }}>
              <strong style={{ color: '#0ff' }}>W2.</strong> W1と同じだがmotion要素を除去
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

          {/* W3: onClick除去 */}
          <div>
            <p style={{ fontSize: '0.875rem', color: '#888', marginBottom: '8px' }}>
              <strong style={{ color: '#0ff' }}>W3.</strong> W1と同じだがonClickイベントハンドラを全て除去
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

          {/* W4: 親CSS除去 */}
          <div>
            <p style={{ fontSize: '0.875rem', color: '#888', marginBottom: '8px' }}>
              <strong style={{ color: '#0ff' }}>W4.</strong> W1と同じだが親要素のCSS(flex, gap等)を全て除去
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

          {/* W5: ネスト解消 */}
          <div>
            <p style={{ fontSize: '0.875rem', color: '#888', marginBottom: '8px' }}>
              <strong style={{ color: '#0ff' }}>W5.</strong> W1と同じだがbuttonタグの外にaタグを出した版（ネスト解消）
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
            </div>
            <div>
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

      {/* ━━━ セクション8: PWA manifest.json調査 ━━━ */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px', color: '#f0f' }}>
          セクション8: PWA manifest.json調査
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* X1: manifest.json内容 */}
          <div style={{ padding: '16px', background: '#1a1a1a', border: '1px solid #444', borderRadius: '4px' }}>
            <p style={{ fontSize: '0.875rem', marginBottom: '8px' }}>
              <strong style={{ color: '#f0f' }}>X1.</strong> manifest.json内容
            </p>
            <pre style={{ fontSize: '0.75rem', color: '#888', whiteSpace: 'pre-wrap' }}>
              manifest.json not found
            </pre>
          </div>

          {/* X2: PWA判定 */}
          <div style={{ padding: '16px', background: '#1a1a1a', border: '1px solid #444', borderRadius: '4px' }}>
            <p style={{ fontSize: '0.875rem', marginBottom: '8px' }}>
              <strong style={{ color: '#f0f' }}>X2.</strong> PWA判定 (display-mode: standalone)
            </p>
            <p style={{ fontSize: '1rem', fontWeight: 'bold', color: isPWA ? '#f00' : '#0f0' }}>
              {isPWA ? 'PWAモード: ON' : 'PWAモード: OFF'}
            </p>
          </div>

          {/* X3: PWAモード警告 */}
          {isPWA && (
            <div style={{ padding: '16px', background: '#330000', border: '2px solid #f00', borderRadius: '4px' }}>
              <p style={{ fontSize: '0.875rem', marginBottom: '8px' }}>
                <strong style={{ color: '#f00' }}>X3.</strong> ⚠️ PWAモード警告
              </p>
              <p style={{ fontSize: '0.875rem', color: '#ff0' }}>
                PWA standaloneモードが検出されました。
                <br />
                これがGemini起動を阻害している可能性が高いです。
                <br />
                通常のブラウザモード（Chromeアドレスバー表示）で再テストしてください。
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ━━━ セクション9: クリップボード+Gemini遷移（2段階） ━━━ */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px', color: '#0ff' }}>
          セクション9: クリップボード+Gemini遷移（2段階）
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Y1 */}
          <div>
            {!showCopyLinkY1 ? (
              <button
                onClick={handleCopyY1}
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
                <strong style={{ color: '#0ff' }}>Y1.</strong> Copy → コピー成功後にaタグでGemini表示
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
                <strong style={{ color: '#0ff' }}>Y1.</strong> コピー成功！→ Geminiを開く
              </a>
            )}
          </div>

          {/* Y2 */}
          <div>
            {!showCopyLinkY2 ? (
              <button
                onClick={handleCopyY2}
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
                <strong style={{ color: '#0ff' }}>Y2.</strong> Copy → コピー成功後にIntent URIでGemini起動
              </button>
            ) : (
              <a
                href="intent://gemini.google.com/#Intent;scheme=https;package=com.google.android.apps.bard;S.browser_fallback_url=https%3A%2F%2Fgemini.google.com;end"
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
                <strong style={{ color: '#0ff' }}>Y2.</strong> コピー成功！→ Intent URIでGemini起動
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ━━━ セクション10: ★ワンボタン コピー+Gemini起動（殿の最終理想形）★ ━━━ */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px', color: '#ff0' }}>
          セクション10: ★ワンボタン コピー+Gemini起動（殿の最終理想形）★
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#ff0', marginBottom: '16px' }}>
          ※ 1タップでクリップボードコピー+Gemini起動を同時実現
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Z1 */}
          <a
            href="https://gemini.google.com/app"
            target="_blank"
            onClick={(e) => {
              try {
                navigator.clipboard.writeText('テスト');
              } catch {}
            }}
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
            <strong style={{ color: '#ff0' }}>Z1.</strong> aタグonClickでコピー、href遷移はデフォルト動作
          </a>

          {/* Z2: レガシーコピー用のhidden textarea */}
          <textarea
            ref={textareaRef}
            value="テスト"
            readOnly
            style={{
              position: 'absolute',
              left: '-9999px',
              opacity: 0,
            }}
          />
          <a
            href="https://gemini.google.com/app"
            target="_blank"
            onClick={(e) => {
              try {
                if (textareaRef.current) {
                  textareaRef.current.select();
                  document.execCommand('copy');
                }
              } catch {}
            }}
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
            <strong style={{ color: '#ff0' }}>Z2.</strong> レガシー同期コピー (execCommand) + aタグ遷移
          </a>

          {/* Z3 */}
          <a
            href="https://gemini.google.com/app"
            target="_blank"
            onClick={(e) => {
              try {
                navigator.clipboard.writeText('テスト');
              } catch {}
            }}
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
            <strong style={{ color: '#ff0' }}>Z3.</strong> clipboard API try/catch版（失敗しても遷移は妨げない）
          </a>

          {/* Z4 */}
          <button
            onClick={handleZ4}
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
            <strong style={{ color: '#ff0' }}>Z4.</strong> ボタンでコピー→プログラム的にaタグclick()
          </button>
          <a
            id="gem-link-z4"
            href="https://gemini.google.com/app"
            target="_blank"
            style={{ display: 'none' }}
          >
            hidden
          </a>

          {/* Z5 */}
          <form action="https://gemini.google.com/app" target="_blank" method="GET">
            <button
              type="submit"
              onClick={(e) => {
                try {
                  navigator.clipboard.writeText('テスト');
                } catch {}
              }}
              style={{
                padding: '12px 16px',
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: '4px',
                fontSize: '1rem',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <strong style={{ color: '#ff0' }}>Z5.</strong> formのsubmitで遷移 + onClickでコピー
            </button>
          </form>

          {/* Z6 */}
          <a
            href="intent://gemini.google.com/#Intent;scheme=https;package=com.google.android.apps.bard;S.browser_fallback_url=https%3A%2F%2Fgemini.google.com;end"
            onClick={(e) => {
              try {
                navigator.clipboard.writeText('テスト');
              } catch {}
            }}
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
            <strong style={{ color: '#ff0' }}>Z6.</strong> Intent URI + onClick同期コピー
          </a>
        </div>
      </section>

      <div style={{ marginTop: '40px', fontSize: '0.875rem', color: '#888' }}>
        <p>※ セクション7（W1〜W5）が最重要: PWA standaloneモードの干渉切り分け</p>
        <p>※ セクション8（X1〜X3）: PWA manifest診断、display-mode判定</p>
        <p>※ セクション10（Z1〜Z6）: ワンボタンでコピー+Gemini起動（殿の最終理想形）</p>
        <p>※ 各パターンでGeminiアプリが起動するか実機で確認してください</p>
      </div>
    </div>
  );
}
