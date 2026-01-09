import React, { ReactNode, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useEditPermissions, EntityType } from '@/hooks/useEditPermissions';

interface EditOverlayProps {
  entityType: EntityType;
  entityOwnerId?: string;
  businessId?: string;
  onEdit: () => void;
  children: ReactNode;
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
}

export function EditOverlay({
  entityType,
  entityOwnerId,
  businessId,
  onEdit,
  children,
  className = '',
  position = 'top-right',
}: EditOverlayProps) {
  const [isHovered, setIsHovered] = useState(false);
  const permissions = useEditPermissions({ entityType, entityOwnerId, businessId });

  if (!permissions.canEdit) {
    return <>{children}</>;
  }

  const positionClasses = {
    'top-right': 'top-2 right-2',
    'top-left': 'top-2 left-2',
    'bottom-right': 'bottom-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  };

  return (
    <div
      className={`relative group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}

      {permissions.canEdit && (
        <div
          className={`
            absolute ${positionClasses[position]}
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
          `}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="
              bg-white/95 backdrop-blur-sm
              p-2 rounded-full
              shadow-lg
              hover:bg-white
              transition-all
              hover:scale-110
            "
            aria-label="Edit"
          >
            <Pencil size={16} className="text-gray-700" />
          </button>
        </div>
      )}

      <div
        className={`
          absolute inset-0
          bg-black/5
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200
          pointer-events-none
        `}
      />
    </div>
  );
}
