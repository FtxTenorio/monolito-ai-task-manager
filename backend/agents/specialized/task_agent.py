from ..base_agent import BaseAgent
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain.tools import Tool
import requests
import json
import asyncio
import logging
import traceback
import time
import aiohttp
from typing import Dict, List, Any, Optional

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TaskAgent(BaseAgent):
    def __init__(self):
        system_prompt = """Você é um agente especializado em gerenciamento de tarefas.
        Sua função é ajudar a criar, listar, atualizar e remover tarefas.
        Você tem acesso a uma API de tarefas e deve usar as ferramentas disponíveis para realizar essas operações.
        Sempre forneça respostas claras e organizadas."""
        
        super().__init__(system_prompt)
        
        # Definir as ferramentas específicas para tarefas
        self.tools = [
            Tool(
                name="get_tasks",
                func=self.get_tasks_sync,
                description="Obtém a lista de todas as tarefas. Retorna ID, Descrição, Prioridade, Categoria, Status e Data de Criação de cada tarefa."
            ),
            Tool(
                name="create_task",
                func=self.create_task_sync,
                description="Cria uma nova tarefa. Use o formato: 'descrição|prioridade|categoria|status'. Exemplo: 'Fazer compras|Alta|Pessoal|Pendente'"
            ),
            Tool(
                name="update_task",
                func=self.update_task_sync,
                description="Atualiza uma tarefa existente. Use o formato: 'task_id|campo1=valor1|campo2=valor2|...'. Exemplo: '123|descrição=Nova descrição|status=Concluído'"
            ),
            Tool(
                name="delete_task",
                func=self.delete_task_sync,
                description="Remove uma tarefa. Parâmetro: task_id (string)"
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
        
        # Criar um loop de eventos dedicado para operações assíncronas
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        
        # Criar uma sessão HTTP assíncrona
        self.session = None
    
    async def _get_session(self):
        """Obtém ou cria uma sessão HTTP assíncrona."""
        if self.session is None:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def _close_session(self):
        """Fecha a sessão HTTP assíncrona."""
        if self.session is not None:
            await self.session.close()
            self.session = None
    
    def get_tasks_sync(self, query: str = "") -> str:
        """Versão síncrona que obtém a lista de todas as tarefas."""
        try:
            start_time = time.time()
            logger.info(f"TaskAgent: Iniciando get_tasks_sync com query: {query}")
            
            # Usar o loop de eventos dedicado
            if self.loop.is_running():
                logger.info("TaskAgent: Loop de eventos já está em execução, usando run_coroutine_threadsafe")
                # Se o loop já estiver em execução, use o método assíncrono diretamente
                future = asyncio.run_coroutine_threadsafe(
                    self.get_tasks(query), 
                    self.loop
                )
                try:
                    logger.info("TaskAgent: Aguardando resultado do get_tasks (timeout: 30s)")
                    result = future.result(timeout=30)  # Aumentado para 30 segundos
                    elapsed_time = time.time() - start_time
                    logger.info(f"TaskAgent: Resultado obtido de get_tasks em {elapsed_time:.2f}s: {result}")
                    return result
                except asyncio.TimeoutError:
                    elapsed_time = time.time() - start_time
                    error_msg = f"Timeout ao obter tarefas após {elapsed_time:.2f}s"
                    logger.error(f"TaskAgent: {error_msg}")
                    return error_msg
            else:
                logger.info("TaskAgent: Usando loop de eventos dedicado para get_tasks")
                # Usar o loop dedicado
                result = self.loop.run_until_complete(self.get_tasks(query))
                elapsed_time = time.time() - start_time
                logger.info(f"TaskAgent: Resultado obtido de get_tasks em {elapsed_time:.2f}s: {result}")
                return result
        except asyncio.TimeoutError as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Timeout ao obter tarefas após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            return error_msg
        except asyncio.CancelledError as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Operação cancelada após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            return error_msg
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro ao obter tarefas após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            return error_msg
    
    async def get_tasks(self, query: str = "") -> str:
        """Obtém a lista de todas as tarefas."""
        try:
            start_time = time.time()
            logger.info(f"TaskAgent: Fazendo requisição GET para /lambda/tasks")
            
            # Usar a sessão HTTP assíncrona
            session = await self._get_session()
            
            # Criar uma task para a requisição HTTP
            async with session.get('https://api.itenorio.com/lambda/tasks') as response:
                logger.info(f"TaskAgent: Status code da resposta: {response.status}")
                
                if response.status != 200:
                    error_msg = f"Erro na API: Status code {response.status}"
                    logger.error(f"TaskAgent: {error_msg}")
                    return error_msg
                
                # Obter o JSON da resposta
                data = await response.json()
                tasks = data.get('body', {}).get('Items', [])
                logger.info(f"TaskAgent: Número de tarefas encontradas: {len(tasks)}")
                
                if not tasks:
                    return "Não há tarefas cadastradas."
                
                result = "Lista de Tarefas:\n\n"
                for task in tasks:
                    result += f"ID: {task.get('ID')}\n"
                    result += f"Descrição: {task.get('Descrição')}\n"
                    result += f"Prioridade: {task.get('Prioridade')}\n"
                    result += f"Categoria: {task.get('Categoria')}\n"
                    result += f"Status: {task.get('Status')}\n"
                    result += f"Data de Criação: {task.get('Data de Criação')}\n"
                    result += "---\n"
                
                elapsed_time = time.time() - start_time
                logger.info(f"TaskAgent: Operação get_tasks concluída em {elapsed_time:.2f}s")
                return result
        except aiohttp.ClientError as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro na requisição HTTP após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            return error_msg
        except json.JSONDecodeError as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro ao decodificar JSON da resposta após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            return error_msg
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro inesperado ao obter tarefas após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            return error_msg
    
    def create_task_sync(self, input_str: str) -> str:
        """Versão síncrona que cria uma nova tarefa."""
        try:
            start_time = time.time()
            logger.info(f"TaskAgent: Iniciando create_task_sync com input: {input_str}")
            
            # Usar o loop de eventos dedicado
            if self.loop.is_running():
                logger.info("TaskAgent: Loop de eventos já está em execução, usando run_coroutine_threadsafe")
                # Se o loop já estiver em execução, use o método assíncrono diretamente
                future = asyncio.run_coroutine_threadsafe(
                    self.create_task(input_str), 
                    self.loop
                )
                try:
                    logger.info("TaskAgent: Aguardando resultado do create_task (timeout: 30s)")
                    result = future.result(timeout=30)  # Aumentado para 30 segundos
                    elapsed_time = time.time() - start_time
                    logger.info(f"TaskAgent: Resultado obtido de create_task em {elapsed_time:.2f}s: {result}")
                    return result
                except asyncio.TimeoutError:
                    elapsed_time = time.time() - start_time
                    error_msg = f"Timeout ao criar tarefa após {elapsed_time:.2f}s"
                    logger.error(f"TaskAgent: {error_msg}")
                    return error_msg
            else:
                logger.info("TaskAgent: Usando loop de eventos dedicado para create_task")
                # Usar o loop dedicado
                result = self.loop.run_until_complete(self.create_task(input_str))
                elapsed_time = time.time() - start_time
                logger.info(f"TaskAgent: Resultado obtido de create_task em {elapsed_time:.2f}s: {result}")
                return result
        except asyncio.TimeoutError as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Timeout ao criar tarefa após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            return error_msg
        except asyncio.CancelledError as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Operação cancelada após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            return error_msg
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro ao criar tarefa após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            return error_msg
    
    async def create_task(self, input_str: str) -> str:
        """Cria uma nova tarefa."""
        try:
            start_time = time.time()
            logger.info(f"TaskAgent: Processando input para criar tarefa: {input_str}")
            parts = input_str.split("|")
            
            if len(parts) != 4:
                error_msg = "Erro: Formato inválido. Use 'descrição|prioridade|categoria|status'"
                logger.error(f"TaskAgent: {error_msg}")
                return error_msg
            
            descricao, prioridade, categoria, status = parts
            
            # Normalizar valores
            prioridade = prioridade.strip()
            categoria = categoria.strip()
            status = status.strip()
            
            # Validar valores aceitos
            if prioridade not in ["Alta", "Média", "Baixa"]:
                error_msg = "Erro: Prioridade deve ser 'Alta', 'Média' ou 'Baixa'"
                logger.error(f"TaskAgent: {error_msg}")
                return error_msg
            
            if status not in ["Pendente", "Concluído"]:
                error_msg = "Erro: Status deve ser 'Pendente' ou 'Concluído'"
                logger.error(f"TaskAgent: {error_msg}")
                return error_msg
            
            task_data = {
                "descricao": descricao,
                "prioridade": prioridade,
                "categoria": categoria,
                "status": status
            }
            
            logger.info(f"TaskAgent: Enviando requisição POST para criar tarefa: {task_data}")
            
            # Usar a sessão HTTP assíncrona
            session = await self._get_session()
            
            # Criar uma task para a requisição HTTP
            async with session.post('https://api.itenorio.com/lambda/tasks', json=task_data) as response:
                logger.info(f"TaskAgent: Status code da resposta: {response.status}")
                
                if response.status == 200:
                    elapsed_time = time.time() - start_time
                    logger.info(f"TaskAgent: Tarefa criada com sucesso em {elapsed_time:.2f}s")
                    return "Tarefa criada com sucesso!"
                else:
                    response_text = await response.text()
                    error_msg = f"Erro ao criar tarefa: {response_text}"
                    logger.error(f"TaskAgent: {error_msg}")
                    return error_msg
        except aiohttp.ClientError as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro na requisição HTTP após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            return error_msg
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro inesperado ao criar tarefa após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            return error_msg
    
    def update_task_sync(self, input_str: str) -> str:
        """Versão síncrona que atualiza uma tarefa existente."""
        try:
            start_time = time.time()
            logger.info(f"TaskAgent: Iniciando update_task_sync com input: {input_str}")
            
            # Usar o loop de eventos dedicado
            if self.loop.is_running():
                logger.info("TaskAgent: Loop de eventos já está em execução, usando run_coroutine_threadsafe")
                # Se o loop já estiver em execução, use o método assíncrono diretamente
                future = asyncio.run_coroutine_threadsafe(
                    self.update_task(input_str), 
                    self.loop
                )
                try:
                    logger.info("TaskAgent: Aguardando resultado do update_task (timeout: 30s)")
                    result = future.result(timeout=30)  # Aumentado para 30 segundos
                    elapsed_time = time.time() - start_time
                    logger.info(f"TaskAgent: Resultado obtido de update_task em {elapsed_time:.2f}s: {result}")
                    return result
                except asyncio.TimeoutError:
                    elapsed_time = time.time() - start_time
                    error_msg = f"Timeout ao atualizar tarefa após {elapsed_time:.2f}s"
                    logger.error(f"TaskAgent: {error_msg}")
                    return error_msg
            else:
                logger.info("TaskAgent: Usando loop de eventos dedicado para update_task")
                # Usar o loop dedicado
                result = self.loop.run_until_complete(self.update_task(input_str))
                elapsed_time = time.time() - start_time
                logger.info(f"TaskAgent: Resultado obtido de update_task em {elapsed_time:.2f}s: {result}")
                return result
        except asyncio.TimeoutError as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Timeout ao atualizar tarefa após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            return error_msg
        except asyncio.CancelledError as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Operação cancelada após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            return error_msg
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro ao atualizar tarefa após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            return error_msg
    
    async def update_task(self, input_str: str) -> str:
        """Atualiza uma tarefa existente."""
        try:
            start_time = time.time()
            logger.info(f"TaskAgent: Processando input para atualizar tarefa: {input_str}")
            parts = input_str.split("|")
            if len(parts) < 2:
                error_msg = "Erro: Formato inválido. Use 'task_id|campo1=valor1|campo2=valor2|...'"
                logger.error(f"TaskAgent: {error_msg}")
                return error_msg
            
            task_id = parts[0]
            formatted_task = {}
            field_mapping = {
                "descrição": "descricao",
                "prioridade": "prioridade",
                "categoria": "categoria",
                "status": "status"
            }
            
            for part in parts[1:]:
                if "=" in part:
                    key, value = part.split("=", 1)
                    key = key.lower().strip()
                    if key in field_mapping:
                        formatted_task[field_mapping[key]] = value
            
            if "prioridade" in formatted_task and formatted_task["prioridade"] not in ["Alta", "Média", "Baixa"]:
                error_msg = "Erro: Prioridade deve ser 'Alta', 'Média' ou 'Baixa'"
                logger.error(f"TaskAgent: {error_msg}")
                return error_msg
            
            if "status" in formatted_task and formatted_task["status"] not in ["Pendente", "Concluído"]:
                error_msg = "Erro: Status deve ser 'Pendente' ou 'Concluído'"
                logger.error(f"TaskAgent: {error_msg}")
                return error_msg
            
            if not formatted_task:
                error_msg = "Nenhum campo válido para atualização fornecido."
                logger.error(f"TaskAgent: {error_msg}")
                return error_msg
            
            logger.info(f"TaskAgent: Enviando requisição PATCH para atualizar tarefa {task_id}: {formatted_task}")
            
            # Usar a sessão HTTP assíncrona
            session = await self._get_session()
            
            # Criar uma task para a requisição HTTP
            async with session.patch(f'https://api.itenorio.com/lambda/tasks/{task_id}', json=formatted_task) as response:
                logger.info(f"TaskAgent: Status code da resposta: {response.status}")
                
                if response.status == 200:
                    elapsed_time = time.time() - start_time
                    logger.info(f"TaskAgent: Tarefa atualizada com sucesso em {elapsed_time:.2f}s")
                    return "Tarefa atualizada com sucesso!"
                else:
                    response_text = await response.text()
                    error_msg = f"Erro ao atualizar tarefa: {response_text}"
                    logger.error(f"TaskAgent: {error_msg}")
                    return error_msg
        except aiohttp.ClientError as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro na requisição HTTP após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            return error_msg
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro inesperado ao atualizar tarefa após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            return error_msg
    
    def delete_task_sync(self, task_id: str) -> str:
        """Versão síncrona que remove uma tarefa."""
        try:
            start_time = time.time()
            logger.info(f"TaskAgent: Iniciando delete_task_sync para task_id: {task_id}")
            
            # Usar o loop de eventos dedicado
            if self.loop.is_running():
                logger.info("TaskAgent: Loop de eventos já está em execução, usando run_coroutine_threadsafe")
                # Se o loop já estiver em execução, use o método assíncrono diretamente
                future = asyncio.run_coroutine_threadsafe(
                    self.delete_task(task_id), 
                    self.loop
                )
                try:
                    logger.info("TaskAgent: Aguardando resultado do delete_task (timeout: 30s)")
                    result = future.result(timeout=30)  # Aumentado para 30 segundos
                    elapsed_time = time.time() - start_time
                    logger.info(f"TaskAgent: Resultado obtido de delete_task em {elapsed_time:.2f}s: {result}")
                    return result
                except asyncio.TimeoutError:
                    elapsed_time = time.time() - start_time
                    error_msg = f"Timeout ao remover tarefa após {elapsed_time:.2f}s"
                    logger.error(f"TaskAgent: {error_msg}")
                    return error_msg
            else:
                logger.info("TaskAgent: Usando loop de eventos dedicado para delete_task")
                # Usar o loop dedicado
                result = self.loop.run_until_complete(self.delete_task(task_id))
                elapsed_time = time.time() - start_time
                logger.info(f"TaskAgent: Resultado obtido de delete_task em {elapsed_time:.2f}s: {result}")
                return result
        except asyncio.TimeoutError as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Timeout ao remover tarefa após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            return error_msg
        except asyncio.CancelledError as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Operação cancelada após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            return error_msg
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro ao remover tarefa após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            return error_msg
    
    async def delete_task(self, task_id: str) -> str:
        """Remove uma tarefa."""
        try:
            start_time = time.time()
            logger.info(f"TaskAgent: Enviando requisição DELETE para remover tarefa {task_id}")
            
            # Usar a sessão HTTP assíncrona
            session = await self._get_session()
            
            # Criar uma task para a requisição HTTP
            async with session.delete(f'https://api.itenorio.com/lambda/tasks/{task_id}') as response:
                logger.info(f"TaskAgent: Status code da resposta: {response.status}")
                
                if response.status == 200:
                    elapsed_time = time.time() - start_time
                    logger.info(f"TaskAgent: Tarefa removida com sucesso em {elapsed_time:.2f}s")
                    return "Tarefa removida com sucesso!"
                else:
                    response_text = await response.text()
                    error_msg = f"Erro ao remover tarefa: {response_text}"
                    logger.error(f"TaskAgent: {error_msg}")
                    return error_msg
        except aiohttp.ClientError as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro na requisição HTTP após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            return error_msg
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro inesperado ao remover tarefa após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            return error_msg
    
    async def process_message_async(self, message: str, response_format: str = "markdown", websocket=None):
        """Processa uma mensagem de forma assíncrona."""
        try:
            start_time = time.time()
            logger.info(f"TaskAgent: Processando mensagem: {message}")
            # Adicionar a mensagem do usuário ao histórico
            self.conversation_history.append(HumanMessage(content=message))
            
            # Obter resposta do agente
            logger.info("TaskAgent: Invocando agent_executor")
            
            # Criar uma task para o processamento da mensagem
            task = asyncio.create_task(self._process_message_internal(message))
            
            # Aguardar a conclusão da task com timeout
            try:
                response_text = await asyncio.wait_for(task, timeout=20)  # 20 segundos para processamento interno
                elapsed_time = time.time() - start_time
                logger.info(f"TaskAgent: Resposta obtida em {elapsed_time:.2f}s: {response_text}")
                
                # Adicionar a resposta ao histórico
                self.conversation_history.append(AIMessage(content=response_text))
                
                return response_text
            except asyncio.TimeoutError:
                elapsed_time = time.time() - start_time
                error_msg = f"Timeout ao processar mensagem após {elapsed_time:.2f}s"
                logger.error(f"TaskAgent: {error_msg}")
                # Cancelar a task que está demorando muito
                task.cancel()
                return error_msg
            
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_message = f"Erro ao processar mensagem após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_message}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            raise Exception(error_message)
    
    async def _process_message_internal(self, message: str):
        """Processa uma mensagem internamente de forma assíncrona."""
        # Executar o agent_executor em uma thread separada para não bloquear o loop de eventos
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: self.agent_executor.invoke({
                "input": message,
                "chat_history": self.conversation_history[:-1]
            })
        )
        return response["output"]
    
    def process_message(self, message: str, response_format: str = "markdown", websocket=None):
        """Processa uma mensagem de forma síncrona."""
        try:
            start_time = time.time()
            logger.info(f"TaskAgent: Processando mensagem: {message}")
            # Adicionar a mensagem do usuário ao histórico
            self.conversation_history.append(HumanMessage(content=message))
            
            # Obter resposta do agente
            logger.info("TaskAgent: Invocando agent_executor")
            response = self.agent_executor.invoke({
                "input": message,
                "chat_history": self.conversation_history[:-1]
            })
            
            response_text = response["output"]
            elapsed_time = time.time() - start_time
            logger.info(f"TaskAgent: Resposta obtida em {elapsed_time:.2f}s: {response_text}")
            
            # Adicionar a resposta ao histórico
            self.conversation_history.append(AIMessage(content=response_text))
            
            return response_text
            
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_message = f"Erro ao processar mensagem após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_message}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            raise Exception(error_message) 