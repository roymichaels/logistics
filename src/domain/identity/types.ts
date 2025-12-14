export interface UserProfile {
  id: string;
  email?: string;
  telegramId?: string;
  walletAddress?: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
  level: number;
}

export interface UserRole {
  userId: string;
  roleId: string;
  businessId?: string;
  infrastructureId?: string;
  assignedAt: number;
  assignedBy: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
}
