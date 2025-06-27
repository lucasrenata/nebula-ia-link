import { useState, useCallback, useEffect } from 'react';
import { ChatMessage, ChatState } from '@/types/chat';
import { toast } from '@/hooks/use-toast';

const WEBHOOK_URL = 'https://nwh.parceriacomia.com.br/webhook/receber-mensagem';
const STORAGE_KEY = 'parceriaIA_chatHistory';
const POLLING_INTERVAL = 2000;
const MAX_POLLING_TIME = 60000;

// Interface para resposta do webhook
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

  // Helper para verificar se a resposta é JSON
  const isJSONResponse = (res: Response) => {
    const contentType = res.headers.get('content-type');
    return contentType?.includes('application/json');
  };

  // Carregar histórico do localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      try {
        const messages = JSON.parse(savedHistory) as ChatMessage[];
        setState(prev => ({ ...prev, messages }));
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    } else {
      const initialMessage: ChatMessage = {
        id: '1',
        text: 'Olá! Sou sua interface de comunicação com a IA. Como posso ajudar hoje?',
        sender: 'ia',
        timestamp: new Date().toISOString()
      };
      setState(prev => ({ ...prev, messages: [initialMessage] }));
    }
  }, []);

  // Salvar mensagens no localStorage
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
    
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }));
    
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

        if (response.ok) {
          if (isJSONResponse(response)) {
            const data: WebhookResponse = await response.json();
            if (data.response && data.status === 'completed') {
              return data.response;
            }
          } else {
            const textData = await response.text();
            console.error('Resposta não é JSON:', textData);
            throw new Error('Formato de resposta inválido: esperado JSON');
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
      } catch (error) {
        console.log('Polling attempt failed, retrying...', error);
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
      }
    }
    
    throw new Error('Timeout: No response received within 60 seconds');
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
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Enviar mensagem inicial
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
      
      if (initialResponse.ok) {
        if (isJSONResponse(initialResponse)) {
          initialData = await initialResponse.json();
        } else {
          const textData = await initialResponse.text();
          console.warn('Resposta inicial não é JSON:', textData);
          initialData = { status: 'pending' };
        }
      } else {
        throw new Error(`Erro na requisição: ${initialResponse.statusText}`);
      }

      // Fazer polling para a resposta completa
      try {
        const aiResponse = await pollForResponse(requestId);
        addMessage({
          text: aiResponse,
          sender: 'ia',
          timestamp: new Date().toISOString()
        });
      } catch (pollError) {
        console.warn('Polling failed, using fallback response');
        
        // Fallback: usar resposta inicial se disponível
        const fallbackResponse = initialData?.response || 
          `Sua mensagem foi recebida mas houve timeout na resposta. RequestId: ${requestId}. Por favor, tente novamente.`;
        
        addMessage({
          text: fallbackResponse,
          sender: 'ia',
          timestamp: new Date().toISOString()
        });

        if (pollError instanceof Error && pollError.message.includes('Timeout')) {
          toast({
            title: "Timeout na Resposta",
            description: "A IA demorou mais de 60 segundos para responder. A mensagem foi processada.",
            variant: "destructive"
          });
        }
      }

    } catch (error) {
      let errorMessage = '';
      let simulatedResponse = '';

      if (error instanceof Error) {
        errorMessage = `Erro de conexão: ${error.message}`;
        simulatedResponse = `(Simulação - Erro de Conexão) Não foi possível conectar ao servidor. Erro: ${error.message}. Sua mensagem foi: "${text}"`;
      } else {
        errorMessage = 'Erro de conexão desconhecido.';
        simulatedResponse = `(Simulação - Erro Desconhecido) Ocorreu um erro inesperado. Sua mensagem foi: "${text}"`;
      }

      toast({
        title: "Erro de Conexão",
        description: errorMessage,
        variant: "destructive"
      });

      setTimeout(() => {
        addMessage({
          text: simulatedResponse,
          sender: 'ia',
          timestamp: new Date().toISOString()
        });
      }, 1500);

      setState(prev => ({ ...prev, error: errorMessage }));
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
