'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface PremiumContextType {
  isPremium: boolean;
  showPaywall: boolean;
  setShowPaywall: (show: boolean) => void;
  upgradeToPremium: () => void;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const upgradeToPremium = () => {
    // TODO: Integrate with Apple StoreKit for actual IAP
    console.log('Upgrade to premium triggered');
    setIsPremium(true);
    setShowPaywall(false);
  };

  return (
    <PremiumContext.Provider value={{ isPremium, showPaywall, setShowPaywall, upgradeToPremium }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
}
