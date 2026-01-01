import React from 'react';
import { DriverInventoryContainer } from '../components/DriverInventoryContainer';

interface DriverInventoryPageProps {
  onNavigate?: (page: string) => void;
}

export function DriverInventoryPage({ onNavigate }: DriverInventoryPageProps) {
  return <DriverInventoryContainer />;
}
