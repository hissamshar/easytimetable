"""
db_client.py — Raw psycopg2 database client for the timetable worker.
No ORM, no query builder. All SQL is explicit.

Key design decisions:
- Connection opened per run (not at module level) to handle Neon cold starts.
- Retry logic with exponential backoff on connection failure.
- All inserts use UPSERT (ON CONFLICT DO UPDATE) to be idempotent.
- Faculty is stored as a name string in class_schedule (no numeric ID available from PDFs).
"""

import os
import time
import logging

import psycopg2
import psycopg2.extras

logger = logging.getLogger(__name__)


def get_connection(retries: int = 4) -> psycopg2.extensions.connection:
    """
    Open a psycopg2 connection to Neon with retry + exponential backoff.
    Neon free tier scales to zero after inactivity — the first connection
    after idle can fail; retrying after a short wait always succeeds.
    """
    url = os.environ["DATABASE_URL"]
    for attempt in range(retries):
        try:
            conn = psycopg2.connect(url)
            conn.autocommit = False
            logger.info("DB connection established (attempt %d)", attempt + 1)
            return conn
        except psycopg2.OperationalError as e:
            if attempt < retries - 1:
                wait = 2 ** attempt  # 1s, 2s, 4s …
                logger.warning("DB connect failed (attempt %d), retrying in %ds: %s", attempt + 1, wait, e)
                time.sleep(wait)
            else:
                logger.error("DB connect failed after %d attempts", retries)
                raise


# ---------------------------------------------------------------------------
# Lookup helpers
# ---------------------------------------------------------------------------

def get_course_id(cur, course_code: str) -> int | None:
    cur.execute(
        "SELECT course_id FROM courses WHERE course_code = %s LIMIT 1",
        (course_code,)
    )
    row = cur.fetchone()
    return row[0] if row else None


def get_room_id(cur, room_code: str) -> int | None:
    """Match on room_code or room_name — PDFs may use either."""
    cur.execute(
        "SELECT room_id FROM rooms WHERE room_code = %s OR room_name = %s LIMIT 1",
        (room_code, room_code)
    )
    row = cur.fetchone()
    return row[0] if row else None


def get_faculty_id_by_name(cur, faculty_name: str) -> str | None:
    """
    PDFs only have faculty names, not numeric IDs.
    Try an exact match first, then a partial (ILIKE) match.
    Returns the faculty_id string or None if not found.
    """
    if not faculty_name:
        return None
    cur.execute(
        "SELECT faculty_id FROM faculty WHERE name = %s LIMIT 1",
        (faculty_name,)
    )
    row = cur.fetchone()
    if row:
        return row[0]
    # Partial match — handles slight name variations
    cur.execute(
        "SELECT faculty_id FROM faculty WHERE name ILIKE %s LIMIT 1",
        (f"%{faculty_name.strip()}%",)
    )
    row = cur.fetchone()
    return row[0] if row else None


# ---------------------------------------------------------------------------
# pipeline_log
# ---------------------------------------------------------------------------

def is_already_processed(cur, gmail_message_id: str) -> bool:
    cur.execute(
        "SELECT 1 FROM pipeline_log WHERE gmail_message_id = %s",
        (gmail_message_id,)
    )
    return cur.fetchone() is not None


def log_processed(cur, gmail_message_id: str, status: str,
                  inserted_table: str | None = None,
                  error_message: str | None = None,
                  raw_text: str | None = None):
    cur.execute(
        """
        INSERT INTO pipeline_log (gmail_message_id, status, inserted_table, error_message, raw_text)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (gmail_message_id) DO UPDATE
            SET status = EXCLUDED.status,
                processed_at = CURRENT_TIMESTAMP,
                error_message = EXCLUDED.error_message
        """,
        (gmail_message_id, status, inserted_table, error_message, raw_text)
    )


# ---------------------------------------------------------------------------
# live_updates
# ---------------------------------------------------------------------------

def insert_live_update(cur, title: str, message: str, category: str = "general") -> int:
    """Returns the new update_id."""
    cur.execute(
        """
        INSERT INTO live_updates (title, message, category)
        VALUES (%s, %s, %s)
        RETURNING update_id
        """,
        (title, message, category)
    )
    return cur.fetchone()[0]


# ---------------------------------------------------------------------------
# class_schedule — UPSERT on (course_id, section, day_of_week, start_time)
# ---------------------------------------------------------------------------

def upsert_class_schedule(cur, data: dict) -> bool:
    """
    data keys: course_code, faculty_name, room_code, day_of_week,
               start_time, end_time, section, semester

    Returns True if a row was inserted/updated, False if course_code
    or room_code couldn't be resolved (logged as a warning).
    """
    course_id = get_course_id(cur, data["course_code"])
    if course_id is None:
        logger.warning("Skipping class_schedule row — unknown course_code: %s", data["course_code"])
        return False

    room_id = get_room_id(cur, data.get("room_code", "")) if data.get("room_code") else None
    faculty_id = get_faculty_id_by_name(cur, data.get("faculty_name", ""))

    cur.execute(
        """
        INSERT INTO class_schedule
            (course_id, faculty_id, room_id, day_of_week, start_time, end_time, section, semester)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (course_id, section, day_of_week, start_time) DO UPDATE
            SET faculty_id = EXCLUDED.faculty_id,
                room_id    = EXCLUDED.room_id,
                end_time   = EXCLUDED.end_time,
                semester   = EXCLUDED.semester
        """,
        (
            course_id,
            faculty_id,
            room_id,
            data["day_of_week"],
            data["start_time"],
            data["end_time"],
            data.get("section"),
            data.get("semester"),
        )
    )
    return True


# ---------------------------------------------------------------------------
# exam_schedule — INSERT, skip duplicates gracefully (no unique constraint
# due to existing duplicate data in Neon — use explicit duplicate check)
# ---------------------------------------------------------------------------

def insert_exam_schedule(cur, data: dict) -> bool:
    """
    data keys: course_code, exam_type, exam_date, start_time, end_time,
               room_code, section, semester

    Returns True if inserted, False if skipped.
    """
    course_id = get_course_id(cur, data["course_code"])
    if course_id is None:
        logger.warning("Skipping exam_schedule row — unknown course_code: %s", data["course_code"])
        return False

    room_id = get_room_id(cur, data.get("room_code", "")) if data.get("room_code") else None

    # Check for existing row to avoid duplicates (no unique constraint possible due to dirty data)
    cur.execute(
        """
        SELECT 1 FROM exam_schedule
        WHERE course_id = %s AND section = %s AND exam_type = %s AND exam_date = %s
        LIMIT 1
        """,
        (course_id, data.get("section"), data.get("exam_type"), data.get("exam_date"))
    )
    if cur.fetchone():
        logger.info("Skipping duplicate exam_schedule: %s %s %s", data["course_code"], data.get("exam_type"), data.get("exam_date"))
        return False

    cur.execute(
        """
        INSERT INTO exam_schedule
            (course_id, exam_type, exam_date, start_time, end_time, room_id, section, semester)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            course_id,
            data.get("exam_type"),
            data.get("exam_date"),
            data.get("start_time"),
            data.get("end_time"),
            room_id,
            data.get("section"),
            data.get("semester"),
        )
    )
    return True
