'use client';

import { useContext } from 'react';
import { ActiveChannelsContext } from '@/providers/ActiveChannelsProvider';

export function useActiveChannels() {
  const context = useContext(ActiveChannelsContext);

  if (!context) {
    throw new Error(
      'useActiveChannels deve ser usado dentro de um ActiveChannelsProvider'
    );
  }

  return context;
}
