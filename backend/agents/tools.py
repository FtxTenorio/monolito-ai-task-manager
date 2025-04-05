from langchain.tools import Tool
import difflib
import requests
import json
from typing import Optional
import time
from datetime import datetime
import locale
import re
from bs4 import BeautifulSoup
import markdown

# Configurar locale para português
try:
    locale.setlocale(locale.LC_TIME, 'pt_BR.UTF-8')
except:
    try:
        locale.setlocale(locale.LC_TIME, 'pt_BR')
    except:
        pass  # Se não conseguir configurar, usa o padrão

def calculate_similarity(str1, str2):
    """
    Calcula a similaridade entre duas strings.
    
    Args:
        str1 (str): Primeira string
        str2 (str): Segunda string
        
    Returns:
        float: Valor de similaridade entre 0 e 1
    """
    if not str1 or not str2:
        return 0.0
    return difflib.SequenceMatcher(None, str1, str2).ratio()

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

def get_datetime_info(query: str = "") -> str:
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

def get_available_tools():
    """
    Retorna as ferramentas disponíveis para o agente.
    
    Returns:
        list: Lista de ferramentas disponíveis
    """
    tools = [
        Tool(
            name="web_search",
            func=safe_web_search,
            description="Útil para buscar informações na Wikipedia. Use esta ferramenta quando precisar de informações sobre um tópico específico."
        ),
        Tool(
            name="similarity_calculator",
            func=lambda x: calculate_similarity(x.split(",")[0], x.split(",")[1]) if "," in x else 0.0,
            description="Calcula a similaridade entre duas strings. Entrada deve ser no formato 'string1,string2'."
        ),
        Tool(
            name="datetime_info",
            func=get_datetime_info,
            description="Fornece informações sobre a data e hora atual. Use esta ferramenta quando precisar de informações temporais. Não precisa enviar parâmetros."
        ),
        Tool(
            name="format_response",
            func=format_response,
            description="Formata a resposta de acordo com o tipo especificado (markdown, text, html). Use esta ferramenta para formatar a saída."
        )
    ]
    
    return tools 