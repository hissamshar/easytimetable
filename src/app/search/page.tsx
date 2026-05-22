import pool from '@/lib/db';
import React from 'react';
import Link from 'next/link';

function formatTime(time24: string) {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

const dayOrder: Record<string, number> = {
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6,
  'Sunday': 7
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q || '';

  let scheduleResults: any[] = [];
  
  if (query.trim()) {
    const qStr = `%${query}%`;
    const res = await pool.query(
      `SELECT 
          cs.schedule_id, cs.day_of_week, cs.start_time, cs.end_time, cs.section, cs.semester,
          c.course_code, c.course_name, 
          r.room_code, r.room_name,
          f.name as faculty_name
      FROM class_schedule cs
      LEFT JOIN courses c ON cs.course_id = c.course_id
      LEFT JOIN rooms r ON cs.room_id = r.room_id
      LEFT JOIN faculty f ON cs.faculty_id = f.faculty_id
      WHERE c.course_code ILIKE $1
         OR c.course_name ILIKE $1
         OR r.room_code ILIKE $1
         OR f.name ILIKE $1
      LIMIT 100`,
      [qStr]
    );
    
    scheduleResults = res.rows.sort((a, b) => {
      const dayDiff = (dayOrder[a.day_of_week] || 0) - (dayOrder[b.day_of_week] || 0);
      if (dayDiff !== 0) return dayDiff;
      return a.start_time.localeCompare(b.start_time);
    });
  }

  return (
    <div className="max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-heading text-text-dark mb-2">Search Results</h1>
        <p className="text-text-muted">
          {query ? `Showing schedule matches for "${query}"` : 'Enter a search term to find courses, rooms, or faculty schedules.'}
        </p>
      </div>

      {query && scheduleResults.length === 0 ? (
        <div className="bg-bg-white border border-border rounded-2xl p-12 text-center">
          <span className="material-symbols-outlined text-[48px] text-text-muted mb-4 opacity-50">search_off</span>
          <h3 className="text-lg font-bold text-text-dark mb-1">No matches found</h3>
          <p className="text-sm text-text-muted">We couldn't find any classes for "{query}". Try a different course code, room name, or instructor.</p>
        </div>
      ) : null}

      {scheduleResults.length > 0 && (
        <div className="bg-bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-slate border-b border-border text-[11px] uppercase tracking-wider text-text-muted">
                  <th className="px-6 py-4 font-semibold">Course</th>
                  <th className="px-6 py-4 font-semibold">Time</th>
                  <th className="px-6 py-4 font-semibold">Room</th>
                  <th className="px-6 py-4 font-semibold">Instructor</th>
                  <th className="px-6 py-4 font-semibold">Section</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {scheduleResults.map((s) => (
                  <tr key={s.schedule_id} className="hover:bg-bg-slate/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-text-dark text-[13px]">{s.course_code}</p>
                      <p className="text-[12px] text-text-muted truncate max-w-[200px]" title={s.course_name}>{s.course_name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-text-dark text-[13px]">{s.day_of_week}</p>
                      <p className="text-[12px] text-primary">{formatTime(s.start_time)} - {formatTime(s.end_time)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-text-dark text-[13px]">{s.room_code || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-text-primary">
                      {s.faculty_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-accent-10 text-accent font-medium text-[11px]">
                        {s.section || s.semester || 'All'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
