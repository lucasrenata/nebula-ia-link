
import { ChatMessage } from '@/types/chat';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isUser = message.sender === 'user';
  const formattedTime = new Date(message.timestamp).toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-fade-in`}>
      <div
        className={`max-w-xl lg:max-w-2xl px-4 py-2 rounded-lg border ${
          isUser
            ? 'bg-blue-900/30 border-cyan-400/50 text-cyan-200 box-glow-blue'
            : 'bg-green-900/30 border-green-400/50 text-green-300 box-glow-green'
        }`}
      >
        {message.text}
      </div>
      <div className={`text-xs mt-1 px-1 ${isUser ? 'text-cyan-500' : 'text-green-600'}`}>
        {formattedTime}
      </div>
    </div>
  );
};
