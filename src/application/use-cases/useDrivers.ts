import { useState, useCallback, useEffect } from 'react';
import { useApp } from '../services/useApp';
import { DriverQueries, DriverCommands } from '../';
import type { Driver } from '../queries/drivers.queries';
import type { StartShiftInput, UpdateLocationInput } from '../commands/drivers.commands';
import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';

export const useDrivers = (filters?: {
  status?: string;
  available_only?: boolean;
}) => {
  const app = useApp();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const queries = new DriverQueries(app.db);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await queries.getDrivers(filters);

    if (result.success) {
      setDrivers(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  return {
    drivers,
    loading,
    error,
    refetch: fetchDrivers,
  };
};

export const useDriver = (driverId: string) => {
  const app = useApp();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const queries = new DriverQueries(app.db);

  const fetchDriver = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await queries.getDriverById(driverId);

    if (result.success) {
      setDriver(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [driverId]);

  useEffect(() => {
    fetchDriver();
  }, [fetchDriver]);

  return {
    driver,
    loading,
    error,
    refetch: fetchDriver,
  };
};

export const useStartShift = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const commands = new DriverCommands(app.db);

  const startShift = useCallback(async (input: StartShiftInput): AsyncResult<void, ClassifiedError> => {
    setLoading(true);
    setError(null);

    const result = await commands.startShift(input);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
    return result;
  }, []);

  return {
    startShift,
    loading,
    error,
  };
};

export const useEndShift = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const commands = new DriverCommands(app.db);

  const endShift = useCallback(async (driverId: string): AsyncResult<void, ClassifiedError> => {
    setLoading(true);
    setError(null);

    const result = await commands.endShift(driverId);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
    return result;
  }, []);

  return {
    endShift,
    loading,
    error,
  };
};

export const useUpdateDriverLocation = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const commands = new DriverCommands(app.db);

  const updateLocation = useCallback(async (input: UpdateLocationInput): AsyncResult<void, ClassifiedError> => {
    setLoading(true);
    setError(null);

    const result = await commands.updateLocation(input);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
    return result;
  }, []);

  return {
    updateLocation,
    loading,
    error,
  };
};

export const useAcceptDelivery = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const commands = new DriverCommands(app.db);

  const acceptDelivery = useCallback(
    async (driverId: string, orderId: string): AsyncResult<void, ClassifiedError> => {
      setLoading(true);
      setError(null);

      const result = await commands.acceptDelivery(driverId, orderId);

      if (!result.success) {
        setError(result.error);
      }

      setLoading(false);
      return result;
    },
    []
  );

  return {
    acceptDelivery,
    loading,
    error,
  };
};

export const useCompleteDelivery = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const commands = new DriverCommands(app.db);

  const completeDelivery = useCallback(
    async (driverId: string, orderId: string): AsyncResult<void, ClassifiedError> => {
      setLoading(true);
      setError(null);

      const result = await commands.completeDelivery(driverId, orderId);

      if (!result.success) {
        setError(result.error);
      }

      setLoading(false);
      return result;
    },
    []
  );

  return {
    completeDelivery,
    loading,
    error,
  };
};
