from .base_agent import BaseAgent
from .specialized.task_agent import TaskAgent
from .specialized.routine_agent import RoutineAgent
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain.tools import Tool
from typing import Dict, List, Any, Optional
import logging
import traceback
import time
from datetime import datetime
from .tools import get_available_tools
import asyncio
# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OrchestratorAgent(BaseAgent):
    def __init__(self, client_id: int):
        # Obter data atual
        today = datetime.now()
        date_str = today.strftime("%d/%m/%Y")
        
        # Mapeamento de dias da semana em português
        weekdays = {
            0: "Segunda-feira",
            1: "Terça-feira",
            2: "Quarta-feira",
            3: "Quinta-feira",
            4: "Sexta-feira",
            5: "Sábado",
            6: "Domingo"
        }
        weekday = weekdays[today.weekday()]
        
        system_prompt = f"""Você é um agente orquestrador que coordena outros agentes especializados.
        Data atual: {date_str} ({weekday})
        Sua função é analisar as mensagens dos usuários e direcioná-las para o agente apropriado.
        Você tem acesso a ferramentas para rotear mensagens para diferentes agentes especializados.
        Sempre forneça respostas claras e organizadas."""
        
        super().__init__(system_prompt, client_id=client_id)
        
        # Inicializar agentes especializados
        logger.info(f"OrchestratorAgent: Inicializando agentes especializados, client_id: {client_id}")
        self.task_agent = TaskAgent(client_id=client_id)
        self.routine_agent = RoutineAgent(client_id=client_id)
        orchestrator_agent_tools = get_available_tools(client_id)

        # Definir as ferramentas de roteamento
        logger.info("OrchestratorAgent: Configurando ferramentas de roteamento")
        self.tools = [
            *orchestrator_agent_tools,
            Tool(
                name="route_to_task_agent",
                func=self.route_to_task_agent,
                description="Roteia uma mensagem para o agente de tarefas. Use esta ferramenta quando a mensagem estiver relacionada a tarefas, como criar, listar, atualizar ou remover tarefas.",
            ),
            Tool(
                name="route_to_routine_agent",
                func=self.route_to_routine_agent,
                coroutine=self.route_to_routine_agent,
                description="Roteia uma mensagem para o agente de rotinas. Use esta ferramenta quando a mensagem estiver relacionada a rotinas, como criar, listar, atualizar ou remover rotinas.",
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
    
    def route_to_task_agent(self, message: str) -> str:
        """Roteia uma mensagem para o agente de tarefas de forma assíncrona."""
        try:
            start_time = time.time()
            logger.info(f"OrchestratorAgent: Iniciando route_to_task_agent com mensagem: {message}")
            
            # Filtrar mensagens do sistema do histórico de conversa
            filtered_history = [msg for msg in self.conversation_history if not isinstance(msg, SystemMessage)]
            
            # Chamar o método assíncrono do TaskAgent
            logger.info("OrchestratorAgent: Chamando process_message do TaskAgent")
            response = self.task_agent.process_message(message, chat_history=filtered_history)
            
            elapsed_time = time.time() - start_time
            logger.info(f"OrchestratorAgent: Resposta recebida do agente de tarefas em {elapsed_time:.2f}s: {response}")
            return response
                
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro ao rotear mensagem para o agente de tarefas após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"OrchestratorAgent: {error_msg}")
            logger.error(f"OrchestratorAgent: Traceback: {traceback.format_exc()}")
            return error_msg
    
    async def route_to_routine_agent(self, message: str) -> str:
        """Roteia uma mensagem para o agente de rotinas de forma síncrona."""
        try:
            start_time = time.time()
            logger.info(f"OrchestratorAgent: Iniciando route_to_routine_agent com mensagem: {message}")
            
            # Filtrar mensagens do sistema do histórico de conversa
            filtered_history = [msg for msg in self.conversation_history if not isinstance(msg, SystemMessage)]
            
            # Chamar diretamente o método assíncrono do RoutineAgent
            logger.info("OrchestratorAgent: Chamando process_message do RoutineAgent")
            response = await self.routine_agent.process_message(message, chat_history=filtered_history)
            
            elapsed_time = time.time() - start_time
            logger.info(f"OrchestratorAgent: Resposta recebida do agente de rotinas em {elapsed_time:.2f}s: {response}")
            return response
                
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro ao rotear mensagem para o agente de rotinas após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"OrchestratorAgent: {error_msg}")
            logger.error(f"OrchestratorAgent: Traceback: {traceback.format_exc()}")
            return error_msg
    
    async def process_message(self, message: str, response_format: str = "markdown", websocket=None):
        """Processa uma mensagem de forma síncrona."""
        try:
            start_time = time.time()
            logger.info(f"OrchestratorAgent: Processando mensagem: {message}")
            # Adicionar a mensagem do usuário ao histórico
            self.conversation_history.append(HumanMessage(content=message))
            
            # Obter resposta do agente
            logger.info("OrchestratorAgent: Invocando agent_executor")
            response = await self.agent_executor.ainvoke({
                "input": message,
                "chat_history": self.conversation_history[:-1]
            })
            
            response_text = response["output"]
            elapsed_time = time.time() - start_time
            logger.info(f"OrchestratorAgent: Resposta obtida em {elapsed_time:.2f}s: {response_text}")
            
            # Adicionar a resposta ao histórico
            self.conversation_history.append(AIMessage(content=response_text))
            
            return response_text
            
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_message = f"Erro ao processar mensagem após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"OrchestratorAgent: {error_message}")
            logger.error(f"OrchestratorAgent: Traceback: {traceback.format_exc()}")
            raise Exception(error_message) 