"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type LayoutMode = "terminal" | "editorial";

const STORAGE_KEY = "updraft.layoutMode";
const DEFAULT_MODE: LayoutMode = "terminal";

type LayoutModeContextValue = {
  mode: LayoutMode;
  setMode: (mode: LayoutMode) => void;
};

const LayoutModeContext = createContext<LayoutModeContextValue | null>(null);

export function LayoutModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<LayoutMode>(DEFAULT_MODE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "terminal" || stored === "editorial") {
      setModeState(stored);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, mode);
    document.documentElement.dataset.layoutMode = mode;
  }, [mode, hydrated]);

  const setMode = (next: LayoutMode) => setModeState(next);

  return (
    <LayoutModeContext.Provider value={{ mode, setMode }}>
      {children}
    </LayoutModeContext.Provider>
  );
}

export function useLayoutMode(): LayoutModeContextValue {
  const ctx = useContext(LayoutModeContext);
  if (!ctx) throw new Error("useLayoutMode must be used inside LayoutModeProvider");
  return ctx;
}
