import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth');
  if (!authCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const studentId = JSON.parse(authCookie.value).id;
    const { searchParams } = new URL(request.url);
    const buddyId = searchParams.get('buddy_id');
    let dayOfWeek = searchParams.get('day');

    if (!buddyId) {
      return NextResponse.json({ error: 'buddy_id is required' }, { status: 400 });
    }

    if (!dayOfWeek) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      dayOfWeek = days[new Date().getDay()];
    }

    // Fetch classes for current user
    const resMe = await pool.query(
      `SELECT c.course_name, cs.start_time, cs.end_time 
       FROM class_schedule cs
       JOIN courses c ON cs.course_id = c.course_id
       JOIN course_enrollment ce ON cs.course_id = ce.course_id 
                                  AND cs.section = ce.section 
                                  AND cs.semester = ce.semester
       WHERE ce.student_id = $1 AND cs.day_of_week = $2
       ORDER BY cs.start_time`,
      [studentId, dayOfWeek]
    );

    // Fetch classes for buddy
    const resBuddy = await pool.query(
      `SELECT c.course_name, cs.start_time, cs.end_time 
       FROM class_schedule cs
       JOIN courses c ON cs.course_id = c.course_id
       JOIN course_enrollment ce ON cs.course_id = ce.course_id 
                                  AND cs.section = ce.section 
                                  AND cs.semester = ce.semester
       WHERE ce.student_id = $1 AND cs.day_of_week = $2
       ORDER BY cs.start_time`,
      [buddyId, dayOfWeek]
    );

    return NextResponse.json({
      day: dayOfWeek,
      my_schedule: resMe.rows,
      buddy_schedule: resBuddy.rows
    });
  } catch (error) {
    console.error('Sync GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
