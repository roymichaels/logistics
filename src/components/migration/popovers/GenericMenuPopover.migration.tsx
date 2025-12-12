import React from 'react';
import { Popover } from '../../primitives/Popover';

type GenericMenuPopoverProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  content: React.ReactNode;
};

export default function GenericMenuPopoverMigration({ open, anchorEl, onClose, content }: GenericMenuPopoverProps) {
  return (
    <Popover
      isOpen={open}
      anchorRef={{ current: anchorEl }}
      onClose={onClose}
    >
      {content}
    </Popover>
  );
}
