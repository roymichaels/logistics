import React from 'react';

// Placeholder legacy modal wrapper for migration bridging.
// Real legacy modals remain untouched; this serves as a stand-in resolver target.
export default function LegacyModal(props: any) {
  return <div {...props} />;
}
