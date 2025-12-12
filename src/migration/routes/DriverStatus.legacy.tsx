import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import UnifiedShellRouter from "../UnifiedShellRouter";
import { migrationFlags } from "../flags";
import LegacyPage from "../../pages/DriverStatus.tsx";

export default function DriverStatusLegacyRoute(props: any) {
  if (!migrationFlags.unifiedShell) {
    return <LegacyPage {...props} />;
  }

  const { setTitle } = usePageTitle();
  React.useEffect(() => {
    setTitle("Driver Status");
  }, []);

  return (
    <UnifiedShellRouter>
      <LegacyPage {...props} />
    </UnifiedShellRouter>
  );
}
