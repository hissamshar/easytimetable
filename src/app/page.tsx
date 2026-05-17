import React from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import pool from '@/lib/db';
import { Card } from './components/ui/Card';
import { Badge } from './components/ui/Badge';

async function getStudentDashboard(studentId: number, rollNumber: string) {
  try {
    // Get enrolled courses count
    const coursesRes = await pool.query(
      'SELECT COUNT(DISTINCT ce.course_id) as count FROM course_enrollment ce WHERE ce.student_id = $1',
      [studentId]
    );

    // Get today's schedule
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = days[new Date().getDay()];
    const scheduleRes = await pool.query(
      `SELECT cs.schedule_id, c.course_code, c.course_name, cs.day_of_week, 
              cs.start_time, cs.end_time, cs.section, r.room_name, f.name as faculty_name
       FROM course_enrollment ce
       JOIN class_schedule cs ON ce.course_id = cs.course_id AND ce.section = cs.section
       JOIN courses c ON cs.course_id = c.course_id
       LEFT JOIN rooms r ON cs.room_id = r.room_id
       LEFT JOIN faculty f ON cs.faculty_id = f.faculty_id
       WHERE ce.student_id = $1 AND cs.day_of_week = $2
       ORDER BY cs.start_time ASC`,
      [studentId, today]
    );

    // Get upcoming exams (next 30 days)
    const examsRes = await pool.query(
      `SELECT es.exam_id, c.course_code, c.course_name, es.exam_type, 
              es.exam_date, es.start_time, es.end_time
       FROM course_enrollment ce
       JOIN exam_schedule es ON ce.course_id = es.course_id
       JOIN courses c ON es.course_id = c.course_id
       WHERE ce.student_id = $1 
         AND es.exam_date >= CURRENT_DATE 
         AND es.exam_date <= CURRENT_DATE + INTERVAL '30 days'
       ORDER BY es.exam_date ASC, es.start_time ASC
       LIMIT 5`,
      [studentId]
    );

    // Get recent updates
    const updatesRes = await pool.query(
      'SELECT * FROM live_updates ORDER BY created_at DESC LIMIT 4'
    );

    return {
      coursesCount: parseInt(coursesRes.rows[0]?.count || '0'),
      todaySchedule: scheduleRes.rows,
      upcomingExams: examsRes.rows,
      updates: updatesRes.rows,
    };
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    return { coursesCount: 0, todaySchedule: [], upcomingExams: [], updates: [] };
  }
}

