import os
import logging
import boto3
from datetime import datetime
from botocore.exceptions import ClientError
from src.models.routine import Routine

logger = logging.getLogger()
logger.setLevel(logging.INFO)

class RoutineService:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(os.environ.get('ROUTINES_TABLE', 'Routines'))

    def get_routine(self, routine_id):
        try:
            response = self.table.get_item(Key={'id': routine_id})
            item = response.get('Item')
            return Routine.from_dict(item) if item else None
        except ClientError as e:
            logger.error(f"Error getting routine: {e}")
            raise

    def list_routines(self):
        try:
            response = self.table.scan()
            items = response.get('Items', [])
            return [Routine.from_dict(item) for item in items]
        except ClientError as e:
            logger.error(f"Error listing routines: {e}")
            raise
            
    def create_routine(self, routine_data):
        try:
            # Validate required fields
            required_fields = ['name', 'description']
            for field in required_fields:
                if field not in routine_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Create routine object
            routine = Routine.from_dict(routine_data)
            
            # Save to DynamoDB
            self.table.put_item(Item=routine.to_dict())
            
            return routine
        except ClientError as e:
            logger.error(f"Error creating routine: {e}")
            raise
            
    def update_routine(self, routine_id, routine_data):
        try:
            # Check if routine exists
            existing_routine = self.get_routine(routine_id)
            if not existing_routine:
                return None
                
            # Update routine object
            routine = Routine.from_dict(routine_data)
            routine.id = routine_id
            routine.created_at = existing_routine.created_at
            routine.updated_at = datetime.now().isoformat()
            
            # Prepare update expression
            update_expr = "SET "
            expr_attr_values = {}
            expr_attr_names = {}
            
            routine_dict = routine.to_dict()
            for key, value in routine_dict.items():
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
            
            return Routine.from_dict(response.get('Attributes'))
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