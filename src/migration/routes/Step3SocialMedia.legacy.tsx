import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import UnifiedShellRouter from "../UnifiedShellRouter";
import { migrationFlags } from "../flags";
import LegacyPage from "../../pages/kyc/Step3_SocialMedia.tsx";

export default function Step3SocialMediaLegacyRoute(props: any) {
  if (!migrationFlags.unifiedShell) {
    return <LegacyPage {...props} />;
  }

  const { setTitle } = usePageTitle();
  React.useEffect(() => {
    setTitle("Step3 Social Media");
  }, []);

  return (
    <UnifiedShellRouter>
      <LegacyPage {...props} />
    </UnifiedShellRouter>
  );
}
