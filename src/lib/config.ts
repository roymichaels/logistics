interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

let configCache: AppConfig | null = null;
let configPromise: Promise<AppConfig> | null = null;

export const getConfig = async (): Promise<AppConfig> => {
  if (configCache) {
    return configCache;
  }

  if (configPromise) {
    return configPromise;
  }

  configPromise = (async () => {
    try {
      let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.log('🔄 Loading runtime configuration...');

        try {
          const response = await fetch('/runtime-config.json');
          if (response.ok) {
            const runtimeConfig = await response.json();
            supabaseUrl = runtimeConfig.supabaseUrl;
            supabaseAnonKey = runtimeConfig.supabaseAnonKey;
            console.log('✅ Runtime configuration loaded successfully');
          } else {
            console.error('⚠️ Runtime config endpoint returned:', response.status);
          }
        } catch (fetchError) {
          console.error('⚠️ Failed to fetch runtime config:', fetchError);
        }
      } else {
        console.log('✅ Using build-time configuration');
      }

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing. Please check environment variables or runtime-config.json');
      }

      const config: AppConfig = {
        supabaseUrl,
        supabaseAnonKey
      };

      configCache = config;
      return config;
    } catch (error) {
      configPromise = null;
      throw error;
    }
  })();

  return configPromise;
};

export const getConfigSync = (): AppConfig | null => {
  return configCache;
};

export const clearConfigCache = (): void => {
  configCache = null;
  configPromise = null;
};
