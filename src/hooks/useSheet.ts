import React from 'react';

type UseSheetOptions = {
  defaultOpen?: boolean;
};

/**
 * Basic sheet controller used by the Swiss UI placeholders.
 * This is intentionally light-weight and non-opinionated so it can be wired
 * into future bottom sheet components without breaking existing flows.
 */
export function useSheet(options: UseSheetOptions = {}) {
  const { defaultOpen = false } = options;
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => {
    setIsExpanded(false);
    setIsOpen(false);
  }, []);
  const toggle = React.useCallback(() => setIsOpen((v) => !v), []);
  const expand = React.useCallback(() => setIsExpanded(true), []);
  const collapse = React.useCallback(() => setIsExpanded(false), []);

  return {
    isOpen,
    isExpanded,
    open,
    close,
    toggle,
    expand,
    collapse,
  };
}

export default useSheet;
