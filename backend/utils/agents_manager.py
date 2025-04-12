import json
import logging
from typing import Dict, Any
from fastapi import WebSocket
from agents.orchestrator_agent import OrchestratorAgent
from utils.websocket_utils import send_websocket_message

# Configurar logging
logger = logging.getLogger(__name__)

class AgentsManager:
    def __init__(self):
        self.agents: Dict[int, OrchestratorAgent] = {}
        self.last_texts: Dict[int, str] = {}
    
    def create_agent(self, client_id: int) -> None:
        """Cria um novo agente para o cliente."""
        self.agents[client_id] = OrchestratorAgent(client_id=client_id)
        self.last_texts[client_id] = ""
        logger.info(f"Agente criado para o cliente: {client_id}")
    
    def remove_agent(self, client_id: int) -> None:
        """Remove o agente do cliente."""
        if client_id in self.agents:
            del self.agents[client_id]
        if client_id in self.last_texts:
            del self.last_texts[client_id]
        logger.info(f"Agente removido para o cliente: {client_id}")
    
    async def process_message(self, client_id: int, message: str, websocket: WebSocket, response_format: str = "markdown") -> None:
        """Processa uma mensagem usando o agente do cliente."""
        if client_id not in self.agents:
            logger.error(f"Cliente {client_id} não tem um agente associado")
            return
        
        current_text = message
        last_text = self.last_texts[client_id]
        
        try:
            # Obter resposta do agente orquestrador com o formato especificado
            response_text = await self.agents[client_id].process_message(
                current_text, 
                response_format,
                websocket
            )
            
            logger.info(f"Resposta: {response_text}")
            
            # Enviar a resposta de volta para o frontend
            await send_websocket_message(
                response_text, 
                client_id, 
                "message", 
                response_format
            )
            
            # Atualizar o último texto
            self.last_texts[client_id] = current_text
        except Exception as e:
            logger.error(f"Erro ao processar com o agente: {e}")
            await send_websocket_message(
                "Erro ao processar sua solicitação.", 
                client_id, 
                "error"
            )

# Instância global do gerenciador de agentes
agents_manager = AgentsManager() 