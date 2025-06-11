'use client';

import { useState, useEffect, useRef } from 'react';
import { useActiveChannels } from '@/hooks/useActiveChannels';
import {
  useWebSocket,
  useChatEvents,
  useChatActions,
  ChatMessage,
} from '@/hooks/useWebSocket';
import { useAuth } from '@/providers/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { ChatWindow } from '@/components/ChatWindow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cross2Icon, SquareIcon, PlusIcon } from '@radix-ui/react-icons';

// Interface para os dados retornados pelo backend
interface Protocolo {
  id: string;
  numero: string;
  status: string; // "ABERTO", "EM_ATENDIMENTO", etc
  assunto?: string;
  sessao_id?: string; // ID da sessão de atendimento
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

  const { socket } = useWebSocket();
  const actions = useChatActions(socket);
  const { user } = useAuth(); // Estado para controlar carregamento
  const [isLoading, setIsLoading] = useState(false);
  // Ref para armazenar os IDs de canais que já tiveram histórico solicitado
  const loadedHistoryChannelsRef = useRef<Set<string>>(new Set());
  // Ref para rastrear protocolos já processados
  const processedProtocolsRef = useRef<Set<string>>(new Set());
  // Cache de canais - evita ficar chamando activeChannels.find() repetidamente
  const channelCacheRef = useRef<Record<string, boolean>>({});
  // Variáveis para mapear o status e transformar protocolo em canal
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

