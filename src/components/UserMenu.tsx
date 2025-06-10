'use client';

import React from 'react';
import { useAuth } from '@/providers/AuthProvider';
import Link from 'next/link';

export function UserMenu() {
  const { user, logout } = useAuth();

  return (
    <div className='flex items-center gap-4'>
      <div className='flex flex-col items-end'>
        <span className='text-sm font-medium'>
          {user?.name || user?.email || 'Usuário'}
        </span>
        <div className='flex gap-3 mt-1'>
          <button
            onClick={logout}
            className='text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'>
            Sair
          </button>
          <Link
            href='/auth'
            className='text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'>
            Perfil
          </Link>
        </div>
      </div>
      <div className='w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden'>
        {user?.picture ? (
          <img
            src={user.picture}
            alt={user.name || 'Avatar'}
            className='w-full h-full object-cover'
          />
        ) : (
          <span className='text-lg font-semibold'>
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}
