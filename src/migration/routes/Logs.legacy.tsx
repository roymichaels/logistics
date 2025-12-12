import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import UnifiedShellRouter from "../UnifiedShellRouter";
import { migrationFlags } from "../flags";
import LegacyPage from "../../pages/Logs.tsx";

export default function LogsLegacyRoute(props: any) {
  if (!migrationFlags.unifiedShell) {
    return <LegacyPage {...props} />;
  }

  const { setTitle } = usePageTitle();
  React.useEffect(() => {
    setTitle("Logs");
  }, []);

  return (
    <UnifiedShellRouter>
      <LegacyPage {...props} />
    </UnifiedShellRouter>
  );
}
