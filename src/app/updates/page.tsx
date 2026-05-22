'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export default function UpdatesPage() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUpdates = useCallback(() => {
    fetch('/api/updates')
      .then((res) => res.json())
      .then((data) => {
        if (data.updates) setUpdates(data.updates);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load updates');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  const getBadgeVariant = (type: string) => {
    const map: Record<string, string> = {
      academic: 'default',
      schedule: 'cancelled',
      exam: 'exam',
      general: 'event',
    };
    return map[type] || 'event';
  };

  return (
    <>
      <PageHeader 
        title="Live Updates" 
        subtitle="University announcements and schedule changes." 
      />

      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-[16px] font-bold text-text-dark font-heading">All Updates</h2>
      </div>

      {error && (
        <div role="alert" className="mb-6 bg-red-light border border-red/20 text-red p-3 rounded-lg text-[13px]">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-bg-card rounded-xl border border-border p-5 h-[120px]">
              <div className="w-24 h-5 skeleton mb-3"></div>
              <div className="w-3/4 h-4 skeleton mb-2"></div>
              <div className="w-1/2 h-3 skeleton"></div>
            </div>
          ))}
        </div>
      )}

      {!loading && updates.length === 0 && (
        <Card className="text-center py-12 flex flex-col items-center">
          <span className="material-symbols-outlined text-[48px] text-text-subdued mb-3" aria-hidden="true">notifications_off</span>
          <p className="text-text-muted text-[14px]">No updates available.</p>
        </Card>
      )}

      <div className="space-y-3 stagger">
        {updates.map((update) => (
          <Card key={update.update_id} className="animate-fade-in-up !p-4 border-l-[3px]" style={{
            borderLeftColor: update.category === 'exam' ? '#ea580c' : 
                             update.category === 'schedule' ? '#dc2626' : 
                             update.category === 'academic' ? '#2663ed' : '#e2e8f0'
          }}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <Badge variant={getBadgeVariant(update.category) as any}>{update.category}</Badge>
                <h3 className="text-[14px] font-semibold text-text-dark">{update.title}</h3>
              </div>
              <span className="text-[11px] text-text-subdued shrink-0 ml-4">
                {new Date(update.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>
            <p className="text-text-muted text-[13px]">{update.message}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
