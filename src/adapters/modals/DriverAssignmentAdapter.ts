export function toModalProps(legacyProps: any) {
  return {
    isOpen: legacyProps?.open ?? legacyProps?.visible ?? false,
    onClose: legacyProps?.onClose || legacyProps?.onDismiss || (() => {}),
    title: legacyProps?.title,
    subtitle: legacyProps?.subtitle,
    children: legacyProps?.children,
    footer: legacyProps?.footer,
    actions: legacyProps?.actions
  };
}
