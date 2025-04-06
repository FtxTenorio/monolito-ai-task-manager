import React, { useState, useEffect } from 'react';
import { Box, IconButton, Typography, Slider, Menu, MenuItem, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import RepeatIcon from '@mui/icons-material/Repeat';
import RepeatOneIcon from '@mui/icons-material/RepeatOne';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { styled } from '@mui/material/styles';
import spotifyService, { CurrentlyPlaying } from '@/services/spotifyService';

const MiniPlayerContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  maxWidth: 300,
}));

const AlbumArt = styled('img')({
  width: 40,
  height: 40,
  borderRadius: 4,
  cursor: 'pointer',
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'scale(1.05)',
  },
});

const ControlsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
}));

const ProgressContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  width: '100%',
}));

const StyledSlider = styled(Slider)({
  height: 4,
  '& .MuiSlider-thumb': {
    width: 8,
    height: 8,
    transition: '0.3s cubic-bezier(.47,1.64,.41,.8)',
    '&:before': {
      boxShadow: '0 2px 12px 0 rgba(0,0,0,0.4)',
    },
    '&:hover, &.Mui-focusVisible': {
      boxShadow: '0px 0px 0px 8px rgb(0 0 0 / 16%)',
    },
    '&.Mui-active': {
      width: 12,
      height: 12,
    },
  },
  '& .MuiSlider-rail': {
    opacity: 0.28,
  },
});

type RepeatMode = 'off' | 'context' | 'track';
type ShuffleMode = 'on' | 'off';

const SpotifyMiniPlayer: React.FC = () => {
  const [currentTrack, setCurrentTrack] = useState<CurrentlyPlaying | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [shuffleMode, setShuffleMode] = useState<ShuffleMode>('off');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    const fetchCurrentTrack = async () => {
      try {
        const track = await spotifyService.getCurrentlyPlaying();
        if (track) {
          setCurrentTrack(track);
          setIsPlaying(track.is_playing);
        }
      } catch (error) {
        console.error('Erro ao obter música atual:', error);
      }
    };

    fetchCurrentTrack();
    const interval = setInterval(fetchCurrentTrack, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await spotifyService.controlPlayback('pause');
      } else {
        await spotifyService.controlPlayback('play');
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Erro ao controlar reprodução:', error);
    }
  };

  const handleSkip = async (direction: 'next' | 'previous') => {
    try {
      await spotifyService.controlPlayback(direction);
      const track = await spotifyService.getCurrentlyPlaying();
      if (track) {
        setCurrentTrack(track);
      }
    } catch (error) {
      console.error(`Erro ao pular ${direction}:`, error);
    }
  };

  const handleRepeatModeChange = async (mode: RepeatMode) => {
    try {
      await spotifyService.controlPlayback('repeat', mode);
      setRepeatMode(mode);
    } catch (error) {
      console.error('Erro ao alterar modo de repetição:', error);
    }
  };

  const handleShuffleModeChange = async (mode: ShuffleMode) => {
    try {
      await spotifyService.controlPlayback('shuffle', mode === 'on');
      setShuffleMode(mode);
    } catch (error) {
      console.error('Erro ao alterar modo de embaralhamento:', error);
    }
  };

  const handleAlbumClick = () => {
    window.location.href = '/spotify';
  };

  if (!currentTrack?.item) {
    return null;
  }

  return (
    <MiniPlayerContainer>
      <AlbumArt
        src={currentTrack.item.album.images[0]?.url || '/spotify-placeholder.png'}
        alt={currentTrack.item.name || 'No track playing'}
        onClick={handleAlbumClick}
      />
      <ControlsContainer>
        <Tooltip title={shuffleMode === 'on' ? 'Desativar embaralhamento' : 'Ativar embaralhamento'}>
          <IconButton
            size="small"
            onClick={() => handleShuffleModeChange(shuffleMode === 'on' ? 'off' : 'on')}
            color={shuffleMode === 'on' ? 'primary' : 'default'}
          >
            <ShuffleIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <IconButton size="small" onClick={() => handleSkip('previous')}>
          <SkipPreviousIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={handlePlayPause}>
          {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
        </IconButton>
        <IconButton size="small" onClick={() => handleSkip('next')}>
          <SkipNextIcon fontSize="small" />
        </IconButton>
        <Tooltip title={
          repeatMode === 'off' ? 'Ativar repetição' :
          repeatMode === 'context' ? 'Repetir uma faixa' :
          'Desativar repetição'
        }>
          <IconButton
            size="small"
            onClick={() => {
              const modes: RepeatMode[] = ['off', 'context', 'track'];
              const currentIndex = modes.indexOf(repeatMode);
              const nextMode = modes[(currentIndex + 1) % modes.length];
              handleRepeatModeChange(nextMode);
            }}
            color={repeatMode !== 'off' ? 'primary' : 'default'}
          >
            {repeatMode === 'track' ? <RepeatOneIcon fontSize="small" /> : <RepeatIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </ControlsContainer>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          handleRepeatModeChange('off');
          setAnchorEl(null);
        }}>
          Desativar repetição
        </MenuItem>
        <MenuItem onClick={() => {
          handleRepeatModeChange('context');
          setAnchorEl(null);
        }}>
          Repetir playlist
        </MenuItem>
        <MenuItem onClick={() => {
          handleRepeatModeChange('track');
          setAnchorEl(null);
        }}>
          Repetir uma faixa
        </MenuItem>
        <MenuItem onClick={() => {
          handleShuffleModeChange(shuffleMode === 'on' ? 'off' : 'on');
          setAnchorEl(null);
        }}>
          {shuffleMode === 'on' ? 'Desativar embaralhamento' : 'Ativar embaralhamento'}
        </MenuItem>
      </Menu>
    </MiniPlayerContainer>
  );
};

export default SpotifyMiniPlayer; 