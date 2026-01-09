import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import { useEditPermissions, EntityType } from '@/hooks/useEditPermissions';

export interface QuickAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'primary';
  requirePermission?: 'edit' | 'delete' | 'publish' | 'settings';
}

interface QuickActionMenuProps {
  entityType: EntityType;
  entityOwnerId?: string;
  businessId?: string;
  actions: QuickAction[];
  position?: 'left' | 'right';
}

export function QuickActionMenu({
  entityType,
  entityOwnerId,
  businessId,
  actions,
  position = 'right',
}: QuickActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const permissions = useEditPermissions({ entityType, entityOwnerId, businessId });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const filteredActions = actions.filter(action => {
    if (!action.requirePermission) return true;

    switch (action.requirePermission) {
      case 'edit':
        return permissions.canEdit;
      case 'delete':
        return permissions.canDelete;
      case 'publish':
        return permissions.canPublish;
      case 'settings':
        return permissions.canManageSettings;
      default:
        return true;
    }
  });

  if (filteredActions.length === 0) {
    return null;
  }

  const variantClasses = {
    default: 'hover:bg-gray-100 text-gray-700',
    danger: 'hover:bg-red-50 text-red-600',
    primary: 'hover:bg-blue-50 text-blue-600',
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="More actions"
      >
        <MoreVertical size={20} className="text-gray-600" />
      </button>

      {isOpen && (
        <div
          className={`
            absolute top-full mt-1 ${position === 'left' ? 'right-0' : 'left-0'}
            bg-white rounded-lg shadow-lg border border-gray-200
            min-w-[200px] py-1 z-50
            animate-fadeIn
          `}
        >
          {filteredActions.map((action, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
                setIsOpen(false);
              }}
              className={`
                w-full px-4 py-2 text-left text-sm
                flex items-center gap-3
                transition-colors
                ${variantClasses[action.variant || 'default']}
              `}
            >
              {action.icon && <span>{action.icon}</span>}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
