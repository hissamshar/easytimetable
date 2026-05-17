'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

export function RollLookup({ targetPage }: { targetPage: 'timetable' | 'exams' }) {
  const [roll, setRoll] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roll.trim()) {
      router.push(`/${targetPage}?roll=${encodeURIComponent(roll.trim().toUpperCase())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full">
      <Input
        type="text"
        placeholder="Enter Roll No (e.g. 23i-0001)"
        value={roll}
        onChange={(e) => setRoll(e.target.value)}
        className="flex-1 font-label-md"
        required
        pattern="^\d{2}[A-Za-z]-\d{4}$"
        title="Format: 23I-0001 or 23i-0001"
      />
      <Button type="submit" variant="primary" className="whitespace-nowrap">
        <span className="material-symbols-outlined mr-2 text-[18px]" aria-hidden="true">search</span>
        Lookup {targetPage === 'timetable' ? 'Schedule' : 'Exams'}
      </Button>
    </form>
  );
}
