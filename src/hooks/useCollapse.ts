import React from 'react';

/**
 * Simple collapse/expand helper with controlled override.
 */
export function useCollapse(initial = true, controlled?: boolean) {
  const [open, setOpen] = React.useState(initial);

  const isControlled = controlled !== undefined;
  const value = isControlled ? controlled : open;

  const toggle = () => {
    if (!isControlled) setOpen((v) => !v);
  };

  const expand = () => {
    if (!isControlled) setOpen(true);
  };

  const collapse = () => {
    if (!isControlled) setOpen(false);
  };

  return { open: value, toggle, expand, collapse };
}
