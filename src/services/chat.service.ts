'use client';

import api from '@/lib/api';
import { AxiosResponse } from 'axios';
import { Socket } from 'socket.io-client';
import { Channel } from '@/providers/WebSocketProvider';

// Interface para mensagens do chat
export interface ChatMessage {
  sender: 'USUARIO' | 'ATENDENTE'; // Adicionado 'sistema' para mensagens do sistema
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
    sender: 'USUARIO' | 'ATENDENTE'
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
    protocolId: string,
    file: File,
    caption: string = ''
  ): Promise<{ success: boolean; mediaUrl?: string }> => {
    try {
      // Determinar o tipo de mídia com base no MIME type
      let mediaType: 'image' | 'document' | 'video' | 'audio' = 'document';

      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.type.startsWith('audio/')) mediaType = 'audio';

      const formData = new FormData();
      formData.append('attachment', file);
      formData.append('caption', caption);
      formData.append('mediatype', mediaType);

      const response = await api.post(
        `/whatsapp/sendMediaFile/${protocolId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return {
        success: true,
        mediaUrl: response.data.mediaUrl,
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
