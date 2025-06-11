'use client';

import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { ChatMessage } from '@/hooks/useWebSocket';

// Tipo para representar um canal ativo
export type ActiveChannel = {
  id: string;
  name: string;
  status: 'aguardando' | 'em_atendimento' | 'encerrado';
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  messages: ChatMessage[];
  sessionId: string // ID da sessão de atendimento, se aplicável
  isActive: boolean; // Indica se está selecionado atualmente
  studentInfo?: {
    name?: string;
    id?: string;
    course?: string;
    contactInfo?: string;
  };
};

export type ActiveChannelsContextType = {
  activeChannels: ActiveChannel[];
  pendingChannels: ActiveChannel[];
  currentChannelId: string | null;

  // Métodos para gerenciar canais
  addChannel: (
    channel: Omit<ActiveChannel, 'isActive' | 'messages' | 'unreadCount'>
  ) => void;
  removeChannel: (channelId: string) => void;
  setCurrentChannel: (channelId: string) => void;
  addMessageToChannel: (channelId: string, message: ChatMessage) => void;
  markChannelAsRead: (channelId: string) => void;
  updateChannelStatus: (
    channelId: string,
    status: ActiveChannel['status']
  ) => void;
};

export const ActiveChannelsContext = createContext<
  ActiveChannelsContextType | undefined
>(undefined);

