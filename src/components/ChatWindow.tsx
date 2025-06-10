'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/hooks/useWebSocket';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

interface ChatWindowProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isConnected: boolean;
  title?: string;
  placeholder?: string;
  loading?: boolean;
}

export function ChatWindow({
  messages,
  onSendMessage,
  isConnected,
  title = 'Chat',
  placeholder = 'Digite sua mensagem...',
  loading = false,
}: ChatWindowProps) {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !isConnected) return;

    onSendMessage(messageText);
    setMessageText('');
  };

  // Função para renderizar diferentes tipos de mensagens
  const renderMessage = (msg: ChatMessage, index: number) => {
    // Detecta se é mensagem do sistema
    const isSystemMessage = msg.sender === 'sistema';

    // Determina estilo baseado no remetente
    const isUser = msg.sender === 'usuario';
    const bgColor = isSystemMessage
      ? 'bg-gray-100 text-gray-700'
      : isUser
      ? 'bg-blue-100 text-blue-900'
      : 'bg-green-100 text-green-900';

    const alignment = isSystemMessage
      ? 'mx-auto text-center italic max-w-xs'
      : isUser
      ? 'ml-auto'
      : 'mr-auto';

    return (
      <div key={index} className={`mb-3 max-w-[75%] ${alignment}`}>
        {!isSystemMessage && (
          <div className='flex items-center gap-2 mb-1'>
            <div
              className={`h-6 w-6 rounded-full flex items-center justify-center ${
                isUser ? 'bg-blue-500' : 'bg-green-500'
              } text-white`}>
              {isUser ? 'U' : 'A'}
            </div>
            <span className='text-xs font-medium'>
              {isUser ? msg.nome || 'Você' : msg.nome || 'Atendente'}
            </span>
          </div>
        )}

        <div className={`p-3 rounded-lg ${bgColor}`}>
          {msg.mensagem}

          {/* Renderiza mídia se existir */}
          {msg.mediaUrl && (
            <div className='mt-2'>
              {msg.mediaType === 'image' ? (
                <img
                  src={msg.mediaUrl}
                  alt={msg.fileName || 'Imagem'}
                  className='max-w-full rounded-md'
                />
              ) : (
                <a
                  href={msg.mediaUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center gap-2 text-blue-600 hover:underline'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='16'
                    height='16'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'>
                    <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'></path>
                    <polyline points='7 10 12 15 17 10'></polyline>
                    <line x1='12' y1='15' x2='12' y2='3'></line>
                  </svg>
                  {msg.fileName || 'Anexo'}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className='w-full h-full flex flex-col'>
      <CardHeader className='py-3 px-4 border-b'>
        <div className='flex justify-between items-center'>
          <div className='font-semibold'>{title}</div>
          <div className='flex items-center'>
            <span
              className={`w-2 h-2 rounded-full mr-2 ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></span>
            <span className='text-sm'>
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className='flex-grow p-0 relative'>
        <div className='p-4 h-full overflow-y-auto max-h-[400px]'>
          {loading ? (
            <div className='flex justify-center items-center h-full'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900'></div>
            </div>
          ) : messages.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-full text-gray-400'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='48'
                height='48'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1'
                strokeLinecap='round'
                strokeLinejoin='round'>
                <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'></path>
              </svg>
              <p className='mt-2'>Nenhuma mensagem para exibir</p>
              {isConnected && <p className='text-sm'>Comece uma conversa!</p>}
            </div>
          ) : (
            <div className='py-2'>
              {messages.map(renderMessage)}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className='p-2 border-t'>
        <div className='flex w-full gap-2'>
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={placeholder}
            disabled={!isConnected || loading}
            className='flex-grow'
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!isConnected || !messageText.trim() || loading}>
            Enviar
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
