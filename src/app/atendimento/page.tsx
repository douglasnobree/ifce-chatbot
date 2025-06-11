'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { UserMenu } from '@/components/UserMenu';
import { MultiChannelChat } from '@/components/MultiChannelChat';
import { ActiveChannelsProvider } from '@/providers/ActiveChannelsProvider';

export default function AtendimentoPage() {
  return (
    <ProtectedRoute>
      <div className='flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-slate-100'>
        <header className='sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60'>
          <div className='container flex h-16 items-center justify-between px-4'>
            <div className='flex items-center space-x-4'>
              <div className='flex items-center space-x-2'>
                <div className='h-8 w-8 rounded-lg bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center'>
                  <span className='text-white font-bold text-sm'>IFCE</span>
                </div>
                <div>
                  <h1 className='text-lg font-semibold text-slate-900'>
                    Central de Atendimento
                  </h1>
                  <p className='text-xs text-slate-500 hidden sm:block'>
                    Sistema WhatsApp IFCE
                  </p>
                </div>
              </div>
            </div>
            <UserMenu />
          </div>
        </header>

        <main className='flex-1 container px-4 py-6'>
          <ActiveChannelsProvider>
            <MultiChannelChat />
          </ActiveChannelsProvider>
        </main>

        <footer className='border-t bg-white/50 backdrop-blur'>
          <div className='container px-4 py-3'>
            <div className='flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600'>
              <p>Sistema de Atendimento IFCE WhatsApp</p>
              <p className='mt-1 sm:mt-0'>
                © {new Date().getFullYear()} IFCE - Todos os direitos reservados
              </p>
            </div>
          </div>
        </footer>
      </div>
    </ProtectedRoute>
  );
}
