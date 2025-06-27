
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ia';
  timestamp: string;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

export type ConnectionStatus = 'ready' | 'sending' | 'received' | 'error';
