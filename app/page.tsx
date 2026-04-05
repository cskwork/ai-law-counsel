import { Disclaimer } from '@/app/components/common/Disclaimer';
import { ChatContainer } from '@/app/components/chat/ChatContainer';

export default function Home() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-zinc-50">
      <Disclaimer />
      <header className="sticky top-0 z-10 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md px-4 py-3">
        <h1 className="text-center text-base font-semibold tracking-tight text-zinc-900">
          법률 상담 AI
        </h1>
      </header>
      <main className="flex-1 overflow-hidden">
        <ChatContainer />
      </main>
    </div>
  );
}
