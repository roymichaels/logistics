export interface FeatureFlag {
  key: string;
  enabled: boolean;
  metadata?: {
    description?: string;
    category?: string;
    defaultValue?: boolean;
  };
}

export interface IFeatureFlags {
  isEnabled(key: string): boolean;

  enable(key: string): void;

  disable(key: string): void;

  toggle(key: string): void;

  getAll(): Record<string, boolean>;

  subscribe(key: string, callback: (enabled: boolean) => void): () => void;

  subscribeAll(callback: (flags: Record<string, boolean>) => void): () => void;
}
