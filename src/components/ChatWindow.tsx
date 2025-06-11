'use client';

import { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '@/hooks/useWebSocket';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Send,
  User,
  Bot,
  Phone,
  Mail,
  GraduationCap,
  Clock,
  Download,
  FileText,
  Loader2,
} from 'lucide-react';

interface StudentInfo {
  name: string;
  id: string;
  course: string;
  contactInfo: string;
  email?: string;
}

interface ChatWindowProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isConnected: boolean;
  title?: string;
  studentInfo?: StudentInfo;
  placeholder?: string;
  loading?: boolean;
}

export function ChatWindow({
  messages,
  onSendMessage,
  isConnected,
  title = 'Chat',
  studentInfo,
  placeholder = 'Digite sua mensagem...',
  loading = false,
}: ChatWindowProps) {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      const scrollContainer = messagesEndRef.current.closest(
        '[data-radix-scroll-area-viewport]'
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !isConnected) return;
    onSendMessage(messageText);
    setMessageText('');
  };

  const renderMessage = (msg: ChatMessage, index: number) => {
    const isSystemMessage = msg.sender === 'SISTEMA';
    const isUser = msg.sender === 'USUARIO';
    const isAttendant = msg.sender === 'ATENDENTE';

    if (isSystemMessage) {
      return (
        <div key={index} className='flex justify-center my-4'>
          <div className='bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs italic'>
            {msg.mensagem}
          </div>
        </div>
      );
    }

    return (
      <div
        key={index}
        className={`flex mb-4 ${isUser ? 'justify-start' : 'justify-end'}`}>
        <div
          className={`flex max-w-[80%] ${
            isUser ? 'flex-row' : 'flex-row-reverse'
          }`}>
          <div className={`flex-shrink-0 ${isUser ? 'mr-3' : 'ml-3'}`}>
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center ${
                isUser ? 'bg-blue-500' : 'bg-green-500'
              }`}>
              {isUser ? (
                <User className='h-4 w-4 text-white' />
              ) : (
                <Bot className='h-4 w-4 text-white' />
              )}
            </div>
          </div>

          <div
            className={`flex flex-col ${isUser ? 'items-start' : 'items-end'}`}>
            <div className='flex items-center space-x-2 mb-1'>
              <span className='text-xs font-medium text-slate-600'>
                {isUser
                  ? studentInfo?.name || 'Estudante'
                  : msg.nome || 'Atendente'}
              </span>
              <span className='text-xs text-slate-400'>
                {msg.timestamp
                  ? new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : ''}
              </span>
            </div>

            <div
              className={`rounded-lg px-4 py-2 ${
                isUser
                  ? 'bg-blue-50 text-blue-900 border border-blue-200'
                  : 'bg-green-50 text-green-900 border border-green-200'
              }`}>
              <p className='text-sm whitespace-pre-wrap'>{msg.mensagem}</p>

              {msg.mediaUrl && (
                <div className='mt-2'>
                  {msg.mediaType === 'image' ? (
                    <div className='relative'>
                      <img
                        src={msg.mediaUrl || '/placeholder.svg'}
                        alt={msg.fileName || 'Imagem'}
                        className='max-w-full h-auto rounded-md border'
                      />
                    </div>
                  ) : (
                    <div className='flex items-center space-x-2 p-2 bg-white rounded border'>
                      <FileText className='h-4 w-4 text-slate-500' />
                      <span className='text-sm text-slate-700 flex-1 truncate'>
                        {msg.fileName || 'Anexo'}
                      </span>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='h-6 w-6 p-0'
                        onClick={() => window.open(msg.mediaUrl, '_blank')}>
                        <Download className='h-3 w-3' />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  return (
    <div className='h-full flex flex-col max-h-[calc(100vh-225px)]'>
      {/* Header com informações do estudante */}
      {studentInfo && (
        <div className='border-b bg-slate-50/50 p-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              <div className='h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center'>
                <User className='h-5 w-5 text-white' />
              </div>
              <div>
                <h3 className='font-semibold text-slate-900'>
                  {studentInfo.name}
                </h3>
                <p className='text-sm text-slate-500'>ID: {studentInfo.id}</p>
              </div>
            </div>

            <div className='flex items-center space-x-1'>
              <div
                className={`h-2 w-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className='text-xs text-slate-500'>
                {isConnected ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          <div className='mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs'>
            <div className='flex items-center space-x-1 text-slate-600'>
              <GraduationCap className='h-3 w-3' />
              <span className='truncate'>{studentInfo.course}</span>
            </div>
            <div className='flex items-center space-x-1 text-slate-600'>
              <Phone className='h-3 w-3' />
              <span>{studentInfo.contactInfo}</span>
            </div>
            {studentInfo.email && (
              <div className='flex items-center space-x-1 text-slate-600'>
                <Mail className='h-3 w-3' />
                <span className='truncate'>{studentInfo.email}</span>
              </div>
            )}
          </div>
        </div>
      )}{' '}
      {/* Área de mensagens */}
      <div className='flex-1 relative min-h-0'>
        <ScrollArea className='h-full max-h-[calc(100vh-340px)]'>
          <div className='p-4 min-h-full'>
            {loading ? (
              <div className='flex justify-center items-center h-32'>
                <Loader2 className='h-6 w-6 animate-spin text-slate-400' />
                <span className='ml-2 text-sm text-slate-500'>
                  Carregando mensagens...
                </span>
              </div>
            ) : messages.length === 0 ? (
              <div className='flex flex-col items-center justify-center h-32 text-center'>
                <div className='h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3'>
                  <Bot className='h-6 w-6 text-slate-400' />
                </div>
                <p className='text-slate-600 font-medium'>
                  Nenhuma mensagem ainda
                </p>
                <p className='text-sm text-slate-400 mt-1'>
                  {isConnected
                    ? 'Comece uma conversa!'
                    : 'Aguardando conexão...'}
                </p>
              </div>
            ) : (
              <div className='space-y-4'>
                {messages.map(renderMessage)}
                <div ref={messagesEndRef} className='h-1' />
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      {/* Input de mensagem */}
      <div className='border-t bg-white p-4'>
        <div className='flex space-x-2'>
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={placeholder}
            disabled={!isConnected || loading}
            className='flex-1'
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!isConnected || !messageText.trim() || loading}
            className='px-4'>
            {loading ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Send className='h-4 w-4' />
            )}
          </Button>
        </div>

        {!isConnected && (
          <div className='flex items-center justify-center mt-2 text-xs text-amber-600'>
            <Clock className='h-3 w-3 mr-1' />
            Reconectando...
          </div>
        )}
      </div>
    </div>
  );
}
