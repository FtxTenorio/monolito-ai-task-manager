from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from .base_agent import BaseAgent
from .tools import get_available_tools, format_response
import json

class ToolAgent(BaseAgent):
    def __init__(self, system_prompt="Você é um assistente útil e amigável com acesso a ferramentas. Use as ferramentas disponíveis quando necessário para fornecer respostas mais precisas e atualizadas."):
        super().__init__(system_prompt)
        
        # Obter as ferramentas disponíveis
        self.tools = get_available_tools()
        
        # Criar o prompt para o agente
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        # Criar o agente
        self.agent = create_openai_functions_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=self.prompt
        )
        
        # Criar o executor do agente
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            verbose=True
        )
    
    def process_message(self, message, response_format="markdown", websocket=None):
        """
        Processa uma mensagem do usuário usando o agente com ferramentas.
        
        Args:
            message (str): A mensagem do usuário
            response_format (str): Formato da resposta (markdown, text, html)
            websocket: WebSocket para enviar atualizações em tempo real
            
        Returns:
            str: A resposta do agente formatada
        """
        # Adicionar a mensagem do usuário ao histórico
        self.conversation_history.append(HumanMessage(content=message))
        
        # Função para enviar atualizações
        def send_update(update_type, content):
            if websocket:
                try:
                    websocket.send_text(json.dumps({
                        "type": "thinking",
                        "update_type": update_type,
                        "content": content
                    }))
                except Exception as e:
                    print(f"Erro ao enviar atualização: {e}")
        
        # Obter resposta do agente
        try:
            # Enviar atualização de início do processamento
            send_update("start", "Iniciando processamento da sua solicitação...")
            
            # Configurar callback para atualizações
            def on_tool_start(tool_name):
                send_update("tool_start", f"Usando ferramenta: {tool_name}")
            
            def on_tool_end(tool_name, output):
                send_update("tool_end", f"Resultado da ferramenta {tool_name}: {output}")
            
            def on_chain_start(chain_name):
                send_update("chain_start", f"Iniciando cadeia de processamento: {chain_name}")
            
            def on_chain_end(chain_name, output):
                send_update("chain_end", f"Concluído: {chain_name}")
            
            # Configurar callbacks no executor
            self.agent_executor.callbacks = {
                "on_tool_start": on_tool_start,
                "on_tool_end": on_tool_end,
                "on_chain_start": on_chain_start,
                "on_chain_end": on_chain_end
            }
            
            # Obter resposta
            response = self.agent_executor.invoke({
                "input": message,
                "chat_history": self.conversation_history[:-1]  # Excluir a mensagem atual
            })
            
            response_text = response["output"]
            
            # Formatar a resposta de acordo com o formato solicitado
            formatted_response = format_response(response_text, response_format)
            
            # Adicionar a resposta ao histórico (mantém o formato original para o histórico)
            self.conversation_history.append(AIMessage(content=response_text))
            
            # Enviar atualização de conclusão
            send_update("complete", "Processamento concluído!")
            
            return formatted_response
            
        except Exception as e:
            error_message = f"Erro ao processar mensagem: {str(e)}"
            send_update("error", error_message)
            raise Exception(error_message) 