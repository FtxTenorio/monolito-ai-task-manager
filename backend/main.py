from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
import json
import os
import signal
import sys
import asyncio
from typing import Dict, Set
from dotenv import load_dotenv
from agents import ToolAgent, calculate_similarity

# Carregar variáveis de ambiente
load_dotenv()

app = FastAPI()

# Gerenciador de conexões WebSocket
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}
        self.agents: Dict[int, ToolAgent] = {}
        self.last_texts: Dict[int, str] = {}
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        client_id = id(websocket)
        self.active_connections[client_id] = websocket
        self.agents[client_id] = ToolAgent()
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
    
    async def process_message(self, client_id: int, message: str):
        if client_id not in self.active_connections:
            return
        
        current_text = message
        last_text = self.last_texts[client_id]
        
        # Calcular a similaridade com o último texto
        similarity = calculate_similarity(last_text, current_text)
        
        # Só aceitar se a similaridade for menor que 90% (ou seja, diferença maior que 10%)
        if similarity < 0.9:
            print(f"Recebido: {message} (Similaridade: {similarity:.2f})")
            
            try:
                # Obter resposta do agente
                response_text = self.agents[client_id].process_message(current_text)
                
                print(f"Resposta: {response_text}")
                
                # Enviar a resposta de volta para o frontend
                await self.active_connections[client_id].send_text(
                    json.dumps({"response": response_text})
                )
                
                # Atualizar o último texto
                self.last_texts[client_id] = current_text
            except Exception as e:
                print(f"Erro ao processar com o agente: {e}")
                await self.active_connections[client_id].send_text(
                    json.dumps({"error": "Erro ao processar sua solicitação."})
                )
        else:
            print(f"Ignorado: {message} (Similaridade: {similarity:.2f})")

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
                    await manager.process_message(client_id, data_json["text"])
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
