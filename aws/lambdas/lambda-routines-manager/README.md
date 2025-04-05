# Lambda Routines Manager

Este projeto implementa uma função Lambda para gerenciar rotinas usando AWS SAM e DynamoDB.

## Estrutura do Projeto

```
lambda-routines-manager/
├── src/                      # Código fonte
│   ├── handlers/             # Manipuladores Lambda
│   │   ├── __init__.py
│   │   └── routine_handler.py
│   ├── models/               # Modelos de dados
│   │   ├── __init__.py
│   │   └── routine.py
│   ├── services/             # Serviços de negócio
│   │   ├── __init__.py
│   │   └── routine_service.py
│   ├── utils/                # Utilitários
│   │   ├── __init__.py
│   │   └── decimal_encoder.py
│   ├── __init__.py
│   └── app.py                # Ponto de entrada
├── tests/                    # Testes
│   ├── events/               # Eventos de teste
│   │   ├── create-routine.json
│   │   └── list-routines.json
│   └── test_lambda.py        # Testes unitários
├── .aws-sam/                 # Arquivos SAM (gerados)
├── .venv/                    # Ambiente virtual Python
├── template.yaml             # Template SAM
├── requirements.txt          # Dependências Python
└── README.md                 # Este arquivo
```

## Funcionalidades

- Criar rotinas
- Listar rotinas
- Atualizar rotinas
- Deletar rotinas

## Tecnologias Utilizadas

- AWS SAM
- AWS Lambda
- Amazon DynamoDB
- Python 3.11
- Moto (para testes)

## Configuração

1. Instale as dependências:
   ```
   pip install -r requirements.txt
   ```

2. Configure o ambiente virtual:
   ```
   python -m venv .venv
   source .venv/bin/activate  # Linux/Mac
   .venv\Scripts\activate     # Windows
   ```

3. Execute os testes:
   ```
   python tests/test_lambda.py
   ```

## Implantação

Para implantar a função Lambda:

```
sam build
sam deploy --guided
```

## API

### Endpoints

- `GET /routines` - Lista todas as rotinas
- `GET /routines/{id}` - Obtém uma rotina específica
- `POST /routines` - Cria uma nova rotina
- `PUT /routines/{id}` - Atualiza uma rotina existente
- `DELETE /routines/{id}` - Deleta uma rotina

### Formato de Dados

Exemplo de rotina:

```json
{
  "id": "uuid",
  "name": "Rotina Diária de Exercícios",
  "description": "30 minutos de exercícios pela manhã",
  "status": "pending",
  "schedule": "08:00",
  "frequency": "daily",
  "priority": "high",
  "tags": ["saúde", "exercício"],
  "estimated_duration": 30,
  "created_at": "2023-04-05T12:00:00",
  "updated_at": "2023-04-05T12:00:00"
}
```

## Testando no API Gateway

### 1. Listar Todas as Rotinas (GET /routines)

1. No console do API Gateway, vá para seu API
2. Selecione o recurso `/routines`
3. Clique no método `GET`
4. Clique em "Test"
5. Não é necessário preencher nenhum parâmetro
6. Clique em "Test"

Resposta esperada:
```json
{
    "message": "Successfully retrieved routines at GET /routines",
    "data": [
        {
            "id": "123",
            "name": "Rotina Diária de Exercícios",
            "description": "30 minutos de exercícios pela manhã",
            "status": "pending",
            "schedule": "08:00",
            "frequency": "daily",
            "priority": "high",
            "tags": ["saúde", "exercício"],
            "estimated_duration": 30,
            "created_at": "2023-04-05T12:00:00",
            "updated_at": "2023-04-05T12:00:00"
        }
    ]
}
```

### 2. Obter uma Rotina Específica (GET /routines/{id})

1. No console do API Gateway, vá para seu API
2. Selecione o recurso `/routines/{id}`
3. Clique no método `GET`
4. Clique em "Test"
5. Em "Path Parameters", preencha:
   - `id`: "123" (ou o ID da rotina que deseja buscar)
6. Clique em "Test"

Resposta esperada:
```json
{
    "message": "Successfully retrieved routine at GET /routines/123",
    "data": {
        "id": "123",
        "name": "Rotina Diária de Exercícios",
        "description": "30 minutos de exercícios pela manhã",
        "status": "pending",
        "schedule": "08:00",
        "frequency": "daily",
        "priority": "high",
        "tags": ["saúde", "exercício"],
        "estimated_duration": 30,
        "created_at": "2023-04-05T12:00:00",
        "updated_at": "2023-04-05T12:00:00"
    }
}
```

### 3. Criar uma Nova Rotina (POST /routines)

1. No console do API Gateway, vá para seu API
2. Selecione o recurso `/routines`
3. Clique no método `POST`
4. Clique em "Test"
5. Em "Request Body", cole o seguinte JSON:
```json
{
    "name": "Rotina de Estudo Noturno",
    "description": "Sessão de estudo focada em programação e inglês",
    "status": "pending",
    "schedule": "20:00",
    "frequency": "daily",
    "priority": "medium",
    "tags": ["estudo", "programação", "inglês"],
    "estimated_duration": 120
}
```

**Importante**: Certifique-se de que o JSON está serializado corretamente. No console do API Gateway, o campo "Request Body" já deve estar configurado para aceitar JSON, mas se estiver usando outras ferramentas, você precisará serializar o JSON manualmente.

