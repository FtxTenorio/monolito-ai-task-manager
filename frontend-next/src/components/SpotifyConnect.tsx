import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  TextField, 
  CircularProgress, 
  Alert, 
  Divider,
  Grid,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  LinearProgress
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import LoginIcon from '@mui/icons-material/Login';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import { styled } from '@mui/material/styles';
import spotifyService, { SpotifyUser, CurrentlyPlaying, RecentlyPlayed, TopTracks, Playlists } from '@/services/spotifyService';

const SpotifyContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: theme.spacing(2),
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  backgroundColor: theme.palette.background.paper,
}));

const SpotifyLogo = styled(Box)(({ theme }) => ({
  width: 120,
  height: 120,
  borderRadius: '50%',
  backgroundColor: 'rgb(30, 215, 96)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto',
  marginBottom: theme.spacing(3),
  '& svg': {
    fontSize: 60,
    color: 'white',
  },
}));

const AlbumCover = styled(CardMedia)(({ theme }) => ({
  height: 200,
  width: 200,
  borderRadius: theme.spacing(1),
  margin: '0 auto',
  marginBottom: theme.spacing(2),
}));

const PlaybackControls = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
}));

const ControlButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: 'rgba(0, 0, 0, 0.1)',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
}));

const PlayPauseButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: 'rgb(30, 215, 96)',
  color: 'white',
  width: 56,
  height: 56,
  '&:hover': {
    backgroundColor: 'rgb(29, 185, 84)',
  },
}));

