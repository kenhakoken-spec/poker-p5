'use client';

import React from 'react';

export default function TestGeminiPage() {
  const handleShareAPI = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Test', text: 'テスト' });
      } else {
        alert('Share API not supported');
      }
    } catch (err) {
      console.error('Share failed:', err);
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
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' }}>
        Gemini Link Test Patterns
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Pattern A */}
        <div>
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
            A. Gemini Web (_blank + noopener noreferrer)
          </a>
        </div>

        {/* Pattern B */}
        <div>
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
            B. Gemini Web (_top)
          </a>
        </div>

        {/* Pattern C */}
        <div>
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
            C. Gemini Web (_self)
          </a>
        </div>

        {/* Pattern D */}
        <div>
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
            D. Gemini Root (_blank)
          </a>
        </div>

        {/* Pattern E */}
        <div>
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
            E. Gemini Web JP (_blank)
          </a>
        </div>

        {/* Pattern F */}
        <div>
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
            F. Gemini Intent URI (Android)
          </a>
        </div>

        {/* Pattern G */}
        <div>
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
            }}
          >
            G. Share API (navigator.share)
          </button>
        </div>

        {/* Pattern H - Same as HistoryContent.tsx */}
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
            H. HistoryContent.tsx Implementation (Open Gemini)
          </a>
        </div>
      </div>

      <div style={{ marginTop: '40px', fontSize: '0.875rem', color: '#888' }}>
        <p>※ このページはVercel + Android Chrome実機でテストしてください</p>
        <p>※ localhost環境では動作が異なる場合があります</p>
      </div>
    </div>
  );
}
