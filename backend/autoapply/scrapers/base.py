"""Base scraper with common utilities."""
import asyncio
import random
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime

from autoapply.utils.logger import logger


@dataclass
class JobListing:
    """Normalized job listing from any source."""
    external_id: str
    source: str
    url: str
    title: str
    company: str
    location: str = ""
    is_remote: bool = False
    employment_type: str = "full-time"
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    description: str = ""
    requirements: List[str] = field(default_factory=list)
    benefits: List[str] = field(default_factory=list)
    apply_url: str = ""
    company_domain: str = ""
    posted_at: Optional[datetime] = None


class BaseScraper:
    """Base class for all job scrapers."""

    def __init__(self):
        self.name = "base"

    async def search(self, titles: List[str], locations: List[str], **kwargs) -> List[JobListing]:
        raise NotImplementedError

    async def human_delay(self, min_s: float = 1.0, max_s: float = 3.0):
        """Random delay to mimic human behavior."""
        await asyncio.sleep(random.uniform(min_s, max_s))

    def parse_salary(self, salary_text: str) -> tuple[Optional[int], Optional[int]]:
        """Parse salary strings like '$120k-$160k' or '$120,000 - $160,000'."""
        import re
        if not salary_text:
            return None, None
        text = salary_text.lower().replace(",", "").replace("$", "")
        numbers = re.findall(r'\d+\.?\d*', text)
        if not numbers:
            return None, None
        nums = [float(n) for n in numbers]
        # Handle 'k' multiplier
        if 'k' in text:
            nums = [n * 1000 if n < 1000 else n for n in nums]
        nums = [int(n) for n in nums if n > 1000]
        if len(nums) >= 2:
            return min(nums), max(nums)
        elif len(nums) == 1:
            return nums[0], nums[0]
        return None, None
