/**
 * Product Catalog Service
 *
 * Manages product catalog including categories, variants, images, tags, and reviews.
 * Provides comprehensive e-commerce product management functionality.
 */

import { BaseService } from '../base/BaseService';
import { logger } from '../../lib/logger';

export interface ProductCategory {
  id: string;
  business_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  active: boolean;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  sku: string | null;
  slug: string | null;
  description: string | null;
  short_description: string | null;
  primary_image_url: string | null;
  price: number;
  cost_price: number | null;
  compare_at_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  track_inventory: boolean;
  active: boolean;
  featured: boolean;
  meta_title: string | null;
  meta_description: string | null;
  weight: number | null;
  weight_unit: string;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  option1_name: string | null;
  option1_value: string | null;
  option2_name: string | null;
  option2_value: string | null;
  option3_name: string | null;
  option3_value: string | null;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  stock_quantity: number;
  image_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface ProductTag {
  id: string;
  business_id: string;
  name: string;
  slug: string;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  comment: string | null;
  verified_purchase: boolean;
  helpful_count: number;
  approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryInput {
  business_id: string;
  parent_id?: string | null;
  name: string;
  description?: string;
  image_url?: string;
  display_order?: number;
}

export interface CreateProductInput {
  business_id: string;
  category_id?: string;
  name: string;
  sku?: string;
  description?: string;
  short_description?: string;
  price: number;
  compare_at_price?: number;
  cost_price?: number;
  stock_quantity?: number;
  track_inventory?: boolean;
  weight?: number;
  weight_unit?: string;
  primary_image_url?: string;
}

export interface CreateVariantInput {
  product_id: string;
  name: string;
  sku: string;
  price: number;
  option1_name?: string;
  option1_value?: string;
  option2_name?: string;
  option2_value?: string;
  option3_name?: string;
  option3_value?: string;
  stock_quantity?: number;
  image_url?: string;
}

export interface CreateReviewInput {
  product_id: string;
  rating: number;
  title?: string;
  comment?: string;
  order_id?: string;
}

export class ProductCatalogService extends BaseService {
  // ===== Categories =====

  async listCategories(filters?: {
    parent_id?: string | null;
    active?: boolean;
  }): Promise<ProductCategory[]> {
    try {
      let query = this.supabase
        .from('product_categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (filters?.parent_id !== undefined) {
        if (filters.parent_id === null) {
          query = query.is('parent_id', null);
        } else {
          query = query.eq('parent_id', filters.parent_id);
        }
      }

      if (filters?.active !== undefined) {
        query = query.eq('active', filters.active);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Failed to list categories:', error);
      throw error;
    }
  }

  async getCategory(id: string): Promise<ProductCategory | null> {
    try {
      const { data, error } = await this.supabase
        .from('product_categories')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get category:', error);
      throw error;
    }
  }

  async createCategory(input: CreateCategoryInput): Promise<ProductCategory> {
    try {
      const slug = this.generateSlug(input.name);

      const { data, error } = await this.supabase
        .from('product_categories')
        .insert({
          ...input,
          slug,
          display_order: input.display_order ?? 0
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Category created', { categoryId: data.id, name: input.name });
      return data;
    } catch (error) {
      logger.error('Failed to create category:', error);
      throw error;
    }
  }

  async updateCategory(id: string, updates: Partial<CreateCategoryInput>): Promise<void> {
    try {
      const updateData: any = { ...updates };

      if (updates.name) {
        updateData.slug = this.generateSlug(updates.name);
      }

      const { error } = await this.supabase
        .from('product_categories')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      logger.info('Category updated', { categoryId: id });
    } catch (error) {
      logger.error('Failed to update category:', error);
      throw error;
    }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('product_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      logger.info('Category deleted', { categoryId: id });
    } catch (error) {
      logger.error('Failed to delete category:', error);
      throw error;
    }
  }

  // ===== Products =====

  async listProducts(filters?: {
    category_id?: string;
    active?: boolean;
    featured?: boolean;
    search?: string;
  }): Promise<Product[]> {
    try {
      let query = this.supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      if (filters?.active !== undefined) {
        query = query.eq('active', filters.active);
      }

      if (filters?.featured !== undefined) {
        query = query.eq('featured', filters.featured);
      }

      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Failed to list products:', error);
      throw error;
    }
  }

  async getProduct(id: string): Promise<Product | null> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get product:', error);
      throw error;
    }
  }

  async getProductBySlug(businessId: string, slug: string): Promise<Product | null> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get product by slug:', error);
      throw error;
    }
  }

  async createProduct(input: CreateProductInput): Promise<Product> {
    try {
      const slug = this.generateSlug(input.name);

      const { data, error } = await this.supabase
        .from('products')
        .insert({
          ...input,
          slug,
          stock_quantity: input.stock_quantity ?? 0,
          track_inventory: input.track_inventory ?? true,
          weight_unit: input.weight_unit ?? 'kg',
          active: true,
          featured: false
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Product created', { productId: data.id, name: input.name });
      return data;
    } catch (error) {
      logger.error('Failed to create product:', error);
      throw error;
    }
  }

  async updateProduct(id: string, updates: Partial<CreateProductInput>): Promise<void> {
    try {
      const updateData: any = { ...updates };

      if (updates.name) {
        updateData.slug = this.generateSlug(updates.name);
      }

      const { error } = await this.supabase
        .from('products')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      logger.info('Product updated', { productId: id });
    } catch (error) {
      logger.error('Failed to update product:', error);
      throw error;
    }
  }

  async deleteProduct(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      logger.info('Product deleted', { productId: id });
    } catch (error) {
      logger.error('Failed to delete product:', error);
      throw error;
    }
  }

  // ===== Variants =====

  async listVariants(productId: string): Promise<ProductVariant[]> {
    try {
      const { data, error } = await this.supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to list variants:', error);
      throw error;
    }
  }

  async createVariant(input: CreateVariantInput): Promise<ProductVariant> {
    try {
      const { data, error } = await this.supabase
        .from('product_variants')
        .insert({
          ...input,
          stock_quantity: input.stock_quantity ?? 0,
          active: true
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Variant created', { variantId: data.id, productId: input.product_id });
      return data;
    } catch (error) {
      logger.error('Failed to create variant:', error);
      throw error;
    }
  }

  async updateVariant(id: string, updates: Partial<CreateVariantInput>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('product_variants')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      logger.info('Variant updated', { variantId: id });
    } catch (error) {
      logger.error('Failed to update variant:', error);
      throw error;
    }
  }

  async deleteVariant(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('product_variants')
        .delete()
        .eq('id', id);

      if (error) throw error;

      logger.info('Variant deleted', { variantId: id });
    } catch (error) {
      logger.error('Failed to delete variant:', error);
      throw error;
    }
  }

  // ===== Images =====

  async listImages(productId: string): Promise<ProductImage[]> {
    try {
      const { data, error } = await this.supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to list images:', error);
      throw error;
    }
  }

  async addImage(productId: string, imageUrl: string, altText?: string, isPrimary?: boolean): Promise<ProductImage> {
    try {
      const images = await this.listImages(productId);
      const displayOrder = images.length;

      const { data, error } = await this.supabase
        .from('product_images')
        .insert({
          product_id: productId,
          image_url: imageUrl,
          alt_text: altText,
          display_order: displayOrder,
          is_primary: isPrimary ?? false
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Image added', { imageId: data.id, productId });
      return data;
    } catch (error) {
      logger.error('Failed to add image:', error);
      throw error;
    }
  }

  async deleteImage(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('product_images')
        .delete()
        .eq('id', id);

      if (error) throw error;

      logger.info('Image deleted', { imageId: id });
    } catch (error) {
      logger.error('Failed to delete image:', error);
      throw error;
    }
  }

  // ===== Tags =====

  async listTags(businessId: string): Promise<ProductTag[]> {
    try {
      const { data, error } = await this.supabase
        .from('product_tags')
        .select('*')
        .eq('business_id', businessId)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to list tags:', error);
      throw error;
    }
  }

  async createTag(businessId: string, name: string): Promise<ProductTag> {
    try {
      const slug = this.generateSlug(name);

      const { data, error } = await this.supabase
        .from('product_tags')
        .insert({
          business_id: businessId,
          name,
          slug
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Tag created', { tagId: data.id, name });
      return data;
    } catch (error) {
      logger.error('Failed to create tag:', error);
      throw error;
    }
  }

  async assignTagToProduct(productId: string, tagId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('product_tag_assignments')
        .insert({
          product_id: productId,
          tag_id: tagId
        });

      if (error) throw error;

      logger.info('Tag assigned to product', { productId, tagId });
    } catch (error) {
      logger.error('Failed to assign tag:', error);
      throw error;
    }
  }

  async removeTagFromProduct(productId: string, tagId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('product_tag_assignments')
        .delete()
        .eq('product_id', productId)
        .eq('tag_id', tagId);

      if (error) throw error;

      logger.info('Tag removed from product', { productId, tagId });
    } catch (error) {
      logger.error('Failed to remove tag:', error);
      throw error;
    }
  }

  // ===== Reviews =====

  async listReviews(productId: string, approvedOnly: boolean = true): Promise<ProductReview[]> {
    try {
      let query = this.supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (approvedOnly) {
        query = query.eq('approved', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Failed to list reviews:', error);
      throw error;
    }
  }

  async createReview(input: CreateReviewInput): Promise<ProductReview> {
    try {
      if (input.rating < 1 || input.rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const { data, error } = await this.supabase
        .from('product_reviews')
        .insert({
          ...input,
          user_id: this.userTelegramId,
          verified_purchase: !!input.order_id,
          approved: false
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Review created', { reviewId: data.id, productId: input.product_id });
      return data;
    } catch (error) {
      logger.error('Failed to create review:', error);
      throw error;
    }
  }

  async approveReview(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('product_reviews')
        .update({ approved: true })
        .eq('id', id);

      if (error) throw error;

      logger.info('Review approved', { reviewId: id });
    } catch (error) {
      logger.error('Failed to approve review:', error);
      throw error;
    }
  }

  // ===== Helper Methods =====

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}
