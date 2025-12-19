import { useMemo } from 'react';
import { LocalDataStore } from '@/foundation/data/LocalDataStore';

let globalStore: LocalDataStore | null = null;

export const useDataStore = () => {
  return useMemo(() => {
    if (!globalStore) {
      globalStore = new LocalDataStore();
    }
    return globalStore;
  }, []);
};
