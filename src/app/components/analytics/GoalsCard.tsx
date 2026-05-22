'use client';

import React, { useState } from 'react';
import { Card } from '../ui/Card';

export function GoalsCard({ initialCount }: { initialCount: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [targetHours, setTargetHours] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    // Set goal for current week (Monday to Sunday)
    const now = new Date();
    const day = now.getDay() || 7; 
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + 1);
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - day + 7);

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          target_hours: parseInt(targetHours), 
          start_date: monday.toISOString().split('T')[0],
          end_date: sunday.toISOString().split('T')[0]
        })
      });
      if (res.ok) {
        setCount(c => c + 1);
        setIsOpen(false);
        setTargetHours('');
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  return (
    <>
      <Card 
        className="!p-5 relative group overflow-hidden cursor-pointer hover:border-primary transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 mb-3 text-primary">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">target</span>
            <h3 className="text-[13px] font-bold text-text-dark">Study Goals</h3>
          </div>
          <span className="material-symbols-outlined text-text-muted opacity-0 group-hover:opacity-100 transition-opacity text-[16px]">add</span>
        </div>
        <p className="text-[32px] font-bold text-text-dark font-heading leading-none mb-2">{count}</p>
        <p className="text-[11px] text-text-muted leading-snug">Active goals you are working towards this week. Click to add.</p>
      </Card>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsOpen(false)}>
          <div className="bg-bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[18px] font-bold font-heading text-text-dark">Set Weekly Goal</h2>
              <button onClick={() => setIsOpen(false)} className="text-text-muted hover:text-text-dark">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-text-dark mb-1">Target Study Hours (This Week)</label>
                <input 
                  type="number" 
                  min="1"
                  max="168"
                  required
                  value={targetHours}
                  onChange={e => setTargetHours(e.target.value)}
                  className="w-full bg-bg-slate border border-border rounded-xl px-4 py-2 text-[14px] text-text-primary focus:outline-none focus:border-primary"
                  placeholder="e.g., 10"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary text-white rounded-xl py-2.5 font-semibold text-[14px] hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Goal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
