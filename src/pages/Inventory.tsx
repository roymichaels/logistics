import React from 'react';
import { InventoryContainer } from '../modules/inventory/components/InventoryContainer';

interface InventoryProps {
  onNavigate: (page: string) => void;
}

export function Inventory({ onNavigate }: InventoryProps) {
  return <InventoryContainer />;
}
