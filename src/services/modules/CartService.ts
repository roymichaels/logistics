/**
 * Cart Service
 *
 * Manages shopping cart operations including adding/removing items,
 * quantity updates, and cart checkout preparation.
 */

import { BaseService } from '../base/BaseService';
import { logger } from '../../lib/logger';

export interface ShoppingCart {
  id: string;
  user_id: string | null;
  guest_session_token: string | null;
  business_id: string;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  notes: string | null;
  added_at: string;
  updated_at: string;
}

export interface CartItemWithProduct extends CartItem {
  product: {
    id: string;
    name: string;
    slug: string;
    primary_image_url: string | null;
    active: boolean;
  };
  variant?: {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock_quantity: number;
  };
}

export interface CartSummary {
  cart: ShoppingCart;
  items: CartItemWithProduct[];
  subtotal: number;
  itemCount: number;
}

export interface AddToCartInput {
  product_id: string;
  variant_id?: string;
  quantity: number;
  notes?: string;
}

export class CartService extends BaseService {
  /**
   * Get or create cart for current user/guest
   */
  async getOrCreateCart(businessId: string, guestToken?: string): Promise<ShoppingCart> {
    try {
      let query = this.supabase
        .from('shopping_carts')
        .select('*')
        .eq('business_id', businessId);

      if (guestToken) {
        query = query.eq('guest_session_token', guestToken);
      } else {
        query = query.eq('user_id', this.userTelegramId);
      }

      const { data: existing, error: fetchError } = await query.maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        return existing;
      }

      const insertData: any = {
        business_id: businessId,
        currency: 'ILS'
      };

      if (guestToken) {
        insertData.guest_session_token = guestToken;
      } else {
        insertData.user_id = this.userTelegramId;
      }

      const { data: newCart, error: createError } = await this.supabase
        .from('shopping_carts')
        .insert(insertData)
        .select()
        .single();

      if (createError) throw createError;

      logger.info('Cart created', { cartId: newCart.id, businessId });
      return newCart;
    } catch (error) {
      logger.error('Failed to get or create cart:', error);
      throw error;
    }
  }

  /**
   * Get cart by ID
   */
  async getCart(cartId: string): Promise<ShoppingCart | null> {
    try {
      const { data, error } = await this.supabase
        .from('shopping_carts')
        .select('*')
        .eq('id', cartId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get cart:', error);
      throw error;
    }
  }

  /**
   * Get cart items with product details
   */
  async getCartItems(cartId: string): Promise<CartItemWithProduct[]> {
    try {
      const { data, error } = await this.supabase
        .from('cart_items')
        .select(`
          *,
          product:products!inner(id, name, slug, primary_image_url, active),
          variant:product_variants(id, name, sku, price, stock_quantity)
        `)
        .eq('cart_id', cartId)
        .order('added_at', { ascending: true });

      if (error) throw error;
      return (data || []) as CartItemWithProduct[];
    } catch (error) {
      logger.error('Failed to get cart items:', error);
      throw error;
    }
  }

  /**
   * Get complete cart summary
   */
  async getCartSummary(businessId: string, guestToken?: string): Promise<CartSummary> {
    try {
      const cart = await this.getOrCreateCart(businessId, guestToken);
      const items = await this.getCartItems(cart.id);

      const subtotal = items.reduce((sum, item) => {
        return sum + (item.unit_price * item.quantity);
      }, 0);

      const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

      return {
        cart,
        items,
        subtotal,
        itemCount
      };
    } catch (error) {
      logger.error('Failed to get cart summary:', error);
      throw error;
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(
    businessId: string,
    input: AddToCartInput,
    guestToken?: string
  ): Promise<CartItem> {
    try {
      const cart = await this.getOrCreateCart(businessId, guestToken);

      const price = await this.getProductPrice(input.product_id, input.variant_id);

      const existingItem = await this.findExistingItem(
        cart.id,
        input.product_id,
        input.variant_id
      );

      if (existingItem) {
        return await this.updateCartItemQuantity(
          existingItem.id,
          existingItem.quantity + input.quantity
        );
      }

      const { data, error } = await this.supabase
        .from('cart_items')
        .insert({
          cart_id: cart.id,
          product_id: input.product_id,
          variant_id: input.variant_id,
          quantity: input.quantity,
          unit_price: price,
          notes: input.notes
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Item added to cart', {
        cartId: cart.id,
        productId: input.product_id,
        quantity: input.quantity
      });

      return data;
    } catch (error) {
      logger.error('Failed to add to cart:', error);
      throw error;
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItemQuantity(itemId: string, quantity: number): Promise<CartItem> {
    try {
      if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      const { data, error } = await this.supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;

      logger.info('Cart item quantity updated', { itemId, quantity });
      return data;
    } catch (error) {
      logger.error('Failed to update cart item:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(itemId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      logger.info('Item removed from cart', { itemId });
    } catch (error) {
      logger.error('Failed to remove from cart:', error);
      throw error;
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(cartId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cartId);

      if (error) throw error;

      logger.info('Cart cleared', { cartId });
    } catch (error) {
      logger.error('Failed to clear cart:', error);
      throw error;
    }
  }

  /**
   * Validate cart before checkout
   */
  async validateCart(cartId: string): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    try {
      const items = await this.getCartItems(cartId);
      const issues: string[] = [];

      if (items.length === 0) {
        issues.push('Cart is empty');
      }

      for (const item of items) {
        if (!item.product.active) {
          issues.push(`Product "${item.product.name}" is no longer available`);
        }

        if (item.variant) {
          if (item.variant.stock_quantity < item.quantity) {
            issues.push(
              `Only ${item.variant.stock_quantity} units available for "${item.product.name}"`
            );
          }
        }

        const currentPrice = await this.getProductPrice(
          item.product_id,
          item.variant_id || undefined
        );

        if (currentPrice !== item.unit_price) {
          issues.push(`Price changed for "${item.product.name}"`);
        }
      }

      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      logger.error('Failed to validate cart:', error);
      throw error;
    }
  }

  /**
   * Merge guest cart into user cart
   */
  async mergeGuestCart(guestToken: string, businessId: string): Promise<void> {
    try {
      const { data: guestCart } = await this.supabase
        .from('shopping_carts')
        .select('id')
        .eq('guest_session_token', guestToken)
        .eq('business_id', businessId)
        .maybeSingle();

      if (!guestCart) return;

      const userCart = await this.getOrCreateCart(businessId);
      const guestItems = await this.getCartItems(guestCart.id);

      for (const item of guestItems) {
        await this.addToCart(businessId, {
          product_id: item.product_id,
          variant_id: item.variant_id || undefined,
          quantity: item.quantity,
          notes: item.notes || undefined
        });
      }

      await this.supabase
        .from('shopping_carts')
        .delete()
        .eq('id', guestCart.id);

      logger.info('Guest cart merged', {
        guestCartId: guestCart.id,
        userCartId: userCart.id
      });
    } catch (error) {
      logger.error('Failed to merge guest cart:', error);
      throw error;
    }
  }

  /**
   * Update cart notes
   */
  async updateCartNotes(cartId: string, notes: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('shopping_carts')
        .update({ notes })
        .eq('id', cartId);

      if (error) throw error;

      logger.info('Cart notes updated', { cartId });
    } catch (error) {
      logger.error('Failed to update cart notes:', error);
      throw error;
    }
  }

  // ===== Helper Methods =====

  private async getProductPrice(productId: string, variantId?: string): Promise<number> {
    try {
      if (variantId) {
        const { data, error } = await this.supabase
          .from('product_variants')
          .select('price')
          .eq('id', variantId)
          .single();

        if (error) throw error;
        return data.price;
      }

      const { data, error } = await this.supabase
        .from('products')
        .select('price')
        .eq('id', productId)
        .single();

      if (error) throw error;
      return data.price;
    } catch (error) {
      logger.error('Failed to get product price:', error);
      throw error;
    }
  }

  private async findExistingItem(
    cartId: string,
    productId: string,
    variantId?: string
  ): Promise<CartItem | null> {
    try {
      let query = this.supabase
        .from('cart_items')
        .select('*')
        .eq('cart_id', cartId)
        .eq('product_id', productId);

      if (variantId) {
        query = query.eq('variant_id', variantId);
      } else {
        query = query.is('variant_id', null);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to find existing item:', error);
      return null;
    }
  }
}
