import React from 'react';
import { SwissMode } from '../components/swiss/SwissContainer';

/**
 * Derives a recommended mode based on viewport width.
 */
export function useSwissMode(defaultMode: SwissMode = 'auto'): SwissMode {
  const [mode, setMode] = React.useState<SwissMode>(defaultMode);

  React.useEffect(() => {
    if (defaultMode !== 'auto') {
      setMode(defaultMode);
      return;
    }
    const update = () => {
      const width = window.innerWidth;
      if (width < 640) setMode('compact');
      else if (width < 960) setMode('card');
      else setMode('table');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [defaultMode]);

  return mode;
}
