import json
import os
import boto3
from moto import mock_aws
from src.handlers.routine_handler import lambda_handler
from botocore.exceptions import ClientError
from datetime import datetime

# Configurar variáveis de ambiente
os.environ['ROUTINES_TABLE'] = 'Routines'
os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'

@mock_aws
def setup_dynamodb():
    # Criar tabela DynamoDB local
    dynamodb = boto3.resource('dynamodb')
    try:
        table = dynamodb.create_table(
            TableName='Routines',
            KeySchema=[
                {'AttributeName': 'id', 'KeyType': 'HASH'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'id', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST'
        )
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceInUseException':
            # Se a tabela já existe, apenas retorna ela
            table = dynamodb.Table('Routines')
        else:
            raise
    return table

@mock_aws
def test_create_routine():
    # Configurar DynamoDB local
    setup_dynamodb()
    
    # Evento de teste para criar uma rotina
    event = {
        "httpMethod": "POST",
        "body": json.dumps({
            "name": "Rotina Diária de Exercícios",
            "description": "30 minutos de exercícios pela manhã",
            "status": "pending",
            "schedule": "08:00",
            "frequency": "daily",
            "priority": "high",
            "tags": ["saúde", "exercício"],
            "estimated_duration": 30,
            "start_date": "2023-04-05T08:00:00",
            "end_date": "2023-04-05T08:30:00"
        })
    }
    
    print("\nTestando criação de rotina:")
    print("Entrada:", json.dumps(event, indent=2))
    response = lambda_handler(event, None)
    print("Saída:", json.dumps(response, indent=2))
    assert response['statusCode'] == 201
    
    body = json.loads(response['body'])
    assert body['message'] == "Successfully created routine at POST /routines"
    assert body['data']['name'] == "Rotina Diária de Exercícios"
    assert body['data']['description'] == "30 minutos de exercícios pela manhã"
    assert body['data']['status'] == "pending"
    assert body['data']['schedule'] == "08:00"
    assert body['data']['frequency'] == "daily"
    assert body['data']['priority'] == "high"
    assert body['data']['tags'] == ["saúde", "exercício"]
    assert body['data']['estimated_duration'] == 30
    assert body['data']['start_date'] == "2023-04-05T08:00:00"
    assert body['data']['end_date'] == "2023-04-05T08:30:00"
    assert 'id' in body['data']
    assert 'created_at' in body['data']
    assert 'updated_at' in body['data']
    return response

@mock_aws
def test_list_routines():
    # Configurar DynamoDB local
    setup_dynamodb()
    
    # Primeiro criar uma rotina para ter algo para listar
    test_create_routine()
    
    # Evento de teste para listar rotinas
    event = {
        "httpMethod": "GET"
    }
    
    print("\nTestando listagem de rotinas:")
    print("Entrada:", json.dumps(event, indent=2))
    response = lambda_handler(event, None)
    print("Saída:", json.dumps(response, indent=2))
    assert response['statusCode'] == 200
    
    body = json.loads(response['body'])
    assert body['message'] == "Successfully retrieved routines at GET /routines"
    assert isinstance(body['data'], list)

@mock_aws
def test_get_routine():
    # Primeiro, criar uma rotina
    create_event = {
        "httpMethod": "POST",
        "body": json.dumps({
            "name": "Rotina Diária de Exercícios",
            "description": "30 minutos de exercícios pela manhã",
            "status": "pending",
            "schedule": "08:00",
            "frequency": "daily",
            "priority": "high",
            "tags": ["saúde", "exercício"],
            "estimated_duration": 30,
            "start_date": "2023-04-05T08:00:00",
            "end_date": "2023-04-05T08:30:00"
        })
    }
    
    create_response = lambda_handler(create_event, None)
    routine_id = json.loads(create_response['body'])['data']['id']
    
    # Agora, buscar a rotina criada
    event = {
        "httpMethod": "GET",
        "pathParameters": {
            "id": routine_id
        }
    }
    
    response = lambda_handler(event, None)
    assert response['statusCode'] == 200
    
    body = json.loads(response['body'])
    assert body['message'] == f"Successfully retrieved routine at GET /routines/{routine_id}"
    assert body['data']['id'] == routine_id
    assert body['data']['name'] == "Rotina Diária de Exercícios"
    assert body['data']['description'] == "30 minutos de exercícios pela manhã"
    assert body['data']['status'] == "pending"
    assert body['data']['schedule'] == "08:00"
    assert body['data']['frequency'] == "daily"
    assert body['data']['priority'] == "high"
    assert body['data']['tags'] == ["saúde", "exercício"]
    assert body['data']['estimated_duration'] == 30
    assert body['data']['start_date'] == "2023-04-05T08:00:00"
    assert body['data']['end_date'] == "2023-04-05T08:30:00"

@mock_aws
def test_update_routine():
    # Configurar DynamoDB local
    setup_dynamodb()
    
    # Primeiro criar uma rotina para ter algo para atualizar
    create_response = test_create_routine()
    routine_id = json.loads(create_response['body'])['data']['id']
    
    # Evento de teste para atualizar uma rotina
    event = {
        "httpMethod": "PUT",
        "pathParameters": {
            "id": routine_id
        },
        "body": json.dumps({
            "name": "Rotina Diária de Exercícios Atualizada",
            "description": "45 minutos de exercícios pela manhã",
            "status": "completed",
            "schedule": "09:00",
            "frequency": "daily",
            "priority": "medium",
            "tags": ["saúde", "exercício", "bem-estar"],
            "estimated_duration": 45,
            "start_date": "2023-04-05T09:00:00",
            "end_date": "2023-04-05T09:45:00"
        })
    }
    
    print("\nTestando atualização de rotina:")
    print("Entrada:", json.dumps(event, indent=2))
    response = lambda_handler(event, None)
    print("Saída:", json.dumps(response, indent=2))
    assert response['statusCode'] == 200
    
    body = json.loads(response['body'])
    assert body['message'] == f"Successfully updated routine at PUT /routines/{routine_id}"
    assert body['data']['id'] == routine_id
    assert body['data']['name'] == "Rotina Diária de Exercícios Atualizada"
    assert body['data']['description'] == "45 minutos de exercícios pela manhã"
    assert body['data']['status'] == "completed"
    assert body['data']['schedule'] == "09:00"
    assert body['data']['frequency'] == "daily"
    assert body['data']['priority'] == "medium"
    assert body['data']['tags'] == ["saúde", "exercício", "bem-estar"]
    assert body['data']['estimated_duration'] == 45
    assert body['data']['start_date'] == "2023-04-05T09:00:00"
    assert body['data']['end_date'] == "2023-04-05T09:45:00"
    return response

@mock_aws
def test_delete_routine():
    # Configurar DynamoDB local
    setup_dynamodb()
    
    # Primeiro criar uma rotina para ter algo para deletar
    create_response = test_create_routine()
    routine_id = json.loads(create_response['body'])['data']['id']
    
    # Evento de teste para deletar uma rotina
    event = {
        "httpMethod": "DELETE",
        "pathParameters": {
            "id": routine_id
        }
    }
    
    print("\nTestando deleção de rotina:")
    print("Entrada:", json.dumps(event, indent=2))
    response = lambda_handler(event, None)
    print("Saída:", json.dumps(response, indent=2))
    assert response['statusCode'] == 204
    
    body = json.loads(response['body'])
    assert body['message'] == f"Successfully deleted routine at DELETE /routines/{routine_id}"
    assert body['data'] is None
    
    # Verificar se a rotina foi realmente deletada
    list_event = {
        "httpMethod": "GET"
    }
    list_response = lambda_handler(list_event, None)
    routines = json.loads(list_response['body'])
    assert len(routines) == 0, "A rotina não foi deletada corretamente"
    
    return response

if __name__ == "__main__":
    test_create_routine()
    test_list_routines()
    test_get_routine()
    test_update_routine()
    test_delete_routine() 