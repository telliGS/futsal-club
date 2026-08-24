import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type DeviceType = "mobile" | "desktop";

interface DeviceContextValue {
  device: DeviceType;
  isMobile: boolean;
  isDesktop: boolean;
}

const DeviceContext = createContext<DeviceContextValue | null>(null);

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState<DeviceType>("desktop");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const checkDevice = () => {
      setDevice(mediaQuery.matches ? "mobile" : "desktop");
    };
    checkDevice();
    mediaQuery.addEventListener("change", checkDevice);
    return () => mediaQuery.removeEventListener("change", checkDevice);
  }, []);

  return (
    <DeviceContext.Provider value={{ device, isMobile: device === "mobile", isDesktop: device === "desktop" }}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice() {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error("useDevice must be used within DeviceProvider");
  return ctx;
}