export default async function Home() {
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

  const data = studentId ? await getStudentDashboard(studentId, rollNumber) : null;
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayName = days[now.getDay()];

  // Find current/next class
  const currentClass = data?.todaySchedule.find(
    (c: any) => c.start_time <= currentTime && c.end_time > currentTime
  );
  const nextClass = data?.todaySchedule.find(
    (c: any) => c.start_time > currentTime
  );

  const formatTime = (t: string) => {
    const [h, m] = t.split(':');
    const date = new Date();
    date.setHours(parseInt(h), parseInt(m), 0);
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
  };

  return (
    <>
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-6 md:p-8 text-white animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-[24px] md:text-[28px] font-bold font-heading">
              Welcome back, {studentName.split(' ')[0]}!
            </h1>
            <p className="text-white/80 text-[14px] mt-1">
              {todayName === 'Fri' || todayName === 'Sat' || todayName === 'Sun' 
                ? '🎉 Enjoy your weekend!' 
                : `📚 You have ${data?.todaySchedule.length || 0} class${(data?.todaySchedule.length || 0) !== 1 ? 'es' : ''} today`
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-[13px]">
              <span className="text-white/60">Roll: </span>
              <span className="font-semibold">{rollNumber}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        <Card className="flex-row items-center gap-3 !p-4">
          <div className="w-10 h-10 rounded-xl bg-primary-10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">menu_book</span>
          </div>
          <div>
            <p className="text-[22px] font-bold text-text-dark leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>{data?.coursesCount || 0}</p>
            <p className="text-[11px] text-text-muted mt-0.5">Enrolled Courses</p>
          </div>
        </Card>
        <Card className="flex-row items-center gap-3 !p-4">
          <div className="w-10 h-10 rounded-xl bg-orange-light flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-orange text-[20px]" aria-hidden="true">assignment</span>
          </div>
          <div>
            <p className="text-[22px] font-bold text-text-dark leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>{data?.upcomingExams.length || 0}</p>
            <p className="text-[11px] text-text-muted mt-0.5">Upcoming Exams</p>
          </div>
        </Card>
        <Card className="flex-row items-center gap-3 !p-4">
          <div className="w-10 h-10 rounded-xl bg-green-light flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-green text-[20px]" aria-hidden="true">calendar_view_week</span>
          </div>
          <div>
            <p className="text-[22px] font-bold text-text-dark leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>{data?.todaySchedule.length || 0}</p>
            <p className="text-[11px] text-text-muted mt-0.5">Classes Today</p>
          </div>
        </Card>
        <Card className="flex-row items-center gap-3 !p-4">
          <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">campaign</span>
          </div>
          <div>
            <p className="text-[22px] font-bold text-text-dark leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>{data?.updates.length || 0}</p>
            <p className="text-[11px] text-text-muted mt-0.5">New Updates</p>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        
        {/* Today's Schedule — takes 2 cols */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">today</span>
              <h2 className="text-[16px] font-bold text-text-dark font-heading">Today&apos;s Schedule</h2>
              <Badge variant="info">{todayName}</Badge>
            </div>
            <Link href="/timetable" className="text-[12px] text-primary font-semibold hover:underline">
              View Full →
            </Link>
          </div>

          {currentClass && (
            <div className="bg-primary-10 border border-primary/20 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="live">NOW</Badge>
                <span className="text-[12px] text-text-muted">
                  {formatTime(currentClass.start_time)} – {formatTime(currentClass.end_time)}
                </span>
              </div>
              <h3 className="text-[15px] font-bold text-text-dark">{currentClass.course_name}</h3>
              <div className="flex flex-wrap gap-3 mt-2 text-[12px] text-text-muted">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">location_on</span>
                  {currentClass.room_name || 'TBD'}
                </span>
                {currentClass.faculty_name && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">person</span>
                    {currentClass.faculty_name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">tag</span>
                  {currentClass.course_code}
                </span>
              </div>
            </div>
          )}

          {(!data?.todaySchedule || data.todaySchedule.length === 0) ? (
            <div className="text-center py-10 text-text-muted">
              <span className="material-symbols-outlined text-[40px] text-text-subdued mb-2 block" aria-hidden="true">weekend</span>
              <p className="text-[14px]">No classes scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.todaySchedule.map((cls: any) => {
                const isCurrent = cls.start_time <= currentTime && cls.end_time > currentTime;
                const isPast = cls.end_time <= currentTime;
                return (
                  <div 
                    key={cls.schedule_id} 
                    className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                      isCurrent 
                        ? 'border-primary/30 bg-primary-10' 
                        : isPast 
                          ? 'border-border bg-bg-slate/50 opacity-60' 
                          : 'border-border hover:bg-bg-slate/50'
                    }`}
                  >
                    <div className="text-center min-w-[60px]">
                      <p className="text-[13px] font-bold text-text-dark">{formatTime(cls.start_time)}</p>
                      <p className="text-[10px] text-text-subdued">{formatTime(cls.end_time)}</p>
                    </div>
                    <div className={`w-0.5 h-10 rounded-full ${isCurrent ? 'bg-primary' : isPast ? 'bg-text-subdued' : 'bg-border'}`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-text-dark truncate">{cls.course_name}</p>
                      <div className="flex gap-3 text-[11px] text-text-muted mt-0.5">
                        <span>{cls.course_code}</span>
                        <span>{cls.room_name || 'TBD'}</span>
                        {cls.faculty_name && <span>{cls.faculty_name}</span>}
                      </div>
                    </div>
                    {isCurrent && (
                      <Badge variant="live" className="shrink-0">Live</Badge>
                    )}
                    {isPast && (
                      <span className="material-symbols-outlined text-text-subdued text-[18px]" aria-hidden="true">check_circle</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Upcoming Exams */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-orange text-[20px]" aria-hidden="true">assignment</span>
                <h2 className="text-[16px] font-bold text-text-dark font-heading">Upcoming Exams</h2>
              </div>
              <Link href="/exams" className="text-[12px] text-primary font-semibold hover:underline">
                All →
              </Link>
            </div>
            {(!data?.upcomingExams || data.upcomingExams.length === 0) ? (
              <div className="text-center py-6 text-text-muted">
                <span className="material-symbols-outlined text-[32px] text-text-subdued mb-1 block" aria-hidden="true">celebration</span>
                <p className="text-[13px]">No upcoming exams!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.upcomingExams.map((exam: any) => {
                  const examDate = new Date(exam.exam_date);
                  const diffDays = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={exam.exam_id} className="flex items-start gap-3 p-3 bg-bg-slate rounded-lg">
                      <div className="text-center min-w-[40px] bg-bg-white rounded-lg py-1.5 px-1 border border-border">
                        <p className="text-[10px] text-text-muted uppercase leading-tight">
                          {examDate.toLocaleString('default', { month: 'short' })}
                        </p>
                        <p className="text-[16px] font-bold text-text-dark leading-none">
                          {examDate.getDate()}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-text-dark truncate">{exam.course_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={exam.exam_type.toLowerCase().includes('final') ? 'exam' : 'default'}>
                            {exam.exam_type}
                          </Badge>
                          <span className="text-[11px] text-text-muted">
                            {diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `${diffDays}d left`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Recent Updates */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">campaign</span>
                <h2 className="text-[16px] font-bold text-text-dark font-heading">Updates</h2>
              </div>
              <Link href="/updates" className="text-[12px] text-primary font-semibold hover:underline">
                All →
              </Link>
            </div>
            {(!data?.updates || data.updates.length === 0) ? (
              <p className="text-text-muted text-center py-4 text-[13px]">No recent updates</p>
            ) : (
              <div className="space-y-2">
                {data.updates.map((update: any) => (
                  <div key={update.update_id} className="p-3 bg-bg-slate rounded-lg border-l-2 border-primary">
                    <p className="text-[13px] font-medium text-text-dark">{update.title}</p>
                    <p className="text-[11px] text-text-muted mt-1">
                      {update.category} • {new Date(update.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
        <Link href="/timetable">
          <Card hoverable className="flex-row items-center gap-3 !p-4">
            <div className="w-10 h-10 rounded-xl bg-primary-10 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">calendar_view_week</span>
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-text-dark">Full Timetable</h3>
              <p className="text-[11px] text-text-muted">Weekly class schedule</p>
            </div>
          </Card>
        </Link>
        <Link href="/exams">
          <Card hoverable className="flex-row items-center gap-3 !p-4">
            <div className="w-10 h-10 rounded-xl bg-orange-light flex items-center justify-center text-orange shrink-0">
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">assignment</span>
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-text-dark">Exam Datesheet</h3>
              <p className="text-[11px] text-text-muted">Finals & sessionals</p>
            </div>
          </Card>
        </Link>
        <Link href="/calendar">
          <Card hoverable className="flex-row items-center gap-3 !p-4">
            <div className="w-10 h-10 rounded-xl bg-green-light flex items-center justify-center text-green shrink-0">
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">event</span>
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-text-dark">Academic Calendar</h3>
              <p className="text-[11px] text-text-muted">Holidays & deadlines</p>
            </div>
          </Card>
        </Link>
      </div>
    </>
  );
}
