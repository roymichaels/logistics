import { useState, useEffect } from 'react';
import type { Product } from '@/data/types';

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

const CART_STORAGE_KEY = 'shopping_cart';

export function useCart() {
  const [cart, setCart] = useState<Cart>({
    items: [],
    totalItems: 0,
    totalPrice: 0,
  });

  useEffect(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      try {
        const parsedCart = JSON.parse(stored);
        setCart(calculateCart(parsedCart.items || []));
      } catch (error) {
        console.error('Failed to load cart:', error);
      }
    }
  }, []);

  const saveCart = (items: CartItem[]) => {
    const newCart = calculateCart(items);
    setCart(newCart);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newCart));
  };

  const calculateCart = (items: CartItem[]): Cart => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    return { items, totalItems, totalPrice };
  };

  const addItem = (product: Product, quantity: number = 1) => {
    const existingItem = cart.items.find(
      (item) => item.product.id === product.id
    );

    let newItems: CartItem[];
    if (existingItem) {
      newItems = cart.items.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      newItems = [...cart.items, { product, quantity }];
    }

    saveCart(newItems);
  };

  const removeItem = (productId: string) => {
    const newItems = cart.items.filter(
      (item) => item.product.id !== productId
    );
    saveCart(newItems);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    const newItems = cart.items.map((item) =>
      item.product.id === productId ? { ...item, quantity } : item
    );
    saveCart(newItems);
  };

  const clearCart = () => {
    saveCart([]);
  };

  return {
    cart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };
}