interface SpotifyConnectProps {
  onConnect: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`spotify-tabpanel-${index}`}
      aria-labelledby={`spotify-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const SpotifyConnect: React.FC<SpotifyConnectProps> = ({ onConnect }) => {
  const [showLogin, setShowLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<CurrentlyPlaying | null>(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayed | null>(null);
  const [topTracks, setTopTracks] = useState<TopTracks | null>(null);
  const [playlists, setPlaylists] = useState<Playlists | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Verificar se o usuário está autenticado ao carregar o componente
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verificar se o token está armazenado
        const token = localStorage.getItem('spotify_access_token');
        if (token) {
          setIsAuthenticated(true);
          // Carregar dados do usuário e músicas
          await loadUserData();
          await loadMusicData();
          
          // Configurar intervalo para atualizar a música atual a cada 5 segundos
          const interval = setInterval(async () => {
            await loadCurrentlyPlaying();
          }, 5000);
          
          setRefreshInterval(interval);
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Erro ao verificar autenticação:', err);
        setError('Erro ao verificar autenticação com o Spotify');
      }
    };
    
    checkAuth();
    
    // Limpar o intervalo quando o componente for desmontado
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  // Carregar dados do usuário
  const loadUserData = async () => {
    try {
      const userData = await spotifyService.getCurrentUser();
      setUser(userData);
    } catch (err) {
      console.error('Erro ao carregar dados do usuário:', err);
    }
  };

  // Carregar dados de música
  const loadMusicData = async () => {
    try {
      await Promise.all([
        loadCurrentlyPlaying(),
        loadRecentlyPlayed(),
        loadTopTracks(),
        loadPlaylists()
      ]);
    } catch (err) {
      console.error('Erro ao carregar dados de música:', err);
    }
  };

  // Carregar música atual
  const loadCurrentlyPlaying = async () => {
    try {
      const data = await spotifyService.getCurrentlyPlaying();
      setCurrentlyPlaying(data);
    } catch (err) {
      console.error('Erro ao carregar música atual:', err);
    }
  };

  // Carregar músicas recentes
  const loadRecentlyPlayed = async () => {
    try {
      const data = await spotifyService.getRecentlyPlayed(5);
      setRecentlyPlayed(data);
    } catch (err) {
      console.error('Erro ao carregar músicas recentes:', err);
    }
  };

  // Carregar músicas mais ouvidas
  const loadTopTracks = async () => {
    try {
      const data = await spotifyService.getTopTracks('medium_term', 5);
      setTopTracks(data);
    } catch (err) {
      console.error('Erro ao carregar músicas mais ouvidas:', err);
    }
  };

  // Carregar playlists
  const loadPlaylists = async () => {
    try {
      const data = await spotifyService.getPlaylists(5);
      setPlaylists(data);
    } catch (err) {
      console.error('Erro ao carregar playlists:', err);
    }
  };

  // Controlar reprodução
  const handlePlaybackControl = async (action: 'play' | 'pause' | 'next' | 'previous') => {
    try {
      await spotifyService.controlPlayback(action);
      // Atualizar a música atual após controlar a reprodução
      await loadCurrentlyPlaying();
    } catch (err) {
      console.error(`Erro ao ${action} música:`, err);
      setError(`Erro ao ${action} música`);
    }
  };

  const handleConnectClick = () => {
    setShowLogin(true);
  };

  const handleLogin = async () => {
    if (!clientId || !clientSecret) {
      setError('Por favor, preencha o Client ID e Client Secret');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Aqui você implementaria a autenticação real com o Spotify
      // Usando o clientId e clientSecret fornecidos
      
      // Simulando uma chamada de API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Após autenticação bem-sucedida
      onConnect();
    } catch (err) {
      setError('Erro ao conectar com o Spotify. Verifique suas credenciais.');
      console.error('Erro de autenticação:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpotifyOAuth = () => {
    // Usar o serviço para iniciar o processo de login
    spotifyService.login();
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Se o usuário estiver autenticado, mostrar o player e as informações
  if (isAuthenticated && user) {
    return (
      <Box sx={{ p: 3, maxWidth: 1000, margin: '0 auto' }}>
        <SpotifyContainer>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            {user.images && user.images.length > 0 && (
              <Avatar 
                src={user.images[0].url} 
                alt={user.display_name}
                sx={{ width: 80, height: 80, mr: 3 }}
              />
            )}
            <Box>
              <Typography variant="h4" gutterBottom>
                {user.display_name}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {user.product === 'premium' ? 'Spotify Premium' : 'Spotify Free'}
              </Typography>
            </Box>
          </Box>

          {currentlyPlaying && currentlyPlaying.item && (
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Tocando agora
              </Typography>
              
              <AlbumCover
                image={currentlyPlaying.item.album.images[0].url}
                title={currentlyPlaying.item.name}
              />
              
              <Typography variant="h5" gutterBottom>
                {currentlyPlaying.item.name}
              </Typography>
              
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {currentlyPlaying.item.artists.map(artist => artist.name).join(', ')}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                {currentlyPlaying.item.album.name}
              </Typography>
              
              {currentlyPlaying.progress_ms !== undefined && (
                <Box sx={{ mt: 2, mb: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={(currentlyPlaying.progress_ms / currentlyPlaying.item.duration_ms) * 100} 
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              )}
              
              <PlaybackControls>
                <ControlButton onClick={() => handlePlaybackControl('previous')}>
                  <SkipPreviousIcon />
                </ControlButton>
                
                <PlayPauseButton onClick={() => handlePlaybackControl(currentlyPlaying.is_playing ? 'pause' : 'play')}>
                  {currentlyPlaying.is_playing ? <PauseIcon /> : <PlayArrowIcon />}
                </PlayPauseButton>
                
                <ControlButton onClick={() => handlePlaybackControl('next')}>
                  <SkipNextIcon />
                </ControlButton>
              </PlaybackControls>
            </Box>
          )}

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="spotify tabs">
              <Tab label="Recentes" id="spotify-tab-0" aria-controls="spotify-tabpanel-0" />
              <Tab label="Mais Ouvidas" id="spotify-tab-1" aria-controls="spotify-tabpanel-1" />
              <Tab label="Playlists" id="spotify-tab-2" aria-controls="spotify-tabpanel-2" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            {recentlyPlayed && recentlyPlayed.items.length > 0 ? (
              <List>
                {recentlyPlayed.items.map((item, index) => (
                  <ListItem key={index} divider={index < recentlyPlayed.items.length - 1}>
                    <ListItemAvatar>
                      <Avatar src={item.track.album.images[0].url} alt={item.track.name} />
                    </ListItemAvatar>
                    <ListItemText 
                      primary={item.track.name} 
                      secondary={`${item.track.artists.map(artist => artist.name).join(', ')} • ${item.track.album.name}`} 
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body1" color="text.secondary" align="center">
                Nenhuma música recente encontrada
              </Typography>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {topTracks && topTracks.items.length > 0 ? (
              <List>
                {topTracks.items.map((track, index) => (
                  <ListItem key={track.id} divider={index < topTracks.items.length - 1}>
                    <ListItemAvatar>
                      <Avatar src={track.album.images[0].url} alt={track.name} />
                    </ListItemAvatar>
                    <ListItemText 
                      primary={track.name} 
                      secondary={`${track.artists.map(artist => artist.name).join(', ')} • ${track.album.name}`} 
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body1" color="text.secondary" align="center">
                Nenhuma música mais ouvida encontrada
              </Typography>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {playlists && playlists.items.length > 0 ? (
              <Grid container spacing={2}>
                {playlists.items.map((playlist) => (
                  <Grid item xs={12} sm={6} md={4} key={playlist.id}>
                    <Card>
                      <CardMedia
                        component="img"
                        height="140"
                        image={playlist.images[0].url}
                        alt={playlist.name}
                      />
                      <CardContent>
                        <Typography variant="h6" noWrap>
                          {playlist.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {playlist.description || 'Sem descrição'}
                        </Typography>
                        <Chip 
                          label={`${playlist.tracks.total} músicas`} 
                          size="small" 
                          sx={{ mt: 1 }} 
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body1" color="text.secondary" align="center">
                Nenhuma playlist encontrada
              </Typography>
            )}
          </TabPanel>
        </SpotifyContainer>
      </Box>
    );
  }

  // Se o usuário estiver na tela de login
  if (showLogin) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, margin: '0 auto' }}>
        <SpotifyContainer>
          <SpotifyLogo>
            <MusicNoteIcon />
          </SpotifyLogo>
          <Typography variant="h4" align="center" gutterBottom>
            Login Spotify
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" paragraph>
            Conecte-se à sua conta Spotify para acessar seus dados de música.
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Método 1: Autenticação OAuth (Recomendado)
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Esta opção redireciona você para a página de login oficial do Spotify.
            </Typography>
            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={<LoginIcon />}
              onClick={handleSpotifyOAuth}
              sx={{ 
                backgroundColor: 'rgb(30, 215, 96)',
                '&:hover': {
                  backgroundColor: 'rgb(29, 185, 84)',
                },
                mb: 4,
              }}
            >
              Login com Spotify
            </Button>
            
            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">OU</Typography>
            </Divider>
            
            <Typography variant="subtitle1" gutterBottom>
              Método 2: Credenciais da API
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Insira suas credenciais da API do Spotify (requer conta de desenvolvedor).
            </Typography>
            
            <TextField
              fullWidth
              label="Client ID"
              variant="outlined"
              margin="normal"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
            
            <TextField
              fullWidth
              label="Client Secret"
              variant="outlined"
              margin="normal"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleLogin}
                disabled={isLoading}
                sx={{ 
                  px: 4,
                  py: 1.5,
                }}
              >
                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Conectar'}
              </Button>
            </Box>
          </Box>
        </SpotifyContainer>
      </Box>
    );
  }

  // Tela inicial
  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
      <SpotifyContainer>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
          <Box sx={{ flex: { md: 5 } }}>
            <SpotifyLogo>
              <MusicNoteIcon />
            </SpotifyLogo>
            <Typography variant="h4" align="center" gutterBottom>
              Spotify
            </Typography>
            <Typography variant="body1" align="center" color="text.secondary" paragraph>
              Conecte-se ao Spotify para ver as músicas tocando no momento.
            </Typography>
          </Box>
          <Box sx={{ flex: { md: 7 } }}>
            <Typography variant="h6" gutterBottom>
              Recursos disponíveis
            </Typography>
            <Typography variant="body1" paragraph>
              • Visualize a música que está tocando no momento
            </Typography>
            <Typography variant="body1" paragraph>
              • Veja o histórico de músicas recentes
            </Typography>
            <Typography variant="body1" paragraph>
              • Controle a reprodução diretamente da aplicação
            </Typography>
            <Typography variant="body1" paragraph>
              • Receba recomendações personalizadas
            </Typography>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Button 
                variant="contained" 
                color="primary" 
                size="large"
                startIcon={<MusicNoteIcon />}
                onClick={handleConnectClick}
                sx={{ 
                  backgroundColor: 'rgb(30, 215, 96)',
                  '&:hover': {
                    backgroundColor: 'rgb(29, 185, 84)',
                  },
                  px: 4,
                  py: 1.5,
                }}
              >
                Conectar ao Spotify
              </Button>
            </Box>
          </Box>
        </Box>
      </SpotifyContainer>
    </Box>
  );
};

export default SpotifyConnect; 