"use client";

import { ReactNode } from "react";

interface TagPillProps {
  children: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function TagPill({ children, selected, disabled, onClick }: TagPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3 py-1 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
        selected
          ? "border-emerald-300 bg-emerald-300/10 text-emerald-100"
          : "border-white/10 bg-slate-950/60 text-slate-200 hover:border-emerald-300"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {children}
    </button>
  );
}
