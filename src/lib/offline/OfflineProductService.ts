import { unifiedDataStore } from '../storage/UnifiedDataStore';
import { searchEngine } from '../storage/SearchEngine';
import { logger } from '../logger';
import type { Product } from '../../data/types';

export class OfflineProductService {
  private static instance: OfflineProductService;

  private constructor() {
    this.initializeSearch();
  }

  static getInstance(): OfflineProductService {
    if (!OfflineProductService.instance) {
      OfflineProductService.instance = new OfflineProductService();
    }
    return OfflineProductService.instance;
  }

  private async initializeSearch() {
    const products = await this.getAllProducts();
    for (const product of products) {
      searchEngine.indexDocument('products', product.id, {
        name: product.name,
        description: product.description || '',
        sku: product.sku,
        category: product.category || ''
      });
    }
  }

  async getProduct(productId: string): Promise<Product | null> {
    try {
      const product = await unifiedDataStore.get<Product>('products', productId);
      return product || null;
    } catch (error) {
      logger.error('Failed to get product', error as Error, { productId });
      return null;
    }
  }

  async getAllProducts(): Promise<Product[]> {
    try {
      const products = await unifiedDataStore.getAll<Product>('products');
      return products;
    } catch (error) {
      logger.error('Failed to get all products', error as Error);
      return [];
    }
  }

  async createProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product | null> {
    try {
      const newProduct: Product = {
        ...product,
        id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        created_at: new Date().toISOString()
      } as Product;

      await unifiedDataStore.set('products', newProduct.id, newProduct);

      searchEngine.indexDocument('products', newProduct.id, {
        name: newProduct.name,
        description: newProduct.description || '',
        sku: newProduct.sku,
        category: newProduct.category || ''
      });

      logger.info('Created product offline', { productId: newProduct.id });
      return newProduct;
    } catch (error) {
      logger.error('Failed to create product', error as Error);
      return null;
    }
  }

  async updateProduct(productId: string, updates: Partial<Product>): Promise<Product | null> {
    try {
      const existing = await this.getProduct(productId);
      if (!existing) {
        logger.warn('Product not found for update', { productId });
        return null;
      }

      const updated = { ...existing, ...updates };
      await unifiedDataStore.set('products', productId, updated);

      searchEngine.indexDocument('products', productId, {
        name: updated.name,
        description: updated.description || '',
        sku: updated.sku,
        category: updated.category || ''
      });

      logger.info('Updated product offline', { productId });
      return updated;
    } catch (error) {
      logger.error('Failed to update product', error as Error, { productId });
      return null;
    }
  }

  async deleteProduct(productId: string): Promise<boolean> {
    try {
      await unifiedDataStore.remove('products', productId);
      searchEngine.removeDocument('products', productId);
      logger.info('Deleted product offline', { productId });
      return true;
    } catch (error) {
      logger.error('Failed to delete product', error as Error, { productId });
      return false;
    }
  }

  async searchProducts(query: string): Promise<Product[]> {
    try {
      const results = await searchEngine.search('products', query);
      const products = await Promise.all(
        results.map(id => this.getProduct(id))
      );
      return products.filter((p): p is Product => p !== null);
    } catch (error) {
      logger.error('Failed to search products', error as Error, { query });
      return [];
    }
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    try {
      const allProducts = await this.getAllProducts();
      return allProducts.filter(p => p.category === category);
    } catch (error) {
      logger.error('Failed to get products by category', error as Error, { category });
      return [];
    }
  }

  async getLowStockProducts(threshold: number = 10): Promise<Product[]> {
    try {
      const allProducts = await this.getAllProducts();
      return allProducts.filter(p => p.stock_quantity <= threshold);
    } catch (error) {
      logger.error('Failed to get low stock products', error as Error);
      return [];
    }
  }
}

export const offlineProductService = OfflineProductService.getInstance();
