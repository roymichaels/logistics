import React from 'react';
import { Toast } from './Toast';
import { telegram } from '../../lib/telegram';
import { DataStore } from '../../data/types';
import { PINEntry } from './PINEntry';

interface ManagerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userTelegramId: string;
  dataStore: DataStore;
}

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '000000';

export function ManagerLoginModal({
  isOpen,
  onClose,
  onSuccess,
  userTelegramId,
  dataStore
}: ManagerLoginModalProps) {

  const handlePinSuccess = async (enteredPin: string) => {
    if (enteredPin !== ADMIN_PIN) {
      telegram.hapticFeedback('notification', 'error');
      Toast.error('PIN שגוי');
      return;
    }

    telegram.hapticFeedback('notification', 'success');
    Toast.success('PIN אומת בהצלחה! משדרג גישה...');

    try {
      if (dataStore.updateProfile) {
        await dataStore.updateProfile({
          role: 'manager'
        });

        Toast.success('משדרג להרשאות מנהל...');

        setTimeout(() => {
          onSuccess();
          onClose();
        }, 500);
      } else {
        throw new Error('updateProfile method not available');
      }
    } catch (error) {
      console.error('Failed to promote user:', error);
      Toast.error('שגיאה בעדכון הרשאות');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <PINEntry
        mode="verify"
        onSuccess={handlePinSuccess}
        onCancel={onClose}
        title="גישת מנהל"
        subtitle="הזן PIN של 6 ספרות"
        showForgotPin={false}
      />
    </div>
  );
}
