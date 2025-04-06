from ..base_agent import BaseAgent
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain.tools import Tool
import requests
import json
import asyncio
from typing import Dict, List, Any, Optional

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
    
    def get_tasks_sync(self, query: str = "") -> str:
        """Versão síncrona que obtém a lista de todas as tarefas."""
        try:
            # Usar o loop de eventos existente
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Se o loop já estiver em execução, use o método assíncrono diretamente
                future = asyncio.run_coroutine_threadsafe(
                    self.get_tasks(query), 
                    loop
                )
                return future.result(timeout=10)  # Timeout de 10 segundos
            else:
                # Se não houver loop em execução, crie um novo
                return loop.run_until_complete(self.get_tasks(query))
        except Exception as e:
            return f"Erro ao obter tarefas: {str(e)}"
    
    async def get_tasks(self, query: str = "") -> str:
        """Obtém a lista de todas as tarefas."""
        try:
            response = requests.get('https://api.itenorio.com/lambda/tasks')
            tasks = response.json().get('body', {}).get('Items', [])
            
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
            
            return result
        except Exception as e:
            return f"Erro ao obter tarefas: {str(e)}"
    
    def create_task_sync(self, input_str: str) -> str:
        """Versão síncrona que cria uma nova tarefa."""
        try:
            # Usar o loop de eventos existente
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Se o loop já estiver em execução, use o método assíncrono diretamente
                future = asyncio.run_coroutine_threadsafe(
                    self.create_task(input_str), 
                    loop
                )
                return future.result(timeout=10)  # Timeout de 10 segundos
            else:
                # Se não houver loop em execução, crie um novo
                return loop.run_until_complete(self.create_task(input_str))
        except Exception as e:
            return f"Erro ao criar tarefa: {str(e)}"
    
    async def create_task(self, input_str: str) -> str:
        """Cria uma nova tarefa."""
        try:
            parts = input_str.split("|")
            
            if len(parts) != 4:
                return "Erro: Formato inválido. Use 'descrição|prioridade|categoria|status'"
            
            descricao, prioridade, categoria, status = parts
            
            # Normalizar valores
            prioridade = prioridade.strip()
            categoria = categoria.strip()
            status = status.strip()
            
            # Validar valores aceitos
            if prioridade not in ["Alta", "Média", "Baixa"]:
                return "Erro: Prioridade deve ser 'Alta', 'Média' ou 'Baixa'"
            
            if status not in ["Pendente", "Concluído"]:
                return "Erro: Status deve ser 'Pendente' ou 'Concluído'"
            
            task_data = {
                "descricao": descricao,
                "prioridade": prioridade,
                "categoria": categoria,
                "status": status
            }
            
            response = requests.post('https://api.itenorio.com/lambda/tasks', json=task_data)
            
            if response.status_code == 200:
                return "Tarefa criada com sucesso!"
            else:
                return f"Erro ao criar tarefa: {response.text}"
        except Exception as e:
            return f"Erro ao criar tarefa: {str(e)}"
    
    def update_task_sync(self, input_str: str) -> str:
        """Versão síncrona que atualiza uma tarefa existente."""
        try:
            # Usar o loop de eventos existente
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Se o loop já estiver em execução, use o método assíncrono diretamente
                future = asyncio.run_coroutine_threadsafe(
                    self.update_task(input_str), 
                    loop
                )
                return future.result(timeout=10)  # Timeout de 10 segundos
            else:
                # Se não houver loop em execução, crie um novo
                return loop.run_until_complete(self.update_task(input_str))
        except Exception as e:
            return f"Erro ao atualizar tarefa: {str(e)}"
    
    async def update_task(self, input_str: str) -> str:
        """Atualiza uma tarefa existente."""
        try:
            parts = input_str.split("|")
            if len(parts) < 2:
                return "Erro: Formato inválido. Use 'task_id|campo1=valor1|campo2=valor2|...'"
            
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
                return "Erro: Prioridade deve ser 'Alta', 'Média' ou 'Baixa'"
            
            if "status" in formatted_task and formatted_task["status"] not in ["Pendente", "Concluído"]:
                return "Erro: Status deve ser 'Pendente' ou 'Concluído'"
            
            if not formatted_task:
                return "Nenhum campo válido para atualização fornecido."
            
            response = requests.patch(f'https://api.itenorio.com/lambda/tasks/{task_id}', json=formatted_task)
            
            if response.status_code == 200:
                return "Tarefa atualizada com sucesso!"
            else:
                return f"Erro ao atualizar tarefa: {response.text}"
        except Exception as e:
            return f"Erro ao atualizar tarefa: {str(e)}"
    
    def delete_task_sync(self, task_id: str) -> str:
        """Versão síncrona que remove uma tarefa."""
        try:
            # Usar o loop de eventos existente
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Se o loop já estiver em execução, use o método assíncrono diretamente
                future = asyncio.run_coroutine_threadsafe(
                    self.delete_task(task_id), 
                    loop
                )
                return future.result(timeout=10)  # Timeout de 10 segundos
            else:
                # Se não houver loop em execução, crie um novo
                return loop.run_until_complete(self.delete_task(task_id))
        except Exception as e:
            return f"Erro ao remover tarefa: {str(e)}"
    
    async def delete_task(self, task_id: str) -> str:
        """Remove uma tarefa."""
        try:
            response = requests.delete(f'https://api.itenorio.com/lambda/tasks/{task_id}')
            
            if response.status_code == 200:
                return "Tarefa removida com sucesso!"
            else:
                return f"Erro ao remover tarefa: {response.text}"
        except Exception as e:
            return f"Erro ao remover tarefa: {str(e)}"
    
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