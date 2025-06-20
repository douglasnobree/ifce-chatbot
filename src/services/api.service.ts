'use client';

import api from '@/lib/api';
import { AxiosResponse } from 'axios';
import { AuthUser } from '@/providers/AuthProvider';

// Tipagem para respostas da API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// Interface para resposta de verificação de token
interface VerifyTokenResponse {
  user: AuthUser;
}

// AuthService: serviços relacionados à autenticação
export const AuthService = {
  // Verificar autenticação do token
  verifyToken: async (token: string): Promise<AuthUser> => {
    try {
      const response: AxiosResponse<VerifyTokenResponse> = await api.get(
        '/auth/verify',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data.user;
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      throw error;
    }
  },
  // Redirecionar para login Google
  loginWithGoogle: (): void => {
    try {
      const url = `${
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      }/auth/google`;

      console.log('Redirecionando para autenticação Google:', url);

      // Adicionar timestamp para evitar cache
      const redirectUrl = `${url}?t=${new Date().getTime()}`;

      // Garantir que o redirecionamento aconteça
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 100);
    } catch (error) {
      console.error('Erro ao redirecionar para autenticação Google:', error);
      alert('Erro ao iniciar autenticação. Por favor, tente novamente.');
      throw error;
    }
  },

  // Logout
  logout: (): void => {
    localStorage.removeItem('auth_token');
    // Opcionalmente, poderia fazer uma chamada API para invalidar o token no servidor
  },
};

// Outros serviços podem ser adicionados aqui...

// UserService: serviços relacionados a usuários
export const UserService = {
  getCurrentUser: async (): Promise<AuthUser> => {
    try {
      const response: AxiosResponse<{ user: AuthUser }> = await api.get(
        '/auth/me'
      );
      return response.data.user;
    } catch (error) {
      console.error('Erro ao obter usuário atual:', error);
      throw error;
    }
  },

  // Outros métodos relacionados a usuários
};

// Exporte outros serviços conforme necessário
