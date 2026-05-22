'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

function useAuth() {
  const [user, setUser] = React.useState<{ name: string; roll: string } | null>(null);
  React.useEffect(() => {
    try {
      const raw = document.cookie.split('; ').find(c => c.startsWith('user_info='));
      if (raw) {
        const val = decodeURIComponent(raw.split('=').slice(1).join('='));
        setUser(JSON.parse(val));
      }
    } catch { /* cookie is httpOnly or malformed, fallback */ }
  }, []);
  return user;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuth();
  
  if (pathname === '/login' || pathname === '/signup' || pathname === '/timer') return null;

  const navItems = [
    { href: '/', icon: 'dashboard', label: 'Dashboard' },
    { href: '/timer', icon: 'timer', label: 'Study Timer' },
    { href: '/timetable', icon: 'calendar_view_week', label: 'Timetable' },
    { href: '/exams', icon: 'assignment', label: 'Exams' },
    { href: '/calendar', icon: 'event', label: 'Calendar' },
    { href: '/updates', icon: 'campaign', label: 'Updates' },
    { href: '/analytics', icon: 'monitoring', label: 'Analytics' },
  ];

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
    : 'ST';

  return (
    <nav className="bg-sidebar-bg text-white h-screen left-0 w-[68px] hidden md:flex flex-col items-center py-4 sticky top-0 z-40 shrink-0">
      {/* Logo */}
      <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-white text-[22px]" aria-hidden="true">school</span>
      </div>

      {/* Nav Icons */}
      <div className="flex-1 flex flex-col items-center gap-1 w-full px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              aria-label={item.label}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors duration-200 group relative ${
                isActive 
                  ? 'bg-sidebar-active text-sidebar-text-active' 
                  : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active'
              }`}
            >
              <span 
                className="material-symbols-outlined text-[22px]"
                aria-hidden="true"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              {/* Tooltip */}
              <span className="absolute left-full ml-3 px-2 py-1 bg-text-dark text-white text-[11px] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* User Avatar + Logout */}
      <div className="flex flex-col items-center gap-2 mt-auto pt-3 border-t border-white/10 w-full px-2">
        <Link href="/profile" className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white font-bold text-[11px] hover:opacity-80 transition-opacity" title={user?.name || 'Student'}>
          {initials}
        </Link>
        <button
          onClick={async () => {
            await fetch('/api/logout', { method: 'POST' });
            router.push('/login');
          }}
          aria-label="Logout"
          title="Logout"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sidebar-text hover:bg-sidebar-hover hover:text-red-400 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">logout</span>
        </button>
      </div>
    </nav>
  );
}

export function TopAppBar() {
  const pathname = usePathname();
  const user = useAuth();
  if (pathname === '/login' || pathname === '/signup' || pathname === '/timer') return null;

  const getPageTitle = () => {
    switch (pathname) {
      case '/': return 'Dashboard';
      case '/timetable': return 'Timetable';
      case '/exams': return 'Exams';
      case '/calendar': return 'Calendar';
      case '/updates': return 'Updates';
      default: return 'EasyTimetable';
    }
  };

  return (
    <header className="bg-bg-white border-b border-border sticky top-0 flex justify-between items-center w-full px-4 md:px-6 py-3 z-30">
      <div className="flex items-center gap-3">
        <div className="md:hidden w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-[18px]" aria-hidden="true">school</span>
        </div>
        <div>
          <h1 className="text-[16px] font-bold text-text-dark font-heading">{getPageTitle()}</h1>
        </div>
      </div>

      {/* Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px]" aria-hidden="true">search</span>
          <label htmlFor="global-search" className="sr-only">Search courses, rooms</label>
          <input 
            id="global-search"
            className="w-full bg-bg-slate border border-border rounded-lg py-2 pl-9 pr-3 text-[13px] text-text-primary placeholder-text-subdued focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary transition-colors" 
            placeholder="Search courses, rooms…" 
            type="text"
            name="search"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/updates" className="relative p-2 text-text-muted hover:bg-bg-slate transition-colors rounded-lg" aria-label="Notifications">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red rounded-full border-2 border-bg-white"></span>
        </Link>
        
        {/* Mobile Profile Link */}
        <Link href="/profile" className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-primary-10 text-primary font-bold text-[11px] ml-1">
          {user?.name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'ST'}
        </Link>

        {/* Desktop Profile Link */}
        <Link href="/profile" className="hidden md:flex items-center gap-2 ml-2 pl-3 border-l border-border hover:bg-bg-slate p-2 rounded-lg transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-primary-10 flex items-center justify-center text-primary font-bold text-[11px]">
            {user?.name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'ST'}
          </div>
          <div className="text-right">
            <p className="text-[12px] font-semibold text-text-dark leading-tight">{user?.name ? user.name.split(' ')[0] : 'Student'}</p>
            <p className="text-[10px] text-text-muted leading-tight">{user?.roll || ''}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  
  if (pathname === '/login' || pathname === '/signup' || pathname === '/timer') return null;

  const navItems = [
    { href: '/', icon: 'dashboard', label: 'Home' },
    { href: '/timer', icon: 'timer', label: 'Timer' },
    { href: '/timetable', icon: 'calendar_view_week', label: 'Schedule' },
    { href: '/exams', icon: 'assignment', label: 'Exams' },
    { href: '/analytics', icon: 'monitoring', label: 'Stats' },
  ];

  return (
    <nav className="bg-bg-white/95 backdrop-blur-md md:hidden border-t border-border fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]" style={{ touchAction: 'manipulation' }}>
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link 
            key={item.href} 
            href={item.href}
            aria-label={item.label}
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
              isActive 
                ? 'text-primary' 
                : 'text-text-muted'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
