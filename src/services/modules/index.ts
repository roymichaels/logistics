/**
 * Service Modules Index
 *
 * Central export for all service modules.
 * These services replace the monolithic supabaseDataStore.ts
 */

export { BaseService } from '../base/BaseService';
export { InventoryService } from './InventoryService';
export { ZoneService } from './ZoneService';
export { DriverService } from './DriverService';
export { OrderService } from './OrderService';
export { ContextService } from './ContextService';
export { ProductCatalogService } from './ProductCatalogService';
export { CustomerService } from './CustomerService';
export { CartService } from './CartService';
export { OrderManagementService } from './OrderManagementService';

export type {
  UserActiveContext,
  Infrastructure,
  Business,
  UserBusinessAccess,
  SwitchContextInput
} from './ContextService';

export type {
  ProductCategory,
  Product,
  ProductVariant,
  ProductImage,
  ProductTag,
  ProductReview,
  CreateCategoryInput,
  CreateProductInput,
  CreateVariantInput,
  CreateReviewInput
} from './ProductCatalogService';

export type {
  CustomerProfile,
  CustomerAddress,
  GuestCheckout,
  Wishlist,
  WishlistItem,
  RecentlyViewedProduct,
  CreateProfileInput,
  CreateAddressInput,
  CreateGuestCheckoutInput
} from './CustomerService';

export type {
  ShoppingCart,
  CartItem,
  CartItemWithProduct,
  CartSummary,
  AddToCartInput
} from './CartService';

export type {
  Order,
  OrderItem,
  OrderStatusHistory,
  PaymentTransaction,
  CreateOrderFromCartInput,
  OrderWithDetails
} from './OrderManagementService';
