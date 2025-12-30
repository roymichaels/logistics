import { logger } from '../lib/logger';

export interface Business {
  id: string;
  name: string;
  name_hebrew?: string;
  description?: string;
  infrastructure_id?: string;
  active: boolean;
  created_at: string;
  primary_color?: string;
  secondary_color?: string;
  order_prefix?: string;
  business_type?: string;
}

export interface Infrastructure {
  id: string;
  name: string;
  owner_id: string;
  description?: string;
  active: boolean;
  created_at: string;
}

export interface BusinessOwnership {
  id: string;
  business_id: string;
  owner_user_id: string;
  ownership_percentage: number;
  equity_type: 'founder' | 'investor' | 'employee' | 'partner';
  profit_share_percentage: number;
  voting_rights: boolean;
  active: boolean;
  business?: Business;
  owner?: any;
}

export interface BusinessEquity {
  id: string;
  business_id: string;
  owner_user_id: string;
  ownership_percentage: number;
  profit_share_percentage: number;
  equity_type: string;
  voting_rights: boolean;
  active: boolean;
}

const STORAGE_KEYS = {
  BUSINESSES: 'frontend_businesses_cache',
  OWNERSHIPS: 'frontend_business_ownerships',
  EQUITY: 'frontend_business_equity',
  SETTINGS: 'frontend_business_settings',
  INFRASTRUCTURE: 'frontend_infrastructure_cache'
};

