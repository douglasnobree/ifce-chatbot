'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useActiveChannels } from '@/hooks/useActiveChannels';
import {
  useWebSocket,
  useChatActions,
  ChatMessage,
} from '@/hooks/useWebSocket';
import { useAuth } from '@/providers/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { ChatWindow } from '@/components/ChatWindow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  X,
  MessageSquare,
  Clock,
  User,
  Phone,
  Mail,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface Protocolo {
  id: string;
  numero: string;
  status: string;
  assunto?: string;
  sessao_id?: string;
  setor: string;
  data_criacao: Date;
  data_fechamento?: Date;
  estudante?: {
    id: string;
    nome: string;
    telefone: string;
    email: string;
    curso: string;
  };
  atendente?: {
    id: string;
    nome: string;
    email: string;
    cargo?: string;
    departamento?: string;
  };
  mensagens_protocolo?: Array<{
    id: string;
    conteudo: string;
    origem: string;
    timestamp: Date;
  }>;
}

export function MultiChannelChat() {
  const {
    activeChannels,
    pendingChannels,
    currentChannelId,
    addChannel,
    removeChannel,
    setCurrentChannel,
    markChannelAsRead,
    updateChannelStatus,
    addMessageToChannel,
  } = useActiveChannels();

  const { socket, connectToChannel, disconnectFromChannel, connectedChannels } =
    useWebSocket();
  const actions = useChatActions(socket);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPendingChannel, setSelectedPendingChannel] = useState<
    string | null
  >(null);

  // Refs para gerenciar estado sem causar re-renderizações
  const loadedHistoryChannelsRef = useRef<Set<string>>(new Set());
  const processedProtocolsRef = useRef<Set<string>>(new Set());
  const channelCacheRef = useRef<Record<string, boolean>>({});
  const currentChannelIdRef = useRef<string | null>(null);

  // Mantém a ref atualizada com o valor atual
  useEffect(() => {
    currentChannelIdRef.current = currentChannelId;
  }, [currentChannelId]);

  // Desconecta de todos os canais quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (socket && connectedChannels.length > 0) {
        connectedChannels.forEach((channelId) => {
          disconnectFromChannel(channelId);
        });
      }
    };
  }, [socket, connectedChannels, disconnectFromChannel]);

  // Mapeia o status do protocolo para o formato usado no front-end
  const mapStatus = (
    status: string
  ): 'aguardando' | 'em_atendimento' | 'encerrado' => {
    switch (status) {
      case 'ABERTO':
        return 'aguardando';
      case 'EM_ATENDIMENTO':
        return 'em_atendimento';
      case 'FECHADO':
      case 'CANCELADO':
        return 'encerrado';
      default:
        return 'aguardando';
    }
  };

  const mapProtocoloToChannel = (protocolo: Protocolo) => {
    const ultimaMensagem =
      protocolo.mensagens_protocolo && protocolo.mensagens_protocolo.length > 0
        ? protocolo.mensagens_protocolo[
            protocolo.mensagens_protocolo.length - 1
          ].conteudo
        : protocolo.assunto || 'Novo atendimento';

    const mensagensChat: ChatMessage[] = protocolo.mensagens_protocolo
      ? protocolo.mensagens_protocolo.map((msg) => ({
          mensagem: msg.conteudo,
          sender:
            msg.origem === 'ATENDENTE'
              ? 'ATENDENTE'
              : msg.origem === 'SISTEMA'
              ? 'SISTEMA'
              : 'USUARIO',
          timestamp: new Date(msg.timestamp),
        }))
      : [];

    return {
      id: protocolo.id,
      name: protocolo.estudante?.nome || `Protocolo ${protocolo.numero}`,
      status: mapStatus(protocolo.status),
      lastMessage: ultimaMensagem,
      lastMessageTime: new Date(protocolo.data_criacao),
      sessionId: protocolo.sessao_id || protocolo.id,
      messages: mensagensChat,
      studentInfo: protocolo.estudante
        ? {
            name: protocolo.estudante.nome,
            id: protocolo.estudante.id,
            course: protocolo.estudante.curso,
            contactInfo: protocolo.estudante.telefone,
            email: protocolo.estudante.email,
          }
        : undefined,
    };
  };

  useEffect(() => {
    if (!socket) return;

    setIsLoading(true);

    const handleAtendimentosAbertos = (protocolos: Protocolo[]) => {
      setTimeout(() => {
        const novosProtocolos = protocolos.filter((protocolo) => {
          if (processedProtocolsRef.current.has(protocolo.id)) return false;
          processedProtocolsRef.current.add(protocolo.id);
          return true;
        });

        if (novosProtocolos.length === 0) {
          setIsLoading(false);
          return;
        }

        const canaisParaAdicionar = novosProtocolos.map(mapProtocoloToChannel);

        canaisParaAdicionar.forEach((channel) => {
          if (!channelCacheRef.current[channel.id]) {
            addChannel(channel);
            channelCacheRef.current[channel.id] = true;
          }
        });

        setIsLoading(false);
      }, 100);
    };

    socket.off('atendimentosAbertos', handleAtendimentosAbertos);
    socket.on('atendimentosAbertos', handleAtendimentosAbertos);
    actions.listarAtendimentos();

    return () => {
      socket.off('atendimentosAbertos', handleAtendimentosAbertos);
    };
  }, [socket, addChannel]);
  // Handle para novas mensagens
  useEffect(() => {
    if (!socket) return;

    const handleNovaMensagem = (msg: {
      sessao_id?: string;
      protocoloId?: string;
      mensagem: string;
      sender: 'USUARIO' | 'ATENDENTE' | 'SISTEMA';
      nome?: string;
      setor?: string;
      mediaUrl?: string;
      mediaType?: 'image' | 'document' | 'video' | 'audio';
      fileName?: string;
    }) => {
      // Usar sessao_id como identificador principal, com fallback para protocoloId
      const targetSessionId = msg.sessao_id || msg.protocoloId;
      console.log('Nova mensagem recebida:', targetSessionId, msg);

      if (targetSessionId) {
        // Buscar o canal correspondente à sessão em ambos os tipos de canais (ativos e pendentes)
        let targetChannel = activeChannels.find(
          (ch) => ch.sessionId === targetSessionId
        );

        // Se não encontramos em canais ativos, procuramos em canais pendentes
        if (!targetChannel) {
          targetChannel = pendingChannels.find(
            (ch) => ch.sessionId === targetSessionId
          );

          // Se encontrarmos em canais pendentes e for uma mensagem do usuário,
          // movemos o canal para ativos automaticamente
          if (targetChannel && msg.sender === 'USUARIO') {
            console.log(
              'Canal encontrado em pendentes, movendo para ativos:',
              targetChannel.id
            );
            updateChannelStatus(targetChannel.id, 'em_atendimento');
          }
        }

        if (targetChannel) {
          console.log(
            'Canal encontrado:',
            targetChannel.id,
            'Tipo de mensagem:',
            msg.sender
          );

          // Verifica se já estamos conectados a este canal
          if (!connectedChannels.includes(targetSessionId)) {
            console.log('Conectando ao canal via WebSocket:', targetSessionId);
            connectToChannel(targetSessionId);
          }

          // Adiciona a mensagem ao canal usando o ID do canal (não o sessionId)
          addMessageToChannel(targetChannel.id, {
            mensagem: msg.mensagem,
            sender: msg.sender,
            timestamp: new Date(),
            ...(msg.nome && { nome: msg.nome }),
            ...(msg.mediaUrl && { mediaUrl: msg.mediaUrl }),
            ...(msg.mediaType && { mediaType: msg.mediaType }),
            ...(msg.fileName && { fileName: msg.fileName }),
          });

          // Se esta mensagem é para o canal atual, marca como lido
          const currentId = currentChannelIdRef.current;
          if (currentId === targetChannel.id) {
            // Usando setTimeout para quebrar o ciclo de atualizações
            setTimeout(() => {
              markChannelAsRead(currentId);
            }, 0);
          }
        } else {
          console.log('Canal não encontrado para a sessão:', targetSessionId);
          // Podemos implementar uma lógica para solicitar informações do protocolo se necessário
        }
      }
    };

    socket.off('novaMensagem', handleNovaMensagem);
    socket.on('novaMensagem', handleNovaMensagem);

    return () => {
      socket.off('novaMensagem', handleNovaMensagem);
    };
  }, [
    socket,
    connectedChannels,
    connectToChannel,
    addMessageToChannel,
    activeChannels,
    pendingChannels,
    markChannelAsRead,
    updateChannelStatus,
  ]);

  // Efeito para conectar ao canal WebSocket quando um canal é selecionado
  useEffect(() => {
    if (!currentChannelId || !socket) return;

    const activeChannel = activeChannels.find(
      (channel) => channel.id === currentChannelId
    );

    if (activeChannel) {
      // Verifica se já estamos conectados a este canal
      if (!connectedChannels.includes(activeChannel.sessionId)) {
        connectToChannel(activeChannel.sessionId);
      }

      // Marca o canal como lido em um setTimeout para evitar loops
      setTimeout(() => {
        markChannelAsRead(currentChannelId);
      }, 0);
    }
  }, [
    currentChannelId,
    socket,
    activeChannels,
    connectedChannels,
    connectToChannel,
    markChannelAsRead,
  ]);

  // Função para carregar o histórico de mensagens ao selecionar um canal
  const loadChannelHistory = useCallback(
    (channelId: string) => {
      // Verifica se já carregamos o histórico deste canal antes
      if (loadedHistoryChannelsRef.current.has(channelId)) {
        return; // Já carregamos o histórico deste canal
      }

      const channel = [...activeChannels, ...pendingChannels].find(
        (c) => c.id === channelId
      );

      if (channel && socket) {
        console.log(`Carregando histórico para o canal: ${channel.sessionId}`);
        // Aqui você pode implementar uma chamada para carregar histórico específico
        // Exemplo: actions.carregarHistoricoMensagens({ sessao_id: channel.sessionId });

        // Marca este canal como já tendo seu histórico carregado
        loadedHistoryChannelsRef.current.add(channelId);
      }
    },
    [activeChannels, pendingChannels, socket]
  );

  // Carrega histórico de mensagens quando um canal é selecionado
  useEffect(() => {
    if (currentChannelId) {
      loadChannelHistory(currentChannelId);
    }
  }, [currentChannelId, loadChannelHistory]);
  // Função para atender um canal (chamado pendente)
  const handleAttendChannel = (channelId: string) => {
    setIsLoading(true);
    const channel = pendingChannels.find((c) => c.id === channelId);

    if (!channel) {
      console.error('Canal pendente não encontrado para atender:', channelId);
      setIsLoading(false);
      return;
    }

    try {
      console.log('Atendendo canal:', channel.id, 'sessão:', channel.sessionId);

      // Primeiro atualiza o status do canal
      updateChannelStatus(channelId, 'em_atendimento');

      // Envia uma mensagem de sistema informando que o atendente entrou
      addMessageToChannel(channel.id, {
        mensagem: `${user?.firstName || 'Atendente'} entrou no atendimento`,
        sender: 'SISTEMA',
        timestamp: new Date(),
      });

      // Entra no atendimento via socket
      actions.entrarAtendimento({
        sessao_id: channel.sessionId,
        nome: user?.firstName || 'Atendente',
        setor: user?.departamento || 'Geral',
        atendenteId: user?.atendenteId || 'unknown',
      });

      // Conecta ao canal do WebSocket
      if (!connectedChannels.includes(channel.sessionId)) {
        connectToChannel(channel.sessionId);
      }

      // Seleciona o canal automaticamente
      setCurrentChannel(channel.id);
    } catch (error) {
      console.error('Erro ao atender canal:', error);
    } finally {
      setIsLoading(false);
    }
  };
  // Função para encerrar um canal
  const handleCloseChannel = (channelId: string) => {
    if (window.confirm('Deseja realmente encerrar este atendimento?')) {
      // Busca o canal antes de encerrar
      const channel = activeChannels.find((ch) => ch.sessionId === channelId);

      if (channel) {
        console.log(
          'Encerrando atendimento para o canal:',
          channel.id,
          'sessão:',
          channelId
        );

        // Envia a notificação de encerramento
        actions.encerrarAtendimento({ sessao_id: channelId });

        // Desconecta do canal do WebSocket
        if (connectedChannels.includes(channelId)) {
          disconnectFromChannel(channelId);
        }

        // Remove o canal da lista de ativos
        removeChannel(channel.id);
      }
    }
  }; // Função para enviar mensagem
  const handleSendMessage = (channelId: string, message: string) => {
    if (!channelId || !message.trim()) return;

    console.log('Enviando mensagem para o canal:', channelId);

    // Também adicionamos localmente para garantir que a UI seja atualizada imediatamente
    // Encontramos o canal ativo correspondente a esta sessão
    const activeChannel = activeChannels.find(
      (ch) => ch.sessionId === channelId
    );

    if (activeChannel) {
      // Adicionamos a mensagem localmente primeiro para atualização imediata da UI
      addMessageToChannel(activeChannel.id, {
        mensagem: message,
        sender: 'ATENDENTE',
        nome: user?.firstName || 'Atendente',
        timestamp: new Date(),
      });

      // Em seguida, enviamos a mensagem pelo socket
      actions.enviarMensagem({
        sessao_id: channelId,
        mensagem: message,
        sender: 'ATENDENTE',
      });
    } else {
      console.error('Canal não encontrado para enviar mensagem:', channelId);
    }
  };

  // Função para obter ícone de status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aguardando':
        return <Clock className='h-4 w-4 text-amber-500' />;
      case 'em_atendimento':
        return <MessageSquare className='h-4 w-4 text-blue-500' />;
      case 'encerrado':
        return <CheckCircle2 className='h-4 w-4 text-green-500' />;
      default:
        return <AlertCircle className='h-4 w-4 text-gray-500' />;
    }
  };

  return (
    <div className='grid grid-cols-1 lg:grid-cols-4 gap-4 h-full w-full min-h-[calc(100vh-240px)] max-w-full mx-auto container'>
      {/* Painel de Chamados Pendentes */}
      <div className='lg:col-span-1'>
        <Card className='h-full flex flex-col'>
          <CardHeader className='pb-3'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-2'>
                <AlertCircle className='h-5 w-5 text-amber-500' />
                <h2 className='font-semibold'>Chamados Pendentes</h2>
              </div>
              {pendingChannels.length > 0 && (
                <Badge variant='destructive' className='text-xs'>
                  {pendingChannels.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className='flex-1 p-0'>
            <ScrollArea className='h-full'>
              {pendingChannels.length === 0 ? (
                <div className='flex flex-col items-center justify-center h-32 text-center p-4'>
                  <CheckCircle2 className='h-8 w-8 text-green-500 mb-2' />
                  <p className='text-sm text-slate-600'>
                    Nenhum chamado pendente
                  </p>
                  <p className='text-xs text-slate-400 mt-1'>
                    Todos os atendimentos estão em dia!
                  </p>
                </div>
              ) : (
                <div className='space-y-2 p-3'>
                  {pendingChannels.map((channel) => (
                    <Card
                      key={channel.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedPendingChannel === channel.id
                          ? 'ring-2 ring-blue-500'
                          : ''
                      }`}
                      onClick={() => setSelectedPendingChannel(channel.id)}>
                      <CardContent className='p-3'>
                        <div className='flex items-start justify-between mb-2'>
                          <div className='flex items-center space-x-2'>
                            {getStatusIcon(channel.status)}
                            <span className='font-medium text-sm truncate'>
                              {channel.name}
                            </span>
                          </div>
                          <Badge variant='outline' className='text-xs'>
                            {formatTime(channel.lastMessageTime)}
                          </Badge>
                        </div>

                        <p className='text-xs text-slate-600 mb-3 line-clamp-2'>
                          {channel.lastMessage}
                        </p>

                        {channel.studentInfo && (
                          <div className='space-y-1 mb-3'>
                            <div className='flex items-center space-x-1 text-xs text-slate-500'>
                              <GraduationCap className='h-3 w-3' />
                              <span className='truncate'>
                                {channel.studentInfo.course}
                              </span>
                            </div>
                            {channel.studentInfo.contactInfo && (
                              <div className='flex items-center space-x-1 text-xs text-slate-500'>
                                <Phone className='h-3 w-3' />
                                <span>{channel.studentInfo.contactInfo}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <Button
                          size='sm'
                          className='w-full'
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAttendChannel(channel.id);
                          }}
                          disabled={isLoading}>
                          {isLoading ? (
                            <Loader2 className='h-4 w-4 animate-spin mr-2' />
                          ) : (
                            <MessageSquare className='h-4 w-4 mr-2' />
                          )}
                          Atender
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Painel de Atendimento */}
      <div className='lg:col-span-3'>
        <Card className='h-full flex flex-col'>
          {activeChannels.length === 0 ? (
            <div className='flex-1 flex items-center justify-center'>
              <div className='text-center space-y-4'>
                <div className='mx-auto h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center'>
                  <MessageSquare className='h-8 w-8 text-slate-400' />
                </div>
                <div>
                  <h3 className='text-lg font-medium text-slate-900'>
                    Nenhum atendimento ativo
                  </h3>
                  <p className='text-slate-500 mt-1'>
                    Selecione um chamado pendente para iniciar o atendimento
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <Tabs
              value={currentChannelId || undefined}
              onValueChange={(value) => {
                // Use setTimeout para evitar ciclos de renderização
                setTimeout(() => {
                  setCurrentChannel(value);
                }, 0);
              }}
              className='h-full flex flex-col'>
              <div className='border-b bg-slate-50/50'>
                <ScrollArea className='w-full'>
                  <TabsList className='h-12 bg-transparent p-1 flex-nowrap inline-flex min-w-max'>
                    {activeChannels.map((channel) => (
                      <TabsTrigger
                        key={channel.id}
                        value={channel.id}
                        className='flex items-center space-x-2 px-3 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap'>
                        <div className='flex items-center space-x-2'>
                          <div className='h-2 w-2 rounded-full bg-green-500' />
                          <span className='font-medium'>{channel.name}</span>
                          {channel.unreadCount > 0 && (
                            <Badge
                              variant='destructive'
                              className='h-5 w-5 p-0 text-xs'>
                              {channel.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-6 w-6 p-0 hover:bg-red-100'
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseChannel(channel.sessionId);
                          }}>
                          <X className='h-3 w-3' />
                        </Button>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <ScrollBar orientation='horizontal' />
                </ScrollArea>
              </div>

              {activeChannels.map((channel) => (
                <TabsContent
                  key={channel.id}
                  value={channel.id}
                  className='flex-1 m-0 p-0'>
                  <div className='h-full'>
                    <ChatWindow
                      messages={channel.messages}
                      onSendMessage={(msg) =>
                        handleSendMessage(channel.sessionId, msg)
                      }
                      isConnected={true}
                      title={`${channel.name}`}
                      // @ts-ignore
                      studentInfo={channel.studentInfo}
                      placeholder='Digite sua mensagem...'
                      loading={isLoading}
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </Card>
      </div>
    </div>
  );
}

function formatTime(date?: Date) {
  if (!date) return '';

  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60 * 1000) return 'agora';
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes}m`;
  }
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}h`;
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
