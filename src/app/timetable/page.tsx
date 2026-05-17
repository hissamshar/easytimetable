import React from 'react';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

async function getSchedule(studentId: number) {
  try {
    const res = await pool.query(
      `SELECT cs.schedule_id, c.course_code, c.course_name, cs.day_of_week, 
              cs.start_time, cs.end_time, cs.section, f.name as faculty_name, r.room_name
       FROM course_enrollment ce
       JOIN class_schedule cs ON ce.course_id = cs.course_id AND ce.section = cs.section
       JOIN courses c ON cs.course_id = c.course_id
       LEFT JOIN faculty f ON cs.faculty_id = f.faculty_id
       LEFT JOIN rooms r ON cs.room_id = r.room_id
       WHERE ce.student_id = $1
       ORDER BY 
         CASE cs.day_of_week 
           WHEN 'Mon' THEN 1 WHEN 'Tue' THEN 2 WHEN 'Wed' THEN 3 
           WHEN 'Thu' THEN 4 WHEN 'Fri' THEN 5 ELSE 6 
         END,
         cs.start_time ASC`,
      [studentId]
    );
    return res.rows;
  } catch (err) {
    console.error('Schedule fetch error:', err);
    return [];
  }
}

const formatTime = (t: string) => {
  const [h, m] = t.split(':');
  const date = new Date();
  date.setHours(parseInt(h), parseInt(m), 0);
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
};

const dayColors: Record<string, string> = {
  Mon: 'bg-primary-10 border-primary/20 text-primary',
  Tue: 'bg-green-light border-green/20 text-green',
  Wed: 'bg-orange-light border-orange/20 text-orange',
  Thu: 'bg-primary-light border-accent/20 text-accent',
  Fri: 'bg-red-light border-red/20 text-red',
};

export default async function TimetablePage() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth');
  
  let studentName = 'Student';
  let rollNumber = '';
  let studentId = 0;
  let section = '';

  if (authCookie) {
    try {
      const parsed = JSON.parse(authCookie.value);
      studentName = parsed.name || 'Student';
      rollNumber = parsed.roll || '';
      studentId = parsed.id || 0;
      section = parsed.section || '';
    } catch { /* fallback */ }
  }

  const schedule = studentId ? await getSchedule(studentId) : [];

  // Group by day
  const grouped: Record<string, any[]> = {};
  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  dayOrder.forEach(d => { grouped[d] = []; });
  schedule.forEach((cls: any) => {
    const day = cls.day_of_week.substring(0, 3);
    if (grouped[day]) grouped[day].push(cls);
  });

  return (
    <>
      <PageHeader 
        title="Class Timetable" 
        subtitle="Your weekly schedule with rooms and faculty." 
      />

      {/* Student Info Bar */}
      <Card className="flex-row items-center gap-4 !p-4 mb-2 animate-fade-in-up">
        <div className="w-10 h-10 rounded-full bg-primary-10 flex items-center justify-center text-primary font-bold text-[13px] shrink-0">
          {studentName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-text-dark">{studentName}</p>
          <div className="flex flex-wrap gap-3 text-[12px] text-text-muted">
            <span>{rollNumber}</span>
            {section && section !== 'Unknown' && <span>Section: {section}</span>}
            <span>{schedule.length} class slots/week</span>
          </div>
        </div>
      </Card>

      {schedule.length === 0 ? (
        <Card className="text-center py-12 animate-fade-in-up">
          <span className="material-symbols-outlined text-[48px] text-text-subdued mb-3 block" aria-hidden="true">calendar_view_week</span>
          <p className="text-text-muted text-[14px]">No class schedule found.</p>
        </Card>
      ) : (
        <div className="space-y-6 animate-fade-in-up stagger" style={{ animationDelay: '50ms' }}>
          {dayOrder.map(day => {
            const classes = grouped[day];
            if (classes.length === 0) return null;
            const colors = dayColors[day] || 'bg-bg-slate border-border text-text-slate';
            
            return (
              <div key={day}>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-[15px] font-bold text-text-dark font-heading">
                    {day === 'Mon' ? 'Monday' : day === 'Tue' ? 'Tuesday' : day === 'Wed' ? 'Wednesday' : day === 'Thu' ? 'Thursday' : 'Friday'}
                  </h3>
                  <Badge variant="event">{classes.length} class{classes.length !== 1 ? 'es' : ''}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {classes.map((cls: any) => (
                    <Card key={cls.schedule_id} className={`!p-4 border-l-[3px] ${colors.split(' ').slice(1).join(' ')} !bg-bg-card`}>
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="default">{cls.course_code}</Badge>
                        <span className="text-[11px] text-text-muted font-medium">{cls.section}</span>
                      </div>
                      <h4 className="text-[14px] font-semibold text-text-dark mt-1 leading-snug">{cls.course_name}</h4>
                      <div className="mt-3 space-y-1.5 text-[12px] text-text-muted">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">schedule</span>
                          {formatTime(cls.start_time)} – {formatTime(cls.end_time)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">location_on</span>
                          {cls.room_name || 'TBD'}
                        </div>
                        {cls.faculty_name && (
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">person</span>
                            {cls.faculty_name}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
