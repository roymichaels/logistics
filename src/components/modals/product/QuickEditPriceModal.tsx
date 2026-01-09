import React, { useState } from 'react';
import { BaseModal } from '../BaseModal';
import { DollarSign } from 'lucide-react';

interface QuickEditPriceModalProps {
  productName: string;
  currentPrice: number;
  onSave: (newPrice: number) => Promise<void>;
  onClose: () => void;
}

export function QuickEditPriceModal({
  productName,
  currentPrice,
  onSave,
  onClose,
}: QuickEditPriceModalProps) {
  const [price, setPrice] = useState(currentPrice);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (price <= 0) return;

    setIsLoading(true);
    try {
      await onSave(price);
      onClose();
    } catch (error) {
      console.error('Failed to update price:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanged = price !== currentPrice;
  const priceChange = price - currentPrice;
  const percentChange = currentPrice > 0 ? (priceChange / currentPrice) * 100 : 0;

  return (
    <BaseModal
      title="Update Price"
      onClose={onClose}
      size="sm"
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
            disabled={!hasChanged || price <= 0 || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Updating...' : 'Update Price'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-1">Product</p>
          <p className="font-medium">{productName}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Price
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign size={20} className="text-gray-400" />
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              className="w-full pl-10 pr-3 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
              autoFocus
            />
          </div>
        </div>

        {hasChanged && (
          <div className={`
            p-3 rounded-lg
            ${priceChange > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}
          `}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Change:</span>
              <span className={`text-sm font-semibold ${priceChange > 0 ? 'text-green-700' : 'text-red-700'}`}>
                {priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)} ({percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%)
              </span>
            </div>
          </div>
        )}

        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Current Price:</span>
            <span className="font-medium">${currentPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
