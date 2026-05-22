'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../ui/Card';

export function ConnectionsCard({ initialCount }: { initialCount: number }) {
  const router = useRouter();

  return (
    <Card 
      className="!p-5 relative group overflow-hidden cursor-pointer hover:border-orange transition-colors"
      onClick={() => router.push('/buddies')}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2 mb-3 text-orange">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">group</span>
          <h3 className="text-[13px] font-bold text-text-dark">New Connections</h3>
        </div>
        <span className="material-symbols-outlined text-text-muted opacity-0 group-hover:opacity-100 transition-opacity text-[16px]">arrow_forward</span>
      </div>
      <p className="text-[32px] font-bold text-text-dark font-heading leading-none mb-2">{initialCount}</p>
      <p className="text-[11px] text-text-muted leading-snug">Study buddies and connections you have made. Click to view.</p>
    </Card>
  );
}
