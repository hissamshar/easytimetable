import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const res = await pool.query('SELECT * FROM live_updates ORDER BY created_at DESC LIMIT 20');
    return NextResponse.json({ updates: res.rows });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
