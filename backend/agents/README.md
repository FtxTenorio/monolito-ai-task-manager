# Agents

Este diretório contém os agentes de IA utilizados no sistema.

## Estrutura

- `base_agent.py`: Contém a classe `BaseAgent`, que é a classe base para todos os agentes.
- `tool_agent.py`: Contém a classe `ToolAgent`, que estende `BaseAgent` e adiciona suporte a ferramentas.
- `tools.py`: Contém as ferramentas disponíveis para os agentes.
- `__init__.py`: Arquivo de inicialização do pacote.

## Ferramentas Disponíveis

### web_search
Utiliza o DuckDuckGo para buscar informações atualizadas na internet.

### similarity_calculator
Calcula a similaridade entre duas strings.

## Como Adicionar Novas Ferramentas

Para adicionar uma nova ferramenta, siga estes passos:

1. Adicione a função da ferramenta no arquivo `tools.py`.
2. Adicione a ferramenta à lista de ferramentas retornada pela função `get_available_tools()`.
3. Atualize a documentação neste arquivo.

## Como Criar um Novo Agente

Para criar um novo agente, siga estes passos:

1. Crie uma nova classe que estenda `BaseAgent`.
2. Implemente os métodos necessários.
3. Atualize o arquivo `__init__.py` para exportar a nova classe. 