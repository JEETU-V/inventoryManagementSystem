import { useContext } from "react";
import AppContext from "./AppContextDefinition";

export function useAppData() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppData must be used within AppProvider");
  }

  return context;
}
