import uuid
from datetime import datetime
from typing import List, Optional

class Routine:
    # Lista de frequências permitidas
    ALLOWED_FREQUENCIES = [
        "daily",      # Diariamente
        "weekly",     # Semanalmente
        "monthly",    # Mensalmente
        "weekdays",   # Dias úteis (segunda a sexta)
        "weekends",   # Finais de semana (sábado e domingo)
        "custom"      # Frequência personalizada
    ]

    def __init__(
        self,
        name: str,
        description: str,
        status: str = "pending",
        schedule: str = None,
        frequency: str = "daily",
        priority: str = "medium",
        tags: List[str] = None,
        estimated_duration: int = 0,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        id: str = None,
        created_at: datetime = None,
        updated_at: datetime = None
    ):
        # Validar frequência
        if frequency not in self.ALLOWED_FREQUENCIES:
            raise ValueError(f"Invalid frequency. Must be one of: {', '.join(self.ALLOWED_FREQUENCIES)}")

        self.id = id or str(uuid.uuid4())
        self.name = name
        self.description = description
        self.status = status
        self.schedule = schedule
        self.frequency = frequency
        self.priority = priority
        self.tags = tags or []
        self.estimated_duration = estimated_duration
        self.start_date = start_date
        self.end_date = end_date
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "status": self.status,
            "schedule": self.schedule,
            "frequency": self.frequency,
            "priority": self.priority,
            "tags": self.tags,
            "estimated_duration": self.estimated_duration,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'Routine':
        # Converter strings ISO para datetime
        start_date = datetime.fromisoformat(data.get('start_date')) if data.get('start_date') else None
        end_date = datetime.fromisoformat(data.get('end_date')) if data.get('end_date') else None
        created_at = datetime.fromisoformat(data.get('created_at')) if data.get('created_at') else None
        updated_at = datetime.fromisoformat(data.get('updated_at')) if data.get('updated_at') else None

        return cls(
            id=data.get('id'),
            name=data['name'],
            description=data['description'],
            status=data.get('status', 'pending'),
            schedule=data.get('schedule'),
            frequency=data.get('frequency', 'daily'),
            priority=data.get('priority', 'medium'),
            tags=data.get('tags', []),
            estimated_duration=data.get('estimated_duration', 0),
            start_date=start_date,
            end_date=end_date,
            created_at=created_at,
            updated_at=updated_at
        ) 