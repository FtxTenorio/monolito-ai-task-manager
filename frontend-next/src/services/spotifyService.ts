import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Interface para os dados do usuário do Spotify
export interface SpotifyUser {
  id: string;
  display_name: string;
  images: { url: string; height: number; width: number }[];
  product: string;
  type: string;
  uri: string;
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
    window.location.href = `${API_BASE_URL}/api/spotify/login`;
  },

  // Verificar se o login foi bem-sucedido
  checkLoginStatus: async (): Promise<boolean> => {
    try {
      const token = getAccessToken();
      if (!token) return false;
      
      const response = await axios.get(`${API_BASE_URL}/api/spotify/current-user`, {
        headers: getAuthHeader()
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  },

  // Obter informações do usuário atual
  getCurrentUser: async (): Promise<SpotifyUser> => {
    const response = await axios.get(`${API_BASE_URL}/api/spotify/current-user`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Obter a música que está tocando no momento
  getCurrentlyPlaying: async (): Promise<CurrentlyPlaying> => {
    const response = await axios.get(`${API_BASE_URL}/api/spotify/currently-playing`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Controlar a reprodução (play, pause, next, previous)
  controlPlayback: async (action: 'play' | 'pause' | 'next' | 'previous'): Promise<{ success: boolean }> => {
    const response = await axios.post(`${API_BASE_URL}/api/spotify/player/${action}`, {}, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Obter músicas recentemente reproduzidas
  getRecentlyPlayed: async (limit: number = 10): Promise<RecentlyPlayed> => {
    const response = await axios.get(`${API_BASE_URL}/api/spotify/recently-played?limit=${limit}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Obter músicas mais ouvidas
  getTopTracks: async (timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term', limit: number = 10): Promise<TopTracks> => {
    const response = await axios.get(`${API_BASE_URL}/api/spotify/top-tracks?time_range=${timeRange}&limit=${limit}`, {
      headers: getAuthHeader()
    });
    return response.data;
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