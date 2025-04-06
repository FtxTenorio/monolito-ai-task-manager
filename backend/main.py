from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
import json
import os
import signal
import sys
import asyncio
from typing import Dict, Set
from dotenv import load_dotenv
from agents.orchestrator_agent import OrchestratorAgent
from agents.specialized.task_agent import TaskAgent
from agents.specialized.routine_agent import RoutineAgent
import logging
import traceback

# Carregar variáveis de ambiente
load_dotenv()

app = FastAPI()

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
        
        # Calcular a similaridade com o último texto
        # similarity = calculate_similarity(last_text, current_text)
        
        # Só aceitar se a similaridade for menor que 90% (ou seja, diferença maior que 10%)
        # print(f"Recebido: {message} (Similaridade: {similarity:.2f})")
        
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

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    client_id = id(websocket)
    await manager.connect(websocket)
    
    try:
        while server_running:
            try:
                data = await websocket.receive_text()
                data_json = json.loads(data)
                
                if "text" in data_json:
                    # Extrair o formato da resposta, padrão é markdown
                    response_format = data_json.get("format", "markdown")
                    await manager.process_message(client_id, data_json["text"], response_format)
                elif "idle" in data_json:
                    print(f"Recebido: {data_json} (Sinal de idle)")
            except WebSocketDisconnect:
                manager.disconnect(client_id)
                break
            except Exception as e:
                print(f"Erro ao processar mensagem: {e}")
                break
    except Exception as e:
        print(f"Erro na conexão WebSocket: {e}")
    finally:
        if client_id in manager.active_connections:
            manager.disconnect(client_id)

def main():
    """Função principal."""
    try:
        # Inicializar agentes
        orchestrator, task_agent, routine_agent = initialize_agents()
        
        # Configurar servidor WebSocket
        app = FastAPI()
        
        @app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            await websocket.accept()
            try:
                while True:
                    message = await websocket.receive_text()
                    response = process_message(message, orchestrator)
                    await websocket.send_text(json.dumps({
                        "type": "message",
                        "content": response,
                        "format": "markdown"
                    }))
            except WebSocketDisconnect:
                logger.info("Cliente WebSocket desconectado")
            except Exception as e:
                logger.error(f"Erro no WebSocket: {str(e)}")
                logger.error(f"Traceback: {traceback.format_exc()}")
                
        # Iniciar servidor
        uvicorn.run(app, host="0.0.0.0", port=8000)
        
    except Exception as e:
        logger.error(f"Erro na função principal: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise

if __name__ == "__main__":
    main()
