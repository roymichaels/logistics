import React from 'react';
import { Drawer } from '../../components/primitives/Drawer';
import { DrawerHeader } from '../../components/primitives/drawer-parts/DrawerHeader';
import { DrawerBody } from '../../components/primitives/drawer-parts/DrawerBody';
import { DrawerFooter } from '../../components/primitives/drawer-parts/DrawerFooter';
import { toDrawerProps } from '../../adapters/drawers/AddProductDrawerAdapter';
import Legacy from '../../components/AddProductDrawer';

export default function AddProductDrawerMigration(props: any) {
  const mapped = toDrawerProps(props);
  const content = mapped.children || props.children || <Legacy {...props} />;
  const actions = mapped.footer || mapped.actions;

  return (
    <Drawer isOpen={mapped.isOpen} onClose={mapped.onClose}>
      <DrawerHeader title={mapped.title} subtitle={mapped.subtitle} onClose={mapped.onClose} />
      <DrawerBody>{content}</DrawerBody>
      {actions && <DrawerFooter>{actions}</DrawerFooter>}
    </Drawer>
  );
}
