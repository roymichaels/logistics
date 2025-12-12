import { useMemo, useState } from 'react';
import { useDataSandbox } from './data/useDataSandbox';

type CartLine = { product: any; qty: number };

let ephemeralCart: CartLine[] = [];

function upsert(lines: CartLine[], product: any, delta: number) {
  const idx = lines.findIndex((l) => l.product?.id === product?.id);
  if (idx === -1 && delta > 0) {
    return [...lines, { product, qty: delta }];
  }
  if (idx === -1) return lines;
  const next = [...lines];
  const nextQty = Math.max(0, next[idx].qty + delta);
  if (nextQty === 0) {
    next.splice(idx, 1);
    return next;
  }
  next[idx] = { product: next[idx].product, qty: nextQty };
  return next;
}

export function useAddToCart() {
  const sandbox = useDataSandbox();
  const [cart, setCart] = useState<CartLine[]>(ephemeralCart);

  const setBoth = (next: CartLine[]) => {
    ephemeralCart = next;
    setCart(next);
  };

  const syncSandbox = (next: CartLine[]) => {
    sandbox.updateSandbox({ cart: next });
  };

  const add = (product: any) => {
    if (sandbox.active) {
      const next = upsert((sandbox.sandbox.cart as CartLine[]) || [], product, 1);
      syncSandbox(next);
      setBoth(next);
      return;
    }
    const next = upsert(cart, product, 1);
    setBoth(next);
  };

  const increment = (product: any) => add(product);

  const decrement = (product: any) => {
    if (sandbox.active) {
      const next = upsert((sandbox.sandbox.cart as CartLine[]) || [], product, -1);
      syncSandbox(next);
      setBoth(next);
      return;
    }
    const next = upsert(cart, product, -1);
    setBoth(next);
  };

  const remove = (product: any) => {
    if (sandbox.active) {
      const next = ((sandbox.sandbox.cart as CartLine[]) || []).filter((l) => l.product?.id !== product?.id);
      syncSandbox(next);
      setBoth(next);
      return;
    }
    const next = cart.filter((l) => l.product?.id !== product?.id);
    setBoth(next);
  };

  const cartItems = sandbox.active ? (sandbox.sandbox.cart as CartLine[]) || [] : cart;
  const subtotal = useMemo(() => {
    return (cartItems || []).reduce((sum, line) => sum + (line.product?.price || 0) * (line.qty || 0), 0);
  }, [cartItems]);

  const total = subtotal; // placeholder taxes

  return { add, increment, decrement, remove, cartItems, subtotal, total };
}

export default useAddToCart;
