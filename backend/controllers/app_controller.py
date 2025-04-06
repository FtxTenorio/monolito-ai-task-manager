import json
import logging
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from agents.orchestrator_agent import OrchestratorAgent
from agents.specialized.task_agent import TaskAgent
from agents.specialized.routine_agent import RoutineAgent

# Configurar logging
logger = logging.getLogger(__name__)

# Criar router para as rotas da aplicação
router = APIRouter(tags=["app"])

# Gerenciador de conexões WebSocket
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}
        self.agents: Dict[int, OrchestratorAgent] = {}
        self.last_texts: Dict[int, str] = {}
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        client_id = id(websocket)
        self.active_connections[client_id] = websocket
        self.agents[client_id] = OrchestratorAgent()
        self.last_texts[client_id] = ""
        print(f"Cliente conectado: {client_id}")
    
    def disconnect(self, client_id: int):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.agents:
            del self.agents[client_id]
        if client_id in self.last_texts:
            del self.last_texts[client_id]
        print(f"Cliente desconectado: {client_id}")
    
    async def process_message(self, client_id: int, message: str, response_format: str = "markdown"):
        if client_id not in self.active_connections:
            return
        
        current_text = message
        last_text = self.last_texts[client_id]
        
        try:
            # Obter resposta do agente orquestrador com o formato especificado
            response_text = self.agents[client_id].process_message(
                current_text, 
                response_format,
                self.active_connections[client_id]
            )
            
            print(f"Resposta: {response_text}")
            
            # Enviar a resposta de volta para o frontend
            message_data = {
                "type": "message",
                "content": response_text,
                "format": response_format
            }
            print(f"Enviando mensagem para o frontend: {json.dumps(message_data)}")
            await self.active_connections[client_id].send_text(
                json.dumps(message_data)
            )
            
            # Atualizar o último texto
            self.last_texts[client_id] = current_text
        except Exception as e:
            print(f"Erro ao processar com o agente: {e}")
            await self.active_connections[client_id].send_text(
                json.dumps({
                    "type": "error",
                    "content": "Erro ao processar sua solicitação."
                })
            )

# Criar o gerenciador de conexões
manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    client_id = id(websocket)
    await manager.connect(websocket)
    
    try:
        while True:
            try:
                data = await websocket.receive_text()
                print(f"Recebido do WebSocket: {data}")
                data_json = json.loads(data)
                print(f"Dados JSON: {data_json}")
                
                if "text" in data_json:
                    # Extrair o formato da resposta, padrão é markdown
                    response_format = data_json.get("format", "markdown")
                    print(f"Processando mensagem: {data_json['text']} com formato: {response_format}")
                    await manager.process_message(client_id, data_json["text"], response_format)
                elif "content" in data_json:
                    # Compatibilidade com o formato anterior
                    response_format = data_json.get("format", "markdown")
                    print(f"Processando mensagem (formato antigo): {data_json['content']} com formato: {response_format}")
                    await manager.process_message(client_id, data_json["content"], response_format)
                elif "idle" in data_json:
                    print(f"Recebido: {data_json} (Sinal de idle)")
                else:
                    print(f"Formato de mensagem desconhecido: {data_json}")
            except WebSocketDisconnect:
                manager.disconnect(client_id)
                break
            except Exception as e:
                print(f"Erro ao processar mensagem: {e}")
                print(f"Traceback: {traceback.format_exc()}")
                break
    except Exception as e:
        print(f"Erro na conexão WebSocket: {e}")
        print(f"Traceback: {traceback.format_exc()}")
    finally:
        if client_id in manager.active_connections:
            manager.disconnect(client_id)

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

def process_message(message: str, orchestrator: OrchestratorAgent) -> str:
    """Processa uma mensagem usando o agente orquestrador."""
    try:
        logger.info(f"Processando mensagem: {message}")
        response = orchestrator.process_message(message)
        logger.info(f"Resposta: {response}")
        return response
    except Exception as e:
        logger.error(f"Erro ao processar mensagem: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return f"Erro ao processar mensagem: {str(e)}" 