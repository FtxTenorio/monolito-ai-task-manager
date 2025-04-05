from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from .base_agent import BaseAgent
from .tools import get_available_tools, format_response

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
    
    def process_message(self, message, response_format="markdown"):
        """
        Processa uma mensagem do usuário usando o agente com ferramentas.
        
        Args:
            message (str): A mensagem do usuário
            response_format (str): Formato da resposta (markdown, text, html)
            
        Returns:
            str: A resposta do agente formatada
        """
        # Adicionar a mensagem do usuário ao histórico
        self.conversation_history.append(HumanMessage(content=message))
        
        # Obter resposta do agente
        response = self.agent_executor.invoke({
            "input": message,
            "chat_history": self.conversation_history[:-1]  # Excluir a mensagem atual
        })
        
        response_text = response["output"]
        
        # Formatar a resposta de acordo com o formato solicitado
        formatted_response = format_response(response_text, response_format)
        
        # Adicionar a resposta ao histórico (mantém o formato original para o histórico)
        self.conversation_history.append(AIMessage(content=response_text))
        
        return formatted_response 