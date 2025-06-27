
import { ParticleBackground } from '@/components/effects/ParticleBackground';
import { ChatContainer } from '@/components/chat/ChatContainer';

const Index = () => {
  return (
    <div className="w-screen h-screen overflow-hidden" style={{ background: '#0a0a14', color: '#e0e0ff' }}>
      <ParticleBackground />
      
      <div className="relative z-10 flex flex-col h-full max-w-5xl mx-auto p-4 md:p-6 font-inconsolata">
        {/* Header */}
        <header className="text-center py-4">
          <h1 className="text-3xl md:text-4xl font-bold text-glow-blue">Parceria Com IA</h1>
          <p className="text-sm text-gray-400">Interface de Comunicação via Webhook Unificado</p>
        </header>

        {/* Main Chat Interface */}
        <ChatContainer />
      </div>
    </div>
  );
};

export default Index;
