import base64
import requests
import logging
import time
import traceback
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from config.settings import get_settings

# Obter configurações
settings = get_settings()

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Criar router para as rotas do Spotify
router = APIRouter(prefix="/api/spotify", tags=["spotify"])

@router.get("/login")
async def spotify_login():
    """Redireciona o usuário para a página de login do Spotify"""
    try:
        start_time = time.time()
        logger.info("SpotifyController: Iniciando processo de login")
        
        scope = "user-read-playback-state user-modify-playback-state user-read-currently-playing user-read-recently-played user-top-read playlist-read-private playlist-read-collaborative"
        auth_url = f"{settings.spotify_auth_url}?client_id={settings.spotify_client_id}&response_type=code&redirect_uri={settings.spotify_redirect_uri}&scope={scope}"
        
        elapsed_time = time.time() - start_time
        logger.info(f"SpotifyController: Login iniciado em {elapsed_time:.2f}s")
        logger.info(f"SpotifyController: URL de autenticação: {auth_url}")
        
        return RedirectResponse(url=auth_url)
    except Exception as e:
        elapsed_time = time.time() - start_time
        error_msg = f"Erro ao iniciar login após {elapsed_time:.2f}s: {str(e)}"
        logger.error(f"SpotifyController: {error_msg}")
        logger.error(f"SpotifyController: Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_msg)

@router.get("/callback")
async def spotify_callback(code: str):
    """Recebe o código de autorização do Spotify e obtém o token de acesso"""
    start_time = time.time()
    try:
        logger.info("SpotifyController: Iniciando callback de autenticação")
        logger.info(f"SpotifyController: Código de autorização recebido: {code[:10]}...")
        
        # Codificar credenciais para autenticação básica
        auth_header = base64.b64encode(f"{settings.spotify_client_id}:{settings.spotify_client_secret}".encode()).decode()
        
        # Solicitar token de acesso
        logger.info("SpotifyController: Solicitando token de acesso")
        response = requests.post(
            settings.spotify_token_url,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.spotify_redirect_uri
            },
            headers={
                "Authorization": f"Basic {auth_header}",
                "Content-Type": "application/x-www-form-urlencoded"
            }
        )
        
        if response.status_code != 200:
            error_msg = f"Erro ao obter token: {response.text}"
            logger.error(f"SpotifyController: {error_msg}")
            logger.error(f"SpotifyController: Status code: {response.status_code}")
            logger.error(f"SpotifyController: Headers: {response.headers}")
            return JSONResponse(
                status_code=400,
                content={"error": "token_error", "message": error_msg}
            )
        
        token_data = response.json()
        logger.info("SpotifyController: Token de acesso obtido com sucesso")
        
        elapsed_time = time.time() - start_time
        logger.info(f"SpotifyController: Callback concluído em {elapsed_time:.2f}s")
        
        # Retornar o token diretamente
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token"),
                "expires_in": token_data["expires_in"]
            }
        )
    
    except Exception as e:
        elapsed_time = time.time() - start_time
        error_msg = f"Erro no callback após {elapsed_time:.2f}s: {str(e)}"
        logger.error(f"SpotifyController: {error_msg}")
        logger.error(f"SpotifyController: Traceback: {traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"error": "server_error", "message": error_msg}
        )

