'use client';

import { useState, useEffect } from 'react';
import { WebSocketContextType } from '@/providers/WebSocketProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ConnectionStatusProps {
  websocket: WebSocketContextType;
  channelId: string;
  connected: boolean;
  statusMessage: string;
}

export function ConnectionStatus({
  websocket,
  channelId,
  connected,
  statusMessage,
}: ConnectionStatusProps) {
  const { socket, isConnecting } = websocket;

  // Estado adicional para mostrar quando o socket foi criado
  const [socketCreatedAt, setSocketCreatedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (socket && !socketCreatedAt) {
      setSocketCreatedAt(new Date());
    }
  }, [socket, socketCreatedAt]);

  return (
    <Card className='w-full'>
      <CardContent className='pt-6'>
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='font-medium'>Status da conexão:</span>
            <Badge
              //@ts-ignore
              variant={
                connected ? 'success' : isConnecting ? 'outline' : 'destructive'
              }
              className={`${
                connected
                  ? 'bg-green-600'
                  : isConnecting
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              } text-white`}>
              {isConnecting
                ? 'Conectando...'
                : connected
                ? 'Conectado'
                : 'Desconectado'}
            </Badge>
          </div>

          <div className='text-sm'>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Socket ID:</span>
              <span className='font-mono'>{socket?.id || 'N/A'}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Canal:</span>
              <span>{channelId || 'Nenhum'}</span>
            </div>
            {socketCreatedAt && (
              <div className='flex justify-between'>
                <span className='text-gray-500'>Conectado em:</span>
                <span>{socketCreatedAt.toLocaleTimeString()}</span>
              </div>
            )}
            <div className='flex justify-between'>
              <span className='text-gray-500'>Status:</span>
              <span>{statusMessage}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
