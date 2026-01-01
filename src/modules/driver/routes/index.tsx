import React from 'react';
import { UnifiedDriversPage } from '../pages';

export const driverRoutes = [
  {
    path: '/drivers',
    element: <UnifiedDriversPage />,
    label: 'Drivers',
    icon: '🚗'
  },
  {
    path: '/drivers/:id',
    element: <UnifiedDriversPage />,
    label: 'Driver Details',
    icon: '👤'
  }
];

export default function DriverRoutes() {
  return <></>;
}
