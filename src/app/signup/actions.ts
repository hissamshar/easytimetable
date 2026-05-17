'use server'

import pool from '@/lib/db';
import nodemailer from 'nodemailer';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOTP(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const program = formData.get('program') as string;

  if (!name || !email || !program) {
    return { error: 'All fields are required' };
  }

  if (!email.toLowerCase().endsWith('@pwr.nu.edu.pk')) {
    return { error: 'Only @pwr.nu.edu.pk emails are allowed' };
  }

  const prefix = email.split('@')[0].toLowerCase();
  const letters = prefix.replace(/[^a-z]/g, '');
  const digits = prefix.replace(/[^0-9]/g, '');
  
  if (digits.length < 6 || letters.length === 0) {
    return { error: 'Invalid academic email format. Example: p240529@pwr.nu.edu.pk' };
  }

  const batch = digits.substring(0, 2);
  const id = digits.substring(digits.length - 4);
  const letter = letters[0].toUpperCase();
  const rollNumber = `${batch}${letter}-${id}`;

  try {
    // Check if student already exists
    const existing = await pool.query('SELECT student_id FROM students WHERE UPPER(roll_number) = $1', [rollNumber]);
    if (existing.rows.length > 0) {
      return { error: 'An account with this roll number already exists.' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const studentData = { name, email, program, rollNumber, batch_year: parseInt('20' + batch), section: 'Unknown' };

    await pool.query(
      `INSERT INTO email_verifications (email, otp, expires_at, student_data) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (email) DO UPDATE 
       SET otp = EXCLUDED.otp, expires_at = EXCLUDED.expires_at, student_data = EXCLUDED.student_data`,
      [email, otp, expiresAt, studentData]
    );

    await transporter.sendMail({
      from: `"EasyTimetable" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2 style="color: #2663ed;">Welcome to EasyTimetable!</h2>
          <p>Hi ${name},</p>
          <p>Your verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1d4ed8; padding: 15px; background: #f0fdfa; border-radius: 8px; text-align: center; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 30px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    return { success: true, email };
  } catch (error) {
    console.error('Error sending OTP:', error);
    return { error: 'Failed to send verification email. Please check server SMTP configuration.' };
  }
}

export async function verifyOTPAndCreateUser(email: string, otp: string) {
  try {
    const res = await pool.query('SELECT * FROM email_verifications WHERE email = $1', [email]);
    if (res.rows.length === 0) {
      return { error: 'No verification request found for this email.' };
    }

    const verification = res.rows[0];

    if (verification.otp !== otp) {
      return { error: 'Invalid verification code.' };
    }

    if (new Date() > new Date(verification.expires_at)) {
      return { error: 'Verification code has expired. Please request a new one.' };
    }

    const data = verification.student_data;

    const insertRes = await pool.query(
      `INSERT INTO students (roll_number, name, program, batch_year, section) 
       VALUES ($1, $2, $3, $4, $5) RETURNING student_id`,
      [data.rollNumber, data.name, data.program, data.batch_year, data.section]
    );

    const studentId = insertRes.rows[0].student_id;

    // Clean up verification table
    await pool.query('DELETE FROM email_verifications WHERE email = $1', [email]);

    // Create session
    const sessionData = JSON.stringify({
      id: studentId,
      roll: data.rollNumber,
      name: data.name,
      program: data.program,
      batch: data.batch_year,
      section: data.section,
    });
    
    const cookieStore = await cookies();
    cookieStore.set('auth', sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });
    
    cookieStore.set('user_info', JSON.stringify({
      name: data.name,
      roll: data.rollNumber,
      program: data.program,
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

  } catch (error) {
    console.error('Verification error:', error);
    return { error: 'An error occurred while creating the account.' };
  }

  redirect('/');
}
