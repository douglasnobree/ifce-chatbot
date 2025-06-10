'use client';

import React, {
  createContext,
  useRef,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthProvider';
import { ChatService, attachSocketEvents } from '@/services/chat.service';

// Exemplo de URL do servidor Socket.io (ajuste conforme necessário)
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type Channel = {
  id: string;
  name: string;
  // ...outros metadados
};

export type WebSocketContextType = {
  socket: Socket | null;
  connectedChannels: string[];
  connectToChannel: (channelId: string) => void;
  disconnectFromChannel: (channelId: string) => void;
  sendMessage: (channelId: string, message: any) => void;
  isConnecting: boolean;
};

export const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [connectedChannels, setConnectedChannels] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    setIsConnecting(true);

    // Inicializa conexão socket.io com autenticação
    const socket = io(`${SOCKET_URL}/atendimento`, {
      transports: ['websocket'],
      auth: { token },
      withCredentials: true, // Importante para CORS
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    socketRef.current = socket;

    // Configurar listeners de conexão
    socket.on('connect', () => {
      console.log('Socket conectado:', socket.id);
      setIsConnecting(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Erro de conexão socket:', error.message);
      setIsConnecting(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const connectToChannel = useCallback((channelId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('iniciarAtendimento', {
      sessao_id: channelId,
      setor: 'geral',
    });
    setConnectedChannels((prev) => Array.from(new Set([...prev, channelId])));
  }, []);

  const disconnectFromChannel = useCallback((channelId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('encerrarAtendimento', { sessao_id: channelId });
    setConnectedChannels((prev) => prev.filter((id) => id !== channelId));
  }, []);

  const sendMessage = useCallback((channelId: string, message: any) => {
    if (!socketRef.current) return;
    socketRef.current.emit('enviarMensagem', {
      sessao_id: channelId,
      mensagem: message.text,
      sender: message.sender,
      mediaUrl: message.mediaUrl,
      mediaType: message.mediaType,
      fileName: message.fileName,
    });
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        socket: socketRef.current,
        connectedChannels,
        connectToChannel,
        disconnectFromChannel,
        sendMessage,
        isConnecting,
      }}>
      {children}
    </WebSocketContext.Provider>
  );
}
