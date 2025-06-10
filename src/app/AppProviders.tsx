// Componente de layout principal para integrar providers globais
import React from 'react';
import { WebSocketProvider } from '../providers/WebSocketProvider';
import { ActiveChannelsProvider } from '../providers/ActiveChannelsProvider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <WebSocketProvider>
      <ActiveChannelsProvider>{children}</ActiveChannelsProvider>
    </WebSocketProvider>
  );
}
