import React from 'react';
import GenericMenuPopoverMigration from './GenericMenuPopover.migration';
import { toPopoverProps } from '../../../adapters/ui/popovers/BusinessContextMenuAdapter';

export default function BusinessContextPopoverMigration(props: any) {
  const mapped = toPopoverProps(props);
  return <GenericMenuPopoverMigration {...mapped} />;
}