Resposta esperada:
```json
{
    "message": "Successfully created routine at POST /routines",
    "data": {
        "id": "456",
        "name": "Rotina de Estudo Noturno",
        "description": "Sessão de estudo focada em programação e inglês",
        "status": "pending",
        "schedule": "20:00",
        "frequency": "daily",
        "priority": "medium",
        "tags": ["estudo", "programação", "inglês"],
        "estimated_duration": 120,
        "created_at": "2023-04-05T14:00:00",
        "updated_at": "2023-04-05T14:00:00"
    }
}
```

### 4. Atualizar uma Rotina (PUT /routines/{id})

1. No console do API Gateway, vá para seu API
2. Selecione o recurso `/routines/{id}`
3. Clique no método `PUT`
4. Clique em "Test"
5. Em "Path Parameters", preencha:
   - `id`: "123" (ou o ID da rotina que deseja atualizar)
6. Em "Request Body", cole o seguinte JSON:
```json
{
    "name": "Rotina Diária de Exercícios Atualizada",
    "description": "45 minutos de exercícios pela manhã",
    "status": "completed",
    "schedule": "09:00",
    "frequency": "daily",
    "priority": "medium",
    "tags": ["saúde", "exercício", "bem-estar"],
    "estimated_duration": 45
}
```

**Importante**: Certifique-se de que o JSON está serializado corretamente. No console do API Gateway, o campo "Request Body" já deve estar configurado para aceitar JSON, mas se estiver usando outras ferramentas, você precisará serializar o JSON manualmente.

Resposta esperada:
```json
{
    "message": "Successfully updated routine at PUT /routines/123",
    "data": {
        "id": "123",
        "name": "Rotina Diária de Exercícios Atualizada",
        "description": "45 minutos de exercícios pela manhã",
        "status": "completed",
        "schedule": "09:00",
        "frequency": "daily",
        "priority": "medium",
        "tags": ["saúde", "exercício", "bem-estar"],
        "estimated_duration": 45,
        "created_at": "2023-04-05T12:00:00",
        "updated_at": "2023-04-05T15:00:00"
    }
}
```

### 5. Deletar uma Rotina (DELETE /routines/{id})

1. No console do API Gateway, vá para seu API
2. Selecione o recurso `/routines/{id}`
3. Clique no método `DELETE`
4. Clique em "Test"
5. Em "Path Parameters", preencha:
   - `id`: "123" (ou o ID da rotina que deseja deletar)
6. Clique em "Test"

Resposta esperada:
```json
{
    "message": "Successfully deleted routine at DELETE /routines/123",
    "data": null
}
```

## API Gateway Mapping Template

When configuring the API Gateway integration, use the following mapping template to properly format the request for the Lambda function:

```json
#set($allParams = $input.params())
{
    "httpMethod": "$context.httpMethod",
    "pathParameters": {
        #if($input.params().path.containsKey('id'))
        "id": "$input.params().path.get('id')"
        #end
    },
    "body": $input.json('$'),
    "params": {
        #foreach($type in $allParams.keySet())
            #set($params = $allParams.get($type))
        "$type": {
            #foreach($paramName in $params.keySet())
            "$paramName": "$util.escapeJavaScript($params.get($paramName))"
                #if($foreach.hasNext),#end
            #end
        }
            #if($foreach.hasNext),#end
        #end
    },
    "stage-variables": {
        #foreach($key in $stageVariables.keySet())
        "$key": "$util.escapeJavaScript($stageVariables.get($key))"
            #if($foreach.hasNext),#end
        #end
    },
    "context": {
        "account-id": "$context.identity.accountId",
        "api-id": "$context.apiId",
        "api-key": "$context.identity.apiKey",
        "authorizer-principal-id": "$context.authorizer.principalId",
        "caller": "$context.identity.caller",
        "cognito-authentication-provider": "$context.identity.cognitoAuthenticationProvider",
        "cognito-authentication-type": "$context.identity.cognitoAuthenticationType",
        "cognito-identity-id": "$context.identity.cognitoIdentityId",
        "cognito-identity-pool-id": "$context.identity.cognitoIdentityPoolId",
        "http-method": "$context.httpMethod",
        "stage": "$context.stage",
        "source-ip": "$context.identity.sourceIp",
        "user": "$context.identity.user",
        "user-agent": "$context.identity.userAgent",
        "user-arn": "$context.identity.userArn",
        "request-id": "$context.requestId",
        "resource-id": "$context.resourceId",
        "resource-path": "$context.resourcePath"
    }
}
```

To configure this template in the API Gateway:
1. Go to your API in the API Gateway console
2. Select the resource and method
3. Click on "Integration Request"
4. Expand "Mapping Templates"
5. Set "Request body passthrough" to "When there are no templates defined"
6. Click "Add mapping template"
7. Set "Content-Type" to `application/json`
8. Paste the template above

## Testing

Run the tests:
```bash
python -m pytest tests/
```

## Local Development

1. Start DynamoDB local:
```bash
docker run -p 8000:8000 amazon/dynamodb-local
```

2. Run the function locally:
```bash
sam local invoke GetRoutinesFunction --event events/event.json
```

## API Endpoints

- GET /routines - List all routines
- GET /routines/{id} - Get a specific routine
- POST /routines - Create a new routine
- PUT /routines/{id} - Update a routine
- DELETE /routines/{id} - Delete a routine 