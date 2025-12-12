import React from 'react';

// Placeholder legacy drawer wrapper for migration bridging.
// Real legacy drawers remain untouched; this serves as a stand-in resolver target.
export default function LegacyDrawer(props: any) {
  return <div {...props} />;
}
