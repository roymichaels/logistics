import React from 'react';
import GenericMenuPopoverMigration from './GenericMenuPopover.migration';
import { toPopoverProps } from '../../../adapters/ui/popovers/StoreAvatarMenuAdapter';

export default function StoreAvatarPopoverMigration(props: any) {
  const mapped = toPopoverProps(props);
  return <GenericMenuPopoverMigration {...mapped} />;
}
