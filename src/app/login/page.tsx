'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { loginWithEmail } from './actions';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const formData = new FormData(e.currentTarget);
    const result = await loginWithEmail(formData);
    
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
          <span className="material-symbols-outlined text-white text-[28px]">school</span>
        </div>
        
        <h1 className="font-heading text-[26px] font-extrabold text-text-dark mb-1">EasyTimetable</h1>
        <p className="text-text-muted text-[13px] mb-7">Sign in with your academic email</p>

        {error && (
          <div className="mb-5 p-3 bg-red-light text-red rounded-lg text-[13px] border border-red/20 text-left">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
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
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary-hover transition-all shadow-sm disabled:opacity-70 flex justify-center items-center text-[14px]"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-[13px] text-text-subdued">
          Don't have an account?{' '}
          <Link href="/signup" className="text-primary font-semibold hover:underline">
            Sign Up
          </Link>
        </div>
        
        <p className="mt-4 text-[11px] text-text-subdued border-t border-border pt-4">
          Demo: <strong className="text-text-muted">p240529@pwr.nu.edu.pk</strong>
        </p>
      </div>
    </div>
  );
}
