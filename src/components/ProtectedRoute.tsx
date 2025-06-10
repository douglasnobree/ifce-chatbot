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
        // Redirecionar para página de login em vez de chamar login() diretamente
        router.push('/auth');
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
