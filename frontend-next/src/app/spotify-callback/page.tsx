'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import spotifyService from '@/services/spotifyService';

export default function SpotifyCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Verificar se há um erro na URL
        const error = searchParams.get('error');
        if (error) {
          setStatus('error');
          setErrorMessage('Erro ao autenticar com o Spotify. Por favor, tente novamente.');
          return;
        }

        // Verificar se a autenticação foi bem-sucedida
        const success = searchParams.get('success');
        const accessToken = searchParams.get('access_token');
        
        if (success === 'true' && accessToken) {
          // Armazenar o token de acesso
          localStorage.setItem('spotify_access_token', accessToken);
          setStatus('success');
          
          // Verificar se o usuário está autenticado
          const isAuthenticated = await spotifyService.checkLoginStatus();
          if (isAuthenticated) {
            // Redirecionar para a página principal após 2 segundos
            setTimeout(() => {
              router.push('/');
            }, 2000);
          } else {
            setStatus('error');
            setErrorMessage('Não foi possível verificar a autenticação. Por favor, tente novamente.');
          }
        } else {
          setStatus('error');
          setErrorMessage('Resposta inesperada do servidor. Por favor, tente novamente.');
        }
      } catch (error) {
        console.error('Erro no callback do Spotify:', error);
        setStatus('error');
        setErrorMessage('Ocorreu um erro ao processar a autenticação. Por favor, tente novamente.');
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
        p: 3,
        textAlign: 'center',
      }}
    >
      {status === 'loading' && (
        <>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h5" gutterBottom>
            Conectando ao Spotify...
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Por favor, aguarde enquanto processamos sua autenticação.
          </Typography>
        </>
      )}

      {status === 'success' && (
        <>
          <Typography variant="h5" color="success.main" gutterBottom>
            Autenticação bem-sucedida!
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Você foi conectado com sucesso ao Spotify.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Redirecionando para a página principal...
          </Typography>
        </>
      )}

      {status === 'error' && (
        <>
          <Alert severity="error" sx={{ mb: 3, maxWidth: 500 }}>
            {errorMessage}
          </Alert>
          <Button
            variant="contained"
            color="primary"
            onClick={() => router.push('/')}
            sx={{ mt: 2 }}
          >
            Voltar para a página principal
          </Button>
        </>
      )}
    </Box>
  );
} 