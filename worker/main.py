"""
main.py — Timetable worker orchestrator.

Designed as a single-shot script: run once per invocation.
Deployed on Railway as a Cron Job (every 30 min) — no schedule loop needed.

Usage:
  python main.py            # full pipeline run
  python main.py --dry-run  # fetch + parse only, no DB writes
"""

import argparse
import logging
import os
import sys

from dotenv import load_dotenv

# Load .env if running locally (Railway injects vars directly)
load_dotenv()

import db_client
import groq_parser
import imap_client
import pdf_extractor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("main")


def validate_env():
    required = ["DATABASE_URL", "GMAIL_USER", "GMAIL_PASS", "GROQ_API_KEY"]
    missing = [k for k in required if not os.environ.get(k)]
    if missing:
        logger.error("Missing required environment variables: %s", missing)
        sys.exit(1)


def run(dry_run: bool = False, reprocess: bool = False):
    logger.info("=== Timetable worker starting (dry_run=%s) ===", dry_run)
    validate_env()

    # Open DB connection once for the whole run (handles Neon cold start internally)
    conn = db_client.get_connection()

    try:
        try:
            emails = imap_client.fetch_emails(fetch_all=reprocess)
        except Exception as e:
            logger.error("Email fetch failed — aborting run: %s", e)
            return

        logger.info("Emails to process: %d", len(emails))

        for mail in emails:
            msg_id = mail["message_id"]
            if not msg_id:
                logger.warning("Email with no Message-ID — skipping")
                continue

            with conn.cursor() as cur:
                if not reprocess and db_client.is_already_processed(cur, msg_id):
                    logger.info("Already processed: %s — skipping", msg_id)
                    continue

            logger.info("Processing: %s", mail["subject"])

            inserted_tables = []
            error_msg = None

            try:
                with conn.cursor() as cur:
                    # --- Step 1: Parse email body with Groq → live_updates ---
                    announcements = groq_parser.parse_email_body(mail["body"])
                    for ann in announcements:
                        if not dry_run:
                            db_client.insert_live_update(
                                cur,
                                title=ann["title"],
                                message=ann["message"],
                                category=ann["category"],
                            )
                            inserted_tables.append("live_updates")
                        logger.info("[live_update] %s (%s)", ann["title"], ann["category"])

                    # --- Step 2: Extract PDF attachments ---
                    for i, pdf_bytes in enumerate(mail["pdfs"]):
                        logger.info("Processing PDF %d/%d", i + 1, len(mail["pdfs"]))
                        result = pdf_extractor.extract(pdf_bytes)
                        pdf_type = result["type"]
                        rows = result["rows"]

                        logger.info("PDF type: %s | rows: %d", pdf_type, len(rows))

                        if pdf_type == "timetable":
                            inserted = 0
                            for row in rows:
                                if not dry_run:
                                    ok = db_client.upsert_class_schedule(cur, row)
                                    if ok:
                                        inserted += 1
                                else:
                                    logger.debug("[dry-run] class_schedule row: %s", row)
                            if inserted:
                                inserted_tables.append("class_schedule")
                            logger.info("class_schedule: %d/%d rows upserted", inserted, len(rows))

                        elif pdf_type == "datesheet":
                            inserted = 0
                            for row in rows:
                                if not dry_run:
                                    ok = db_client.insert_exam_schedule(cur, row)
                                    if ok:
                                        inserted += 1
                                else:
                                    logger.debug("[dry-run] exam_schedule row: %s", row)
                            if inserted:
                                inserted_tables.append("exam_schedule")
                            logger.info("exam_schedule: %d/%d rows inserted", inserted, len(rows))

                        else:
                            logger.warning("Unknown PDF type — no rows inserted")

                    if not dry_run:
                        conn.commit()
                        db_client.log_processed(
                            cur,
                            gmail_message_id=msg_id,
                            status="SUCCESS",
                            inserted_table=",".join(set(inserted_tables)) or None,
                        )
                        conn.commit()

            except Exception as e:
                conn.rollback()
                error_msg = str(e)
                logger.error("Failed to process email %s: %s", msg_id, e)
                if not dry_run:
                    with conn.cursor() as cur:
                        db_client.log_processed(
                            cur,
                            gmail_message_id=msg_id,
                            status="FAILED",
                            error_message=error_msg,
                        )
                    conn.commit()

    finally:
        conn.close()
        logger.info("=== Worker run complete ===")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Timetable automation worker")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and parse emails/PDFs but do not write to the database",
    )
    parser.add_argument(
        "--reprocess",
        action="store_true",
        help="Re-fetch ALL emails (seen + unseen) and ignore pipeline_log dedup",
    )
    args = parser.parse_args()
    run(dry_run=args.dry_run, reprocess=args.reprocess)
