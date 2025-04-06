import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

class Settings:
    """Configurações da aplicação."""
    
    # OpenAI
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    
    # API URLs
    TASK_API_URL = os.getenv("TASK_API_URL", "https://api.example.com/tasks")
    ROUTINE_API_URL = os.getenv("ROUTINE_API_URL", "https://api.example.com/routines")
    
    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Instância global das configurações
settings = Settings() 