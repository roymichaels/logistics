import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface BaseModalProps {
  title?: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
}

export function BaseModal({
  title,
  children,
  onClose,
  footer,
  size = 'md',
  showCloseButton = true,
}: BaseModalProps) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-6xl',
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-xl ${sizeClasses[size]} w-full max-h-[90vh] flex flex-col`}
    >
      {(title || showCloseButton) && (
        <div className="flex items-center justify-between p-4 border-b">
          {title && <h2 className="text-xl font-semibold">{title}</h2>}
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>

      {footer && (
        <div className="border-t p-4 bg-gray-50">
          {footer}
        </div>
      )}
    </div>
  );
}
