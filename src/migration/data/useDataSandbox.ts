import { useMemo } from 'react';
import { useDataSandboxContext } from './DataSandboxContext';
import { migrationFlags } from '../flags';
import { FRONTEND_SANDBOX } from './FRONTEND_SANDBOX';

export function useDataSandbox() {
  const ctx = useDataSandboxContext();

  if (!migrationFlags.dataSandbox || !ctx) {
    return {
      active: false,
      sandbox: FRONTEND_SANDBOX,
      updateSandbox: () => {},
      update: () => {}
    };
  }

  const update = (partial: any) => ctx.updateSandbox(partial);

  return useMemo(
    () => ({
      active: true,
      sandbox: ctx.sandbox,
      updateSandbox: ctx.updateSandbox,
      update
    }),
    [ctx.sandbox, ctx.updateSandbox]
  );
}

export default useDataSandbox;
