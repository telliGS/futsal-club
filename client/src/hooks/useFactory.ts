import { useMemo } from "react";
import { useDevice } from "./useDevice";
import { UIComponentFactory } from "../factories/UIFactory";
import { desktopFactory } from "../factories/DesktopFactory";
import { mobileFactory } from "../factories/MobileFactory";

export function useFactory(): UIComponentFactory {
  const { isMobile } = useDevice();
  return useMemo(() => (isMobile ? mobileFactory : desktopFactory), [isMobile]);
}