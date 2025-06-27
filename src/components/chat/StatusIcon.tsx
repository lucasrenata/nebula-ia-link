
import { Loader, Terminal, Check, AlertCircle } from 'lucide-react';
import { ConnectionStatus } from '@/types/chat';

interface StatusIconProps {
  status: ConnectionStatus;
}

export const StatusIcon = ({ status }: StatusIconProps) => {
  switch (status) {
    case 'sending':
      return <Loader className="w-5 h-5 text-yellow-400 animate-spin" />;
    case 'received':
      return <Check className="w-5 h-5 text-green-400 text-glow-green" />;
    case 'error':
      return <AlertCircle className="w-5 h-5 text-red-400" />;
    default:
      return <Terminal className="w-5 h-5 text-cyan-400 text-glow-blue" />;
  }
};
