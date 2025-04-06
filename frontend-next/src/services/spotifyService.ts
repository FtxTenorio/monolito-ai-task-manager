import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Interface para os dados do usuário do Spotify
export interface SpotifyUser {
  id: string;
  display_name: string;
  images: { url: string; height: number; width: number; }[];
  external_urls: { spotify: string };
  followers: { total: number };
  product?: string;
}

// Interface para a música atual
export interface CurrentlyPlaying {
  is_playing: boolean;
  item?: {
    id: string;
    name: string;
    artists: { id: string; name: string }[];
    album: {
      id: string;
      name: string;
      images: { url: string; height: number; width: number }[];
    };
    duration_ms: number;
  };
  progress_ms?: number;
}

// Interface para músicas recentes
export interface RecentlyPlayed {
  items: {
    played_at: string;
    track: {
      id: string;
      name: string;
      artists: { id: string; name: string }[];
      album: {
        id: string;
        name: string;
        images: { url: string; height: number; width: number }[];
      };
    };
  }[];
}

// Interface para músicas mais ouvidas
export interface TopTracks {
  items: {
    id: string;
    name: string;
    artists: { id: string; name: string }[];
    album: {
      id: string;
      name: string;
      images: { url: string; height: number; width: number }[];
    };
  }[];
}

// Interface para playlists
export interface Playlists {
  items: {
    id: string;
    name: string;
    description: string;
    images: { url: string; height: number; width: number }[];
    tracks: {
      total: number;
    };
  }[];
}

// Função para obter o token de acesso
const getAccessToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('spotify_access_token');
  }
  return null;
};

// Função para criar o cabeçalho de autorização
const getAuthHeader = (): { Authorization: string } | {} => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Serviço para interagir com a API do Spotify
const spotifyService = {
  // Iniciar o processo de login
  login: () => {
    console.log('Iniciando processo de login do Spotify');
    window.location.href = `${API_BASE_URL}/api/spotify/login`;
  },

  // Verificar se o login foi bem-sucedido
  checkLoginStatus: async (): Promise<boolean> => {
    try {
      console.log('Verificando status de login');
      const token = getAccessToken();
      if (!token) {
        console.log('Nenhum token encontrado');
        return false;
      }
      
      console.log('Fazendo requisição para verificar usuário atual');
      const response = await axios.get(`${API_BASE_URL}/api/spotify/current-user`, {
        headers: getAuthHeader()
      });
      
      console.log('Resposta da verificação:', response.status);
      return response.status === 200;
    } catch (error) {
      console.error('Erro ao verificar status de login:', error);
      if (axios.isAxiosError(error)) {
        console.error('Detalhes do erro:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      return false;
    }
  },

  // Obter informações do usuário atual
  getCurrentUser: async (): Promise<SpotifyUser> => {
    try {
      console.log('Obtendo informações do usuário atual');
      const response = await axios.get(`${API_BASE_URL}/api/spotify/current-user`, {
        headers: getAuthHeader()
      });
      console.log('Informações do usuário obtidas com sucesso');
      return response.data;
    } catch (error) {
      console.error('Erro ao obter informações do usuário:', error);
      if (axios.isAxiosError(error)) {
        console.error('Detalhes do erro:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      throw error;
    }
  },

  // Obter a música que está tocando no momento
  getCurrentlyPlaying: async (): Promise<CurrentlyPlaying> => {
    try {
      console.log('Obtendo música atual');
      const response = await axios.get(`${API_BASE_URL}/api/spotify/currently-playing`, {
        headers: getAuthHeader()
      });
      console.log('Música atual obtida com sucesso');
      return response.data;
    } catch (error) {
      console.error('Erro ao obter música atual:', error);
      if (axios.isAxiosError(error)) {
        console.error('Detalhes do erro:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      throw error;
    }
  },

  // Controlar a reprodução
  controlPlayback: async (action: 'play' | 'pause' | 'next' | 'previous' | 'seek' | 'repeat' | 'shuffle', value?: number | string | boolean): Promise<void> => {
    try {
      console.log(`Iniciando controle de reprodução: ${action}`, value ? `com valor: ${value}` : '');
      const token = getAccessToken();
      if (!token) {
        throw new Error('Token de acesso não encontrado');
      }

      let endpoint = '';
      let method = 'PUT';
      let data = {};

      switch (action) {
        case 'play':
        case 'pause':
          endpoint = `${API_BASE_URL}/api/spotify/player/${action}`;
          break;
        case 'next':
        case 'previous':
          endpoint = `${API_BASE_URL}/api/spotify/player/${action}`;
          method = 'POST';
          break;
        case 'seek':
          if (typeof value === 'number') {
            endpoint = `${API_BASE_URL}/api/spotify/player/seek?position_ms=${value}`;
            method = 'PUT';
          }
          break;
        case 'repeat':
          if (typeof value === 'string') {
            endpoint = `${API_BASE_URL}/api/spotify/player/repeat?state=${value}`;
            method = 'PUT';
          }
          break;
        case 'shuffle':
          if (typeof value === 'boolean') {
            endpoint = `${API_BASE_URL}/api/spotify/player/shuffle?state=${value}`;
            method = 'PUT';
          }
          break;
      }

      if (!endpoint) {
        throw new Error('Ação inválida');
      }

      const response = await axios({
        method,
        url: endpoint,
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
        data,
      });

      console.log(`Controle de reprodução ${action} concluído com sucesso`);
    } catch (error) {
      console.error(`Erro ao controlar reprodução (${action}):`, error);
      if (axios.isAxiosError(error)) {
        console.error('Status:', error.response?.status);
        console.error('Dados:', error.response?.data);
        console.error('Headers:', error.response?.headers);
      }
      throw error;
    }
  },

  // Obter músicas recentemente reproduzidas
  getRecentlyPlayed: async (limit: number = 10): Promise<RecentlyPlayed> => {
    try {
      console.log(`Obtendo músicas recentes (limite: ${limit})`);
      const response = await axios.get(`${API_BASE_URL}/api/spotify/recently-played?limit=${limit}`, {
        headers: getAuthHeader()
      });
      console.log(`${response.data.items?.length || 0} músicas recentes obtidas com sucesso`);
      return response.data;
    } catch (error) {
      console.error('Erro ao obter músicas recentes:', error);
      if (axios.isAxiosError(error)) {
        console.error('Detalhes do erro:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      throw error;
    }
  },

  // Obter músicas mais ouvidas
  getTopTracks: async (timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term', limit: number = 10): Promise<TopTracks> => {
    try {
      console.log(`Obtendo músicas mais ouvidas (período: ${timeRange}, limite: ${limit})`);
      const response = await axios.get(`${API_BASE_URL}/api/spotify/top-tracks?time_range=${timeRange}&limit=${limit}`, {
        headers: getAuthHeader()
      });
      console.log(`${response.data.items?.length || 0} músicas mais ouvidas obtidas com sucesso`);
      return response.data;
    } catch (error) {
      console.error('Erro ao obter músicas mais ouvidas:', error);
      if (axios.isAxiosError(error)) {
        console.error('Detalhes do erro:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      throw error;
    }
  },

  // Obter playlists do usuário
  getPlaylists: async (limit: number = 20): Promise<Playlists> => {
    const response = await axios.get(`${API_BASE_URL}/api/spotify/playlists?limit=${limit}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },
};

export default spotifyService; 