import { useState, useEffect, useCallback } from 'react';
import type { Product } from '@/data/types';
import { logger } from '../lib/logger';
import { supabase } from '../lib/supabase';

export interface CartItem {
  id?: string;
  product_id: string;
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

const GUEST_CART_KEY = 'guest_cart';

export function useCart() {
  const [cart, setCart] = useState<Cart>({
    items: [],
    totalItems: 0,
    totalPrice: 0,
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initCart = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
        await loadCartFromSupabase(user.id);
      } else {
        loadGuestCart();
      }
    };

    initCart();
  }, []);

  const loadCartFromSupabase = async (uid: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          product_id,
          quantity,
          products (*)
        `)
        .eq('user_id', uid);

      if (error) {
        logger.error('[useCart] Failed to load cart from Supabase', error);
        return;
      }

      const items: CartItem[] = (data || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product: item.products as Product,
        quantity: item.quantity,
      }));

      setCart(calculateCart(items));
    } catch (error) {
      logger.error('[useCart] Error loading cart', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGuestCart = () => {
    try {
      const stored = localStorage.getItem(GUEST_CART_KEY);
      if (stored) {
        const guestCart = JSON.parse(stored);
        setCart(calculateCart(guestCart.items || []));
      }
    } catch (error) {
      logger.error('[useCart] Failed to load guest cart', error);
      localStorage.removeItem(GUEST_CART_KEY);
    }
  };

  const calculateCart = (items: CartItem[]): Cart => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    return { items, totalItems, totalPrice };
  };

  const addItem = useCallback(async (product: Product, quantity: number = 1) => {
    if (userId) {
      try {
        const existingItem = cart.items.find(i => i.product_id === product.id);

        if (existingItem && existingItem.id) {
          const { error } = await supabase
            .from('cart_items')
            .update({ quantity: existingItem.quantity + quantity })
            .eq('id', existingItem.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('cart_items')
            .insert({
              user_id: userId,
              product_id: product.id,
              quantity,
            });

          if (error) throw error;
        }

        await loadCartFromSupabase(userId);
      } catch (error) {
        logger.error('[useCart] Failed to add item to Supabase cart', error);
      }
    } else {
      const existingItem = cart.items.find(i => i.product.id === product.id);
      let newItems: CartItem[];

      if (existingItem) {
        newItems = cart.items.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      } else {
        newItems = [...cart.items, { product_id: product.id, product, quantity }];
      }

      const newCart = calculateCart(newItems);
      setCart(newCart);
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(newCart));
    }
  }, [cart, userId]);

  const removeItem = useCallback(async (productId: string) => {
    if (userId) {
      try {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', userId)
          .eq('product_id', productId);

        if (error) throw error;
        await loadCartFromSupabase(userId);
      } catch (error) {
        logger.error('[useCart] Failed to remove item from Supabase cart', error);
      }
    } else {
      const newItems = cart.items.filter(i => i.product.id !== productId);
      const newCart = calculateCart(newItems);
      setCart(newCart);
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(newCart));
    }
  }, [cart, userId]);

  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(productId);
      return;
    }

    if (userId) {
      try {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity })
          .eq('user_id', userId)
          .eq('product_id', productId);

        if (error) throw error;
        await loadCartFromSupabase(userId);
      } catch (error) {
        logger.error('[useCart] Failed to update quantity in Supabase cart', error);
      }
    } else {
      const newItems = cart.items.map(i =>
        i.product.id === productId ? { ...i, quantity } : i
      );
      const newCart = calculateCart(newItems);
      setCart(newCart);
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(newCart));
    }
  }, [cart, userId, removeItem]);

  const clearCart = useCallback(async () => {
    if (userId) {
      try {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', userId);

        if (error) throw error;
        setCart({ items: [], totalItems: 0, totalPrice: 0 });
      } catch (error) {
        logger.error('[useCart] Failed to clear Supabase cart', error);
      }
    } else {
      setCart({ items: [], totalItems: 0, totalPrice: 0 });
      localStorage.removeItem(GUEST_CART_KEY);
    }
  }, [userId]);

  return {
    cart,
    loading,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };
}
