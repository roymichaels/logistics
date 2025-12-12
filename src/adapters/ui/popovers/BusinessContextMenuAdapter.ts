export function toPopoverProps(legacyProps: any) {
  return {
    open: legacyProps?.open ?? legacyProps?.isOpen ?? false,
    anchorEl: legacyProps?.anchorEl ?? legacyProps?.anchorRef ?? null,
    onClose: legacyProps?.onClose || (() => {}),
    content: legacyProps?.children ?? legacyProps?.content ?? null,
    placement: legacyProps?.placement ?? 'bottom'
  };
}
