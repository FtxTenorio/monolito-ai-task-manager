from langchain.tools import Tool
import difflib
import requests
import json
from typing import Optional, Dict, List, Any
import time
from datetime import datetime
import locale
import re
from bs4 import BeautifulSoup
import markdown
from ..controllers.app_controller import connnection_manager
# Configurar locale para português
try:
    locale.setlocale(locale.LC_TIME, 'pt_BR.UTF-8')
except:
    try:
        locale.setlocale(locale.LC_TIME, 'pt_BR')
    except:
        pass  # Se não conseguir configurar, usa o padrão

def safe_web_search(query: str) -> str:
    """
    Realiza uma busca na web usando a API do Wikipedia.
    
    Args:
        query (str): A consulta de busca
        
    Returns:
        str: O resultado da busca ou uma mensagem de erro
    """
    try:
        # Primeiro, fazemos uma busca na Wikipedia
        search_url = "https://pt.wikipedia.org/w/api.php"
        search_params = {
            "action": "query",
            "format": "json",
            "list": "search",
            "srsearch": query,
            "utf8": 1
        }
        
        search_response = requests.get(search_url, params=search_params)
        search_data = search_response.json()
        
        if "query" in search_data and "search" in search_data["query"] and len(search_data["query"]["search"]) > 0:
            # Pegar o primeiro resultado
            first_result = search_data["query"]["search"][0]
            page_title = first_result["title"]
            
            # Agora, obtemos o conteúdo da página
            content_params = {
                "action": "query",
                "format": "json",
                "prop": "extracts",
                "exintro": True,
                "explaintext": True,
                "titles": page_title,
                "utf8": 1
            }
            
            content_response = requests.get(search_url, params=content_params)
            content_data = content_response.json()
            
            # Extrair o conteúdo da página
            pages = content_data["query"]["pages"]
            page_id = next(iter(pages))
            content = pages[page_id].get("extract", "")
            
            if content:
                return f"De acordo com a Wikipedia:\n\n{content}"
            
        return "Desculpe, não encontrei informações relevantes sobre sua busca na Wikipedia."
    
    except Exception as e:
        return f"Não foi possível realizar a busca devido a um erro: {str(e)}"
# Vamos criar um decorator para pegar o ID do websocket na request, e enviar para o front end uma mensagem sobre uma tarefa
# Estar sendo executa no momento.

def inform_client_decorator(func):
    async def wrapper(query: str = "", id_client_ws=None):
        func_name = func.__name__.replace("_", " ").title()

        try:
            if id_client_ws:
                await send_websocket_message(f"A função {func_name} foi executada com sucesso.", id_client_ws, "function_call_start")
                result = await func(query, id_client_ws)
            return result
        except Exception as e:
            if id_client_ws:
                await send_websocket_message(f"Erro ao executar a função {func_name}: {str(e)}", id_client_ws, "function_call_error")
            raise
        finally:
            if id_client_ws:
                await send_websocket_message(f"A função {func_name} está finalizando a execução.", id_client_ws, "function_call_end")
    return wrapper

async def send_websocket_message(message: str, id_client_ws: str, type: str):
    # Envia uma mensagem para o cliente, via websocket
    message_data = {
                "type": type,
                "content": message,
                "format": "text"
            }
    await connnection_manager.active_connections[id_client_ws].send_text(json.dumps(message_data))

def get_datetime_info(query: str = "", client_id: int = None) -> str:
    """
    Fornece informações sobre a data e hora atual.
    
    Args:
        query (str): Parâmetro opcional para compatibilidade com a interface Tool.
        
    Returns:
        str: Informações de data e hora formatadas
    """
    try:
        # Obter data e hora atual
        now = datetime.now()
        
        # Formatar data e hora
        data_formatada = now.strftime("%d de %B de %Y")
        hora_formatada = now.strftime("%H:%M")
        dia_semana = now.strftime("%A").capitalize()
        
        # Montar o contexto
        context = f"""
            Data e hora atual:
            - Data: {data_formatada}
            - Dia da semana: {dia_semana}
            - Horário: {hora_formatada}
        """
        return context.strip()
    
    except Exception as e:
        return f"Erro ao obter informações de data e hora: {str(e)}"

def format_response(text: str, format_type: str = "markdown") -> str:
    """
    Formata a resposta de acordo com o tipo especificado.
    
    Args:
        text (str): Texto a ser formatado
        format_type (str): Tipo de formatação ('markdown', 'text', 'html')
        
    Returns:
        str: Texto formatado
    """
    if format_type == "text":
        # Remove formatação markdown
        text = re.sub(r'#+\s+', '', text)  # Remove headers
        text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)  # Remove bold
        text = re.sub(r'\*(.*?)\*', r'\1', text)  # Remove italic
        text = re.sub(r'`(.*?)`', r'\1', text)  # Remove code
        text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)  # Remove links
        text = re.sub(r'\n\s*[-*]\s+', '\n• ', text)  # Padroniza listas
        text = re.sub(r'\n\s*\d+\.\s+', '\n', text)  # Remove numeração
        return text.strip()
    
    elif format_type == "html":
        # Converte markdown para HTML
        html = markdown.markdown(text, extensions=['fenced_code', 'tables'])
        # Adiciona classes CSS para estilização
        soup = BeautifulSoup(html, 'html.parser')
        
        # Adiciona classes para diferentes elementos
        for tag in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
            tag['class'] = tag.get('class', []) + ['heading']
        
        for tag in soup.find_all('code'):
            tag['class'] = tag.get('class', []) + ['code-block']
        
        for tag in soup.find_all('pre'):
            tag['class'] = tag.get('class', []) + ['pre-block']
        
        return str(soup)
    
    # Se for markdown ou qualquer outro formato, retorna o texto original
    return text

def get_available_tools(client_id: int):
    """
    Retorna a lista de ferramentas disponíveis.
    """
    # Bind the client_id to the tools
    get_datetime_info = inform_client_decorator(get_datetime_info)
    # safe_web_search = inform_client_decorator(safe_web_search)
    # format_response = inform_client_decorator(format_response)
    
    return [
        Tool(
            name="safe_web_search",
            func=safe_web_search,
            description="Realiza uma busca na web usando a API do Wikipedia. Parâmetro: query (string)"
        ),
        Tool(
            name="get_datetime_info",
            func=get_datetime_info,
            description="Obtém informações sobre a data e hora atual. Parâmetro: query (string)"
        ),
        Tool(
            name="format_response",
            func=format_response,
            description="Formata o texto de acordo com o tipo especificado (markdown, text, html)"
        )
    ] 