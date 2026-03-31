from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Cyber Volunteers HQ"
    secret_key: str = "change_me"
    access_token_expire_minutes: int = 1440
    database_url: str = "sqlite:///./cybervolunteers.db"
    frontend_url: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173,https://kanio0.github.io"
    run_bot: bool = False
    bot_token: str = ""
    telegram_bot_name: str = "beeline_volunteers_bot"
    inactivity_days: int = 180

    @property
    def cors_origins_list(self) -> list[str]:
        values = [self.frontend_url, *self.cors_origins.split(",")]
        result = []
        for value in values:
            value = value.strip()
            if value and value not in result:
                result.append(value)
        return result


settings = Settings()
