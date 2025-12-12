import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import UnifiedShellRouter from "../UnifiedShellRouter";
import { migrationFlags } from "../flags";
import LegacyPage from "../../pages/Profile.tsx";

export default function ProfileLegacyRoute(props: any) {
  if (!migrationFlags.unifiedShell) {
    return <LegacyPage {...props} />;
  }

  const { setTitle } = usePageTitle();
  React.useEffect(() => {
    setTitle("Profile");
  }, []);

  return (
    <UnifiedShellRouter>
      <LegacyPage {...props} />
    </UnifiedShellRouter>
  );
}
