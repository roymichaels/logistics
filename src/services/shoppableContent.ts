import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export interface ProductTag {
  id: string;
  post_id?: string;
  story_id?: string;
  product_id: string;
  business_id: string;
  position_x?: number;
  position_y?: number;
  tag_style?: any;
  display_order: number;
  click_count: number;
  created_at: string;
  product?: any;
}

export interface ShoppablePost {
  post_id: string;
  business_id: string;
  post_type: 'standard' | 'collection' | 'lookbook' | 'sale' | 'launch';
  featured_product_ids?: string[];
  discount_code?: string;
  discount_percentage?: number;
  sale_ends_at?: string;
  total_clicks: number;
  total_purchases: number;
  total_revenue: number;
  created_at: string;
  updated_at: string;
}

export interface Wishlist {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_public: boolean;
  share_token?: string;
  item_count: number;
  created_at: string;
  updated_at: string;
  items?: WishlistItem[];
}

export interface WishlistItem {
  id: string;
  wishlist_id: string;
  product_id: string;
  business_id: string;
  original_price?: number;
  current_price?: number;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  notify_on_sale: boolean;
  notify_on_restock: boolean;
  added_at: string;
  product?: any;
}

export interface ShoppingCart {
  id: string;
  user_id: string;
  session_id?: string;
  status: 'active' | 'abandoned' | 'completed';
  total_items: number;
  subtotal: number;
  last_activity_at: string;
  created_at: string;
  items?: CartItem[];
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  business_id: string;
  quantity: number;
  price_at_add: number;
  current_price?: number;
  variant_options?: any;
  saved_for_later: boolean;
  added_at: string;
  product?: any;
}

export class ShoppableContentService {
  async tagProductInPost(
    postId: string,
    productId: string,
    businessId: string,
    position?: { x: number; y: number }
  ): Promise<ProductTag> {
    try {
      const { data, error } = await supabase
        .from('product_tags')
        .insert({
          post_id: postId,
          product_id: productId,
          business_id: businessId,
          position_x: position?.x,
          position_y: position?.y,
        })
        .select()
        .single();

      if (error) throw error;
      logger.info('Product tagged in post', { postId, productId });
      return data;
    } catch (error) {
      logger.error('Failed to tag product', { error, postId, productId });
      throw error;
    }
  }

  async getProductTags(postId: string): Promise<ProductTag[]> {
    try {
      const { data, error } = await supabase
        .from('product_tags')
        .select(`
          *,
          products (id, name, price, images, business_id)
        `)
        .eq('post_id', postId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch product tags', { error, postId });
      return [];
    }
  }

  async createShoppablePost(
    postId: string,
    businessId: string,
    options?: Partial<ShoppablePost>
  ): Promise<ShoppablePost> {
    try {
      const { data, error } = await supabase
        .from('shoppable_posts')
        .insert({
          post_id: postId,
          business_id: businessId,
          ...options,
        })
        .select()
        .single();

      if (error) throw error;
      logger.info('Shoppable post created', { postId });
      return data;
    } catch (error) {
      logger.error('Failed to create shoppable post', { error, postId });
      throw error;
    }
  }

  async createWishlist(name: string, isPublic: boolean = false): Promise<Wishlist> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('wishlists')
        .insert({
          user_id: user.id,
          name,
          is_public: isPublic,
        })
        .select()
        .single();

      if (error) throw error;
      logger.info('Wishlist created', { wishlistId: data.id });
      return data;
    } catch (error) {
      logger.error('Failed to create wishlist', { error });
      throw error;
    }
  }

  async getUserWishlists(): Promise<Wishlist[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          *,
          wishlist_items (
            *,
            products (id, name, price, images)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch user wishlists', { error });
      return [];
    }
  }

  async addToWishlist(
    wishlistId: string,
    productId: string,
    businessId: string,
    options?: Partial<WishlistItem>
  ): Promise<WishlistItem> {
    try {
      const { data, error } = await supabase
        .from('wishlist_items')
        .insert({
          wishlist_id: wishlistId,
          product_id: productId,
          business_id: businessId,
          ...options,
        })
        .select()
        .single();

      if (error) throw error;
      logger.info('Item added to wishlist', { wishlistId, productId });
      return data;
    } catch (error) {
      logger.error('Failed to add item to wishlist', { error });
      throw error;
    }
  }

  async removeFromWishlist(itemId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      logger.info('Item removed from wishlist', { itemId });
    } catch (error) {
      logger.error('Failed to remove item from wishlist', { error });
      throw error;
    }
  }

  async getOrCreateCart(): Promise<ShoppingCart> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: existingCart, error: fetchError } = await supabase
        .from('shopping_carts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (existingCart) return existingCart;

      const { data: newCart, error: createError } = await supabase
        .from('shopping_carts')
        .insert({
          user_id: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;
      logger.info('Shopping cart created', { cartId: newCart.id });
      return newCart;
    } catch (error) {
      logger.error('Failed to get or create cart', { error });
      throw error;
    }
  }

  async getCart(): Promise<ShoppingCart | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('shopping_carts')
        .select(`
          *,
          cart_items (
            *,
            products (id, name, price, images, business_id),
            businesses (id, name, avatar_url)
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      logger.error('Failed to fetch cart', { error });
      return null;
    }
  }

  async addToCart(
    productId: string,
    businessId: string,
    quantity: number = 1,
    priceAtAdd: number,
    variantOptions?: any
  ): Promise<CartItem> {
    try {
      const cart = await this.getOrCreateCart();

      const { data, error } = await supabase
        .from('cart_items')
        .insert({
          cart_id: cart.id,
          product_id: productId,
          business_id: businessId,
          quantity,
          price_at_add: priceAtAdd,
          variant_options: variantOptions,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('shopping_carts')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', cart.id);

      logger.info('Item added to cart', { productId, cartId: cart.id });
      return data;
    } catch (error) {
      logger.error('Failed to add item to cart', { error });
      throw error;
    }
  }

  async updateCartItemQuantity(itemId: string, quantity: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId);

      if (error) throw error;
      logger.info('Cart item quantity updated', { itemId, quantity });
    } catch (error) {
      logger.error('Failed to update cart item quantity', { error });
      throw error;
    }
  }

  async removeFromCart(itemId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      logger.info('Item removed from cart', { itemId });
    } catch (error) {
      logger.error('Failed to remove item from cart', { error });
      throw error;
    }
  }

  async saveForLater(itemId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ saved_for_later: true })
        .eq('id', itemId);

      if (error) throw error;
      logger.info('Item saved for later', { itemId });
    } catch (error) {
      logger.error('Failed to save item for later', { error });
      throw error;
    }
  }

  async moveToCart(itemId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ saved_for_later: false })
        .eq('id', itemId);

      if (error) throw error;
      logger.info('Item moved to cart', { itemId });
    } catch (error) {
      logger.error('Failed to move item to cart', { error });
      throw error;
    }
  }
}

export const shoppableContentService = new ShoppableContentService();
