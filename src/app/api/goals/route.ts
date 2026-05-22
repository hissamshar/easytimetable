import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';

export async function GET() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth');
  if (!authCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const studentId = JSON.parse(authCookie.value).id;
    const res = await pool.query(
      `SELECT * FROM study_goals
       WHERE student_id = $1 
       ORDER BY start_date DESC`,
      [studentId]
    );
    return NextResponse.json({ goals: res.rows });
  } catch (error) {
    console.error('Goals GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth');
  if (!authCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const studentId = JSON.parse(authCookie.value).id;
    const body = await request.json();
    const { target_hours, start_date, end_date } = body;

    if (!target_hours || !start_date || !end_date) {
      return NextResponse.json({ error: 'target_hours, start_date, and end_date are required' }, { status: 400 });
    }

    const res = await pool.query(
      `INSERT INTO study_goals (student_id, target_hours, start_date, end_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [studentId, target_hours, start_date, end_date]
    );

    return NextResponse.json({ goal: res.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Goals POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
