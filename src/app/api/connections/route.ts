import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';

export async function GET() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth');
  if (!authCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const studentId = JSON.parse(authCookie.value).id;
    // Get connections where user is requester or receiver
    const res = await pool.query(
      `SELECT c.*, 
        req.name as requester_name, req.roll_number as requester_roll,
        rec.name as receiver_name, rec.roll_number as receiver_roll
       FROM student_connections c
       JOIN students req ON c.requester_id = req.student_id
       JOIN students rec ON c.receiver_id = rec.student_id
       WHERE c.requester_id = $1 OR c.receiver_id = $1
       ORDER BY c.created_at DESC`,
      [studentId]
    );
    return NextResponse.json({ connections: res.rows });
  } catch (error) {
    console.error('Connections GET error:', error);
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
    const { receiver_id } = body;

    if (!receiver_id) {
      return NextResponse.json({ error: 'receiver_id is required' }, { status: 400 });
    }

    if (studentId === receiver_id) {
      return NextResponse.json({ error: 'Cannot connect with yourself' }, { status: 400 });
    }

    const res = await pool.query(
      `INSERT INTO student_connections (requester_id, receiver_id)
       VALUES ($1, $2)
       ON CONFLICT (requester_id, receiver_id) DO NOTHING
       RETURNING *`,
      [studentId, receiver_id]
    );

    return NextResponse.json({ connection: res.rows[0] || null }, { status: 201 });
  } catch (error) {
    console.error('Connections POST error:', error);
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
    const { connection_id, status } = body;

    if (!connection_id || !['accepted', 'declined'].includes(status)) {
      return NextResponse.json({ error: 'Valid connection_id and status required' }, { status: 400 });
    }

    const res = await pool.query(
      `UPDATE student_connections 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE connection_id = $2 AND receiver_id = $3
       RETURNING *`,
      [status, connection_id, studentId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Connection not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ connection: res.rows[0] });
  } catch (error) {
    console.error('Connections PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
