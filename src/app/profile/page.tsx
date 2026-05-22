'use client';

import React, { useState, useEffect } from 'react';
import { updateProfile } from './actions';
import { TopAppBar, BottomNav, Sidebar } from '../components/layout/Navigation';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; roll: string; program?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = document.cookie.split('; ').find(c => c.startsWith('user_info='));
      if (raw) {
        const val = decodeURIComponent(raw.split('=').slice(1).join('='));
        setUser(JSON.parse(val));
      } else {
        router.push('/login');
      }
    } catch {
      router.push('/login');
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateProfile(formData);

    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      setSuccess(result.success);
      // Refresh the page or update state to reflect changes in layout
      const newName = formData.get('name') as string;
      setUser(prev => prev ? { ...prev, name: newName } : null);
      
      // Force a router refresh to update server components that might use cookies
      router.refresh();
      
      // Clear password fields
      const form = e.target as HTMLFormElement;
      const currentPassword = form.elements.namedItem('currentPassword') as HTMLInputElement;
      const newPassword = form.elements.namedItem('newPassword') as HTMLInputElement;
      if (currentPassword) currentPassword.value = '';
      if (newPassword) newPassword.value = '';
    }

    setLoading(false);
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-bg-slate text-text-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopAppBar />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-xl mx-auto">
            <h1 className="text-2xl font-bold font-heading mb-6 text-text-dark">Edit Profile</h1>
            
            <div className="bg-bg-white rounded-2xl shadow-sm border border-border p-6 md:p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-full bg-primary-10 flex items-center justify-center text-primary font-bold text-2xl">
                  {user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-dark">{user.name}</h2>
                  <p className="text-text-muted">{user.roll}</p>
                  {user.program && <p className="text-xs text-text-muted mt-1">{user.program}</p>}
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red/10 border border-red/20 text-red text-sm font-medium">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 text-sm font-medium">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-text-dark mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    defaultValue={user.name}
                    required
                    className="w-full px-4 py-3 bg-bg-slate border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-text-dark"
                  />
                </div>

                <div className="pt-4 border-t border-border">
                  <h3 className="text-md font-bold text-text-dark mb-4">Change Password (Optional)</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-text-dark mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        id="currentPassword"
                        name="currentPassword"
                        className="w-full px-4 py-3 bg-bg-slate border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-text-dark"
                      />
                    </div>

                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-text-dark mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        id="newPassword"
                        name="newPassword"
                        minLength={6}
                        className="w-full px-4 py-3 bg-bg-slate border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-text-dark"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-70 flex justify-center items-center"
                  >
                    {loading ? (
                      <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
        
        <BottomNav />
      </div>
    </div>
  );
}
