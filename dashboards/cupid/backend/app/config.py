from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_base_url: str = "https://us.cloud.langfuse.com"
    database_path: str = "/app/data/cupid.db"
    sync_interval_seconds: int = 300

    class Config:
        env_file = ".env"


settings = Settings()
