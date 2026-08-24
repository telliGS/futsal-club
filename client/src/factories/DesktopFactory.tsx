import { type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  UIComponentFactory,
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
  NavLinkProps,
} from "./UIFactory";

// ===== DESKTOP FACTORY (copia exacta de componentes actuales) =====

function DesktopHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-outline bg-surface/95 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {children}
      </div>
    </header>
  );
}

function DesktopFooter({ children }: { children?: ReactNode }) {
  return (
    <footer className="border-t border-outline mt-16 bg-surface-1">
      <div className="max-w-5xl mx-auto px-6 py-10 grid gap-8 lg:grid-cols-4">
        {children}
      </div>
    </footer>
  );
}

function DesktopContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`flex-1 ${className}`}>{children}</main>;
}

function DesktopNavLink({ to, children, end, className = "" }: NavLinkProps) {
  return (
    <NavLink
      to={to}
      end={end ?? to === "/"}
      className={({ isActive }) =>
        `link-underline px-3 py-2 rounded-lg ${isActive ? "active text-white" : "text-white/60 hover:text-white"} ${className}`
      }
    >
      {children}
    </NavLink>
  );
}

function DesktopNav({ links }: { links: NavLinkProps[] }) {
  return (
    <nav className="flex items-center gap-1 md:gap-2 text-sm" aria-label="Navegación principal">
      {links.map((link) => (
        <DesktopNavLink key={link.to} to={link.to} end={link.end} className={link.className}>
          {link.children}
        </DesktopNavLink>
      ))}
    </nav>
  );
}

function DesktopMobileMenuButton() {
  return null;
}

function DesktopMobileDrawer() {
  return null;
}

