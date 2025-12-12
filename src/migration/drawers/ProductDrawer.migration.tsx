import React from 'react';
import { Drawer } from '../../components/primitives/Drawer';
import { DrawerHeader } from '../../components/primitives/drawer-parts/DrawerHeader';
import { DrawerBody } from '../../components/primitives/drawer-parts/DrawerBody';
import { DrawerFooter } from '../../components/primitives/drawer-parts/DrawerFooter';

export default function ProductDrawerMigration(props: any) {
  const { isOpen, onClose, product } = props;
  return (
    <Drawer isOpen={!!isOpen} onClose={onClose}>
      <DrawerHeader title={product?.name || 'Product'} subtitle={product?.price ? `₪${product.price}` : undefined} onClose={onClose} />
      <DrawerBody>
        <div style={{ display: 'grid', gap: 8, color: 'var(--color-text)' }}>
          <div>{product?.description || 'No description available.'}</div>
        </div>
      </DrawerBody>
      <DrawerFooter>
        <button
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-primary)',
            color: '#fff',
            cursor: 'pointer'
          }}
          onClick={onClose}
        >
          Close
        </button>
      </DrawerFooter>
    </Drawer>
  );
}
