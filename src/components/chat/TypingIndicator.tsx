
export const TypingIndicator = ({ isVisible }: { isVisible: boolean }) => {
  if (!isVisible) return null;

  return (
    <div className="flex items-center space-x-2 px-4 pb-2">
      <span className="text-green-400 text-glow-green">IA está digitando</span>
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-typing-dot" style={{ animationDelay: '-0.32s' }} />
        <div className="w-2 h-2 bg-green-400 rounded-full animate-typing-dot" style={{ animationDelay: '-0.16s' }} />
        <div className="w-2 h-2 bg-green-400 rounded-full animate-typing-dot" />
      </div>
    </div>
  );
};
