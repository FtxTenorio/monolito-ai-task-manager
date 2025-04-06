import json
import logging
import time
import traceback
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any

import requests
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain.tools import Tool
from langchain_openai import ChatOpenAI

from ..base_agent import BaseAgent
from config.settings import settings
from utils.logger import get_logger

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RoutineAPIClient:
    """Cliente para interagir com a API de rotinas."""
    
    def __init__(self):
        self.base_url = "https://api.itenorio.com/lambda/routines"
    
    def _make_request(self, operation: str, method: str, url: str, **kwargs) -> tuple[bool, str, dict]:
        """
        Faz uma requisição para a API.
        
        Args:
            operation: Nome da operação sendo realizada
            method: Método HTTP (GET, POST, PUT, DELETE)
            url: URL da API
            **kwargs: Argumentos adicionais para requests
            
        Returns:
            tuple[bool, str, dict]: (sucesso, mensagem, dados)
        """
        try:
            logger.info(f"RoutineAgent: Fazendo requisição {method} para {url}")
            response = getattr(requests, method.lower())(url, **kwargs)
            
            # Verificar status code
            if not 200 <= response.status_code < 300:
                error_msg = f"Erro na API durante {operation}. Status code: {response.status_code}"
                try:
                    error_data = response.json()
                    if isinstance(error_data, dict):
                        if 'body' in error_data and isinstance(error_data['body'], str):
                            try:
                                body_data = json.loads(error_data['body'])
                                if 'message' in body_data:
                                    error_msg = f"{error_msg}. Mensagem: {body_data['message']}"
                            except json.JSONDecodeError:
                                error_msg = f"{error_msg}. Resposta: {error_data['body']}"
                        elif 'message' in error_data:
                            error_msg = f"{error_msg}. Mensagem: {error_data['message']}"
                except (json.JSONDecodeError, ValueError):
                    error_msg = f"{error_msg}. Resposta: {response.text}"
                
                logger.error(f"RoutineAgent: {error_msg}")
                return False, error_msg, {}
            
            # Parse response data
            response_data = response.json()
            
            # Handle AWS Lambda response format
            if isinstance(response_data, dict) and 'body' in response_data:
                if isinstance(response_data['body'], str):
                    try:
                        body_data = json.loads(response_data['body'])
                        return True, "", body_data
                    except json.JSONDecodeError:
                        error_msg = f"Erro ao decodificar resposta da API durante {operation}"
                        logger.error(f"RoutineAgent: {error_msg}")
                        return False, error_msg, {}
                else:
                    return True, "", response_data['body']
            
            return True, "", response_data
            
        except Exception as e:
            error_msg = f"Erro ao fazer requisição {method} para {url}: {str(e)}"
            logger.error(f"RoutineAgent: {error_msg}")
            logger.error(f"RoutineAgent: Traceback: {traceback.format_exc()}")
            return False, error_msg, {}
    
    def get_routines(self) -> tuple[bool, str, dict]:
        """Lista todas as rotinas."""
        return self._make_request("listagem de rotinas", "GET", self.base_url)
    
    def get_routine(self, routine_id: str) -> tuple[bool, str, dict]:
        """Obtém uma rotina específica."""
        return self._make_request(f"obtenção da rotina {routine_id}", "GET", f"{self.base_url}/{routine_id}")
    
    def create_routine(self, data: str, headers: dict) -> tuple[bool, str, dict]:
        """Cria uma nova rotina."""
        return self._make_request("criação de rotina", "POST", self.base_url, data=data, headers=headers)
    
    def update_routine(self, routine_id: str, data: dict) -> tuple[bool, str, dict]:
        """Atualiza uma rotina existente."""
        return self._make_request(f"atualização da rotina {routine_id}", "PUT", f"{self.base_url}/{routine_id}", json=data)
    
    def delete_routine(self, routine_id: str) -> tuple[bool, str, dict]:
        """Deleta uma rotina existente."""
        return self._make_request(f"remoção da rotina {routine_id}", "DELETE", f"{self.base_url}/{routine_id}")

