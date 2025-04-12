import json
import logging
from typing import Dict, Any
from fastapi import WebSocket
from utils.agents_manager import agents_manager
from utils.websocket_utils import register_websocket, unregister_websocket, get_websocket_connection, get_active_connections

# Configurar logging
logger = logging.getLogger(__name__)

# Gerenciador de conexões WebSocket
class ConnectionManager:    
    async def connect(self, websocket: WebSocket):
        """Aceita uma nova conexão WebSocket."""
        await websocket.accept()
        client_id = id(websocket)
        
        register_websocket(client_id, websocket)
        agents_manager.create_agent(client_id)
        logger.info(f"Cliente conectado: {client_id}")
    
    async def active_connections(self):
        """Retorna todas as conexões ativas."""
        return get_active_connections()
    
    def disconnect(self, client_id: int):
        """Remove uma conexão WebSocket."""
        unregister_websocket(client_id)
        agents_manager.remove_agent(client_id)
        logger.info(f"Cliente desconectado: {client_id}")
    
    async def process_message(self, client_id: int, message: str, response_format: str = "markdown"):
        """Processa uma mensagem recebida do cliente."""
        websocket = get_websocket_connection(client_id)
        if not websocket:
            logger.error(f"Cliente {client_id} não está conectado")
            return
        
        await agents_manager.process_message(client_id, message, websocket, response_format)

# Instância global do gerenciador de conexões
connection_manager = ConnectionManager() 