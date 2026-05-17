import React from 'react';

type ExamCardProps = {
  courseName: string;
  courseCode: string;
  date: string;
  time: string;
  room: string;
  duration: string;
  type: string;
};

export function ExamCard({ courseName, courseCode, date, time, room, duration, type }: ExamCardProps) {
  const isFinal = type.toLowerCase().includes('final');
  const accentColor = isFinal ? 'border-error' : 'border-tertiary';
  
  return (
    <div className={`bg-surface-container rounded-lg border-l-4 ${accentColor} border-t border-r border-b border-outline-variant/20 p-5 flex flex-col h-full hover:bg-surface-variant transition-colors`}>
      <div className="flex justify-between items-start mb-3">
        <span className="font-label-sm text-outline px-2 py-1 bg-surface-variant rounded">{courseCode}</span>
        <span className={`font-label-sm font-bold uppercase tracking-wider ${isFinal ? 'text-error' : 'text-tertiary'}`}>
          {type}
        </span>
      </div>
      
      <h3 className="font-headline-md text-[18px] text-on-surface mb-4 leading-tight">{courseName}</h3>
      
      <div className="mt-auto space-y-2">
        <div className="flex items-center text-on-surface-variant font-label-md">
          <span className="material-symbols-outlined mr-2 text-[16px]" aria-hidden="true">calendar_today</span>
          {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
        <div className="flex items-center text-on-surface-variant font-label-md">
          <span className="material-symbols-outlined mr-2 text-[16px]" aria-hidden="true">schedule</span>
          {time} <span className="ml-1 opacity-50">({duration})</span>
        </div>
        <div className="flex items-center text-on-surface-variant font-label-md">
          <span className="material-symbols-outlined mr-2 text-[16px]" aria-hidden="true">location_on</span>
          {room || 'TBD'}
        </div>
      </div>
    </div>
  );
}
