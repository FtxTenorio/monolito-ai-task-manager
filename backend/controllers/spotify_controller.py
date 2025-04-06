import os
import base64
import requests
import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from dotenv import load_dotenv

# Configurar logging
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente
load_dotenv()

# Configurações do Spotify
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")
SPOTIFY_REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "http://localhost:3000/spotify-callback")
SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_URL = "https://api.spotify.com/v1"

# Criar router para as rotas do Spotify
router = APIRouter(prefix="/api/spotify", tags=["spotify"])

@router.get("/login")
async def spotify_login():
    """Redireciona o usuário para a página de login do Spotify"""
    scope = "user-read-playback-state user-modify-playback-state user-read-currently-playing user-read-recently-played user-top-read playlist-read-private playlist-read-collaborative"
    auth_url = f"{SPOTIFY_AUTH_URL}?client_id={SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri={SPOTIFY_REDIRECT_URI}&scope={scope}"
    return RedirectResponse(url=auth_url)

@router.get("/callback")
async def spotify_callback(code: str):
    """Recebe o código de autorização do Spotify e obtém o token de acesso"""
    try:
        # Codificar credenciais para autenticação básica
        auth_header = base64.b64encode(f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}".encode()).decode()
        
        # Solicitar token de acesso
        response = requests.post(
            SPOTIFY_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": SPOTIFY_REDIRECT_URI
            },
            headers={
                "Authorization": f"Basic {auth_header}",
                "Content-Type": "application/x-www-form-urlencoded"
            }
        )
        
        if response.status_code != 200:
            logger.error(f"Erro ao obter token: {response.text}")
            return RedirectResponse(url=f"{SPOTIFY_REDIRECT_URI}?error=token_error")
        
        token_data = response.json()
        
        # Redirecionar para o frontend com o token
        return RedirectResponse(url=f"{SPOTIFY_REDIRECT_URI}?success=true&access_token={token_data['access_token']}")
    
    except Exception as e:
        logger.error(f"Erro no callback do Spotify: {str(e)}")
        return RedirectResponse(url=f"{SPOTIFY_REDIRECT_URI}?error=server_error")

@router.get("/refresh-token")
async def refresh_spotify_token(request: Request):
    """Atualiza o token de acesso do Spotify usando o refresh token"""
    try:
        # Verificar se o token foi enviado no cabeçalho
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Token de acesso não fornecido")
        
        access_token = auth_header.split(" ")[1]
        
        # Codificar credenciais para autenticação básica
        auth_header = base64.b64encode(f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}".encode()).decode()
        
        # Solicitar novo token de acesso
        response = requests.post(
            SPOTIFY_TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": access_token
            },
            headers={
                "Authorization": f"Basic {auth_header}",
                "Content-Type": "application/x-www-form-urlencoded"
            }
        )
        
        if response.status_code != 200:
            logger.error(f"Erro ao atualizar token: {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Failed to refresh token")
        
        token_data = response.json()
        
        return {"success": True, "access_token": token_data.get("access_token")}
    
    except Exception as e:
        logger.error(f"Erro ao atualizar token: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/current-user")
async def get_current_user(request: Request):
    """Obtém informações do usuário atual do Spotify"""
    try:
        # Verificar se o token foi enviado no cabeçalho
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Token de acesso não fornecido")
        
        access_token = auth_header.split(" ")[1]
        
        response = requests.get(
            f"{SPOTIFY_API_URL}/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if response.status_code != 200:
            logger.error(f"Erro ao obter usuário: {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Failed to get user info")
        
        return response.json()
    
    except Exception as e:
        logger.error(f"Erro ao obter usuário: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/currently-playing")
async def get_currently_playing(request: Request):
    """Obtém a música que está tocando no momento"""
    try:
        # Verificar se o token foi enviado no cabeçalho
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Token de acesso não fornecido")
        
        access_token = auth_header.split(" ")[1]
        
        response = requests.get(
            f"{SPOTIFY_API_URL}/me/player/currently-playing",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if response.status_code == 204:
            return {"is_playing": False, "message": "No track currently playing"}
        
        if response.status_code != 200:
            logger.error(f"Erro ao obter música atual: {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Failed to get currently playing")
        
        return response.json()
    
    except Exception as e:
        logger.error(f"Erro ao obter música atual: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/player/{action}")
async def control_playback(action: str, request: Request):
    """Controla a reprodução do Spotify (play, pause, next, previous)"""
    try:
        # Verificar se o token foi enviado no cabeçalho
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Token de acesso não fornecido")
        
        access_token = auth_header.split(" ")[1]
        
        if action not in ["play", "pause", "next", "previous"]:
            raise HTTPException(status_code=400, detail="Invalid action")
        
        endpoint = f"{SPOTIFY_API_URL}/me/player/{action}"
        method = "PUT" if action in ["play", "pause"] else "POST"
        
        response = requests.request(
            method,
            endpoint,
            headers={"Authorization": f"Bearer {access_token}"},
            json={} if action in ["play", "pause"] else None
        )
        
        if response.status_code not in [200, 202, 204]:
            logger.error(f"Erro ao controlar reprodução: {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Failed to control playback")
        
        return {"success": True, "action": action}
    
    except Exception as e:
        logger.error(f"Erro ao controlar reprodução: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recently-played")
async def get_recently_played(request: Request, limit: int = 10):
    """Obtém as músicas recentemente reproduzidas"""
    try:
        # Verificar se o token foi enviado no cabeçalho
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Token de acesso não fornecido")
        
        access_token = auth_header.split(" ")[1]
        
        response = requests.get(
            f"{SPOTIFY_API_URL}/me/player/recently-played?limit={limit}",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if response.status_code != 200:
            logger.error(f"Erro ao obter músicas recentes: {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Failed to get recently played")
        
        return response.json()
    
    except Exception as e:
        logger.error(f"Erro ao obter músicas recentes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/top-tracks")
async def get_top_tracks(request: Request, time_range: str = "medium_term", limit: int = 10):
    """Obtém as músicas mais ouvidas pelo usuário"""
    try:
        # Verificar se o token foi enviado no cabeçalho
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Token de acesso não fornecido")
        
        access_token = auth_header.split(" ")[1]
        
        if time_range not in ["short_term", "medium_term", "long_term"]:
            time_range = "medium_term"
        
        response = requests.get(
            f"{SPOTIFY_API_URL}/me/top/tracks?time_range={time_range}&limit={limit}",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if response.status_code != 200:
            logger.error(f"Erro ao obter músicas mais ouvidas: {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Failed to get top tracks")
        
        return response.json()
    
    except Exception as e:
        logger.error(f"Erro ao obter músicas mais ouvidas: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/playlists")
async def get_playlists(request: Request, limit: int = 20):
    """Obtém as playlists do usuário"""
    try:
        # Verificar se o token foi enviado no cabeçalho
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Token de acesso não fornecido")
        
        access_token = auth_header.split(" ")[1]
        
        response = requests.get(
            f"{SPOTIFY_API_URL}/me/playlists?limit={limit}",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if response.status_code != 200:
            logger.error(f"Erro ao obter playlists: {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Failed to get playlists")
        
        return response.json()
    
    except Exception as e:
        logger.error(f"Erro ao obter playlists: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 