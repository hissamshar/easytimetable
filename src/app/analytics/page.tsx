import React from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import pool from '@/lib/db';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { DeadlinesCard } from '../components/analytics/DeadlinesCard';
import { GoalsCard } from '../components/analytics/GoalsCard';
import { ConnectionsCard } from '../components/analytics/ConnectionsCard';

async function getAnalyticsData(studentId: number) {
  try {
    // Current month overview
    const monthStatsRes = await pool.query(
      `SELECT 
         COALESCE(SUM(duration_minutes), 0) as total_minutes,
         COUNT(*) as total_sessions
       FROM study_sessions
       WHERE student_id = $1 
         AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)`,
      [studentId]
    );

    // Study time by course
    const courseStatsRes = await pool.query(
      `SELECT 
         c.course_name,
         c.course_code,
         COALESCE(SUM(ss.duration_minutes), 0) as minutes
       FROM study_sessions ss
       JOIN courses c ON ss.course_id = c.course_id
       WHERE ss.student_id = $1 
         AND date_trunc('month', ss.created_at) = date_trunc('month', CURRENT_DATE)
         AND ss.session_type = 'focus'
       GROUP BY c.course_id, c.course_name, c.course_code
       ORDER BY minutes DESC`,
      [studentId]
    );

    // Daily distribution for current month
    const dailyStatsRes = await pool.query(
      `SELECT 
         EXTRACT(DAY FROM created_at)::int as day,
         COALESCE(SUM(duration_minutes), 0) as minutes
       FROM study_sessions
       WHERE student_id = $1 
         AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
         AND session_type = 'focus'
       GROUP BY EXTRACT(DAY FROM created_at)
       ORDER BY day ASC`,
      [studentId]
    );

    // Deadlines count
    const deadlinesRes = await pool.query(
      `SELECT COUNT(*) as count FROM student_deadlines WHERE student_id = $1 AND is_completed = false`,
      [studentId]
    );

    // Active goals count
    const goalsRes = await pool.query(
      `SELECT COUNT(*) as count FROM study_goals WHERE student_id = $1 AND CURRENT_DATE BETWEEN start_date AND end_date`,
      [studentId]
    );

    // Connections count
    const connectionsRes = await pool.query(
      `SELECT COUNT(*) as count FROM student_connections WHERE status = 'accepted' AND (requester_id = $1 OR receiver_id = $1)`,
      [studentId]
    );

    // Bug 6: Total enrolled courses
    const enrolledRes = await pool.query(
      `SELECT COUNT(*) as count FROM course_enrollment WHERE student_id = $1`,
      [studentId]
    );

    // Bug 9: Weekly stats (last 7 days)
    const weeklyStatsRes = await pool.query(
      `SELECT 
         to_char(created_at, 'Dy') as day_name,
         EXTRACT(ISODOW FROM created_at) as dow,
         COALESCE(SUM(duration_minutes), 0) as minutes
       FROM study_sessions
       WHERE student_id = $1 
         AND created_at >= CURRENT_DATE - INTERVAL '6 days'
         AND session_type = 'focus'
       GROUP BY to_char(created_at, 'Dy'), EXTRACT(ISODOW FROM created_at)
       ORDER BY dow ASC`,
      [studentId]
    );

    // Recent sessions (last 10)
    const recentRes = await pool.query(
      `SELECT 
         ss.created_at, 
         ss.session_type, 
         ss.duration_minutes,
         c.course_name, 
         c.course_code
       FROM study_sessions ss
       LEFT JOIN courses c ON ss.course_id = c.course_id
       WHERE ss.student_id = $1
       ORDER BY ss.created_at DESC
       LIMIT 10`,
      [studentId]
    );

    return {
      monthStats: monthStatsRes.rows[0],
      courseStats: courseStatsRes.rows,
      dailyStats: dailyStatsRes.rows,
      deadlinesCount: parseInt(deadlinesRes.rows[0]?.count || '0'),
      goalsCount: parseInt(goalsRes.rows[0]?.count || '0'),
      connectionsCount: parseInt(connectionsRes.rows[0]?.count || '0'),
      enrolledCount: parseInt(enrolledRes.rows[0]?.count || '0'),
      weeklyStats: weeklyStatsRes.rows,
      recentSessions: recentRes.rows,
    };
  } catch (err) {
    console.error('Analytics fetch error:', err);
    return null;
  }
}

