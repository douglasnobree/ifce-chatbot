'use client';

import api from '@/lib/api';
import { AxiosResponse } from 'axios';
import { Socket } from 'socket.io-client';
import { Channel } from '@/providers/WebSocketProvider';

// Interface para mensagens do chat
export interface ChatMessage {
  sender: 'usuario' | 'atendente';
  nome?: string;
  setor?: string;
  mensagem: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'document' | 'video' | 'audio';
  fileName?: string;
}

// Serviço para gerenciar operações relacionadas ao chat e WebSockets
export const ChatService = {
  // Obter histórico de mensagens para um canal específico
  getMessageHistory: async (channelId: string): Promise<ChatMessage[]> => {
    try {
      const response: AxiosResponse<{ messages: ChatMessage[] }> =
        await api.get(`/chat/history/${channelId}`);
      return response.data.messages;
    } catch (error) {
      console.error('Erro ao obter histórico de mensagens:', error);
      return [];
    }
  },

  // Enviar mensagem para o backend (via REST, não WebSocket)
  sendMessage: async (
    channelId: string,
    message: string,
    sender: 'usuario' | 'atendente'
  ): Promise<boolean> => {
    try {
      await api.post(`/chat/message/${channelId}`, {
        mensagem: message,
        sender,
      });
      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return false;
    }
  },

  // Enviar arquivo para o backend
  sendFile: async (
    channelId: string,
    file: File,
    sender: 'usuario' | 'atendente'
  ): Promise<{ success: boolean; fileUrl?: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sender', sender);
      formData.append('channelId', channelId);

      const response = await api.post(`/chat/upload/${channelId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        success: true,
        fileUrl: response.data.fileUrl,
      };
    } catch (error) {
      console.error('Erro ao enviar arquivo:', error);
      return { success: false };
    }
  },

  // Obter todos os canais disponíveis
  getAvailableChannels: async (): Promise<Channel[]> => {
    try {
      const response: AxiosResponse<{ channels: Channel[] }> = await api.get(
        '/chat/channels'
      );
      return response.data.channels;
    } catch (error) {
      console.error('Erro ao obter canais disponíveis:', error);
      return [];
    }
  },
};

// Função utilitária para anexar eventos ao socket
export const attachSocketEvents = (
  socket: Socket,
  handlers: {
    onMessage?: (msg: ChatMessage) => void;
    onUserJoin?: (user: any) => void;
    onUserLeave?: (user: any) => void;
    onError?: (error: any) => void;
  }
): void => {
  if (handlers.onMessage) {
    socket.on('novaMensagem', handlers.onMessage);
  }

  if (handlers.onUserJoin) {
    socket.on('atendenteEntrou', handlers.onUserJoin);
  }

  if (handlers.onUserLeave) {
    socket.on('atendimentoEncerrado', handlers.onUserLeave);
  }

  if (handlers.onError) {
    socket.on('error', handlers.onError);
  }
};
