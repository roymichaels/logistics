/**
 * Catalog Service
 *
 * Handles all catalog and product operations with role-based access control.
 * Includes audit logging, permission enforcement, and workflow management.
 */

import { supabase } from '@/lib/supabase';
import { hasPermission, type Permission } from '@/lib/rolePermissions';
import type { BaseService } from '../base/BaseService';

export interface Product {
  id: string;
  business_id: string;
  category_id?: string;
  sku: string;
  name: string;
  name_hebrew?: string;
  description?: string;
  description_hebrew?: string;
  price: number;
  cost?: number;
  compare_at_price?: number;
  currency: string;
  unit: string;
  weight_kg?: number;
  barcode?: string;
  image_url?: string;
  images?: string[];
  tags?: string[];
  status: 'active' | 'inactive' | 'out_of_stock' | 'discontinued';
  is_featured?: boolean;
  track_inventory?: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface ProductCategory {
  id: string;
  business_id: string;
  parent_id?: string;
  name: string;
  name_hebrew?: string;
  slug: string;
  description?: string;
  image_url?: string;
  display_order: number;
  active: boolean;
}

export interface CatalogFilters {
  status?: 'active' | 'inactive' | 'out_of_stock' | 'discontinued';
  category_id?: string;
  is_featured?: boolean;
  search?: string;
  min_price?: number;
  max_price?: number;
  tags?: string[];
  is_visible?: boolean;
}

export interface CatalogStats {
  total: number;
  active: number;
  inactive: number;
  out_of_stock: number;
  published: number;
  draft: number;
}

export class CatalogService {
  private userId: string;
  private userRole: string;
  private businessId: string;

  constructor(userId: string, userRole: string, businessId: string) {
    this.userId = userId;
    this.userRole = userRole;
    this.businessId = businessId;
  }

  /**
   * Check if user has a specific catalog permission
   */
  private hasPermission(permission: Permission): boolean {
    return hasPermission(this.userRole, permission);
  }

  /**
   * Log catalog action to audit log
   */
  private async logAction(
    action: string,
    entityType: string,
    entityId: string | null,
    description: string,
    beforeValue?: any,
    afterValue?: any,
    status: 'success' | 'failed' = 'success',
    errorMessage?: string
  ): Promise<void> {
    try {
      await supabase.from('catalog_audit_logs').insert({
        business_id: this.businessId,
        entity_type: entityType,
        entity_id: entityId,
        action,
        action_category: this.getActionCategory(action),
        description,
        before_value: beforeValue,
        after_value: afterValue,
        performed_by: this.userId,
        performed_at: new Date().toISOString(),
        user_role: this.userRole,
        status,
        error_message: errorMessage,
      });
    } catch (error) {
      console.error('Failed to log catalog action:', error);
    }
  }

  /**
   * Determine action category
   */
  private getActionCategory(action: string): string {
    if (['create', 'update', 'delete'].includes(action)) return 'catalog_management';
    if (action === 'publish' || action === 'unpublish') return 'publishing';
    if (action === 'approve' || action === 'reject') return 'approval';
    if (action.startsWith('bulk_')) return 'bulk_operation';
    if (action === 'export' || action === 'import') return 'export_import';
    return 'catalog_management';
  }

