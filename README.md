# 🗓️ EasyTimetable

> A smart, real-time university timetable management system powered by Next.js, PostgreSQL, and Groq AI.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue?logo=postgresql)](https://www.postgresql.org/)
[![Groq](https://img.shields.io/badge/Groq-AI-orange)](https://groq.com/)
[![Python](https://img.shields.io/badge/Python-Worker-yellow?logo=python)](https://python.org/)

---

## 👥 Group Information

**Group Number:** 5

| Name | Roll Number |
|------|-------------|
| Hisam Mehboob | 24P-0529 |
| Munesh Kumar | 24P-0635 |
| Sheikh Saif Ali | 24P-0592 |

---

## 📌 Project Title & Description

**EasyTimetable** — A full-stack university academic portal that allows students to look up their class schedules, view exam datesheets, check the academic calendar, find study buddies, and receive real-time AI-processed announcements about class changes and cancellations.

The system features an automated background worker that reads emails sent by university administrators, uses **Groq AI (LLaMA 3)** to parse plain-text or PDF attachments into structured data, and stores the results in a PostgreSQL database. Students get instant updates without any manual admin entry.

---

## 🔗 GitHub Repository

**[https://github.com/hissamshar/easytimetable](https://github.com/hissamshar/easytimetable)**

---

## ✨ Features

- **Roll number login** — students sign in with their roll number and see their personalized dashboard
- **Timetable view** — weekly class schedule with room, teacher, and time per section
- **Exam datesheet** — upcoming midterms and finals with date, time, and room
- **Academic calendar** — monthly calendar with exam periods and key events
- **Live updates feed** — AI-processed real-time announcements (cancellations, room changes, alerts)
- **Study Buddies** — connect with classmates studying the same courses
- **Analytics** — personal academic progress and attendance stats
- **Groq AI worker** — background Python service reads admin emails, extracts timetable/datesheet PDFs, and auto-populates the database

---

## 🛠️ Technologies Used

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16 (App Router) | UI, routing, server components |
| Styling | Tailwind CSS v4 | Utility-first responsive styling |
| Language | TypeScript | Type-safe frontend and API code |
| Database | PostgreSQL (via `pg`) | Core data storage and querying |
| Auth | Cookie-based sessions + bcryptjs | Secure student login |
| AI Processing | Groq API (llama-3.3-70b) | Parses plain text and PDFs into structured data |
| Email Reader | Python IMAP client (imaplib) | Fetches admin emails automatically |
| PDF Extraction | pdfplumber (Python) | Extracts timetable/datesheet rows from PDF attachments |
| Worker Runtime | Python 3 + python-dotenv | Background cron job orchestrator |
| Deployment (Web) | Railway / Vercel | Frontend and web server hosting |
| Deployment (Worker) | Railway Cron Job | Scheduled Python worker (every 30 min) |
| Version Control | Git + GitHub | Collaborative development |

---

## 📁 Project Structure

```
easytimetable/
├── src/
│   ├── lib/
│   │   └── db.ts                    # PostgreSQL pool connection
│   ├── middleware.ts                 # Auth guard (redirects unauthenticated users)
│   └── app/
│       ├── layout.tsx               # Root layout with sidebar + nav
│       ├── page.tsx                 # Dashboard (today's schedule, exams, updates)
│       ├── login/                   # Login page
│       ├── signup/                  # Signup page
│       ├── timetable/               # Full weekly timetable view
│       ├── exams/                   # Exam datesheet
│       ├── calendar/                # Academic calendar
│       ├── updates/                 # Live updates feed
│       ├── analytics/               # Student analytics
│       ├── buddies/                 # Study buddies feature
│       ├── profile/                 # Student profile
│       ├── search/                  # Global search
│       ├── timer/                   # Study timer
│       ├── api/                     # Next.js API routes
│       │   ├── students/            # Auth (login/signup)
│       │   ├── exams/               # Exam data endpoints
│       │   ├── updates/             # Live updates endpoints
│       │   ├── calendar/            # Calendar endpoints
│       │   ├── connections/         # Study buddy connections
│       │   ├── messages/            # Buddy messaging
│       │   ├── study-sessions/      # Study session tracking
│       │   ├── goals/               # Academic goals
│       │   ├── deadlines/           # Deadline reminders
│       │   └── logout/              # Session logout
│       └── components/
│           ├── layout/Navigation.tsx # Sidebar, TopAppBar, BottomNav
│           └── ui/                  # Reusable UI components (Card, Badge, etc.)
├── worker/                          # Python background worker
│   ├── main.py                      # Orchestrator (run as cron job)
│   ├── imap_client.py               # Fetches emails via IMAP
│   ├── pdf_extractor.py             # Extracts timetable/datesheet from PDFs
│   ├── groq_parser.py               # Groq AI text parsing
│   ├── db_client.py                 # DB writes for worker
│   └── requirements.txt            # Python dependencies
├── migrations/                      # SQL migration files
│   ├── 001_create_live_updates.sql
│   ├── 002_fix_live_updates.sql
│   ├── 003_create_tables.sql
│   ├── 004_analytics_features.sql
│   ├── 005_study_buddies_features.sql
│   └── 006_create_study_sessions.sql
├── seed.sql                         # Sample data for local development
├── generate_seed.py                 # Script to generate seed data
├── package.json                     # Node.js dependencies
├── next.config.ts                   # Next.js configuration
└── Procfile                         # Deployment process definition
```

---

## ⚙️ Installation & Running the Application

### Prerequisites

- **Node.js** v18+ and **npm**
- **Python** 3.10+
- **PostgreSQL** database (local or hosted, e.g. Neon, Supabase, Railway)

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/hissamshar/easytimetable.git
cd easytimetable
```

---

### Step 2 — Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# PostgreSQL connection string
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

# Required for the Python worker only (optional for frontend-only setup)
GMAIL_USER=your_gmail@gmail.com
GMAIL_PASS=your_app_password
GROQ_API_KEY=your_groq_api_key
```

> **Note:** For a quick local test, use a free PostgreSQL instance from [Neon](https://neon.tech) or [Supabase](https://supabase.com) and paste the connection string above.

---

### Step 3 — Set Up the Database

Run the migrations in order against your PostgreSQL database:

```bash
psql $DATABASE_URL -f migrations/001_create_live_updates.sql
psql $DATABASE_URL -f migrations/002_fix_live_updates.sql
psql $DATABASE_URL -f migrations/003_create_tables.sql
psql $DATABASE_URL -f migrations/004_analytics_features.sql
psql $DATABASE_URL -f migrations/005_study_buddies_features.sql
psql $DATABASE_URL -f migrations/006_create_study_sessions.sql
```

To load sample data for testing:

```bash
psql $DATABASE_URL -f seed.sql
```

---

### Step 4 — Install Frontend Dependencies

```bash
npm install
```

---

### Step 5 — Run the Frontend (Development)

```bash
npm run dev
```

The app will be available at **[http://localhost:3000](http://localhost:3000)**

---

### Step 6 — (Optional) Run the Python Worker

The worker reads emails and auto-populates timetable/exam data. To run it locally:

```bash
cd worker
pip install -r requirements.txt

# Single run
python main.py

# Dry run (no DB writes — for testing)
python main.py --dry-run
```

> The worker requires `GMAIL_USER`, `GMAIL_PASS`, `GROQ_API_KEY`, and `DATABASE_URL` to be set in the environment (or in a `.env` file inside the `worker/` directory).

---

## 🗄️ Database Schema Overview

| Table | Description |
|-------|-------------|
| `students` | Student accounts (name, roll number, section, semester) |
| `courses` | Course catalogue (code, name, credit hours) |
| `course_enrollment` | Links students to their enrolled courses + section |
| `class_schedule` | Weekly timetable (day, time, room, faculty per section/course) |
| `exam_schedule` | Midterm/final exam dates, times, and rooms |
| `live_updates` | AI-processed announcements and class change alerts |
| `faculty` | Faculty/teacher information |
| `rooms` | Room/lab information |
| `pipeline_log` | Worker deduplication log (tracks processed emails) |

---
