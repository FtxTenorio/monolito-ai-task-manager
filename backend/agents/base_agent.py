from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

class BaseAgent:
    def __init__(self, system_prompt="Você é um assistente útil e amigável. Responda de forma clara e concisa."):
        # Inicializar o modelo de linguagem
        self.llm = ChatOpenAI(
            temperature=0.7,
            model_name="gpt-4o-mini",
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # Inicializar o histórico de conversa
        self.conversation_history = [
            SystemMessage(content=system_prompt)
        ]
    
    def process_message(self, message):
        """
        Processa uma mensagem do usuário e retorna a resposta do agente.
        
        Args:
            message (str): A mensagem do usuário
            
        Returns:
            str: A resposta do agente
        """
        # Adicionar a mensagem do usuário ao histórico
        self.conversation_history.append(HumanMessage(content=message))
        
        # Obter resposta do modelo
        response = self.llm.invoke(self.conversation_history)
        response_text = response.content
        
        # Adicionar a resposta ao histórico
        self.conversation_history.append(AIMessage(content=response_text))
        
        return response_text
    
    def reset_conversation(self):
        """Reseta o histórico de conversa, mantendo apenas a mensagem do sistema."""
        system_message = self.conversation_history[0]
        self.conversation_history = [system_message] 