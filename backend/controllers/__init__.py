from fastapi import APIRouter
from .spotify_controller import router as spotify_router
from .app_controller import router as app_router
from .task_controller import router as task_router
from .routine_controller import router as routine_router

# Criar o router principal
api_router = APIRouter()

# Incluir os routers dos controllers
api_router.include_router(spotify_router)
api_router.include_router(app_router)
api_router.include_router(task_router)
api_router.include_router(routine_router) 