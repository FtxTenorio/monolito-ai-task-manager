# Documentação de Mensagens WebSocket

## Estrutura do Message Data

O `message_data` é um dicionário Python que será convertido para JSON antes de ser enviado via WebSocket. A estrutura básica é:

```python
message_data = {
    "type": type,        # Tipo da mensagem (ex: "function_call_start", "function_call_error", "function_call_end")
    "content": message,  # Conteúdo da mensagem (texto explicativo do que está acontecendo)
    "format": "text"     # Formato da mensagem (sempre "text" neste caso)
}
```

## Exemplos de Mensagens

### 1. Início da Função
```json
{
    "type": "function_call_start",
    "content": "A função Nome Da Função foi executada com sucesso.",
    "format": "text"
}
```

### 2. Erro na Execução
```json
{
    "type": "function_call_error",
    "content": "Erro ao executar a função Nome Da Função: [descrição do erro]",
    "format": "text"
}
```

### 3. Finalização da Função
```json
{
    "type": "function_call_end",
    "content": "A função Nome Da Função está finalizando a execução.",
    "format": "text"
}
```

## Propósito

Estas mensagens são enviadas para o cliente WebSocket para manter o usuário informado sobre o progresso e status das operações que estão sendo executadas no backend. O cliente pode usar estas informações para mostrar feedback em tempo real para o usuário, como:

- Indicadores de progresso
- Mensagens de erro
- Confirmações de conclusão
- Status atual da operação 