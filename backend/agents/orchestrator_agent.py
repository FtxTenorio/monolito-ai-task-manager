from .base_agent import BaseAgent
from .specialized.task_agent import TaskAgent
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain.tools import Tool
from typing import Dict, List, Any, Optional
import asyncio

class OrchestratorAgent(BaseAgent):
    def __init__(self):
        system_prompt = """Você é um agente orquestrador responsável por analisar as solicitações dos usuários
        e direcioná-las para o agente especializado mais adequado.
        
        Você tem acesso aos seguintes agentes especializados:
        - TaskAgent: Para operações relacionadas a tarefas (criar, listar, atualizar, remover tarefas): o nome da ferramenta é route_to_task_agent
        
        Analise cuidadosamente a solicitação do usuário e determine qual agente especializado deve lidar com ela.
        Se a solicitação envolver múltiplas operações ou não estiver clara, você pode dividir em subtarefas e
        coordenar a execução entre os agentes especializados.
        
        Você deve responder com instruções para o agente de tarefas, para que ele possa processar a solicitação da melhor forma possível.

        Exemplo de instruções:
            Tool: route_to_task_agent
            - List all tasks → "Listar todas as tarefas"
            - Create a new task: :Buy groceries|High|Personal|Pending" → "Criar uma nova tarefa: Comprar mantimentos|Alta|Pessoal|Pendente"
            - Update task uuid: status=Completed → "Atualizar tarefa uuid: status=Concluído"
            - Delete task uuid → "Remover tarefa uuid"
        """
        
        super().__init__(system_prompt)
        
        # Inicializar agentes especializados
        self.specialized_agents = {
            "task": TaskAgent()
        }
        
        # Definir as ferramentas do orquestrador
        self.tools = [
            Tool(
                name="route_to_task_agent",
                func=self.route_to_task_agent_sync,
                description="Roteia a solicitação para o agente de tarefas. Use quando a solicitação envolver operações com tarefas."
            )
        ]
        
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
    
    def route_to_task_agent_sync(self, message: str) -> str:
        """Versão síncrona que roteia a solicitação para o agente de tarefas."""
        try:
            # Usar o loop de eventos existente
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Se o loop já estiver em execução, use o método assíncrono diretamente
                # Isso é um hack, mas funciona para o nosso caso
                future = asyncio.run_coroutine_threadsafe(
                    self.route_to_task_agent_async(message), 
                    loop
                )
                return future.result(timeout=10)  # Timeout de 10 segundos
            else:
                # Se não houver loop em execução, crie um novo
                return loop.run_until_complete(self.route_to_task_agent_async(message))
        except Exception as e:
            return f"Erro ao rotear para o agente de tarefas: {str(e)}"
    
    async def route_to_task_agent_async(self, message: str) -> str:
        """Versão assíncrona que roteia a solicitação para o agente de tarefas."""
        try:
            # Usar o método assíncrono do TaskAgent
            return await self.specialized_agents["task"].process_message_async(message)
        except Exception as e:
            return f"Erro ao rotear para o agente de tarefas: {str(e)}"
    
    async def process_message_async(self, message: str, response_format: str = "markdown", websocket=None):
        """Processa uma mensagem de forma assíncrona."""
        try:
            # Adicionar a mensagem do usuário ao histórico
            self.conversation_history.append(HumanMessage(content=message))
            
            # Obter resposta do agente
            response = self.agent_executor.invoke({
                "input": message,
                "chat_history": self.conversation_history[:-1]
            })
            
            response_text = response["output"]
            
            # Adicionar a resposta ao histórico
            self.conversation_history.append(AIMessage(content=response_text))
            
            return response_text
            
        except Exception as e:
            error_message = f"Erro ao processar mensagem: {str(e)}"
            raise Exception(error_message) 