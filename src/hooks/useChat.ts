import { useState, useCallback, useEffect } from 'react';
import { ChatMessage, ChatState } from '@/types/chat';
import { toast } from '@/hooks/use-toast';

const WEBHOOK_URL = 'https://nwh.parceriacomia.com.br/webhook/receber-mensagem';
const STORAGE_KEY = 'parceriaIA_chatHistory';
const POLLING_INTERVAL = 2000;
const MAX_POLLING_TIME = 120000; // Aumentado para 120 segundos
const INITIAL_TIMEOUT = 30000; // Timeout de 10s para requisição inicial

interface WebhookResponse {
  status: 'pending' | 'completed';
  response?: string;
}

export const useChat = () => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null
  });

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

  const pollForResponse = useCallback(async (requestId: string): Promise<string> => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < MAX_POLLING_TIME) {
      try {
        const response = await fetch(`${WEBHOOK_URL}?requestId=${requestId}&action=poll`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: WebhookResponse = await response.json();
        if (data.status === 'completed' && data.response) {
          return data.response;
        }
        
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
      } catch (error) {
        console.error('Falha no polling:', error);
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
      }
    }
    throw new Error('Timeout: Resposta não recebida em 120 segundos');
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || state.isLoading) return;

    // Adicionar mensagem do usuário
    addMessage({
      text: text.trim(),
      sender: 'user',
      timestamp: new Date().toISOString()
    });

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      
      // Enviar mensagem com timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), INITIAL_TIMEOUT);
      
      const initialResponse = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "send",
          message: text,
          requestId: requestId
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!initialResponse.ok) {
        throw new Error(`Erro HTTP: ${initialResponse.status}`);
      }

      // Processar resposta assíncrona
      const aiResponse = await pollForResponse(requestId);
      addMessage({
        text: aiResponse,
        sender: 'ia',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      let errorMessage = '';
      let fallbackResponse = '';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Timeout: O servidor não respondeu em 10 segundos';
          fallbackResponse = `Sua mensagem foi recebida mas ocorreu timeout na resposta. ID: ${requestId}. Por favor, tente novamente.`;
        } else {
          errorMessage = `Erro de conexão: ${error.message}`;
          fallbackResponse = `(Erro) Não foi possível conectar ao servidor. Detalhes: ${error.message}`;
        }
      } else {
        errorMessage = 'Erro de conexão desconhecido.';
        fallbackResponse = '(Erro) Ocorreu um erro inesperado ao processar sua mensagem';
      }

      toast({
        title: "Erro de Conexão",
        description: errorMessage,
        variant: "destructive"
      });

      addMessage({
        text: fallbackResponse,
        sender: 'ia',
        timestamp: new Date().toISOString()
      });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isLoading, addMessage, pollForResponse]);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    sendMessage
  };
};
