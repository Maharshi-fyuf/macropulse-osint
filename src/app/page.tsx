'use client';

import React, { Suspense } from 'react';
import ChartPane from '@/components/ChartPane';

export default function Home() {
  return (
    <div className="h-full w-full bg-[#09090b]">
      <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-zinc-600 font-mono uppercase text-xs">Loading chart framework...</div>}>
        <ChartPane />
      </Suspense>
    </div>
  );
}