class RoutineAgent(BaseAgent):
    """Agente especializado em gerenciar rotinas."""
    
    def __init__(self):
        """Inicializa o agente de rotinas."""
        logger.info("RoutineAgent: Inicializando agente de rotinas")
        start_time = time.time()
        
        system_prompt = """You are an agent specialized in routine management.
        Your function is to help create, list, update and remove routines.
        You have access to a routines API and should use the available tools to perform these operations.
        Always provide clear and organized responses."""
        
        super().__init__(system_prompt)
        
        # Inicializar o cliente da API
        self.api_client = RoutineAPIClient()
        
        # Definir campos obrigatórios e seus tipos
        self.required_fields = {
            'name': str,
            'description': str,
            'status': str,
            'schedule': str,
            'frequency': str,
            'priority': str,
            'tags': list,
            'estimated_duration': int,
            'start_date': str,
            'end_date': str
        }
        
        # Definir valores válidos para campos específicos
        self.valid_values = {
            'status': ['pending', 'in_progress', 'completed', 'cancelled'],
            'frequency': ['daily', 'weekly', 'monthly', 'weekdays', 'weekends', 'custom'],
            'priority': ['low', 'medium', 'high']
        }
        
        # Definir valores padrão
        self.default_values = {
            'status': 'pending',
            'frequency': 'daily',
            'priority': 'medium',
            'tags': [],
            'estimated_duration': 0
        }
        
        # Definir as ferramentas específicas para rotinas
        self.tools = [
            Tool(
                name="get_routines",
                func=self.get_routines,
                description="Lista todas as rotinas disponíveis. Use esta ferramenta quando o usuário quiser ver todas as rotinas."
            ),
            Tool(
                name="get_routine",
                func=self.get_routine,
                description="Obtém detalhes de uma rotina específica pelo ID. Use esta ferramenta quando o usuário quiser ver detalhes de uma rotina específica."
            ),
            Tool(
                name="create_routine",
                func=self.create_routine,
                description="Cria uma nova rotina. Use esta ferramenta quando o usuário quiser criar uma nova rotina."
            ),
            Tool(
                name="update_routine",
                func=self.update_routine,
                description="Atualiza uma rotina existente. Use esta ferramenta quando o usuário quiser modificar uma rotina existente."
            ),
            Tool(
                name="delete_routine",
                func=self.delete_routine,
                description="Remove uma rotina pelo ID. Use esta ferramenta quando o usuário quiser excluir uma rotina."
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
        logger.info("RoutineAgent: Criando agente com OpenAI Functions")
        self.agent = create_openai_functions_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=self.prompt
        )
        
        # Criar o executor do agente
        logger.info("RoutineAgent: Configurando executor do agente")
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            verbose=True
        )
        
        elapsed_time = time.time() - start_time
        logger.info(f"RoutineAgent: Inicialização concluída em {elapsed_time:.2f}s")
        
    def _validate_routine_data(self, data: dict, is_update: bool = False) -> str:
        """
        Validates routine data.
        
        Args:
            data: Dictionary with routine data
            is_update: If True, doesn't validate required fields (for partial updates)
            
        Returns:
            str: Validation result message
        """
        try:
            # Check required fields only on creation
            if not is_update:
                missing_fields = []
                for field, field_type in self.required_fields.items():
                    if field not in data:
                        missing_fields.append(field)
                
                if missing_fields:
                    return f"Missing required fields: {', '.join(missing_fields)}"
            
            # Validate types and values of present fields
            for field, value in data.items():
                if field in self.required_fields:
                    # Validate type
                    expected_type = self.required_fields[field]
                    if not isinstance(value, expected_type):
                        # Try to convert to the expected type
                        try:
                            if expected_type == int and isinstance(value, str):
                                data[field] = int(value)
                            elif expected_type == list and isinstance(value, str):
                                data[field] = [item.strip() for item in value.split(',')]
                            else:
                                return f"Field '{field}' must be of type {expected_type.__name__}"
                        except (ValueError, TypeError):
                            return f"Field '{field}' must be of type {expected_type.__name__}"
                    
                    # Validate specific values
                    if field in self.valid_values:
                        if value not in self.valid_values[field]:
                            return f"Invalid value for '{field}'. Allowed values: {', '.join(self.valid_values[field])}"
                    
                    # Validate date format
                    if field in ['start_date', 'end_date'] and value:
                        try:
                            datetime.fromisoformat(value)
                        except ValueError:
                            return f"Invalid date format for '{field}'. Use ISO format (YYYY-MM-DD)"
                    
                    # Validate time format
                    if field == 'schedule' and value:
                        try:
                            datetime.strptime(value, '%H:%M')
                        except ValueError:
                            return "Invalid time format. Use HH:MM format"
                    
                    # Validate duration
                    if field == 'estimated_duration':
                        if not isinstance(value, int):
                            try:
                                data[field] = int(value)
                            except (ValueError, TypeError):
                                return "Duration must be an integer"
                        if data[field] < 0:
                            return "Duration must be greater than or equal to zero"
            
            return "OK"
            
        except Exception as e:
            logger.error(f"RoutineAgent: Error validating data: {str(e)}")
            return f"Error validating data: {str(e)}"

    def process_message(self, message: str, response_format: str = "markdown", websocket=None, chat_history=None) -> str:
        """Processa uma mensagem de forma síncrona."""
        try:
            start_time = time.time()
            logger.info(f"RoutineAgent: Processing message: {message}")
            
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
            
            # Processar a mensagem usando o executor do agente
            response = self.agent_executor.invoke({
                "input": message,
                "chat_history": langchain_history
            })
            
            elapsed_time = time.time() - start_time
            result = response.get("output", "Sorry, I couldn't process your request.")
            
            logger.info(f"RoutineAgent: Response obtained in {elapsed_time:.2f}s: {result}")
            return result
            
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Error processing message after {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"RoutineAgent: {error_msg}")
            logger.error(f"RoutineAgent: Traceback: {traceback.format_exc()}")
            return error_msg

    def get_routines(self, _=None) -> str:
        """Lista todas as rotinas."""
        try:
            start_time = time.time()
            logger.info("RoutineAgent: Listing all routines")
            
            success, error_msg, data = self.api_client.get_routines()
            if not success:
                return error_msg
            
            # Get the routines data from the response
            routines = data.get('data', [])
            if not routines:
                logger.info("RoutineAgent: No routines found")
                return "No routines found."
                
            # Format the response
            logger.info(f"RoutineAgent: Formatting {len(routines)} routines found")
            result = "Here are all your routines:\n\n"
            
            field_labels = {
                'name': 'Name',
                'description': 'Description',
                'status': 'Status',
                'schedule': 'Schedule',
                'frequency': 'Frequency',
                'priority': 'Priority',
                'tags': 'Tags',
                'estimated_duration': 'Duration',
                'start_date': 'Start Date',
                'end_date': 'End Date',
                'id': 'ID'
            }
            
            for routine in routines:
                if isinstance(routine, dict):
                    result += f"**{routine.get('name', 'No name')}**\n"
                    for field, label in field_labels.items():
                        if field in routine:
                            value = routine[field]
                            if field == 'tags' and isinstance(value, list):
                                value = ', '.join(value)
                            elif field == 'estimated_duration':
                                value = f"{value} minutes"
                            if field != 'name':  # Name already added as title
                                result += f"- **{label}:** {value}\n"
                    result += "\n"
                else:
                    # If routine is a string or other type, just display the value
                    result += f"**Routine:** {routine}\n\n"
            
            elapsed_time = time.time() - start_time
            logger.info(f"RoutineAgent: Routines listed in {elapsed_time:.2f}s")
            return result
            
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Error listing routines after {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"RoutineAgent: {error_msg}")
            logger.error(f"RoutineAgent: Traceback: {traceback.format_exc()}")
            return error_msg
    
    def get_routine(self, routine_id: str = "", _=None) -> str:
        """Obtém uma rotina específica pelo ID."""
        try:
            start_time = time.time()
            
            # Verificar se routine_id está vazio
            if not routine_id:
                logger.warning("RoutineAgent: Attempt to get routine without ID")
                return "Please provide the ID of the routine you want to get."
                
            logger.info(f"RoutineAgent: Getting routine {routine_id}")
            
            success, error_msg, data = self.api_client.get_routine(routine_id)
            if not success:
                return error_msg
            
            # Get the routine data from the response
            routine = data.get('data', {})
            if not routine:
                logger.info(f"RoutineAgent: Routine {routine_id} not found")
                return f"Routine with ID {routine_id} not found."
                
            # Format the response
            logger.info("RoutineAgent: Formatting routine details")
            
            field_labels = {
                'name': 'Name',
                'description': 'Description',
                'status': 'Status',
                'schedule': 'Schedule',
                'frequency': 'Frequency',
                'priority': 'Priority',
                'tags': 'Tags',
                'estimated_duration': 'Duration',
                'start_date': 'Start Date',
                'end_date': 'End Date',
                'id': 'ID'
            }
            
            if isinstance(routine, dict):
                result = f"**{routine.get('name', 'No name')}**\n"
                for field, label in field_labels.items():
                    if field in routine:
                        value = routine[field]
                        if field == 'tags' and isinstance(value, list):
                            value = ', '.join(value)
                        elif field == 'estimated_duration':
                            value = f"{value} minutes"
                        if field != 'name':  # Name already added as title
                            result += f"- **{label}:** {value}\n"
            else:
                # If routine is a string or other type, just display the value
                result = f"**Routine:** {routine}\n"
            
            elapsed_time = time.time() - start_time
            logger.info(f"RoutineAgent: Routine obtained in {elapsed_time:.2f}s")
            return result
            
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Error getting routine after {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"RoutineAgent: {error_msg}")
            logger.error(f"RoutineAgent: Traceback: {traceback.format_exc()}")
            return error_msg
    
    def create_routine(self, input_str: str = "", _=None) -> str:
        """Cria uma nova rotina."""
        try:
            start_time = time.time()
            logger.info(f"RoutineAgent: Creating routine with input: {input_str}")
            
            # Verificar se input_str está vazio
            if not input_str:
                logger.warning("RoutineAgent: Attempt to create routine without data")
                return "Please provide the routine data you want to create."
            
            # Parse input string
            parts = input_str.split('|')
            if len(parts) != 10:
                return "Invalid format. Use: 'name|description|status|schedule|frequency|priority|tags|duration|start_date|end_date'"
            
            name, description, status, schedule, frequency, priority, tags, duration, start_date, end_date = parts
            
            # Prepare request data with proper types
            data = {
                "name": name.strip(),
                "description": description.strip(),
                "status": status.strip() or self.default_values['status'],
                "schedule": schedule.strip() if schedule.strip() else None,
                "frequency": frequency.strip() or self.default_values['frequency'],
                "priority": priority.strip() or self.default_values['priority'],
                "tags": [tag.strip() for tag in tags.split(',')] if tags.strip() else self.default_values['tags'],
                "estimated_duration": int(duration.strip()) if duration.strip() else self.default_values['estimated_duration'],
                "start_date": start_date.strip() if start_date.strip() else None,
                "end_date": end_date.strip() if end_date.strip() else None
            }
            
            # Validate data
            validation_result = self._validate_routine_data(data)
            if validation_result != "OK":
                return validation_result
            
            # Make request
            success, error_msg, result = self.api_client.create_routine(
                json.dumps(data),
                {'Content-Type': 'application/json'}
            )
            if not success:
                return error_msg
            
            elapsed_time = time.time() - start_time
            success_msg = f"Routine created successfully!\nID: {result.get('id', 'N/A')}"
            
            logger.info(f"RoutineAgent: Routine created in {elapsed_time:.2f}s: {success_msg}")
            return success_msg
            
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Error creating routine after {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"RoutineAgent: {error_msg}")
            logger.error(f"RoutineAgent: Traceback: {traceback.format_exc()}")
            return error_msg
    
    def update_routine(self, input_str: str = "", _=None) -> str:
        """Atualiza uma rotina existente."""
        try:
            start_time = time.time()
            logger.info(f"RoutineAgent: Updating routine with input: {input_str}")
            
            # Verificar se input_str está vazio
            if not input_str:
                logger.warning("RoutineAgent: Attempt to update routine without data")
                return "Please provide the routine data you want to update."
            
            # Parse input string
            parts = input_str.split('|')
            if len(parts) < 2:
                return "Invalid format. Use: 'routine_id|field1=value1|field2=value2|...'"
            
            routine_id = parts[0]
            
            # Primeiro, buscar a rotina existente
            success, error_msg, existing_data = self.api_client.get_routine(routine_id)
            if not success:
                return f"Error fetching existing routine: {error_msg}"
            
            # Obter os dados existentes da rotina
            existing_routine = existing_data.get('data', {})
            if not existing_routine:
                return f"Routine with ID {routine_id} not found."
            
            # Log dos dados existentes
            logger.info(f"RoutineAgent: Existing routine data: {json.dumps(existing_routine, indent=2)}")
            
            # Preparar os dados de atualização
            updates = {}
            
            # Mapeamento de nomes de campos alternativos para nomes padrão
            field_mapping = {
                'description': 'description',
                'desc': 'description',
                'name': 'name',
                'title': 'name',
                'status': 'status',
                'schedule': 'schedule',
                'time': 'schedule',
                'frequency': 'frequency',
                'freq': 'frequency',
                'priority': 'priority',
                'pri': 'priority',
                'tags': 'tags',
                'tag': 'tags',
                'estimated_duration': 'estimated_duration',
                'duration': 'estimated_duration',
                'estimatedduration': 'estimated_duration',
                'start_date': 'start_date',
                'startdate': 'start_date',
                'start': 'start_date',
                'end_date': 'end_date',
                'enddate': 'end_date',
                'end': 'end_date'
            }
            
            # Parse update fields
            for part in parts[1:]:
                if '=' not in part:
                    continue
                field, value = part.split('=', 1)
                field = field.strip().lower()
                value = value.strip()
                
                # Mapear o nome do campo para o nome padrão
                if field in field_mapping:
                    field = field_mapping[field]
                
                # Handle special fields with proper type conversion
                if field == 'tags':
                    updates[field] = [tag.strip() for tag in value.split(',')] if value else []
                elif field == 'estimated_duration':
                    try:
                        updates[field] = int(value) if value else 0
                    except (ValueError, TypeError):
                        logger.warning(f"RoutineAgent: Invalid value for estimated_duration: {value}")
                        return f"Invalid value for estimated_duration: {value}. Must be an integer."
                elif field == 'status' and not value:
                    updates[field] = self.default_values['status']
                elif field == 'frequency' and not value:
                    updates[field] = self.default_values['frequency']
                elif field == 'priority' and not value:
                    updates[field] = self.default_values['priority']
                elif field in ['schedule', 'start_date', 'end_date'] and not value:
                    updates[field] = None
                else:
                    updates[field] = value
            
            if not updates:
                return "No fields to update were provided."
            
            # Log das atualizações
            logger.info(f"RoutineAgent: Update fields: {json.dumps(updates, indent=2)}")
            
            # Mesclar os dados existentes com as atualizações
            merged_data = existing_routine.copy()
            merged_data.update(updates)
            
            # Garantir que campos de data sejam strings ou None
            for date_field in ['start_date', 'end_date']:
                if date_field in merged_data:
                    if merged_data[date_field] is None:
                        merged_data[date_field] = None
                    else:
                        merged_data[date_field] = str(merged_data[date_field])
            
            # Garantir que estimated_duration seja um inteiro
            if 'estimated_duration' in merged_data:
                try:
                    merged_data['estimated_duration'] = int(merged_data['estimated_duration'])
                except (ValueError, TypeError):
                    logger.warning(f"RoutineAgent: Invalid value for estimated_duration: {merged_data['estimated_duration']}")
                    return f"Invalid value for estimated_duration: {merged_data['estimated_duration']}. Must be an integer."
            
            # Log dos dados mesclados
            logger.info(f"RoutineAgent: Merged data: {json.dumps(merged_data, indent=2)}")
            
            # Validar os dados mesclados
            validation_result = self._validate_routine_data(merged_data, is_update=True)
            if validation_result != "OK":
                logger.warning(f"RoutineAgent: Validation failed: {validation_result}")
                return validation_result
            
            # Fazer a requisição de atualização com os dados mesclados
            success, error_msg, result = self.api_client.update_routine(routine_id, merged_data)
            
            # Log detalhado da resposta da API
            logger.info(f"RoutineAgent: API update response - Success: {success}, Error: {error_msg}, Result: {json.dumps(result, indent=2)}")
            
            if not success:
                return error_msg
            
            elapsed_time = time.time() - start_time
            success_msg = f"Routine updated successfully!\nID: {result.get('id', 'N/A')}"
            
            logger.info(f"RoutineAgent: Routine updated in {elapsed_time:.2f}s: {success_msg}")
            return success_msg
            
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Error updating routine after {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"RoutineAgent: {error_msg}")
            logger.error(f"RoutineAgent: Traceback: {traceback.format_exc()}")
            return error_msg
    
    def delete_routine(self, routine_id: str = "", _=None) -> str:
        """Deleta uma rotina existente."""
        try:
            start_time = time.time()
            
            # Verificar se routine_id está vazio
            if not routine_id:
                logger.warning("RoutineAgent: Attempt to delete routine without ID")
                return "Please provide the ID of the routine you want to delete."
                
            logger.info(f"RoutineAgent: Deleting routine {routine_id}")
            
            success, error_msg, data = self.api_client.delete_routine(routine_id)
            if not success:
                return error_msg
            
            # Create success message
            success_msg = f"Routine {routine_id} deleted successfully!"
            if data.get('message'):
                success_msg = data['message']
            
            elapsed_time = time.time() - start_time
            logger.info(f"RoutineAgent: Routine deleted in {elapsed_time:.2f}s")
            return success_msg
            
        except Exception as e:
            elapsed_time = time.time() - start_time
            error_msg = f"Error deleting routine after {elapsed_time:.2f}s: {str(e)}"
            logger.error(f"RoutineAgent: {error_msg}")
            logger.error(f"RoutineAgent: Traceback: {traceback.format_exc()}")
            return error_msg 