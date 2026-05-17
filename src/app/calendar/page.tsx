import React from 'react';
import pool from '@/lib/db';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

async function getCalendarEvents() {
  try {
    const res = await pool.query('SELECT * FROM academic_calendar ORDER BY event_date ASC');
    return res.rows;
  } catch {
    return [];
  }
}

export default async function CalendarPage() {
  const events = await getCalendarEvents();

  const grouped: Record<string, any[]> = {};
  events.forEach((evt: any) => {
    const date = new Date(evt.event_date);
    const month = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(evt);
  });

  const getBadgeVariant = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('exam')) return 'exam' as const;
    if (t.includes('holiday')) return 'cancelled' as const;
    if (t.includes('class') || t.includes('lecture')) return 'default' as const;
    return 'event' as const;
  };

  return (
    <>
      <PageHeader 
        title="Academic Calendar" 
        subtitle="Key dates, deadlines, and holidays for the semester." 
      />

      {events.length === 0 ? (
        <Card className="text-center py-12 animate-fade-in-up">
          <span className="material-symbols-outlined text-[48px] text-text-subdued mb-3 block" aria-hidden="true">event</span>
          <p className="text-text-muted text-[14px]">No events found in the calendar.</p>
        </Card>
      ) : (
        <div className="space-y-8 animate-fade-in-up stagger">
          {Object.keys(grouped).map(month => (
            <section key={month}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-[16px] font-bold text-text-dark font-heading">{month}</h2>
                <Badge variant="event">{grouped[month].length} events</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {grouped[month].map((evt: any) => {
                  const date = new Date(evt.event_date);
                  return (
                    <Card key={evt.event_id} className="flex-row items-center gap-4 !p-4 hover:-translate-y-0.5 transition-transform cursor-default">
                      <div className="flex flex-col items-center justify-center min-w-[48px] bg-bg-slate rounded-lg py-2 px-1">
                        <span className="text-[10px] text-text-muted uppercase leading-tight">
                          {date.toLocaleString('default', { month: 'short' })}
                        </span>
                        <span className="text-[20px] font-bold text-text-dark leading-none">
                          {date.getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[14px] font-semibold text-text-dark">{evt.description}</h3>
                        <p className="text-[12px] text-text-muted mt-0.5">
                          {evt.event_day} • Week {evt.week}
                        </p>
                      </div>
                      <Badge variant={getBadgeVariant(evt.event_type)} className="hidden sm:flex shrink-0">
                        {evt.event_type}
                      </Badge>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
