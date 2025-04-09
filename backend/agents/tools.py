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
from utils.websocket_utils import send_websocket_message as send_ws_message
import logging
from functools import partial
import asyncio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configurar locale para português
try:
    locale.setlocale(locale.LC_TIME, 'pt_BR.UTF-8')
except:
    try:
        locale.setlocale(locale.LC_TIME, 'pt_BR')
    except:
        pass  # Se não conseguir configurar, usa o padrão

async def safe_web_search(query: str, client_id: int = None) -> str:
    """
    Realiza uma busca na web usando a API do Wikipedia.
    
    Args:
        query (str): A consulta de busca
        client_id (int): ID do cliente para envio de mensagens websocket
        
    Returns:
        str: O resultado da busca ou uma mensagem de erro
    """
    func_name = safe_web_search.__name__.replace("_", " ").title()
    try:
        await send_websocket_message(f"A função {func_name} foi iniciada.", client_id, "function_call_start")

        # Primeiro, fazemos uma busca na Wikipedia
        search_url = "https://pt.wikipedia.org/w/api.php"
        search_params = {
            "action": "query", 
            "format": "json",
            "list": "search",
            "srsearch": query,
            "utf8": 1
        }
        
        await send_websocket_message("Realizando busca na Wikipedia...", client_id, "function_call_start")
        search_response = requests.get(search_url, params=search_params)
        search_data = search_response.json()
        
        if "query" in search_data and "search" in search_data["query"] and len(search_data["query"]["search"]) > 0:
            # Pegar o primeiro resultado
            first_result = search_data["query"]["search"][0]
            page_title = first_result["title"]
            
            await send_websocket_message(f"Obtendo conteúdo da página: {page_title}", client_id, "function_call_start")
            
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
                await send_websocket_message(f"Busca concluída com sucesso", client_id, "function_call_end")
                return f"De acordo com a Wikipedia:\n\n{content}"
            
        await send_websocket_message("Nenhum resultado encontrado", client_id, "function_call_end")
        return "Desculpe, não encontrei informações relevantes sobre sua busca na Wikipedia."
    
    except Exception as e:
        error_msg = f"Não foi possível realizar a busca devido a um erro: {str(e)}"
        await send_websocket_message(error_msg, client_id, "function_call_error")
        return error_msg

async def send_websocket_message(message: str, id_client_ws: str, type: str):
    # Envia uma mensagem para o cliente, via websocket
    await send_ws_message(message, id_client_ws, type, "text")

async def aget_datetime_info(query: str = "", client_id: int = None) -> str:
    """
    Fornece informações sobre a data e hora atual.
    
    Args:
        query (str): Parâmetro opcional para compatibilidade com a interface Tool.
        
    Returns:
        str: Informações de data e hora formatadas
    """
    try:
        await send_websocket_message("Obtendo informações atualizadas de data e hora...", client_id, "function_call_start")
        
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
        
        await send_websocket_message("Informações de data e hora obtidas com sucesso!", client_id, "function_call_end")
        return context.strip()
    
    except Exception as e:
        error_msg = f"Ocorreu um erro ao tentar obter as informações de data e hora: {str(e)}"
        await send_websocket_message(error_msg, client_id, "function_call_error")
        return f"Erro ao obter informações de data e hora: {str(e)}"

async def format_response(text: str, format_type: str = "markdown", client_id: int = None) -> str:
    """
    Formata a resposta de acordo com o tipo especificado.
    
    Args:
        text (str): Texto a ser formatado
        format_type (str): Tipo de formatação ('markdown', 'text', 'html')
        
    Returns:
        str: Texto formatado
    """
    await send_websocket_message("Formatando resposta...", client_id, "function_call_start")
    if format_type == "text":
        await send_websocket_message("Removendo formatação markdown...", client_id, "function_call_start")
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
        await send_websocket_message("Convertendo markdown para HTML...", client_id, "function_call_start")
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
    await send_websocket_message("Resposta formatada com sucesso!", client_id, "function_call_end")
    return text

def get_available_tools(client_id: int):
    """
    Retorna a lista de ferramentas disponíveis.
    """
    # Faz um bind do client id para a get_datetime_info
    aget_datetime_info_partial = partial(aget_datetime_info, client_id=client_id)
    asafe_web_search_partial = partial(safe_web_search, client_id=client_id)
    aformat_response_partial = partial(format_response, client_id=client_id)

    return [
        Tool(
            name="safe_web_search",
            func=asafe_web_search_partial,
            coroutine=asafe_web_search_partial,
            description="Realiza uma busca na web usando a API do Wikipedia. Parâmetro: query (string)"
        ),
        Tool(
            name="get_datetime_info",
            func=aget_datetime_info_partial,
            coroutine=aget_datetime_info_partial,
            description="Função Assíncrona: Obtém informações sobre a data e hora atual. Parâmetro: query (string)"
        ),
        Tool(
            name="format_response",
            func=aformat_response_partial,
            coroutine=aformat_response_partial,
            description="Formata o texto de acordo com o tipo especificado (markdown, text, html)"
        )
    ] 