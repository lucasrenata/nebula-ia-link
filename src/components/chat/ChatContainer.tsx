
import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { ChatInput } from './ChatInput';
import { useChat } from '@/hooks/useChat';
import { ConnectionStatus } from '@/types/chat';

export const ChatContainer = () => {
  const { messages, isLoading, sendMessage } = useChat();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const getConnectionStatus = (): ConnectionStatus => {
    if (isLoading) return 'sending';
    return 'ready';
  };

  return (
    <main className="flex-grow flex flex-col bg-black bg-opacity-30 backdrop-blur-sm border border-cyan-500/30 rounded-lg box-glow-white overflow-hidden">
      {/* Chat Messages Area */}
      <div
        ref={chatContainerRef}
        className="flex-grow p-4 space-y-4 overflow-y-auto chat-scrollbar"
      >
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      {/* Typing Indicator */}
      <TypingIndicator isVisible={isLoading} />

      {/* Chat Input */}
      <ChatInput
        onSendMessage={sendMessage}
        isLoading={isLoading}
        status={getConnectionStatus()}
      />
    </main>
  );
};
