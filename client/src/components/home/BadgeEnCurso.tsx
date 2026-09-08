import { memo } from "react";

export const BadgeEnCurso = memo(function BadgeEnCurso() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
      En curso
    </span>
  );
});