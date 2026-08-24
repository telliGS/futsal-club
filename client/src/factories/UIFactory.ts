import { FC, ReactNode } from "react";

export type DeviceType = "mobile" | "desktop";

export interface UIComponentFactory {
  // Layout
  Header: FC<{ children?: ReactNode }>;
  Footer: FC<{ children?: ReactNode }>;
  Container: FC<{ children: ReactNode; className?: string }>;
  
  // Navigation
  NavLink: FC<NavLinkProps>;
  MobileMenuButton: FC<{ onClick: () => void; ariaLabel?: string }>;
  DesktopNav: FC<{ links: NavLinkProps[] }>;
  MobileDrawer: FC<{ isOpen: boolean; onClose: () => void; links: NavLinkProps[] }>;
  
  // Buttons
  PrimaryButton: FC<ButtonProps>;
  SecondaryButton: FC<ButtonProps>;
  GhostButton: FC<ButtonProps>;
  
  // Cards
  Card: FC<CardProps>;
  StatCard: FC<StatCardProps>;
  InfoCard: FC<InfoCardProps>;
  
  // Forms
  Input: FC<InputProps>;
  Select: FC<SelectProps>;
  Textarea: FC<TextareaProps>;
  Label: FC<LabelProps>;
  
  // Tables / Lists
  Table: FC<TableProps>;
  TableHeader: FC<TableHeaderProps>;
  TableRow: FC<TableRowProps>;
  TableCell: FC<TableCellProps>;
  MobileCardList: FC<MobileCardListProps>;
  
  // Modals
  Modal: FC<ModalProps>;
  ModalHeader: FC<ModalHeaderProps>;
  ModalBody: FC<ModalBodyProps>;
  ModalFooter: FC<ModalFooterProps>;
  
  // Grid
  Grid: FC<GridProps>;
  GridItem: FC<GridItemProps>;
  
  // Typography
  Heading: FC<HeadingProps>;
  Text: FC<TextProps>;
  Badge: FC<BadgeProps>;
  
  // Sections
  Section: FC<SectionProps>;
  Divider: FC<DividerProps>;
  
  // Feedback
  Toast: FC<ToastProps>;
  Loading: FC<LoadingProps>;
  EmptyState: FC<EmptyStateProps>;
}

export interface NavLinkProps {
  to: string;
  children: ReactNode;
  end?: boolean;
  className?: string;
}

export interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  "aria-label"?: string;
}

export interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export interface StatCardProps {
  value: string | number;
  label: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export interface InfoCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "password" | "number" | "tel";
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  inputMode?: "text" | "numeric" | "email" | "tel";
  autoComplete?: string;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export interface TextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  rows?: number;
  className?: string;
}

export interface LabelProps {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}

export interface TableProps {
  children: ReactNode;
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
  responsive?: boolean;
}

export interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}

export interface TableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export interface TableCellProps {
  children: ReactNode;
  className?: string;
  header?: boolean;
  align?: "left" | "center" | "right";
  dataLabel?: string; // Para mobile cards
}

export interface MobileCardListProps {
  items: ReactNode[];
  renderItem: (item: ReactNode, index: number) => ReactNode;
  className?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  showClose?: boolean;
}

export interface ModalHeaderProps {
  title: string;
  onClose: () => void;
  className?: string;
}

export interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

export interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export interface GridProps {
  children: ReactNode;
  cols?: number | { mobile: number; tablet: number; desktop: number };
  gap?: "none" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export interface GridItemProps {
  children: ReactNode;
  span?: number;
  className?: string;
}

export interface HeadingProps {
  children: ReactNode;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export interface TextProps {
  children: ReactNode;
  variant?: "body" | "small" | "muted" | "lead" | "code";
  className?: string;
}

export interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export interface SectionProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg" | "xl";
}

export interface DividerProps {
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export interface ToastProps {
  message: string;
  type: "success" | "error" | "warning" | "info";
  onClose: () => void;
  duration?: number;
}

export interface LoadingProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}