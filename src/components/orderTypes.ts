import { Product } from '../../data/types';

export interface DraftOrderItem {
  draftId: string;
  product: Product;
  quantity: number;
  source_location?: string | null;
}

export interface ProductInventoryAvailability {
  totalAvailable: number;
  byLocation: Array<{
    locationId: string;
    locationName: string;
    available: number;
  }>;
}
