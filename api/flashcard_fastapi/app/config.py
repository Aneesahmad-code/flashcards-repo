# app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    RESET_TOKEN_EXPIRE_MINUTES: int = 30
    TOTP_ISSUER: str = "Flashcards API"
    TOTP_CHALLENGE_EXPIRE_MINUTES: int = 10
    FRONTEND_BASE_URL: str = "http://localhost:5173"
    AUTO_CREATE_TABLES: bool = False

    # NEW:
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-1.5-flash"

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_USE_TLS: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
