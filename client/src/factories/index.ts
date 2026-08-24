import { useMemo } from "react";
import { useDevice } from "../hooks/useDevice";
import { UIComponentFactory } from "./UIFactory";
import { desktopFactory } from "./DesktopFactory";
import { mobileFactory } from "./MobileFactory";

export function useFactory(): UIComponentFactory {
  const { isMobile } = useDevice();
  return useMemo(() => (isMobile ? mobileFactory : desktopFactory), [isMobile]);
}

export { desktopFactory } from "./DesktopFactory";
export { mobileFactory } from "./MobileFactory";
export type { UIComponentFactory } from "./UIFactory";
export type {
  NavLinkProps,
  ButtonProps,
  CardProps,
  StatCardProps,
  InfoCardProps,
  InputProps,
  SelectProps,
  TextareaProps,
  LabelProps,
  TableProps,
  TableRowProps,
  TableCellProps,
  TableHeaderProps,
  MobileCardListProps,
  ModalProps,
  ModalHeaderProps,
  ModalBodyProps,
  ModalFooterProps,
  GridProps,
  GridItemProps,
  HeadingProps,
  TextProps,
  BadgeProps,
  SectionProps,
  DividerProps,
  ToastProps,
  LoadingProps,
  EmptyStateProps,
} from "./UIFactory";