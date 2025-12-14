import { useApp } from '../services/useApp';
import { useQuery } from '../hooks/useQuery';
import { useMutation } from '../hooks/useMutation';
import { usePaginatedQuery } from '../hooks/usePaginatedQuery';
import { DriverQueries, DriverCommands } from '../';
import type { Driver } from '../queries/drivers.queries';
import type { StartShiftInput, UpdateLocationInput } from '../commands/drivers.commands';

export const useDrivers = (filters?: {
  status?: string;
  available_only?: boolean;
}) => {
  const app = useApp();
  const queries = new DriverQueries(app.db);

  const filtersKey = JSON.stringify(filters || {});
  const cacheKey = `drivers:list:${filtersKey}`;

  const result = useQuery<Driver[]>(
    cacheKey,
    () => queries.getDrivers(filters),
    { ttl: 20000 }
  );

  return {
    drivers: result.data || [],
    loading: result.loading,
    error: result.error,
    stale: result.stale,
    refetch: result.refetch,
  };
};

export const useDriversPaginated = (
  filters?: {
    status?: string;
    available_only?: boolean;
  },
  pageSize = 20
) => {
  const app = useApp();
  const queries = new DriverQueries(app.db);

  const filtersKey = JSON.stringify(filters || {});
  const baseKey = `drivers:page:${filtersKey}`;

  const result = usePaginatedQuery<Driver>(
    baseKey,
    ({ page, pageSize: size, offset }) =>
      queries.getDrivers({ ...filters, page, limit: size, offset }),
    { pageSize, ttl: 20000, mode: 'offset' }
  );

  return result;
};

export const useDriver = (driverId: string) => {
  const app = useApp();
  const queries = new DriverQueries(app.db);

  const cacheKey = `drivers:detail:${driverId}`;

  const result = useQuery<Driver>(
    cacheKey,
    () => queries.getDriverById(driverId),
    { ttl: 10000, enabled: !!driverId }
  );

  return {
    driver: result.data,
    loading: result.loading,
    error: result.error,
    stale: result.stale,
    refetch: result.refetch,
  };
};

export const useStartShift = () => {
  const app = useApp();
  const commands = new DriverCommands(app.db);

  const mutation = useMutation<StartShiftInput, void>(
    (input) => commands.startShift(input),
    {
      invalidatePatterns: [
        'drivers:list',
        'drivers:page:*',
        'drivers:detail:*',
        'drivers:available',
      ],
      emitEvent: 'driver.shift_started',
    }
  );

  return {
    startShift: mutation.mutate,
    startShiftAsync: mutation.mutateAsync,
    loading: mutation.loading,
    error: mutation.error,
    reset: mutation.reset,
  };
};

export const useEndShift = () => {
  const app = useApp();
  const commands = new DriverCommands(app.db);

  const mutation = useMutation<{ driverId: string }, void>(
    ({ driverId }) => commands.endShift(driverId),
    {
      invalidatePatterns: [
        'drivers:list',
        'drivers:page:*',
        'drivers:detail:*',
        'drivers:available',
      ],
      emitEvent: 'driver.shift_ended',
    }
  );

  return {
    endShift: (driverId: string) => mutation.mutate({ driverId }),
    endShiftAsync: (driverId: string) => mutation.mutateAsync({ driverId }),
    loading: mutation.loading,
    error: mutation.error,
    reset: mutation.reset,
  };
};

export const useUpdateDriverLocation = () => {
  const app = useApp();
  const commands = new DriverCommands(app.db);

  const mutation = useMutation<UpdateLocationInput, void>(
    (input) => commands.updateLocation(input),
    {
      invalidateKeys: [`drivers:detail:${(input: UpdateLocationInput) => input.driverId}`],
      invalidatePatterns: ['drivers:location:*'],
      emitEvent: 'driver.location_updated',
    }
  );

  return {
    updateLocation: mutation.mutate,
    updateLocationAsync: mutation.mutateAsync,
    loading: mutation.loading,
    error: mutation.error,
    reset: mutation.reset,
  };
};
