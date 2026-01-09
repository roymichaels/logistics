import React from 'react';
import { Pencil } from 'lucide-react';
import { useEditPermissions, EntityType } from '@/hooks/useEditPermissions';

interface EditButtonProps {
  entityType: EntityType;
  entityOwnerId?: string;
  businessId?: string;
  onClick: () => void;
  variant?: 'primary' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  requireOnline?: boolean;
  showTooltip?: boolean;
}

export function EditButton({
  entityType,
  entityOwnerId,
  businessId,
  onClick,
  variant = 'primary',
  size = 'md',
  requireOnline = false,
  showTooltip = true,
}: EditButtonProps) {
  const permissions = useEditPermissions({
    entityType,
    entityOwnerId,
    businessId,
    requireOnline,
  });

  if (!permissions.canEdit) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2',
  };

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 border border-gray-300',
    icon: 'bg-white/90 backdrop-blur-sm text-gray-700 hover:bg-white shadow-sm',
  };

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 rounded-lg transition-colors
        ${sizeClasses[size]}
        ${variantClasses[variant]}
      `}
      title={showTooltip ? 'Edit' : undefined}
    >
      <Pencil size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
      {variant !== 'icon' && <span>Edit</span>}
    </button>
  );
}
