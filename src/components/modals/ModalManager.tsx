import React, { useEffect } from 'react';
import { useModal } from '@/context/ModalContext';
import { X } from 'lucide-react';

export function ModalManager() {
  const { modals, closeModal } = useModal();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modals.length > 0) {
        const topModal = modals[modals.length - 1];
        if (topModal.closeOnEsc) {
          closeModal(topModal.id);
        }
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [modals, closeModal]);

  useEffect(() => {
    if (modals.length > 0) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [modals.length]);

  if (modals.length === 0) return null;

  return (
    <>
      {modals.map((modal, index) => (
        <div
          key={modal.id}
          className="modal-overlay"
          style={{
            zIndex: 1000 + index,
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && modal.closeOnBackdrop) {
              closeModal(modal.id);
            }
          }}
        >
          <div
            className="modal-content"
            style={{
              position: 'relative',
              maxWidth: '100%',
              maxHeight: '90vh',
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            {modal.component}
          </div>
        </div>
      ))}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
