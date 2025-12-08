'use client';

import { PremiumProvider } from '@/contexts/PremiumContext';
import PaywallModal from './PaywallModal';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PremiumProvider>
      {children}
      <PaywallModal />
    </PremiumProvider>
  );
}
