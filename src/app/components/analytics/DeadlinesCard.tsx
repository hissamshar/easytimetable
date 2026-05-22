'use client';

import React, { useState } from 'react';
import { Card } from '../ui/Card';

export function DeadlinesCard({ initialCount }: { initialCount: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, due_date: new Date(dueDate).toISOString() })
      });
      if (res.ok) {
        setCount(c => c + 1);
        setIsOpen(false);
        setTitle('');
        setDueDate('');
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  return (
    <>
      <Card 
        className="!p-5 relative group overflow-hidden cursor-pointer hover:border-red transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 mb-3 text-red">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">event_busy</span>
            <h3 className="text-[13px] font-bold text-text-dark">Total Deadlines</h3>
          </div>
          <span className="material-symbols-outlined text-text-muted opacity-0 group-hover:opacity-100 transition-opacity text-[16px]">add</span>
        </div>
        <p className="text-[32px] font-bold text-text-dark font-heading leading-none mb-2">{count}</p>
        <p className="text-[11px] text-text-muted leading-snug">Pending tasks and milestones you need to complete. Click to add.</p>
      </Card>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsOpen(false)}>
          <div className="bg-bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[18px] font-bold font-heading text-text-dark">Add New Deadline</h2>
              <button onClick={() => setIsOpen(false)} className="text-text-muted hover:text-text-dark">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-text-dark mb-1">Task Title</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-bg-slate border border-border rounded-xl px-4 py-2 text-[14px] text-text-primary focus:outline-none focus:border-primary"
                  placeholder="e.g., Submit Database Assignment"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-text-dark mb-1">Due Date</label>
                <input 
                  type="datetime-local" 
                  required
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full bg-bg-slate border border-border rounded-xl px-4 py-2 text-[14px] text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary text-white rounded-xl py-2.5 font-semibold text-[14px] hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Deadline'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
