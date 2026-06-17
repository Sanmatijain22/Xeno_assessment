import os
from dataclasses import dataclass, field
from functools import lru_cache
from sqlalchemy.engine import URL


@dataclass(frozen=True)
class Settings:
    # General
    env: str = field(default_factory=lambda: os.getenv("ENV", "development"))
    debug: bool = field(default_factory=lambda: os.getenv("DEBUG", "true").lower() == "true")
    secret_key: str = field(default_factory=lambda: os.getenv("SECRET_KEY", "fallback-secret-key-change-in-prod"))

    # Database individual components — avoids @ in password breaking URL parsing
    db_user: str = field(default_factory=lambda: os.getenv("DB_USER", "postgres"))
    db_password: str = field(default_factory=lambda: os.getenv("DB_PASSWORD", "Dev@11976"))
    db_host: str = field(default_factory=lambda: os.getenv("DB_HOST", "localhost"))
    db_port: int = field(default_factory=lambda: int(os.getenv("DB_PORT", "5432")))
    db_name: str = field(default_factory=lambda: os.getenv("DB_NAME", "xeno"))

    # SQLAlchemy pool tuning
    db_echo: bool = field(default_factory=lambda: os.getenv("DB_ECHO", "false").lower() == "true")
    db_pool_size: int = field(default_factory=lambda: int(os.getenv("DB_POOL_SIZE", "5")))
    db_max_overflow: int = field(default_factory=lambda: int(os.getenv("DB_MAX_OVERFLOW", "10")))
    db_pool_timeout: int = field(default_factory=lambda: int(os.getenv("DB_POOL_TIMEOUT", "30")))

    # Cache & Queue
    redis_url: str = field(default_factory=lambda: os.getenv("REDIS_URL", "redis://localhost:6379/0"))

    # Groq
    groq_api_key: str = field(default_factory=lambda: os.getenv("GROQ_API_KEY", ""))

    # Storage
    upload_dir: str = field(default_factory=lambda: os.getenv("UPLOAD_DIR", "./uploads"))
    output_dir: str = field(default_factory=lambda: os.getenv("OUTPUT_DIR", "./outputs"))

    # --- Computed URL properties (not dataclass fields) ---

    @property
    def database_url(self) -> str:
        """Async SQLAlchemy URL (asyncpg driver)."""
        return URL.create(
            "postgresql+asyncpg",
            username=self.db_user,
            password=self.db_password,
            host=self.db_host,
            port=self.db_port,
            database=self.db_name,
        ).render_as_string(hide_password=False)

    @property
    def database_sync_url(self) -> str:
        """Sync SQLAlchemy URL (psycopg2 driver) for Alembic."""
        return URL.create(
            "postgresql+psycopg2",
            username=self.db_user,
            password=self.db_password,
            host=self.db_host,
            port=self.db_port,
            database=self.db_name,
        ).render_as_string(hide_password=False)

    # Backwards-compatible uppercase aliases
    @property
    def ENV(self) -> str:  # noqa: N802
        return self.env

    @property
    def DEBUG(self) -> bool:  # noqa: N802
        return self.debug

    @property
    def SECRET_KEY(self) -> str:  # noqa: N802
        return self.secret_key

    @property
    def DATABASE_URL(self) -> str:  # noqa: N802
        return self.database_url

    @property
    def DATABASE_SYNC_URL(self) -> str:  # noqa: N802
        return self.database_sync_url

    @property
    def REDIS_URL(self) -> str:  # noqa: N802
        return self.redis_url

    @property
    def GROQ_API_KEY(self) -> str:  # noqa: N802
        return self.groq_api_key

    @property
    def UPLOAD_DIR(self) -> str:  # noqa: N802
        return self.upload_dir

    @property
    def OUTPUT_DIR(self) -> str:  # noqa: N802
        return self.output_dir


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    return Settings()


# Module-level singleton kept for backwards compatibility.
settings = get_settings()
