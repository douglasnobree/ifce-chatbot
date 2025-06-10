'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { UserMenu } from '@/components/UserMenu';
import { MultiChannelChat } from '@/components/MultiChannelChat';
import { ActiveChannelsProvider } from '@/providers/ActiveChannelsProvider';

export default function AtendimentoPage() {
  return (
    <ProtectedRoute>
      <div className='flex flex-col min-h-screen'>
        <header className='w-full p-4 border-b flex justify-between items-center bg-white'>
          <h1 className='text-xl font-bold'>Painel de Atendimento IFCE</h1>
          <UserMenu />
        </header>

        <main className='flex-1 flex'>
          <ActiveChannelsProvider>
            <MultiChannelChat />
          </ActiveChannelsProvider>
        </main>

        <footer className='p-2 border-t text-center text-xs text-gray-500'>
          Sistema de Atendimento IFCE WhatsApp - {new Date().getFullYear()}
        </footer>
      </div>
    </ProtectedRoute>
  );
}
