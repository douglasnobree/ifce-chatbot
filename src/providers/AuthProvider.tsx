'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { AuthService } from '@/services/api.service';

// Tipos
export type AuthUser = {
  id: string;
  atendenteId?: string;
  email: string;
  name?: string;
  picture?: string;
  firstName?: string;
  lastName?: string;
  isAtendente?: boolean;
  departamento?: string;
  // ...outros campos
};

export type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: () => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'auth_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Função para redirecionar para login Google
  const login = () => {
    AuthService.loginWithGoogle();
  };

  // Função para logout seguro
  const logout = () => {
    AuthService.logout();
    setUser(null);
    setToken(null);
  };

  // Função para verificar token no backend usando axios
  const verifyToken = async (jwt: string) => {
    try {
      setLoading(true);
      const userData = await AuthService.verifyToken(jwt);

      // Só defina o usuário se dados válidos foram retornados
      if (userData && userData.id) {
        setUser(userData);
        setToken(jwt);
        localStorage.setItem(AUTH_TOKEN_KEY, jwt);
      } else {
        throw new Error('Dados de usuário inválidos');
      }
    } catch (err) {
      console.error('Erro ao validar token:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // Verificar periodicamente se o token ainda é válido (a cada 5 minutos)
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      console.log('Verificando validade do token...');
      verifyToken(token);
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [token]);

  // Checa token na query string (após login) ou no localStorage
  useEffect(() => {
    // Flag para evitar verificações duplicadas durante um único ciclo
    let authCheckCompleted = false;

    const checkAuth = async () => {
      if (authCheckCompleted) return;
      authCheckCompleted = true;

      try {
        // Verifica token na URL (após redirecionamento do backend)
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          const tokenFromUrl = url.searchParams.get('token');

          if (tokenFromUrl) {
            console.log('Token encontrado na URL, salvando...');
            // Remove o token da URL por segurança
            url.searchParams.delete('token');
            window.history.replaceState({}, document.title, url.toString());

            // Verifica e salva os dados do usuário
            await verifyToken(tokenFromUrl);
            return;
          }

          // Se não tem token na URL, verifica no localStorage
          const tokenFromStorage = localStorage.getItem(AUTH_TOKEN_KEY);
          if (tokenFromStorage) {
            console.log('Token encontrado no localStorage, verificando...');
            await verifyToken(tokenFromStorage);
            return;
          }

          // Se chegou aqui, não tem token
          setLoading(false);
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        logout();
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
