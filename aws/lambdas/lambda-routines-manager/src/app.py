import json
import logging
import os
import boto3
import uuid
from datetime import datetime
from decimal import Decimal
from botocore.exceptions import ClientError
from src.handlers.routine_handler import lambda_handler

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

# Helper class to convert DynamoDB types to JSON
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

class RoutineService:
    def __init__(self):
        self.table = dynamodb.Table(os.environ.get('ROUTINES_TABLE', 'Routines'))

    def get_routine(self, routine_id):
        try:
            response = self.table.get_item(Key={'id': routine_id})
            return response.get('Item')
        except ClientError as e:
            logger.error(f"Error getting routine: {e}")
            raise

    def list_routines(self):
        try:
            response = self.table.scan()
            return response.get('Items', [])
        except ClientError as e:
            logger.error(f"Error listing routines: {e}")
            raise
            
    def create_routine(self, routine_data):
        try:
            # Generate a unique ID for the routine
            routine_id = str(uuid.uuid4())
            
            # Add creation timestamp
            routine_data['id'] = routine_id
            routine_data['created_at'] = datetime.now().isoformat()
            routine_data['updated_at'] = routine_data['created_at']
            
            # Validate required fields
            required_fields = ['name', 'description', 'status']
            for field in required_fields:
                if field not in routine_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Set default status if not provided
            if 'status' not in routine_data:
                routine_data['status'] = 'pending'
                
            # Save to DynamoDB
            self.table.put_item(Item=routine_data)
            
            return routine_data
        except ClientError as e:
            logger.error(f"Error creating routine: {e}")
            raise
            
    def update_routine(self, routine_id, routine_data):
        try:
            # Check if routine exists
            existing_routine = self.get_routine(routine_id)
            if not existing_routine:
                return None
                
            # Update timestamp
            routine_data['updated_at'] = datetime.now().isoformat()
            
            # Prepare update expression
            update_expr = "SET "
            expr_attr_values = {}
            expr_attr_names = {}
            
            for key, value in routine_data.items():
                if key != 'id':  # Don't update the ID
                    update_expr += f"#{key} = :{key}, "
                    expr_attr_values[f":{key}"] = value
                    expr_attr_names[f"#{key}"] = key
                    
            # Remove trailing comma and space
            update_expr = update_expr[:-2]
            
            # Update in DynamoDB
            response = self.table.update_item(
                Key={'id': routine_id},
                UpdateExpression=update_expr,
                ExpressionAttributeValues=expr_attr_values,
                ExpressionAttributeNames=expr_attr_names,
                ReturnValues="ALL_NEW"
            )
            
            return response.get('Attributes')
        except ClientError as e:
            logger.error(f"Error updating routine: {e}")
            raise
            
    def delete_routine(self, routine_id):
        try:
            # Check if routine exists
            existing_routine = self.get_routine(routine_id)
            if not existing_routine:
                return False
                
            # Delete from DynamoDB
            self.table.delete_item(Key={'id': routine_id})
            return True
        except ClientError as e:
            logger.error(f"Error deleting routine: {e}")
            raise

def lambda_handler(event, context):
    """
    Lambda function handler for routines management
    """
    try:
        logger.info('Event: %s', json.dumps(event))
        
        # Initialize service
        service = RoutineService()
        
        # Get HTTP method from the event
        http_method = event.get('httpMethod', 'GET')
        
        if http_method == 'GET':
            # Check if we're getting a specific routine or listing all
            routine_id = event.get('pathParameters', {}).get('id')
            
            if routine_id:
                routine = service.get_routine(routine_id)
                if not routine:
                    return {
                        'statusCode': 404,
                        'body': json.dumps({'message': 'Routine not found'})
                    }
                return {
                    'statusCode': 200,
                    'body': json.dumps(routine, cls=DecimalEncoder)
                }
            else:
                routines = service.list_routines()
                return {
                    'statusCode': 200,
                    'body': json.dumps(routines, cls=DecimalEncoder)
                }
        
        elif http_method == 'POST':
            # Create a new routine
            try:
                body = event.get('body', '{}')
                routine = service.create_routine(body)
                return {
                    'statusCode': 201,
                    'body': json.dumps(routine, cls=DecimalEncoder)
                }
            except ValueError as e:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'message': str(e)})
                }
                
        elif http_method == 'PUT':
            # Update an existing routine
            routine_id = event.get('pathParameters', {}).get('id')
            if not routine_id:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'message': 'Missing routine ID'})
                }
                
            try:
                body = event.get('body', '{}')
                updated_routine = service.update_routine(routine_id, body)
                
                if not updated_routine:
                    return {
                        'statusCode': 404,
                        'body': json.dumps({'message': 'Routine not found'})
                    }
                    
                return {
                    'statusCode': 200,
                    'body': json.dumps(updated_routine, cls=DecimalEncoder)
                }
            except ValueError as e:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'message': str(e)})
                }
                
        elif http_method == 'DELETE':
            # Delete a routine
            routine_id = event.get('pathParameters', {}).get('id')
            if not routine_id:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'message': 'Missing routine ID'})
                }
                
            deleted = service.delete_routine(routine_id)
            if not deleted:
                return {
                    'statusCode': 404,
                    'body': json.dumps({'message': 'Routine not found'})
                }
                
            return {
                'statusCode': 204,
                'body': ''
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