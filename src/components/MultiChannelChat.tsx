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
    console.log(
      'Mapeando protocolo para canal:',
      protocolo.id,
      protocolo.sessao_id
    );

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
    const channel = {
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

    console.log('Canal mapeado:', channel.id, 'sessionId:', channel.sessionId);
    return channel;
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
  }, [socket, addChannel]); // Handle para novas mensagens
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
        // Busca em todos os canais (ativos e pendentes) usando tanto sessionId quanto id
        let targetChannel = [...activeChannels, ...pendingChannels].find(
          (ch) => ch.sessionId === targetSessionId || ch.id === targetSessionId
        );

        // Log detalhado para rastreamento
        console.log('Buscando canal para sessão/protocolo:', targetSessionId);
        console.log(
          'Canais ativos disponíveis:',
          activeChannels.map((ch) => ({ id: ch.id, sessionId: ch.sessionId }))
        );
        console.log(
          'Canais pendentes disponíveis:',
          pendingChannels.map((ch) => ({ id: ch.id, sessionId: ch.sessionId }))
        );
        console.log(
          'Canal encontrado:',
          targetChannel
            ? `${targetChannel.id} (Status: ${targetChannel.status})`
            : 'Nenhum'
        );

        // Se encontramos o canal em qualquer lista, adicionamos a mensagem
        if (targetChannel) {
          console.log(
            'Canal encontrado:',
            targetChannel.id,
            'Adicionando mensagem do tipo:',
            msg.sender
          );

          // Garantir que estamos conectados ao canal via WebSocket
          if (!connectedChannels.includes(targetSessionId)) {
            console.log('Conectando ao canal via WebSocket:', targetSessionId);
            connectToChannel(targetSessionId);
          }

          // Adicionar a mensagem ao canal
          addMessageToChannel(targetChannel.id, {
            mensagem: msg.mensagem,
            sender: msg.sender,
            timestamp: new Date(),
            ...(msg.nome && { nome: msg.nome }),
            ...(msg.mediaUrl && { mediaUrl: msg.mediaUrl }),
            ...(msg.mediaType && { mediaType: msg.mediaType }),
            ...(msg.fileName && { fileName: msg.fileName }),
          });

          // Marcar como lido se este é o canal ativo
          if (currentChannelId === targetChannel.id) {
            setTimeout(() => {
              markChannelAsRead(targetChannel.id);
            }, 0);
          }
        }
        // Se não encontramos um canal e é mensagem de USUARIO ou ATENDENTE, processamos de forma adequada
        else {
          if (msg.sender === 'USUARIO') {
            console.log(
              'Canal não encontrado para usuário:',
              targetSessionId,
              '- Criando novo canal'
            );

            try {
              // Criar um novo canal para mensagem de usuário sem canal existente
              const novoCanal = {
                id: targetSessionId,
                name:
                  msg.nome ||
                  `Novo atendimento ${targetSessionId.substring(0, 8)}`,
                status: 'aguardando' as
                  | 'aguardando'
                  | 'em_atendimento'
                  | 'encerrado',
                lastMessage: msg.mensagem,
                lastMessageTime: new Date(),
                sessionId: targetSessionId,
                messages: [
                  {
                    mensagem: msg.mensagem,
                    sender: msg.sender,
                    timestamp: new Date(),
                    ...(msg.nome && { nome: msg.nome }),
                    ...(msg.mediaUrl && { mediaUrl: msg.mediaUrl }),
                    ...(msg.mediaType && { mediaType: msg.mediaType }),
                    ...(msg.fileName && { fileName: msg.fileName }),
                  },
                ],
                studentInfo: {
                  name: msg.nome || 'Cliente',
                  id: targetSessionId,
                  contactInfo: 'Chat',
                  course: 'Não especificado',
                },
              };

              // Adicionar o novo canal como pendente
              addChannel(novoCanal);
              console.log('Novo canal criado:', targetSessionId);

              // Registrar para evitar duplicação
              channelCacheRef.current[targetSessionId] = true;

              // Conectar ao canal
              connectToChannel(targetSessionId);

              // Solicitar mais informações sobre este protocolo
              if (socket) {
                socket.emit('solicitarInfoProtocolo', {
                  protocoloId: targetSessionId,
                });
              }
            } catch (error) {
              console.error('Erro ao criar novo canal:', error);
            }
          } else if (msg.sender === 'ATENDENTE') {
            console.log('Mensagem de atendente sem canal correspondente:', msg);

            // Busca mais profunda por canais que possam corresponder a esta mensagem
            const potencialCanal = [...activeChannels, ...pendingChannels].find(
              (ch) =>
                ch.id.includes(targetSessionId) ||
                (targetSessionId && targetSessionId.includes(ch.id))
            );

            if (potencialCanal) {
              console.log(
                'Canal potencial encontrado para mensagem de atendente:',
                potencialCanal.id
              );

              // Adicionar a mensagem ao canal potencial
              addMessageToChannel(potencialCanal.id, {
                mensagem: msg.mensagem,
                sender: msg.sender,
                timestamp: new Date(),
                ...(msg.nome && { nome: msg.nome }),
                ...(msg.mediaUrl && { mediaUrl: msg.mediaUrl }),
                ...(msg.mediaType && { mediaType: msg.mediaType }),
                ...(msg.fileName && { fileName: msg.fileName }),
              });
            } else {
              console.log(
                'Não foi possível encontrar um canal para a mensagem do atendente'
              );
            }
          } else {
            console.log('Mensagem de sistema sem canal correspondente:', msg);
          }
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
    connectToChannel,
    disconnectFromChannel,
    addMessageToChannel,
    addChannel,
    activeChannels,
    pendingChannels,
    markChannelAsRead,
    updateChannelStatus,
    setCurrentChannel,
    currentChannelId,
    connectedChannels,
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
  }, [currentChannelId, loadChannelHistory]); // Função para atender um canal (chamado pendente)
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

      // Verifica se o canal ainda existe antes de atualizar seu status
      const channelAtual = pendingChannels.find((c) => c.id === channelId);
      if (!channelAtual) {
        console.warn(
          'Canal não encontrado na lista de pendentes, operação cancelada'
        );
        setIsLoading(false);
        return;
      }

      // Conecta ao canal do WebSocket se ainda não estiver conectado - fazemos isso antes de alterar status
      const sessionIdToConnect = channel.sessionId;
      if (!connectedChannels.includes(sessionIdToConnect)) {
        console.log('Conectando ao canal WebSocket:', sessionIdToConnect);
        connectToChannel(sessionIdToConnect);
      } else {
        console.log('Canal WebSocket já conectado:', sessionIdToConnect);
      }

      // Primeiro atualiza o status do canal - isso move o canal para ativos
      console.log(
        'Atualizando status do canal para em_atendimento:',
        channelId
      );
      updateChannelStatus(channelId, 'em_atendimento');

      // Envia uma mensagem de sistema informando que o atendente entrou
      console.log('Adicionando mensagem de sistema para novo atendente');
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

      // Conecta ao canal do WebSocket se ainda não estiver conectado
      if (!connectedChannels.includes(channel.sessionId)) {
        connectToChannel(channel.sessionId);
        console.log('Conectado ao canal WebSocket:', channel.sessionId);
      } else {
        console.log('Canal WebSocket já conectado:', channel.sessionId);
      }

      // Seleciona o canal automaticamente usando setTimeout para evitar ciclos
      setTimeout(() => {
        setCurrentChannel(channel.id);
        console.log('Canal selecionado:', channel.id);
      }, 100);
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
  };
  // Função para enviar mensagem
  const handleSendMessage = (channelId: string, message: string) => {
    if (!channelId || !message.trim()) return;

    console.log('Enviando mensagem para o canal:', channelId);

    // Buscamos o canal de forma mais robusta, em canais ativos ou pendentes
    const targetChannel = [...activeChannels, ...pendingChannels].find(
      (ch) => ch.sessionId === channelId || ch.id === channelId
    );

    if (targetChannel) {
      console.log(
        'Canal encontrado para enviar mensagem:',
        targetChannel.id,
        'sessionId:',
        targetChannel.sessionId
      );

      // Adicionamos a mensagem localmente primeiro para atualização imediata da UI
      addMessageToChannel(targetChannel.id, {
        mensagem: message,
        sender: 'ATENDENTE',
        nome: user?.firstName || 'Atendente',
        timestamp: new Date(),
      });

      // Verificamos se estamos conectados ao WebSocket para este canal
      if (!connectedChannels.includes(targetChannel.sessionId)) {
        console.log(
          'Conectando ao canal WebSocket antes de enviar mensagem:',
          targetChannel.sessionId
        );
        connectToChannel(targetChannel.sessionId);
      }

      // Garantir que o canal esteja como em atendimento antes de enviar mensagem
      if (targetChannel.status !== 'em_atendimento') {
        console.log(
          'Atualizando status do canal para em_atendimento antes de enviar mensagem'
        );
        updateChannelStatus(targetChannel.id, 'em_atendimento');
      }

      // Em seguida, enviamos a mensagem pelo socket
      console.log(
        'Enviando mensagem via socket para sessão:',
        targetChannel.sessionId
      );
      actions.enviarMensagem({
        sessao_id: targetChannel.sessionId,
        mensagem: message,
        sender: 'ATENDENTE',
      });
    } else {
      console.error('Canal não encontrado para enviar mensagem:', channelId);
      console.log(
        'Canais disponíveis:',
        [...activeChannels, ...pendingChannels].map((ch) => ({
          id: ch.id,
          sessionId: ch.sessionId,
        }))
      );
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
