import { useState, useCallback, useEffect, useRef } from 'react';
import { ChatMessage, ChatState } from '@/types/chat';
import { toast } from '@/hooks/use-toast';
import { io, Socket } from 'socket.io-client';

const WEBHOOK_URL = 'https://nwh.parceriacomia.com.br/webhook/receber-mensagem';
const SOCKET_URL = 'wss://nebula-ia-link-production.up.railway.app'; // Corrigido para wss://
const STORAGE_KEY = 'parceriaIA_chatHistory';

export const useChat = () => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null
  });
  
  const socketRef = useRef<Socket | null>(null);

  // Carregar histórico
  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      try {
        const messages = JSON.parse(savedHistory) as ChatMessage[];
        setState(prev => ({ ...prev, messages }));
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
      }
    } else {
      setState(prev => ({
        ...prev,
        messages: [{
          id: '1',
          text: 'Olá! Sou sua interface de comunicação com a IA. Como posso ajudar hoje?',
          sender: 'ia',
          timestamp: new Date().toISOString()
        }]
      }));
    }

    // Inicializar WebSocket com configurações corretas
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Configurar listeners do socket
    socketRef.current.on('connect', () => {
      console.log('Conectado ao servidor WebSocket');
    });

    socketRef.current.on('webhook_response', (data: { requestId: string; response: string }) => {
      console.log('Resposta recebida via WebSocket:', data);
      
      addMessage({
        text: data.response,
        sender: 'ia',
        timestamp: new Date().toISOString()
      });
      
      setState(prev => ({ ...prev, isLoading: false }));
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Erro de conexão WebSocket:', err);
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível conectar ao servidor em tempo real",
        variant: "destructive"
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Salvar mensagens
  useEffect(() => {
    if (state.messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.messages));
    }
  }, [state.messages]);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString()
    };
    setState(prev => ({ ...prev, messages: [...prev.messages, newMessage] }));
    return newMessage;
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || state.isLoading) return;

    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    
    // Adicionar mensagem do usuário
    addMessage({
      text: text.trim(),
      sender: 'user',
      timestamp: new Date().toISOString()
    });

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Registrar este requestId no WebSocket
      if (socketRef.current?.connected) {
        socketRef.current.emit('register_request', { requestId });
      } else {
        console.warn('WebSocket não conectado, tentando reconectar...');
        socketRef.current?.connect();
      }
      
      // Enviar mensagem para webhook
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "send",
          message: text,
          requestId: requestId
        })
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      console.log(`Mensagem enviada com requestId: ${requestId}`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro de Conexão",
        description: `Erro: ${errorMsg}`,
        variant: "destructive"
      });

      addMessage({
        text: `⚠️ Erro ao enviar mensagem: ${errorMsg}`,
        sender: 'ia',
        timestamp: new Date().toISOString()
      });

      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isLoading, addMessage]);

  return {
    messages: state.messages,
    isLoading: state.is
