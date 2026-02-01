'use client';

import { useState } from 'react';

const SAMPLE_TEXT = 'Test poker hand: UTG raises 3BB, SB calls, BB folds.';
const GEMINI_URL = 'https://gemini.google.com/app';
const GEMINI_PKG = 'com.google.android.apps.bard';
const FALLBACK = encodeURIComponent(GEMINI_URL);

interface PatternLink {
  id: string;
  label: string;
  desc: string;
  href?: string;
  onClick?: () => void;
}

export default function TestGem() {
  const [log, setLog] = useState<string[]>([]);
  const addLog = (msg: string) => setLog((p) => [...p, `${new Date().toLocaleTimeString()} ${msg}`]);

  const handleShare = async () => {
    if (!navigator.share) {
      addLog('navigator.share NOT supported');
      return;
    }
    try {
      await navigator.share({ title: 'Poker Hand', text: SAMPLE_TEXT });
      addLog('navigator.share resolved (user chose target)');
    } catch (e: unknown) {
      addLog(`navigator.share error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleLocationHref = () => {
    addLog('window.location.href = gemini URL');
    window.location.href = GEMINI_URL;
  };

  const handleWindowOpen = () => {
    addLog('window.open gemini URL');
    window.open(GEMINI_URL, '_blank');
  };

  const patterns: PatternLink[] = [
    // --- A: target="_blank" ---
    {
      id: 'A',
      label: 'A: <a> target="_blank"',
      desc: 'Standard new tab link to gemini.google.com/app',
      href: GEMINI_URL,
    },
    // --- B: target="_top" ---
    {
      id: 'B',
      label: 'B: <a> target="_top"',
      desc: 'Same-window navigation (replaces current page)',
      href: GEMINI_URL,
    },
    // --- C: Intent URI basic ---
    {
      id: 'C',
      label: 'C: Intent URI (basic)',
      desc: `intent://...scheme=https;package=${GEMINI_PKG};end`,
      href: `intent://gemini.google.com/app#Intent;scheme=https;package=${GEMINI_PKG};end`,
    },
    // --- D: Intent URI + fallback ---
    {
      id: 'D',
      label: 'D: Intent + fallback URL',
      desc: 'Falls back to gemini web if app not found',
      href: `intent://gemini.google.com/app#Intent;scheme=https;package=${GEMINI_PKG};S.browser_fallback_url=${FALLBACK};end`,
    },
    // --- E: Intent URI + ACTION_VIEW ---
    {
      id: 'E',
      label: 'E: Intent + ACTION_VIEW',
      desc: 'Explicit android.intent.action.VIEW',
      href: `intent://gemini.google.com/app#Intent;scheme=https;action=android.intent.action.VIEW;package=${GEMINI_PKG};S.browser_fallback_url=${FALLBACK};end`,
    },
    // --- F: Intent URI + ACTION_VIEW + BROWSABLE ---
    {
      id: 'F',
      label: 'F: Intent + VIEW + BROWSABLE',
      desc: 'VIEW action + BROWSABLE category explicit',
      href: `intent://gemini.google.com/app#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=${GEMINI_PKG};S.browser_fallback_url=${FALLBACK};end`,
    },
    // --- G: Intent ACTION_SEND with text (share to Gemini) ---
    {
      id: 'G',
      label: 'G: Intent ACTION_SEND + text',
      desc: 'Share text to Gemini via ACTION_SEND intent',
      href: `intent:#Intent;action=android.intent.action.SEND;type=text/plain;S.android.intent.extra.TEXT=${encodeURIComponent(SAMPLE_TEXT)};package=${GEMINI_PKG};S.browser_fallback_url=${FALLBACK};end`,
    },
    // --- H: Intent ACTION_SEND without package (share sheet) ---
    {
      id: 'H',
      label: 'H: Intent ACTION_SEND (no pkg)',
      desc: 'Share text via system share sheet (no package target)',
      href: `intent:#Intent;action=android.intent.action.SEND;type=text/plain;S.android.intent.extra.TEXT=${encodeURIComponent(SAMPLE_TEXT)};S.browser_fallback_url=${FALLBACK};end`,
    },
    // --- I: Intent without scheme (package only) ---
    {
      id: 'I',
      label: 'I: Intent (package only)',
      desc: 'Launch app by package name only, no scheme/host',
      href: `intent://#Intent;package=${GEMINI_PKG};S.browser_fallback_url=${FALLBACK};end`,
    },
    // --- J: Intent with MAIN/LAUNCHER ---
    {
      id: 'J',
      label: 'J: Intent MAIN + LAUNCHER',
      desc: 'Launch main activity of Gemini app',
      href: `intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${GEMINI_PKG};S.browser_fallback_url=${FALLBACK};end`,
    },
    // --- K: navigator.share ---
    {
      id: 'K',
      label: 'K: navigator.share()',
      desc: 'Web Share API - OS share sheet with text',
      onClick: handleShare,
    },
    // --- L: window.location.href ---
    {
      id: 'L',
      label: 'L: window.location.href',
      desc: 'Direct JS navigation to gemini URL',
      onClick: handleLocationHref,
    },
    // --- M: window.open ---
    {
      id: 'M',
      label: 'M: window.open()',
      desc: 'JS window.open to gemini URL (may be blocked)',
      onClick: handleWindowOpen,
    },
    // --- N: market:// Play Store ---
    {
      id: 'N',
      label: 'N: market:// (Play Store)',
      desc: 'Open Gemini in Play Store directly',
      href: `market://details?id=${GEMINI_PKG}`,
    },
    // --- O: Play Store HTTPS ---
    {
      id: 'O',
      label: 'O: Play Store (HTTPS)',
      desc: 'Play Store web link as fallback',
      href: `https://play.google.com/store/apps/details?id=${GEMINI_PKG}`,
    },
  ];

  const btnStyle = (id: string): React.CSSProperties => {
    const isIntent = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].includes(id);
    const isJS = ['K', 'L', 'M'].includes(id);
    const isStore = ['N', 'O'].includes(id);
    return {
      display: 'block',
      width: '100%',
      padding: '14px 16px',
      marginBottom: '8px',
      background: isIntent ? '#1a237e' : isJS ? '#004d40' : isStore ? '#4a148c' : '#b71c1c',
      color: '#fff',
      fontWeight: 'bold',
      fontSize: '0.95rem',
      textDecoration: 'none',
      border: '2px solid rgba(255,255,255,0.4)',
      borderRadius: '6px',
      textAlign: 'left' as const,
      cursor: 'pointer',
    };
  };

  return (
    <div style={{ padding: '16px', background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>BUG-32: Gemini Launch Test</h1>
      <p style={{ fontSize: '0.75rem', color: '#999', marginBottom: '12px' }}>
        Tap each pattern to test. Red=web link, Blue=intent URI, Green=JS API, Purple=store link
      </p>

      {patterns.map((p) =>
        p.onClick ? (
          <button
            key={p.id}
            type="button"
            style={btnStyle(p.id)}
            onClick={() => {
              addLog(`[${p.id}] tapped`);
              p.onClick!();
            }}
          >
            <strong>{p.label}</strong>
            <br />
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>{p.desc}</span>
          </button>
        ) : (
          <a
            key={p.id}
            href={p.href}
            target={p.id === 'B' ? '_top' : '_blank'}
            rel="noopener noreferrer"
            style={btnStyle(p.id)}
            onClick={() => addLog(`[${p.id}] tapped`)}
          >
            <strong>{p.label}</strong>
            <br />
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>{p.desc}</span>
          </a>
        ),
      )}

      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          background: '#111',
          border: '1px solid #333',
          borderRadius: '6px',
          maxHeight: '200px',
          overflow: 'auto',
        }}
      >
        <p style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>Log:</p>
        {log.length === 0 ? (
          <p style={{ fontSize: '0.7rem', color: '#666' }}>Tap a button to see results here</p>
        ) : (
          log.map((l, i) => (
            <p key={i} style={{ fontSize: '0.7rem', color: '#aaa', margin: '2px 0' }}>
              {l}
            </p>
          ))
        )}
        {log.length > 0 && (
          <button
            type="button"
            style={{ marginTop: '8px', padding: '4px 12px', fontSize: '0.7rem', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' }}
            onClick={() => setLog([])}
          >
            Clear
          </button>
        )}
      </div>

      <div style={{ marginTop: '16px', padding: '12px', background: '#1a1a1a', borderRadius: '6px', fontSize: '0.7rem', color: '#888' }}>
        <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>Notes:</p>
        <ul style={{ paddingLeft: '16px', margin: 0 }}>
          <li>Package: {GEMINI_PKG}</li>
          <li>assetlinks.json: points to googlequicksearchbox (NOT bard)</li>
          <li>Pattern G (ACTION_SEND+text) is the most promising for text delivery</li>
          <li>Intent URIs only work on Android Chrome</li>
          <li>On iOS/desktop, intent:// links will fail (use fallback)</li>
        </ul>
      </div>
    </div>
  );
}
