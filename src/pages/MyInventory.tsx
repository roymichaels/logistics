import React from 'react';
import { DriverInventoryContainer } from '../modules/inventory/components/DriverInventoryContainer';

interface MyInventoryProps {
  dataStore?: any;
  onNavigate: (page: string) => void;
}

export function MyInventory({ onNavigate }: MyInventoryProps) {
  return <DriverInventoryContainer />;
}

export default MyInventory;
