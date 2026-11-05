import os
import ssl
import tempfile
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import load_dotenv

IS_PRODUCTION_ENV = (
    os.getenv("VERCEL", "").lower() in {"1", "true"}
    or os.getenv("FLASK_ENV", "").lower() == "production"
)
if not IS_PRODUCTION_ENV:
    load_dotenv()


def _resolve_mysql_ssl_ca():
    inline_certificate = os.getenv("MYSQL_SSL_CA")
    certificate_path = os.getenv("MYSQL_SSL_CA_PATH")

    if inline_certificate and certificate_path:
        raise RuntimeError("Set only one of MYSQL_SSL_CA or MYSQL_SSL_CA_PATH")

    if inline_certificate:
        if "-----BEGIN CERTIFICATE-----" not in inline_certificate:
            raise RuntimeError("MYSQL_SSL_CA must contain a PEM CA certificate")
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="ascii",
            prefix="inventory-mysql-ca-",
            suffix=".pem",
            delete=False,
        ) as certificate_file:
            certificate_file.write(inline_certificate.strip() + "\n")
        resolved_path = certificate_file.name
    elif certificate_path:
        resolved_path = str(Path(certificate_path).expanduser().resolve())
    else:
        local_certificate = Path(__file__).parent / "certs" / "ca.pem"
        resolved_path = str(local_certificate) if local_certificate.is_file() else None

    if resolved_path:
        try:
            ssl.create_default_context(cafile=resolved_path)
        except (OSError, ssl.SSLError) as error:
            raise RuntimeError("The configured MySQL CA certificate is invalid") from error
    return resolved_path


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
    mysql_ssl_ca_path = _resolve_mysql_ssl_ca()
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
        if (
            database_url
            and urlsplit(database_url).scheme == "mysql+pymysql"
            and not mysql_ssl_ca_path
        ):
            required_settings["MYSQL_SSL_CA or MYSQL_SSL_CA_PATH"] = None
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
    if database_url and urlsplit(database_url).scheme == "mysql+pymysql" and mysql_ssl_ca_path:
        SQLALCHEMY_ENGINE_OPTIONS["connect_args"] = {
            "ssl": {
                "ca": mysql_ssl_ca_path,
                "check_hostname": True,
            }
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
