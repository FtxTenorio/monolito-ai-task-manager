from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
import json
import os
from dotenv import load_dotenv
from agents import ToolAgent, calculate_similarity

# Carregar variáveis de ambiente
load_dotenv()

app = FastAPI()

# Histórico de conversas por cliente
conversation_histories = {}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Armazenar o último texto recebido
    last_text = ""
    
    # Inicializar o agente para este cliente
    client_id = id(websocket)
    if client_id not in conversation_histories:
        conversation_histories[client_id] = ToolAgent()
    
    while True:
        try:
            data = await websocket.receive_text()
            data_json = json.loads(data)
            
            # Verificar se é um texto ou um sinal de idle
            if "text" in data_json:
                current_text = data_json["text"]
                
                # Calcular a similaridade com o último texto
                similarity = calculate_similarity(last_text, current_text)
                
                # Só aceitar se a similaridade for menor que 90% (ou seja, diferença maior que 10%)
                if similarity < 0.9:
                    print(f"Recebido: {data} (Similaridade: {similarity:.2f})")
                    
                    # Processar o texto com o agente
                    try:
                        # Obter resposta do agente
                        response_text = conversation_histories[client_id].process_message(current_text)
                        
                        print(f"Resposta: {response_text}")
                        
                        # Enviar a resposta de volta para o frontend
                        await websocket.send_text(json.dumps({"response": response_text}))
                    except Exception as e:
                        print(f"Erro ao processar com o agente: {e}")
                        await websocket.send_text(json.dumps({"error": "Erro ao processar sua solicitação."}))
                    
                    last_text = current_text
                else:
                    print(f"Ignorado: {data} (Similaridade: {similarity:.2f})")
            elif "idle" in data_json:
                print(f"Recebido: {data} (Sinal de idle)")
        except Exception as e:
            print(f"Erro ao processar mensagem: {e}")
