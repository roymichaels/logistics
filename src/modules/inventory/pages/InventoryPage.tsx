import React from 'react';
import { InventoryContainer } from '../components/InventoryContainer';

interface InventoryPageProps {
  onNavigate?: (page: string) => void;
}

export function InventoryPage({ onNavigate }: InventoryPageProps) {
  return <InventoryContainer />;
}
