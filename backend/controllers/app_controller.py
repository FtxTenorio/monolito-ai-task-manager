import json
import logging
import traceback
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from agents.orchestrator_agent import OrchestratorAgent
from agents.specialized.task_agent import TaskAgent
from agents.specialized.routine_agent import RoutineAgent
from utils.connection_manager import connection_manager

# Configurar logging
logger = logging.getLogger(__name__)

# Criar router para as rotas da aplicação
router = APIRouter(tags=["app"])

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    client_id = id(websocket)
    await connection_manager.connect(websocket)
    
    try:
        while True:
            try:
                data = await websocket.receive_text()
                logger.info(f"Recebido do WebSocket: {data}")
                data_json = json.loads(data)
                logger.info(f"Dados JSON: {data_json}")
                
                if "text" in data_json:
                    # Extrair o formato da resposta, padrão é markdown
                    response_format = data_json.get("format", "markdown")
                    logger.info(f"Processando mensagem: {data_json['text']} com formato: {response_format}")
                    await connection_manager.process_message(client_id, data_json["text"], response_format)
                elif "content" in data_json:
                    # Compatibilidade com o formato anterior
                    response_format = data_json.get("format", "markdown")
                    logger.info(f"Processando mensagem (formato antigo): {data_json['content']} com formato: {response_format}")
                    await connection_manager.process_message(client_id, data_json["content"], response_format)
                elif "idle" in data_json:
                    logger.info(f"Recebido: {data_json} (Sinal de idle)")
                else:
                    logger.warning(f"Formato de mensagem desconhecido: {data_json}")
            except WebSocketDisconnect:
                connection_manager.disconnect(client_id)
                break
            except Exception as e:
                logger.error(f"Erro ao processar mensagem: {e}")
                logger.error(f"Traceback: {traceback.format_exc()}")
                break
    except Exception as e:
        logger.error(f"Erro na conexão WebSocket: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
    finally:
        if client_id in await connection_manager.active_connections():
            connection_manager.disconnect(client_id)

def initialize_agents():
    """Inicializa os agentes necessários."""
    try:
        logger.info("Inicializando agentes...")
        orchestrator = OrchestratorAgent()
        task_agent = TaskAgent()
        routine_agent = RoutineAgent()
        logger.info("Agentes inicializados com sucesso!")
        return orchestrator, task_agent, routine_agent
    except Exception as e:
        logger.error(f"Erro ao inicializar agentes: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise

async def process_message(message: str, orchestrator: OrchestratorAgent) -> str:
    """Processa uma mensagem usando o agente orquestrador."""
    try:
        logger.info(f"Processando mensagem: {message}")
        response = await orchestrator.process_message(message)
        logger.info(f"Resposta: {response}")
        return response
    except Exception as e:
        logger.error(f"Erro ao processar mensagem: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return f"Erro ao processar mensagem: {str(e)}" 