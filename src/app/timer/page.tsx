'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

type SessionMode = 'focus' | 'short_break' | 'long_break';

const MODES: Record<SessionMode, { label: string; desc: string; minutes: number; icon: string; color: string }> = {
  focus: { label: 'Focus Session', desc: 'minutes of Study', minutes: 25, icon: 'target', color: '#2663ed' },
  short_break: { label: 'Short Break', desc: 'minutes to recharge', minutes: 5, icon: 'coffee', color: '#047857' },
  long_break: { label: 'Long Break', desc: 'minutes of rest', minutes: 15, icon: 'self_improvement', color: '#6366f1' },
};

export default function TimerPage() {
  const [mode, setMode] = useState<SessionMode>('focus');
  const [timeLeft, setTimeLeft] = useState(MODES.focus.minutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [streak, setStreak] = useState(0);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Bug 1: Per-mode time persistence ref
  const modeTimesRef = useRef<Record<SessionMode, number>>({
    focus: MODES.focus.minutes * 60,
    short_break: MODES.short_break.minutes * 60,
    long_break: MODES.long_break.minutes * 60,
  });

  // Bug 5: Load from localStorage on mount (never restore isRunning)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('easytimetable_timer');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.mode && MODES[parsed.mode as SessionMode]) {
          setMode(parsed.mode as SessionMode);
        }
        if (parsed.modeTimes) {
          modeTimesRef.current = { ...modeTimesRef.current, ...parsed.modeTimes };
          const m = (parsed.mode as SessionMode) || 'focus';
          const t = modeTimesRef.current[m];
          setTimeLeft(t !== undefined ? t : MODES[m].minutes * 60);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Bug 5: Save to localStorage on every tick / mode change
  useEffect(() => {
    try {
      localStorage.setItem('easytimetable_timer', JSON.stringify({
        mode,
        modeTimes: modeTimesRef.current,
        isRunning: false, // always paused for safety
      }));
    } catch { /* ignore */ }
  }, [mode, timeLeft]);

  const totalSeconds = MODES[mode].minutes * 60;
  const progress = 1 - timeLeft / totalSeconds;

  // Bug 3: Derive completedCount from DB sessions on mount
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/study-sessions');
      const data = await res.json();
      if (data.today) setSessions(data.today);
      if (data.weekly) setStats(data.weekly);
      if (data.streak !== undefined) setStreak(data.streak);
      setCompletedCount(data.today?.filter((s: any) => s.session_type === 'focus').length || 0);
    } catch { /* ignore */ }
  }, []);

  // Fetch enrolled courses
  useEffect(() => {
    fetch('/api/students?roll=self')
      .then(r => r.json())
      .then(d => { if (d.courses) setCourses(d.courses); })
      .catch(() => {});
    fetchData();
  }, [fetchData]);

  // Bug 1: switchMode saves current mode's time and restores target mode's time
  const switchMode = useCallback((newMode: SessionMode) => {
    setMode(newMode);
    const savedTime = modeTimesRef.current[newMode];
    setTimeLeft(savedTime !== undefined ? savedTime : MODES[newMode].minutes * 60);
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  // Bug 4: handleComplete wrapped in useCallback with proper deps
  const handleComplete = useCallback(async () => {
    // Play notification sound (browser built-in)
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1000;
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.3);
      }, 350);
    } catch { /* audio not available */ }

    // Save session to DB
    try {
      await fetch('/api/study-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_type: mode,
          duration_minutes: MODES[mode].minutes,
          course_id: selectedCourse?.course_id || null,
        }),
      });
      fetchData();
    } catch { /* ignore */ }

    // Auto-advance: focus -> short break, after 4 focus sessions -> long break
    if (mode === 'focus') {
      const newCount = completedCount + 1;
      setCompletedCount(newCount);
      if (newCount % 4 === 0) {
        switchMode('long_break');
      } else {
        switchMode('short_break');
      }
    } else {
      switchMode('focus');
    }
  }, [mode, completedCount, selectedCourse, fetchData, switchMode]);

  // Timer countdown — depends on handleComplete (bug 4)
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const next = prev - 1;
          // Bug 1: update per-mode time on every tick
          modeTimesRef.current[mode] = next;
          if (next <= 0) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            handleComplete();
            return 0;
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode, handleComplete]);

  const toggleTimer = () => {
    if (!isRunning) {
      startTimeRef.current = new Date();
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    const defTime = MODES[mode].minutes * 60;
    modeTimesRef.current[mode] = defTime;
    setTimeLeft(defTime);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // SVG circle progress
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const todayFocusMinutes = sessions
    .filter((s: any) => s.session_type === 'focus')
    .reduce((acc: number, s: any) => acc + s.duration_minutes, 0);
  const todayBreakMinutes = sessions
    .filter((s: any) => s.session_type !== 'focus')
    .reduce((acc: number, s: any) => acc + s.duration_minutes, 0);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Full-screen background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/study-bg.png)' }}
      >
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* Left Panel — Session Modes & Stats */}
      <div className="relative z-10 w-[280px] hidden md:flex flex-col p-5 overflow-y-auto">
        {/* Mode Tabs */}
        <div className="flex bg-black/40 backdrop-blur-md rounded-full p-1 mb-5 w-fit">
          <button
            className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
              mode !== 'focus' || true ? 'text-white' : ''
            } ${isRunning ? 'opacity-60 pointer-events-none' : ''}`}
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            Pomodoro
          </button>
          <button
            className="px-4 py-1.5 rounded-full text-[12px] font-semibold text-white/60 hover:text-white transition-colors"
            onClick={resetTimer}
          >
            Timer
          </button>
        </div>

        {/* Session Mode Cards */}
        <div className="space-y-2 mb-6">
          {(Object.entries(MODES) as [SessionMode, typeof MODES.focus][]).map(([key, m]) => (
            <div
              key={key}
              onClick={() => !isRunning && switchMode(key)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left cursor-pointer ${
                mode === key 
                  ? 'bg-white/20 backdrop-blur-md border border-white/30 shadow-lg' 
                  : 'bg-black/20 backdrop-blur-sm border border-white/10 hover:bg-white/10'
              } ${isRunning && mode !== key ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white`} style={{ backgroundColor: m.color }}>
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{m.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-white leading-tight">{m.label}</p>
                <p className="text-[11px] text-white/60">{m.minutes} {m.desc}</p>
              </div>
              <button 
                className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white/80 hover:bg-white/30 transition-colors shrink-0"
                onClick={(e) => { e.stopPropagation(); }}
                title="Edit duration"
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">settings</span>
              </button>
            </div>
          ))}
        </div>

        {/* Currently Studying */}
        <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-3 mb-4">
          <p className="text-[11px] text-white/50 font-semibold uppercase tracking-wider mb-2">Currently studying</p>
          {selectedCourse ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[14px]" aria-hidden="true">menu_book</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-white truncate">{selectedCourse.course_name}</p>
                <p className="text-[10px] text-white/50">{selectedCourse.course_code}</p>
              </div>
              <button onClick={() => setSelectedCourse(null)} className="text-white/40 hover:text-white/80">
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowCourseModal(true)}
              className="text-[12px] text-white/70 hover:text-white transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">add</span>
              Link a course
            </button>
          )}
        </div>

        {/* Today's Stats */}
        <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-3 mt-auto">
          <p className="text-[11px] text-white/50 font-semibold uppercase tracking-wider mb-3">Today&apos;s Pomodoro Stats</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Study</p>
              <p className="text-[22px] font-bold text-white">{todayFocusMinutes}<span className="text-[11px] text-white/40 ml-0.5">m</span></p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Break</p>
              <p className="text-[22px] font-bold text-white">{todayBreakMinutes}<span className="text-[11px] text-white/40 ml-0.5">m</span></p>
            </div>
          </div>
          {streak > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10 text-center">
              <p className="text-[11px] text-white/50">🔥 {streak} day streak</p>
            </div>
          )}
        </div>
      </div>

      {/* Center — Timer (Bug 2: responsive centering) */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-screen md:min-h-0 md:h-full">
        {/* Timer Card */}
        <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/15 p-8 md:p-12 shadow-2xl flex flex-col items-center min-w-[300px]">
          {/* Progress Ring — Bug 2: responsive SVG */}
          <div className="relative w-[260px] h-[260px] sm:w-[300px] sm:h-[300px]">
            <svg viewBox="0 0 300 300" className="transform -rotate-90 w-full h-full">
              {/* Background circle */}
              <circle
                cx="150" cy="150" r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="6"
              />
              {/* Progress circle */}
              <circle
                cx="150" cy="150" r={radius}
                fill="none"
                stroke={MODES[mode].color}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                style={{ filter: `drop-shadow(0 0 8px ${MODES[mode].color}60)` }}
              />
            </svg>
            {/* Time Display — Bug 2: absolute inset-0 for centering */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[64px] md:text-[72px] font-bold text-white tabular-nums tracking-tight font-heading leading-none">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </p>
              <p className="text-[13px] text-white/50 mt-2">{MODES[mode].label}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 mt-8">
            <button
              onClick={resetTimer}
              className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-colors"
              aria-label="Reset timer"
              title="Reset"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">replay</span>
            </button>

            <button
              onClick={toggleTimer}
              className="px-8 py-3 rounded-full font-bold text-[14px] flex items-center gap-2 transition-colors shadow-lg"
              style={{ 
                backgroundColor: MODES[mode].color,
                color: 'white',
                boxShadow: `0 4px 20px ${MODES[mode].color}40`
              }}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                {isRunning ? 'pause' : 'play_arrow'}
              </span>
              {isRunning ? 'Pause' : timeLeft < totalSeconds ? 'Resume' : 'Start Study'}
            </button>

            <button
              onClick={() => {
                if (isRunning) {
                  setIsRunning(false);
                  if (intervalRef.current) clearInterval(intervalRef.current);
                }
                const elapsed = totalSeconds - timeLeft;
                const elapsedMinutes = Math.ceil(elapsed / 60);
                if (elapsedMinutes > 0) {
                  // Save partial session
                  fetch('/api/study-sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      session_type: mode,
                      duration_minutes: elapsedMinutes,
                      course_id: selectedCourse?.course_id || null,
                    }),
                  }).then(() => fetchData());
                }
                resetTimer();
              }}
              className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-colors"
              aria-label="Skip session"
              title="Skip / Save partial"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">skip_next</span>
            </button>
          </div>

          {/* Session counter */}
          <div className="flex items-center gap-2 mt-5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i < (completedCount % 4) ? 'bg-white' : 'bg-white/20'
                }`}
              />
            ))}
            <span className="text-[11px] text-white/40 ml-1">#{completedCount + 1}</span>
          </div>
        </div>

        {/* Back button */}
        <Link
          href="/"
          className="mt-6 flex items-center gap-1.5 text-white/60 hover:text-white text-[13px] font-medium transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>
          Back to Dashboard
        </Link>
      </div>

      {/* Mobile bottom stats */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md border-t border-white/10 px-4 py-3 z-20 flex justify-around">
        <div className="text-center">
          <p className="text-[10px] text-white/40 uppercase">Focus</p>
          <p className="text-[16px] font-bold text-white">{todayFocusMinutes}m</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-white/40 uppercase">Break</p>
          <p className="text-[16px] font-bold text-white">{todayBreakMinutes}m</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-white/40 uppercase">Sessions</p>
          <p className="text-[16px] font-bold text-white">{completedCount}</p>
        </div>
        {streak > 0 && (
          <div className="text-center">
            <p className="text-[10px] text-white/40 uppercase">Streak</p>
            <p className="text-[16px] font-bold text-white">🔥 {streak}</p>
          </div>
        )}
      </div>

      {/* Course Link Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ overscrollBehavior: 'contain' }} role="dialog" aria-modal="true" aria-label="Link course" onClick={() => setShowCourseModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-border p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[20px]" aria-hidden="true">menu_book</span>
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-text-dark font-heading">Link to a Course</h3>
                <p className="text-[12px] text-text-muted">Connect this session to keep your stats organized by subject.</p>
              </div>
              <button onClick={() => setShowCourseModal(false)} className="ml-auto text-text-muted hover:text-text-dark" aria-label="Close">
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>

            {courses.length === 0 ? (
              <div className="bg-orange-light/50 border border-orange/20 rounded-xl p-4 flex items-center gap-3">
                <p className="text-[13px] text-text-slate flex-1">No courses found for your profile.</p>
                <button
                  onClick={() => setShowCourseModal(false)}
                  className="px-4 py-2 rounded-lg border border-border text-[13px] font-semibold text-text-dark hover:bg-bg-slate transition-colors whitespace-nowrap"
                >
                  Start without course
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {courses.map((c: any) => (
                  <button
                    key={c.course_id}
                    onClick={() => {
                      setSelectedCourse(c);
                      setShowCourseModal(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-bg-slate hover:border-primary/30 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary-10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">menu_book</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-text-dark">{c.course_name}</p>
                      <p className="text-[11px] text-text-muted">{c.course_code}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
