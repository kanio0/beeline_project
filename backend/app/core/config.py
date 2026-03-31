from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_name: str = "Cyber Volunteers HQ"
    secret_key: str = "change_me"
    access_token_expire_minutes: int = 1440
    database_url: str = "sqlite:///./cybervolunteers.db"
    frontend_url: str = "http://localhost:5173"
    run_bot: bool = False
    bot_token: str = ""
    telegram_bot_name: str = "beeline_volunteers_bot"
    inactivity_days: int = 180

settings = Settings()
