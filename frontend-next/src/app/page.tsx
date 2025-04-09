'use client';

import { useState, useEffect, useRef } from 'react';
import MainLayout from '@/components/MainLayout';
import { Message } from '@/types';


export default function Home() {
  // State declarations with explicit types
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [typingDots, setTypingDots] = useState<string>('');
  const [liveText, setLiveText] = useState<string>('');
  const [status, setStatus] = useState<string>('Conectando ao servidor...');
  const [error, setError] = useState<string | null>(null);
  const [responseFormat, setResponseFormat] = useState<string>('markdown');
  const [language, setLanguage] = useState<string>('pt-BR');
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [functionExecutions, setFunctionExecutions] = useState<{
    type: 'function_call_start' | 'function_call_error' | 'function_call_end';
    content: string;
    format: string;
  }[]>([]);
  
  // Ref declarations with explicit types
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Adicionar logs para depuração
  console.log("Home renderizando com estado:", {
    messagesLength: messages.length,
    isProcessing
  });

  // Efeito para rolar para baixo quando novas mensagens chegarem
  useEffect(() => {
    // Removed chatContainerRef references
  }, [messages]);

  // Efeito para animação dos pontinhos
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTyping) {
      interval = setInterval(() => {
        setTypingDots(prev => {
          if (prev.length >= 2) return '';
          return prev + '.';
        });
      }, 500);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTyping]);

  // Function declarations with explicit types
  const handleFormatChange = (format: string): void => {
    setResponseFormat(format);
  };

  const addUserMessage = (text: string): void => {
    console.log("Enviando mensagem para o backend:", text);
    setMessages(prev => [...prev, { text, isUser: true }]);
    setIsTyping(true);
    setStatus('Processando...');
    
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const messageData = {
        text: text,
        format: responseFormat,
        language: language
      };
      console.log("Enviando dados para o WebSocket:", messageData);
      socketRef.current.send(JSON.stringify(messageData));
    } else {
      console.error("WebSocket não está conectado. Estado:", socketRef.current?.readyState);
      setError('Não foi possível enviar a mensagem. Servidor desconectado.');
      setStatus('Erro na conexão. Tente novamente.');
    }
  };

  const addAIMessage = (text: string): void => {
    setMessages(prevMessages => [
      ...prevMessages,
      {
        text,
        isUser: false,
        processingStartTime: new Date(),
        processingEndTime: new Date()
      }
    ]);
    
    setIsProcessing(false);
    setIsTyping(false);
    setStatus('Resposta recebida.');
  };

  const addErrorMessage = (text: string): void => {
    setMessages(prev => [...prev, { text: `Erro: ${text}`, isUser: false }]);
    setIsProcessing(false);
    setIsTyping(false);
  };

  const addFunctionExecution = (execution: {
    type: 'function_call_start' | 'function_call_error' | 'function_call_end';
    content: string;
    format: string;
  }): void => {
    console.log("Adicionando execução de função:", execution);
    setFunctionExecutions(prev => [...prev, execution]);
  };

  const connectWebSocket = (): void => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    setStatus('Conectando ao servidor...');
    
    try {
      const socket = new WebSocket('ws://localhost:8000/ws');
      socketRef.current = socket;
      
      socket.onopen = () => {
        console.log('WebSocket conectado');
        setIsConnected(true);
        setStatus('Conectado. Digite sua mensagem para começar.');
        setError(null);
      };
      
      socket.onclose = () => {
        console.log('WebSocket desconectado');
        setIsConnected(false);
        setStatus('Desconectado do servidor. Tentando reconectar...');
        
        reconnectTimerRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };
      
      socket.onerror = (event) => {
        console.error('Erro no WebSocket:', event);
        setError('Erro na conexão com o servidor');
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Recebido do WebSocket:", data);
          
          if (data.type === 'message') {
            console.log("Adicionando mensagem ao chat:", data.content);
            addAIMessage(data.content);
          } else if (data.type === 'error') {
            console.error("Erro recebido do servidor:", data.content);
            addErrorMessage(data.content);
          } else if (
            data.type === 'function_call_start' || 
            data.type === 'function_call_error' || 
            data.type === 'function_call_end'
          ) {
            console.log("Execução de função detectada:", data);
            addFunctionExecution({
              type: data.type,
              content: data.content,
              format: data.format || 'text'
            });
          }
        } catch (e) {
          console.error('Erro ao processar mensagem do WebSocket:', e);
        }
      };
    } catch (error) {
      console.error('Erro ao criar WebSocket:', error);
      setError('Não foi possível conectar ao servidor');
      setStatus('Erro na conexão. Tente novamente mais tarde.');
    }
  };

  // Placeholder functions for audio-related functionality
  const toggleListening = (): void => {
    setIsListening(prevState => !prevState);
    console.log("Toggle listening:", !isListening);
  };


  return (
    <MainLayout
      messages={messages}
      onSendMessage={addUserMessage}
      isProcessing={isProcessing}
      isTyping={isTyping}
      status={status}
      error={error}
      responseFormat={responseFormat}
      onFormatChange={handleFormatChange}
      isConnected={isConnected}
      onReconnect={connectWebSocket}
      isListening={isListening}
      onToggleListening={toggleListening}
      functionExecutions={functionExecutions}
    />
  );
}



