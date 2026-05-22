import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import pool from '@/lib/db';
import BuddiesHub from '../components/buddies/BuddiesHub';

export default async function BuddiesPage() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth');
  
  if (!authCookie) {
    redirect('/login');
  }

  const studentId = JSON.parse(authCookie.value).id;

  // Fetch connections (both accepted and pending)
  const connectionsRes = await pool.query(
    `SELECT c.connection_id, c.requester_id, c.receiver_id, c.status,
      CASE WHEN c.requester_id = $1 THEN rec.name ELSE req.name END as buddy_name,
      CASE WHEN c.requester_id = $1 THEN rec.roll_number ELSE req.roll_number END as buddy_roll,
      CASE WHEN c.requester_id = $1 THEN c.receiver_id ELSE c.requester_id END as buddy_id
     FROM student_connections c
     JOIN students req ON c.requester_id = req.student_id
     JOIN students rec ON c.receiver_id = rec.student_id
     WHERE (c.requester_id = $1 OR c.receiver_id = $1) 
       AND c.status IN ('accepted', 'pending')`,
    [studentId]
  );

  return (
    <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-140px)] flex flex-col">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold font-heading text-text-dark">Study Buddies</h1>
        <p className="text-sm md:text-base text-text-muted">Chat, nudge, and collaborate with your study partners.</p>
      </div>
      
      <div className="flex-1 bg-bg-white border border-border rounded-xl md:rounded-2xl overflow-hidden shadow-sm flex min-h-0 relative">
        <BuddiesHub 
          connections={connectionsRes.rows} 
          currentUserId={studentId}
        />
      </div>
    </div>
  );
}
