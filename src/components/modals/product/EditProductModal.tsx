import React, { useState } from 'react';
import { BaseModal } from '../BaseModal';
import { DollarSign, Package, Image as ImageIcon } from 'lucide-react';
import { ImageUploadZone } from '../../atoms/ImageUploadZone';
import { logger } from '../../../lib/logger';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock_quantity?: number;
  sku?: string;
  category?: string;
  is_active?: boolean;
  image_url?: string;
}

interface EditProductModalProps {
  product: Product;
  onSave: (updates: Partial<Product>) => Promise<void>;
  onClose: () => void;
}

export function EditProductModal({
  product,
  onSave,
  onClose,
}: EditProductModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'pricing' | 'inventory'>('details');
  const [formData, setFormData] = useState({
    name: product.name,
    description: product.description || '',
    price: product.price,
    stock_quantity: product.stock_quantity || 0,
    sku: product.sku || '',
    category: product.category || '',
    is_active: product.is_active ?? true,
    image_url: product.image_url || '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify({
    name: product.name,
    description: product.description || '',
    price: product.price,
    stock_quantity: product.stock_quantity || 0,
    sku: product.sku || '',
    category: product.category || '',
    is_active: product.is_active ?? true,
    image_url: product.image_url || '',
  });

  return (
    <BaseModal
      title="Edit Product"
      onClose={onClose}
      size="xl"
      footer={
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || !formData.name.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('details')}
              className={`
                px-4 py-2 border-b-2 transition-colors
                ${activeTab === 'details'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                }
              `}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`
                px-4 py-2 border-b-2 transition-colors flex items-center gap-2
                ${activeTab === 'pricing'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <DollarSign size={16} />
              Pricing
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`
                px-4 py-2 border-b-2 transition-colors flex items-center gap-2
                ${activeTab === 'inventory'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <Package size={16} />
              Inventory
            </button>
          </div>
        </div>

        {activeTab === 'details' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Product name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Product description..."
                rows={4}
              />
            </div>

            <div>
              <ImageUploadZone
                uploadType="product"
                currentImageUrl={formData.image_url}
                onImageSelect={(file) => {
                  logger.info('Product image file selected', { fileName: file.name });
                }}
                label="Product Image"
                helperText="Square image recommended, up to 5MB"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Electronics, Food, Fashion"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">
                Product is active and visible to customers
              </label>
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign size={16} className="text-gray-400" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Pricing Tips</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Consider your costs and desired profit margin</li>
                <li>• Research competitor pricing</li>
                <li>• Factor in delivery fees and taxes</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU (Stock Keeping Unit)
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., PROD-001"
              />
            </div>

            {formData.stock_quantity < 10 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Low stock warning: Consider restocking this product soon.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