export const localBusinessDataService = {
  // Infrastructure functions
  getInfrastructures(): Infrastructure[] {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.INFRASTRUCTURE);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      logger.error('[localBusinessDataService] Failed to load infrastructures:', error);
      return [];
    }
  },

  getInfrastructureById(id: string): Infrastructure | null {
    const infrastructures = this.getInfrastructures();
    return infrastructures.find(i => i.id === id) || null;
  },

  getOrCreateInfrastructure(userId: string): Infrastructure {
    const infrastructures = this.getInfrastructures();
    let userInfrastructure = infrastructures.find(i => i.owner_id === userId);

    if (!userInfrastructure) {
      userInfrastructure = {
        id: `infra_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `Infrastructure ${Date.now()}`,
        owner_id: userId,
        description: 'Auto-created infrastructure',
        active: true,
        created_at: new Date().toISOString()
      };

      infrastructures.push(userInfrastructure);
      localStorage.setItem(STORAGE_KEYS.INFRASTRUCTURE, JSON.stringify(infrastructures));
    }

    return userInfrastructure;
  },

  getBusinessesByInfrastructure(infrastructureId: string): Business[] {
    const businesses = this.getBusinesses();
    return businesses.filter(b => b.infrastructure_id === infrastructureId);
  },

  // Business functions
  getBusinesses(): Business[] {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.BUSINESSES);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      logger.error('[localBusinessDataService] Failed to load businesses:', error);
      return [];
    }
  },

  getBusinessById(id: string): Business | null {
    const businesses = this.getBusinesses();
    return businesses.find(b => b.id === id) || null;
  },

  getMyBusinesses(userId: string): BusinessOwnership[] {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.OWNERSHIPS);
      const ownerships: BusinessOwnership[] = cached ? JSON.parse(cached) : [];
      return ownerships.filter(o => o.owner_user_id === userId && o.active);
    } catch (error) {
      logger.error('[localBusinessDataService] Failed to load business ownerships:', error);
      return [];
    }
  },

  getBusinessEquity(businessId: string): BusinessEquity[] {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.EQUITY);
      const equity: BusinessEquity[] = cached ? JSON.parse(cached) : [];
      return equity.filter(e => e.business_id === businessId && e.active);
    } catch (error) {
      logger.error('[localBusinessDataService] Failed to load business equity:', error);
      return [];
    }
  },

  createBusiness(data: Partial<Business>, userId: string): Business {
    // Auto-create or get existing infrastructure for the user
    const infrastructure = this.getOrCreateInfrastructure(userId);

    const business: Business = {
      id: `biz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name || 'Unnamed Business',
      name_hebrew: data.name_hebrew || '',
      description: data.description || '',
      infrastructure_id: infrastructure.id,
      active: true,
      created_at: new Date().toISOString(),
      primary_color: data.primary_color || '#667eea',
      secondary_color: data.secondary_color || '#764ba2',
      order_prefix: data.order_prefix || '',
      business_type: data.business_type || 'logistics'
    };

    const businesses = this.getBusinesses();
    businesses.push(business);
    localStorage.setItem(STORAGE_KEYS.BUSINESSES, JSON.stringify(businesses));

    this.createBusinessOwnership(business.id, userId, {
      ownership_percentage: 100,
      equity_type: 'founder',
      profit_share_percentage: 100,
      voting_rights: true
    });

    return business;
  },

  updateBusiness(id: string, data: Partial<Business>): Business | null {
    const businesses = this.getBusinesses();
    const index = businesses.findIndex(b => b.id === id);

    if (index === -1) return null;

    businesses[index] = { ...businesses[index], ...data, id };
    localStorage.setItem(STORAGE_KEYS.BUSINESSES, JSON.stringify(businesses));

    return businesses[index];
  },

  deleteBusiness(id: string): boolean {
    const businesses = this.getBusinesses();
    const filtered = businesses.filter(b => b.id !== id);

    if (filtered.length === businesses.length) return false;

    localStorage.setItem(STORAGE_KEYS.BUSINESSES, JSON.stringify(filtered));
    return true;
  },

  createBusinessOwnership(
    businessId: string,
    userId: string,
    data: Partial<BusinessOwnership>
  ): BusinessOwnership {
    const ownership: BusinessOwnership = {
      id: `own_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      business_id: businessId,
      owner_user_id: userId,
      ownership_percentage: data.ownership_percentage || 0,
      equity_type: data.equity_type || 'employee',
      profit_share_percentage: data.profit_share_percentage || 0,
      voting_rights: data.voting_rights || false,
      active: true
    };

    const ownerships = this.getMyBusinesses(userId);
    const allOwnerships: BusinessOwnership[] = [];
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.OWNERSHIPS);
      if (cached) {
        allOwnerships.push(...JSON.parse(cached));
      }
    } catch (error) {
      logger.error('[localBusinessDataService] Failed to load existing ownerships:', error);
    }

    allOwnerships.push(ownership);
    localStorage.setItem(STORAGE_KEYS.OWNERSHIPS, JSON.stringify(allOwnerships));

    return ownership;
  },

  addBusinessEquity(businessId: string, ownerUserId: string, data: Partial<BusinessEquity>): BusinessEquity {
    const equity: BusinessEquity = {
      id: `eq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      business_id: businessId,
      owner_user_id: ownerUserId,
      ownership_percentage: data.ownership_percentage || 0,
      profit_share_percentage: data.profit_share_percentage || 0,
      equity_type: data.equity_type || 'investor',
      voting_rights: data.voting_rights || false,
      active: true
    };

    const equities = this.getBusinessEquity(businessId);
    const allEquities: BusinessEquity[] = [];
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.EQUITY);
      if (cached) {
        allEquities.push(...JSON.parse(cached));
      }
    } catch (error) {
      logger.error('[localBusinessDataService] Failed to load existing equity:', error);
    }

    allEquities.push(equity);
    localStorage.setItem(STORAGE_KEYS.EQUITY, JSON.stringify(allEquities));

    return equity;
  },

  updateBusinessEquity(id: string, data: Partial<BusinessEquity>): BusinessEquity | null {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.EQUITY);
      const equities: BusinessEquity[] = cached ? JSON.parse(cached) : [];
      const index = equities.findIndex(e => e.id === id);

      if (index === -1) return null;

      equities[index] = { ...equities[index], ...data };
      localStorage.setItem(STORAGE_KEYS.EQUITY, JSON.stringify(equities));

      return equities[index];
    } catch (error) {
      logger.error('[localBusinessDataService] Failed to update equity:', error);
      return null;
    }
  },

  removeBusinessEquity(id: string): boolean {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.EQUITY);
      const equities: BusinessEquity[] = cached ? JSON.parse(cached) : [];
      const filtered = equities.filter(e => e.id !== id);

      if (filtered.length === equities.length) return false;

      localStorage.setItem(STORAGE_KEYS.EQUITY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      logger.error('[localBusinessDataService] Failed to remove equity:', error);
      return false;
    }
  },

  clearAllBusinessData(): void {
    localStorage.removeItem(STORAGE_KEYS.BUSINESSES);
    localStorage.removeItem(STORAGE_KEYS.OWNERSHIPS);
    localStorage.removeItem(STORAGE_KEYS.EQUITY);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  }
};
