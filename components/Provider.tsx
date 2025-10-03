// components/Provider.tsx
'use client';

import { SessionProvider } from 'next-auth/react';

import type { ReactNode } from 'react';

interface ProviderProps {
  children: ReactNode;
  
}

export default function Provider({ children}: ProviderProps) {
  return <SessionProvider>{children}</SessionProvider>;
}
