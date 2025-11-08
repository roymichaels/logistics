import { toast } from './molecules/Toast';

/**
 * Legacy Toast class for backward compatibility
 * @deprecated Use the new toast system from './molecules/Toast' instead
 */
export class Toast {
  static show(message: string, type: 'success' | 'error' | 'info' = 'info') {
    switch (type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      case 'info':
      default:
        toast.info(message);
        break;
    }
  }

  static success(message: string) {
    toast.success(message);
  }

  static error(message: string) {
    toast.error(message);
  }

  static info(message: string) {
    toast.info(message);
  }
}

// Also export the new toast for easier migration
export { toast } from './molecules/Toast';
