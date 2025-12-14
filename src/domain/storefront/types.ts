export interface Product {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  category?: string;
  imageUrls?: string[];
  stock?: number;
  sku?: string;
  status: 'active' | 'inactive' | 'out_of_stock';
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
}

export interface Cart {
  id: string;
  userId: string;
  businessId: string;
  items: CartItem[];
  createdAt: number;
  updatedAt: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  businessId: string;
  customerId: string;
  items: OrderItem[];
  total: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'in_transit' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  deliveryAddress?: Address;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Address {
  street: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}
