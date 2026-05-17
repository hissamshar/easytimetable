'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { sendOTP, verifyOTPAndCreateUser } from './actions';

export default function SignupPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const enteredEmail = formData.get('email') as string;
    
    const result = await sendOTP(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setEmail(enteredEmail);
      setStep(2);
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const otp = formData.get('otp') as string;

    const result = await verifyOTPAndCreateUser(email, otp);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-sm mx-auto px-4">
      <div className="bg-bg-white w-full rounded-2xl shadow-lg border border-border p-8 text-center">
        {/* Logo */}
        <div className="w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-md">
          <span className="material-symbols-outlined text-white text-[28px]">
            {step === 1 ? 'person_add' : 'mark_email_read'}
          </span>
        </div>
        
        <h1 className="font-heading text-[26px] font-extrabold text-text-dark mb-1">
          {step === 1 ? 'Create Account' : 'Verify Email'}
        </h1>
        <p className="text-text-muted text-[13px] mb-7">
          {step === 1 
            ? 'Join EasyTimetable using your NU email' 
            : `We sent a code to ${email}`}
        </p>

        {error && (
          <div className="mb-5 p-3 bg-red-light text-red rounded-lg text-[13px] border border-red/20 text-left">
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSendOTP} className="space-y-4 text-left">
            <div>
              <label htmlFor="name" className="block text-[12px] font-semibold text-text-slate mb-1.5 ml-0.5">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="e.g. Hisam Shar"
                required
                className="w-full bg-bg-white border border-border rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder-text-subdued focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-[12px] font-semibold text-text-slate mb-1.5 ml-0.5">Academic Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="e.g. p240529@pwr.nu.edu.pk"
                required
                className="w-full bg-bg-white border border-border rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder-text-subdued focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[12px] font-semibold text-text-slate mb-1.5 ml-0.5">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-bg-white border border-border rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder-text-subdued focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label htmlFor="program" className="block text-[12px] font-semibold text-text-slate mb-1.5 ml-0.5">Program</label>
              <select
                id="program"
                name="program"
                required
                className="w-full bg-bg-white border border-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none"
              >
                <option value="BS(CS)">BS(CS) - Computer Science</option>
                <option value="BS(SE)">BS(SE) - Software Engineering</option>
                <option value="BS(AI)">BS(AI) - Artificial Intelligence</option>
                <option value="BS(DS)">BS(DS) - Data Science</option>
                <option value="BS(CYS)">BS(CYS) - Cyber Security</option>
              </select>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary-hover transition-all shadow-sm disabled:opacity-70 flex justify-center items-center text-[14px] mt-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                'Continue'
              )}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="space-y-4 text-left">
            <div>
              <label className="block text-[12px] font-semibold text-text-slate mb-3 text-center">Enter the 6-digit code</label>
              <div className="flex gap-2 justify-center mb-6">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    required
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!/^[0-9]$/.test(value)) {
                        e.target.value = '';
                        return;
                      }
                      if (value !== '' && index < 5) {
                        const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
                        if (nextInput) {
                          nextInput.focus();
                          nextInput.select();
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace') {
                        const target = e.target as HTMLInputElement;
                        if (target.value === '' && index > 0) {
                          const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement;
                          if (prevInput) {
                            prevInput.focus();
                            prevInput.select();
                          }
                        }
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasteData = e.clipboardData.getData('text/plain').slice(0, 6).replace(/[^0-9]/g, '');
                      if (pasteData) {
                        pasteData.split('').forEach((char, i) => {
                          const input = document.getElementById(`otp-${i}`) as HTMLInputElement;
                          if (input) {
                            input.value = char;
                            if (i === pasteData.length - 1 && i < 5) {
                              const next = document.getElementById(`otp-${i + 1}`) as HTMLInputElement;
                              if (next) next.focus();
                            }
                          }
                        });
                      }
                    }}
                    className="w-11 h-12 bg-bg-slate border border-border rounded-xl text-center text-[20px] font-bold text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary focus:bg-bg-white transition-all shadow-sm"
                  />
                ))}
              </div>
              <input type="hidden" name="otp" id="hidden-otp" />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              onClick={() => {
                const otpValues = [0, 1, 2, 3, 4, 5].map(i => (document.getElementById(`otp-${i}`) as HTMLInputElement)?.value || '').join('');
                (document.getElementById('hidden-otp') as HTMLInputElement).value = otpValues;
              }}
              className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary-hover transition-all shadow-sm disabled:opacity-70 flex justify-center items-center text-[14px] mt-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                'Verify & Create Account'
              )}
            </button>

            <button
              type="button"
              onClick={() => { setStep(1); setError(''); }}
              disabled={loading}
              className="w-full text-[13px] text-text-muted hover:text-text-dark transition-colors text-center"
            >
              Back to signup
            </button>
          </form>
        )}

        {step === 1 && (
          <div className="mt-6 text-[13px] text-text-subdued">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
