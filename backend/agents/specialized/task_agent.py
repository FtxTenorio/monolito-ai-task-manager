from ..base_agent import BaseAgent
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain.tools import Tool
import requests
import json
import logging
import traceback
import time
from utils.websocket_utils import send_websocket_message as send_ws_message

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TaskAgent(BaseAgent):
    def __init__(self, client_id: int = None):
        system_prompt = """Você é um agente especializado em gerenciamento de tarefas.
        Sua função é ajudar a criar, listar, atualizar e remover tarefas.
        Você tem acesso a uma API de tarefas e deve usar as ferramentas disponíveis para realizar essas operações.
        Sempre forneça respostas claras e organizadas."""
        
        super().__init__(system_prompt, client_id=client_id)
        
        # Definir as ferramentas específicas para tarefas
        self.tools = [
            Tool(
                name="get_tasks",
                func=self.get_tasks,
                coroutine=self.get_tasks,
                description="Lista todas as tarefas disponíveis. Use esta ferramenta quando o usuário quiser ver todas as tarefas."
            ),
            Tool(
                name="get_task",
                func=self.get_task,
                coroutine=self.get_task,
                description="Obtém detalhes de uma tarefa específica pelo ID. Use esta ferramenta quando o usuário quiser ver detalhes de uma tarefa específica."
            ),
            Tool(
                name="create_task",
                func=self.create_task,
                coroutine=self.create_task,
                description="Cria uma nova tarefa. Use esta ferramenta quando o usuário quiser criar uma nova tarefa."
            ),
            Tool(
                name="update_task",
                func=self.update_task,
                coroutine=self.update_task,
                description="Atualiza uma tarefa existente. Use esta ferramenta quando o usuário quiser modificar uma tarefa existente."
            ),
            Tool(
                name="delete_task",
                func=self.delete_task,
                coroutine=self.delete_task,
                description="Remove uma tarefa pelo ID. Use esta ferramenta quando o usuário quiser excluir uma tarefa."
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

    async def send_websocket_message(self, message: str, client_id: str, type: str):
    # Envia uma mensagem para o cliente, via websocket
        await send_ws_message(message, client_id, type, "text")
    
    async def get_tasks(self, query: str = "") -> str:
        """Obtém a lista de todas as tarefas."""
        # 'function_call_start' | 'function_call_error' | 'function_call_end'
        try:
            start_time = time.time()
            await self.send_websocket_message("Obtendo tarefas...", self.client_id, "function_call_start")
            logger.info(f"TaskAgent: Fazendo requisição GET para /lambda/tasks")
            
            response = requests.get("https://api.itenorio.com/lambda/tasks")
            response.raise_for_status()
            
            # Parse the response and handle different formats
            data = response.json()

            await self.send_websocket_message(f"Tarefas obtidas em {time.time() - start_time:.2f}s", self.client_id, "function_call_info")
            # Check if the response has a specific structure
            if isinstance(data, dict) and 'body' in data:
                # Handle AWS Lambda response format
                if isinstance(data['body'], str):
                    # If body is a string, it might be JSON encoded
                    try:
                        body_data = json.loads(data['body'])
                        if isinstance(body_data, dict) and 'Items' in body_data:
                            tasks = body_data['Items']
                        else:
                            tasks = body_data
                    except json.JSONDecodeError:
                        await self.send_websocket_message(f"Erro ao decodificar resposta da API", self.client_id, "function_call_error")
                        tasks = []
                elif isinstance(data['body'], dict) and 'Items' in data['body']:
                    # Direct access to Items in body
                    tasks = data['body']['Items']
                else:
                    tasks = data['body']
            elif isinstance(data, list):
                # Direct list of tasks
                tasks = data
            else:
                # Unknown format, log and return empty
                await self.send_websocket_message(f"Formato de resposta desconhecido: {data}", self.client_id, "function_call_error")
                logger.warning(f"TaskAgent: Formato de resposta desconhecido: {data}")
                tasks = []
            
            
            elapsed_time = time.time() - start_time
            
            if not tasks:
                await self.send_websocket_message(f"Nenhuma tarefa encontrada em {elapsed_time:.2f}s", self.client_id, "function_call_end")
                logger.info(f"TaskAgent: Nenhuma tarefa encontrada em {elapsed_time:.2f}s")
                return "Nenhuma tarefa encontrada."
            
            # Formatar a resposta
            formatted_tasks = []
            await self.send_websocket_message(f"Encontradas ({len(tasks)}) tarefas", self.client_id, "function_call_info")
            for task in tasks:
                # Handle different task formats
                if isinstance(task, dict):
                    # Standard format
                    task_id = task.get('id', task.get('ID', 'N/A'))
                    description = task.get('description', task.get('Descrição', 'N/A'))
                    priority = task.get('priority', task.get('Prioridade', 'N/A'))
                    category = task.get('category', task.get('Categoria', 'N/A'))
                    status = task.get('status', task.get('Status', 'N/A'))
                    created_at = task.get('created_at', task.get('Data de Criação', 'N/A'))
                else:
                    await self.send_websocket_message(f"Formato de tarefa inesperado: {task.keys()}", self.client_id, "function_call_error")
                    # Fallback for unexpected format
                    logger.warning(f"TaskAgent: Formato de tarefa inesperado: {task}")
                    continue
                
                formatted_task = (
                    f"ID: {task_id}\n"
                    f"Descrição: {description}\n"
                    f"Prioridade: {priority}\n"
                    f"Categoria: {category}\n"
                    f"Status: {status}\n"
                    f"Data de Criação: {created_at}\n"
                    "---"
                )
                formatted_tasks.append(formatted_task)
            
            if not formatted_tasks:
                await self.send_websocket_message(f"Nenhuma tarefa encontrada ou formato de tarefa não reconhecido.", self.client_id, "function_call_error")
                return "Nenhuma tarefa encontrada ou formato de tarefa não reconhecido."
                
            result = "\n".join(formatted_tasks)
            await self.send_websocket_message(f"Tarefas obtidas em {elapsed_time:.2f}s", self.client_id, "function_call_end")
            logger.info(f"TaskAgent: Tarefas obtidas em {elapsed_time:.2f}s: {result}")
            return result
            
        except requests.exceptions.RequestException as e:
            await self.send_websocket_message(f"TaskAgent: Erro ao obter tarefas após {elapsed_time:.2f}s: {str(e)}", self.client_id, "function_call_error")
            elapsed_time = time.time() - start_time
            error_msg = f"Erro ao obter tarefas após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            return error_msg
        except Exception as e:
            await self.send_websocket_message(f"TaskAgent: Erro ao obter tarefas após {elapsed_time:.2f}s: {str(e)}", self.client_id, "function_call_error")
            elapsed_time = time.time() - start_time
            error_msg = f"Erro ao obter tarefas após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            return error_msg
    
    def get_task(self, task_id: str) -> str:
        """Obtém detalhes de uma tarefa específica pelo ID."""
        try:
            start_time = time.time()
            logger.info(f"TaskAgent: Obtendo detalhes da tarefa {task_id}")
            
            response = requests.get(f"https://api.itenorio.com/lambda/tasks/{task_id}")
            response.raise_for_status()
            
            # Parse the response and handle different formats
            data = response.json()
            
            # Check if the response has a specific structure
            if isinstance(data, dict) and 'body' in data:
                # Handle AWS Lambda response format
                if isinstance(data['body'], str):
                    # If body is a string, it might be JSON encoded
                    try:
                        task = json.loads(data['body'])
                    except json.JSONDecodeError:
                        task = {}
                else:
                    task = data['body']
            else:
                task = data
                
            elapsed_time = time.time() - start_time
            
            if not task:
                logger.info(f"TaskAgent: Tarefa {task_id} não encontrada em {elapsed_time:.2f}s")
                return f"Tarefa com ID {task_id} não encontrada."
            
            # Format the response
            if isinstance(task, dict):
                # Standard format
                task_id = task.get('id', task.get('ID', 'N/A'))
                description = task.get('description', task.get('Descrição', 'N/A'))
                priority = task.get('priority', task.get('Prioridade', 'N/A'))
                category = task.get('category', task.get('Categoria', 'N/A'))
                status = task.get('status', task.get('Status', 'N/A'))
                created_at = task.get('created_at', task.get('Data de Criação', 'N/A'))
                
                result = (
                    f"**Detalhes da Tarefa**\n\n"
                    f"**ID:** {task_id}\n"
                    f"**Descrição:** {description}\n"
                    f"**Prioridade:** {priority}\n"
                    f"**Categoria:** {category}\n"
                    f"**Status:** {status}\n"
                    f"**Data de Criação:** {created_at}"
                )
            else:
                # Fallback for unexpected format
                logger.warning(f"TaskAgent: Formato de tarefa inesperado: {task}")
                result = f"Detalhes da tarefa {task_id}: {task}"
                
            logger.info(f"TaskAgent: Detalhes da tarefa obtidos em {elapsed_time:.2f}s")
            return result
            
        except requests.exceptions.RequestException as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro ao obter detalhes da tarefa após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            return error_msg
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro ao obter detalhes da tarefa após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            return error_msg
    
    async def create_task(self, input_str: str) -> str:
        """Cria uma nova tarefa."""
        try:
            start_time = time.time()
            await self.send_websocket_message("Criando nova tarefa...", self.client_id, "function_call_start")
            logger.info(f"TaskAgent: Criando nova tarefa com input: {input_str}")
            
            # Parse input string
            parts = input_str.split('|')
            if len(parts) != 4:
                await self.send_websocket_message("Formato inválido.", self.client_id, "function_call_error")
                return "Formato inválido. Use: 'description|priority|category|status'"
            
            description, priority, category, status = parts
            
            # Prepare request data
            data = {
                "descricao": description.strip(),
                "prioridade": priority.strip(),
                "categoria": category.strip(),
                "status": status.strip()
            }
            
            logger.info(f"TaskAgent: Dados da tarefa: {data}")

            # Make request
            response = requests.post(
                "https://api.itenorio.com/lambda/tasks",
                json=data
            )

            response.raise_for_status()
            
            # Parse the response and handle different formats
            data = response.json()
            
            await self.send_websocket_message("Tarefa criada com sucesso!", self.client_id, "function_call_info")
            
            # Check if the response has a specific structure
            if isinstance(data, dict) and 'body' in data:
                # Handle AWS Lambda response format
                if isinstance(data['body'], str):
                    # If body is a string, it might be JSON encoded
                    try:
                        result = json.loads(data['body'])
                    except json.JSONDecodeError:
                        await self.send_websocket_message("Erro ao decodificar resposta da API", self.client_id, "function_call_error")
                        result = {}
                else:
                    result = data['body']
            else:
                result = data
                
            elapsed_time = time.time() - start_time
            
            # Create success message with available fields
            success_msg = "Tarefa criada com sucesso!\n"
            
            # Add available fields to the message
            if isinstance(result, dict):
                if 'id' in result:
                    success_msg += f"ID: {result['id']}\n"
                elif 'ID' in result:
                    success_msg += f"ID: {result['ID']}\n"
                    
                if 'description' in result:
                    success_msg += f"Descrição: {result['description']}\n"
                elif 'Descrição' in result:
                    success_msg += f"Descrição: {result['Descrição']}\n"
                    
                if 'priority' in result:
                    success_msg += f"Prioridade: {result['priority']}\n"
                elif 'Prioridade' in result:
                    success_msg += f"Prioridade: {result['Prioridade']}\n"
                    
                if 'category' in result:
                    success_msg += f"Categoria: {result['category']}\n"
                elif 'Categoria' in result:
                    success_msg += f"Categoria: {result['Categoria']}\n"
                    
                if 'status' in result:
                    success_msg += f"Status: {result['status']}\n"
                elif 'Status' in result:
                    success_msg += f"Status: {result['Status']}\n"
            else:
                success_msg += f"Resposta: {result}"
            
            logger.info(f"TaskAgent: Tarefa criada em {elapsed_time:.2f}s: {success_msg}")
            await self.send_websocket_message(f"Tarefa criada em {elapsed_time:.2f}s: {result['Descrição']}", self.client_id, "function_call_end")
            return success_msg
            
        except requests.exceptions.RequestException as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro ao criar tarefa após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            await self.send_websocket_message(f"Erro ao criar tarefa após {elapsed_time:.2f}s: {str(e)}", self.client_id, "function_call_error")
            return error_msg
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro ao criar tarefa após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            await self.send_websocket_message(f"Erro ao criar tarefa após {elapsed_time:.2f}s: {str(e)}", self.client_id, "function_call_error")
            return error_msg
    
    async def update_task(self, input_str: str) -> str:
        """Atualiza uma tarefa existente."""
        try:
            start_time = time.time()
            logger.info(f"TaskAgent: Atualizando tarefa com input: {input_str}")
            await self.send_websocket_message("Atualizando tarefa...", self.client_id, "function_call_start")
            
            # Parse input string
            parts = input_str.split('|')
            if len(parts) < 2:
                await self.send_websocket_message("Formato inválido.", self.client_id, "function_call_error")
                return "Formato inválido. Use: 'task_id|campo1=valor1|campo2=valor2|...'"
            
            task_id = parts[0]
            updates = {}
            
            # Parse update fields
            for part in parts[1:]:
                if '=' not in part:
                    continue
                field, value = part.split('=', 1)
                updates[field.strip()] = value.strip()
            
            if not updates:
                await self.send_websocket_message("Nenhum campo para atualizar foi fornecido.", self.client_id, "function_call_error")
                return "Nenhum campo para atualizar foi fornecido."
            
            # Make request
            response = requests.patch(
                f"https://api.itenorio.com/lambda/tasks/{task_id}",
                json=updates
            )
            response.raise_for_status()
            
            # Parse the response and handle different formats
            data = response.json()
            
            await self.send_websocket_message("Tarefa atualizada com sucesso!", self.client_id, "function_call_info")
            
            # Check if the response has a specific structure
            if isinstance(data, dict) and 'body' in data:
                # Handle AWS Lambda response format
                if isinstance(data['body'], str):
                    # If body is a string, it might be JSON encoded
                    try:
                        result = json.loads(data['body'])
                    except json.JSONDecodeError:
                        result = {}
                else:
                    result = data['body']
            else:
                result = data
                
            elapsed_time = time.time() - start_time
            
            # Create success message with available fields
            success_msg = f"Tarefa atualizada com sucesso!\n"
            
            # Add available fields to the message
            if isinstance(result, dict):
                if 'id' in result:
                    success_msg += f"ID: {result['id']}\n"
                elif 'ID' in result:
                    success_msg += f"ID: {result['ID']}\n"
                    
                if 'description' in result:
                    success_msg += f"Descrição: {result['description']}\n"
                elif 'Descrição' in result:
                    success_msg += f"Descrição: {result['Descrição']}\n"
                    
                if 'priority' in result:
                    success_msg += f"Prioridade: {result['priority']}\n"
                elif 'Prioridade' in result:
                    success_msg += f"Prioridade: {result['Prioridade']}\n"
                    
                if 'category' in result:
                    success_msg += f"Categoria: {result['category']}\n"
                elif 'Categoria' in result:
                    success_msg += f"Categoria: {result['Categoria']}\n"
                    
                if 'status' in result:
                    success_msg += f"Status: {result['status']}\n"
                elif 'Status' in result:
                    success_msg += f"Status: {result['Status']}\n"
            else:
                success_msg += f"Resposta: {result}"
            
            logger.info(f"TaskAgent: Tarefa atualizada em {elapsed_time:.2f}s: {success_msg}")
            await self.send_websocket_message(f"Tarefa atualizada em {elapsed_time:.2f}s: {result['Descrição']}", self.client_id, "function_call_end")
            return success_msg
            
        except requests.exceptions.RequestException as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro ao atualizar tarefa após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            return error_msg
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro ao atualizar tarefa após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            return error_msg
    
    async def delete_task(self, task_id: str) -> str:
        """Remove uma tarefa."""
        await self.send_websocket_message("Removendo tarefa...", self.client_id, "function_call_start")
        try:
            start_time = time.time()
            logger.info(f"TaskAgent: Removendo tarefa com ID: {task_id}")
            
            # Make request
            response = requests.delete(f"https://api.itenorio.com/lambda/tasks/{task_id}")
            response.raise_for_status()
            
            elapsed_time = time.time() - start_time
            success_msg = f"Tarefa {task_id} removida com sucesso!"
            
            logger.info(f"TaskAgent: Tarefa removida em {elapsed_time:.2f}s: {success_msg}")
            await self.send_websocket_message(f"Tarefa removida em {elapsed_time:.2f}s: {success_msg}", self.client_id, "function_call_end")
            return success_msg
            
        except requests.exceptions.RequestException as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro ao remover tarefa após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            await self.send_websocket_message(f"Erro ao remover tarefa após {elapsed_time:.2f}s: {str(e)}", self.client_id, "function_call_error")
            return error_msg
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro ao remover tarefa após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            await self.send_websocket_message(f"Erro ao remover tarefa após {elapsed_time:.2f}s: {str(e)}", self.client_id, "function_call_error")
            return error_msg
    
    async def _load_tasks_into_history(self) -> str:
        """
        Carrega todas as tarefas no histórico de chat.
        
        Returns:
            str: Mensagem formatada com todas as tarefas ou None se não houver tarefas
        """
        try:
            logger.info("TaskAgent: Carregando todas as tarefas no histórico")
            
            # Buscar todas as tarefas
            tasks = await self.get_tasks("")
            if tasks == "Nenhuma tarefa encontrada.":
                logger.info("TaskAgent: Nenhuma tarefa encontrada para carregar no histórico")
                return None
            
            # Formatar a mensagem
            result = "Aqui estão todas as suas tarefas:\n\n"
            result += tasks
            
            logger.info("TaskAgent: Tarefas carregadas no histórico com sucesso")
            return result
            
        except Exception as e:
            logger.error(f"TaskAgent: Erro ao carregar tarefas no histórico: {str(e)}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            return None

    async def process_message(self, message: str, response_format: str = "markdown", websocket=None, chat_history=None) -> str:
        """Processa uma mensagem de forma síncrona."""
        try:
            start_time = time.time()
            logger.info(f"TaskAgent: Processando mensagem: {message}")
            
            # Converter o histórico de chat para o formato do LangChain
            langchain_history = []
            if chat_history:
                for msg in chat_history:
                    # Verificar o tipo de mensagem
                    if isinstance(msg, HumanMessage):
                        langchain_history.append(msg)
                    elif isinstance(msg, AIMessage):
                        langchain_history.append(msg)
                    elif isinstance(msg, SystemMessage):
                        # Ignorar mensagens do sistema, pois já estão no prompt
                        continue
                    elif isinstance(msg, dict):
                        # Se for um dicionário, converter para o formato apropriado
                        if msg.get("role") == "user":
                            langchain_history.append(HumanMessage(content=msg.get("content", "")))
                        elif msg.get("role") == "assistant":
                            langchain_history.append(AIMessage(content=msg.get("content", "")))
            
            # Verificar se já carregamos as tarefas no histórico
            tasks_loaded = False
            for msg in langchain_history:
                if isinstance(msg, AIMessage) and "Aqui estão todas as suas tarefas:" in msg.content:
                    tasks_loaded = True
                    break
            
            # Se não carregamos as tarefas ainda, carregar agora
            if not tasks_loaded:
                logger.info("TaskAgent: Carregando tarefas no histórico")
                tasks_message = await self._load_tasks_into_history()
                if tasks_message:
                    logger.info(f"TaskAgent: Tarefas carregadas no histórico: {tasks_message}")
                    langchain_history.append(AIMessage(content=tasks_message))
            
            # Processar a mensagem usando o executor do agente
            response = await self.agent_executor.ainvoke({
                "input": message,
                "chat_history": langchain_history
            })
            
            elapsed_time = time.time() - start_time
            result = response.get("output", "Desculpe, não consegui processar sua solicitação.")
            
            logger.info(f"TaskAgent: Resposta obtida em {elapsed_time:.2f}s: {result}")
            return result
            
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Erro ao processar mensagem após {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"TaskAgent: {error_msg}")
            logger.error(f"TaskAgent: Traceback: {traceback.format_exc()}")
            return error_msg 