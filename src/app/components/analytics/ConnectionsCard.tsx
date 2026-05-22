'use client';

import React, { useState } from 'react';
import { Card } from '../ui/Card';

export function ConnectionsCard({ initialCount }: { initialCount: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  // In a real app, you would search for a student by roll number and get their ID.
  // For this prototype, we'll just mock adding a connection.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Hardcode connecting with student ID 2 as an example for the prototype
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_id: 2 })
      });
      if (res.ok) {
        setCount(c => c + 1); // Mock instant acceptance for UX prototype
        setIsOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  return (
    <>
      <Card 
        className="!p-5 relative group overflow-hidden cursor-pointer hover:border-orange transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 mb-3 text-orange">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">group</span>
            <h3 className="text-[13px] font-bold text-text-dark">New Connections</h3>
          </div>
          <span className="material-symbols-outlined text-text-muted opacity-0 group-hover:opacity-100 transition-opacity text-[16px]">person_add</span>
        </div>
        <p className="text-[32px] font-bold text-text-dark font-heading leading-none mb-2">{count}</p>
        <p className="text-[11px] text-text-muted leading-snug">Study buddies and connections you have made. Click to invite.</p>
      </Card>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsOpen(false)}>
          <div className="bg-bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[18px] font-bold font-heading text-text-dark">Find Study Buddy</h2>
              <button onClick={() => setIsOpen(false)} className="text-text-muted hover:text-text-dark">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-text-dark mb-1">Friend's Roll Number</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-bg-slate border border-border rounded-xl px-4 py-2 text-[14px] text-text-primary focus:outline-none focus:border-primary"
                  placeholder="e.g., 21L-1234"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary text-white rounded-xl py-2.5 font-semibold text-[14px] hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending Request...' : 'Send Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
