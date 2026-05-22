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
    const { roll_number } = body;

    if (!roll_number) {
      return NextResponse.json({ error: 'roll_number is required' }, { status: 400 });
    }

    // Look up the student by roll number
    const studentRes = await pool.query(
      `SELECT student_id FROM students WHERE roll_number = $1`,
      [roll_number.trim()]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ error: 'Student with this roll number not found' }, { status: 404 });
    }

    const receiver_id = studentRes.rows[0].student_id;

    if (studentId === receiver_id) {
      return NextResponse.json({ error: 'Cannot connect with yourself' }, { status: 400 });
    }

    // Insert the connection. 
    // We check if it already exists in either direction (A->B or B->A).
    const existingRes = await pool.query(
      `SELECT * FROM student_connections 
       WHERE (requester_id = $1 AND receiver_id = $2) 
          OR (requester_id = $2 AND receiver_id = $1)`,
      [studentId, receiver_id]
    );

    if (existingRes.rows.length > 0) {
      return NextResponse.json({ error: 'Connection or request already exists' }, { status: 400 });
    }

    const res = await pool.query(
      `INSERT INTO student_connections (requester_id, receiver_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [studentId, receiver_id]
    );

    return NextResponse.json({ connection: res.rows[0] }, { status: 201 });
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

    if (!connection_id || !['accepted', 'declined', 'blocked'].includes(status)) {
      return NextResponse.json({ error: 'Valid connection_id and status required' }, { status: 400 });
    }

    // Only receiver can accept/decline, but either party can block
    let whereClause = `connection_id = $2 AND receiver_id = $3`;
    if (status === 'blocked') {
      whereClause = `connection_id = $2 AND (receiver_id = $3 OR requester_id = $3)`;
    }

    const res = await pool.query(
      `UPDATE student_connections 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE ${whereClause}
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

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth');
  if (!authCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const studentId = JSON.parse(authCookie.value).id;
    const { searchParams } = new URL(request.url);
    const connection_id = searchParams.get('connection_id');

    if (!connection_id) {
      return NextResponse.json({ error: 'connection_id required' }, { status: 400 });
    }

    const res = await pool.query(
      `DELETE FROM student_connections 
       WHERE connection_id = $1 AND (requester_id = $2 OR receiver_id = $2)
       RETURNING *`,
      [connection_id, studentId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Connection not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: res.rows[0] });
  } catch (error) {
    console.error('Connections DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
