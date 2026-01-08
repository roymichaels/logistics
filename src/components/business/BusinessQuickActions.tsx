import React from 'react';
import { useNavigate } from 'react-router-dom';
import { QuickActionGrid, QuickAction } from '../organisms/QuickActionGrid';

interface BusinessQuickActionsProps {
  businessId: string;
  role?: string;
}

export function BusinessQuickActions({ businessId, role }: BusinessQuickActionsProps) {
  const navigate = useNavigate();

  const ownerActions: QuickAction[] = [
    { id: '1', label: 'הזמנה חדשה', icon: '📦', onClick: () => navigate('/business/orders') },
    { id: '2', label: 'ניהול צוות', icon: '👥', onClick: () => navigate('/business/team') },
    { id: '3', label: 'בדיקת מלאי', icon: '📊', onClick: () => navigate('/business/inventory') },
    { id: '4', label: 'ניהול נהגים', icon: '🚗', onClick: () => navigate('/business/drivers') },
    { id: '5', label: 'דוחות ואנליטיקה', icon: '📈', onClick: () => navigate('/business/analytics') },
    { id: '6', label: 'הגדרות עסק', icon: '⚙️', onClick: () => navigate('/business/settings') },
    { id: '7', label: 'יומני ביקורת', icon: '📋', onClick: () => navigate('/business/audit-logs') },
    { id: '8', label: 'ניהול לקוחות', icon: '👤', onClick: () => navigate('/business/customers') },
  ];

  const managerActions: QuickAction[] = [
    { id: '1', label: 'הזמנה חדשה', icon: '📦', onClick: () => navigate('/business/orders') },
    { id: '3', label: 'בדיקת מלאי', icon: '📊', onClick: () => navigate('/business/inventory') },
    { id: '4', label: 'ניהול נהגים', icon: '🚗', onClick: () => navigate('/business/drivers') },
    { id: '5', label: 'דוחות', icon: '📈', onClick: () => navigate('/business/analytics') },
    { id: '8', label: 'ניהול לקוחות', icon: '👤', onClick: () => navigate('/business/customers') },
  ];

  const warehouseActions: QuickAction[] = [
    { id: '3', label: 'בדיקת מלאי', icon: '📊', onClick: () => navigate('/business/inventory') },
    { id: '9', label: 'קליטת משלוח', icon: '📥', onClick: () => navigate('/business/receiving') },
    { id: '10', label: 'אריזת הזמנות', icon: '📦', onClick: () => navigate('/business/packing') },
  ];

  let actions: QuickAction[] = ownerActions;

  if (role === 'manager') {
    actions = managerActions;
  } else if (role === 'warehouse') {
    actions = warehouseActions;
  }

  return <QuickActionGrid actions={actions} />;
}
