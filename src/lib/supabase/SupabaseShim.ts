import { logger } from '../logger';

const DEPRECATION_WARNING = 'Supabase call detected in frontend-only mode. This is a no-op shim. Please migrate to UnifiedDataStore.';

class SupabaseQueryBuilder {
  private tableName: string;
  private selectFields: string = '*';
  private filters: Array<{ column: string; operator: string; value: any }> = [];
  private ordering: Array<{ column: string; ascending: boolean }> = [];
  private limitValue?: number;
  private singleMode: boolean = false;
  private maybeSingleMode: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields: string = '*') {
    this.selectFields = fields;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ column, operator: 'neq', value });
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push({ column, operator: 'gt', value });
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push({ column, operator: 'gte', value });
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push({ column, operator: 'lt', value });
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push({ column, operator: 'lte', value });
    return this;
  }

  like(column: string, pattern: string) {
    this.filters.push({ column, operator: 'like', value: pattern });
    return this;
  }

  ilike(column: string, pattern: string) {
    this.filters.push({ column, operator: 'ilike', value: pattern });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ column, operator: 'in', value: values });
    return this;
  }

  is(column: string, value: any) {
    this.filters.push({ column, operator: 'is', value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.ordering.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(count: number) {
    this.limitValue = count;
    return this;
  }

  single() {
    this.singleMode = true;
    return this;
  }

  maybeSingle() {
    this.maybeSingleMode = true;
    return this;
  }

  async then(resolve: (result: any) => void, reject?: (error: any) => void) {
    logger.warn(DEPRECATION_WARNING, { table: this.tableName, operation: 'SELECT' });

    const result = {
      data: this.singleMode || this.maybeSingleMode ? null : [],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK'
    };

    if (resolve) {
      resolve(result);
    }

    return result;
  }
}

class SupabaseClient {
  from(tableName: string) {
    return new SupabaseQueryBuilder(tableName);
  }

  auth = {
    signUp: async (credentials: any) => {
      logger.warn(DEPRECATION_WARNING, { operation: 'signUp' });
      return { data: { user: null, session: null }, error: null };
    },

    signInWithPassword: async (credentials: any) => {
      logger.warn(DEPRECATION_WARNING, { operation: 'signInWithPassword' });
      return { data: { user: null, session: null }, error: null };
    },

    signOut: async () => {
      logger.warn(DEPRECATION_WARNING, { operation: 'signOut' });
      return { error: null };
    },

    getSession: async () => {
      logger.warn(DEPRECATION_WARNING, { operation: 'getSession' });
      return { data: { session: null }, error: null };
    },

    getUser: async () => {
      logger.warn(DEPRECATION_WARNING, { operation: 'getUser' });
      return { data: { user: null }, error: null };
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      logger.warn(DEPRECATION_WARNING, { operation: 'onAuthStateChange' });
      return {
        data: { subscription: { unsubscribe: () => {} } }
      };
    }
  };

  storage = {
    from: (bucketName: string) => ({
      upload: async (path: string, file: any, options?: any) => {
        logger.warn(DEPRECATION_WARNING, { operation: 'storage.upload', bucket: bucketName });
        return { data: null, error: null };
      },

      download: async (path: string) => {
        logger.warn(DEPRECATION_WARNING, { operation: 'storage.download', bucket: bucketName });
        return { data: null, error: null };
      },

      getPublicUrl: (path: string) => {
        logger.warn(DEPRECATION_WARNING, { operation: 'storage.getPublicUrl', bucket: bucketName });
        return { data: { publicUrl: '' } };
      },

      remove: async (paths: string[]) => {
        logger.warn(DEPRECATION_WARNING, { operation: 'storage.remove', bucket: bucketName });
        return { data: null, error: null };
      }
    })
  };

  channel(name: string) {
    return {
      on: (event: string, filter: any, callback: (payload: any) => void) => {
        logger.warn(DEPRECATION_WARNING, { operation: 'channel.on', channel: name });
        return this.channel(name);
      },
      subscribe: (callback?: (status: string) => void) => {
        logger.warn(DEPRECATION_WARNING, { operation: 'channel.subscribe', channel: name });
        if (callback) callback('SUBSCRIBED');
        return {
          unsubscribe: async () => {
            logger.info('Unsubscribed from channel', { channel: name });
          }
        };
      }
    };
  }

  rpc(functionName: string, params?: any) {
    logger.warn(DEPRECATION_WARNING, { operation: 'rpc', function: functionName });
    return {
      then: async (resolve: (result: any) => void) => {
        const result = { data: null, error: null };
        if (resolve) resolve(result);
        return result;
      }
    };
  }
}

export const supabaseShim = new SupabaseClient();

export function createClient(supabaseUrl: string, supabaseKey: string, options?: any) {
  logger.warn('🚫 Supabase createClient called in frontend-only mode. Returning shim.');
  return supabaseShim;
}