  // Função para converter protocolo para o formato de canal - definida fora do useEffect
  const mapProtocoloToChannel = (protocolo: Protocolo) => {
    // Obtém a última mensagem do protocolo, se disponível
    const ultimaMensagem =
      protocolo.mensagens_protocolo && protocolo.mensagens_protocolo.length > 0
        ? protocolo.mensagens_protocolo[
            protocolo.mensagens_protocolo.length - 1
          ].conteudo
        : protocolo.assunto || 'Novo atendimento';

    // Converte as mensagens do protocolo para o formato de mensagens do chat
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
      // Adicionando as mensagens históricas do protocolo
      messages: mensagensChat,
      studentInfo: protocolo.estudante
        ? {
            name: protocolo.estudante.nome,
            id: protocolo.estudante.id,
            course: protocolo.estudante.curso,
            contactInfo: protocolo.estudante.telefone,
          }
        : undefined,
    };
  };

  // Efeito para carregar os atendimentos do backend
  useEffect(() => {
    if (!socket) return;

    setIsLoading(true);

    // Handler para o evento 'atendimentosAbertos'
    const handleAtendimentosAbertos = (protocolos: Protocolo[]) => {
      console.log(protocolos);

      // Usar um pequeno atraso para garantir que estamos fora do ciclo de renderização
      setTimeout(() => {
        // Processar apenas protocolos que não foram processados antes
        const novosProtocolos = protocolos.filter((protocolo) => {
          if (processedProtocolsRef.current.has(protocolo.id)) return false;
          processedProtocolsRef.current.add(protocolo.id);
          return true;
        });

        if (novosProtocolos.length === 0) {
          setIsLoading(false);
          return;
        }

        // Processar em batch para evitar múltiplas atualizações
        const canaisParaAdicionar = novosProtocolos.map(mapProtocoloToChannel);

        // Usar um batch para adicionar todos os canais de uma vez
        canaisParaAdicionar.forEach((channel) => {
          // Usa channelCacheRef em vez de verificar os arrays activeChannels e pendingChannels diretamente
          if (!channelCacheRef.current[channel.id]) {
            addChannel(channel);
            channelCacheRef.current[channel.id] = true;
          }
        });

        setIsLoading(false);
      }, 100); // Delay maior para garantir que outros processos já terminaram
    };

    // Limpar listener anterior se existir
    socket.off('atendimentosAbertos', handleAtendimentosAbertos);

    // Registrar novo listener
    socket.on('atendimentosAbertos', handleAtendimentosAbertos);

    // Solicitar a lista de atendimentos
    actions.listarAtendimentos();

    // Cleanup quando o componente for desmontado
    return () => {
      socket.off('atendimentosAbertos', handleAtendimentosAbertos);
    };
  }, [socket]); // Removidas as dependências problemáticas para evitar loops

  // Função para atender um chamado pendente
  const handleAttendChannel = (channelId: string) => {
    setIsLoading(true);

    const channel = pendingChannels.find((c) => c.id === channelId);

    if (!channel) {
      setIsLoading(false);
      return;
    }

    console.log('Atendendo canal:', channel);

    // Mostra que estamos atendendo o canal, mantendo todas as mensagens existentes
    updateChannelStatus(channelId, 'em_atendimento');

    // Entra no atendimento usando as informações do usuário logado
    actions.entrarAtendimento({
      // @ts-ignore
      sessao_id: channel?.sessionId, // Este é o ID do protocolo no backend
      nome: user?.firstName || 'Atendente',
      setor: user?.departamento || 'Geral',
      atendenteId: user?.atendenteId || 'unknown',
    });

    setIsLoading(false);
  };

  // Função para encerrar um atendimento
  const handleCloseChannel = (channelId: string) => {
    if (window.confirm('Deseja realmente encerrar este atendimento?')) {
      // Comunica ao backend que o atendimento foi encerrado
      actions.encerrarAtendimento({ sessao_id: channelId });

      // Remove o canal da interface
      removeChannel(channelId);
    }
  };

  // Função para enviar uma mensagem
  const handleSendMessage = (channelId: string, message: string) => {
    if (!channelId || !message.trim()) return;

    // Enviar a mensagem para o protocolo no backend
    actions.enviarMensagem({
      sessao_id: channelId, // O ID do canal é o ID do protocolo
      mensagem: message,
      sender: 'atendente',
    });

    console.log(`Mensagem enviada para o protocolo ${channelId}: ${message}`);
  };
  // Efeito separado apenas para marcar como lido quando um canal é selecionado
  useEffect(() => {
    if (!currentChannelId) return;

    // Marcar mensagens como lidas ao selecionar o canal
    // Usamos setTimeout para quebrar o ciclo de renderização
    setTimeout(() => {
      markChannelAsRead(currentChannelId);
    }, 0);
  }, [currentChannelId]); // Removida dependência de markChannelAsRead
  // Efeito separado para configurar os listeners de eventos
  useEffect(() => {
    if (!socket) return;

    // Handler para novas mensagens
    const handleNovaMensagem = (msg: {
      sessao_id?: string;
      protocolo_id?: string;
      mensagem: string;
      sender: 'USUARIO' | 'ATENDENTE' | 'SISTEMA';
      nome?: string;
      setor?: string;
      mediaUrl?: string;
      mediaType?: 'image' | 'document' | 'video' | 'audio';
      fileName?: string;
    }) => {
      console.log('Nova mensagem recebida:', msg);

      // Identificar o canal correto para adicionar a mensagem
      const targetChannelId = msg.protocolo_id || msg.sessao_id;

      if (targetChannelId) {
        // Usar timeout para evitar atualizar o estado durante uma renderização
        setTimeout(() => {
          // Adicionar a mensagem ao canal correspondente
          addMessageToChannel(targetChannelId, {
            mensagem: msg.mensagem,
            sender: msg.sender,
            // Certifique-se que os campos opcionais estão sendo passados corretamente
            ...(msg.mediaUrl && { mediaUrl: msg.mediaUrl }),
            ...(msg.mediaType && { mediaType: msg.mediaType }),
            ...(msg.fileName && { fileName: msg.fileName }),
          });
        }, 10);
      }
    };

    // Configurar evento de novas mensagens manualmente
    socket.off('novaMensagem', handleNovaMensagem);
    socket.on('novaMensagem', handleNovaMensagem);

    // Limpar listeners quando o componente for desmontado
    return () => {
      socket.off('novaMensagem', handleNovaMensagem);
    };
  }, [socket]); // Removida dependência de addMessageToChannel para evitar loops

  return (
    <div className='h-full flex flex-col'>
      <div className='flex items-center justify-between p-4 border-b'>
        <h1 className='text-xl font-bold'>Central de Atendimento</h1>
        <div className='flex items-center gap-2'>
          {pendingChannels.length > 0 && (
            <Badge variant='destructive' className='px-2 py-1'>
              {pendingChannels.length} chamados pendentes
            </Badge>
          )}
        </div>
      </div>

      <div className='flex gap-4 h-full p-4'>
        {/* Painel de chamados pendentes */}
        <Card className='w-80 h-full overflow-hidden'>
          <CardHeader className='px-4 py-3 border-b'>
            <h2 className='text-lg font-medium'>Chamados Pendentes</h2>
          </CardHeader>
          <CardContent
            className='p-0 overflow-y-auto'
            style={{ maxHeight: 'calc(100% - 53px)' }}>
            {pendingChannels.length === 0 ? (
              <div className='p-4 text-center text-gray-500'>
                Não há chamados pendentes
              </div>
            ) : (
              <ul className='divide-y'>
                {pendingChannels.map((channel) => (
                  <li key={channel.id} className='p-3 hover:bg-gray-50'>
                    <div className='mb-1 font-medium flex items-center justify-between'>
                      <span>{channel.name}</span>
                      <Badge variant='outline' className='text-xs'>
                        {formatTime(channel.lastMessageTime)}
                      </Badge>
                    </div>
                    <p className='text-sm text-gray-600 truncate mb-2'>
                      {channel.lastMessage}
                    </p>
                    <div className='flex justify-between items-center mt-1'>
                      <span className='text-xs text-gray-500'>
                        {channel.studentInfo?.course}
                      </span>
                      <Button
                        size='sm'
                        onClick={() => handleAttendChannel(channel.id)}
                        disabled={isLoading}>
                        Atender
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Painel de atendimento com abas */}
        <div className='flex-1 flex flex-col h-full'>
          {activeChannels.length === 0 ? (
            <div className='flex items-center justify-center h-full'>
              <div className='text-center text-gray-500'>
                <SquareIcon className='mx-auto h-12 w-12 text-gray-400' />
                <h3 className='mt-2 text-lg font-medium'>
                  Nenhum atendimento ativo
                </h3>
                <p className='mt-1'>
                  Selecione um chamado pendente para iniciar o atendimento
                </p>
              </div>
            </div>
          ) : (
            <Tabs
              value={currentChannelId || undefined}
              onValueChange={setCurrentChannel}
              className='h-full flex flex-col'>
              <div className='border-b'>
                <TabsList className='h-10'>
                  {activeChannels.map((channel) => (
                    <TabsTrigger
                      key={channel.id}
                      value={channel.id}
                      className='flex items-center gap-2 pr-1'>
                      <span>
                        {channel.name}
                        {channel.unreadCount > 0 && (
                          <Badge
                            variant='destructive'
                            className='ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full'>
                            {channel.unreadCount}
                          </Badge>
                        )}
                      </span>
                      <button
                        className='ml-1 p-1 rounded-full hover:bg-gray-200 text-gray-500'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseChannel(channel.sessionId);
                        }}>
                        <Cross2Icon className='h-3 w-3' />
                      </button>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {activeChannels.map((channel) => (
                <TabsContent
                  key={channel.id}
                  value={channel.id}
                  className='flex-1 p-0 m-0 h-[calc(100%-40px)]'>
                  <div className='h-full'>
                    <ChatWindow
                      messages={channel.messages}
                      onSendMessage={(msg) =>
                        handleSendMessage(channel.sessionId, msg)
                      }
                      isConnected={true}
                      title={`Atendimento - ${channel.name}`}
                      placeholder='Digite sua mensagem...'
                      loading={isLoading}
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}

// Função auxiliar para formatar tempo
function formatTime(date?: Date) {
  if (!date) return '';

  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Se for menos de 1 minuto
  if (diff < 60 * 1000) {
    return 'agora';
  }

  // Se for menos de 1 hora
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes}m atrás`;
  }

  // Se for menos de 24 horas
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}h atrás`;
  }

  // Caso contrário, exibe a data
  return date.toLocaleDateString();
}
