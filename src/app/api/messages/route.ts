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

    if (!buddyId) {
      return NextResponse.json({ error: 'buddy_id is required' }, { status: 400 });
    }

    // Mark unread messages as read
    await pool.query(
      `UPDATE messages 
       SET is_read = TRUE 
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
      [buddyId, studentId]
    );

    const res = await pool.query(
      `SELECT * FROM messages 
       WHERE (sender_id = $1 AND receiver_id = $2) 
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [studentId, buddyId]
    );
    return NextResponse.json({ messages: res.rows });
  } catch (error) {
    console.error('Messages GET error:', error);
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
    const { receiver_id, content, message_type = 'text' } = body;

    if (!receiver_id || !content) {
      return NextResponse.json({ error: 'receiver_id and content are required' }, { status: 400 });
    }

    // Verify they are connected (accepted status)
    const connCheck = await pool.query(
      `SELECT status FROM student_connections 
       WHERE ((requester_id = $1 AND receiver_id = $2) 
          OR (requester_id = $2 AND receiver_id = $1))
         AND status = 'accepted'`,
      [studentId, receiver_id]
    );

    if (connCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Must be an accepted connection to send messages' }, { status: 403 });
    }

    const res = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content, message_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [studentId, receiver_id, content, message_type]
    );

    return NextResponse.json({ message: res.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Messages POST error:', error);
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
    const buddyId = searchParams.get('buddy_id');

    if (!buddyId) {
      return NextResponse.json({ error: 'buddy_id is required' }, { status: 400 });
    }

    await pool.query(
      `DELETE FROM messages 
       WHERE (sender_id = $1 AND receiver_id = $2) 
          OR (sender_id = $2 AND receiver_id = $1)`,
      [studentId, buddyId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Messages DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
