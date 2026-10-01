'use client';

import type { ReactNode } from 'react';
import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { bsc } from '@reown/appkit/networks';

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;

if (projectId) {
  createAppKit({
    adapters: [new EthersAdapter()],
    networks: [bsc],
    defaultNetwork: bsc,
    projectId,
    metadata: {
      name: 'Ayat Academy',
      description: 'Professional skincare education',
      url: 'https://ayat-academy-kareemarketing.vercel.app',
      icons: ['https://ayat-academy-kareemarketing.vercel.app/pwa-icon?size=192'],
    },
    features: {
      analytics: true,
      email: false,
      socials: [],
    },
  });
}

export function WalletAppKitProvider({ children }: { children: ReactNode }) {
  return children;
}

export function hasWalletConnectProject() {
  return Boolean(projectId);
}
