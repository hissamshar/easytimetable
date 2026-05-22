-- Create study_sessions table for Timer and Analytics

CREATE TABLE IF NOT EXISTS public.study_sessions (
    session_id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES public.students(student_id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES public.courses(course_id) ON DELETE CASCADE,
    session_type VARCHAR(50) NOT NULL, -- 'focus', 'short_break', 'long_break'
    duration_minutes INTEGER NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
