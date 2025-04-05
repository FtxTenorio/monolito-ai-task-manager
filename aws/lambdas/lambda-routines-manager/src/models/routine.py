import uuid
from datetime import datetime

class Routine:
    def __init__(self, name, description, status="pending", schedule=None, 
                 frequency=None, priority=None, tags=None, estimated_duration=None):
        self.id = str(uuid.uuid4())
        self.name = name
        self.description = description
        self.status = status
        self.schedule = schedule
        self.frequency = frequency
        self.priority = priority
        self.tags = tags or []
        self.estimated_duration = estimated_duration
        self.created_at = datetime.now().isoformat()
        self.updated_at = self.created_at
        
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'status': self.status,
            'schedule': self.schedule,
            'frequency': self.frequency,
            'priority': self.priority,
            'tags': self.tags,
            'estimated_duration': self.estimated_duration,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
        
    @classmethod
    def from_dict(cls, data):
        routine = cls(
            name=data.get('name'),
            description=data.get('description'),
            status=data.get('status', 'pending'),
            schedule=data.get('schedule'),
            frequency=data.get('frequency'),
            priority=data.get('priority'),
            tags=data.get('tags'),
            estimated_duration=data.get('estimated_duration')
        )
        
        # Preserve ID and timestamps if they exist
        if 'id' in data:
            routine.id = data['id']
        if 'created_at' in data:
            routine.created_at = data['created_at']
        if 'updated_at' in data:
            routine.updated_at = data['updated_at']
            
        return routine 