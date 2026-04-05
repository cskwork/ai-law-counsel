import { Disclaimer } from '@/app/components/common/Disclaimer';
import { ChatContainer } from '@/app/components/chat/ChatContainer';

export default function Home() {
  return (
    <div className="flex h-screen flex-col">
      <Disclaimer />
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <h1 className="text-center text-lg font-semibold text-gray-900">
          한국 법률 상담 AI
        </h1>
      </header>
      <main className="flex-1 overflow-hidden">
        <ChatContainer />
      </main>
    </div>
  );
}