export default async function AnalyticsPage() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth');
  
  let studentId = 0;
  if (authCookie) {
    try {
      studentId = JSON.parse(authCookie.value).id;
    } catch { /* fallback */ }
  }

  const data = studentId ? await getAnalyticsData(studentId) : null;

  if (!studentId || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in-up">
        <div className="w-20 h-20 bg-bg-slate rounded-full flex items-center justify-center mb-6 shadow-inner">
          <span className="material-symbols-outlined text-[40px] text-text-subdued" aria-hidden="true">lock</span>
        </div>
        <h1 className="text-[24px] md:text-[28px] font-bold text-text-dark font-heading mb-3">
          Sign in to view Analytics
        </h1>
        <p className="text-[14px] md:text-[15px] text-text-muted max-w-md mx-auto mb-8 leading-relaxed">
          Track your study sessions, monitor your weekly progress, and see how you&apos;re spending time across different courses.
        </p>
        <Link 
          href="/login" 
          className="bg-primary text-white rounded-xl px-8 py-3.5 text-[15px] font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 transition-all active:translate-y-0 flex items-center gap-2"
        >
          <span>Sign In to Continue</span>
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_forward</span>
        </Link>
      </div>
    );
  }
  
  const totalMinutes = parseInt(data?.monthStats?.total_minutes || '0');
  const hoursStudied = Math.floor(totalMinutes / 60);
  const totalSessions = parseInt(data?.monthStats?.total_sessions || '0');

  const now = new Date();
  const currentMonth = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(now);
  const currentMonthNum = now.getMonth();
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonthNum + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonthNum, 1).getDay(); // 0 is Sun

  // Generate calendar grid
  const calendarGrid = [];
  let currentDay = 1;
  for (let i = 0; i < 6; i++) {
    const week = [];
    for (let j = 0; j < 7; j++) {
      if (i === 0 && j < firstDayOfMonth) {
        week.push(null);
      } else if (currentDay <= daysInMonth) {
        const dayData = data?.dailyStats.find(d => d.day === currentDay);
        week.push({
          day: currentDay,
          minutes: dayData ? parseInt(dayData.minutes) : 0
        });
        currentDay++;
      } else {
        week.push(null);
      }
    }
    calendarGrid.push(week);
    if (currentDay > daysInMonth) break;
  }

  // Course colors
  const colors = ['#2663ed', '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Top Banner — Bug 8: added Start Studying CTA */}
      <div className="bg-gradient-to-r from-[#8b5cf6] via-[#a855f7] to-[#ec4899] rounded-2xl p-6 md:p-8 text-white shadow-md animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] md:text-[28px] font-bold font-heading">Monthly Overview</h1>
            <p className="text-white/80 text-[14px]">Track your progress and achievements</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link 
              href="/timer" 
              className="bg-white text-text-dark rounded-lg px-5 py-2 text-[14px] font-bold shadow-lg hover:bg-white/90 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">timer</span>
              Start Studying
            </Link>
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6 border-t border-white/20 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">schedule</span>
              <span className="text-[13px] font-medium">{hoursStudied}h studied</span>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">task_alt</span>
              <span className="text-[13px] font-medium">{totalSessions} sessions</span>
            </div>
            <div className="bg-white text-text-dark rounded-lg px-4 py-1.5 text-[13px] font-bold shadow-sm">
              {currentMonth}
            </div>
          </div>
        </div>
      </div>

      {/* 4-Card Stats — Bug 6: "X / Y" for courses tracked */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        <DeadlinesCard initialCount={data?.deadlinesCount || 0} />
        <GoalsCard initialCount={data?.goalsCount || 0} />
        
        <Card className="!p-5 relative group overflow-hidden hover:border-indigo transition-colors">
          <div className="flex items-center gap-2 mb-3 text-indigo">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">menu_book</span>
            <h3 className="text-[13px] font-bold text-text-dark">Courses Tracked</h3>
          </div>
          <p className="text-[32px] font-bold text-text-dark font-heading leading-none mb-2">{data?.courseStats?.length || 0} <span className="text-[16px] text-text-muted font-normal">/ {data?.enrolledCount || 0}</span></p>
          <p className="text-[11px] text-text-muted leading-snug">Courses studied via timer this month vs total enrolled.</p>
        </Card>

        <ConnectionsCard initialCount={data?.connectionsCount || 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        {/* Study Time by Course - Donut Chart */}
        <Card className="flex flex-col h-full">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-[16px] font-bold text-text-dark font-heading">Study Time by Course</h2>
              <p className="text-[12px] text-text-muted">Time spent studying each course this month</p>
            </div>
            <div className="text-right">
              <Badge variant="info">Total: {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</Badge>
            </div>
          </div>

          {!data?.courseStats || data.courseStats.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-text-muted">
              <span className="material-symbols-outlined text-[48px] text-text-subdued mb-2" aria-hidden="true">donut_large</span>
              <p className="text-[13px]">No course study data yet this month.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-8 py-4">
              {/* Simple SVG Donut Chart */}
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                  {data.courseStats.reduce((acc, course, i) => {
                    if (totalMinutes === 0) return acc;
                    const percentage = (parseInt(course.minutes) / totalMinutes) * 100;
                    const strokeDasharray = `${percentage} ${100 - percentage}`;
                    const element = (
                      <circle
                        key={course.course_code}
                        cx="50" cy="50" r="40"
                        fill="transparent"
                        stroke={colors[i % colors.length]}
                        strokeWidth="15"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={`-${acc.offset}`}
                        className="transition-opacity duration-500 hover:opacity-80"
                      />
                    );
                    acc.elements.push(element);
                    acc.offset += percentage;
                    return acc;
                  }, { elements: [] as React.ReactNode[], offset: 0 }).elements}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[20px] font-bold text-text-dark leading-none">{Math.floor(totalMinutes / 60)}h</span>
                  <span className="text-[11px] text-text-muted uppercase font-semibold">Total</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-col gap-3 w-full sm:w-auto">
                {data.courseStats.map((course, i) => {
                  const mins = parseInt(course.minutes);
                  const perc = totalMinutes > 0 ? Math.round((mins / totalMinutes) * 100) : 0;
                  return (
                    <div key={course.course_code} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-text-dark truncate leading-tight" title={course.course_name}>
                          {course.course_code}
                        </p>
                        <p className="text-[11px] text-text-muted">
                          {Math.floor(mins / 60)}h {mins % 60}m ({perc}%)
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Pomodoro Sessions Calendar */}
        <Card className="flex flex-col h-full">
          <div className="mb-6">
            <h2 className="text-[16px] font-bold text-text-dark font-heading">Pomodoro Sessions</h2>
            <p className="text-[12px] text-text-muted">Daily study time distribution</p>
          </div>

          <div className="w-full overflow-x-auto pb-2">
            <div className="min-w-[400px]">
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-[11px] font-semibold text-text-muted uppercase">
                    {day}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {calendarGrid.map((week, i) => (
                  <div key={i} className="grid grid-cols-7 gap-2">
                    {week.map((dayObj, j) => {
                      if (!dayObj) return <div key={`empty-${j}`} className="aspect-square rounded-lg bg-transparent" />;
                      
                      // Calculate opacity based on minutes studied (max 4 hours = 240 mins)
                      const intensity = Math.min(dayObj.minutes / 240, 1);
                      const isToday = dayObj.day === now.getDate();
                      
                      return (
                        <div 
                          key={dayObj.day}
                          className={`aspect-square rounded-lg flex flex-col items-center justify-center relative border group transition-colors
                            ${isToday ? 'border-primary ring-2 ring-primary/20' : 'border-border'}
                            ${dayObj.minutes > 0 ? 'bg-primary' : 'bg-bg-slate'}
                          `}
                          style={{
                            backgroundColor: dayObj.minutes > 0 ? `rgba(38, 99, 237, ${Math.max(0.2, intensity)})` : undefined,
                            borderColor: dayObj.minutes > 0 ? `rgba(38, 99, 237, ${Math.min(1, intensity + 0.3)})` : undefined,
                          }}
                        >
                          <span className={`text-[12px] font-medium z-10 ${dayObj.minutes > 120 ? 'text-white' : 'text-text-slate'}`}>
                            {dayObj.day}
                          </span>
                          
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20 w-max bg-gray-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap shadow-xl">
                            Day {dayObj.day}: {dayObj.minutes > 0 ? `${Math.floor(dayObj.minutes / 60)}h ${dayObj.minutes % 60}m` : 'No sessions'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Bug 9: Weekly Trend + Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
        {/* Weekly Trend Bar Chart */}
        <Card className="flex flex-col h-full">
          <div className="mb-6">
            <h2 className="text-[16px] font-bold text-text-dark font-heading">This Week</h2>
            <p className="text-[12px] text-text-muted">Focus minutes over the last 7 days</p>
          </div>
          <div className="flex-1 flex items-end gap-2 h-[200px] mt-4">
            {!data?.weeklyStats || data.weeklyStats.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-[13px] text-text-muted">No sessions this week.</div>
            ) : (
              (() => {
                const maxMins = Math.max(...data.weeklyStats.map((d: any) => parseFloat(d.minutes)), 60);
                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const statsMap = data.weeklyStats.reduce((acc: any, curr: any) => {
                  const dayName = curr.day_name.substring(0, 3);
                  acc[dayName] = parseFloat(curr.minutes);
                  return acc;
                }, {});
                
                return days.map(day => {
                  const mins = statsMap[day] || 0;
                  const heightPerc = Math.max((mins / maxMins) * 100, 2);
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center justify-end h-full group">
                      <div className="w-full relative flex items-end justify-center h-full">
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 w-max bg-gray-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap shadow-xl">
                          {mins} mins
                        </div>
                        <div 
                          className="w-full bg-primary/80 rounded-t-sm transition-all duration-300 group-hover:bg-primary"
                          style={{ height: `${heightPerc}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-text-muted mt-2 font-medium">{day}</span>
                    </div>
                  );
                });
              })()
            )}
          </div>
        </Card>

        {/* Recent Sessions Table */}
        <Card className="flex flex-col h-full">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h2 className="text-[16px] font-bold text-text-dark font-heading">Recent Sessions</h2>
              <p className="text-[12px] text-text-muted">Your last 10 study sessions</p>
            </div>
            <Link href="/timer" className="text-[12px] text-primary hover:underline font-semibold">
              Go to Timer
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            {!data?.recentSessions || data.recentSessions.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[13px] text-text-muted py-8">No recent sessions found.</div>
            ) : (
              <div className="space-y-3">
                {data.recentSessions.map((session: any, i: number) => {
                  const isFocus = session.session_type === 'focus';
                  const dateObj = new Date(session.created_at);
                  const dateStr = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(dateObj);
                  return (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-bg-slate/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isFocus ? 'bg-primary/10 text-primary' : 'bg-green-500/10 text-green-600'}`}>
                          <span className="material-symbols-outlined text-[16px]">{isFocus ? 'target' : 'coffee'}</span>
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-text-dark leading-tight">{session.course_code || (isFocus ? 'Focus Session' : 'Break')}</p>
                          <p className="text-[11px] text-text-muted">{dateStr}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[14px] font-bold text-text-dark">{session.duration_minutes}m</p>
                        <p className="text-[10px] text-text-muted uppercase font-semibold">{isFocus ? 'Study' : 'Rest'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
