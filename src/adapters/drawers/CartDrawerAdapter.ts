export function toDrawerProps(legacyProps: any) {
  return {
    isOpen: legacyProps?.open ?? legacyProps?.visible ?? false,
    onClose: legacyProps?.onClose || (() => {}),
    side: 'right',
    children: legacyProps?.children,
    title: legacyProps?.title,
    subtitle: legacyProps?.subtitle,
    footer: legacyProps?.footer,
    actions: legacyProps?.actions
  };
}
