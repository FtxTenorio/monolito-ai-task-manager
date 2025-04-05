from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from .base_agent import BaseAgent
from .tools import get_available_tools, format_response
import json
import asyncio
from langchain.callbacks.base import BaseCallbackHandler

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
    
    async def process_message_async(self, message, response_format="markdown", websocket=None):
        """
        Versão assíncrona do processamento de mensagens.
        
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
        async def send_update(update_type, content):
            if websocket:
                try:
                    await websocket.send_text(json.dumps({
                        "type": "thinking",
                        "update_type": update_type,
                        "content": content
                    }))
                except Exception as e:
                    print(f"Erro ao enviar atualização: {e}")
        
        # Obter resposta do agente
        try:
            # Enviar atualização de início do processamento
            if websocket:
                await send_update("start", "Iniciando processamento da sua solicitação...")
            
            # Criar um callback handler personalizado
            class WebSocketCallbackHandler(BaseCallbackHandler):
                def __init__(self, websocket, send_update_func):
                    self.websocket = websocket
                    self.send_update_func = send_update_func
                    self.tool_start_times = {}
                    self.active_tools = []
                
                def on_tool_start(self, serialized, input_str, **kwargs):
                    if self.websocket:
                        tool_name = serialized.get('name', 'desconhecida')
                        tool_description = serialized.get('description', 'Sem descrição')
                        tool_parameters = serialized.get('parameters', {})
                        
                        # Registrar o início da execução da ferramenta
                        self.tool_start_times[tool_name] = asyncio.get_event_loop().time()
                        self.active_tools.append(tool_name)
                        
                        # Preparar informações detalhadas sobre a ferramenta
                        tool_info = {
                            "name": tool_name,
                            "description": tool_description,
                            "parameters": tool_parameters,
                            "input": input_str,
                            "start_time": self.tool_start_times[tool_name],
                            "status": "running"
                        }
                        
                        asyncio.create_task(self.send_update_func(
                            "tool_start",
                            {
                                "tool": tool_info,
                                "active_tools": self.active_tools,
                                "message": f"Iniciando execução da ferramenta: {tool_name}"
                            }
                        ))
                
                def on_tool_end(self, output, **kwargs):
                    if self.websocket:
                        # Identificar a ferramenta mais recente
                        if not self.active_tools:
                            return
                            
                        tool_name = self.active_tools.pop()
                        end_time = asyncio.get_event_loop().time()
                        
                        # Calcular o tempo de execução
                        start_time = self.tool_start_times.get(tool_name)
                        execution_time = end_time - start_time if start_time else None
                        
                        # Preparar informações sobre o resultado
                        result_info = {
                            "tool_name": tool_name,
                            "execution_time": execution_time,
                            "output": output,
                            "status": "completed"
                        }
                        
                        asyncio.create_task(self.send_update_func(
                            "tool_end",
                            {
                                "result": result_info,
                                "active_tools": self.active_tools,
                                "message": f"Ferramenta {tool_name} concluída em {execution_time:.2f}s"
                            }
                        ))
                
                def on_chain_start(self, serialized, inputs, **kwargs):
                    if self.websocket:
                        asyncio.create_task(self.send_update_func(
                            "chain_start",
                            {
                                "message": "Iniciando cadeia de processamento",
                                "inputs": inputs
                            }
                        ))
                
                def on_chain_end(self, outputs, **kwargs):
                    if self.websocket:
                        asyncio.create_task(self.send_update_func(
                            "chain_end",
                            {
                                "message": "Processamento concluído",
                                "outputs": outputs
                            }
                        ))
                
                def on_llm_start(self, serialized, prompts, **kwargs):
                    if self.websocket:
                        asyncio.create_task(self.send_update_func(
                            "llm_start",
                            {
                                "message": "Iniciando processamento do modelo de linguagem",
                                "model": serialized.get("name", "unknown")
                            }
                        ))
                
                def on_llm_end(self, response, **kwargs):
                    if self.websocket:
                        asyncio.create_task(self.send_update_func(
                            "llm_end",
                            {
                                "message": "Modelo de linguagem concluiu o processamento",
                                "tokens_used": getattr(response, "llm_output", {}).get("token_usage", {})
                            }
                        ))
                
                def on_llm_error(self, error, **kwargs):
                    if self.websocket:
                        asyncio.create_task(self.send_update_func(
                            "llm_error",
                            {
                                "message": f"Erro no modelo de linguagem: {str(error)}",
                                "error": str(error)
                            }
                        ))
                
                def on_tool_error(self, error, **kwargs):
                    if self.websocket:
                        # Identificar a ferramenta mais recente
                        if not self.active_tools:
                            return
                            
                        tool_name = self.active_tools.pop()
                        
                        asyncio.create_task(self.send_update_func(
                            "tool_error",
                            {
                                "tool_name": tool_name,
                                "message": f"Erro na ferramenta {tool_name}: {str(error)}",
                                "error": str(error),
                                "active_tools": self.active_tools
                            }
                        ))
            
            # Configurar o callback handler
            callback_handler = WebSocketCallbackHandler(websocket, send_update) if websocket else None
            
            # Obter resposta
            response = self.agent_executor.invoke(
                {
                    "input": message,
                    "chat_history": self.conversation_history[:-1]  # Excluir a mensagem atual
                },
                callbacks=[callback_handler] if callback_handler else None
            )
            
            response_text = response["output"]
            
            # Formatar a resposta de acordo com o formato solicitado
            formatted_response = format_response(response_text, response_format)
            
            # Adicionar a resposta ao histórico (mantém o formato original para o histórico)
            self.conversation_history.append(AIMessage(content=response_text))
            
            # Enviar atualização de conclusão
            if websocket:
                await send_update("complete", "Processamento concluído!")
            
            return formatted_response
            
        except Exception as e:
            error_message = f"Erro ao processar mensagem: {str(e)}"
            if websocket:
                await send_update("error", error_message)
            raise Exception(error_message)
    
    def process_message(self, message, response_format="markdown", websocket=None):
        """
        Versão síncrona do processamento de mensagens.
        Redireciona para a versão assíncrona se um websocket for fornecido.
        
        Args:
            message (str): A mensagem do usuário
            response_format (str): Formato da resposta (markdown, text, html)
            websocket: WebSocket para enviar atualizações em tempo real
            
        Returns:
            str: A resposta do agente formatada
        """
        # Se um websocket for fornecido, use a versão assíncrona
        if websocket:
            # Criar um novo loop de eventos para executar a função assíncrona
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(
                    self.process_message_async(message, response_format, websocket)
                )
            finally:
                loop.close()
        else:
            # Caso contrário, use o processamento síncrono padrão
            # Adicionar a mensagem do usuário ao histórico
            self.conversation_history.append(HumanMessage(content=message))
            
            # Obter resposta do agente
            try:
                response = self.agent_executor.invoke({
                    "input": message,
                    "chat_history": self.conversation_history[:-1]  # Excluir a mensagem atual
                })
                
                response_text = response["output"]
                
                # Formatar a resposta de acordo com o formato solicitado
                formatted_response = format_response(response_text, response_format)
                
                # Adicionar a resposta ao histórico
                self.conversation_history.append(AIMessage(content=response_text))
                
                return formatted_response
                
            except Exception as e:
                error_message = f"Erro ao processar mensagem: {str(e)}"
                raise Exception(error_message) 