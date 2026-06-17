"""Run once to insert default country validation rules."""
import asyncio
from sqlalchemy import select
from app.config.db import async_session_factory
from app.models.rules import CountryRules

RULES = [
    {"country_code": "IN", "country_name": "India",       "phone_regex": r"^\+?91[6-9]\d{9}$",   "date_format": "DD/MM/YYYY"},
    {"country_code": "SG", "country_name": "Singapore",   "phone_regex": r"^\+?65[689]\d{7}$",    "date_format": "DD-MM-YYYY"},
    {"country_code": "US", "country_name": "USA",         "phone_regex": r"^\+?1[2-9]\d{9}$",     "date_format": "MM/DD/YYYY"},
    {"country_code": "DE", "country_name": "Germany",     "phone_regex": r"^\+?49\d{10,11}$",     "date_format": "DD.MM.YYYY"},
    {"country_code": "GB", "country_name": "UK",          "phone_regex": r"^\+?44\d{10}$",        "date_format": "DD/MM/YYYY"},
    {"country_code": "AU", "country_name": "Australia",   "phone_regex": r"^\+?61[2-9]\d{8}$",    "date_format": "DD/MM/YYYY"},
]

async def seed():
    async with async_session_factory() as session:
        for r in RULES:
            existing = await session.execute(
                select(CountryRules).where(CountryRules.country_code == r["country_code"])
            )
            if not existing.scalars().first():
                session.add(CountryRules(is_active=True, **r))
                print(f"  + {r['country_code']}")
            else:
                print(f"  = {r['country_code']} (already exists)")
        await session.commit()
    print("Done.")

asyncio.run(seed())
