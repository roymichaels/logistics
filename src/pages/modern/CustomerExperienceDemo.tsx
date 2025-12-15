import React, { useState } from 'react';
import { CatalogPage } from './CatalogPage';
import { ProductDetailPage } from './ProductDetailPage';
import { OrdersPage } from './OrdersPage';
import { OrderTrackingPage } from './OrderTrackingPage';
import { CartDrawer } from '@/components/modern/CartDrawer';
import type { Product, Order } from '@/data/types';

interface CustomerExperienceDemoProps {
  dataStore: any;
}

type View =
  | 'catalog'
  | 'product-detail'
  | 'orders'
  | 'order-tracking';

export function CustomerExperienceDemo({ dataStore }: CustomerExperienceDemoProps) {
  const [currentView, setCurrentView] = useState<View>('catalog');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setCurrentView('product-detail');
  };

  const handleAddToCart = (product: Product) => {
    setIsCartOpen(true);
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setCurrentView('order-tracking');
  };

  const handleBackToCatalog = () => {
    setCurrentView('catalog');
    setSelectedProduct(null);
  };

  const handleBackToOrders = () => {
    setCurrentView('orders');
    setSelectedOrder(null);
  };

  const handleNavigate = (dest: string) => {
    if (dest === '/orders' || dest === 'orders') {
      setCurrentView('orders');
    } else if (dest === '/catalog' || dest === 'catalog') {
      setCurrentView('catalog');
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '12px',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <button
          onClick={() => setCurrentView('catalog')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: currentView === 'catalog' ? '#3b82f6' : 'white',
            color: currentView === 'catalog' ? 'white' : '#1f2937',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Catalog
        </button>
        <button
          onClick={() => setCurrentView('orders')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: currentView === 'orders' || currentView === 'order-tracking' ? '#3b82f6' : 'white',
            color: currentView === 'orders' || currentView === 'order-tracking' ? 'white' : '#1f2937',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Orders
        </button>
        <div style={{ marginLeft: 'auto', padding: '8px 16px', color: '#6b7280' }}>
          MEGA WAVE 5 - Phase 2 Demo
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {currentView === 'catalog' && (
          <CatalogPage
            dataStore={dataStore}
            onNavigate={handleNavigate}
            onProductClick={handleProductClick}
            onCartOpen={() => setIsCartOpen(true)}
          />
        )}

        {currentView === 'product-detail' && selectedProduct && (
          <ProductDetailPage
            productId={selectedProduct.id}
            dataStore={dataStore}
            onBack={handleBackToCatalog}
            onAddToCart={handleAddToCart}
            onBuyNow={handleAddToCart}
          />
        )}

        {currentView === 'orders' && (
          <OrdersPage
            dataStore={dataStore}
            onOrderClick={handleOrderClick}
          />
        )}

        {currentView === 'order-tracking' && selectedOrder && (
          <OrderTrackingPage
            orderId={selectedOrder.id}
            dataStore={dataStore}
            onBack={handleBackToOrders}
            onCancelOrder={(orderId) => {
              console.log('Cancel order:', orderId);
            }}
            onContactDriver={(driverId) => {
              console.log('Contact driver:', driverId);
            }}
          />
        )}
      </div>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={() => {
          console.log('Proceed to checkout');
        }}
      />
    </div>
  );
}
