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
  sessionId: string; // ID da sessão de atendimento, se aplicável
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
    channel: Omit<ActiveChannel, 'isActive' | 'unreadCount'> & {
      messages?: ChatMessage[];
    }
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

  // Log detalhado do estado do provider
  useEffect(() => {
    console.log('ActiveChannelsProvider state atualizado:');
    console.log(
      'Canais ativos:',
      activeChannels.map((c) => `${c.id} (session: ${c.sessionId})`)
    );
    console.log(
      'Canais pendentes:',
      pendingChannels.map((c) => `${c.id} (session: ${c.sessionId})`)
    );
    console.log('Canal atual:', currentChannelId);
  }, [activeChannels, pendingChannels, currentChannelId]);

  // Adicionar um novo canal (com useCallback para manter a referência estável)
  const addChannel = useCallback(
    (
      channelData: Omit<ActiveChannel, 'isActive' | 'unreadCount'> & {
        messages?: ChatMessage[];
      }
    ) => {
      const newChannel: ActiveChannel = {
        ...channelData,
        messages: channelData.messages || [],
        unreadCount: 0,
        isActive: false,
      };

      // Se é um canal pendente, adiciona aos pendentes
      if (channelData.status === 'aguardando') {
        setPendingChannels((prev) => {
          // Se já existe, atualiza apenas as propriedades, mas mantém as mensagens existentes
          const existingChannel = prev.find((c) => c.id === channelData.id);
          if (existingChannel) {
            return prev.map((c) => {
              if (c.id === channelData.id) {
                return {
                  ...c,
                  ...channelData,
                  messages: channelData.messages?.length
                    ? channelData.messages
                    : c.messages,
                };
              }
              return c;
            });
          }
          return [...prev, newChannel];
        });
      } else {
        // Caso contrário, adiciona aos canais ativos
        setActiveChannels((prev) => {
          // Se já existe, atualiza apenas as propriedades, mas mantém as mensagens existentes
          const existingChannel = prev.find((c) => c.id === channelData.id);
          if (existingChannel) {
            return prev.map((c) => {
              if (c.id === channelData.id) {
                return {
                  ...c,
                  ...channelData,
                  messages: channelData.messages?.length
                    ? channelData.messages
                    : c.messages,
                };
              }
              return c;
            });
          }
          // Apenas retorna os novos canais, sem atualizar o currentChannelId automaticamente
          // Isso evita um ciclo infinito de atualizações
          return [...prev, newChannel];
        });
      }
    },
    [] // Não depende de nenhum estado, para evitar ciclos infinitos
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
  );

  // Selecionar um canal atual (com useCallback)
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
      console.log(
        'Provider - Adicionando mensagem ao canal:',
        channelId,
        message
      );

      // Primeiro verifica se o canal está entre os ativos (pelo ID ou sessionId)
      setActiveChannels((prev) => {
        const targetChannel = prev.find(
          (c) => c.id === channelId || c.sessionId === channelId
        );

        if (targetChannel) {
          console.log(
            'Adicionando ao canal ativo:',
            targetChannel.name,
            'ID:',
            targetChannel.id
          );

          return prev.map((channel) => {
            if (channel.id === targetChannel.id) {
              // Adicionamos todas as mensagens sem verificar duplicação
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

      // Verifica se está entre os pendentes (pelo ID ou sessionId)
      setPendingChannels((prev) => {
        const targetChannel = prev.find(
          (c) => c.id === channelId || c.sessionId === channelId
        );

        if (targetChannel) {
          console.log(
            'Adicionando ao canal pendente:',
            targetChannel.name,
            'ID:',
            targetChannel.id
          );

          return prev.map((channel) => {
            if (channel.id === targetChannel.id) {
              // Adicionamos todas as mensagens ao canal pendente sem verificar duplicação
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
  );

  // Marcar mensagens de um canal como lidas (com useCallback)
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
        // Buscamos o canal pendente pelo ID para movê-lo para os ativos
        const pendingChannel = pendingChannels.find((c) => c.id === channelId);

        if (pendingChannel) {
          // Aqui estamos preservando as mensagens do canal pendente (pendingChannel.messages)
          const updatedChannel: ActiveChannel = {
            ...pendingChannel,
            status: 'em_atendimento',
            isActive: true,
            unreadCount: 0,
            // Mantém explicitamente as mensagens existentes do canal pendente
            messages: pendingChannel.messages,
          };

          setActiveChannels((prev) => {
            // Verifica se o canal já não existe nos ativos para evitar duplicação
            if (prev.some((c) => c.id === channelId)) {
              console.log('Canal já existe nos ativos, atualizando apenas');
              return prev.map((c) => ({
                ...c,
                isActive: c.id === channelId,
                status: c.id === channelId ? status : c.status,
                // Mantém as mensagens existentes
                messages:
                  c.id === channelId
                    ? // Mescla as mensagens do canal pendente e do canal ativo (se houver)
                      [
                        ...c.messages,
                        ...pendingChannel.messages.filter(
                          (pm) =>
                            !c.messages.some((m) => m.mensagem === pm.mensagem)
                        ),
                      ]
                    : c.messages,
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
