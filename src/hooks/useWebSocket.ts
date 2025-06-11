'use client';

import { useContext, useEffect } from 'react';
import { WebSocketContext } from '../providers/WebSocketProvider';
import { Socket } from 'socket.io-client';
import { ChatService } from '@/services/chat.service';
export { useAuth } from '../hooks/useAuth';

// Tipos para integração com backend
export type ChatMessage = {
  sender: 'USUARIO' | 'ATENDENTE' | 'SISTEMA'; // Adicionado 'sistema' para mensagens do sistema
  nome?: string;
  setor?: string;
  mensagem: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'document' | 'video' | 'audio';
  fileName?: string;
};

export type AtendimentoSession = {
  usuario?: string;
  atendente?: string;
  setor?: string;
  nomeAtendente?: string;
  protocoloId?: string;
  estudanteId?: string;
  atendenteId?: string;
  sessionDBId?: string;
  whatsappUserId?: string;
};

// Hook principal para consumir contexto e eventos do socket
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context)
    throw new Error('useWebSocket deve ser usado dentro de WebSocketProvider');
  return context;
}

// Hook para eventos de mensagens do chat (novaMensagem, novoArquivo, etc)
export function useChatEvents(
  socket: Socket | null,
  sessionId: string,
  {
    onNovaMensagem,
    onNovoArquivo,
    onAtendenteEntrou,
    onAtendimentoEncerrado,
    onAguardando,
    onAtendimentosAbertos,
  }: {
    onNovaMensagem?: (msg: ChatMessage) => void;
    onNovoArquivo?: (file: ChatMessage) => void;
    onAtendenteEntrou?: (data: any) => void;
    onAtendimentoEncerrado?: (data: any) => void;
    onAguardando?: (data: any) => void;
    onAtendimentosAbertos?: (data: any) => void;
  }
) {
  useEffect(() => {
    if (!socket || !sessionId) return;

    // Limpeza para evitar duplicações de eventos
    const cleanupListeners = () => {
      if (onNovaMensagem) socket.off('novaMensagem', onNovaMensagem);
      if (onNovoArquivo) socket.off('novoArquivo', onNovoArquivo);
      if (onAtendenteEntrou) socket.off('atendenteEntrou', onAtendenteEntrou);
      if (onAtendimentoEncerrado)
        socket.off('atendimentoEncerrado', onAtendimentoEncerrado);
      if (onAguardando) socket.off('atendimentoAguardando', onAguardando);
      if (onAtendimentosAbertos)
        socket.off('atendimentosAbertos', onAtendimentosAbertos);
    };

    // Limpar listeners existentes primeiro
    cleanupListeners();

    // Registrar novos listeners
    if (onNovaMensagem) socket.on('novaMensagem', onNovaMensagem);
    if (onNovoArquivo) socket.on('novoArquivo', onNovoArquivo);
    if (onAtendenteEntrou) socket.on('atendenteEntrou', onAtendenteEntrou);
    if (onAtendimentoEncerrado)
      socket.on('atendimentoEncerrado', onAtendimentoEncerrado);
    if (onAguardando) socket.on('atendimentoAguardando', onAguardando);
    if (onAtendimentosAbertos)
      socket.on('atendimentosAbertos', onAtendimentosAbertos);

    return () => {
      cleanupListeners();
    };
  }, [
    socket,
    sessionId,
    onNovaMensagem,
    onNovoArquivo,
    onAtendenteEntrou,
    onAtendimentoEncerrado,
    onAguardando,
    onAtendimentosAbertos,
  ]);
}

// Hook para ações do chat (emitir eventos para o backend)
export function useChatActions(socket: Socket | null) {
  // Iniciar atendimento
  const iniciarAtendimento = async (data: {
    sessao_id: string;
    setor: string;
    estudanteId?: string;
    sessionDBId?: string;
  }) => {
    if (!socket) return false;

    try {
      socket.emit('iniciarAtendimento', data);
      return true;
    } catch (error) {
      console.error('Erro ao iniciar atendimento:', error);
      return false;
    }
  };

  // Entrar como atendente
  const entrarAtendimento = async (data: {
    sessao_id: string;
    nome: string;
    setor: string;
    atendenteId: string;
  }) => {
    if (!socket) return false;

    try {
      socket.emit('entrarAtendimento', data);
      return true;
    } catch (error) {
      console.error('Erro ao entrar no atendimento:', error);
      return false;
    }
  };

  // Enviar mensagem
  const enviarMensagem = async (data: {
    sessao_id: string;
    mensagem: string;
    sender: 'usuario' | 'atendente';
    mediaUrl?: string;
    mediaType?: 'image' | 'document' | 'video' | 'audio';
    fileName?: string;
  }) => {
    if (!socket) return false;

    try {
      socket.emit('enviarMensagem', data);
      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return false;
    }
  };

  // Enviar arquivo (utilizando ChatService para upload e então socket para notificação)
  const enviarArquivo = async (data: {
    sessao_id: string;
    file: File;
    mensagem?: string;
    sender: 'usuario' | 'atendente';
  }) => {
    if (!socket) return false;

    try {
      // Primeiro faz upload do arquivo
      const uploadResult = await ChatService.sendFile(
        data.sessao_id,
        data.file,
        data.sender
      );

      if (!uploadResult.success || !uploadResult.fileUrl) {
        throw new Error('Falha ao fazer upload do arquivo');
      }

      // Depois emite evento de arquivo através do socket
      socket.emit('enviarArquivo', {
        sessao_id: data.sessao_id,
        sender: data.sender,
        mediaUrl: uploadResult.fileUrl,
        mediaType: getFileType(data.file),
        fileName: data.file.name,
        mensagem: data.mensagem || '',
      });

      return true;
    } catch (error) {
      console.error('Erro ao enviar arquivo:', error);
      return false;
    }
  };

  // Listar atendimentos abertos
  const listarAtendimentos = () => {
    if (!socket) return;
    socket.emit('listarAtendimentos');
  };

  // Encerrar atendimento
  const encerrarAtendimento = (data: { sessao_id: string }) => {
    if (!socket) return false;

    try {
      socket.emit('encerrarAtendimento', data);
      return true;
    } catch (error) {
      console.error('Erro ao encerrar atendimento:', error);
      return false;
    }
  };

  // Função auxiliar para determinar o tipo de arquivo
  const getFileType = (
    file: File
  ): 'image' | 'document' | 'video' | 'audio' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'document';
  };
  return {
    iniciarAtendimento,
    entrarAtendimento,
    enviarMensagem,
    enviarArquivo,
    listarAtendimentos,
    encerrarAtendimento,
  };
}
