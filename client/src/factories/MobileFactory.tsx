import { type ReactNode, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
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

// ===== MOBILE FACTORY (Best-in-class mobile design, breakpoint < 640px) =====

function MobileHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-outline bg-surface/95 backdrop-blur-md pt-safe">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {children}
      </div>
    </header>
  );
}

function MobileFooter({ children }: { children?: ReactNode }) {
  return (
    <footer className="border-t border-outline mt-16 bg-surface-1 pb-safe">
      <div className="max-w-5xl mx-auto px-4 py-8 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {children}
      </div>
    </footer>
  );
}

function MobileContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`flex-1 ${className}`}>{children}</main>;
}

function MobileNavLink({ to, children, end, className = "" }: NavLinkProps) {
  return (
    <NavLink
      to={to}
      end={end ?? to === "/"}
      onClick={() => {}}
      className={`link-underline px-4 py-3 rounded-lg touch-target border ${className}`}
    >
      {children}
    </NavLink>
  );
}

function MobileNav({ links }: { links: NavLinkProps[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Navegación principal">
      {links.map((link) => (
        <MobileNavLink key={link.to} to={link.to} end={link.end} className={link.className}>
          {link.children}
        </MobileNavLink>
      ))}
    </nav>
  );
}

function MobileMenuButton({ onClick, ariaLabel = "Abrir menú" }: { onClick: () => void; ariaLabel?: string }) {
  return (
    <button
      onClick={onClick}
      className="touch-target p-2 rounded-lg bg-surface-1 border border-outline text-white/80 hover:bg-surface-2"
      aria-label={ariaLabel}
      aria-expanded="false"
      aria-controls="mobile-drawer"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
}

function MobileDrawer({ isOpen, onClose, links }: { isOpen: boolean; onClose: () => void; links: NavLinkProps[] }) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        id="mobile-drawer"
        className="fixed inset-y-0 right-0 z-50 w-[88vw] max-w-[320px] bg-surface-1 border-l border-outline transform transition-transform duration-250 ease-out translate-x-0 pt-safe pb-safe"
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-outline">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2" aria-label="Inicio">
                <img src="/escudo-jh.png" alt="" className="w-10 h-10" />
                <div>
                  <p className="font-display font-bold text-lg">Club José Hernández</p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-mono">Futsal · Paraná</p>
                </div>
              </Link>
            </div>
            <button
              onClick={onClose}
              className="touch-target p-2 rounded-lg bg-surface-2 border border-outline text-white/80 hover:bg-surface-1"
              aria-label="Cerrar menú"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-2" aria-label="Navegación principal">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg touch-target border transition-colors ${link.className}`}
              >
                {link.children}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-outline">
            <p className="font-display font-semibold text-sm uppercase tracking-wider text-white/70 mb-3">Seguinos</p>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/josehernandezfs/" target="_blank" rel="noopener noreferrer" className="touch-target text-white/60 hover:text-primary-light transition-colors text-2xl" aria-label="Instagram">📸</a>
              <a href="https://www.facebook.com/profile.php?id=100006680010803" target="_blank" rel="noopener noreferrer" className="touch-target text-white/60 hover:text-primary-light transition-colors text-2xl" aria-label="Facebook">👍</a>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function MobilePrimaryButton({
  children,
  onClick,
  disabled,
  fullWidth = true,
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
      className={`btn-primary touch-target-lg ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function MobileSecondaryButton({
  children,
  onClick,
  disabled,
  fullWidth = true,
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
      className={`btn-secondary touch-target-lg ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function MobileGhostButton({
  children,
  onClick,
  disabled,
  fullWidth = true,
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
      className={`btn bg-surface-2 border border-outline text-white hover:bg-surface-1 hover:border-primary/40 touch-target ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function MobileCard({ children, className = "", hover = true, padding = "md" }: CardProps) {
  const paddingClasses = { none: "", sm: "p-3", md: "p-4", lg: "p-6" };
  return (
    <div className={`card ${hover ? "" : "card-static"} ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}

function MobileStatCard({ value, label, icon, trend, className = "" }: StatCardProps) {
  return (
    <div className={`rounded-lg bg-surface-1 border border-outline p-4 text-center bg-noise ${className}`}>
      {icon && <span className="w-10 h-10 rounded-xl bg-surface-2 border border-outline flex items-center justify-center text-lg mx-auto mb-2">{icon}</span>}
      <p className="font-display font-bold text-fluid-2xl tabular-nums text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-white/60 mt-1 font-mono">{label}</p>
      {trend !== "neutral" && (
        <span className={`inline-flex items-center gap-1 mt-2 text-xs font-mono ${trend === "up" ? "text-green-400" : "text-red-400"}`}>
          {trend === "up" ? "↑" : "↓"} {trend === "up" ? "Subió" : "Bajó"}
        </span>
      )}
    </div>
  );
}

function MobileInfoCard({ title, description, icon, action, className = "" }: InfoCardProps) {
  return (
    <div className={`card-static ${className}`}>
      {icon && <span className="w-10 h-10 rounded-xl bg-surface-2 border border-outline flex items-center justify-center text-lg mb-3">{icon}</span>}
      <h3 className="font-display font-bold text-lg">{title}</h3>
      <p className="text-sm text-white/70 mt-2 leading-relaxed">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

function MobileInput({
  value,
  onChange,
  placeholder,
  type = "text",
  label,
  error,
  disabled,
  required,
  className = "",
  inputMode = type === "number" ? "numeric" : type === "email" ? "email" : type === "tel" ? "tel" : "text",
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
          className={`w-full pl-4 pr-4 py-3.5 rounded-lg bg-surface-1 border border-outline text-white placeholder-white/40 focus:outline-none focus:border-primary focus:bg-surface-2 transition-colors text-base touch-target ${error ? "border-red-500/50" : ""} ${className}`}
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}

function MobileSelect({
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
          className={`w-full px-4 pr-10 py-3.5 rounded-lg bg-surface-1 border border-outline text-white focus:outline-none focus:border-primary focus:bg-surface-2 transition-colors appearance-none touch-target ${error ? "border-red-500/50" : ""} ${className}`}
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

function MobileTextarea({
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
        className={`w-full px-4 py-3.5 rounded-lg bg-surface-1 border border-outline text-white placeholder-white/40 focus:outline-none focus:border-primary focus:bg-surface-2 transition-colors resize-y min-h-[120px] touch-target ${error ? "border-red-500/50" : ""} ${className}`}
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}

function MobileLabel({ children, htmlFor, className = "" }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className={`text-sm text-white/80 block mb-1.5 font-medium ${className}`}>
      {children}
    </label>
  );
}

function MobileTable({ children, className = "", responsive }: TableProps) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-outline table-to-cards ${responsive ? "" : "lg:overflow-visible"} ${className}`}>
      <table className="w-full text-sm">
        {children}
      </table>
    </div>
  );
}

function MobileTableHeader({ children }: TableHeaderProps) {
  return (
    <thead className="hidden">
      <tr className="bg-surface-1 border-b border-outline">
        {children}
      </tr>
    </thead>
  );
}

function MobileTableRow({ children, className = "", onClick }: TableRowProps) {
  return <tr className={`panel-tr ${onClick ? "cursor-pointer" : ""} ${className}`} onClick={onClick}>{children}</tr>;
}

function MobileTableCell({ children, className = "", header, align = "left", dataLabel }: TableCellProps) {
  const Tag = header ? "th" : "td";
  const baseClasses = header ? "panel-th hidden" : "panel-td table-cell-touch";
  const alignClasses = { left: "text-left", center: "text-center", right: "text-right" };
  return <Tag className={`${baseClasses} ${alignClasses[align]} ${className}`} data-label={dataLabel}>{children}</Tag>;
}

function MobileMobileCardList({ items, renderItem, className = "" }: MobileCardListProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item, index) => renderItem(item, index))}
    </div>
  );
}

function MobileModal({
  isOpen,
  onClose,
  title,
  children,
  className = "",
  showClose = true,
}: ModalProps) {
  if (!isOpen) return null;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end p-0 animate-fade-in pb-safe">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className={`relative w-full bg-surface-2 rounded-t-2xl border-t border-outline shadow-xl flex flex-col max-h-[85vh] animate-slide-up ${className}`}>
        {(title || showClose) && (
          <div className="flex items-center justify-between p-4 border-b border-outline sticky top-0 bg-surface-2 z-10 rounded-t-2xl">
            {title && <h3 className="font-display font-bold text-lg">{title}</h3>}
            {showClose && (
              <button onClick={onClose} className="touch-target p-2 rounded-lg bg-surface-1 border border-outline text-white/80 hover:bg-surface-2" aria-label="Cerrar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function MobileModalHeader({ title, onClose, className = "" }: ModalHeaderProps) {
  return (
    <div className={`flex items-center justify-between p-4 border-b border-outline ${className}`}>
      <h3 className="font-display font-bold text-lg">{title}</h3>
      <button onClick={onClose} className="touch-target p-2 rounded-lg bg-surface-1 border border-outline text-white/80 hover:bg-surface-2" aria-label="Cerrar">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function MobileModalBody({ children, className = "" }: ModalBodyProps) {
  return <div className={`flex-1 overflow-y-auto p-4 ${className}`}>{children}</div>;
}

function MobileModalFooter({ children, className = "" }: ModalFooterProps) {
  return <div className={`flex items-center justify-end gap-2 p-4 border-t border-outline ${className}`}>{children}</div>;
}

function MobileGrid({ children, cols = 1, gap = "md", className = "" }: GridProps) {
  const gridCols = typeof cols === "number" ? 1 : cols.mobile ?? 1;
  const gapClasses = { none: "gap-0", sm: "gap-2", md: "gap-3", lg: "gap-4", xl: "gap-6" };
  return (
    <div className={`grid ${gapClasses[gap]} ${className}`} style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
      {children}
    </div>
  );
}

function MobileGridItem({ children, className = "" }: GridItemProps) {
  return <div className={`${className}`}>{children}</div>;
}

function MobileHeading({ children, level = 2, className = "" }: HeadingProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const sizeClasses = {
    1: "text-fluid-4xl",
    2: "text-fluid-3xl",
    3: "text-fluid-2xl",
    4: "text-fluid-xl",
    5: "text-fluid-lg",
    6: "text-fluid-base",
  };
  return <Tag className={`font-display font-bold ${sizeClasses[level]} ${className}`}>{children}</Tag>;
}

function MobileText({ children, variant = "body", className = "" }: TextProps) {
  const variantClasses = {
    body: "text-white/80 leading-relaxed text-fluid-base",
    small: "text-white/70 text-fluid-sm",
    muted: "text-white/50 text-fluid-sm",
    lead: "text-white/90 leading-relaxed text-fluid-lg",
    code: "font-mono text-sm text-white/80",
  };
  return <p className={`${variantClasses[variant]} ${className}`}>{children}</p>;
}

function MobileBadge({ children, variant = "default", size = "md", className = "" }: BadgeProps) {
  const variantClasses = {
    default: "bg-surface-2 border border-outline text-white",
    success: "bg-green-500/20 border border-green-500/40 text-green-400",
    warning: "bg-amber-500/20 border border-amber-500/40 text-amber-300",
    danger: "bg-red-500/20 border border-red-500/40 text-red-400",
    info: "bg-primary/20 border border-primary/40 text-primary-light",
  };
  const sizeClasses = { sm: "px-2 py-0.5 text-[10px]", md: "px-2.5 py-1 text-sm", lg: "px-3 py-1.5 text-base" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-mono uppercase tracking-wider touch-target ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  );
}

function MobileSection({ children, className = "", padding = "md" }: SectionProps) {
  const paddingClasses = { none: "", sm: "py-4", md: "py-8", lg: "py-12", xl: "py-16" };
  return <section className={`${paddingClasses[padding]} ${className}`}>{children}</section>;
}

function MobileDivider({ className = "", orientation = "horizontal" }: DividerProps) {
  return <div className={`${orientation === "horizontal" ? "border-t" : "border-l"} border-outline ${className}`} />;
}

function MobileToast({ message, type, onClose }: ToastProps) {
  const typeClasses = {
    success: "bg-green-500/20 border-green-500/40 text-green-400",
    error: "bg-red-500/20 border-red-500/40 text-red-400",
    warning: "bg-amber-500/20 border-amber-500/40 text-amber-300",
    info: "bg-primary/20 border-primary/40 text-primary-light",
  };
  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 animate-slide-up px-4 py-3 rounded-lg border ${typeClasses[type]}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm">{message}</span>
        <button onClick={onClose} className="touch-target p-1">✕</button>
      </div>
    </div>
  );
}

function MobileLoading({ size = "md", text, className = "" }: LoadingProps) {
  const sizeClasses = { sm: "w-6 h-6", md: "w-10 h-10", lg: "w-14 h-14" };
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className={`${sizeClasses[size]} border-2 border-primary/30 border-t-primary rounded-full animate-spin`} />
      {text && <span className="text-sm text-white/60">{text}</span>}
    </div>
  );
}

function MobileEmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`text-center py-8 border border-dashed border-outline rounded-lg ${className}`}>
      {icon && <p className="text-2xl mb-3">{icon}</p>}
      <p className="font-display font-bold text-lg">{title}</p>
      {description && <p className="text-sm text-white/50 mt-1">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export const mobileFactory: UIComponentFactory = {
  Header: MobileHeader,
  Footer: MobileFooter,
  Container: MobileContainer,
  NavLink: MobileNavLink,
  MobileMenuButton,
  DesktopNav: MobileNav,
  MobileDrawer,
  PrimaryButton: MobilePrimaryButton,
  SecondaryButton: MobileSecondaryButton,
  GhostButton: MobileGhostButton,
  Card: MobileCard,
  StatCard: MobileStatCard,
  InfoCard: MobileInfoCard,
  Input: MobileInput,
  Select: MobileSelect,
  Textarea: MobileTextarea,
  Label: MobileLabel,
  Table: MobileTable,
  TableRow: MobileTableRow,
  TableCell: MobileTableCell,
  TableHeader: MobileTableHeader,
  MobileCardList: MobileMobileCardList,
  Modal: MobileModal,
  ModalHeader: MobileModalHeader,
  ModalBody: MobileModalBody,
  ModalFooter: MobileModalFooter,
  Grid: MobileGrid,
  GridItem: MobileGridItem,
  Heading: MobileHeading,
  Text: MobileText,
  Badge: MobileBadge,
  Section: MobileSection,
  Divider: MobileDivider,
  Toast: MobileToast,
  Loading: MobileLoading,
  EmptyState: MobileEmptyState,
};