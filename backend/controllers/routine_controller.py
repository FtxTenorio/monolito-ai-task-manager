import logging
from fastapi import APIRouter, HTTPException
from agents.specialized.routine_agent import RoutineAgent

# Configurar logging
logger = logging.getLogger(__name__)

# Criar o router
router = APIRouter(prefix="/api/routines", tags=["routines"])

# Inicializar o agente de rotinas
routine_agent = RoutineAgent(client_id=0)  # Using 0 as a default client_id for the API endpoints

@router.get("/")
async def get_routines():
    """Obtém todas as rotinas."""
    try:
        routines = routine_agent.get_routines()
        return {"routines": routines}
    except Exception as e:
        logger.error(f"Erro ao obter rotinas: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_routine(routine: dict):
    """Cria uma nova rotina."""
    try:
        new_routine = routine_agent.create_routine(routine)
        return {"routine": new_routine}
    except Exception as e:
        logger.error(f"Erro ao criar rotina: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{routine_id}")
async def update_routine(routine_id: str, routine: dict):
    """Atualiza uma rotina existente."""
    try:
        updated_routine = routine_agent.update_routine(routine_id, routine)
        return {"routine": updated_routine}
    except Exception as e:
        logger.error(f"Erro ao atualizar rotina: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{routine_id}")
async def delete_routine(routine_id: str):
    """Remove uma rotina."""
    try:
        routine_agent.delete_routine(routine_id)
        return {"success": True}
    except Exception as e:
        logger.error(f"Erro ao remover rotina: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 