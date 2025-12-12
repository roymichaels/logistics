import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import UnifiedShellRouter from "../UnifiedShellRouter";
import { migrationFlags } from "../flags";
import LegacyPage from "../../pages/ManagerInventory.tsx";

export default function ManagerInventoryLegacyRoute(props: any) {
  if (!migrationFlags.unifiedShell) {
    return <LegacyPage {...props} />;
  }

  const { setTitle } = usePageTitle();
  React.useEffect(() => {
    setTitle("Manager Inventory");
  }, []);

  return (
    <UnifiedShellRouter>
      <LegacyPage {...props} />
    </UnifiedShellRouter>
  );
}
