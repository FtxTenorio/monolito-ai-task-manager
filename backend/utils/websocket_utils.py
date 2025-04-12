import json
import logging
from typing import Dict, Any, Optional
from fastapi import WebSocket

# Configurar logging
logger = logging.getLogger(__name__)

# Armazenamento global para conexões WebSocket
websocket_connections: Dict[int, WebSocket] = {}

def get_websocket_connection(client_id: int) -> Optional[WebSocket]:
    """Obtém a conexão WebSocket para um cliente específico."""
    return websocket_connections.get(client_id)

def get_active_connections() -> Dict[int, WebSocket]:
    """Obtém todas as conexões ativas."""
    return websocket_connections

def register_websocket(client_id: int, websocket: WebSocket) -> None:
    """Registra uma conexão WebSocket."""
    websocket_connections[client_id] = websocket
    logger.info(f"WebSocket registrado para o cliente: {client_id}")

def unregister_websocket(client_id: int) -> None:
    """Remove o registro de uma conexão WebSocket."""
    if client_id in websocket_connections:
        del websocket_connections[client_id]
        logger.info(f"WebSocket removido para o cliente: {client_id}")

async def send_websocket_message(message: str, client_id: int, message_type: str = "message", format_type: str = "text") -> bool:
    """
    Envia uma mensagem para um cliente via WebSocket.
    
    Args:
        message (str): A mensagem a ser enviada
        client_id (int): O ID do cliente
        message_type (str): O tipo da mensagem (message, error, function_call_start, etc.)
        format_type (str): O formato da mensagem (text, markdown, etc.)
        
    Returns:
        bool: True se a mensagem foi enviada com sucesso, False caso contrário
    """
    if client_id not in websocket_connections:
        logger.error(f"Cliente {client_id} não está conectado")
        return False
    
    try:
        message_data = {
            "type": message_type,
            "content": message,
            "format": format_type
        }
        await websocket_connections[client_id].send_text(json.dumps(message_data))
        logger.info(f"Mensagem enviada para o cliente {json.dumps(message_data)}")
        return True
    except Exception as e:
        logger.error(f"Erro ao enviar mensagem para o cliente {client_id}: {e}")
        return False 