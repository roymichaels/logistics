import { logger } from './logger';
import { DataStore, User, Notification } from '../data/types';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export type NotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'task_overdue'
  | 'route_optimized'
  | 'order_received'
  | 'order_cancelled'
  | 'system_alert'
  | 'chat_message'
  | 'delivery_update';

export interface NotificationPreferences {
  userId: string;
  enabled: boolean;
  types: {
    [key in NotificationType]: boolean;
  };
  quietHours: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  } | null;
  sound: boolean;
  vibration: boolean;
}

export class NotificationService {
  private dataStore: DataStore;
  private currentUser: User | null = null;
  private preferences: NotificationPreferences | null = null;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  constructor(dataStore: DataStore) {
    this.dataStore = dataStore;
    this.initializeService();
  }

  private async initializeService() {
    try {
      // Register service worker if available
      if ('serviceWorker' in navigator) {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
        logger.info('Service worker registered successfully');
      }

      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    } catch (error) {
      logger.warn('Failed to initialize notification service:', error);
    }
  }

  async setCurrentUser(user: User) {
    this.currentUser = user;
    await this.loadPreferences();
  }

  private async loadPreferences() {
    if (!this.currentUser) return;

    try {
      // Load from dataStore or use defaults
      const storedPrefs = localStorage.getItem(`notification_prefs_${this.currentUser.telegram_id}`);

      if (storedPrefs) {
        this.preferences = JSON.parse(storedPrefs);
      } else {
        this.preferences = this.getDefaultPreferences(this.currentUser.telegram_id.toString());
        await this.savePreferences();
      }
    } catch (error) {
      logger.error('Failed to load notification preferences:', error);
      this.preferences = this.getDefaultPreferences(this.currentUser.telegram_id.toString());
    }
  }

