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

def get_tasks(query: str = "") -> str:
    """
    Obtém a lista de todas as tarefas.
    
    Args:
        query (str): Parâmetro opcional para compatibilidade com a interface Tool.
        
    Retorna uma lista formatada de todas as tarefas com os seguintes campos:
    - ID: Identificador único da tarefa
    - Descrição: Texto descritivo da tarefa
    - Prioridade: Pode ser "Alta", "Média" ou "Baixa"
    - Categoria: Categoria da tarefa (ex: "Compasso", "Geral", "Continuar", "Desenvolvimento", "Backup")
    - Status: Pode ser "Pendente" ou "Concluído"
    - Data de Criação: Data e hora de criação da tarefa
    """
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

def create_task(input_str: str) -> str:
    """
    Cria uma nova tarefa.
    
    Args:
        input_str (str): String com os dados da tarefa no formato "descrição|prioridade|categoria|status"
    
    Returns:
        str: Mensagem de sucesso ou erro
    """
    try:
        print(f"Recebido input: {input_str}")
        
        # Dividir a string de entrada em partes
        parts = input_str.split("|")
        print(f"Partes divididas: {parts}")
        
        if len(parts) != 4:
            return "Erro: Formato inválido. Use 'descrição|prioridade|categoria|status'"
        
        descricao, prioridade, categoria, status = parts
        
        # Normalizar valores
        prioridade = prioridade.strip()
        categoria = categoria.strip()
        status = status.strip()
        
        print(f"Valores normalizados: descrição={descricao}, prioridade={prioridade}, categoria={categoria}, status={status}")
        
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
        
        print(f"Enviando dados para API: {task_data}")
        
        response = requests.post('https://api.itenorio.com/lambda/tasks', json=task_data)
        
        print(f"Resposta da API: {response.status_code} - {response.text}")
        
        if response.status_code == 200:
            return "Tarefa criada com sucesso!"
        else:
            return f"Erro ao criar tarefa: {response.text}"
    except Exception as e:
        print(f"Exceção ao criar tarefa: {str(e)}")
        return f"Erro ao criar tarefa: {str(e)}"

def update_task(input_str: str) -> str:
    """
    Atualiza uma tarefa existente.
    
    Args:
        input_str (str): String com os dados da tarefa no formato "task_id|campo1=valor1|campo2=valor2|..."
                      Exemplo: "123|descrição=Nova descrição|status=Concluído"
    
    Returns:
        str: Mensagem de sucesso ou erro
    """
    try:
        # Dividir a string de entrada em partes
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
        
        # Processar os campos
        for part in parts[1:]:
            if "=" in part:
                key, value = part.split("=", 1)
                key = key.lower().strip()
                if key in field_mapping:
                    formatted_task[field_mapping[key]] = value
        
        # Validar valores aceitos
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

def delete_task(task_id: str) -> str:
    """
    Remove uma tarefa.
    """
    try:
        response = requests.delete(f'https://api.itenorio.com/lambda/tasks/{task_id}')
        
        if response.status_code == 200:
            return "Tarefa removida com sucesso!"
        else:
            return f"Erro ao remover tarefa: {response.text}"
    except Exception as e:
        return f"Erro ao remover tarefa: {str(e)}"

def get_available_tools():
    """
    Retorna a lista de ferramentas disponíveis.
    """
    return [
        Tool(
            name="format_response",
            func=format_response,
            description="Formata o texto de acordo com o tipo especificado (markdown, text, html)"
        ),
        Tool(
            name="get_tasks",
            func=get_tasks,
            description="Obtém a lista de todas as tarefas. Retorna ID, Descrição, Prioridade, Categoria, Status e Data de Criação de cada tarefa."
        ),
        Tool(
            name="create_task",
            func=create_task,
            description="Cria uma nova tarefa. Use o formato: 'descrição|prioridade|categoria|status'. Exemplo: 'Fazer compras|Alta|Pessoal|Pendente'"
        ),
        Tool(
            name="update_task",
            func=update_task,
            description="Atualiza uma tarefa existente. Use o formato: 'task_id|campo1=valor1|campo2=valor2|...'. Exemplo: '123|descrição=Nova descrição|status=Concluído'"
        ),
        Tool(
            name="delete_task",
            func=delete_task,
            description="Remove uma tarefa. Parâmetro: task_id (string)"
        )
    ] 