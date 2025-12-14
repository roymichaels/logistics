export interface Business {
  id: string;
  name: string;
  description?: string;
  businessTypeId: string;
  ownerId: string;
  infrastructureId?: string;
  status: 'active' | 'inactive' | 'suspended';
  settings: BusinessSettings;
  createdAt: number;
  updatedAt: number;
}

export interface BusinessSettings {
  timezone?: string;
  currency?: string;
  language?: string;
  features?: {
    enableInventory?: boolean;
    enableOrders?: boolean;
    enableDelivery?: boolean;
    enablePayments?: boolean;
  };
}

export interface BusinessMember {
  id: string;
  businessId: string;
  userId: string;
  roleId: string;
  joinedAt: number;
  invitedBy?: string;
}

export interface BusinessType {
  id: string;
  name: string;
  category: string;
  description?: string;
  requiredFeatures: string[];
}
