'use client';

import Link from 'next/link';

export default function AnalysisPage() {
  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">解析</h1>
        <p className="text-xl mb-8">解析機能は実装中です...</p>
        <Link href="/" className="text-p5-red hover:underline">
          ← TOPに戻る
        </Link>
      </div>
    </main>
  );
}
