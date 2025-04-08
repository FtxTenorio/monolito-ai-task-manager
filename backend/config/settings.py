from pydantic_settings import BaseSettings
from functools import lru_cache
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

class _Settings(BaseSettings):
    # Spotify settings
    spotify_client_id: str
    spotify_client_secret: str
    spotify_redirect_uri: str = "http://localhost:3000/spotify-callback"
    spotify_auth_url: str = "https://accounts.spotify.com/authorize"
    spotify_token_url: str = "https://accounts.spotify.com/api/token"
    spotify_api_url: str = "https://api.spotify.com/v1"

    # OpenAI settings
    openai_api_key: str
    openai_model: str = "gpt-3.5-turbo"

    # API URLs
    task_api_url: str = "https://api.example.com/tasks"
    routine_api_url: str = "https://api.example.com/routines"

    # Logging
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = False

def get_settings() -> _Settings:
    settings = _Settings()
    print("Current settings:")
    for field, value in settings.model_dump().items():
        # Mask sensitive values
        if 'secret' in field.lower() or 'key' in field.lower():
            masked_value = value
        else:
            masked_value = value
        print(f"{field}: {masked_value}")
    return settings