"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type WidgetName = "chat" | "notifications";

interface WidgetContextValue {
  activeWidget: WidgetName | null;
  openWidget: (name: WidgetName) => void;
  closeWidget: (name: WidgetName) => void;
  closeAll: () => void;
}

const WidgetContext = createContext<WidgetContextValue>({
  activeWidget: null,
  openWidget: () => {},
  closeWidget: () => {},
  closeAll: () => {},
});

export function WidgetProvider({ children }: { children: ReactNode }) {
  const [activeWidget, setActiveWidget] = useState<WidgetName | null>(null);

  const openWidget = useCallback((name: WidgetName) => {
    setActiveWidget(name);
  }, []);

  const closeWidget = useCallback((name: WidgetName) => {
    setActiveWidget((prev) => (prev === name ? null : prev));
  }, []);

  const closeAll = useCallback(() => {
    setActiveWidget(null);
  }, []);

  return (
    <WidgetContext.Provider value={{ activeWidget, openWidget, closeWidget, closeAll }}>
      {children}
    </WidgetContext.Provider>
  );
}

export function useWidget() {
  return useContext(WidgetContext);
}
