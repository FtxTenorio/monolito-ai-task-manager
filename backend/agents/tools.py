from langchain.tools import Tool
import difflib
import requests
import json
from typing import Optional
import time

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
        )
    ]
    
    return tools 