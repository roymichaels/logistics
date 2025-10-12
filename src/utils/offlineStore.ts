interface Mutation {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
}

type MutationHandler = (mutation: Mutation) => Promise<{ status: 'success' | 'retry' | 'discard'; message?: string }>;

class OfflineStore {
  private handlers: Map<string, MutationHandler> = new Map();
  private mutations: Mutation[] = [];

  registerMutationHandler(type: string, handler: MutationHandler): () => void {
    this.handlers.set(type, handler);
    return () => {
      this.handlers.delete(type);
    };
  }

  async flushMutations(): Promise<void> {
    console.log('🔄 Flushing offline mutations...');
  }

  isOfflineError(error: any): boolean {
    return error instanceof Error && (
      error.message.includes('network') ||
      error.message.includes('offline') ||
      error.message.includes('fetch')
    );
  }
}

export const offlineStore = new OfflineStore();
