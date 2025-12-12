import React from 'react';
import GenericMenuPopoverMigration from './GenericMenuPopover.migration';
import { toPopoverProps } from '../../../adapters/ui/popovers/UserMenuAdapter';

export default function UserMenuPopoverMigration(props: any) {
  const mapped = toPopoverProps(props);
  return <GenericMenuPopoverMigration {...mapped} />;
}
