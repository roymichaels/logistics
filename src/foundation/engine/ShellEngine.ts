import { logger } from '../../lib/logger';
import { eventBus } from '../events/EventBus';
import { SystemEvent } from '../types/Events';

export type ShellType = 'unified' | 'business' | 'driver' | 'store';

export interface ShellConfig {
  type: ShellType;
  features: {
    showBottomNav?: boolean;
    showHeader?: boolean;
    showSidebar?: boolean;
    compactMode?: boolean;
  };
  theme?: string;
}

type ShellChangeListener = (config: ShellConfig) => void;

export class ShellEngine {
  private currentShell: ShellConfig = {
    type: 'unified',
    features: {
      showBottomNav: true,
      showHeader: true,
      showSidebar: false,
      compactMode: false,
    },
  };

  private listeners: Set<ShellChangeListener> = new Set();

  getCurrentShell(): ShellConfig {
    return { ...this.currentShell };
  }

  setShell(config: Partial<ShellConfig>): void {
    const previous = { ...this.currentShell };

    this.currentShell = {
      ...this.currentShell,
      ...config,
      features: {
        ...this.currentShell.features,
        ...config.features,
      },
    };

    logger.info('[ShellEngine] Shell configuration changed', {
      previous: previous.type,
      current: this.currentShell.type,
    });

    const event: SystemEvent = {
      type: 'shell.changed',
      eventType: 'system',
      level: 'info',
      message: `Shell changed from ${previous.type} to ${this.currentShell.type}`,
      timestamp: Date.now(),
      source: 'ShellEngine',
      metadata: {
        previous,
        current: this.currentShell,
      },
    };

    eventBus.emit(event);

    this.notifyListeners();
  }

  switchShell(type: ShellType): void {
    const config = this.getDefaultConfig(type);
    this.setShell(config);
  }

  updateFeatures(features: Partial<ShellConfig['features']>): void {
    this.setShell({ features });
  }

  subscribe(listener: ShellChangeListener): () => void {
    this.listeners.add(listener);

    listener(this.getCurrentShell());

    return () => {
      this.listeners.delete(listener);
    };
  }

  private getDefaultConfig(type: ShellType): ShellConfig {
    switch (type) {
      case 'unified':
        return {
          type: 'unified',
          features: {
            showBottomNav: true,
            showHeader: true,
            showSidebar: false,
            compactMode: false,
          },
        };

      case 'business':
        return {
          type: 'business',
          features: {
            showBottomNav: true,
            showHeader: true,
            showSidebar: true,
            compactMode: false,
          },
        };

      case 'driver':
        return {
          type: 'driver',
          features: {
            showBottomNav: true,
            showHeader: true,
            showSidebar: false,
            compactMode: true,
          },
        };

      case 'store':
        return {
          type: 'store',
          features: {
            showBottomNav: true,
            showHeader: true,
            showSidebar: false,
            compactMode: false,
          },
        };

      default:
        return this.getDefaultConfig('unified');
    }
  }

  private notifyListeners(): void {
    const config = this.getCurrentShell();
    this.listeners.forEach((listener) => {
      try {
        listener(config);
      } catch (error) {
        logger.error('[ShellEngine] Listener error', error);
      }
    });
  }
}

export const shellEngine = new ShellEngine();
