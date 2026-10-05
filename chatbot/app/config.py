from __future__ import annotations

from typing import Any

from pydantic import AnyUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "spark-chatbot"
    environment: str = "development"
    google_api_key: str = Field(default="", alias="GOOGLE_API_KEY")
    gemini_chat_model: str = Field(default="", alias="GEMINI_CHAT_MODEL")
    gemini_embed_model: str = Field(default="", alias="GEMINI_EMBED_MODEL")
    express_base_url: AnyUrl = Field(default="http://localhost:5000", alias="EXPRESS_BASE_URL")
    service_key: str = Field(default="", alias="SERVICE_KEY")
    chroma_dir: str = Field(default="./data/chroma", alias="CHROMA_DIR")
    checkpoint_db: str = Field(default="./data/checkpoints.sqlite3", alias="CHECKPOINT_DB")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def has_gemini_credentials(self) -> bool:
        return bool(self.google_api_key and self.gemini_chat_model and self.gemini_embed_model)


settings = Settings()


__all__ = ["Settings", "settings"]
