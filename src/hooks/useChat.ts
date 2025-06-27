import { useState, useCallback, useEffect } from 'react';
import { ChatMessage, ChatState } from '@/types/chat';
import { toast } from '@/hooks/use-toast';

const WEBHOOK_URL = 'https://nwh.parceriacomia.com.br/webhook/receber-mensagem';
const STORAGE_KEY = 'parceriaIA_chatHistory';
const POLLING_INTERVAL = 2000;
const MAX_POLLING_TIME = 60000;

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

  // Helper para verificar resposta JSON
  const isJSONResponse = (res: Response) => {
    const contentType = res.headers.get('content-type');
    return contentType?.includes('application/json');
  };

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

        // Verificação robusta de JSON
        if (isJSONResponse(response)) {
          const data: WebhookResponse = await response.json();
          if (data.status === 'completed' && data.response) {
            return data.response;
          }
        } else {
          const textData = await response.text();
          console.error('Resposta não-JSON:', textData);
          throw new Error('Formato de resposta inválido');
        }

        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
      } catch (error) {
        console.error('Falha no polling:', error);
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
      }
    }
    throw new Error('Timeout: Resposta não recebida em 60 segundos');
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
      
      // Enviar mensagem
      const initialResponse = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "send",
          message: text,
          requestId: requestId
        })
      });

      let initialData: WebhookResponse | null = null;
      
      // Tratamento de resposta inicial
      if (initialResponse.ok) {
        if (isJSONResponse(initialResponse)) {
          initialData = await initialResponse.json();
        } else {
          const textData = await initialResponse.text();
          console.warn('Resposta não-JSON:', textData);
          initialData = { status: 'pending' };
        }
      } else {
        throw new Error(`Erro HTTP: ${initialResponse.status}`);
      }

      // Verificar resposta imediata
      if (initialData?.status === 'completed' && initialData.response) {
        addMessage({
          text: initialData.response,
          sender: 'ia',
          timestamp: new Date().toISOString()
        });
      } else {
        // Polling para resposta assíncrona
        try {
          const aiResponse = await pollForResponse(requestId);
          addMessage({
            text: aiResponse,
            sender: 'ia',
            timestamp: new Date().toISOString()
          });
        } catch (pollError) {
          console.warn('Falha no polling, usando fallback');
          const fallbackResponse = initialData?.response || 
            `Sua mensagem foi recebida mas houve timeout. RequestId: ${requestId}. Tente novamente.`;
          
          addMessage({
            text: fallbackResponse,
            sender: 'ia',
            timestamp: new Date().toISOString()
          });
        }
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro de Conexão",
        description: `Detalhes: ${errorMsg}`,
        variant: "destructive"
      });

      // Mensagem simulada de erro
      setTimeout(() => {
        addMessage({
          text: `(Erro) Não foi possível conectar ao servidor. Detalhes: ${errorMsg}`,
          sender: 'ia',
          timestamp: new Date().toISOString()
        });
      }, 1500);
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
