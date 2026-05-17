import React from 'react';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

async function getExams(studentId: number) {
  try {
    const res = await pool.query(
      `SELECT es.exam_id, c.course_code, c.course_name, es.exam_type, 
              es.exam_date, es.start_time, es.end_time, r.room_name, es.section
       FROM course_enrollment ce
       JOIN exam_schedule es ON ce.course_id = es.course_id
       JOIN courses c ON es.course_id = c.course_id
       LEFT JOIN rooms r ON es.room_id = r.room_id
       WHERE ce.student_id = $1
       ORDER BY es.exam_date ASC, es.start_time ASC`,
      [studentId]
    );
    return res.rows;
  } catch (err) {
    console.error('Exams fetch error:', err);
    return [];
  }
}

const formatTime = (t: string) => {
  const [h, m] = t.split(':');
  const date = new Date();
  date.setHours(parseInt(h), parseInt(m), 0);
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
};

export default async function ExamsPage() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth');
  
  let studentName = 'Student';
  let rollNumber = '';
  let studentId = 0;

  if (authCookie) {
    try {
      const parsed = JSON.parse(authCookie.value);
      studentName = parsed.name || 'Student';
      rollNumber = parsed.roll || '';
      studentId = parsed.id || 0;
    } catch { /* fallback */ }
  }

  const exams = studentId ? await getExams(studentId) : [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcomingExams = exams.filter((e: any) => new Date(e.exam_date) >= now);
  const pastExams = exams.filter((e: any) => new Date(e.exam_date) < now);

  return (
    <>
      <PageHeader 
        title="Exam Schedule" 
        subtitle="Your personalized datesheet and seating plan." 
      />

      {/* Student Info */}
      <Card className="flex-row items-center gap-4 !p-4 mb-2 animate-fade-in-up">
        <div className="w-10 h-10 rounded-full bg-orange-light flex items-center justify-center text-orange font-bold text-[13px] shrink-0">
          {studentName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-text-dark">{studentName}</p>
          <div className="flex flex-wrap gap-3 text-[12px] text-text-muted">
            <span>{rollNumber}</span>
            <span>{exams.length} total exams</span>
            <span>{upcomingExams.length} upcoming</span>
          </div>
        </div>
      </Card>

      {exams.length === 0 ? (
        <Card className="text-center py-12 animate-fade-in-up">
          <span className="material-symbols-outlined text-[48px] text-text-subdued mb-3 block" aria-hidden="true">assignment</span>
          <p className="text-text-muted text-[14px]">No exams scheduled.</p>
        </Card>
      ) : (
        <div className="space-y-8 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          {/* Upcoming Exams */}
          {upcomingExams.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-[16px] font-bold text-text-dark font-heading">Upcoming Exams</h2>
                <Badge variant="exam">{upcomingExams.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
                {upcomingExams.map((exam: any) => {
                  const examDate = new Date(exam.exam_date);
                  const diffDays = Math.ceil((examDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  const isFinal = exam.exam_type.toLowerCase().includes('final');
                  
                  return (
                    <Card key={exam.exam_id} className={`!p-4 border-l-[3px] ${isFinal ? 'border-red' : 'border-orange'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="default">{exam.course_code}</Badge>
                        <Badge variant={isFinal ? 'cancelled' : 'exam'}>{exam.exam_type}</Badge>
                      </div>
                      <h3 className="text-[14px] font-semibold text-text-dark mt-1 leading-snug">{exam.course_name}</h3>
                      <div className="mt-3 space-y-1.5 text-[12px] text-text-muted">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">calendar_today</span>
                          {examDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          <span className="ml-auto text-[11px] font-semibold text-text-slate">
                            {diffDays === 0 ? 'Today!' : diffDays === 1 ? 'Tomorrow' : `${diffDays}d`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">schedule</span>
                          {formatTime(exam.start_time)} – {formatTime(exam.end_time)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">location_on</span>
                          {exam.room_name || 'TBD'}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past Exams */}
          {pastExams.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-[16px] font-bold text-text-slate font-heading">Past Exams</h2>
                <Badge variant="event">{pastExams.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                {pastExams.map((exam: any) => {
                  const examDate = new Date(exam.exam_date);
                  return (
                    <Card key={exam.exam_id} className="!p-4 border-l-[3px] border-border">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="event">{exam.course_code}</Badge>
                        <span className="text-[11px] text-text-subdued">{exam.exam_type}</span>
                      </div>
                      <h3 className="text-[14px] font-semibold text-text-slate mt-1 leading-snug">{exam.course_name}</h3>
                      <div className="mt-3 text-[12px] text-text-muted flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">calendar_today</span>
                        {examDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
