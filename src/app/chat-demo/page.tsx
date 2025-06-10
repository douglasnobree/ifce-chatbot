'use client';

import { useState, useEffect } from 'react';
import {
  useWebSocket,
  useChatEvents,
  useChatActions,
  ChatMessage,
} from '@/hooks/useWebSocket';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/providers/AuthProvider';
import { UserMenu } from '@/components/UserMenu';
import { ChatWindow } from '@/components/ChatWindow';
import { ConnectionStatus } from '@/components/ConnectionStatus';

export default function ChatDemo() {
  const { user } = useAuth();
  const websocketContext = useWebSocket();
  const {
    socket,
    connectToChannel,
    disconnectFromChannel,
    connectedChannels,
    isConnecting,
    sendMessage,
  } = websocketContext;

  const [channelId, setChannelId] = useState<string>('demo-channel');
  const [connected, setConnected] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState<string>('');
  const [connectionStatus, setConnectionStatus] =
    useState<string>('Desconectado');
  // Obter ações de chat a partir do hook
  const actions = useChatActions(socket);

  // Efeito para monitorar o estado da conexão do socket
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log('Socket conectado:', socket.id);
      setConnectionStatus(`Socket conectado: ${socket.id}`);
    };

    const handleDisconnect = (reason: string) => {
      console.log('Socket desconectado:', reason);
      setConnectionStatus(`Socket desconectado: ${reason}`);
      setConnected(false);
    };

    const handleConnectError = (error: Error) => {
      console.error('Erro de conexão:', error);
      setConnectionStatus(`Erro: ${error.message}`);
      setConnected(false);
    };

    // Registrar eventos do socket
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    return () => {
      // Limpar eventos ao desmontar
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
    };
  }, [socket]);

  // Configurar eventos de chat
  useChatEvents(socket, channelId, {
    onNovaMensagem: (msg: ChatMessage) => {
      console.log('Nova mensagem recebida:', msg);
      setMessages((prev) => [...prev, msg]);
    },
    onNovoArquivo: (file: ChatMessage) => {
      console.log('Novo arquivo recebido:', file);
      setMessages((prev) => [
        ...prev,
        {
          ...file,
          mensagem: `Arquivo recebido: ${file.fileName || 'sem nome'}`,
        },
      ]);
    },
    onAtendenteEntrou: (data) => {
      console.log('Atendente entrou:', data);
      setConnectionStatus(`Conectado: Atendente ${data.nome} entrou`);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'sistema',
          mensagem: `Atendente ${data.nome} entrou na conversa`,
        },
      ]);
    },
    onAtendimentoEncerrado: (data) => {
      console.log('Atendimento encerrado:', data);
      setConnectionStatus('Desconectado: Atendimento encerrado');
      setConnected(false);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'sistema',
          mensagem: `Atendimento encerrado pelo atendente`,
        },
      ]);
    },
  });
  // Função para conectar ao canal
  const handleConnect = () => {
    if (!channelId) return;

    connectToChannel(channelId);
    setConnected(true);
    setConnectionStatus('Conectando...');

    // Adicionar mensagem de sistema
    setMessages((prev) => [
      ...prev,
      {
        sender: 'sistema',
        mensagem: `Iniciando conexão com o canal: ${channelId}...`,
      },
    ]);

    // Simular processo de conexão com sucesso após 1.5 segundos
    setTimeout(() => {
      setConnectionStatus(`Conectado ao canal ${channelId}`);

      // Mensagem de boas-vindas
      setMessages((prev) => [
        ...prev,
        {
          sender: 'sistema',
          mensagem: `Conexão estabelecida com sucesso!`,
        },
        {
          sender: 'atendente',
          mensagem:
            'Olá! Bem-vindo ao canal de demonstração do WebSocket. Como posso ajudar?',
          nome: 'Atendente Virtual',
        },
      ]);
    }, 1500);
  };

  // Função para desconectar do canal
  const handleDisconnect = () => {
    if (!channelId) return;

    setConnectionStatus('Encerrando conexão...');

    // Adicionar mensagem de sistema
    setMessages((prev) => [
      ...prev,
      {
        sender: 'sistema',
        mensagem: `Desconectando do canal: ${channelId}...`,
      },
    ]);

    // Simular processo de desconexão após 1 segundo
    setTimeout(() => {
      disconnectFromChannel(channelId);
      setConnected(false);
      setConnectionStatus('Desconectado');

      setMessages((prev) => [
        ...prev,
        {
          sender: 'sistema',
          mensagem: `Você foi desconectado do canal: ${channelId}`,
        },
      ]);
    }, 1000);
  };
  // Função para enviar mensagem
  const handleSendMessage = () => {
    if (!messageText.trim() || !connected) return;

    actions.enviarMensagem({
      sessao_id: channelId,
      mensagem: messageText,
      sender: 'usuario',
    });

    // Adicionar mensagem à lista local
    const newMessage: ChatMessage = {
      sender: 'usuario',
      mensagem: messageText,
      nome: user?.name || 'Usuário',
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessageText('');

    // Simula uma resposta do atendente após 2 segundos
    if (connected) {
      setTimeout(() => {
        const resposta: ChatMessage = {
          sender: 'atendente',
          mensagem: `Resposta automática: sua mensagem "${messageText}" foi recebida no canal ${channelId}`,
          nome: 'Bot de Simulação',
        };
        setMessages((prev) => [...prev, resposta]);
      }, 2000);
    }
  };
  return (
    <ProtectedRoute>
      <div className='flex flex-col min-h-screen'>
        <header className='w-full p-4 border-b flex justify-between items-center'>
          <h1 className='text-xl font-bold'>Chat WebSocket Demo</h1>
          <UserMenu />
        </header>

        <main className='flex-1 p-6'>
          <div className='max-w-4xl mx-auto'>
            {/* Painel de conexão */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
              <div className='col-span-2'>
                <Card className='p-4 h-full'>
                  <h2 className='text-lg font-medium mb-4'>
                    Configuração do Canal
                  </h2>
                  <div className='flex flex-col gap-4'>
                    <div>
                      <Input
                        value={channelId}
                        onChange={(e) => setChannelId(e.target.value)}
                        placeholder='ID do canal (ex: cliente-123)'
                        disabled={connected}
                      />
                    </div>
                    <div className='flex gap-2'>
                      <Button
                        onClick={handleConnect}
                        disabled={!channelId || connected}
                        variant='default'
                        className='flex-1'>
                        Conectar
                      </Button>
                      <Button
                        onClick={handleDisconnect}
                        disabled={!connected}
                        variant='destructive'
                        className='flex-1'>
                        Desconectar
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
              <div className='col-span-1'>
                <ConnectionStatus
                  websocket={websocketContext}
                  channelId={channelId}
                  connected={connected}
                  statusMessage={connectionStatus}
                />
              </div>
            </div>

            {/* Área de mensagens usando o componente ChatWindow */}
            <div className='mb-6 h-[500px]'>
              <ChatWindow
                messages={messages}
                onSendMessage={(msg) => {
                  if (connected) {
                    actions.enviarMensagem({
                      sessao_id: channelId,
                      mensagem: msg,
                      sender: 'usuario',
                    });

                    // Feedback local imediato
                    const newMessage: ChatMessage = {
                      sender: 'usuario',
                      mensagem: msg,
                      nome: user?.name || 'Você',
                    };

                    setMessages((prev) => [...prev, newMessage]);
                  }
                }}
                isConnected={connected}
                title={`Chat - Canal: ${channelId || 'Nenhum'}`}
                placeholder='Digite sua mensagem e pressione Enter...'
                loading={false}
              />
            </div>
            {/* Painel de testes */}
            <Card className='p-4 mb-6'>
              <h2 className='text-lg font-medium mb-4'>Ações de Teste</h2>
              <div className='flex gap-2 flex-wrap'>
                <Button
                  variant='outline'
                  onClick={() => {
                    if (connected) {
                      setMessages((prev) => [
                        ...prev,
                        {
                          sender: 'sistema',
                          mensagem: 'Simulando recebimento de mensagem...',
                        },
                      ]);

                      setTimeout(() => {
                        setMessages((prev) => [
                          ...prev,
                          {
                            sender: 'atendente',
                            mensagem:
                              'Esta é uma mensagem simulada do atendente',
                            nome: 'Atendente Simulado',
                          },
                        ]);
                      }, 1000);
                    }
                  }}
                  disabled={!connected}>
                  Simular recebimento de mensagem
                </Button>

                <Button
                  variant='outline'
                  onClick={() => {
                    if (connected) {
                      setMessages((prev) => [
                        ...prev,
                        {
                          sender: 'sistema',
                          mensagem: 'Simulando recebimento de arquivo...',
                        },
                      ]);

                      setTimeout(() => {
                        setMessages((prev) => [
                          ...prev,
                          {
                            sender: 'atendente',
                            mensagem:
                              'Veja este documento que estou compartilhando',
                            nome: 'Atendente Simulado',
                            mediaUrl:
                              'https://example.com/arquivo-simulado.pdf',
                            mediaType: 'document',
                            fileName: 'documento-simulado.pdf',
                          },
                        ]);
                      }, 1500);
                    }
                  }}
                  disabled={!connected}>
                  Simular recebimento de arquivo
                </Button>

                <Button
                  variant='outline'
                  onClick={() => {
                    if (connected) {
                      setMessages((prev) => [
                        ...prev,
                        {
                          sender: 'sistema',
                          mensagem: 'Simulando entrada de novo atendente...',
                        },
                      ]);

                      setTimeout(() => {
                        setMessages((prev) => [
                          ...prev,
                          {
                            sender: 'sistema',
                            mensagem:
                              'Atendente Maria Silva entrou na conversa',
                          },
                        ]);

                        setTimeout(() => {
                          setMessages((prev) => [
                            ...prev,
                            {
                              sender: 'atendente',
                              mensagem:
                                'Olá! Sou a Maria e vou continuar seu atendimento.',
                              nome: 'Maria Silva',
                            },
                          ]);
                        }, 1000);
                      }, 1000);
                    }
                  }}
                  disabled={!connected}>
                  Simular troca de atendente
                </Button>
              </div>
            </Card>

            {/* Informações adicionais do usuário */}
            <Card className='p-4'>
              <h2 className='text-lg font-medium mb-2'>
                Informações do Usuário
              </h2>
              <div className='text-sm space-y-1'>
                <p>
                  Nome: {user?.firstName || 'Não disponível'}{' '}
                  {user?.lastName || ''}
                </p>
                <p>Email: {user?.email || 'Não disponível'}</p>
                <p>ID: {user?.atendenteId || 'Não disponível'}</p>
                <p>Departamento: {user?.departamento || 'Não disponível'}</p>
              </div>
            </Card>
          </div>
        </main>

        <footer className='p-4 border-t text-center text-sm text-gray-500'>
          Demo WebSocket para integração com WhatsApp
        </footer>
      </div>
    </ProtectedRoute>
  );
}
