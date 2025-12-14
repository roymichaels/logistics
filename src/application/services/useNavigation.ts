import { useNavigate, useLocation } from "react-router-dom";
import { Diagnostics } from "../../foundation/diagnostics/DiagnosticsStore";

export const useNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigateTo = (path: string, options?: any) => {
    Diagnostics.log({
      type: 'nav',
      message: `Navigating to: ${path}`,
      payload: { from: location.pathname, to: path },
      timestamp: Date.now()
    });
    navigate(path, options);
  };

  return {
    navigate: navigateTo,
    location,
    goBack: () => navigate(-1),
    goForward: () => navigate(1)
  };
};
