from __future__ import annotations

from pydantic import AnyUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "spark-chatbot"
    environment: str = "development"
    google_api_key: str = Field(default="", alias="GOOGLE_API_KEY")
    gemini_chat_model: str = Field(default="gemini-2.0-flash", alias="GEMINI_CHAT_MODEL")
    gemini_embed_model: str = Field(default="", alias="GEMINI_EMBED_MODEL")
    gemini_rerank_model: str = Field(default="", alias="GEMINI_RERANK_MODEL")
    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    groq_chat_model: str = Field(
        default="llama-3.3-70b-versatile",
        alias="GROQ_CHAT_MODEL",
    )
    express_base_url: AnyUrl = Field(default="http://localhost:5000", alias="EXPRESS_BASE_URL")
    service_key: str = Field(default="", alias="SERVICE_KEY")
    postgres_url: str = Field(default="", alias="POSTGRES_URL")
    faiss_dir: str = Field(default="./data/faiss", alias="FAISS_DIR")
    checkpoint_db: str = Field(default="./data/checkpoints.sqlite3", alias="CHECKPOINT_DB")
    retrieve_k: int = Field(default=20, alias="RETRIEVE_K")
    rerank_enabled: bool = Field(default=True, alias="RERANK_ENABLED")
    rerank_min_score: float = Field(default=0.4, alias="RERANK_MIN_SCORE")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def has_gemini_credentials(self) -> bool:
        return bool(self.google_api_key and self.gemini_embed_model)

    @property
    def has_gemini_chat(self) -> bool:
        return bool(self.google_api_key and self.gemini_chat_model)

    @property
    def has_groq_credentials(self) -> bool:
        return bool(self.groq_api_key and self.groq_chat_model)

    @property
    def rerank_model_id(self) -> str:
        return self.groq_chat_model


settings = Settings()


__all__ = ["Settings", "settings"]
