import { DomainEvents } from '@/domain/events/DomainEvents';
import { DiagnosticsStore } from '@/foundation/diagnostics/DiagnosticsStore';
import { logger } from '@/lib/logger';
import { cacheHydration } from '../cache/hydrationRules';

export class DomainEventHandlers {
  private static initialized = false;

  static initialize() {
    if (this.initialized) {
      logger.warn('[DomainEventHandlers] Already initialized');
      return;
    }

    logger.info('[DomainEventHandlers] Initializing event handlers');

    cacheHydration.initialize();

    DomainEvents.on('order.created', (event) => {
      logger.info('[DomainEvents] Order created', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'Order created',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('order.assigned', (event) => {
      logger.info('[DomainEvents] Order assigned', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'Order assigned to driver',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('order.status_updated', (event) => {
      logger.info('[DomainEvents] Order status updated', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: `Order status changed to ${event.payload.status}`,
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('order.cancelled', (event) => {
      logger.info('[DomainEvents] Order cancelled', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'Order cancelled',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('driver.shift_started', (event) => {
      logger.info('[DomainEvents] Driver shift started', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'Driver started shift',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('driver.shift_ended', (event) => {
      logger.info('[DomainEvents] Driver shift ended', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'Driver ended shift',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('driver.location_updated', (event) => {
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'Driver location updated',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('delivery.accepted', (event) => {
      logger.info('[DomainEvents] Delivery accepted', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'Driver accepted delivery',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('delivery.completed', (event) => {
      logger.info('[DomainEvents] Delivery completed', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'Delivery completed',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('business.created', (event) => {
      logger.info('[DomainEvents] Business created', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'New business created',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('business.context_switched', (event) => {
      logger.info('[DomainEvents] Business context switched', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'User switched business context',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('business.updated', (event) => {
      logger.info('[DomainEvents] Business updated', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'Business details updated',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('product.created', (event) => {
      logger.info('[DomainEvents] Product created', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'New product added to catalog',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('product.updated', (event) => {
      logger.info('[DomainEvents] Product updated', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'Product details updated',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('product.deleted', (event) => {
      logger.info('[DomainEvents] Product deleted', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'Product removed from catalog',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('inventory.restocked', (event) => {
      logger.info('[DomainEvents] Inventory restocked', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'Inventory restocked',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('inventory.adjusted', (event) => {
      logger.info('[DomainEvents] Inventory adjusted', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'Inventory quantity adjusted',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('inventory.reorder_level_set', (event) => {
      logger.info('[DomainEvents] Reorder level set', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'Inventory reorder level configured',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('message.sent', (event) => {
      logger.info('[DomainEvents] Message sent', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'Message sent',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('room.created', (event) => {
      logger.info('[DomainEvents] Chat room created', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'New chat room created',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('messages.marked_read', (event) => {
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'Messages marked as read',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('cart.item_added', (event) => {
      logger.info('[DomainEvents] Item added to cart', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'Item added to cart',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('cart.item_removed', (event) => {
      logger.info('[DomainEvents] Item removed from cart', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'Item removed from cart',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('cart.quantity_updated', (event) => {
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'Cart item quantity updated',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('cart.cleared', (event) => {
      logger.info('[DomainEvents] Cart cleared', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'Shopping cart cleared',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('auth.login', (event) => {
      logger.info('[DomainEvents] User logged in', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'User authentication successful',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('auth.register', (event) => {
      logger.info('[DomainEvents] User registered', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'New user registered',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    DomainEvents.on('auth.logout', (event) => {
      logger.info('[DomainEvents] User logged out', event.payload);
      DiagnosticsStore.logEvent({
        type: 'domain_event',
        message: 'User logged out',
        severity: 'info',
        data: event.payload,
        timestamp: event.timestamp,
      });
    });

    this.initialized = true;
    logger.info('[DomainEventHandlers] Event handlers initialized successfully');
  }

  static reset() {
    cacheHydration.reset();
    this.initialized = false;
    logger.info('[DomainEventHandlers] Event handlers reset');
  }
}
