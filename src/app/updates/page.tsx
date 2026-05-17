'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';

export default function UpdatesPage() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formType, setFormType] = useState('general');
  const [submitting, setSubmitting] = useState(false);

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

  const resetForm = () => {
    setFormTitle('');
    setFormContent('');
    setFormType('general');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingId ? `/api/updates/${editingId}` : '/api/updates';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: formTitle, content: formContent, type: formType }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        fetchUpdates();
        resetForm();
      }
    } catch {
      setError('Failed to save update');
    }
    setSubmitting(false);
  };

  const handleEdit = (update: any) => {
    setFormTitle(update.title);
    setFormContent(update.message);
    setFormType(update.category);
    setEditingId(update.update_id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this update?')) return;
    try {
      const res = await fetch(`/api/updates/${id}`, { method: 'DELETE' });
      if (res.status === 204) {
        fetchUpdates();
      } else {
        const data = await res.json();
        if (data.error) setError(data.error);
      }
    } catch {
      setError('Failed to delete update');
    }
  };

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
        {!showForm && (
          <Button onClick={() => setShowForm(true)} variant="primary" size="sm">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">add</span>
            New Update
          </Button>
        )}
      </div>

      {error && (
        <div role="alert" className="mb-6 bg-red-light border border-red/20 text-red p-3 rounded-lg text-[13px]">
          {error}
        </div>
      )}

      {showForm && (
        <Card className="mb-6 animate-fade-in-up">
          <h3 className="text-[16px] font-bold text-text-dark mb-4 font-heading">
            {editingId ? 'Edit Update' : 'Create New Update'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-[12px] font-semibold text-text-slate mb-1">Title</label>
              <Input
                id="title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Enter title…"
                required
              />
            </div>
            <div>
              <label htmlFor="content" className="block text-[12px] font-semibold text-text-slate mb-1">Content</label>
              <textarea
                id="content"
                className="w-full bg-bg-white border border-border rounded-lg py-2.5 px-3 text-[13px] text-text-primary placeholder-text-subdued focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-colors min-h-[100px] resize-y"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Enter update content…"
                required
              />
            </div>
            <div>
              <label htmlFor="type" className="block text-[12px] font-semibold text-text-slate mb-1">Category</label>
              <select
                id="type"
                className="w-full bg-bg-white border border-border rounded-lg py-2.5 px-3 text-[13px] text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary appearance-none"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
              >
                <option value="general">General</option>
                <option value="academic">Academic</option>
                <option value="schedule">Schedule</option>
                <option value="exam">Exam</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Publish'}
              </Button>
            </div>
          </form>
        </Card>
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
          <p className="text-text-muted text-[14px]">No updates yet. Create one to get started!</p>
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
            <p className="text-text-muted text-[13px] mb-3">{update.message}</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => handleEdit(update)}>
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">edit</span>
                Edit
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(update.update_id)}>
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">delete</span>
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
