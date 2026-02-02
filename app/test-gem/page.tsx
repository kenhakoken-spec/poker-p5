'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function TestGeminiPage() {
  const [showCopyLinkY1, setShowCopyLinkY1] = useState(false);
  const [showCopyLinkY2, setShowCopyLinkY2] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [detectedOS, setDetectedOS] = useState<'android' | 'ios' | 'other'>('other');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const pwaCheck = window.matchMedia('(display-mode: standalone)').matches;
    setIsPWA(pwaCheck);
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) setDetectedOS('android');
    else if (/iphone|ipad|ipod/i.test(ua)) setDetectedOS('ios');
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

  // ── Pattern I & Z6 variant helpers ──
  const handleI3 = () => {
    try { navigator.clipboard.writeText('テスト'); } catch {}
    setTimeout(() => { location.href = 'https://gemini.google.com/app/new'; }, 100);
  };

  const handleI4 = () => {
    try { navigator.clipboard.writeText('テスト'); } catch {}
    window.open('https://gemini.google.com/app/new', '_blank');
  };

  const handleI10 = async () => {
    try {
      await navigator.clipboard.writeText('テスト');
      document.getElementById('gem-link-i10')?.click();
    } catch (err) {
      console.error('I-10 failed:', err);
    }
  };

  const handleI11 = () => {
    try { navigator.clipboard.writeText('テスト'); } catch {}
    window.open('https://gemini.google.com/app/new', '_blank', 'noopener');
  };

  const handleZ611 = () => {
    try { navigator.clipboard.writeText('テスト'); } catch {}
    location.href = 'intent://gemini.google.com/app/new#Intent;scheme=https;package=com.google.android.apps.bard;S.browser_fallback_url=https%3A%2F%2Fgemini.google.com%2Fapp%2Fnew;end';
    setTimeout(() => {
      window.open('https://gemini.google.com/app/new', '_blank');
    }, 2000);
  };

  const lnk: React.CSSProperties = {
    display: 'inline-block',
    padding: '12px 16px',
    background: '#1a1a1a',
    color: '#fff',
    textDecoration: 'none',
    border: '1px solid #444',
    borderRadius: '4px',
    fontSize: '1rem',
  };

  const osBadge = (type: 'android' | 'ios' | 'both') => (
    <span style={{
      display: 'inline-block', padding: '1px 5px', fontSize: '0.625rem',
      borderRadius: '2px', marginLeft: '6px', verticalAlign: 'middle', color: '#fff',
      background: type === 'android' ? '#2e7d32' : type === 'ios' ? '#1565c0' : '#6a1b9a',
    }}>
      {type === 'android' ? 'Android' : type === 'ios' ? 'iOS' : '両対応'}
    </span>
  );

  const z69Href = detectedOS === 'android'
    ? 'intent://gemini.google.com/app/new#Intent;scheme=https;package=com.google.android.apps.bard;S.browser_fallback_url=https%3A%2F%2Fgemini.google.com%2Fapp%2Fnew;end'
    : 'https://gemini.google.com/app/new';

  const z612Href = detectedOS === 'android'
    ? 'intent://gemini.google.com/app/new#Intent;scheme=https;package=com.google.android.apps.bard;S.browser_fallback_url=https%3A%2F%2Fgemini.google.com%2Fapp%2Fnew;end'
    : detectedOS === 'ios'
      ? 'googlechrome://gemini.google.com/app/new'
      : 'https://gemini.google.com/app/new';

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
        Gemini Link Test - 60 Patterns (A〜Z6 + I改良12 + Z6改良12)
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

      {/* ━━━ Section 11: パターンI改良版（/app/new ベース）━━━ */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: '#0f0' }}>
          Section 11: パターンI改良版（/app/new ベース）
        </h2>
        <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '16px' }}>
          殿の実機テストでパターンI（/app/new）が有望。コピー機能との組み合わせバリエーション
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* I-1 */}
          <a
            href="https://gemini.google.com/app/new"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { try { navigator.clipboard.writeText('テスト'); } catch {} }}
            style={lnk}
          >
            <strong style={{ color: '#0f0' }}>I-1</strong>{osBadge('both')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>aタグ + clipboard.writeText + noopener noreferrer</span>
          </a>

          {/* I-2 */}
          <a
            href="https://gemini.google.com/app/new"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              try {
                if (textareaRef.current) { textareaRef.current.select(); document.execCommand('copy'); }
              } catch {}
            }}
            style={lnk}
          >
            <strong style={{ color: '#0f0' }}>I-2</strong>{osBadge('both')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>aタグ + execCommand copy レガシー + noopener noreferrer</span>
          </a>

          {/* I-3 */}
          <button onClick={handleI3} style={{ ...lnk, cursor: 'pointer', textAlign: 'left' }}>
            <strong style={{ color: '#0f0' }}>I-3</strong>{osBadge('both')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>clipboard.writeText → setTimeout(100ms) → location.href</span>
          </button>

          {/* I-4 */}
          <button onClick={handleI4} style={{ ...lnk, cursor: 'pointer', textAlign: 'left' }}>
            <strong style={{ color: '#0f0' }}>I-4</strong>{osBadge('both')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>clipboard.writeText → window.open(_blank)</span>
          </button>

          {/* I-5 */}
          <a
            href="https://gemini.google.com/app/new"
            target="_blank"
            rel="noopener noreferrer"
            style={lnk}
          >
            <strong style={{ color: '#0f0' }}>I-5</strong>{osBadge('both')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>純粋リンク（コピーなし）+ noopener noreferrer</span>
          </a>

          {/* I-6 */}
          <a
            href="https://gemini.google.com/app/new"
            target="_blank"
            rel="noopener"
            style={lnk}
          >
            <strong style={{ color: '#0f0' }}>I-6</strong>{osBadge('both')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>純粋リンク（コピーなし）+ noopener のみ</span>
          </a>

          {/* I-7 */}
          <a
            href="https://gemini.google.com/app/new"
            target="_blank"
            style={lnk}
          >
            <strong style={{ color: '#0f0' }}>I-7</strong>{osBadge('both')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>純粋リンク（コピーなし）+ rel指定なし</span>
          </a>

          {/* I-8 */}
          <a
            href="https://gemini.google.com/app/new"
            target="_self"
            onClick={() => { try { navigator.clipboard.writeText('テスト'); } catch {} }}
            style={lnk}
          >
            <strong style={{ color: '#0f0' }}>I-8</strong>{osBadge('both')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>clipboard.writeText + target=_self</span>
          </a>

          {/* I-9 */}
          <a
            href="https://gemini.google.com/app/new"
            onClick={() => { try { navigator.clipboard.writeText('テスト'); } catch {} }}
            style={lnk}
          >
            <strong style={{ color: '#0f0' }}>I-9</strong>{osBadge('both')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>clipboard.writeText + target指定なし</span>
          </a>

          {/* I-10 */}
          <button onClick={handleI10} style={{ ...lnk, cursor: 'pointer', textAlign: 'left' }}>
            <strong style={{ color: '#0f0' }}>I-10</strong>{osBadge('both')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>ボタンでコピー → 非表示aタグ.click()プログラム発火</span>
          </button>
          <a id="gem-link-i10" href="https://gemini.google.com/app/new" target="_blank" style={{ display: 'none' }}>hidden</a>

          {/* I-11 */}
          <button onClick={handleI11} style={{ ...lnk, cursor: 'pointer', textAlign: 'left' }}>
            <strong style={{ color: '#0f0' }}>I-11</strong>{osBadge('both')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>clipboard.writeText → window.open(_blank, noopener features)</span>
          </button>

          {/* I-12 */}
          <div>
            <iframe src="https://gemini.google.com/app/new" style={{ display: 'none' }} title="preload" sandbox="" />
            <a
              href="https://gemini.google.com/app/new"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { try { navigator.clipboard.writeText('テスト'); } catch {} }}
              style={lnk}
            >
              <strong style={{ color: '#0f0' }}>I-12</strong>{osBadge('both')}
              <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>hidden iframe preload + clipboard.writeText + aタグ遷移</span>
            </a>
          </div>
        </div>
      </section>

      {/* ━━━ Section 12: パターンZ6改良版（Intent URI ベース）━━━ */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: '#f80' }}>
          Section 12: パターンZ6改良版（Intent URI ベース）
        </h2>
        <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>
          Intent URI でGeminiアプリを直接起動。Web版ではなくアプリを開く
        </p>
        <p style={{ fontSize: '0.75rem', color: '#ff0', marginBottom: '16px' }}>
          検出OS: <strong>{detectedOS}</strong>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Z6-1 */}
          <a
            href="intent://gemini.google.com/app/new#Intent;scheme=https;package=com.google.android.apps.bard;end"
            onClick={() => { try { navigator.clipboard.writeText('テスト'); } catch {} }}
            style={lnk}
          >
            <strong style={{ color: '#f80' }}>Z6-1</strong>{osBadge('android')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>Intent /app/new + clipboard.writeText</span>
          </a>

          {/* Z6-2 */}
          <a
            href="intent://gemini.google.com/#Intent;scheme=https;package=com.google.android.apps.bard;end"
            onClick={() => { try { navigator.clipboard.writeText('テスト'); } catch {} }}
            style={lnk}
          >
            <strong style={{ color: '#f80' }}>Z6-2</strong>{osBadge('android')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>Intent パスなし + clipboard.writeText</span>
          </a>

          {/* Z6-3 */}
          <a
            href="intent://gemini.google.com/app/new#Intent;scheme=https;package=com.google.android.apps.bard;S.browser_fallback_url=https%3A%2F%2Fgemini.google.com%2Fapp%2Fnew;end"
            onClick={() => { try { navigator.clipboard.writeText('テスト'); } catch {} }}
            style={lnk}
          >
            <strong style={{ color: '#f80' }}>Z6-3</strong>{osBadge('android')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>Intent /app/new + fallback /app/new + clipboard</span>
          </a>

          {/* Z6-4 */}
          <a
            href="intent://gemini.google.com/app/new#Intent;scheme=https;action=android.intent.action.VIEW;package=com.google.android.apps.bard;end"
            onClick={() => { try { navigator.clipboard.writeText('テスト'); } catch {} }}
            style={lnk}
          >
            <strong style={{ color: '#f80' }}>Z6-4</strong>{osBadge('android')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>Intent + action=VIEW明示 + clipboard</span>
          </a>

          {/* Z6-5 */}
          <a
            href="intent://gemini.google.com/app/new#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.google.android.apps.bard;end"
            onClick={() => { try { navigator.clipboard.writeText('テスト'); } catch {} }}
            style={lnk}
          >
            <strong style={{ color: '#f80' }}>Z6-5</strong>{osBadge('android')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>Intent + action=VIEW + category=BROWSABLE + clipboard</span>
          </a>

          {/* Z6-6 */}
          <a
            href="intent://gemini.google.com/app/new#Intent;scheme=https;package=com.google.android.apps.bard;S.browser_fallback_url=https%3A%2F%2Fgemini.google.com%2Fapp%2Fnew;end"
            onClick={() => {
              try {
                if (textareaRef.current) { textareaRef.current.select(); document.execCommand('copy'); }
              } catch {}
            }}
            style={lnk}
          >
            <strong style={{ color: '#f80' }}>Z6-6</strong>{osBadge('android')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>Intent /app/new + fallback + execCommand copy レガシー</span>
          </a>

          {/* Z6-7 */}
          <a
            href="intent://gemini.google.com/app/new#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.google.android.apps.bard;S.browser_fallback_url=https%3A%2F%2Fgemini.google.com%2Fapp%2Fnew;end"
            onClick={() => { try { navigator.clipboard.writeText('テスト'); } catch {} }}
            style={lnk}
          >
            <strong style={{ color: '#f80' }}>Z6-7</strong>{osBadge('android')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>Intent フル指定 (action+category+fallback+/app/new) + clipboard</span>
          </a>

          {/* Z6-8 */}
          <a
            href="https://gemini.google.com/app/new"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { try { navigator.clipboard.writeText('テスト'); } catch {} }}
            style={lnk}
          >
            <strong style={{ color: '#f80' }}>Z6-8</strong>{osBadge('ios')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>iOS Universal Links: https直リンク + clipboard</span>
          </a>

          {/* Z6-9 */}
          <a
            href={z69Href}
            target={detectedOS === 'ios' ? '_blank' : undefined}
            onClick={() => { try { navigator.clipboard.writeText('テスト'); } catch {} }}
            style={lnk}
          >
            <strong style={{ color: '#f80' }}>Z6-9</strong>{osBadge('both')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>OS判定自動分岐 (Android→Intent / iOS→Universal Link) + clipboard [検出: {detectedOS}]</span>
          </a>

          {/* Z6-10 */}
          <a
            href="googlechrome://gemini.google.com/app/new"
            onClick={() => { try { navigator.clipboard.writeText('テスト'); } catch {} }}
            style={lnk}
          >
            <strong style={{ color: '#f80' }}>Z6-10</strong>{osBadge('ios')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>iOS googlechrome:// カスタムスキーム + clipboard</span>
          </a>

          {/* Z6-11 */}
          <button onClick={handleZ611} style={{ ...lnk, cursor: 'pointer', textAlign: 'left' }}>
            <strong style={{ color: '#f80' }}>Z6-11</strong>{osBadge('android')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>Intent URI遷移 → 2秒後window.openフォールバック + clipboard</span>
          </button>

          {/* Z6-12 */}
          <a
            href={z612Href}
            target={detectedOS !== 'android' ? '_blank' : undefined}
            onClick={() => { try { navigator.clipboard.writeText('テスト'); } catch {} }}
            style={lnk}
          >
            <strong style={{ color: '#f80' }}>Z6-12</strong>{osBadge('both')}
            <br /><span style={{ fontSize: '0.75rem', color: '#aaa' }}>OS判定 (Android→Intent / iOS→googlechrome) + clipboard [検出: {detectedOS}]</span>
          </a>
        </div>
      </section>

      <div style={{ marginTop: '40px', fontSize: '0.875rem', color: '#888' }}>
        <p>※ セクション7（W1〜W5）: PWA standaloneモードの干渉切り分け</p>
        <p>※ セクション10（Z1〜Z6）: ワンボタンでコピー+Gemini起動</p>
        <p style={{ color: '#0f0' }}>※ Section 11（I-1〜I-12）: パターンI改良版（/app/newベース、コピー組み合わせ）</p>
        <p style={{ color: '#f80' }}>※ Section 12（Z6-1〜Z6-12）: パターンZ6改良版（Intent URI、OS別対応）</p>
        <p>※ 各パターンでGeminiアプリが起動するか実機で確認してください</p>
      </div>
    </div>
  );
}
