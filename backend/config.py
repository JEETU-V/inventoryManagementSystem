import os
from datetime import timedelta
from urllib.parse import urlsplit

from dotenv import load_dotenv

IS_PRODUCTION_ENV = (
    os.getenv("VERCEL", "").lower() in {"1", "true"}
    or os.getenv("FLASK_ENV", "").lower() == "production"
)
if not IS_PRODUCTION_ENV:
    load_dotenv()


class Config:
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    IS_PRODUCTION = IS_PRODUCTION_ENV
    SECRET_KEY = os.getenv("SECRET_KEY") or (
        None if IS_PRODUCTION else "dev-secret-key"
    )
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") or (
        None if IS_PRODUCTION else "dev-jwt-secret-key"
    )
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    database_url = os.getenv("DATABASE_URL")
    if database_url and database_url.startswith("mysql://"):
        database_url = database_url.replace("mysql://", "mysql+pymysql://", 1)
    platform_admin_emails = os.getenv("PLATFORM_ADMIN_EMAILS")
    if platform_admin_emails is None and not IS_PRODUCTION:
        platform_admin_emails = os.getenv(
            "DEFAULT_ADMIN_EMAIL",
            "admin@example.com",
        )
    PLATFORM_ADMIN_EMAILS = tuple(
        email.strip().lower()
        for email in (platform_admin_emails or "").split(",")
        if email.strip()
    )
    if IS_PRODUCTION:
        required_settings = {
            "SECRET_KEY": SECRET_KEY,
            "JWT_SECRET_KEY": JWT_SECRET_KEY,
            "DATABASE_URL": database_url,
            "PLATFORM_ADMIN_EMAILS": PLATFORM_ADMIN_EMAILS,
        }
        missing_settings = [
            name for name, value in required_settings.items() if not value
        ]
        if missing_settings:
            raise RuntimeError(
                "Missing required production environment variables: "
                + ", ".join(missing_settings)
            )
        for name, secret in (
            ("SECRET_KEY", SECRET_KEY),
            ("JWT_SECRET_KEY", JWT_SECRET_KEY),
        ):
            if len(secret) < 32:
                raise RuntimeError(f"{name} must be at least 32 characters in production")
        if urlsplit(database_url).scheme != "mysql+pymysql":
            raise RuntimeError("Production DATABASE_URL must use mysql+pymysql")

    SQLALCHEMY_DATABASE_URI = database_url or "sqlite:///inventory_dev.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
        "pool_size": 5,
        "max_overflow": 2,
        "pool_timeout": 30,
    }
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", str(10 * 1024 * 1024)))
    ENABLE_SUPPLIER_PDF_UPLOADS = not IS_PRODUCTION
    default_cors_origins = "" if IS_PRODUCTION else "http://localhost:5173,http://localhost:5174"
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", default_cors_origins).split(",")
        if origin.strip()
    ]
    DEFAULT_ADMIN_EMAIL = os.getenv("DEFAULT_ADMIN_EMAIL") or (
        None if IS_PRODUCTION else "admin@example.com"
    )
    DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD") or (
        None if IS_PRODUCTION else "admin123"
    )
    COMPANY_NAME = os.getenv("COMPANY_NAME", "Stockroom")
    COMPANY_ADDRESS = os.getenv("COMPANY_ADDRESS", "Your Shop Address")
    COMPANY_PHONE = os.getenv("COMPANY_PHONE", "Your Shop Phone")
    COMPANY_EMAIL = os.getenv("COMPANY_EMAIL", "your@email.com")
    COMPANY_GST_NUMBER = os.getenv("COMPANY_GST_NUMBER", "")
    GST_RATE = float(os.getenv("GST_RATE", "0.18"))
