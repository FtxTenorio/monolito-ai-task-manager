import logging
from fastapi import APIRouter, HTTPException
from agents.specialized.task_agent import TaskAgent

# Configurar logging
logger = logging.getLogger(__name__)

# Criar o router
router = APIRouter(prefix="/api/tasks", tags=["tasks"])

# Inicializar o agente de tarefas
task_agent = TaskAgent()

@router.get("/")
async def get_tasks():
    """Obtém todas as tarefas."""
    try:
        tasks = task_agent.get_tasks()
        return {"tasks": tasks}
    except Exception as e:
        logger.error(f"Erro ao obter tarefas: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_task(task: dict):
    """Cria uma nova tarefa."""
    try:
        new_task = task_agent.create_task(task)
        return {"task": new_task}
    except Exception as e:
        logger.error(f"Erro ao criar tarefa: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{task_id}")
async def update_task(task_id: str, task: dict):
    """Atualiza uma tarefa existente."""
    try:
        updated_task = task_agent.update_task(task_id, task)
        return {"task": updated_task}
    except Exception as e:
        logger.error(f"Erro ao atualizar tarefa: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{task_id}")
async def delete_task(task_id: str):
    """Remove uma tarefa."""
    try:
        task_agent.delete_task(task_id)
        return {"success": True}
    except Exception as e:
        logger.error(f"Erro ao remover tarefa: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 