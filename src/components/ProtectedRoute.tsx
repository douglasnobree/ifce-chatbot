'use client';

import { useAuth } from '@/providers/AuthProvider';
import { ReactNode, useEffect, useState } from 'react';
import { Loader } from '../components/ui';
import { useRouter } from 'next/navigation';

// Componente para proteger páginas privadas
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, login } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);
  useEffect(() => {
    // Se não estiver autenticado, não estiver carregando e não estiver redirecionando já
    if (!isAuthenticated && !loading && !redirecting) {
      // Verificar se não estamos vindo da rota de autenticação (evita loop)
      const isFromAuthRoute =
        typeof window !== 'undefined' &&
        window.document.referrer.includes('/auth');

      if (!isFromAuthRoute) {
        setRedirecting(true);
        console.log('Redirecionando para página de autenticação');

        // Usar replace em vez de push para evitar problemas com o histórico
        try {
          router.replace('/auth');

          // Fallback - se o redirecionamento do router falhar
          setTimeout(() => {
            if (
              typeof window !== 'undefined' &&
              !window.location.pathname.includes('/auth')
            ) {
              console.log('Usando fallback para redirecionamento');
              window.location.href = '/auth';
            }
          }, 500);
        } catch (error) {
          console.error('Erro ao redirecionar para autenticação:', error);
          if (typeof window !== 'undefined') {
            window.location.href = '/auth';
          }
        }
      }
    }
  }, [isAuthenticated, loading, redirecting, router]);

  if (loading) return <Loader />;
  if (!isAuthenticated) {
    // Se não estiver autenticado, mostra um loader até o redirecionamento acontecer
    if (redirecting) return <Loader />;
    return null;
  }

  return <>{children}</>;
}
