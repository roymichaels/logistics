import { useAuth } from "./useAuth";
import { useDataStore } from "./useDataStore";
import { useNavigation } from "./useNavigation";

export const useApp = () => ({
  auth: useAuth(),
  db: useDataStore(),
  nav: useNavigation()
});
