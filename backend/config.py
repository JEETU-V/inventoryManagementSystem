import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-key")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    
    # Use SQLite for development if DATABASE_URL is not set
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        SQLALCHEMY_DATABASE_URI = database_url
    else:
        # Fallback to SQLite for development
        SQLALCHEMY_DATABASE_URI = "sqlite:///inventory_dev.db"
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174").split(",")
        if origin.strip()
    ]
    DEFAULT_ADMIN_EMAIL = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@example.com")
    DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")

    COMPANY_NAME = os.getenv("COMPANY_NAME", "Stationery Shop")
    COMPANY_ADDRESS = os.getenv("COMPANY_ADDRESS", "Your Shop Address")
    COMPANY_PHONE = os.getenv("COMPANY_PHONE", "Your Shop Phone")
    COMPANY_EMAIL = os.getenv("COMPANY_EMAIL", "your@email.com")
    COMPANY_GST_NUMBER = os.getenv("COMPANY_GST_NUMBER", "")
    GST_RATE = float(os.getenv("GST_RATE", "0.18"))

    FLASK_ENV = os.getenv("FLASK_ENV", "development")