@router.get("/refresh-token")
async def refresh_spotify_token(request: Request):
    """Atualiza o token de acesso do Spotify usando o refresh token"""
    start_time = time.time()
    try:
        logger.info("SpotifyController: Iniciando atualização de token")
        
        # Verificar se o token foi enviado no cabeçalho
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            error_msg = "Token de acesso não fornecido"
            logger.error(f"SpotifyController: {error_msg}")
            raise HTTPException(status_code=401, detail=error_msg)
        
        access_token = auth_header.split(" ")[1]
        logger.info("SpotifyController: Token de acesso extraído do cabeçalho")
        
        # Codificar credenciais para autenticação básica
        auth_header = base64.b64encode(f"{settings.spotify_client_id}:{settings.spotify_client_secret}".encode()).decode()
        
        # Solicitar novo token de acesso
        logger.info("SpotifyController: Solicitando novo token de acesso")
        response = requests.post(
            settings.spotify_token_url,
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
            error_msg = f"Erro ao atualizar token: {response.text}"
            logger.error(f"SpotifyController: {error_msg}")
            raise HTTPException(status_code=response.status_code, detail="Failed to refresh token")
        
        token_data = response.json()
        logger.info("SpotifyController: Token atualizado com sucesso")
        
        elapsed_time = time.time() - start_time
        logger.info(f"SpotifyController: Atualização de token concluída em {elapsed_time:.2f}s")
        
        return {"success": True, "access_token": token_data.get("access_token")}
    
    except Exception as e:
        elapsed_time = time.time() - start_time
        error_msg = f"Erro ao atualizar token após {elapsed_time:.2f}s: {str(e)}"
        logger.error(f"SpotifyController: {error_msg}")
        logger.error(f"SpotifyController: Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/current-user")
async def get_current_user(request: Request):
    """Obtém informações do usuário atual do Spotify"""
    start_time = time.time()
    try:
        logger.info("SpotifyController: Obtendo informações do usuário atual")
        
        # Verificar se o token foi enviado no cabeçalho
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            error_msg = "Token de acesso não fornecido"
            logger.error(f"SpotifyController: {error_msg}")
            raise HTTPException(status_code=401, detail=error_msg)
        
        access_token = auth_header.split(" ")[1]
        logger.info("SpotifyController: Token de acesso extraído do cabeçalho")
        
        logger.info("SpotifyController: Fazendo requisição para a API do Spotify")
        response = requests.get(
            f"{settings.spotify_api_url}/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if response.status_code != 200:
            error_msg = f"Erro ao obter usuário: {response.text}"
            logger.error(f"SpotifyController: {error_msg}")
            raise HTTPException(status_code=response.status_code, detail="Failed to get user info")
        
        user_data = response.json()
        logger.info(f"SpotifyController: Informações do usuário obtidas com sucesso: {user_data.get('display_name', 'Usuário desconhecido')}")
        
        elapsed_time = time.time() - start_time
        logger.info(f"SpotifyController: Obtenção de usuário concluída em {elapsed_time:.2f}s")
        
        return user_data
    
    except Exception as e:
        elapsed_time = time.time() - start_time
        error_msg = f"Erro ao obter usuário após {elapsed_time:.2f}s: {str(e)}"
        logger.error(f"SpotifyController: {error_msg}")
        logger.error(f"SpotifyController: Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/currently-playing")
async def get_currently_playing(request: Request):
    """Obtém a música que está tocando no momento"""
    start_time = time.time()
    try:
        logger.info("SpotifyController: Obtendo música atual")
        
        # Verificar se o token foi enviado no cabeçalho
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            error_msg = "Token de acesso não fornecido"
            logger.error(f"SpotifyController: {error_msg}")
            raise HTTPException(status_code=401, detail=error_msg)
        
        access_token = auth_header.split(" ")[1]
        logger.info("SpotifyController: Token de acesso extraído do cabeçalho")
        
        logger.info("SpotifyController: Fazendo requisição para a API do Spotify")
        response = requests.get(
            f"{settings.spotify_api_url}/me/player/currently-playing",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if response.status_code == 204:
            logger.info("SpotifyController: Nenhuma música tocando no momento")
            return {"is_playing": False, "message": "No track currently playing"}
        
        if response.status_code != 200:
            error_msg = f"Erro ao obter música atual: {response.text}"
            logger.error(f"SpotifyController: {error_msg}")
            raise HTTPException(status_code=response.status_code, detail="Failed to get currently playing")
        
        track_data = response.json()
        track_name = track_data.get('item', {}).get('name', 'Música desconhecida')
        logger.info(f"SpotifyController: Música atual obtida com sucesso: {track_name}")
        
        elapsed_time = time.time() - start_time
        logger.info(f"SpotifyController: Obtenção de música atual concluída em {elapsed_time:.2f}s")
        
        return track_data
    
    except Exception as e:
        elapsed_time = time.time() - start_time
        error_msg = f"Erro ao obter música atual após {elapsed_time:.2f}s: {str(e)}"
        logger.error(f"SpotifyController: {error_msg}")
        logger.error(f"SpotifyController: Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/player/{action}")
async def control_playback(action: str, request: Request):
    """Controla a reprodução do Spotify (play, pause, seek, repeat, shuffle)"""
    start_time = time.time()
    try:
        logger.info(f"SpotifyController: Iniciando controle de reprodução: {action}")
        
        # Obter token de acesso do usuário
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            raise HTTPException(status_code=401, detail="Token de acesso não fornecido")
        
        # Definir endpoint e método baseado na ação
        endpoint = f"{settings.spotify_api_url}/me/player/{action}"
        method = "PUT"
        
        # Configurar parâmetros específicos para cada ação
        params = {}
        if action == "seek":
            position_ms = request.query_params.get("position_ms")
            if position_ms:
                params["position_ms"] = position_ms
        elif action == "repeat":
            state = request.query_params.get("state")
            if state:
                params["state"] = state
        elif action == "shuffle":
            state = request.query_params.get("state")
            if state:
                params["state"] = state
        
        # Fazer requisição para o Spotify
        response = requests.request(
            method=method,
            url=endpoint,
            params=params,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )
        
        if response.status_code not in [200, 202, 204]:
            error_msg = f"Erro ao controlar reprodução: {response.text}"
            logger.error(f"SpotifyController: {error_msg}")
            logger.error(f"SpotifyController: Status code: {response.status_code}")
            logger.error(f"SpotifyController: Headers: {response.headers}")
            raise HTTPException(status_code=response.status_code, detail=error_msg)
        
        elapsed_time = time.time() - start_time
        logger.info(f"SpotifyController: Controle de reprodução concluído em {elapsed_time:.2f}s")
        
        return {"success": True}
    
    except Exception as e:
        elapsed_time = time.time() - start_time
        error_msg = f"Erro no controle de reprodução após {elapsed_time:.2f}s: {str(e)}"
        logger.error(f"SpotifyController: {error_msg}")
        logger.error(f"SpotifyController: Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_msg)

@router.post("/player/{action}")
async def control_playback_post(action: str, request: Request):
    """Controla a reprodução do Spotify (next, previous)"""
    start_time = time.time()
    try:
        logger.info(f"SpotifyController: Iniciando controle de reprodução: {action}")
        
        # Obter token de acesso do usuário
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            raise HTTPException(status_code=401, detail="Token de acesso não fornecido")
        
        # Definir endpoint
        endpoint = f"{settings.spotify_api_url}/me/player/{action}"
        
        # Fazer requisição para o Spotify
        response = requests.post(
            url=endpoint,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )
        
        if response.status_code not in [200, 202, 204]:
            error_msg = f"Erro ao controlar reprodução: {response.text}"
            logger.error(f"SpotifyController: {error_msg}")
            logger.error(f"SpotifyController: Status code: {response.status_code}")
            logger.error(f"SpotifyController: Headers: {response.headers}")
            raise HTTPException(status_code=response.status_code, detail=error_msg)
        
        elapsed_time = time.time() - start_time
        logger.info(f"SpotifyController: Controle de reprodução concluído em {elapsed_time:.2f}s")
        
        return {"success": True}
    
    except Exception as e:
        elapsed_time = time.time() - start_time
        error_msg = f"Erro no controle de reprodução após {elapsed_time:.2f}s: {str(e)}"
        logger.error(f"SpotifyController: {error_msg}")
        logger.error(f"SpotifyController: Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_msg)

@router.get("/recently-played")
async def get_recently_played(request: Request, limit: int = 10):
    """Obtém as músicas recentemente reproduzidas"""
    start_time = time.time()
    try:
        logger.info(f"SpotifyController: Obtendo músicas recentes (limite: {limit})")
        
        # Verificar se o token foi enviado no cabeçalho
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            error_msg = "Token de acesso não fornecido"
            logger.error(f"SpotifyController: {error_msg}")
            raise HTTPException(status_code=401, detail=error_msg)
        
        access_token = auth_header.split(" ")[1]
        logger.info("SpotifyController: Token de acesso extraído do cabeçalho")
        
        logger.info("SpotifyController: Fazendo requisição para a API do Spotify")
        response = requests.get(
            f"{settings.spotify_api_url}/me/player/recently-played?limit={limit}",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if response.status_code != 200:
            error_msg = f"Erro ao obter músicas recentes: {response.text}"
            logger.error(f"SpotifyController: {error_msg}")
            raise HTTPException(status_code=response.status_code, detail="Failed to get recently played")
        
        tracks_data = response.json()
        items_count = len(tracks_data.get('items', []))
        logger.info(f"SpotifyController: {items_count} músicas recentes obtidas com sucesso")
        
        elapsed_time = time.time() - start_time
        logger.info(f"SpotifyController: Obtenção de músicas recentes concluída em {elapsed_time:.2f}s")
        
        return tracks_data
    
    except Exception as e:
        elapsed_time = time.time() - start_time
        error_msg = f"Erro ao obter músicas recentes após {elapsed_time:.2f}s: {str(e)}"
        logger.error(f"SpotifyController: {error_msg}")
        logger.error(f"SpotifyController: Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/top-tracks")
async def get_top_tracks(request: Request, time_range: str = "medium_term", limit: int = 10):
    """Obtém as músicas mais ouvidas pelo usuário"""
    start_time = time.time()
    try:
        logger.info(f"SpotifyController: Obtendo músicas mais ouvidas (período: {time_range}, limite: {limit})")
        
        # Verificar se o token foi enviado no cabeçalho
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            error_msg = "Token de acesso não fornecido"
            logger.error(f"SpotifyController: {error_msg}")
            raise HTTPException(status_code=401, detail=error_msg)
        
        access_token = auth_header.split(" ")[1]
        logger.info("SpotifyController: Token de acesso extraído do cabeçalho")
        
        if time_range not in ["short_term", "medium_term", "long_term"]:
            logger.warning(f"SpotifyController: Período inválido '{time_range}', usando 'medium_term'")
            time_range = "medium_term"
        
        logger.info("SpotifyController: Fazendo requisição para a API do Spotify")
        response = requests.get(
            f"{settings.spotify_api_url}/me/top/tracks?time_range={time_range}&limit={limit}",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if response.status_code != 200:
            error_msg = f"Erro ao obter músicas mais ouvidas: {response.text}"
            logger.error(f"SpotifyController: {error_msg}")
            raise HTTPException(status_code=response.status_code, detail="Failed to get top tracks")
        
        tracks_data = response.json()
        items_count = len(tracks_data.get('items', []))
        logger.info(f"SpotifyController: {items_count} músicas mais ouvidas obtidas com sucesso")
        
        elapsed_time = time.time() - start_time
        logger.info(f"SpotifyController: Obtenção de músicas mais ouvidas concluída em {elapsed_time:.2f}s")
        
        return tracks_data
    
    except Exception as e:
        elapsed_time = time.time() - start_time
        error_msg = f"Erro ao obter músicas mais ouvidas após {elapsed_time:.2f}s: {str(e)}"
        logger.error(f"SpotifyController: {error_msg}")
        logger.error(f"SpotifyController: Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/playlists")
async def get_playlists(request: Request, limit: int = 20):
    """Obtém as playlists do usuário"""
    start_time = time.time()
    try:
        logger.info(f"SpotifyController: Obtendo playlists (limite: {limit})")
        
        # Verificar se o token foi enviado no cabeçalho
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            error_msg = "Token de acesso não fornecido"
            logger.error(f"SpotifyController: {error_msg}")
            raise HTTPException(status_code=401, detail=error_msg)
        
        access_token = auth_header.split(" ")[1]
        logger.info("SpotifyController: Token de acesso extraído do cabeçalho")
        
        logger.info("SpotifyController: Fazendo requisição para a API do Spotify")
        response = requests.get(
            f"{settings.spotify_api_url}/me/playlists?limit={limit}",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if response.status_code != 200:
            error_msg = f"Erro ao obter playlists: {response.text}"
            logger.error(f"SpotifyController: {error_msg}")
            raise HTTPException(status_code=response.status_code, detail="Failed to get playlists")
        
        playlists_data = response.json()
        items_count = len(playlists_data.get('items', []))
        logger.info(f"SpotifyController: {items_count} playlists obtidas com sucesso")
        
        elapsed_time = time.time() - start_time
        logger.info(f"SpotifyController: Obtenção de playlists concluída em {elapsed_time:.2f}s")
        
        return playlists_data
    
    except Exception as e:
        elapsed_time = time.time() - start_time
        error_msg = f"Erro ao obter playlists após {elapsed_time:.2f}s: {str(e)}"
        logger.error(f"SpotifyController: {error_msg}")
        logger.error(f"SpotifyController: Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e)) 