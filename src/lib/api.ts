'use client';

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Configuração base do Axios
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const axiosConfig: AxiosRequestConfig = {
  baseURL: API_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  // Enviando cookies em requisições cross-origin
  withCredentials: true,
};

// Instância do axios com configuração padrão
const api: AxiosInstance = axios.create(axiosConfig);

// Interceptor de requisição para incluir o token de autenticação quando disponível
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de resposta para tratar erros comuns
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    // Tratar erros específicos
    if (error.response) {
      // O servidor respondeu com um status de erro
      console.error(`Erro API ${error.response.status}:`, error.response.data);

      // Deslogar o usuário se o token estiver inválido ou expirado
      if (error.response.status === 401) {
        // Apenas deslogar se não estiver na página de login
        if (
          typeof window !== 'undefined' &&
          !window.location.pathname.includes('/auth')
        ) {
          console.log('Token expirado, redirecionando para login...');
          localStorage.removeItem('auth_token');
          window.location.href = '/auth';
        }
      }
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta (erro de rede)
      console.error('Erro de rede, servidor não respondeu:', error.request);
    } else {
      // Erros de configuração da requisição
      console.error('Erro ao configurar requisição:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
