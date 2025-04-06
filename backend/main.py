import os
import signal
import sys
import logging
import traceback
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from controllers import api_router

# Configurar logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Carregar variáveis de ambiente
load_dotenv()

# Criar a aplicação FastAPI
app = FastAPI(title="Monolito AI Task Manager API")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especifique os domínios permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir os routers dos controllers
app.include_router(api_router)

# Variável para controlar o estado do servidor
server_running = True

def signal_handler(sig, frame):
    """Manipulador para o sinal SIGINT (Ctrl+C)"""
    global server_running
    print("\nEncerrando o servidor...")
    server_running = False
    sys.exit(0)

# Registrar o manipulador de sinal
signal.signal(signal.SIGINT, signal_handler)

def main():
    """Função principal."""
    try:
        # Iniciar servidor
        uvicorn.run(app, host="0.0.0.0", port=8000)
        
    except Exception as e:
        logger.error(f"Erro na função principal: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise

if __name__ == "__main__":
    main()