function DesktopPrimaryButton({
  children,
  onClick,
  disabled,
  fullWidth,
  type = "button",
  className = "",
  "aria-label": ariaLabel,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`btn-primary ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function DesktopSecondaryButton({
  children,
  onClick,
  disabled,
  fullWidth,
  type = "button",
  className = "",
  "aria-label": ariaLabel,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`btn-secondary ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function DesktopGhostButton({
  children,
  onClick,
  disabled,
  fullWidth,
  type = "button",
  className = "",
  "aria-label": ariaLabel,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`btn bg-surface-2 border border-outline text-white hover:bg-surface-1 hover:border-primary/40 ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function DesktopCard({ children, className = "", hover = true, padding = "md" }: CardProps) {
  const paddingClasses = { none: "", sm: "p-3", md: "p-6", lg: "p-8" };
  return (
    <div className={`card ${hover ? "" : "card-static"} ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}

function DesktopStatCard({ value, label, icon, trend, className = "" }: StatCardProps) {
  return (
    <div className={`rounded-lg bg-surface-1 border border-outline p-6 text-center bg-noise ${className}`}>
      {icon && <span className="w-11 h-11 rounded-xl bg-surface-2 border border-outline flex items-center justify-center text-xl mx-auto mb-3">{icon}</span>}
      <p className="font-display font-bold text-3xl md:text-4xl tabular-nums text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-white/60 mt-1 font-mono">{label}</p>
      {trend !== "neutral" && (
        <span className={`inline-flex items-center gap-1 mt-2 text-xs font-mono ${trend === "up" ? "text-green-400" : "text-red-400"}`}>
          {trend === "up" ? "↑" : "↓"} {trend === "up" ? "Subió" : "Bajó"}
        </span>
      )}
    </div>
  );
}

function DesktopInfoCard({ title, description, icon, action, className = "" }: InfoCardProps) {
  return (
    <div className={`card-static ${className}`}>
      {icon && <span className="w-11 h-11 rounded-xl bg-surface-2 border border-outline flex items-center justify-center text-xl mb-4">{icon}</span>}
      <h3 className="font-display font-bold mt-4">{title}</h3>
      <p className="text-sm text-white/70 mt-2 leading-relaxed">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function DesktopInput({
  value,
  onChange,
  placeholder,
  type = "text",
  label,
  error,
  disabled,
  required,
  className = "",
  inputMode,
  autoComplete,
}: InputProps) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm text-white/80 block mb-1.5 font-medium">{label}</label>}
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          inputMode={inputMode}
          autoComplete={autoComplete}
          className={`w-full pl-4 pr-4 py-3 rounded-lg bg-surface-1 border border-outline text-white placeholder-white/40 focus:outline-none focus:border-primary focus:bg-surface-2 transition-colors ${error ? "border-red-500/50" : ""} ${className}`}
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}

function DesktopSelect({
  value,
  onChange,
  options,
  label,
  error,
  disabled,
  className = "",
  placeholder,
}: SelectProps) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm text-white/80 block mb-1.5 font-medium">{label}</label>}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full px-4 py-3 rounded-lg bg-surface-1 border border-outline text-white focus:outline-none focus:border-primary focus:bg-surface-2 transition-colors appearance-none ${error ? "border-red-500/50" : ""} ${className}`}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}

function DesktopTextarea({
  value,
  onChange,
  placeholder,
  label,
  error,
  rows = 4,
  className = "",
}: TextareaProps) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm text-white/80 block mb-1.5 font-medium">{label}</label>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-4 py-3 rounded-lg bg-surface-1 border border-outline text-white placeholder-white/40 focus:outline-none focus:border-primary focus:bg-surface-2 transition-colors resize-y ${error ? "border-red-500/50" : ""} ${className}`}
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}

function DesktopLabel({ children, htmlFor, className = "" }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className={`text-sm text-white/80 block mb-1.5 font-medium ${className}`}>
      {children}
    </label>
  );
}

function DesktopTable({ children, className = "", responsive }: TableProps) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-outline ${responsive ? "" : "lg:overflow-visible"} ${className}`}>
      <table className="w-full text-sm">
        {children}
      </table>
    </div>
  );
}

function DesktopTableHeader({ children }: TableHeaderProps) {
  return (
    <thead>
      <tr className="bg-surface-1 border-b border-outline">
        {children}
      </tr>
    </thead>
  );
}

function DesktopTableRow({ children, className = "", onClick }: TableRowProps) {
  return (
    <tr className={`panel-tr ${onClick ? "cursor-pointer" : ""} ${className}`} onClick={onClick}>
      {children}
    </tr>
  );
}

function DesktopTableCell({ children, className = "", header, align = "left" }: TableCellProps) {
  const Tag = header ? "th" : "td";
  const baseClasses = header ? "panel-th" : "panel-td table-cell-touch";
  const alignClasses = { left: "text-left", center: "text-center", right: "text-right" };
  return <Tag className={`${baseClasses} ${alignClasses[align]} ${className}`}>{children}</Tag>;
}

function DesktopMobileCardList({ items, renderItem, className = "" }: MobileCardListProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item, index) => renderItem(item, index))}
    </div>
  );
}

function DesktopModal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  className = "",
  showClose = true,
}: ModalProps) {
  if (!isOpen) return null;
  const sizeClasses = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-xl", xl: "max-w-2xl", full: "max-w-[calc(100vw-2rem)]" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col rounded-lg border border-outline bg-surface-2 shadow-lg overflow-hidden ${className}`}>
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-outline">
            <h3 className="font-display font-bold text-lg">{title}</h3>
            {showClose && (
              <button onClick={onClose} className="btn px-3 py-1.5 bg-surface-1 border border-outline hover:bg-surface-2" aria-label="Cerrar">
                ✕
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function DesktopModalHeader({ title, onClose, className = "" }: ModalHeaderProps) {
  return (
    <div className={`flex items-center justify-between p-5 border-b border-outline ${className}`}>
      <h3 className="font-display font-bold text-lg">{title}</h3>
      <button onClick={onClose} className="btn px-3 py-1.5 bg-surface-1 border border-outline hover:bg-surface-2" aria-label="Cerrar">
        ✕
      </button>
    </div>
  );
}

function DesktopModalBody({ children, className = "" }: ModalBodyProps) {
  return <div className={`flex-1 overflow-y-auto p-5 ${className}`}>{children}</div>;
}

function DesktopModalFooter({ children, className = "" }: ModalFooterProps) {
  return <div className={`flex items-center justify-end gap-3 p-5 border-t border-outline ${className}`}>{children}</div>;
}

function DesktopGrid({ children, cols = 1, gap = "md", className = "" }: GridProps) {
  const gridCols = typeof cols === "number" ? cols : cols.desktop;
  const gapClasses = { none: "gap-0", sm: "gap-3", md: "gap-6", lg: "gap-8", xl: "gap-12" };
  return (
    <div className={`grid ${gapClasses[gap]} ${className}`} style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
      {children}
    </div>
  );
}

function DesktopGridItem({ children, span = 1, className = "" }: GridItemProps) {
  return <div className={`col-span-${span} ${className}`}>{children}</div>;
}

function DesktopHeading({ children, level = 2, className = "" }: HeadingProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const sizeClasses = {
    1: "text-5xl md:text-6xl",
    2: "text-4xl md:text-5xl",
    3: "text-3xl md:text-4xl",
    4: "text-2xl md:text-3xl",
    5: "text-xl md:text-2xl",
    6: "text-lg md:text-xl",
  };
  return <Tag className={`font-display font-bold ${sizeClasses[level]} ${className}`}>{children}</Tag>;
}

function DesktopText({ children, variant = "body", className = "" }: TextProps) {
  const variantClasses = {
    body: "text-white/80 leading-relaxed",
    small: "text-sm text-white/70",
    muted: "text-white/50",
    lead: "text-lg text-white/90 leading-relaxed",
    code: "font-mono text-sm text-white/80",
  };
  return <p className={`${variantClasses[variant]} ${className}`}>{children}</p>;
}

function DesktopBadge({ children, variant = "default", size = "md", className = "" }: BadgeProps) {
  const variantClasses = {
    default: "bg-surface-2 border border-outline text-white",
    success: "bg-green-500/20 border border-green-500/40 text-green-400",
    warning: "bg-amber-500/20 border border-amber-500/40 text-amber-300",
    danger: "bg-red-500/20 border border-red-500/40 text-red-400",
    info: "bg-primary/20 border border-primary/40 text-primary-light",
  };
  const sizeClasses = { sm: "px-2 py-0.5 text-[10px]", md: "px-2.5 py-1 text-sm", lg: "px-3 py-1.5 text-base" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-mono uppercase tracking-wider ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  );
}

function DesktopSection({ children, className = "", padding = "md" }: SectionProps) {
  const paddingClasses = { none: "", sm: "py-6", md: "py-12 md:py-16", lg: "py-16 md:py-20", xl: "py-20 md:py-24" };
  return <section className={`${paddingClasses[padding]} ${className}`}>{children}</section>;
}

function DesktopDivider({ className = "", orientation = "horizontal" }: DividerProps) {
  return <div className={`${orientation === "horizontal" ? "border-t" : "border-l"} border-outline ${className}`} />;
}

function DesktopToast({ message, type, onClose }: ToastProps) {
  const typeClasses = {
    success: "bg-green-500/20 border-green-500/40 text-green-400",
    error: "bg-red-500/20 border-red-500/40 text-red-400",
    warning: "bg-amber-500/20 border-amber-500/40 text-amber-300",
    info: "bg-primary/20 border-primary/40 text-primary-light",
  };
  return (
    <div className={`fixed bottom-4 right-4 z-50 animate-fade-in px-4 py-3 rounded-lg border ${typeClasses[type]}`}>
      <div className="flex items-center gap-3">
        <span>{message}</span>
        <button onClick={onClose} className="btn px-2 py-1">✕</button>
      </div>
    </div>
  );
}

function DesktopLoading({ size = "md", text, className = "" }: LoadingProps) {
  const sizeClasses = { sm: "w-4 h-4", md: "w-8 h-8", lg: "w-12 h-12" };
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className={`${sizeClasses[size]} border-2 border-primary/30 border-t-primary rounded-full animate-spin`} />
      {text && <span className="text-sm text-white/60">{text}</span>}
    </div>
  );
}

function DesktopEmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`text-center py-12 border border-dashed border-outline rounded-lg ${className}`}>
      {icon && <p className="text-3xl mb-3">{icon}</p>}
      <p className="font-display font-bold text-lg">{title}</p>
      {description && <p className="text-sm text-white/50 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const desktopFactory: UIComponentFactory = {
  Header: DesktopHeader,
  Footer: DesktopFooter,
  Container: DesktopContainer,
  NavLink: DesktopNavLink,
  MobileMenuButton: DesktopMobileMenuButton,
  DesktopNav,
  MobileDrawer: DesktopMobileDrawer,
  PrimaryButton: DesktopPrimaryButton,
  SecondaryButton: DesktopSecondaryButton,
  GhostButton: DesktopGhostButton,
  Card: DesktopCard,
  StatCard: DesktopStatCard,
  InfoCard: DesktopInfoCard,
  Input: DesktopInput,
  Select: DesktopSelect,
  Textarea: DesktopTextarea,
  Label: DesktopLabel,
  Table: DesktopTable,
  TableRow: DesktopTableRow,
  TableCell: DesktopTableCell,
  TableHeader: DesktopTableHeader,
  MobileCardList: DesktopMobileCardList,
  Modal: DesktopModal,
  ModalHeader: DesktopModalHeader,
  ModalBody: DesktopModalBody,
  ModalFooter: DesktopModalFooter,
  Grid: DesktopGrid,
  GridItem: DesktopGridItem,
  Heading: DesktopHeading,
  Text: DesktopText,
  Badge: DesktopBadge,
  Section: DesktopSection,
  Divider: DesktopDivider,
  Toast: DesktopToast,
  Loading: DesktopLoading,
  EmptyState: DesktopEmptyState,
};