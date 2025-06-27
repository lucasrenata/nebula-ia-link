
import { useState, useCallback, useEffect } from 'react';
import { ChatMessage, ChatState } from '@/types/chat';
import { toast } from '@/hooks/use-toast';

const WEBHOOK_URL = 'https://n8n.parceriacomia.com.br/webhook-test/receber-mensagem';
const STORAGE_KEY = 'parceriaIA_chatHistory';

export const useChat = () => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null
  });

  // Load chat history from localStorage
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
      // Initial AI message
      const initialMessage: ChatMessage = {
        id: '1',
        text: 'Olá! Sou sua interface de comunicação com a IA. Como posso ajudar hoje?',
        sender: 'ia',
        timestamp: new Date().toISOString()
      };
      setState(prev => ({ ...prev, messages: [initialMessage] }));
    }
  }, []);

  // Save to localStorage whenever messages change
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

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || state.isLoading) return;

    // Add user message
    addMessage({
      text: text.trim(),
      sender: 'user',
      timestamp: new Date().toISOString()
    });

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: "send",
          message: text
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.statusText}`);
      }

      const responseData = await response.json();
      const aiResponse = responseData.response || 'Recebi sua mensagem, mas não pude processar uma resposta.';

      // Add AI response
      addMessage({
        text: aiResponse,
        sender: 'ia',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      let errorMessage = '';
      let simulatedResponse = '';

      if (error instanceof Error && error.name === 'AbortError') {
        errorMessage = 'Tempo esgotado: O servidor demorou mais de 60s para responder.';
        simulatedResponse = `(Simulação - Timeout) A resposta do servidor demorou mais de 60 segundos. Sua mensagem foi: "${text}"`;
      } else {
        errorMessage = 'Erro de conexão. Verifique o CORS no servidor ou a rede.';
        simulatedResponse = `(Simulação - Erro de Conexão) Não foi possível conectar ao servidor. Verifique o console (F12) para erros de CORS. Sua mensagem foi: "${text}"`;
      }

      toast({
        title: "Erro de Conexão",
        description: errorMessage,
        variant: "destructive"
      });

      // Add simulated response after a delay
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
  }, [state.isLoading, addMessage]);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    sendMessage
  };
};
