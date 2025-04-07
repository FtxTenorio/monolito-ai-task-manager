'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import spotifyService from '@/services/spotifyService';
import axios from 'axios';

export default function SpotifyCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('Parâmetros recebidos:', Object.fromEntries(searchParams.entries()));
        
        // Verificar se há um erro na URL
        const error = searchParams.get('error');
        const errorMessage = searchParams.get('message');
        
        if (error) {
          setStatus('error');
          setErrorMessage(errorMessage || 'Erro ao autenticar com o Spotify. Por favor, tente novamente.');
          return;
        }

        // Verificar se temos um código de autorização
        const code = searchParams.get('code');
        if (code) {
          console.log('Código de autorização recebido, trocando por token');
          try {
            // Fazer a troca do código por token
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const response = await axios.get(`${API_BASE_URL}/api/spotify/callback?code=${code}`);
            
            if (response.data.success && response.data.access_token) {
              console.log('Token obtido com sucesso');
              localStorage.setItem('spotify_access_token', response.data.access_token);
              if (response.data.refresh_token) {
                localStorage.setItem('spotify_refresh_token', response.data.refresh_token);
              }
              setStatus('success');
              
              // Verificar se o usuário está autenticado
              const isAuthenticated = await spotifyService.checkLoginStatus();
              if (isAuthenticated) {
                console.log('Usuário autenticado com sucesso');
                // Redirecionar para a página principal após 2 segundos
                setTimeout(() => {
                  router.push('/');
                }, 2000);
              } else {
                console.error('Falha na verificação de autenticação');
                setStatus('error');
                setErrorMessage('Não foi possível verificar a autenticação. Por favor, tente novamente.');
              }
            } else {
              console.error('Resposta inesperada do servidor:', response.data);
              setStatus('error');
              setErrorMessage('Resposta inesperada do servidor. Por favor, tente novamente.');
            }
          } catch (error) {
            console.error('Erro ao trocar código por token:', error);
            if (axios.isAxiosError(error) && error.response) {
              setErrorMessage(error.response.data.message || 'Erro ao autenticar com o Spotify. Por favor, tente novamente.');
            } else {
              setErrorMessage('Erro ao autenticar com o Spotify. Por favor, tente novamente.');
            }
            setStatus('error');
          }
        } else {
          console.error('Nenhum código de autorização recebido');
          setStatus('error');
          setErrorMessage('Nenhum código de autorização recebido. Por favor, tente novamente.');
        }
      } catch (error) {
        console.error('Erro inesperado:', error);
        setStatus('error');
        setErrorMessage('Ocorreu um erro inesperado. Por favor, tente novamente.');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 3,
      }}
    >
      {status === 'loading' && (
        <>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Autenticando com o Spotify...
          </Typography>
        </>
      )}

      {status === 'success' && (
        <>
          <Typography variant="h6" color="success.main">
            Autenticação bem-sucedida!
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Redirecionando para a página principal...
          </Typography>
        </>
      )}

      {status === 'error' && (
        <>
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
          <Button
            variant="contained"
            color="primary"
            onClick={() => spotifyService.login()}
          >
            Tentar Novamente
          </Button>
        </>
      )}
    </Box>
  );
} 