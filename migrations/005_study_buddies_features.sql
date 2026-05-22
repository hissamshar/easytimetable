-- 1. Chat Messages & Nudges
CREATE TABLE IF NOT EXISTS public.messages (
    message_id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES public.students(student_id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES public.students(student_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text' or 'nudge' (for emojis/pings)
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Shared Study Goals
CREATE TABLE IF NOT EXISTS public.shared_study_goals (
    shared_goal_id SERIAL PRIMARY KEY,
    creator_id INTEGER REFERENCES public.students(student_id) ON DELETE CASCADE,
    partner_id INTEGER REFERENCES public.students(student_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    target_hours INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_met BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Live Study Status
CREATE TABLE IF NOT EXISTS public.active_study_sessions (
    session_id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES public.students(student_id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES public.courses(course_id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_duration_minutes INTEGER NOT NULL,
    UNIQUE(student_id)
);
