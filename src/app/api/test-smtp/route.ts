import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

export async function GET() {
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  
  if (!user || !pass) {
    return NextResponse.json({ success: false, error: 'SMTP credentials missing from environment', userExists: !!user, passExists: !!pass });
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: user.replace(/['"]/g, '').trim(),
      pass: pass.replace(/['"]/g, '').trim(),
    },
  });

  try {
    await transporter.verify();
    return NextResponse.json({ success: true, message: 'SMTP connection verified successfully!', user: user.replace(/['"]/g, '').trim() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || String(error) });
  }
}
