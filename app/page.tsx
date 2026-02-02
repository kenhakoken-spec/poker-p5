'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const RecordPage = dynamic(() => import('./record/page'), { ssr: false });
const HistoryContent = dynamic(() => import('@/components/HistoryContent'), { ssr: false });

type Tab = 'record' | 'history';

const TABS: { id: Tab; label: string }[] = [
  { id: 'record', label: 'RECORD' },
  { id: 'history', label: 'HISTORY' },
];

const BASE_WIDTH = 412;
const BASE_HEIGHT = 915;

function ScalingWrapper({ children }: { children: React.ReactNode }) {
  const [dims, setDims] = useState({ scale: 1, offsetY: 0 });

  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.min(vw / BASE_WIDTH, vh / BASE_HEIGHT);
      const scaledH = BASE_HEIGHT * s;
      const oy = Math.max(0, (vh - scaledH) / 2);
      setDims({ scale: s, offsetY: oy });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <div
        className="scaling-container"
        style={{
          transform: `scale(${dims.scale})`,
          transformOrigin: 'top center',
          marginTop: `${dims.offsetY}px`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('record');

  // BUG-7: カスタムイベントによるタブ切替（record/page.tsxから呼び出し）
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail === 'history' || detail === 'record') {
        setActiveTab(detail);
      }
    };
    window.addEventListener('switchTab', handler);
    return () => window.removeEventListener('switchTab', handler);
  }, []);

  return (
    <ScalingWrapper>
      <div
        className="bg-black text-white flex flex-col"
        style={{ height: '100%' }}
      >
        {/* Tab Navigation */}
        <nav className="shrink-0 flex border-b border-white/20">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`relative flex-1 font-p5-en text-base tracking-wide transition-colors ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              style={{ height: '48px' }}
              onClick={() => setActiveTab(tab.id)}
            >
              <span style={{ display: 'inline-block', transform: 'skewX(-7deg)' }}>
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-[3px] bg-p5-red"
                  layoutId="tab-indicator"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </nav>

        {/* Tab Content — both mounted to preserve state during recording */}
        <div className="flex-1 min-h-0">
          <div className={`h-full overflow-y-auto ${activeTab === 'record' ? '' : 'hidden'}`}>
            <RecordPage />
          </div>
          <div className={`h-full overflow-y-auto ${activeTab === 'history' ? '' : 'hidden'}`}>
            <HistoryContent isActive={activeTab === 'history'} />
          </div>
        </div>
      </div>
    </ScalingWrapper>
  );
}
