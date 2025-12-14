import { useState, useCallback } from 'react';
import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import { Ok, Err } from '@/foundation/types/Result';
import { logger } from '@/lib/logger';
import { DomainEvents } from '@/domain/events/DomainEvents';

interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface Cart {
  items: CartItem[];
  total: number;
}

export const useCart = () => {
  const [cart, setCart] = useState<Cart>({ items: [], total: 0 });

  const addToCart = useCallback((item: Omit<CartItem, 'quantity'>, quantity: number = 1): AsyncResult<void, ClassifiedError> => {
    try {
      logger.info('[useCart] Adding item to cart', { item, quantity });

      setCart((prevCart) => {
        const existingItem = prevCart.items.find(i => i.product_id === item.product_id);

        let newItems: CartItem[];
        if (existingItem) {
          newItems = prevCart.items.map(i =>
            i.product_id === item.product_id
              ? { ...i, quantity: i.quantity + quantity }
              : i
          );
        } else {
          newItems = [...prevCart.items, { ...item, quantity }];
        }

        const newTotal = newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

        DomainEvents.emit({
          type: 'cart.item_added',
          payload: { productId: item.product_id, quantity },
          timestamp: Date.now(),
        });

        return {
          items: newItems,
          total: newTotal,
        };
      });

      return Promise.resolve(Ok(undefined));
    } catch (error: any) {
      logger.error('[useCart] Exception adding to cart', error);
      return Promise.resolve(Err({
        message: error.message || 'Failed to add item to cart',
        code: 'CART_ADD_EXCEPTION',
        severity: 'ui',
        timestamp: Date.now(),
        data: error,
      }));
    }
  }, []);

  const removeFromCart = useCallback((productId: string): AsyncResult<void, ClassifiedError> => {
    try {
      logger.info('[useCart] Removing item from cart', { productId });

      setCart((prevCart) => {
        const newItems = prevCart.items.filter(i => i.product_id !== productId);
        const newTotal = newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

        DomainEvents.emit({
          type: 'cart.item_removed',
          payload: { productId },
          timestamp: Date.now(),
        });

        return {
          items: newItems,
          total: newTotal,
        };
      });

      return Promise.resolve(Ok(undefined));
    } catch (error: any) {
      logger.error('[useCart] Exception removing from cart', error);
      return Promise.resolve(Err({
        message: error.message || 'Failed to remove item from cart',
        code: 'CART_REMOVE_EXCEPTION',
        severity: 'ui',
        timestamp: Date.now(),
        data: error,
      }));
    }
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number): AsyncResult<void, ClassifiedError> => {
    try {
      logger.info('[useCart] Updating item quantity', { productId, quantity });

      if (quantity <= 0) {
        return removeFromCart(productId);
      }

      setCart((prevCart) => {
        const newItems = prevCart.items.map(i =>
          i.product_id === productId ? { ...i, quantity } : i
        );
        const newTotal = newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

        DomainEvents.emit({
          type: 'cart.quantity_updated',
          payload: { productId, quantity },
          timestamp: Date.now(),
        });

        return {
          items: newItems,
          total: newTotal,
        };
      });

      return Promise.resolve(Ok(undefined));
    } catch (error: any) {
      logger.error('[useCart] Exception updating quantity', error);
      return Promise.resolve(Err({
        message: error.message || 'Failed to update quantity',
        code: 'CART_UPDATE_EXCEPTION',
        severity: 'ui',
        timestamp: Date.now(),
        data: error,
      }));
    }
  }, [removeFromCart]);

  const clearCart = useCallback((): AsyncResult<void, ClassifiedError> => {
    try {
      logger.info('[useCart] Clearing cart');

      setCart({ items: [], total: 0 });

      DomainEvents.emit({
        type: 'cart.cleared',
        payload: {},
        timestamp: Date.now(),
      });

      return Promise.resolve(Ok(undefined));
    } catch (error: any) {
      logger.error('[useCart] Exception clearing cart', error);
      return Promise.resolve(Err({
        message: error.message || 'Failed to clear cart',
        code: 'CART_CLEAR_EXCEPTION',
        severity: 'ui',
        timestamp: Date.now(),
        data: error,
      }));
    }
  }, []);

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };
};
