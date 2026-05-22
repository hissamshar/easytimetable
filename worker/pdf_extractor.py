"""
pdf_extractor.py — Extracts structured schedule data from university PDFs.

Detects PDF type automatically:
  - "timetable"   → returns list of class_schedule rows
  - "datesheet"   → returns list of exam_schedule rows

Returns:
  {
    "type": "timetable" | "datesheet" | "unknown",
    "rows": [ ... ]
  }

Row format for timetable:
  { course_code, faculty_name, room_code, day_of_week, start_time, end_time, section, semester }

Row format for datesheet:
  { course_code, exam_type, exam_date, start_time, end_time, room_code, section, semester }
"""

import io
import logging
import re

import pdfplumber

logger = logging.getLogger(__name__)

# Days of week accepted from PDFs
DAYS = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
        "Mon", "Tue", "Wed", "Thu", "Fri"}

# Normalise short day names
DAY_MAP = {
    "Mon": "Mon", "Monday": "Mon",
    "Tue": "Tue", "Tuesday": "Tue",
    "Wed": "Wed", "Wednesday": "Wed",
    "Thu": "Thu", "Thursday": "Thu",
    "Fri": "Fri", "Friday": "Fri",
}

TIME_RE = re.compile(r"\d{1,2}:\d{2}(?:\s*[AP]M)?", re.IGNORECASE)
DATE_RE = re.compile(r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}")


def _detect_type(text: str) -> str:
    text_lower = text.lower()
    if "datesheet" in text_lower or "date sheet" in text_lower or "examination schedule" in text_lower:
        return "datesheet"
    if "timetable" in text_lower or "time table" in text_lower or "class schedule" in text_lower:
        return "timetable"
    return "unknown"


def _normalise_time(t: str) -> str | None:
    """Convert '08:00 AM' or '8:00' to '08:00:00'."""
    if not t:
        return None
    t = t.strip().upper()
    try:
        if "AM" in t or "PM" in t:
            from datetime import datetime
            fmt = "%I:%M %p" if " " in t else "%I:%M%p"
            return datetime.strptime(t, fmt).strftime("%H:%M:%S")
        parts = t.split(":")
        h, m = int(parts[0]), int(parts[1])
        return f"{h:02d}:{m:02d}:00"
    except Exception:
        return None


