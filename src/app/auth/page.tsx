'use client';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AuthPage() {
  const { login, loading, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [loggingIn, setLoggingIn] = useState(false);
  const [redirected, setRedirected] = useState(false);

  // Redirecionar para a página principal se estiver autenticado
  useEffect(() => {
    // Só redireciona se estiver autenticado, não estiver carregando, e não tiver redirecionado ainda
    if (isAuthenticated && !loading && !redirected) {
      console.log('Redirecionando usuário autenticado para home');
      setRedirected(true);

      // Adicionar um pequeno atraso para evitar loops
      const timer = setTimeout(() => {
        router.push('/');
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, loading, redirected, router]);

  const handleLogin = () => {
    console.log('Iniciando processo de login');
    setLoggingIn(true);
    // Adicionando delay para atualizar UI antes do redirecionamento
    setTimeout(() => login(), 100);
  };

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center h-screen gap-3'>
        <div className='w-8 h-8 border-4 border-t-blue-500 border-b-transparent border-l-transparent border-r-transparent rounded-full animate-spin'></div>
        <p className='text-lg mt-4'>Verificando autenticação...</p>
      </div>
    );
  }

  if (loggingIn) {
    return (
      <div className='flex flex-col items-center justify-center h-screen gap-3'>
        <div className='w-8 h-8 border-4 border-t-blue-500 border-b-transparent border-l-transparent border-r-transparent rounded-full animate-spin'></div>
        <p className='text-lg mt-4'>Redirecionando para autenticação...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className='flex flex-col items-center justify-center h-screen gap-4'>
        <h2 className='text-xl font-bold'>Você já está autenticado!</h2>
        <p>Bem-vindo, {user?.name || user?.email}</p>
        <p className='text-sm text-gray-500 mt-2'>
          Redirecionando para a página principal...
        </p>
      </div>
    );
  }

  return (
    <div className='flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800'>
      <div className='w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg'>
        <div className='text-center'>
          <h1 className='text-3xl font-bold tracking-tight'>
            Acesso ao Sistema
          </h1>
          <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
            Faça login usando sua conta Google para acessar o sistema
          </p>
        </div>

        <button
          className='w-full flex items-center justify-center gap-3 bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition'
          onClick={handleLogin}>
          <svg className='w-5 h-5' viewBox='0 0 24 24'>
            <path
              fill='currentColor'
              d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
            />
            <path
              fill='currentColor'
              d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
            />
            <path
              fill='currentColor'
              d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
            />
            <path
              fill='currentColor'
              d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
            />
          </svg>
          Entrar com Google
        </button>
      </div>
    </div>
  );
}
