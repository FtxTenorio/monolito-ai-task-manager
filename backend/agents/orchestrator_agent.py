from .base_agent import BaseAgent
from .specialized.task_agent import TaskAgent
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain.tools import Tool
from typing import Dict, List, Any, Optional
import asyncio
import logging
import traceback

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OrchestratorAgent(BaseAgent):
    def __init__(self):
        system_prompt = """Você é um agente orquestrador que coordena outros agentes especializados.
        Sua função é analisar as mensagens dos usuários e direcioná-las para o agente apropriado.
        Você tem acesso a ferramentas para rotear mensagens para diferentes agentes especializados.
        Sempre forneça respostas claras e organizadas."""
        
        super().__init__(system_prompt)
        
        # Inicializar agentes especializados
        logger.info("OrchestratorAgent: Inicializando agentes especializados")
        self.task_agent = TaskAgent()
        
        # Definir as ferramentas de roteamento
        logger.info("OrchestratorAgent: Configurando ferramentas de roteamento")
        self.tools = [
            Tool(
                name="route_to_task_agent",
                func=self.route_to_task_agent_sync,
                description="Roteia uma mensagem para o agente de tarefas. Use esta ferramenta quando a mensagem estiver relacionada a tarefas, como criar, listar, atualizar ou remover tarefas."
            )
        ]
        
        # Criar o prompt para o agente
        logger.info("OrchestratorAgent: Configurando prompt do agente")
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        # Criar o agente
        logger.info("OrchestratorAgent: Criando agente com OpenAI Functions")
        self.agent = create_openai_functions_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=self.prompt
        )
        
        # Criar o executor do agente
        logger.info("OrchestratorAgent: Configurando executor do agente")
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            verbose=True
        )
    
    def route_to_task_agent_sync(self, message: str) -> str:
        """Versão síncrona que roteia uma mensagem para o agente de tarefas."""
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
                try:
                    result = future.result(timeout=10)  # Timeout de 10 segundos
                    logger.info(f"OrchestratorAgent: Resultado obtido de route_to_task_agent: {result}")
                    return result
                except asyncio.TimeoutError:
                    error_msg = "Timeout ao rotear mensagem para o agente de tarefas"
                    logger.error(f"OrchestratorAgent: {error_msg}")
                    return error_msg
            else:
                logger.info("OrchestratorAgent: Criando novo loop de eventos para route_to_task_agent")
                # Se não houver loop em execução, crie um novo
                return loop.run_until_complete(self.route_to_task_agent_async(message))
        except asyncio.TimeoutError as e:
            error_msg = f"Timeout ao rotear mensagem para o agente de tarefas: {str(e)}"
            logger.error(f"OrchestratorAgent: {error_msg}")
            return error_msg
        except asyncio.CancelledError as e:
            error_msg = f"Operação cancelada: {str(e)}"
            logger.error(f"OrchestratorAgent: {error_msg}")
            return error_msg
        except Exception as e:
            error_msg = f"Erro ao rotear mensagem para o agente de tarefas: {str(e)}"
            logger.error(f"OrchestratorAgent: {error_msg}")
            logger.error(f"OrchestratorAgent: Traceback: {traceback.format_exc()}")
            return error_msg
    
    async def route_to_task_agent_async(self, message: str) -> str:
        """Roteia uma mensagem para o agente de tarefas."""
        try:
            logger.info(f"OrchestratorAgent: Roteando mensagem para o agente de tarefas: {message}")
            response = await self.task_agent.process_message_async(message)
            logger.info(f"OrchestratorAgent: Resposta recebida do agente de tarefas: {response}")
            return response
        except Exception as e:
            error_msg = f"Erro ao rotear mensagem para o agente de tarefas: {str(e)}"
            logger.error(f"OrchestratorAgent: {error_msg}")
            logger.error(f"OrchestratorAgent: Traceback: {traceback.format_exc()}")
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
            logger.error(f"OrchestratorAgent: Traceback: {traceback.format_exc()}")
            raise Exception(error_message) 