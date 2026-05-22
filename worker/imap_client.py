"""
imap_client.py — Gmail IMAP fetcher for the timetable worker.

Connects via IMAP4_SSL using an App Password.
Fetches UNSEEN emails from specific senders within the last N days (default 3).
Returns a list of message dicts with body text and PDF attachments.
"""

import email
import imaplib
import io
import logging
import os
from datetime import datetime, timedelta
from email.header import decode_header

logger = logging.getLogger(__name__)

SENDERS = [
    "students@pwr.nu.edu.pk",
    "mod.pwr@nu.edu.pk",
]

IMAP_HOST = "imap.gmail.com"
IMAP_PORT = 993


def _decode_str(value: str | bytes | None, charset: str | None = "utf-8") -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        return value.decode(charset or "utf-8", errors="replace")
    return value


def _decode_header_value(raw: str) -> str:
    parts = decode_header(raw or "")
    decoded = []
    for part, charset in parts:
        decoded.append(_decode_str(part, charset))
    return " ".join(decoded)


def fetch_emails(fetch_all: bool = False, days_back: int = 3) -> list[dict]:
    """
    Returns a list of dicts:
    {
        "message_id": str,      # Gmail X-GM-MSGID or Message-ID header
        "subject":    str,
        "sender":     str,
        "body":       str,      # plain-text body
        "pdfs":       list[bytes]  # raw bytes of each PDF attachment
    }
    """
    user = os.environ["GMAIL_USER"]
    password = os.environ["GMAIL_PASS"]

    results = []

    try:
        mail = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
        mail.login(user, password)
        mail.select("INBOX")
    except Exception as e:
        logger.error("IMAP connection/login failed: %s", e)
        raise

    # IMAP SINCE date string: "22-May-2026"
    since_date = (datetime.now() - timedelta(days=days_back)).strftime("%d-%b-%Y")

    try:
        for sender in SENDERS:
            if fetch_all:
                search_criteria = f'(FROM "{sender}" SINCE "{since_date}")'
            else:
                search_criteria = f'(UNSEEN FROM "{sender}" SINCE "{since_date}")'
            _typ, data = mail.search(None, search_criteria)
            if _typ != "OK" or not data[0]:
                continue

            for num in data[0].split():
                try:
                    _typ, msg_data = mail.fetch(num, "(RFC822)")
                    if _typ != "OK":
                        continue

                    raw = msg_data[0][1]
                    msg = email.message_from_bytes(raw)

                    message_id = msg.get("Message-ID", "").strip()
                    subject = _decode_header_value(msg.get("Subject", ""))
                    from_addr = _decode_header_value(msg.get("From", ""))

                    body = ""
                    pdfs = []

                    for part in msg.walk():
                        content_type = part.get_content_type()
                        disposition = part.get("Content-Disposition", "")

                        if content_type == "text/plain" and "attachment" not in disposition:
                            payload = part.get_payload(decode=True)
                            if payload:
                                charset = part.get_content_charset() or "utf-8"
                                body += payload.decode(charset, errors="replace")

                        elif content_type == "application/pdf" or (
                            "attachment" in disposition and part.get_filename("").endswith(".pdf")
                        ):
                            pdf_bytes = part.get_payload(decode=True)
                            if pdf_bytes:
                                pdfs.append(pdf_bytes)

                    results.append({
                        "message_id": message_id,
                        "subject": subject,
                        "sender": from_addr,
                        "body": body,
                        "pdfs": pdfs,
                    })

                    logger.info("Fetched email: %s (%d PDFs)", subject, len(pdfs))

                except Exception as e:
                    logger.warning("Failed to process email uid %s: %s", num, e)
    finally:
        try:
            mail.logout()
        except Exception:
            pass

    logger.info("Total emails fetched: %d", len(results))
    return results