  /**
   * Get products with role-based filtering
   */
  async getProducts(filters: CatalogFilters = {}): Promise<Product[]> {
    // Permission check
    const canViewAll = this.hasPermission('catalog:view_all');
    const canViewActive = this.hasPermission('catalog:view_active');

    if (!canViewAll && !canViewActive) {
      throw new Error('You do not have permission to view products');
    }

    let query = supabase
      .from('products')
      .select('*')
      .eq('business_id', this.businessId);

    // Apply role-based filters
    if (!canViewAll && canViewActive) {
      query = query.eq('status', 'active');
    }

    // Apply user filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    if (filters.is_featured !== undefined) {
      query = query.eq('is_featured', filters.is_featured);
    }

    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`
      );
    }

    if (filters.min_price !== undefined) {
      query = query.gte('price', filters.min_price);
    }

    if (filters.max_price !== undefined) {
      query = query.lte('price', filters.max_price);
    }

    if (filters.is_visible !== undefined) {
      if (filters.is_visible) {
        query = query.or('metadata->is_visible.eq.true,metadata->is_visible.is.null');
      } else {
        query = query.eq('metadata->is_visible', false);
      }
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      await this.logAction(
        'read',
        'product',
        null,
        'Failed to fetch products',
        null,
        null,
        'failed',
        error.message
      );
      throw error;
    }

    return data || [];
  }

  /**
   * Get product by ID
   */
  async getProduct(productId: string): Promise<Product | null> {
    if (!this.hasPermission('catalog:view_all') && !this.hasPermission('catalog:view_active')) {
      throw new Error('You do not have permission to view products');
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('business_id', this.businessId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create a new product
   */
  async createProduct(productData: Partial<Product>): Promise<Product> {
    if (!this.hasPermission('catalog:create')) {
      throw new Error('You do not have permission to create products');
    }

    const newProduct = {
      ...productData,
      business_id: this.businessId,
    };

    const { data, error } = await supabase
      .from('products')
      .insert(newProduct)
      .select()
      .single();

    if (error) {
      await this.logAction(
        'create',
        'product',
        null,
        `Failed to create product: ${productData.name}`,
        null,
        productData,
        'failed',
        error.message
      );
      throw error;
    }

    await this.logAction(
      'create',
      'product',
      data.id,
      `Created product: ${data.name} (${data.sku})`,
      null,
      data
    );

    return data;
  }

  /**
   * Update an existing product
   */
  async updateProduct(productId: string, updates: Partial<Product>): Promise<Product> {
    // Check permissions based on what's being updated
    const isInventoryUpdate = Object.keys(updates).every(key =>
      ['weight_kg', 'metadata', 'track_inventory'].includes(key)
    );
    const isPriceUpdate = Object.keys(updates).some(key =>
      ['price', 'cost', 'compare_at_price'].includes(key)
    );

    if (isInventoryUpdate && !this.hasPermission('catalog:edit_inventory')) {
      throw new Error('You do not have permission to edit inventory');
    } else if (isPriceUpdate && !this.hasPermission('catalog:edit_pricing')) {
      throw new Error('You do not have permission to edit pricing');
    } else if (!isInventoryUpdate && !this.hasPermission('catalog:edit_details')) {
      throw new Error('You do not have permission to edit product details');
    }

    // Get current product
    const { data: currentProduct } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('business_id', this.businessId)
      .single();

    if (!currentProduct) {
      throw new Error('Product not found');
    }

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId)
      .eq('business_id', this.businessId)
      .select()
      .single();

    if (error) {
      await this.logAction(
        'update',
        'product',
        productId,
        `Failed to update product: ${currentProduct.name}`,
        currentProduct,
        { ...currentProduct, ...updates },
        'failed',
        error.message
      );
      throw error;
    }

    await this.logAction(
      'update',
      'product',
      data.id,
      `Updated product: ${data.name} (${data.sku})`,
      currentProduct,
      data
    );

    return data;
  }

  /**
   * Delete a product
   */
  async deleteProduct(productId: string): Promise<void> {
    if (!this.hasPermission('catalog:delete')) {
      throw new Error('You do not have permission to delete products');
    }

    // Get current product
    const { data: currentProduct } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('business_id', this.businessId)
      .single();

    if (!currentProduct) {
      throw new Error('Product not found');
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('business_id', this.businessId);

    if (error) {
      await this.logAction(
        'delete',
        'product',
        productId,
        `Failed to delete product: ${currentProduct.name}`,
        currentProduct,
        null,
        'failed',
        error.message
      );
      throw error;
    }

    await this.logAction(
      'delete',
      'product',
      productId,
      `Deleted product: ${currentProduct.name} (${currentProduct.sku})`,
      currentProduct,
      null
    );
  }

  /**
   * Publish or unpublish a product
   */
  async toggleProductVisibility(productId: string, isVisible: boolean): Promise<Product> {
    if (!this.hasPermission('catalog:publish')) {
      throw new Error('You do not have permission to publish/unpublish products');
    }

    const { data, error } = await supabase
      .from('products')
      .update({
        metadata: { is_visible: isVisible },
      })
      .eq('id', productId)
      .eq('business_id', this.businessId)
      .select()
      .single();

    if (error) throw error;

    await this.logAction(
      isVisible ? 'publish' : 'unpublish',
      'product',
      productId,
      `${isVisible ? 'Published' : 'Unpublished'} product: ${data.name}`,
      { is_visible: !isVisible },
      { is_visible: isVisible }
    );

    return data;
  }

  /**
   * Bulk publish/unpublish products
   */
  async bulkToggleVisibility(productIds: string[], isVisible: boolean): Promise<void> {
    if (!this.hasPermission('catalog:publish')) {
      throw new Error('You do not have permission to publish/unpublish products');
    }

    const { error } = await supabase
      .from('products')
      .update({
        metadata: { is_visible: isVisible },
      })
      .in('id', productIds)
      .eq('business_id', this.businessId);

    if (error) {
      await this.logAction(
        isVisible ? 'bulk_publish' : 'bulk_unpublish',
        'bulk_operation',
        null,
        `Failed to ${isVisible ? 'publish' : 'unpublish'} ${productIds.length} products`,
        null,
        { product_ids: productIds, is_visible: isVisible },
        'failed',
        error.message
      );
      throw error;
    }

    await this.logAction(
      isVisible ? 'bulk_publish' : 'bulk_unpublish',
      'bulk_operation',
      null,
      `${isVisible ? 'Published' : 'Unpublished'} ${productIds.length} products`,
      null,
      { product_ids: productIds, is_visible: isVisible }
    );
  }

  /**
   * Get catalog statistics
   */
  async getCatalogStats(): Promise<CatalogStats> {
    if (!this.hasPermission('catalog:view_business')) {
      throw new Error('You do not have permission to view catalog statistics');
    }

    const { data: products } = await supabase
      .from('products')
      .select('status, metadata')
      .eq('business_id', this.businessId);

    if (!products) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        out_of_stock: 0,
        published: 0,
        draft: 0,
      };
    }

    const stats = {
      total: products.length,
      active: products.filter(p => p.status === 'active').length,
      inactive: products.filter(p => p.status === 'inactive').length,
      out_of_stock: products.filter(p => p.status === 'out_of_stock').length,
      published: products.filter(
        p => !p.metadata?.is_visible || p.metadata.is_visible === true
      ).length,
      draft: products.filter(p => p.metadata?.is_visible === false).length,
    };

    return stats;
  }

  /**
   * Get product categories
   */
  async getCategories(activeOnly: boolean = false): Promise<ProductCategory[]> {
    if (!this.hasPermission('catalog:view_business')) {
      throw new Error('You do not have permission to view categories');
    }

    let query = supabase
      .from('product_categories')
      .select('*')
      .eq('business_id', this.businessId)
      .order('display_order', { ascending: true });

    if (activeOnly) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Create a new category
   */
  async createCategory(categoryData: Partial<ProductCategory>): Promise<ProductCategory> {
    if (!this.hasPermission('catalog:manage_categories')) {
      throw new Error('You do not have permission to manage categories');
    }

    const newCategory = {
      ...categoryData,
      business_id: this.businessId,
    };

    const { data, error } = await supabase
      .from('product_categories')
      .insert(newCategory)
      .select()
      .single();

    if (error) throw error;

    await this.logAction(
      'create',
      'category',
      data.id,
      `Created category: ${data.name}`,
      null,
      data
    );

    return data;
  }

  /**
   * Export catalog data
   */
  async exportCatalog(format: 'json' | 'csv' = 'json'): Promise<any> {
    if (!this.hasPermission('catalog:export')) {
      throw new Error('You do not have permission to export catalog data');
    }

    const products = await this.getProducts();

    await this.logAction(
      'export',
      'bulk_operation',
      null,
      `Exported ${products.length} products as ${format}`,
      null,
      { format, product_count: products.length }
    );

    if (format === 'json') {
      return products;
    }

    // Convert to CSV
    if (products.length === 0) return '';

    const headers = Object.keys(products[0]).join(',');
    const rows = products.map(product =>
      Object.values(product)
        .map(val => {
          if (typeof val === 'object') return JSON.stringify(val);
          if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
          return val;
        })
        .join(',')
    );

    return [headers, ...rows].join('\n');
  }
}