def _normalise_date(d: str) -> str | None:
    """Return ISO date YYYY-MM-DD or None."""
    if not d:
        return None
    from datetime import datetime
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y", "%d-%m-%y", "%a,%d,%b,%y"):
        try:
            return datetime.strptime(d.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    return None


# ---------------------------------------------------------------------------
# Timetable extraction (2D Grid Format)
# ---------------------------------------------------------------------------

def _extract_timetable_rows(pdf) -> list[dict]:
    """
    Parse timetable PDF pages into class_schedule rows.
    Format is a 2D grid where rows are days and columns are time slots.
    Cells contain "CourseCode,Section: Subject\\nTeacher (Room)"
    """
    rows = []
    seen = set()  # Deduplicate since multiple students might have the same class
    
    for page in pdf.pages:
        tables = page.extract_tables()
        for table in tables:
            if not table or len(table) < 2:
                continue
            
            header = table[0]
            if not header or len(header) < 2:
                continue
                
            times = header[1:] # e.g. ['8:00-9:30', '9:30-11:00']
            if not times or not any("-" in str(t) for t in times):
                continue

            for row in table[1:]:
                day_raw = row[0]
                if not day_raw or str(day_raw).strip() == "":
                    continue
                day = DAY_MAP.get(str(day_raw).strip(), str(day_raw).strip())
                
                for col_idx, cell in enumerate(row[1:]):
                    if not cell or str(cell).strip() == "":
                        continue
                    if col_idx >= len(times):
                        continue
                        
                    time_slot = str(times[col_idx])
                    if "-" not in time_slot:
                        continue
                    t_start, t_end = [t.strip() for t in time_slot.split("-")]
                    
                    # Split multiple classes in the same cell (sometimes separated by newlines or blank lines)
                    # A single cell block usually looks like:
                    # CS3002,BAI-8A: Info Sec
                    # Ali Sayyed (Room 2)
                    
                    cell_text = str(cell).strip()
                    
                    # Extract course code and section
                    m = re.match(r"^([A-Z]{2,3}[0-9]{3,4})(?:,([A-Z0-9\-]+))?\s*[:\-]\s*(.*)", cell_text, re.DOTALL)
                    if not m:
                        # Sometimes just course code on first line
                        lines = cell_text.split('\n')
                        m = re.match(r"^([A-Z]{2,3}[0-9]{3,4})(?:,([A-Z0-9\-]+))?", lines[0].strip())
                        if m:
                            course_code = m.group(1).strip()
                            section = m.group(2).strip() if m.group(2) else None
                            rest = "\n".join(lines[1:]).strip()
                        else:
                            continue
                    else:
                        course_code = m.group(1).strip()
                        section = m.group(2).strip() if m.group(2) else None
                        rest = m.group(3).strip()

                    # Extract room and teacher from the last line containing parentheses
                    lines = [line.strip() for line in rest.split('\n') if line.strip()]
                    room = None
                    teacher = None
                    
                    if lines:
                        last_line = lines[-1]
                        rm = re.search(r'\((.*?)\)', last_line)
                        if rm:
                            room = rm.group(1).strip()
                            teacher = last_line[:rm.start()].strip()
                        else:
                            teacher = last_line

                    # Generate a unique key for deduplication
                    key = (course_code, section, day, t_start)
                    if key not in seen:
                        seen.add(key)
                        rows.append({
                            "course_code": course_code,
                            "faculty_name": teacher or None,
                            "room_code": room or None,
                            "day_of_week": day,
                            "start_time": _normalise_time(t_start),
                            "end_time": _normalise_time(t_end),
                            "section": section,
                            "semester": None,
                        })

    logger.info("Timetable rows extracted: %d", len(rows))
    return rows


# ---------------------------------------------------------------------------
# Datesheet extraction (Grid Format with Dates outside)
# ---------------------------------------------------------------------------

def _extract_datesheet_rows(pdf) -> list[dict]:
    """
    Parse exam datesheet PDF pages into exam_schedule rows.
    Format: Dates are written as text above tables. Tables have times as columns.
    """
    rows = []
    seen = set()
    
    for page in pdf.pages:
        text = page.extract_text()
        if not text:
            continue
            
        # Find dates above tables (e.g. Thu, 09, Apr, 26)
        dates = re.findall(r'(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s*\d{1,2},\s*[A-Za-z]{3},\s*\d{2,4}', text)
        
        tables = page.extract_tables()
        if not tables:
            continue
            
        for index, table in enumerate(tables):
            if index >= len(dates):
                break
            date_str = dates[index].replace(" ", "") # format date later
            
            header = table[0]
            times = [t for t in header if t and "-" in str(t)]
            
            # Start at row 1 or 2 depending on if row 1 is just counts
            start_row = 1
            if len(table) > 1 and all(re.match(r'^\d+$', str(c).strip()) for c in table[1] if c and str(c).strip()):
                start_row = 2
                
            for row_num in range(start_row, len(table)):
                row = table[row_num]
                for col_idx, cell in enumerate(row):
                    if col_idx >= len(times) or not cell or not str(cell).strip():
                        continue
                        
                    time_slot = str(times[col_idx])
                    t_start, t_end = [t.strip() for t in time_slot.split("-")]
                    
                    text_cell = str(cell).strip()
                    # A single cell can contain multiple exams separated by "-"
                    parts = re.split(r'(?=\b[A-Z]{2,3}[0-9]{3,4}(?:,[A-Z0-9\-]+)?\s*-)', text_cell)
                    
                    for part in parts:
                        if not part.strip():
                            continue
                            
                        lines = part.strip().split("\n")
                        course_code = None
                        section = None
                        
                        m = re.search(r'^([A-Z]{2,3}[0-9]{3,4})(?:,([A-Z0-9\-]+))?', lines[0])
                        if m:
                            course_code = m.group(1).strip()
                            section = m.group(2).strip() if m.group(2) else None
                        
                        if course_code:
                            key = (course_code, section, date_str, t_start)
                            if key not in seen:
                                seen.add(key)
                                rows.append({
                                    "course_code": course_code,
                                    "exam_type": "Final",
                                    "exam_date": _normalise_date(date_str) or date_str,
                                    "start_time": _normalise_time(t_start),
                                    "end_time": _normalise_time(t_end),
                                    "room_code": None,
                                    "section": section,
                                    "semester": None,
                                })

    logger.info("Datesheet rows extracted: %d", len(rows))
    return rows


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def extract(pdf_bytes: bytes) -> dict:
    """
    Main entry point. Accepts raw PDF bytes.
    Returns { "type": str, "rows": list[dict] }
    """
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            first_page_text = pdf.pages[0].extract_text() or ""
            pdf_type = _detect_type(first_page_text)

            if pdf_type == "timetable":
                rows = _extract_timetable_rows(pdf)
            elif pdf_type == "datesheet":
                rows = _extract_datesheet_rows(pdf)
            else:
                logger.warning("PDF type not recognised — skipping extraction")
                rows = []

        return {"type": pdf_type, "rows": rows}

    except Exception as e:
        logger.error("PDF extraction failed: %s", e)
        return {"type": "error", "rows": []}
