"""Logging configuration."""
import sys
from loguru import logger
import os

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_DIR = os.getenv("LOG_DIR", "logs")

os.makedirs(LOG_DIR, exist_ok=True)

logger.remove()
logger.add(sys.stdout, level=LOG_LEVEL, colorize=True,
           format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan> - <level>{message}</level>")
logger.add(f"{LOG_DIR}/autoapply.log", rotation="10 MB", retention="30 days", level="DEBUG",
           format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}")

__all__ = ["logger"]
