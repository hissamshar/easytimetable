import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';

export async function GET() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth');
  
  if (!authCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let studentId: number;
  try {
    studentId = JSON.parse(authCookie.value).id;
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  try {
    // Get today's sessions
    const todayRes = await pool.query(
      `SELECT ss.*, c.course_name, c.course_code
       FROM study_sessions ss
       LEFT JOIN courses c ON ss.course_id = c.course_id
       WHERE ss.student_id = $1 AND ss.created_at::date = CURRENT_DATE
       ORDER BY ss.created_at DESC`,
      [studentId]
    );

    // Get weekly stats
    const weekRes = await pool.query(
      `SELECT 
         COALESCE(SUM(duration_minutes), 0) as total_minutes,
         COUNT(*) as total_sessions,
         COALESCE(SUM(CASE WHEN session_type = 'focus' THEN duration_minutes ELSE 0 END), 0) as focus_minutes,
         COALESCE(SUM(CASE WHEN session_type = 'short_break' THEN duration_minutes ELSE 0 END), 0) as break_minutes
       FROM study_sessions
       WHERE student_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'`,
      [studentId]
    );

    // Get daily breakdown for last 7 days
    const dailyRes = await pool.query(
      `SELECT 
         created_at::date as day,
         COALESCE(SUM(duration_minutes), 0) as minutes,
         COUNT(*) as sessions
       FROM study_sessions
       WHERE student_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days' AND session_type = 'focus'
       GROUP BY created_at::date
       ORDER BY day ASC`,
      [studentId]
    );

    // Get streak (consecutive days with at least 1 focus session)
    const streakRes = await pool.query(
      `WITH days AS (
         SELECT DISTINCT created_at::date as study_date
         FROM study_sessions
         WHERE student_id = $1 AND session_type = 'focus'
         ORDER BY study_date DESC
       ),
       numbered AS (
         SELECT study_date, 
                study_date - (ROW_NUMBER() OVER (ORDER BY study_date DESC))::int * INTERVAL '1 day' as grp
         FROM days
       )
       SELECT COUNT(*) as streak
       FROM numbered
       WHERE grp = (SELECT grp FROM numbered LIMIT 1)`,
      [studentId]
    );

    return NextResponse.json({
      today: todayRes.rows,
      weekly: weekRes.rows[0],
      daily: dailyRes.rows,
      streak: parseInt(streakRes.rows[0]?.streak || '0'),
    });
  } catch (error) {
    console.error('Study sessions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth');
  
  if (!authCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let studentId: number;
  try {
    studentId = JSON.parse(authCookie.value).id;
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { session_type, duration_minutes, course_id } = body;

    if (!session_type || !duration_minutes) {
      return NextResponse.json({ error: 'session_type and duration_minutes are required' }, { status: 400 });
    }

    const res = await pool.query(
      `INSERT INTO study_sessions (student_id, course_id, session_type, duration_minutes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [studentId, course_id || null, session_type, duration_minutes]
    );

    return NextResponse.json({ session: res.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Study session save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
