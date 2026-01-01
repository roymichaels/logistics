import { InventoryItemEntity, RestockRequestEntity } from './entities';
import type { InventoryItem, RestockRequest, InventoryBalance } from './entities';
import { logger } from '@/lib/logger';

export class InventoryDomainService {
  calculateBalance(items: InventoryItem[]): InventoryBalance {
    if (items.length === 0) {
      throw new Error('Cannot calculate balance with empty items array');
    }

    const productId = items[0].product_id;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const reservedQuantity = items.reduce((sum, item) => sum + (item.reserved_quantity || 0), 0);

    const locations = items
      .filter(item => item.warehouse_location)
      .map(item => ({
        location: item.warehouse_location!,
        quantity: item.quantity,
      }));

    return {
      product_id: productId,
      total_quantity: totalQuantity,
      available_quantity: totalQuantity - reservedQuantity,
      reserved_quantity: reservedQuantity,
      locations,
    };
  }

  findLowStockItems(items: InventoryItem[]): InventoryItem[] {
    return items.filter(item => {
      const entity = new InventoryItemEntity(item);
      return entity.isLowStock;
    });
  }

  findOutOfStockItems(items: InventoryItem[]): InventoryItem[] {
    return items.filter(item => {
      const entity = new InventoryItemEntity(item);
      return entity.isOutOfStock;
    });
  }

  canAllocate(item: InventoryItem, requestedQuantity: number): boolean {
    const entity = new InventoryItemEntity(item);
    return entity.canFulfill(requestedQuantity);
  }

  calculateRestockPriority(item: InventoryItem): 'low' | 'medium' | 'high' | 'urgent' {
    const entity = new InventoryItemEntity(item);

    if (entity.isOutOfStock) {
      return 'urgent';
    }

    if (!item.reorder_level) {
      return 'low';
    }

    const percentageRemaining = (item.quantity / item.reorder_level) * 100;

    if (percentageRemaining <= 25) {
      return 'high';
    } else if (percentageRemaining <= 50) {
      return 'medium';
    }

    return 'low';
  }

  validateRestockRequest(request: RestockRequest, currentStock: number): {
    valid: boolean;
    reason?: string;
  } {
    const entity = new RestockRequestEntity(request);

    if (!entity.canApprove() && !entity.canFulfill()) {
      return {
        valid: false,
        reason: `Request is in ${request.status} status and cannot be processed`,
      };
    }

    if (request.requested_quantity <= 0) {
      return {
        valid: false,
        reason: 'Requested quantity must be greater than 0',
      };
    }

    return { valid: true };
  }

  aggregateInventoryByProduct(items: InventoryItem[]): Map<string, InventoryItem[]> {
    const map = new Map<string, InventoryItem[]>();

    items.forEach(item => {
      const existing = map.get(item.product_id) || [];
      existing.push(item);
      map.set(item.product_id, existing);
    });

    return map;
  }

  calculateTotalValue(items: InventoryItem[], priceMap: Map<string, number>): number {
    return items.reduce((total, item) => {
      const price = priceMap.get(item.product_id) || 0;
      return total + (item.quantity * price);
    }, 0);
  }

  predictRestockDate(
    item: InventoryItem,
    dailyUsageRate: number
  ): Date | null {
    if (dailyUsageRate <= 0) {
      logger.warn('[InventoryDomainService] Invalid daily usage rate', { dailyUsageRate });
      return null;
    }

    const entity = new InventoryItemEntity(item);
    const daysUntilReorder = Math.floor(entity.availableQuantity / dailyUsageRate);

    if (daysUntilReorder <= 0) {
      return new Date();
    }

    const predictedDate = new Date();
    predictedDate.setDate(predictedDate.getDate() + daysUntilReorder);

    return predictedDate;
  }
}
