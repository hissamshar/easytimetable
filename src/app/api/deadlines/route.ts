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
      `SELECT d.*, c.course_code 
       FROM student_deadlines d
       LEFT JOIN courses c ON d.course_id = c.course_id
       WHERE d.student_id = $1 
       ORDER BY d.is_completed ASC, d.due_date ASC`,
      [studentId]
    );
    return NextResponse.json({ deadlines: res.rows });
  } catch (error) {
    console.error('Deadlines GET error:', error);
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
    const { title, due_date, course_id } = body;

    if (!title || !due_date) {
      return NextResponse.json({ error: 'title and due_date are required' }, { status: 400 });
    }

    const res = await pool.query(
      `INSERT INTO student_deadlines (student_id, course_id, title, due_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [studentId, course_id || null, title, due_date]
    );

    return NextResponse.json({ deadline: res.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Deadlines POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth');
  if (!authCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const studentId = JSON.parse(authCookie.value).id;
    const body = await request.json();
    const { deadline_id, is_completed } = body;

    if (!deadline_id || typeof is_completed !== 'boolean') {
      return NextResponse.json({ error: 'deadline_id and is_completed are required' }, { status: 400 });
    }

    const res = await pool.query(
      `UPDATE student_deadlines 
       SET is_completed = $1 
       WHERE deadline_id = $2 AND student_id = $3
       RETURNING *`,
      [is_completed, deadline_id, studentId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Deadline not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ deadline: res.rows[0] });
  } catch (error) {
    console.error('Deadlines PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
