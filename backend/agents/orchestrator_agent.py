from .base_agent import BaseAgent
from .specialized.task_agent import TaskAgent
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain.tools import Tool
from typing import Dict, List, Any, Optional
import asyncio
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
        logger.info("OrchestratorAgent: Inicializando agentes especializados")
        self.specialized_agents = {
            "task": TaskAgent()
        }
        
        # Definir as ferramentas do orquestrador
        logger.info("OrchestratorAgent: Configurando ferramentas")
        self.tools = [
            Tool(
                name="route_to_task_agent",
                func=self.route_to_task_agent_sync,
                description="Roteia a solicitação para o agente de tarefas. Use quando a solicitação envolver operações com tarefas."
            )
        ]
        
        # Criar o prompt para o agente
        logger.info("OrchestratorAgent: Configurando prompt")
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        # Criar o agente
        logger.info("OrchestratorAgent: Criando agente")
        self.agent = create_openai_functions_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=self.prompt
        )
        
        # Criar o executor do agente
        logger.info("OrchestratorAgent: Criando executor do agente")
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            verbose=True
        )
    
    def route_to_task_agent_sync(self, message: str) -> str:
        """Versão síncrona que roteia a solicitação para o agente de tarefas."""
        try:
            logger.info(f"OrchestratorAgent: Iniciando route_to_task_agent_sync com mensagem: {message}")
            # Usar o loop de eventos existente
            loop = asyncio.get_event_loop()
            if loop.is_running():
                logger.info("OrchestratorAgent: Loop de eventos já está em execução, usando run_coroutine_threadsafe")
                # Se o loop já estiver em execução, use o método assíncrono diretamente
                future = asyncio.run_coroutine_threadsafe(
                    self.route_to_task_agent_async(message), 
                    loop
                )
                return future.result(timeout=10)  # Timeout de 10 segundos
            else:
                logger.info("OrchestratorAgent: Criando novo loop de eventos para route_to_task_agent")
                # Se não houver loop em execução, crie um novo
                return loop.run_until_complete(self.route_to_task_agent_async(message))
        except Exception as e:
            error_msg = f"Erro ao rotear para o agente de tarefas: {str(e)}"
            logger.error(f"OrchestratorAgent: {error_msg}")
            return error_msg
    
    async def route_to_task_agent_async(self, message: str) -> str:
        """Versão assíncrona que roteia a solicitação para o agente de tarefas."""
        try:
            logger.info(f"OrchestratorAgent: Roteando mensagem para TaskAgent: {message}")
            # Usar o método assíncrono do TaskAgent
            response = await self.specialized_agents["task"].process_message_async(message)
            logger.info(f"OrchestratorAgent: Resposta recebida do TaskAgent: {response}")
            return response
        except Exception as e:
            error_msg = f"Erro ao rotear para o agente de tarefas: {str(e)}"
            logger.error(f"OrchestratorAgent: {error_msg}")
            return error_msg
    
    async def process_message_async(self, message: str, response_format: str = "markdown", websocket=None):
        """Processa uma mensagem de forma assíncrona."""
        try:
            logger.info(f"OrchestratorAgent: Processando mensagem: {message}")
            # Adicionar a mensagem do usuário ao histórico
            self.conversation_history.append(HumanMessage(content=message))
            
            # Obter resposta do agente
            logger.info("OrchestratorAgent: Invocando agent_executor")
            response = self.agent_executor.invoke({
                "input": message,
                "chat_history": self.conversation_history[:-1]
            })
            
            response_text = response["output"]
            logger.info(f"OrchestratorAgent: Resposta obtida: {response_text}")
            
            # Adicionar a resposta ao histórico
            self.conversation_history.append(AIMessage(content=response_text))
            
            return response_text
            
        except Exception as e:
            error_message = f"Erro ao processar mensagem: {str(e)}"
            logger.error(f"OrchestratorAgent: {error_message}")
            raise Exception(error_message) 