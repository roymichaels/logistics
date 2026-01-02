import { useState, useCallback, useEffect } from 'react';
import { useApp } from '../hooks/useApp';
import { BusinessQueries, BusinessCommands } from '../';
import type { Business } from '../queries/business.queries';
import type { CreateBusinessInput, SwitchBusinessInput } from '../commands/business.commands';
import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';

export const useBusinesses = (filters?: {
  owner_id?: string;
  infrastructure_id?: string;
  status?: string;
}) => {
  const app = useApp();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const queries = new BusinessQueries(app.db);

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await queries.getBusinesses(filters);

    if (result.success) {
      setBusinesses(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  return {
    businesses,
    loading,
    error,
    refetch: fetchBusinesses,
  };
};

export const useBusiness = (businessId: string) => {
  const app = useApp();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const queries = new BusinessQueries(app.db);

  const fetchBusiness = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await queries.getBusinessById(businessId);

    if (result.success) {
      setBusiness(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  return {
    business,
    loading,
    error,
    refetch: fetchBusiness,
  };
};

export const useUserBusinesses = (userId: string) => {
  const app = useApp();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const queries = new BusinessQueries(app.db);

  const fetchUserBusinesses = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await queries.getUserBusinesses(userId);

    if (result.success) {
      setBusinesses(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchUserBusinesses();
  }, [fetchUserBusinesses]);

  return {
    businesses,
    loading,
    error,
    refetch: fetchUserBusinesses,
  };
};

export const useCreateBusiness = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const commands = new BusinessCommands(app.db);

  const createBusiness = useCallback(async (input: CreateBusinessInput): AsyncResult<{ id: string }, ClassifiedError> => {
    setLoading(true);
    setError(null);

    const result = await commands.createBusiness(input);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
    return result;
  }, []);

  return {
    createBusiness,
    loading,
    error,
  };
};

export const useSwitchBusiness = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const commands = new BusinessCommands(app.db);

  const switchBusiness = useCallback(async (input: SwitchBusinessInput): AsyncResult<void, ClassifiedError> => {
    setLoading(true);
    setError(null);

    const result = await commands.switchBusiness(input);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
    return result;
  }, []);

  return {
    switchBusiness,
    loading,
    error,
  };
};

export const useUpdateBusiness = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const commands = new BusinessCommands(app.db);

  const updateBusiness = useCallback(
    async (
      businessId: string,
      updates: {
        name?: string;
        description?: string;
        status?: 'active' | 'inactive' | 'suspended';
      }
    ): AsyncResult<void, ClassifiedError> => {
      setLoading(true);
      setError(null);

      const result = await commands.updateBusiness(businessId, updates);

      if (!result.success) {
        setError(result.error);
      }

      setLoading(false);
      return result;
    },
    []
  );

  return {
    updateBusiness,
    loading,
    error,
  };
};
