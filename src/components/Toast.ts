import { telegram } from '../lib/telegram';

export class Toast {
  static show(message: string, type: 'success' | 'error' | 'info' = 'info') {
    if (telegram.isAvailable) {
      if (type === 'error') {
        telegram.showAlert(`❌ ${message}`);
      } else if (type === 'success') {
        telegram.hapticFeedback('notification', 'success');
        telegram.showAlert(`✅ ${message}`);
      } else {
        telegram.showAlert(message);
      }
    } else {
      // Fallback for web
      const toast = document.createElement('div');
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? '#ff3b30' : type === 'success' ? '#34c759' : '#007aff'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 3000);
    }
  }

  static success(message: string) {
    this.show(message, 'success');
  }

  static error(message: string) {
    this.show(message, 'error');
  }

  static info(message: string) {
    this.show(message, 'info');
  }
}