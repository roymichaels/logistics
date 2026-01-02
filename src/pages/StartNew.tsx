import React, { useState } from 'react';
import { OnboardingHub } from '../components/OnboardingHub';
import { BusinessOwnerOnboarding } from '../components/BusinessOwnerOnboarding';
import { BecomeDriverModal } from '../modules/driver/components';

interface StartNewProps {
  onNavigate: (page: string) => void;
  dataStore: any;
}

export function StartNew({ onNavigate, dataStore }: StartNewProps) {
  const [pathway, setPathway] = useState<'business_owner' | 'team_member' | null>(null);
  const [showDriver, setShowDriver] = useState(false);

  if (!pathway) {
    return (
      <OnboardingHub
        onSelectPathway={(p) => {
          if (!p) return;
          if (p === 'team_member') {
            setShowDriver(true);
          } else {
            setPathway('business_owner');
          }
        }}
        onSkip={() => onNavigate('catalog')}
      />
    );
  }

  if (pathway === 'business_owner') {
    return (
      <BusinessOwnerOnboarding
        dataStore={dataStore}
        onComplete={() => {
          setPathway(null);
          onNavigate('sandbox');
        }}
        onBack={() => setPathway(null)}
      />
    );
  }

  if (showDriver) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0b1020', zIndex: 9999 }}>
        <BecomeDriverModal
          onClose={() => setShowDriver(false)}
          onSuccess={() => {
            setShowDriver(false);
            onNavigate('sandbox');
          }}
        />
      </div>
    );
  }

  return null;
}
