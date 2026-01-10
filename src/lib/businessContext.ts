import { logger } from './logger';

export interface Business {
  id: string;
  name: string;
  owner_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface BusinessContextState {
  activeBusiness: Business | null;
  ownedBusinesses: Business[];
  isMultiBusinessOwner: boolean;
  loading: boolean;
}

class BusinessContextManager {
  private state: BusinessContextState = {
    activeBusiness: null,
    ownedBusinesses: [],
    isMultiBusinessOwner: false,
    loading: false,
  };

  private listeners: Set<(state: BusinessContextState) => void> = new Set();

  getState(): BusinessContextState {
    return { ...this.state };
  }

  subscribe(listener: (state: BusinessContextState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.remove(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.getState()));
  }

  setOwnedBusinesses(businesses: Business[]) {
    this.state.ownedBusinesses = businesses;
    this.state.isMultiBusinessOwner = businesses.length >= 2;

    if (businesses.length === 1 && !this.state.activeBusiness) {
      this.state.activeBusiness = businesses[0];
      this.persistActiveBusiness(businesses[0].id);
    } else if (businesses.length > 1) {
      const persistedId = this.getPersistedBusinessId();
      const persistedBusiness = businesses.find((b) => b.id === persistedId);

      if (persistedBusiness) {
        this.state.activeBusiness = persistedBusiness;
      } else if (!this.state.activeBusiness) {
        this.state.activeBusiness = businesses[0];
        this.persistActiveBusiness(businesses[0].id);
      }
    }

    logger.info('[BusinessContext] Owned businesses updated', {
      count: businesses.length,
      isMultiBusinessOwner: this.state.isMultiBusinessOwner,
      activeBusinessId: this.state.activeBusiness?.id,
    });

    this.notify();
  }

  setActiveBusiness(business: Business) {
    if (!this.state.ownedBusinesses.some((b) => b.id === business.id)) {
      logger.error('[BusinessContext] Attempted to set non-owned business as active', {
        businessId: business.id,
      });
      return;
    }

    this.state.activeBusiness = business;
    this.persistActiveBusiness(business.id);

    logger.info('[BusinessContext] Active business changed', {
      businessId: business.id,
      businessName: business.name,
    });

    this.notify();
  }

  clearActiveBusiness() {
    this.state.activeBusiness = null;
    this.clearPersistedBusinessId();
    this.notify();
  }

  reset() {
    this.state = {
      activeBusiness: null,
      ownedBusinesses: [],
      isMultiBusinessOwner: false,
      loading: false,
    };
    this.clearPersistedBusinessId();
    this.notify();
  }

  setLoading(loading: boolean) {
    this.state.loading = loading;
    this.notify();
  }

  private persistActiveBusiness(businessId: string) {
    try {
      localStorage.setItem('active_business_id', businessId);
    } catch (error) {
      logger.error('[BusinessContext] Failed to persist active business', error);
    }
  }

  private getPersistedBusinessId(): string | null {
    try {
      return localStorage.getItem('active_business_id');
    } catch (error) {
      logger.error('[BusinessContext] Failed to get persisted business', error);
      return null;
    }
  }

  private clearPersistedBusinessId() {
    try {
      localStorage.removeItem('active_business_id');
    } catch (error) {
      logger.error('[BusinessContext] Failed to clear persisted business', error);
    }
  }
}

export const businessContextManager = new BusinessContextManager();
