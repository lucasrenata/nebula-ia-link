
import { useState } from 'react';
import { Send } from 'lucide-react';
import { StatusIcon } from './StatusIcon';
import { ConnectionStatus } from '@/types/chat';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  status: ConnectionStatus;
}

export const ChatInput = ({ onSendMessage, isLoading, status }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const messageText = message.trim();
    if (!messageText || messageText.length === 0) return;
    
    if (messageText.length > 1000) {
      alert('A mensagem não pode exceder 1000 caracteres.');
      return;
    }

    // Trigger rocket animation
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);

    onSendMessage(messageText);
    setMessage('');
  };

  return (
    <div className="p-4 border-t border-cyan-500/30">
      <form onSubmit={handleSubmit} className="flex items-center space-x-3">
        <div className="w-6 h-6 flex items-center justify-center">
          <StatusIcon status={status} />
        </div>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Digite sua mensagem para a IA"
          maxLength={1000}
          disabled={isLoading}
          className="flex-grow bg-transparent border-b-2 border-cyan-500/50 focus:border-cyan-400 text-white placeholder-gray-500 px-2 py-1 outline-none transition-all duration-300 disabled:opacity-50"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={isLoading || !message.trim()}
          className="p-2 rounded-full bg-cyan-500/20 hover:bg-cyan-500/40 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className={`w-6 h-6 text-cyan-300 ${isAnimating ? 'animate-rocket-launch' : ''}`} />
        </button>
      </form>
    </div>
  );
};
