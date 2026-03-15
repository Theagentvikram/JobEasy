"""
APScheduler - replaces Celery + Redis entirely.
Runs inside the FastAPI process. No extra services needed.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from autoapply.utils.logger import logger
from autoapply.utils.settings import settings

scheduler = AsyncIOScheduler(timezone="UTC")


def start_scheduler():
    """Start the background scheduler. Called at app startup."""
    from autoapply.tasks.job_pipeline import run_full_pipeline

    scheduler.add_job(
        run_full_pipeline,
        trigger=CronTrigger(hour=settings.pipeline_hour, minute=settings.pipeline_minute),
        id="daily_pipeline",
        name="Daily Job Pipeline",
        replace_existing=True,
    )

    scheduler.start()
    logger.info(f"Scheduler started - pipeline runs daily at {settings.pipeline_hour:02d}:{settings.pipeline_minute:02d} UTC")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
