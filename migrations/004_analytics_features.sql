-- 1. Deadlines / Milestones
CREATE TABLE IF NOT EXISTS public.student_deadlines (
    deadline_id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES public.students(student_id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES public.courses(course_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    due_date TIMESTAMP NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Study Goals
CREATE TABLE IF NOT EXISTS public.study_goals (
    goal_id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES public.students(student_id) ON DELETE CASCADE,
    target_hours INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_met BOOLEAN DEFAULT FALSE
);

-- 3. Connections (Study Buddies)
CREATE TABLE IF NOT EXISTS public.student_connections (
    connection_id SERIAL PRIMARY KEY,
    requester_id INTEGER REFERENCES public.students(student_id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES public.students(student_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(requester_id, receiver_id)
);
