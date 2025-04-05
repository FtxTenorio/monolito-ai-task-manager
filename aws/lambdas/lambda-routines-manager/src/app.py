import json
import logging
import os
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['ROUTINES_TABLE'])

class RoutineService:
    @staticmethod
    def get_routine(routine_id):
        try:
            response = table.get_item(Key={'id': routine_id})
            return response.get('Item')
        except ClientError as e:
            logger.error(f"Error getting routine: {e}")
            raise

    @staticmethod
    def list_routines():
        try:
            response = table.scan()
            return response.get('Items', [])
        except ClientError as e:
            logger.error(f"Error listing routines: {e}")
            raise

def lambda_handler(event, context):
    """
    Lambda function handler for routines management
    """
    try:
        logger.info('Event: %s', json.dumps(event))
        
        # Get HTTP method from the event
        http_method = event.get('httpMethod', 'GET')
        
        if http_method == 'GET':
            # Check if we're getting a specific routine or listing all
            routine_id = event.get('pathParameters', {}).get('id')
            
            if routine_id:
                routine = RoutineService.get_routine(routine_id)
                if not routine:
                    return {
                        'statusCode': 404,
                        'body': json.dumps({'message': 'Routine not found'})
                    }
                return {
                    'statusCode': 200,
                    'body': json.dumps(routine)
                }
            else:
                routines = RoutineService.list_routines()
                return {
                    'statusCode': 200,
                    'body': json.dumps(routines)
                }
        
        return {
            'statusCode': 400,
            'body': json.dumps({'message': 'Unsupported HTTP method'})
        }
        
    except Exception as e:
        logger.error('Error: %s', str(e))
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        } 