  private getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      userId,
      enabled: true,
      types: {
        task_assigned: true,
        task_completed: true,
        task_overdue: true,
        route_optimized: true,
        order_received: true,
        order_cancelled: true,
        system_alert: true,
        chat_message: false,
        delivery_update: true
      },
      quietHours: {
        start: '22:00',
        end: '07:00'
      },
      sound: true,
      vibration: true
    };
  }

  async updatePreferences(preferences: Partial<NotificationPreferences>) {
    if (!this.preferences) return;

    this.preferences = { ...this.preferences, ...preferences };
    await this.savePreferences();
  }

  private async savePreferences() {
    if (!this.preferences || !this.currentUser) return;

    try {
      localStorage.setItem(
        `notification_prefs_${this.currentUser.telegram_id}`,
        JSON.stringify(this.preferences)
      );
    } catch (error) {
      logger.error('Failed to save notification preferences:', error);
    }
  }

  async sendNotification(
    type: NotificationType,
    payload: PushNotificationPayload,
    targetUsers?: string[],
    scheduleAt?: Date
  ): Promise<boolean> {
    if (!this.shouldSendNotification(type)) {
      return false;
    }

    try {
      // Create notification record in database
      const notification: Omit<Notification, 'id' | 'created_at'> = {
        user_id: this.currentUser?.telegram_id.toString() || 'system',
        title: payload.title,
        message: payload.body,
        type: 'info',
        priority: this.getNotificationPriority(type),
        read: false,
        data: payload.data
      };

      await this.dataStore.createNotification?.(notification as any);

      // Send push notification if supported
      if (this.canSendPushNotification()) {
        if (scheduleAt && scheduleAt > new Date()) {
          // Schedule notification
          await this.scheduleNotification(payload, scheduleAt);
        } else {
          // Send immediately
          await this.sendPushNotification(payload);
        }
      }

      // Send Telegram notification if in Telegram WebApp
      if (window.Telegram?.WebApp) {
        this.sendTelegramNotification(payload);
      }

      return true;
    } catch (error) {
      logger.error('Failed to send notification:', error);
      return false;
    }
  }

  private shouldSendNotification(type: NotificationType): boolean {
    if (!this.preferences || !this.preferences.enabled) {
      return false;
    }

    if (!this.preferences.types[type]) {
      return false;
    }

    // Check quiet hours
    if (this.preferences.quietHours && this.isQuietHours()) {
      // Only allow high-priority notifications during quiet hours
      const highPriorityTypes: NotificationType[] = ['task_overdue', 'system_alert', 'order_cancelled'];
      if (!highPriorityTypes.includes(type)) {
        return false;
      }
    }

    return true;
  }

  private isQuietHours(): boolean {
    if (!this.preferences?.quietHours) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = this.preferences.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = this.preferences.quietHours.end.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private getNotificationPriority(type: NotificationType): 'low' | 'medium' | 'high' {
    const highPriorityTypes: NotificationType[] = ['task_overdue', 'system_alert', 'order_cancelled'];
    const lowPriorityTypes: NotificationType[] = ['chat_message', 'delivery_update'];

    if (highPriorityTypes.includes(type)) return 'high';
    if (lowPriorityTypes.includes(type)) return 'low';
    return 'medium';
  }

  private canSendPushNotification(): boolean {
    return 'Notification' in window &&
           Notification.permission === 'granted' &&
           this.serviceWorkerRegistration !== null;
  }

  private async sendPushNotification(payload: PushNotificationPayload) {
    if (!this.canSendPushNotification()) return;

    try {
      const registration = this.serviceWorkerRegistration!;
      await registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/assets/images/icon.png',
        badge: payload.badge || '/assets/images/badge.png',
        tag: payload.tag || 'default',
        data: payload.data,
        actions: payload.actions || [],
        vibrate: this.preferences?.vibration ? [200, 100, 200] : undefined,
        silent: !this.preferences?.sound,
        requireInteraction: this.getNotificationPriority(payload.data?.type || 'system_alert') === 'high'
      });
    } catch (error) {
      logger.error('Failed to show push notification:', error);
    }
  }

  private async scheduleNotification(payload: PushNotificationPayload, scheduleAt: Date) {
    if (!this.serviceWorkerRegistration) return;

    // Store scheduled notification in IndexedDB or localStorage
    const scheduledNotification = {
      id: Date.now().toString(),
      payload,
      scheduleAt: scheduleAt.toISOString(),
      created: new Date().toISOString()
    };

    const stored = localStorage.getItem('scheduled_notifications') || '[]';
    const scheduled = JSON.parse(stored);
    scheduled.push(scheduledNotification);
    localStorage.setItem('scheduled_notifications', JSON.stringify(scheduled));

    // Set up timeout if schedule is within reasonable time frame (< 24 hours)
    const delay = scheduleAt.getTime() - Date.now();
    if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        this.sendPushNotification(payload);
        this.removeScheduledNotification(scheduledNotification.id);
      }, delay);
    }
  }

  private removeScheduledNotification(id: string) {
    try {
      const stored = localStorage.getItem('scheduled_notifications') || '[]';
      const scheduled = JSON.parse(stored);
      const updated = scheduled.filter((n: any) => n.id !== id);
      localStorage.setItem('scheduled_notifications', JSON.stringify(updated));
    } catch (error) {
      logger.error('Failed to remove scheduled notification:', error);
    }
  }

  private sendTelegramNotification(payload: PushNotificationPayload) {
    if (!window.Telegram?.WebApp) return;

    try {
      // Use Telegram WebApp notification API
      if (window.Telegram.WebApp.showPopup) {
        window.Telegram.WebApp.showPopup({
          title: payload.title,
          message: payload.body,
          buttons: [{ type: 'ok' }]
        });
      } else {
        // Fallback to alert
        window.Telegram.WebApp.showAlert(`${payload.title}\n${payload.body}`);
      }

      // Haptic feedback
      if (window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (error) {
      logger.error('Failed to send Telegram notification:', error);
    }
  }

  // Predefined notification templates
  static createTaskAssignedNotification(taskTitle: string, assignedBy: string): PushNotificationPayload {
    return {
      title: 'משימה חדשה הוקצתה',
      body: `${taskTitle} - הוקצתה על ידי ${assignedBy}`,
      icon: '/assets/images/icon.png',
      tag: 'task_assigned',
      data: { type: 'task_assigned' as NotificationType },
      actions: [
        { action: 'view', title: 'הצג משימה', icon: '/assets/images/view.png' },
        { action: 'dismiss', title: 'בסיבה' }
      ]
    };
  }

  static createTaskOverdueNotification(taskTitle: string, dueDate: string): PushNotificationPayload {
    return {
      title: 'משימה בפיגור!',
      body: `${taskTitle} - היה אמור להסתיים ב${dueDate}`,
      icon: '/assets/images/urgent.png',
      tag: 'task_overdue',
      data: { type: 'task_overdue' as NotificationType },
      actions: [
        { action: 'complete', title: 'סמן כהושלמה' },
        { action: 'extend', title: 'הארך דחיתה' }
      ]
    };
  }

  static createOrderReceivedNotification(orderNumber: string, customerName: string): PushNotificationPayload {
    return {
      title: 'הזמנה חדשה התקבלה',
      body: `הזמנה #${orderNumber} מ${customerName}`,
      icon: '/assets/images/order.png',
      tag: 'order_received',
      data: { type: 'order_received' as NotificationType },
      actions: [
        { action: 'view', title: 'הצג הזמנה' },
        { action: 'assign', title: 'הקצה נהג' }
      ]
    };
  }

  static createRouteOptimizedNotification(savings: { distance: number; time: number }): PushNotificationPayload {
    return {
      title: 'מסלול אופטימיזציה הושלם',
      body: `חיסכון: ${savings.distance.toFixed(1)}ק"מ, ${Math.round(savings.time)} דקות`,
      icon: '/assets/images/route.png',
      tag: 'route_optimized',
      data: { type: 'route_optimized' as NotificationType },
      actions: [
        { action: 'view', title: 'הצג מסלול' },
        { action: 'start', title: 'התחל נסיעה' }
      ]
    };
  }

  // Cleanup method
  async cleanup() {
    try {
      // Clean up expired scheduled notifications
      const stored = localStorage.getItem('scheduled_notifications') || '[]';
      const scheduled = JSON.parse(stored);
      const now = new Date();

      const active = scheduled.filter((n: any) => new Date(n.scheduleAt) > now);
      localStorage.setItem('scheduled_notifications', JSON.stringify(active));
    } catch (error) {
      logger.error('Failed to cleanup notifications:', error);
    }
  }
}