export function ActiveChannelsProvider({ children }: { children: ReactNode }) {
  const [activeChannels, setActiveChannels] = useState<ActiveChannel[]>([]);
  const [pendingChannels, setPendingChannels] = useState<ActiveChannel[]>([]);
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);

  // Adicionar um novo canal (com useCallback para manter a referência estável)
  const addChannel = useCallback(
    (
      channelData: Omit<ActiveChannel, 'isActive' | 'messages' | 'unreadCount'>
    ) => {
      const newChannel: ActiveChannel = {
        ...channelData,
        messages: [],
        unreadCount: 0,
        isActive: false,
      };

      // Se é um canal pendente, adiciona aos pendentes
      if (channelData.status === 'aguardando') {
        setPendingChannels((prev) => {
          if (prev.some((c) => c.id === channelData.id)) {
            return prev;
          }
          return [...prev, newChannel];
        });
      } else {
        // Caso contrário, adiciona aos canais ativos
        setActiveChannels((prev) => {
          if (prev.some((c) => c.id === channelData.id)) {
            return prev;
          }

          const newChannels = [...prev, newChannel];

          // Se não houver canal selecionado, seleciona este
          if (!currentChannelId) {
            setCurrentChannelId(newChannel.id);
            return newChannels.map((c) => ({
              ...c,
              isActive: c.id === newChannel.id,
            }));
          }

          return newChannels;
        });
      }
    },
    [currentChannelId] // Só depende do currentChannelId
  );
  // Remover um canal (com useCallback)
  const removeChannel = useCallback(
    (channelId: string) => {
      // Remove dos canais pendentes
      setPendingChannels((prev) =>
        prev.filter((channel) => channel.id !== channelId)
      );

      // Remove dos canais ativos
      setActiveChannels((prev) => {
        const newChannels = prev.filter((channel) => channel.id !== channelId);

        // Se o canal removido era o atual, seleciona outro
        if (channelId === currentChannelId && newChannels.length > 0) {
          const newCurrentChannel = newChannels[0];
          setCurrentChannelId(newCurrentChannel.id);
          return newChannels.map((c) => ({
            ...c,
            isActive: c.id === newCurrentChannel.id,
          }));
        }

        return newChannels;
      });

      // Se não sobrou nenhum canal ativo, limpa o canal atual
      setActiveChannels((prev) => {
        if (prev.length === 0) {
          setCurrentChannelId(null);
        }
        return prev;
      });
    },
    [currentChannelId]
  ); // Selecionar um canal atual (com useCallback)
  const setCurrentChannel = useCallback((channelId: string) => {
    setCurrentChannelId(channelId);

    // Atualiza o estado de todos os canais
    setActiveChannels((prev) =>
      prev.map((channel) => ({
        ...channel,
        isActive: channel.id === channelId,
      }))
    );
  }, []);
  // Adicionar mensagem a um canal (com useCallback)
  const addMessageToChannel = useCallback(
    (channelId: string, message: ChatMessage) => {
      // Primeiro verifica se o canal está entre os ativos
      setActiveChannels((prev) => {
        const isActive = prev.some((c) => c.id === channelId);

        if (isActive) {
          return prev.map((channel) => {
            if (channel.id === channelId) {
              return {
                ...channel,
                messages: [...channel.messages, message],
                lastMessage: message.mensagem,
                lastMessageTime: new Date(),
                // Incrementa contador de não lidas se não for o canal atual
                unreadCount: channel.isActive ? 0 : channel.unreadCount + 1,
              };
            }
            return channel;
          });
        }
        return prev;
      });

      // Verifica se está entre os pendentes
      setPendingChannels((prev) => {
        const isPending = prev.some((c) => c.id === channelId);

        if (isPending) {
          return prev.map((channel) => {
            if (channel.id === channelId) {
              return {
                ...channel,
                messages: [...channel.messages, message],
                lastMessage: message.mensagem,
                lastMessageTime: new Date(),
                unreadCount: channel.unreadCount + 1,
              };
            }
            return channel;
          });
        }
        return prev;
      });
    },
    []
  ); // Marcar mensagens de um canal como lidas (com useCallback)
  const markChannelAsRead = useCallback((channelId: string) => {
    setActiveChannels((prev) => {
      return prev.map((channel) => {
        if (channel.id === channelId) {
          return {
            ...channel,
            unreadCount: 0,
          };
        }
        return channel;
      });
    });
  }, []);

  // Atualizar o status de um canal (com useCallback)
  const updateChannelStatus = useCallback(
    (channelId: string, status: ActiveChannel['status']) => {
      // Se o status é "em_atendimento", move de pendentes para ativos
      if (status === 'em_atendimento') {
        // Pegamos a referência do canal pendente
        const pendingChannel = pendingChannels.find((c) => c.id === channelId);

        if (pendingChannel) {
          // Remove dos pendentes
          setPendingChannels((prev) => prev.filter((c) => c.id !== channelId));

          // Adiciona aos ativos com o status atualizado
          const updatedChannel: ActiveChannel = {
            ...pendingChannel,
            status: 'em_atendimento',
            isActive: true,
            unreadCount: 0,
          };

          setActiveChannels((prev) => {
            // Verifica se o canal já não existe nos ativos para evitar duplicação
            if (prev.some((c) => c.id === channelId)) {
              console.log('Canal já existe nos ativos, atualizando apenas');
              return prev.map((c) => ({
                ...c,
                isActive: c.id === channelId,
                status: c.id === channelId ? status : c.status,
              }));
            }

            // Adiciona o novo canal
            const newChannels = [...prev, updatedChannel];

            // Define como canal ativo
            setCurrentChannelId(channelId);

            // Atualiza todos os canais, marcando este como ativo
            return newChannels.map((c) => ({
              ...c,
              isActive: c.id === channelId,
            }));
          });
        }
      }
      // Caso contrário, apenas atualiza o status
      else {
        // Atualiza nos canais ativos
        setActiveChannels((prev) =>
          prev.map((channel) => {
            if (channel.id === channelId) {
              return {
                ...channel,
                status,
              };
            }
            return channel;
          })
        );

        // Atualiza nos pendentes
        setPendingChannels((prev) =>
          prev.map((channel) => {
            if (channel.id === channelId) {
              return {
                ...channel,
                status,
              };
            }
            return channel;
          })
        );
      }
    },
    [pendingChannels, currentChannelId]
  );

  return (
    <ActiveChannelsContext.Provider
      value={{
        activeChannels,
        pendingChannels,
        currentChannelId,
        addChannel,
        removeChannel,
        setCurrentChannel,
        addMessageToChannel,
        markChannelAsRead,
        updateChannelStatus,
      }}>
      {children}
    </ActiveChannelsContext.Provider>
  );
}
